/** Headless print adapter only. No editor UI or page scripts are executed. */
import puppeteer from 'puppeteer';
import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { atomicWrite } from '../packages/runtime/src/files.ts';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error('HTML input and PDF output required.');
const source = await readFile(input, 'utf8');
if (source.length > 40_000_000) throw new Error('HTML exceeds resource bound.');
const subset = spawnSync(
  resolve(root, '.venv/bin/python'),
  [resolve(root, 'tools/subset_font.py'), input],
  { encoding: 'utf8', timeout: 30_000, maxBuffer: 30_000_000 },
);
if (subset.status !== 0) throw new Error(subset.stderr);
const font = subset.stdout.trim();
const started = performance.now(),
  browser = await puppeteer.launch({ headless: true });
try {
  const page = await browser.newPage();
  await page.setJavaScriptEnabled(false);
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    if (request.url().startsWith('data:')) void request.continue();
    else void request.abort();
  });
  // Embed only the pinned font; all other external requests are blocked.
  const html = source
    .replace("style-src 'unsafe-inline';", "style-src 'unsafe-inline'; font-src data:;")
    .replace(
      '</head>',
      `<style>@font-face{font-family:SGSerif;src:url(data:font/ttf;base64,${font})}body{font-family:SGSerif,serif}</style></head>`,
    );
  await page.setContent(html, { waitUntil: 'load', timeout: 30_000 });
  const pdf = await page.pdf({
    preferCSSPageSize: true,
    printBackground: true,
    tagged: true,
    outline: true,
    timeout: 60_000,
  });
  await atomicWrite(output, pdf);
  console.log(
    JSON.stringify({
      bytes: pdf.length,
      seconds: (performance.now() - started) / 1000,
      browser: await browser.version(),
    }),
  );
} finally {
  await browser.close();
}
