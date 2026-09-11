import {z} from 'zod';
import {activeLanguages,canonical,digest,kinds,languages,type Kind,type Language,type Project,type Provision,type Reference} from '../../domain/src/index.ts';
import type {Revision} from './amendments.ts';
const key=z.string().regex(/^[A-Za-z][A-Za-z0-9_.-]{0,127}$/);
const titles=z.object({en:z.string(),'zh-Hant':z.string()}).strict();
const resource=z.object({href:z.string(),digest:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
const targetSchema=z.object({id:key,kind:z.enum(kinds),path:z.array(z.object({kind:z.enum(kinds),label:z.string()}).strict()),heading:titles.partial(),repealed:z.boolean(),content:resource.optional()}).strict();
const outputPaths=z.object({en:z.string(),'zh-Hant':z.string(),parallel:z.string()}).partial().strict();
const revisionSchema=z.object({id:z.string(),kind:z.enum(['original','revision','draft']),asOf:z.string(),state:z.enum(['not-effective','effective','repealed','proposed','draft']),targets:z.array(targetSchema),html:outputPaths,pdf:outputPaths}).strict();
export const indexSchema=z.object({protocol:z.literal('sg-index/1'),publisher:key,id:key,titles,mode:z.enum(['en','zh-Hant','bilingual']),stage:z.enum(['draft','adopted','withdrawn']),current:z.string(),original:z.string(),revisions:z.array(revisionSchema)}).strict();
export const catalogueSchema=z.object({protocol:z.literal('sg-catalogue/1'),publisher:key,asOf:z.string(),documents:z.array(z.object({id:key,titles,index:resource}).strict())}).strict();
export type DocumentIndex=z.infer<typeof indexSchema>;
export type Catalogue=z.infer<typeof catalogueSchema>;
export type Target=z.infer<typeof targetSchema>;
export type IndexRevision=z.infer<typeof revisionSchema>;
export type Resource=z.infer<typeof resource>;
export class ReferenceError extends Error {constructor(public code:string,message:string){super(message);}}
export function safeURL(value:string,base:string):string {
 const u=new URL(value,base);
 if(!['http:','https:'].includes(u.protocol)||u.username||u.password)throw new ReferenceError('unsafe-url','Only HTTP(S) URLs without credentials are supported.');return u.href;
}
export function targets(p:Project):Target[]{
 const out:Target[]=[];
 const visit=(ns:Provision[],path:Target['path'])=>{for(const n of ns){const next=[...path,...(n.label?[{kind:n.kind,label:n.label}]:[])];if(n.kind!=='crossheading')out.push({id:n.id,kind:n.kind,path:next,heading:n.heading,repealed:!!n.repealed});visit(n.children,next);}};visit(p.provisions,[]);return out;
}
export function makeIndex(p:Project,revisions:IndexRevision[],current:string):DocumentIndex {
 return indexSchema.parse({protocol:'sg-index/1',publisher:p.publisher,id:p.id,titles:p.titles,mode:p.mode,stage:p.stage,current,original:revisions.find(r=>r.kind==='original')?.id??current,revisions});
}
export function indexRevision(state:Revision,kind:IndexRevision['kind'],html:IndexRevision['html'],pdf:IndexRevision['pdf']):IndexRevision{return {id:state.revision,kind,asOf:state.asOf,state:state.state,targets:targets(state.project),html,pdf};}
const en:Record<Kind,string>={part:'Part',chapter:'Chapter',division:'Division',subdivision:'Subdivision',crossheading:'cross-heading',section:'section',subsection:'subsection',paragraph:'paragraph',subparagraph:'sub-paragraph',point:'point',schedule:'Schedule',appendix:'Appendix'};
const zh:Record<Kind,string>={part:'部',chapter:'章',division:'分部',subdivision:'次分部',crossheading:'小標題',section:'條',subsection:'款',paragraph:'段',subparagraph:'節',point:'節',schedule:'附表',appendix:'附錄'};
export function provisionLabel(t:Target,l:Language,draft=false):string {
 const schedule=t.path.find(x=>x.kind==='schedule'||x.kind==='appendix');
 const sequence=t.path.filter(x=>['section','subsection','paragraph','subparagraph','point'].includes(x.kind));
 const top=sequence[0],address=sequence.map((x,i)=>i?'('+x.label+')':x.label).join('');
 if(!top){const last=t.path.at(-1)!;return l==='en'?`${en[t.kind]} ${last.label}`:['schedule','appendix'].includes(t.kind)?`${zh[t.kind]}${last.label}`:`第${last.label}${zh[t.kind]}`;}
 if(l==='zh-Hant')return `${schedule?zh[schedule.kind]+schedule.label:''}第${address}${zh[top.kind]}`;
 const name=draft&&t.kind==='section'?'clause':en[t.kind];return `${name} ${address}${schedule?' of '+en[schedule.kind]+' '+schedule.label:''}`;
}
export interface ResolvedReference {label:string;html:string;pdf:string;language:Language;revision:string;state:string;warnings:string[];target?:Target}
export function resolveReference(source:Project,ref:Reference,index:DocumentIndex,l:Language,base:string):ResolvedReference {
 if(index.id!==ref.document||index.publisher!==ref.publisher)throw new ReferenceError('identity','Catalogue identity differs from reference.');
 const selected=ref.selector==='current'?index.current:ref.selector==='original'?index.original:ref.revision;
 const rev=index.revisions.find(r=>r.id===selected);if(!rev)throw new ReferenceError('missing-revision','Requested revision is absent.');
 if((ref.selector==='draft')!==(rev.kind==='draft'))throw new ReferenceError('lifecycle','Draft targets must use an explicit draft selector.');
 const t=ref.target?rev.targets.find(t=>t.id===ref.target):undefined;
 if(ref.target&&!t)throw new ReferenceError('missing-target','Target is absent; table rows/cells and prose blocks are never public targets.');
 const available=index.mode==='bilingual'?[...languages]:[index.mode];
 const requested=ref.language??l, actual=(available.includes(requested)?requested:available[0]) as Language;
 const warnings:string[]=[];if(actual!==requested)warnings.push('Content is available only in '+actual+'.');
 if(t?.path.some(p=>p.kind==='schedule')&&t.kind!=='schedule')warnings.push('Prefer referencing the Schedule itself.');
 if(t?.repealed||rev.state==='repealed')warnings.push('Target is repealed.');
 if(rev.state!=='effective')warnings.push('Target state: '+rev.state+'.');
 const defined=!ref.formal?source.definitions.find(d=>d.document===index.id&&(d.publisher??source.publisher)===index.publisher)?.names[l]:undefined;
 const title=defined||index.titles[l],provision=t?provisionLabel(t,l,rev.kind==='draft'):'';
 const label=ref.custom??(provision?(l==='en'?`${provision} of ${title}`:`${title}${provision}`):title);
 const path=rev.html[actual],pdf=rev.pdf[actual];if(!path||!pdf)throw new ReferenceError('missing-output','Target language has no published outputs.');
 const anchor=t?'n_'+t.id:'document';
 return {label,html:safeURL(path,base)+'#'+anchor,pdf:safeURL(pdf,base)+'#nameddest='+anchor,language:actual,revision:rev.id,state:t?.repealed?'repealed':rev.state,warnings,target:t};
}
export type LoadText=(url:string)=>Promise<string>;
/** Network is supplied by the caller. Locked mode never invokes it. */
export class CatalogueClient {
 private cache=new Map<string,{body:string;digest:string}>();
 constructor(private load:LoadText,private locked=false){}
 async addLocks(locks:Project['locks']):Promise<void>{for(const lock of locks){safeURL(lock.url,lock.url);if(await digest(lock.body)!==lock.digest)throw new ReferenceError('integrity','Dependency lock digest differs.');this.cache.set(lock.url,{body:lock.body,digest:lock.digest});}}
 locks():Project['locks'] {return [...this.cache].map(([url,v])=>({url,...v}));}
 async read(url:string,hash?:string,refresh=false):Promise<{value:unknown;cached:boolean}> {
  safeURL(url,url);const existing=this.cache.get(url);let body:string;
  if(existing&&(!refresh||this.locked))body=existing.body;
  else {if(this.locked)throw new ReferenceError('missing-lock','Offline dependency is not locked.');try{body=await this.load(url);}catch{throw new ReferenceError('unavailable','Catalogue unavailable; existing cache has not been overwritten.');}}
  if(body.length>10_000_000)throw new ReferenceError('limit','Catalogue resource too large.');
  const actual=await digest(body);if(hash&&hash!==actual)throw new ReferenceError('integrity','Catalogue resource digest differs.');
  let value:unknown;try{value=JSON.parse(body);}catch{throw new ReferenceError('format','Malformed JSON resource.');}
  this.cache.set(url,{body,digest:actual});return {value,cached:body===existing?.body};
 }
 async discover(base:string,refresh=false):Promise<{catalogue:Catalogue;staleAsOf:string;cached:boolean}> {
  const url=safeURL('catalogue.json',base.endsWith('/')?base:base+'/'),r=await this.read(url,undefined,refresh);
  const parsed=catalogueSchema.safeParse(r.value);if(!parsed.success)throw new ReferenceError('protocol','Unsupported or malformed catalogue.');
  return {catalogue:parsed.data,staleAsOf:parsed.data.asOf,cached:r.cached};
 }
 async document(base:string,id:string):Promise<DocumentIndex>{
  const {catalogue}=await this.discover(base),item=catalogue.documents.find(d=>d.id===id);if(!item)throw new ReferenceError('missing-document','Document is absent from publisher catalogue.');
  const r=await this.read(safeURL(item.index.href,base),item.index.digest),parsed=indexSchema.safeParse(r.value);if(!parsed.success)throw new ReferenceError('protocol','Unsupported or malformed document index.');
  if(parsed.data.publisher!==catalogue.publisher||parsed.data.id!==id||canonical(parsed.data.titles)!==canonical(item.titles))throw new ReferenceError('identity','Document index does not match catalogue.');return parsed.data;
 }
 async targetContent(base:string,target:Target):Promise<unknown>{if(!target.content)throw new ReferenceError('missing-content','Target content is unavailable.');return (await this.read(safeURL(target.content.href,base),target.content.digest)).value;}
}
