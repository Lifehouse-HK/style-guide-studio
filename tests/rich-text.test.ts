import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRich, serializeRich, richPlain, replaceRich } from '../modules/rich-text.ts';
import { render } from '../modules/render.ts';
import { guideSchema, pair, enact } from '../modules/document.ts';
import { specimen } from './fixtures.ts';
import { newAmendment, addAction, proposed } from '../modules/amendments.ts';
import { exportXml, importXml } from '../modules/xml.ts';
test('restricted HTML renders formatting and literal punctuation without Markdown interpretation', async () => {
  const g = specimen();
  const block = g.nodes[0].children[0].blocks![0];
  if (block.type === 'table' || block.type === 'definitions') throw Error();
  block.textFormat = { en: 'html' };
  block.text.en = '<strong>Bold <em>and italic</em></strong> *literal* &lt;tag&gt; &amp; &amp;lt;';
  const html = await render(g, { layout: 'en' });
  assert.match(html, /<strong><em>and italic<\/em><\/strong>/);
  assert.match(html, /\*literal\* &lt;tag&gt; &amp; &amp;lt;/);
  assert.doesNotMatch(html, /<tag>/);
  const workspace = { format: 'lifehouse-workspace/2' as const, document: g, catalogues: [] };
  const xml = await exportXml(workspace, 'en');
  assert.match(xml, /<b><i>and italic<\/i><\/b>/);
  assert.deepEqual(await importXml(xml), workspace);
  for (const value of [
    '<img src="x"/>',
    '<strong onclick="x">bad</strong>',
    '<!DOCTYPE x>',
    '<strong>bad',
    '</root><script>bad</script>',
  ]) {
    block.text.en = value;
    assert.equal(guideSchema.safeParse(g).success, false);
  }
});
test('HTML source text replacement targets visible characters and preserves surrounding formatting', async () => {
  const g = specimen();
  const n = g.nodes[0].children[0],
    b = n.blocks![0];
  if (b.type === 'table' || b.type === 'definitions') throw Error();
  b.textFormat = { en: 'html' };
  b.text.en = '<strong>A &lt; B</strong> and C';
  const base = enact(g, { date: '2026-01-01', effective: '2026-01-01', authority: 'Test' });
  let a = await newAmendment(base);
  a = await addAction(base, a, {
    type: 'replace-text',
    target: n.id,
    block: b.id,
    language: 'en',
    find: '< B',
    replacement: '& D',
    clause: '3',
    subclause: '1',
  });
  const result = (await proposed(base, a)).guide.nodes[0].children[0].blocks![0];
  if (result.type === 'table' || result.type === 'definitions') throw Error();
  assert.equal(richPlain(result.text.en), 'A & D and C');
  assert.match(result.text.en, /<strong>&amp; D<\/strong>/);
  const multiline = replaceRich('<strong>A B</strong>', 'B', 'C\nD');
  for (const line of multiline.split('\n')) parseRich(line);
  assert.equal(richPlain(multiline), 'A C\nD');
  assert.equal(richPlain(serializeRich([{ text: '* ** < & &lt;', marks: [] }])), '* ** < & &lt;');
});
