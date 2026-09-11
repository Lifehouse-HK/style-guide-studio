# PDF qualification and support evidence

The implemented adapter is **Chromium through Puppeteer**, with fontTools subsetting and pypdf finishing. All are free to use. The original WeasyPrint candidate was not accepted: 68.1 failed long parallel pagination and tagged table output; 70.0 still timed out on the long grid specimen. Those trials did not justify weakening the parallel requirement. The [WeasyPrint changelog](https://doc.courtbouillon.org/weasyprint/latest/changelog.html) was checked before trialling 70.0. Only the selected adapter is now required by `requirements.lock`.

Every bilingual source produces separate portrait English and Traditional Chinese PDFs, plus an A4 landscape parallel PDF. Each provision begins at the same vertical position in its two columns. Longer wording continues across pages; the next provision waits for both languages. Shared tables appear once across the landscape width and are identical in the separate outputs.

## Reproduction and measurements

Run `npm run qualify` after the setup in [publishing](publishing.md). The synthetic specimen has a long paired provision and 150 shared table rows. It intentionally differs in language length.

2026-09-11, macOS 26.6.2, Mac14,9, arm64, 16 GiB RAM, Node 24.12.0, Python 3.14 and Chrome 152.0.7977.75:

| Output | Pages | End-to-end seconds | Bytes |
| --- | --- | --- | --- |
| English portrait | 9 | 6.952 | 390680 |
| Chinese portrait | 8 | 6.790 | 413977 |
| Parallel landscape | 14 | 6.550 | 440728 |

Times include source-specific font preparation and destination finishing. Small later metadata/layout changes may change byte sizes; timings are observations, not guarantees. Initial budgets are under 30 seconds for this specimen and a 120-second per-PDF build timeout. Larger jobs still require stress coverage and runner measurements.

Noto Serif TC is pinned from Google Fonts under OFL. Subsetting includes only actual source code points, avoiding unused cmap aliases that otherwise make Chromium extract Chinese radicals in place of the authored characters. If two authored code points still share an ambiguous glyph, the adapter fails with the code points instead of silently normalising them. Support for those unusual literal specimens remains a font qualification limitation.

pypdf checks final orientation, exact Chinese end markers, English end markers, final table row, internal destination names, bookmarks and retained structure tags. The finisher clones the complete document, converts Chromium’s destination names to string-key destinations and rewrites internal link/outline references consistently. PDF/UA conformance is not claimed.

## Visual and viewer checks

Poppler images of final parallel pages 2 and 6 and Chinese page 1 were inspected: provision columns align, long text continues, the shared table spans both columns and no clipping was observed on those pages. This is sampled visual verification, not an all-pages audit.

Earlier actual macOS Preview internal-link navigation worked on the initial specimen. Plain relative `target.pdf#nameddest=target` instead triggered opening in another app; that is not qualified as offline navigation. The final Chromium-produced PDF opened in Preview with tagged English/Chinese text; the attempted final link activation was interrupted by concurrent user interaction with Preview and has not been recorded as a pass.

| Viewer/mode | Evidence |
| --- | --- |
| Preview, initial internal links | Actual page 1 → 7 and return passed |
| Preview, final finished destinations | File opened; click verification still pending |
| Hosted cross-PDF destinations | URI and named destinations generated; viewer navigation pending |
| Acrobat Reader/browser PDF viewer | Not yet verified |
| Offline bundle / combined handbook | Not implemented or claimed supported |

The complete R02.4 viewer gate remains open. File-opening and destination-hint behaviour must be recorded independently; internal destination dictionaries alone do not prove viewer support.
