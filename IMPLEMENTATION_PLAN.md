# Implementation plan

Last updated: 2026-09-11.

This is the PLAN referenced by [AGENTS.md](AGENTS.md). Behavioural requirements live in [the architecture](docs/architecture.md); technology proposals live in [the technology discussion](docs/technology-decisions.md). A documented proposal is not an approved decision or an implemented feature.

## Current status

- The user approved UI implementation after selecting a compact desktop Office-style ribbon with one writing canvas and preview on demand. MIT remains selected; the real corpus repository is deferred.
- Portable domain, safe project/AKN formats, amendment/reference engines, static presentation, atomic headless publication and Actions proof/check definitions now exist. These are separately consumable modules; implementation does not imply every acceptance gate has passed.
- Current primary phase: **P4, static desktop editor implementation**. P3 qualification remains incomplete and inactive. P0–P2 have implemented portions with outstanding cross-cutting qualification; they are not marked fully complete.
- Selected PDF path: free Chromium/Puppeteer, fontTools and pypdf after WeasyPrint failed long parallel tests. Each bilingual source produces separate portrait English/Chinese documents and one provision-aligned landscape document with shared tables spanning both columns once.
- Host tests, module compilation, synthetic headless publication and sampled PDF qualification have passed. Full viewer/CORS/CI checks and the complete fixture matrix remain open; see V09 and the explicit follow-ups below.
- Active action: U01, desktop structured authoring and browser verification. Remaining P3 checks still gate release; they do not prevent the authorised UI work.

Markers: `[ ]` not started; `[~]` active; `[x]` complete with evidence; `[!]` blocked by a referenced question. Only one primary phase may be active.

## Repository actions

| ID | Status | Action | Acceptance criteria | Evidence |
| --- | --- | --- | --- | --- |
| R01 | [x] | Track contributor instructions, add `.gitignore`, and synchronise README and PLAN | R01-AC1: user-provided instructions preserved; R01-AC2: local clutter/environment files ignored while sources/templates remain trackable; R01-AC3: current status, dependencies, questions and dated checks recorded | V01 |
| D00 | [x] | Define the complete implementation sequence without writing product code | D00-AC1: architecture acceptance items mapped to actions; D00-AC2: dependencies, decision gates, verification and deferred repository boundary explicit | V05 |

## Delivery phases

These are dependencies and acceptance gates. The user has now authorised implementation through the headless tooling, including the desktop UI after the ribbon design discussion. Each phase will be delivered through focused actions/commits; additional action IDs may be added without renumbering existing IDs. Architecture section 18 items are referenced as ARCH-18.1 through ARCH-18.14.

| Phase | Status | Dependency | Action | Acceptance criteria |
| --- | --- | --- | --- | --- |
| P0: design and decisions | [ ] | None | D01: resolve implementation choices Q01–Q03 and record approvals; D02: verify the AKN and UK/HK nomenclature mappings; D03: qualify the free PDF path | P0-AC1: technology/storage choices recorded as decisions, not assumptions; P0-AC2: every supported document feature and citation level has a verified mapping and identified fixtures; Q04 gates distribution in P5, not independent design work |
| P1: domain and persistence | [ ] | P0 | M01: implement the portable model, validation, persistence and migrations | P1-AC1: ARCH-18.1–5 and 18.11 pass for the domain/format layer; P1-AC2: round trips preserve shared content, identities and Unicode; no editor-only save format |
| P2: references and amendments | [ ] | P1 | E01: implement catalogue resolution, interpretation names and transactional amendment/revision construction | P2-AC1: ARCH-18.5–10 pass at engine level; P2-AC2: conflicting, draft and future operations cannot silently affect effective text; whole-table and bilingual rules enforced |
| P3: presentation | [ ] | P2 | R02: implement web/print projections, PDF adapter and static catalogue output | P3-AC1: ARCH-18.10, 18.12–14 pass for rendered artifacts and headless use; P3-AC2: bilingual pagination and link destinations inspected in recorded viewers; unsupported behaviour documented |
| P4: static editor | [~] | P3 | U01: implement structured authoring, save/recovery, external references, amendment review and common-engine previews | P4-AC1: relevant ARCH-18.1–14 pass through actual UI workflows; P4-AC2: Chinese IME, keyboard/screen-reader access and shared-table editing verified separately from model tests |
| P5: integrated readiness | [ ] | P4 | V02: verify the complete acceptance contract and document operation/release procedures | P5-AC1: ARCH-18.1–14 have dated evidence; P5-AC2: configured checks/CI pass, limitations and licence recorded; P5-AC3: release readiness is explicitly assessed, not inferred from unit tests |

## Implementation rules and boundaries

The implementation path is recorded in ADR 001 under the user’s delegation. Qualification precedes reliance on candidate capabilities. The earlier UI stop was lifted on 2026-09-11 after the ribbon design discussion.

Each parent action already listed above (M01, E01, R02, U01 and V02) is expanded into stable child IDs below. A parent is complete only when all its children and phase acceptance criteria pass. Each child is a focused delivery unit, potentially several coherent commits where warranted. Child acceptance identifiers use `<action>-AC1`, etc. Do not treat writing this plan, creating a fixture, or passing a model test as completing an editor workflow.

