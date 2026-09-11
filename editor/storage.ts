import { serialize } from '../modules/document.ts';
import type { Workspace } from '../modules/project.ts';
export { parseFile, type Workspace } from '../modules/project.ts';
export const recoveryKey = 'lifehouse-studio-fresh-v2';
export function saveRecovery(storage: Pick<Storage, 'getItem' | 'setItem'>, workspace: Workspace) {
  const previous = storage.getItem(recoveryKey);
  if (previous !== null) storage.setItem(recoveryKey + '.previous', previous);
  storage.setItem(recoveryKey, serialize(workspace));
}
export function download(name: string, text: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
