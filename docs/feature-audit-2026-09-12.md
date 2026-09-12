# Feature audit after definition lists

Audited 2026-09-12 against the current user requirements, the fresh architecture and authoring decisions. Baseline: `4ffa39a` (local; includes the earlier preamble fix). This is a source/behavior audit, not an assertion that the product is release-qualified. It does not reinstate discarded WYSIWYG features or government structures the user removed.

## Completed scope

Local definition lists and a single optional master list are implemented. The master merges definitions with names managed in References, without copying them into editable manual entries. Paired ordering overrides, lowercase `the` handling, persisted formal titles, sorted unnumbered output, inline formatting and bilingual alignment work. JSON and source-profile XML round trips, browser authoring, whole-provision amendment replay and three PDF layouts were verified. See F8 in IMPLEMENTATION_PLAN.md for evidence.

Local lists express their scope through the introductory text supplied by the author; they do not redefine the global reference aliases. Definition entries are not numbered provisions. The master is optional, and deleting it does not delete References data.

## Confirmed defects to address first

| ID | Priority | Finding and evidence | Required outcome |
| --- | --- | --- | --- |
| A1 | High | External reference validation is incomplete. `modules/document.ts:issues` checks some local references but has no catalogue input; external missing targets can pass enactment. A host probe enacted a Guide containing `[[missing-guide#missing-target]]` with zero errors. Closing text, table cells and some front matter also lack comprehensive reference checks. | One validation pass over every reference-bearing field, using saved catalogues, must distinguish unresolved, draft, repealed and valid targets. Enactment and publication builds must enforce the intended policy without blocking ordinary draft saves. |
| A2 | High | References are stored as text tokens. `modules/render.ts:richInline` resolves separately within each formatting run. A probe with bold markup inside a valid local token produced no hyperlink. | Reference identity must survive formatting boundaries. Prefer an atomic editor reference node or an equivalent parser that recognises a complete token across runs, with source-preserving migration. |
| A3 | High | Browser “Print / Save PDF” prints the HTML proof directly (`editor/main.tsx`), whose external URLs target HTML pages. Only `tools/pdf.ts` sets `pdf: true`. | Browser PDF printing must first render PDF-target URLs. Verify both document and provision destinations; viewer support for cross-file fragments remains a separate qualification task. |
| A4 | High | `enactAmendment` validates action effects, labels, titles and dates but does not apply the principal's formula/preamble completeness checks to the amendment instrument. A probe successfully enacted a repeal amendment with an empty paired formula. | Share front-matter validation across principal and amendment enactment, including active bilingual content. The principal's formula must remain protected from amendment. |
| A5 | Medium | Automatic WHEREAS/鑑於 is currently an HTML/PDF rendering feature only. `modules/xml.ts` still emits the raw preamble. A probe confirmed the same project has an opening in HTML and none in the XML projection. | Generate consistent front-matter semantics in all projections, retaining the exact embedded project and a deliberate compatibility policy for existing XML exports. |
| A6 | Medium | A rejected provision save can still clear the form's dirty flag: the parent `onSave` catches a schema error, while `NodeEditor` unconditionally clears `changed` and `onDirty` afterwards. Source inspection; not a fresh browser failure reproduction. | Propagate success/failure explicitly and retain the editable unsaved form after failed validation. |

The first four probes are retained as local QA evidence in ignored `work/feature-audit/probes.ts`; they are diagnostic reproductions of unfixed behavior, not passing regression requirements. A5 is also in that probe. A3 and A6 are source-inspection findings.

## Missing authoring and amendment capabilities

| ID | Priority | Current limit | Next acceptance criterion |
| --- | --- | --- | --- |
| A7 | High | No operation amends the principal's alias registry. The newly generated master entries therefore cannot be inserted, changed or omitted through an enacted amendment. Editing the amendment's own References affects that instrument's reference names, not the principal. | Add checked operations whose generated provisions and principal alias/title/order metadata have the same effect. Preserve historical names and explicitly locate the master definition being amended. |
| A8 | High | No per-definition insertion, omission or substitution. Ordinary definition content can currently be changed by substituting its containing section/subsection, but exact-text operations intentionally exclude definition blocks. | Target stable definition IDs and generate wording such as “in the definition of …”. Handle local/master distinction and generated alias entries without duplicate sources of truth. |
| A9 | Medium | A definition meaning is inline rich text with line breaks. It cannot contain its own structured paragraphs/subparagraphs or table. Some definitions in the user's legislation examples have such branches. | Extend definition content composition while preserving manual child labels and the containing definition's identity; render and amend a definition with (a)/(b) branches correctly. Do not imitate structure using typed spaces. |
| A10 | Medium | Dedicated insertion/omission of selected words is absent. The current exact-text substitution can emulate some results, but always generates repeal/substitute wording. | Add explicit word insertion and omission with exact anchors and appropriate generated formulas if these operations are required for real drafting. |
| A11 | Medium | Other front matter has no amendment targets: formal/long titles and preamble cannot be changed through the current action set. Enacting formula exclusion is intentional. | Specify and implement the permitted metadata/front-matter operations, with generated bilingual wording and immutable originals. Do not make the formula amendable. |
| A12 | Medium | Amendment instruments have generated operative clauses and structured payloads, but no dedicated mechanism for standalone transitional/savings provisions or supplemental amendment Schedules. The decisions document anticipates supported consequential/transitional material; this was not implemented. | Define supported structured material and its relationship to executable effects before exposing it. Keep generated operative prose read-only. |
| A13 | Medium | General references only address provision IDs. Automatic master entries can link to a whole document, but the ordinary reference picker/resolver has no whole-document target. Definition entries also have no public reference anchors. | Add a document target independent of provision IDs. Decide whether definition-specific references are needed; do not turn every term into a numbered provision. |
| A14 | Low | Existing defined names absent from the loaded catalogue cannot be selected from the References dropdown even when their title snapshots are retained. A draft author must reload that catalogue to manage them through the UI. | List saved aliases as well as catalogue documents, permitting offline editing/removal without requiring another network fetch. Preserve saved formal titles explicitly. |

