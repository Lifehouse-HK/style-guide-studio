import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  change,
  fromRich,
  insertProvision,
  sample,
  setProvisionLabel,
  toRich,
} from '../apps/editor/src/model.ts';
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

test('manual draft labels apply to Parts, Schedules and nested provisions without changing identities', () => {
  const source = sample(),
    before = canonical(source);
  let edited = source;
  for (const node of walk(source.provisions)
    .filter((n) => n.kind !== 'crossheading')
    .reverse()) {
    edited = setProvisionLabel(edited, node.id, node.label + 'A');
  }
  assert.deepEqual(
    walk(edited.provisions).map((n) => n.id),
    walk(source.provisions).map((n) => n.id),
  );
  for (const old of walk(source.provisions)) {
    const next = walk(edited.provisions).find((n) => n.id === old.id)!;
    assert.equal(next.label, old.label + 'A');
    assert.deepEqual(next.content, old.content);
    assert.deepEqual(next.shared, old.shared);
  }
  const parts = source.provisions.filter((n) => n.kind === 'part');
  assert.throws(() => setProvisionLabel(source, parts[0].id, parts[1].label!), /already used/);
  assert.throws(() => setProvisionLabel(source, parts[0].id, ''), /Enter a number/);
  assert.throws(
    () => setProvisionLabel({ ...source, stage: 'adopted' }, parts[0].id, '1A'),
    /read-only/,
  );
  assert.equal(canonical(source), before);
});

test('Part amendments insert an alphanumeric Part and child, substitute its heading and omit a subtree', async () => {
  const { translationGuide, provision } = await import('../fixtures/examples.ts');
  const { amendmentDraft, appendOperation, proposedState } =
    await import('../apps/editor/src/amendment-model.ts');
  const base = translationGuide();
  const part = (id: string, label: string, children: typeof base.provisions) => ({
    id,
    kind: 'part' as const,
    label,
    heading: { en: 'Conventions', 'zh-Hant': '慣例' },
    content: {},
    tail: {},
    children,
  });
  base.provisions = [
    part('part1', '1', base.provisions.slice(0, 2)),
    part('part2', '2', base.provisions.slice(2, 4)),
    base.provisions[4],
  ];
  const original = canonical(base);
  let draft = amendmentDraft(base, { en: 'Amendment 2027', 'zh-Hant': '2027年修訂指引' });
  const instructions = { en: 'Amend the Part.', 'zh-Hant': '修訂該部。' };
  draft = await appendOperation(base, draft, '2027-01-01', '1', {
    type: 'insert',
    scope: 'structure',
    target: 'part1',
    position: 'after',
    node: part('part1a', '1A', []),
    instructions,
  });
  draft = await appendOperation(base, draft, '2027-01-01', '2', {
    type: 'insert',
    scope: 'structure',
    target: 'part1a',
    position: 'last',
    node: provision('s5b', '5B', 'New text', '新文字'),
    instructions,
  });
  let state = await proposedState(base, draft, '2027-01-01');
  assert.deepEqual(
    state.project.provisions.map((n) => n.id),
    ['part1', 'part1a', 'part2', 'sch1'],
  );
  const replacement = structuredClone(state.project.provisions[1]);
  replacement.heading = { en: 'New conventions', 'zh-Hant': '新慣例' };
  draft = await appendOperation(base, draft, '2027-01-01', '3', {
    type: 'substitute',
    scope: 'structure',
    target: 'part1a',
    node: replacement,
    instructions,
  });
  draft = await appendOperation(base, draft, '2027-01-01', '4', {
    type: 'omit',
    scope: 'structure',
    target: 'part2',
    instructions,
  });
  state = await proposedState(base, draft, '2027-01-01');
  assert.equal(state.project.provisions[1].label, '1A');
  assert.equal(state.project.provisions[1].heading.en, 'New conventions');
  assert.equal(state.project.provisions[1].children[0].id, 's5b');
  assert.ok(walk([state.project.provisions[2]]).every((n) => n.repealed));
  assert.equal(canonical(base), original);
});
