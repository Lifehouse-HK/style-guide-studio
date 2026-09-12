import { stylesheet, pageStyles, printProfile } from './publication-style.ts';
export { stylesheet } from './publication-style.ts';
import { recitalText } from './front-matter.ts';
import { definitionRows, definedDocument } from './definitions.ts';
import { parseRich, referenceRuns } from './rich-text.ts';
import {
  address,
  definitionAnchor,
  referenceTargets,
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
  const history = options.history === false ? [] : (options.revision?.history ?? []);
  const esc = escape,
    fmt = (s: string, l: Language) => inline(s, referenceGuide, l, options.catalogues, options.pdf),
    paired = (fn: (l: Language) => string) =>
      layout === 'parallel'
        ? `<div class="pair">${langs.map((l) => `<div lang="${l === 'zh' ? 'zh-Hant' : 'en'}">${fn(l)}</div>`).join('')}</div>`
        : fn(langs[0]);
  const authority = (h: (typeof history)[number], l: Language) => {
    const doc = options.catalogues?.flatMap((c) => c.documents).find((d) => d.id === h.instrument);
    const href = doc
      ? (options.pdf ? doc.pdf : doc.html)[l] +
        (options.pdf ? '#nameddest=clause-' : '#clause-') +
        encodeURIComponent(h.clause)
      : undefined;
    const label = `${h.titles[l]}, ${l === 'en' ? 'section ' : '第'}${h.clause}${h.subclause ? '(' + h.subclause + ')' : ''}${l === 'en' ? '' : '條'}`;
    return href ? `<a href="${esc(href)}">${esc(label)}</a>` : esc(label);
  };
  const amendmentNote = (target: string) => {
    const events = history.map((h, i) => ({ h, i })).filter(({ h }) => h.target === target);
    const latest = events.at(-1);
    if (!latest) return '';
    return paired(
      (l) =>
        `<p class="amendment-note">[${l === 'en' ? (['omit-provision', 'repeal-guide'].includes(latest.h.action) ? 'Repealed by ' : 'Amended by ') : ['omit-provision', 'repeal-guide'].includes(latest.h.action) ? '由以下指引廢除：' : '由以下指引修訂：'}${authority(latest.h, l)} · <a href="#history-${latest.i}">${l === 'en' ? 'History' : '修訂紀錄'} (${events.length})</a>]</p>`,
    );
  };
  const table = (b: { caption: Pair; numbered: boolean; rows: string[][] }) =>
    `<table><caption>${layout === 'parallel' ? esc(b.caption.en) + ' / ' + esc(b.caption.zh) : esc(b.caption[langs[0]])}</caption><thead><tr>${b.numbered ? '<th scope="col" class="row-number">#</th>' : ''}${b.rows[0].map((c) => `<th scope="col">${fmt(c, langs[0])}</th>`).join('')}</tr></thead><tbody>${b.rows
      .slice(1)
      .map(
        (r, i) =>
          `<tr>${b.numbered ? `<td>${i + 1}</td>` : ''}${r.map((c) => `<td>${fmt(c, langs[0])}</td>`).join('')}</tr>`,
      )
      .join('')}</tbody></table>`;
  const paragraphs = (b: TextBlock, l: Language, prefix = '') => {
    return b.text[l]
      .split('\n')
      .map(
        (text, i) =>
          `<p class="provision-text${prefix && i === 0 ? ' numbered-line' : ''}${b.type === 'note' ? ' note' : ''}" style="text-align:${b.paragraphAlign?.[l]?.[i] ?? b.align?.[l] ?? 'justify'}">${i === 0 ? prefix : ''}${(b.textFormat?.[l] === 'html' ? richInline(text, referenceGuide, l, options.catalogues, options.pdf) : fmt(text, l)) || '<br>'}</p>`,
      )
      .join('');
  };
  const block = (b: Block, indent: number = printProfile.indent): string =>
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
                (nested
                  ? `<div class="definition-branches">${row.table && !row.repealed ? block(row.table) : ''}${row.children?.map((n) => node(n, false, indent + printProfile.indent)).join('') ?? ''}${row.closing && !row.repealed ? paired((l) => `<p class="closing">${fmt(row.closing![l], l)}${punctuation(l)}</p>`) : ''}</div>`
                  : '')
              );
            })
            .join('')}</div>`
        : paired((l) =>
            b.type === 'quote' ? `<blockquote>${paragraphs(b, l)}</blockquote>` : paragraphs(b, l),
          );
  function node(n: Node, quoted = false, baseIndent = 0): string {
    const textIndent = baseIndent + printProfile.indent;
    const headingLabel = (l: Language) =>
      isGroup(n.kind) || ['schedule', 'appendix'].includes(n.kind)
        ? l === 'en'
          ? `${names[n.kind].en} ${n.label}`
          : ['schedule', 'appendix'].includes(n.kind)
            ? `${names[n.kind].zh}${n.label}`
            : `第${n.label}${names[n.kind].zh}`
        : n.label;
    const h = isGroup(n.kind) || ['schedule', 'appendix'].includes(n.kind) ? 'h2' : 'h3';
    const heading = hasHeading(n.kind)
      ? paired(
          (l) =>
            `<${h}>${h === 'h2' ? `<span class="group-label">${esc(headingLabel(l))}</span>${n.heading?.[l] ? `<span class="group-title">${esc(n.heading[l])}</span>` : ''}` : `<span class="section-number">${esc(headingLabel(l))}</span>${esc(n.heading?.[l] ?? '')}`}</${h}>`,
        )
      : '';
    const numbered = !hasHeading(n.kind),
      first = n.blocks?.[0];
    const text = n.repealed
      ? paired(
          (l) =>
            `<p class="provision-text numbered-line">${numbered ? `<span class="number">(${esc(n.label)})</span>` : ''}${l === 'en' ? '[Repealed]' : '[已廢除]'}</p>`,
        )
      : (numbered
          ? paired((l) =>
              first && first.type === 'text'
                ? paragraphs(first, l, `<span class="number">(${esc(n.label)})</span>`)
                : `<p class="provision-text numbered-line"><span class="number">(${esc(n.label)})</span></p>`,
            )
          : '') +
        (n.blocks ?? [])
          .slice(numbered && first?.type === 'text' ? 1 : 0)
          .map((b) => block(b, textIndent))
          .join('');
    return `<section${quoted ? '' : ` id="${esc(n.id)}"`} class="${isGroup(n.kind) ? 'group' : 'clause'} ${n.kind}" style="--text-indent:${textIndent}pt;--heading-indent:${baseIndent}pt">${heading ? `<div class="provision-heading">${heading}</div>` : ''}${quoted ? '' : amendmentNote(n.id)}${text}${
      n.repealed && !quoted
        ? referenceTargets(referenceGuide)
            .filter((t) => t.owner === n.id && t.id !== n.id)
            .map((t) => `<span id="${esc(t.id)}"></span>`)
            .join('') +
          (n.blocks ?? [])
            .flatMap((b) =>
              b.type === 'definitions' ? b.items.flatMap((i) => i.children ?? []) : [],
            )
            .map((c) => node(c, false, textIndent + printProfile.indent))
            .join('')
        : ''
    }${n.kind === 'appendix' ? paired((l) => `<p class="muted">${l === 'en' ? 'Informative appendix' : '資料性附錄'}</p>`) : ''}<div class="${isGroup(n.kind) || n.kind === 'schedule' || n.kind === 'appendix' ? '' : 'children'}">${n.children.map((c) => node(c, quoted, hasHeading(n.kind) ? baseIndent : textIndent)).join('')}</div>${n.closing ? paired((l) => (n.closing![l] ? `<p class="closing">${fmt(n.closing![l], l)}</p>` : '')) : ''}</section>`;
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
      `<section id="${esc(anchor)}" class="clause section" style="--text-indent:${printProfile.indent}pt;--heading-indent:0pt">${`<div class="provision-heading">${paired((l) => `<h3><span class="section-number">${esc(label)}</span>${esc(heading[l])}</h3>`)}</div>`}${content}</section>`;
    body = clause(
      document.citationLabel,
      pair('Short title and commencement', '簡稱及生效日期'),
      paired(
        (l) =>
          `<p class="provision-text">${l === 'en' ? `This Style Guide may be cited as the ${esc(document.titles.en)}.` : `本格式指引可引稱為《${esc(document.titles.zh)}》。`}</p><p class="provision-text">${l === 'en' ? 'This Style Guide comes into operation on ' : '本格式指引於'}${esc(document.enactment?.effective ?? '[effective date / 生效日期]')}${l === 'en' ? '.' : '起實施。'}</p>`,
      ),
      'citation',
    );
    if (!document.actions.every((a) => a.type === 'repeal-guide'))
      body += clause(
        document.introductionLabel,
        pair('Style Guide amended', '修訂格式指引'),
        paired(
          (l) =>
            `<p class="provision-text">${l === 'en' ? `The ${esc(g.titles.en)} is amended as set out in ${clauses.length === 1 ? 'section' : 'sections'} ${clauses.map((c) => esc(c.label)).join(', ')}.` : `《${esc(g.titles.zh)}》現予修訂，修訂方式列於第${clauses.map((c) => esc(c.label)).join('、')}條。`}</p>`,
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
                  `<p class="provision-text numbered-line">${c.items.length > 1 ? `<span class="number">(${esc(i.label)})</span>` : ''}${esc(i.text[l]).replaceAll('\n', '<br>')}</p>`,
              ) +
              (i.payload
                ? `<blockquote class="amendment-quotation">${node(i.payload, true, printProfile.indent)}</blockquote>`
                : '') +
              (i.table
                ? `<blockquote class="amendment-quotation">${table(i.table)}</blockquote>`
                : '') +
              (i.definition
                ? `<blockquote class="amendment-quotation">${block({ id: 'quote-' + c.id + '-' + i.label, type: 'definitions', master: false, items: [i.definition] })}</blockquote>`
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
      ? `<nav aria-label="Contents" class="contents"><details><summary>${layout === 'parallel' ? 'Contents / 目錄' : layout === 'zh' ? '目錄' : 'Contents'}</summary><ul>${entries(
          document.nodes,
        )
          .filter((e) => hasHeading(e.node.kind))
          .map(
            (e) =>
              `<li class="${isGroup(e.node.kind) ? 'toc-group' : 'toc-provision'}">${paired((l) => `<a href="#${esc(e.node.id)}">${esc(address(e, l).replace(/^section/, 'Section'))} ${esc(e.node.heading?.[l] ?? '')}</a>`)}</li>`,
          )
          .join('')}</ul></details></nav>`
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
                  `<p class="provision-text numbered-line"><span class="number">${i + 1}.</span>${fmt(i === 0 ? recitalText(p[l], l) : p[l], l)}</p>`,
              ),
            )
            .join('')
        : '';
  const effective = document.enactment?.effective;
  const headerStatus = langs
    .map((l) =>
      options.proposed
        ? l === 'en'
          ? 'PROPOSED — NOT IN EFFECT'
          : '建議文本 — 尚未生效'
        : document.stage === 'draft'
          ? l === 'en'
            ? 'DRAFT — NOT IN EFFECT'
            : '草案 — 尚未生效'
          : options.revision?.repealed
            ? l === 'en'
              ? 'REPEALED'
              : '已廢除'
            : options.revision?.asOf
              ? `${l === 'en' ? 'Revised text as at' : '修訂文本截至'} ${options.revision.asOf}`
              : effective
                ? `${l === 'en' ? 'Effective:' : '生效：'} ${effective}`
                : '',
    )
    .join(' / ');
  const runningTitle = langs.map((l) => document.titles[l]).join(' / ');
  const date = document.enactment?.date;
  const dateText = (l: Language) =>
    date
      ? new Intl.DateTimeFormat(l === 'en' ? 'en-GB' : 'zh-Hant-HK', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
          timeZone: 'UTC',
        }).format(new Date(date + 'T00:00:00Z'))
      : '';
  return `<!doctype html><html lang="${langs[0] === 'zh' ? 'zh-Hant' : 'en'}"><head><meta charset="utf-8">${options.iframe ? '<base href="about:srcdoc">' : ''}<title>${esc(document.titles[langs[0]])}</title><style>${stylesheet}${pageStyles(layout, runningTitle, headerStatus)}</style></head><body class="${layout}">${toc}${`<header class="document-heading">${options.logo ? `<img class="publication-logo" src="${esc(options.logo)}" alt="Lifehouse Hong Kong">` : ''}${paired((l) => `<h1 id="document-title${l === langs[0] ? '' : '-' + l}">${esc(document.titles[l])}</h1>`)}</header>`}<div class="status">${status}${options.revision?.asOf ? paired((l) => `<p>${l === 'en' ? 'Revised text as at' : '修訂文本截至'} ${esc(options.revision!.asOf!)}</p>`) : ''}</div>${amendmentNote(document.id)}${paired((l) => `<p class="long-title">${fmt(document.longTitle[l], l)}</p>`)}${date ? paired((l) => `<p class="enactment-date">[${esc(dateText(l))}]</p>`) : ''}<div class="preamble">${pre}</div><div class="enacting">${paired((l) => `<p>${enacting(l)}</p>`)}</div>${body}${history.length ? `<aside class="history" id="amendment-history"><h2>Amendment history / 修訂紀錄</h2>${history.map((h, i) => `<div id="history-${i}">${paired((l) => `<p>${esc(h.date)} — ${authority(h, l)} — ${esc(h.action)}</p>`)}</div>`).join('')}</aside>` : ''}${options.pdf ? `<div aria-hidden="true" style="position:absolute;left:0;top:0;width:0;height:0;overflow:hidden">${['document-title', ...referenceTargets(referenceGuide).map((t) => t.id)].map((id) => `<a tabindex="-1" href="#${esc(id)}" style="display:inline-block;width:0;height:0;overflow:hidden">${esc(id)}</a>`).join('')}</div>` : ''}</body></html>`;
}
