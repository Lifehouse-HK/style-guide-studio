# ADR 001: free runtime and canonical projects

Accepted for implementation under the user's instruction to proceed through all stages on 2026-09-11. The user explicitly selected MIT for software licensing.

- TypeScript domain/engine shared by a React static editor and a headless Node runner; npm lockfile, Vite static build, free Tiptap core.
- Canonical `.sg.json` project is a versioned domain format, not editor JSON. One provision graph carries paired language content; shared objects exist once. An editor's text-document representation is an adapter only.
- Standalone AKN language expressions are derived, validated interchange artifacts. AKN does not alone preserve project-only approval records, operation preconditions, shared-object ownership or dependency locks. These remain in the canonical project; exports carry an explicit source-project digest rather than pretending AKN is a complete editable project.
- Structured operations, not generated prose, supply amendment effects. Only insert, omit and substitute; tables are atomic.
- WeasyPrint was the initial qualification candidate. Long parallel tests failed; the implemented adapter is Chromium/Puppeteer with fontTools and pypdf. PDF finishing preserves document tags and named destinations. The full viewer matrix remains an acceptance gate.
- Standard GitHub Actions runners execute publication. The identical tool can run locally; neither a paid service nor per-author local installation is required by the publishing design.
- MIT applies to our software, not third-party schemas/fonts or future church publications. Preserve upstream notices and record exact dependency licences.

No actual church documents or deferred corpus repository are created by this decision.
