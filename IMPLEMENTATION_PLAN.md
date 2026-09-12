# Fresh implementation plan

Updated 2026-09-12. The user requested a restart from zero. The previous application, model, tests, rendering adapters and build configuration were removed. Git history preserves the old implementation. Only requirements, source research, repository governance and MIT licence remain; no old product code is reused. New files have no automatic compatibility with discarded formats.

- [x] N1: New structural domain, warning-only numbering diagnostics, draft movement and immutable enactment records. Tests cover body/Schedule distinction and heading eligibility.
- [x] N2: Action-driven amendments with generated bilingual operative clauses, paired payloads, exact preconditions and whole-document repeal. Tests cover grouped changes, Parts, stale actions, draft non-effect, effective dates and later amendments to revised principals.
- [x] N3: Separate pure HTML/reference engine, PDF adapter, separate English/Chinese and landscape parallel outputs, portable JSON and source-profile XML.
- [x] N4: Conventional tree/form editor with explicit Add/Move/Save/Discard, recovery, diagnostics and read-only proofs. Amendment action workspace and enacted revision workspace. No editable page canvas or ribbon.
- [x] N5: Bounded host, browser and export verification completed below; remaining qualification work is explicit and is not represented as release readiness.

No implementation phase is active. Local definition-list work and the requested feature audit are complete. The previously deployed editor is live on GitHub Pages. Next ready action is user evaluation of the replacement editor, followed by the qualification items below. The corpus repository and publication/API deployment remain outside this implementation; the editor is deployed separately under D1.

## Fresh evidence — 2026-09-12

- `npm run check`: passed.
- `npm test`: 13 new tests passed, covering domain structure and numbering, immutable sources, action replay and revision chains, source fingerprints, JSON/XML round-trip, failed recovery writes, HTML structure and reference URL selection.
- `npm run build`: passed; static editor and separate JavaScript modules/declarations generated. Plain Node imported the built document/render modules and rendered HTML successfully.
- `npx tsx tools/check-editor.ts`, against the actual Vite browser UI: passed bilingual draft creation, Part 1A, section/subsection forms (no subsection heading), saved paired text, parallel proof, opening enacted JSON, and generated whole-Guide repeal. No browser page errors. Screenshots inspected locally. Move dialog was opened/cancelled; actual subtree movement is covered by domain tests, not this browser story.
- `npx tsx tools/check-exports.ts`: generated new synthetic bilingual principal and amendment XML specimens. Both passed `lxml.etree.XMLSchema.assertValid` against the official OASIS Akoma Ntoso 3.0 schema, downloaded for verification to ignored `work/`.
- `npm run pdf -- work/fresh-check/source.json work/fresh-check/pdf`: generated actual tagged PDFs. English and Chinese each 4 A4 portrait pages; parallel 6 A4 landscape pages. A shared table with 66 data rows survived pagination; text extraction found the final bilingual row in every output. Parallel table and Chinese first-page renders were visually inspected after the table-width correction. This is specimen QA, not exhaustive pagination/accessibility qualification.
- New code does not import discarded modules; no deployment or remote publication was performed.

## Qualification and deliberate boundaries

- Final document typography and visible amendment-history presentation await user design decisions. Font CSS is centralised; Times New Roman is requested only in document output.
- Qualify Linux/CI Chromium dependencies, open-source Chinese font installation and consistent page metrics before unattended publication. Paid/proprietary fonts are not bundled.
- Qualify internal and cross-file PDF destination behavior across target viewers; HTML/reference URL tests do not establish viewer support. Tagged output is not an accessibility conformance claim.
- Broaden actual UI stories for complex table editing, cross-parent movement, multiple loaded revision instruments and real cross-origin catalogue hosting. Current coverage combines limited browser stories with domain tests.
- XML import is exact source-profile round-trip only. Inline formatting markers remain literal in the legal XML projection; generic Akoma Ntoso semantic interchange is not claimed.
- Publication authority/certification, repository review, website build/deploy and catalogue aggregation belong to the deferred corpus tooling. An enactment record is not a digital signature.
- No free-form exceptional amendment instructions, relocation, renumbering, splitting/merging of enacted identities or amendment of amending instruments. These require deliberate domain design rather than editable generated prose.

## Editor feedback — 2026-09-12

- [x] F1: Fix viewport scrolling, text excerpts, breadcrumb/checks navigation and language-appropriate proof controls; add underline, alignment, dash insertion and optional Schedule headings.
- Domain/render tests added for optional Schedule headings and aligned/underlined unheaded provisions. Fresh suite: 15 passed.
- Fresh type check, build and all 15 tests passed. Existing browser workflow passed. `tools/check-editor-feedback.ts` passed viewport-height checks at 1280×800 and 1280×650, child preview, clickable breadcrumbs/checks, formatting controls and bilingual/monolingual proof controls. Proof screenshot inspected. No PDF pagination changes; alignment is verified through the shared HTML/PDF renderer.
- Follow-up: proof frames are recreated when generated HTML changes, avoiding a stale rendered language after changing view. The browser check now waits for the iframe’s actual parallel body, not only its `srcdoc` attribute; passed and the two-column proof screenshot was inspected.

