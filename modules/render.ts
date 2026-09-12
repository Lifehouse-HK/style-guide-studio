import { recitalText } from './front-matter.ts';
import { definitionRows, definedDocument } from './definitions.ts';
import { parseRich, referenceRuns } from './rich-text.ts';
import { alignments } from './text-formatting.ts';
import {
  address,
  definitionAnchor,
  entries,
  hasHeading,
  isGroup,
  pair,
  names,
  type Guide,
  type Node,
  type Pair,
  type Language,
  type Block,
  type TextBlock,
} from './document.ts';
import {
  generate,
  amendmentGuide,
  type Document,
  type Amendment,
  type Revision,
} from './amendments.ts';
import { resolve, type Catalogue } from './references.ts';
export type Layout = 'en' | 'zh' | 'parallel';
export const escape = (s: string) =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
export const stylesheet = `
.definition-branches{margin-left:2.3em}.definitions{margin:8px 0 12px}.definition-entry{margin:6px 0 6px 2.3em}.definition-entry p{margin:0}.definition-entry{break-inside:avoid}
.small-caps{font-variant-caps:small-caps}.preamble-intro{break-after:avoid}
.document-heading{break-inside:avoid}.publication-logo{display:block;width:44mm;height:auto;max-width:100%;margin:0 auto 5mm}
@page{size:A4;margin:20mm 18mm;@bottom-center{content:counter(page);font-size:10pt}}*{box-sizing:border-box}body{max-width:900px;margin:30px auto;padding:0 28px;font-family:"Times New Roman","Noto Serif CJK TC","Songti TC",serif;font-size:12pt;line-height:1.55;color:#111}h1{text-align:center;font-size:20pt;line-height:1.3}h2{font-size:15pt;text-align:center;margin:24px 0 12px}h3{font-size:12pt;margin:18px 0 6px}p{margin:6px 0}.pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:25px}.pair>*{min-width:0}.children{margin-left:1.7em}.number{display:inline-block;min-width:2.3em;font-weight:normal}.status{border-block:1px solid #555;padding:8px 0;text-align:center;margin:20px 0;font-family:system-ui,sans-serif;font-size:10pt}.clause{margin:12px 0}.group{margin-top:25px}.muted{color:#555}.note{font-size:10pt;border-left:2px solid #bbb;padding-left:10px}blockquote{margin:8px 0 12px 22px;border-left:2px solid #aaa;padding-left:15px}table{width:100%;border-collapse:collapse;margin:12px 0;font-size:11pt;table-layout:fixed}th,td{border:1px solid #777;padding:6px;vertical-align:top;overflow-wrap:anywhere}th{font-weight:bold}caption{text-align:left;font-weight:bold}thead{display:table-header-group}.row-number{width:3em}tr{break-inside:avoid}a{color:#134f80;text-decoration:underline}code{font-family:monospace;font-size:.9em}nav{border-bottom:1px solid #777;padding:12px 0;margin-bottom:24px}nav ul{list-style:none;padding-left:15px}nav a{color:inherit}h2,h3{break-after:avoid}.warning{color:#8c2a15}.parallel{max-width:1400px}.shared{grid-column:1/-1}.history{font-size:10pt;border-top:1px solid #777;margin-top:30px}@media print{body{margin:0;padding:0;max-width:none}a{color:inherit}.status{font-family:serif}.no-print{display:none}}
`;
export function inline(
  text: string,
  g: Guide,
  lang: Language,
  catalogues: Catalogue[] = [],
  pdf = false,
): string {
  const pattern = /\[\[([^\]]+)\]\]|\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|__([^_]+)__/g;
  let out = '',
    at = 0;
  for (const m of text.matchAll(pattern)) {
    out += escape(text.slice(at, m.index)).replaceAll('\n', '<br>');
    if (m[1]) {
      const r = resolve(m[1], g, lang, catalogues, pdf);
      out += r.href
        ? `<a href="${escape(r.href)}"${r.warning ? ` title="${escape(r.warning)}"` : ''}>${escape(r.label)}</a>`
        : `<span class="warning">${escape(r.label)}</span>`;
    } else
      out += m[2]
        ? `<strong>${escape(m[2])}</strong>`
        : m[3]
          ? `<em>${escape(m[3])}</em>`
          : m[4]
            ? `<code>${escape(m[4])}</code>`
            : `<u>${escape(m[5])}</u>`;
    at = m.index! + m[0].length;
  }
  return out + escape(text.slice(at)).replaceAll('\n', '<br>');
}
export function richInline(
  text: string,
  g: Guide,
  lang: Language,
  catalogues: Catalogue[] = [],
  pdf = false,
): string {
  return referenceRuns(parseRich(text))
    .map((run) => {
      let content = escape(run.text);
      if (run.key) {
        const r = resolve(run.key, g, lang, catalogues, pdf);
        content = r.href
          ? `<a href="${escape(r.href)}"${r.warning ? ` title="${escape(r.warning)}"` : ''}>${escape(r.label)}</a>`
          : `<span class="warning">${escape(r.label)}</span>`;
      }
      return run.marks.reduceRight((html, mark) => `<${mark}>${html}</${mark}>`, content);
    })
    .join('');
}
export type RenderOptions = {
  layout: Layout;
  /** Embedded publication identity supplied by the application/build adapter. */
  logo?: string;
  catalogues?: Catalogue[];
  pdf?: boolean;
  history?: boolean;
  revision?: Revision;
  proposed?: boolean;
  iframe?: boolean;
};
export async function render(
  document: Document,
  options: RenderOptions,
  source?: Guide,
): Promise<string> {
  const { layout } = options,
    langs: Language[] = layout === 'parallel' ? ['en', 'zh'] : [layout],
    g = document.type === 'guide' ? document : source;
  if (!g) throw Error('Load the amendment source to generate the proof.');
  let referenceGuide = g;
  const esc = escape,
    fmt = (s: string, l: Language) => inline(s, referenceGuide, l, options.catalogues, options.pdf),
    paired = (fn: (l: Language) => string) =>
      layout === 'parallel'
        ? `<div class="pair">${langs.map((l) => `<div lang="${l === 'zh' ? 'zh-Hant' : 'en'}">${fn(l)}</div>`).join('')}</div>`
        : fn(langs[0]);
  const table = (b: { caption: Pair; numbered: boolean; rows: string[][] }) =>
    `<table><caption>${layout === 'parallel' ? esc(b.caption.en) + ' / ' + esc(b.caption.zh) : esc(b.caption[langs[0]])}</caption><thead><tr>${b.numbered ? '<th scope="col" class="row-number">#</th>' : ''}${b.rows[0].map((c) => `<th scope="col">${fmt(c, langs[0])}</th>`).join('')}</tr></thead><tbody>${b.rows
      .slice(1)
      .map(
        (r, i) =>
          `<tr>${b.numbered ? `<td>${i + 1}</td>` : ''}${r.map((c) => `<td>${fmt(c, langs[0])}</td>`).join('')}</tr>`,
      )
      .join('')}</tbody></table>`;
  const paragraphs = (b: TextBlock, l: Language, prefix = '') => {
    const alignment = alignments(b, l);
    return b.text[l]
      .split('\n')
      .map(
        (text, i) =>
          `<p style="text-align:${alignment[i]}"${b.type === 'note' ? ' class="note"' : ''}>${i === 0 ? prefix : ''}${(b.textFormat?.[l] === 'html' ? richInline(text, referenceGuide, l, options.catalogues, options.pdf) : fmt(text, l)) || '<br>'}</p>`,
      )
      .join('');
  };
  const block = (b: Block): string =>
    b.type === 'table'
      ? `<div class="shared">${table(b)}</div>`
      : b.type === 'definitions'
        ? `<div class="definitions">${definitionRows(
            b,
            referenceGuide,
            layout === 'zh' ? 'zh' : 'en',
          )
            .map((row, i, rows) => {
              const nested = !!row.children?.length || !!row.table;
              const punctuation = (l: Language) =>
                i === rows.length - 1 ? (l === 'en' ? '.' : '。') : l === 'en' ? ';' : '；';
              return (
                paired((l) => {
                  const target = row.documentId
                    ? definedDocument(row, referenceGuide, l, options.catalogues, options.pdf)
                    : undefined;
                  const meaning = row.repealed
                    ? l === 'en'
                      ? '[Repealed]'
                      : '[已廢除]'
                    : target
                      ? `${l === 'en' ? 'means ' : '指'}${target.href ? `<a href="${esc(target.href)}">${esc(target.title)}</a>` : esc(target.title)}`
                      : richInline(
                          row.meaning[l],
                          g,
                          l,
                          options.catalogues,
                          options.pdf,
                        ).replaceAll('\n', '<br>');
                  return `<div class="definition-entry"${l === langs[0] ? ` id="${esc(definitionAnchor(b.id, row.documentId ? 'alias-' + row.documentId : row.id))}"` : ''}><p>“${esc(row.term[l])}”${l === 'en' ? ' ' : ''}${meaning}${!nested ? punctuation(l) : ''}</p></div>`;
                }) +
                (nested && !row.repealed
                  ? `<div class="definition-branches">${row.table ? block(row.table) : ''}${row.children?.map((n) => node(n)).join('') ?? ''}${row.closing ? paired((l) => `<p>${fmt(row.closing![l], l)}${punctuation(l)}</p>`) : ''}</div>`
                  : '')
              );
            })
            .join('')}</div>`
        : paired((l) =>
            b.type === 'quote' ? `<blockquote>${paragraphs(b, l)}</blockquote>` : paragraphs(b, l),
          );
  function node(n: Node, quoted = false): string {
    const headingLabel = (l: Language) =>
      isGroup(n.kind) || ['schedule', 'appendix'].includes(n.kind)
        ? l === 'en'
          ? `${names[n.kind].en} ${n.label}`
          : ['schedule', 'appendix'].includes(n.kind)
            ? `${names[n.kind].zh}${n.label}`
            : `第${n.label}${names[n.kind].zh}`
        : n.label + '.';
    const h = isGroup(n.kind) || ['schedule', 'appendix'].includes(n.kind) ? 'h2' : 'h3';
    const heading = hasHeading(n.kind)
      ? paired((l) => `<${h}>${esc(headingLabel(l))} ${esc(n.heading?.[l] ?? '')}</${h}>`)
      : '';
    const numbered = !hasHeading(n.kind),
      first = n.blocks?.[0];
    const text = n.repealed
      ? paired(
          (l) =>
            `<p>${numbered ? `<span class="number">(${esc(n.label)})</span>` : ''}${l === 'en' ? '[Repealed]' : '[已廢除]'}</p>`,
        )
      : (numbered
          ? paired((l) =>
              first && first.type === 'text'
                ? paragraphs(first, l, `<span class="number">(${esc(n.label)})</span>`)
                : `<p><span class="number">(${esc(n.label)})</span></p>`,
            )
          : '') +
        (n.blocks ?? [])
          .slice(numbered && first?.type === 'text' ? 1 : 0)
          .map(block)
          .join('');
    return `<section${quoted ? '' : ` id="${esc(n.id)}"`} class="${isGroup(n.kind) ? 'group' : 'clause'}">${heading}${text}${n.kind === 'appendix' ? paired((l) => `<p class="muted">${l === 'en' ? 'Informative appendix' : '資料性附錄'}</p>`) : ''}<div class="${isGroup(n.kind) || n.kind === 'schedule' || n.kind === 'appendix' ? '' : 'children'}">${n.children.map((c) => node(c, quoted)).join('')}</div>${n.closing ? paired((l) => (n.closing![l] ? `<p>${fmt(n.closing![l], l)}</p>` : '')) : ''}</section>`;
  }
  const status = paired((l) =>
    options.proposed
      ? (l === 'en' ? 'PROPOSED — NOT IN EFFECT' : '建議文本 — 尚未生效') +
        (options.revision?.repealed
          ? l === 'en'
            ? ' · Entire Guide would be repealed'
            : ' · 整份指引將被廢除'
          : '')
      : options.revision?.repealed
        ? l === 'en'
          ? 'REPEALED'
          : '已廢除'
        : document.stage === 'draft'
          ? l === 'en'
            ? 'DRAFT — NOT IN EFFECT'
            : '草案 — 尚未生效'
          : `${l === 'en' ? 'ENACTED' : '已制定'} · ${esc(document.enactment?.date ?? '')} · ${l === 'en' ? 'Effective' : '生效'}: ${esc(document.enactment?.effective ?? '')}`,
  );
  let body = '';
  if (document.type === 'guide') body = document.nodes.map((n) => node(n)).join('');
  else {
    const clauses = await generate(g, document);
    const clause = (label: string, heading: Pair, content: string, anchor: string) =>
      `<section id="${esc(anchor)}">${paired((l) => `<h3>${esc(label)}. ${esc(heading[l])}</h3>`)}${content}</section>`;
    body = clause(
      document.citationLabel,
      pair('Short title and commencement', '簡稱及生效日期'),
      paired(
        (l) =>
          `<p>${l === 'en' ? `This Style Guide may be cited as the ${esc(document.titles.en)}.` : `本格式指引可引稱為《${esc(document.titles.zh)}》。`}</p><p>${l === 'en' ? 'This Style Guide comes into operation on ' : '本格式指引於'}${esc(document.enactment?.effective ?? '[effective date / 生效日期]')}${l === 'en' ? '.' : '起實施。'}</p>`,
      ),
      'citation',
    );
    if (!document.actions.every((a) => a.type === 'repeal-guide'))
      body += clause(
        document.introductionLabel,
        pair('Style Guide amended', '修訂格式指引'),
        paired(
          (l) =>
            `<p>${l === 'en' ? `The ${esc(g.titles.en)} is amended as set out in ${clauses.length === 1 ? 'section' : 'sections'} ${clauses.map((c) => esc(c.label)).join(', ')}.` : `《${esc(g.titles.zh)}》現予修訂，修訂方式列於第${clauses.map((c) => esc(c.label)).join('、')}條。`}</p>`,
        ),
        'introduction',
      );
    for (const c of clauses)
      body += clause(
        c.label,
        c.heading,
        c.items
          .map(
            (i) =>
              paired(
                (l) =>
                  `<p>${c.items.length > 1 ? `<span class="number">(${esc(i.label)})</span>` : ''}${esc(i.text[l]).replaceAll('\n', '<br>')}</p>`,
              ) +
              (i.payload ? `<blockquote>${node(i.payload, true)}</blockquote>` : '') +
              (i.table ? `<blockquote>${table(i.table)}</blockquote>` : '') +
              (i.definition
                ? `<blockquote>${block({ id: 'quote-' + c.id + '-' + i.label, type: 'definitions', master: false, items: [i.definition] })}</blockquote>`
                : ''),
          )
          .join(''),
        'clause-' + c.label,
      );
    referenceGuide = amendmentGuide(document, clauses);
    body += (document.supplemental ?? []).map((n) => node(n)).join('');
  }
  const toc =
    document.type === 'guide'
      ? `<nav aria-label="Contents">${paired((l) => `<strong>${l === 'en' ? 'Contents' : '目錄'}</strong>`)}<ul>${entries(
          document.nodes,
        )
          .filter((e) => hasHeading(e.node.kind))
          .map(
            (e) =>
              `<li>${paired((l) => `<a href="#${esc(e.node.id)}">${esc(address(e, l).replace(/^section/, 'Section'))} ${esc(e.node.heading?.[l] ?? '')}</a>`)}</li>`,
          )
          .join('')}</ul></nav>`
      : '';
  const preambleIntro = (l: Language) =>
    l === 'en' ? '<span class="small-caps">Whereas</span>—' : '鑑於——';
  const enacting = (l: Language) =>
    l === 'en'
      ? document.formula[l]
          .split(/(\bbe it enacted\b)/i)
          .map((text, i) =>
            i % 2 ? '<span class="small-caps">Be it enacted</span>' : fmt(text, l),
          )
          .join('')
      : fmt(document.formula[l], l);
  const pre =
    document.preamble.mode === 'paragraph'
      ? paired(
          (l) =>
            `<p>${preambleIntro(l)} ${fmt(recitalText(document.preamble.paragraph[l], l), l)}</p>`,
        )
      : document.preamble.mode === 'list'
        ? paired((l) => `<p class="preamble-intro">${preambleIntro(l)}</p>`) +
          document.preamble.items
            .map((p, i) =>
              paired(
                (l) =>
                  `<p><span class="number">${i + 1}.</span>${fmt(i === 0 ? recitalText(p[l], l) : p[l], l)}</p>`,
              ),
            )
            .join('')
        : '';
  return `<!doctype html><html lang="${langs[0] === 'zh' ? 'zh-Hant' : 'en'}"><head><meta charset="utf-8">${options.iframe ? '<base href="about:srcdoc">' : ''}<title>${esc(document.titles[langs[0]])}</title><style>${stylesheet}${layout === 'parallel' ? '@page{size:A4 landscape}' : ''}</style></head><body class="${layout}">${`<header class="document-heading">${options.logo ? `<img class="publication-logo" src="${esc(options.logo)}" alt="Lifehouse Hong Kong">` : ''}${paired((l) => `<h1 id="document-title${l === langs[0] ? '' : '-' + l}">${esc(document.titles[l])}</h1>`)}</header>`}<div class="status">${status}</div>${toc}${paired((l) => `<p>${fmt(document.longTitle[l], l)}</p>`)}${pre}${paired((l) => `<p>${enacting(l)}</p>`)}${body}${options.history && options.revision?.history.length ? `<aside class="history"><h2>Amendment history / 修訂紀錄</h2>${options.revision.history.map((h) => `<p>${esc(h.date)} — ${esc(h.titles[langs[0]])}, ${esc(h.clause)} — ${esc(h.action)}</p>`).join('')}</aside>` : ''}</body></html>`;
}
