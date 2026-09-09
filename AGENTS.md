# Repository guide

Applies to the entire repository, for human contributors and coding agents.
It dictates incremental delivery, documentation, status, and validation practices.

## 1. Sources of truth

Read the relevant sections before editing:

1. The current user request and established decisions for its scope.
2. [README.md](README.md) for implemented product behavior, architecture, and build commands.
3. [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) for progress, phase dependencies, acceptance criteria, and open questions. (to be added by the Agent upon request)
4. Relevant source and tests for actual behavior.
5. docs/*.md for additional documentation and guidelines.

## 2. Working method and commits

- Inspect `git status --short` and recent commits; preserve unrelated user edits.
- Select the smallest coherent action advancing the requested scope. Read its
  implementation and acceptance criteria, then identify affected tests/docs.
- Complete one behavior or repository improvement with its relevant validation
  before moving to another. Give independently reported issues separate commit
  boundaries; split substantial issues into usable, internally consistent steps.
- Create focused incremental commits for completed work unless the user requests
  an uncommitted draft or another workflow. Include related tests/docs in the
  same commit and review staged paths and `git diff --cached --check` first.
- Use `<type>(<scope>): <imperative description>`; suitable types are `feat`,
  `fix`, `refactor`, `perf`, `test`, `build`, `ci`, `docs`, and `chore`.
- Keep work on the current branch unless the task or existing workflow calls
  for another. Publish, push, or submit releases only within user authorization.

## 3. Plan and decision discipline

Use PLAN markers consistently: `[ ]` not started, `[~]` actively in progress,
`[x]` complete with evidence, `[!]` blocked with a question reference.

- Maintain at most one primary phase in progress. Partially implemented phases
  can remain inactive; working on a plan does not start feature implementation.
- Keep action/acceptance IDs stable. Mark completion when the behavior exists,
  applicable acceptance criteria pass, and documentation reflects the result.
- Distinguish source inspection, automated host tests, simulator-hosted model
  tests, actual UI/device checks, and release readiness. State validation dates
  and commands/results; a prior successful run is not a fresh verification.
- Avoid unnecessary checks/tests. Focus on meaningful validations that provide
  value and reduce redundant work.
- Rerun tests only when the underlying code or data affecting the test has changed.
- Update the current-status summary, active/next action, evidence, and date when
  work changes progress. Add follow-ups instead of silently hiding missing work.
- Record ambiguities with context, affected actions, and the decision needed.
  Continue independent authorized work. Batch blocking questions when a decision
  is required; routine implementation choices do not need a phase-by-phase
  permission cycle. Record approved resolutions before dependent implementation.
- Prior to pushing when asked by the user, verify locally that all checks and
  CI pipelines pass successfully.

## 4. Documentation, coding style, and artifacts

- Keep README, PLAN, repository instructions, and affected inline comments/API
  docstrings synchronized with behavior and workflow changes.
- Track PLAN and this guide.
  Essential current decisions must also exist in tracked documentation.
- Code with necessary docstrings / inline comments to explain non-obvious logic and decisions.

## 5. Completion handoff

Lead with the outcome, identify validation and its result, link principal changed
files, report commits, and state the current phase/next ready action. Summarize
remaining blockers together. Limit claims to what the evidence establishes.
