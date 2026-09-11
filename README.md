# Style Guide Studio

A structured authoring and publishing system for church style guides, with legislative numbering, formal amendments, bilingual documents and static reference catalogues. Maintained under Lifehouse-HK; software licensed under [MIT](LICENSE).

## Implemented modules

- **Editor:** local desktop authoring; adopted/withdrawn sources open read-only. See [editor operation and current limits](docs/editor.md).
- **Domain:** portable `.sg.json` projects, explicit identities/manual numbering, bilingual/shared content, lifecycle records and diagnostics.
- **Engine:** original/as-of/proposed revisions, transactional insert/omit/substitute operations, scheduled events, tombstones, history, generated citation names and locked static catalogue resolution.
- **Formats:** safe project serialization and project-preserving Akoma Ntoso interchange; publication expressions validate against the vendored OASIS schema.
- **Presentation/runtime:** static HTML, free PDF generation, atomic files, immutable publication resources and source-identified Actions proof tooling.

Bilingual publication produces **three variants**: separate English and Traditional Chinese documents, plus a **landscape document aligning each provision side by side**. Shared tables span the two columns once and have identical content in the separate outputs.

The **desktop editor** now has a compact Office-style ribbon, a single structured writing canvas, an outline, optional bilingual alignment, shared tables, manual provision insertion, local/external reference selection, defined names, figures, guided amendment operations, project/AKN files, recovery and on-demand common-engine HTML preview. Run `npm run dev` or build the fully static app with `npm run build:editor`. Authoring and publication typography remain separate; current publication styling is provisional. The real document collection and deployed publication website remain a separate, deferred repository. This is not yet a release-ready product; remaining viewer, browser and integration acceptance gates are recorded in the plan.

## Development

Use Node 24.12.0 and Python 3.14:

```
npm ci
python3 -m venv .venv
.venv/bin/pip install -r requirements.lock
npm run check
npm test
npm run build
npm run qualify
```

The build emits independently consumable modules in `dist/modules`; no editor runtime is imported. PDF production uses Puppeteer’s pinned Chromium, an OFL Noto font, fontTools and pypdf. No paid renderer, font, editor extension or hosted backend is required. Chromium needs its normal system libraries and sandbox support on the runner.

For a synthetic local publication, run `npx tsx tools/create-demo.ts`, then `npm run publish:documents -- work/demo/build.json work/demo/output`. This generates files only; it does not deploy or upload drafts.

## Documentation

- [Architecture](docs/architecture.md) and [runtime/storage decision](docs/decisions/001-runtime-and-storage.md)
- [Implementation plan and acceptance evidence](IMPLEMENTATION_PLAN.md)
- [Document/AKN profile](docs/document-profile.md) and [engine contracts](docs/engine.md)
- [Publishing, proof and recovery operation](docs/publishing.md)
- [PDF qualification and viewer limitations](docs/pdf-qualification.md)
- [Third-party notices](THIRD_PARTY_NOTICES.md)
- [Repository guide](AGENTS.md)
