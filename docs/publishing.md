# Headless publication and proof operation

This repository supplies tools, not the future church document collection or deployed site. The editor UI has deliberately not been built pending design discussion.

## Local setup and commands

Use Node 24.12.0, npm and Python 3.14. Run:

```
npm ci
python3 -m venv .venv
.venv/bin/pip install -r requirements.lock
npm run check
npm test
npm run build
npm run qualify
```

`npm ci` installs Puppeteer’s pinned Chromium renderer. It requires a supported OS with Chromium system libraries and a working browser sandbox. It is an isolated headless print process, not an authoring app or an always-on service. Python provides source-specific font subsetting, XML validation and PDF destination finishing/inspection. Font and library licences allow free use. The built domain/engine/format/presentation modules are independent of editor code; package exports point to `dist/modules`.

Create a synthetic example with `npx tsx tools/create-demo.ts`, then run `npm run publish:documents -- work/demo/build.json work/demo/output`. This writes local artifacts only. Use `npx tsx tools/benchmark.ts` for the representative headless budget check.

## Build input

The strict build configuration is `sg-build/1` with:

- `baseUrl`: final static publication root, used for hosted cross-file links.
- `asOf`: explicit publisher-local calendar date, never inferred from the machine clock.
- `mode`: `certified` or `proof`.
- `files`: project paths within the configuration directory.
- `approvals`: exact publisher/document/revision/canonical SHA-256 records for certified input.

An approval digest is a consistency check, not a signature or proof of church adoption. The future corpus repository must protect the review/adoption records and workflow through its governance policy. Self-editing JSON does not constitute certification. Proof mode does not require approval records, adds an explicit proof notice and grants no deployment permissions.

Only adopted instruments enter effective text. Replay retains intermediate revision identities, including ordered amendments on the same day. Dependencies are locked: publication never fetches live external catalogues. Missing indexes, mismatched target digests, unsupported content and incomplete adoption records fail the build.

## Output and retention

Every bilingual version generates `en.html`/`en.pdf`, `zh-Hant.html`/`zh-Hant.pdf`, and `parallel.html`/`parallel.pdf`. The first two PDFs are portrait. Parallel PDF is A4 landscape, with corresponding provision starts aligned in English-left/Chinese-right columns. Shared tables span the width once and have identical source content in all outputs. Monolingual content has its one language output, with both formal titles retained.

Each immutable release contains source projects, explicit revision snapshots, language AKN exports, print HTML, PDFs, destination maps, per-document indexes and per-provision content resources. Revised AKN carries a derived-expression marker and is read-only on import; it cannot masquerade as a new adopted source. Separate source exports remain project-preserving.

`catalogue.json` is the static discovery entry point. It includes paired titles and digest-pinned index URLs; target content loads separately, without loading the entire corpus. A deployment must serve catalogue/index/content resources with appropriate CORS headers for the editor’s origin. Public resources can use `Access-Control-Allow-Origin: *` without credentials. UI CORS behaviour remains to be verified in the later editor phase.

The publisher builds in a temporary release directory, completes outputs, moves the immutable release into place, then replaces `catalogue.json` atomically. Existing releases are retained. An exclusive build lock prevents simultaneous local publications; an older as-of build cannot replace a newer catalogue. A process crash may leave `.publish.lock`; verify no build is running before removing that lock. Failed builds leave the previous catalogue intact; scratch directories can be removed after inspection.

The release identity covers canonical sources/configuration and relevant source/toolchain files. PDF timestamps may differ on regeneration; byte-identical PDFs are not claimed. Never overwrite an existing release with different artifacts. Retain historical resources permanently if links have been published.

## Actions and future deployment contract

`check.yml` runs host tests, builds synthetic documents and retains test PDFs for one day. `proof.yml` runs only after an explicit dispatch selecting a tracked configuration at a submitted Git revision. Its artifact name and `submission.json` identify that revision. It has read-only repository permissions and no deployment secrets. Nothing uploads local drafts automatically.

These workflows are committed tooling contracts, not evidence that a remote runner has passed. The future corpus workflow must consume a pinned tool release, install standard Chromium dependencies/sandbox support, review approved sources, build with an explicit date, verify artifacts, and only then deploy a complete static release. Use deployment concurrency to serialize production-pointer changes; cancelled or failed jobs must not update the published catalogue. Publish immutable resources before the current pointer.

Scheduled jobs are best-effort: a visible as-of date, manual dispatch and operational monitoring are needed for delayed runs. Rollback restores a retained catalogue and its complete referenced resources through a reviewed deployment; it does not delete historical URLs or pretend that the as-of date is current. Optional offline cross-PDF bundles and combined-handbook navigation remain separate acceptance work; hosted links currently target the PDF with a named-destination hint.
