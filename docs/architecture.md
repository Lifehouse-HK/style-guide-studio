# Architecture: Style Guide Studio

Status: architecture approved by the user on 2026-09-11; technology selection remains under discussion.

Updated: 2026-09-11.

This document defines behaviour and boundaries independently of programming languages, editor frameworks, storage libraries, hosting services and PDF products. Standards named here are document/interchange contracts, not technology selections. Implementation progress is tracked separately in the implementation plan.

## 1. Purpose and repository boundary

Provide a static visual editor and a reusable publishing engine for legislative-style church publications. Preserve stable citations, publish formal amendment instruments, and produce readable revised text without interpreting arbitrary prose as executable amendments.

Use one software repository, `Lifehouse-HK/style-guide-studio`, with independently consumable modules. A shared repository permits atomic changes to the document contract, engine and editor; independent modules prevent editor-specific dependencies from leaking into publishing. Split repositories only when independent ownership or release needs justify it. A separate repository would not by itself create a sound module boundary.

The later document-collection repository will track drafts, adopted originals, amendment instruments, approval records, publication inputs and release manifests. It will consume versioned software releases and generate its own static website and catalogue. It will not contain a second implementation of the engine. Its name and creation are outside the present work.

### Approved operating-cost requirement

All required components and the complete product must have a comfortable free-of-charge operating path. No required paid licence, subscription, per-export fee, trial, watermark, paid font or paid editor extension. Required workflows must remain usable on existing local hardware without reliance on hosted free-tier quotas; GitHub Actions is approved as the normal generation/deployment runtime, with portable local commands retained as a fallback. Hosting, domains, electricity and hardware are not asserted to have zero real-world cost. A local publishing path must preserve complete output quality and functionality.

Dependency and font licences must permit intended use and distribution. Performance and setup effort must be measured on agreed representative documents and ordinary hardware before claiming comfortable operation. The specific stack and numerical performance budgets are still to be selected.

## 2. Modules and dependency rules

| Module | Responsibility | Must not depend on |
| --- | --- | --- |
| Domain contracts | Document structure, identities, lifecycle, references, language rules, operations, diagnostics | UI, network, filesystem, PDF product |
| Publishing engine | Validation, reference resolution, citation wording, amendment application, revision/history construction, publication projections | Editor framework, browser storage, hosting provider |
| Format adapters | Project persistence, Akoma Ntoso import/export, catalogue serialization | Editor view state |
| Presentation | Semantic web output, print representation, bilingual layouts, controlled typography | Editor DOM or screenshots |
| Runtime adapters | File/network access, cache, clock, asset loading, PDF execution, command-line or job entry points | Domain policy duplicated in adapters |
| Static editor | Structured authoring, reference selection, review, diagnostics, save/open, preview | PDF-product internals or direct publication credentials |

The editor calls the same engine used by automated publication. Presentation consumes resolved publication data; it does not look up references or invent amendment effects. The engine accepts supplied inputs and explicit context rather than reading the network or current time itself.

Logical flow:

    Editor commands -> domain document -> validation/resolution/revision engine
                                           -> publication model
                                           -> web presentation
                                           -> print presentation -> PDF adapter

    Future collection repository -> publication runner -> same engine and presentations

No runtime dependency on the editor is permitted for building a publication.

## 3. Identity, revisions and authority

Distinguish these concepts:

- Publisher identity: stable namespace, separate from its current hosting URL.
- Document identity: enduring principal Guide or distinct amendment instrument, e.g. `cp-e-sg-2026`.
- Provision identity: permanent internal identity belonging to one document.
- Citation address: manually assigned human labels, e.g. `5(1)(b)` or Schedule 1, paragraph 3.
- Language expression: English or Traditional Chinese wording associated with that document/structure.
- Source revision: an immutable saved/certified state, distinct from the title year.
- Effective revision: principal text derived from effective amendments at a requested date.
- Publication build: outputs of specified sources, dependencies and tool/presentation versions.

