# Headless domain and engine

`packages/domain` has no editor or browser imports. `packages/engine` supplies references and amendment replay; `packages/formats` owns project/AKN interchange. Inputs and outputs are plain domain objects. `packages/runtime` owns filesystem effects.

Use `revise(principal, instruments, '2028-01-01')` for an explicit publisher-local as-of date. A principal's manual numbering never changes. `precondition(project, target)` returns a digest of the exact target. Prepare an instrument with `expectedRevision`, explicit predecessor identities, bilingual instructions and operations. `applyInstrument` creates a separate proposed state when requested; `revise` excludes drafts and future instruments.

Operations support whole-provision insertion/omission/substitution, whole-block insertion/omission/substitution and precise text ranges. UTF-16 ranges must also fall on grapheme boundaries. References/defined terms are atomic within text edits. Tables and figures reject ranges. Structural substitution preserves the target identity/kind/label and all existing descendant identities; omissions retain tombstones. Same-date instruments must specify predecessor order. Preconditions validate intermediate states; failed operations never mutate caller inputs.

Timeline replay supports principal repeal, cancellation of still-scheduled instruments and prospective rescheduling with exact date preconditions. It does not revive repealed wording. History records author, source revision, affected target and exact before/after values. Whole-target substitution supersedes earlier contribution markers while preserving history.

`CatalogueClient` accepts an injected text loader. The public protocol comprises `catalogue.json`, per-document indexes and individual target resources with digests. Locked mode never fetches; dependency refresh is explicit. The caller displays catalogue `asOf` and cached status rather than silently treating old data as fresh. A publication resolves all links before rendering; renderers perform no catalogue fetches.

Citation precedence is custom label, local defined document name, formal bilingual title. Definitions themselves request the full formal title. The semantic selector distinguishes original/current/exact/draft; draft references require explicit draft selection. Ordinary prose blocks, tables, rows and cells are not public targets. Schedule-internal references carry a discouragement warning.

Current host tests cover these primitives; they do not establish browser CORS, IME, user recovery or all PDF viewer behaviour. General foreign-AKN conversion, approved-source provenance policy and UI remain outside these host-model claims.
