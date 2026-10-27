'use strict';
function setStatus(el, message, kind='info') {
  el.textContent = message;
  el.className = 'status show '+kind;
  el.setAttribute('role',kind==='error'?'alert':'status');
}
const prizeNames={tshirt:'T-shirt Halloween',mug:'Mug Halloween',mousepad:'Tapis de souris Halloween'};
function initRedeem(){
  const codeForm = document.getElementById('code-form');
  if (!codeForm) return;

  const claimSection = document.getElementById('claim-section');
  const form = document.getElementById('claim-form');
  const codeInput = document.getElementById('winner-code');
  const codeHidden = document.getElementById('claim-code');
  const prizeHidden = document.getElementById('claim-prize');
  const codeStatus = document.getElementById('code-status');
  const claimStatus = document.getElementById('claim-status');
  const prizeSelect = document.getElementById('prize-select');
  const prizeSelectArea = document.getElementById('prize-choice-field');
  const chosenPrize = document.getElementById('chosen-prize');
  const previewBlock = document.getElementById('preview-block');
  const preview = document.getElementById('variant-preview');
  const optionsBlock = document.getElementById('product-options');
  const sizeField = document.getElementById('size-field');
  const sizeSelect = document.getElementById('size');
  const colorField = document.getElementById('color-field');
  const colorSelect = document.getElementById('color');
  const verifyButton = codeForm.querySelector('button[type="submit"]');
  const submitButton = form.querySelector('button[type="submit"]');
  const variants = {
    tshirt: {noir:'tshirt-noir.webp', charbon:'tshirt-charbon.webp', marine:'tshirt-marine.webp'},
    mousepad: {nuit:'tapis-nuit.webp', aurore:'tapis-aurore.webp'},
    mug: {'':'mug.webp'}
  };
  const labels = {noir:'Noir', charbon:'Charbon', marine:'Bleu marine', nuit:'Nuit', aurore:'Aurore'};
  let acceptedCode = null;
  let acceptedKind = null;
  let sending = false;

  async function getCodeKind(code) {
    if (!window.crypto?.subtle) {
      throw new Error('Ouvre ce site via HTTPS sur GitHub Pages pour vérifier les codes.');
    }
    const bytes = new TextEncoder().encode(code);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const hash = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2,'0')).join('');
    const allowed = window.RYLLAKA_CODE_HASHES || {};
    return Object.hasOwn(allowed, hash) ? allowed[hash] : null;
  }

  function updatePreview() {
    const prize = prizeHidden.value;
    if (!variants[prize]) return;
    const imageMap = variants[prize];
    const chosenColor = colorSelect.value;
    preview.src = './assets/' + (imageMap[chosenColor] || Object.values(imageMap)[0]);
    const colorName = labels[chosenColor];
    preview.alt = 'Aperçu du ' + (prizeNames[prize] || 'cadeau') + (colorName ? ' — ' + colorName : '');
  }

  function setPrize(prize) {
    const valid = Object.hasOwn(variants, prize);
    prizeHidden.value = valid ? prize : '';
    chosenPrize.textContent = valid ? prizeNames[prize] : 'Cadeau au choix';
    previewBlock.classList.toggle('hidden', !valid);
    optionsBlock.classList.toggle('hidden', !valid || prize === 'mug');
    sizeField.classList.toggle('hidden', !valid || prize !== 'tshirt');
    colorField.classList.toggle('hidden', !valid || prize === 'mug');

    sizeSelect.disabled = !valid || prize !== 'tshirt';
    sizeSelect.required = valid && prize === 'tshirt';
    sizeSelect.value = '';
    colorSelect.disabled = !valid || prize === 'mug';
    colorSelect.required = valid && prize !== 'mug';
    colorSelect.replaceChildren(new Option('Choisir une couleur', ''));
    if (valid) {
      for (const color of Object.keys(variants[prize])) {
        if (color) colorSelect.add(new Option(labels[color], color));
      }
      updatePreview();
    }
  }

  prizeSelect.addEventListener('change', () => {
    if (acceptedKind !== 'universal') return;
    setPrize(prizeSelect.value);
  });
  colorSelect.addEventListener('change', updatePreview);

  codeForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    // Un nouvel essai masque systématiquement l'ancien formulaire : pas d'accès avec un code erroné.
    claimSection.classList.add('hidden');
    form.classList.remove('hidden');
    acceptedCode = null;
    acceptedKind = null;
    codeHidden.value = '';
    prizeHidden.value = '';
    setPrize('');
    claimStatus.className = 'status';
    claimStatus.textContent = '';

    const code = codeInput.value.trim().toUpperCase();
    if (!code) {
      setStatus(codeStatus, 'Saisis le code reçu en message privé.', 'error');
      return;
    }
    verifyButton.disabled = true;
    try {
      const kind = await getCodeKind(code);
      if (!kind || (kind !== 'universal' && !Object.hasOwn(variants, kind))) {
        setStatus(codeStatus, 'Code invalide. Vérifie les caractères du code reçu en MP.', 'error');
        return;
      }
      acceptedCode = code;
      acceptedKind = kind;
      codeHidden.value = code;
      const universal = kind === 'universal';
      prizeSelectArea.classList.toggle('hidden', !universal);
      prizeSelect.disabled = !universal;
      prizeSelect.required = universal;
      prizeSelect.value = universal ? '' : kind;
      setPrize(universal ? '' : kind);
      claimSection.classList.remove('hidden');
      setStatus(codeStatus, universal
        ? 'Code universel reconnu. Choisis maintenant l’un des trois cadeaux.'
        : 'Code reconnu : ' + prizeNames[kind] + '. Ce cadeau ne peut pas être changé.', 'success');
      claimSection.scrollIntoView({behavior:'smooth', block:'start'});
    } catch (error) {
      setStatus(codeStatus, error.message || 'Vérification impossible. Réessaie.', 'error');
    } finally {
      verifyButton.disabled = false;
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (sending) return;
    const prize = prizeHidden.value;
    if (!acceptedCode || !acceptedKind || !Object.hasOwn(variants, prize) ||
        (acceptedKind !== 'universal' && prize !== acceptedKind) ||
        (acceptedKind === 'universal' && prize !== prizeSelect.value)) {
      setStatus(claimStatus, 'Le code ou le cadeau ne correspond pas. Vérifie ton code avant de continuer.', 'error');
      return;
    }
    const endpoint = window.RYLLAKA_FORMSPREE_ENDPOINT || '';
    if (!/^https:\/\/formspree\.io\/f\/[a-zA-Z0-9]+$/.test(endpoint)) {
      setStatus(claimStatus, 'Le formulaire n’est pas encore activé par l’organisateur (Formspree).', 'error');
      return;
    }
    sending = true;
    submitButton.disabled = true;
    const data = new FormData(form);
    data.set('prize', prize);
    data.set('lot', prizeNames[prize]);
    data.set('reference_code', acceptedCode);
    data.set('_subject', 'Ryllaka Halloween — nouvelle réclamation à vérifier');
    if (prize !== 'tshirt') data.delete('size');
    if (prize === 'mug') data.delete('color');
    try {
      const response = await fetch(endpoint, {method:'POST', body:data, headers:{Accept:'application/json'}});
      if (!response.ok) throw new Error('Le service de formulaire a refusé l’envoi.');
      form.classList.add('hidden');
      codeForm.classList.add('hidden');
      setStatus(claimStatus, 'Réclamation envoyée ! L’organisateur vérifiera ton code, ton lot et les éventuels doublons avant toute commande Printful.', 'success');
    } catch (error) {
      setStatus(claimStatus, 'Envoi impossible : ' + error.message + ' Réessaie plus tard.', 'error');
    } finally {
      sending = false;
      submitButton.disabled = false;
    }
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
initRedeem();
initWheel();
