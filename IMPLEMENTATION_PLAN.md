# Fresh implementation plan

Updated 2026-09-12. The user requested a restart from zero. The previous application, model, tests, rendering adapters and build configuration were removed. Git history preserves the old implementation. Only requirements, source research, repository governance and MIT licence remain; no old product code is reused. New files have no automatic compatibility with discarded formats.

- [x] N1: New structural domain, warning-only numbering diagnostics, draft movement and immutable enactment records. Tests cover body/Schedule distinction and heading eligibility.
- [x] N2: Action-driven amendments with generated bilingual operative clauses, paired payloads, exact preconditions and whole-document repeal. Tests cover grouped changes, Parts, stale actions, draft non-effect, effective dates and later amendments to revised principals.
- [x] N3: Separate pure HTML/reference engine, PDF adapter, separate English/Chinese and landscape parallel outputs, portable JSON and source-profile XML.
- [x] N4: Conventional tree/form editor with explicit Add/Move/Save/Discard, recovery, diagnostics and read-only proofs. Amendment action workspace and enacted revision workspace. No editable page canvas or ribbon.
- [x] N5: Bounded host, browser and export verification completed below; remaining qualification work is explicit and is not represented as release readiness.

No implementation phase is active. Next ready action is user evaluation of the replacement editor, followed by the qualification items below. The corpus repository and deployment remain outside this implementation.

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