Original sequencing required D01–D04 before P1. Execution adjustment: portable scaffolding and dependent headless modules were implemented to exercise these qualification contracts; unverified platform/fixture criteria remain gates on acceptance and release, not claims of completion. The requested design discussion has taken place; compact desktop ribbon implementation is authorised. D01 records approval of the implementation path before any executable qualification work in D03/D04. The licence decision is required before distributable software release; no licence is inferred. Actual adopter identities, approval text and language-authority choices are document/profile inputs, not reasons to block software design.

The document-collection repository remains deferred. This repository will provide a headless publication tool, synthetic integration fixtures and reusable Actions workflow contracts. It will not create the real corpus, upload church drafts, configure a production domain or deploy the publication website. A proof workflow and a deployment contract are different from operating that future repository.

## Detailed action backlog

### P0 — settle contracts before building on them

- [x] **D01 — record technology decisions.** Evidence: ADR 001, locked dependencies, notices and V09.  Resolve Q01/Q02 and the remaining renderer selection process in Q03 in tracked decision records. Audit required packages, fonts and their licences for unrestricted free operation. **D01-AC1:** canonical storage ownership, runtime boundaries and exact candidate dependencies are explicit. **D01-AC2:** no paid editor capability, renderer, font, service or watermark is required. **D01-AC3:** unresolved decisions have a named affected action; approval of architecture is not represented as approval of a library. Resolved under the user’s implementation delegation; renderer compatibility remains in D03.
- [ ] **D02 — finalise the document and naming profiles.** Produce a normative element/attribute mapping for all supported AKN content, amendments, bilingual expressions and shared resources; a schema version; label grammar; UK/HK terminology and citation examples; and project/container ownership rules. **D02-AC1:** every architecture content type has a valid mapping or a documented external project record, with no invented AKN tags. **D02-AC2:** Parts/subgroupings, body levels, Schedule levels, inserted labels, recitals and amendment quotations have unambiguous scopes. **D02-AC3:** paired titles, direct section prose and trailing parent prose are covered. Research may precede D01, but the persistence mapping must agree with its final decision.
- [ ] **D03 — qualify the free PDF adapter early.** After D01, render the F04/F07 specimens with the candidate, including a small independent two-PDF destination case. Investigate an open-source finishing step only if required. **D03-AC1:** record pagination, table continuation, Chinese glyphs/extraction, internal links, bookmarks and cross-PDF viewer results on the final artifact. **D03-AC2:** identify any missing behaviour and qualify another free candidate or obtain an explicit requirement decision; never silently downgrade output. **D03-AC3:** record runtime, memory, installation steps and dependency/font licences. This is bounded adapter qualification, not a completed production renderer.
- [ ] **D04 — validate persistence feasibility and set measurable baselines.** Demonstrate the selected representation with one bilingual document, one shared table, local citation names and one bilingual amendment. Define reference-browser/viewer versions, representative hardware and agreed performance budgets from the F08 corpus. **D04-AC1:** save/reopen preserves exact text, stable identity and a single authoritative shared object. **D04-AC2:** AKN exports validate; supported round-trip loss is zero and unsupported imports are identified. **D04-AC3:** budgets for editor response, preview, save/load and PDF generation are recorded before optimisation, with environment and repeat methodology. Depends on D01/D02; use D03 results for PDF budgets.

### P1 — domain and portable persistence (M01)

- [ ] **M01.1 — establish module/build boundaries.** Create domain, engine, format, presentation, runtime and editor boundaries with pinned free dependencies and documented development/check commands. Add standard-runner CI for checks that now exist. **M01.1-AC1:** a headless consumer loads domain/engine without editor/browser imports. **M01.1-AC2:** clean checkout setup and checks reproduce locally and in CI; no CI step claims unimplemented product coverage. Depends on P0.
- [ ] **M01.2 — implement structure and diagnostics.** Implement explicit identities/labels, source order, content containers, front matter, Schedules/Appendices and structured locations for diagnostics. **M01.2-AC1:** F01/F02 pass; duplicate labels fail, gaps remain, and no automatic sorting/renumbering occurs. **M01.2-AC2:** body and Schedule addresses cannot collide; quoted replacement structure has its own namespace. Depends on M01.1/D02.
- [ ] **M01.3 — implement lifecycle and bilingual invariants.** Model draft/adopted identities, paired formal titles, content mode, authority policy, adoption/certification records and one effective date. Add paired language content and shared objects. **M01.3-AC1:** incomplete drafts can save but cannot pass certification checks. **M01.3-AC2:** derived state uses an explicit date/timezone; draft wording or a hash cannot confer approval. **M01.3-AC3:** shared table changes appear once, and language-only edits mark counterpart review without translating it. Depends on M01.2.
- [ ] **M01.4 — implement content and reference value types.** Add exact Unicode/literal content, definitions, structured references, quotes, notes, examples, assets and ordinary tables. **M01.4-AC1:** no glossary business object or public row/cell target exists. **M01.4-AC2:** generated row numbers never become authored provision labels. **M01.4-AC3:** paired definition names and reference selectors persist separately from display labels and target URLs. Depends on M01.2/M01.3.
- [ ] **M01.5 — implement project storage and AKN adapters.** Implement the D01/D02 mapping, project manifests/assets/locks, safe import, export and draft-versus-certified validation. **M01.5-AC1:** F01–F05 supported semantic round trips pass, including shared identity. **M01.5-AC2:** unsupported imports report their locations and cannot be destructively saved. **M01.5-AC3:** XML external expansion and unsafe asset paths are rejected; incomplete writes preserve the previous file. Depends on M01.4.
- [ ] **M01.6 — implement migration and dependency portability.** Version formats independently from software releases; migrate copies, preserve original certified bytes, and retain exact dependency snapshots. **M01.6-AC1:** unknown major formats fail safely or open read-only. **M01.6-AC2:** interrupted migration/open and missing assets have recoverable diagnostics; locked targets remain usable offline. **M01.6-AC3:** no editor-native JSON is the sole source of record. Depends on M01.5.

