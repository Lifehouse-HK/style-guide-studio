import { type Project } from '../../../packages/domain/src/index.ts';
import {
  indexSchema,
  catalogueSchema,
  indexRevision,
  makeIndex,
  safeURL,
  type DocumentIndex,
} from '../../../packages/engine/src/references.ts';
import type { Revision } from '../../../packages/engine/src/amendments.ts';
/** Output paths for a local source are virtual; only the HTML preview is exposed. */
export function workspaceIndex(state: Revision): DocumentIndex {
  return makeIndex(
    state.project,
    [
      indexRevision(
        state,
        state.project.stage === 'draft' ? 'draft' : 'original',
        { en: './', 'zh-Hant': './' },
        { en: './', 'zh-Hant': './' },
      ),
    ],
    state.revision,
  );
}
/** Resolve each publisher's relative paths at its own catalogue origin, never at the editor origin. */
export function lockedIndexes(project: Project): DocumentIndex[] {
  const parsed = project.locks.map((lock) => {
    try {
      return { lock, value: JSON.parse(lock.body) };
    } catch {
      return { lock, value: null };
    }
  });
  return parsed.flatMap(({ lock, value }) => {
    const result = indexSchema.safeParse(value);
    if (!result.success) return [];
    const catalogue = parsed.find((item) => {
      const c = catalogueSchema.safeParse(item.value);
      return (
        c.success &&
        c.data.documents.some((d) => d.id === result.data.id && d.index.digest === lock.digest)
      );
    });
    if (!catalogue)
      throw new Error(
        'The saved index is missing its publisher catalogue. Load that source again.',
      );
    const base = new URL('.', catalogue.lock.url).href;
    const index = structuredClone(result.data);
    for (const rev of index.revisions)
      for (const paths of [rev.html, rev.pdf])
        for (const l of ['en', 'zh-Hant', 'parallel'] as const)
          if (paths[l]) paths[l] = safeURL(paths[l], base);
    return [index];
  });
}
