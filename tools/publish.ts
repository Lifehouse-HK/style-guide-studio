import { readFile, mkdir, rename, stat, readdir, open, unlink } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import {
  activeLanguages,
  assertValid,
  canonical,
  digest,
  parseProject,
  walk,
  referenceValues,
  type Project,
} from '../packages/domain/src/index.ts';
import { exportAKN } from '../packages/formats/src/index.ts';
import { revise, type Revision } from '../packages/engine/src/amendments.ts';
import {
  CatalogueClient,
  indexRevision,
  makeIndex,
  safeURL,
  type Catalogue,
  type DocumentIndex,
  type IndexRevision,
} from '../packages/engine/src/references.ts';
import { preparePublication, renderHTML, type Layout } from '../packages/presentation/src/index.ts';
import { atomicWrite } from '../packages/runtime/src/files.ts';
const configSchema = z
  .object({
    format: z.literal('sg-build/1'),
    baseUrl: z.string(),
    asOf: z.string(),
    mode: z.enum(['proof', 'certified']),
    files: z.array(z.string()).min(1),
    approvals: z
      .array(
        z
          .object({
            publisher: z.string(),
            id: z.string(),
            revision: z.string(),
            digest: z.string(),
          })
          .strict(),
      )
      .default([]),
  })
  .strict();
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
async function buildPublication(
  configPath: string,
  outDir: string,
): Promise<{ release: string; documents: number }> {
  const config = configSchema.parse(JSON.parse(await readFile(configPath, 'utf8'))),
    base = safeURL(
      config.baseUrl.endsWith('/') ? config.baseUrl : config.baseUrl + '/',
      config.baseUrl,
    );
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(config.asOf) ||
    new Date(config.asOf).toISOString().slice(0, 10) !== config.asOf
  )
    throw new Error('Explicit as-of date required.');
  const sources: Project[] = [],
    seen = new Set<string>();
  for (const file of config.files) {
    const sourcePath = resolve(dirname(configPath), file);
    if (!sourcePath.startsWith(resolve(dirname(configPath)) + '/'))
      throw new Error('Source paths must remain within the build configuration directory.');
    const p = parseProject(await readFile(sourcePath, 'utf8'));
    assertValid(p, config.mode === 'certified');
    const key = p.publisher + ':' + p.id;
    if (seen.has(key)) throw new Error('Duplicate source identity.');
    seen.add(key);
    sources.push(p);
  }
  // Approval inputs are checked against exact canonical source bytes; their provenance
  // must be protected by the caller's repository review policy.
  if (config.mode === 'certified')
    for (const p of sources) {
      const hash = await digest(canonical(p));
      if (
        !config.approvals.some(
          (a) =>
            a.publisher === p.publisher &&
            a.id === p.id &&
            a.revision === p.revision &&
            a.digest === hash,
        )
      )
        throw new Error(`Missing exact approval record: ${p.id}`);
    }
  if (new Set(sources.map((p) => p.publisher)).size !== 1)
    throw new Error('One publisher per catalogue. Use external locked indexes for others.');
  const toolFiles = await readdir(join(ROOT, 'packages'), { recursive: true });
  const toolchain = await Promise.all(
    toolFiles
      .filter((f) => f.endsWith('.ts'))
      .sort()
      .map(async (f) => [f, await digest(await readFile(join(ROOT, 'packages', f), 'utf8'))]),
  );
  for (const f of [
    'tools/publish.ts',
    'tools/pdf.py',
    'tools/pdf-chromium.ts',
    'tools/subset_font.py',
    'package-lock.json',
    'requirements.lock',
  ])
    toolchain.push([f, await digest(await readFile(join(ROOT, f), 'utf8'))]);
  toolchain.push([
    'assets/fonts/NotoSerifTC.ttf',
    createHash('sha256')
      .update(await readFile(join(ROOT, 'assets/fonts/NotoSerifTC.ttf')))
      .digest('hex'),
  ]);
  const release = await digest(canonical({ profile: 'publication/1', config, sources, toolchain })),
    prefix = `releases/${release}/`;
  const root = resolve(outDir),
    stage = join(root, '.build-' + release),
    destination = join(root, prefix);
  // Immutable release resources may be reused; the current manifest is always written last.
  await mkdir(stage, { recursive: true });
  const entries: {
      p: Project;
      state: Revision;
      kind: IndexRevision['kind'];
      folder: string;
      indexRevision: IndexRevision;
    }[] = [],
    indexes: DocumentIndex[] = [];
  for (const p of sources) {
    const original: Revision = {
      project: p,
      revision: p.revision,
      asOf: p.adoption?.effective ?? config.asOf,
      state:
        p.stage === 'draft'
          ? 'proposed'
          : !p.adoption || p.stage === 'withdrawn' || p.adoption.effective > config.asOf
            ? 'not-effective'
            : 'effective',
      applied: [],
      history: [],
    };
    const versions: { state: Revision; kind: IndexRevision['kind'] }[] = [
      { state: original, kind: p.stage === 'draft' ? 'draft' : 'original' },
    ];
    if (p.role === 'principal' && p.stage === 'adopted') {
      const instruments = sources.filter(
        (a) =>
          a.role === 'amendment' &&
          a.amendment?.targetDocument === p.id &&
          a.amendment.targetPublisher === p.publisher,
      );
      const current = await revise(p, instruments, config.asOf, (state) =>
        versions.push({ state, kind: 'revision' }),
      );
      versions.find((v) => v.state.revision === current.revision)!.state = current;
    }
    const revisions: IndexRevision[] = [];
    for (const { state, kind } of versions) {
      const folder = `${p.id}/${encodeURIComponent(state.revision)}`,
        layouts: Layout[] = p.mode === 'bilingual' ? ['en', 'zh-Hant', 'parallel'] : [p.mode],
        html: IndexRevision['html'] = {},
        pdf: IndexRevision['pdf'] = {};
      for (const layout of layouts) {
        html[layout] = safeURL(prefix + folder + '/' + layout + '.html', base);
        pdf[layout] = safeURL(prefix + folder + '/' + layout + '.pdf', base);
      }
      const rev = indexRevision(state, kind, html, pdf);
      revisions.push(rev);
      entries.push({ p, state, kind, folder, indexRevision: rev });
    }
    indexes.push(makeIndex(p, revisions, revisions.at(-1)!.id));
  }
  const external = new CatalogueClient(async () => {
    throw new Error('Certified/proof builds use locked dependencies only.');
  }, true);
  for (const p of sources) await external.addLocks(p.locks);
  for (const entry of entries)
    for (const ref of referenceValues(entry.state.project))
      if (!indexes.some((x) => x.publisher === ref.publisher && x.id === ref.document)) {
        const candidate = external.locks().find((lock) => {
          try {
            const v = JSON.parse(lock.body);
            return (
              v.protocol === 'sg-index/1' && v.publisher === ref.publisher && v.id === ref.document
            );
          } catch {
            return false;
          }
        });
        if (!candidate) throw new Error('Missing locked external index.');
        const { indexSchema } = await import('../packages/engine/src/references.ts');
        indexes.push(indexSchema.parse(JSON.parse(candidate.body)));
      }

  for (const entry of entries) {
    const { p, state, folder, indexRevision: rev } = entry,
      pub = preparePublication(state, indexes, base, config.mode === 'proof');
    await mkdir(join(stage, folder), { recursive: true });
    await atomicWrite(join(stage, folder, 'source.sg.json'), canonical(p));
    await atomicWrite(join(stage, folder, 'revision.json'), canonical(state));
    for (const layout of Object.keys(rev.html) as Layout[]) {
      const html = renderHTML(pub, layout, 'web'),
        print = renderHTML(pub, layout, 'pdf'),
        path = join(stage, folder, layout + '.html'),
        printPath = join(stage, folder, layout + '.print.html');
      await atomicWrite(path, html);
      await atomicWrite(printPath, print);
      const run = spawnSync(
        join(ROOT, '.venv/bin/python'),
        [join(ROOT, 'tools/pdf.py'), printPath, join(stage, folder, layout + '.pdf')],
        { encoding: 'utf8', timeout: 120_000, maxBuffer: 1_000_000 },
      );
      if (run.status !== 0) throw new Error('PDF build failed: ' + (run.stderr || run.error));
      await atomicWrite(join(stage, folder, layout + '.destinations.json'), run.stdout);
      if (layout !== 'parallel') {
        const xml = await exportAKN(
            state.project,
            layout,
            config.asOf,
            { revision: state.revision, asOf: state.asOf },
            (ref) => {
              const r = pub.links[layout + ':' + canonical(ref)];
              if (!r) throw new Error('Unresolved AKN reference.');
              return { label: r.label, href: r.html };
            },
          ),
          check = spawnSync(join(ROOT, '.venv/bin/python'), [join(ROOT, 'tools/validate_xml.py')], {
            input: xml,
            encoding: 'utf8',
            timeout: 30_000,
          });
        if (check.status !== 0) throw new Error('AKN validation failed: ' + check.stderr);
        await atomicWrite(join(stage, folder, layout + '.xml'), xml);
      }
    }
    for (const target of rev.targets) {
      const node = walk(state.project.provisions).find((n) => n.id === target.id)!,
        body = canonical(node),
        relative = prefix + folder + '/targets/' + target.id + '.json';
      await atomicWrite(join(stage, folder, 'targets', target.id + '.json'), body);
      target.content = { href: safeURL(relative, base), digest: await digest(body) };
    }
    indexes
      .find((i) => i.publisher === p.publisher && i.id === p.id)!
      .revisions.find((r) => r.id === rev.id)!.targets = rev.targets;
  }
  const catalogue: Catalogue = {
    protocol: 'sg-catalogue/1',
    publisher: sources[0].publisher,
    asOf: config.asOf,
    documents: [],
  };
  for (const p of sources) {
    const index = indexes.find((i) => i.id === p.id && i.publisher === p.publisher)!,
      body = canonical(index),
      relative = prefix + p.id + '/index.json';
    await atomicWrite(join(stage, p.id, 'index.json'), body);
    catalogue.documents.push({
      id: p.id,
      titles: p.titles,
      index: { href: safeURL(relative, base), digest: await digest(body) },
    });
  }
  await atomicWrite(
    join(stage, 'build.json'),
    canonical({
      format: 'sg-release/1',
      release,
      asOf: config.asOf,
      mode: config.mode,
      sources: await Promise.all(
        sources.map(async (p) => ({
          id: p.id,
          revision: p.revision,
          digest: await digest(canonical(p)),
        })),
      ),
    }),
  );
  await mkdir(dirname(destination), { recursive: true });
  try {
    await stat(destination);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
    await rename(stage, destination);
  }
  try {
    const prior = JSON.parse(await readFile(join(root, 'catalogue.json'), 'utf8'));
    if (prior.asOf > config.asOf)
      throw new Error(
        'Refusing an older as-of build; rollback requires an explicit operator procedure.',
      );
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== 'ENOENT') throw e;
  }
  await atomicWrite(join(root, 'catalogue.json'), canonical(catalogue));
  return { release, documents: sources.length };
}
export async function publish(
  configPath: string,
  outDir: string,
): Promise<{ release: string; documents: number }> {
  await mkdir(outDir, { recursive: true });
  const lock = join(outDir, '.publish.lock');
  const handle = await open(lock, 'wx');
  try {
    await handle.writeFile(String(process.pid));
    return await buildPublication(configPath, outDir);
  } finally {
    await handle.close();
    await unlink(lock);
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const [config, out] = process.argv.slice(2);
  if (!config || !out)
    throw new Error('Usage: npm run publish:documents -- build.json output-directory');
  console.log(await publish(resolve(config), resolve(out)));
}
