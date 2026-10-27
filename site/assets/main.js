'use strict';
const CFG = window.RYLLAKA_CONFIG || {};
const apiConfigured = typeof CFG.apiBaseUrl === 'string' && /^https:\/\//.test(CFG.apiBaseUrl) && !CFG.apiBaseUrl.includes('REMPLACER');
function setStatus(el, message, kind='info') {
  el.textContent = message;
  el.className = 'status show '+kind;
  el.setAttribute('role',kind==='error'?'alert':'status');
}
function apiUrl(path) {
  if (!apiConfigured) throw new Error('La validation des codes sera disponible dès que le site sera relié à son serveur sécurisé.');
  return CFG.apiBaseUrl.replace(/\/$/,'')+path;
}
async function callApi(path, options={}) {
  const res = await fetch(apiUrl(path), { ...options, mode:'cors', cache:'no-store', headers:{ 'Content-Type':'application/json', ...(options.headers || {}) } });
  let result;
  try { result=await res.json(); } catch { throw new Error('Réponse inattendue du serveur.'); }
  if (!res.ok) throw new Error(result.message || 'Une erreur est survenue.');
  return result;
}
const prizeNames={tshirt:'T-shirt Halloween',mug:'Mug Halloween',mousepad:'Tapis de souris Halloween'};
function initRedeem(){
  const form=document.getElementById('code-form');
  if(!form)return;
  const status=document.getElementById('code-status');
  const claimSection=document.getElementById('claim-section');
  const claimForm=document.getElementById('claim-form');
  const claimStatus=document.getElementById('claim-status');
  const chosenPrize=document.getElementById('chosen-prize');
  const tshirtSize=document.getElementById('size-field');
  const tshirtSelect=document.getElementById('size');
  const colorField=document.getElementById('color-field');
  const colorSelect=document.getElementById('color');
  const variantPreview=document.getElementById('variant-preview');
  const variants={tshirt:{noir:'tshirt-noir.webp',charbon:'tshirt-charbon.webp',marine:'tshirt-marine.webp'},mousepad:{nuit:'tapis-nuit.webp',aurore:'tapis-aurore.webp'},mug:{'':'mug.webp'}};
  const labels={noir:'Noir',charbon:'Charbon',marine:'Bleu marine',nuit:'Nuit',aurore:'Aurore'};
  function updatePreview(){const a=variants[prize]||variants.mug;variantPreview.src='./assets/'+(a[colorSelect.value]||Object.values(a)[0]);variantPreview.alt=prizeNames[prize]+(colorSelect.value?' — '+labels[colorSelect.value]:'');}
  colorSelect.addEventListener('change',updatePreview);
  let claimToken=null, prize=null;
  form.addEventListener('submit',async event=>{
    event.preventDefault();
    status.className='status';
    claimSection.classList.add('hidden');
    claimToken=null;
    const button=form.querySelector('button[type=submit]');
    button.disabled=true;
    try{
      const response=await callApi('/api/validate',{method:'POST',body:JSON.stringify({code:form.elements.code.value.trim()})});
      claimToken=response.claimToken;
      prize=response.prize;
      chosenPrize.textContent=prizeNames[prize]||'Cadeau Halloween';
      tshirtSize.classList.toggle('hidden',prize!=='tshirt');
      tshirtSelect.required=prize==='tshirt';
      colorField.classList.toggle('hidden',prize==='mug');
      colorSelect.required=prize!=='mug';
      colorSelect.replaceChildren(new Option('Choisir un coloris',''));
      for(const c of Object.keys(variants[prize]||variants.mug)){if(c)colorSelect.add(new Option(labels[c],c));}
      updatePreview();
      claimSection.classList.remove('hidden');
      setStatus(status,'Code validé ! Complète maintenant tes informations de livraison.', 'success');
      claimSection.scrollIntoView({behavior:'smooth',block:'start'});
    }catch(e){setStatus(status,e.message,'error');}
    finally{button.disabled=false;}
  });
  claimForm.addEventListener('submit',async event=>{
    event.preventDefault();
    claimStatus.className='status';
    if(!claimToken){setStatus(claimStatus,'Valide d’abord ton code.','error');return;}
    const button=claimForm.querySelector('button[type=submit]');
    button.disabled=true;
    const data=Object.fromEntries(new FormData(claimForm).entries());
    delete data.privacyAgreement;
    if(prize!=='tshirt')delete data.size;
    if(prize==='mug')delete data.color;
    try{
      const result=await callApi('/api/claim',{method:'POST',body:JSON.stringify({claimToken,shipping:data,privacyAccepted:true})});
      claimToken=null;
      form.reset();claimForm.reset();
      form.classList.add('hidden');
      claimForm.classList.add('hidden');
      setStatus(claimStatus,result.emailSent?'Merci ! Tes informations ont été enregistrées et envoyées par e-mail à l’organisateur. Aucune commande Printful n’est passée automatiquement.':'Merci ! Tes informations sont enregistrées. L’envoi de l’e-mail a échoué ; l’organisateur peut relancer la notification depuis son espace. Tu n’as pas besoin de renvoyer le formulaire.',result.emailSent?'success':'info');
      setStatus(status,'Ton cadeau a été réclamé avec succès.', 'success');
    }catch(e){setStatus(claimStatus,e.message,'error');}
    finally{button.disabled=false;}
  });
}
function initWheel(){
  const canvas=document.getElementById('wheel-canvas'); if(!canvas)return;
  const textarea=document.getElementById('participants');
  const result=document.getElementById('wheel-result');
  const drawBtn=document.getElementById('draw-wheel');
  const spinBtn=document.getElementById('spin-wheel');
  const removeBtn=document.getElementById('remove-winner');
  const disc=document.getElementById('wheel-disc');
  const counter=document.getElementById('participants-count');
  const ctx=canvas.getContext('2d');
  const colors=['#9d5cdb','#dc6d41','#724d9a','#ffaf65','#73537c','#bb4d5c','#bd865a','#7046a6'];
  let names=[],turn=0,spinning=false,lastWinner=null;
  try{textarea.value=localStorage.getItem('ryllaka-wheel-names')||'';}catch{textarea.value='';}
  function parseNames(){return [...new Set(textarea.value.split(/[\r\n]+/).map(s=>s.trim().slice(0,45)).filter(Boolean))].slice(0,120);}
  function draw(){
    const size=canvas.width, r=size/2;
    ctx.clearRect(0,0,size,size);
    names=parseNames();
    counter.textContent=`${names.length} participant${names.length>1?'s':''}`;
    spinBtn.disabled=names.length<2||spinning;
    for(let i=0;i<Math.max(names.length,1);i++){
      const count=Math.max(names.length,1);
      const a1=-Math.PI/2+2*Math.PI*i/count,a2=-Math.PI/2+2*Math.PI*(i+1)/count;
      ctx.beginPath();ctx.moveTo(r,r);ctx.arc(r,r,r-8,a1,a2);ctx.closePath();ctx.fillStyle=names.length?colors[i%colors.length]:'#5d486c';ctx.fill();ctx.strokeStyle='#f1d3ff55';ctx.lineWidth=2;ctx.stroke();
      if(names.length){
        ctx.save();ctx.translate(r,r);ctx.rotate((a1+a2)/2);
        ctx.fillStyle='#fff7ef';ctx.textAlign='right';ctx.textBaseline='middle';
        const fontSize=names.length>35?12:names.length>20?15:names.length>12?18:23;
        ctx.font=`700 ${fontSize}px sans-serif`;
        let label=names[i];while(ctx.measureText(label).width>r*.70 &&label.length>3)label=label.slice(0,-2)+'…';
        ctx.fillText(label,r-30,0);ctx.restore();
      }
    }
  }
  function randomIndex(n){
    const limit=Math.floor(0x100000000/n)*n, data=new Uint32Array(1);
    do{crypto.getRandomValues(data);}while(data[0]>=limit);
    return data[0]%n;
  }
  function persist(){try{localStorage.setItem('ryllaka-wheel-names',textarea.value);}catch{} }
  textarea.addEventListener('input',()=>{if(!spinning){persist();draw();result.textContent='';lastWinner=null;removeBtn.disabled=true;}});
  drawBtn.addEventListener('click',()=>{if(spinning)return;draw();result.textContent='Roue mise à jour.';});
  spinBtn.addEventListener('click',()=>{
    if(spinning)return;
    names=parseNames();if(names.length<2)return;
    spinning=true;spinBtn.disabled=true;removeBtn.disabled=true;textarea.disabled=true;
    const index=randomIndex(names.length),segment=360/names.length;
    const required=(360-(index+.5)*segment)%360;
    turn+=360*6+((required-(turn%360)+360)%360);
    lastWinner=names[index];
    result.textContent='La roue tourne…';
    disc.style.transform=`rotate(${turn}deg)`;
    let completed=false;
    function finish(){if(completed)return;completed=true;spinning=false;textarea.disabled=false;spinBtn.disabled=false;removeBtn.disabled=false;result.textContent=`🎉 ${lastWinner} remporte le tirage !`;}
    disc.addEventListener('transitionend',finish,{once:true});
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)finish();
  });
  removeBtn.addEventListener('click',()=>{
    if(!lastWinner||spinning)return;
    const current=parseNames().filter(n=>n!==lastWinner);
    textarea.value=current.join('\n');persist();draw();result.textContent=`${lastWinner} a été retiré·e pour le prochain tirage.`;lastWinner=null;removeBtn.disabled=true;
  });
  draw();
}
function initAdmin(){
  const adminForm=document.getElementById('admin-code-form');if(!adminForm)return;
  const tokenInput=document.getElementById('admin-token');
  const status=document.getElementById('admin-status');
  const output=document.getElementById('generated-code');
  const claimsOutput=document.getElementById('claim-results');
  function adminHeaders(){const token=tokenInput.value.trim();if(!token)throw new Error('Entre le jeton administrateur configuré dans Cloudflare.');return {'Authorization':`Bearer ${token}`};}
  adminForm.addEventListener('submit',async ev=>{
    ev.preventDefault();output.classList.add('hidden');
    try{
      const prize=adminForm.elements.prize.value;
      const response=await callApi('/api/admin/codes',{method:'POST',headers:adminHeaders(),body:JSON.stringify({prize})});
      output.textContent=response.code;
      output.classList.remove('hidden');
      setStatus(status,'Code à usage unique créé. Copie-le maintenant et envoie-le uniquement au gagnant en message privé.', 'success');
    }catch(e){setStatus(status,e.message,'error');}
  });
  const importForm=document.getElementById('import-code-form');
  if(importForm){importForm.addEventListener('submit',async ev=>{
    ev.preventDefault();const box=document.getElementById('import-codes');const importedStatus=document.getElementById('import-status');
    const lines=box.value.split(/\r?\n/).map(s=>s.trim()).filter(x=>x && !x.startsWith('#'));
    if(!lines.length){setStatus(importedStatus,'Colle au moins un code.','error');return;}
    if(lines.length>9){setStatus(importedStatus,'Ne pas importer plus de neuf codes à la fois.','error');return;}
    let done=0,failed=[];
    const submit=importForm.querySelector('button');submit.disabled=true;
    try{const headers=adminHeaders();
      for(let i=0;i<lines.length;i++){
        const [prize,code,...rest]=lines[i].split(';').map(x=>x.trim());
        if(rest.length||!['tshirt','mug','mousepad'].includes(prize)||!/^RYL-(?:[0-9A-F]{8}-){3}[0-9A-F]{8}$/i.test(code||'')) {failed.push(i+1);continue;}
        try{await callApi('/api/admin/codes/import',{method:'POST',headers,body:JSON.stringify({prize,code})});done++;}
        catch{failed.push(i+1);}
      }
      if(!failed.length)box.value='';
      setStatus(importedStatus,`${done} code(s) importé(s).${failed.length?' Lignes en échec : '+failed.join(', ')+'. Les doublons déjà importés sont refusés.':''}`,failed.length?'info':'success');
    }catch(e){setStatus(importedStatus,e.message,'error');}finally{submit.disabled=false;}
  });}
  const codeResults=document.getElementById('code-results');
  document.getElementById('list-codes').addEventListener('click',async()=>{
    codeResults.replaceChildren();
    try{
      const response=await callApi('/api/admin/codes',{headers:adminHeaders()});
      if(!response.codes.length){codeResults.textContent='Aucun code généré.';return;}
      response.codes.forEach(item=>{
        const row=document.createElement('div');row.className='claim';
        const label=document.createElement('div');
        const state=item.revoked_at?'révoqué':item.consumed_at?'utilisé':'en attente';
        label.textContent=`${prizeNames[item.prize]} — ${state}`;
        const help=document.createElement('small');help.textContent='Code secret non récupérable après sa création.';
        row.append(label,help);
        if(!item.revoked_at&&!item.consumed_at){
          const btn=document.createElement('button');btn.type='button';btn.className='btn btn-danger btn-small';btn.style.marginTop='10px';btn.textContent='Révoquer ce code';
          btn.addEventListener('click',async()=>{
            if(!confirm(`Révoquer le code du lot ${prizeNames[item.prize]} ? Le gagnant ne pourra plus l'utiliser.`))return;
            try{await callApi(`/api/admin/codes/${item.id}`,{method:'DELETE',headers:adminHeaders()});document.getElementById('list-codes').click();}
            catch(e){setStatus(status,e.message,'error');}
          });row.append(btn);
        }
        codeResults.append(row);
      });
    }catch(e){setStatus(status,e.message,'error');}
  });
  document.getElementById('copy-code').addEventListener('click',async()=>{
    if(output.classList.contains('hidden'))return;
    try{await navigator.clipboard.writeText(output.textContent);setStatus(status,'Code copié.','success');}catch{setStatus(status,'Sélectionne le code affiché pour le copier.','info');}
  });
  document.getElementById('load-claims').addEventListener('click',async()=>{
    claimsOutput.replaceChildren();
    try{
      const response=await callApi('/api/admin/claims',{headers:adminHeaders()});
      if(!response.claims.length){claimsOutput.textContent='Aucune adresse enregistrée.';return;}
      response.claims.forEach(item=>{
        const card=document.createElement('div');card.className='claim';
        const title=document.createElement('strong');title.textContent=`${prizeNames[item.prize]||item.prize} — ${item.full_name}`;
        const line=document.createElement('div');line.className='meta';line.textContent=`Réclamation ${item.id} • ${item.created_at} • ${item.fulfillment_status} • E-mail : ${item.email_status||'inconnu'}`;
        const addr=document.createElement('address');addr.textContent=[item.full_name,item.company,item.address1,item.address2,`${item.zip} ${item.city}`,item.state,item.country_code,`E-mail : ${item.email||'non indiqué'}`,`Téléphone : ${item.phone||'non indiqué'}`,item.size?`Taille : ${item.size}`:'',item.color?`Coloris : ${item.color}`:''].filter(Boolean).join('\n');
        const buttons=document.createElement('div');buttons.className='claim-actions';
        const copy=document.createElement('button');copy.type='button';copy.className='btn btn-ghost btn-small';copy.textContent='Copier pour Printful';
        copy.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(addr.textContent);setStatus(status,'Coordonnées copiées.','success');}catch{setStatus(status,'Copie impossible depuis ce navigateur.','error');}});
        const toggle=document.createElement('button');toggle.type='button';toggle.className='btn btn-ghost btn-small';toggle.textContent=item.fulfillment_status==='shipped'?'Marquer non expédié':'Marquer expédié';
        toggle.addEventListener('click',async()=>{
          try{await callApi(`/api/admin/claims/${item.id}/status`,{method:'POST',headers:adminHeaders(),body:JSON.stringify({status:item.fulfillment_status==='shipped'?'pending':'shipped'})});document.getElementById('load-claims').click();}
          catch(e){setStatus(status,e.message,'error');}
        });
        const del=document.createElement('button');del.type='button';del.className='btn btn-danger btn-small';del.textContent='Supprimer les coordonnées';
        del.addEventListener('click',async()=>{
          if(!confirm('Supprimer définitivement les coordonnées de ce gagnant ? Cette action est irréversible.'))return;
          try{await callApi(`/api/admin/claims/${item.id}`,{method:'DELETE',headers:adminHeaders()});document.getElementById('load-claims').click();}
          catch(e){setStatus(status,e.message,'error');}
        });
        if(item.email_status!=='sent'){const retry=document.createElement('button');retry.type='button';retry.className='btn btn-ghost btn-small';retry.textContent='Renvoyer l’e-mail';retry.addEventListener('click',async()=>{try{await callApi(`/api/admin/claims/${item.id}/notify`,{method:'POST',headers:adminHeaders(),body:'{}'});setStatus(status,'Notification envoyée à postmaster@lotaku.fr.','success');document.getElementById('load-claims').click();}catch(e){setStatus(status,e.message,'error');}});buttons.append(retry);}
        buttons.append(copy,toggle,del);card.append(title,line,addr,buttons);claimsOutput.append(card);
      });
    }catch(e){setStatus(status,e.message,'error');}
  });
  document.getElementById('purge-claims').addEventListener('click',async()=>{
    if(!confirm('Supprimer toutes les adresses enregistrées depuis plus de 90 jours ?'))return;
    try{const r=await callApi('/api/admin/purge',{method:'POST',headers:adminHeaders(),body:'{}'});setStatus(status,`${r.deleted} ancienne(s) adresse(s) supprimée(s).`,'success');document.getElementById('load-claims').click();}
    catch(e){setStatus(status,e.message,'error');}
  });
}
initRedeem();initWheel();initAdmin();
