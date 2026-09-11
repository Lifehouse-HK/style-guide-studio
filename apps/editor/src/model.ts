import {
  activeLanguages,
  blocks,
  canonical,
  newProject,
  parseProject,
  validate,
  walk,
  type Project,
  type Provision,
  type Kind,
  type Inline,
} from '../../../packages/domain/src/index.ts';
import type { JSONContent } from '@tiptap/core';
export const uid = () => 'n-' + crypto.randomUUID();
export function sample(): Project {
  const p = newProject();
  p.id = 'english-guide-2026';
  p.titles = {
    en: 'Church Publication (English) Style Guide 2026',
    'zh-Hant': '2026年教會刊物（英文）文體指引',
  };
  const make = (kind: Kind, label: string, heading: string, text = ''): Provision => ({
    id: uid(),
    kind,
    label,
    heading: { en: heading },
    content: { en: text ? [{ id: uid(), type: 'p', inlines: [{ text }] }] : [] },
    tail: {},
    children: [],
  });
  const a = make('part', '1', 'Preliminary');
  a.children = [
    make('section', '1', 'Citation', 'This Guide may be cited by its formal title.'),
    make('section', '2', 'Interpretation', 'In this Guide, “church” means the local church.'),
  ];
  const b = make('part', '2', 'Writing conventions');
  const s = make('section', '5', 'Spelling');
  s.children = [
    make('subsection', '1', '', 'Use British English spelling in all English publications.'),
    make('subsection', '2', '', 'Use the terminology specified in Schedule 1.'),
  ];
  b.children = [
    s,
    make('section', '5A', 'Capitalisation', 'Capitalise the names of recognised ministries.'),
    make('section', '6', 'Punctuation', 'Use a full stop at the end of a complete sentence.'),
  ];
  const sch = make('schedule', '1', 'Terminology');
  sch.shared = [
    {
      id: uid(),
      type: 'table',
      inlines: [],
      rows: [
        [[{ text: 'English' }], [{ text: '繁體中文' }]],
        [[{ text: 'church' }], [{ text: '教會' }]],
        [[{ text: 'worship' }], [{ text: '敬拜' }]],
      ],
    },
  ];
  p.provisions = [a, b, sch];
  return p;
}
export function change(p: Project, mutate: (draft: Project) => void): Project {
  if (p.stage !== 'draft') throw new Error('Adopted and withdrawn sources are read-only.');
  const next = structuredClone(p);
  mutate(next);
  return parseProject(canonical(next));
}
export function insertProvision(
  p: Project,
  target: string,
  position: 'after' | 'child' | 'end',
  kind: Kind,
  label: string,
): Project {
  return change(p, (draft) => {
    const node: Provision = {
      id: uid(),
      kind,
      ...(kind === 'crossheading' ? {} : { label }),
      heading: {},
      content: Object.fromEntries(
        activeLanguages(p).map((l) => [l, [{ id: uid(), type: 'p', inlines: [] }]]),
      ),
      tail: {},
      children: [],
    };
    function insert(ns: Provision[]): boolean {
      const index = ns.findIndex((n) => n.id === target);
      if (index >= 0) {
        if (position === 'child') ns[index].children.push(node);
        else ns.splice(index + 1, 0, node);
        return true;
      }
      return ns.some((n) => insert(n.children));
    }
    if (position === 'end') draft.provisions.push(node);
    else if (!insert(draft.provisions)) throw new Error('Select a provision first.');
    const errors = validate(draft).filter(
      (d) => d.severity === 'error' && !['titles', 'translation'].some((k) => d.code.includes(k)),
    );
    // Incomplete content remains saveable; structural ambiguity must never be inserted.
    const structural = errors.find((d) => /label|hierarchy|duplicate/i.test(d.code + d.message));
    if (structural) throw new Error(structural.message);
  });
}
const toMark: Record<string, string> = {
  bold: 'bold',
  italic: 'italic',
  literal: 'code',
  sup: 'superscript',
  sub: 'subscript',
};
const fromMark = Object.fromEntries(Object.entries(toMark).map(([a, b]) => [b, a]));
/** Inline references/terms/links are atoms: ordinary typing cannot discard their identities. */
export function toRich(xs: Inline[], label?: (inline: Inline) => string): JSONContent {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: xs
          .filter((i) => i.text || i.ref || i.term || i.href)
          .map((i) =>
            i.ref || i.term || i.href
              ? { type: 'citation', attrs: { value: i, ...(label ? { label: label(i) } : {}) } }
              : { type: 'text', text: i.text, marks: i.marks?.map((m) => ({ type: toMark[m] })) },
          ),
      },
    ],
  };
}
export function fromRich(doc: JSONContent): Inline[] {
  const out: Inline[] = [];
  for (const [index, paragraph] of (doc.content ?? []).entries()) {
    if (index) out.push({ text: '\n' });
    for (const n of paragraph.content ?? []) {
      if (n.type === 'citation') out.push(structuredClone(n.attrs!.value));
      else if (n.type === 'hardBreak') out.push({ text: '\n' });
      else if (n.text)
        out.push({
          text: n.text,
          ...(n.marks?.length
            ? { marks: n.marks.map((m) => fromMark[m.type]).filter(Boolean) as Inline['marks'] }
            : {}),
        });
    }
  }
  return out;
}
export function findBlock(p: Project, id: string) {
  return [...walk(p.provisions).flatMap(blocks), ...Object.values(p.opening.recitals).flat()].find(
    (b) => b.id === id,
  );
}