Titles and source filenames are never identifiers. The original principal Guide retains its identity and title year when amended. Amendment numbers distinguish instruments, not changes to an individual provision. An annual sequence distinguishes Amendment, Amendment No. 2, etc.; internal identities may consistently include sequence 1 even when its displayed title omits it.

An adopted source is immutable. Later changes require a new recorded instrument or an explicitly identified editorial publication update. No certified artifact is silently overwritten at an immutable address. Draft editing history is not itself legislative history.

## 4. Document metadata and lifecycle

Required for every document:

- Identity, publisher and profile version.
- Formal titles in **both English and Traditional Chinese**, including monolingual documents. Long titles, when used, follow the content language mode; they are not a substitute for the required paired formal titles.
- Role: principal or amendment.
- Content mode: English, Traditional Chinese or parallel bilingual.
- Stage: draft, adopted or withdrawn.
- Authority policy: both language texts authoritative, or a specified authoritative text with an informative translation.
- Source revision identity and provenance.

Adopted documents additionally record adopting authority, adoption date, one document-wide effective date, and the certification record identifying the approved source. Certification is an organisational action, not inferred from successful validation, a filename, a public URL or a hash. Hashes identify content; they do not authenticate approval.

Drafts correspond to Bills and adopted Guides to Acts in the document profile. Preserve distinct draft/adopted identities with an `adopted-from` relationship. Do not retarget historical references to a draft automatically.

Scheduled/effective/repealed states are derived from authoritative events and the requested date. A draft can carry a proposed date, but never contributes to effective text. Whole-document withdrawal before adoption is different from repeal after adoption.

There are no provision-specific effective dates. Every operation in an amendment inherits its document's effective date. Dates use the publisher's declared timezone and a documented start-of-day convention; two instruments effective on the same date require an explicit application order if their effects interact.

## 5. Structural document profile

The [2026-09-12 authoring and enactment decisions](decisions/002-authoring-profile-and-enactment.md) supersede conflicting earlier terminology and profile proposals. They record the exact bilingual formula, removed structures, non-blocking draft numbering checks and generated amendment authoring.

Ordered regions:

1. Metadata and front matter: paired formal titles, status, adoption/revision information, generated arrangement of provisions, optional long title.
2. Optional preamble containing individually identifiable recitals.
3. Enacting formula.
4. Operative body.
5. Optional Schedules.
6. Optional informative Appendices.
7. Generated editorial material and history (visible history presentation pending user choice).

Long title defaults to “A Style Guide to” and remains editable. The optional preamble is one paragraph or an automatically numbered recital list. The enacting formula is prefilled from the recorded bilingual default and editable in a draft for contingency, but cannot be amended after enactment. Metadata, not formula text, determines effect.

The [drafting structure audit](drafting-structure-audit.md) records the government-source findings and required corrections. In particular, heading eligibility is context-specific; a subsection does not receive a structural title. The generic implementation is not a conforming realisation of this hierarchy.

Body hierarchy:

- Optional grouping containers: Parts and subordinate grouping types selected by the nomenclature profile.
- No Chapters or cross-headings in new authoring. Optional grouping path: Part → Division → Subdivision.
- Section (adopted) / clause (draft): explicit number, e.g. 5 or 5A.
- Subsection: explicit label, e.g. (1) or (1A).
- Paragraph: explicit label, e.g. (a) or (aa).
- Sub-paragraph: explicit label, e.g. (i).
- Exceptional deeper subdivision: a distinct structural type with profile-defined terminology and labels, not an inferred list level.

Section labels are unique throughout the body, not restarted by Parts. Child labels are unique within a parent. Source order is authoritative: never sort or renumber provisions automatically. Gaps are allowed. Numbering form, duplicates and order produce non-blocking draft diagnostics: retain entered values and allow draft saves and moves. Ambiguous public addresses still require an explicit certification policy. The label grammar is profile-owned and accommodates deliberate inserted labels without numerical arithmetic.

