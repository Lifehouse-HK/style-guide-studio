# Fresh implementation plan

Updated 2026-09-12. The user requested a restart from zero. The previous application, model, tests, rendering adapters and build configuration were removed. Git history preserves the old implementation. Only requirements, source research, repository governance and MIT licence remain; no old product code is reused. New files have no automatic compatibility with discarded formats.

- [x] N1: New structural domain, warning-only numbering diagnostics, draft movement and immutable enactment records. Tests cover body/Schedule distinction and heading eligibility.
- [x] N2: Action-driven amendments with generated bilingual operative clauses, paired payloads, exact preconditions and whole-document repeal. Tests cover grouped changes, Parts, stale actions, draft non-effect, effective dates and later amendments to revised principals.
- [x] N3: Separate pure HTML/reference engine, PDF adapter, separate English/Chinese and landscape parallel outputs, portable JSON and source-profile XML.
- [x] N4: Conventional tree/form editor with explicit Add/Move/Save/Discard, recovery, diagnostics and read-only proofs. Amendment action workspace and enacted revision workspace. No editable page canvas or ribbon.
- [x] N5: Bounded host, browser and export verification completed below; remaining qualification work is explicit and is not represented as release readiness.

R1–R4 are complete. All audit implementation work is pushed; the editor and separate publication site/API are deployed, including the final reference-retention fix. The corpus is intentionally empty until genuine enacted Guides are added. Detailed current evidence is in the audit completion programme at the end; earlier entries retain their historical checks.

## Fresh evidence — 2026-09-12

- `npm run check`: passed.
- `npm test`: 13 new tests passed, covering domain structure and numbering, immutable sources, action replay and revision chains, source fingerprints, JSON/XML round-trip, failed recovery writes, HTML structure and reference URL selection.
- `npm run build`: passed; static editor and separate JavaScript modules/declarations generated. Plain Node imported the built document/render modules and rendered HTML successfully.
- `npx tsx tools/check-editor.ts`, against the actual Vite browser UI: passed bilingual draft creation, Part 1A, section/subsection forms (no subsection heading), saved paired text, parallel proof, opening enacted JSON, and generated whole-Guide repeal. No browser page errors. Screenshots inspected locally. Move dialog was opened/cancelled; actual subtree movement is covered by domain tests, not this browser story.
- `npx tsx tools/check-exports.ts`: generated new synthetic bilingual principal and amendment XML specimens. Both passed `lxml.etree.XMLSchema.assertValid` against the official OASIS Akoma Ntoso 3.0 schema, downloaded for verification to ignored `work/`.
- `npm run pdf -- work/fresh-check/source.json work/fresh-check/pdf`: generated actual tagged PDFs. English and Chinese each 4 A4 portrait pages; parallel 6 A4 landscape pages. A shared table with 66 data rows survived pagination; text extraction found the final bilingual row in every output. Parallel table and Chinese first-page renders were visually inspected after the table-width correction. This is specimen QA, not exhaustive pagination/accessibility qualification.
- New code does not import discarded modules; no deployment or remote publication was performed.

## Qualification and deliberate boundaries

- Final document typography remains a user design decision. Typography is centralised; the UI remains sans-serif.
- Linux CI now installs free fonts and checks actual PDF destinations, table pagination, tagging and URLs. Specific third-party viewer/security behavior still needs target-environment qualification.
- Browser stories now include API resolution, definitions, supplemental amendments, visible formatting, Chinese composition events and keyboard navigation. Native OS IME candidate selection and screen-reader workflows still require human checks; no accessibility conformance claim is made.
- XML is an exact source-preserving projection with v1/v2 compatibility and structured formatting. Generic third-party Akoma Ntoso/CLML import remains excluded.
- The separate corpus now has an atomic static build and deployment. The team supplies actual enactment decisions and source documents; an enactment record is not a digital signature.
- Enacted relocation, renumbering, splitting/merging, amendment of amending instruments and free-form exceptional operative prose remain deliberately unsupported.

