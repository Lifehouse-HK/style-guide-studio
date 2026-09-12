# Static publication build

`npm run publish:corpus -- /path/to/corpus.json /path/to/generated-output` reads portable project files, validates/replays the enacted instruments, and builds a complete static reader site, original texts, dated revised views, amendment texts, all PDF destinations and JSON API snapshots. Originals remain separate from revised expressions. History notes link to the amending instrument and its clause; a current repeal is visible in HTML, PDF and the API.

The config contains paired `title`, `baseURL`, `editorURL`, and `documents` (paths relative to the config). Optional `asOf` pins a historical build; omission uses today in Hong Kong. All source documents must be enacted; test specimens are not published automatically. A zero-document corpus produces an honest empty publication index.

The adapter renders into a staging directory, and only swaps it into the generated output after every PDF completes. Existing output must contain the generator marker, preventing accidental replacement of an unrelated directory. The complete tree must then be deployed atomically (GitHub Pages does so). The manifest references immutable content-addressed snapshots.

The reader has a searchable index, separate language/PDF links, original and dated versions, and amendment history. Monolingual documents retain their sole content language for all stable catalogue destinations; bilingual documents produce their two expressions plus the aligned landscape version. All displayed documents retain paired title metadata in source. No server or paid service is required.
