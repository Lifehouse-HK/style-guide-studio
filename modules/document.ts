import { richPlain } from './rich-text.ts';
import { z } from 'zod';

export type Language = 'en' | 'zh';
export type Pair = { en: string; zh: string };
export const pair = (en = '', zh = ''): Pair => ({ en, zh });
export const formula = pair(
  'To the glory of God and for the building up of His Church, BE IT ENACTED by the Translation Team of the Dream Team of Lifehouse Hong Kong as follows:—',
  '為榮耀神、建立祂的教會，香港生命堂夢幻團隊翻譯團隊現制定本指引如下：——',
);
const paired = z.object({ en: z.string(), zh: z.string() }).strict();
export const kinds = [
  'part',
  'division',
  'subdivision',
  'section',
  'subsection',
  'paragraph',
  'subparagraph',
  'subsubparagraph',
  'schedule',
  'appendix',
  'scheduleParagraph',
  'scheduleSubparagraph',
] as const;
export type Kind = (typeof kinds)[number];
export const names: Record<Kind, Pair> = {
  part: pair('Part', '部'),
  division: pair('Division', '分部'),
  subdivision: pair('Subdivision', '次分部'),
  section: pair('Section', '條'),
  subsection: pair('Subsection', '款'),
  paragraph: pair('Paragraph', '段'),
  subparagraph: pair('Subparagraph', '節'),
  subsubparagraph: pair('Sub-subparagraph', '分節'),
  schedule: pair('Schedule', '附表'),
  appendix: pair('Appendix', '附錄'),
  scheduleParagraph: pair('Schedule paragraph', '附表段'),
  scheduleSubparagraph: pair('Schedule subparagraph', '附表分段'),
};
export const isGroup = (k: Kind) => ['part', 'division', 'subdivision'].includes(k);
export const hasHeading = (k: Kind) =>
  isGroup(k) || ['section', 'schedule', 'appendix', 'scheduleParagraph'].includes(k);
export type TextBlock = {
  id: string;
  type: 'text' | 'quote' | 'note';
  text: Pair;
  align?: Partial<Record<Language, 'left' | 'center' | 'right'>>;
  textFormat?: Partial<Record<Language, 'html'>>;
  paragraphAlign?: Partial<Record<Language, ('left' | 'center' | 'right')[]>>;
};
export type Table = {
  id: string;
  type: 'table';
  caption: Pair;
  numbered: boolean;
  rows: string[][];
};
export type Definition = { id: string; term: Pair; meaning: Pair; orderBy?: Pair };
export type DefinitionList = {
  id: string;
  type: 'definitions';
  master: boolean;
  items: Definition[];
};
export type Block = TextBlock | Table | DefinitionList;
export type Node = {
  id: string;
  kind: Kind;
  label: string;
  heading?: Pair;
  blocks?: Block[];
  closing?: Pair;
  children: Node[];
  repealed?: boolean;
};
const blockSchema = z.union([
  z
    .object({
      id: z.string().min(1),
      type: z.literal('definitions'),
      master: z.boolean(),
      items: z.array(
        z
          .object({
            id: z.string().min(1),
            term: paired,
            meaning: paired,
            orderBy: paired.optional(),
          })
          .strict()
          .superRefine((item, ctx) => {
            for (const l of ['en', 'zh'] as const)
              try {
                richPlain(item.meaning[l]);
              } catch {
                ctx.addIssue({
                  code: 'custom',
                  message: 'Invalid restricted HTML in definition meaning.',
                });
              }
          }),
      ),
    })
    .strict(),
  z
    .object({
      id: z.string().min(1),
      type: z.enum(['text', 'quote', 'note']),
      text: paired,
      textFormat: z
        .object({ en: z.literal('html').optional(), zh: z.literal('html').optional() })
        .strict()
        .optional(),
      paragraphAlign: z
        .object({
          en: z.array(z.enum(['left', 'center', 'right'])).optional(),
          zh: z.array(z.enum(['left', 'center', 'right'])).optional(),
        })
        .strict()
        .optional(),
      align: z
        .object({
          en: z.enum(['left', 'center', 'right']).optional(),
          zh: z.enum(['left', 'center', 'right']).optional(),
        })
        .strict()
        .optional(),
    })
    .strict()
    .superRefine((b, ctx) => {
      for (const l of ['en', 'zh'] as const)
        if (b.textFormat?.[l] === 'html')
          try {
            for (const line of b.text[l].split('\n')) richPlain(line);
          } catch {
            ctx.addIssue({ code: 'custom', message: 'Invalid restricted HTML in ' + l + ' text.' });
          }
    }),
  z
    .object({
      id: z.string().min(1),
      type: z.literal('table'),
      caption: paired,
      numbered: z.boolean(),
      rows: z.array(z.array(z.string()).min(1)).min(1),
    })
    .strict(),
]);
const nodeSchema: z.ZodType<Node> = z.lazy(() =>
  z
    .object({
      id: z.string().regex(/^[a-zA-Z][\w-]*$/),
      kind: z.enum(kinds),
      label: z.string(),
      heading: paired.optional(),
      blocks: z.array(blockSchema).optional(),
      closing: paired.optional(),
      children: z.array(nodeSchema),
      repealed: z.boolean().optional(),
    })
    .strict()
    .superRefine((n, ctx) => {
      if (!hasHeading(n.kind) && n.heading !== undefined)
        ctx.addIssue({ code: 'custom', message: 'This level has no structural heading.' });
      if (isGroup(n.kind) && (n.blocks !== undefined || n.closing !== undefined))
        ctx.addIssue({ code: 'custom', message: 'Grouping levels contain provisions, not prose.' });
    }),
);
export type Enactment = { date: string; effective: string; authority: string };
export const enactmentSchema = z
  .object({ date: z.string(), effective: z.string(), authority: z.string() })
  .strict();
