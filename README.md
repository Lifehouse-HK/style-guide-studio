# Style Guide Studio

A fresh implementation for Lifehouse Hong Kong’s 夢幻團隊翻譯團隊, restarted on 2026-09-12. The discarded product survives only in Git history. MIT licensed; no paid service is required. The publication/corpus repository remains separate and deferred.

## Editor

The desktop editor uses a fixed viewport with independently scrolling content panes, a structure tree and one editing form. Breadcrumbs and full provision paths in Checks open the relevant item; unheaded child rows show text excerpts. Add and Move dialogs describe the destination; Save and Discard control provision edits. Only eligible structural levels have headings; Schedule headings are optional. Manual numbers, including `1A`, remain editable; Checks reports invalid, duplicate and descending labels without blocking draft saves. Enactment requires complete content and unambiguous public addresses.

Both formal titles are required. Content can be English, Traditional Chinese or bilingual. Long title, optional paragraph/numbered preamble and contingency-editable enacting formula have separate forms. Proofs and HTML/PDF output automatically introduce either preamble format with “WHEREAS—” / “鑑於——”; enter only recital text. English “WHEREAS” and “BE IT ENACTED” use small caps. Ordinary tables have optional automatic row numbers; rows are never reference targets. The UI uses sans-serif and locally bundled Bootstrap Icons. Document proofs request Times New Roman, with system serif fallbacks for Chinese. Text blocks support bold, italic, underline and left/centre/right alignment of the cursor paragraph or selected paragraphs, separately per language, with quick hyphen, en dash and em dash buttons. Bold, italic, underline, literal text and paragraph alignment are visible inside the text box while editing; keyboard Undo/Redo works within that field. Newly edited text stores a restricted HTML fragment: asterisks are ordinary characters, and literal `<`/`&` are escaped automatically. Existing unversioned text retains its legacy interpretation until edited.

Definition lists are available in provision content: select **Definition list → Add block**, then **Add term**. Meanings support visible inline formatting; the renderer supplies quotation marks, indentation and final punctuation. Local lists remain independent. One optional **Master definition list** automatically includes the defined document names from References, using saved formal titles. Each entry and each defined document name can have paired **Order by** keys. Sorting is case-insensitive lexical order: lowercase initial `the ` is ignored, capitalised `The` is retained, and an override is used literally. Chinese output uses Unicode lexical order; parallel output uses English order to keep translations aligned. See [definition-list design and limitations](docs/fresh-architecture.md#definition-lists).

An enacted source is read-only. **Create amendment** is available from any workspace: enter the publication API base URL, load the list, choose a Guide and create the draft. The editor automatically fetches the original and enacted amendments, resolves the text effective today in Hong Kong and retains an exact source snapshot. No manual source download or file assembly is required. Later API changes do not silently alter a draft’s source.

The action workspace supports inserting, omitting or substituting provisions (including Parts); replacing headings, selected text or whole tables; and repealing the entire Guide. Operative clauses and quotations are generated read-only. Reordering actions requires an explicit precondition recheck. The older Revised text tab remains a read-only inspection tool for locally held instruments; it no longer creates amendment drafts. See [the publication API contract and build command](docs/publication-api.md).

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

`dist/` is the static editor. `build/modules/` contains independent JavaScript modules and declarations, without React dependencies. Bilingual PDF export produces `en.pdf`, `zh.pdf` (portrait) and `parallel.pdf` (landscape, aligned provisions and one shared table). Browser Print is also available in Proof. Bilingual proofs offer English, Chinese and parallel views; monolingual proofs use their document language without a selector. The supplied Lifehouse Hong Kong stacked logo appears once above the titles on the first page and is embedded in exports. Its unchanged original is tracked in `assets/branding/`. Typography, logo size and pagination rules are centralised in `modules/render.ts`.

## Architecture and boundaries

- `modules/document.ts`: strict structural source, identity, numbering diagnostics, draft commands and enactment.
- `modules/amendments.ts`: checked operations, generated clauses, effect dates and revision replay.
- `modules/references.ts`: static catalogue contract, lookup and document-scoped short names.
- `modules/publication-api.ts`: API discovery, verified source loading and current-text resolution; `tools/api.ts` builds the static endpoints.
- `modules/render.ts`: pure HTML rendering; `tools/pdf.ts`: Chromium PDF adapter.
- `modules/project.ts` and `modules/xml.ts`: portable workspace and source-preserving XML projection.
- `editor/`: browser UI and local recovery, consuming the independent modules.

See [the architecture contract](docs/fresh-architecture.md), [confirmed requirements and formula](docs/decisions/002-authoring-profile-and-enactment.md), [implementation evidence and qualification gaps](IMPLEMENTATION_PLAN.md), and [third-party notices](THIRD_PARTY_NOTICES.md).

This is a locally verified replacement, not a qualified publishing service. The static API builder is included; no signing service or publication repository is included. The editor has a separate GitHub Pages deployment workflow. XML schema checks establish syntactic validity, not generic Akoma Ntoso interoperability. PDF cross-file destination behavior and clean Linux font metrics still need qualification. Final typography and the visible amendment-history treatment remain design decisions.

## GitHub Pages deployment

The editor is deployed by `.github/workflows/pages.yml` to `https://lifehouse-hk.github.io/style-guide-studio/`. Pushes affecting application files on `main` run a clean install, type checks, tests and a production build before uploading only `dist/` to Pages. Pull requests run checks without deploying; documentation-only pushes do not redeploy. The workflow can also be dispatched manually.

The Pages build uses `/style-guide-studio/` as its asset base. This deployment hosts the editor only; publication documents and their API still belong to the future corpus repository. Browser recovery remains local to the origin: work saved at localhost is not automatically present on the Pages domain. Use Download/Open project to transfer existing work.
