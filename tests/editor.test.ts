import { test } from 'node:test';
import assert from 'node:assert/strict';
import { change, fromRich, insertProvision, sample, toRich } from '../apps/editor/src/model.ts';
import { canonical, parseProject, walk, type Inline } from '../packages/domain/src/index.ts';
test('editor inserts explicit labels without changing existing identities; invalid hierarchy is atomic', () => {
  const p = sample(),
    before = canonical(p),
    target = walk(p.provisions).find((n) => n.label === '5A')!;
  const next = insertProvision(p, target.id, 'after', 'section', '5B');
  assert.deepEqual(
    walk(next.provisions)
      .filter((n) => n.kind === 'section')
      .map((n) => n.label),
    ['1', '2', '5', '5A', '5B', '6'],
  );
  for (const n of walk(p.provisions))
    assert.ok(walk(next.provisions).some((v) => v.id === n.id && v.label === n.label));
  assert.throws(() => insertProvision(p, target.id, 'after', 'section', '5A'), /label|address/i);
  assert.throws(() => insertProvision(p, target.id, 'child', 'part', '3'), /cannot appear/);
  assert.equal(canonical(p), before);
});
test('editor rich text round trip preserves Unicode, marks and atomic references', () => {
  const xs: Inline[] = [
    { text: '「教會」👩‍👩‍👦\nexact ', marks: ['literal', 'bold'] },
    {
      text: 'Schedule 1',
      ref: {
        publisher: 'lifehouse-hk',
        document: 'guide',
        target: 'sch1',
        selector: 'revision',
        revision: 'r1',
      },
      marks: ['italic'],
    },
    { text: 'the Guide', term: 'guide-name' },
    { text: 'website', href: 'https://example.org' },
  ];
  assert.deepEqual(fromRich(toRich(xs)), xs);
  const p = sample();
  p.provisions[0].content.en = [{ id: 'complex', type: 'p', inlines: xs }];
  const changed = change(p, (d) => {
    d.titles.en = 'Changed title';
  });
  assert.deepEqual(parseProject(canonical(changed)).provisions[0].content.en![0].inlines, xs);
  assert.deepEqual(changed.provisions.at(-1)!.shared, p.provisions.at(-1)!.shared);
});
test('editor commands reject adopted sources and preserve caller bytes', () => {
  const p = sample();
  p.stage = 'adopted';
  const before = canonical(p);
  assert.throws(
    () =>
      change(p, (d) => {
        d.titles.en = 'Changed';
      }),
    /read-only/,
  );
  assert.equal(canonical(p), before);
});
