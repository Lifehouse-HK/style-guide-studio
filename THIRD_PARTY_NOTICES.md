# Third-party notices

Our source is MIT. Third-party licences are independent; publication content rights are not assigned by this repository.

- OASIS Open, Akoma Ntoso 1.0 schema (2018), `schemas/akn/akomantoso30.xsd`: CC BY 4.0, whitespace-normalised; attribution/terms retained in its header. Source: https://docs.oasis-open.org/legaldocml/akn-core/v1.0/os/part2-specs/schemas/akomantoso30.xsd
- XML namespace schema, `schemas/akn/xml.xsd`: whitespace-normalised OASIS-distributed W3C dependency; its documentation/attribution retained. Source: https://docs.oasis-open.org/legaldocml/akn-core/v1.0/os/part2-specs/schemas/xml.xsd
- Noto Serif TC variable font: SIL Open Font License 1.1; `assets/fonts/NotoSerifTC-OFL.txt`. Source commit `8e44913e4ff26fc997e6856c1ec40ff4791c98c5` in https://github.com/google/fonts, `ofl/notoseriftc/NotoSerifTC[wght].ttf`. Source-specific subsets are embedded in PDFs; no proprietary OS fonts are required.
- React, Tiptap core, ProseMirror, Zod, Vite, tsx and TypeScript are free dependencies. Exact versions/integrity are in `package-lock.json`; each installed package retains its licence. No Tiptap paid extension is used.
- xmldom is MIT; Puppeteer Apache-2.0; Chromium BSD-style with bundled third-party notices; fontTools MIT; pypdf BSD-3-Clause; lxml BSD-3-Clause (with libxml2/libxslt notices). Exact Python versions are in `requirements.lock`. Chromium is installed from the vendor through Puppeteer, not redistributed as repository source.

The npm metadata inventory is in `docs/dependency-licences.json`; installed packages retain their individual notices. Final distribution notice packaging and CI evidence remain release gates.

- Bootstrap Icons 1.13.1: MIT, copyright The Bootstrap Authors. The official icon font is bundled locally; its licence ships at `licenses/bootstrap-icons.txt` in the static editor. Source: https://icons.getbootstrap.com/
- Times New Roman is selected as an installed system font for editor text and web output. Its font files are not redistributed; systems without it use the configured serif fallback. The PDF adapter retains its separately embedded OFL font.
