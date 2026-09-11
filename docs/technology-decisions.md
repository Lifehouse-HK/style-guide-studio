# Current implementation decisions — 2026-09-11

The user authorised implementation, selected MIT and then asked to stop before constructing the editor UI for design discussion. Runtime/storage choices are recorded in ADR 001. The implemented free PDF adapter now uses Chromium/Puppeteer, fontTools and pypdf after WeasyPrint failed long parallel qualification. See [PDF evidence](pdf-qualification.md) and [headless operation](publishing.md). Bilingual publication produces two separate portrait documents and one provision-aligned landscape document. No UI or real corpus repository has been created.

The earlier discussion below is retained as historical rationale; its candidate and “not yet run” statements are superseded by the dated implementation evidence.

# Technology discussion before implementation

Status: approved constraints/runtime decisions and remaining technology recommendations. No application code should be written until this discussion is resolved.

Progress and unresolved decisions are tracked in [IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md), actions D01/D02 and questions Q01–Q04. This document supplies context, not a separate approval or status record.

## Approved decisions — 2026-09-11

The user approved the full architecture and requires all components and the final product to operate comfortably free of charge. This approves the architecture and cost constraint, not the previously proposed technology stack. Prince is excluded from the proposed stack; no trial, paid extension, required cloud service or restrictive hosted quota may be necessary for full functionality.

GitHub Actions is approved for website generation and deployment; the deployed publication site remains completely static. This resolves the publication execution question: authors do not need a local PDF helper for publication. WeasyPrint remains a candidate pending output verification, not a separately approved renderer.

## Repository

Recommend one software repository with independent modules and separate public engine interfaces. Keep the future document/publication collection in a different repository. This decision does not require a framework or package manager.

## Decisions to discuss

| Decision | Candidate recommendation | Alternative / trade-off |
| --- | --- | --- |
| Browser and engine language | TypeScript for shared browser/headless domain logic | Another engine language requires a browser bridge or separate runtime strategy |
| Structured editing | Tiptap's open-source core over ProseMirror with custom structural nodes | Direct ProseMirror gives tighter control but requires more editor infrastructure |
| UI framework | React with a static build | Vue or another static-capable UI is equally compatible with the domain contracts |
| Canonical project storage | Decide through an AKN mapping exercise before committing | Canonical AKN + manifest/shared resources versus a neutral project format with AKN interchange; neither may save only editor-native JSON |
| Final PDF | WeasyPrint is the leading free candidate; selection requires verification | Verify bilingual pagination, accessibility, named destinations and cross-file PDF links; use an open-source finishing adapter only if necessary |
| PDF execution | GitHub Actions runs the headless publication/PDF adapter | Same tooling remains locally runnable as a fallback; no always-on service or author-installed helper is required for publication |
| XML/schema validation | Standards-validating adapter, with final validation available headlessly | Browser validation is useful but must not be confused with mere XML parsing |
| Software licence | Owner decision | Public repository visibility alone is not a licence grant |

The storage choice is substantive. Earlier discussion preferred underlying XML. A shared bilingual table, operation records and reference locks need a project-level container in either approach; do not assume a standalone AKN export is a complete editable project. If XML is canonical, demonstrate lossless representations of these features before building the editor around it.

Only freely usable and appropriately licensed dependencies/features may be required. Tiptap's repository core is MIT-licensed; this does not include a blanket approval of all separately marketed extensions/services. Audit exact packages, fonts and redistribution conditions before selecting them.

## Revised PDF recommendation

WeasyPrint is BSD-licensed and renders HTML/CSS using a Python pagination engine. Its documented PDF features include internal and external links, bookmarks and embedded fonts. These capabilities make it a candidate, not proof of our complete output contract.

Proposed flow: resolved publication model -> print HTML/CSS -> headless WeasyPrint adapter in Actions -> optional PDF finishing -> verified PDF. The finishing step would use a freely licensed PDF library, such as pypdf, only if destination or file-link handling requires it. No promise is made that an annotation library supplies turnkey cross-file navigation or preserves accessibility without verification.

The engine and editor remain separate. The static editor provides live web previews; an exact PDF proof can be generated asynchronously by a non-publishing Actions build from an explicitly submitted draft revision. Proofs identify their source revision and are not live on-keystroke previews. Public-repository draft submissions are public; this decision does not authorise automatically uploading local drafts or embedding GitHub credentials in the editor. Direct editor-to-GitHub authentication is not selected or required: an explicit repository submission can start the workflow.

Before renderer selection, use a bilingual specimen with long tables, shared content, hanging labels, repeat headers, history and cross-document destinations. Measure generation time, memory, setup effort, Unicode extraction, tag/reading-order preservation and behaviour in target PDF viewers. If finishing is required, validate the finished artifact, not only the original renderer output. No benchmark or PDF compatibility test has yet been run.

Actions is the intended publication runtime; the same build commands remain portable for local recovery. The future document repository owns the workflow and consumes a pinned engine release from this software repository. Approved source selection precedes validation, effective-text construction, HTML/PDF/catalogue generation, output verification and static deployment. A draft proof build cannot deploy certified output. Concurrency control prevents an older build overwriting a newer publication.

GitHub documents free standard hosted runner usage for public repositories; larger runners are charged and artifact/cache storage has separate limits. Use standard Linux runners, bounded temporary artifact retention and no paid overage dependency. Future document-repository visibility and deployment host remain to be selected: this decision neither makes drafts public nor selects GitHub Pages. Final published files must persist on the static host, not depend on expiring Actions proof artifacts.

Scheduled rebuilds can apply newly effective amendments, but scheduled Actions may be delayed or disabled after inactivity. Preserve the as-of date visibly, provide manual dispatch/recovery, and do not promise exact-midnight activation from a scheduled workflow. No always-on PDF server is required.

## What follows agreement

1. Record decisions and the verified AKN/nomenclature mappings (D01/D02).
2. Qualify free PDF output and canonical persistence early, and set verification budgets (D03/D04).
3. Implement the domain, persistence, reference and amendment engine (P1/P2).
4. Build common web/print presentation, the production PDF adapter and headless Actions contracts (P3).
5. Build the static editor against the same engine/presentation contracts (P4).
6. Complete integrated conformance, documentation and release-readiness verification (P5).

This ordering is an implementation sequence, not a reduced semantic scope. The architecture's full behavioural contract remains the target.

## References

- [Tiptap schema model](https://tiptap.dev/docs/editor/core-concepts/schema)
- [ProseMirror guide](https://prosemirror.net/docs/guide/)
- [WeasyPrint licence and engine](https://doc.courtbouillon.org/weasyprint/stable/)
- [Tiptap core licence](https://github.com/ueberdosis/tiptap/blob/main/LICENSE.md)
- [pypdf annotation facilities](https://pypdf.readthedocs.io/en/stable/user/adding-pdf-annotations.html)
- [WeasyPrint capabilities](https://doc.courtbouillon.org/weasyprint/stable/api_reference.html)
- [Akoma Ntoso vocabulary](https://docs.oasis-open.org/legaldocml/akn-core/v1.0/akn-core-v1.0-part1-vocabulary.html)

- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [Scheduled Actions behaviour](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
