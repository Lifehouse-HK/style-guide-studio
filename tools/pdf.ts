import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { launchBrowser } from './browser.ts';
import { parseFile } from '../modules/project.ts';
import { render, type Layout } from '../modules/render.ts';
const [input, output, sourceFile] = process.argv.slice(2);
if (!input || !output)
  throw Error('Usage: npm run pdf -- document.json output-directory [source-guide.json]');
const project = parseFile(await readFile(input, 'utf8'));
const doc = project.document,
  source = sourceFile ? parseFile(await readFile(sourceFile, 'utf8')).document : project.source;
if (source && source.type !== 'guide') throw Error('Source must be a principal Guide.');
await mkdir(output, { recursive: true });
const logo =
  'data:image/png;base64,' +
  (
    await readFile(new URL('../assets/branding/lifehouse-hong-kong-stacked.png', import.meta.url))
  ).toString('base64');
const browser = await launchBrowser();
try {
  for (const layout of (doc.mode === 'parallel'
    ? ['en', 'zh', 'parallel']
    : [doc.mode]) as Layout[]) {
    const html = await render(
      doc,
      { layout, logo, pdf: true, catalogues: project.catalogues },
      source,
    );
    await writeFile(join(output, layout + '.html'), html);
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'load' });
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((image) => image.decode()));
    });
    await page.pdf({
      path: resolve(output, layout + '.pdf'),
      preferCSSPageSize: true,
      printBackground: true,
      tagged: true,
      outline: true,
    });
    await page.close();
  }
} finally {
  await browser.close();
}
