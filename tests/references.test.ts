import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translationGuide, provision } from '../fixtures/examples.ts';
import { revise } from '../packages/engine/src/amendments.ts';
import {
  CatalogueClient,
  indexRevision,
  makeIndex,
  resolveReference,
  safeURL,
} from '../packages/engine/src/references.ts';
import { canonical, digest } from '../packages/domain/src/index.ts';
const base = 'https://publisher.example/api/';
async function fixture() {
  const p = translationGuide(),
    state = await revise(p, [], '2026-01-01');
  return {
    p,
    index: makeIndex(
      p,
      [
        indexRevision(
          state,
          'original',
          { en: '/en.html', 'zh-Hant': '/zh.html' },
          { en: '/en.pdf', 'zh-Hant': '/zh.pdf' },
        ),
      ],
      state.revision,
    ),
  };
}
test('generated labels prefer local definitions without rewriting prose', async () => {
  const { p, index } = await fixture();
  p.definitions = [
    {
      id: 'guide-name',
      document: p.id,
      names: { en: 'the 2026 Guide', 'zh-Hant': '《2026年指引》' },
      meaning: {},
    },
  ];
  const ref = {
    publisher: p.publisher,
    document: p.id,
    target: 's5a',
    selector: 'current' as const,
  };
  assert.equal(resolveReference(p, ref, index, 'en', base).label, 'section 5A of the 2026 Guide');
  assert.equal(resolveReference(p, ref, index, 'zh-Hant', base).label, '《2026年指引》第5A條');
  assert.equal(
    resolveReference(p, { ...ref, formal: true }, index, 'en', base).label,
    'section 5A of ' + p.titles.en,
  );
  assert.equal(
    resolveReference(p, { ...ref, custom: 'custom' }, index, 'en', base).label,
    'custom',
  );
  assert.throws(
    () => resolveReference(p, { ...ref, target: 'terminology' }, index, 'en', base),
    /never public/,
  );
  assert.throws(() => safeURL('javascript:alert(1)', base), /HTTP/);
});
test('catalogue loads one index, locks it for offline use, and catches corrupt content', async () => {
  const { p, index } = await fixture(),
    body = canonical(index);
  const catalogue = {
    protocol: 'sg-catalogue/1',
    publisher: p.publisher,
    asOf: '2026-01-01',
    documents: [
      { id: p.id, titles: p.titles, index: { href: 'one.json', digest: await digest(body) } },
    ],
  };
  const urls: string[] = [],
    client = new CatalogueClient(async (url) => {
      urls.push(url);
      return url.endsWith('catalogue.json') ? canonical(catalogue) : body;
    });
  assert.deepEqual(await client.document(base, p.id), index);
  assert.deepEqual(urls, [base + 'catalogue.json', base + 'one.json']);
  const offline = new CatalogueClient(async () => {
    throw new Error('must not fetch');
  }, true);
  await offline.addLocks(client.locks());
  assert.deepEqual(await offline.document(base.slice(0, -1), p.id), index);
  await assert.rejects(
    offline.addLocks([{ url: base + 'bad.json', body: '{}', digest: 'wrong' }]),
    /digest/,
  );
  await assert.rejects(offline.document(base, 'absent'), /absent/);
});
