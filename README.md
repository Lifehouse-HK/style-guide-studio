# Style Guide Studio

A fresh implementation for Lifehouse Hong Kong’s 夢幻團隊翻譯團隊, restarted on 2026-09-12. The discarded product survives only in Git history. MIT licensed; no paid service is required. The publication/corpus repository remains separate and deferred.

## Editor

The desktop editor uses a fixed viewport with independently scrolling content panes, a structure tree and one editing form. Breadcrumbs and full provision paths in Checks open the relevant item; unheaded child rows show text excerpts. Add and Move dialogs describe the destination; Save and Discard control provision edits. Only eligible structural levels have headings; Schedule headings are optional. Manual numbers, including `1A`, remain editable; Checks reports invalid, duplicate and descending labels without blocking draft saves. Enactment requires complete content and unambiguous public addresses.

Both formal titles are required. Content can be English, Traditional Chinese or bilingual. Long title, optional paragraph/numbered preamble and contingency-editable enacting formula have separate forms. Ordinary tables have optional automatic row numbers; rows are never reference targets. The UI uses sans-serif and locally bundled Bootstrap Icons. Document proofs request Times New Roman, with system serif fallbacks for Chinese. Text blocks support bold, italic, underline and left/centre/right alignment of the cursor paragraph or selected paragraphs, separately per language, with quick hyphen, en dash and em dash buttons.

An enacted source is read-only. Create amendment opens an action workspace: insert, omit or substitute provisions (including Parts); replace headings, selected text or whole tables; or repeal the entire Guide. Operative clauses and their quoted payloads are generated read-only. Reordering actions requires an explicit precondition recheck. The Revised text workspace loads enacted instruments, applies those effective on the selected date, and can start the next amendment against that precise revised principal. Same-date instruments follow their listed order and exact source fingerprints.

Open/Download project uses portable JSON; Download XML creates the source-profile Akoma Ntoso projection. Recovery is local to the browser and does not replace downloaded backups. Existing product files and arbitrary third-party XML are not imported.

## Run and verify

Node.js 22 or later and npm are required. Chromium is installed by Puppeteer; Linux may need its standard system libraries and a Chinese serif font such as Noto Serif CJK.

```sh
npm ci
npm run dev
npm run check
npm test
npm run build
# With the local editor running on port 5173:
npx tsx tools/check-editor.ts
# Export a saved project to PDFs and accompanying HTML:
npm run pdf -- /path/to/project.json /path/to/output
```

`dist/` is the static editor. `build/modules/` contains independent JavaScript modules and declarations, without React dependencies. Bilingual PDF export produces `en.pdf`, `zh.pdf` (portrait) and `parallel.pdf` (landscape, aligned provisions and one shared table). Browser Print is also available in Proof. Bilingual proofs offer English, Chinese and parallel views; monolingual proofs use their document language without a selector. Typography and pagination rules are centralised in `modules/render.ts`.

## Architecture and boundaries

- `modules/document.ts`: strict structural source, identity, numbering diagnostics, draft commands and enactment.
- `modules/amendments.ts`: checked operations, generated clauses, effect dates and revision replay.
- `modules/references.ts`: static catalogue contract, lookup and document-scoped short names.
- `modules/render.ts`: pure HTML rendering; `tools/pdf.ts`: Chromium PDF adapter.
- `modules/project.ts` and `modules/xml.ts`: portable workspace and source-preserving XML projection.
- `editor/`: browser UI and local recovery, consuming the independent modules.

See [the architecture contract](docs/fresh-architecture.md), [confirmed requirements and formula](docs/decisions/002-authoring-profile-and-enactment.md), [implementation evidence and qualification gaps](IMPLEMENTATION_PLAN.md), and [third-party notices](THIRD_PARTY_NOTICES.md).

This is a locally verified replacement, not a qualified publishing service. No upload, deployment, signing service or publication repository is included. XML schema checks establish syntactic validity, not generic Akoma Ntoso interoperability. PDF cross-file destination behavior and clean Linux font metrics still need qualification. Final typography and the visible amendment-history treatment remain design decisions.
