import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),axe=require.resolve('axe-core/axe.min.js');
const base=process.env.SITE_URL||'http://127.0.0.1:4173/';
const url=s=>new URL(s,base).href;
const manifest=JSON.parse(await fs.readFile('gallery-data.json','utf8'));
const count=manifest.photos.length,results=[];
await fs.mkdir('qa-artifacts',{recursive:true});
async function audit(p,label){await p.addScriptTag({path:axe});const result=await p.evaluate(async()=>{const r=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return {violations:r.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))})),incomplete:r.incomplete.map(v=>v.id)};});await fs.writeFile(`qa-artifacts/axe-gallery-${label}.json`,JSON.stringify(result,null,2));assert.deepEqual(result.violations,[],label);}
async function readyImage(p){await p.waitForFunction(()=>{const i=document.querySelector('#viewer-image');return i&&!i.hidden&&i.complete&&i.naturalWidth>0;});}
async function goHomeSection(p,label){if(await p.locator('.menu-toggle').isVisible())await p.locator('.menu-toggle').click();await p.locator('#site-nav a').filter({hasText:new RegExp(`^${label}$`)}).click();}
for(const [type,width,height]of [[chromium,320,740],[chromium,390,844],[chromium,768,1024],[chromium,1101,900],[chromium,1440,1000],[webkit,390,844]]){
 const name=`${type.name()}-${width}`,b=await type.launch(),context=await b.newContext({viewport:{width,height},isMobile:width<500,hasTouch:width<500,reducedMotion:'reduce'}),p=await context.newPage();p.setDefaultTimeout(15000);
 const errors=[],http=[],outside=[],posts=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)http.push(`${r.status()} ${r.url()}`);});p.on('request',r=>{if(r.method()==='POST')posts.push(r.url());if(/^https?:/.test(r.url())&&!r.url().startsWith(base))outside.push(r.url());});
 try{
  await p.goto(base,{waitUntil:'networkidle'});await p.waitForFunction(()=>window.CimoStudio?.isReady());
  assert(await p.locator('.site-header .brand small').isVisible());assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  await goHomeSection(p,'Cleaning');assert(!(await p.locator('#main').evaluate(e=>e.inert)));await p.locator('#cleaning').scrollIntoViewIfNeeded();
  assert(!/\$|\bUSD\b|\bpricing\b/i.test(await p.locator('#cleaning').innerText()));
  const booking=p.locator('#cleaning a[href*="setmore.com"]');assert.equal(await booking.getAttribute('href'),'https://cimohomerefreshments.setmore.com/');assert.equal(await booking.getAttribute('target'),'_blank');assert.match(await booking.getAttribute('rel'),/noopener/);
  if(width===390||width===1440){await p.locator('#cleaning').screenshot({path:`qa-artifacts/${name}-cleaning.png`});await audit(p,`${name}-cleaning`);}
  await goHomeSection(p,'Gallery');await p.waitForURL('**/gallery.html');await p.waitForFunction(()=>!document.querySelector('.gallery-filters').hidden);
  assert.equal(await p.locator('.gallery-card').count(),count);assert(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));assert(await p.locator('.site-header .brand small').isVisible());
  for(const image of await p.locator('.gallery-photo img').all()){await image.scrollIntoViewIfNeeded();await p.waitForFunction(i=>i.complete&&i.naturalWidth>0,await image.elementHandle());}
  await p.evaluate(()=>scrollTo(0,0));await p.screenshot({path:`qa-artifacts/${name}-gallery.png`,fullPage:true});
  if(width===390||width===1440)await audit(p,`${name}-page`);
  for(const theme of ['interiors','outdoors','preparation','workshop','all']){await p.locator(`.gallery-filters [data-theme="${theme}"]`).click();assert.equal(await p.locator('.gallery-card:not([hidden])').count(),theme==='all'?count:manifest.photos.filter(x=>x.theme===theme).length);}
  await p.locator('.gallery-filters [data-theme="outdoors"]').click();const first=p.locator('.gallery-card:not([hidden]) .gallery-photo').first();await first.scrollIntoViewIfNeeded();const y=await p.evaluate(()=>scrollY);
  if(width<500)await first.tap();else await first.click();await readyImage(p);assert(await p.locator('#photo-dialog').evaluate(e=>e.open));assert(await p.locator('#photo-close').evaluate(e=>e===document.activeElement));assert.match(await p.locator('#viewer-count').innerText(),/1 \/ 5/);
  if(width===390||width===1440){await audit(p,`${name}-viewer`);await p.screenshot({path:`qa-artifacts/${name}-photo-viewer.png`});}
  const title=await p.locator('#viewer-title').innerText();await p.locator('#photo-next').click();await readyImage(p);assert.notEqual(await p.locator('#viewer-title').innerText(),title);await p.keyboard.press('ArrowLeft');await readyImage(p);assert.equal(await p.locator('#viewer-title').innerText(),title);await p.locator('#photo-prev').click();await readyImage(p);assert.match(await p.locator('#viewer-count').innerText(),/5 \/ 5/);
  await p.locator('#photo-next').focus();await p.keyboard.press('Tab');assert(await p.locator('#viewer-home').evaluate(e=>e===document.activeElement));await p.keyboard.press('Shift+Tab');assert(await p.locator('#photo-next').evaluate(e=>e===document.activeElement));
  if(type===chromium&&width===390){const session=await context.newCDPSession(p),box=await p.locator('#viewer-stage').boundingBox(),x=box.x+box.width*.75,Y=box.y+box.height*.5,before=await p.locator('#viewer-title').innerText();await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y:Y}]});await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-110,y:Y}]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await p.waitForFunction(t=>document.querySelector('#viewer-title').textContent!==t,before);await readyImage(p);}
  await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.querySelector('#photo-dialog').open);assert(await first.evaluate(e=>e===document.activeElement));await p.waitForFunction(y=>Math.abs(scrollY-y)<3,y);
  await first.click();await readyImage(p);await p.goBack();await p.waitForFunction(()=>!document.querySelector('#photo-dialog').open);await p.goForward();await readyImage(p);await p.locator('#photo-close').click();await p.waitForFunction(()=>!document.querySelector('#photo-dialog').open);
  await p.goto(url('gallery.html?theme=workshop#photo=workshop-shelving'));await readyImage(p);assert(await p.locator('#photo-next').isDisabled());assert(await p.locator('#photo-prev').isDisabled());await p.locator('#photo-close').click();await p.waitForFunction(()=>!document.querySelector('#photo-dialog').open);assert.equal(new URL(p.url()).hash,'');
  await p.locator('.gallery-filters [data-theme="all"]').click();await p.locator('.gallery-photo').first().click();await readyImage(p);await p.locator('#viewer-home').click();await p.waitForURL('**/#gallery');await p.waitForFunction(()=>window.CimoStudio?.isReady());assert(!(await p.locator('body').evaluate(e=>e.classList.contains('gallery-open'))));
  assert.deepEqual(errors,[],`${name} page errors`);assert.deepEqual(http,[],`${name} HTTP errors`);assert.deepEqual(outside,[],`${name} unexpected external requests`);assert.deepEqual(posts,[],`${name} unexpected submissions`);results.push({name,result:'PASS',photos:count,filters:true,keyboard:true,history:true,exits:true,cleaning:true});console.log('PASS',name);
 }catch(e){await p.screenshot({path:`qa-artifacts/${name}-gallery-failure.png`,fullPage:true}).catch(()=>{});throw e;}finally{await b.close();await fs.writeFile('qa-artifacts/gallery-report.json',JSON.stringify(results,null,2));}
}
{
 const b=await chromium.launch(),c=await b.newContext({javaScriptEnabled:false}),p=await c.newPage();
 try{await p.goto(url('gallery.html'));assert.equal(await p.locator('.gallery-card').count(),count);assert(!(await p.locator('.gallery-filters').isVisible()));assert.equal(await p.locator('.gallery-photo').first().getAttribute('target'),'_blank');await p.locator('.gallery-breadcrumb a').click();await p.waitForURL('**/#gallery');assert(await p.locator('#cleaning').isVisible());results.push({name:'gallery-no-javascript',result:'PASS'});}finally{await b.close();}
}
{
 const b=await chromium.launch(),p=await b.newPage();p.setDefaultTimeout(15000);
 try{await p.route('**/assets/gallery/published-1-full.webp',r=>r.abort());await p.goto(url('gallery.html?theme=outdoors#photo=stained-post'));await p.waitForFunction(()=>!document.querySelector('#viewer-error').hidden);assert(await p.locator('#photo-close').isVisible());await p.locator('#photo-next').click();await readyImage(p);await p.locator('#photo-close').click();await p.waitForFunction(()=>!document.querySelector('#photo-dialog').open);await p.goto(url('gallery.html?theme=invalid#photo=missing'));assert.equal(await p.locator('.gallery-card:not([hidden])').count(),count);assert(!(await p.locator('#photo-dialog').evaluate(e=>e.open)));results.push({name:'gallery-error-recovery',result:'PASS'});}finally{await b.close();}
}
await fs.writeFile('qa-artifacts/gallery-report.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