### P2 — resolution and amendment engine (E01)

- [ ] **E01.1 — implement discovery and target loading.** Supply network/cache through adapters; parse versioned publisher manifests, linked indexes, revision metadata and on-demand content. **E01.1-AC1:** F03 distinguishes unavailable network, absent identity, unsupported protocol, stale cache and lifecycle states. **E01.1-AC2:** requesting one provision does not require fetching the corpus. **E01.1-AC3:** real cross-origin fixture requests verify CORS; malicious labels/URLs remain inert. Depends on P1.
- [ ] **E01.2 — implement target selection and citation wording.** Resolve local/current/original/pinned/draft targets and language availability; implement local interpretation-name precedence and custom labels. **E01.2-AC1:** F03 resolves both languages without recursive definitions or global prose replacement. **E01.2-AC2:** titles are bilingual even for monolingual targets; links identify the actual content language. **E01.2-AC3:** Schedule-level targets are preferred, numbered internal targets warn, and row/cell targets are rejected. Depends on E01.1.
- [ ] **E01.3 — prepare precise amendment operations.** Implement insert, omit/repeal and substitute with preconditions, exact Unicode ranges and structural payloads. Generate paired instructions from shared semantic operations. **E01.3-AC1:** F05 covers punctuation, repeated phrases, nested provisions, headings and whole-table substitution. **E01.3-AC2:** cell/row operations and published renumber/move/split/merge are rejected. **E01.3-AC3:** English-only changes to bilingual targets still require a bilingual instrument/instructions. Depends on E01.2.
- [ ] **E01.4 — apply instruments transactionally.** Check expected intermediate states, ordering, duplicate application, missing predecessors and same-date conflicts; apply all operations or none. **E01.4-AC1:** F05/F06 reproduce two amendments in one year and a later-year substitution. **E01.4-AC2:** failures preserve the original state and identify the authorising operation. **E01.4-AC3:** shared bilingual operations apply once; drafts/future operations never enter current text. Depends on E01.3.
- [ ] **E01.5 — implement document-level events.** Support whole-document repeal, cancellation of a scheduled amendment and authorised effective-date changes. **E01.5-AC1:** effective-date changes re-evaluate dependency ordering and cannot create partial commencement. **E01.5-AC2:** cancelling before commencement differs from repealing an effective instrument; no automatic restoration occurs. **E01.5-AC3:** event cycles and impossible preconditions produce explicit errors. Depends on E01.4.
- [ ] **E01.6 — construct revisions and provenance.** Build explicit as-of states, immutable snapshots, repeal tombstones, full history and surviving-text provenance. **E01.6-AC1:** whole substitution supersedes earlier wording contributions while preserving history. **E01.6-AC2:** original/past/current/proposed projections are distinct and stable. **E01.6-AC3:** replays from locked sources agree with cached snapshots and reference maps. Depends on E01.4/E01.5.

### P3 — rendering and publication tooling (R02)

