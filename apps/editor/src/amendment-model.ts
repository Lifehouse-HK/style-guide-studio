import {
  activeLanguages,
  canonical,
  newProject,
  parseProject,
  type Project,
  type Operation,
  type Provision,
} from '../../../packages/domain/src/index.ts';
import {
  applyInstrument,
  precondition,
  revise,
  type Revision,
} from '../../../packages/engine/src/amendments.ts';
import { uid } from './model.ts';
export function amendmentDraft(base: Project, titles: Project['titles']): Project {
  if (base.stage !== 'adopted' || base.role !== 'principal')
    throw new Error('Open an adopted principal source to create an amendment.');
  const p = newProject();
  Object.assign(p, {
    id: 'amendment-' + crypto.randomUUID(),
    publisher: base.publisher,
    titles,
    role: 'amendment',
    mode: base.mode,
    authority: base.authority,
    timezone: base.timezone,
    locks: structuredClone(base.locks),
    amendment: {
      targetDocument: base.id,
      targetPublisher: base.publisher,
      expectedRevision: base.revision,
      after: [],
      operations: [],
      events: [],
    },
  });
  return p;
}
export async function proposedState(
  base: Project,
  draft: Project,
  date: string,
): Promise<Revision> {
  const state = await revise(base, [], date);
  return applyInstrument(state, draft, date, true);
}
/** Preconditions are captured from the exact intermediate state after preceding draft operations. */
export async function appendOperation(
  base: Project,
  draft: Project,
  date: string,
  clauseLabel: string,
  input: Omit<Operation, 'id' | 'author' | 'expected'>,
): Promise<Project> {
  if (draft.stage !== 'draft' || !draft.amendment)
    throw new Error('An editable amendment draft is required.');
  const state = await proposedState(base, draft, date);
  const next = parseProject(canonical(draft));
  const author = uid();
  const clause: Provision = {
    id: author,
    kind: 'section',
    label: clauseLabel,
    heading: {},
    content: Object.fromEntries(activeLanguages(draft).map((l) => [l, []])),
    tail: {},
    children: [],
  };
  next.provisions.push(clause);
  next.amendment!.operations.push({
    ...input,
    id: uid(),
    author,
    expected: await precondition(state.project, input.target),
  });
  await proposedState(base, next, date);
  return next;
}
