import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serveFixture, serveAPI } from './publication-fixture.ts';
import {
  resolvePublished,
  fetchPublication,
  buildPublicationAPI,
  publicationBase,
  type Publication,
} from '../modules/publication-api.ts';
import { digest } from '../modules/document.ts';
import { newAmendment, addAction, enactAmendment } from '../modules/amendments.ts';
test('API resolves multiple same-year amendments automatically and excludes future effects', async () => {
  const api = await serveFixture();
  try {
    const source = await resolvePublished(api.baseURL, api.original.id, '2026-09-12');
    assert.equal(source.source.nodes[0].children[0].heading!.en, 'Current amended heading');
    assert.equal(source.source.revision!.instruments.length, 2);
    assert.equal(source.sourceDigest, await digest(source.source));
    assert.equal(
      source.origin.nodes[0].children[0].heading!.en,
      api.original.nodes[0].children[0].heading!.en,
    );
    assert.equal(source.instruments.length, 3);
    assert.equal(source.catalogues[0].documents[0].revision, source.sourceDigest);
    assert.equal((await newAmendment(source.source)).source.digest, source.sourceDigest);
    assert.equal(
      (await resolvePublished(api.baseURL, api.original.id, '2099-01-01')).source.nodes[0]
        .children[0].heading!.en,
      'Future heading',
    );
  } finally {
    await api.close();
  }
});
test('tampered snapshots, missing predecessors and unsupported endpoints fail instead of using original text', async () => {
  const api = await serveFixture();
  try {
    const manifest = api.files['publication.json'] as Publication,
      ref = manifest.guides[0].amendments[0],
      original = api.files[ref.path];
    api.files[ref.path] = { tampered: true };
    await assert.rejects(
      resolvePublished(api.baseURL, api.original.id, '2026-09-12'),
      /fingerprint mismatch/,
    );
    api.files[ref.path] = original;
    manifest.guides[0].amendments.shift();
    await assert.rejects(
      resolvePublished(api.baseURL, api.original.id, '2026-09-12'),
      /exact enacted source/,
    );
    delete api.files['publication.json'];
    await assert.rejects(fetchPublication(api.baseURL), /404/);
  } finally {
    await api.close();
  }
});
test('whole-guide repeal and a future original cannot become amendment sources', async () => {
  const api = await serveFixture();
  try {
    let a = await newAmendment(api.original);
    a.titles = { en: 'Repeal', zh: '廢除' };
    a = await addAction(api.original, a, {
      type: 'repeal-guide',
      target: api.original.id,
      clause: '2',
      subclause: '1',
    });
    a = await enactAmendment(api.original, a, {
      date: '2026-01-02',
      effective: '2026-01-02',
      authority: 'Test',
    });
    Object.assign(
      api.files,
      await buildPublicationAPI([api.original], [a], api.baseURL, '2026-09-12'),
    );
    await assert.rejects(
      resolvePublished(api.baseURL, api.original.id, '2026-09-12'),
      /repealed in full/,
    );
    await assert.rejects(
      resolvePublished(api.baseURL, api.original.id, '2025-01-01'),
      /not yet in effect/,
    );
  } finally {
    await api.close();
  }
});
test('base URL validation and cross-origin fetch failures are reported clearly', async () => {
  for (const value of [
    'file:///tmp/',
    'https://user:password@example.org/',
    'https://example.org/?token=x',
  ])
    assert.throws(() => publicationBase(value));
  const api = await serveAPI();
  await api.close();
  await assert.rejects(fetchPublication(api.baseURL), /Cannot reach/);
});
