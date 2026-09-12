import { richPlain, replaceRich } from './rich-text.ts';
import { editText } from './text-formatting.ts';
import { z } from 'zod';
import {
  checkEnactment,
  commonShape,
  paired,
  nodeSchema,
  guideSchema,
  newGuide,
  newNode,
  pair,
  entries,
  allowed,
  inSchedule,
  address,
  hasHeading,
  isGroup,
  id,
  digest,
  issues,
  validDate,
  languages,
  type Guide,
  type Node,
  type Pair,
  type Language,
  type Enactment,
} from './document.ts';

export const operationNames = {
  'insert-provision': 'Insert provision',
  'omit-provision': 'Repeal provision',
  'replace-provision': 'Substitute provision',
  'replace-heading': 'Substitute heading',
  'replace-text': 'Substitute exact text',
  'replace-table': 'Substitute whole table',
  'repeal-guide': 'Repeal entire Guide',
} as const;
const actionSchema = z
  .object({
    id: z.string(),
    type: z.enum(
      Object.keys(operationNames) as [
        keyof typeof operationNames,
        ...(keyof typeof operationNames)[],
      ],
    ),
    target: z.string(),
    clause: z.string(),
    subclause: z.string(),
    expected: z.string(),
    position: z.enum(['before', 'after', 'first', 'last']).optional(),
    node: nodeSchema.optional(),
    heading: paired.optional(),
    language: z.enum(['en', 'zh']).optional(),
    block: z.string().optional(),
    find: z.string().optional(),
    replacement: z.string().optional(),
    table: z
      .object({
        caption: paired,
        numbered: z.boolean(),
        rows: z.array(z.array(z.string()).min(1)).min(1),
      })
      .strict()
      .optional(),
  })
  .strict();
export type Action = z.infer<typeof actionSchema>;
export const amendmentSchema = z
  .object({
    ...commonShape,
    type: z.literal('amendment'),
    source: z.object({ id: z.string(), digest: z.string(), titles: paired }).strict(),
    citationLabel: z.string(),
    introductionLabel: z.string(),
    actions: z.array(actionSchema),
  })
  .strict()
  .superRefine(checkEnactment);
export type Amendment = z.infer<typeof amendmentSchema>;
export type Document = Guide | Amendment;
export const parseDocument = (text: string): Document =>
  z.union([guideSchema, amendmentSchema]).parse(JSON.parse(text));
