# Drafting structure audit and editor reset

Date: 2026-09-11. Status: research and source audit; proposed church profile and implementation requirements, not a claim that the current editor conforms.

The user rejected the WYSIWYG/ribbon authoring design. Functional correctness, predictable forms and accurate legislative structure take precedence over visual novelty. A compact tree, fixed forms and explicit actions are acceptable. No replacement interface is implemented by this audit.

## Government sources

- [UK Office of the Parliamentary Counsel, Drafting Guidance](https://www.gov.uk/government/publications/drafting-bills-for-parliament/2024-03-19-drafting-guidance), official publication updated 4 April 2024: §§3.1, 3.4, 3.6, 3.8, 3.9 and 6.6.
- [Hong Kong Department of Justice, Drafting Legislation in Hong Kong: A Guide to Styles and Practices](https://www.doj.gov.hk/en/publications/pdf/drafting_book_2012_e.pdf), January 2012: §§2.1, 4.1–4.5, 7.2 and 15.4.21. This edition remains linked from the official publications page; it is not presented as a newly revised 2026 edition.
- [Chinese edition, 香港法律草擬文體及實務指引](https://www.doj.gov.hk/tc/publications/pdf/drafting_book_2012_c.pdf), particularly Table 4.1 for Chinese terminology.
- [UK Lawmaker: inserting provisions](https://help.lawmaker.legislation.gov.uk/help/live/inserting-provisions) and [drafting Schedules](https://help.lawmaker.legislation.gov.uk/help/live/drafting-schedules). These document software structure, supplementing rather than replacing drafting guidance.

### Findings to distinguish from our product decisions

UK OPC identifies Part, Chapter, section, Schedule and cross-headings (§6.6). It also explicitly permits internal sub-headings in a subsection for conditions/exceptions (§3.8). That is not a generic title property on every numbered unit. Schedules should be connected to their introducing body provisions (§3.9).

HK requires descriptive clause/section headings; Parts, Divisions and Subdivisions carry headings. Its current-practice guidance discontinues cross-headings (§4.1.21). Ordinary subdivision proceeds through subsections, paragraphs and subparagraphs; deeper subdivision is exceptional. Schedules have deliberately flexible forms, including provisions with or without headings, tables and lists (§7.2). Whole-enactment repeal is expressly covered (§15.4.21).

Chinese Table 4.1 distinguishes 條, 款, 段, 節 and 分節. The current deepest-level display 節 incorrectly repeats the preceding level.

Lawmaker distinguishes schedule paragraphs and schedule subparagraphs, and supports a table as the sole Schedule content. Its context-sensitive insertion is evidence for validating location before offering an action, not a reason to copy its editing surface.

## Proposed church authoring contract

These are deliberately bounded product rules informed by the sources, not assertions that every governmental exception must be prohibited. The existing manual-numbering and shared bilingual skeleton decisions remain authoritative.

| Component/context | Heading field in our editor | Content and structural behaviour |
| --- | --- | --- |
| Document details | Paired formal titles, not a provision heading | Identity, language mode, draft/adopted status and authority |
| Long title | No extra heading | Purpose text; separate from the formal title |
| Recitals/preamble | No per-recital title | Ordered optional background text before adoption formula |
| Adoption formula | No heading | Document-level text before body; never determines effect by itself |
| Part / Chapter / Division / Subdivision | Yes | Manual label and descriptive heading; children, not arbitrary prose boxes. Put operative introductory material in a provision |
| Body section / draft clause | Yes | Manual number; direct text or a structured sequence of subsections; paragraphing may occur in an undivided section |
| Body subsection (1) | No structural title | Text with optional paragraphs |
| Body paragraph (a) | No structural title | Text with optional subparagraphs |
| Body subparagraph (i) | No structural title | Text; exceptional deeper subdivision only when deliberately selected |
| Exceptional deeper unit (A) | No structural title | Distinct type and terminology; Chinese 分節, not another 節 |
| Cross-heading | Heading only | Unnumbered structural signpost, never a numbered subsection title; not offered by default for new common-profile documents |
| Schedule / Appendix | Yes | Manual label, title and ordered content; Schedule has an introducing-body reference. Appendix remains informative by our decision |
| Numbered top-level Schedule provision | Optional, depending on explicit Schedule structure | Distinct from a body paragraph; UK-style paragraph 1 may contain subparagraph (1), then paragraph (a) |
| Descendant of a Schedule provision | No generic title | Context-specific depth and citation names, not the body paragraph ladder reused blindly |
| Ordinary table | Caption optional | One table editor; optional display row numbers; no row/cell reference targets |
| Interpretation definition | Term field, not provision title | Definition content inside an interpretation provision; document aliases remain structured reference data |
| Authentication | No provision heading | Document-level closing record |
| Explanatory material | Separate labelled document area | Informative; must not silently become operative content |
| Generated contents/history | Not author-editable text | Derived from structure and events; heading eligibility and contents inclusion are separate rules |

Internal text sub-headings, if needed, require a distinct content element with no provision identity/number/title semantics. They are not enabled by restoring the generic heading field. Missing required fields may be saved in a draft, but certification must reject them. Existing unsupported headings must be reported and preserved for explicit repair, never silently discarded on import.

The common bilingual skeleton cannot switch hierarchy when changing displayed language. Use Parts and sections as the common default. Keep Chapter and HK Division/Subdivision as distinct optional structures, not one forced Part → Chapter → Division ladder or translations of each other. Preserve existing cross-headings for inspection and amendment. Extending authoring to those structures must specify a permitted parent/child rule and contextual citations centrally.

Schedule content may be just the shared glossary table. A second structured mode accommodates numbered Schedule provisions where necessary; the user's preference for Schedule-level references remains a warning policy, never a ban. Supporting arbitrary governmental Schedule forms is not required to support this church use case.

## Current implementation discrepancies

| Finding | Evidence in source | Required correction |
| --- | --- | --- |
| Every provision accepts a heading | `Provision` / `provisionSchema` and `validate` in domain; generic heading input in editor | Shared context-aware capability rules for fields, child types and labels; enforce in commands and certification |
| Every numbered level renders as an HTML heading | Generic `h1`–`h6` construction in presentation | Render subordinate numbers with their text; reserve semantic headings for actual headings; audit PDF bookmarks and contents too |
| Schedule paragraph nesting is wrong | Domain `paragraph → subparagraph → point`; no schedule-subparagraph type/context | Represent Schedule addressing explicitly; update references, AKN projection, authoring and rendering together |
| Groupings accept arbitrary prose | Shared content/tail fields on every node | Authoring rules distinguish grouping from provision; preserve legacy source while diagnosing unsupported content |
| Heading-only amendments lack a dedicated target | Operation target lookup accepts provisions/blocks | Add typed heading targeting, not whole-subtree replacement merely to edit a heading |
| Exceptional depth is misnamed | Chinese `point` label and profile table | Correct to 分節 with verified contextual citation fixtures |
| Whole-document repeal is not a usable editor feature | Schema event and timeline replay exist; composer only adds operations | Add explicit repeal action, operative clause association and proposed-event evaluation |

## Whole-document repeal contract

“Repeal this Guide” targets the document identity, including its Schedules. It is an operation authorised by a separate instrument, not deletion of a file or manual setting of the principal's status. It uses the repealing instrument's one effective date; no per-provision dates are introduced. A bilingual target requires a bilingual repealing instrument and paired operative wording.

Preserve adopted originals and pre-repeal revisions. On and after commencement, catalogue resources and web/PDF views must clearly identify the repeal, its date and authority. Historical links must still resolve; references into the document inherit its repealed status. Do not make a historical text appear currently operative. Repeal of an amending instrument must never implicitly undo its earlier amendments. Cancellation before commencement and draft withdrawal remain different actions.

Existing engine evidence is narrower: `revise` applies `repeal-document`, records history and sets revision state; subsequent amendment is rejected. `applyInstrument`, used by the draft proposed view, does not process document events. The current event schema lacks author-clause and paired-instruction linkage. Repeal of an amending instrument as an independently published document also needs explicit coverage; the current event branch targets the principal only.

On 2026-09-11 all eight amendment tests passed, including a new regression for before/on-date repeal, retained source/history, stale precondition rejection, later amendment rejection and draft non-effect. This is headless engine evidence, not complete authoring, proposal, catalogue or PDF qualification.

## Rebuild order and acceptance

1. Define shared structural capabilities and a safe compatibility policy for existing drafts/AKN; fix body/Schedule distinctions and heading semantics in the model, references and renderer.
2. Add domain fixtures proving invalid subsection titles are diagnosed, valid Schedule structures round-trip, and bilingual expressions retain the same hierarchy.
3. Complete document repeal from paired authoring clause through proposed event, adopted replay, historical references and all three output variants.
4. Replace the canvas with a tree and one fixed detail form per selected item. Separate text editing from structure changes; each insertion names its exact parent and before/after position. Actions appear only where valid.
5. Verify ordinary author workflows against these rules before spending time on visual refinement. Existing documents are evidence to migrate/repair, not disposable test data.

No new product code or replacement UI was implemented in this audit. These corrections are prerequisites for the rebuild, not completed acceptance claims.
