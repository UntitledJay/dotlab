/* ================= UI component mode =================
   A document becomes a pixel UI component when doc.comp is set:
     {kind, slice:{l,t,r,b}|null, pad:{l,t,r,b}, padAuto, lock, fill:'stretch'|'tile', label, opts, libId}
   Frames are the component's states (frame.name: 기본, 호버, 누름 …).
   slice  9-slice inset in art pixels; null = fixed-size component (checkbox, toggle) that only scales.
   pad    content area (where a label or icon sits), measured from each edge.
   lock   corners and edges (everything outside the 9-slice centre) cannot be painted; only the inside can.
   fill   how the inside and the edges grow: stretched (nearest neighbour) or repeated (tiled).
   opts   generation options of a template {w,h,radius,border,depth,base}; changing them redraws every state.
   libId  id of the entry in 「내 컴포넌트」 this document was saved to or opened from. */

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
// a box whose corners are cut by r pixels (r=1: the corner pixel only); 1px outline
function pxBox(c,W,x0,y0,w,hh,r,out,fill){
  const inside=(x,y)=>{ if(x<x0||y<y0||x>=x0+w||y>=y0+hh) return false; const dx=Math.min(x-x0,x0+w-1-x), dy=Math.min(y-y0,y0+hh-1-y); return dx+dy>=r; };
  for(let y=y0;y<y0+hh;y++) for(let x=x0;x<x0+w;x++){ if(!inside(x,y)) continue; const edge=!inside(x-1,y)||!inside(x+1,y)||!inside(x,y-1)||!inside(x,y+1); const v=edge?out:fill; if(v&&y>=0&&x>=0&&x<W) c[y*W+x]=v; }
  return inside;
}
// the same box with a 1 or 2 pixel border
function pxFrame(c,W,x0,y0,w,hh,r,bw,out,fill){ pxBox(c,W,x0,y0,w,hh,r,out,bw>1?out:fill); if(bw>1) pxBox(c,W,x0+1,y0+1,w-2,hh-2,Math.max(0,r-1),out,fill); }
// paint only over pixels already set to `on` (keeps the outline intact)
function pxOver(c,W,x0,y0,w,hh,on,v){ for(let y=Math.max(0,y0);y<y0+hh;y++) for(let x=Math.max(0,x0);x<x0+w&&x<W;x++) if(c[y*W+x]===on) c[y*W+x]=v; }