Containers hold ordered content, including introductory prose, subdivisions and concluding prose. A sentence after a nested list remains attached to the correct parent. A prose paragraph and a legislative paragraph are different types. A section may contain direct prose instead of subsections.

Interpretation, citation, commencement, scope, rules and exceptions are roles of ordinary provisions. The effective-date statement is generated from, or checked against, metadata. Conflicting or partial-commencement text cannot be certified as supported executable policy.

English display/citation terminology follows UK usage. Chinese follows Hong Kong usage: main provision 條, subsection 款, paragraph 段, sub-paragraph 節, Schedule 附表. Numbering tokens are shared across language expressions. Grouping terminology must be an explicit verified catalogue: do not infer that UK Chapter and Hong Kong Division are identical, or confuse a law's chapter number with an internal grouping. Exact grouping labels and exceptional deep-level forms require nomenclature fixtures before the profile is declared conformant. This is a vocabulary verification task, not permission to change the common hierarchy between languages.

## 6. Schedules, Appendices and tables

Schedules contain adopted material and are introduced by body provisions. Each has an explicit number and title. Optional internal numbered provisions use manually assigned labels with a Schedule-qualified address; they do not collide with body addresses. Prefer references to the Schedule itself. Referencing a numbered provision inside one remains allowed with a non-blocking editorial warning. Never require an override ceremony for that warning.

Appendices are explicitly informative in this profile and do not impose rules. Their editorial revisions have separate provenance and preserve prior published copies. Editorial Appendix changes do not alter an effective principal-body revision or require pretending they are operative amendments. If material must prescribe a rule, place it in the body or a Schedule.

Tables are ordinary tables, including terminology/glossary tables. Support captions, accessible headers, text, inline formatting and optional generated row-number columns. No glossary-specific entities, UI, validation or business logic. No row or cell is a public reference target. Automatic row numbers are presentation only.

A table has an internal operation target identity. Published-table changes replace the **entire table**. There are no cell/row amendment operations. Creating, inserting and removing a whole table remain available through the three structural operations. Unadopted drafts allow ordinary table editing.

An amendment must identify its table unambiguously, using its Schedule, caption or containing provision. Multiple tables lacking a distinguishing designation produce an amendment-drafting error, not a guessed target. A whole-Schedule substitution can include its table.

## 7. Content and text fidelity

Content blocks: prose, structural subdivisions, bullet lists, definitions, ordinary quotations, structured amendment quotations, examples, notes, tables, figures/specimens and footnotes. Inline content: text, emphasis, strong emphasis, literal spans, references, external links, defined-term tokens and relevant typographic marks such as superscripts.

Preserve authored Unicode and meaningful whitespace. No automatic smart quotes, dash replacement, Chinese conversion or spelling correction. Literal examples can expose otherwise invisible characters. Rendering line wrap is not a content edit. Amendment range matching uses a documented Unicode-aware convention and cannot split a user-perceived character.

Notes and examples are visibly informative. Footnotes and editorial amendment annotations have separate roles. Raw executable HTML/scripts and arbitrary CSS are not author content.

Replacement quotations contain structured destination content in an isolated namespace. A quoted section 5 inside an amendment is not section 5 of that amendment. Replacement content is applied to the principal target only through its associated operation.

## 8. Parallel bilingual content

A bilingual document has one structural skeleton and provision identities, with paired English/Traditional Chinese text at numbered-provision boundaries. Sentences and unnumbered prose blocks need not align one-to-one. Titles, headings, formulas and definition wording can have paired content.

An item may explicitly use a single shared content object instead. A bilingual glossary table can therefore be stored once and rendered identically in both language outputs. Shared table headers and notes must themselves contain the intended bilingual wording; the renderer does not silently translate or reorder them. Parallel layouts show shared content once across the two columns when appropriate. Separate language outputs each include the same shared object.

Inserting/removing numbered structure affects both language slots. Missing translation is explicit, never hidden by a fallback. Certification requires complete reviewed expressions or an explicitly shared item. Language-specific prose changes mark the counterpart for review without inventing a translation.