- [ ] **R02.1 — build a resolved publication model.** Combine document projections, labels, contents, history and destination maps independently of output format. **R02.1-AC1:** renderers do not fetch catalogues or interpret amendments. **R02.1-AC2:** identical locked inputs produce equivalent semantic output and link maps. **R02.1-AC3:** unresolved required dependencies block a certified build. Depends on P2.
- [ ] **R02.2 — render static web documents.** Implement UK-inspired reading layouts, bilingual typography, contents, stable anchors, status and right-aligned amendment notes with detailed history. **R02.2-AC1:** F01/F04/F06 remain usable without JavaScript; all links are already resolved. **R02.2-AC2:** mobile layouts preserve reading order; shared tables appear once in parallel mode. **R02.2-AC3:** original/as-of/tombstone displays do not misrepresent future changes. Depends on R02.1.
- [ ] **R02.3 — implement production print layout/PDF adapter.** Integrate D03's qualified renderer with repeatable font setup, page breaks, table headers, running information, contents, bookmarks and history appendix. **R02.3-AC1:** F07 visual inspection finds no clipping, missing Chinese glyphs or stranded provision labels; long bilingual content continues correctly. **R02.3-AC2:** content text and reading order survive final PDF generation/finishing. **R02.3-AC3:** live web preview is not advertised as exact PDF pagination. Depends on R02.1/D03.
- [ ] **R02.4 — verify destination/link modes.** Implement same-PDF, hosted cross-PDF, optional offline bundle and combined-document modes, with page/destination maps and history links. **R02.4-AC1:** actual named-viewer results recorded for F07; no model-only success claims. **R02.4-AC2:** unsupported remote navigation uses an explicit documented fallback without breaking internal navigation. **R02.4-AC3:** shared nodes and concatenated documents cannot generate duplicate destinations. Depends on R02.3.
- [ ] **R02.5 — generate catalogue and headless publication outputs.** Export paired titles, status, identities, indexes, immutable content resources, revision history, digests and destinations. Provide documented validation/build/export commands. **R02.5-AC1:** E01 reads the produced catalogue using an independent consumer fixture. **R02.5-AC2:** no public row/cell keys or draft effects leak into certified indexes. **R02.5-AC3:** a locked publication succeeds without live external catalogues; no editor runtime required. Depends on R02.2/R02.4.
- [ ] **R02.6 — provide Actions proof/publication contracts.** Add reusable tooling and synthetic integration workflows for explicitly submitted revision proofs, approved-source builds and static-output verification. **R02.6-AC1:** standard Linux runner runs pinned tools/fonts with bounded artifact retention and no paid component. **R02.6-AC2:** proof outputs identify source revisions; untrusted proof work has no deployment secrets/permissions. **R02.6-AC3:** publication selection verifies approval context, explicit as-of date and complete artifacts; concurrent older builds cannot replace newer output. Depends on R02.5. Actual collection deployment remains deferred.
- [ ] **R02.7 — document deployment/recovery contract.** Define immutable-resource retention, current-pointer updates, scheduled effective-date rebuilds, failed-build behaviour, manual dispatch and rollback. **R02.7-AC1:** synthetic failure/concurrency checks preserve the previous publication; rollback preserves historical URLs. **R02.7-AC2:** scheduled delays/stale as-of status are visible and recoverable. **R02.7-AC3:** published files do not rely on expiring proof artifacts; no production host or corpus is created. Depends on R02.6.

### P4 — complete static authoring workflows (U01)

- [ ] **U01.1 — implement the editor shell and project lifecycle.** Add outline/writing/preview panes, paired title fields, language mode, lifecycle metadata and open/save/download with atomic undoable commands. **U01.1-AC1:** monolingual and bilingual draft creation/save/reopen works without an account or network. **U01.1-AC2:** incomplete state has visible diagnostics; saving never implies certification. **U01.1-AC3:** editor state converts to the portable model without losing IDs or content. Depends on P3/M01.6.
- [ ] **U01.2 — implement structured authoring.** Add all supported front/body/end matter, hierarchy commands, explicit labels, continuation prose, formatting, literal spans, ordinary tables and assets. **U01.2-AC1:** F01/F02 can be authored through UI, not only loaded as fixtures. **U01.2-AC2:** undo/redo preserves hierarchy, shared object identity and manual numbering. **U01.2-AC3:** paste reports unsupported content; no smart punctuation or implicit numbering changes. Depends on U01.1.
- [ ] **U01.3 — implement bilingual/shared editing.** Add provision-aligned panes, shared content controls, completeness and counterpart review states. **U01.3-AC1:** F04's table is editable once and renders identically in both language outputs. **U01.3-AC2:** actual Chinese IME composition, selection and undo do not corrupt text or trigger premature structural commands. **U01.3-AC3:** switching modes preserves selected provision and does not invent translations. Depends on U01.2.
- [ ] **U01.4 — implement reference/definition workflows.** Add catalogue-base input, target search/picker, language/version choice, interpretation document-name items and dependency refresh/review. **U01.4-AC1:** authors insert valid local/external references without filenames/IDs; full definition titles do not self-substitute. **U01.4-AC2:** offline/stale/missing/draft/repealed states are distinguishable and refresh never silently rebases an amendment. **U01.4-AC3:** manually maintained labels and discouraged Schedule-internal references receive appropriate non-blocking review messages. Depends on U01.3/E01.2.
- [ ] **U01.5 — implement amendment drafting/review.** Let authors select published target content, prepare operations, review bilingual instructions/replacements and inspect proposed before/after text. **U01.5-AC1:** F05/F06 workflows work through UI with precise-target conflict explanations. **U01.5-AC2:** whole-table replacement is the only table-edit operation for adopted content; draft table editing remains normal. **U01.5-AC3:** proposed view is labelled non-effective; final adopted sources cannot be overwritten through editing controls. Depends on U01.4/E01.6.
- [ ] **U01.6 — integrate common-engine previews and PDF proofs.** Add cancellable/debounced web preview, language/layout switching and source-identified asynchronous proof opening from explicit repository submission. **U01.6-AC1:** stale preview/proof cannot be mistaken for current text. **U01.6-AC2:** engine diagnostics link back to exact source/language locations. **U01.6-AC3:** no automatic draft upload, hidden GitHub token or requirement for an author-installed PDF helper. Direct GitHub authentication is not included unless separately selected. Depends on U01.5/R02.6.
- [ ] **U01.7 — implement recovery and accessibility.** Add local autosave/recovery, unsaved-change protection, corrupted-project handling and keyboard/screen-reader navigation. **U01.7-AC1:** failed save/import/recovery never destroys the last usable project. **U01.7-AC2:** actual reload/offline/browser-storage-loss scenarios distinguish recovery cache from durable downloaded files. **U01.7-AC3:** keyboard focus, accessible labels, editor reading order and parallel-pane navigation verified in actual UI. Depends on U01.6.