export const commonShape = {
  format: z.literal('lifehouse-guide/2'),
  id: z.string().regex(/^[a-zA-Z][\w-]*$/),
  titles: paired,
  mode: z.enum(['en', 'zh', 'parallel']),
  stage: z.enum(['draft', 'enacted']),
  longTitle: paired,
  formula: paired,
  preamble: z
    .object({
      mode: z.enum(['none', 'paragraph', 'list']),
      paragraph: paired,
      items: z.array(paired),
    })
    .strict(),
  enactment: enactmentSchema.optional(),
  aliases: z.record(z.string(), paired),
  aliasDetails: z
    .record(z.string(), z.object({ titles: paired, orderBy: paired.optional() }).strict())
    .optional(),
};
export const guideSchema = z
  .object({
    ...commonShape,
    type: z.literal('guide'),
    nodes: z.array(nodeSchema),
    revision: z
      .object({ asOf: z.string(), instruments: z.array(z.string()) })
      .strict()
      .optional(),
  })
  .strict()
  .superRefine(checkEnactment)
  .superRefine((g, ctx) => {
    const masters = entries(g.nodes)
      .filter((e) => ![...e.ancestors, e.node].some((n) => n.repealed))
      .flatMap((e) => e.node.blocks ?? [])
      .filter((b) => b.type === 'definitions' && b.master);
    if (masters.length > 1)
      ctx.addIssue({
        code: 'custom',
        message: 'Only one master definition list is allowed per document.',
      });
  });
export type Guide = z.infer<typeof guideSchema>;
export const id = () => 'n' + crypto.randomUUID().replaceAll('-', '');
export const languages = (p: { mode: 'en' | 'zh' | 'parallel' }): Language[] =>
  p.mode === 'parallel' ? ['en', 'zh'] : [p.mode];
export function newGuide(): Guide {
  return {
    format: 'lifehouse-guide/2',
    type: 'guide',
    id: 'guide-' + crypto.randomUUID(),
    titles: pair(),
    mode: 'en',
    stage: 'draft',
    longTitle: pair('A Style Guide to'),
    formula: { ...formula },
    preamble: { mode: 'none', paragraph: pair(), items: [] },
    nodes: [],
    aliases: {},
  };
}
export function newNode(kind: Kind, label: string): Node {
  return {
    id: id(),
    kind,
    label,
    ...(hasHeading(kind) ? { heading: pair() } : {}),
    ...(!isGroup(kind) ? { blocks: [], closing: pair() } : {}),
    children: [],
  };
}
export const textBlock = (): TextBlock => ({ id: id(), type: 'text', text: pair() });
export type Entry = { node: Node; parent?: Node; ancestors: Node[]; list: Node[] };
export function entries(nodes: Node[], ancestors: Node[] = []): Entry[] {
  return nodes.flatMap((node) => [
    { node, parent: ancestors.at(-1), ancestors, list: nodes },
    ...entries(node.children, [...ancestors, node]),
  ]);
}
export function allowed(parent?: Node, inSchedule = false): Kind[] {
  if (!parent) return ['part', 'section', 'schedule', 'appendix'];
  const leaf: Kind = inSchedule ? 'scheduleParagraph' : 'section';
  switch (parent.kind) {
    case 'part':
      return ['division', 'subdivision', leaf];
    case 'division':
      return ['subdivision', leaf];
    case 'subdivision':
      return [leaf];
    case 'schedule':
    case 'appendix':
      return ['part', 'division', 'subdivision', 'scheduleParagraph'];
    case 'section':
      return ['subsection', 'paragraph'];
    case 'subsection':
      return ['paragraph'];
    case 'scheduleParagraph':
      return ['scheduleSubparagraph', 'paragraph'];
    case 'scheduleSubparagraph':
      return ['paragraph'];
    case 'paragraph':
      return ['subparagraph'];
    case 'subparagraph':
      return ['subsubparagraph'];
    default:
      return [];
  }
}
export const inSchedule = (e: Entry) =>
  [...e.ancestors, e.node].some((n) => ['schedule', 'appendix'].includes(n.kind));
