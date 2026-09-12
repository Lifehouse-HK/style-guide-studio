import { DOMParser } from '@xmldom/xmldom';
export type Mark = 'strong' | 'em' | 'u' | 'code';
export type Run = { text: string; marks: Mark[] };
export const escapeText = (s: string) =>
  s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
/** Small XML-compatible HTML subset; no attributes, scripts or arbitrary elements. */
export function parseRich(text: string): Run[] {
  if (/<!|<\?/i.test(text)) throw Error('Declarations are not allowed in formatted text.');
  const doc = new DOMParser({
    onError: () => {
      throw Error('Invalid formatted text.');
    },
  }).parseFromString('<root>' + text + '</root>', 'application/xml');
  const result: Run[] = [];
  type SourceNode = {
    nodeType: number;
    nodeValue: string | null;
    nodeName: string;
    attributes?: { length: number };
    firstChild: SourceNode | null;
    nextSibling: SourceNode | null;
  };
  function visit(node: SourceNode, marks: Mark[]) {
    if (node.nodeType === 3) {
      result.push({ text: node.nodeValue ?? '', marks });
      return;
    }
    if (
      node.nodeType !== 1 ||
      !['strong', 'em', 'u', 'code'].includes(node.nodeName) ||
      node.attributes?.length
    )
      throw Error('Only strong, em, u and code tags without attributes are allowed.');
    for (let child = node.firstChild; child; child = child.nextSibling)
      visit(child, [...marks, node.nodeName as Mark]);
  }
  for (let child = doc.documentElement!.firstChild; child; child = child.nextSibling)
    visit(child, []);
  return result;
}
export const serializeRich = (runs: Run[]) =>
  runs
    .map((run) =>
      run.text
        .split('\n')
        .map((line) =>
          run.marks.reduceRight((text, mark) => `<${mark}>${text}</${mark}>`, escapeText(line)),
        )
        .join('\n'),
    )
    .join('');
export const richPlain = (text: string) =>
  parseRich(text)
    .map((r) => r.text)
    .join('');
/** Existing unversioned block text keeps its old interpretation until edited. */
export function legacyRuns(text: string): Run[] {
  const result: Run[] = [];
  let at = 0;
  for (const m of text.matchAll(/\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`|__([^_]+)__/g)) {
    if (m.index! > at) result.push({ text: text.slice(at, m.index), marks: [] });
    result.push({
      text: m[1] ?? m[2] ?? m[3] ?? m[4],
      marks: [m[1] ? 'strong' : m[2] ? 'em' : m[3] ? 'code' : 'u'],
    });
    at = m.index! + m[0].length;
  }
  if (at < text.length) result.push({ text: text.slice(at), marks: [] });
  return result;
}
export function replaceRich(text: string, find: string, replacement: string): string {
  const runs = parseRich(text),
    plain = runs.map((r) => r.text).join(''),
    at = plain.indexOf(find);
  if (!find || at < 0 || plain.indexOf(find, at + find.length) >= 0)
    throw Error('The selected text must occur exactly once in this block.');
  let pos = 0,
    inserted = false;
  const output: Run[] = [];
  for (const run of runs) {
    const end = pos + run.text.length;
    if (end <= at || pos >= at + find.length) output.push(run);
    else {
      if (pos < at) output.push({ ...run, text: run.text.slice(0, at - pos) });
      if (!inserted) {
        output.push({ ...run, text: replacement });
        inserted = true;
      }
      if (end > at + find.length)
        output.push({ ...run, text: run.text.slice(at + find.length - pos) });
    }
    pos = end;
  }
  return serializeRich(output);
}

/** References are recognised across inline mark boundaries; literal-code tokens stay literal. */
export function referenceRuns(runs: Run[]): { text: string; marks: Mark[]; key?: string }[] {
  const text = runs.map((r) => r.text).join('');
  const spans = runs.map((r, i) => ({
    ...r,
    start: runs.slice(0, i).reduce((n, r) => n + r.text.length, 0),
  }));
  const result: { text: string; marks: Mark[]; key?: string }[] = [];
  const append = (start: number, end: number) => {
    for (const r of spans) {
      const a = Math.max(start, r.start),
        b = Math.min(end, r.start + r.text.length);
      if (a < b) result.push({ text: text.slice(a, b), marks: r.marks });
    }
  };
  let at = 0;
  for (const match of text.matchAll(/\[\[([^\]\n]+)\]\]/g)) {
    const start = match.index!,
      end = start + match[0].length;
    const overlaps = spans.filter((r) => r.start < end && r.start + r.text.length > start);
    if (overlaps.some((r) => r.marks.includes('code'))) continue;
    append(at, start);
    result.push({ text: match[0], key: match[1], marks: overlaps[0]?.marks ?? [] });
    at = end;
  }
  append(at, text.length);
  return result;
}
