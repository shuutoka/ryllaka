'use strict';
function setStatus(el, message, kind='info') {
  el.textContent = message;
  el.className = 'status show '+kind;
  el.setAttribute('role',kind==='error'?'alert':'status');
}
const prizeNames={tshirt:'T-shirt Halloween',mug:'Mug Halloween',mousepad:'Tapis de souris Halloween'};
function initRedeem(){
 const codeForm=document.getElementById('code-form'); if(!codeForm)return;
 const claim=document.getElementById('claim-section'), form=document.getElementById('claim-form');
 const status=document.getElementById('code-status'), result=document.getElementById('claim-status');
 const prizeSelect=document.getElementById('prize-select'), chosen=document.getElementById('chosen-prize');
 const size=document.getElementById('size-field'), sizeSelect=document.getElementById('size');
 const color=document.getElementById('color-field'), colorSelect=document.getElementById('color');
 const preview=document.getElementById('variant-preview');
 const variants={tshirt:{noir:'tshirt-noir.webp',charbon:'tshirt-charbon.webp',marine:'tshirt-marine.webp'},mousepad:{nuit:'tapis-nuit.webp',aurore:'tapis-aurore.webp'},mug:{'':'mug.webp'}};
 const labels={noir:'Noir',charbon:'Charbon',marine:'Bleu marine',nuit:'Nuit',aurore:'Aurore'};
 function update(){const p=prizeSelect.value; chosen.textContent=prizeNames[p]||'Cadeau'; size.classList.toggle('hidden',p!=='tshirt');sizeSelect.required=p==='tshirt';color.classList.toggle('hidden',p==='mug');colorSelect.required=p!=='mug';colorSelect.replaceChildren(new Option('Choisir un coloris',''));for(const c of Object.keys(variants[p]||variants.mug)){if(c)colorSelect.add(new Option(labels[c],c));} updatePreview();}
 function updatePreview(){const p=prizeSelect.value;const v=variants[p]||variants.mug;preview.src='./assets/'+(v[colorSelect.value]||Object.values(v)[0]);preview.alt='Aperçu du lot';}
 prizeSelect.addEventListener('change',update);colorSelect.addEventListener('change',updatePreview);
 codeForm.addEventListener('submit',e=>{e.preventDefault();const code=document.getElementById('winner-code').value.trim();if(code.length<12){setStatus(status,'Entre le code complet reçu en message privé.','error');return;} document.getElementById('claim-code').value=code;claim.classList.remove('hidden');update();setStatus(status,'Référence enregistrée. Ton lot sera vérifié manuellement par l’organisateur après réception du formulaire.','info');claim.scrollIntoView({behavior:'smooth',block:'start'});});
 form.addEventListener('submit',async e=>{e.preventDefault();const endpoint=window.RYLLAKA_FORMSPREE_ENDPOINT||'';if(!/^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(endpoint)){setStatus(result,'Le formulaire n’est pas encore activé par l’organisateur (Formspree).','error');return;}const button=form.querySelector('button[type=submit]');button.disabled=true;const data=new FormData(form);data.set('lot',prizeNames[prizeSelect.value]);data.set('reference_code',document.getElementById('claim-code').value);data.set('_subject','Ryllaka Halloween — nouvelle réclamation à vérifier');if(prizeSelect.value!=='tshirt')data.delete('size');if(prizeSelect.value==='mug')data.delete('color');try{const res=await fetch(endpoint,{method:'POST',body:data,headers:{Accept:'application/json'}});if(!res.ok)throw Error('Le service de formulaire a refusé l’envoi.');form.classList.add('hidden');codeForm.classList.add('hidden');setStatus(result,'Réclamation envoyée ! L’organisateur vérifiera ton code avant de préparer la commande Printful.','success');}catch(err){setStatus(result,'Envoi impossible : '+err.message+' Réessaie plus tard.','error');}finally{button.disabled=false;}});
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
initRedeem();
initWheel();
