import { test } from 'node:test';
import assert from 'node:assert/strict';
import { specimen } from './fixtures.ts';
import { enact, newNode, pair, textBlock, serialize, entries } from '../modules/document.ts';
import {
  newAmendment,
  addAction,
  proposed,
  generate,
  recheck,
  enactAmendment,
  revise,
} from '../modules/amendments.ts';
const source = () =>
  enact(specimen(), { date: '2026-01-01', effective: '2026-01-01', authority: 'Translation Team' });
test('generated amendments group section edits into one clause; stale sequences fail and recheck is explicit', async () => {
  const g = source(),
    original = serialize(g),
    s = g.nodes[0].children[0];
  let a = await newAmendment(g);
  a = await addAction(g, a, {
    type: 'replace-heading',
    target: s.id,
    clause: '3',
    subclause: '1',
    heading: pair('New heading', '新標題'),
  });
  a = await addAction(g, a, {
    type: 'replace-text',
    target: s.id,
    clause: '3',
    subclause: '2',
    language: 'en',
    block: s.blocks![0].id,
    find: 'This is',
    replacement: 'This remains',
  });
  const clauses = await generate(g, a);
  assert.equal(clauses.length, 1);
  assert.equal(clauses[0].items.length, 2);
  assert.match(clauses[0].items[1].text.zh, /英文文本/);
  a.actions[0].heading = pair('Changed', '更改');
  await assert.rejects(proposed(g, a), /changed/);
  a = await recheck(g, a);
  assert.equal((await proposed(g, a)).guide.nodes[0].children[0].heading!.en, 'Changed');
  assert.equal(serialize(g), original);
});
test('Part insertion with child and whole-guide repeal preserve original and drafts have no effect', async () => {
  const g = source();
  let a = await newAmendment(g);
  a.titles = pair('Amendment 2027', '2027年修訂指引');
  const p = newNode('part', '1A');
  p.heading = pair('New Part', '新部');
  const s = newNode('section', '2');
  s.heading = pair('Rules', '規則');
  s.blocks = [{ ...textBlock(), text: pair('Words', '字句') }];
  p.children = [s];
  a = await addAction(g, a, {
    type: 'insert-provision',
    target: g.nodes[0].id,
    position: 'after',
    node: p,
    clause: '3',
    subclause: '1',
  });
  assert.equal((await proposed(g, a)).guide.nodes[1].label, '1A');
  assert.equal((await revise(g, [a], '2028-01-01')).guide.nodes.length, 1);
  let repeal = await newAmendment(g);
  repeal.titles = pair('Repeal 2027', '2027年廢除指引');
  repeal = await addAction(g, repeal, {
    type: 'repeal-guide',
    target: g.id,
    clause: '2',
    subclause: '1',
  });
  const enacted = await enactAmendment(g, repeal, {
    date: '2027-01-01',
    effective: '2027-02-01',
    authority: 'Translation Team',
  });
  assert.equal((await revise(g, [enacted], '2027-01-31')).repealed, false);
  assert.equal((await revise(g, [enacted], '2027-02-01')).repealed, true);
  assert.equal((await proposed(g, repeal)).repealed, true);
  assert.equal(entries(g.nodes).length, 2);
});
test('formula has no amendment target', async () => {
  const g = source(),
    a = await newAmendment(g);
  await assert.rejects(
    addAction(g, a, {
      type: 'replace-heading',
      target: 'formula',
      clause: '3',
      subclause: '1',
      heading: pair('Bad', '錯'),
    }),
    /does not exist/,
  );
});

test('a later instrument amends the revised principal, with replayable exact source identity', async () => {
  const g = source(),
    n = g.nodes[0].children[0];
  let first = await newAmendment(g);
  first.titles = pair('Amendment 2027', '2027年修訂');
  first = await addAction(g, first, {
    type: 'replace-heading',
    target: n.id,
    heading: pair('2027 wording', '2027年字句'),
    clause: '3',
    subclause: '1',
  });
  first = await enactAmendment(g, first, {
    date: '2027-01-01',
    effective: '2027-01-01',
    authority: 'Translation Team',
  });
  const revision = await revise(g, [first], '2027-12-31');
  let second = await newAmendment(revision.guide);
  second.titles = pair('Amendment 2028', '2028年修訂');
  second = await addAction(revision.guide, second, {
    type: 'replace-heading',
    target: n.id,
    heading: pair('2028 wording', '2028年字句'),
    clause: '3',
    subclause: '1',
  });
  second = await enactAmendment(revision.guide, second, {
    date: '2028-01-01',
    effective: '2028-01-01',
    authority: 'Translation Team',
  });
  const result = await revise(g, [first, second], '2028-02-01');
  assert.equal(result.guide.nodes[0].children[0].heading!.en, '2028 wording');
  assert.equal(result.history.length, 2);
  await assert.rejects(revise(g, [second], '2028-02-01'), /exact enacted source/);
});

test('whole-Part substitution cannot renumber or relocate existing descendants', async () => {
  const g = source();
  const a = await newAmendment(g);
  const replacement = structuredClone(g.nodes[0]);
  replacement.children[0].label = '99';
  await assert.rejects(
    addAction(g, a, {
      type: 'replace-provision',
      target: replacement.id,
      node: replacement,
      clause: '3',
      subclause: '1',
    }),
    /renumber or relocate/,
  );
});