See [the current qualification policy](docs/qualification.md).

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
- [x] R2: Definition/alias and word/front-matter amendment lifecycle; nested definition content; supplemental amendment provisions (A7–A12).
- [x] R3: Amendment annotations, search/comparison, publication builder and separate corpus repository (A15–A16, A20).
- [x] R4: Linux/browser/PDF CI, format compatibility and bounded accessibility/IME checks; push and deploy (A17–A19).

Routine choices: use right-aligned latest amendment notes linking a full history, deterministic source-profile version compatibility, free serif font fallbacks on Linux, and a separate `church-publication-guides` corpus repository. Actual team enactments are not invented; an empty corpus can be deployed until genuine enacted documents are supplied.

- A2 complete: reference parsing spans rich-text runs, preserving formatting and literal-code examples. Type check and 3 focused rich-text tests passed (2026-09-12).

- A1/A4/A13 complete: shared reference and front-matter validation reaches enactment/API builds; missing/draft references are errors and repealed references warnings. Whole-document and definition destinations are available. A6/A14 also corrected: failed provision saves retain dirty state and saved aliases remain selectable offline. Fresh 31-test suite passed (2026-09-12).

- A3 complete: browser printing prepares a separate PDF-link expression and waits for its fonts/images before printing. Focused print URL test and type check passed (2026-09-12).

- A5 complete: XML projection v2 shares preamble opening rules with HTML/PDF; exact version-one XML remains reopenable without rewriting its source. Unknown projection versions fail explicitly. Type check and 6 focused render/print/XML tests passed (2026-09-12).

- A7–A12 implemented: individual definition and document-name lifecycle, structured definition branches/tables, word insertion/omission, front-matter amendments and standalone supplemental sections/Schedules. Type check and 5 focused extended-amendment tests passed; earlier full 37-test suite passed. Actual browser authoring of nested definition insertion, defined-name insertion and supplemental section passed; paired amendment XML validated against OASIS.

- A15/A20 implemented: latest per-provision notes link to complete amendment history and authorities; whole-document search and a dedicated before/after comparison are available. A16 engine/adapter implemented: complete static publication tree, all PDF variants, dated views, immutable API snapshots and atomic output. Six focused API/publication tests passed (2026-09-12); separate corpus repository and deployment follow.

- R3 complete locally: separate `church-publication-guides` repository source/configuration prepared with an empty corpus and a pinned-engine workflow. The real publication CLI built a local-only two-instrument fixture into 22 static files and 15 PDFs; the real empty corpus built four files and no invented enactments. Push/deployment are R4.
- R4 local evidence (2026-09-12): 40 tests, type check, production build and five browser stories passed. Additional Chromium Chinese composition/Tab smoke passed. Actual EN/ZH/parallel PDFs passed named-destination, PDF URL, tag, orientation and 70-row content checks (4/4/6 pages); parallel first-page layout visually inspected. Linux CI and live deployments remain pending.

- Release review found and fixed a reference-retention edge case: substituting/repealing a provision now preserves its definition and numbered-branch tombstones/destinations, including suppressed closing text. Removing a populated master through wholesale replacement requires explicit document-name operations first. Fresh 41 tests, type check and build passed.
- Initial Linux build/deploy [34690719723](https://github.com/Lifehouse-HK/style-guide-studio/actions/runs/34690719723) passed all browser/PDF steps. Its actual EN/Chinese/parallel PDF artifacts were downloaded; parallel first/table pages and Chinese first page were visually inspected. Corpus deployment [34690740971](https://github.com/Lifehouse-HK/church-publication-guides/actions/runs/34690740971) passed. Final reference-retention follow-up deployment remains pending.

- R4 complete (2026-09-12): final engine code `2b8ae33` passed Linux [run 34690881827](https://github.com/Lifehouse-HK/style-guide-studio/actions/runs/34690881827), including 41 tests, all five browser stories, actual PDF checks, build and Pages deployment. Corpus `c945503` pins that engine and passed [run 34690898573](https://github.com/Lifehouse-HK/church-publication-guides/actions/runs/34690898573). Both public sites return HTTP 200; the live editor reads the corpus API successfully. No synthetic church enactments were published. No implementation phase remains active; next ready action is authoring actual Guides and user evaluation of the documented human qualification items.
