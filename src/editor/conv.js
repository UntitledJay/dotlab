/* ================= image → pixel ================= */
const conv={img:null,name:'',d:null,W:0,H:0,det:null};
function kmeans(pts,K){
  let seed=1234567; const rnd=()=>((seed=(seed*1103515245+12345)&0x7fffffff)/0x7fffffff);
  if(!pts.length||K<1) return [];
  if(pts.length>6000){ const s=[]; const step=pts.length/6000; for(let i=0;i<6000;i++) s.push(pts[Math.floor(i*step)]); pts=s; }
  const uniq=[...new Map(pts.map(p=>[p.join(','),p])).values()]; if(uniq.length<=K) return uniq.map(p=>p.slice());
  const C=[pts[Math.floor(rnd()*pts.length)].slice()]; const dmin=pts.map(p=>cdist(p,C[0]));
  while(C.length<K){ const sum=dmin.reduce((a,b)=>a+b,0); if(!sum) break; let r=rnd()*sum, i=0; for(;i<dmin.length-1;i++){ r-=dmin[i]; if(r<=0) break; } const c=pts[i].slice(); C.push(c); for(let j=0;j<pts.length;j++) dmin[j]=Math.min(dmin[j],cdist(pts[j],c)); }
  for(let it=0;it<12;it++){ const acc=C.map(()=>[0,0,0,0]); for(const p of pts){ const a=acc[nearestIdx(p,C)]; a[0]+=p[0]; a[1]+=p[1]; a[2]+=p[2]; a[3]++; } C.forEach((c,j)=>{ const a=acc[j]; if(a[3]){ c[0]=a[0]/a[3]; c[1]=a[1]/a[3]; c[2]=a[2]/a[3]; } }); }
  return C.map(c=>c.map(Math.round));
}
const lum=c=>c[0]*.299+c[1]*.587+c[2]*.114;

