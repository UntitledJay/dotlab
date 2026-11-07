/* ================= colour style transfer =================
   Takes the colours of the reference image and maps them onto the current palette by brightness rank,
   so dark stays dark and light stays light; indices do not change, only the palette colours do. */
const XF={img:null,n:0,cols:null};
function refColors(img,n){
  if(XF.img===img&&XF.n===n) return XF.cols;
  const k=Math.min(1,128/Math.max(img.naturalWidth,img.naturalHeight)); const cv=document.createElement('canvas'); cv.width=Math.max(1,Math.round(img.naturalWidth*k)); cv.height=Math.max(1,Math.round(img.naturalHeight*k));
  const c=cv.getContext('2d',{willReadFrequently:true}); c.drawImage(img,0,0,cv.width,cv.height); const d=c.getImageData(0,0,cv.width,cv.height).data; const pts=[];
  for(let i=0;i<d.length;i+=4) if(d[i+3]>=128) pts.push([d[i],d[i+1],d[i+2]]);
  const cols=kmeans(pts,n).sort((a,b)=>lum(a)-lum(b));
  Object.assign(XF,{img,n,cols}); return cols;
}
/* 'mood' mode: match the mean and spread of the palette's Lab colours (weighted by how many pixels use each colour)
   to the reference image (Reinhard transfer). Each colour keeps its role; the overall hue, brightness and saturation follow the image. */
function srgbLin(v){ v/=255; return v<=0.04045?v/12.92:Math.pow((v+0.055)/1.055,2.4); }
function linSrgb(v){ v=v<=0.0031308?12.92*v:1.055*Math.pow(v,1/2.4)-0.055; return clamp(Math.round(v*255),0,255); }
function rgb2lab(c){ const r=srgbLin(c[0]), g=srgbLin(c[1]), b=srgbLin(c[2]); const f=t=>t>0.008856?Math.cbrt(t):7.787*t+16/116;
  const x=f((r*0.4124+g*0.3576+b*0.1805)/0.95047), y=f(r*0.2126+g*0.7152+b*0.0722), z=f((r*0.0193+g*0.1192+b*0.9505)/1.08883); return [116*y-16,500*(x-y),200*(y-z)]; }
function lab2rgb(l){ const fy=(l[0]+16)/116, fx=fy+l[1]/500, fz=fy-l[2]/200, fi=t=>t*t*t>0.008856?t*t*t:(t-16/116)/7.787; const x=fi(fx)*0.95047, y=fi(fy), z=fi(fz)*1.08883;
  return [linSrgb(x*3.2406-y*1.5372-z*0.4986),linSrgb(-x*0.9689+y*1.8758+z*0.0415),linSrgb(x*0.0557-y*0.2040+z*1.0570)]; }
const XS={img:null,stat:null};
function refLabStat(img){
  if(XS.img===img) return XS.stat;
  const k=Math.min(1,128/Math.max(img.naturalWidth,img.naturalHeight)); const cv=document.createElement('canvas'); cv.width=Math.max(1,Math.round(img.naturalWidth*k)); cv.height=Math.max(1,Math.round(img.naturalHeight*k));
  const c=cv.getContext('2d',{willReadFrequently:true}); c.drawImage(img,0,0,cv.width,cv.height); const d=c.getImageData(0,0,cv.width,cv.height).data; const pts=[];
  for(let i=0;i<d.length;i+=4) if(d[i+3]>=128) pts.push(rgb2lab([d[i],d[i+1],d[i+2]]));
  Object.assign(XS,{img,stat:pts.length?labStat(pts):null}); return XS.stat;
}
function labStat(pts,wts){ const W=wts?wts.reduce((a,b)=>a+b,0):pts.length, m=[0,0,0], sd=[0,0,0];
  pts.forEach((c,i)=>{ const w=wts?wts[i]:1; for(let k=0;k<3;k++) m[k]+=c[k]*w; }); for(let k=0;k<3;k++) m[k]/=W;
  pts.forEach((c,i)=>{ const w=wts?wts[i]:1; for(let k=0;k<3;k++) sd[k]+=w*(c[k]-m[k])**2; }); for(let k=0;k<3;k++) sd[k]=Math.sqrt(sd[k]/W)||1; return {m,sd}; }
