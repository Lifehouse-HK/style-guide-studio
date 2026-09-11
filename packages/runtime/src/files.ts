import { open, rename, readFile, unlink, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { parseProject, type Project } from '../../domain/src/index.ts';
import { saveProject } from '../../formats/src/index.ts';
/** Atomic replacement within one filesystem. A failed write leaves the prior file intact. */
export async function atomicWrite(path: string, content: string | Uint8Array): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  const temp = path + '.tmp-' + randomUUID();
  let handle;
  try {
    handle = await open(temp, 'wx', 0o600);
    await handle.writeFile(content);
    await handle.sync();
    await handle.close();
    handle = undefined;
    await rename(temp, path);
  } finally {
    await handle?.close();
    await unlink(temp).catch((e) => {
      if (e.code !== 'ENOENT') throw e;
    });
  }
}
export async function saveDraft(path: string, p: Project): Promise<void> {
  if (p.stage !== 'draft') throw new Error('Only drafts may be edited.');
  try {
    const existing = parseProject(await readFile(path, 'utf8'));
    if (existing.stage !== 'draft')
      throw new Error('Adopted/withdrawn original cannot be overwritten.');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  await atomicWrite(path, saveProject(p));
}