## Paragraph alignment correction — 2026-09-12

- [x] F2: Scope alignment to the cursor paragraph or selected paragraphs rather than the whole text block. Source and renderer preserve per-language paragraph alignment; text editing and amendment substitutions remap formatting around inserted/deleted newlines. Existing block-wide settings remain a fallback for saved documents.
- Fresh 17-test suite passed, including selection boundaries, other-language isolation and split/merge inheritance. Type check/build passed. Browser feedback story checks selecting within the middle of three paragraphs and confirms rendered left/centre/left alignment.

## Visible paragraph alignment — 2026-09-12

- [x] F3: Replace the plain textarea with a restricted paragraph-aware text box. Selected paragraph alignment is visible immediately, with stable source offsets, plain-text paste and field-local Undo/Redo. The fixed form workflow is unchanged.
- Fresh type check, 17 tests and production build passed. Browser stories cover bilingual typing, visible left/centre/left paragraph styles, Enter/Undo, and matching proof output; the aligned input screenshot was inspected. The larger browser bundle now triggers Vite’s advisory size warning (about 213 kB gzip); no build failure. Actual OS-level Chinese IME qualification is not claimed by scripted typing checks.

## Visible inline formatting and HTML source — 2026-09-12

- [x] F4: Bold/italic/underline/literal buttons and keyboard shortcuts apply visible marks. Newly edited block languages use restricted HTML, with escaped literal characters and no Markdown interpretation. Legacy sources retain their existing semantics until edited; enactment snapshots are not rewritten.
- Source validation rejects unsupported HTML; renderer/editor decode entities once; text-replacement amendments match visible text and preserve formatting. The XML projection uses native b/i/u and span elements.
- Fresh 19-test suite, type check and build passed. Browser verification confirms visible nested bold/italic, literal asterisks/angle brackets/ampersands, escaped HTML in saved recovery data, paragraph alignment and matching proof. Principal/amendment specimens with rich text passed the OASIS XML schema.

## Publication logo — 2026-09-12

- [x] F5: Track the supplied original stacked PNG and embed it above the titles in proofs, portable HTML and PDF output. One logo serves both language columns; no repeated page header. The pure renderer takes an injected image, while the editor/CLI load the repository asset.
- Byte-for-byte comparison with the supplied PNG passed. Type check/build and 19 tests passed. Browser proof loaded the embedded PNG successfully. Actual English and parallel PDF first pages were rendered and visually inspected; `pdfimages -list` confirms the logo and its transparency mask occur on page 1 only. No Dropbox dependency remains in generated files.

## API-based amendment creation — 2026-09-12

- [x] F6: Replace local-file prerequisite with an API URL workflow. Discover Guides, fetch the selected Guide’s enacted timeline, resolve current text automatically, and pin the exact source/provenance in the draft. Add the static API contract/builder for the future publication repository.
- Fresh type check, production build and all 23 tests passed. API tests cover same-year sequencing, future dates, whole repeal, unavailable endpoints, missing predecessors and source hash mismatch.
- Actual cross-origin browser flow passed using a local static JSON fixture server: no file upload, two earlier amendments already present in the proposed proof, a future amendment excluded, source/provenance saved, offline replay possible, and a failed API fetch leaves the prior project intact. The rendered revised proof was inspected. The existing authoring/action browser workflow also passed with API creation replacing file loading.
- `npm run api -- work/api-cli http://127.0.0.1:9999/ work/fresh-check/source.json` produced the expected static index, source and reference files. The URL is a synthetic build target, not a deployed service. The future corpus repository still needs to publish these endpoints with CORS; no live API deployment is claimed.

## GitHub Pages — 2026-09-12

- [x] D1: Push the completed application and deploy the static editor to GitHub Pages. Add an Actions workflow with clean installation, checks/tests, project-path build and dist-only deployment. Publication/corpus API hosting is not included.
- Deployed editor: https://lifehouse-hk.github.io/style-guide-studio/ . All application commits through `21dc3c5` pushed to `main`. GitHub Actions run [34667731420](https://github.com/Lifehouse-HK/style-guide-studio/actions/runs/34667731420) passed both build and deploy (Ubuntu, Node 24, clean npm install, type check, 23 tests, project-path production build).
- Live browser verification passed: HTTP 200, JavaScript/CSS asset paths, fixed viewport, API amendment URL dialog and embedded proof logo, with no page/request errors. HTTPS is enforced. The Actions runner emitted upstream action-runtime deprecation advisories; deployment succeeded.
- Next ready action: use the deployed editor; publish the separate corpus/API later. This deployment does not transfer browser recovery data from localhost.

