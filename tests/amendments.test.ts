import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translationGuide, provision } from '../fixtures/examples.ts';
import { canonical, plain, type Operation, type Project } from '../packages/domain/src/index.ts';
import {
  revise,
  applyInstrument,
  precondition,
  type Revision,
} from '../packages/engine/src/amendments.ts';
const instructions = { en: 'Substitute the specified words.', 'zh-Hant': '以指明字句代替。' };
async function amendment(
  state: Revision,
  id: string,
  date: string,
  operations: Operation[],
): Promise<Project> {
  const p = translationGuide();
  Object.assign(p, {
    id,
    role: 'amendment',
    revision: 'adopted-1',
    adoption: { date, effective: date, body: 'Test authority', sourceRevision: 'adopted-1' },
    provisions: [provision('authority', '1', 'Amend the principal.', '修訂主體指引。')],
    amendment: {
      targetDocument: state.project.id,
      targetPublisher: state.project.publisher,
      expectedRevision: state.revision,
      after: state.applied.slice(-1),
      operations,
      events: [],
    },
  });
  return p;
}
async function replace(state: Revision, id: string, date: string): Promise<Project> {
  return amendment(state, id, date, [
    {
      id: 'op1',
      author: 'authority',
      type: 'substitute',
      target: 's5-en',
      scope: 'en',
      expected: await precondition(state.project, 's5-en'),
      start: 0,
      end: 3,
      text: 'Apply',
      instructions,
    },
  ]);
}
test('same-year and later amendments replay expected intermediate states; originals remain exact', async () => {
  const p = translationGuide(),
    original = canonical(p),
    s0 = await revise(p, [], '2026-01-01');
  const a = await replace(s0, 'amendment-2027', '2027-01-01'),
    s1 = await revise(p, [a], '2027-06-01');
  const b = await amendment(s1, 'amendment-2027-no2', '2027-09-01', [
    {
      id: 'op2',
      author: 'authority',
      type: 'substitute',
      target: 'terminology',
      scope: 'shared',
      expected: await precondition(s1.project, 'terminology'),
      block: {
        id: 'terminology',
        type: 'table',
        inlines: [],
        rows: [[[{ text: 'English' }]], [[{ text: 'Mercy' }]]],
      },
      instructions,
    },
  ]);
  const s2 = await revise(p, [b, a], '2027-10-01');
  const c = await amendment(s2, 'amendment-2028', '2028-01-01', [
    {
      id: 'op3',
      author: 'authority',
      type: 'substitute',
      target: 's5-en',
      scope: 'en',
      expected: await precondition(s2.project, 's5-en'),
      block: { id: 's5-en', type: 'p', inlines: [{ text: 'Final wording.' }] },
      instructions,
    },
  ]);
  const out = await revise(p, [c, b, a], '2028-01-01');
  assert.equal(plain(out.project.provisions[1].content.en![0]), 'Final wording.');
  assert.equal(out.history[0].supersededBy, 'amendment-2028:op3');
  assert.equal(out.history.length, 3);
  assert.equal(canonical(p), original);
  assert.equal((await revise(p, [a, b, c], '2026-12-31')).history.length, 0);
  const draft = structuredClone(a);
  draft.stage = 'draft';
  assert.equal((await revise(p, [draft], '2028-01-01')).history.length, 0);
});
test('conflicting second operation rolls back the entire instrument', async () => {
  const s = await revise(translationGuide(), [], '2026-01-01'),
    before = canonical(s),
    a = await replace(s, 'bad', '2027-01-01');
  a.amendment!.operations.push({ ...a.amendment!.operations[0], id: 'op2', expected: 'wrong' });
  await assert.rejects(applyInstrument(s, a, '2027-01-01'), /digest/);
  assert.equal(canonical(s), before);
});
test('tables are atomic and bilingual instructions cannot be bypassed', async () => {
  const s = await revise(translationGuide(), [], '2026-01-01'),
    a = await replace(s, 'bad', '2027-01-01');
  a.mode = 'en';
  await assert.rejects(applyInstrument(s, a, '2027-01-01'), /Bilingual/);
  a.mode = 'bilingual';
  Object.assign(a.amendment!.operations[0], {
    target: 'terminology',
    scope: 'shared',
    expected: await precondition(s.project, 'terminology'),
  });
  await assert.rejects(applyInstrument(s, a, '2027-01-01'), /Tables/);
});
test('published omissions preserve identities and reject revival/renumbering', async () => {
  const s = await revise(translationGuide(), [], '2026-01-01');
  const op: Operation = {
    id: 'omit',
    author: 'authority',
    type: 'omit',
    scope: 'structure',
    target: 's5',
    expected: await precondition(s.project, 's5'),
    instructions,
  };
  const a = await amendment(s, 'omit-2027', '2027-01-01', [op]);
  const revised = await revise(s.project, [a], '2027-01-01');
  assert.equal(revised.project.provisions[1].id, 's5');
  assert.equal(revised.project.provisions[1].repealed, true);
  const node = structuredClone(s.project.provisions[1]);
  node.label = '7';
  a.amendment!.operations = [{ ...op, type: 'substitute', node }];
  await assert.rejects(applyInstrument(s, a, '2027-01-01'), /manual label/);
});
test('Unicode ranges cannot split graphemes', async () => {
  const p = translationGuide();
  p.provisions[1].content.en![0].inlines = [{ text: 'A👩‍👩‍👦Z' }];
  const s = await revise(p, [], '2026-01-01');
  const a = await replace(s, 'bad', '2027-01-01');
  a.amendment!.operations[0].start = 2;
  await assert.rejects(applyInstrument(s, a, '2027-01-01'), /grapheme/);
});
test('cancellation before commencement suppresses a scheduled instrument, without undoing past text', async () => {
  const p = translationGuide(),
    s = await revise(p, [], '2026-01-01'),
    future = await replace(s, 'future', '2028-01-01');
  const event = await amendment(s, 'cancel', '2027-01-01', []);
  event.amendment!.events = [{ type: 'cancel', target: 'future', expectedDate: '2028-01-01' }];
  const out = await revise(p, [future, event], '2029-01-01');
  assert.deepEqual(out.applied, ['cancel']);
  assert.equal(
    plain(out.project.provisions[1].content.en![0]),
    plain(p.provisions[1].content.en![0]),
  );
  event.amendment!.events[0].expectedDate = '2028-02-01';
  await assert.rejects(revise(p, [future, event], '2029-01-01'), /scheduled target/);
});
test('same-day ordered instruments retain distinct intermediate snapshots', async () => {
  const p = translationGuide(),
    s = await revise(p, [], '2026-01-01'),
    a = await replace(s, 'first', '2027-01-01'),
    s1 = await applyInstrument(s, a, '2027-01-01');
  const b = await amendment(s1, 'second', '2027-01-01', [
    {
      id: 'second-op',
      author: 'authority',
      type: 'substitute',
      target: 's5-en',
      scope: 'en',
      expected: await precondition(s1.project, 's5-en'),
      start: 0,
      end: 5,
      text: 'Choose',
      instructions,
    },
  ]);
  const snapshots: Revision[] = [];
  const result = await revise(p, [b, a], '2027-12-31', (snapshot) => snapshots.push(snapshot));
  assert.equal(snapshots.length, 2);
  assert.equal(snapshots[0].revision, b.amendment!.expectedRevision);
  assert.deepEqual(result.applied, ['first', 'second']);
  assert.notEqual(snapshots[0].revision, snapshots[1].revision);
});