/* --- templates: every draw takes the generation options o = {radius, border, depth} --- */
// size ranges and defaults; slice and content area follow from the options (compSliceFor / compPadFor)
const COMPKINDS={
  button:{name:'버튼',w:24,h:12,wr:[10,96],hr:[8,32],radius:1,border:1,depth:2,label:'버튼',states:['기본','호버','누름','비활성'],draw(c,W,H,st,R,o){
    const dis=st==='비활성', press=st==='누름', b=o.border, d=o.depth; const out=dis?R.grayDark:R.ink, fill=dis?R.grayLight:st==='호버'?R.hover:press?R.shade:R.fill;
    pxFrame(c,W,0,0,W,H,o.radius,b,out,fill);
    if(press){ pxOver(c,W,b,b,W-2*b,1,fill,dis?R.gray:R.ink); }
    else { pxOver(c,W,b,b,W-2*b,1,fill,dis?R.white:R.light); if(d) pxOver(c,W,b,H-b-d,W-2*b,d,fill,dis?R.gray:R.shade); } }},
  panel:{name:'패널',w:24,h:20,wr:[10,128],hr:[8,96],radius:1,border:1,depth:1,states:['기본'],draw(c,W,H,st,R,o){
    const b=o.border; pxFrame(c,W,0,0,W,H,o.radius,b,R.ink,R.paper); pxOver(c,W,b,b,W-2*b,1,R.paper,R.white); pxOver(c,W,b,b,1,H-2*b,R.paper,R.white);
    if(o.depth){ pxOver(c,W,b,H-b-o.depth,W-2*b,o.depth,R.paper,R.paperShade); pxOver(c,W,W-b-1,b,1,H-2*b,R.paper,R.paperShade); } }},
  input:{name:'입력칸',w:28,h:12,wr:[10,128],hr:[8,32],radius:1,border:1,depth:1,label:'입력',states:['기본','포커스','비활성'],draw(c,W,H,st,R,o){
    const dis=st==='비활성', b=o.border; pxFrame(c,W,0,0,W,H,o.radius,b,dis?R.gray:st==='포커스'?R.fill:R.ink,dis?R.grayLight:R.white);
    const f=dis?R.grayLight:R.white; if(o.depth){ pxOver(c,W,b,b,W-2*b,o.depth,f,dis?R.gray:R.paperShade); pxOver(c,W,b,b,1,H-2*b,f,dis?R.gray:R.paperShade); }
    if(st==='포커스') pxBox(c,W,b,b,W-2*b,H-2*b,Math.max(0,o.radius-1),R.light,0); }},
  checkbox:{name:'체크박스',w:10,h:10,wr:[7,24],hr:[7,24],fixed:true,radius:1,border:1,depth:1,states:['꺼짐','켜짐','비활성'],draw(c,W,H,st,R,o){
    const dis=st==='비활성', on=st==='켜짐', b=o.border; const fill=dis?R.grayLight:on?R.fill:R.white; pxFrame(c,W,0,0,W,H,o.radius,b,dis?R.gray:R.ink,fill);
    if(!on){ if(o.depth) pxOver(c,W,b,b,W-2*b,o.depth,fill,dis?R.gray:R.paperShade); return; }
    // a check mark scaled to the box: short stroke down-right, long stroke up-right
    const x0=b+1, x1=W-b-2, y1=H-b-2, mid=x0+Math.max(1,Math.round((x1-x0)/3));
    for(let x=x0;x<=x1;x++){ const y=x<=mid?y1-(mid-x):y1-(x-mid); for(const yy of [y,y-1]) if(yy>b&&yy<H-b) c[yy*W+x]=R.white; } }},
  toggle:{name:'토글',w:18,h:10,wr:[12,40],hr:[7,20],fixed:true,radius:3,border:1,depth:1,states:['꺼짐','켜짐'],draw(c,W,H,st,R,o){
    const on=st==='켜짐', tr=on?R.fill:R.gray, b=o.border, r=Math.min(o.radius,Math.floor(H/2)); pxFrame(c,W,0,0,W,H,r,b,R.ink,tr); if(o.depth) pxOver(c,W,b,b,W-2*b,1,tr,on?R.shade:R.grayDark);
    const k=H-2*b-2, kx=on?W-b-1-k:b+1; pxBox(c,W,kx,b+1,k,k,Math.min(Math.max(0,r-1),Math.floor(k/2)),R.white,R.white); if(o.depth) pxOver(c,W,kx,b+k,k,1,R.white,R.paperShade); }},
  progress:{name:'진행 바',w:24,h:8,wr:[10,128],hr:[5,24],radius:1,border:1,depth:1,states:['트랙','채움'],draw(c,W,H,st,R,o){
    const b=o.border;
    if(st==='채움'){ pxFrame(c,W,0,0,W,H,o.radius,b,R.ink,R.fill); pxOver(c,W,b,b,W-2*b,1,R.fill,R.light); if(o.depth) pxOver(c,W,b,H-b-o.depth,W-2*b,o.depth,R.fill,R.shade); }
    else { pxFrame(c,W,0,0,W,H,o.radius,b,R.ink,R.grayDark); if(o.depth) pxOver(c,W,b,b,W-2*b,o.depth,R.grayDark,R.ink); } }},
  tab:{name:'탭',w:24,h:12,wr:[10,96],hr:[8,32],radius:1,border:1,depth:0,label:'탭',states:['선택','선택 안 됨'],draw(c,W,H,st,R,o){
    const sel=st==='선택', y0=sel?0:2, b=o.border; pxFrame(c,W,0,y0,W,H-y0+o.radius+2,o.radius,b,R.ink,sel?R.paper:R.paperShade);
    for(let y=H-b;y<H;y++) for(let x=0;x<W;x++) c[y*W+x]=sel?(x<b||x>=W-b?R.ink:R.paper):R.ink;
    if(sel) pxOver(c,W,b,y0+b,W-2*b,1,R.paper,R.white); }},
  bubble:{name:'말풍선',w:24,h:18,wr:[14,128],hr:[10,64],radius:2,border:1,depth:1,label:'안녕!',states:['기본'],draw(c,W,H,st,R,o){
    const bh=H-4, b=o.border; pxFrame(c,W,0,0,W,bh,o.radius,b,R.ink,R.white); if(o.depth) pxOver(c,W,b,bh-b-o.depth,W-2*b,o.depth,R.white,R.paperShade);
    for(let k=0;k<4;k++){ const y=bh-b+k; for(let x=4;x<=7-k;x++) if(y<H) c[y*W+x]=(x<4+b||x>7-k-b||k===3)?R.ink:R.white; } }},
};
const COMPCSS={'호버':':hover','누름':':active','비활성':':disabled','포커스':':focus-visible','켜짐':'[aria-checked="true"]','선택':'[aria-selected="true"]'};
// the same states named in English (case does not matter)
Object.assign(COMPCSS,{hover:':hover',pressed:':active',active:':active',disabled:':disabled',focus:':focus-visible',on:'[aria-checked="true"]',checked:'[aria-checked="true"]',selected:'[aria-selected="true"]'});

function compOpts(kind,o){ const K=COMPKINDS[kind]; o=o||{};
  const pick=(k,lo,hi,def)=>clamp(Number.isFinite(+o[k])?Math.round(+o[k]):def,lo,hi);
  const w=pick('w',K.wr[0],K.wr[1],K.w), hh=pick('h',K.hr[0],K.hr[1],K.h);
  return {w,h:hh,radius:pick('radius',0,Math.min(6,Math.floor(Math.min(w,hh)/2)),K.radius),border:pick('border',1,2,K.border),depth:pick('depth',0,3,K.depth),base:isHex(o.base||'')?normHex(o.base):null}; }
