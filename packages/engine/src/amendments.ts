import {
  activeLanguages,
  assertValid,
  blocks,
  canonical,
  digest,
  parseProject,
  plain,
  walk,
  type Block,
  type Operation,
  type Project,
  type Provision,
} from '../../domain/src/index.ts';
export interface HistoryEntry {
  instrument: string;
  revision: string;
  operation: string;
  author: string;
  target: string;
  type: string;
  date: string;
  before: string;
  after: string;
  supersededBy?: string;
}
export interface Revision {
  project: Project;
  revision: string;
  asOf: string;
  state: 'not-effective' | 'effective' | 'repealed' | 'proposed';
  applied: string[];
  history: HistoryEntry[];
}
export class AmendmentConflict extends Error {
  constructor(
    public operation: string,
    message: string,
  ) {
    super(`${operation}: ${message}`);
  }
}
const conflict = (op: Operation, message: string): never => {
  throw new AmendmentConflict(op.id, message);
};
interface Located {
  value: Block | Provision;
  list: Block[] | Provision[];
  index: number;
  owner?: Provision;
  scope?: string;
}
function locate(p: Project, id: string): Located | undefined {
  function visit(ns: Provision[]): Located | undefined {
    for (let index = 0; index < ns.length; index++) {
      const n = ns[index];
      if (n.id === id) return { value: n, list: ns, index };
      for (const scope of ['en', 'zh-Hant', 'shared'] as const) {
        const lists =
          scope === 'shared' ? [n.shared ?? []] : [n.content[scope] ?? [], n.tail[scope] ?? []];
        for (const list of lists) {
          const index = list.findIndex((b) => b.id === id);
          if (index >= 0) return { value: list[index], list, index, owner: n, scope };
        }
      }
      const child = visit(n.children);
      if (child) return child;
    }
  }
  return visit(p.provisions);
}
const isNode = (v: Block | Provision): v is Provision => 'kind' in v;
export function operationTarget(p: Project, target: string): Block | Provision {
  const found = locate(p, target);
  if (!found) throw new AmendmentConflict(target, 'Target does not exist.');
  return structuredClone(found.value);
}
export async function precondition(p: Project, target: string): Promise<string> {
  return digest(canonical(operationTarget(p, target)));
}
function assertIdentityContinuity(old: Provision, next: Provision, op: Operation): void {
  if (old.id !== next.id || old.label !== next.label || old.kind !== next.kind)
    conflict(op, 'Substitution must preserve the target identity, kind and manual label.');
  const previous = new Map(walk([old]).map((n) => [n.id, n]));
  for (const n of walk([next])) {
    const prev = previous.get(n.id);
    if (prev && (prev.label !== n.label || prev.kind !== n.kind))
      conflict(op, 'Published identities cannot be renumbered or retyped.');
  }
  // Published descendants may be omitted but retain addressable tombstones.
  const nextIds = new Set(walk([next]).map((n) => n.id));
  if (walk(old.children).some((n) => !nextIds.has(n.id)))
    conflict(
      op,
      'Substitution cannot remove existing descendant identities; omit them explicitly.',
    );
}
function spliceText(b: Block, op: Operation): void {
  if (b.type === 'table' || b.type === 'figure')
    conflict(op, 'Tables and figures require whole-block operations.');
  const str = plain(b),
    start = op.start,
    end = op.end;
  if (start === undefined || end === undefined || start > end || end > str.length)
    conflict(op, 'An exact valid UTF-16 range is required.');
  const boundaries = new Set([
    0,
    str.length,
    ...Array.from(
      new Intl.Segmenter('und', { granularity: 'grapheme' }).segment(str),
      (x) => x.index,
    ),
  ]);
  if (!boundaries.has(start!) || !boundaries.has(end!))
    conflict(op, 'Range splits a Unicode grapheme.');
  if (op.type === 'insert' && start !== end) conflict(op, 'Insertion range must be empty.');
  if (op.type !== 'insert' && start === end)
    conflict(op, 'Omission/substitution range must be nonempty.');
  if (op.type === 'omit' && op.text !== undefined)
    conflict(op, 'Omission cannot supply replacement text.');
  if (op.type !== 'omit' && op.text === undefined) conflict(op, 'Replacement text is required.');
  let offset = 0;
  const before: Block['inlines'] = [],
    after: Block['inlines'] = [];
  for (const i of b.inlines) {
    const a = offset,
      z = a + i.text.length;
    offset = z;
    const touched = (start! < z && end! > a) || (start === end && start! > a && start! < z);
    if (touched && (i.ref || i.term || i.href))
      conflict(op, 'Reference and defined-term spans are atomic; replace the whole prose block.');
    if (a < start!)
      before.push({ ...i, text: i.text.slice(0, Math.min(i.text.length, start! - a)) });
    if (z > end!) after.push({ ...i, text: i.text.slice(Math.max(0, end! - a)) });
  }
  b.inlines = [...before, ...(op.type === 'omit' ? [] : [{ text: op.text! }]), ...after].filter(
    (i) => i.text.length,
  );
}
async function applyOperation(
  p: Project,
  op: Operation,
): Promise<{ before: string; after: string }> {
  const found = locate(p, op.target);
  if (!found) conflict(op, 'Target does not exist.');
  const f = found!,
    v = f.value,
    before = canonical(v);
  if ((await digest(before)) !== op.expected)
    conflict(op, 'Expected target digest differs; review against the current wording.');
  if ((isNode(v) && v.repealed) || f.owner?.repealed)
    conflict(op, 'A repealed target cannot be edited or revived.');
  if (op.scope === 'structure') {
    if (!isNode(v)) conflict(op, 'Structural operations target numbered provisions.');
    const n = v as Provision;
    if (op.block || op.text !== undefined || op.start !== undefined || op.end !== undefined)
      conflict(op, 'Unexpected structural payload.');
    if (op.type === 'omit') {
      if (op.node || op.position) conflict(op, 'Omission cannot contain replacement structure.');
      for (const item of walk([n])) {
        item.repealed = true;
        item.content = {};
        item.tail = {};
        delete item.shared;
      }
    } else if (op.type === 'substitute') {
      if (!op.node || op.position) conflict(op, 'Substitution requires one replacement provision.');
      assertIdentityContinuity(n, op.node!, op);
      (f.list as Provision[])[f.index] = structuredClone(op.node!);
    } else {
      if (!op.node || !op.position) conflict(op, 'Insertion requires a provision and position.');
      const occupied = new Set([
        ...walk(p.provisions).map((n) => n.id),
        ...walk(p.provisions).flatMap((n) => blocks(n).map((b) => b.id)),
      ]);
      if (
        walk([op.node!]).some(
          (n) => occupied.has(n.id) || blocks(n).some((b) => occupied.has(b.id)),
        )
      )
        conflict(op, 'Inserted identities already exist.');
      const target = ['first', 'last'].includes(op.position!)
        ? n.children
        : (f.list as Provision[]);
      const index =
        op.position === 'first'
          ? 0
          : op.position === 'last'
            ? target.length
            : f.index + (op.position === 'after' ? 1 : 0);
      target.splice(index, 0, structuredClone(op.node!));
    }
  } else {
    if (op.node) conflict(op, 'Language/shared operations cannot contain structural payloads.');
    if (isNode(v)) {
      if (op.type !== 'insert' || !op.block || !['first', 'last'].includes(op.position ?? ''))
        conflict(op, 'A provision accepts whole-block insertion at first/last only.');
      const list = op.scope === 'shared' ? (v.shared ??= []) : (v.content[op.scope] ??= []);
      list.splice(op.position === 'first' ? 0 : list.length, 0, structuredClone(op.block!));
    } else {
      if (f.scope !== op.scope)
        conflict(op, 'Target belongs to a different language/shared scope.');
      if (op.start !== undefined || op.end !== undefined) {
        if (op.block || op.position) conflict(op, 'Text ranges cannot mix block payloads.');
        spliceText(v, op);
      } else if (op.type === 'omit') {
        if (op.block || op.text !== undefined || op.position)
          conflict(op, 'Unexpected omission payload.');
        f.list.splice(f.index, 1);
      } else if (op.type === 'substitute') {
        if (
          !op.block ||
          op.block.id !== v.id ||
          op.block.type !== v.type ||
          op.position ||
          op.text !== undefined
        )
          conflict(op, 'Whole-block substitution preserves identity and kind.');
        (f.list as Block[])[f.index] = structuredClone(op.block!);
      } else {
        if (!op.block || !['before', 'after'].includes(op.position ?? '') || op.text !== undefined)
          conflict(op, 'Whole-block insertion requires before/after.');
        (f.list as Block[]).splice(
          f.index + (op.position === 'after' ? 1 : 0),
          0,
          structuredClone(op.block!),
        );
      }
    }
  }
  assertValid(p, true);
  return { before, after: canonical(locate(p, op.target)?.value ?? null) };
}
/** Every caller-owned input is retained on failure, including history. */
async function applyAtDate(
  state: Revision,
  instrument: Project,
  date: string,
  proposed = false,
): Promise<Revision> {
  assertValid(instrument, !proposed);
  const a = instrument.amendment;
  if (instrument.role !== 'amendment' || !a)
    throw new AmendmentConflict(instrument.id, 'Not an amendment instrument.');
  if (a.targetDocument !== state.project.id || a.targetPublisher !== state.project.publisher)
    throw new AmendmentConflict(instrument.id, 'Different principal target.');
  if (a.expectedRevision !== state.revision)
    throw new AmendmentConflict(instrument.id, 'Expected intermediate revision differs.');
  if (state.state === 'repealed' || state.state === 'not-effective')
    throw new AmendmentConflict(instrument.id, 'Principal is not effective.');
  if (state.applied.includes(instrument.id))
    throw new AmendmentConflict(instrument.id, 'Instrument already applied.');
  if (a.after.some((id) => !state.applied.includes(id)))
    throw new AmendmentConflict(instrument.id, 'A predecessor is missing.');
  if (state.project.mode === 'bilingual' && instrument.mode !== 'bilingual')
    throw new AmendmentConflict(instrument.id, 'Bilingual targets require bilingual instruments.');
  for (const op of a.operations)
    for (const l of activeLanguages(instrument))
      if (!op.instructions[l]?.trim())
        conflict(op, 'Paired instructions must be complete even in a proposed revision.');
  const out = structuredClone(state);
  out.project = parseProject(canonical(state.project));
  for (const op of a.operations) {
    const oldTarget = operationTarget(out.project, op.target);
    const replaced = new Set(
      isNode(oldTarget)
        ? walk([oldTarget]).flatMap((n) => [n.id, ...blocks(n).map((b) => b.id)])
        : [oldTarget.id],
    );
    const change = await applyOperation(out.project, op);
    if ((op.type === 'substitute' || op.type === 'omit') && op.start === undefined)
      for (const h of out.history)
        if (replaced.has(h.target) && !h.supersededBy) h.supersededBy = instrument.id + ':' + op.id;
    out.history.push({
      instrument: instrument.id,
      revision: instrument.revision,
      operation: op.id,
      author: op.author,
      target: op.target,
      type: op.type,
      date,
      ...change,
    });
  }
  out.applied.push(instrument.id);
  out.revision = await digest(canonical({ previous: state.revision, instrument }));
  out.asOf = date;
  if (proposed) out.state = 'proposed';
  return out;
}
/** Replays adopted sources only; date is an explicit publisher-local calendar date. */
export async function revise(
  principal: Project,
  instruments: Project[],
  asOf: string,
  onRevision?: (state: Revision) => void,
): Promise<Revision> {
  assertValid(principal, true);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(asOf) || new Date(asOf).toISOString().slice(0, 10) !== asOf)
    throw new Error('Explicit valid as-of date required.');
  if (principal.role !== 'principal') throw new Error('Principal source required.');
  let state: Revision = {
    project: structuredClone(principal),
    revision: principal.revision,
    asOf,
    state: principal.adoption!.effective > asOf ? 'not-effective' : 'effective',
    applied: [],
    history: [],
  };
  const schedule = new Map<string, { p: Project; date: string; cancelled: boolean }>();
  for (const p of instruments) {
    if (p.stage !== 'adopted') continue;
    assertValid(p, true);
    if (p.timezone !== principal.timezone)
      throw new Error('Instrument and principal publisher timezones differ.');
    if (schedule.has(p.id)) throw new Error('Duplicate instrument identity.');
    schedule.set(p.id, { p, date: p.adoption!.effective, cancelled: false });
  }
  const remaining = new Set(schedule.keys());
  let previousDate = '',
    previousId = '';
  while (remaining.size) {
    const eligible = [...remaining]
      .map((id) => schedule.get(id)!)
      .filter((s) => !s.cancelled && s.date <= asOf)
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.p.id < b.p.id ? -1 : 1));
    if (!eligible.length) break;
    const date = eligible[0].date;
    const next = eligible
      .filter((s) => s.date === date)
      .find((s) => s.p.amendment!.after.every((id) => state.applied.includes(id)));
    if (!next) throw new Error('Missing, cancelled, later or cyclic predecessor.');
    const a = next.p.amendment!;
    if (date === previousDate && !a.after.includes(previousId))
      throw new Error('Same-date instruments require explicit predecessor ordering.');
    const schedules = new Map([...schedule].map(([id, s]) => [id, { ...s }]));
    let repeal = false;
    for (const event of a.events) {
      if (event.type === 'repeal-document') {
        if (
          event.target !== principal.id ||
          event.expectedDate !== principal.adoption!.effective ||
          event.date
        )
          throw new Error('Invalid document repeal precondition.');
        repeal = true;
      } else {
        const target = schedules.get(event.target);
        if (
          !target ||
          target.cancelled ||
          target.date !== event.expectedDate ||
          target.date <= date ||
          state.applied.includes(event.target)
        )
          throw new Error('Event requires a still-scheduled target and exact effective date.');
        if (event.type === 'cancel') {
          if (event.date) throw new Error('Cancellation has no replacement date.');
          target.cancelled = true;
        } else {
          if (
            !event.date ||
            !/^\d{4}-\d{2}-\d{2}$/.test(event.date) ||
            new Date(event.date).toISOString().slice(0, 10) !== event.date ||
            event.date <= date
          )
            throw new Error('Reschedule requires a valid future date.');
          target.date = event.date;
        }
      }
    }
    state = await applyAtDate(state, next.p, date);
    for (const e of a.events)
      state.history.push({
        instrument: next.p.id,
        revision: next.p.revision,
        operation: e.type + '-' + e.target,
        author: next.p.id,
        target: e.target,
        type: e.type,
        date,
        before: e.expectedDate,
        after: e.date ?? '',
      });
    for (const [id, s] of schedules) schedule.set(id, s);
    if (repeal) state.state = 'repealed';
    onRevision?.(structuredClone(state));
    remaining.delete(next.p.id);
    previousDate = date;
    previousId = next.p.id;
  }
  state.asOf = asOf;
  return state;
}

export async function applyInstrument(
  state: Revision,
  instrument: Project,
  date: string,
  proposed = false,
): Promise<Revision> {
  if (!proposed && (!instrument.adoption || instrument.adoption.effective > date))
    throw new AmendmentConflict(instrument.id, 'Instrument is not yet effective.');
  if (instrument.amendment?.events.length)
    throw new AmendmentConflict(
      instrument.id,
      'Document events require timeline replay with revise().',
    );
  return applyAtDate(state, instrument, date, proposed);
}