### P5 — integration and release readiness (V02)

- [ ] **V02.1 — run end-to-end document stories.** Author original, two same-year amendments, later substitution and repeal; build/read original/current/past/proposed outputs in both languages. **V02.1-AC1:** run F01–F07 through the complete product and record requirement-linked evidence. **V02.1-AC2:** shared tables, citation names, lifecycle and history agree across editor, project, AKN, HTML, PDF and catalogue. Depends on P4.
- [ ] **V02.2 — complete reliability/security/performance checks.** Exercise unsafe XML/assets/catalogues, missing dependencies, resource limits and interruption cases; measure the D04 budgets on F08. **V02.2-AC1:** malformed/untrusted input cannot read arbitrary files or execute content. **V02.2-AC2:** large-document editing/save/preview/build remain within recorded budgets or deviations receive explicit resolution. **V02.2-AC3:** zero-charge standard-runner operation and bounded storage are evidenced, not inferred only from licences. Depends on V02.1.
- [ ] **V02.3 — finish author/operator documentation.** Provide bilingual-content workflow instructions, structure/reference help, amendment review, save/recovery, supported-format/viewer matrix and Actions proof/publication handoff. **V02.3-AC1:** documented steps succeed on a clean checkout with exact commands and pinned prerequisites. **V02.3-AC2:** retained limitations, release notes, migration policy and free-operation route are clear. **V02.3-AC3:** actual UI screenshots/examples match implemented behaviour. Depends on V02.1; finalise after V02.2.
- [ ] **V02.4 — assess distributable release readiness.** Resolve Q04, collect third-party notices, verify independent engine consumption and reproducible static-editor build, and review all acceptance evidence. **V02.4-AC1:** all required actions pass with dated evidence and current configured checks/CI; no open blocker is labelled complete. **V02.4-AC2:** packages/static build are ready without publishing credentials, a corpus or an always-on service. **V02.4-AC3:** release/push/deployment only occurs within then-current user authorisation. Depends on V02.2/V02.3/Q04.

## Fixture and validation catalogue

Fixtures are synthetic and contain no church draft text or confidential material. Expected results must be independently specified, not generated by the same implementation being tested.

| ID | Specimen | Required checks |
| --- | --- | --- |
| F01 | English-only and Chinese-only originals, each with paired titles, full opening matter and representative content | Metadata, structure, schema, rendering, round trips |
| F02 | Nested body, inserted 5A/(1A)/(aa), direct prose, trailing parent text, Schedules/Appendices and isolated quoted provisions | Scope/identity, invalid nesting, duplicate labels, stable order |
| F03 | Two independent catalogue origins with local citation names, both languages, exact/current/original/draft targets | Real browser CORS, on-demand loading, URL/title separation, caches and failures |
| F04 | Bilingual Translation Guide with paired body and a single shared long ordinary table | One authoritative table, identical separate outputs, full-width parallel layout, no row references |
| F05 | Bilingual amendment with English-only wording change, paired wording changes, punctuation and whole-table replacement | Exact selectors, paired instructions, transactional application, no duplicate shared effects |
| F06 | Original plus two 2027 instruments, a 2028 substitution and repeal/cancellation/date-change variants | Effective order, same-date conflicts, draft/future exclusion, history, no implicit revival |
| F07 | Long print specimens and two PDFs with references at beginning/middle/end, history links and table/page boundaries | Final PDF visual/read-order inspection; actual supported viewer navigation; online/offline/combined modes |
| F08 | Representative and stress corpus with recorded provision/table/asset/reference counts | Measured editor, save/open, preview, catalogue and PDF budgets; runtime/memory/resource limits |

Use five distinct evidence labels: **source inspection**, **automated host/model checks**, **actual browser/UI checks**, **rendered artifact/viewer checks**, and **CI/release checks**. A simulated network or editor transaction does not demonstrate CORS or IME behaviour. Record date, revision, command/procedure, runtime/browser/viewer, fixture and result. Do not rerun unrelated checks after documentation-only changes.

Support targets are to be pinned in D04: current desktop Chrome/Edge, Firefox and Safari for authoring; narrow-screen reading layouts; Acrobat Reader, macOS Preview and a browser PDF viewer for navigation. These are verification targets, not a claim that every viewer supports remote destinations. Installation/licence conditions must remain compatible with free use. Accessibility checks combine automated diagnostics with keyboard and screen-reader inspection; no conformance label is earned solely by setting a PDF flag.

## Architecture acceptance traceability

