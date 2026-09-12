import { preambleText } from './front-matter.ts';
import type { Catalogue } from './references.ts';
import { richPlain, replaceRich, escapeText } from './rich-text.ts';
import { editText } from './text-formatting.ts';
import { z } from 'zod';
import {
  checkEnactment,
  frontMatterIssues,
  referenceIssues,
  commonShape,
  paired,
  nodeSchema,
  definitionSchema,
  type Definition,
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
  'insert-definition': 'Insert definition',
  'replace-definition': 'Substitute definition',
  'omit-definition': 'Repeal definition',
  'insert-defined-name': 'Insert defined document name',
  'replace-defined-name': 'Substitute defined document name',
  'omit-defined-name': 'Repeal defined document name',
  'insert-text': 'Insert words',
  'omit-text': 'Omit words',
  'replace-front-matter': 'Substitute title or preamble',
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
    definitionId: z.string().optional(),
    definition: definitionSchema.optional(),
    documentId: z.string().optional(),
    alias: z
      .object({ term: paired, titles: paired, orderBy: paired.optional() })
      .strict()
      .optional(),
    frontField: z.enum(['titles', 'longTitle', 'preamble']).optional(),
    frontPair: paired.optional(),
    frontPreamble: commonShape.preamble.optional(),
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
    supplemental: z.array(nodeSchema).optional(),
  })
  .strict()
  .superRefine(checkEnactment);
