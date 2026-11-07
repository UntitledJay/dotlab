/* ================= UI component mode =================
   A document becomes a pixel UI component when doc.comp is set: {kind, slice:{l,t,r,b}|null, label}.
   Frames are the component's states (frame.name: 기본, 호버, 누름 …). slice is the 9-slice inset in art pixels;
   null means a fixed-size component (checkbox, toggle) that only scales. */

/* --- colour roles: shades of one base hue, plus neutrals --- */
function hexToHsl(hx){ const [r,g,b]=hex2rgb(hx).map(v=>v/255); const mx=Math.max(r,g,b), mn=Math.min(r,g,b), l=(mx+mn)/2, d=mx-mn; let hh=0, s=0;
  if(d){ s=d/(1-Math.abs(2*l-1)); if(mx===r) hh=60*(((g-b)/d)%6); else if(mx===g) hh=60*((b-r)/d+2); else hh=60*((r-g)/d+4); } return [(hh+360)%360,s,l]; }
function hslToHex(hh,s,l){ s=clamp(s,0,1); l=clamp(l,0,1); const c=(1-Math.abs(2*l-1))*s, x=c*(1-Math.abs((hh/60)%2-1)), m=l-c/2; let r=0,g=0,b=0;
  if(hh<60)[r,g,b]=[c,x,0]; else if(hh<120)[r,g,b]=[x,c,0]; else if(hh<180)[r,g,b]=[0,c,x]; else if(hh<240)[r,g,b]=[0,x,c]; else if(hh<300)[r,g,b]=[x,0,c]; else [r,g,b]=[c,0,x];
  return rgb2hex((r+m)*255,(g+m)*255,(b+m)*255); }
function compRoles(base){
  let [hh,s,l]=hexToHsl(base); if(s<0.25) s=0.55; l=clamp(l,0.42,0.6);
  return { ink:hslToHex(hh,Math.min(s,0.45),0.14), fill:hslToHex(hh,s,l), light:hslToHex(hh,s,l+0.16), hover:hslToHex(hh,s,l+0.07), shade:hslToHex(hh,s,l-0.15),
    paper:'#f3f1ea', paperShade:'#cdc8bb', white:'#ffffff', gray:'#a3a3ab', grayLight:'#cfcfd5', grayDark:'#6c6c75' };
}

/* --- drawing on an index array --- */
// a box whose corners are cut by r pixels (r=1: the corner pixel only); returns the inside mask
function pxBox(c,W,x0,y0,w,hh,r,out,fill){
  const inside=(x,y)=>{ if(x<x0||y<y0||x>=x0+w||y>=y0+hh) return false; const dx=Math.min(x-x0,x0+w-1-x), dy=Math.min(y-y0,y0+hh-1-y); return dx+dy>=r; };
  for(let y=y0;y<y0+hh;y++) for(let x=x0;x<x0+w;x++){ if(!inside(x,y)) continue; const edge=!inside(x-1,y)||!inside(x+1,y)||!inside(x,y-1)||!inside(x,y+1); const v=edge?out:fill; if(v) c[y*W+x]=v; }
  return inside;
}
function pxRow(c,W,x0,x1,y,v,mask){ for(let x=x0;x<=x1;x++) if(!mask||mask(x,y)) c[y*W+x]=v; }
function pxCol(c,W,x,y0,y1,v){ for(let y=y0;y<=y1;y++) c[y*W+x]=v; }
// paint only over pixels already set to `on` (keeps the outline intact)
function pxOver(c,W,x0,y0,w,hh,on,v){ for(let y=y0;y<y0+hh;y++) for(let x=x0;x<x0+w;x++) if(c[y*W+x]===on) c[y*W+x]=v; }

