# Third-party software

The application is MIT licensed. Direct dependencies are pinned in `package-lock.json`; their original licences remain applicable. No paid hosted service is required.

- React, React DOM, Zod, Vite, TypeScript, tsx, Prettier and Bootstrap Icons use permissive licences (MIT, with TypeScript under Apache-2.0). Bootstrap Icons' MIT notice is distributed at `public/licenses/bootstrap-icons.txt`.
- Puppeteer uses Apache-2.0 and downloads Chromium, whose own licences apply. It is a local command-line/build dependency, not part of the editor JavaScript.
- `@xmldom/xmldom` is MIT licensed.
- Times New Roman and Chinese system fonts are not bundled or redistributed. Documents request installed fonts with serif fallbacks. Install an openly licensed Chinese serif font for unattended Linux builds.

The OASIS Akoma Ntoso schema is an external verification reference, not bundled product code. Research links are retained in the drafting audit.
