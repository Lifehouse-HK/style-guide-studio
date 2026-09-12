# Verification and compatibility

Updated 2026-09-12. This records implementation checks, not approval of final church typography or a claim of universal accessibility/interchange.

## Automated release checks

The Pages workflow uses a clean Ubuntu/Node 24 installation, type checks, the domain test suite, five real Chromium editor stories and actual English/Chinese/parallel PDF generation. PDF checks inspect named destinations, external PDF URLs, tags, portrait/landscape page shapes and the final row of a 70-row shared bilingual table. The additional long print-profile fixtures verify physical margins, font size, alternating page headers and page overflow. QA PDFs and rendered first-page PNGs are retained as the `publication-qa` Actions artifact.

Browser checks cover form editing, keyboard undo, visible formatting, plain-text paste, composition events, Tab leaving the Chinese text editor, draft movement, definition sorting, new amendment operations, supplemental provisions and cross-origin API resolution. Chromium composition events are exercised through its input protocol. A human still needs to qualify the operating system’s chosen Chinese input method and screen-reader workflow; these tests do not emulate an OS candidate-selection window or establish WCAG conformance.

## PDF policy

Typography is centralised in `modules/publication-style.ts`; [the UK print profile](uk-print-profile.md) records the official specimens, measurements and deliberate adaptations. The document requests Times New Roman when available, followed by free Liberation Serif; Chinese uses Noto Serif CJK TC or the local Songti fallback. CI installs Liberation and Noto CJK. Proprietary fonts are not copied or downloaded. Host font substitution can change pagination. Final spacing/font approval remains a user design decision.

The PDF renderer emits destinations even for unheaded provisions and definitions. External PDF links use `#nameddest=...`; internal links use PDF destinations. This follows [Adobe’s named-destination model](https://opensource.adobe.com/dc-acrobat-sdk-docs/library/pdfmark/pdfmark_Actions.html) and [Chromium’s PDF open-parameter parser](https://raw.githubusercontent.com/chromium/chromium/main/chrome/browser/resources/pdf/open_pdf_params_parser.ts). File opening and jumping remain subject to the viewer and its security settings. Verification establishes the actual PDF objects and URLs; it does not certify every viewer. Browser Print renders a dedicated expression with PDF-target links before opening the print dialog.

## Source and XML compatibility

Portable project JSON is authoritative. The XML is an Akoma Ntoso source-preserving projection with the exact project embedded. Projection v2 generates the same preamble openings as HTML/PDF. The importer also accepts unchanged v1 exports (including exports predating the explicit projection version); unsupported versions and altered divergent projections fail clearly. Regression tests cover both versions and rich definitions. Selected English and Chinese specimens validate against the official OASIS schema. This is not generic Akoma Ntoso/CLML import or a promise of semantic compatibility with arbitrary government tooling.

## Publication integrity

Only enacted projects listed in the corpus configuration are published. Revision replay, source hashes, predecessor chains, reference targets and bilingual front matter are checked before output is replaced. Originals and amendments remain immutable source instruments. The publication repository starts empty; local QA specimens are never deployed as real church enactments.
