import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const axePath = require.resolve('axe-core/axe.min.js');
const base = process.env.SITE_URL || 'http://127.0.0.1:4173/';
await fs.mkdir('qa-artifacts', { recursive: true });
const results = [];
const stable = p => p.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
const pixels = (p, points) => p.locator('#studio-canvas').evaluate((c, ps) => ps.map(([x,y]) => [...c.getContext('2d').getImageData(x,y,1,1).data]), points);
const digest = p => p.locator('#studio-canvas').evaluate(c => c.toDataURL());
async function point(p, x, y, touch = false) {
  const canvas = p.locator('#studio-canvas');
  await canvas.scrollIntoViewIfNeeded();
  const box = await canvas.boundingBox(), [w,h] = await canvas.evaluate(c => [c.width,c.height]);
  const X = box.x + x / w * box.width, Y = box.y + y / h * box.height;
  if (touch) await p.touchscreen.tap(X,Y); else await p.mouse.click(X,Y);
  await stable(p);
}
async function accessibility(p, label) {
  await p.addScriptTag({ path: axePath });
  const scan = await p.evaluate(async () => {
    const { violations, incomplete } = await window.axe.run(document, { runOnly: { type:'tag', values:['wcag2a','wcag2aa','wcag21aa'] } });
    return { violations: violations.map(v => ({ id:v.id, impact:v.impact, nodes:v.nodes.map(n => ({ target:n.target, failureSummary:n.failureSummary })) })), incomplete:incomplete.map(v=>v.id) };
  });
  await fs.writeFile(`qa-artifacts/axe-${label}.json`,JSON.stringify(scan,null,2));
  assert.deepEqual(scan.violations, [], `${label}: accessibility violations`);
}
async function smoke(browserType, width, height) {
  const name = `${browserType.name()}-${width}`;
  console.log(`START ${name}`);
  const browser = await browserType.launch({ headless:true });
  const context = await browser.newContext({ viewport:{width,height}, isMobile:width<500, hasTouch:width<500, reducedMotion:'reduce', acceptDownloads:true });
  const p = await context.newPage(); p.setDefaultTimeout(15000);
  const errors=[], failures=[], external=[];
  p.on('pageerror', e=>errors.push(e.message));
  p.on('response', r=>{if(r.status()>=400)failures.push(`${r.status()} ${r.url()}`);});
  p.on('request', r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(base))external.push(r.url());});
  try {
    await p.goto(base,{waitUntil:'networkidle'});
    await p.waitForFunction(()=>window.CimoStudio?.isReady());
    assert(await p.locator('.site-header .brand small').isVisible(),`${name}: complete brand hidden`);
    assert.match(await p.locator('.site-header .brand').innerText(), /HOME REFRESHMENTS/);
    assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${name}: page overflow`);
    // Native lazy images load only near the viewport. Scroll to each and verify decoding.
    for (const image of await p.locator('img').all()) {
      await image.scrollIntoViewIfNeeded();
      await p.waitForFunction(img=>img.complete&&img.naturalWidth>0,await image.elementHandle());
    }
    assert.deepEqual(await p.locator('a[href^="#"]').evaluateAll(as=>as.map(a=>a.getAttribute('href')).filter(h=>h.length>1&&!document.getElementById(h.slice(1)))),[]);
    assert(!/585.?305.?4365|jcimo47@gmail\.com/.test(await p.locator('body').innerText()));
    await p.evaluate(()=>scrollTo(0,0));
    if(width<1101){
      await p.locator('.menu-toggle').click();
      assert(await p.locator('#main').evaluate(e=>e.inert));
      assert(await p.locator('#site-nav a').first().evaluate(e=>e===document.activeElement));
      await p.keyboard.press('Escape');
      assert(!(await p.locator('#main').evaluate(e=>e.inert)));
      assert(await p.locator('.menu-toggle').evaluate(e=>e===document.activeElement));
    }
    await p.screenshot({path:`qa-artifacts/${name}-home.png`});
    if(width===390||width===1440)await accessibility(p,`${name}-home`);
    await p.locator('#expand-studio').click();await stable(p);
    assert(await p.locator('#studio-dialog').evaluate(e=>e.open));
    assert(await p.locator('#studio-workspace').evaluate(e=>e.scrollWidth<=e.clientWidth+1),`${name}: studio overflow`);
    assert(await p.locator('#palette').isVisible());
    for(const selector of ['[data-tool="select"]','[data-tool="outline"]','#zoom-in','#palette button']){
      assert(await p.locator(selector).first().evaluate(e=>e.getBoundingClientRect().height>=43),`${name}: small touch target ${selector}`);
    }
    const spots=[[1100,680],[1050,550],[490,280],[1100,250]];
    await p.locator('#show-original').click();await stable(p);
    const original=await pixels(p,spots), wall=await pixels(p,[[50,100]]);
    await p.locator('#palette [data-color="#263947"]').click();await stable(p);
    assert.deepEqual(await pixels(p,spots),original,`${name}: sample paint escaped its wall mask`);
    assert.notDeepEqual(await pixels(p,[[50,100]]),wall,`${name}: wall not recolored`);
    const painted=await digest(p);
    await p.locator('#undo').click();await stable(p);assert.notEqual(await digest(p),painted);
    await p.locator('#redo').click();await stable(p);assert.equal(await digest(p),painted);
    await p.locator('#show-original').click();await stable(p);assert.deepEqual(await pixels(p,[[50,100]]),wall);
    await p.locator('#show-preview').click();await stable(p);
    if(width<500)await point(p,50,100,true);
    await p.locator('#close-studio').focus();await stable(p);
    await p.screenshot({path:`qa-artifacts/${name}-studio.png`});
    if(width===390||width===1440)await accessibility(p,`${name}-studio`);
    await p.locator('#template-select').selectOption('architectural');
    await p.locator('#confirm-replace').click();
    await p.waitForFunction(()=>window.CimoStudio.isReady()&&document.querySelector('#surface-list').children.length===2);
    await p.locator('#show-original').click();await stable(p);
    const windowBefore=await pixels(p,[[850,250]]);
    await p.locator('#surface-list button').nth(0).click();await p.locator('#palette [data-color="#263947"]').click();
    await p.locator('#surface-list button').nth(1).click();await p.locator('#palette [data-color="#eee8dc"]').click();await stable(p);
    assert.deepEqual(await pixels(p,[[850,250]]),windowBefore,`${name}: window recolored`);
    assert.match(await p.evaluate(()=>CimoStudio.getSummary()),/Deep Navy/);
    assert.match(await p.evaluate(()=>CimoStudio.getSummary()),/Soft Ivory/);
    await p.locator('#close-studio').click();
    assert(await p.locator('#expand-studio').evaluate(e=>e===document.activeElement));
    await p.locator('#use-preview').click();
    assert.match(await p.locator('#estimate-colors').innerText(),/Deep Navy/);
    await p.locator('input[name="name"]').fill('QA Visitor');
    await p.locator('input[name="phone"]').fill('5855551234');
    await p.locator('select[name="service"]').selectOption({label:'Garage Painting'});
    await p.locator('textarea[name="description"]').fill('Please discuss these colors.');
    await p.locator('#estimate-form button[type="submit"]').click();
    assert.match(await p.locator('#email-request').getAttribute('href'),/^mailto:cimohomerefreshments@gmail\.com\?/);
    assert.match(await p.locator('#text-request').getAttribute('href'),/^sms:\+15858809905[?&]body=/);
    assert.match(await p.locator('#contact-status').innerText(),/Nothing has been sent/);
    assert.match(await p.locator('#prepared-message').inputValue(),/Deep Navy/);
    if(width===390)await accessibility(p,`${name}-contact`);
    assert.deepEqual(errors,[],`${name}: script errors`);assert.deepEqual(failures,[],`${name}: HTTP failures`);assert.deepEqual(external,[],`${name}: unexpected external request`);
    results.push({name,result:'PASS',brand:true,images:true,overflow:false,templateMask:true,history:true,contacts:true,pageErrors:errors});console.log(`PASS ${name}`);
  } catch(e) {await p.screenshot({path:`qa-artifacts/${name}-failure.png`,fullPage:true}).catch(()=>{});throw e;}
  finally {await browser.close();}
}
async function uploadTest(){
  console.log('START uploaded-photo precision');
  const browser=await chromium.launch();const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',acceptDownloads:true});const p=await context.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));p.setDefaultTimeout(15000);
  try{
    await p.goto(base);await p.waitForFunction(()=>window.CimoStudio?.isReady());await p.locator('#expand-studio').click();
    const data=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=600;c.height=400;const x=c.getContext('2d');x.fillStyle='#e1d6c1';x.fillRect(0,0,600,400);x.fillStyle='#523d26';x.fillRect(0,260,600,140);x.fillStyle='#286299';x.fillRect(350,65,120,125);return c.toDataURL().split(',')[1];});
    await p.locator('#photo-input').setInputFiles({name:'qa-room.png',mimeType:'image/png',buffer:Buffer.from(data,'base64')});
    await p.waitForFunction(()=>CimoStudio.isReady()&&document.querySelector('#studio-canvas').width===600);await stable(p);
    const protectedBefore=await pixels(p,[[100,350],[400,100]]);
    await point(p,100,100);await p.locator('#palette [data-color="#263947"]').click();await stable(p);
    assert.deepEqual(await pixels(p,[[100,350],[400,100]]),protectedBefore,'upload: selection escaped wall');
    assert.notDeepEqual(await pixels(p,[[100,100]]),[[225,214,193,255]],'upload: wall not painted');
    await p.locator('[data-tool="outline"]').click();
    for(const xy of [[20,20],[300,20],[300,230],[20,230]])await point(p,...xy);
    await p.locator('#apply-outline').click();await stable(p);
    assert.deepEqual(await pixels(p,[[100,350]]),[protectedBefore[0]]);
    await p.locator('.refine-details summary').click();await p.locator('[data-tool="cut"]').click();
    for(const xy of [[50,50],[100,50],[100,100],[50,100]])await point(p,...xy);
    await p.locator('#apply-outline').click();await stable(p);
    assert.deepEqual(await pixels(p,[[75,75]]),[[225,214,193,255]],'cutout did not restore original');
    const cut=await digest(p);await p.locator('#undo').click();await stable(p);assert.notEqual(await digest(p),cut);await p.locator('#redo').click();await stable(p);assert.equal(await digest(p),cut);
    await p.locator('#add-surface').click();await p.locator('[data-tool="outline"]').click();
    for(const xy of [[20,280],[280,280],[280,380],[20,380]])await point(p,...xy);
    await p.locator('#apply-outline').click();await p.locator('#palette [data-color="#eee8dc"]').click();await stable(p);
    assert((await pixels(p,[[100,320]]))[0][0]>180,'light paint must lighten dark surfaces');
    assert.match(await p.evaluate(()=>CimoStudio.getSummary()),/Area 2/);
    await p.locator('#zoom-in').click();assert.match(await p.locator('#studio-canvas').getAttribute('style'),/scale\(1\.3/);await p.locator('#zoom-fit').click();
    const previous=await digest(p);await p.locator('#photo-input').setInputFiles({name:'invalid.heic',mimeType:'image/heic',buffer:Buffer.from('invalid')});await p.locator('#confirm-replace').click();await p.waitForFunction(()=>CimoStudio.isReady());await stable(p);assert.equal(await digest(p),previous);assert.match(await p.locator('#studio-status').innerText(),/HEIC/);
    const download=await Promise.all([p.waitForEvent('download'),p.locator('#save-preview').click()]);await download[0].saveAs('qa-artifacts/upload-before-after.jpg');assert((await fs.stat('qa-artifacts/upload-before-after.jpg')).size>1000);
    const exportInfo=await p.evaluate(async()=>{const b=await CimoStudio.exportPreview(),i=await createImageBitmap(b),r={type:b.type,width:i.width,height:i.height,bytes:b.size};i.close();return r;});assert.equal(exportInfo.type,'image/jpeg');assert.equal(exportInfo.width,1200);assert.equal(exportInfo.height,508);
    await p.screenshot({path:'qa-artifacts/upload-precision.png'});assert.deepEqual(errors,[]);results.push({name:'uploaded-photo',result:'PASS',selection:true,outline:true,cutout:true,undoRedo:true,multipleSurfaces:true,lightenDark:true,invalidFilePreserves:true,export:exportInfo});
  }catch(e){await p.screenshot({path:'qa-artifacts/upload-failure.png',fullPage:true}).catch(()=>{});throw e;}finally{await context.close();await browser.close();}
}
try{
  for(const [w,h]of [[320,740],[360,800],[390,844],[430,932],[768,1024],[1024,800],[1440,1000]])await smoke(chromium,w,h);
  await smoke(webkit,390,844);await uploadTest();
  const b=await chromium.launch(),c=await b.newContext({javaScriptEnabled:false}),p=await c.newPage();await p.goto(base);
  assert(await p.locator('.contact-phone').isVisible());assert.equal(await p.locator('.contact-phone').getAttribute('href'),'tel:+15858809905');assert(!(await p.locator('#studio-workspace').isVisible()));assert(!(await p.locator('#estimate-form').isVisible()));await b.close();results.push({name:'no-javascript',result:'PASS'});
}finally{await fs.writeFile('qa-artifacts/report.json',JSON.stringify(results,null,2));}
console.log(JSON.stringify(results,null,2));