/* --- templates --- */
const COMPKINDS={
  button:{name:'버튼',w:24,h:12,slice:[3,2,3,3],label:'버튼',states:['기본','호버','누름','비활성'],draw(c,W,H,st,R){
    const dis=st==='비활성', press=st==='누름'; const out=dis?R.grayDark:R.ink, fill=dis?R.grayLight:st==='호버'?R.hover:press?R.shade:R.fill;
    pxBox(c,W,0,0,W,H,1,out,fill);
    if(press){ pxOver(c,W,1,1,W-2,1,fill,dis?R.gray:R.ink); }
    else { pxOver(c,W,1,1,W-2,1,fill,dis?R.white:R.light); pxOver(c,W,1,H-3,W-2,2,fill,dis?R.gray:R.shade); } }},
  panel:{name:'패널',w:24,h:20,slice:[3,3,3,3],states:['기본'],draw(c,W,H,st,R){
    pxBox(c,W,0,0,W,H,1,R.ink,R.paper); pxOver(c,W,1,1,W-2,1,R.paper,R.white); pxOver(c,W,1,1,1,H-2,R.paper,R.white);
    pxOver(c,W,1,H-2,W-2,1,R.paper,R.paperShade); pxOver(c,W,W-2,1,1,H-2,R.paper,R.paperShade); }},
  input:{name:'입력칸',w:28,h:12,slice:[3,3,3,3],label:'입력',states:['기본','포커스','비활성'],draw(c,W,H,st,R){
    const dis=st==='비활성'; pxBox(c,W,0,0,W,H,1,dis?R.gray:st==='포커스'?R.fill:R.ink,dis?R.grayLight:R.white);
    const f=dis?R.grayLight:R.white; pxOver(c,W,1,1,W-2,1,f,dis?R.gray:R.paperShade); pxOver(c,W,1,1,1,H-2,f,dis?R.gray:R.paperShade);
    if(st==='포커스') pxBox(c,W,1,1,W-2,H-2,1,R.light,0); }},
  checkbox:{name:'체크박스',w:10,h:10,slice:null,states:['꺼짐','켜짐','비활성'],draw(c,W,H,st,R){
    const dis=st==='비활성', on=st==='켜짐'; const fill=dis?R.grayLight:on?R.fill:R.white; pxBox(c,W,0,0,W,H,1,dis?R.gray:R.ink,fill);
    if(!on) pxOver(c,W,1,1,W-2,1,fill,dis?R.gray:R.paperShade);
    else for(const [x,y] of [[2,5],[3,6],[4,7],[5,6],[6,5],[7,4],[7,3],[3,5],[4,6],[6,4]]) c[y*W+x]=R.white; }},
  toggle:{name:'토글',w:18,h:10,slice:null,states:['꺼짐','켜짐'],draw(c,W,H,st,R){
    const on=st==='켜짐', tr=on?R.fill:R.gray; pxBox(c,W,0,0,W,H,3,R.ink,tr); pxOver(c,W,1,1,W-2,1,tr,on?R.shade:R.grayDark);
    const kx=on?W-8:2; pxBox(c,W,kx,2,6,6,2,R.white,R.white); pxOver(c,W,kx,7,6,1,R.white,R.paperShade); }},
  progress:{name:'진행 바',w:24,h:8,slice:[3,3,3,3],states:['트랙','채움'],draw(c,W,H,st,R){
    if(st==='채움'){ pxBox(c,W,0,0,W,H,1,R.ink,R.fill); pxOver(c,W,1,1,W-2,1,R.fill,R.light); pxOver(c,W,1,H-2,W-2,1,R.fill,R.shade); }
    else { pxBox(c,W,0,0,W,H,1,R.ink,R.grayDark); pxOver(c,W,1,1,W-2,1,R.grayDark,R.ink); } }},
  tab:{name:'탭',w:24,h:12,slice:[3,3,3,2],label:'탭',states:['선택','선택 안 됨'],draw(c,W,H,st,R){
    const sel=st==='선택', y0=sel?0:2; const m=pxBox(c,W,0,y0,W,H-y0+2,1,R.ink,sel?R.paper:R.paperShade);
    for(let x=0;x<W;x++) c[(H-1)*W+x]=sel?(x===0||x===W-1?R.ink:R.paper):R.ink;
    if(sel) pxOver(c,W,1,y0+1,W-2,1,R.paper,R.white); }},
  bubble:{name:'말풍선',w:24,h:18,slice:[10,4,4,7],label:'안녕!',states:['기본'],draw(c,W,H,st,R){
    const bh=H-4; pxBox(c,W,0,0,W,bh,2,R.ink,R.white); pxOver(c,W,2,bh-2,W-4,1,R.white,R.paperShade);
    for(let k=0;k<4;k++){ const y=bh-1+k; for(let x=4;x<=7-k;x++) c[y*W+x]=(x===4||x===7-k||k===3)?R.ink:R.white; } }},
};
const COMPCSS={'호버':':hover','누름':':active','비활성':':disabled','포커스':':focus-visible','켜짐':'[aria-checked="true"]','선택':'[aria-selected="true"]'};

