# Desktop editor

Run `npm run dev`, then open the printed local URL. `npm run build:editor` emits a static application in `dist/editor`, independently of `npm run build` (headless modules). No account, backend or publication deployment is required.

The editor targets desktop windows, with a compact ribbon and a collapsible outline. One structured document is editable; Publication preview temporarily replaces that canvas with HTML from the common presentation engine. It is not a live paginated PDF editor. Publication typography is still provisional.

## Working with a guide

- File → New guide creates a draft with both formal titles and an English, Traditional Chinese or bilingual content mode. File → Open project accepts `.sg.json` and this application's source-profile AKN XML. Derived/foreign XML is rejected explicitly by the format adapter.
- Select a provision in the outline, then Add provision. Choose its level, location and manual number. Duplicate labels or invalid hierarchy are rejected without changing the document. Draft properties can change a label; imported adopted/withdrawn sources cannot be edited.
- Home formats text and adds paragraphs/quotations. Insert supplies ordinary blocks and tables. Pasting uses plain text with an explicit notice; it does not silently import unsupported formatting or smart punctuation.
- View selects English, Chinese or aligned bilingual writing. Shared tables exist once. Changing content mode retains stored translations; it does not translate missing text.
- Place the cursor in a text block, then Insert reference. Local references use permanent provision IDs. Published guides load from a manually entered catalogue base URL; selected revisions and integrity-checked dependencies are retained. Saved-dependency mode never requests the network. Host tests do not establish real CORS compatibility.
- Review exposes domain diagnostics. Downloading a draft does not approve, certify or publish it. PDF proofs still use the existing headless/Actions path.

## Files and recovery

Download project produces canonical portable `.sg.json`, never editor-native JSON. All unedited supported data survives opening and saving, even where dedicated authoring controls are not yet present. Certified sources remain read-only.

Browser storage is a recovery cache, not durable file storage. Download regularly. The status distinguishes recovery from file download; a download request cannot guarantee that the browser or user retained the file. Storage failure is reported. Unsaved changes trigger navigation protection; replacing a workspace asks before discarding it. Undo/redo is local to the open session and retains up to 80 change groups.

## Remaining qualification

This is an implemented authoring foundation, not a complete U01 or release claim. Dedicated amendment composition, definition management, all front/end-matter and figure controls, full source-origin preview resolution, complete recovery failure handling, Chinese IME and screen-reader tests remain in the implementation plan. The editor has not been qualified on all desktop browsers. The real document repository, deployment and publication design remain separate work.
