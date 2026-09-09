/* One Color Studio interface for mouse, touch, keyboard and expanded view. */
(() => {
  'use strict';
  const P = window.CimoPaint, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const canvas = $('#studio-canvas');
  if (!canvas || !P) return;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const viewport = $('#canvas-viewport'), workspace = $('#studio-workspace');
  const originalCanvas = document.createElement('canvas'), previewCanvas = document.createElement('canvas');
  const originalCtx = originalCanvas.getContext('2d', { willReadFrequently: true });
  const previewCtx = previewCanvas.getContext('2d');
  const maskCanvas = document.createElement('canvas'), maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
  const COLORS = {
    favorites: [['Soft Ivory','#eee8dc'],['Warm Linen','#ddd1bd'],['Sage','#89927a'],['Coastal Blue','#66899a'],['Terracotta','#a85e49'],['Stone','#aaa091'],['Forest','#394c3d'],['Deep Navy','#263947']],
    neutrals: [['Porcelain','#f3eee4'],['Cloud White','#e7ebea'],['Pale Mist','#d9dfdc'],['Warm Linen','#ddd1bd'],['Sand','#c3af91'],['Mushroom','#918476'],['Pewter','#777773'],['Charcoal','#343534']],
    earth: [['Soft Ivory','#eee8dc'],['Sand','#c3af91'],['Clay','#bd8068'],['Terracotta','#a85e49'],['Ochre','#aa7b43'],['Canyon','#855142'],['Brick','#853b32'],['Plum','#59404f']],
    cool: [['Cloud White','#e7ebea'],['Quiet Frost','#dce3e2'],['Sage','#89927a'],['Olive','#687052'],['Forest','#394c3d'],['Coastal Blue','#66899a'],['Slate Blue','#526b7a'],['Deep Navy','#263947']]
  };
  const colorName = hex => Object.values(COLORS).flat().find(c => c[1].toLowerCase() === hex.toLowerCase())?.[0] || 'Custom color';
  const state = { width: 0, height: 0, original: null, features: null, surfaces: [], active: 0, template: 'living', tool: 'select', compare: 100, zoom: 1, panX: 0, panY: 0, history: [], future: [], polygon: [], dirty: false, busy: false, generation: 0, initial: null, cursor: null };
  let renderQueued = false, paintDirty = true, lastFocus = null, pendingReplace = null, strokeStart = null, singleStart = null, gesture = null;
  const pointers = new Map();
  const MAX_HISTORY = 8, MAX_SURFACES = 4;
  function status(message, type = '') {
    $('#studio-status').textContent = message;
    $('#studio-status').className = `studio-status${type ? ` is-${type}` : ''}`;
  }
  function busy(on, message) {
    state.busy = on; workspace.setAttribute('aria-busy', String(on));
    $('#studio-loading').hidden = !on;
    if (message) { $('#studio-loading').textContent = message; status(message, on ? 'busy' : ''); }
    updateButtons();
  }
  const active = () => state.surfaces[state.active];
  const ready = () => Boolean(state.original && !state.busy);
  function pushHistory() {
    state.history.push(P.cloneScene(state));
    if (state.history.length > MAX_HISTORY) state.history.shift();
    state.future.length = 0; state.dirty = true;
  }
  function restore(snapshot) { state.active = snapshot.active; state.surfaces = snapshot.surfaces; state.polygon = []; paintDirty = true; sync(); }
  function undo() {
    if (!ready()) return;
    if (state.polygon.length) { state.polygon.pop(); updateOutline(); requestDraw(); return; }
    if (!state.history.length) return;
    state.future.push(P.cloneScene(state)); restore(state.history.pop()); status('Undone. Your selection is preserved at full resolution.');
  }
  function redo() {
    if (!ready() || !state.future.length) return;
    state.history.push(P.cloneScene(state)); restore(state.future.pop()); status('Redone.');
  }
  function updateButtons() {
    $('#undo').disabled = state.busy || (!state.history.length && !state.polygon.length);
    $('#redo').disabled = state.busy || !state.future.length;
    $('#add-surface').disabled = !ready() || state.surfaces.length >= MAX_SURFACES;
    const painted = state.surfaces.some(s => s.enabled && P.hasPixels(s.mask));
    $('#save-preview').disabled = !ready() || !painted;
    $('#use-preview').disabled = !ready() || !painted;
    for (const id of ['clear-surface','reset-studio','zoom-in','zoom-out','zoom-fit','custom-color','hex-color','tolerance','brush-size','show-mask']) $( '#' + id).disabled = !ready();
    $$('.palette button,[data-tool],#surface-list button').forEach(b => b.disabled = !ready());
    $('#zoom-out').disabled = !ready() || state.zoom <= 1;
    $('#zoom-in').disabled = !ready() || state.zoom >= 4;
  }
  function drawSurfaces() {
    const focused = document.activeElement?.closest('#surface-list button')?.dataset.surface;
    $('#surface-list').replaceChildren(...state.surfaces.map((s, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.surface = i;
      b.setAttribute('aria-pressed', String(i === state.active)); b.classList.toggle('surface-off', !s.enabled);
      b.setAttribute('aria-label', `${s.name}${s.enabled ? `, ${colorName(s.color)}` : ', not painted'}`);
      const chip = document.createElement('i'); chip.style.background = s.color; chip.setAttribute('aria-hidden','true');
      b.append(chip, document.createTextNode(s.name)); return b;
    }));
    if (focused != null) $(`#surface-list button[data-surface="${focused}"]`)?.focus({ preventScroll: true });
  }
  function drawPalette() {
    const family = $('#palette-family').value;
    $('#palette').replaceChildren(...COLORS[family].map(([name, hex]) => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.color = hex;
      b.style.setProperty('--swatch', hex); b.title = `${name} · ${hex.toUpperCase()}`;
      b.setAttribute('aria-label', `${name}, ${hex}`); b.setAttribute('aria-pressed', String(active()?.color === hex));
      return b;
    }));
    updateButtons();
  }
  function sync() {
    const s = active();
    if (s) {
      $('#active-color-chip').style.background = s.color;
      $('#active-color-name').textContent = colorName(s.color);
      $('#active-color-hex').textContent = s.color.toUpperCase();
      $('#custom-color').value = s.color; $('#hex-color').value = s.color.toUpperCase();
      $('#hex-color').setCustomValidity('');
      $$('#palette button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.color === s.color)));
    }
    drawSurfaces(); updateButtons(); updateOutline(); requestDraw();
  }
  function selectColor(hex) {
    if (!ready() || !active()) return;
    try { P.hexRGB(hex); } catch { return; }
    hex = hex.toLowerCase();
    if (active().color !== hex || !active().enabled) pushHistory();
    active().color = hex; active().enabled = P.hasPixels(active().mask);
    state.compare = 100; syncCompare(); paintDirty = true; sync();
    status(active().enabled ? `${colorName(hex)} on ${active().name.toLowerCase()}. Slide below the colors to compare.` : `${colorName(hex)} is ready. Select or outline an area to paint this surface.`);
  }
  function requestDraw() {
    if (renderQueued) return;
    renderQueued = true; requestAnimationFrame(() => { renderQueued = false; draw(); });
  }
  function draw() {
    if (!state.original) return;
    if (paintDirty) {
      const pixels = P.recolor(state.original, state.surfaces);
      previewCtx.putImageData(new ImageData(pixels, state.width, state.height), 0, 0);
      paintDirty = false;
    }
    ctx.clearRect(0,0,state.width,state.height); ctx.drawImage(originalCanvas,0,0);
    const split = state.width * state.compare / 100;
    if (split > 0) { ctx.save(); ctx.beginPath(); ctx.rect(0,0,split,state.height); ctx.clip(); ctx.drawImage(previewCanvas,0,0); ctx.restore(); }
    if (split > 0 && split < state.width) {
      ctx.save(); ctx.strokeStyle = '#fff'; ctx.lineWidth = Math.max(2,state.width/450); ctx.beginPath(); ctx.moveTo(split,0); ctx.lineTo(split,state.height); ctx.stroke(); ctx.restore();
    }
    if ($('#show-mask').checked && active() && state.compare > 0) {
      const overlay = new ImageData(state.width,state.height);
      for(let p=0;p<active().mask.length;p++) if(active().mask[p]) { const i=p*4; overlay.data[i]=17; overlay.data[i+1]=170; overlay.data[i+2]=207; overlay.data[i+3]=Math.round(active().mask[p]*.28); }
      maskCtx.putImageData(overlay,0,0); ctx.drawImage(maskCanvas,0,0);
    }
    if (state.polygon.length) {
      ctx.save(); ctx.lineWidth = Math.max(2, state.width/350); ctx.strokeStyle='#fff'; ctx.fillStyle='#14b8c444';
      ctx.beginPath(); state.polygon.forEach((p,i)=> i ? ctx.lineTo(p.x,p.y) : ctx.moveTo(p.x,p.y)); if(state.polygon.length>2) ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle='#123b39'; state.polygon.forEach(p=> {ctx.beginPath();ctx.arc(p.x,p.y,Math.max(4,state.width/150),0,Math.PI*2);ctx.fill();ctx.stroke();});ctx.restore();
    }
    if (state.cursor && document.activeElement === canvas) {
      const {x,y}=state.cursor; ctx.save(); ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,10,0,Math.PI*2);ctx.stroke();ctx.strokeStyle='#181715';ctx.lineWidth=1;ctx.stroke();ctx.restore();
    }
  }
  function polygonMask(points, exclusions = []) {
    maskCtx.clearRect(0,0,state.width,state.height); maskCtx.globalCompositeOperation='source-over'; maskCtx.fillStyle='#fff';
    const path=pts=>{maskCtx.beginPath();pts.forEach((p,i)=>i?maskCtx.lineTo(p[0]*state.width/1200,p[1]*state.height/750):maskCtx.moveTo(p[0]*state.width/1200,p[1]*state.height/750));maskCtx.closePath();maskCtx.fill();};
    path(points); maskCtx.globalCompositeOperation='destination-out'; exclusions.forEach(path); maskCtx.globalCompositeOperation='source-over';
    const d=maskCtx.getImageData(0,0,state.width,state.height).data, mask=new Uint8Array(state.width*state.height);
    for(let p=0;p<mask.length;p++)mask[p]=d[p*4+3]; return mask;
  }
  function makeTemplateSurfaces(name) {
    let regions;
    if(name==='living') {
      // Hand-bounded wall geometry. Furniture, photo grid, mirror and floor are excluded.
      const mask=polygonMask([[0,44],[970,42],[962,442],[854,449],[828,475],[773,475],[772,539],[642,539],[640,539],[610,538],[607,465],[470,459],[458,449],[370,447],[336,455],[248,462],[226,486],[216,541],[0,541]], [
        [[329,132],[639,131],[639,442],[337,442]],
        [[709,201],[831,201],[832,490],[698,491]],
        [[75,514],[95,514],[151,537],[165,552],[61,554]],
        [[571,432],[621,432],[630,544],[578,542]]
      ]);
      // Protect foliage and thin dark objects inside the geometry, without outward blur.
      for(let p=0;p<mask.length;p++) if(mask[p]) {
        const i=p*4,r=state.original[i],g=state.original[i+1],b=state.original[i+2];
        const x=(p%state.width)*1200/state.width,y=Math.floor(p/state.width)*750/state.height;
        const nearPlant=(x<340&&y>257)||(x>632&&x<837&&y>204)||(x>543&&x<674&&y>335);
        if(nearPlant && (g>r-4 || r-g>32 || g-b>40 || P.luminance(state.original,i)<126))mask[p]=0;
      }
      regions=[{name:'Back wall',mask}];
    } else {
      regions=[
        {name:'Back wall',mask:polygonMask([[340,101],[920,92],[1199,2],[1199,626],[340,489]],[[[712,154],[1072,131],[1072,410],[712,382]],[[700,380],[1084,409],[1084,421],[700,392]]])},
        {name:'Left wall',mask:polygonMask([[0,2],[328,101],[328,488],[0,687]])}
      ];
    }
    return regions.map((r,i)=>({...r,color:i===0?'#89927a':'#ddd1bd',enabled:i===0,reference:P.referenceLight(state.original,r.mask)}));
  }
  async function decode(blobOrURL) {
    if(typeof blobOrURL==='string') {
      const img=new Image(); img.decoding='async'; img.src=blobOrURL;
      await img.decode(); return img;
    }
    const file=blobOrURL;
    if(file.size>20*1024*1024)throw new Error('This photo is larger than 20 MB. Choose a smaller copy.');
    if(file.size===0)throw new Error('This file is empty. Please choose another photo.');
    if(/svg|gif/i.test(file.type)||/\.(svg|gif)$/i.test(file.name))throw new Error('Choose a still JPEG, PNG, WebP, AVIF or supported phone photo, not an SVG or GIF.');
    if(file.type&&!file.type.startsWith('image/'))throw new Error('Please choose an image file.');
    if('createImageBitmap' in window) {try{return await createImageBitmap(file,{imageOrientation:'from-image'});}catch{/* Safari and phone-format fallback below. */}}
    const url=URL.createObjectURL(file);
    try {const img=new Image();img.src=url;await img.decode();return img;}
    catch {throw new Error(/heic|heif/i.test(file.type+' '+file.name)?'This browser cannot open this HEIC photo. Export it as JPEG, then try again.':'This photo could not be opened. Try a JPEG, PNG or WebP copy.');}
    finally {URL.revokeObjectURL(url);}
  }
  async function load(source, template) {
    const generation=++state.generation;
    busy(true,template?'Preparing your sample room…':'Opening your photo on this device…');
    let image;
    try {
      image=await decode(source);
      if(generation!==state.generation)return;
      const iw=image.width||image.naturalWidth,ih=image.height||image.naturalHeight;
      if(!iw||!ih||iw*ih>80_000_000)throw new Error('This image is too large to edit safely. Export a smaller JPEG copy.');
      const cropHeight=template==='living'?750:ih;
      const scale=Math.min(1,1400/iw,1400/cropHeight,Math.sqrt(1_000_000/(iw*cropHeight)));
      const w=Math.max(1,Math.round(iw*scale)),h=Math.max(1,Math.round(cropHeight*scale));
      // Yield once so loading feedback is visible before pixel processing.
      await new Promise(resolve=>setTimeout(resolve,0)); if(generation!==state.generation)return;
      for(const c of [canvas,originalCanvas,previewCanvas,maskCanvas]){c.width=w;c.height=h;}
      originalCtx.fillStyle='#fff';originalCtx.fillRect(0,0,w,h);originalCtx.drawImage(image,0,0,iw,cropHeight,0,0,w,h);
      state.width=w;state.height=h;state.original=originalCtx.getImageData(0,0,w,h).data;state.features=null;
      state.template=template;state.active=0;state.polygon=[];state.history=[];state.future=[];state.dirty=false;state.cursor=null;
      state.surfaces=template?makeTemplateSurfaces(template):[{name:'Area 1',color:'#89927a',enabled:false,mask:new Uint8Array(w*h),reference:180}];
      state.initial=P.cloneScene(state);state.compare=100;paintDirty=true;fit();setTool('select',false);
      $('#template-select').value=template||'upload';
      $('#studio-source-note').textContent=template==='living'?'Sample room, not a Cimo project. Colors are visual approximations.':template==='architectural'?'Illustrated room template. Colors are visual approximations.':'Your photo is edited locally. It is not uploaded or stored by Cimo Color Studio.';
      busy(false);syncCompare();drawPalette();sync();
      status(template?'The back wall is ready. Choose any color, or upload your own photo.':'Photo ready. Tap a flat area with Select, or use Outline for exact edges.');
    } catch(error) {
      if(generation!==state.generation)return;
      busy(false);status(error.message||'The image could not be loaded. Try uploading a photo.', 'error');
      $('#template-select').value=state.original?(state.template||'upload'):'living';
      if(!state.original){$('#studio-loading').hidden=false;$('#studio-loading').textContent='The sample could not load. Upload your photo or choose the illustrated room.';}
    } finally {image?.close?.();}
  }
  function loadTemplate(name){return load(name==='living'?'assets/studio-room.webp':'assets/room-illustration.svg',name);}
  function requestSource(callback) {
    if(state.dirty){pendingReplace=callback;$('#replace-warning').hidden=false;$('#cancel-replace').focus({preventScroll:true});}
    else callback();
  }
  $('#photo-input').addEventListener('change',event=>{const file=event.target.files?.[0];event.target.value='';if(file)requestSource(()=>load(file,null));});
  $('#template-select').addEventListener('change',event=>{const name=event.target.value;event.target.value=state.template||'upload';requestSource(()=>loadTemplate(name));});
  $('#cancel-replace').addEventListener('click',()=>{pendingReplace=null;$('#replace-warning').hidden=true;$('#photo-input').focus({preventScroll:true});});
  $('#confirm-replace').addEventListener('click',()=>{const next=pendingReplace;pendingReplace=null;$('#replace-warning').hidden=true;next?.();});
  function setTool(tool, announce=true) {
    if(strokeStart)cancelStroke();
    state.tool=tool;state.polygon=[];singleStart=null;
    $$('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===tool)));
    canvas.style.touchAction=['move','brush','erase'].includes(tool)?'none':'pan-y pinch-zoom';
    canvas.style.cursor=tool==='move'?'grab':'crosshair';
    updateOutline();requestDraw();
    if(announce)status({select:'Tap a flat area. Select replaces the active area; Add surface keeps a second color.',outline:'Tap around the area’s edges, then choose Apply outline. The outline replaces the active selection.',cut:'Tap around a window or object, then Apply outline to protect it from paint.',brush:'Drag to add paint to the active area. Use a smaller brush for edges.',erase:'Drag to remove paint from the active area. Use Outline a cutout for crisp window edges.',move:'Drag to move the image. Pinch with two fingers to zoom, or use + and −. Fit resets the view.'}[tool]);
  }
  $$('[data-tool]').forEach(b=>b.addEventListener('click',()=>ready()&&setTool(b.dataset.tool)));
  function updateOutline(){const show=['outline','cut'].includes(state.tool);$('#outline-bar').hidden=!show;$('#apply-outline').disabled=!ready()||state.polygon.length<3;$('#outline-hint').textContent=state.polygon.length?`${state.polygon.length} points. ${state.tool==='cut'?'Cut out':'Paint'} this area?`:'Tap at least 3 points around the edges.';updateButtons();}
  async function selectAt(point) {
    if(!ready())return;
    if(['outline','cut'].includes(state.tool)){state.polygon.push(point);updateOutline();requestDraw();return;}
    if(state.tool!=='select')return;
    if(state.template) {
      const pixel=Math.floor(point.y)*state.width+Math.floor(point.x);
      const index=state.initial.surfaces.findIndex(s=>s.mask[pixel]>127);
      if(index<0){status('That is outside the template walls. Choose a wall button, or Outline a different area.');return;}
      pushHistory();state.active=index;active().mask=state.initial.surfaces[index].mask.slice();active().reference=state.initial.surfaces[index].reference;active().enabled=true;paintDirty=true;state.compare=100;syncCompare();sync();status(`${active().name} selected using its prepared boundary.`);return;
    }
    const generation=state.generation;busy(true,'Finding a connected area…');
    await new Promise(resolve=>setTimeout(resolve,0));
    try {
      if(generation!==state.generation)return;
      if(!state.features)state.features=P.colorFeatures(state.original,state.width,state.height);
      const result=P.selectRegion(state.features,state.width,state.height,point.x,point.y,Number($('#tolerance').value));
      if(result.count<8){status('That area is very small. Try another spot, or use Outline.', 'error');return;}
      if(result.fraction>.65){status('This area blends into too much of the photo. Use Outline to keep floors and objects outside the selection.', 'error');return;}
      pushHistory();active().mask=result.mask;active().reference=P.referenceLight(state.original,result.mask);active().enabled=true;
      state.compare=100;syncCompare();paintDirty=true;status('Area selected. Check the edges, then try a color. Outline and Erase can refine the result.');
    } catch(error) { if(generation===state.generation)status('This area could not be selected. Use Outline or try a smaller image.', 'error'); } finally {if(generation===state.generation){busy(false);sync();}}
  }
  $('#apply-outline').addEventListener('click',()=>{
    if(!ready()||state.polygon.length<3)return;
    const points=state.polygon.map(p=>[p.x*1200/state.width,p.y*750/state.height]);
    const mask=polygonMask(points);pushHistory();
    if(state.tool==='cut')P.combineMask(active().mask,mask,true);else active().mask=mask;
    active().reference=P.referenceLight(state.original,active().mask);active().enabled=P.hasPixels(active().mask);
    const wasCut=state.tool==='cut';state.polygon=[];paintDirty=true;state.compare=100;syncCompare();sync();
    status(wasCut?'Cutout protected. This object will not be recolored on the active surface.':'Outline applied. The area outside your outline is unchanged.');
  });
  $('#cancel-outline').addEventListener('click',()=>{state.polygon=[];updateOutline();requestDraw();status('Outline canceled. The existing selection is unchanged.');});
  function pointAt(event){const r=canvas.getBoundingClientRect();return {x:P.clamp((event.clientX-r.left)/r.width*state.width,0,state.width-1),y:P.clamp((event.clientY-r.top)/r.height*state.height,0,state.height-1)};}
  function clampPan(){if(!state.original)return;const bw=canvas.clientWidth,bh=canvas.clientHeight;const maxX=Math.max(0,(bw*state.zoom-viewport.clientWidth)/2),maxY=Math.max(0,(bh*state.zoom-viewport.clientHeight)/2);state.panX=P.clamp(state.panX,-maxX,maxX);state.panY=P.clamp(state.panY,-maxY,maxY);canvas.style.transform=`translate(${state.panX}px, ${state.panY}px) scale(${state.zoom})`;}
  function fit(){state.zoom=1;state.panX=0;state.panY=0;canvas.style.transform='translate(0px, 0px) scale(1)';updateButtons();}
  function zoomBy(amount){if(!ready())return;state.zoom=P.clamp(state.zoom*amount,1,4);clampPan();updateButtons();}
  $('#zoom-in').addEventListener('click',()=>zoomBy(1.3));$('#zoom-out').addEventListener('click',()=>zoomBy(1/1.3));$('#zoom-fit').addEventListener('click',fit);
  if('ResizeObserver' in window)new ResizeObserver(()=>clampPan()).observe(viewport);
  function beginStroke(point){strokeStart={scene:P.cloneScene(state),last:point};strokeTo(point);}
  function strokeTo(point){
    if(!strokeStart||!active())return;
    const mask=active().mask,from=strokeStart.last;
    const radius=Number($('#brush-size').value)/2*state.width/(canvas.getBoundingClientRect().width||state.width);
    const distance=Math.hypot(point.x-from.x,point.y-from.y),steps=Math.max(1,Math.ceil(distance/Math.max(1,radius*.45)));
    for(let step=0;step<=steps;step++){
      const x=from.x+(point.x-from.x)*step/steps,y=from.y+(point.y-from.y)*step/steps;
      for(let yy=Math.max(0,Math.floor(y-radius));yy<=Math.min(state.height-1,Math.ceil(y+radius));yy++)for(let xx=Math.max(0,Math.floor(x-radius));xx<=Math.min(state.width-1,Math.ceil(x+radius));xx++)if((xx-x)**2+(yy-y)**2<=radius**2)mask[yy*state.width+xx]=state.tool==='erase'?0:255;
    }
    strokeStart.last=point;active().enabled=P.hasPixels(mask);paintDirty=true;state.compare=100;syncCompare();requestDraw();
  }
  function finishStroke(){if(!strokeStart)return;state.history.push(strokeStart.scene);if(state.history.length>MAX_HISTORY)state.history.shift();state.future=[];state.dirty=true;strokeStart=null;active().reference=P.referenceLight(state.original,active().mask);paintDirty=true;sync();status(state.tool==='erase'?'Paint removed from the brushed area.':'Brushed area added.');}
  function cancelStroke(){if(!strokeStart)return;const previous=strokeStart.scene;strokeStart=null;restore(previous);}
  canvas.addEventListener('pointerdown',event=>{
    if(!ready()||event.button>0)return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(pointers.size===2){cancelStroke();singleStart=null;const [a,b]=[...pointers.values()];gesture={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom:state.zoom,x:(a.x+b.x)/2,y:(a.y+b.y)/2,panX:state.panX,panY:state.panY};return;}
    singleStart={x:event.clientX,y:event.clientY,panX:state.panX,panY:state.panY,moved:false};
    if(['move','brush','erase'].includes(state.tool)) {event.preventDefault();canvas.setPointerCapture(event.pointerId);}
    if(['brush','erase'].includes(state.tool))beginStroke(pointAt(event));
  });
  canvas.addEventListener('pointermove',event=>{
    if(!pointers.has(event.pointerId)||!ready())return;
    pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if(gesture&&pointers.size>=2){const [a,b]=[...pointers.values()];state.zoom=P.clamp(gesture.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,gesture.distance),1,4);state.panX=gesture.panX+(a.x+b.x)/2-gesture.x;state.panY=gesture.panY+(a.y+b.y)/2-gesture.y;clampPan();updateButtons();return;}
    if(!singleStart)return;
    const dx=event.clientX-singleStart.x,dy=event.clientY-singleStart.y;if(Math.hypot(dx,dy)>7)singleStart.moved=true;
    if(state.tool==='move'){state.panX=singleStart.panX+dx;state.panY=singleStart.panY+dy;clampPan();}
    else if(['brush','erase'].includes(state.tool))strokeTo(pointAt(event));
  });
  canvas.addEventListener('pointerup',event=>{
    if(!pointers.has(event.pointerId))return;pointers.delete(event.pointerId);
    if(gesture){if(pointers.size===0)gesture=null;singleStart=null;return;}
    if(strokeStart)finishStroke();
    else if(singleStart&&!singleStart.moved&&ready())selectAt(pointAt(event));
    singleStart=null;
  });
  canvas.addEventListener('pointercancel',event=>{pointers.delete(event.pointerId);cancelStroke();singleStart=null;if(!pointers.size)gesture=null;});
  canvas.addEventListener('blur',()=>{state.cursor=null;requestDraw();});
  canvas.addEventListener('keydown',event=>{
    if(!ready())return;
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key)){
      event.preventDefault();state.cursor||={x:state.width/2,y:state.height/2};const step=event.shiftKey?5:20;
      if(event.key==='ArrowLeft')state.cursor.x-=step;if(event.key==='ArrowRight')state.cursor.x+=step;if(event.key==='ArrowUp')state.cursor.y-=step;if(event.key==='ArrowDown')state.cursor.y+=step;
      state.cursor.x=P.clamp(state.cursor.x,0,state.width-1);state.cursor.y=P.clamp(state.cursor.y,0,state.height-1);requestDraw();
    } else if(event.key==='Enter'||event.key===' '){event.preventDefault();const p=state.cursor||{x:state.width/2,y:state.height/2};if(['brush','erase'].includes(state.tool)){beginStroke(p);finishStroke();}else selectAt(p);}
  });
  workspace.addEventListener('keydown',event=>{
    if(/INPUT|SELECT|TEXTAREA/.test(event.target.tagName))return;
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'){event.preventDefault();event.shiftKey?redo():undo();}
    if(event.key==='Escape'&&state.polygon.length){event.preventDefault();event.stopPropagation();state.polygon=[];updateOutline();requestDraw();status('Outline canceled.');}
  });
  $('#surface-list').addEventListener('click',event=>{const button=event.target.closest('[data-surface]');if(!button||!ready())return;state.active=Number(button.dataset.surface);state.polygon=[];sync();status(`${active().name} selected. Choose a color or refine this area.`);});
  $('#add-surface').addEventListener('click',()=>{if(!ready()||state.surfaces.length>=MAX_SURFACES)return;pushHistory();state.surfaces.push({name:`Area ${state.surfaces.length+1}`,color:'#66899a',mask:new Uint8Array(state.width*state.height),enabled:false,reference:180});state.active=state.surfaces.length-1;state.polygon=[];setTool('select',false);sync();status('New surface added. Tap or outline its area, then choose a color.');});
  $('#palette').addEventListener('click',event=>{const b=event.target.closest('[data-color]');if(b)selectColor(b.dataset.color);});
  $('#palette-family').addEventListener('change',drawPalette);
  $('#custom-color').addEventListener('input',event=>{
    const hex=event.target.value;if(!ready())return;
    // Color chooser input may fire continuously. One undo checkpoint per chooser session.
    if(!event.target.dataset.editing){pushHistory();event.target.dataset.editing='true';}
    active().color=hex;active().enabled=P.hasPixels(active().mask);paintDirty=true;state.compare=100;syncCompare();sync();
  });
  $('#custom-color').addEventListener('blur',event=>{delete event.target.dataset.editing;});
  $('#custom-color').addEventListener('change',event=>{delete event.target.dataset.editing;status(`${colorName(active().color)} applied to the active area.`);});
  $('#hex-color').addEventListener('keydown',event=>{if(event.key!=='Enter')return;event.preventDefault();if(/^#[\da-f]{6}$/i.test(event.target.value))selectColor(event.target.value);else{event.target.setCustomValidity('Enter # followed by six color digits, for example #89927A.');event.target.reportValidity();}});
  $('#hex-color').addEventListener('input',event=>event.target.setCustomValidity(''));
  $('#tolerance').addEventListener('input',event=>$('#tolerance-output').textContent=event.target.value);
  $('#brush-size').addEventListener('input',event=>$('#brush-output').textContent=event.target.value);
  $('#show-mask').addEventListener('change',requestDraw);
  $('#undo').addEventListener('click',undo);$('#redo').addEventListener('click',redo);
  $('#clear-surface').addEventListener('click',()=>{if(!ready())return;pushHistory();active().mask.fill(0);active().enabled=false;paintDirty=true;sync();status('Active area cleared. Other surfaces are unchanged.');});
  $('#reset-studio').addEventListener('click',()=>{if(!ready())return;pushHistory();const initial=P.cloneScene(state.initial);initial.surfaces.forEach(s=>s.enabled=false);restore(initial);state.compare=100;syncCompare();status('All paint reset. Your original image is unchanged. Undo restores your colors.');});
  function syncCompare() {$('#compare-range').value=state.compare;$('#show-original').setAttribute('aria-pressed',String(state.compare===0));$('#show-preview').setAttribute('aria-pressed',String(state.compare===100));$('#canvas-view-label').textContent=state.compare===0?'Original':state.compare===100?'Color preview':'Preview ← | → Original';requestDraw();}
  $('#compare-range').addEventListener('input',event=>{state.compare=Number(event.target.value);syncCompare();});
  $('#show-original').addEventListener('click',()=>{state.compare=0;syncCompare();});$('#show-preview').addEventListener('click',()=>{state.compare=100;syncCompare();});
  function closeExpanded(){if($('#studio-dialog').open)$('#studio-dialog').close();}
  $('#expand-studio').addEventListener('click',()=>{lastFocus=document.activeElement;$('#studio-dialog').append(workspace);$('#expand-studio').hidden=true;$('#close-studio').hidden=false;document.body.classList.add('studio-open');$('#studio-dialog').showModal();fit();$('#close-studio').focus({preventScroll:true});});
  $('#close-studio').addEventListener('click',closeExpanded);
  $('#studio-dialog').addEventListener('cancel',event=>{if(state.polygon.length){event.preventDefault();state.polygon=[];updateOutline();requestDraw();}});
  $('#studio-dialog').addEventListener('close',()=>{$('#studio-home-slot').append(workspace);$('#expand-studio').hidden=false;$('#close-studio').hidden=true;document.body.classList.remove('studio-open');fit();lastFocus?.focus({preventScroll:true});});
  function summary(){return state.surfaces.filter(s=>s.enabled&&P.hasPixels(s.mask)).map(s=>`${s.name}: ${colorName(s.color)} (${s.color.toUpperCase()})`).join('\n');}
  async function exportPreview(){
    if(!ready()||!summary())throw new Error('Select an area and choose a color first.');
    draw();
    const width=Math.min(1600,state.width*2),half=Math.floor(width/2),imageHeight=Math.round(state.height*half/state.width);
    const out=document.createElement('canvas');out.width=half*2;out.height=imageHeight+108;const c=out.getContext('2d');
    c.fillStyle='#f8f6f0';c.fillRect(0,0,out.width,out.height);
    c.drawImage(originalCanvas,0,0,state.width,state.height,0,36,half,imageHeight);
    c.drawImage(previewCanvas,0,0,state.width,state.height,half,36,half,imageHeight);
    c.fillStyle='#181715';c.font='bold 12px sans-serif';c.fillText('ORIGINAL',14,23);c.fillText('CIMO COLOR PREVIEW',half+14,23);
    c.font='12px sans-serif';const lines=summary().split('\n');lines.forEach((line,i)=>c.fillText(line,14+(i%2)*half,imageHeight+56+Math.floor(i/2)*18,half-24));
    c.fillStyle='#625f57';c.font='11px sans-serif';c.fillText('Visual approximation. Confirm with a physical paint sample.  •  Cimo Home Refreshments',14,out.height-10,out.width-28);
    return new Promise((resolve,reject)=>out.toBlob(blob=>blob?resolve(blob):reject(new Error('The preview could not be saved. Try a smaller image.')),'image/jpeg',.91));
  }
  $('#save-preview').addEventListener('click',async()=>{
    $('#save-preview').disabled=true;
    try{const blob=await exportPreview(),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='cimo-before-and-after.jpg';document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),30_000);status('Preview prepared for download. On a phone, check Downloads or use the browser’s save-image option.');}
    catch(error){status(error.message,'error');}finally{updateButtons();}
  });
  $('#use-preview').addEventListener('click',()=>{const colors=summary();if(!colors)return;closeExpanded();document.dispatchEvent(new CustomEvent('cimo:colors',{detail:{colors}}));$('#contact').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});$('#estimate-form input[name="name"]').focus({preventScroll:true});});
  window.CimoStudio=Object.freeze({getSummary:summary,exportPreview,isReady:ready});
  drawPalette();loadTemplate('living');
})();
