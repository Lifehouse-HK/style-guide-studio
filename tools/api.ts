import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { parseFile } from '../modules/project.ts';
import { buildPublicationAPI } from '../modules/publication-api.ts';
const [output, baseURL, ...inputs] = process.argv.slice(2);
if (!output || !baseURL || !inputs.length)
  throw Error(
    'Usage: npm run api -- output-directory https://publication.example/ original.json amendment.json …',
  );
const documents = await Promise.all(
  inputs.map(async (path) => parseFile(await readFile(path, 'utf8')).document),
);
const files = await buildPublicationAPI(
  documents.filter((d) => d.type === 'guide'),
  documents.filter((d) => d.type === 'amendment'),
  baseURL,
);
// Write the discovery manifest last. Deploy the output directory atomically.
for (const [path, data] of Object.entries(files).sort(
  ([a], [b]) => Number(a === 'publication.json') - Number(b === 'publication.json'),
)) {
  const target = join(output, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify(data, null, 2) + '\n');
}
console.log(`Built ${Object.keys(files).length} static API files in ${output}.`);
