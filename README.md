# Style Guide Studio

A structured authoring and publishing system for church style guides, with legislative numbering, formal amendments, bilingual documents and static reference catalogues.

Maintained under Lifehouse-HK; software licensed under [MIT](LICENSE).

- [Architecture](docs/architecture.md): approved behavioural contracts.
- [Implementation plan](IMPLEMENTATION_PLAN.md): acceptance gates and dated evidence.
- [Runtime and storage decision](docs/decisions/001-runtime-and-storage.md): module boundaries and free toolchain.
- [Repository guide](AGENTS.md): contributor workflow.

## Current status

Implementation is underway. The first portable TypeScript domain module provides explicit provision identities and labels, bilingual/shared content, lifecycle records, structured amendment values and diagnostics. This is foundation work, not a completed editor or publishing product.

The user has asked to pause **before building the editor UI**, to discuss its design. Domain, engine and headless publishing work may continue. The actual document collection and publication website remain a separate, deferred repository.

## Development

Use Node 24 and npm: `npm ci`, then `npm run check`. Create `.venv` with Python 3.14 and run `.venv/bin/pip install -r requirements.lock` before `npm test`, which includes AKN schema checks. Dependencies are pinned in `package-lock.json`. Python PDF qualification dependencies are pinned in `requirements.lock`; install them into an isolated Python environment. Renderer setup and qualification evidence will be added with the adapter.

The canonical `.sg.json` project belongs to the domain, not the editor. AKN language expressions are interchange outputs. The editor and rendering engine are separate modules in this repository. No paid service, font, renderer or editor extension is required.

Portable persistence supports project save/open and project-preserving AKN exports/imports in both languages. See [the profile](docs/document-profile.md) for supported vocabulary and explicit foreign-import limitations.