// builds a new document for a template; base colour = the current primary colour
function compTemplateDoc(kind,base){
  const K=COMPKINDS[kind], R=compRoles(base); const pal=doc.palette.slice(); const need=[...new Set(Object.values(R))];
  for(const hx of need) if(!pal.includes(hx)&&pal.length<MAXPAL) pal.push(hx);
  const prgb=pal.map(hex2rgb); const idx={}; for(const k in R){ const i=pal.indexOf(R[k]); idx[k]=(i>=0?i:nearestIdx(hex2rgb(R[k]),prgb))+1; }
  const d=makeDoc(K.w,K.h,pal,K.name); d.layers[0].name=K.name;
  d.frames=K.states.map(st=>{ const c=new Uint8Array(K.w*K.h); K.draw(c,K.w,K.h,st,idx); return {dur:200,name:st,cels:{1:c}}; });
  d.comp={kind,slice:K.slice?{l:K.slice[0],t:K.slice[1],r:K.slice[2],b:K.slice[3]}:null,label:K.label||''};
  return d;
}
// the primary colour, unless it is a grey (black outline colour, white…): then a default blue
function compBase(){ const c=ui.primary&&doc.palette[ui.primary-1]; return c&&hexToHsl(c)[1]>=0.2&&hexToHsl(c)[2]>0.12&&hexToHsl(c)[2]<0.9?c:'#3d7be0'; }
function stateName(fi){ const f=doc.frames[fi]; return (f&&f.name)||`상태 ${fi+1}`; }

/* --- 9-slice --- */
// stretches an RGBA image to W×H keeping the four corners and the edge thickness; the middle is stretched by nearest neighbour
function nineSlice(src,w,hh,sl,W,H){
  const s=sl||{l:0,t:0,r:0,b:0}; W=Math.max(W,s.l+s.r+1); H=Math.max(H,s.t+s.b+1);
  const map=(x,n,a,b,N)=>{ if(!sl) return Math.min(n-1,Math.floor(x*n/N)); if(x<a) return x; if(x>=N-b) return n-(N-x); const cn=n-a-b; return a+Math.min(cn-1,Math.floor((x-a)*cn/(N-a-b))); };
  const mx=new Int32Array(W), my=new Int32Array(H); for(let x=0;x<W;x++) mx[x]=map(x,w,s.l,s.r,W); for(let y=0;y<H;y++) my[y]=map(y,hh,s.t,s.b,H);
  const out=new Uint8ClampedArray(W*H*4);
  for(let y=0;y<H;y++) for(let x=0;x<W;x++){ const j=(my[y]*w+mx[x])*4, k=(y*W+x)*4; out[k]=src[j]; out[k+1]=src[j+1]; out[k+2]=src[j+2]; out[k+3]=src[j+3]; }
  return {data:out,w:W,h:H};
}
// crisp pixel text: drawn at art resolution, then alpha-thresholded
function pixelText(text,rgb,maxW){
  const cv=document.createElement('canvas'), c=cv.getContext('2d',{willReadFrequently:true}); const font='9px "IBM Plex Sans KR",system-ui,sans-serif';
  c.font=font; const tw=Math.min(maxW||999,Math.ceil(c.measureText(text).width)+1); cv.width=Math.max(1,tw); cv.height=11; c.font=font; c.textBaseline='top'; c.fillStyle='#000'; c.fillText(text,0,1);
  const d=c.getImageData(0,0,cv.width,cv.height); for(let i=0;i<d.data.length;i+=4){ const a=d.data[i+3]>=110; d.data[i]=rgb[0]; d.data[i+1]=rgb[1]; d.data[i+2]=rgb[2]; d.data[i+3]=a?255:0; } c.putImageData(d,0,0); return cv;
}