function paletteUsage(){ const n=new Float64Array(doc.palette.length+1), vis=new Set(doc.layers.filter(L=>L.visible).map(L=>L.id)), seen=new Set();
  for(const f of doc.frames) for(const id in f.cels){ const c=f.cels[id]; if(!vis.has(+id)||seen.has(c)) continue; seen.add(c); for(const v of c) n[v]++; }
  return Array.from(n).slice(1).map(u=>u+0.5); }
function xferMood(amount){
  const sr=refLabStat(ref.img); if(!sr) return null; const P=palRGB.map(rgb2lab), sp=labStat(P,paletteUsage());
  return P.map(c=>{ const t=c.map((v,k)=>(v-sp.m[k])*clamp(sr.sd[k]/sp.sd[k],k===0?0.6:0.3,k===0?1.6:3)+sr.m[k]); const mix=c.map((v,k)=>v+(t[k]-v)*amount); mix[0]=clamp(mix[0],0,100); return rgb2hex(...lab2rgb(mix)); });
}
function xferPalette(amount){
  if(($('#xferMode')||{}).value==='mood') return xferMood(amount);
  const n=doc.palette.length; const ref_=refColors(ref.img,n); if(!ref_.length) return null;
  const order=palRGB.map((c,i)=>({c,i})).sort((a,b)=>lum(a.c)-lum(b.c)); const out=doc.palette.slice();
  // when the reference has fewer colours than the palette, interpolate along its brightness ramp so palette entries stay distinct
  const m=ref_.length, at=t=>{ const x=t*(m-1), i=Math.min(m-1,Math.floor(x)), j=Math.min(m-1,i+1), f=x-i; return [0,1,2].map(k=>ref_[i][k]+(ref_[j][k]-ref_[i][k])*f); };
  order.forEach((o,rank)=>{ const r=at(n>1?rank/(n-1):0); out[o.i]=rgb2hex(o.c[0]+(r[0]-o.c[0])*amount,o.c[1]+(r[1]-o.c[1])*amount,o.c[2]+(r[2]-o.c[2])*amount); });
  return out;
}
function renderXfer(){
  const box=$('#xferPrev'); if(!box) return; box.textContent=''; const go=$('#xferGo');
  if(!ref.img){ go.disabled=true; $('#xferHint').textContent='위에서 참조 이미지를 올리면, 그 색감을 지금 팔레트에 입힐 수 있습니다. 밝기 순서대로 짝지어 바꾸므로 그림의 명암 구조는 그대로 남습니다.'; return; }
  $('#xferHint').textContent=$('#xferMode').value==='mood'?'참조 이미지의 전체 색조·밝기·채도를 팔레트에 맞춥니다. 색마다 역할(어두운 외곽선, 밝은 하이라이트)은 그대로 남아 자연스럽습니다.':'참조 이미지의 색감을 지금 팔레트에 입힙니다. 밝기 순서대로 짝지어 바꾸므로 그림의 명암 구조는 그대로 남습니다.';
  const np=xferPalette(+$('#xferAmt').value/100); go.disabled=!np; if(!np) return;
  const row=list=>h('div',{class:'swrow'},list.map(c=>h('i',{style:'background:'+c,title:c})));
  const art=list=>{ const keep=palRGB; palRGB=list.map(hex2rgb); const d=composite(ui.frame); palRGB=keep; const cv=h('canvas',{class:'checker xart'}); cv.width=doc.w; cv.height=doc.h; cv.getContext('2d').putImageData(new ImageData(d,doc.w,doc.h),0,0); return cv; };
  box.append(h('span',{text:'지금'}),row(doc.palette),h('span',{text:'적용 후'}),row(np),h('span'),h('div',{class:'xarts'},art(doc.palette),art(np)));
}
function applyXfer(){ const np=xferPalette(+$('#xferAmt').value/100); if(!np) return; docChange(()=>{ doc.palette=np; }); toast('참조 이미지의 색감을 팔레트에 입혔습니다. Ctrl+Z로 되돌릴 수 있습니다.'); }