| Requirement | Implementing actions | Completion evidence |
| --- | --- | --- |
| ARCH-18.1 — paired titles | M01.3, U01.1 | F01 model + actual authoring |
| ARCH-18.2 — complete structure | D02, M01.2, U01.2 | F01/F02 schema + authoring + output |
| ARCH-18.3 — stable explicit labels | M01.2, E01.4, U01.2 | F02/F06 invariant and UI checks |
| ARCH-18.4 — bilingual/shared content | M01.3, E01.3, U01.3, R02.3 | F04/F05 round trips and renders |
| ARCH-18.5 — citation nomenclature/definitions | D02, E01.2, U01.4 | F03 exact language-label fixtures |
| ARCH-18.6 — reference states and loading | E01.1, E01.2, U01.4 | F03 host + real cross-origin browser checks |
| ARCH-18.7 — repeated amendments/conflicts | E01.3, E01.4, U01.5 | F05/F06 transaction and UI stories |
| ARCH-18.8 — lifecycle and bilingual amendments | M01.3, E01.4, E01.5, U01.5 | F05/F06 as-of and scope checks |
| ARCH-18.9 — whole-table rule | M01.4, E01.3, E01.4, U01.5 | F04/F05 negative operations and shared output |
| ARCH-18.10 — history and tombstones | E01.6, R02.2, R02.3 | F06/F07 provenance and final history links |
| ARCH-18.11 — AKN/persistence/migration | D02, D04, M01.5, M01.6 | Schema validation, F01–F05 round trips and failure recovery |
| ARCH-18.12 — language/accessibility/layout | M01.4, R02.2, R02.3, U01.3, U01.7 | F04/F07 actual IME, accessibility and visual checks |
| ARCH-18.13 — PDF destinations | D03, R02.4 | F07 named-viewer matrix on final artifacts |
| ARCH-18.14 — independent engine/offline use | M01.1, M01.6, R02.5, R02.6, U01.7 | Clean headless build, locked offline run and actual recovery |

Cross-cutting free-operation, performance and safe-input requirements additionally gate V02.2/V02.4. All rows must have actual evidence before product completion.

## Future document-repository handoff (deferred)

Once separately authorised, the corpus repository will select its name, visibility, static host and approval policy, then consume the released engine rather than copy its source. It will keep document history and certification inputs, use Actions for proofs and publication, retain immutable outputs and update current views. The software repository's R02.6/R02.7 provides the required interface and synthetic validation now; creation, production content, credentials and deployment of that repository remain out of scope.

## Open questions

| ID | Context and affected actions | Decision needed |
| --- | --- | --- |
| Q01 | Resolved through implementation delegation, ADR 001. | Neutral canonical project with validated AKN interchange and explicit shared/project metadata. |
| Q02 | Resolved through implementation delegation, ADR 001. | TypeScript/Node; React/Tiptap dependencies selected but no editor UI constructed. |
| Q03 | Free execution through Actions resolved; long-output qualification changed the adapter. | Chromium/fontTools/pypdf implemented. Final viewer matrix, runner setup and edge-case fonts still need qualification. |
| Q04 | Explicit user decision, 2026-09-11. | MIT; third-party and future publication-content rights remain separate. |
| Q05 | Resolved by user, 2026-09-11. | Implement a compact desktop Office-style ribbon, one writing canvas and preview on demand. |


Nomenclature and schema verification in D02 are research obligations, not extra permission gates. Record ambiguities and bring only material policy choices to the user.

There is enough information to plan all phases now. Q01/Q02/Q04 are resolved. Q03 retains renderer/viewer qualification work; Q05 is resolved. Future host/visibility choices do not block the editor and engine. No further product-scope clarification is required to maintain this plan.

## Validation evidence

### V01 — repository workflow and ignore rules — 2026-09-10

- Source inspection: `git status --short`, `git log -5 --oneline`, `AGENTS.md`, README and architecture/technology documentation. User-created `AGENTS.md` retained unchanged; `.DS_Store` left on disk and ignored.
- Repository checks: `git check-ignore --no-index --stdin` checked representative ignored paths and separately confirmed that documentation, XML/JSON/PDF fixtures, lockfiles and environment templates remain trackable. Result: passed.
- Documentation checks: a one-off Python check resolved all relative Markdown file links in tracked/proposed documentation. Result: passed.
- Staged review: `git diff --cached --name-status` and `git diff --cached --check`. Result: intended paths only; no whitespace errors.
- Product automated tests, simulator/model tests, actual UI/device checks and CI: not applicable to this documentation/configuration change; none are configured. No product or release-readiness claim is made.
- Delivery: focused local commit. This action does not push or alter the previously published commit.

### V03 — architecture approval and free operation requirement — 2026-09-11

- User decision: full architecture approved; all components and the final product must run comfortably free of charge. Architecture approval does not resolve Q01/Q02/Q04 or the PDF execution choice in Q03.
- Documentation research: reviewed official WeasyPrint licence/capability documentation, Tiptap core licence and pypdf annotation documentation. WeasyPrint remains a candidate; no PDF output, performance benchmark or viewer check was performed.
- Local documentation checks: relative Markdown file links resolved successfully; `git diff --cached --name-status` showed only README, PLAN and the two design documents; `git diff --cached --check` passed.
- No product tests or CI pipelines exist. Ignore rules were unchanged and their earlier validation was not repeated. No product implementation or push is part of this action.

### V04 — static publication through GitHub Actions — 2026-09-11

