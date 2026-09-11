# SG project profile 1

The canonical `.sg.json` structure is defined by the strict schemas in `packages/domain/src/index.ts`. Unknown major formats and unknown fields are rejected before replacing any open project. IDs are ASCII identifiers, at most 128 characters, unique in the document. Human labels are manually entered alphanumeric strings; source order is authoritative. No case folding, Unicode normalization or punctuation substitution occurs.

The [confirmed authoring decisions](decisions/002-authoring-profile-and-enactment.md) define the target profile and exact enactment formula. Removed legacy structures are documented below for compatibility, not offered for new authoring.

## Conformance limitations

The [government drafting audit](drafting-structure-audit.md) identifies unimplemented corrections: generic headings, Schedule paragraph nesting, deepest-level terminology and whole-document repeal authoring. The table below documents the current projection, not complete drafting-practice conformance.

## Structure and names

| Project element | AKN projection | English / Traditional Chinese |
| --- | --- | --- |
| paired titles | expression `preface/p/docTitle`; both in project extension | formal title / 正式名稱 |
| longTitle | `preface/longTitle/p` | long title / 詳題 |
| recitals | `preamble/p` | recitals / 敘文 |
| formula | `preamble/formula name="enacting"` | adopting formula / 制定程式 |
| part | `part` | Part / 部 |
| chapter | `chapter` | Chapter / 章 |
| division | `division` | Division / 分部 |
| subdivision | `subdivision` | Subdivision / 次分部 |
| crossheading | `crossHeading` | unnumbered cross-heading / 小標題 |
| section | `section` (also inside a Bill expression) | section (adopted), clause (draft) / 條 |
| subsection | `subsection` | subsection / 款 |
| paragraph | `paragraph` | paragraph / 段 |
| subparagraph | `subparagraph` | sub-paragraph / 節 |
| point | `hcontainer name="point"` | deeper numbered point; citation uses full path / 節 (full path) |
| schedule | `hcontainer name="schedule"` | Schedule / 附表 |
| appendix | `hcontainer name="appendix"` | informative Appendix / 附錄 |
| authentication | `conclusions/p` | adoption/authentication / 認證資料 |

Chapter is not an alias of Division. The mapping follows the [HK Department of Justice data dictionary](https://www.elegislation.gov.hk/datagovhk/hkel_data-dictionary_zh-hant.pdf), pp. 7–9. English structural conventions follow [UK Lawmaker guidance](https://help.lawmaker.legislation.gov.uk/help/live/inserting-provisions). These are a church profile, not a claim of UK or HK legal status.

Body sections retain one document-wide numbering scope across groupings. Schedule and Appendix labels have separate scopes. Nested labels are scoped to their numbered parents. Schedule paragraphs run across their grouping headings. Examples: `section 5A(1)(b)`; `第5A(1)(b)條`; `paragraph 2(1) of Schedule 1`; `附表1第2(1)段`. The deepest applicable English noun may be used in full citations. Public references target provisions, preferably the Schedule itself, never prose-block IDs, table rows or cells.

Direct provision text precedes children in `intro`, trailing text follows them in `wrapUp`; a leaf uses `content`. Shared opening content is stored once and projected into each separate expression; the parallel renderer emits it once. A cross-heading has no number or children. Schedules are adopted content; appendices are informative.

## Content and interchange

Prose, quotation, example, note, definition, footnote and bullet blocks project to `p` with a semantic class. Bold/italic/sup/sub use their standard AKN elements; literal spans use `span class="literal"`. Tables use `table/caption/tr/th|td/p`; row numbering is presentation only. Images use `p/img` with supplied PNG/JPEG data and alternative text. Reference values project to `ref` URNs; URL resolution is a publication operation. Definitions, exact selectors, operations, authority, assets and dependency locks remain in the project extension.

AKN `act` represents adopted sources, `bill` draft sources. Both expression exports validate against the whitespace-normalised [OASIS 1.0 schema](https://docs.oasis-open.org/legaldocml/akn-core/v1.0/os/part2-specs/schemas/akomantoso30.xsd). The standard `meta/proprietary` extension contains the canonical project, SHA-256 digest, expression language and explicit export date. This permits exact recovery of shared identity and metadata without inventing AKN vocabulary. Digests detect mismatched data; they do not prove adoption.

Editable AKN import supports this project-preserving profile only. It verifies the digest and re-generated expression before accepting anything. Foreign AKN or independently modified expression XML produces an explicit unsupported-import diagnostic; original bytes must be retained. This prevents silently overwriting XML edits with embedded JSON. General external AKN conversion is not promised. Exported AKN is readable by generic AKN processors, but they need not understand project-specific amendment semantics.

No schema migration exists before version 1. Unknown versions fail safely; future migrations must copy the source and preserve certified original bytes. Atomic filesystem saving is a runtime responsibility, separate from portable serialization.
