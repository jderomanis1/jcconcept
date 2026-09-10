const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('every gallery theme has at least three relevant reviewed photos',()=>{
  const d=JSON.parse(read('gallery-data.json'));
  const themeKeys=Object.keys(d.themes).filter(k=>k!=='all');
  assert(d.photos.length>=8);
  assert.equal(new Set(d.photos.map(p=>p.id)).size,d.photos.length);
  assert.equal(themeKeys.length,4);
  for(const p of d.photos){
    for(const k of ['id','title','status','caption','alt']) assert(p[k]?.length);
    assert(Array.isArray(p.themes)&&p.themes.length>=1);
    for(const theme of p.themes) assert(themeKeys.includes(theme));
    for(const k of ['full','thumb']){
      assert(p[k].startsWith('assets/'));
      assert(!p[k].includes('..'));
      assert(fs.existsSync(path.join(root,p[k])));
      assert(!p[k].includes('garage-example'));
      assert(!p[k].includes('studio-room'));
      assert(!p[k].includes('room-illustration'));
    }
  }
  for(const theme of themeKeys){
    assert(d.photos.filter(p=>p.themes.includes(theme)).length>=3,theme);
  }
});

test('gallery remains useful without JavaScript',()=>{
  const d=JSON.parse(read('gallery-data.json'));
  const s=read('gallery.html');
  assert.equal((s.match(/class="gallery-photo"/g)||[]).length,d.photos.length);
  assert(s.includes('<noscript>'));
  assert(s.includes('Back to home'));
  assert(s.includes('id="viewer-home"'));
  assert(s.includes('id="photo-close"'));
});

test('work in progress remains clearly labeled',()=>{
  const d=JSON.parse(read('gallery-data.json'));
  assert.equal(d.photos.find(p=>p.id==='window-preparation').status,'In progress');
  assert.equal(d.photos.find(p=>p.id==='workshop-shelving').status,'In progress');
  assert(d.photos.find(p=>p.id==='stained-post').caption.includes('work-area protection'));
});

test('Cleaning stays on the Cimo site as a family referral overview',()=>{
  const s=read('index.html');
  const start=s.indexOf('id="cleaning"');
  const end=s.indexOf('</section>',start);
  const cleaning=s.slice(start,end);
  assert(start>0&&end>start);
  assert(!cleaning.includes('setmore.com'));
  assert.equal((cleaning.match(/class="cleaning-card"/g)||[]).length,3);
  assert(cleaning.includes('trusted family cleaning partner'));
  assert(cleaning.includes('data-service="Cleaning referral"'));
  assert(cleaning.includes('href="#contact"'));
  for(const term of ['Kitchens','bathrooms','whole-home','Move-in','move-out']) assert(cleaning.includes(term));
});

test('gallery controls preserve navigation, keyboard and error exits',()=>{
  const s=read('gallery.js');
  for(const token of ['popstate','ArrowRight','ArrowLeft','touchend','preventScroll','viewer-error','history.back()','showModal','flatMap']) assert(s.includes(token));
  assert(!s.includes('localStorage'));
  assert(!s.includes('sessionStorage'));
});