// 9-slice inset that keeps the corners, outline, highlight and depth rows out of the stretched middle
function compSliceFor(kind,o){
  const K=COMPKINDS[kind]; if(K.fixed) return null; const b=o.border, r=o.radius, d=o.depth; let s;
  if(kind==='bubble') s={l:Math.max(9,b+r+1),t:Math.max(b+r,b+1),r:b+r+1,b:4+b+Math.max(r,d,1)};
  else if(kind==='tab') s={l:b+r+1,t:2+b+Math.max(r-1,0),r:b+r+1,b:b};
  else s={l:b+r+1,t:Math.max(b+r,b+1),r:b+r+1,b:Math.max(b+r,b+d)};
  return fitSlice(s,o.w,o.h);
}
function fitSlice(s,w,hh){ if(!s) return null; s={...s}; while(s.l+s.r>=w&&(s.l>0||s.r>0)){ if(s.l>=s.r&&s.l>0) s.l--; else s.r--; } while(s.t+s.b>=hh&&(s.t>0||s.b>0)){ if(s.t>=s.b&&s.t>0) s.t--; else s.b--; } return s; }
// content area: inside the outline and rounding, above the depth rows (and the bubble's tail, below an unselected tab's step)
function compPadFor(kind,o){
  const b=o.border, r=o.radius, d=COMPKINDS[kind].fixed?0:o.depth;
  const p={l:b+Math.max(r,1)+2,r:b+Math.max(r,1)+2,t:b+Math.max(r,1)+(kind==='tab'?2:0),b:b+Math.max(r,d,1)+(kind==='bubble'?4:0)};
  return fitPad(p,o.w,o.h);
}
function fitPad(p,w,hh){ p={l:clamp(p.l|0,0,w-1),t:clamp(p.t|0,0,hh-1),r:clamp(p.r|0,0,w-1),b:clamp(p.b|0,0,hh-1)}; if(p.l+p.r>=w){ p.l=p.r=Math.floor((w-1)/2); } if(p.t+p.b>=hh){ p.t=p.b=Math.floor((hh-1)/2); } return p; }

// builds a document for a template with generation options; colours are added to the palette when there is room
function compTemplateDoc(kind,base,opts){
  const K=COMPKINDS[kind], o=compOpts(kind,opts); o.base=normHex(o.base||base||'#3d7be0'); const R=compRoles(o.base);
  const pal=doc.palette.slice(); for(const hx of new Set(Object.values(R))) if(!pal.includes(hx)&&pal.length<MAXPAL) pal.push(hx);
  const prgb=pal.map(hex2rgb); const idx={}; for(const k in R){ const i=pal.indexOf(R[k]); idx[k]=(i>=0?i:nearestIdx(hex2rgb(R[k]),prgb))+1; }
  const d=makeDoc(o.w,o.h,pal,K.name); d.layers[0].name=K.name;
  d.frames=K.states.map(st=>{ const c=new Uint8Array(o.w*o.h); K.draw(c,o.w,o.h,st,idx,o); return {dur:200,name:st,cels:{1:c}}; });
  d.comp={kind,slice:compSliceFor(kind,o),pad:compPadFor(kind,o),padAuto:true,lock:!K.fixed,fill:'stretch',label:K.label||'',opts:o};
  return d;
}
// the primary colour, unless it is a grey (black outline colour, white…): then a default blue
function compBase(){ const c=ui.primary&&doc.palette[ui.primary-1]; return c&&hexToHsl(c)[1]>=0.2&&hexToHsl(c)[2]>0.12&&hexToHsl(c)[2]<0.9?c:'#3d7be0'; }
function stateName(fi){ const f=doc.frames[fi]; return (f&&f.name)||`상태 ${fi+1}`; }
function compPad(){ const C=doc.comp; if(!C) return null; return C.pad?fitPad(C.pad,doc.w,doc.h):fitPad(C.slice||{l:1,t:1,r:1,b:1},doc.w,doc.h); }