An amendment of a bilingual document must itself be bilingual. One semantic operation may have two instruction expressions and affect English only, Chinese only, or shared structure/content. When the two texts need different replacements, represent linked operations with their respective payloads. Shared replacements are stored once. Both instruction expressions are reviewed against the operations, and no operation is applied twice merely because its instruction has two languages.

## 9. References and interpretation names

A reference stores target publisher, document and provision identity, plus a version selector and optional language/display override. Citation addresses are lookup aliases, not the permanent identity. A source may retain the typed address for author diagnostics.

Selectors distinguish: original adopted text; exact immutable revision; current effective text; exact draft revision. Ordinary citations may intentionally refer to current effective text. Publication resolves that selector at the declared build/as-of date and records the result. Amendment targets always identify an exact expected prior state. No title year implicitly selects the original text.

Label precedence: explicit custom label; document-wide locally defined citation name in the output language; target's formal title in that language. Inside the defining interpretation item, explicitly use the formal title to avoid circular wording. One preferred name per target per language; conflicting names are errors. Definition records and their rendered interpretation provisions are two views of the same data, not independently editable copies.

No global prose substitution. Manually typed text remains literal. Optional defined-term tokens remain connected to their definitions. Custom reference labels are marked manually maintained and reviewed when definitions or target metadata change.

Internal references resolve from the open document, even offline. External references use configured catalogues. A Chinese title may cite an English-only document; the destination states available content languages. No fabricated translated view. Draft references are visibly labelled and cannot become effective amendment dependencies. Informative citations to drafts remain possible; certification reports them for review rather than confusing them with adopted rules.

## 10. Static catalogue contract

A manually entered HTTPS base URL leads to a versioned discovery manifest at a documented relative location. The manifest provides publisher identity, protocol versions and linked index/resource paths. Clients follow declared links rather than guessing file layouts. Relative paths resolve against a declared base.

Resources include:

- Document index: identities, paired titles, roles, languages and lifecycle information.
- Per-document reference index: public provision identities, addresses, headings, status and output links.
- Revision metadata/history: immutable source/effective revisions and effective-date events.
- On-demand provision content: enough structured target content and context to prepare an amendment.
- Relevant dependency/amendment manifests required to reproduce a selected target revision.

Do not require the editor to download a complete collection. Amendment verification can be scoped to the fetched target and its certified context. A final publication runner still needs sufficient source inputs to construct the complete output document; a small target excerpt cannot generate an entire revised Guide.

Reference indexes exclude rows/cells. Table operation identities are available in target content to the amendment editor, not as ordinary public references.

Represent failure states separately: unresolved key, unavailable network, incompatible protocol, stale cached data, draft target, scheduled target, repealed target. Cache is a recoverability/performance facility, not proof of current status. Save exact dependency identities and content digests for referenced material; used-target snapshots allow offline drafting. Refresh does not silently rebase an amendment.

Public catalogues require CORS permitting the editor to read them; no credentials are required for public reads. Treat catalogue labels as text, validate resource types, reject unsafe URL schemes and identify the selected publisher visibly. A claimed publisher identifier is not independent verification of an arbitrary host's authority.

Published HTML contains resolved ordinary links and needs no catalogue fetch to work. Current views may be rebuilt as new amendments take effect; immutable dated/revision outputs remain unchanged.

## 11. Amendment model

Exactly three core textual/structural operations: insert, omit/repeal, substitute. They work on precise text ranges or whole structural content, subject to the whole-table rule. No published renumber, move, split or merge operations. Drafts may be reorganised before adoption. Published restructuring uses explicit repeal and insertion; no inferred identity redirection.

