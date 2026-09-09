'use strict';
const assert = require('node:assert/strict');
const {test} = require('node:test');
const P = require('../studio-core.js');
const surface = (mask, color='#263947') => ({mask:new Uint8Array(mask),color,enabled:true});
test('painting leaves every channel of every unselected pixel exactly unchanged', () => {
  const data=new Uint8ClampedArray([230,215,201,255, 111,122,133,100, 50,55,60,255]);
  const out=P.recolor(data,[surface([255,0,0])]);
  assert.notDeepEqual(out.slice(0,3),data.slice(0,3));
  assert.deepEqual(out.slice(4),data.slice(4));
  assert.equal(out[3],255);assert.deepEqual(data,new Uint8ClampedArray([230,215,201,255,111,122,133,100,50,55,60,255]));
});
test('white can lighten dark paint; texture brightness is retained',()=>{
  const data=new Uint8ClampedArray([50,50,50,255,70,70,70,255]);
  const out=P.recolor(data,[surface([255,255],'#eeeeee')]);
  assert.ok(out[0]>150);assert.ok(out[4]>out[0]);
});
test('paint is rebuilt from the original, not layered destructively on a prior preview',()=>{
  const data=new Uint8ClampedArray([220,210,200,255]);
  const s=surface([255]);const one=P.recolor(data,[s]);s.color='#853b32';P.recolor(data,[s]);s.color='#263947';assert.deepEqual(P.recolor(data,[s]),one);
});
test('disabled surfaces do not paint; fractional mask stays within its alpha boundary',()=>{
  const data=new Uint8ClampedArray([200,200,200,255]);
  assert.deepEqual(P.recolor(data,[{...surface([255]),enabled:false}]),data);
  const result=P.recolor(data,[surface([128],'#000000')]);assert.ok(result[0]>=99&&result[0]<=100);assert.equal(result[3],255);
});
test('independent masks retain independent paint colors',()=>{
  const data=new Uint8ClampedArray([200,200,200,255,200,200,200,255]);
  const out=P.recolor(data,[surface([255,0],'#ff0000'),surface([0,255],'#0000ff')]);assert.deepEqual([...out],[255,0,0,255,0,0,255,255]);
});
test('select respects a hard boundary and does not drift across gradients',()=>{
  const w=60,h=40,d=new Uint8ClampedArray(w*h*4);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const i=(y*w+x)*4;d.set(y<25?[225,214,193,255]:[82,61,38,255],i);}
  const r=P.selectRegion(P.colorFeatures(d,w,h),w,h,15,10,18);
  assert.ok(r.count>1200&&r.count<1501);assert.equal(r.mask[35*w+15],0);assert.equal(r.mask[10*w+15],255);
  const f=new Float32Array(w*3);for(let x=0;x<w;x++)f[x*3]=x*4;
  const gradient=P.selectRegion(f,w,1,0,0,18);assert.ok(gradient.count<20);
});
test('exact-size history copies do not alias original masks',()=>{
  const original={active:0,surfaces:[surface(Array.from({length:99},(_,i)=>i%256))]};
  const copy=P.cloneScene(original);copy.surfaces[0].mask[1]=200;assert.equal(original.surfaces[0].mask[1],1);assert.equal(copy.surfaces[0].mask.length,99);
});
test('cutout removes only specified mask pixels, without feathering outwards',()=>{
  assert.deepEqual([...P.combineMask(new Uint8Array([255,255,0]),new Uint8Array([0,255,255]),true)],[255,0,0]);
  assert.deepEqual([...P.combineMask(new Uint8Array([255,0]),new Uint8Array([0,255]))],[255,255]);
});
test('invalid colors and inconsistent image dimensions fail explicitly',()=>{
  assert.throws(()=>P.hexRGB('#zzzzzz'));assert.throws(()=>P.colorFeatures(new Uint8Array(5),1,1));assert.throws(()=>P.recolor(new Uint8Array(4),[surface([255,255])]));
});
