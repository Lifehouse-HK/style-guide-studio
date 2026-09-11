import { z } from 'zod';

export const languages = ['en', 'zh-Hant'] as const;
export type Language = typeof languages[number];
export type Localized<T> = Partial<Record<Language, T>>;
const id = z.string().regex(/^[A-Za-z][A-Za-z0-9_.-]{0,127}$/);
const language = z.enum(languages);
const localizedString = z.object({ en: z.string(), 'zh-Hant': z.string() }).partial().strict();
export const referenceSchema = z.object({
  publisher: id, document: id, target: id.optional(),
  selector: z.enum(['current', 'original', 'revision', 'draft']).default('current'),
  revision: z.string().optional(), language: language.optional(),
  custom: z.string().optional(), formal: z.boolean().optional(),
}).strict();
export type Reference = z.infer<typeof referenceSchema>;
export const inlineSchema = z.object({
  text: z.string(), marks: z.array(z.enum(['bold', 'italic', 'literal', 'sup', 'sub'])).optional(),
  ref: referenceSchema.optional(), term: id.optional(), href: z.string().url().optional(),
}).strict();
export type Inline = z.infer<typeof inlineSchema>;
export const blockSchema = z.object({
  id, type: z.enum(['p', 'quote', 'example', 'note', 'definition', 'table', 'figure', 'footnote', 'bullet']),
  inlines: z.array(inlineSchema).default([]),
  rows: z.array(z.array(z.array(inlineSchema))).optional(), numbered: z.boolean().optional(),
  caption: z.string().optional(), asset: id.optional(), alt: z.string().optional(),
  definition: id.optional(),
}).strict();
export type Block = z.infer<typeof blockSchema>;
export const kinds = ['part', 'chapter', 'division', 'subdivision', 'crossheading', 'section', 'subsection', 'paragraph', 'subparagraph', 'point', 'schedule', 'appendix'] as const;
export type Kind = typeof kinds[number];
export interface Provision {
  id: string; kind: Kind; label?: string; heading: Localized<string>;
  content: Localized<Block[]>; tail: Localized<Block[]>; shared?: Block[];
  children: Provision[]; repealed?: boolean;
}
const blocksByLanguage = z.object({ en: z.array(blockSchema), 'zh-Hant': z.array(blockSchema) }).partial().strict();
export const provisionSchema: z.ZodType<Provision> = z.lazy(() => z.object({
  id, kind: z.enum(kinds), label: z.string().regex(/^[A-Za-z0-9]+$/).optional(),
  heading: localizedString.default({}), content: blocksByLanguage.default({}), tail: blocksByLanguage.default({}),
  shared: z.array(blockSchema).optional(), children: z.array(provisionSchema).default([]), repealed: z.boolean().optional(),
}).strict());
export const operationSchema = z.object({
  id, author: id, target: id, type: z.enum(['insert', 'omit', 'substitute']),
  scope: z.enum(['en', 'zh-Hant', 'shared', 'structure']),
  expected: z.string(), position: z.enum(['before', 'after', 'first', 'last']).optional(),
  start: z.number().int().nonnegative().optional(), end: z.number().int().nonnegative().optional(),
  text: z.string().optional(), block: blockSchema.optional(), node: provisionSchema.optional(),
  instructions: localizedString,
}).strict();
export type Operation = z.infer<typeof operationSchema>;
const eventSchema = z.object({ type: z.enum(['repeal-document', 'cancel', 'reschedule']), target: id, expectedDate: z.string(), date: z.string().optional() }).strict();
export const projectSchema = z.object({
  format: z.literal('sg-project/1'), publisher: id, id,
  revision: z.string().min(1), titles: z.object({ en: z.string(), 'zh-Hant': z.string() }).strict(),
  role: z.enum(['principal', 'amendment']), mode: z.enum(['en', 'zh-Hant', 'bilingual']),
  stage: z.enum(['draft', 'adopted', 'withdrawn']), authority: z.enum(['both', 'en', 'zh-Hant']),
  timezone: z.string().default('Asia/Hong_Kong'), adoptedFrom: id.optional(),
  adoption: z.object({ date: z.string(), body: z.string(), effective: z.string(), sourceRevision: z.string() }).strict().optional(),
  opening: z.object({ longTitle: localizedString, recitals: blocksByLanguage, formula: localizedString, authentication: localizedString }).strict(),
  provisions: z.array(provisionSchema),
  definitions: z.array(z.object({ id, names: localizedString, document: id.optional(), publisher: id.optional(), meaning: localizedString }).strict()),
  amendment: z.object({ targetDocument: id, targetPublisher: id, expectedRevision: z.string(), after: z.array(id), operations: z.array(operationSchema), events: z.array(eventSchema).default([]) }).strict().optional(),
  assets: z.record(z.string(), z.object({ mediaType: z.enum(['image/png', 'image/jpeg']), data: z.string() }).strict()).default({}),
  locks: z.array(z.object({ url: z.string(), digest: z.string(), body: z.string() }).strict()).default([]),
}).strict();
export type Project = z.infer<typeof projectSchema>;
export interface Diagnostic { code: string; severity: 'error' | 'warning'; location: string; language?: Language; message: string }
export const text = (value: string): Inline[] => [{ text: value }];
export const plain = (block: Block): string => block.inlines.map(i => i.text).join('');
export const activeLanguages = (p: Project): Language[] => p.mode === 'bilingual' ? [...languages] : [p.mode];
export function walk(nodes: Provision[]): Provision[] { return nodes.flatMap(n => [n, ...walk(n.children)]); }
export function blocks(n: Provision): Block[] { return [...(n.shared ?? []), ...languages.flatMap(l => [...(n.content[l] ?? []), ...(n.tail[l] ?? [])])]; }
/** Stable serialization is also used in operation preconditions; it is not a signature. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') return '{' + Object.entries(value).filter(([,v]) => v !== undefined).sort(([a],[b]) => a < b ? -1 : a > b ? 1 : 0).map(([k,v]) => JSON.stringify(k)+':'+canonical(v)).join(',') + '}';
  return JSON.stringify(value);
}
export async function digest(value: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(hash), n => n.toString(16).padStart(2, '0')).join('');
}
export function parseProject(source: string): Project {
  if (source.length > 20_000_000) throw new Error('Project exceeds 20 MB; split large image assets before importing.');
  const value: unknown = JSON.parse(source);
  let count = 0;
  const bound = (v: unknown, depth = 0) => {
    if (++count > 500_000 || depth > 64) throw new Error('Project structure exceeds safe limits.');
    if (v && typeof v === 'object') for (const [k,c] of Object.entries(v)) {
      if (['__proto__', 'prototype', 'constructor'].includes(k)) throw new Error('Unsafe object key.');
      bound(c, depth + 1);
    }
  };
  bound(value);
  return projectSchema.parse(value);
}
export function validate(p: Project, certified = false): Diagnostic[] {
  const result: Diagnostic[] = [];
  const add = (code: string, location: string, message: string, severity: Diagnostic['severity'] = 'error', language?: Language) => result.push({code, location, message, severity, language});
  const ids = new Set<string>(); const addresses = new Set<string>();
  const unique = (value: string) => { if (ids.has(value)) add('duplicate-id', value, 'Identity is already used.'); ids.add(value); };
  for (const l of languages) if (!p.titles[l].trim()) add('missing-title', p.id, 'Both formal titles are required.', certified ? 'error' : 'warning', l);
  const validDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d)) && new Date(d).toISOString().slice(0,10) === d;
  try { new Intl.DateTimeFormat('en', { timeZone: p.timezone }); } catch { add('timezone',p.id,'Unknown publisher timezone.'); }
  if (certified && (p.stage !== 'adopted' || !p.adoption)) add('not-adopted', p.id, 'Certification requires an adopted source and adoption record.');
  if (p.adoption && (!validDate(p.adoption.date) || !validDate(p.adoption.effective) || p.adoption.sourceRevision !== p.revision || !p.adoption.body.trim())) add('adoption',p.id,'Adoption dates, authority and source revision must be valid.');
  if (p.role === 'amendment' && !p.amendment) add('missing-amendment',p.id,'Amendment target and operations are required.');
  if (p.role === 'principal' && p.amendment) add('unexpected-amendment',p.id,'Principal documents cannot carry amendment operations.');
  const allowed: Record<Kind, Kind[]> = {part:['chapter','division','crossheading','section','paragraph'],chapter:['division','crossheading','section','paragraph'],division:['subdivision','crossheading','section','paragraph'],subdivision:['crossheading','section','paragraph'],crossheading:[],section:['subsection','paragraph'],subsection:['paragraph'],paragraph:['subparagraph'],subparagraph:['point'],point:[],schedule:['part','chapter','crossheading','paragraph'],appendix:['part','chapter','crossheading','paragraph']};
  function checkBlock(b: Block, scope: Language | 'shared') {
    unique(b.id);
    if (b.type === 'table') {
      const cols = b.rows?.[0]?.length ?? 0;
      if (!cols || !b.rows?.length || b.rows.some(r => r.length !== cols)) add('table-shape',b.id,'Table must have a header and equally sized rows.');
    } else if (b.rows) add('unexpected-rows',b.id,'Only a table can have rows.');
    if (b.type === 'figure' && (!b.asset || !p.assets[b.asset] || !b.alt)) add('figure',b.id,'Figures require a supplied image and alternative text.');
    for (const i of [...b.inlines, ...(b.rows?.flat(2) ?? [])]) {
      if (i.href && !/^https?:\/\//.test(i.href)) add('unsafe-link',b.id,'Only HTTP(S) external links are supported.');
      if (i.ref && ['revision','draft'].includes(i.ref.selector) && !i.ref.revision) add('reference-revision',b.id,'An exact revision is required.');
      if (i.term && !p.definitions.some(d => d.id === i.term)) add('unknown-term',b.id,'Defined term is missing.');
    }
  }
  function visit(nodes: Provision[], parent?: Provision, prefix = '') {
    for (const n of nodes) {
      unique(n.id);
      if (parent && !allowed[parent.kind].includes(n.kind)) add('hierarchy', n.id, `${n.kind} cannot appear inside ${parent.kind}.`);
      if (!parent && !['part','chapter','crossheading','section','schedule','appendix'].includes(n.kind)) add('hierarchy',n.id,'This provision requires a parent.');
      if (n.kind !== 'crossheading' && !n.label) add('missing-label',n.id,'Enter a manual provision label.');
      const address = ['schedule','appendix'].includes(n.kind) ? `${n.kind}:${n.label}` : n.kind === 'section' ? `body:${n.label}` : `${prefix}/${n.kind}:${n.label}`;
      if (n.kind !== 'crossheading' && addresses.has(address)) add('duplicate-label',n.id,'This citation address already exists.');
      if (n.kind !== 'crossheading') addresses.add(address);
      if (n.shared && languages.some(l => n.content[l]?.length)) add('shared-conflict',n.id,'Shared opening content cannot also have translated copies.');
      if (!n.repealed && certified) for (const l of activeLanguages(p)) {
        if (!n.shared && !n.content[l]?.length && !n.children.length && !n.heading[l]) add('missing-translation',n.id,'Complete this language or mark the content shared.','error',l);
      }
      for (const l of languages) for (const b of [...(n.content[l] ?? []), ...(n.tail[l] ?? [])]) checkBlock(b,l);
      for (const b of n.shared ?? []) checkBlock(b,'shared');
      visit(n.children,n,address);
    }
  }
  visit(p.provisions);
  for (const l of languages) for (const b of p.opening.recitals[l] ?? []) checkBlock(b,l);
  const names = new Set<string>(); const targets = new Set<string>();
  for (const d of p.definitions) {
    unique(d.id);
    for (const l of activeLanguages(p)) {
      const name = d.names[l];
      if (!name?.trim()) add('definition-language',d.id,'Definition requires a name in each document language.',certified?'error':'warning',l);
      if (name && names.has(`${l}:${name}`)) add('duplicate-name',d.id,'Defined name is ambiguous.');
      if (name) names.add(`${l}:${name}`);
      if (d.document) { const key=`${l}:${d.publisher ?? p.publisher}:${d.document}`; if(targets.has(key)) add('duplicate-definition',d.id,'Only one preferred name per target/language.'); targets.add(key); }
    }
  }
  for (const op of p.amendment?.operations ?? []) {
    if (opIds(p).filter(v=>v===op.id).length>1) add('duplicate-operation',op.id,'Operation identity is repeated.');
    if (!walk(p.provisions).some(n=>n.id===op.author)) add('operation-author',op.id,'Authorising provision does not exist.');
    for (const l of activeLanguages(p)) if (!op.instructions[l]?.trim()) add('operation-instruction',op.id,'Instruction required in each language.',certified?'error':'warning',l);
  }
  return result;
}
const opIds=(p:Project)=>p.amendment?.operations.map(o=>o.id) ?? [];
export function assertValid(p: Project, certified = false): void {
  const errors = validate(p, certified).filter(d=>d.severity==='error');
  if(errors.length) throw new Error(errors.map(d=>`${d.code} (${d.location}): ${d.message}`).join('\n'));
}
export function newProject(): Project {
  return projectSchema.parse({format:'sg-project/1',publisher:'lifehouse-hk',id:'new-guide',revision:'draft-1',titles:{en:'', 'zh-Hant':''},role:'principal',mode:'en',stage:'draft',authority:'en',opening:{longTitle:{},recitals:{},formula:{},authentication:{}},provisions:[],definitions:[]});
}