Each operation records permanent identity, authorising amendment provision, target document/node, language scope, expected prior revision/content, exact location, old/new payload as applicable, and sequence within its instrument. A human description is not executable code. Operative headings, instruction wording and replacement quotations are generated, read-only expressions of recorded actions. Users edit action parameters and payloads, not generated provisions. Amendment instruments have a dedicated action workspace; see the recorded HK-based generation requirements. Free-form qualifications cannot silently alter executable effects.

For text selections, store the expected revision, target node, exact selected content and context plus an unambiguous range. Never use global replacement or first-string-match against a newer text. Draft tooling may propose retargeting; approval requires explicit review. Multiple-match and precondition failures stop application.

Apply instrument operations in declared order to a working copy. Each operation declares the intermediate state it expects. Validate the entire result and publish all effects atomically or none. Applying the same instrument twice must be detected. Record operation identifiers and provenance with the result.

Order instruments by effective date and explicit dependencies/order where necessary, not adoption year or title sequence alone. Detect cycles, missing predecessors and conflicting concurrent amendments. Future adopted changes are shown as scheduled; drafts are shown only in proposed previews. Neither affects today's effective text.

Document-level actions are distinct: repeal an entire Guide, cancel a scheduled amendment, or change a future effective date under an explicit new authority record. No arbitrary per-provision commencement. Repealing an already-effective amending instrument does not undo its effects. Restoring content requires an express new insertion/substitution with identity/label handling reviewed; the system does not implicitly revive it.

Ordinary text edits and direct substitution of a provision preserve its identity. Repeal retains its historical address and tombstone. Repeal plus unrelated insertion uses a new identity and cannot recycle an established address silently. Reference review reports repealed targets without silently replacing their meaning.

## 12. Revisions, provenance and annotation display

Construct revised text from immutable principal source plus effective adopted instruments and dependency context. Save derived snapshots for efficiency, but preserve the inputs and enough provenance to reproduce them. Historical revisions are computational records, not replacement Acts or annual editions of the principal Guide.

Each changed node/range records the authorising operation. Maintain both complete history and provenance of surviving current text. A later whole-provision substitution supersedes the wording contributions of earlier operations without deleting their historical events.

Normal display: a right-aligned note below the provision, e.g. “Last amended by … — History (3)”. Expanded web history shows effective dates, operation summaries and links to authorising provisions. Repealed nodes retain their number and a repeal notice. PDFs link to a printed history appendix. On narrow screens notes flow below content in logical reading order. An as-of view never presents a future amendment as already effective. Copy/export can include or exclude editorial notes explicitly.

## 13. Persistence and Akoma Ntoso boundary

The durable contract is a framework-independent project model: metadata, document structure, language expressions, shared content, definitions, operations, source relationships, dependency records and assets. An editor library's internal JSON/DOM is never the only saved representation.

Use an Akoma Ntoso-based document profile for standards interchange, with supported Bill/Act expressions and amendment metadata. One document identity can have multiple language expressions; shared content is expanded into standalone exports as necessary. Exported duplicate appearances are derived, not independently editable sources.

Physical authoring persistence is intentionally a technology decision requiring discussion: (A) Akoma Ntoso documents plus a project manifest/shared-resource convention, or (B) a neutral project serialization with validated Akoma Ntoso import/export. Earlier discussion favoured canonical XML; shared bilingual objects and reproducible operations mean that commitment must be tested rather than silently assuming one ordinary XML file covers all needs. Neither option permits duplicate authoritative copies of a shared table or an editor-specific save format. The semantic contract above is the same for both.

Before implementing persistence, complete an element/attribute mapping for every profile feature against the pinned AKN schema, including annotations, definitions, table replacements and language-specific effects. Never invent standard tags or claim arbitrary AKN compatibility. Unsupported imports must report exact unsupported constructs and refuse destructive editing; a read-only path is acceptable. Re-export must preserve supported semantics, text, IDs and metadata, though byte-level XML formatting may change.

Project save/open is atomic and portable, including assets and dependency locks. Browser recovery storage is not the sole backup. Preserve Unicode; make round trips testable. Schema/profile changes require explicit versioned migrations on copies; unknown major versions open read-only or fail clearly. Original certified files are never migrated in place.

