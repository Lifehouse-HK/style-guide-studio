import { translationGuide, provision } from '../fixtures/examples.ts';
import { canonical, parseProject, validate } from '../packages/domain/src/index.ts';
import { revise } from '../packages/engine/src/amendments.ts';
import { preparePublication, renderHTML } from '../packages/presentation/src/index.ts';
const p = translationGuide(100);
p.provisions = Array.from({ length: 1000 }, (_, i) =>
  provision('s' + (i + 1), String(i + 1), 'An exact rule. '.repeat(10), '準確的條文。'.repeat(10)),
);
const measure = async (name: string, f: () => unknown | Promise<unknown>) => {
  const results = [];
  for (let i = 0; i < 3; i++) {
    const started = performance.now();
    await f();
    results.push(Math.round(performance.now() - started));
  }
  return { name, milliseconds: results };
};
const saved = canonical(p),
  state = await revise(p, [], '2026-09-11'),
  pub = preparePublication(state, [], 'https://example.invalid/');
const reports = [];
reports.push(await measure('save', () => canonical(p)));
reports.push(await measure('load', () => parseProject(saved)));
reports.push(await measure('validate', () => validate(p, true)));
reports.push(await measure('parallel HTML', () => renderHTML(pub, 'parallel')));
console.log(
  JSON.stringify(
    {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      provisions: 1000,
      bytes: Buffer.byteLength(saved),
      reports,
    },
    null,
    2,
  ),
);
if (reports.some((r) => r.milliseconds.some((ms) => ms > 2000)))
  throw new Error('Headless representative budget exceeded (2 seconds per operation).');
