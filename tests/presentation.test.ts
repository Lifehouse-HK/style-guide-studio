import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translationGuide } from '../fixtures/examples.ts';
import { revise } from '../packages/engine/src/amendments.ts';
import { preparePublication, renderHTML } from '../packages/presentation/src/index.ts';
import { exportAKN, importAKN } from '../packages/formats/src/index.ts';
test('bilingual projection is two monolingual documents and one aligned landscape document', async () => {
  const p = translationGuide(),
    pub = preparePublication(await revise(p, [], '2026-09-11'), [], 'https://example.invalid/');
  const en = renderHTML(pub, 'en'),
    zh = renderHTML(pub, 'zh-Hant'),
    parallel = renderHTML(pub, 'parallel');
  assert.match(en, /A4 portrait/);
  assert.match(zh, /A4 portrait/);
  assert.match(parallel, /A4 landscape/);
  assert.ok(en.includes('A manually inserted provision.'));
  assert.ok(!zh.includes('A manually inserted provision.'));
  assert.ok(zh.includes('手動插入的條文。'));
  assert.ok(!en.includes('手動插入的條文。'));
  for (const html of [en, zh, parallel]) assert.equal((html.match(/<table>/g) ?? []).length, 1);
  assert.equal(
    en.match(/<table>[\s\S]*?<\/table>/)?.[0],
    zh.match(/<table>[\s\S]*?<\/table>/)?.[0],
  );
  assert.ok(parallel.includes('<div class="pair"><div lang="en">'));
  assert.equal((parallel.match(/id="n_s5a"/g) ?? []).length, 1);
});
test('publication treats authored markup as text and never includes active scripts', async () => {
  const p = translationGuide();
  p.provisions[1].content.en![0].inlines = [{ text: '<script>alert(1)</script>' }];
  const html = renderHTML(
    preparePublication(await revise(p, [], '2026-09-11'), [], 'https://example.invalid/'),
    'en',
  );
  assert.ok(!html.includes('<script>'));
  assert.match(html, /&lt;script&gt;/);
});
test('derived AKN explicitly refuses source editing', async () => {
  const p = translationGuide();
  const xml = await exportAKN(p, 'en', '2026-09-11', { revision: 'derived', asOf: '2026-09-11' });
  await assert.rejects(importAKN(xml), /read-only/);
});
