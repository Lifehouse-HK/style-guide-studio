import { type Workspace } from './project.ts';
import { type Pair, type Guide, digest, issues } from './document.ts';
import { type Document, type Amendment, revise, generate, amendmentGuide } from './amendments.ts';
import { buildPublicationAPI, hongKongToday, publicationBase } from './publication-api.ts';
import { type Catalogue, publicCatalogue } from './references.ts';
import { render, escape as e, type Layout } from './render.ts';
export type PublicationOptions = {
  baseURL: string;
  title: Pair;
  editorURL: string;
  asOf?: string;
  logo?: string;
};
export type PublicationBuild = { files: Record<string, string>; pdfPages: Record<string, string> };
/** Build a complete static tree in memory before the adapter writes/publishes it. */
export async function buildPublication(
  projects: Workspace[],
  options: PublicationOptions,
): Promise<PublicationBuild> {
  const base = publicationBase(options.baseURL),
    date = options.asOf ?? hongKongToday();
  const docs = projects.map((p) => p.document),
    guides = docs.filter((d): d is Guide => d.type === 'guide'),
    amendments = docs.filter((d): d is Amendment => d.type === 'amendment');
  if (new Set(docs.map((d) => d.id)).size !== docs.length)
    throw Error('Duplicate document IDs in corpus.');
  const external = projects.flatMap((p) => p.catalogues);
  const api = await buildPublicationAPI(guides, amendments, base, date, external);
  const catalogue = api['references.json'] as Catalogue;
  const before = new Map<string, Guide>();
  for (const g of guides) {
    const list = amendments
      .filter((a) => a.source.id === g.id)
      .sort((a, b) => a.enactment!.effective.localeCompare(b.enactment!.effective));
    let current = g;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      before.set(a.id, current);
      const clauses = await generate(current, a);
      current = (await revise(g, list.slice(0, i + 1), a.enactment!.effective)).guide;
    }
  }
  const files: Record<string, string> = {},
    pdfPages: Record<string, string> = {};
  for (const [path, value] of Object.entries(api))
    files[path] = JSON.stringify(value, null, 2) + '\n';
  const head = (title: string, body: string) =>
    `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(title)}</title><style>body{max-width:1000px;margin:2rem auto;padding:0 1rem;font:16px/1.6 system-ui,sans-serif;color:#172b3a}a{color:#145381}h1{font:700 2rem Georgia,serif}table{width:100%;border-collapse:collapse}td,th{text-align:left;border-bottom:1px solid #ccd5dd;padding:.7rem}nav{padding:1rem 0;border-bottom:1px solid #ccc}.muted{color:#53616b}input{font:inherit;padding:.4rem;width:100%;box-sizing:border-box}.badge{font-size:.85rem;background:#e6edf3;padding:.2rem .4rem}</style><nav><a href="${e(base)}">${e(options.title.en)}</a> · <a href="${e(options.editorURL)}">Open editor</a></nav>${body}</html>`;
  const links = (id: string) =>
    `<a href="${e(new URL(id + '/en.html', base).href)}">English</a> · <a href="${e(new URL(id + '/zh.html', base).href)}">繁體中文</a> · <a href="${e(new URL(id + '/parallel.html', base).href)}">Parallel</a>`;
  const emit = async (
    doc: Document,
    path: string,
    source?: Guide,
    revision?: Awaited<ReturnType<typeof revise>>,
  ) => {
    for (const layout of ['en', 'zh', 'parallel'] as Layout[]) {
      // Stable API destinations exist in all layouts; monolingual documents use their sole language.
      const actual = doc.mode === 'parallel' ? layout : doc.mode;
      const nav = `<nav class="no-print"><a href="${e(base)}">All Guides / 所有指引</a> · <a href="${e(new URL((doc.type === 'guide' ? doc.id : doc.source.id) + '/history.html', base).href)}">Versions / 版本</a> · <a href="${e(new URL(path + '/' + layout + '.pdf', base).href)}">PDF</a> · ${links(path)}</nav>`;
      files[path + '/' + layout + '.html'] = (
        await render(
          doc,
          {
            layout: actual,
            logo: options.logo,
            catalogues: [catalogue, ...external],
            revision,
            history: true,
          },
          source,
        )
      ).replace(/(<body[^>]*>)/, '$1' + nav);
      pdfPages[path + '/' + layout + '.pdf'] = await render(
        doc,
        {
          layout: actual,
          logo: options.logo,
          catalogues: [catalogue, ...external],
          revision,
          history: true,
          pdf: true,
        },
        source,
      );
    }
  };
  const rows: string[] = [];
  for (const g of guides) {
    const list = amendments.filter((a) => a.source.id === g.id);
    const current = await revise(g, list, date);
    await emit(current.guide, g.id, undefined, current);
    await emit(g, g.id + '/original');
    const dates = [...new Set([g.enactment!.effective, ...list.map((a) => a.enactment!.effective)])]
      .filter((d) => d <= date)
      .sort();
    const versions: string[] = [];
    for (const d of dates) {
      const r = await revise(g, list, d);
      await emit(r.guide, g.id + '/versions/' + d, undefined, r);
      versions.push(
        `<tr><td>${e(d)}</td><td>${r.repealed ? 'Repealed / 已廢除' : 'Revised text / 修訂文本'}</td><td>${links(g.id + '/versions/' + d)}</td></tr>`,
      );
    }
    files[g.id + '/history.html'] = head(
      g.titles.en,
      `<h1>${e(g.titles.en)}</h1><p>${e(g.titles.zh)}</p><p>Current text: ${links(g.id)} · As enacted: ${links(g.id + '/original')}</p><h2>Historical versions</h2><table><thead><tr><th>Effective date</th><th>Status</th><th>Read</th></tr></thead><tbody>${versions.join('')}</tbody></table><h2>Amending instruments</h2><ul>${list.map((a) => `<li>${e(a.titles.en)} / ${e(a.titles.zh)} — ${e(a.enactment!.effective)} ${a.enactment!.effective > date ? '(not yet in effect)' : ''} · ${links(a.id)}</li>`).join('')}</ul>`,
    );
    rows.push(
      `<tr data-search="${e((g.titles.en + ' ' + g.titles.zh).toLowerCase())}"><td>${e(current.guide.titles.en)}<br>${e(current.guide.titles.zh)}</td><td>${current.repealed ? 'Repealed / 已廢除' : 'Enacted / 已制定'}</td><td>${links(g.id)}<br><a href="${e(new URL(g.id + '/history.html', base).href)}">History / 修訂紀錄</a></td></tr>`,
    );
  }
  for (const a of amendments) await emit(a, a.id, before.get(a.id));
  files['index.html'] = head(
    options.title.en,
    `<h1>${e(options.title.en)}</h1><p>${e(options.title.zh)}</p><p class="muted">Publications and revised texts as at ${e(date)}. Enacted originals and amending instruments are retained separately.</p>${guides.length ? `<label>Find a Guide / 搜尋指引<input id="search" type="search"></label><table><thead><tr><th>Guide</th><th>Status</th><th>Read</th></tr></thead><tbody>${rows.join('')}</tbody></table><script>document.getElementById('search').addEventListener('input',e=>{for(const row of document.querySelectorAll('[data-search]'))row.hidden=!row.dataset.search.includes(e.target.value.toLowerCase())})</script>` : '<p>No enacted Guides have been published yet. / 尚未發布已制定的指引。</p>'}`,
  );
  files['.nojekyll'] = '';
  return { files, pdfPages };
}