/* --- mode --- */
function setMode(m){
  ui.mode=m==='comp'?'comp':'dot'; try{ localStorage.setItem('dotlab.mode',ui.mode); }catch(e){}
  document.documentElement.dataset.mode=ui.mode;
  $$('#modeSwitch .chip').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===ui.mode)));
  $('#tabComp').hidden=ui.mode!=='comp';
  if(ui.mode==='comp') showTab('pComp'); else if(!$('#pComp').hidden) showTab('pAI');
  $('#frAdd').textContent=ui.mode==='comp'?'빈 상태':'빈 프레임'; $('#frDup').textContent=ui.mode==='comp'?'상태 복제':'복제';
  renderComp(); renderTimeline(); requestDraw();
}
function makeComponentFromArt(){ docChange(()=>{ const m=Math.max(1,Math.floor(Math.min(doc.w,doc.h)/4)); doc.comp={kind:'custom',slice:{l:m,t:m,r:m,b:m},label:''}; doc.frames.forEach((f,i)=>{ if(!f.name) f.name=i===0?'기본':`상태 ${i+1}`; }); }); toast('지금 그림을 컴포넌트로 바꿨습니다. 캔버스의 분홍 가이드를 끌어 늘어날 부분을 정하세요.'); }
function startTemplate(kind){ replaceDoc(compTemplateDoc(kind,compBase())); ui.layer=0; renderLayers(); toast(`「${COMPKINDS[kind].name}」 템플릿을 열었습니다. 상태마다 타임라인에서 골라 고칠 수 있습니다.`); }
function setSlice(k,v){ if(!doc.comp||!doc.comp.slice) return; const s={...doc.comp.slice}; const lim=k==='l'||k==='r'?doc.w-1-(k==='l'?s.r:s.l):doc.h-1-(k==='t'?s.b:s.t); s[k]=clamp(v|0,0,Math.max(0,lim)); docChange(()=>{ doc.comp.slice=s; }); }
function toggleSlice(on){ docChange(()=>{ const m=Math.max(1,Math.floor(Math.min(doc.w,doc.h)/4)); doc.comp.slice=on?{l:m,t:m,r:m,b:m}:null; }); }

