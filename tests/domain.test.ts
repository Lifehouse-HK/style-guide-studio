import { test } from 'node:test';
import assert from 'node:assert/strict';
import {newProject,parseProject,validate,canonical, type Provision} from '../packages/domain/src/index.ts';
const node = (id:string,label:string):Provision=>({id,kind:'section',label,heading:{en:'Rule'},content:{},tail:{},children:[]});
test('manual numbering retains inserted labels and rejects duplicates',()=>{
 const p=newProject(); p.provisions=[node('s5','5'),node('s5a','5A'),node('s6','6')];
 assert.equal(validate(p).filter(d=>d.severity==='error').length,0);
 assert.deepEqual(parseProject(JSON.stringify(p)).provisions.map(n=>n.label),['5','5A','6']);
 p.provisions.push(node('other','5A')); assert.ok(validate(p).some(d=>d.code==='duplicate-label'));
});
test('both titles required at certification even when monolingual',()=>{const p=newProject();p.titles.en='Guide';assert.ok(validate(p,true).some(d=>d.code==='missing-title'&&d.language==='zh-Hant'));});
test('unknown schema and unsafe keys fail before destructive import',()=>{assert.throws(()=>parseProject('{"format":"sg-project/2"}'));assert.throws(()=>parseProject('{"__proto__":{}}'));});
test('canonical representation independent of property ordering',()=>assert.equal(canonical({b:2,a:1}),canonical({a:1,b:2})));
