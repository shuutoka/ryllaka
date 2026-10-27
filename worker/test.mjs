/* Test local sans réseau : Worker + D1 simulée par SQLite et API Resend interceptée. */
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import worker from './src.js';

const sqlite = new DatabaseSync(':memory:');
for(const f of readdirSync(new URL('./migrations/', import.meta.url)).sort()) {
  sqlite.exec(readFileSync(new URL(`./migrations/${f}`, import.meta.url),'utf8'));
}
function statement(sql,values=[]) {
  const wrap = x => ({meta:{changes:x.changes}, ...x});
  return {
    bind(...args){return statement(sql,args)},
    async run(){return wrap(sqlite.prepare(sql).run(...values))},
    async first(){return sqlite.prepare(sql).get(...values)||null},
    async all(){return {results:sqlite.prepare(sql).all(...values)}}
  };
}
const DB={prepare(sql){return statement(sql)},async batch(queries){
  sqlite.exec('BEGIN');
  try { const out=[];for(const q of queries)out.push(await q.run());sqlite.exec('COMMIT');return out; }
  catch(e){sqlite.exec('ROLLBACK');throw e;}
}};
const env={DB,PUBLIC_ORIGIN:'https://ryllaka.lotaku.fr',ADMIN_TOKEN:'a'.repeat(64),RESEND_API_KEY:'mock-resend-secret',MAIL_FROM:'Ryllaka <halloween@send.lotaku.fr>',NOTIFY_TO:'postmaster@lotaku.fr'};
let failEmail=false;
const emails=[];
globalThis.fetch=async (url,options)=>{
  assert.equal(url,'https://api.resend.com/emails');
  assert.equal(options.headers.Authorization,`Bearer ${env.RESEND_API_KEY}`);
  const payload=JSON.parse(options.body);emails.push(payload);
  return new Response(JSON.stringify({id:'mock-id'}),{status:failEmail?503:200,headers:{'Content-Type':'application/json'}});
};
async function request(path,body=null,admin=false,method='POST'){
  const req=new Request(`https://example.workers.dev${path}`,{
    method, headers:{Origin:env.PUBLIC_ORIGIN,...(admin?{Authorization:`Bearer ${env.ADMIN_TOKEN}`}:{})},
    ...(body!==null?{body:JSON.stringify(body)}:{})
  });
  const res=await worker.fetch(req,env);
  return {status:res.status,data:await res.json()};
}
const makeCode = (i)=>`RYL-${i.toString(16).toUpperCase().padStart(8,'0')}-23456789-ABCDEF01-12345678`;
for(const [kind,start] of [['tshirt',1],['mousepad',4],['mug',7]]){
  for(let i=start;i<start+3;i++){
    const r=await request('/api/admin/codes/import',{prize:kind,code:makeCode(i)},true);
    assert.equal(r.status,201,JSON.stringify(r));
  }
}
assert.equal((await request('/api/admin/codes/import',{prize:'tshirt',code:makeCode(1)},true)).status,409);
assert.equal((await request('/api/admin/codes/import',{prize:'tshirt',code:makeCode(10)},true)).status,409);
assert.equal((await request('/api/admin/codes',{prize:'tshirt'},false)).status,401);
let r=await request('/api/validate',{code:makeCode(1)});
assert.equal(r.status,200);
let tshirtToken=r.data.claimToken;
assert.equal((await request('/api/validate',{code:makeCode(1)})).status,409);
const base={full_name:'Test Personne',address1:'8 rue Test',address2:'',city:'Lyon',zip:'69003',state:'Rhône',country_code:'FR',company:'',email:'gagnant@example.fr',phone:'',size:'5XL',color:'marine'};
assert.equal((await request('/api/claim',{claimToken:tshirtToken,shipping:{...base,email:''},privacyAccepted:true})).status,400);
assert.equal((await request('/api/claim',{claimToken:tshirtToken,shipping:{...base,size:'6XL'},privacyAccepted:true})).status,400);
assert.equal((await request('/api/claim',{claimToken:tshirtToken,shipping:{...base,color:'rouge'},privacyAccepted:true})).status,400);
r=await request('/api/claim',{claimToken:tshirtToken,shipping:base,privacyAccepted:true});
assert.equal(r.status,200);assert.equal(r.data.emailSent,true);
assert.equal(emails.length,1);assert.deepEqual(emails[0].to,['postmaster@lotaku.fr']);
assert.equal(emails[0].reply_to,'gagnant@example.fr');
assert.match(emails[0].text,/Variante : Bleu marine/);assert.match(emails[0].text,/Taille : 5XL/);
assert.equal((await request('/api/validate',{code:makeCode(1)})).status,409);
assert.equal((await request('/api/claim',{claimToken:tshirtToken,shipping:base,privacyAccepted:true})).status,409);
r=await request('/api/validate',{code:makeCode(4)}); assert.equal(r.status,200);
const pad={...base,size:'',color:'aurore'};
failEmail=true;
r=await request('/api/claim',{claimToken:r.data.claimToken,shipping:pad,privacyAccepted:true});
assert.equal(r.status,200);assert.equal(r.data.emailSent,false);
const records=(await request('/api/admin/claims',null,true,'GET')).data.claims;
assert.equal(records.length,2);
assert.equal(records[0].email_status,'failed');assert.equal(records[0].color,'aurore');
failEmail=false;
r=await request(`/api/admin/claims/${records[0].id}/notify`,{},true);
assert.equal(r.status,200);assert.equal(r.data.sent,true);
assert.equal((await request(`/api/admin/claims/${records[0].id}/notify`,{},true)).data.sent,true);
assert.equal(sqlite.prepare('SELECT COUNT(*) n FROM vouchers').get().n,9);
console.log('✓ Tests intégration réussis : 9 codes, quotas, vérification, tailles/couleurs, e-mail, échec & relance, sécurité');
