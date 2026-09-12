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