/* --- panel --- */
const compPrev={w:48,h:16};
function renderComp(){
  const box=$('#pComp'); if(!box||ui.mode!=='comp'||!doc) return; box.textContent='';
  const grid=h('div',{class:'compkinds'},Object.entries(COMPKINDS).map(([k,K])=>{
    const d=compTemplateDoc(k,compBase()); const keep=[doc,palRGB]; doc=d; palRGB=d.palette.map(hex2rgb); const rgba=composite(0); doc=keep[0]; palRGB=keep[1];
    const cv=h('canvas',{class:'checker'}); cv.width=d.w; cv.height=d.h; cv.getContext('2d').putImageData(new ImageData(rgba,d.w,d.h),0,0);
    return h('button',{class:'compkind',title:`${K.name} 템플릿으로 새로 시작 (상태 ${K.states.length}개)`,onclick:()=>startTemplate(k)},cv,h('span',{text:K.name})); }));
  box.append(h('h3',{text:'템플릿으로 시작'}),h('p',{class:'hint',text:'주 색상을 기준으로 명암을 나눠 그립니다. 고른 뒤 연필로 바로 다듬을 수 있습니다.'}),grid,h('hr'));
  if(!doc.comp){ box.append(h('p',{class:'hint',text:'지금 그림은 아직 컴포넌트가 아닙니다. 그림을 그대로 쓰면서 늘어날 부분(9-slice)과 상태를 정할 수 있습니다.'}),h('div',{class:'actions'},h('button',{class:'btn primary',text:'지금 그림을 컴포넌트로 쓰기',onclick:makeComponentFromArt}))); return; }
  const C=doc.comp, s=C.slice;
  // 9-slice
  const num=(k,label)=>{ const i=h('input',{type:'number',min:0,max:k==='l'||k==='r'?doc.w-1:doc.h-1,value:s?s[k]:0,'aria-label':label+' 여백',disabled:!s,style:'width:56px'}); i.addEventListener('change',()=>setSlice(k,+i.value)); return h('label',null,label,i); };
  const on=h('input',{type:'checkbox',checked:!!s}); on.addEventListener('change',()=>toggleSlice(on.checked));
  box.append(h('h3',{text:'늘리기 (9-slice)'}),
    h('label',{class:'row2 chk',title:'모서리는 그대로 두고 가장자리와 가운데만 늘립니다'},on,'모서리를 지키며 늘리기'),
    s?h('div',{class:'row2 sl'},num('l','왼쪽'),num('t','위'),num('r','오른쪽'),num('b','아래')):h('p',{class:'hint',text:'늘리지 않는 고정 크기 컴포넌트입니다. 미리보기와 CSS에서는 통째로 확대만 합니다.'}),
    s?h('p',{class:'hint',text:'캔버스의 분홍 가이드를 끌어도 됩니다. 모서리 네 칸은 그대로, 가장자리는 한 방향으로, 가운데는 양방향으로 늘어납니다.'}):null);
  // preview
  const lab=h('input',{value:C.label||'','aria-label':'미리보기 글자',placeholder:'글자 없음',style:'width:110px'}); lab.addEventListener('change',()=>{ C.label=lab.value.slice(0,24); renderCompPreview(); scheduleSave(); });
  const rw=h('input',{type:'range',min:Math.max(4,doc.w>>1),max:Math.min(160,doc.w*6),value:Math.max(compPrev.w,doc.w),'aria-label':'미리보기 너비'}), rh=h('input',{type:'range',min:Math.max(4,doc.h>>1),max:Math.min(96,doc.h*5),value:Math.max(compPrev.h,doc.h),'aria-label':'미리보기 높이'});
  compPrev.w=+rw.value; compPrev.h=+rh.value;
  const sz=h('span',{class:'mono hint',text:''});
  const upd=()=>{ compPrev.w=+rw.value; compPrev.h=+rh.value; renderCompPreview(); };
  rw.addEventListener('input',upd); rh.addEventListener('input',upd);
  box.append(h('hr'),h('h3',{text:'늘린 모습 미리보기'}),h('div',{class:'row2'},h('label',null,'너비',rw),h('label',null,'높이',rh)),h('div',{class:'row2'},h('label',null,'글자',lab),sz),h('div',{class:'compprev',id:'compPrev'}),
    h('hr'),h('div',{class:'actions'},h('button',{class:'btn primary',text:'컴포넌트 내보내기',onclick:()=>exportDialog('component')}),h('span',{class:'hint',text:'상태별 PNG + 9-slice JSON + CSS'})));
  renderCompPreview();
}
function renderCompPreview(){
  const box=$('#compPrev'); if(!box) return; box.textContent=''; const C=doc.comp; if(!C) return;
  const W=C.slice?compPrev.w:doc.w, H=C.slice?compPrev.h:doc.h; const sz=box.parentElement&&box.parentElement.querySelector('.row2 .mono'); if(sz) sz.textContent=`${W}×${H}px`;
  const ink=palRGB.slice().sort((a,b)=>lum(a)-lum(b))[0]||[0,0,0];
  const scale=Math.max(1,Math.min(6,Math.floor(140/Math.max(W,H*1.6))));
  doc.frames.forEach((f,fi)=>{
    const st=nineSlice(composite(fi),doc.w,doc.h,C.slice,W,H); const cv=document.createElement('canvas'); cv.width=st.w; cv.height=st.h; const c=cv.getContext('2d'); c.putImageData(new ImageData(st.data,st.w,st.h),0,0);
    if(C.label){ const name=stateName(fi), j=((st.h>>1)*st.w+(st.w>>1))*4, bg=[st.data[j],st.data[j+1],st.data[j+2]];
      // text colour with contrast against the middle of this state: darkest or lightest palette colour, a mid grey when disabled
      const byL=palRGB.slice().sort((a,b)=>lum(a)-lum(b)); const col=/비활성/.test(name)?byL[nearestIdx([128,128,136],byL)]:lum(bg)<150?byL[byL.length-1]:ink; const t=pixelText(C.label,col,st.w-4); const dy=/누름/.test(name)?1:0; c.drawImage(t,Math.round((st.w-t.width)/2),Math.round((st.h-11)/2)-1+dy); }
    cv.className='checker'; cv.style.width=st.w*scale+'px'; cv.style.height=st.h*scale+'px';
    box.append(h('figure',null,cv,h('figcaption',{text:stateName(fi)})));
  });
}

