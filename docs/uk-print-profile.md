# UK legislation print profile

Measured and implemented 2026-09-12. This profile replaces the earlier proof-of-concept spacing. The shared `modules/publication-style.ts` styles both the HTML reader/proof and the print expression. `modules/render.ts` supplies semantic heading/number wrappers and language-aware header text. Browser Print, standalone PDF export and corpus publication consume the same expression; there is no separate set of PDF-only font or indentation rules.

## Official reference PDFs retrieved

- [Budget Responsibility Act 2024 — King's Printer original](https://www.legislation.gov.uk/ukpga/2024/24/pdfs/ukpga_20240024_en.pdf): short Act, title/enacting page, amendment quotations and interpretation list; printed body begins on PDF page 5.
- [Media Act 2024 — King's Printer original](https://www.legislation.gov.uk/ukpga/2024/15/pdfs/ukpga_20240015_en.pdf): long Act, Parts, continuation headers, nested amendments and Schedules; body begins on PDF page 7.
- [Freedom of Information Act 2000 — revised PDF](https://www.legislation.gov.uk/ukpga/2000/36/data.pdf): Times New Roman, centred text column, running headers, definition lists and revision annotations. The retrieved copy was generated 2026-08-11; this live URL may change.

Downloaded source PDFs and measurement/rendering intermediates are in ignored `work/uk-layout/`. They are reference material, not church publication sources or bundled assets. The royal arms, chapter numbers, Crown copyright and commercial cover sheets are not reproduced.

## Measurements and chosen values

All coordinates are PDF points (72 points = 1 inch). Values were read from actual PDF text geometry/fonts and checked against rendered pages.

| Feature | Official specimens | Applied profile |
| --- | --- | --- |
| Paper | A4, 595.28 × 841.89 pt | A4 portrait; bilingual parallel remains A4 landscape |
| Text column | 415.28 pt wide; original x=72–487.28, revised x=90–505.28 | Revised centred column: 90 pt / 31.75 mm side margins |
| Top/bottom area | Originals running title near y=72; revised header near y=37 with additional status lines | 72 pt top/bottom margins; header near y=32; no extra browser URL/date footer |
| Body | Originals Book Antiqua Parliamentary 11 pt; revised Times New Roman 11 pt | Times New Roman 11 pt, free Liberation Serif fallback |
| Leading | Originals about 13.28 pt; revised about 12 pt | 13.28 pt, allowing normal Chinese font fallback line metrics |
| Title | 24 pt regular | 24 pt regular portrait; 20 pt parallel |
| Long title | 12 pt | 12 pt / 14 pt leading |
| Part | Centred label and separate small-cap heading | Separate centred lines; bold small-cap label, regular small-cap title |
| Section | 11 pt bold; original number x=72, heading x=102 | 11 pt bold; 30 pt hanging number gutter; no added full stop |
| Subsection | Original text x=108, number near x=83 | 36 pt text inset, number in a separate 24 pt gutter with 12 pt gap |
| Nested paragraph | Each further text step about 36 pt | 36 pt steps; wrapped text aligns with text, not the number |
| Vertical provision gaps | Original subsection gap about 8 pt; lettered paragraph gap about 2 pt | 8 pt / 2 pt, with heading keep constraints |
| Amendment quotation | Indented text, no decorative vertical rule | Indented structural quotation without the old grey rule |
| Running header | Document title at inner side, page number at outer side | Alternating title/status and outside page number; none on opening page |
| Footer | No recurring centred page number on legislative body pages | Removed old bottom-centred page counter |

Ordinary body paragraphs are justified unless their source explicitly specifies left/centre/right alignment; author formatting is preserved. Meanings remain hanging definition entries. Small caps for WHEREAS and BE IT ENACTED remain; the English enacting paragraph has a two-line drop initial without changing its stored wording. Enacted dates are shown in brackets below the long title. Draft/proposed/repealed status remains visible and is repeated in the running header.

## Practical adaptations and boundaries

- The earlier on-screen contents list now opens from a compact Contents disclosure before the document. Like the revised UK PDF, the printed expression starts with the legislative opening rather than interleaving navigation between the title and long title. Contents navigation is excluded from print; PDF bookmarks and provision destinations remain available. This does not add commercial covers, blank verso pages or preliminary Roman-numbered contents leaves.
- The supplied Lifehouse logo appears once on the opening page. Parallel output has a smaller logo/title and 51 pt side margins with a 30 pt gutter. Indentation is applied inside each language column, never to the whole bilingual row. Shared tables still appear once. Chinese glyphs use the configured local/free serif fallback; English-only headers contain English only.
- Schedules and Appendices start on a new printed page; Parts flow with the body. Quoted Schedules do not force a new page. Group labels/titles stay together and with following content where the browser can satisfy the keep constraints.
- Running headers contain the document title and status/effect/revision date. They do not dynamically name the current Part. Native Chromium supports margin boxes/page counters but does not yet support running named strings in the same way as specialist typesetters. We retain one renderer for browser Print and automated PDF output instead of giving those paths different pagination engines. See [Chrome's print margin documentation](https://developer.chrome.com/blog/print-margins).
- In browser Print, use 100% scale, CSS/default margins and disable the browser's **Headers and footers** setting. The application explains this beside Print; a website cannot force that native preference. The automated adapters explicitly disable those browser-generated headers. The document supplies its own running headers.
- This is a close typographic adaptation, not a facsimile or a promise of identical pagination across proprietary/free font installations. The user’s Times New Roman preference takes priority over copying Book Antiqua Parliamentary from the originals.

## Verification

`tools/check-print-layout.ts` generates long EN/ZH/parallel specimens, compares the editor print expression with renderer output, and checks number placement/column alignment. `tools/check-print-layout.py` inspects actual PDF margins, font size, page-number positions, first-page header suppression and page overflow. The existing real PDF tests still inspect all named destinations, tagged output and the final row of a long bilingual table. The actual Print button/iframe is exercised by the browser feedback story (native dialog intercepted only for automation). Linux CI repeats these checks and retains the generated PDFs.

Release evidence: 42 tests and all browser/PDF checks passed locally and in Linux [run 34697687825](https://github.com/Lifehouse-HK/style-guide-studio/actions/runs/34697687825). Actual Linux output was downloaded and visually inspected. The live editor and corpus both deploy the final engine `299c62f`.
