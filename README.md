# Style Guide Studio

A structured authoring and publishing system for church style guides, with legislative numbering, formal amendments, bilingual documents and static reference catalogues.

Maintained under Lifehouse-HK. This repository currently contains **design documents only**. No application code, framework, package manager or PDF renderer has been selected.

- [Architecture](docs/architecture.md): tool-neutral system definition and behavioural contracts.
- [Technology discussion](docs/technology-decisions.md): choices to settle before implementation.
- [Implementation plan](IMPLEMENTATION_PLAN.md): current progress, phase dependencies, acceptance criteria, open questions and validation evidence.
- [Repository guide](AGENTS.md): contributor workflow and commit requirements.

## Current status and contributing

As of 2026-09-11, the user has approved the architecture. Every required component and the complete product must be usable free of charge; technology discussion remains the active phase. Application implementation is paused until that discussion is resolved. See the implementation plan for the next action and outstanding decisions.

Read `AGENTS.md` and the relevant plan entries before editing. Make focused commits using `<type>(<scope>): <imperative description>` and record applicable validation. There are no application build/test commands or CI pipelines yet. For documentation/configuration changes, inspect affected local links, verify ignore rules when changed, and run `git diff --cached --check` before committing.

The `.gitignore` excludes operating-system metadata, local environment values, editor recovery files and root scratch/cache directories. Environment templates remain trackable. Tool-specific build/dependency rules will be added after the toolchain is selected; publication formats and fixtures are not globally ignored.

The editor and publishing engine will be separate modules in this repository. The actual draft/adopted document collection, certification records and generated publication website belong in a **separate future repository**, not created by this project setup.

Public availability does not itself grant an open-source licence. The repository licence remains to be selected by its owner.
