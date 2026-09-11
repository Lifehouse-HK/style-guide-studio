import { DOMParser, XMLSerializer } from '@xmldom/xmldom';
import {
  activeLanguages,
  assertValid,
  canonical,
  digest,
  parseProject,
  type Block,
  type Inline,
  type Language,
  type Project,
  type Provision,
  type Reference,
} from '../../domain/src/index.ts';
export const AKN = 'http://docs.oasis-open.org/legaldocml/ns/akn/3.0';
const SG = 'urn:lifehouse-hk:style-guide:project:1';
export const escapeXML = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
const tag = (name: string, body: string, attrs: Record<string, string> = {}) =>
  `<${name}${Object.entries(attrs)
    .map(([k, v]) => ` ${k}="${escapeXML(v)}"`)
    .join('')}>${body}</${name}>`;
export const saveProject = (p: Project): string => {
  const parsed = parseProject(canonical(p));
  assertValid(parsed);
  return canonical(parsed) + '\n';
};
/** Export one expression plus its canonical project in the standard extension point.
 * The embedded project owns cross-language/shared semantics; it is never silently
 * preferred over a separately edited XML expression on import. */
export async function exportAKN(
  p: Project,
  l: Language,
  date: string,
  projection?: { revision: string; asOf: string },
  referenceText?: (ref: Reference) => { label: string; href: string },
): Promise<string> {
  assertValid(p);
  if (!activeLanguages(p).includes(l)) throw new Error('No expression in requested language.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(date).toISOString().slice(0, 10) !== date)
    throw new Error('Explicit valid export date required.');
  const e = escapeXML,
    source = canonical(p),
    hash = await digest(source);
  const uri = `/akn/hk/${p.stage === 'draft' ? 'bill' : 'act'}/${p.publisher}/${p.id}`;
  const expr =
      uri +
      '/' +
      (l === 'en' ? 'eng' : 'zho') +
      '@' +
      encodeURIComponent(projection?.revision ?? p.revision),
    mani = expr + '/main.xml';
  const props = (u: string) =>
    tag('FRBRthis', '', { value: u }) +
    tag('FRBRuri', '', { value: u }) +
    tag('FRBRdate', '', {
      date: p.adoption?.date ?? date,
      name: p.adoption ? 'adoption' : 'generation',
    }) +
    tag('FRBRauthor', '', { href: '#sg_author' });
  const meta = tag(
    'meta',
    tag(
      'identification',
      tag('FRBRWork', props(uri) + tag('FRBRcountry', '', { value: 'hk' })) +
        tag(
          'FRBRExpression',
          props(expr) + tag('FRBRlanguage', '', { language: l === 'en' ? 'eng' : 'zho' }),
        ) +
        tag('FRBRManifestation', props(mani) + tag('FRBRformat', '', { value: 'application/xml' })),
      { source: '#sg_author' },
    ) +
      tag(
        'references',
        tag('TLCOrganization', '', {
          eId: 'sg_author',
          href: `urn:publisher:${p.publisher}`,
          showAs: p.publisher,
        }),
        { source: '#sg_author' },
      ) +
      tag(
        'proprietary',
        tag('sg:project', e(source), { 'xmlns:sg': SG, digest: hash, language: l, date }) +
          (projection
            ? tag('sg:projection', '', {
                'xmlns:sg': SG,
                revision: projection.revision,
                asOf: projection.asOf,
              })
            : ''),
        { source: '#sg_author' },
      ),
  );
  const inline = (xs: Inline[]): string =>
    xs
      .map((i) => {
        const rendered = i.ref ? referenceText?.(i.ref) : undefined;
        let v = e(rendered?.label ?? i.text);
        for (const m of i.marks ?? [])
          v = tag(
            ({ bold: 'b', italic: 'i', literal: 'span', sup: 'sup', sub: 'sub' } as const)[m],
            v,
            m === 'literal' ? { class: 'literal' } : {},
          );
        if (i.ref)
          v = tag('ref', v, {
            href:
              rendered?.href ??
              `urn:sg:${i.ref.publisher}:${i.ref.document}:${i.ref.selector}:${encodeURIComponent(i.ref.revision ?? '')}${i.ref.target ? '#n_' + i.ref.target : ''}`,
          });
        else if (i.href) v = tag('a', v, { href: i.href });
        if (i.term) v = tag('term', v, { refersTo: '#d_' + i.term });
        return v;
      })
      .join('');
  const block = (b: Block): string => {
    const attrs = { eId: 'b_' + b.id };
    if (b.type === 'table')
      return tag(
        'table',
        (b.caption ? tag('caption', e(b.caption)) : '') +
          (b.rows ?? [])
            .map((r, n) =>
              tag('tr', r.map((c) => tag(n ? 'td' : 'th', tag('p', inline(c)))).join('')),
            )
            .join(''),
        attrs,
      );
    if (b.type === 'figure') {
      const a = p.assets[b.asset!];
      return tag(
        'p',
        tag('img', '', { src: `data:${a.mediaType};base64,${a.data}`, alt: b.alt ?? '' }),
        attrs,
      );
    }
    return tag('p', inline(b.inlines), { ...attrs, class: b.type });
  };
  const bs = (xs: Block[]) => xs.map(block).join('');
  const replacement = (n: Provision, op: string): string =>
    tag(
      'blockContainer',
      tag('p', e((n.label ?? '') + ' ' + (n.heading[l] ?? ''))) +
        bs((n.shared ?? n.content[l] ?? []).map((b) => ({ ...b, id: op + '-' + b.id }))) +
        n.children.map((c) => replacement(c, op)).join('') +
        bs((n.tail[l] ?? []).map((b) => ({ ...b, id: op + '-' + b.id }))),
      { eId: 'q_' + op + '_' + n.id },
    );
  const node = (n: Provision): string => {
    if (n.kind === 'crossheading')
      return tag('crossHeading', e(n.heading[l] ?? ''), { eId: 'n_' + n.id });
    const generic = ['schedule', 'appendix', 'point'].includes(n.kind),
      name = generic ? 'hcontainer' : n.kind;
    const front =
      (n.label ? tag('num', e(n.label)) : '') +
      (n.heading[l] ? tag('heading', e(n.heading[l]!)) : '');
    const instructions = (p.amendment?.operations ?? [])
      .filter((op) => op.author === n.id)
      .map(
        (op) =>
          tag('p', e(op.instructions[l] ?? ''), { eId: 'op_' + op.id }) +
          (op.text !== undefined ? tag('p', tag('quotedText', e(op.text))) : '') +
          (op.block ? block({ ...op.block, id: op.id + '-' + op.block.id }) : '') +
          (op.node ? replacement(op.node, op.id) : ''),
      )
      .join('');
    const lead = bs(n.shared ?? n.content[l] ?? []) + instructions,
      tail = bs(n.tail[l] ?? []);
    const body = n.children.length
      ? (lead ? tag('intro', lead, { eId: 'i_' + n.id }) : '') +
        n.children.map(node).join('') +
        (tail ? tag('wrapUp', tail, { eId: 'w_' + n.id }) : '')
      : tag('content', lead + tail || '<p></p>', { eId: 'c_' + n.id });
    return tag(name, front + body, {
      eId: 'n_' + n.id,
      ...(generic ? { name: n.kind } : {}),
      ...(n.repealed ? { class: 'repealed' } : {}),
    });
  };
  const preface = tag(
    'preface',
    tag('p', tag('docTitle', e(p.titles[l]))) +
      (p.opening.longTitle[l]
        ? tag('longTitle', tag('p', e(p.opening.longTitle[l]!)), { eId: 'sg_longtitle' })
        : ''),
  );
  const preamble =
    bs(p.opening.recitals[l] ?? []) +
    (p.opening.formula[l]
      ? tag('formula', tag('p', e(p.opening.formula[l]!)), { eId: 'sg_formula', name: 'enacting' })
      : '');
  const conclusions = p.opening.authentication[l]
    ? tag('conclusions', tag('p', e(p.opening.authentication[l]!)))
    : '';
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    tag(
      'akomaNtoso',
      tag(
        p.stage === 'draft' ? 'bill' : 'act',
        meta +
          preface +
          (preamble ? tag('preamble', preamble) : '') +
          tag('body', p.provisions.map(node).join('')) +
          conclusions,
        { name: 'church-style-guide' },
      ),
      { xmlns: AKN },
    ) +
    '\n'
  );
}
export class UnsupportedImport extends Error {
  constructor(
    public location: string,
    message: string,
  ) {
    super(`${location}: ${message}`);
  }
}
export async function importAKN(xml: string): Promise<Project> {
  if (xml.length > 40_000_000 || /<!DOCTYPE|<!ENTITY/i.test(xml))
    throw new UnsupportedImport('/', 'DTD/entities or oversized XML are not supported.');
  const parse = (x: string) =>
    new DOMParser({
      onError: (level, msg) => {
        throw new UnsupportedImport('/', `${level}: ${msg}`);
      },
    }).parseFromString(x, 'application/xml');
  const doc = parse(xml),
    nodes = doc.getElementsByTagNameNS(SG, 'project');
  if (doc.getElementsByTagNameNS(SG, 'projection').length)
    throw new UnsupportedImport(
      '/meta/proprietary',
      'Derived revised expressions are read-only; edit the source instrument instead.',
    );
  if (doc.documentElement?.namespaceURI !== AKN || nodes.length !== 1)
    throw new UnsupportedImport(
      '/meta/proprietary',
      'Only the SG project-preserving AKN profile is editable; keep other AKN sources unchanged.',
    );
  const embedded = nodes.item(0)!,
    p = parseProject(embedded.textContent ?? '');
  if ((await digest(canonical(p))) !== embedded.getAttribute('digest'))
    throw new UnsupportedImport('/meta/proprietary', 'Project digest mismatch.');
  const l = embedded.getAttribute('language');
  if (l !== 'en' && l !== 'zh-Hant')
    throw new UnsupportedImport('/meta/proprietary', 'Unknown expression language.');
  const expected = parse(await exportAKN(p, l, embedded.getAttribute('date') ?? ''));
  const serializer = new XMLSerializer();
  if (serializer.serializeToString(doc) !== serializer.serializeToString(expected))
    throw new UnsupportedImport(
      '/',
      'XML differs from its canonical project. Import requires an explicit conversion; neither version has been discarded.',
    );
  return p;
}