- User approved Actions-based website generation/deployment and a fully static deployed site. Recorded the runtime decision without creating the deferred document repository or implementing workflows.
- Reviewed official GitHub Actions billing and scheduling documentation. Standard public-repository hosted runners can be free; paid larger runners and storage overages are not assumed free. Scheduled execution is not an exact-time guarantee.
- Relative Markdown links and `git diff --cached --check` passed; staged review included only README, PLAN and architecture/technology documents.
- No workflow, PDF, UI or product test was executed; none is implemented. Existing untracked `.idea/` was preserved. No push in this action.

### V05 — full implementation planning — 2026-09-11

- Inspected current instructions, README, PLAN, technology decisions, architecture and recent commits. Existing `.gitignore` edits were preserved and excluded from this action.
- Expanded P0–P5 into stable child actions with dependencies, numbered acceptance criteria, eight fixture families, all fourteen architecture acceptance mappings, validation layers and deferred corpus-repository boundaries.
- Planning checks: relative Markdown links resolve; all referenced action IDs and fixture IDs exist; architecture requirements 1–14 are each mapped once; action acceptance IDs are unique; exactly one primary phase is active; `git diff --cached --check` passed.
- No product code, qualification prototype, UI/PDF test or CI pipeline was implemented/run. D00 is complete as planning only; product actions remain unstarted. Local documentation commit only; no push.

## Follow-ups

- Record decisions from the technology discussion before starting P1.
- Add actual build/test commands and CI requirements when tooling exists; do not invent commands for the documentation-only repository.
- Update this status, active/next action and evidence on each change of progress. Keep earlier evidence dated rather than presenting it as a fresh verification.

### V06 — domain qualification foundation — 2026-09-11

- User authorised execution and selected MIT. ADR 001 records neutral domain JSON, TypeScript/Node, free editor dependencies and the Python PDF qualification path.
- Automated host checks: `npm test`, four tests passed (manual labels/order, duplicate addresses, paired titles, safe schema handling, canonical key order); `npm run check`, passed.
- These are model checks only. No browser/UI, AKN schema, PDF viewer, remote CI or release claim yet.
- Latest user scope: continue headless implementation, stop before constructing editor UI for design discussion.

### V07 — portable format qualification — 2026-09-11

- Automated host/model checks: `npm run check` and `npm test` passed (six tests). Bilingual fixture and one shared table survived project save/reopen and both AKN expression round trips; lxml validated each against the vendored OASIS schema. Changed XML, malformed XML and DTD/entity imports were rejected.
- D02 profile now records English/HK grouping distinctions, front/body/end mappings, project extension ownership and unsupported foreign-AKN import. D04 is partial: sample round trips pass; stress budgets and broader fixture coverage remain.
- No browser/viewer or CI claim. No editor UI was constructed.

### V08 — PDF qualification and amendment model — 2026-09-11

- Free PDF qualification produced seven pages; extraction, destination and annotation checks passed. Poppler images of pages 1/4/7 inspected. Actual Preview internal navigation passed; plain relative cross-file URI did not automatically open the adjacent PDF. See `docs/pdf-qualification.md`. D03 remains partial pending production and viewer matrix work.
- Host/model amendment/reference checks: 14 tests passed, including repeated amendments, transactional rollback, bilingual enforcement, whole-table replacement, Unicode boundaries, tombstones and scheduled cancellation. These are partial E01 implementation evidence, not completed UI workflows.
- P0 remains the sole active qualification phase; engine work supplies reusable qualification behaviour. No UI is being built. The UI discussion boundary remains unchanged.

- Latest rendering correction: bilingual sources require three outputs: separate English and Traditional Chinese documents, plus a landscape parallel document aligned at each provision. Shared tables span both columns once. This supersedes the early portrait specimen; it does not authorise editor UI work.

### V09 — headless implementation and three-output publishing — 2026-09-11

- Source implementation: separate domain, engine, format, presentation and filesystem adapters. Draft saves preserve adopted/corrupt originals; published outputs include immutable sources/revisions, digest-pinned indexes and on-demand target resources. Same-date replay exposes intermediate snapshots. Published AKN includes generated reference labels and operative amendment payloads, and derived expressions cannot be re-imported as editable sources.
- Automated host checks: full suite passed before the final AKN-reference regression addition (21 tests); focused AKN/reference tests then passed (5 tests). Final full suite: **22 tests passed**, including generated publication citation text in AKN, catalogue target retrieval, three PDF outputs and failed-approval preservation. Strict `npm run check` and `npm run build` passed. Built package domain/engine imports succeeded under plain Node without editor imports.
- PDF qualification: English 9 pages, Chinese 8 pages, landscape parallel 14 pages; exact language end markers, row 150, orientations, named destinations, bookmarks and tags passed. Sampled final page images inspected. See `docs/pdf-qualification.md` for actual-versus-unverified viewer results and candidate failures.
- Representative headless budget: 1,000 provisions, 547,663 bytes, three runs on Mac14,9 / 16 GiB / macOS 26.6.2 / Node 24.12.0. Save 5–6 ms; parse 4–11 ms; validation 2–3 ms; parallel HTML 4–7 ms. Budget: 2 seconds per operation; passed. This does not measure editor latency or the full F08 stress corpus.
- Actions definitions use pinned action revisions, read-only permissions, bounded execution and one-day proof artifact retention. Definitions are not remote CI evidence; no push, deployment or automatic document upload occurred.
- MIT recorded. npm metadata inventory contains MIT, Apache-2.0, ISC, BSD-3-Clause and MPL-2.0 dependencies; the pinned Noto font uses OFL. No paid required service/library/font is used.

