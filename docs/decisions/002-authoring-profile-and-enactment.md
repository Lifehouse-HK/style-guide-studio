# Authoring profile, enactment formula and generated amendments

Recorded: 2026-09-12. Status: user decisions and rebuild requirements; implementation is pending. This supersedes conflicting proposals in the 2026-09-11 drafting audit and earlier ribbon/editor documentation.

## Enacting authority and default formula

The enacting body is the Translation Team of the Dream Team of Lifehouse Hong Kong. Dream Team is 夢幻團隊; God is 神. Do not name individual pastors or invent pastoral/council consent requirements.

English:

> To the glory of God and for the building up of His Church, BE IT ENACTED by the Translation Team of the Dream Team of Lifehouse Hong Kong as follows:—

Traditional Chinese:

> 為榮耀神、建立祂的教會，香港生命堂夢幻團隊翻譯團隊現制定本指引如下：——

Prefill new principal Guides and generated amendment instruments with these respective texts. Allow explicit editing while drafting for contingency. Once enacted, the principal's enacting formula is not an amendment target. An amendment instrument has its own formula; editing that draft formula does not modify the principal's formula. Whole-document repeal remains possible.

Use enact/enacted/enactment in product language, not adopt/adopted/adoption. Existing stored `adopted`/`adoption` fields require an explicit compatibility/migration strategy; this documentation does not claim the code has been renamed. Removing the authentication document component does not remove the enactment authority/date, effective date or source-certification metadata needed for reliable publication.

## Selected structures and components

Remove Chapter (B) and Cross-heading (E) from new authoring. Retain Part / 部, Division / 分部, Subdivision / 次分部, Section or draft Clause / 條, Subsection / 款, Paragraph / 段, Subparagraph / 節, exceptional Sub-subparagraph / 分節, Schedule / 附表, and informative Appendix / 附錄. Groupings are optional; the permitted grouping path is Part → Division → Subdivision, followed by sections. Do not require every intermediate grouping in short documents.

Section/clause headings and grouping/Schedule/Appendix headings remain; subordinate body provisions have no structural heading field. Schedule provision structure stays context-specific as described in the audit. Preserve existing removed structures on import and diagnose them for explicit draft repair; never silently delete or relabel source material.

Remove Authentication / adoption record (R) and Explanatory memorandum/note (S) as document components. Retain paired formal titles (M), long title (N), preamble/recitals (O), enacting formula (P) and generated contents (Q). T, generated amendment history, is explained below; the user has requested explanation and has not yet expressly decided to retain or remove its visible presentation.

Long title defaults to the English prefix “A Style Guide to”; the complete text, including that prefix, remains editable. Do not mechanically translate or replace the Chinese long title. Maintain the existing paired-language authoring rules.

The optional preamble has two modes: one paragraph, or an automatically numbered list of recital items. A bilingual list shares item order and displayed numbers, with paired item text. Recital numbers are generated presentation, not manually numbered provisions or public reference targets. Mode changes must preview how text is retained; never silently flatten or discard items. There is no automatic WHEREAS prefix imposed on every item unless separately selected.

## Manual numbering and draft organisation

All structural provision numbers remain manually controlled, including amendment clause labels. Detect inappropriate label forms, duplicates and descending/out-of-order labels, and display non-blocking draft diagnostics beside the affected items and in Checks. Allow the entered value and draft save; do not reject a keystroke, prevent insertion/movement, silently repair or renumber. The earlier duplicate-rejection editor behaviour must change.

Check numbering within the correct scope: body section order continues across Parts; subsection numbers restart within their section; Schedule/Appendix numbering has separate scopes; internal Schedule numbering uses its own context. Compare numeric and inserted-letter labels structurally, not lexicographically: 9 precedes 10; 5 precedes 5A, which precedes 6. Use a defined comparison policy per level, including alphabetic and Roman forms. Gaps are not automatically errors. An ambiguous or unsupported label must yield a diagnostic rather than a guessed correction.