function renameState(i){
  const inp=h('input',{value:stateName(i),'aria-label':'상태 이름',maxlength:30});
  const pick=h('div',{class:'sizes'},['기본','호버','누름','비활성','포커스','켜짐','꺼짐','선택'].map(n=>h('button',{class:'btn sm',text:n,onclick:()=>{ inp.value=n; }})));
  modal({title:'상태 이름',body:h('div',{style:'display:flex;flex-direction:column;gap:10px'},inp,pick,h('p',{class:'hint',text:'호버·누름·비활성·포커스·켜짐·선택은 CSS로 내보낼 때 :hover, :active 같은 선택자로 이어집니다.'})),
    actions:[{label:'취소'},{label:'적용',primary:true,onClick:()=>{ const v=inp.value.trim().slice(0,30); if(!v){ toast('이름을 적어 주세요'); return false; } docChange(()=>{ doc.frames[i].name=v; }); }}]});
}

/* --- 9-slice guides on the canvas (drawn by draw(), dragged before the active tool sees the pointer) --- */
function compGuides(){ const s=doc&&doc.comp&&doc.comp.slice; if(ui.mode!=='comp'||!s) return null; return [{k:'l',axis:'x',at:s.l},{k:'r',axis:'x',at:doc.w-s.r},{k:'t',axis:'y',at:s.t},{k:'b',axis:'y',at:doc.h-s.b}]; }
function drawCompGuides(ctx,ox,oy,W,H){
  const g=compGuides(); if(!g) return; const z=ui.zoom; ctx.save(); ctx.lineWidth=1; ctx.strokeStyle=tok.guide; ctx.setLineDash([5,3]);
  ctx.beginPath(); for(const q of g){ if(q.axis==='x'){ const x=Math.round(ox+q.at*z)+.5; ctx.moveTo(x,oy-8); ctx.lineTo(x,oy+H+8); } else { const y=Math.round(oy+q.at*z)+.5; ctx.moveTo(ox-8,y); ctx.lineTo(ox+W+8,y); } } ctx.stroke(); ctx.restore();
}
let guideDrag=null;
function guideAt(e){ const g=compGuides(); if(!g) return null; const r=view.getBoundingClientRect(), mx=e.clientX-r.left, my=e.clientY-r.top, z=ui.zoom;
  let best=null, bd=6; for(const q of g){ const d=q.axis==='x'?Math.abs(mx-(ui.panX+q.at*z)):Math.abs(my-(ui.panY+q.at*z)); if(d<bd){ bd=d; best=q; } } return best; }