## Output and publication work still outstanding

| ID | Status | Remaining work |
| --- | --- | --- |
| A15 | Presentation decision + implementation | Revision replay retains action provenance, and the renderer has an optional flat history appendix. There are no right-aligned per-provision amendment notes with a linked complete history. The visible treatment of component T remains undecided; the data support is not equivalent to the requested presentation. |
| A16 | Deferred separate repository | The corpus/document-history repository, public reader website, historical views and complete publication build/deploy pipeline do not exist. `tools/api.ts` builds static JSON; the current Pages workflow deploys the editor only. A corpus build must compose revisions with explicit repeal status/history and generate matching HTML/PDF/API assets atomically. |
| A17 | Qualification + decision | Typography is centralised and uses Times New Roman when present; final publication spacing/pagination is not approved. Linux CI fonts, long complex bilingual page breaks and cross-file PDF destinations have not been qualified. Fonts are not bundled and a clean free-of-charge installation needs a documented fallback policy. |
| A18 | Qualification | Browser tests are local scripts; Pages CI runs type checks/unit tests/build, not the browser and PDF stories. Real Chinese IME input and accessibility/keyboard behavior need targeted verification. |
| A19 | Deliberate interchange boundary | XML is a source-preserving Akoma Ntoso projection, not generic AKN/CLML import. Definition output now uses blockList/item/def and validates syntactically, but broader semantic interchange and forward/backward format migration remain unqualified. |
| A20 | Useful follow-up, not an original requirement | No document-wide search or side-by-side before/after amendment comparison. These would materially help editing a large Guide, but are not blockers for the new definition-list feature. |

## Requirements already satisfied or deliberately excluded

- All selected structural levels remain available; body levels below section have no headings. Schedule headings are optional. Manual numbering accepts inserted suffixes and warns without changing draft labels; draft movement preserves identities.
- Both formal titles are required. Bilingual output has separate English/Chinese and aligned landscape views; ordinary tables remain shared, and table rows are not reference targets.
- Whole-document repeal and Part-level insertion/substitution/repeal exist. Same-year amendments are separate instruments; replay applies successive enacted instruments to the revised principal with checked predecessors and whole-instrument dates.
- Enacted renumbering, relocation, splitting and merging remain deliberately unsupported. They should not be reported as regressions or silently reintroduced.
- Chapter, cross-headings, authentication blocks and explanatory memoranda remain excluded by decision. No WYSIWYG page canvas or new visual redesign is proposed.
- Current code and required services can operate free of charge. No paid publishing service is required; document/corpus hosting and deployment are still deferred work, not deployed capabilities.

## Suggested order

Fix A1–A4 before treating enactment or browser PDF output as publication-ready. Implement A7–A8 next so the new definitions and generated document names have a complete amendment lifecycle. Address A5–A6 alongside source-format/form correctness. Then qualify the richer definition content and remaining amendment templates needed by actual drafts. A15 requires a presentation decision; A16 remains the separately scoped publication project. The rest are explicit follow-ups, not authorisation to implement everything during this audit.

## Implementation disposition — 2026-09-12

The tables above preserve the original audit findings. The subsequent user request authorised all follow-ups.

- A1–A14: implemented, with domain/round-trip/browser regression evidence in the implementation plan.
- A15/A20: per-provision history, full authority links, document/action search and amendment comparison implemented.
- A16: static reader/history/PDF/API engine and separate empty corpus repository implemented; deployment is in progress.
- A17–A19: free Linux font policy, browser/PDF CI and explicit XML projection compatibility implemented. Final typography approval, native OS IME/screen-reader qualification and arbitrary third-party PDF viewers remain human/environment qualification boundaries, not missing amendment features. See [qualification policy](qualification.md).
