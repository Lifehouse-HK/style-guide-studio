import { test } from 'node:test';
import assert from 'node:assert/strict';
import { printHtml } from '../editor/print.ts';
import { publicCatalogue } from '../modules/references.ts';
import { specimen } from './fixtures.ts';
test('browser print expression uses PDF URLs for whole documents and provisions', async () => {
  const g = specimen(),
    e = specimen();
  e.id = 'external';
  const b = g.nodes[0].children[0].blocks![0];
  if (b.type !== 'text') throw Error();
  b.text.en = `[[external]] and [[external#${e.nodes[0].id}]]`;
  const html = await printHtml(
    {
      format: 'lifehouse-workspace/2',
      document: g,
      catalogues: [publicCatalogue(e, 'https://example.org/', 'r')],
    },
    'en',
    '',
  );
  assert.match(html, /href="https:\/\/example.org\/external\/en.pdf"/);
  assert.match(html, /href="https:\/\/example.org\/external\/en.pdf#/);
  assert.doesNotMatch(html, /external\/en.html/);
});

test('XML generates the preamble opening and can still reopen unchanged version-one exports', async () => {
  const { exportXml, importXml } = await import('../modules/xml.ts');
  const g = specimen();
  g.preamble.mode = 'paragraph';
  g.preamble.paragraph = { en: 'A reason.', zh: '理由。' };
  const w = { format: 'lifehouse-workspace/2' as const, document: g, catalogues: [] };
  for (const l of ['en', 'zh'] as const) {
    const xml = await exportXml(w, l);
    assert.ok(xml.includes(l === 'en' ? 'WHEREAS— A reason.' : '鑑於—— 理由。'));
    assert.deepEqual(await importXml(xml), w);
  }
  const old = await exportXml(w, 'en', '2026-09-12', 1);
  assert.ok(!old.includes('WHEREAS'));
  assert.deepEqual(await importXml(old), w);
});
