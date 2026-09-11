import { test } from 'node:test';
import assert from 'node:assert/strict';
import { specimen } from './fixtures.ts';
import { serialize } from '../modules/document.ts';
import { parseFile, type Workspace } from '../modules/project.ts';
import { importXml, exportXml } from '../modules/xml.ts';
import { saveRecovery, recoveryKey } from '../editor/storage.ts';
test('portable source and XML round trips preserve bilingual fields and reject divergent XML', async () => {
  const w: Workspace = { format: 'lifehouse-workspace/2', document: specimen(), catalogues: [] };
  assert.deepEqual(parseFile(serialize(w)), w);
  const xml = await exportXml(w, 'zh');
  assert.deepEqual(await importXml(xml), w);
  await assert.rejects(importXml(xml.replace('<num>1</num>', '<num>2</num>')), /differs/);
  await assert.rejects(importXml('<!DOCTYPE a>' + xml), /declarations/);
});
test('failed recovery backup cannot overwrite the previous saved project', () => {
  const old = 'previous source bytes';
  let current = old;
  assert.throws(() =>
    saveRecovery(
      {
        getItem: () => current,
        setItem: (key, value) => {
          if (key === recoveryKey + '.previous') throw Error('quota');
          current = value;
        },
      },
      { format: 'lifehouse-workspace/2', document: specimen(), catalogues: [] },
    ),
  );
  assert.equal(current, old);
});