export type History = {
  instrument: string;
  titles: Pair;
  date: string;
  clause: string;
  target: string;
  action: string;
};
export type Revision = { guide: Guide; repealed: boolean; history: History[] };
export async function newAmendment(base: Guide): Promise<Amendment> {
  if (base.stage !== 'enacted') throw Error('Open an enacted source Guide first.');
  const { type, nodes, ...common } = newGuide();
  return {
    ...common,
    type: 'amendment',
    id: 'amendment-' + crypto.randomUUID(),
    mode: base.mode,
    source: { id: base.id, digest: await digest(base), titles: { ...base.titles } },
    citationLabel: '1',
    introductionLabel: '2',
    actions: [],
  };
}
function tombstone(n: Node): Node {
  return {
    ...n,
    repealed: true,
    blocks: isGroup(n.kind) ? undefined : [],
    children: n.children.map(tombstone),
  };
}
function actionEntry(g: Guide, a: Action) {
  const e = entries(g.nodes).find((e) => e.node.id === a.target);
  if (!e) throw Error('Target provision does not exist.');
  if ([...e.ancestors, e.node].some((n) => n.repealed))
    throw Error('A repealed provision cannot be amended.');
  return e;
}
/** One action transforms an isolated copy; failures never mutate an enacted source. */
export async function applyAction(state: Revision, a: Action, verify = true): Promise<Revision> {
  if (state.repealed) throw Error('The entire Guide has been repealed.');
  if (verify && a.expected !== (await digest(state.guide)))
    throw Error('Source has changed before this action. Review and recheck the action sequence.');
  const next: Revision = structuredClone(state),
    g = next.guide;
  if (a.type === 'repeal-guide') {
    if (a.target !== g.id) throw Error('Wrong document target.');
    next.repealed = true;
    return next;
  }
  const e = actionEntry(g, a),
    n = e.node;
  switch (a.type) {
    case 'insert-provision': {
      if (!a.node || !a.position) throw Error('Choose a position and supply the new provision.');
      const child = a.position === 'first' || a.position === 'last',
        parent = child ? n : e.parent;
      if (
        !allowed(
          parent,
          child
            ? inSchedule(e)
            : e.ancestors.some((n) => ['schedule', 'appendix'].includes(n.kind)),
        ).includes(a.node.kind)
      )
        throw Error('New provision has an invalid structural level for that position.');
      const occupied = new Set(entries(g.nodes).map((x) => x.node.id));
      if (entries([a.node]).some((x) => occupied.has(x.node.id)))
        throw Error('An inserted provision must have a new permanent identity.');
      const list = child ? n.children : e.list;
      const at =
        a.position === 'first'
          ? 0
          : a.position === 'last'
            ? list.length
            : list.indexOf(n) + (a.position === 'after' ? 1 : 0);
      list.splice(at, 0, structuredClone(a.node));
      break;
    }
    case 'omit-provision':
      e.list[e.list.indexOf(n)] = tombstone(n);
      break;
    case 'replace-heading':
      if (!hasHeading(n.kind)) throw Error('This level has no heading.');
      if (!a.heading) throw Error('Supply the heading.');
      n.heading = { ...a.heading };
      break;
    case 'replace-provision': {
      if (!a.node || a.node.id !== n.id || a.node.kind !== n.kind || a.node.label !== n.label)
        throw Error('Substitution must preserve the target identity, kind and number.');
      const replacement = structuredClone(a.node);
      const original = new Map(entries([n]).map((entry) => [entry.node.id, entry]));
      const allExisting = new Set(entries(g.nodes).map((entry) => entry.node.id));
      for (const entry of entries([replacement])) {
        const old = original.get(entry.node.id);
        if (!old && allExisting.has(entry.node.id))
          throw Error('Substitution cannot relocate another existing provision.');
        if (
          old &&
          (old.node.kind !== entry.node.kind ||
            old.node.label !== entry.node.label ||
            old.parent?.id !== entry.parent?.id)
        )
          throw Error('Substitution cannot renumber or relocate existing provisions.');
      }
      // Preserve both the location and relative order of surviving identities.
      // Missing children stay at their original parent as repeal tombstones.
      const retain = (old: Node, next: Node) => {
        const oldIds = old.children.map((child) => child.id);
        const survivors = next.children.filter((child) => oldIds.includes(child.id));
        if (
          survivors.some(
            (child, i) => i > 0 && oldIds.indexOf(child.id) < oldIds.indexOf(survivors[i - 1].id),
          )
        )
          throw Error('Substitution cannot reorder existing provisions.');
        for (const child of old.children) {
          const match = next.children.find((item) => item.id === child.id);
          if (match) retain(child, match);
          else {
            const following = old.children
              .slice(oldIds.indexOf(child.id) + 1)
              .find((item) => next.children.some((n) => n.id === item.id));
            const at = following
              ? next.children.findIndex((item) => item.id === following.id)
              : next.children.length;
            next.children.splice(at, 0, tombstone(child));
          }
        }
      };
      retain(n, replacement);
      e.list[e.list.indexOf(n)] = replacement;
      break;
    }
    case 'replace-text': {
      const b = n.blocks?.find((b) => b.id === a.block);
      if (!b || b.type === 'table' || !a.language || !a.find)
        throw Error('Choose a text block, language and exact text.');
      const text =
          b.textFormat?.[a.language] === 'html'
            ? richPlain(b.text[a.language])
            : b.text[a.language],
        at = text.indexOf(a.find);
      if (at < 0 || text.indexOf(a.find, at + a.find.length) >= 0)
        throw Error(
          'The selected text must occur exactly once in this block. Select a larger unique passage.',
        );
      const boundaries = new Set([
        0,
        ...Array.from(
          new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text),
          (s) => s.index + s.segment.length,
        ),
      ]);
      if (!boundaries.has(at) || !boundaries.has(at + a.find.length))
        throw Error('The selection splits a character.');
      Object.assign(
        b,
        editText(
          b,
          a.language,
          b.textFormat?.[a.language] === 'html'
            ? replaceRich(b.text[a.language], a.find, a.replacement ?? '')
            : text.slice(0, at) + (a.replacement ?? '') + text.slice(at + a.find.length),
        ),
      );
      break;
    }
    case 'replace-table': {
      const b = n.blocks?.find((b) => b.id === a.block);
      if (!b || b.type !== 'table' || !a.table)
        throw Error('Choose a table and supply its entire replacement.');
      Object.assign(b, structuredClone(a.table));
      break;
    }
  }
  guideSchema.parse(g);
  const faults = issues(g).filter((x) => ['identity', 'structure', 'table'].includes(x.code));
  if (faults.length) throw Error(faults[0].message);
  return next;
}
export async function proposed(base: Guide, a: Amendment, verify = true): Promise<Revision> {
  if (
    base.stage !== 'enacted' ||
    a.source.id !== base.id ||
    a.source.digest !== (await digest(base))
  )
    throw Error('Load the exact enacted source named by this amendment.');
  if (base.mode !== a.mode) throw Error('An amendment must use the source document language mode.');
  let state: Revision = { guide: structuredClone(base), repealed: false, history: [] };
  for (const op of a.actions) state = await applyAction(state, op, verify);
  return state;
}
export async function addAction(
  base: Guide,
  a: Amendment,
  input: Omit<Action, 'id' | 'expected'>,
): Promise<Amendment> {
  if (a.stage !== 'draft') throw Error('Enacted amendments are read-only.');
  const state = await proposed(base, a);
  const op: Action = { ...input, id: id(), expected: await digest(state.guide) };
  await applyAction(state, op);
  return { ...a, actions: [...a.actions, op] };
}
/** Invoked only by an explicit review command after changing/reordering actions. */
export async function recheck(base: Guide, a: Amendment): Promise<Amendment> {
  if (a.stage !== 'draft') throw Error('Enacted amendments are read-only.');
  if (a.source.digest !== (await digest(base))) throw Error('Wrong source.');
  let state: Revision = { guide: structuredClone(base), repealed: false, history: [] };
  const copy = structuredClone(a);
  for (const op of copy.actions) {
    op.expected = await digest(state.guide);
    state = await applyAction(state, op);
  }
  return copy;
}
export type GeneratedClause = {
  id: string;
  label: string;
  heading: Pair;
  items: { label: string; text: Pair; payload?: Node; table?: Action['table'] }[];
};
export function owner(g: Guide, a: Action): string {
  if (
    a.type === 'insert-provision' &&
    a.node &&
    (isGroup(a.node.kind) || ['section', 'schedule', 'appendix'].includes(a.node.kind))
  )
    return a.node.id;
  const e = entries(g.nodes).find((e) => e.node.id === a.target);
  if (!e) return a.target;
  const schedule = [...e.ancestors, e.node].find((n) => ['schedule', 'appendix'].includes(n.kind));
  if (schedule && !isGroup(e.node.kind)) return schedule.id;
  return (
    [...e.ancestors, e.node].find((n) => n.kind === 'section' || n.kind === 'scheduleParagraph')
      ?.id ?? a.target
  );
}
function quote(s: string) {
  return `“${s}”`;
}
export function instruction(g: Guide, a: Action): Pair {
  if (a.type === 'repeal-guide')
    return pair(`The ${g.titles.en} is repealed.`, `《${g.titles.zh}》現予廢除。`);
  const e = entries(g.nodes).find((e) => e.node.id === a.target);
  if (!e) throw Error('Missing target for generated text.');
  const en = address(e, 'en'),
    zh = address(e, 'zh');
  switch (a.type) {
    case 'insert-provision':
      return pair(
        `${a.position === 'before' ? 'Before' : a.position === 'after' ? 'After' : a.position === 'first' ? 'At the beginning of' : 'At the end of'} ${en}—\nAdd—`,
        `在${zh}${a.position === 'before' ? '之前' : a.position === 'after' ? '之後' : a.position === 'first' ? '的開首' : '的末尾'}——\n加入——`,
      );
    case 'omit-provision':
      return pair(
        `${en[0].toUpperCase() + en.slice(1)}—\nRepeal the provision.`,
        `${zh}——\n廢除該條文。`,
      );
    case 'replace-provision':
      return pair(
        `${en[0].toUpperCase() + en.slice(1)}—\nRepeal the provision\nSubstitute—`,
        `${zh}——\n廢除該條文\n代以——`,
      );
    case 'replace-heading':
      return pair(
        `${en[0].toUpperCase() + en.slice(1)}, heading—\nRepeal the heading\nSubstitute ${quote(a.heading?.en ?? '')}.`,
        `${zh}的標題——\n廢除該標題\n代以「${a.heading?.zh ?? ''}」。`,
      );
    case 'replace-text':
      return pair(
        `${en[0].toUpperCase() + en.slice(1)}, ${a.language === 'en' ? 'English' : 'Chinese'} text—\nRepeal ${quote(a.find ?? '')}\nSubstitute ${quote(a.replacement ?? '')}.`,
        `${zh}的${a.language === 'en' ? '英文' : '中文'}文本——\n廢除「${a.find ?? ''}」\n代以「${a.replacement ?? ''}」。`,
      );
    case 'replace-table': {
      const b = e.node.blocks?.find((b) => b.id === a.block);
      const c = b?.type === 'table' ? b.caption : pair();
      return pair(
        `${en[0].toUpperCase() + en.slice(1)}, table${c.en ? ` ${quote(c.en)}` : ''}—\nRepeal the table\nSubstitute—`,
        `${zh}的${c.zh ? `「${c.zh}」` : ''}表格——\n廢除該表格\n代以——`,
      );
    }
  }
}
/** Group contiguous changes by section, while keeping executable action order authoritative. */
export async function generate(base: Guide, a: Amendment): Promise<GeneratedClause[]> {
  await proposed(base, a);
  let state: Revision = { guide: structuredClone(base), repealed: false, history: [] };
  const clauses: GeneratedClause[] = [];
  const groups = new Set<string>();
  for (const op of a.actions) {
    const key = owner(state.guide, op),
      entry =
        entries(state.guide.nodes).find((e) => e.node.id === key) ??
        (op.node && key === op.node.id
          ? (() => {
              const anchor = entries(state.guide.nodes).find((e) => e.node.id === op.target)!;
              const ancestors = ['first', 'last'].includes(op.position ?? '')
                ? [...anchor.ancestors, anchor.node]
                : anchor.ancestors;
              return { node: op.node!, ancestors, parent: ancestors.at(-1), list: [] };
            })()
          : undefined);
    let clause = clauses.at(-1);
    if (!clause || clause.id !== key) {
      if (groups.has(key))
        throw Error('Changes to one section must be together. Reorder and recheck the actions.');
      groups.add(key);
      const en = entry ? address(entry, 'en') : 'Guide',
        zh = entry ? address(entry, 'zh') : '指引';
      const suffix =
        op.type === 'repeal-guide' || (op.type === 'omit-provision' && key === op.target)
          ? 'repealed'
          : op.type === 'insert-provision' && key === op.node?.id
            ? 'added'
            : op.type === 'replace-provision' && key === op.target
              ? 'substituted'
              : 'amended';
      const includeOldHeading = ['amended', 'repealed'].includes(suffix);
      clause = {
        id: key,
        label: op.clause,
        heading: pair(
          `${en[0].toUpperCase() + en.slice(1)} ${suffix}${includeOldHeading && entry?.node.heading?.en ? ` (${entry.node.heading.en})` : ''}`,
          `${suffix === 'repealed' ? '廢除' : suffix === 'added' ? '加入' : suffix === 'substituted' ? '代替' : '修訂'}${zh}${includeOldHeading && entry?.node.heading?.zh ? `（${entry.node.heading.zh}）` : ''}`,
        ),
        items: [],
      };
      clauses.push(clause);
    }
    if (clause.label !== op.clause)
      throw Error('Actions grouped in the same clause must use the same clause number.');
    clause.items.push({
      label: op.subclause,
      text: instruction(state.guide, op),
      ...(['insert-provision', 'replace-provision'].includes(op.type) ? { payload: op.node } : {}),
      ...(op.type === 'replace-table' ? { table: op.table } : {}),
    });
    state = await applyAction(state, op);
  }
  return clauses;
}
export async function enactAmendment(
  base: Guide,
  a: Amendment,
  record: Enactment,
): Promise<Amendment> {
  if (a.stage !== 'draft') throw Error('Already enacted.');
  const clauses = await generate(base, a);
  const state = await proposed(base, a);
  if (!a.titles.en.trim() || !a.titles.zh.trim() || !a.actions.length)
    throw Error('Both titles and at least one action are required.');
  const labels = [
    a.citationLabel,
    ...(a.actions.every((x) => x.type === 'repeal-guide') ? [] : [a.introductionLabel]),
    ...clauses.map((c) => c.label),
  ];
  if (
    labels.some((s) => !s.trim()) ||
    new Set(labels).size !== labels.length ||
    clauses.some(
      (c) =>
        c.items.length > 1 &&
        (c.items.some((i) => !i.label.trim()) ||
          new Set(c.items.map((i) => i.label)).size !== c.items.length),
    )
  )
    throw Error('Give generated clauses and subclauses distinct manual numbers.');
  if (
    !state.repealed &&
    issues(state.guide).some((i) => i.severity === 'error' || i.code === 'duplicate-number')
  )
    throw Error('The proposed Guide has incomplete content or duplicate public addresses.');
  if (
    !validDate(record.date) ||
    !validDate(record.effective) ||
    record.effective < record.date ||
    record.effective < (base.revision?.asOf ?? base.enactment?.effective ?? '') ||
    !record.authority.trim()
  )
    throw Error('Enter valid enactment and effective dates and authority.');
  return { ...structuredClone(a), stage: 'enacted', enactment: record };
}
export async function revise(
  base: Guide,
  instruments: Amendment[],
  date: string,
): Promise<Revision> {
  if (base.stage !== 'enacted' || !validDate(date))
    throw Error('An enacted source and valid date are required.');
  let state: Revision = { guide: structuredClone(base), repealed: false, history: [] };
  const ordered = instruments
    .filter((a) => a.stage === 'enacted' && a.enactment!.effective <= date)
    .sort((a, b) => a.enactment!.effective.localeCompare(b.enactment!.effective));
  if (base.revision && date < base.revision.asOf)
    throw Error('Load the original source to view a date before this revision.');
  const seen = new Set<string>(base.revision?.instruments ?? []);
  for (const a of ordered) {
    if (seen.has(a.id)) throw Error('An instrument cannot be applied twice.');
    seen.add(a.id);
    const prev = state;
    const result = await proposed(state.guide, a);
    state = {
      ...result,
      history: [
        ...prev.history,
        ...a.actions.map((op) => ({
          instrument: a.id,
          titles: a.titles,
          date: a.enactment!.effective,
          clause: op.clause,
          target: op.target,
          action: op.type,
        })),
      ],
    };
    if (prev.repealed) throw Error('Cannot amend a repealed Guide.');
    if (a.enactment!.effective < (prev.guide.revision?.asOf ?? base.enactment!.effective))
      throw Error('An amendment cannot take effect before its source revision.');
    state.guide.revision = {
      asOf: a.enactment!.effective,
      instruments: [...(prev.guide.revision?.instruments ?? []), a.id],
    };
  }
  return state;
}
