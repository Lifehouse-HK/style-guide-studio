import { test } from 'node:test';
import assert from 'node:assert/strict';
import { specimen } from './fixtures.ts';
import { enact, issues, pair, definitionAnchor } from '../modules/document.ts';
import { publicCatalogue, resolve } from '../modules/references.ts';
import { newAmendment, addAction, enactAmendment } from '../modules/amendments.ts';
const record = { date: '2026-01-01', effective: '2026-01-01', authority: 'Test' };
test('all reference-bearing fields are checked at enactment, with draft errors and repeal warnings', () => {
  const g = specimen(),
    external = specimen();
  external.id = 'external';
  const c = publicCatalogue(external, 'https://example.org/', 'r');
  const n = g.nodes[0].children[0];
  n.closing = pair('[[external]]', '[[external]]');
  n.blocks!.push({
    id: 't',
    type: 'table',
    caption: pair(),
    numbered: false,
    rows: [['[[external#missing]]']],
  });
  g.preamble = { mode: 'paragraph', paragraph: pair('[[external]]', '[[external]]'), items: [] };
  assert.throws(() => enact(g, record, [c]));
  n.blocks!.pop();
  c.documents[0].status = 'draft';
  assert.throws(() => enact(g, record, [c]));
  c.documents[0].status = 'repealed';
  assert.equal(enact(g, record, [c]).stage, 'enacted');
  assert.ok(issues(g, [c]).some((i) => i.severity === 'warning' && i.code === 'reference'));
  assert.equal(resolve('external', g, 'en', [c], true).href, 'https://example.org/external/en.pdf');
  assert.equal(resolve(g.id, g, 'en', []).href, '#document-title');
  n.blocks!.push({
    id: 'definitions',
    type: 'definitions',
    master: false,
    items: [{ id: 'term', term: pair('word', '詞'), meaning: pair('means a word', '指詞') }],
  });
  assert.match(
    resolve('#' + definitionAnchor('definitions', 'term'), g, 'en', []).label,
    /definition of “word”/,
  );
});
test('amendment enactment validates its own bilingual front matter', async () => {
  const base = enact(specimen(), record);
  let a = await newAmendment(base);
  a.titles = pair('Amendment', '修訂');
  a = await addAction(base, a, {
    type: 'repeal-guide',
    target: base.id,
    clause: '3',
    subclause: '1',
  });
  a.formula = pair();
  await assert.rejects(enactAmendment(base, a, record), /formula/);
});