/* --- grid detection: find the size and phase of the original pixel grid --- */
function edgeProfile(d,W,H,axis){
  const n=axis==='x'?W:H, E=new Float64Array(n), T=36;
  const diff=(a,b)=>Math.max(Math.abs(d[a]-d[b]),Math.abs(d[a+1]-d[b+1]),Math.abs(d[a+2]-d[b+2]),Math.abs(d[a+3]-d[b+3]));
  if(axis==='x'){ for(let y=0;y<H;y++){ const row=y*W*4; for(let x=1;x<W;x++){ const b=row+x*4; if(diff(b-4,b)>T) E[x]++; } } }
  else { const st=W*4; for(let y=1;y<H;y++){ const row=y*st; for(let x=0;x<W;x++){ const b=row+x*4; if(diff(b-st,b)>T) E[y]++; } } }
  return E;
}
function sparse(E){ let mx=0; for(const e of E) if(e>mx) mx=e; const xs=[],es=[]; if(mx>0) for(let i=0;i<E.length;i++) if(E[i]>mx*0.03){ xs.push(i); es.push(E[i]); } return {xs,es}; }
function rAt(sp,p){ let c=0,s=0,t=0; const k=2*Math.PI/p, xs=sp.xs, es=sp.es; for(let i=0;i<xs.length;i++){ const th=xs[i]*k; c+=es[i]*Math.cos(th); s+=es[i]*Math.sin(th); t+=es[i]; } return {r:t?Math.hypot(c,s)/t:0,off:mod(Math.atan2(s,c)/(2*Math.PI)*p,p)}; }
function findPeriod(sp,len){
  if(sp.xs.length<3) return null; const maxP=Math.min(256,len/2); if(maxP<1.5) return null;
  const P=[],R=[]; for(let p=1.5;p<=maxP;p*=1.004){ P.push(p); R.push(rAt(sp,p).r); }
  if(P.length<3) return null; const Rmax=Math.max(...R); if(Rmax<0.6) return null;
  let bi=-1; for(let i=0;i<P.length;i++){ const l=i>0?R[i-1]:-1, r=i<P.length-1?R[i+1]:-1; if(R[i]>=l&&R[i]>=r&&R[i]>=Math.max(0.6,0.85*Rmax)) bi=i; }
  if(bi<0) return null;
  const lo=P[Math.max(0,bi-1)], hi=P[Math.min(P.length-1,bi+1)]; let bp=P[bi], br=R[bi];
  for(let k=0;k<=60;k++){ const p=lo+(hi-lo)*k/60; const r=rAt(sp,p).r; if(r>br){ br=r; bp=p; } }
  // a multiple of the true size can score high when one parity of edges dominates; prefer the smaller grid when it fits better
  for(let changed_=true;changed_;){ changed_=false; for(const m of [2,3,5]){ const q=bp/m; if(q<1.5) continue; const r=rAt(sp,q).r; if(r>=br+0.03){ bp=q; br=r; changed_=true; break; } } }
  const ip=Math.round(bp); if(Math.abs(bp-ip)<0.04){ const r=rAt(sp,ip).r; if(r>=br*0.97){ bp=ip; br=r; } }
  return {p:bp,r:br,off:rAt(sp,bp).off};
}
function detectGrid(){
  const {d,W,H}=conv; const sx=sparse(edgeProfile(d,W,H,'x')), sy=sparse(edgeProfile(d,W,H,'y'));
  let fx=findPeriod(sx,W), fy=findPeriod(sy,H); const det={sx,sy};
  let conf=0;
  if(fx&&fy){ conf=Math.min(fx.r,fy.r); const a=Math.min(fx.p,fy.p), b=Math.max(fx.p,fy.p), q=b/a;
    if(q>1.06&&Math.abs(q-Math.round(q))<0.06){ if(fx.p>fy.p) fx={p:fy.p,...rAt(sx,fy.p)}; else fy={p:fx.p,...rAt(sy,fx.p)}; } }
  else if(fx){ conf=fx.r; fy={p:fx.p,...rAt(sy,fx.p)}; }
  else if(fy){ conf=fy.r; fx={p:fy.p,...rAt(sx,fy.p)}; }
  if(fx&&fy){ const nx=Math.round(W/fx.p), ny=Math.round(H/fy.p); if(nx>=1&&ny>=1&&nx<=MAXSIZE&&ny<=MAXSIZE) return Object.assign(det,{kind:'grid',px:fx.p,py:fy.p,ox:fx.off,oy:fy.off,conf}); }
  if(W<=MAXSIZE&&H<=MAXSIZE) return Object.assign(det,{kind:'native',px:1,py:1,ox:0,oy:0,conf:0});
  const p=Math.max(W,H)/64; return Object.assign(det,{kind:'photo',px:p,py:p,ox:0,oy:0,conf:0});
}
function cellsOf(len,p,off){ let s=mod(off,p); if(s>0.001) s-=p; const out=[]; for(;s<len-0.001&&out.length<=MAXSIZE;s+=p){ const a=Math.max(0,s), b=Math.min(len,s+p); if(b-a>=p*0.5-1e-6) out.push([s,s+p]); } return out; }
function cellColor(d,W,x0,x1,y0,y1){
  const buckets=new Map(); let opaque=0, total=0;
  for(let y=y0;y<y1;y++) for(let x=x0;x<x1;x++){ const j=(y*W+x)*4; total++; if(d[j+3]<128) continue; opaque++; const key=(d[j]>>3)<<10|(d[j+1]>>3)<<5|(d[j+2]>>3); let b=buckets.get(key); if(!b){ b=[0,0,0,0]; buckets.set(key,b); } b[0]+=d[j]; b[1]+=d[j+1]; b[2]+=d[j+2]; b[3]++; }
  if(!total||opaque*2<total) return null;
  let best=null; for(const b of buckets.values()) if(!best||b[3]>best[3]) best=b;
  return [Math.round(best[0]/best[3]),Math.round(best[1]/best[3]),Math.round(best[2]/best[3])];
}
function sampleGrid(det){
  const {d,W,H}=conv; const cx=cellsOf(W,det.px,det.ox), cy=cellsOf(H,det.py,det.oy); const w=cx.length, h=cy.length;
  if(!w||!h||w>MAXSIZE||h>MAXSIZE) return null;
  const m=det.kind==='photo'?0:0.2; const cols=new Array(w*h).fill(null);
  const span=(c0,c1,len)=>{ const p=c1-c0; let a=Math.floor(Math.max(0,c0+p*m)), b=Math.ceil(Math.min(len,c1-p*m)); a=clamp(a,0,len-1); b=clamp(b,a+1,len); if(b<=a){ a=clamp(Math.floor((c0+c1)/2),0,len-1); b=a+1; } return [a,b]; };
  for(let j=0;j<h;j++){ const [y0,y1]=span(cy[j][0],cy[j][1],H); for(let i=0;i<w;i++){ const [x0,x1]=span(cx[i][0],cx[i][1],W); cols[j*w+i]=cellColor(d,W,x0,x1,y0,y1); } }
  return {w,h,cols};
}
function sampleCanvas(){
  const im=conv.img, tw=doc.w, th=doc.h, K=tw*th>16384?3:6;
  const cv=document.createElement('canvas'); cv.width=tw*K; cv.height=th*K; const cx=cv.getContext('2d',{willReadFrequently:true}); cx.imageSmoothingEnabled=true; cx.imageSmoothingQuality='high';
  const iw=im.naturalWidth, ih=im.naturalHeight; const s=($('#convFit').value==='cover'?Math.max:Math.min)(tw/iw,th/ih); const dw=iw*s*K, dh=ih*s*K;
  cx.drawImage(im,(cv.width-dw)/2,(cv.height-dh)/2,dw,dh);
  const d=cx.getImageData(0,0,cv.width,cv.height).data; const cols=new Array(tw*th).fill(null);
  for(let y=0;y<th;y++) for(let x=0;x<tw;x++) cols[y*tw+x]=cellColor(d,cv.width,x*K,x*K+K,y*K,y*K+K);
  return {w:tw,h:th,cols};
}
function mergeColors(list){
  const cnt=new Map(); for(const c of list){ const k=(c[0]<<16)|(c[1]<<8)|c[2]; cnt.set(k,(cnt.get(k)||0)+1); }
  const reps=[]; for(const [k] of [...cnt].sort((a,b)=>b[1]-a[1])){ const c=[(k>>16)&255,(k>>8)&255,k&255]; if(!reps.some(r=>cdist(c,r)<2000)){ reps.push(c); if(reps.length>MAXPAL) return reps; } }
  return reps;
}
function quantizeCols(cols,mode,N,target){
  const opaque=cols.filter(Boolean); const cur=palRGB.slice(); let pal;
  if(mode==='pal') pal=cur;
  else {
    let reps=mode==='new'?kmeans(opaque,Math.min(N,MAXPAL)):mergeColors(opaque);
    if(reps.length>MAXPAL) reps=kmeans(opaque,MAXPAL);
    if(target==='new') pal=reps.sort((a,b)=>lum(a)-lum(b));
    else { const extra=reps.filter(c=>!cur.length||cdist(c,cur[nearestIdx(c,cur)])>=700); const room=MAXPAL-cur.length; const add=extra.length>room?(room>0?kmeans(extra,room):[]):extra; pal=cur.concat(add.sort((a,b)=>lum(a)-lum(b))); }
  }
  if(!pal.length) pal=[[0,0,0]];
  const vals=new Uint8Array(cols.length), cache=new Map();
  cols.forEach((c,i)=>{ if(!c) return; const k=(c[0]<<16)|(c[1]<<8)|c[2]; let v=cache.get(k); if(v===undefined){ v=nearestIdx(c,pal)+1; cache.set(k,v); } vals[i]=v; });
  return {vals,palette:pal.map(c=>rgb2hex(...c)),added:target==='new'?[]:pal.slice(cur.length).map(c=>rgb2hex(...c))};
}
function buildConv(target){
  if(!conv.d) return null; const auto=$('input[name=convSize]:checked').value==='auto';
  const g=auto?sampleGrid(conv.det):sampleCanvas();
  if(!g){ toast(`결과가 ${MAXSIZE}칸을 넘습니다. 픽셀 크기를 더 크게 지정하세요.`); return null; }
  const {w,h:H,cols}=g; const sat=+$('#convSat').value/100;
  if(sat) for(const c of cols) if(c){ const gr=lum(c); for(let k=0;k<3;k++) c[k]=Math.round(clamp(gr+(c[k]-gr)*(1+sat),0,255)); }
  if($('#convBg').checked){
    const border=[]; for(let x=0;x<w;x++) border.push(x,(H-1)*w+x); for(let y=0;y<H;y++) border.push(y*w,y*w+w-1);
    const bc=border.map(i=>cols[i]).filter(Boolean);
    if(bc.length){ const ref_=mergeColors(bc)[0]; const T=6000; const seen=new Uint8Array(w*H); const st=border.filter(i=>cols[i]&&cdist(cols[i],ref_)<T); st.forEach(i=>seen[i]=1);
      while(st.length){ const i=st.pop(); cols[i]=null; const x=i%w,y=(i/w)|0; for(const j of [x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<H-1?i+w:-1]) if(j>=0&&!seen[j]&&cols[j]&&cdist(cols[j],ref_)<T){ seen[j]=1; st.push(j); } } }
  }
  const q=quantizeCols(cols,$('input[name=convMode]:checked').value,+$('#convN').value,target); const vals=q.vals;
  if($('#convClean').checked){ const s2=vals.slice();
    for(let y=0;y<H;y++) for(let x=0;x<w;x++){ const i=y*w+x, v=s2[i]; const nb=[x>0?s2[i-1]:null,x<w-1?s2[i+1]:null,y>0?s2[i-w]:null,y<H-1?s2[i+w]:null].filter(v_=>v_!==null);
      if(nb.length<3||nb.includes(v)) continue; const cnt=new Map(); for(const v_ of nb) cnt.set(v_,(cnt.get(v_)||0)+1); let bv=v,bc=0; for(const [v_,c] of cnt) if(c>bc){ bc=c; bv=v_; } if(bc>=nb.length-1) vals[i]=bv; } }
  return {w,h:H,vals,palette:q.palette,added:q.added};
}
function drawConvSrc(){
  const s=$('#convSrc'), im=conv.img; if(!im) return; const k=Math.min(4,512/Math.max(conv.W,conv.H));
  s.width=Math.max(1,Math.round(conv.W*k)); s.height=Math.max(1,Math.round(conv.H*k)); const c=s.getContext('2d'); c.imageSmoothingEnabled=k<1; c.drawImage(im,0,0,s.width,s.height);
  const det=conv.det; const auto=$('input[name=convSize]:checked').value==='auto';
  if(auto&&det&&det.kind!=='native'&&det.px*k>=3&&det.py*k>=3){
    c.strokeStyle='rgba(53,73,214,.75)'; c.lineWidth=1; c.beginPath();
    for(let x=mod(det.ox,det.px);x<=conv.W;x+=det.px){ const X=Math.round(x*k)+.5; c.moveTo(X,0); c.lineTo(X,s.height); }
    for(let y=mod(det.oy,det.py);y<=conv.H;y+=det.py){ const Y=Math.round(y*k)+.5; c.moveTo(0,Y); c.lineTo(s.width,Y); }
    c.stroke();
  }
}
function convUI(){
  const auto=$('input[name=convSize]:checked').value==='auto'; $('#convAutoBox').hidden=!auto; $('#convFitRow').hidden=auto;
  const det=conv.det, msg=$('#convDetect');
  if(!conv.d){ msg.textContent='이미지를 올리면 원본 도트 한 칸이 화면 몇 픽셀로 확대돼 있는지 찾아 원래 크기로 되돌립니다.'; return; }
  const f=v=>Number.isInteger(v)?String(v):v.toFixed(2);
  const sz=det.px===det.py?`${f(det.px)}px`:`가로 ${f(det.px)}px · 세로 ${f(det.py)}px`;
  msg.textContent={grid:`도트 격자를 찾았습니다. 원본 ${sz}가 도트 1칸입니다${det.conf<0.85?' (격자가 흐릿해 확인이 필요합니다)':''}. 왼쪽 미리보기의 파란 선이 감지한 격자입니다.`,
    native:'뚜렷한 확대 격자가 없어 원본 1px을 1칸으로 가져옵니다. 일반 사진이라면 픽셀 크기를 키워 칸 수를 줄이세요.',
    photo:'도트 격자를 찾지 못해 일반 이미지로 처리했습니다. 긴 변을 64칸으로 줄였고, 픽셀 크기로 조절할 수 있습니다.',
    manual:`직접 지정한 픽셀 크기 ${sz}로 나눕니다.`}[det.kind];
  $('#convPx').value=f(+det.px.toFixed(2));
}
function setConvPx(v){
  if(!conv.d||!(v>=1)) return; v=clamp(v,1,512); const det=conv.det;
  det.px=det.py=v; det.ox=det.sx.xs.length?rAt(det.sx,v).off:0; det.oy=det.sy.xs.length?rAt(det.sy,v).off:0; det.kind='manual';
  convUI(); runConvert();
}
function runConvert(){
  if(!conv.d) return; drawConvSrc(); const auto=$('input[name=convSize]:checked').value==='auto';
  const r=buildConv(auto?'new':'layer'); if(!r) return;
  const out=$('#convOut'); out.width=r.w; out.height=r.h; const id=new ImageData(r.w,r.h); const pr=r.palette.map(hex2rgb);
  for(let i=0;i<r.vals.length;i++){ const v=r.vals[i]; if(!v) continue; const c=pr[v-1]; id.data.set([c[0],c[1],c[2],255],i*4); }
  out.getContext('2d').putImageData(id,0,0);
  const used=new Set(r.vals); used.delete(0);
  $('#convCap').textContent=`결과 ${r.w}×${r.h} · ${used.size}색`; $('#convOutSize').textContent=auto?`→ ${r.w}×${r.h}칸`:'';
}
async function setConvImage(f){
  const im=f instanceof HTMLImageElement?f:await loadImageFile(f); conv.img=im; conv.name=(f.name||'가져온 이미지').replace(/\.[^.]+$/,'').slice(0,40);
  let W=im.naturalWidth, H=im.naturalHeight; const k=Math.min(1,4096/Math.max(W,H)); W=Math.max(1,Math.round(W*k)); H=Math.max(1,Math.round(H*k));
  const cv=document.createElement('canvas'); cv.width=W; cv.height=H; const c=cv.getContext('2d',{willReadFrequently:true}); c.imageSmoothingEnabled=k<1; c.drawImage(im,0,0,W,H);
  conv.d=c.getImageData(0,0,W,H).data; conv.W=W; conv.H=H;
  $('#convDetect').textContent='격자를 찾는 중…'; await new Promise(r=>setTimeout(r,20));
  conv.det=detectGrid();
  for(const id of ['#convOpen','#convGo','#convRef','#convRedetect']) $(id).disabled=false;
  convUI(); runConvert();
}
function convOpenNew(){
  const r=buildConv('new'); if(!r) return;
  const nd=makeDoc(r.w,r.h,r.palette,conv.name||'가져온 이미지'); nd.layers[0].name='가져온 이미지'; nd.frames[0].cels[1].set(r.vals);
  openDoc(nd); ui.primary=Math.min(1,doc.palette.length); ui.secondary=0; setTool('pencil'); renderColors(); renderPalette();
  toast(`${r.w}×${r.h} 새 캔버스(새 탭)로 열었습니다. 바로 수정하세요. 이전 작업은 원래 탭에 그대로 있습니다.`);
}
function convInsert(){
  const r=buildConv('layer'); if(!r) return; const ox=Math.floor((doc.w-r.w)/2), oy=Math.floor((doc.h-r.h)/2);
  docChange(()=>{ for(const c of r.added) doc.palette.push(c); const id=nextId++; const at=ui.layer+1; doc.layers.splice(at,0,mkLayer(id,conv.name||'변환 이미지')); for(const f of doc.frames) f.cels[id]=new Uint8Array(doc.w*doc.h);
    const cl=doc.frames[ui.frame].cels[id]; for(let y=0;y<r.h;y++) for(let x=0;x<r.w;x++){ const tx=ox+x, ty=oy+y; if(tx<0||ty<0||tx>=doc.w||ty>=doc.h) continue; const v=r.vals[y*r.w+x]; if(v) cl[ty*doc.w+tx]=v; } ui.layer=at; });
  toast(r.w>doc.w||r.h>doc.h?'결과가 캔버스보다 커서 가운데 부분만 넣었습니다. 전부 쓰려면 「새 캔버스로 열어 수정」을 누르세요.':'새 레이어로 넣었습니다');
}
