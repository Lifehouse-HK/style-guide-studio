import { test } from 'node:test';
import assert from 'node:assert/strict';
import { specimen } from './fixtures.ts';
import { enact, pair } from '../modules/document.ts';
import { newAmendment, addAction, enactAmendment } from '../modules/amendments.ts';
import { buildPublication } from '../modules/publication.ts';
import { searchGuide, compareGuides } from '../modules/review.ts';
const options = {
  title: pair('Publication Guides', '刊物指引'),
  baseURL: 'https://example.org/guides/',
  editorURL: 'https://example.org/editor/',
  asOf: '2028-01-01',
};
test('publication builds original, revised, history, amendment and PDF destinations with complete repeal status', async () => {
  const base = enact(specimen(), {
    date: '2026-01-01',
    effective: '2026-01-01',
    authority: 'Test',
  });
  let a = await newAmendment(base);
  a.titles = pair('Repeal Guide', '廢除指引');
  a = await addAction(base, a, {
    type: 'repeal-guide',
    target: base.id,
    clause: '3',
    subclause: '1',
  });
  a = await enactAmendment(base, a, {
    date: '2027-01-01',
    effective: '2027-01-01',
    authority: 'Test',
  });
  const build = await buildPublication(
    [base, a].map((document) => ({
      format: 'lifehouse-workspace/2' as const,
      document,
      catalogues: [],
    })),
    options,
  );
  assert.match(build.files[base.id + '/en.html'], /REPEALED/);
  assert.doesNotMatch(build.files[base.id + '/original/en.html'], /class="status">REPEALED/);
  assert.match(build.files[base.id + '/versions/2027-01-01/en.html'], /history-0/);
  assert.ok(build.files[a.id + '/en.html']);
  assert.match(build.pdfPages[base.id + '/en.pdf'], new RegExp(a.id + '/en.pdf#clause-3'));
  const catalogue = JSON.parse(build.files['references.json']);
  assert.equal(catalogue.documents.length, 2);
  assert.equal(catalogue.documents.find((d: any) => d.id === base.id).status, 'repealed');
  assert.ok(Object.keys(build.files).some((p) => p.startsWith('sources/')));
});
test('an empty corpus publishes no synthetic enacted material; search and comparison are readable', async () => {
  const build = await buildPublication([], options);
  assert.match(build.files['index.html'], /No enacted Guides/);
  assert.equal(Object.keys(build.pdfPages).length, 0);
  const g = specimen(),
    next = structuredClone(g);
  next.nodes[0].children[0].heading = pair('Updated heading', '新標題');
  assert.ok(searchGuide(g, '本指引').length);
  assert.equal(compareGuides(g, next).length, 1);
});
