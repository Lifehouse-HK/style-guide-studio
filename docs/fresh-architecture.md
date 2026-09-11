# Fresh architecture contract

Recorded 2026-09-12. This implementation supersedes all discarded source/configuration and old-format compatibility proposals. Modules and editor share a repository so one change can update their typed contracts together; they remain independent build boundaries. The publication/corpus repository is not part of this application.

## Source and identity

`lifehouse-guide/2` stores principal and amendment documents. A `lifehouse-workspace/2` envelope adds the exact amendment source, optional original source and enacted instruments, and cached reference catalogues. JSON is the canonical authoring format. Objects have permanent IDs unrelated to their visible manually assigned numbers. SHA-256 preconditions use canonical object-key order; array order and text remain significant. Fingerprints detect mismatched snapshots, not authorship or signatures.

The source validates eligible headings and parent/child relationships. Draft numbering remains advisory. Enactment records one date and one effective date for the whole instrument and freezes normal editing. No operation relocates enacted identities. Omitted identities remain tombstones, including within whole-provision substitution, preserving reference history.

Body hierarchy: optional Part / 部 → Division / 分部 → Subdivision / 次分部 → section or draft clause / 條 → subsection / 款 → paragraph / 段 → subparagraph / 節 → exceptional sub-subparagraph / 分節. Intermediate grouping levels are optional. A section may lead directly into paragraphs. Only grouping levels and sections have headings. Schedule / 附表 and Appendix / 附錄 have optional groups and their own numbered paragraph/subparagraph hierarchy; top-level Schedule paragraphs may have headings. Internal Schedule provision labels use contextual UI names to distinguish them from body paragraphs. Prefer references to the Schedule itself.

Front matter contains paired formal titles, editable long title, optional preamble, enacting formula and generated contents. Switching preamble mode preserves the inactive text/list in source. The formula is editable in a draft but is not an amendment target. Tables are ordinary shared blocks; replacing a table replaces it entirely.

## Amendments and revisions

Each action names a target and checks its exact intermediate state. An amendment also checks the whole source snapshot. Generation groups edits to the same section, or the same Schedule, under a manually labelled clause. Multiple changes produce manually labelled subclauses. A repeated noncontiguous group is rejected rather than silently reordering effects. Generated prose cannot be independently edited. Payload authorship remains in the action form.

Later instruments amend the revised principal, not the text of an earlier amending instrument. Revision replay starts from the principal, includes only enacted instruments effective by the requested date, and checks every predecessor. Same-date dependencies follow supplied order. A draft has no legal effect. Revision metadata records incorporated instrument identities. Whole-document repeal is an explicit action and prevents subsequent amendment of that repealed result.

This constrained generator does not support relocating, renumbering, splitting or merging enacted identities, amending an amending instrument, or free-form exceptional operative clauses. Unsupported drafting must not be simulated by unlocking generated text.

## References and outputs

Writers insert `[[#permanent-id]]` for local references or `[[document-id#permanent-id]]` for external references, normally through the picker. `**bold**`, `*italic*`, `__underline__` and backtick literal spans provide basic formatting. All output text is escaped. Text blocks optionally store left/center/right alignment separately by language; omitted alignment means left. Schedule headings are optional; this does not relax required section headings.

The editor fetches only `<base URL>/references.json`, with omitted credentials and a timeout. The host must permit cross-origin requests from the editor. `lifehouse-references/1` contains a documents array; each document carries `id`, paired `titles`, `status`, a `revision` identifier, language-to-URL `html` and `pdf` maps, and `targets` with permanent `id`, paired `label` and `repealed`. See the executable schema in `modules/references.ts`. `publicCatalogue` builds an entry from an enacted source; a future publication build will aggregate these. Drafts are not published by this API.

Cached catalogues are portable project data, explicitly refreshed by loading again. Defined names are document-scoped aliases used by generated references, not substitutions across ordinary prose. Web links use HTML destinations; PDF generation chooses PDF destinations with fragments. Remote PDF fragment navigation depends on the viewer and remains unqualified.

HTML and PDF share one pure renderer and stylesheet. Bilingual rendering produces separate English and Chinese expressions and a landscape parallel proof. Shared tables span both parallel columns. The optional render-history setting is off by default pending the user’s presentation decision. No font files are copied from the host; Times New Roman is requested if installed, with serif fallbacks. Exact Linux output therefore depends on installed fonts.

Akoma Ntoso XML is a projection with a complete embedded source workspace and digest. The importer accepts only an unchanged export of this profile, rejecting entities and divergent XML. It is not a general CLML/Akoma Ntoso converter. Inline authoring markers remain literal text in the XML projection; the HTML/PDF renderer interprets them. OASIS schema validity alone does not certify semantic interchange or archival suitability.

## Storage and publishing

The static browser application requires no server account. Save/Discard applies edits in memory; recovery writes local browser storage, and Download project creates the portable backup. Enacted metadata is a workflow record, not a cryptographic certificate. Publication authority, repository review, canonical URLs and deployment belong to the future corpus build.