/* --- 9-slice --- */
// stretches an RGBA image to W×H keeping the four corners and the edge thickness;
// the edges and the middle are stretched by nearest neighbour, or repeated when mode is 'tile'
function nineSlice(src,w,hh,sl,W,H,mode){
  const s=sl||{l:0,t:0,r:0,b:0}; W=Math.max(W,s.l+s.r+1); H=Math.max(H,s.t+s.b+1);
  const map=(x,n,a,b,N)=>{ if(!sl) return Math.min(n-1,Math.floor(x*n/N)); if(x<a) return x; if(x>=N-b) return n-(N-x); const cn=n-a-b; return a+(mode==='tile'?(x-a)%cn:Math.min(cn-1,Math.floor((x-a)*cn/(N-a-b)))); };
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

/* --- lock: only the inside (the 9-slice centre) can be painted; setPx asks this for every pixel --- */
function compLocked(x,y){ const C=doc.comp; if(ui.mode!=='comp'||!C||!C.lock||!C.slice) return false; const s=C.slice; return x<s.l||y<s.t||x>=doc.w-s.r||y>=doc.h-s.b; }
let lockHintT=0;
function compLockHint(p){ if(['pencil','eraser','fill','line','rect','ellipse'].includes(ui.tool)&&compLocked(p.x,p.y)&&Date.now()-lockHintT>4000){ lockHintT=Date.now(); toast('모서리·테두리는 잠겨 있어 안쪽만 그려집니다. 컴포넌트 탭에서 잠금을 풀 수 있습니다.'); } }

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
function makeComponentFromArt(){ docChange(()=>{ const m=Math.max(1,Math.floor(Math.min(doc.w,doc.h)/4)); doc.comp={kind:'custom',slice:{l:m,t:m,r:m,b:m},pad:fitPad({l:m,t:m,r:m,b:m},doc.w,doc.h),padAuto:true,lock:false,fill:'stretch',label:''}; doc.frames.forEach((f,i)=>{ if(!f.name) f.name=i===0?'기본':`상태 ${i+1}`; }); }); toast('지금 그림을 컴포넌트로 바꿨습니다. 캔버스의 분홍 가이드를 끌어 늘어날 부분을 정하세요.'); }
// a template replaces a component being tried out, but pixel art keeps its own tab
function startTemplate(kind){ const nd=compTemplateDoc(kind,compBase()); if(doc.comp) replaceDoc(nd); else openDoc(nd); ui.layer=0; renderLayers(); toast(`「${COMPKINDS[kind].name}」 템플릿을 열었습니다. 모서리·테두리는 잠겨 있고 안쪽만 그릴 수 있습니다.`); }
// redraws every state with new generation options (one undo step); hand edits are replaced
function regenComp(patch){
  const C=doc.comp; if(!C||!C.opts||!COMPKINDS[C.kind]) return;
  const o={...C.opts,...patch}; const nd=compTemplateDoc(C.kind,o.base,o); const sz=doc.w+'x'+doc.h;
  nd.name=doc.name; Object.assign(nd.comp,{label:C.label,lock:C.lock,fill:C.fill,libId:C.libId,padAuto:C.padAuto!==false});
  if(C.padAuto===false&&C.pad) nd.comp.pad=fitPad(C.pad,nd.w,nd.h);
  docChange(()=>{ doc=nd; ui.layer=0; ui.frame=clamp(ui.frame,0,nd.frames.length-1); });
  if(sz!==doc.w+'x'+doc.h) fitView();
}
function setSlice(k,v){ if(!doc.comp||!doc.comp.slice) return; const s={...doc.comp.slice}; const lim=k==='l'||k==='r'?doc.w-1-(k==='l'?s.r:s.l):doc.h-1-(k==='t'?s.b:s.t); s[k]=clamp(v|0,0,Math.max(0,lim)); docChange(()=>{ doc.comp.slice=s; }); }
function setPad(k,v){ if(!doc.comp) return; const p={...compPad()}; p[k]=v|0; docChange(()=>{ doc.comp.pad=fitPad(p,doc.w,doc.h); doc.comp.padAuto=false; }); }
function setCompFlag(k,v){ docChange(()=>{ doc.comp[k]=v; }); }
function toggleSlice(on){ docChange(()=>{ const m=Math.max(1,Math.floor(Math.min(doc.w,doc.h)/4)); doc.comp.slice=on?{l:m,t:m,r:m,b:m}:null; }); }

/* --- 「내 컴포넌트」 library: entries {id, name, kind, w, h, states, savedAt, data (serialize())} ---
   Web: this browser's localStorage. The Figma build redeclares libLoad/libStore to use figma.clientStorage. */
const LIBKEY='dotlab.library';
function libLoad(){ try{ const a=JSON.parse(localStorage.getItem(LIBKEY)||'[]'); return Array.isArray(a)?a:[]; }catch(e){ return []; } }
function libStore(list){ try{ localStorage.setItem(LIBKEY,JSON.stringify(list)); return true; }catch(e){ toast('이 브라우저의 저장 공간이 부족해 저장하지 못했습니다. 라이브러리를 파일로 내보낸 뒤 쓰지 않는 컴포넌트를 지워 주세요.'); return false; } }
function libNewId(){ return 'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,6); }
function libSave(asNew){
  const C=doc.comp; if(!C){ toast('컴포넌트만 저장할 수 있습니다. 템플릿을 고르거나 지금 그림을 컴포넌트로 바꾸세요.'); return; }
  const list=libLoad(); const at=C.libId?list.findIndex(e=>e.id===C.libId):-1; const over=at>=0&&!asNew;
  const id=over?C.libId:libNewId(); const keep=C.libId; C.libId=id;
  const entry={id,name:doc.name,kind:C.kind,w:doc.w,h:doc.h,states:doc.frames.length,savedAt:Date.now(),data:serialize()};
  if(over) list[at]=entry; else list.unshift(entry);
  if(!libStore(list)){ C.libId=keep; return; }
  scheduleSave(); renderComp(); toast(over?`「${doc.name}」을(를) 덮어 저장했습니다`:`「${doc.name}」을(를) 내 컴포넌트에 저장했습니다`);
}
function libOpen(id){ const e=libLoad().find(x=>x.id===id); if(!e) return;
  try{ const nd=deserialize(JSON.parse(e.data)); if(!nd.comp) throw new Error(); nd.comp.libId=id; openDoc(nd); ui.layer=0; renderLayers(); toast(`「${nd.name}」을(를) 열었습니다`); }
  catch(err){ toast('이 컴포넌트를 읽지 못했습니다. 라이브러리 파일을 다시 가져와 보세요.'); } }
function libDelete(id){ const list=libLoad(), e=list.find(x=>x.id===id); if(!e) return;
  modal({title:'컴포넌트 삭제',body:h('p',{class:'hint',text:`「${e.name}」을(를) 내 컴포넌트에서 지웁니다. 지금 열려 있는 그림은 그대로 남습니다. 되돌릴 수 없으니 필요하면 먼저 라이브러리를 파일로 내보내세요.`}),
    actions:[{label:'취소'},{label:'삭제',danger:true,onClick:()=>{ if(libStore(list.filter(x=>x.id!==id))){ if(doc.comp&&doc.comp.libId===id){ delete doc.comp.libId; scheduleSave(); } renderComp(); toast('삭제했습니다'); } }}]}); }
function libExport(){ const list=libLoad(); if(!list.length){ toast('저장한 컴포넌트가 없습니다'); return; }
  offerFiles([{filename:'dotlab-components.json',data:JSON.stringify({format:'dotlab-library',version:1,items:list})}]); }
// merges a library file: entries are checked by reading them; an id already present is kept and the import gets a new id
function libImport(o){
  const list=libLoad(), ids=new Set(list.map(e=>e.id)); let added=0, bad=0;
  for(const e of (o&&Array.isArray(o.items)?o.items:[])){
    try{ const nd=deserialize(JSON.parse(e.data)); if(!nd.comp) throw 0;
      const id=e.id&&!ids.has(e.id)?String(e.id).slice(0,40):libNewId(); ids.add(id);
      list.push({id,name:String(e.name||nd.name).slice(0,60),kind:nd.comp.kind,w:nd.w,h:nd.h,states:nd.frames.length,savedAt:+e.savedAt||Date.now(),data:e.data}); added++; }
    catch(err){ bad++; } }
  if(added&&libStore(list)){ if(ui.mode!=='comp') setMode('comp'); else renderComp(); }
  toast(added?`컴포넌트 ${added}개를 가져왔습니다`+(bad?` (읽지 못한 ${bad}개는 건너뜀)`:''):'가져올 수 있는 컴포넌트가 없습니다');
}
const libThumbs=new Map();
function libThumb(e){ const k=e.id+e.savedAt; let t=libThumbs.get(k);
  if(!t){ try{ const d=deserialize(JSON.parse(e.data)); const keep=[doc,palRGB]; doc=d; palRGB=d.palette.map(hex2rgb); try{ t={w:d.w,h:d.h,data:composite(0)}; } finally { doc=keep[0]; palRGB=keep[1]; } }catch(err){ t=null; } libThumbs.set(k,t); }
  const cv=h('canvas',{class:'checker'}); if(t){ cv.width=t.w; cv.height=t.h; cv.getContext('2d').putImageData(new ImageData(t.data,t.w,t.h),0,0); } return cv; }

/* --- panel --- */
const compPrev={w:48,h:16};
function renderComp(){
  const box=$('#pComp'); if(!box||ui.mode!=='comp'||!doc) return; const scroll=box.scrollTop; box.textContent='';
  const sec=(title,...kids)=>h('section',{class:'csec'},h('h3',{text:title}),...kids);
  // templates
  const grid=h('div',{class:'compkinds'},Object.entries(COMPKINDS).map(([k,K])=>{
    const d=compTemplateDoc(k,compBase()); const keep=[doc,palRGB]; doc=d; palRGB=d.palette.map(hex2rgb); const rgba=composite(0); doc=keep[0]; palRGB=keep[1];
    const cv=h('canvas',{class:'checker'}); cv.width=d.w; cv.height=d.h; cv.getContext('2d').putImageData(new ImageData(rgba,d.w,d.h),0,0);
    return h('button',{class:'compkind',title:`${K.name} 템플릿으로 새로 시작 (상태 ${K.states.length}개)`,onclick:()=>startTemplate(k)},cv,h('span',{text:K.name})); }));
  box.append(sec('템플릿으로 시작',h('p',{class:'hint',text:'주 색상을 기준으로 명암을 나눠 그립니다.'}),grid));
  // library
  const list=libLoad(), C=doc.comp, cur=C&&C.libId&&list.some(e=>e.id===C.libId);
  const libFile=h('input',{type:'file',accept:'.json',class:'vh','aria-label':'라이브러리 파일'}); libFile.addEventListener('change',async()=>{ const f=libFile.files[0]; libFile.value=''; if(!f) return; try{ libImport(JSON.parse(await readText(f))); }catch(err){ toast('라이브러리 파일을 읽지 못했습니다'); } });
  const libList=h('div',{class:'liblist'},list.length?list.map(e=>h('div',{class:'libitem'+(C&&C.libId===e.id?' on':'')},
      h('button',{class:'libopen',title:`「${e.name}」 열기`,onclick:()=>libOpen(e.id)},libThumb(e),h('span',{class:'ln','data-i18n':'off',text:e.name}),h('span',{class:'lm',text:`${e.w}×${e.h} · ${e.states}상태`})),
      h('button',{class:'mini',title:'삭제','aria-label':`「${e.name}」 삭제`,html:ICON.trash,onclick:()=>libDelete(e.id)}))):h('p',{class:'hint empty',text:'아직 저장한 컴포넌트가 없습니다. 다듬은 컴포넌트를 저장해 두면 여기서 다시 열 수 있습니다.'}));
  box.append(sec('내 컴포넌트',
    h('div',{class:'actions'},
      h('button',{class:'btn primary',text:cur?'덮어 저장':'내 컴포넌트에 저장',disabled:!C,title:C?'':'컴포넌트만 저장할 수 있습니다',onclick:()=>libSave(false)}),
      cur?h('button',{class:'btn',text:'새로 저장',onclick:()=>libSave(true)}):null,
      h('span',{class:'spacer'}),
      h('button',{class:'btn sm ghost',text:'가져오기',title:'라이브러리 파일(.json)에서 컴포넌트를 더합니다',onclick:()=>libFile.click()}),
      h('button',{class:'btn sm ghost',text:'파일로',title:'모든 컴포넌트를 파일 하나로 내려받습니다',disabled:!list.length,onclick:libExport}),libFile),
    libList,h('p',{class:'hint',text:libStoreHint()})));
  if(!C){ box.append(sec('지금 그림을 컴포넌트로',h('p',{class:'hint',text:'그림을 그대로 쓰면서 늘어날 부분(9-slice)과 상태를 정할 수 있습니다.'}),h('div',{class:'actions'},h('button',{class:'btn primary',text:'지금 그림을 컴포넌트로 쓰기',onclick:makeComponentFromArt})))); box.scrollTop=scroll; return; }
  const s=C.slice;
  // generation options
  if(C.opts&&COMPKINDS[C.kind]){
    const K=COMPKINDS[C.kind], o=C.opts;
    const rng=(k,label,lo,hi)=>{ const v=h('span',{class:'mono rv',text:String(o[k])}); const i=h('input',{type:'range',min:lo,max:hi,value:o[k],'aria-label':label});
      i.addEventListener('input',()=>{ v.textContent=i.value; }); i.addEventListener('change',()=>regenComp({[k]:+i.value})); return h('label',{class:'rg'},h('span',{text:label}),i,v); };
    const col=h('input',{type:'color',value:o.base||'#3d7be0','aria-label':'기본 색'}); col.addEventListener('change',()=>regenComp({base:col.value}));
    box.append(sec('모양 (다시 그리기)',
      h('div',{class:'rgs'},rng('w','너비',K.wr[0],K.wr[1]),rng('h','높이',K.hr[0],K.hr[1]),rng('radius','모서리 둥글기',0,Math.min(6,Math.floor(Math.min(o.w,o.h)/2))),rng('border','테두리 두께',1,2),rng('depth','입체감',0,3)),
      h('div',{class:'row2'},h('label',null,'기본 색',col),h('button',{class:'btn sm',text:'주 색상 쓰기',title:'팔레트에서 고른 주 색상으로 다시 그립니다',onclick:()=>regenComp({base:compBase()})})),
      h('p',{class:'hint',text:'바꾸면 모든 상태를 처음부터 다시 그립니다. 손으로 고친 부분은 사라지니(Ctrl+Z로 되돌릴 수 있음) 모양을 먼저 정한 뒤 안쪽을 다듬으세요.'})));
  }
  // corners: 9-slice and lock
  const num=(k,label,val,fn,max,dis)=>{ const i=h('input',{type:'number',min:0,max,value:val,'aria-label':label,disabled:!!dis,style:'width:52px'}); i.addEventListener('change',()=>fn(k,+i.value)); return h('label',null,label,i); };
  const on=h('input',{type:'checkbox',checked:!!s}); on.addEventListener('change',()=>toggleSlice(on.checked));
  const lock=h('input',{type:'checkbox',checked:!!C.lock,disabled:!s}); lock.addEventListener('change',()=>setCompFlag('lock',lock.checked));
  const fill=h('select',{'aria-label':'늘리는 방식',disabled:!s},h('option',{value:'stretch',text:'늘이기',selected:C.fill!=='tile'}),h('option',{value:'tile',text:'반복 (무늬 유지)',selected:C.fill==='tile'})); fill.addEventListener('change',()=>setCompFlag('fill',fill.value));
  box.append(sec('모서리 (9-slice)',
    h('label',{class:'row2 chk',title:'모서리는 그대로 두고 가장자리와 가운데만 늘립니다'},on,'모서리를 지키며 늘리기'),
    s?h('div',{class:'row2 sl'},num('l','왼쪽',s.l,setSlice,doc.w-1),num('t','위',s.t,setSlice,doc.h-1),num('r','오른쪽',s.r,setSlice,doc.w-1),num('b','아래',s.b,setSlice,doc.h-1)):h('p',{class:'hint',text:'늘리지 않는 고정 크기 컴포넌트입니다. 미리보기와 CSS에서는 통째로 확대만 합니다.'}),
    s?h('label',{class:'row2 chk',title:'분홍 가이드 바깥(모서리와 테두리)에는 그려지지 않습니다'},lock,'모서리·테두리 잠금 (안쪽만 그리기)'):null,
    s?h('label',{class:'row2'},'안쪽을 늘릴 때',fill):null,
    s?h('p',{class:'hint',text:'캔버스의 분홍 가이드를 끌어도 됩니다. 잠금이 켜져 있으면 가이드 바깥은 흐리게 보이고 그려지지 않습니다. 안쪽에 무늬를 그렸다면 「반복」을 고르세요.'}):null));
  // content area
  const p=compPad();
  box.append(sec('안쪽 영역 (글자·아이콘 자리)',
    h('div',{class:'row2 sl'},num('l','왼쪽',p.l,setPad,doc.w-1),num('t','위',p.t,setPad,doc.h-1),num('r','오른쪽',p.r,setPad,doc.w-1),num('b','아래',p.b,setPad,doc.h-1)),
    h('div',{class:'row2'},C.padAuto===false&&C.opts?h('button',{class:'btn sm',text:'모양에 맞게 되돌리기',onclick:()=>docChange(()=>{ C.pad=compPadFor(C.kind,C.opts); C.padAuto=true; })}):null,
      h('span',{class:'hint',text:'캔버스에 파란 점선으로 보입니다. 미리보기 글자 위치와 CSS padding이 됩니다.'}))));
  // preview
  const lab=h('input',{value:C.label||'','aria-label':'미리보기 글자',placeholder:'글자 없음',style:'width:110px'}); lab.addEventListener('change',()=>{ C.label=lab.value.slice(0,24); renderCompPreview(); scheduleSave(); });
  const rw=h('input',{type:'range',min:Math.max(4,doc.w>>1),max:Math.min(200,doc.w*6),value:clamp(Math.max(compPrev.w,doc.w),Math.max(4,doc.w>>1),Math.min(200,doc.w*6)),'aria-label':'미리보기 너비'}), rh=h('input',{type:'range',min:Math.max(4,doc.h>>1),max:Math.min(120,doc.h*5),value:clamp(Math.max(compPrev.h,doc.h),Math.max(4,doc.h>>1),Math.min(120,doc.h*5)),'aria-label':'미리보기 높이'});
  compPrev.w=+rw.value; compPrev.h=+rh.value;
  const upd=()=>{ compPrev.w=+rw.value; compPrev.h=+rh.value; renderCompPreview(); };
  rw.addEventListener('input',upd); rh.addEventListener('input',upd);
  box.append(sec('늘린 모습 미리보기',h('div',{class:'row2'},h('label',null,'너비',rw),h('label',null,'높이',rh)),h('div',{class:'row2'},h('label',null,'글자',lab),h('span',{class:'mono hint',id:'compPrevSize'})),h('div',{class:'compprev',id:'compPrev'})),
    sec('내보내기',h('div',{class:'actions'},h('button',{class:'btn',text:'컴포넌트 내보내기',onclick:()=>exportDialog('component')}),h('span',{class:'hint',text:'상태별 PNG + 9-slice JSON + CSS'}))));
  renderCompPreview(); box.scrollTop=scroll;
}
function libStoreHint(){ return '이 브라우저에만 보관됩니다. 다른 기기로 옮기거나 백업하려면 「파일로」 내려받으세요.'; }
function renderCompPreview(){
  const box=$('#compPrev'); if(!box) return; box.textContent=''; const C=doc.comp; if(!C) return;
  const W=C.slice?compPrev.w:doc.w, H=C.slice?compPrev.h:doc.h; const sz=$('#compPrevSize'); if(sz) sz.textContent=`${W}×${H}px`;
  const p=compPad(), ink=palRGB.slice().sort((a,b)=>lum(a)-lum(b))[0]||[0,0,0];
  const scale=Math.max(1,Math.min(6,Math.floor(140/Math.max(W,H*1.6))));
  doc.frames.forEach((f,fi)=>{
    const st=nineSlice(composite(fi),doc.w,doc.h,C.slice,W,H,C.fill); const cv=document.createElement('canvas'); cv.width=st.w; cv.height=st.h; const c=cv.getContext('2d'); c.putImageData(new ImageData(st.data,st.w,st.h),0,0);
    if(C.label){ const name=stateName(fi);
      // the label sits in the content area, which keeps its distance from each edge when the component grows
      const cx0=p.l, cy0=p.t, cw=Math.max(1,st.w-p.l-p.r), ch=Math.max(1,st.h-p.t-p.b);
      const j=((cy0+(ch>>1))*st.w+cx0+(cw>>1))*4, bg=[st.data[j],st.data[j+1],st.data[j+2]];
      const byL=palRGB.slice().sort((a,b)=>lum(a)-lum(b)); const col=/비활성/.test(name)?byL[nearestIdx([128,128,136],byL)]:lum(bg)<150?byL[byL.length-1]:ink;
      const t=pixelText(C.label,col,cw); const dy=/누름/.test(name)?1:0; c.save(); c.beginPath(); c.rect(cx0,cy0,cw,ch); c.clip(); c.drawImage(t,cx0+Math.round((cw-t.width)/2),cy0+Math.round((ch-9)/2)-1+dy); c.restore(); }
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

/* --- canvas overlay (drawn by draw()): locked area tint, 9-slice guides (pink, draggable), content area (blue) --- */
function compGuides(){ const s=doc&&doc.comp&&doc.comp.slice; if(ui.mode!=='comp'||!s) return null; return [{k:'l',axis:'x',at:s.l},{k:'r',axis:'x',at:doc.w-s.r},{k:'t',axis:'y',at:s.t},{k:'b',axis:'y',at:doc.h-s.b}]; }
function drawCompGuides(ctx,ox,oy,W,H){
  if(ui.mode!=='comp'||!doc.comp) return; const C=doc.comp, z=ui.zoom, s=C.slice; ctx.save();
  if(s&&C.lock){ ctx.fillStyle=tok.stage; ctx.globalAlpha=.55; const cx=ox+s.l*z, cy=oy+s.t*z, cw=(doc.w-s.l-s.r)*z, ch=(doc.h-s.t-s.b)*z;
    ctx.beginPath(); ctx.rect(ox,oy,W,H); ctx.rect(cx,cy,cw,ch); ctx.fill('evenodd'); ctx.globalAlpha=1; }
  const g=compGuides(); if(g){ ctx.lineWidth=1; ctx.strokeStyle=tok.guide; ctx.setLineDash([5,3]);
    ctx.beginPath(); for(const q of g){ if(q.axis==='x'){ const x=Math.round(ox+q.at*z)+.5; ctx.moveTo(x,oy-8); ctx.lineTo(x,oy+H+8); } else { const y=Math.round(oy+q.at*z)+.5; ctx.moveTo(ox-8,y); ctx.lineTo(ox+W+8,y); } } ctx.stroke(); }
  // content area on top, so it shows even where it lines up with the guides
  const p=compPad(); if(p){ const rx=Math.round(ox+p.l*z)+1, ry=Math.round(oy+p.t*z)+1, rw=(doc.w-p.l-p.r)*z-2, rh=(doc.h-p.t-p.b)*z-2;
    // light underlay + blue dashes, readable on any fill
    ctx.setLineDash([]); ctx.lineWidth=3; ctx.strokeStyle=tok.panel; ctx.globalAlpha=.85; ctx.strokeRect(rx,ry,rw,rh); ctx.globalAlpha=1;
    ctx.strokeStyle=tok['guide-2']; ctx.lineWidth=1.5; ctx.setLineDash([6,4]); ctx.strokeRect(rx,ry,rw,rh); }
  ctx.restore();
}
let guideDrag=null;
function guideAt(e){ const g=compGuides(); if(!g) return null; const q=viewPt(e), mx=q.x, my=q.y, z=ui.zoom;
  let best=null, bd=6; for(const q of g){ const d=q.axis==='x'?Math.abs(mx-(ui.panX+q.at*z)):Math.abs(my-(ui.panY+q.at*z)); if(d<bd){ bd=d; best=q; } } return best; }
function guideDown(e){ if(e.button!==0) return false; const q=guideAt(e); if(!q) return false; guideDrag={k:q.k,orig:{...doc.comp.slice}}; return true; }
function guideMove(e){
  if(!guideDrag){ const q=guideAt(e); if(ui.mode==='comp') view.style.cursor=q?(q.axis==='x'?'ew-resize':'ns-resize'):cursorFor(ui.tool); if(q&&ui.cursor){ ui.cursor=null; requestDraw(); } return false; }
  const q=viewPt(e), z=ui.zoom, s=doc.comp.slice, k=guideDrag.k;
  const px_=Math.round((q.x-ui.panX)/z), py=Math.round((q.y-ui.panY)/z);
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
  for(let fi=0;fi<doc.frames.length;fi++){ const fn=`${base()}-${safe(stateName(fi))}@${s}x.png`; files.push({filename:fn,data:await toBlob(scaledFrame(fi,s))}); states.push({name:stateName(fi),file:fn,selector:(COMPCSS[stateName(fi)]||COMPCSS[stateName(fi).toLowerCase()]||null)}); }
  const sl=C.slice, p=compPad(), tile=C.fill==='tile';
  files.push({filename:`${base()}.ui.json`,data:JSON.stringify({app:'DotLab',type:'ui-component',name:doc.name,kind:C.kind,size:{w:doc.w,h:doc.h},scale:s,
    slice:sl?{left:sl.l,top:sl.t,right:sl.r,bottom:sl.b}:null,sliceScaled:sl?{left:sl.l*s,top:sl.t*s,right:sl.r*s,bottom:sl.b*s}:null,fill:sl?(tile?'tile':'stretch'):null,
    content:{left:p.l,top:p.t,right:p.r,bottom:p.b},contentScaled:{left:p.l*s,top:p.t*s,right:p.r*s,bottom:p.b*s},label:C.label||'',states},null,1)});
  const url=f=>`url("${f}")`; let css=`/* 도트랩 UI 컴포넌트 「${doc.name}」 · ${s}배 · 이미지 파일을 이 CSS와 같은 폴더에 두세요 */\n`;
  if(sl){ const v=`${sl.t*s} ${sl.r*s} ${sl.b*s} ${sl.l*s}`, pd=k=>Math.max(0,(p[k]-sl[k])*s);
    css+=`.${cls}{border-style:solid;border-width:${sl.t*s}px ${sl.r*s}px ${sl.b*s}px ${sl.l*s}px;border-image:${url(states[0].file)} ${v} fill ${tile?'round':'stretch'};image-rendering:pixelated;background:none;box-sizing:border-box;min-width:${doc.w*s}px;min-height:${doc.h*s}px;padding:${pd('t')}px ${pd('r')}px ${pd('b')}px ${pd('l')}px}\n`;
    states.forEach((st,i)=>{ const sel=i===0?null:(st.selector||`.is-${safe(st.name)}`); if(sel) css+=`.${cls}${sel}{border-image-source:${url(st.file)}}\n`; }); }
  else { css+=`.${cls}{width:${doc.w*s}px;height:${doc.h*s}px;border:0;background:${url(states[0].file)} 0 0/100% 100% no-repeat;image-rendering:pixelated}\n`;
    states.forEach((st,i)=>{ const sel=i===0?null:(st.selector||`.is-${safe(st.name)}`); if(sel) css+=`.${cls}${sel}{background-image:${url(st.file)}}\n`; }); }
  files.push({filename:`${base()}.css`,data:css});
  offerFiles(files);
}

// text for the Figma component description
function compNote(){ const C=doc.comp, s=C&&C.slice, p=compPad(); return `도트랩 UI 컴포넌트 · ${doc.w}×${doc.h}px · `+(s?`9-slice 여백 왼쪽 ${s.l} · 위 ${s.t} · 오른쪽 ${s.r} · 아래 ${s.b} (원본 픽셀, ${C.fill==='tile'?'반복':'늘이기'})`:'고정 크기 (늘리지 않음)')+(p?` · 안쪽 영역 ${p.l}/${p.t}/${p.r}/${p.b}`:'')+` · 상태: ${doc.frames.map((_,i)=>stateName(i)).join(', ')}`; }
