import {z} from 'zod';
import {entries,address,pair,paired,type Pair,type Guide,type Language} from './document.ts';
export const catalogueSchema=z.object({format:z.literal('lifehouse-references/1'),documents:z.array(z.object({id:z.string(),titles:paired,status:z.enum(['enacted','repealed']),revision:z.string(),html:z.object({en:z.string().url(),zh:z.string().url(),parallel:z.string().url()}).strict(),pdf:z.object({en:z.string().url(),zh:z.string().url(),parallel:z.string().url()}).strict(),targets:z.array(z.object({id:z.string(),label:paired,repealed:z.boolean()}).strict())}).strict())}).strict();
export type Catalogue=z.infer<typeof catalogueSchema>;
export function publicCatalogue(g:Guide,baseURL:string,revision:string,repealed=false):Catalogue {
  const base=new URL(baseURL);if(!['http:','https:'].includes(base.protocol))throw Error('Use an HTTP(S) publication base URL.');
  const link=(ext:string)=>Object.fromEntries(['en','zh','parallel'].map(l=>[l,new URL(`${g.id}/${l}.${ext}`,base.href.endsWith('/')?base.href:base.href+'/').href])) as {en:string;zh:string;parallel:string};
  return {format:'lifehouse-references/1',documents:[{id:g.id,titles:g.titles,status:repealed?'repealed':'enacted',revision,html:link('html'),pdf:link('pdf'),targets:entries(g.nodes).map(e=>({id:e.node.id,label:pair(address(e,'en'),address(e,'zh')),repealed:!!e.node.repealed}))}]};
}
export async function fetchCatalogue(baseURL:string):Promise<Catalogue>{const u=new URL(baseURL);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw Error('Enter an HTTP(S) base URL without credentials.');if(!u.pathname.endsWith('/'))u.pathname+='/';const response=await fetch(new URL('references.json',u),{credentials:'omit',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error(`Reference catalogue returned ${response.status}.`);const c=catalogueSchema.parse(await response.json());for(const d of c.documents)for(const href of [...Object.values(d.html),...Object.values(d.pdf)])if(!/^https?:\/\//.test(href))throw Error('Unsupported publication link.');return c;}
export function resolve(key:string,g:Guide,lang:Language,catalogues:Catalogue[],pdf=false):{label:string;href:string;warning?:string}{
  const [doc,target]=key.split('#');
  if(!doc||doc===g.id){const e=entries(g.nodes).find(e=>e.node.id===target);return e?{label:address(e,lang),href:'#'+e.node.id,...(e.node.repealed?{warning:'Repealed target'}:{})}:{label:`[Missing reference: ${key}]`,href:'',warning:'Missing reference'};}
  const d=catalogues.flatMap(c=>c.documents).find(d=>d.id===doc),t=d?.targets.find(t=>t.id===target);if(!d||!t)return{label:`[Unresolved reference: ${key}]`,href:'',warning:'Unresolved external reference'};
  const title=g.aliases[doc]?.[lang]||d.titles[lang];return {label:lang==='en'?`${t.label.en} of the ${title}`:`《${title}》${t.label.zh}`,href:(pdf?d.pdf:d.html)[lang]+'#'+encodeURIComponent(target),...(d.status==='repealed'||t.repealed?{warning:'Repealed target'}:{})};
}
