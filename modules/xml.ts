import { preambleOpening, recitalText } from './front-matter.ts';
import { definitionRows, definedDocument } from './definitions.ts';
import { parseRich } from './rich-text.ts';
import { DOMParser } from '@xmldom/xmldom';
import {
  canonical,
  digest,
  hasHeading,
  isGroup,
  languages,
  type Node,
  type Block,
  type Language,
} from './document.ts';
import { generate, amendmentGuide } from './amendments.ts';
import { workspaceSchema, type Workspace } from './project.ts';
import { escape } from './render.ts';
const AKN = 'http://docs.oasis-open.org/legaldocml/ns/akn/3.0';
/** Source-profile interchange: generated legal structure plus the complete portable project. */
export async function exportXml(
  workspace: Workspace,
  language: Language,
  exportedDate = new Date().toISOString().slice(0, 10),
  projectionVersion: 1 | 2 = 2,
): Promise<string> {
  const d = workspace.document,
    e = escape;
  const p = (text: string) => `<p>${e(text)}</p>`;
  let definitionGuide = d.type === 'guide' ? d : workspace.source!;
  const block = (b: Block): string =>
    b.type === 'table'
      ? `<table eId="${e(b.id)}"><caption>${e(b.caption[language])}</caption>${b.rows.map((r, i) => `<tr>${r.map((c) => `<${i ? 'td' : 'th'}>${p(c)}</${i ? 'td' : 'th'}>`).join('')}</tr>`).join('')}</table>`
      : b.type === 'definitions'
        ? `<blockList>${definitionRows(b, definitionGuide, language)
            .map((row, i, rows) => {
              const guide = definitionGuide;
              const target = row.documentId
                ? definedDocument(row, guide, language, workspace.catalogues)
                : undefined;
              const meaning = row.repealed
                ? e(language === 'en' ? '[Repealed]' : '[已廢除]')
                : target
                  ? e((language === 'en' ? 'means ' : '指') + target.title)
                  : parseRich(row.meaning[language])
                      .map((run) =>
                        run.marks.reduceRight((text, mark) => {
                          const tag = { strong: 'b', em: 'i', u: 'u', code: 'span' }[mark];
                          return `<${tag}>${text}</${tag}>`;
                        }, e(run.text)),
                      )
                      .join('');
              return `<item><p>“<def>${e(row.term[language])}</def>”${language === 'en' ? ' ' : ''}${meaning}${row.children?.length || row.table ? '' : i === rows.length - 1 ? (language === 'en' ? '.' : '。') : language === 'en' ? ';' : '；'}</p>${!row.repealed ? (row.table ? block(row.table) : '') + (row.children?.length ? `<blockList>${row.children.map(definitionBranch).join('')}</blockList>` : '') + (row.closing?.[language] ? p(row.closing[language]) : '') : ''}</item>`;
            })
            .join('')}</blockList>`
        : b.textFormat?.[language] === 'html'
          ? b.text[language]
              .split('\n')
              .map(
                (line) =>
                  '<p>' +
                  parseRich(line)
                    .map((run) =>
                      run.marks.reduceRight((content, mark) => {
                        const tag = { strong: 'b', em: 'i', u: 'u', code: 'span' }[mark];
                        return `<${tag}>${content}</${tag}>`;
                      }, e(run.text)),
                    )
                    .join('') +
                  '</p>',
              )
              .join('')
          : p(b.text[language]);
  function definitionBranch(n: Node): string {
    return `<item eId="${e(n.id)}"><num>(${e(n.label)})</num>${n.repealed ? p(language === 'en' ? '[Repealed]' : '[已廢除]') : (n.blocks ?? []).map(block).join('') || p('')}${n.children.length ? `<blockList>${n.children.map(definitionBranch).join('')}</blockList>` : ''}${n.closing?.[language] ? p(n.closing[language]) : ''}</item>`;
  }
  function node(n: Node, prefix = ''): string {
    const tag =
      (
        {
          schedule: 'hcontainer',
          appendix: 'hcontainer',
          scheduleParagraph: 'paragraph',
          scheduleSubparagraph: 'subparagraph',
          subsubparagraph: 'hcontainer',
        } as Record<string, string>
      )[n.kind] ?? n.kind;
    const attrs = tag === 'hcontainer' ? ` name="${n.kind}"` : '';
    const label = [
      'subsection',
      'paragraph',
      'subparagraph',
      'subsubparagraph',
      'scheduleSubparagraph',
    ].includes(n.kind)
      ? `(${n.label})`
      : n.label;
    const text = n.repealed
      ? p(language === 'en' ? '[Repealed]' : '[已廢除]')
      : (n.blocks ?? []).map(block).join('');
    return `<${tag}${attrs} eId="${e(prefix + n.id)}"><num>${e(label)}</num>${hasHeading(n.kind) && n.heading?.[language] ? `<heading>${e(n.heading[language])}</heading>` : ''}${n.children.length ? (text ? `<intro>${text}</intro>` : '') + n.children.map((c) => node(c, prefix)).join('') + (n.closing?.[language] ? `<wrapUp>${p(n.closing[language])}</wrapUp>` : '') : `<content>${text || p('')}</content>`}</${tag}>`;
  }
  let body = '';
  if (d.type === 'guide') body = d.nodes.map((n) => node(n)).join('');
  else {
    if (!workspace.source) throw Error('Load the source before exporting amendment XML.');
    const cs = await generate(workspace.source, d);
    body = `<section eId="citation"><num>${e(d.citationLabel)}</num><heading>${language === 'en' ? 'Short title and commencement' : '簡稱及生效日期'}</heading><content>${p(language === 'en' ? `This Style Guide may be cited as the ${d.titles.en}.` : `本格式指引可引稱為《${d.titles.zh}》。`)}${p(language === 'en' ? `This Style Guide comes into operation on ${d.enactment?.effective ?? '[effective date]'}.` : `本格式指引於${d.enactment?.effective ?? '[生效日期]'}起實施。`)}</content></section>`;
    if (!d.actions.every((a) => a.type === 'repeal-guide'))
      body += `<section eId="introduction"><num>${e(d.introductionLabel)}</num><heading>${language === 'en' ? 'Style Guide amended' : '修訂格式指引'}</heading><content>${p(language === 'en' ? `The ${d.source.titles.en} is amended as set out in sections ${cs.map((c) => c.label).join(', ')}.` : `《${d.source.titles.zh}》現予修訂，修訂方式列於第${cs.map((c) => c.label).join('、')}條。`)}</content></section>`;
    for (const c of cs)
      body += `<section eId="clause-${e(c.id)}"><num>${e(c.label)}</num><heading>${e(c.heading[language])}</heading>${c.items
        .map((i, index) => {
          const text =
            p(i.text[language]) +
            (i.payload
              ? `<p><mod><quotedStructure>${node(i.payload, 'quote-' + c.id + '-' + index + '-')}</quotedStructure></mod></p>`
              : '') +
            (i.definition
              ? block({
                  id: 'quote-' + c.id + '-' + index,
                  type: 'definitions',
                  master: false,
                  items: [i.definition],
                })
              : '') +
            (i.table
              ? block({ ...i.table, id: 'table-' + c.id + '-' + index, type: 'table' })
              : '');
          return c.items.length === 1
            ? `<content>${text}</content>`
            : `<subsection eId="${e(c.id)}-${index}"><num>(${e(i.label)})</num><content>${text}</content></subsection>`;
        })
        .join('')}</section>`;
    definitionGuide = amendmentGuide(d, cs);
    body += (d.supplemental ?? []).map((n) => node(n)).join('');
  }
  const lang = language === 'en' ? 'eng' : 'zho',
    date = d.enactment?.date ?? exportedDate,
    urn = `/akn/hk/act/${date}/${d.id}`,
    kind = d.stage === 'draft' ? 'bill' : 'act';
  const identification = ['Work', 'Expression', 'Manifestation']
    .map((level) => {
      const path =
        urn +
        (level === 'Work' ? '' : `/${lang}@`) +
        (level === 'Manifestation' ? '/main.xml' : '');
      return `<FRBR${level}><FRBRthis value="${e(path)}"/><FRBRuri value="${e(path)}"/><FRBRdate date="${date}" name="${d.stage === 'draft' ? 'generation' : 'enactment'}"/><FRBRauthor href="#translation-team"/>${level === 'Work' ? '<FRBRcountry value="hk"/>' : level === 'Expression' ? `<FRBRlanguage language="${lang}"/>` : ''}</FRBR${level}>`;
    })
    .join('');
  const preamble =
    d.preamble.mode === 'paragraph'
      ? p(
          projectionVersion === 1
            ? d.preamble.paragraph[language]
            : preambleOpening(language) +
                ' ' +
                recitalText(d.preamble.paragraph[language], language),
        )
      : d.preamble.mode === 'list'
        ? (projectionVersion === 2 ? p(preambleOpening(language)) : '') +
          d.preamble.items
            .map((item, i) =>
              p(
                `${i + 1}. ${projectionVersion === 2 && i === 0 ? recitalText(item[language], language) : item[language]}`,
              ),
            )
            .join('')
        : '';
  return `<?xml version="1.0" encoding="UTF-8"?>\n<akomaNtoso xmlns="${AKN}" xmlns:sg="urn:lifehouse:guide:2"><${kind} name="styleGuide"><meta><identification source="#translation-team">${identification}</identification><references source="#translation-team"><TLCOrganization eId="translation-team" href="/ontology/organization/hk/lifehouse-translation-team" showAs="Translation Team of the Dream Team of Lifehouse Hong Kong"/></references><proprietary source="#translation-team"><sg:project${projectionVersion === 2 ? ' projectionVersion="2"' : ''} language="${language}" exportedDate="${exportedDate}" digest="${await digest(workspace)}">${e(canonical(workspace))}</sg:project></proprietary></meta><preface><p><docTitle>${e(d.titles[language])}</docTitle></p><longTitle>${p(d.longTitle[language])}</longTitle></preface><preamble>${preamble}<formula name="enacting">${p(d.formula[language])}</formula></preamble><body>${body}</body></${kind}></akomaNtoso>\n`;
}
export async function importXml(xml: string): Promise<Workspace> {
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw Error('External declarations are not supported.');
  const document = new DOMParser({
    onError: () => {
      throw Error('Invalid XML.');
    },
  }).parseFromString(xml, 'application/xml');
  if (document.documentElement?.namespaceURI !== AKN)
    throw Error('This is not an Akoma Ntoso source.');
  const nodes = document.getElementsByTagNameNS('urn:lifehouse:guide:2', 'project');
  if (nodes.length !== 1)
    throw Error('Only this application’s source-profile XML can be reopened.');
  const node = nodes[0],
    workspace = workspaceSchema.parse(JSON.parse(node.textContent ?? ''));
  const language = node.getAttribute('language');
  if (language !== 'en' && language !== 'zh') throw Error('Unsupported XML language.');
  if (node.getAttribute('digest') !== (await digest(workspace)))
    throw Error('Source digest differs.');
  const version = node.getAttribute('projectionVersion') || '1';
  if (version !== '1' && version !== '2')
    throw Error('Unsupported XML projection version. Update the editor.');
  if (
    xml.trim() !==
    (
      await exportXml(
        workspace,
        language,
        node.getAttribute('exportedDate') ?? undefined,
        Number(version) as 1 | 2,
      )
    ).trim()
  )
    throw Error(
      'XML structure differs from its source project. Open the original project to edit it.',
    );
  return workspace;
}
