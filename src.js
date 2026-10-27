/*
 * Ryllaka Halloween Giveaway — Cloudflare Worker + D1.
 * Codes and shipping addresses NEVER live in GitHub Pages files.
 * Configure ADMIN_TOKEN as a Worker secret, not a source variable.
 */
const shirtSizes = new Set(['S','M','L','XL','2XL','3XL','4XL','5XL']);
const shirtColors = new Set(['noir','charbon','marine']);
const padColors = new Set(['nuit','aurore']);
const prizes = new Set(['tshirt','mug','mousepad']);
const safeHeaders = {
  'Content-Type':'application/json; charset=utf-8',
  'Cache-Control':'no-store, max-age=0',
  'X-Content-Type-Options':'nosniff',
  'Referrer-Policy':'no-referrer',
};
function corsHeaders(env){return {
  'Access-Control-Allow-Origin':env.PUBLIC_ORIGIN,
  'Access-Control-Allow-Headers':'authorization, content-type',
  'Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS',
  'Access-Control-Max-Age':'600',
  'Vary':'Origin',
};}
function json(env,data,status=200){return new Response(JSON.stringify(data),{status,headers:{...safeHeaders,...corsHeaders(env)}});}
function fail(message,status=400){const e=new Error(message);e.status=status;throw e;}
async function inputJson(request){
  if(!['POST','PUT','PATCH'].includes(request.method))fail('Méthode non autorisée.',405);
  const t=await request.text();
  if(t.length>6500)fail('Contenu trop volumineux.',413);
  try { const j=JSON.parse(t);if(!j||typeof j!=='object'||Array.isArray(j))fail('Données invalides.');return j; }
  catch(e){ if(e.status)throw e;fail('JSON invalide.'); }
}
function cleanText(value,max,required=false){
  if(value===null||value===undefined)value='';
  if(typeof value!=='string')fail('Champ de formulaire invalide.');
  const v=value.trim();
  if(v.length>max||/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/.test(v)|| (required&&!v))fail('Vérifie les champs obligatoires.');
  return v;
}
function hex(bytes){return Array.from(bytes,byte=>byte.toString(16).padStart(2,'0')).join('');}
function token(){const b=new Uint8Array(16);crypto.getRandomValues(b);return hex(b).toUpperCase();}
async function sha256(text){const binary=new TextEncoder().encode(text);return hex(new Uint8Array(await crypto.subtle.digest('SHA-256',binary)));}
function secureEqual(a,b){
  const x=new TextEncoder().encode(a||''),y=new TextEncoder().encode(b||'');
  let d=x.length^y.length;
  const n=Math.max(x.length,y.length);
  for(let i=0;i<n;i++)d|=(x[i]||0)^(y[i]||0);
  return d===0;
}
function ensureAdmin(request,env){
  if(!env.ADMIN_TOKEN||env.ADMIN_TOKEN.length<32)fail('Accès administrateur indisponible.',503);
  const received=request.headers.get('authorization')||'';
  if(!secureEqual(received,`Bearer ${env.ADMIN_TOKEN}`))fail('Accès refusé.',401);
}
function canonicalCode(code){
  if(typeof code!=='string'||code.length>80)return null;
  const plain=code.replace(/[\s-]/g,'').toUpperCase();
  return /^RYL[A-F0-9]{32}$/.test(plain)?plain:null;
}
function parseShipping(body,prize){
  if(body.privacyAccepted!==true || !body.shipping || typeof body.shipping!=='object')fail('Merci de confirmer la prise de connaissance des informations de confidentialité.');
  const s=body.shipping;
  const full_name=cleanText(s.full_name,100,true),address1=cleanText(s.address1,150,true),address2=cleanText(s.address2,150),city=cleanText(s.city,90,true);
  const zip=cleanText(s.zip,12,true),state=cleanText(s.state,80),country_code=cleanText(s.country_code,2,true).toUpperCase();
  const company=cleanText(s.company,100),email=cleanText(s.email,150,true),phone=cleanText(s.phone,40);
  const size=prize==='tshirt'?cleanText(s.size,4,true):'';
  const color=prize==='tshirt'||prize==='mousepad'?cleanText(s.color,20,true):'';
  if(country_code!=='FR'||!/^[0-9]{5}$/.test(zip))fail('Pour cette version, indique une adresse en France avec un code postal à 5 chiffres.');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('Adresse e-mail obligatoire et invalide.');
  if(size && !shirtSizes.has(size))fail('Taille invalide.');
  if(prize==='tshirt'&&!shirtColors.has(color))fail('Couleur de T-shirt invalide.');
  if(prize==='mousepad'&&!padColors.has(color))fail('Couleur de tapis de souris invalide.');
  return {full_name,address1,address2,city,zip,state,country_code,company,email,phone,size,color};
}
const nicePrize={tshirt:'T-shirt',mousepad:'Tapis de souris',mug:'Mug'};
const colors={noir:'Noir',charbon:'Charbon',marine:'Bleu marine',nuit:'Nuit',aurore:'Aurore'};
function emailContent(c){
  const l=[
    `Nouvelle réclamation Ryllaka Halloween — #${c.id}`,
    `Cadeau : ${nicePrize[c.prize]||c.prize}`,
    c.color?`Variante : ${colors[c.color]||c.color}`:'',
    c.size?`Taille : ${c.size}`:'',
    '', 'Informations à saisir MANUELLEMENT dans Printful :',
    `Nom complet : ${c.full_name}`,
    c.company?`Entreprise : ${c.company}`:'',
    `Adresse ligne 1 : ${c.address1}`,
    c.address2?`Adresse ligne 2 : ${c.address2}`:'',
    `Code postal : ${c.zip}`,
    `Ville : ${c.city}`,
    c.state?`Département/région : ${c.state}`:'',
    `Pays : ${c.country_code}`,
    `E-mail destinataire : ${c.email}`,
    `Téléphone : ${c.phone||'Non renseigné'}`,
    '', 'ATTENTION : aucune commande Printful n’a été automatiquement passée.',
    'Ces informations sont confidentielles. Effacer l’e-mail après la finalisation de la livraison selon la politique de conservation.'
  ];
  return l.filter(x=>x!==undefined).join('\n');
}
async function mailClaim(env,id){
  // Cette opération est uniquement appelée depuis la validation d’un code ou par un admin authentifié.
  const now=Date.now();
  const lock=await env.DB.prepare(`UPDATE claims SET email_status='sending',email_attempted_at=?
    WHERE id=? AND email_status!='sent' AND (email_status!='sending' OR email_attempted_at<?)`)
    .bind(now,id,now-5*60*1000).run();
  if(lock.meta.changes!==1)return false;
  const claim=await env.DB.prepare('SELECT * FROM claims WHERE id=?').bind(id).first();
  if(!claim)return false;
  const payload={
    from:env.MAIL_FROM,
    to:[env.NOTIFY_TO||'postmaster@lotaku.fr'],
    reply_to:claim.email,
    subject:`[Ryllaka Halloween] ${nicePrize[claim.prize]||claim.prize} — réclamation #${claim.id}`,
    text:emailContent(claim)
  };
  try{
    const reply=await fetch('https://api.resend.com/emails',{
      method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${env.RESEND_API_KEY}`,
        'Idempotency-Key':`ryllaka-halloween-2026-claim-${claim.id}`},
      body:JSON.stringify(payload)
    });
    if(!reply.ok)throw new Error('Email provider rejected request');
    await env.DB.prepare(`UPDATE claims SET email_status='sent' WHERE id=?`).bind(id).run();
    return true;
  }catch(e){
    await env.DB.prepare(`UPDATE claims SET email_status='failed' WHERE id=?`).bind(id).run();
    console.error('Envoi e-mail impossible pour la réclamation',id);
    return false;
  }
}
export default {
  async scheduled(_event,env,ctx){
    ctx.waitUntil(env.DB.prepare('DELETE FROM claims WHERE created_at < ?').bind(Date.now()-90*86400000).run());
  },
  async fetch(request,env){
    const origin=request.headers.get('origin');
    if(origin && origin!==env.PUBLIC_ORIGIN)return json(env,{message:'Origine non autorisée.'},403);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...corsHeaders(env),'Cache-Control':'no-store'}});
    try{
      if(!env.DB)fail('Base de données non configurée.',503);
      const url=new URL(request.url), path=url.pathname.replace(/\/+$/,'')||'/';
      if(request.method==='GET' && path==='/api/health')return json(env,{ok:true,service:'Ryllaka Halloween API'});
      if(request.method==='POST' && path==='/api/validate'){
        const body=await inputJson(request), code=canonicalCode(body.code);
        if(!code)fail('Code invalide ou indisponible.',404);
        const codeHash=await sha256(code),claimToken=token(),sessionHash=await sha256(claimToken),now=Date.now(),until=now+20*60*1000;
        const update=await env.DB.prepare(`UPDATE vouchers SET pending_hash=?,pending_until=? WHERE code_hash=? AND consumed_at IS NULL AND revoked_at IS NULL AND (pending_until IS NULL OR pending_until < ?)`).bind(sessionHash,until,codeHash,now).run();
        if(update.meta.changes!==1)fail('Code invalide, déjà utilisé ou temporairement réservé. Réessaie dans 20 minutes si tu as quitté le formulaire.',409);
        const row=await env.DB.prepare('SELECT prize FROM vouchers WHERE pending_hash=?').bind(sessionHash).first();
        if(!row)fail('Code indisponible.',409);
        return json(env,{claimToken,prize:row.prize,expiresIn:1200});
      }
      if(request.method==='POST' && path==='/api/claim'){
        if(!env.RESEND_API_KEY || !env.MAIL_FROM || !env.NOTIFY_TO)fail('Le service e-mail n’est pas configuré. Contacte l’organisateur.',503);
        const body=await inputJson(request);
        if(typeof body.claimToken!=='string'||!/^[0-9A-F]{32}$/.test(body.claimToken))fail('Session expirée ou invalide.',409);
        const sessionHash=await sha256(body.claimToken),now=Date.now();
        const voucher=await env.DB.prepare('SELECT id,prize FROM vouchers WHERE pending_hash=? AND pending_until>? AND consumed_at IS NULL AND revoked_at IS NULL').bind(sessionHash,now).first();
        if(!voucher)fail('Le code a expiré ou a déjà été utilisé. Réessaie ultérieurement.',409);
        const s=parseShipping(body,voucher.prize);
        // D1.batch() is transactional. No address is saved without a valid unused session.
        const results=await env.DB.batch([
          env.DB.prepare(`INSERT INTO claims (voucher_id,prize,full_name,address1,address2,city,zip,state,country_code,company,email,phone,size,color,created_at)
            SELECT v.id,v.prize,?,?,?,?,?,?,?,?,?,?,?,?,? FROM vouchers v
            WHERE v.pending_hash=? AND v.pending_until>? AND v.consumed_at IS NULL AND v.revoked_at IS NULL`)
            .bind(s.full_name,s.address1,s.address2,s.city,s.zip,s.state,s.country_code,s.company,s.email,s.phone,s.size,s.color,now,sessionHash,now),
          env.DB.prepare(`UPDATE vouchers SET consumed_at=?,pending_hash=NULL,pending_until=NULL
            WHERE pending_hash=? AND consumed_at IS NULL AND EXISTS(SELECT 1 FROM claims c WHERE c.voucher_id=vouchers.id)`)
            .bind(now,sessionHash)
        ]);
        if(results[0].meta.changes!==1||results[1].meta.changes!==1)fail('Réclamation déjà traitée ou expirée.',409);
        const claimRow=await env.DB.prepare('SELECT id FROM claims WHERE voucher_id=?').bind(voucher.id).first();
        const emailSent=claimRow?await mailClaim(env,claimRow.id):false;
        return json(env,{ok:true,emailSent,message:emailSent?'Adresse enregistrée et e-mail envoyé.':'Adresse enregistrée, mais notification e-mail à relancer par l’organisateur.'});
      }
      if(path.startsWith('/api/admin/')){
        ensureAdmin(request,env);
        if(path==='/api/admin/codes/import'&&request.method==='POST'){
          const body=await inputJson(request);
          const prize=cleanText(body.prize,20,true),code=canonicalCode(body.code);
          if(!prizes.has(prize)||!code)fail('Lot ou code invalide.');
          const count=await env.DB.prepare('SELECT count(*) AS n FROM vouchers WHERE prize=? AND revoked_at IS NULL AND consumed_at IS NULL').bind(prize).first();
          if(count.n>=3)fail('Trois codes non utilisés existent déjà pour ce lot.',409);
          const codeHash=await sha256(code);
          try{await env.DB.prepare('INSERT INTO vouchers(code_hash,prize,created_at) VALUES(?,?,?)').bind(codeHash,prize,Date.now()).run();}
          catch{fail('Code déjà importé ou invalide.',409);}
          return json(env,{ok:true,prize},201);
        }
        if(path==='/api/admin/codes'&&request.method==='POST'){
          const body=await inputJson(request),prize=cleanText(body.prize,20,true);
          if(!prizes.has(prize))fail('Lot inconnu.');
          const count=await env.DB.prepare('SELECT count(*) AS n FROM vouchers WHERE prize=? AND revoked_at IS NULL AND consumed_at IS NULL').bind(prize).first();
          if(count.n>=3)fail('Trois codes non utilisés existent déjà pour ce lot.',409);
          const raw=token(),code=`RYL-${raw.match(/.{1,8}/g).join('-')}`;
          const codeHash=await sha256(`RYL${raw}`);
          try {await env.DB.prepare('INSERT INTO vouchers(code_hash,prize,created_at) VALUES(?,?,?)').bind(codeHash,prize,Date.now()).run();}
          catch {fail('Code déjà enregistré. Réessaie.',409);}
          return json(env,{code,prize},201);
        }
        if(path==='/api/admin/codes'&&request.method==='GET'){
          const {results}=await env.DB.prepare('SELECT id,prize,created_at,consumed_at,revoked_at,pending_until FROM vouchers ORDER BY created_at DESC LIMIT 40').all();
          return json(env,{codes:results});
        }
        const rev=/^\/api\/admin\/codes\/(\d+)$/.exec(path);
        if(rev&&request.method==='DELETE'){
          const r=await env.DB.prepare('UPDATE vouchers SET revoked_at=?,pending_hash=NULL,pending_until=NULL WHERE id=? AND consumed_at IS NULL AND revoked_at IS NULL').bind(Date.now(),Number(rev[1])).run();
          if(r.meta.changes!==1)fail('Code inconnu ou déjà utilisé.',409);
          return json(env,{ok:true});
        }
        const retry=/^\/api\/admin\/claims\/(\d+)\/notify$/.exec(path);
        if(retry&&request.method==='POST'){
          if(!env.RESEND_API_KEY||!env.MAIL_FROM||!env.NOTIFY_TO)fail('Service e-mail non configuré.',503);
          const id=Number(retry[1]);
          const exists=await env.DB.prepare('SELECT id,email_status FROM claims WHERE id=?').bind(id).first();
          if(!exists)fail('Réclamation introuvable.',404);
          if(exists.email_status==='sent')return json(env,{ok:true,sent:true});
          const sent=await mailClaim(env,id);
          return json(env,{ok:sent,sent,message:sent?'Notification e-mail envoyée.':'Échec de l’envoi. Vérifier le domaine d’envoi et les journaux du Worker.'},sent?200:503);
        }
        if(path==='/api/admin/claims'&&request.method==='GET'){
          const {results}=await env.DB.prepare('SELECT * FROM claims ORDER BY created_at DESC LIMIT 100').all();
          return json(env,{claims:results.map(r=>({...r,created_at:new Date(r.created_at).toLocaleString('fr-FR',{timeZone:'Europe/Paris'})}))});
        }
        const statusMatch=/^\/api\/admin\/claims\/(\d+)\/status$/.exec(path);
        if(statusMatch&&request.method==='POST'){
          const body=await inputJson(request);
          if(!['pending','shipped'].includes(body.status))fail('Statut invalide.');
          const r=await env.DB.prepare('UPDATE claims SET fulfillment_status=? WHERE id=?').bind(body.status,Number(statusMatch[1])).run();
          if(!r.meta.changes)fail('Réclamation inconnue.',404);
          return json(env,{ok:true});
        }
        const del=/^\/api\/admin\/claims\/(\d+)$/.exec(path);
        if(del&&request.method==='DELETE'){
          const r=await env.DB.prepare('DELETE FROM claims WHERE id=?').bind(Number(del[1])).run();
          if(!r.meta.changes)fail('Réclamation inconnue.',404);
          return json(env,{ok:true});
        }
        if(path==='/api/admin/purge'&&request.method==='POST'){
          await inputJson(request);
          const r=await env.DB.prepare('DELETE FROM claims WHERE created_at < ?').bind(Date.now()-90*86400000).run();
          return json(env,{deleted:r.meta.changes});
        }
      }
      return json(env,{message:'Route inconnue.'},404);
    }catch(e){
      // Avoid leaking DB details, personal data or stack traces to public clients.
      if(!e.status){console.error('Worker error (details omitted)');return json(env,{message:'Erreur temporaire du serveur.'},500);}
      return json(env,{message:e.message},e.status);
    }
  }
};
