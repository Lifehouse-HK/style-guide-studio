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

test('amendment composer inserts a bilingual provision and captures each intermediate precondition', async () => {
  const { translationGuide, provision } = await import('../fixtures/examples.ts');
  const { amendmentDraft, appendOperation, proposedState } =
    await import('../apps/editor/src/amendment-model.ts');
  const base = translationGuide(),
    original = canonical(base);
  let draft = amendmentDraft(base, { en: 'Amendment 2027', 'zh-Hant': '2027年修訂指引' });
  const node = provision('new5b', '5B', 'Inserted wording.', '新加入的字句。');
  draft = await appendOperation(base, draft, '2027-01-01', '1', {
    type: 'insert',
    scope: 'structure',
    target: 's5a',
    position: 'after',
    node,
    instructions: { en: 'After section 5A, insert—', 'zh-Hant': '在第5A條之後加入——' },
  });
  let out = await proposedState(base, draft, '2027-01-01');
  assert.deepEqual(
    out.project.provisions.map((n) => n.label),
    ['1', '5', '5A', '5B', '6', '1'],
  );
  assert.equal(out.state, 'proposed');
  draft = await appendOperation(base, draft, '2027-01-01', '2', {
    type: 'substitute',
    scope: 'en',
    target: 'new5b-en',
    block: { id: 'new5b-en', type: 'p', inlines: [{ text: 'Revised inserted wording.' }] },
    instructions: { en: 'Substitute the English wording.', 'zh-Hant': '代替英文字句。' },
  });
  out = await proposedState(base, draft, '2027-01-01');
  assert.equal(
    out.project.provisions[3].content.en![0].inlines[0].text,
    'Revised inserted wording.',
  );
  assert.equal(canonical(base), original);
  const invalid = structuredClone(draft);
  invalid.amendment!.operations[1].expected = 'wrong';
  await assert.rejects(proposedState(base, invalid, '2027-01-01'), /digest/);
  await assert.rejects(
    appendOperation(base, draft, '2027-01-01', '3', {
      type: 'omit',
      scope: 'structure',
      target: 's6',
      instructions: { en: 'Omit section 6.' },
    }),
    /Paired instructions/,
  );
});

test('recovery retains the old slot when a backup write fails and preserves malformed bytes', async () => {
  const { saveRecovery, recoveryKey } = await import('../apps/editor/src/recovery.ts');
  const values = new Map([[recoveryKey, 'broken source bytes']]);
  const storage = {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => {
      values.set(k, v);
    },
  };
  saveRecovery(storage, sample());
  assert.equal(values.get(recoveryKey + '.unreadable'), 'broken source bytes');
  const old = values.get(recoveryKey);
  const p = sample();
  p.titles.en = 'Changed';
  assert.throws(
    () =>
      saveRecovery(
        {
          ...storage,
          setItem: () => {
            throw new Error('quota');
          },
        },
        p,
      ),
    /quota/,
  );
  assert.equal(values.get(recoveryKey), old);
});