export type Amendment = z.infer<typeof amendmentSchema>;
/** A reference/validation view of an amendment's own provisions, separate from its effects. */
export function amendmentGuide(a: Amendment, clauses: GeneratedClause[] = []): Guide {
  const generated = [
    {
      id: 'citation',
      label: a.citationLabel,
      heading: pair('Short title and commencement', '簡稱及生效日期'),
    },
    ...(!a.actions.every((op) => op.type === 'repeal-guide')
      ? [
          {
            id: 'introduction',
            label: a.introductionLabel,
            heading: pair('Style Guide amended', '修訂格式指引'),
          },
        ]
      : []),
    ...clauses.map((c) => ({ id: 'clause-' + c.label, label: c.label, heading: c.heading })),
  ].map((c) => ({
    ...newNode('section', c.label),
    id: c.id,
    heading: c.heading,
    blocks: [
      {
        id: 'generated-' + c.id,
        type: 'text' as const,
        text: pair('Generated provision', '自動產生條文'),
      },
    ],
  }));
  const { source, citationLabel, introductionLabel, actions, supplemental, ...common } = a;
  return { ...common, type: 'guide', nodes: [...generated, ...(supplemental ?? [])] };
}
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
    longTitle: pair(
      `A Style Guide to amend the ${base.titles.en}.`,
      `本指引旨在修訂《${base.titles.zh}》。`,
    ),
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
/** Definition substitution cannot conceal enacted renumbering or relocation. */
function preserveChildren(old: Node[], next: Node[]) {
  const before = entries(old),
    after = entries(next);
  for (const e of after) {
    const previous = before.find((p) => p.node.id === e.node.id);
    if (
      previous &&
      (previous.node.kind !== e.node.kind ||
        previous.node.label !== e.node.label ||
        previous.parent?.id !== e.parent?.id ||
        previous.definition?.id !== e.definition?.id)
    )
      throw Error('Cannot renumber or relocate definition paragraphs.');
  }
  for (const n of old) {
    const found = next.find((x) => x.id === n.id);
    if (found) preserveChildren(n.children, found.children);
    else next.splice(Math.min(old.indexOf(n), next.length), 0, tombstone(n));
  }
  const surviving = next
    .filter((n) => old.some((o) => o.id === n.id))
    .map((n) => old.findIndex((o) => o.id === n.id));
  if (surviving.some((n, i) => i > 0 && n < surviving[i - 1]))
    throw Error('Cannot reorder enacted definition paragraphs.');
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
  if (a.type === 'replace-front-matter') {
    if (a.target !== g.id || !a.frontField) throw Error('Choose the principal title or preamble.');
    if (a.frontField === 'preamble') {
      if (!a.frontPreamble) throw Error('Supply the preamble.');
      g.preamble = structuredClone(a.frontPreamble);
    } else {
      if (!a.frontPair) throw Error('Supply both language values.');
      g[a.frontField] = { ...a.frontPair };
    }
    guideSchema.parse(g);
    return next;
  }
  const e = actionEntry(g, a),
    n = e.node;
  switch (a.type) {
    case 'insert-definition':
    case 'replace-definition':
    case 'omit-definition':
    case 'insert-defined-name':
    case 'replace-defined-name':
    case 'omit-defined-name': {
      const list = n.blocks?.find((b) => b.id === a.block);
      if (list?.type !== 'definitions') throw Error('Select the definition list.');
      if (a.type.endsWith('defined-name')) {
        if (!list.master || !a.documentId) throw Error('Select the master list and document.');
        const old = g.aliases[a.documentId],
          inserting = a.type === 'insert-defined-name';
        if (inserting ? !!old : !old)
          throw Error(
            inserting
              ? 'This document name is already defined.'
              : 'The document name is not defined.',
          );
        if (a.type === 'omit-defined-name') {
          list.items.push({
            id: 'alias-' + a.documentId,
            term: { ...old },
            meaning: pair(),
            repealed: true,
          });
          delete g.aliases[a.documentId];
          if (g.aliasDetails) delete g.aliasDetails[a.documentId];
        } else {
          if (!a.alias) throw Error('Supply the short name and full formal titles.');
          g.aliases[a.documentId] = { ...a.alias.term };
          g.aliasDetails = {
            ...g.aliasDetails,
            [a.documentId]: { titles: { ...a.alias.titles }, orderBy: a.alias.orderBy },
          };
          list.items = list.items.filter((i) => i.id !== 'alias-' + a.documentId || !i.repealed);
        }
      } else {
        const old = list.items.find((i) => i.id === a.definitionId);
        if (a.type === 'insert-definition') {
          if (!a.definition || list.items.some((i) => i.id === a.definition!.id))
            throw Error('Supply a new definition identity.');
          list.items.push(structuredClone(a.definition));
        } else {
          if (!old || old.repealed) throw Error('Choose a current definition.');
          if (a.type === 'omit-definition') {
            old.repealed = true;
            old.meaning = pair();
            old.children = old.children?.map(tombstone);
            delete old.table;
          } else {
            if (!a.definition || a.definition.id !== old.id)
              throw Error('Definition substitution must preserve identity.');
            const replacement = structuredClone(a.definition);
            preserveChildren(
              old.children ?? [],
              replacement.children ?? (replacement.children = []),
            );
            list.items[list.items.indexOf(old)] = replacement;
          }
        }
      }
      break;
    }
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
            old.parent?.id !== entry.parent?.id ||
            old.definition?.id !== entry.definition?.id)
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
    case 'insert-text':
    case 'omit-text':
    case 'replace-text': {
      const b = n.blocks?.find((b) => b.id === a.block);
      if (!b || b.type === 'table' || b.type === 'definitions' || !a.language || !a.find)
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
      const replacement =
        a.type === 'omit-text'
          ? ''
          : a.type === 'insert-text'
            ? a.position === 'before'
              ? (a.replacement ?? '') + a.find
              : a.position === 'after'
                ? a.find + (a.replacement ?? '')
                : (() => {
                    throw Error('Choose before or after the anchor.');
                  })()
            : (a.replacement ?? '');
      if (a.type === 'insert-text' && !a.replacement) throw Error('Supply the inserted words.');
      Object.assign(
        b,
        editText(
          b,
          a.language,
          b.textFormat?.[a.language] === 'html'
            ? replaceRich(b.text[a.language], a.find, replacement)
            : text.slice(0, at) + replacement + text.slice(at + a.find.length),
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
  items: {
    label: string;
    text: Pair;
    payload?: Node;
    table?: Action['table'];
    definition?: Definition;
  }[];
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
  if (a.type === 'replace-front-matter') {
    const label =
      a.frontField === 'titles'
        ? pair('formal titles', '正式名稱')
        : a.frontField === 'longTitle'
          ? pair('long title', '詳題')
          : pair('preamble', '序言');
    const value =
      a.frontField === 'preamble'
        ? pair(
            preambleText(a.frontPreamble ?? { mode: 'none', paragraph: pair(), items: [] }, 'en'),
            preambleText(a.frontPreamble ?? { mode: 'none', paragraph: pair(), items: [] }, 'zh'),
          )
        : (a.frontPair ?? pair());
    if (a.frontField === 'preamble' && a.frontPreamble?.mode === 'none')
      return pair('The preamble is repealed.', '序言現予廢除。');
    return pair(
      `The ${label.en}—\nRepeal\nSubstitute ${quote(value.en)}.`,
      `${label.zh}——\n廢除\n代以「${value.zh}」。`,
    );
  }
  if (a.type === 'repeal-guide')
    return pair(`The ${g.titles.en} is repealed.`, `《${g.titles.zh}》現予廢除。`);
  const e = entries(g.nodes).find((e) => e.node.id === a.target);
  if (!e) throw Error('Missing target for generated text.');
  const en = address(e, 'en'),
    zh = address(e, 'zh');
  switch (a.type) {
    case 'insert-definition':
    case 'replace-definition':
    case 'omit-definition':
    case 'insert-defined-name':
    case 'replace-defined-name':
    case 'omit-defined-name': {
      const list = e.node.blocks?.find((b) => b.id === a.block);
      const term = a.documentId
        ? g.aliases[a.documentId]
        : list?.type === 'definitions'
          ? list.items.find((i) => i.id === a.definitionId)?.term
          : undefined;
      const insert = a.type.startsWith('insert'),
        omit = a.type.startsWith('omit');
      return pair(
        `${en}, ${insert ? 'interpretation list' : `definition of ${quote(term?.en ?? '')}`}—\n${insert ? 'Add—' : omit ? 'Repeal the definition.' : 'Repeal the definition\nSubstitute—'}`,
        `${zh}的${insert ? '釋義列表' : `「${term?.zh ?? ''}」的定義`}——\n${insert ? '加入——' : omit ? '廢除該定義。' : '廢除該定義\n代以——'}`,
      );
    }
    case 'insert-text':
      return pair(
        `${en}, ${a.language === 'en' ? 'English' : 'Chinese'} text—\n${a.position === 'before' ? 'Before' : 'After'} ${quote(a.find ?? '')}\nAdd ${quote(a.replacement ?? '')}.`,
        `${zh}的${a.language === 'en' ? '英文' : '中文'}文本——\n在「${a.find ?? ''}」${a.position === 'before' ? '之前' : '之後'}\n加入「${a.replacement ?? ''}」。`,
      );
    case 'omit-text':
      return pair(
        `${en}, ${a.language === 'en' ? 'English' : 'Chinese'} text—\nOmit ${quote(a.find ?? '')}.`,
        `${zh}的${a.language === 'en' ? '英文' : '中文'}文本——\n刪去「${a.find ?? ''}」。`,
      );

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
      ...(['insert-definition', 'replace-definition'].includes(op.type)
        ? { definition: op.definition }
        : {}),
      ...(['insert-defined-name', 'replace-defined-name'].includes(op.type) && op.alias
        ? {
            definition: {
              id: 'alias-' + op.documentId,
              term: op.alias.term,
              meaning: pair(
                'means ' + escapeText(op.alias.titles.en),
                '指' + escapeText(op.alias.titles.zh),
              ),
            },
          }
        : {}),
    });
    state = await applyAction(state, op);
  }
  return clauses;
}
export async function enactAmendment(
  base: Guide,
  a: Amendment,
  record: Enactment,
  catalogues: Catalogue[] = [],
): Promise<Amendment> {
  if (a.stage !== 'draft') throw Error('Already enacted.');
  const opening = frontMatterIssues(a);
  if (opening.length) throw Error(opening[0].message);
  const clauses = await generate(base, a);
  const own = amendmentGuide(a, clauses);
  guideSchema.parse(own);
  const ownErrors = issues(own, catalogues).filter(
    (i) => i.severity === 'error' || i.code === 'duplicate-number',
  );
  if (ownErrors.length) throw Error(ownErrors[0].message);
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
    issues(state.guide, catalogues).some(
      (i) => i.severity === 'error' || i.code === 'duplicate-number',
    )
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
