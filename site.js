(() => {
  'use strict';
  document.documentElement.classList.add('js');
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const config = window.CIMO_CONFIG;
  const menu = $('#site-nav'), toggle = $('.menu-toggle');
  const background = [$('#main'),$('footer'),$('.mobile-conversion')];
  function closeMenu(restore = false) {
    menu.classList.remove('open'); toggle.setAttribute('aria-expanded','false');
    document.body.classList.remove('menu-open'); background.forEach(el=>{if(el)el.inert=false;});
    if(restore)toggle.focus();
  }
  if(menu && toggle) {
    toggle.hidden=false;
    toggle.addEventListener('click',()=>{
      if(menu.classList.contains('open')) {closeMenu(true);return;}
      menu.classList.add('open');toggle.setAttribute('aria-expanded','true');document.body.classList.add('menu-open');
      background.forEach(el=>{if(el)el.inert=true;}); menu.querySelector('a').focus({preventScroll:true});
    });
    menu.addEventListener('click',event=>{if(event.target.closest('a'))closeMenu();});
    $('.site-header .brand').addEventListener('click',()=>closeMenu());
    document.addEventListener('keydown',event=>{
      if(!menu.classList.contains('open'))return;
      if(event.key==='Escape'){event.preventDefault();closeMenu(true);}
      if(event.key==='Tab') {
        const items=[toggle,...menu.querySelectorAll('a[href]')],first=items[0],last=items.at(-1);
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
      }
    });
    window.matchMedia('(min-width:1101px)').addEventListener('change',event=>{if(event.matches)closeMenu();});
  }
  $('#year').textContent=String(new Date().getFullYear());
  if('IntersectionObserver' in window) {
    const observer=new IntersectionObserver(entries=>{
      const shown=entries.filter(e=>e.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
      if(!shown)return;
      $$('#site-nav>a').forEach(a=>{if(a.getAttribute('href')==='#'+shown.target.id)a.setAttribute('aria-current','location');else a.removeAttribute('aria-current');});
    },{rootMargin:'-15% 0px -55% 0px',threshold:0});
    ['services','color-studio','standard','why-cimo','contact'].forEach(id=>observer.observe($('#'+id)));
  }
  const form=$('#estimate-form'),readyPanel=$('#message-ready');
  let colorSummary='';
  function showForm(){form.hidden=false;readyPanel.hidden=true;$('#contact-status').textContent='';}
  function clearColors(){colorSummary='';$('#estimate-color-note').hidden=true;$('#estimate-colors').textContent='';showForm();}
  document.addEventListener('cimo:colors',event=>{
    colorSummary=String(event.detail?.colors||'').slice(0,650);
    $('#estimate-colors').textContent=colorSummary;$('#estimate-color-note').hidden=!colorSummary;
    showForm();
  });
  $('#remove-estimate-colors').addEventListener('click',clearColors);
  $$('.service-estimate').forEach(a=>a.addEventListener('click',()=>{form.elements.service.value=a.dataset.service;showForm();}));
  form.elements.phone.addEventListener('input',()=>form.elements.phone.setCustomValidity(''));
  form.elements.name.addEventListener('input',()=>form.elements.name.setCustomValidity(''));
  form.addEventListener('submit',event=>{
    event.preventDefault();
    const name=form.elements.name.value.trim(),phone=form.elements.phone.value.trim(),digits=phone.replace(/\D/g,'');
    form.elements.name.setCustomValidity(name?'':'Please enter your name.');
    form.elements.phone.setCustomValidity(digits.length>=7&&digits.length<=15?'':'Please enter a phone number with 7 to 15 digits.');
    if(!form.reportValidity())return;
    const service=form.elements.service.value,email=form.elements.email.value.trim(),description=form.elements.description.value.trim();
    const message=[`Hi Justin, I’d like a free estimate.`,``,`Name: ${name}`,`Phone: ${phone}`,email?`Email: ${email}`:null,`Project: ${service}`,description?`\nAbout the project:\n${description}`:null,colorSummary?`\nColor Studio choices (visual approximations):\n${colorSummary}`:null,`\nPlease let me know the next step. Thank you!`].filter(line=>line!==null).join('\n');
    $('#prepared-message').value=message;
    $('#email-request').href=`mailto:${config.email}?subject=${encodeURIComponent('Free painting estimate request')}&body=${encodeURIComponent(message)}`;
    const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
    $('#text-request').href=`sms:${config.phone}${ios?'&':'?'}body=${encodeURIComponent(message)}`;
    form.hidden=true;readyPanel.hidden=false;
    $('#email-request').focus({preventScroll:true});
    $('#contact-status').textContent='Nothing has been sent yet. Open an app, review the message, then send it.';
  });
  $('#copy-request').addEventListener('click',async()=>{
    const textarea=$('#prepared-message');
    try {
      if(!navigator.clipboard?.writeText)throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(textarea.value);$('#contact-status').textContent='Message copied. Paste it into your email or text app to send.';
    } catch {
      textarea.focus();textarea.select();
      let copied=false;try{copied=document.execCommand('copy');}catch{/* Manual selection remains available. */}
      $('#contact-status').textContent=copied?'Message copied. Paste it into your email or text app to send.':'Your message is selected. Copy it, then paste it into your email or text app.';
    }
  });
  $('#edit-request').addEventListener('click',()=>{showForm();form.elements.name.focus({preventScroll:true});});
})();
