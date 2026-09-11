# Technology discussion before implementation

Status: recommendations for discussion, not selected dependencies. No application code should be written until this discussion is resolved.

Progress and unresolved decisions are tracked in [IMPLEMENTATION_PLAN.md](../IMPLEMENTATION_PLAN.md), actions D01/D02 and questions Q01–Q04. This document supplies context, not a separate approval or status record.

## Approved decisions — 2026-09-11

The user approved the full architecture and requires all components and the final product to operate comfortably free of charge. This approves the architecture and cost constraint, not the previously proposed technology stack. Prince is excluded from the proposed stack; no trial, paid extension, required cloud service or restrictive hosted quota may be necessary for full functionality.

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
| PDF execution | A complete local/headless path on existing hardware, usable by later automation | WeasyPrint requires a Python runtime; browser-only export would require evaluating a different renderer. Hosted preview must be optional |
| XML/schema validation | Standards-validating adapter, with final validation available headlessly | Browser validation is useful but must not be confused with mere XML parsing |
| Software licence | Owner decision | Public repository visibility alone is not a licence grant |

The storage choice is substantive. Earlier discussion preferred underlying XML. A shared bilingual table, operation records and reference locks need a project-level container in either approach; do not assume a standalone AKN export is a complete editable project. If XML is canonical, demonstrate lossless representations of these features before building the editor around it.

Only freely usable and appropriately licensed dependencies/features may be required. Tiptap's repository core is MIT-licensed; this does not include a blanket approval of all separately marketed extensions/services. Audit exact packages, fonts and redistribution conditions before selecting them.

## Revised PDF recommendation

WeasyPrint is BSD-licensed and renders HTML/CSS using a Python pagination engine. Its documented PDF features include internal and external links, bookmarks and embedded fonts. These capabilities make it a candidate, not proof of our complete output contract.

Proposed flow: resolved publication model -> print HTML/CSS -> local WeasyPrint adapter -> optional PDF finishing -> verified PDF. The finishing step would use a freely licensed PDF library, such as pypdf, only if destination or file-link handling requires it. No promise is made that an annotation library supplies turnkey cross-file navigation or preserves accessibility without verification.

The engine and editor remain separate. The static editor provides live web previews; an exact PDF preview uses the actual local/publishing-tool output. A local helper, export-and-generate workflow, or a browser-only renderer must be chosen explicitly. Requiring authors to install a local tool is a usability trade-off still to discuss; the current candidate is not browser-only.

Before renderer selection, use a bilingual specimen with long tables, shared content, hanging labels, repeat headers, history and cross-document destinations. Measure generation time, memory, setup effort, Unicode extraction, tag/reading-order preservation and behaviour in target PDF viewers. If finishing is required, validate the finished artifact, not only the original renderer output. No benchmark or PDF compatibility test has yet been run.

A free local workflow is mandatory. Hosted build allowances are optional accelerators and must not be necessary to keep the product usable. The future public site can serve pre-generated artifacts; no always-on PDF server is required.

## What follows agreement

1. Record decisions and the verified AKN/nomenclature mappings.
2. Define portable schema fixtures and conformance expectations.
3. Implement the domain/engine contracts and format adapters independently of UI.
4. Build the editor against those contracts and the common preview presentation.
5. Integrate and verify the selected PDF adapter.

This ordering is an implementation sequence, not a reduced semantic scope. The architecture's full behavioural contract remains the target.

## References

- [Tiptap schema model](https://tiptap.dev/docs/editor/core-concepts/schema)
- [ProseMirror guide](https://prosemirror.net/docs/guide/)
- [WeasyPrint licence and engine](https://doc.courtbouillon.org/weasyprint/stable/)
- [Tiptap core licence](https://github.com/ueberdosis/tiptap/blob/main/LICENSE.md)
- [pypdf annotation facilities](https://pypdf.readthedocs.io/en/stable/user/adding-pdf-annotations.html)
- [WeasyPrint capabilities](https://doc.courtbouillon.org/weasyprint/stable/api_reference.html)
- [Akoma Ntoso vocabulary](https://docs.oasis-open.org/legaldocml/akn-core/v1.0/akn-core-v1.0-part1-vocabulary.html)
