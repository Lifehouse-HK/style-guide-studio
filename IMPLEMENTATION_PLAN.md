# Implementation plan

Last updated: 2026-09-10.

This is the PLAN referenced by [AGENTS.md](AGENTS.md). Behavioural requirements live in [the architecture](docs/architecture.md); technology proposals live in [the technology discussion](docs/technology-decisions.md). A documented proposal is not an approved decision or an implemented feature.

## Current status

- Repository contains documentation and repository configuration only; no product implementation, build commands, automated product tests or CI pipelines exist.
- Architecture proposal was committed in `13646ef`. That commit predates the repository's conventional-commit rule; preserve its published history and follow the rule for new commits.
- Current phase: P0, design and technology discussion. No implementation phase is active.
- Completed repository action: R01, adopt the contributor workflow and ignore local clutter. Evidence: V01 below.
- Next action: D01, discuss and record technology decisions with the user. The earlier instruction to discuss technologies before application code remains in force.
- No publication/document-collection repository is being created in this scope.

Markers: `[ ]` not started; `[~]` active; `[x]` complete with evidence; `[!]` blocked by a referenced question. Only one primary phase may be active.

## Repository actions

| ID | Status | Action | Acceptance criteria | Evidence |
| --- | --- | --- | --- | --- |
| R01 | [x] | Track contributor instructions, add `.gitignore`, and synchronise README and PLAN | R01-AC1: user-provided instructions preserved; R01-AC2: local clutter/environment files ignored while sources/templates remain trackable; R01-AC3: current status, dependencies, questions and dated checks recorded | V01 |

## Delivery phases

These are dependencies and acceptance gates, not authorisation to bypass the technology discussion. Each phase will be delivered through focused actions/commits; additional action IDs may be added without renumbering existing IDs. Architecture section 18 items are referenced as ARCH-18.1 through ARCH-18.14.

| Phase | Status | Dependency | Action | Acceptance criteria |
| --- | --- | --- | --- | --- |
| P0: design and decisions | [~] | None | D01: resolve Q01–Q04 and record approvals; D02: verify the AKN and UK/HK nomenclature mappings | P0-AC1: technology/storage choices recorded as decisions, not assumptions; P0-AC2: every supported document feature and citation level has a verified mapping and identified fixtures |
| P1: domain and persistence | [ ] | P0 | M01: implement the portable model, validation, persistence and migrations | P1-AC1: ARCH-18.1–5 and 18.11 pass for the domain/format layer; P1-AC2: round trips preserve shared content, identities and Unicode; no editor-only save format |
| P2: references and amendments | [ ] | P1 | E01: implement catalogue resolution, interpretation names and transactional amendment/revision construction | P2-AC1: ARCH-18.5–10 pass at engine level; P2-AC2: conflicting, draft and future operations cannot silently affect effective text; whole-table and bilingual rules enforced |
| P3: presentation | [ ] | P2 | R02: implement web/print projections, PDF adapter and static catalogue output | P3-AC1: ARCH-18.10, 18.12–14 pass for rendered artifacts and headless use; P3-AC2: bilingual pagination and link destinations inspected in recorded viewers; unsupported behaviour documented |
| P4: static editor | [ ] | P3 | U01: implement structured authoring, save/recovery, external references, amendment review and common-engine previews | P4-AC1: relevant ARCH-18.1–14 pass through actual UI workflows; P4-AC2: Chinese IME, keyboard/screen-reader access and shared-table editing verified separately from model tests |
| P5: integrated readiness | [ ] | P4 | V02: verify the complete acceptance contract and document operation/release procedures | P5-AC1: ARCH-18.1–14 have dated evidence; P5-AC2: configured checks/CI pass, limitations and licence recorded; P5-AC3: release readiness is explicitly assessed, not inferred from unit tests |

## Open questions

| ID | Context and affected actions | Decision needed |
| --- | --- | --- |
| Q01 | Canonical AKN was proposed earlier; bilingual shared objects, operations and dependency locks need a complete project container. Affects D01/D02/M01. | AKN plus manifest/resources, or a neutral canonical project format with validated AKN interchange? |
| Q02 | Browser/headless reuse and structured editing were proposed, not approved. Affects D01 and implementation phases. | Confirm implementation language, editor foundation, UI framework and validating runtime. |
| Q03 | Final PDFs require bilingual pagination and cross-file destinations. Affects D01/R02. | Are commercial dependencies acceptable, and should PDF execution be local/headless or also available through a configured service? |
| Q04 | Public visibility does not grant a software licence. Affects D01/V02 and distribution readiness. | Select the software licence; publication-content rights remain separate. |

Nomenclature and schema verification in D02 are research obligations, not extra permission gates. Record ambiguities and bring only material policy choices to the user.

## Validation evidence

### V01 — repository workflow and ignore rules — 2026-09-10

- Source inspection: `git status --short`, `git log -5 --oneline`, `AGENTS.md`, README and architecture/technology documentation. User-created `AGENTS.md` retained unchanged; `.DS_Store` left on disk and ignored.
- Repository checks: `git check-ignore --no-index --stdin` checked representative ignored paths and separately confirmed that documentation, XML/JSON/PDF fixtures, lockfiles and environment templates remain trackable. Result: passed.
- Documentation checks: a one-off Python check resolved all relative Markdown file links in tracked/proposed documentation. Result: passed.
- Staged review: `git diff --cached --name-status` and `git diff --cached --check`. Result: intended paths only; no whitespace errors.
- Product automated tests, simulator/model tests, actual UI/device checks and CI: not applicable to this documentation/configuration change; none are configured. No product or release-readiness claim is made.
- Delivery: focused local commit. This action does not push or alter the previously published commit.

## Follow-ups

- Record decisions from the technology discussion before starting P1.
- Add actual build/test commands and CI requirements when tooling exists; do not invent commands for the documentation-only repository.
- Update this status, active/next action and evidence on each change of progress. Keep earlier evidence dated rather than presenting it as a fresh verification.
