# Desktop editor

Run `npm run dev`, then open the printed local URL. `npm run build:editor` emits a static application in `dist/editor`, independently of `npm run build` (headless modules). No account, backend or publication deployment is required.

The editor targets desktop windows, with a compact ribbon and a collapsible outline. One structured document is editable; Publication preview temporarily replaces that canvas with HTML from the common presentation engine. It is not a live paginated PDF editor. Publication typography is still provisional.

## Working with a guide

- File → New guide creates a draft with both formal titles and an English, Traditional Chinese or bilingual content mode. File → Open project accepts `.sg.json` and this application's source-profile AKN XML. Derived/foreign XML is rejected explicitly by the format adapter.
- Select a provision in the outline, then Add provision. Choose its level, location and manual number. Duplicate labels or invalid hierarchy are rejected without changing the document. Click any number on the writing canvas to open its properties, enter a manual label such as 1A, then Apply number. This works for Parts, Chapters, all numbered provision levels, Schedules and Appendices; stable reference identities and document order are preserved. Cross-headings are unnumbered. imported adopted/withdrawn sources cannot be edited.
- Home formats text and adds paragraphs/quotations. Insert supplies ordinary blocks and tables. Pasting uses plain text with an explicit notice; it does not silently import unsupported formatting or smart punctuation.
- View selects English, Chinese or aligned bilingual writing. Shared tables exist once. Changing content mode retains stored translations; it does not translate missing text.
- Place the cursor in a text block, then Insert reference. Local references use permanent provision IDs. Published guides load from a manually entered catalogue base URL; selected revisions and integrity-checked dependencies are retained. Saved-dependency mode never requests the network. Host tests do not establish real CORS compatibility.
- Review exposes domain diagnostics. Downloading a draft does not approve, certify or publish it. PDF proofs still use the existing headless/Actions path.

## Files and recovery

Download project produces canonical portable `.sg.json`, never editor-native JSON. All unedited supported data survives opening and saving, even where dedicated authoring controls are not yet present. Certified sources remain read-only.

Browser storage is a recovery cache, not durable file storage. Download regularly. The status distinguishes recovery from file download; a download request cannot guarantee that the browser or user retained the file. Storage failure is reported. Unsaved changes trigger navigation protection; replacing a workspace asks before discarding it. Undo/redo is local to the open session and retains up to 80 change groups.

## Remaining qualification

This is an implemented authoring foundation, not a complete U01 or release claim. Remaining acceptance work includes earlier-instrument chains, precise-range and event composition, full nested replacement authoring, reference refresh/custom-selector controls, full recovery-failure scenarios, Chinese IME and screen-reader verification. Implemented extended authoring is described below. The editor has not been qualified on all desktop browsers. The real document repository, deployment and publication design remain separate work.

## Amendments and extended authoring

The Amendments ribbon creates a separate bilingual/monolingual draft from an opened adopted principal. Enter both amendment titles, then choose the target, insert/omit/substitute, manual author-clause number and instructions in each document language. Targets show their structural type and address, including Parts and Schedules. Insert, omit and substitute can operate on a whole Part. Insert a Part with a manual label such as 1A, then add child provisions through subsequent checked operations. Omitting a Part retains tombstones for its descendants; substituting its heading/text preserves its children and identities. Insertion supplies a new provision; substitution can target a whole provision or an existing language/shared block. Shared tables are replaced as a whole. Unchanged descendants and identities remain intact. Every added operation is checked transactionally against the preceding operations in the draft. The writing canvas shows operative instructions and an abbreviated quotation; Publication preview renders the full instrument.

The amendment panel can open the proposed guide through the common rendering engine. That view is explicitly non-effective and omits history annotations; operation instructions remain in the panel. After reopening an amendment, load its principal source again to review it. The principal is not embedded into the amendment file or uploaded anywhere. This UI currently reviews against an original adopted principal plus operations in the open draft; loading a chain of earlier adopted amendment instruments, editing precise text ranges, and scheduled-event composition remain follow-ups. Those headless engine capabilities remain separate from UI availability.

References → Defined names manages paired term/document names and can insert definitions into a selected provision or a term at the cursor. Publisher documents become available after loading their catalogue. Citation display is regenerated from the reference engine; names are never substituted into ordinary typed prose. Source index paths retain the publisher's origin in previews.

Insert also provides embedded PNG/JPEG figures with required alternative text. Recitals can be added from Document details, and trailing parent text from provision properties. Draft blocks and provisions can be removed with Undo available; referenced provisions and amendment author clauses are protected from accidental deletion. Ordinary tables support row/column addition, removal of the last row/column and presentation row numbers.

The recovery writer backs up preceding bytes before replacement, including unreadable recovery data. Browser quota failures leave the previous slot intact and report that a download is needed. This is not a guarantee against browser storage deletion. The workspace replacement prompt offers download/continue/cancel within the editor.

## Typography and icons

Editor text and web publication output prefer Times New Roman, with a Chinese serif fallback. Literal spans remain monospace. The official Bootstrap Icons 1.13.1 icon font is bundled in the static build, so icons need no CDN or account. PDF font embedding remains a separate publication-design setting.
