import { z } from 'zod';
import { digest, issues, guideSchema, type Guide, paired } from './document.ts';
import { amendmentSchema, revise, type Amendment } from './amendments.ts';
import { catalogueSchema, publicCatalogue, type Catalogue } from './references.ts';
const snapshot = z
  .object({
    path: z.string().regex(/^sources\/[a-f0-9]{64}\.json$/),
    digest: z.string().regex(/^[a-f0-9]{64}$/),
  })
  .strict();
export const publicationSchema = z
  .object({
    format: z.literal('lifehouse-publication/1'),
    guides: z.array(
      z
        .object({
          id: z.string().min(1),
          titles: paired,
          original: snapshot,
          amendments: z.array(snapshot),
        })
        .strict(),
    ),
  })
  .strict()
  .superRefine((m, ctx) => {
    if (new Set(m.guides.map((g) => g.id)).size !== m.guides.length)
      ctx.addIssue({ code: 'custom', message: 'Duplicate Guide IDs in publication API.' });
  });
export type Publication = z.infer<typeof publicationSchema>;
export function publicationBase(input: string): string {
  const u = new URL(input);
  if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password || u.search || u.hash)
    throw Error('Enter an HTTP(S) API base URL without credentials, a query or a fragment.');
  if (!u.pathname.endsWith('/')) u.pathname += '/';
  return u.href;
}
export function hongKongToday() {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Hong_Kong',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  return ['year', 'month', 'day']
    .map((type) => parts.find((p) => p.type === type)!.value)
    .join('-');
}
async function json(base: string, path: string) {
  let response: Response;
  try {
    response = await fetch(new URL(path, base), {
      credentials: 'omit',
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw Error(
      'Cannot reach the publication API. Check its URL, connection and cross-origin (CORS) settings.',
    );
  }
  if (!response.ok) throw Error(`Publication API returned ${response.status} for ${path}.`);
  try {
    return await response.json();
  } catch {
    throw Error(`Publication API did not return JSON for ${path}.`);
  }
}
export async function fetchPublication(input: string): Promise<Publication> {
  const base = publicationBase(input);
  return publicationSchema.parse(await json(base, 'publication.json'));
}
export type PublishedSource = {
  baseURL: string;
  asOf: string;
  source: Guide;
  origin: Guide;
  instruments: Amendment[];
  catalogues: Catalogue[];
  manifestDigest: string;
  sourceDigest: string;
};
/** Fetch one Guide's complete enacted timeline, then resolve today's text locally. */
export async function resolvePublished(
  input: string,
  id: string,
  date = hongKongToday(),
): Promise<PublishedSource> {
  const baseURL = publicationBase(input),
    manifest = await fetchPublication(baseURL),
    entry = manifest.guides.find((g) => g.id === id);
  if (!entry) throw Error('This Guide is no longer listed by the API. Reload the list.');
  const load = async (ref: z.infer<typeof snapshot>) => {
    if (ref.path !== `sources/${ref.digest}.json`)
      throw Error('The source path does not match its fingerprint.');
    const data = await json(baseURL, ref.path);
    if ((await digest(data)) !== ref.digest)
      throw Error(
        'Published source fingerprint mismatch. The API may be updating; retry after publication completes.',
      );
    return data;
  };
  const [raw, ...rawInstruments] = await Promise.all([
    load(entry.original),
    ...entry.amendments.map(load),
  ]);
  const origin = guideSchema.parse(raw),
    instruments = rawInstruments.map((v) => amendmentSchema.parse(v));
  if (origin.id !== id || origin.stage !== 'enacted' || origin.revision)
    throw Error('The API must supply the original enacted principal Guide.');
  if (instruments.some((a) => a.stage !== 'enacted' || a.source.id !== id))
    throw Error('The API contains an unrelated or unenacted amendment.');
  if (new Set(instruments.map((a) => a.id)).size !== instruments.length)
    throw Error('The API lists an amendment more than once.');
  if (origin.enactment!.effective > date) throw Error('This Guide is not yet in effect.');
  const result = await revise(origin, instruments, date);
  if (result.repealed) throw Error('This Guide has been repealed in full and cannot be amended.');
  const sourceDigest = await digest(result.guide),
    catalogue = catalogueSchema.parse(await json(baseURL, 'references.json'));
  // Future-dated effects are resolved locally even between static-site rebuilds.
  const current = publicCatalogue(result.guide, baseURL, sourceDigest).documents[0];
  const existing = catalogue.documents.find((d) => d.id === id);
  if (existing) {
    current.html = existing.html;
    current.pdf = existing.pdf;
  }
  return {
    baseURL,
    asOf: date,
    source: result.guide,
    origin,
    instruments,
    catalogues: [
      { ...catalogue, documents: [...catalogue.documents.filter((d) => d.id !== id), current] },
    ],
    manifestDigest: await digest(manifest),
    sourceDigest,
  };
}
/** Static API build helper; original instruments remain immutable, never flattened. */
export async function buildPublicationAPI(
  guides: Guide[],
  instruments: Amendment[],
  input: string,
  date = hongKongToday(),
  externalCatalogues: Catalogue[] = [],
): Promise<Record<string, unknown>> {
  const base = publicationBase(input),
    files: Record<string, unknown> = {},
    manifest: Publication = { format: 'lifehouse-publication/1', guides: [] },
    catalogue: Catalogue = { format: 'lifehouse-references/1', documents: [] };
  if (instruments.some((a) => !guides.some((g) => g.id === a.source.id)))
    throw Error('An amendment has no supplied original Guide.');
  const save = async (doc: Guide | Amendment) => {
    const hash = await digest(doc),
      path = `sources/${hash}.json`;
    files[path] = doc;
    return { path, digest: hash };
  };
  for (const g of guides) {
    guideSchema.parse(g);
    if (g.stage !== 'enacted' || g.revision) throw Error('Supply original enacted Guides only.');
    const amendments = instruments.filter((a) => a.source.id === g.id);
    for (const a of amendments) {
      amendmentSchema.parse(a);
      if (a.stage !== 'enacted') throw Error('Publish enacted amendments only.');
    }
    const last = [g.enactment!.effective, ...amendments.map((a) => a.enactment!.effective)]
      .sort()
      .at(-1)!;
    await revise(g, amendments, last);
    manifest.guides.push({
      id: g.id,
      titles: g.titles,
      original: await save(g),
      amendments: await Promise.all(amendments.map(save)),
    });
    const result = await revise(g, amendments, date);
    catalogue.documents.push(
      ...publicCatalogue(result.guide, base, await digest(result.guide), result.repealed).documents,
    );
  }
  for (const g of guides) {
    const result = await revise(
      g,
      instruments.filter((a) => a.source.id === g.id),
      date,
    );
    const faults = issues(result.guide, [catalogue, ...externalCatalogues]).filter(
      (i) => i.severity === 'error',
    );
    if (!result.repealed && faults.length)
      throw Error(`Cannot publish ${g.id}: ${faults[0].message}`);
  }
  publicationSchema.parse(manifest);
  files['publication.json'] = manifest;
  files['references.json'] = catalogue;
  return files;
}
