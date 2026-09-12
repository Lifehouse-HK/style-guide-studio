import { spawn } from 'node:child_process';
import { mkdir, open } from 'node:fs/promises';
const ready = async () =>
  fetch('http://127.0.0.1:5173/').then(
    (r) => r.ok,
    () => false,
  );
await mkdir('work', { recursive: true });
let server: ReturnType<typeof spawn> | undefined;
if (!(await ready())) {
  const log = await open('work/browser-server.log', 'w');
  server = spawn('npm', ['run', 'dev'], { stdio: ['ignore', log.fd, log.fd] });
  for (let i = 0; i < 60 && !(await ready()); i++) await new Promise((r) => setTimeout(r, 500));
  if (!(await ready())) throw Error('Local editor failed to start.');
}
try {
  for (const file of [
    'check-editor.ts',
    'check-editor-feedback.ts',
    'check-definitions.ts',
    'check-amendment-extensions.ts',
    'check-api-amendment.ts',
  ])
    await new Promise<void>((resolve, reject) => {
      const child = spawn(process.execPath, ['--import', 'tsx', 'tools/' + file], {
        stdio: 'inherit',
      });
      child.on('exit', (code) =>
        code === 0 ? resolve() : reject(Error(file + ' failed: ' + code)),
      );
    });
} finally {
  server?.kill();
}