## Preamble opening and small caps — 2026-09-12

- [x] F7: Automatically introduce paragraph and numbered preambles with WHEREAS / 鑑於 in the shared proof/HTML/PDF renderer. English WHEREAS and BE IT ENACTED use small caps. Already-entered preamble openings are not duplicated; source text and the customisable formula remain unchanged. The editor explains that openings are generated.
- Fresh type check, all 24 tests and production build passed. Chromium verified both preamble formats and computed small-cap styling; the parallel numbered proof was visually inspected. No PDF file was generated for this change; the PDF adapter consumes the same HTML/CSS.
- Completed locally; this fix has not been pushed or deployed. No active implementation phase.

## Local and master definitions — 2026-09-12

- [x] F8: Add unnumbered definition blocks to provision forms and all output formats. Preserve local lists independently of References; permit one master merging defined document names. Add paired ordering overrides for terms and aliases, deterministic article-sensitive lexical sorting, saved formal-title snapshots and validation. The resolver no longer duplicates “the” in English short-name links.
- Fresh type check, all 28 tests and production build passed. Regression coverage includes sorting/overrides, master uniqueness, duplicate and missing definitions, safe rich text, JSON/XML round trip, bilingual rendering and whole-provision amendment replay.
- `npx tsx tools/check-definitions.ts` passed the actual local browser workflow: create a reference alias, add a master and four terms, verify sort/override, retain an independent subsection list, disallow a second master, save/reopenable source and parallel proof. No browser page errors.
- English and Chinese XML specimens passed `xmllint --schema` against the official OASIS schema. All three PDFs were generated through the application adapter; English/Chinese first pages and both parallel pages were visually inspected. Indented wrapping and bilingual row alignment passed. This remains local macOS verification, not Linux or remote-PDF-destination qualification.
- This feature and the earlier preamble fix remain local, not pushed/deployed.

## Post-definition feature audit — 2026-09-12

- [x] A0: Audit the remaining agreed capabilities after F8. Findings and acceptance criteria are recorded in [the feature audit](docs/feature-audit-2026-09-12.md), with source-inspection findings distinguished from host reproductions and qualification gaps.
- Host probes confirmed missing external-reference enactment validation, rich-format reference-token breakage, empty amendment formula acceptance and divergent generated XML preamble openings. Browser Print uses HTML-link destinations by source inspection. These defects are recorded, not fixed as part of the requested audit.
- Next recommended work: reference/enactment/PDF-print correctness (A1–A4), followed by definition and principal-alias amendment operations (A7–A8). No implementation phase is active; no push/deployment performed.

## Audit completion programme — 2026-09-12

User authorised implementation of all audit follow-ups and push. Preserve deliberate exclusions (enacted relocation/renumbering/splitting/merging, generic XML import and removed structures).

- [x] R1: Reference integrity, PDF print destinations, front-matter validation/projection and failed-save recovery (A1–A6, A13–A14).
- [~] R2: Definition/alias and word/front-matter amendment lifecycle; nested definition content; supplemental amendment provisions (A7–A12).
- [ ] R3: Amendment annotations, search/comparison, publication builder and separate corpus repository (A15–A16, A20).
- [ ] R4: Linux/browser/PDF CI, format compatibility and bounded accessibility/IME checks; push and deploy (A17–A19).

Routine choices: use right-aligned latest amendment notes linking a full history, deterministic source-profile version compatibility, free serif font fallbacks on Linux, and a separate `church-publication-guides` corpus repository. Actual team enactments are not invented; an empty corpus can be deployed until genuine enacted documents are supplied.

- A2 complete: reference parsing spans rich-text runs, preserving formatting and literal-code examples. Type check and 3 focused rich-text tests passed (2026-09-12).

- A1/A4/A13 complete: shared reference and front-matter validation reaches enactment/API builds; missing/draft references are errors and repealed references warnings. Whole-document and definition destinations are available. A6/A14 also corrected: failed provision saves retain dirty state and saved aliases remain selectable offline. Fresh 31-test suite passed (2026-09-12).

- A3 complete: browser printing prepares a separate PDF-link expression and waits for its fonts/images before printing. Focused print URL test and type check passed (2026-09-12).

- A5 complete: XML projection v2 shares preamble opening rules with HTML/PDF; exact version-one XML remains reopenable without rewriting its source. Unknown projection versions fail explicitly. Type check and 6 focused render/print/XML tests passed (2026-09-12).