## 14. Engine service contracts

These are logical interfaces, not a commitment to a programming API:

| Service | Inputs | Outputs |
| --- | --- | --- |
| Load/validate | Project/source + profile | Normalized model + located diagnostics |
| Resolve references | Model + supplied catalogues + date/language policy | Resolved targets/labels + dependency lock + diagnostics |
| Prepare amendment | Target snapshot + structured author intent | Operation + paired instructions + comparison |
| Apply amendments | Principal state + ordered adopted instruments + explicit date | Revised state + provenance or atomic failure |
| Build publication | Sources + locked dependencies + options | Publication model + resolved links + history |
| Render web | Publication model + presentation profile | Accessible static HTML/assets |
| Render print/PDF | Same model + print profile + renderer adapter | PDF, destination map and diagnostics |
| Export catalogue | Certified publication model + destinations | Static discovery/index/target resources |
| Export AKN/project | Model + pinned serialization profile | Validated portable artifacts |

Diagnostics have stable codes, severity, source identity, provision/content location, language, explanation and an optional suggested action. Draft saves permit incomplete material; certified builds fail for structural, reference-dependency, translation, approval-context or amendment-application errors. Editorial preference warnings do not become arbitrary permission gates.

## 15. Editor behaviour

Static application with an outline, structured writing surface and preview. Provide document metadata, parallel/shared-content controls, reference picker, definition editor, ordinary table tools, amendment comparison and history views. No framework choice is implied.

Offer English, Chinese and parallel viewing modes. Follow the selected provision when switching modes; never fake equivalent text through automatic translation. Shared tables are edited once. Preview uses the same engine/presentation contracts as publication. Stale/failed previews retain a clear status and are not mistaken for current output.

Use complete editing commands and undo/redo transactions, not independent mutations of rendered HTML. Enforce published-address constraints at the domain boundary as well as in controls. Paste conversion reports unsupported structure without silently destroying material. Chinese IME composition, keyboard navigation, accessible controls and punctuation fidelity are acceptance requirements.

Open/save/download must work without a connected account. A user can connect catalogues and fetch public targets without uploading drafts. No default telemetry or background draft transmission is needed. Simultaneous multi-user editing and publishing credentials are outside the editor boundary, not hidden requirements of saving a file.

## 16. Web/PDF rendering and publication integration

Use common semantic publication data with separate screen and paged layouts inspired by legislation.gov.uk plain view and legislation PDFs. Include hanging labels, restrained headings, serif print typography, structured contents, accessible bookmarks, running information and controlled page breaks. Do not copy governmental insignia or imply governmental authority.

The publication and PDF adapters run headlessly in GitHub Actions, as approved on 2026-09-11, and remain locally runnable. The future document repository owns that workflow and consumes a pinned engine release. The deployment host receives only static HTML, CSS, assets, PDFs and JSON catalogue resources; it does not execute the rendering engine. Static editor deployment does not require a browser-only final PDF engine. Actual PDF preview embeds the engine output; browser print approximation, if offered, is labelled a proof. An asynchronous Actions PDF proof uses an explicitly submitted source revision and is labelled with that revision. Submitting a draft to a public repository makes it public; no automatic draft upload or browser-embedded credentials is implied. A proof build does not certify or deploy the draft.

Internal PDF links target named destinations; online external references use hosted PDFs and destination hints. Offline bundles may use relative PDF targets; a combined handbook makes inter-document references internal. Cross-file destination support is viewer-dependent and must be tested and documented. A destination/page map can support page-based fallbacks. No guarantee of arbitrary viewer behaviour is made.

Every bilingual source generates three publication variants: separate English and Traditional Chinese documents, plus a landscape parallel document. Parallel print output aligns each provision side by side (English left, Chinese right) and permits continuation over pages; shared tables span both columns once. The two separate PDFs use portrait orientation and include identical shared tables. Font embedding, Chinese glyph coverage, text extraction and screen-reader order are part of verification.

