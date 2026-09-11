import { canonical, parseProject, type Project } from '../../../packages/domain/src/index.ts';
export const recoveryKey = 'style-guide-studio.recovery.v1';
interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
/** Preserve the previous bytes before replacing the recovery slot, including unreadable imports. */
export function saveRecovery(storage: StorageAdapter, project: Project): void {
  const value = canonical(project);
  parseProject(value);
  const previous = storage.getItem(recoveryKey);
  if (previous && previous !== value) {
    let key = recoveryKey + '.previous';
    try {
      parseProject(previous);
    } catch {
      key = recoveryKey + '.unreadable';
    }
    storage.setItem(key, previous);
  }
  storage.setItem(recoveryKey, value);
}