function guideDown(e){ if(e.button!==0) return false; const q=guideAt(e); if(!q) return false; guideDrag={k:q.k,orig:{...doc.comp.slice}}; return true; }
function guideMove(e){
  if(!guideDrag){ const q=guideAt(e); if(ui.mode==='comp') view.style.cursor=q?(q.axis==='x'?'ew-resize':'ns-resize'):(ui.tool==='hand'?'grab':'crosshair'); return false; }
  const r=view.getBoundingClientRect(), z=ui.zoom, s=doc.comp.slice, k=guideDrag.k;
  const px_=Math.round((e.clientX-r.left-ui.panX)/z), py=Math.round((e.clientY-r.top-ui.panY)/z);
  if(k==='l') s.l=clamp(px_,0,doc.w-1-s.r); else if(k==='r') s.r=clamp(doc.w-px_,0,doc.w-1-s.l); else if(k==='t') s.t=clamp(py,0,doc.h-1-s.b); else s.b=clamp(doc.h-py,0,doc.h-1-s.t);
  requestDraw(); return true;
}
function guideUp(){ if(!guideDrag) return false; const now={...doc.comp.slice}, o=guideDrag.orig; guideDrag=null;
  if(JSON.stringify(now)!==JSON.stringify(o)){ doc.comp.slice=o; docChange(()=>{ doc.comp.slice=now; }); } return true; }

/* --- export: one PNG per state, 9-slice JSON for engines, CSS border-image --- */
async function exportComponent(s){
  const C=doc.comp; if(!C){ toast('먼저 컴포넌트 모드에서 템플릿을 고르거나 지금 그림을 컴포넌트로 바꾸세요'); return; }
  const cls='px-'+(C.kind&&C.kind!=='custom'?C.kind:'component'); const safe=t=>String(t).replace(/[\\/:*?"<>|\s]+/g,'-');
  const files=[], states=[];
  for(let fi=0;fi<doc.frames.length;fi++){ const fn=`${base()}-${safe(stateName(fi))}@${s}x.png`; files.push({filename:fn,data:await toBlob(scaledFrame(fi,s))}); states.push({name:stateName(fi),file:fn,selector:COMPCSS[stateName(fi)]||null}); }
  const sl=C.slice;
  files.push({filename:`${base()}.ui.json`,data:JSON.stringify({app:'DotLab',type:'ui-component',name:doc.name,kind:C.kind,size:{w:doc.w,h:doc.h},scale:s,
    slice:sl?{left:sl.l,top:sl.t,right:sl.r,bottom:sl.b}:null,sliceScaled:sl?{left:sl.l*s,top:sl.t*s,right:sl.r*s,bottom:sl.b*s}:null,label:C.label||'',states},null,1)});
  const url=f=>`url("${f}")`; let css=`/* 도트랩 UI 컴포넌트 「${doc.name}」 · ${s}배 · 이미지 파일을 이 CSS와 같은 폴더에 두세요 */\n`;
  if(sl){ const v=`${sl.t*s} ${sl.r*s} ${sl.b*s} ${sl.l*s}`;
    css+=`.${cls}{border-style:solid;border-width:${sl.t*s}px ${sl.r*s}px ${sl.b*s}px ${sl.l*s}px;border-image:${url(states[0].file)} ${v} fill stretch;image-rendering:pixelated;background:none;box-sizing:border-box;min-width:${doc.w*s}px;min-height:${doc.h*s}px}\n`;
    states.forEach((st,i)=>{ const sel=i===0?null:(st.selector||`.is-${safe(st.name)}`); if(sel) css+=`.${cls}${sel}{border-image-source:${url(st.file)}}\n`; }); }
  else { css+=`.${cls}{width:${doc.w*s}px;height:${doc.h*s}px;border:0;background:${url(states[0].file)} 0 0/100% 100% no-repeat;image-rendering:pixelated}\n`;
    states.forEach((st,i)=>{ const sel=i===0?null:(st.selector||`.is-${safe(st.name)}`); if(sel) css+=`.${cls}${sel}{background-image:${url(st.file)}}\n`; }); }
  files.push({filename:`${base()}.css`,data:css});
  offerFiles(files);
}

// text for the Figma component description
function compNote(){ const C=doc.comp, s=C&&C.slice; return `도트랩 UI 컴포넌트 · ${doc.w}×${doc.h}px · `+(s?`9-slice 여백 왼쪽 ${s.l} · 위 ${s.t} · 오른쪽 ${s.r} · 아래 ${s.b} (원본 픽셀)`:'고정 크기 (늘리지 않음)')+` · 상태: ${doc.frames.map((_,i)=>stateName(i)).join(', ')}`; }
