import {chromium, webkit} from 'playwright';
import assert from 'node:assert/strict';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
const BASE=process.env.SITE_URL||'http://127.0.0.1:4173/';
const artifact='qa-artifacts';await mkdir(artifact,{recursive:true});
const axe=await readFile('node_modules/axe-core/axe.min.js','utf8');
const delay=p=>p.waitForTimeout(100);
async function digest(p){return p.locator('#studio-canvas').evaluate(el=>el.toDataURL());}
async function pixel(p,x,y){return p.locator('#studio-canvas').evaluate((el,[x,y])=>Array.from(el.getContext('2d').getImageData(x,y,1,1).data),[x,y]);}
async function clickAt(p,x,y,touch=false){const c=p.locator('#studio-canvas');const b=await c.boundingBox();const [w,h]=await c.evaluate(e=>[e.width,e.height]);const xx=b.x+x/w*b.width,yy=b.y+y/h*b.height;touch?await p.touchscreen.tap(xx,yy):await p.mouse.click(xx,yy);await delay(p);}
async function audit(p,label){await p.evaluate(axe);const r=await p.evaluate(async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}}));await writeFile(`${artifact}/axe-${label}.json`,JSON.stringify(r,null,2));const blocking=r.violations.filter(v=>['critical','serious'].includes(v.impact));assert.deepEqual(blocking.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],`Accessibility: ${label}`);}
async function boot(type,width,height){const browser=await type.launch();const touch=width<=430;const context=await browser.newContext({viewport:{width,height},isMobile:touch,hasTouch:touch,reducedMotion:'reduce'});const p=await context.newPage();p.setDefaultTimeout(12000);const errors=[],bad=[],outside=[],posts=[];p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.status()>=400)bad.push(r.url());});p.on('request',r=>{if(r.method()==='POST')posts.push(r.url());if(/^https?:/.test(r.url())&&!r.url().startsWith(BASE))outside.push(r.url());});await p.goto(BASE,{waitUntil:'networkidle'});await p.waitForFunction(()=>window.CimoStudio?.isReady());await delay(p);return {browser,p,touch,errors,bad,outside,posts};}
const results=[];
for(const [type,name,width,height] of [[chromium,'chrome-320',320,740],[chromium,'chrome-360',360,800],[chromium,'chrome-390',390,844],[chromium,'chrome-430',430,932],[chromium,'tablet-768',768,1024],[chromium,'tablet-1024',1024,800],[chromium,'desktop',1440,1000],[webkit,'webkit-mobile',390,844]]){
 const {browser,p,touch,errors,bad,outside,posts}=await boot(type,width,height);
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),name+' page overflow');
 assert.ok(await p.locator('.site-header .brand small').isVisible(),name+' full brand missing');
 assert.equal((await p.locator('.site-header .brand-type').innerText()).replace(/\s+/g,' ').trim().toUpperCase(),'CIMO HOME REFRESHMENTS');
 assert.ok(await p.evaluate(()=>[...document.querySelectorAll('a[href^="#"]')].every(a=>document.querySelector(a.getAttribute('href')))),name+' broken anchors');
 assert.ok(await p.evaluate(()=>[...document.querySelectorAll('a[href^="tel:"],a[href^="sms:"]')].every(a=>/^(tel|sms):\+15858809905(?:[?&].*)?$/.test(a.getAttribute('href')))),name+' stale phone');
 const missing=await p.locator('img').evaluateAll(images=>images.filter(i=>i.complete&&!i.naturalWidth).map(i=>i.src));assert.deepEqual(missing,[]);
 await p.screenshot({path:`${artifact}/${name}-home.png`});
 if(width<1101){await p.locator('.menu-toggle').click();assert.ok(await p.locator('#main').evaluate(e=>e.inert));if(name==='chrome-390')await audit(p,'menu');await p.keyboard.press('Escape');assert.ok(await p.locator('.menu-toggle').evaluate(e=>e===document.activeElement));assert.ok(!await p.locator('#main').evaluate(e=>e.inert));}
 if(['desktop','chrome-390'].includes(name))await audit(p,name+'-page');
 await p.locator('#expand-studio').click();await delay(p);assert.ok(await p.locator('#studio-workspace').evaluate(e=>e.scrollWidth<=e.clientWidth+1));
 const floor=await pixel(p,1100,680),sofa=await pixel(p,1050,550),wall=await pixel(p,50,100);
 await p.locator('#palette button[data-color="#263947"]').click();await delay(p);
 assert.deepEqual(await pixel(p,1100,680),floor);assert.deepEqual(await pixel(p,1050,550),sofa);assert.notDeepEqual(await pixel(p,50,100),wall);
 const painted=await digest(p);await p.locator('#undo').click();await delay(p);assert.notEqual(await digest(p),painted);await p.locator('#redo').click();await delay(p);assert.equal(await digest(p),painted);
 await p.locator('#show-original').click();await delay(p);assert.notEqual(await digest(p),painted);await p.locator('#show-preview').click();await delay(p);assert.equal(await digest(p),painted);
 if(touch){await clickAt(p,50,100,true);assert.match(await p.locator('#studio-status').innerText(),/prepared boundary/);const targets=await p.locator('.canvas-toolbar button,#palette button,.studio-export a,.studio-export button').evaluateAll(es=>es.filter(e=>e.getClientRects().length).map(e=>({id:e.id||e.textContent,h:e.getBoundingClientRect().height,w:e.getBoundingClientRect().width})));assert.ok(targets.every(e=>e.h>=43&&e.w>=43),JSON.stringify(targets));}
 await p.screenshot({path:`${artifact}/${name}-studio.png`});if(['desktop','chrome-390'].includes(name))await audit(p,name+'-studio');
 await p.locator('#template-select').selectOption('architectural');await p.locator('#confirm-replace').click();await p.waitForFunction(()=>CimoStudio.isReady()&&document.querySelector('#template-select').value==='architectural');await p.locator('#surface-list button').nth(1).click();await p.locator('#palette button[data-color="#a85e49"]').click();await delay(p);assert.match(await p.evaluate(()=>CimoStudio.getSummary()),/Left wall: Terracotta/);
 const win=await pixel(p,850,250);await p.locator('#show-original').click();await delay(p);assert.deepEqual(await pixel(p,850,250),win);
 await p.locator('#show-preview').click();await p.locator('#use-preview').click();assert.ok(!await p.locator('#studio-dialog').evaluate(e=>e.open));assert.match(await p.locator('#estimate-colors').innerText(),/Terracotta/);
 await p.locator('input[name=name]').fill('QA Test');await p.locator('input[name=phone]').fill('5855551234');await p.locator('select[name=service]').selectOption({label:'Garage Painting'});await p.locator('#estimate-form').evaluate(e=>e.requestSubmit());assert.ok(await p.locator('#message-ready').isVisible());assert.match(await p.locator('#email-request').getAttribute('href'),/^mailto:cimohomerefreshments@gmail.com\?/);assert.match(await p.locator('#text-request').getAttribute('href'),/^sms:\+15858809905[?&]body=/);assert.match(await p.locator('#contact-status').innerText(),/Nothing has been sent/);if(name==='chrome-390')await audit(p,'contact-ready');
 assert.deepEqual(errors,[],name+' browser errors');assert.deepEqual(bad,[],name+' failed resources');assert.deepEqual(outside,[],name+' external runtime request');assert.deepEqual(posts,[],name+' unexpected data transmission');
 results.push({name,width,height,pass:true});await browser.close();console.log('PASS',name);
}
// Deep upload/precision/export tests use deterministic geometry, not a screenshot-only gate.
{
 const {browser,p,errors,posts}=await boot(chromium,1440,1000);await p.locator('#expand-studio').click();
 const bytes=await p.evaluate(()=>{const c=document.createElement('canvas');c.width=600;c.height=400;const x=c.getContext('2d');x.fillStyle='rgb(225,214,193)';x.fillRect(0,0,600,400);x.fillStyle='rgb(82,61,38)';x.fillRect(0,260,600,140);x.fillStyle='rgb(40,98,153)';x.fillRect(350,65,120,125);return c.toDataURL().split(',')[1];});
 await p.locator('#photo-input').setInputFiles({name:'test-room.png',mimeType:'image/png',buffer:Buffer.from(bytes,'base64')});await p.waitForFunction(()=>CimoStudio.isReady()&&document.querySelector('#studio-canvas').width===600);await delay(p);
 await clickAt(p,100,100);await p.locator('#palette button[data-color="#263947"]').click();await delay(p);assert.deepEqual(await pixel(p,100,350),[82,61,38,255]);assert.deepEqual(await pixel(p,400,100),[40,98,153,255]);
 await p.locator('[data-tool=outline]').click();for(const [x,y] of [[20,20],[300,20],[300,230],[20,230]])await clickAt(p,x,y);await p.locator('#apply-outline').click();await delay(p);assert.deepEqual(await pixel(p,100,350),[82,61,38,255]);
 await p.locator('.refine-details').evaluate(e=>e.open=true);await p.locator('[data-tool=cut]').click();for(const [x,y] of [[50,50],[100,50],[100,100],[50,100]])await clickAt(p,x,y);await p.locator('#apply-outline').click();await delay(p);assert.deepEqual(await pixel(p,75,75),[225,214,193,255]);const cut=await digest(p);await p.locator('#undo').click();await delay(p);assert.notEqual(await digest(p),cut);await p.locator('#redo').click();await delay(p);assert.equal(await digest(p),cut);
 await p.locator('#add-surface').click();await p.locator('[data-tool=outline]').click();for(const [x,y] of [[20,280],[280,280],[280,380],[20,380]])await clickAt(p,x,y);await p.locator('#apply-outline').click();await p.locator('#palette button[data-color="#eee8dc"]').click();await delay(p);assert.ok((await pixel(p,100,320))[0]>180);
 await p.locator('#zoom-in').click();assert.match(await p.locator('#studio-canvas').getAttribute('style'),/scale\(1\.3\)/);await p.locator('#zoom-fit').click();assert.match(await p.locator('#studio-canvas').getAttribute('style'),/scale\(1\)/);
 const prior=await digest(p);await p.locator('#photo-input').setInputFiles({name:'broken.heic',mimeType:'image/heic',buffer:Buffer.from('not an image')});await p.locator('#confirm-replace').click();await p.waitForFunction(()=>CimoStudio.isReady());await delay(p);assert.match(await p.locator('#studio-status').innerText(),/HEIC/);assert.equal(await digest(p),prior);
 await p.locator('#show-original').click();await p.locator('#show-mask').check();
 const exported=await p.evaluate(async()=>{const b=await CimoStudio.exportPreview(),im=await createImageBitmap(b);const r={type:b.type,bytes:b.size,width:im.width,height:im.height};im.close();return r;});assert.equal(exported.type,'image/jpeg');assert.ok(exported.bytes>1000);assert.equal(exported.width,1200);assert.equal(exported.height,508);
 const download=p.waitForEvent('download');await p.locator('#save-preview').click();const file=await download;assert.equal(file.suggestedFilename(),'cimo-before-and-after.jpg');await file.saveAs(`${artifact}/tested-preview.jpg`);
 await p.screenshot({path:`${artifact}/precision-upload.png`});assert.deepEqual(errors,[]);assert.deepEqual(posts,[]);results.push({name:'precision-upload-export',pass:true,...exported});await browser.close();
}
{
 const browser=await chromium.launch();const p=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});await p.goto(BASE);assert.ok(await p.locator('.contact-phone').isVisible());assert.ok(!await p.locator('#estimate-form').isVisible());assert.ok(await p.locator('.site-header .brand small').isVisible());await browser.close();results.push({name:'no-javascript-contact',pass:true});
}
await writeFile(`${artifact}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2));
