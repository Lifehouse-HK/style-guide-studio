# Static publication API for amendment creation

Implemented 2026-09-12. The publication site remains static. Writers enter its API base URL; they do not download or assemble source files. The editor fetches one selected Guide’s source timeline and resolves the current revised text itself, using the same amendment engine as publication builds.

## Writer flow

1. Choose **Create amendment**, available even in a blank editor.
2. Enter **Publication API base URL**, then **Load Guides**.
3. Select the principal Guide and choose **Create amendment draft**.
4. Enter the amendment’s paired titles and add actions. The target tree already contains the changes effective today in Hong Kong.

A single-Guide API selects that Guide automatically. An API containing several Guides needs a selection to identify which one to amend. No local source picker is involved. The previously open workspace remains available through Undo.

The saved project embeds the exact resolved source, original Guide, fetched enacted instruments, reference catalogue and API provenance (base URL, resolution date, manifest fingerprint, source fingerprint). It can subsequently reopen offline. API updates do not silently retarget an existing amendment draft. A bare amendment without its source can reconnect only when the API’s current text matches its original source fingerprint; otherwise use its complete saved project or create a new amendment against current text.

## Endpoints

The base URL is an HTTP(S) directory without credentials, query parameters or a fragment. For example, `https://example.org/guides/` exposes:

- `publication.json`: discovery index of principal Guides, paired titles, original snapshot descriptors and all enacted amendment descriptors.
- `sources/<sha256>.json`: immutable individual document JSON, using the existing `lifehouse-guide/2` schema for a principal or amendment. SHA-256 is the application’s canonical JSON digest, not a hash of indentation/transport bytes.
- `references.json`: the existing `lifehouse-references/1` catalogue. The editor refreshes the selected Guide’s reference targets from its resolved source while preserving the catalogue’s published HTML/PDF URLs.

`publication.json` has format `lifehouse-publication/1`, with a `guides` array. Each entry has `id`, paired `titles`, `original: { path, digest }` and `amendments: [{ path, digest }, …]`. Snapshot paths must be `sources/` followed by the exact 64-character digest and `.json`. See `publicationSchema` in `modules/publication-api.ts` for the executable contract.

Publish the original enacted principal and every enacted amending instrument, including enacted instruments with future effective dates. Do not put drafts or pre-flattened revised Guides in the original slot. The editor resolves effects through today’s Hong Kong date. Future instruments are retained but have no present effect. Amendments with the same effective date follow manifest order and must match their exact predecessors. A missing predecessor, duplicate instrument, hash mismatch, unrelated amendment, future original or whole-Guide repeal stops creation; the editor does not fall back to the original text.

The manifest is fetched again at creation time. Snapshot fingerprints prevent mixing file versions during an update; they are not digital signatures and cannot prove a publisher omitted no instruments. Completeness and authenticity depend on the trusted publication site. Serve cross-origin responses permitting the editor’s origin (or `*` for these public, credential-free resources). Requests omit credentials, bypass cache and time out after 15 seconds. Failures leave the current workspace untouched.

## Build for the future repository

```sh
npm run api -- output/api https://example.org/guides/ \
  documents/original.lhg.json \
  documents/amendment-2027.lhg.json \
  documents/amendment-2028.lhg.json
```

Inputs are saved projects or document JSON files. The command extracts their document records, checks the full enacted chain (including future effects), and emits the static endpoints. Supply instruments in their required order for equal effective dates. The command performs no network upload. It writes the discovery manifest last; deploy the generated directory atomically with the rest of the site. Rebuild published pages and reference catalogues when scheduled effects become current; the editor’s local replay already handles that date transition.

This builder is ready for a future GitHub Actions job. The document/site repository, deployed API URL and website generator remain separate work; no public endpoint has been deployed as part of this change.
