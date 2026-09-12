/** Measured against legislation.gov.uk originals and revised PDFs; see docs/uk-print-profile.md. */
export const printProfile = {
  bodySize: 11,
  leading: 13.28,
  portraitSide: 90,
  verticalMargin: 72,
  indent: 36,
  headingNumberWidth: 30,
  titleSize: 24,
  parallelSide: 51,
  parallelGutter: 30,
} as const;
const serif = '"Times New Roman","Liberation Serif","Noto Serif CJK TC","Songti TC",serif';
export const stylesheet = `
*{box-sizing:border-box}
body{width:100%;max-width:595.28pt;margin:24px auto;padding:${printProfile.verticalMargin}pt ${printProfile.portraitSide}pt;background:white;color:#111;font-family:${serif};font-size:${printProfile.bodySize}pt;line-height:${printProfile.leading}pt;text-align:justify}
body.parallel{max-width:841.89pt;padding:${printProfile.parallelSide}pt}
p{margin:0 0 2pt;orphans:2;widows:2}
h1,h2,h3{break-inside:avoid;font-family:inherit;break-after:avoid;orphans:2;widows:2}
h1{font-size:${printProfile.titleSize}pt;line-height:28pt;font-weight:normal;text-align:center;margin:0 0 22pt}
h2{font-size:${printProfile.bodySize}pt;line-height:14pt;font-weight:normal;text-align:center;margin:22pt 0 12pt}
h3{font-size:${printProfile.bodySize}pt;line-height:${printProfile.leading}pt;font-weight:bold;text-align:left;margin:18pt 0 8pt calc(var(--heading-indent,0pt) + 30pt)}
.section-number{display:inline-block;width:30pt;margin-left:-30pt;vertical-align:top}
.group-label{display:block;font-weight:bold;font-variant-caps:small-caps;margin-bottom:12pt}
.group-title{display:block;font-variant-caps:small-caps}
.provision-heading{break-inside:avoid;break-after:avoid}.document-heading{break-inside:avoid}.publication-logo{display:block;width:150pt;height:auto;max-width:100%;margin:0 auto 18pt}
.parallel .publication-logo{width:120pt;margin-bottom:12pt}.parallel h1{font-size:20pt;line-height:24pt;margin-bottom:16pt}
.small-caps{font-variant-caps:small-caps}.preamble-intro{break-after:avoid}
.status{font-family:inherit;font-size:9pt;line-height:11pt;text-align:center;margin:0 0 18pt}
.long-title{font-size:12pt;line-height:14pt;margin:0 0 8pt}.enactment-date{text-align:right;font-size:${printProfile.bodySize}pt;margin:0 0 18pt}
.preamble{margin:12pt 0}.preamble p{margin-bottom:8pt}.enacting{margin:18pt 0 24pt}.enacting p{margin:0}
.enacting p:lang(en)::first-letter{float:left;font-size:33pt;line-height:26pt;margin:0 3pt 0 0}
.pair{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);column-gap:${printProfile.parallelGutter}pt}.pair>*{min-width:0}
.clause,.group,.children{margin:0}.section,.scheduleParagraph{margin-top:18pt}
.provision-text{margin-left:var(--text-indent,${printProfile.indent}pt)}.provision-text + .provision-text{margin-top:8pt}
.number{float:left;width:24pt;margin-left:-${printProfile.indent}pt;margin-right:12pt;text-align:right;white-space:nowrap;font-weight:normal}
.numbered-line{position:relative}.subsection + .subsection,.subparagraph + .subparagraph{margin-top:8pt}
.paragraph + .paragraph,.subsubparagraph + .subsubparagraph{margin-top:2pt}
.definitions{margin:2pt 0 8pt}.definition-entry{margin:2pt 0 0 calc(var(--text-indent,${printProfile.indent}pt) + ${printProfile.indent}pt);padding-left:18pt;text-indent:-18pt;break-inside:avoid}.definition-entry p{margin:0}
.definition-branches{margin:0}.definition-branches .closing{margin-left:calc(var(--text-indent,${printProfile.indent}pt) + ${printProfile.indent}pt)}
.closing{margin-left:var(--text-indent,${printProfile.indent}pt);margin-top:2pt}
blockquote{margin:8pt 0 8pt ${printProfile.indent}pt;padding:0;border:0}.amendment-quotation{margin-left:0}.amendment-quotation>table{width:calc(100% - ${printProfile.indent}pt);margin-left:${printProfile.indent}pt}.amendment-quotation h3{margin-top:8pt}
.note{font-size:9pt;line-height:11pt}.muted{color:#444}
table{width:100%;border-collapse:collapse;margin:8pt 0;font-size:${printProfile.bodySize}pt;line-height:${printProfile.leading}pt;table-layout:fixed;text-align:left}
th,td{border:0.5pt solid #777;padding:4pt 6pt;vertical-align:top;overflow-wrap:anywhere}th{font-weight:bold}
caption{text-align:left;font-weight:normal;font-variant-caps:small-caps;margin-bottom:6pt;break-after:avoid}thead{display:table-header-group}.row-number{width:30pt}tr{break-inside:avoid}.shared{grid-column:1/-1}
a{color:#134f80;text-decoration:none}a:hover,a:focus{text-decoration:underline}code{font-family:monospace;font-size:.9em}u{text-decoration:underline}.warning{color:#8c2a15}
.contents{font-size:${printProfile.bodySize}pt;text-align:left;margin:0 0 24pt;padding:0 0 12pt;border-bottom:.5pt solid #777}
.contents summary{cursor:pointer;font-variant-caps:small-caps;text-align:center}.contents ul{list-style:none;margin:12pt 0 0;padding:0}.contents li{margin:2pt 0}
.contents .toc-group{margin-top:12pt;text-align:center;font-variant-caps:small-caps}.contents .toc-number{display:inline-block;min-width:30pt}.contents a{color:inherit}
.amendment-note{text-align:right;font-size:9pt;line-height:11pt;margin:4pt 0;color:#444}.history{font-size:9pt;line-height:11pt;border-top:.5pt solid #777;margin-top:24pt}.history h2{text-align:left}
@media print{
 body,body.parallel{margin:0;padding:0;max-width:none;width:auto}
 a{color:inherit;text-decoration:none}.contents,.no-print{display:none}
 .schedule,.appendix{break-before:page}.amendment-quotation .schedule,.amendment-quotation .appendix{break-before:auto}
}
`;
/** CSS string escaping is separate from HTML escaping, including closing style tags. */
const cssString = (text: string) =>
  '"' + text.replace(/[\\"\n\r\f<>]/g, (c) => '\\' + c.codePointAt(0)!.toString(16) + ' ') + '"';
/** Native margin boxes keep browser Print and the unattended PDF adapter identical. */
export function pageStyles(layout: 'en' | 'zh' | 'parallel', title: string, status: string) {
  const side = layout === 'parallel' ? printProfile.parallelSide : printProfile.portraitSide;
  const heading = cssString(title + (status ? '\n' + status : ''));
  return `
@page{size:A4${layout === 'parallel' ? ' landscape' : ''};margin:${printProfile.verticalMargin}pt ${side}pt;font-family:${serif};
 @top-left{content:${heading};font-size:8pt;line-height:10pt;font-style:${layout === 'en' ? 'italic' : 'normal'};text-align:left;vertical-align:top;padding-top:32pt;padding-right:24pt;white-space:pre-line}
 @top-right{content:counter(page);font-size:11pt;text-align:right;vertical-align:top;padding-top:32pt;width:24pt}
}
@page :left{
 @top-left{content:counter(page);font-size:11pt;font-style:normal;text-align:left;width:24pt;padding-right:0}
 @top-right{content:${heading};font-size:8pt;line-height:10pt;font-style:${layout === 'en' ? 'italic' : 'normal'};text-align:right;width:auto;padding-left:24pt;white-space:pre-line}
}
@page :first{@top-left{content:none}@top-right{content:none}}
`;
}
