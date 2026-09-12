import {
  entries,
  address,
  languages,
  type Guide,
  type Node,
  type Block,
  canonical,
} from './document.ts';
import { richPlain } from './rich-text.ts';
export function blockText(b: Block): string {
  if (b.type === 'table')
    return [b.caption.en, b.caption.zh, ...b.rows.map((r) => r.join(' | '))].join('\n');
  if (b.type === 'definitions')
    return b.items
      .map((i) =>
        [
          i.term.en,
          i.term.zh,
          richPlain(i.meaning.en),
          richPlain(i.meaning.zh),
          i.table ? blockText(i.table) : '',
          i.closing?.en ?? '',
          i.closing?.zh ?? '',
        ].join(' — '),
      )
      .join('\n');
  return ['en', 'zh']
    .map((l) =>
      b.textFormat?.[l as 'en' | 'zh'] === 'html'
        ? richPlain(b.text[l as 'en' | 'zh'])
        : b.text[l as 'en' | 'zh'],
    )
    .join('\n');
}
export function nodeText(n: Node) {
  return [
    n.heading?.en,
    n.heading?.zh,
    ...(n.blocks ?? []).map(blockText),
    n.closing?.en,
    n.closing?.zh,
  ]
    .filter(Boolean)
    .join('\n');
}
export function searchGuide(g: Guide, query: string) {
  const q = query.trim().normalize('NFC').toLowerCase();
  if (!q) return [];
  const rows = [
    { target: 'details', location: 'Titles', text: g.titles.en + '\n' + g.titles.zh },
    {
      target: 'opening',
      location: 'Long title and preamble',
      text: [
        g.longTitle.en,
        g.longTitle.zh,
        ...(g.preamble.mode === 'list'
          ? g.preamble.items
          : g.preamble.mode === 'paragraph'
            ? [g.preamble.paragraph]
            : []
        ).flatMap((p) => [p.en, p.zh]),
      ].join('\n'),
    },
    { target: 'formula', location: 'Enacting formula', text: g.formula.en + '\n' + g.formula.zh },
    ...entries(g.nodes).map((e) => ({
      target: e.node.id,
      location: address(e),
      text: nodeText(e.node),
    })),
    ...Object.entries(g.aliases).map(([id, name]) => ({
      target: 'references',
      location: 'Defined document name',
      text: [
        name.en,
        name.zh,
        g.aliasDetails?.[id]?.titles.en,
        g.aliasDetails?.[id]?.titles.zh,
      ].join('\n'),
    })),
  ];
  return rows
    .filter((r) => r.text.normalize('NFC').toLowerCase().includes(q))
    .map((r) => {
      const at = r.text.toLowerCase().indexOf(q);
      return { ...r, snippet: r.text.slice(Math.max(0, at - 50), at + q.length + 150) };
    });
}
export function compareGuides(before: Guide, after: Guide) {
  const a = new Map(entries(before.nodes).map((e) => [e.node.id, e])),
    b = new Map(entries(after.nodes).map((e) => [e.node.id, e]));
  const result: {
    id: string;
    location: string;
    status: 'added' | 'repealed' | 'changed';
    before: string;
    after: string;
  }[] = [];
  for (const id of new Set([...a.keys(), ...b.keys()])) {
    const x = a.get(id),
      y = b.get(id);
    const left = x ? nodeText(x.node) : '',
      right = y ? nodeText(y.node) : '';
    if (
      !x ||
      !y ||
      left !== right ||
      canonical(x.node.blocks) !== canonical(y.node.blocks) ||
      !!x.node.repealed !== !!y.node.repealed
    )
      result.push({
        id,
        location: address(y ?? x!),
        status: !x ? 'added' : !y || y.node.repealed ? 'repealed' : 'changed',
        before: left,
        after: y?.node.repealed ? '[Repealed / 已廢除]' : right,
      });
  }
  for (const field of ['titles', 'longTitle', 'preamble', 'aliases', 'aliasDetails'] as const)
    if (canonical(before[field]) !== canonical(after[field]))
      result.push({
        id: field,
        location: field,
        status: 'changed',
        before: JSON.stringify(before[field] ?? {}, null, 2),
        after: JSON.stringify(after[field] ?? {}, null, 2),
      });
  return result;
}