export function address(e: Entry, lang: Language = 'en'): string {
  const n = e.node,
    path = [...e.ancestors, n];
  const container = path.find((x) => x.kind === 'schedule' || x.kind === 'appendix');
  const main = path.findIndex((x) => x.kind === 'section' || x.kind === 'scheduleParagraph');
  if (main < 0)
    return path
      .map((x) =>
        lang === 'en'
          ? `${names[x.kind].en} ${x.label}`
          : ['schedule', 'appendix'].includes(x.kind)
            ? `${names[x.kind].zh}${x.label}`
            : `第${x.label}${names[x.kind].zh}`,
      )
      .join(lang === 'en' ? ', ' : '');
  const chain = path
    .slice(main)
    .map((x, i) => (i ? `(${x.label})` : x.label))
    .join('');
  return lang === 'en'
    ? `${container ? 'paragraph' : 'section'} ${chain}${container ? ` of ${names[container.kind].en} ${container.label}` : ''}`
    : `${container ? `${names[container.kind].zh}${container.label}` : ''}第${chain}${container ? '段' : '條'}`;
}
export type Issue = {
  severity: 'warning' | 'error';
  target: string;
  message: string;
  code: string;
};
// Canonical Roman numerals are compared numerically; inserted suffixes follow their base.
function roman(n: number): string {
  let s = '';
  for (const [v, t] of [
    [1000, 'm'],
    [900, 'cm'],
    [500, 'd'],
    [400, 'cd'],
    [100, 'c'],
    [90, 'xc'],
    [50, 'l'],
    [40, 'xl'],
    [10, 'x'],
    [9, 'ix'],
    [5, 'v'],
    [4, 'iv'],
    [1, 'i'],
  ] as [number, string][])
    while (n >= v) {
      s += t;
      n -= v;
    }
  return s;
}
function token(kind: Kind, s: string): [number, string] | null {
  if (kind === 'paragraph') return /^[a-z]+$/.test(s) ? [0, s] : null;
  if (kind === 'subsubparagraph') return /^[A-Z]+$/.test(s) ? [0, s] : null;
  if (kind === 'subparagraph') {
    for (let i = s.length; i > 0; i--) {
      const r = s.slice(0, i);
      if (!/^[ivxlcdm]+$/.test(r)) continue;
      let value = 0;
      for (let j = 0; j < r.length; j++) {
        const v = ({ i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 } as Record<string, number>)[
          r[j]
        ];
        const next =
          ({ i: 1, v: 5, x: 10, l: 50, c: 100, d: 500, m: 1000 } as Record<string, number>)[
            r[j + 1]
          ] ?? 0;
        value += v < next ? -v : v;
      }
      if (value > 0 && value <= 3999 && roman(value) === r && /^[a-z]*$/.test(s.slice(i)))
        return [value, s.slice(i)];
    }
    return null;
  }
  const m = /^([1-9][0-9]*)([A-Z]*)$/.exec(s);
  return m && Number.isSafeInteger(+m[1]) ? [+m[1], m[2]] : null;
}
export function numbering(nodes: Node[]): Issue[] {
  const issues: Issue[] = [],
    scopes = new Map<string, { seen: Set<string>; last: [number, string] | null }>();
  for (const e of entries(nodes)) {
    const n = e.node;
    const container = e.ancestors.find((x) => ['schedule', 'appendix'].includes(x.kind));
    const scope =
      (n.kind === 'section'
        ? 'body'
        : n.kind === 'scheduleParagraph'
          ? (container?.id ?? 'schedule')
          : (e.parent?.id ?? 'root')) +
      ':' +
      n.kind;
    const state = scopes.get(scope) ?? { seen: new Set<string>(), last: null };
    scopes.set(scope, state);
    const add = (code: string, message: string) =>
      issues.push({ severity: 'warning', target: n.id, code, message });
    if (state.seen.has(n.label))
      add('duplicate-number', `Duplicate ${names[n.kind].en.toLowerCase()} number “${n.label}”.`);
    state.seen.add(n.label);
    const t = token(n.kind, n.label);
    if (!t) add('number-form', `Check number “${n.label}” for ${names[n.kind].en.toLowerCase()}.`);
    else {
      if (state.last && (t[0] < state.last[0] || (t[0] === state.last[0] && t[1] < state.last[1])))
        add('number-order', `Number “${n.label}” is out of order. Your order is retained.`);
      state.last = t;
    }
  }
  return issues;
}
export function issues(g: Guide): Issue[] {
  const out = numbering(g.nodes),
    seen = new Set<string>();
  const add = (target: string, code: string, message: string) =>
    out.push({ severity: 'error', target, code, message });
  if (!g.nodes.length) add('details', 'empty-guide', 'Add at least one body provision.');
  for (const l of languages(g)) {
    if (!g.formula[l].trim()) add('formula', 'formula', 'Complete the enacting formula.');
    if (g.preamble.mode === 'paragraph' && !g.preamble.paragraph[l].trim())
      add('opening', 'preamble', 'Complete the preamble text.');
    if (
      g.preamble.mode === 'list' &&
      (!g.preamble.items.length || g.preamble.items.some((i) => !i[l].trim()))
    )
      add('opening', 'preamble', 'Complete each recital in the document languages.');
  }
  if (!g.titles.en.trim() || !g.titles.zh.trim())
    add('details', 'titles', 'Both formal titles are required.');
  for (const e of entries(g.nodes)) {
    const n = e.node;
    if (seen.has(n.id)) add(n.id, 'identity', 'Duplicate permanent identity.');
    seen.add(n.id);
    if (
      !allowed(
        e.parent,
        e.ancestors.some((x) => ['schedule', 'appendix'].includes(x.kind)),
      ).includes(n.kind)
    )
      add(n.id, 'structure', 'This level cannot occur at this location.');
    if (!n.repealed) {
      for (const l of languages(g)) {
        if (
          hasHeading(n.kind) &&
          !['scheduleParagraph', 'schedule'].includes(n.kind) &&
          !n.heading?.[l].trim()
        )
          add(n.id, 'heading', `${l === 'en' ? 'English' : 'Chinese'} heading is required.`);
        if (!isGroup(n.kind) && !n.children.length && !n.blocks?.length)
          add(n.id, 'empty', 'Add text, a table or child provisions.');
        for (const b of n.blocks ?? [])
          if (
            b.type !== 'table' &&
            b.type !== 'definitions' &&
            !(b.textFormat?.[l] === 'html' ? richPlain(b.text[l]) : b.text[l]).trim()
          )
            add(
              n.id,
              'translation',
              `Complete the ${l === 'en' ? 'English' : 'Chinese'} block text.`,
            );
      }
      for (const b of n.blocks ?? []) {
        if (seen.has(b.id)) add(n.id, 'identity', 'Duplicate block identity.');
        seen.add(b.id);
        if (b.type === 'definitions') {
          const terms = new Map<Language, Set<string>>(languages(g).map((l) => [l, new Set()]));
          if (!b.items.length && !(b.master && Object.keys(g.aliases).length))
            add(n.id, 'definitions', 'Add at least one definition.');
          for (const item of b.items) {
            if (seen.has(item.id)) add(n.id, 'identity', 'Duplicate definition identity.');
            seen.add(item.id);
            for (const l of languages(g)) {
              if (!item.term[l].trim() || !richPlain(item.meaning[l]).trim())
                add(n.id, 'definitions', `Complete the ${l} term and meaning.`);
              for (const m of item.meaning[l].matchAll(/\[\[#([^\]]+)\]\]/g))
                if (!entries(g.nodes).some((x) => x.node.id === m[1]))
                  add(n.id, 'reference', `Missing local reference ${m[1]}.`);
            }
          }
          for (const term of [
            ...b.items.map((i) => i.term),
            ...(b.master ? Object.values(g.aliases) : []),
          ])
            for (const l of languages(g)) {
              const key = term[l].trim().normalize('NFC').toLowerCase();
              if (terms.get(l)!.has(key))
                add(n.id, 'definitions', `Duplicate ${l} definition term “${term[l]}”.`);
              terms.get(l)!.add(key);
            }
          if (b.master)
            for (const [target, term] of Object.entries(g.aliases))
              for (const l of languages(g))
                if (!term[l].trim() || !g.aliasDetails?.[target]?.titles[l].trim())
                  add(
                    n.id,
                    'definitions',
                    `Complete the ${l} short name and save its formal title in References.`,
                  );
        }
        if (b.type === 'table' && b.rows.some((r) => r.length !== b.rows[0].length))
          add(n.id, 'table', 'Every table row must have the same number of columns.');
      }
    }
  }
  for (const e of entries(g.nodes))
    for (const b of e.node.blocks ?? [])
      if (b.type !== 'table' && b.type !== 'definitions')
        for (const l of languages(g))
          for (const m of b.text[l].matchAll(/\[\[#([^\]]+)\]\]/g))
            if (!entries(g.nodes).some((x) => x.node.id === m[1]))
              add(e.node.id, 'reference', `Missing local reference ${m[1]}.`);
  return out;
}
export function edit(g: Guide, fn: (copy: Guide) => void): Guide {
  if (g.stage !== 'draft') throw Error('Enacted guides are read-only. Create an amendment.');
  const copy = structuredClone(g);
  fn(copy);
  return guideSchema.parse(copy);
}
export function insert(g: Guide, parentId: string, position: number, n: Node): Guide {
  return edit(g, (c) => {
    const e = entries(c.nodes).find((e) => e.node.id === parentId);
    if (parentId && !e) throw Error('Parent not found.');
    if (!allowed(e?.node, e ? inSchedule(e) : false).includes(n.kind))
      throw Error('That structural level is not allowed here.');
    (e?.node.children ?? c.nodes).splice(position, 0, n);
  });
}
export function move(g: Guide, nodeId: string, parentId: string, position: number): Guide {
  return edit(g, (c) => {
    const e = entries(c.nodes).find((x) => x.node.id === nodeId);
    if (!e) throw Error('Provision not found.');
    if (entries([e.node]).some((x) => x.node.id === parentId))
      throw Error('A provision cannot contain itself.');
    e.list.splice(e.list.indexOf(e.node), 1);
    const target = entries(c.nodes).find((x) => x.node.id === parentId);
    if (parentId && !target) throw Error('Destination not found.');
    if (!allowed(target?.node, target ? inSchedule(target) : false).includes(e.node.kind))
      throw Error('That destination cannot contain this level.');
    (target?.node.children ?? c.nodes).splice(position, 0, e.node);
  });
}
export function remove(g: Guide, nodeId: string): Guide {
  return edit(g, (c) => {
    const e = entries(c.nodes).find((x) => x.node.id === nodeId);
    if (!e) throw Error('Provision not found.');
    e.list.splice(e.list.indexOf(e.node), 1);
  });
}
export function validDate(s: string): boolean {
  return (
    /^\d{4}-\d\d-\d\d$/.test(s) &&
    !Number.isNaN(Date.parse(s)) &&
    new Date(s).toISOString().slice(0, 10) === s
  );
}
export function enact(g: Guide, record: Enactment): Guide {
  if (g.stage !== 'draft') throw Error('Already enacted.');
  const errors = issues(g).filter((x) => x.severity === 'error' || x.code === 'duplicate-number');
  if (errors.length)
    throw Error(
      'Resolve incomplete content and duplicate public addresses before enactment. Draft saving remains available.',
    );
  if (
    !validDate(record.date) ||
    !validDate(record.effective) ||
    record.effective < record.date ||
    !record.authority.trim()
  )
    throw Error('Enter authority and valid enactment/effective dates.');
  return { ...structuredClone(g), stage: 'enacted', enactment: record };
}
export function serialize(value: unknown): string {
  return JSON.stringify(value, null, 2) + '\n';
}
export async function digest(value: unknown): Promise<string> {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonical(value)));
  return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
export { nodeSchema, paired };

/** Key order is not source identity; array order and exact string bytes are. */
export function canonical(value: unknown): string {
  const sort = (v: any): any =>
    Array.isArray(v)
      ? v.map(sort)
      : v && typeof v === 'object'
        ? Object.fromEntries(
            Object.keys(v)
              .sort()
              .filter((k) => v[k] !== undefined)
              .map((k) => [k, sort(v[k])]),
          )
        : v;
  return JSON.stringify(sort(value));
}

export function checkEnactment(d: { stage: string; enactment?: Enactment }, ctx: z.RefinementCtx) {
  if (
    d.stage === 'enacted' &&
    (!d.enactment ||
      !validDate(d.enactment.date) ||
      !validDate(d.enactment.effective) ||
      d.enactment.effective < d.enactment.date ||
      !d.enactment.authority.trim())
  )
    ctx.addIssue({
      code: 'custom',
      message: 'An enacted source requires valid enactment metadata.',
    });
}
