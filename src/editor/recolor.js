/* ================= colour style transfer from the reference image ================= */
// Recolours the palette (so every frame and layer follows) toward the reference image's colours. Runs in the browser, no AI.
function srgbLin(v){ v/=255; return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4); }
function linSrgb(v){ v=v<=0.0031308?12.92*v:1.055*Math.pow(v,1/2.4)-0.055; return clamp(Math.round(v*255),0,255); }
function rgb2lab(c){
  const r=srgbLin(c[0]), g=srgbLin(c[1]), b=srgbLin(c[2]);
  const f=t=>t>0.008856?Math.cbrt(t):7.787*t+16/116;
  const x=f((r*0.4124+g*0.3576+b*0.1805)/0.95047), y=f(r*0.2126+g*0.7152+b*0.0722), z=f((r*0.0193+g*0.1192+b*0.9505)/1.08883);
  return [116*y-16,500*(x-y),200*(y-z)];
}
function lab2rgb(l){
  const fy=(l[0]+16)/116, fx=fy+l[1]/500, fz=fy-l[2]/200; const fi=t=>t*t*t>0.008856?t*t*t:(t-16/116)/7.787;
  const x=fi(fx)*0.95047, y=fi(fy), z=fi(fz)*1.08883;
  return [linSrgb(x*3.2406-y*1.5372-z*0.4986),linSrgb(-x*0.9689+y*1.8758+z*0.0415),linSrgb(x*0.0557-y*0.2040+z*1.0570)];
}
// up to ~16k opaque pixels of the reference image
function refSamples(img){
  const iw=img.naturalWidth||img.width, ih=img.naturalHeight||img.height; const s=Math.min(1,Math.sqrt(16384/(iw*ih)));
  const cv=document.createElement('canvas'); cv.width=Math.max(1,Math.round(iw*s)); cv.height=Math.max(1,Math.round(ih*s));
  const c=cv.getContext('2d'); c.drawImage(img,0,0,cv.width,cv.height); const d=c.getImageData(0,0,cv.width,cv.height).data; const out=[];
  for(let i=0;i<d.length;i+=4) if(d[i+3]>=128) out.push([d[i],d[i+1],d[i+2]]);
  return out;
}
// how many pixels use each palette colour (visible layers, every frame, linked cels counted once)
function paletteUsage(){
  const n=new Float64Array(doc.palette.length+1); const vis=new Set(doc.layers.filter(L=>L.visible).map(L=>L.id)); const seen=new Set();
  for(const f of doc.frames) for(const id in f.cels){ const c=f.cels[id]; if(!vis.has(+id)||seen.has(c)) continue; seen.add(c); for(const v of c) n[v]++; }
  return Array.from(n).slice(1);
}
// mode 'mood': match the mean and spread of Lab colour (Reinhard) — keeps each colour's role, shifts the overall mood
// mode 'swap': map palette colours to the reference's main colours in light-to-dark order, weighted by how much each is used
function transferPalette(samples,mode,strength){
  const P=palRGB.map(rgb2lab), usage=paletteUsage().map(u=>u+0.5);
  if(!samples.length) return doc.palette.slice();
  let target;
  if(mode==='swap'){
    const K=Math.min(P.length,32); const cents=kmeans(samples,K); const cnt=new Float64Array(cents.length);
    for(const s of samples) cnt[nearestIdx(s,cents)]++;
    const refs=cents.map((c,i)=>({lab:rgb2lab(c),w:cnt[i]})).filter(r=>r.w>0).sort((a,b)=>a.lab[0]-b.lab[0]);
    const rt=refs.reduce((s,r)=>s+r.w,0);
    const order=P.map((lab,i)=>({lab,i,w:usage[i]})).sort((a,b)=>a.lab[0]-b.lab[0]); const pt=order.reduce((s,o)=>s+o.w,0);
    target=new Array(P.length); let acc=0;
    for(const o of order){ const q=(acc+o.w/2)/pt; acc+=o.w; let a2=0, pick=refs[refs.length-1]; for(const r of refs){ a2+=r.w; if(a2/rt>=q){ pick=r; break; } }
      // keep the palette's own light/dark spacing, take the reference's hue and saturation
      target[o.i]=[o.lab[0]*0.35+pick.lab[0]*0.65,pick.lab[1],pick.lab[2]]; }
  } else {
    const R=samples.length>6000?samples.filter((_,i)=>i%Math.ceil(samples.length/6000)===0).map(rgb2lab):samples.map(rgb2lab);
    const stat=(arr,wts)=>{ const W=wts?wts.reduce((a,b)=>a+b,0):arr.length; const m=[0,0,0], sd=[0,0,0];
      arr.forEach((c,i)=>{ const w=wts?wts[i]:1; for(let k=0;k<3;k++) m[k]+=c[k]*w; }); for(let k=0;k<3;k++) m[k]/=W;
      arr.forEach((c,i)=>{ const w=wts?wts[i]:1; for(let k=0;k<3;k++) sd[k]+=w*(c[k]-m[k])**2; }); for(let k=0;k<3;k++) sd[k]=Math.sqrt(sd[k]/W)||1; return {m,sd}; };
    const sp=stat(P,usage), sr=stat(R);
    target=P.map(c=>c.map((v,k)=>{ const ratio=k===0?clamp(sr.sd[k]/sp.sd[k],0.6,1.6):clamp(sr.sd[k]/sp.sd[k],0.3,3); return (v-sp.m[k])*ratio+sr.m[k]; }));
  }
  return P.map((c,i)=>{ const t=target[i]; const mix=[0,1,2].map(k=>c[k]+(t[k]-c[k])*strength); mix[0]=clamp(mix[0],0,100); return rgb2hex(...lab2rgb(mix)); });
}
function previewWithPalette(hexes){
  const keep=palRGB; palRGB=hexes.map(hex2rgb); const data=composite(ui.frame); palRGB=keep;
  const cv=h('canvas',{class:'checker'}); cv.width=doc.w; cv.height=doc.h; cv.getContext('2d').putImageData(new ImageData(data,doc.w,doc.h),0,0); return cv;
}
function colorTransferDialog(){
  if(!ref.img){ toast('먼저 참조 이미지를 불러오세요'); return; }
  const samples=refSamples(ref.img); if(!samples.length){ toast('참조 이미지에 불투명한 픽셀이 없습니다'); return; }
  const strength=h('input',{type:'range',min:10,max:100,value:80,'aria-label':'적용 강도'});
  const before=h('figure',null,previewWithPalette(doc.palette),h('figcaption',{text:'지금'}));
  const afterBox=h('figure'); const sw=h('div',{class:'swrow'});
  let result=doc.palette.slice();
  const run=()=>{ const mode=$('input[name=ctm]:checked').value; result=transferPalette(samples,mode,strength.value/100);
    afterBox.textContent=''; afterBox.append(previewWithPalette(result),h('figcaption',{text:'바꾼 뒤'}));
    sw.textContent=''; result.forEach((c,i)=>sw.append(h('i',{style:'background:'+c,title:`${doc.palette[i]} → ${c}`}))); };
  const opt=(v,t,d,c)=>h('label',{class:'opt'},h('input',{type:'radio',name:'ctm',value:v,checked:!!c,onchange:run}),h('div',null,h('b',{text:t}),h('span',{text:d})));
  strength.addEventListener('input',run);
  modal({title:'참조 이미지 색감 옮기기',wide:true,body:h('div',{style:'display:flex;flex-direction:column;gap:10px'},
      h('p',{class:'hint',text:'팔레트 색을 참조 이미지의 색감에 맞춰 다시 칠합니다. 픽셀은 그대로이고 팔레트만 바뀌므로 모든 프레임과 레이어에 함께 적용됩니다.'}),
      h('div',{class:'optlist'},
        opt('mood','분위기 맞추기','색마다 역할(어두운 외곽선, 밝은 하이라이트)은 유지하고 전체 색조·밝기·채도를 참조 이미지에 맞춥니다.',true),
        opt('swap','참조 색으로 바꾸기','참조 이미지의 주요 색을 뽑아, 밝기 순서에 맞춰 팔레트 색을 하나씩 바꿉니다.')),
      h('label',{class:'row2'},'적용 강도',strength),
      h('div',{class:'ctprev'},before,afterBox), sw),
    actions:[{label:'취소'},{label:'적용',primary:true,onClick:()=>{ docChange(()=>{ doc.palette=result.slice(); }); toast('색감을 옮겼습니다. Ctrl+Z로 되돌릴 수 있습니다.'); }}]});
  run();
}
