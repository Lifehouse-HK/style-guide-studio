import {
  activeLanguages,
  assertValid,
  blocks,
  canonical,
  walk,
  referenceValues,
  type Block,
  type Inline,
  type Language,
  type Project,
  type Provision,
  type Reference,
} from '../../domain/src/index.ts';
import { escapeXML as e } from '../../formats/src/index.ts';
import {
  provisionLabel,
  resolveReference,
  targets,
  type DocumentIndex,
  type ResolvedReference,
} from '../../engine/src/references.ts';
import type { Revision } from '../../engine/src/amendments.ts';
export type Layout = Language | 'parallel';
export interface Publication {
  proof: boolean;
  state: Revision;
  links: Record<string, ResolvedReference>;
  definitions: Record<string, string>;
  historyLinks: Record<string, ResolvedReference>;
  warnings: string[];
}
const refKey = (ref: Reference, l: Language) => l + ':' + canonical(ref);
export function preparePublication(
  state: Revision,
  indexes: DocumentIndex[],
  base: string,
  proof = false,
): Publication {
  const p = state.project;
  assertValid(p, p.stage === 'adopted');
  const links: Publication['links'] = {},
    definitions: Publication['definitions'] = {},
    historyLinks: Publication['historyLinks'] = {},
    warnings: string[] = [];
  function resolve(ref: Reference, l: Language) {
    const idx = indexes.find((i) => i.id === ref.document && i.publisher === ref.publisher);
    if (!idx) throw new Error(`Missing reference index: ${ref.publisher}/${ref.document}`);
    const r = resolveReference(p, ref, idx, l, base);
    links[refKey(ref, l)] = r;
    warnings.push(...r.warnings);
    return r;
  }
  for (const ref of referenceValues(p)) for (const l of activeLanguages(p)) resolve(ref, l);
  for (const d of p.definitions)
    for (const l of activeLanguages(p))
      definitions[l + ':' + d.id] = d.document
        ? resolve(
            {
              document: d.document,
              publisher: d.publisher ?? p.publisher,
              selector: 'current',
              formal: true,
            },
            l,
          ).label
        : (d.meaning[l] ?? '');
  for (const h of state.history)
    for (const l of activeLanguages(p))
      historyLinks[l + ':' + h.instrument + ':' + h.operation] = resolve(
        {
          publisher: p.publisher,
          document: h.instrument,
          selector: 'original',
          target: h.author === h.instrument ? undefined : h.author,
          formal: true,
        },
        l,
      );
  return { proof, state, links, definitions, historyLinks, warnings: [...new Set(warnings)] };
}
export function styles(layout: Layout): string {
  return `
@page {size:A4 ${layout === 'parallel' ? 'landscape' : 'portrait'};margin:19mm 18mm 20mm;@bottom-center {content:counter(page);font-size:9pt} @top-right {content:string(guide);font-size:8pt}}
*{box-sizing:border-box}body{margin:0;color:#1d2529;background:white;font-family:'Times New Roman','Noto Serif TC',serif;font-size:11pt;line-height:1.65}main{max-width:${layout === 'parallel' ? '1200' : '800'}px;margin:auto;padding:2rem}
h1{font-size:21pt;line-height:1.4;margin:0 0 1em}h2,h3,h4,h5,h6{font-size:12pt;line-height:1.5;break-after:avoid;margin:1.3em 0 .5em}h1{string-set:guide attr(data-running)}p{margin:.4em 0;orphans:3;widows:3;white-space:pre-wrap;overflow-wrap:anywhere}a{color:#174964;text-decoration:underline}a:focus{outline:2px solid #174964;outline-offset:3px}
.status{border-block:1px solid #555;padding:.6em 0;margin:1em 0;font-size:9pt}.pair{display:grid;grid-template-columns:1fr 1fr;gap:9mm;align-items:start}.pair>div{min-width:0}.provision{margin-block:1em}.children{margin-left:1.5em}.shared{width:100%}.number{font-weight:bold;margin-right:.5em}.annotation{text-align:right;font-size:9pt;color:#4b5359}.quote{border-left:2px solid #aaa;padding-left:1em;margin-left:1em}.note,.example{padding:.5em;border:1px solid #ddd}.literal{font-family:monospace;white-space:pre-wrap}table{border-collapse:collapse;width:100%;font-size:10pt;margin:1em 0;table-layout:fixed}th,td{border:0.5pt solid #888;padding:.4em .6em;text-align:left;vertical-align:top;overflow-wrap:anywhere}thead{display:table-header-group}tr{break-inside:avoid}caption{text-align:left;font-weight:bold}figure{margin:1em 0}img{max-width:100%;max-height:150mm}nav{margin:1.5em 0}nav ol{list-style:none;padding-left:0}.history{break-before:page}.history li{margin:1em 0}code{overflow-wrap:anywhere}.non-normative{font-style:italic}.footnote{font-size:9pt}.repealed{color:#555}
@media screen and (max-width:700px){main{padding:1rem}.pair{display:block}.pair>div{width:100%}.pair>div:lang(zh-Hant){border-top:1px solid #ddd;padding-top:.5em}.children{margin-left:.75em}}
@media print{main{max-width:none;padding:0}.screen-only{display:none}a{color:inherit}nav a{text-decoration:none}nav a::after{content:leader('.') target-counter(attr(href),page)}}
`;
}
export function renderHTML(
  pub: Publication,
  layout: Layout,
  medium: 'web' | 'pdf' = 'web',
): string {
  const { state } = pub,
    p = state.project,
    langs: Language[] = layout === 'parallel' ? ['en', 'zh-Hant'] : [layout];
  if (
    (layout === 'parallel' && p.mode !== 'bilingual') ||
    langs.some((l) => !activeLanguages(p).includes(l))
  )
    throw new Error('Unavailable publication language/layout.');
  const lang = langs[0],
    ts = targets(p),
    byId = new Map(ts.map((t) => [t.id, t]));
  const inline = (xs: Inline[], l: Language): string =>
    xs
      .map((i) => {
        let value = e(i.text);
        if (i.ref) {
          const r = pub.links[refKey(i.ref, l)];
          if (!r) throw new Error('Unresolved publication reference.');
          let href = medium === 'web' ? r.html : r.pdf;
          if (
            i.ref.publisher === p.publisher &&
            i.ref.document === p.id &&
            r.revision === state.revision
          )
            href = '#' + (i.ref.target ? 'n_' + i.ref.target : 'document');
          value = `<a href="${e(href)}" lang="${r.language}" title="${e(r.warnings.join(' '))}">${e(r.label)}</a>`;
        } else if (i.term) {
          const d = p.definitions.find((d) => d.id === i.term);
          value = e(d?.names[l] ?? i.text);
        } else if (i.href) value = `<a href="${e(i.href)}">${value}</a>`;
        for (const m of i.marks ?? [])
          value =
            m === 'literal'
              ? `<span class="literal">${value}</span>`
              : `<${{ bold: 'strong', italic: 'em', sup: 'sup', sub: 'sub' }[m]}>${value}</${{ bold: 'strong', italic: 'em', sup: 'sup', sub: 'sub' }[m]}>`;
        return value;
      })
      .join('');
  const block = (b: Block, l: Language): string => {
    if (b.type === 'table')
      return `<table>${b.caption ? `<caption>${e(b.caption)}</caption>` : ''}<thead><tr>${b.numbered ? '<th scope="col">#</th>' : ''}${(b.rows?.[0] ?? []).map((c) => `<th scope="col">${inline(c, l)}</th>`).join('')}</tr></thead><tbody>${(
        b.rows ?? []
      )
        .slice(1)
        .map(
          (r, i) =>
            `<tr>${b.numbered ? `<td>${i + 1}</td>` : ''}${r.map((c) => `<td>${inline(c, l)}</td>`).join('')}</tr>`,
        )
        .join('')}</tbody></table>`;
    if (b.type === 'figure') {
      const a = p.assets[b.asset!];
      return `<figure><img src="data:${a.mediaType};base64,${a.data}" alt="${e(b.alt ?? '')}">${b.caption ? `<figcaption>${e(b.caption)}</figcaption>` : ''}</figure>`;
    }
    if (b.type === 'definition' && b.definition) {
      const d = p.definitions.find((d) => d.id === b.definition);
      if (!d) throw new Error('Missing definition.');
      return `<p>“${e(d.names[l] ?? '')}” ${l === 'en' ? 'means' : '指'} ${e(pub.definitions[l + ':' + d.id] ?? '')}${inline(b.inlines, l)}</p>`;
    }
    const v = inline(b.inlines, l);
    return b.type === 'bullet'
      ? `<ul><li>${v}</li></ul>`
      : b.type === 'quote'
        ? `<blockquote class="quote"><p>${v}</p></blockquote>`
        : `<p class="${b.type}">${v}</p>`;
  };
  const bs = (xs: Block[], l: Language) => xs.map((b) => block(b, l)).join('');
  const pair = (f: (l: Language) => string) =>
    layout === 'parallel'
      ? `<div class="pair">${langs.map((l) => `<div lang="${l}">${f(l)}</div>`).join('')}</div>`
      : f(lang);
  const replacement = (n: Provision): string =>
    `<blockquote>${pair((l) => `<p><strong>${e(n.label ?? '')} ${e(n.heading[l] ?? '')}</strong></p>${bs(n.content[l] ?? [], l)}`)}${n.shared ? bs(n.shared, p.mode === 'bilingual' ? 'en' : lang) : ''}${n.children.map(replacement).join('')}${pair((l) => bs(n.tail[l] ?? [], l))}</blockquote>`;
  const node = (n: Provision, depth = 0): string => {
    const label = (l: Language) =>
      n.kind === 'crossheading'
        ? ''
        : ['section', 'subsection', 'paragraph', 'subparagraph', 'point'].includes(n.kind)
          ? n.kind === 'section' ||
            (n.kind === 'paragraph' &&
              byId
                .get(n.id)!
                .path.filter((x) => ['paragraph', 'subparagraph', 'point'].includes(x.kind))
                .length === 1 &&
              byId.get(n.id)!.path.some((x) => x.kind === 'schedule' || x.kind === 'appendix'))
            ? n.label + '.'
            : '(' + n.label + ')'
          : provisionLabel(byId.get(n.id)!, l, p.stage === 'draft');
    const h = Math.min(depth + 2, 6),
      heading = pair(
        (l) => `<h${h}><span class="number">${e(label(l))}</span>${e(n.heading[l] ?? '')}</h${h}>`,
      );
    const ids = new Set([n.id, ...blocks(n).map((b) => b.id)]),
      history = state.history.filter((h) => ids.has(h.target));
    const annotations = history
      .map(
        (h) =>
          `<a href="#history-${e(h.instrument)}-${e(h.operation)}">${e(h.type)}: ${e(h.instrument)} (${e(h.date)})${h.supersededBy ? ' [superseded]' : ''}</a>`,
      )
      .join('; ');
    const instructions = (p.amendment?.operations ?? [])
      .filter((op) => op.author === n.id)
      .map(
        (op) =>
          pair(
            (l) =>
              `<p>${e(op.instructions[l] ?? '')}</p>${op.text !== undefined ? `<blockquote><p>${e(op.text)}</p></blockquote>` : ''}${op.block && op.scope !== 'shared' ? block(op.block, l) : ''}`,
          ) +
          (op.block && op.scope === 'shared'
            ? block(op.block, p.mode === 'bilingual' ? 'en' : lang)
            : '') +
          (op.node ? replacement(op.node) : ''),
      )
      .join('');
    return `<section class="provision ${n.repealed ? 'repealed' : ''}" id="n_${e(n.id)}">${heading}${n.kind === 'appendix' ? '<p class="non-normative">Informative / 資料性附錄</p>' : ''}${n.repealed ? pair((l) => `<p>${l === 'en' ? '[Repealed]' : '[已廢除]'}</p>`) : `${n.shared ? `<div class="shared">${bs(n.shared, p.mode === 'bilingual' ? 'en' : lang)}</div>` : pair((l) => bs(n.content[l] ?? [], l))}${instructions}`}<div class="children">${n.children.map((c) => node(c, depth + 1)).join('')}</div>${pair((l) => bs(n.tail[l] ?? [], l))}${annotations ? `<p class="annotation">[${annotations}]</p>` : ''}</section>`;
  };
  const toc = ts
    .map(
      (t) =>
        `<li><a href="#n_${e(t.id)}">${e(provisionLabel(t, lang, p.stage === 'draft'))} ${e(t.heading[lang] ?? '')}</a></li>`,
    )
    .join('');
  const history = state.history.length
    ? `<section class="history"><h2>Amendment history / 修訂紀錄</h2><ol>${state.history.map((h) => `<li id="history-${e(h.instrument)}-${e(h.operation)}">${e(h.date)} · <a href="${e(medium === 'web' ? pub.historyLinks[lang + ':' + h.instrument + ':' + h.operation].html : pub.historyLinks[lang + ':' + h.instrument + ':' + h.operation].pdf)}">${e(pub.historyLinks[lang + ':' + h.instrument + ':' + h.operation].label)}</a> · ${e(h.type)} · ${e(h.target)}${h.supersededBy ? ' · superseded by ' + e(h.supersededBy) : ''}</li>`).join('')}</ol></section>`
    : '';
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="sg-source-revision" content="${e(p.revision)}"><meta name="sg-revision" content="${e(state.revision)}"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'"><title>${e(p.titles[lang])}</title><style>${styles(layout)}</style></head><body><main id="document"><header><h1 data-running="${e(p.id)}"><span lang="en">${e(p.titles.en)}</span><br><span lang="zh-Hant">${e(p.titles['zh-Hant'])}</span></h1><p class="status">${pub.proof ? 'PROOF / 校樣 — not certified / 未經核證 · ' : ''}${e(p.stage)} · ${e(state.state)} · As of / 截至 ${e(state.asOf)} · ${layout === 'parallel' ? 'Parallel bilingual / 中英對照' : lang}</p>${pair((l) => (p.opening.longTitle[l] ? `<p>${e(p.opening.longTitle[l]!)}</p>` : ''))}</header><nav aria-label="Contents"><ol>${toc}</ol></nav>${pair((l) => bs(p.opening.recitals[l] ?? [], l) + (p.opening.formula[l] ? `<p>${e(p.opening.formula[l]!)}</p>` : ''))}${p.provisions.map((n) => node(n)).join('')}${pair((l) => (p.opening.authentication[l] ? `<p>${e(p.opening.authentication[l]!)}</p>` : ''))}${history}</main></body></html>`;
}
