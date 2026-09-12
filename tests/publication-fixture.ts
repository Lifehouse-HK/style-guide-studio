import { createServer } from 'node:http';
import { enact, pair } from '../modules/document.ts';
import { newAmendment, addAction, enactAmendment, revise } from '../modules/amendments.ts';
import { buildPublicationAPI } from '../modules/publication-api.ts';
import { specimen } from './fixtures.ts';
export async function publicationFixture() {
  const original = enact(specimen(), {
    date: '2026-01-01',
    effective: '2026-01-01',
    authority: 'Test',
  });
  let base = original;
  const amendments = [];
  for (const [date, heading] of [
    ['2026-02-01', 'First amended heading'],
    ['2026-03-01', 'Current amended heading'],
    ['2099-01-01', 'Future heading'],
  ]) {
    let a = await newAmendment(base);
    a.titles = pair('Amendment ' + date, '修訂 ' + date);
    a = await addAction(base, a, {
      type: 'replace-heading',
      target: original.nodes[0].children[0].id,
      clause: '3',
      subclause: '1',
      heading: pair(heading, '修訂標題'),
    });
    a = await enactAmendment(base, a, { date, effective: date, authority: 'Test' });
    amendments.push(a);
    base = (await revise(base, [a], date)).guide;
  }
  return { original, amendments };
}
export async function serveAPI(files: Record<string, unknown> = {}) {
  const requests: string[] = [];
  const server = createServer((req, res) => {
    requests.push(req.url!);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    const key = decodeURIComponent(req.url!.split('?')[0].slice(1));
    if (!(key in files)) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Missing file' }));
      return;
    }
    res.end(JSON.stringify(files[key]));
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const address = server.address() as { port: number };
  return {
    files,
    requests,
    baseURL: `http://127.0.0.1:${address.port}/`,
    close: async () => {
      server.closeAllConnections();
      await new Promise<void>((r, e) => server.close((err) => (err ? e(err) : r())));
    },
  };
}
export async function serveFixture() {
  const fixture = await publicationFixture(),
    api = await serveAPI();
  Object.assign(
    api.files,
    await buildPublicationAPI([fixture.original], fixture.amendments, api.baseURL, '2026-09-12'),
  );
  return { ...api, ...fixture };
}