Let users freely reorder sections in an editable principal draft, including moving between permitted grouping containers. Move the subtree intact; preserve IDs, labels, text, translations, tables and reference targets. Offer explicit Move before/after/into controls; drag-and-drop is optional. A move may create a numbering warning but must not be blocked for that reason. Invalid parent kinds remain a structural constraint. Enacted sources remain immutable; no amendment operation may relocate an existing enacted provision.

Non-blocking drafting does not mean silently publishing ambiguous reference addresses. The final certification policy must distinguish numbering-order advice from structural/reference validity. Keep stable IDs as reference identity. Exact handling of duplicate public addresses is a publication-integrity decision, not justification to block draft input.

## Amendment authoring and generation

Amendments remain separately identified, versioned instruments in storage and publication, but their editor is an action workspace rather than a normal editable document. Select the source and target, choose an operation, enter its payload and review the proposed effect. Generated operative headings, instructions, citations and quotations are read-only. Fix an action or its payload to change the generated provision; there is no editable copy that can diverge from executable effects.

Document titles, enactment metadata, draft enacting formula and explicit manual clause-number assignments are structured settings. An assigned clause label can change through its setting without making the generated clause body editable. Preserve stable action/clause associations as actions are added or removed. Generated quotations contain the user-authored replacement/new content; they do not accept separate edits in the instrument preview.

The [HK DoJ English guide](https://www.doj.gov.hk/en/publications/pdf/drafting_book_2012_e.pdf), Chapter 14 (§14.3), supplies arrangement principles; Chapter 15 supplies operative formulas, introductory amendment clauses, headings, insertions, substitutions and repeals. The corresponding [Chinese edition](https://www.doj.gov.hk/tc/publications/pdf/drafting_book_2012_c.pdf) is the wording reference for the Chinese output. In particular, ordinarily group changes by target section, use one clause for that section and one subclause per individual change, and follow target order. Whole-Part/Schedule actions need their corresponding templates. Our profile omits the explanatory memorandum and signatures removed by the user.

Required generated sequence: long title; enacting formula; citation/commencement provision from document settings; introducing amendment provision where applicable; operative changes; any explicitly supported consequential/transitional material; Schedules where needed. A repeal-only instrument may use the source's standalone repeal form rather than a redundant introductory amendment clause. Do not invent a church equivalent of a government chapter number.

Operations use exact intermediate preconditions. Grouping/ordering for publication must never silently reorder executable dependencies. If actions on newly inserted material or other dependencies conflict with normal drafting order, show the conflict and require a supported action arrangement before certification; saving an incomplete draft remains possible. Unsupported exceptional drafting must be identified, not handled by unlocking generated operative prose.

Specific generation acceptance: two edits to section 5 produce a single headed amending clause with two unheaded subclauses; an inserted Part carries its full structured payload; a table substitution quotes the whole table; whole-document repeal generates paired operative text linked to its event. Editing an action updates both expressions and the proposed result consistently. No generated instruction claims an effect absent from the operation model.

## What T means: generated amendment history

T is editorial information explaining which enacted instruments changed a Guide, when each change took effect, and what provision authorised it. It is generated from recorded actions, not a numbered part of the Guide or manually authored operative wording.

Example display: “Section 5 — amended by the 2027 Amendment Guide, section 3; further amended by the 2028 Amendment Guide, section 2.” Each entry links to its authority. A current-text note can show the latest change and open full history, preserving earlier changes even when their wording has been superseded. Whole-document repeal similarly shows date and authority. Historical views include only events applicable to that view.

Underlying provenance is necessary for reliable revision and reference handling whether or not the visible history panel/printed appendix is retained. The latter remains a presentation choice for the user; explaining T does not silently approve it.

## Implementation boundary

This is a recorded design decision, not completed functionality. Required work spans domain validation, draft editing commands, schema compatibility, reference ordering, amendment generation, enactment/event handling, rendering and the replacement forms. Do not apply these changes as isolated additions to the rejected WYSIWYG canvas. P4 is still the active phase.