### Retained acceptance work at the UI design boundary

- D02/D04/M01: complete the entire F01–F05 schema/round-trip matrix, including all nested grouping/continuation cases and broad asset diagnostics. Existing tests are representative, not the whole matrix.
- E01: expand event-order/cycle and provenance-range fixtures; actual cross-origin/offline-cache browser behaviour remains unverified. Existing history handles whole-target supersession; full surviving-span provenance remains to be completed.
- R02: complete final supported-viewer navigation, whole-document visual/read-order audits, hosted remote-destination fallback and optional offline/combined modes. Ambiguous font cmap literals currently fail explicitly rather than changing Unicode.
- R02.6/R02.7: run workflows on the actual Linux runner and exercise deployment concurrency/rollback against a synthetic host. Production deployment and the corpus repository are still deferred.
- P4: initial UI implementation and browser checks are recorded in V10. Full Chinese IME, accessibility, advanced amendment-composer and recovery-failure coverage remain open; headless model tests do not satisfy them.
- P5: complete remaining integration, large-stress, third-party distribution and release gates. No release-readiness claim is made.

### V10 — desktop ribbon authoring foundation — 2026-09-11

- User authorised compact desktop UI after discussing the ribbon prototype. P4 is the only active phase; earlier P0–P3 acceptance gaps remain.
- Implemented a static React/Tiptap editor using the portable project model. Manual provision creation, outline, ordinary/shared tables, bilingual views, atomic inline references, draft-only edits, JSON/AKN import/export, undo/redo, local recovery and common-engine preview exist. No publication repository or deployment was created.
- Host checks: `npm run check`, `npm run build:editor`, and three focused `tests/editor.test.ts` model tests passed. Tests cover insertion identity/order, invalid hierarchy rollback, Unicode/marks/reference round trips and adopted-source protection.
- Actual browser checks: local in-app browser on macOS; inserted 5B after 5A, edited its heading and prose, downloaded/reloaded it through local recovery, inserted a local Schedule reference and undid that insertion. Initial reference-path and mount-update bugs were found and corrected. Screenshot inspected for desktop ribbon/canvas layout.
- Not complete U01 acceptance: amendment composition, full content/asset controls, definition management, source-origin previews, IME, external CORS, multi-browser/accessibility and failure recovery remain to be completed or qualified. PDF proof submission remains headless.

### V11 — amendment authoring and browser reference qualification — 2026-09-11

- Extended U01 with paired definition names, embedded figures, recitals, trailing text, reversible draft removals, table row/column controls and a guided amendment panel. Adopted sources remain read-only; a separate amendment draft captures exact intermediate preconditions for insert/omit/substitute operations. The proposed view uses the existing engine and is explicitly non-effective.
- Automated host/model checks: `npm run check`, `npm run build`, `npm run build:editor` passed. **27 tests passed** via `npm test`, including the existing three-PDF publication story and five editor tests. The new amendment test inserts bilingual 5B after 5A, then substitutes its English wording; original bytes remain exact, stale preconditions and missing Chinese instructions fail. Recovery tests cover quota failure and preservation of unreadable preceding bytes.
- Actual browser checks: in-app browser on macOS, isolated `localhost:5173` workspace. Opened a synthetic adopted bilingual source read-only; created/recovered a separate amendment, loaded its principal, entered bilingual 5B text and paired instructions, and added the checked operation. The full bilingual quotation appeared in the common-engine instrument preview. Traditional Chinese was entered through browser text actions, **not an IME composition test**.
- Actual browser reference checks: loaded a synthetic catalogue/index across origins (`localhost:5173` → `127.0.0.1:5175`, explicit CORS); stopped the publisher and loaded saved dependencies successfully. Inserted a Schedule reference from the saved index; preview retained the publisher's `en.html#n_sch1` address. Internal preview links were exercised: the initial srcdoc relative-anchor defect was corrected using explicit `about:srcdoc#…` links, and the final click stayed within the proof. No external production API was used.
- UI reliability fixes: mounting read-only editors no longer produces false edits; nested selection targets the clicked provision; an in-app replacement prompt replaces the blocking browser confirm; opening an existing file no longer marks it changed. Recovery download/reload and undo were exercised in V10.
- CI definition now includes the static-editor build. **No remote Actions run, push or deployment was performed.** The local development preview remains running. Build output is about 876 kB JavaScript before compression / 276 kB gzip; the bundler's chunk-size advisory is retained, not a measured runtime failure.
- U01 remains partial: actual IME/screen-reader/multi-browser and broad stress checks, all recovery-failure scenarios, source refresh/custom reference controls, earlier adopted amendment chains, precise-range/event composition and complete nested replacement editing remain. Figures/definition controls have source/build coverage but not full actual-UI stories. Proposed preview currently omits history annotations. P3 viewer/provenance and P5 release gates remain open.
