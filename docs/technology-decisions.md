# Technology discussion before implementation

Status: recommendations for discussion, not selected dependencies. No application code should be written until this discussion is resolved.

## Repository

Recommend one software repository with independent modules and separate public engine interfaces. Keep the future document/publication collection in a different repository. This decision does not require a framework or package manager.

## Decisions to discuss

| Decision | Candidate recommendation | Alternative / trade-off |
| --- | --- | --- |
| Browser and engine language | TypeScript for shared browser/headless domain logic | Another engine language requires a browser bridge or separate runtime strategy |
| Structured editing | Tiptap's open-source core over ProseMirror with custom structural nodes | Direct ProseMirror gives tighter control but requires more editor infrastructure |
| UI framework | React with a static build | Vue or another static-capable UI is equally compatible with the domain contracts |
| Canonical project storage | Decide through an AKN mapping exercise before committing | Canonical AKN + manifest/shared resources versus a neutral project format with AKN interchange; neither may save only editor-native JSON |
| Final PDF | Evaluate Prince if a commercial dependency is acceptable | WeasyPrint for an open-source stack, with explicit verification of remote PDF links and bilingual pagination |
| PDF execution | Local/headless publishing adapter, usable by later automation | Hosted worker can serve browser previews but introduces operation, privacy and deployment choices |
| XML/schema validation | Standards-validating adapter, with final validation available headlessly | Browser validation is useful but must not be confused with mere XML parsing |
| Software licence | Owner decision | Public repository visibility alone is not a licence grant |

The storage choice is substantive. Earlier discussion preferred underlying XML. A shared bilingual table, operation records and reference locks need a project-level container in either approach; do not assume a standalone AKN export is a complete editable project. If XML is canonical, demonstrate lossless representations of these features before building the editor around it.

No paid editor service, collaboration backend or commercial hosting is implied by these recommendations. Open-source core features must be checked individually; a product's documentation may also list paid capabilities.

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
- [Prince PDF output](https://www.princexml.com/doc/15/prince-output/)
- [WeasyPrint capabilities](https://doc.courtbouillon.org/weasyprint/stable/api_reference.html)
- [Akoma Ntoso vocabulary](https://docs.oasis-open.org/legaldocml/akn-core/v1.0/akn-core-v1.0-part1-vocabulary.html)