The future publication runner supplies certified sources, dependency snapshots and explicit as-of date, builds HTML/PDF/catalogue together, validates destinations, then makes immutable resources available before updating current pointers. It must rebuild current views when scheduled amendments become effective; a static host does not execute commencement by itself. Failure preserves the last successful publication. Reader pages contain ordinary links and remain usable without the editor or reference API.

## 17. Reproducibility, safety and ownership

Record source/dependency digests, profile/engine/template versions, locale, timezone, fonts, PDF adapter version and explicit build date. Same logical inputs must produce the same semantic document and link map. Byte-identical PDF output additionally depends on normalising generated metadata and renderer behaviour; do not overclaim it.

Load assets through explicit adapters. XML parsing disables external entity/network expansion; imported content and catalogue data cannot execute scripts. Set resource limits for malformed/oversized inputs. Rendering must not read arbitrary local files through author-controlled URLs. No secrets belong in the static editor bundle or public software repository.

Software release version, catalogue protocol version, document profile version and legislative revision are separate concepts. Independent adapters may be replaced without changing document identities or rewriting the corpus. Document rights and software licensing are separate owner decisions; neither is inferred from public visibility.

## 18. Acceptance contract before declaring implementation complete

Conformance fixtures and behaviour checks must cover:

1. Monolingual documents with both formal titles; missing title rejection.
2. Complete body/front matter/Schedule/Appendix structures and trailing prose after nested subdivisions.
3. Stable explicit labels including 5A; duplicate-address errors without automatic renumbering.
4. Parallel provisions, language-only edits, missing translation review, shared table equality across outputs.
5. UK/HK citation wording, local interpretation names and full-title definitions without recursion.
6. Internal/external references, current/original/pinned/draft selectors, missing vs unavailable targets, CORS and cache behaviour.
7. Two same-year amendments to one provision, later substitutions, explicit same-date ordering and atomic conflicts.
8. Exclusion of draft/future effects from current text; bilingual amendment instructions for a bilingual target.
9. Whole-table replacement, no row/cell references and no repeated application of a shared bilingual operation.
10. Historical snapshots, repeal tombstones, superseded vs surviving provenance and PDF history links.
11. AKN/schema validation, semantic save/import/export round trips, safe unsupported imports and migration preservation.
12. Chinese IME, punctuation/literal fidelity, keyboard/screen-reader access, long bilingual pagination and table overflow.
13. Verified PDF destination behaviour in named supported viewers, with documented fallbacks.
14. Engine use without the editor, offline project recovery and publication without a live catalogue after dependencies are locked.

These are requirements for the intended product, not promises to postpone difficult semantics to a vaguely defined later version. Explicit non-goals are per-provision commencement, jurisdictional variants, automatic interpretation of free-form amendment prose, published renumber/move/split/merge, glossary-specific logic and row/cell amendments.

## 19. Sources and design/standard distinction

The application profile combines user requirements with selected legislative conventions. It is not a claim to reproduce every UK or Hong Kong rule.

- [Akoma Ntoso vocabulary](https://docs.oasis-open.org/legaldocml/akn-core/v1.0/akn-core-v1.0-part1-vocabulary.html)
- [CLML user guide](https://legislation.github.io/clml-schema/userguide.html)
- [UK form of a Bill](https://erskinemay.parliament.uk/section/4974/form-of-a-bill/)
- [UK drafting guidance](https://www.gov.uk/government/publications/drafting-bills-for-parliament/2024-03-19-drafting-guidance)
- [Hong Kong drafting publications](https://www.doj.gov.hk/tc/publications/drafting.html)
- [Hong Kong government writing guidance](https://www.csb.gov.hk/tc_chi/publications_stat/publication/files/general_principles_3ed.pdf)
- [Legislation.gov.uk HTML presentation documentation](https://legislation.github.io/data-documentation/formats/html.html)
- [Cross-origin catalogue requirements](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS)
