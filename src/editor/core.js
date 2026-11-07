'use strict';
/* ================= utilities ================= */
const $=(s,r=document)=>r.querySelector(s);
const $$=(s,r=document)=>Array.from(r.querySelectorAll(s));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mod=(a,n)=>((a%n)+n)%n;
function h(tag,attrs,...kids){
  const e=document.createElement(tag);
  if(attrs) for(const k in attrs){
    const v=attrs[k]; if(v==null||v===false) continue;
    if(k==='class') e.className=v;
    else if(k==='text') e.textContent=v;
    else if(k==='html') e.innerHTML=v;
    else if(k.startsWith('on')) e.addEventListener(k.slice(2),v);
    else if(k==='style') e.style.cssText=v;
    else e.setAttribute(k,v===true?'':v);
  }
  for(const c of kids.flat()){ if(c==null||c===false) continue; e.append(c.nodeType?c:document.createTextNode(String(c))); }
  return e;
}
const CH='0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
const MAXPAL=62;
const MAXSIZE=256;
function hex2rgb(hx){ hx=String(hx).replace('#',''); if(hx.length===3) hx=hx.split('').map(c=>c+c).join(''); const n=parseInt(hx,16)||0; return [(n>>16)&255,(n>>8)&255,n&255]; }
function rgb2hex(r,g,b){ return '#'+[r,g,b].map(v=>clamp(Math.round(v),0,255).toString(16).padStart(2,'0')).join(''); }
const isHex=s=>/^#?[0-9a-fA-F]{6}$/.test(String(s).trim());
const normHex=s=>'#'+String(s).trim().replace('#','').toLowerCase();
function cdist(a,b){ const rm=(a[0]+b[0])/2, dr=a[0]-b[0], dg=a[1]-b[1], db=a[2]-b[2]; return (2+rm/256)*dr*dr+4*dg*dg+(2+(255-rm)/256)*db*db; }
function nearestIdx(rgb,pal){ let bi=0,bd=Infinity; for(let i=0;i<pal.length;i++){ const d=cdist(rgb,pal[i]); if(d<bd){bd=d;bi=i;} } return bi; }
function colorName(hx){
  const [r,g,b]=hex2rgb(hx).map(v=>v/255); const mx=Math.max(r,g,b), mn=Math.min(r,g,b); const l=(mx+mn)/2; const d=mx-mn;
  const s=d===0?0:d/(1-Math.abs(2*l-1)); let hh=0;
  if(d){ if(mx===r) hh=60*(((g-b)/d)%6); else if(mx===g) hh=60*((b-r)/d+2); else hh=60*((r-g)/d+4); } if(hh<0) hh+=360;
  if(l<0.1) return 'near-black'; if(l>0.93) return 'near-white';
  const tone=l<0.3?'dark ':l>0.7?'light ':'';
  if(s<0.15) return tone+'gray';
  const names=[[15,'red'],[40,'orange'],[65,'yellow'],[95,'yellow-green'],[150,'green'],[185,'teal'],[205,'cyan'],[250,'blue'],[290,'purple'],[335,'magenta'],[361,'red']];
  let nm='red'; for(const [lim,n] of names){ if(hh<lim){nm=n;break;} }
  if(nm==='orange'&&l<0.4) nm='brown';
  return (s<0.4?'muted ':'')+tone+nm;
}
let toastT=null;
function toast(msg){ const t=$('#toast'); t.textContent=msg; t.classList.add('show'); clearTimeout(toastT); toastT=setTimeout(()=>t.classList.remove('show'),2800); }
function px(map){
  const rows=map.trim().split(/\s+/); const H=rows.length, W=rows[0].length; let r='';
  rows.forEach((row,y)=>{ for(let x=0;x<W;x++) if(row[x]==='#') r+=`<rect x="${x}" y="${y}" width="1" height="1"/>`; });
  return `<svg viewBox="0 0 ${W} ${H}" width="18" height="18" shape-rendering="crispEdges" fill="currentColor" aria-hidden="true">${r}</svg>`;
}
const ICON={
  pencil:px('......##. .....#..# ....#..#. ...#..#.. ..#..#... .#..#.... ##.#..... ###...... .........'),
  eraser:px('......... .....###. ....#####. ...#.####  ..#...##. .#...#... #...#.... .#.#..... ..#......'.replace('#####.','#####').replace('#.#### ','#.####')),
  fill:px('...#..... ..#.#.... .#...#... #.....#.. .#...###. ..#.#.### ...#...## .......#. .........'),
  picker:px('......##. .....#### ....####. ...#.##.. ..#.#.... .#.#..... .##...... #........ .........'),
  line:px('........# .......#. ......#.. .....#... ....#.... ...#..... ..#...... .#....... #........'),
  rect:px('......... ######### #.......# #.......# #.......# #.......# #.......# ######### .........'),
  ellipse:px('......... ...###... .##...##. #.......# #.......# #.......# .##...##. ...###... .........'),
  select:px('##.###.## #.......# ......... #.......# #.......# ......... #.......# ##.###.## .........'),
  wand:px('#.#.#.... .###..... ##.##.... .###..... #.#.#.... .....#... ......#.. .......#. ........#'),
  move:px('....#.... ...###... ....#.... .#..#..#. ######### .#..#..#. ....#.... ...###... ....#....'),
  hand:px('..#.#.#.. ..#.#.#.# ..#.#.#.# #.####### ##......# .#......# ..#....#. ...####.. .........'),
  eye:px('......... ..#####.. .#.....#. #...#...# #..###..# #...#...# .#.....#. ..#####.. .........'),
  lock:px('...###... ..#...#.. ..#...#.. .#######. .#######. .###.###. .#######. .#######. .........'),
  unlock:px('...###... ..#...#.. ......#.. .#######. .#######. .###.###. .#######. .#######. .........'),
  plus:px('......... ....#.... ....#.... ....#.... ######### ....#.... ....#.... ....#.... .........'),
  copy:px('######... #....#... #.######. #.#....#. ###....#. ..#....#. ..#....#. ..######. .........'),
  up:px('....#.... ...###... ..#.#.#.. .#..#..#. ....#.... ....#.... ....#.... ....#.... .........'),
  down:px('....#.... ....#.... ....#.... ....#.... .#..#..#. ..#.#.#.. ...###... ....#.... .........'),
  merge:px('#.......# .#.....#. ..#...#.. ...#.#... ....#.... ....#.... ......... ######### .........'),
  trash:px('...###... ######### .#.....#. .#.#.#.#. .#.#.#.#. .#.#.#.#. .#.....#. .#######. .........'),
  play:px('.#....... .###..... .#####... .#######. .#####... .###..... .#....... ......... .........'),
  stop:px('......... .#######. .#######. .#######. .#######. .#######. .#######. .#######. .........'),
  sun:px('....#.... .#.....#. ...###... ..#####.. #.#####.# ..#####.. ...###... .#.....#. ....#....'),
  moon:px('...###... ..##..... .##...... .##...... .##...... .##.....# ..##...#. ...####.. .........'),
};

/* ================= palettes ================= */
const PRESETS={
  'PICO-8 (16색)':['#000000','#1d2b53','#7e2553','#008751','#ab5236','#5f574f','#c2c3c7','#fff1e8','#ff004d','#ffa300','#ffec27','#00e436','#29adff','#83769c','#ff77a8','#ffccaa'],
  'Sweetie 16 (16색)':['#1a1c2c','#5d275d','#b13e53','#ef7d57','#ffcd75','#a7f070','#38b764','#257179','#29366f','#3b5dc9','#41a6f6','#73eff7','#f4f4f4','#94b0c2','#566c86','#333c57'],
  '휴대용 게임기 녹색 (4색)':['#0f380f','#306230','#8bac0f','#9bbc0f'],
  '흙과 숲 (8색)':['#2b1d16','#5a3a28','#8c5a3c','#c2864f','#e8b57a','#f5e2b8','#6b7f3a','#a3b45a'],
  '흑백 (2색)':['#000000','#ffffff'],
  '회색 (8색)':['#000000','#242424','#494949','#6d6d6d','#929292','#b6b6b6','#dbdbdb','#ffffff'],
};

/* ================= state ================= */
let doc=null, nextId=1, palRGB=[];
const ui={tool:'pencil',primary:1,secondary:0,brush:1,pixelPerfect:true,mirrorX:false,mirrorY:false,dither:false,shapeFill:false,
  zoom:8,panX:0,panY:0,grid:true,tile:false,onion:false,layer:0,frame:0,sel:null,selEdges:[],playing:false,playFrame:0,playTag:-1,playSeq:[],playPos:0,hover:null,lastPt:null,fitted:false,mode:'dot'};
const ref={img:null,opacity:.4,visible:true,above:false};
const TOOLDEFS=[
  {id:'pencil',name:'연필',key:'B',hint:'Shift+클릭: 마지막 점에서 직선 · 오른쪽 버튼: 보조 색상'},
  {id:'eraser',name:'지우개',key:'E',hint:'투명으로 지웁니다'},
  {id:'fill',name:'채우기',key:'G',hint:'Shift+클릭: 같은 색 전체를 한 번에'},
  {id:'picker',name:'스포이드',key:'I',hint:'보이는 그림에서 색을 집습니다 · 오른쪽 버튼: 보조 색상'},
  {id:'line',name:'직선',key:'L',hint:'Shift: 수평·수직·45° 고정'},
  {id:'rect',name:'사각형',key:'U',hint:'Shift: 정사각형'},
  {id:'ellipse',name:'원',key:'O',hint:'Shift: 정원'},
  {id:'select',name:'사각 선택',key:'M',hint:'드래그로 선택 · 클릭하면 선택 해제 · 선택 안에서만 그려집니다'},
  {id:'wand',name:'마술봉',key:'W',hint:'같은 색으로 이어진 영역 선택 · Shift: 선택 추가'},
  {id:'move',name:'이동',key:'V',hint:'선택이 있으면 선택한 픽셀만, 없으면 레이어 전체를 옮깁니다'},
  {id:'hand',name:'화면 이동',key:'H',hint:'Space를 누른 채 드래그해도 됩니다 · 휠: 확대/축소'},
];
const toolDef=id=>TOOLDEFS.find(t=>t.id===id);

function mkLayer(id,name){ return {id,name,visible:true,opacity:1,locked:false,alphaLock:false,outline:0}; }
function makeDoc(w,hgt,pal,name){ return {name:name||L('새 작품'),w,h:hgt,palette:pal.slice(0,MAXPAL),layers:[mkLayer(1,L('레이어 1'))],frames:[{dur:120,cels:{1:new Uint8Array(w*hgt)}}],tags:[]}; }
function recalcIds(){ nextId=doc.layers.reduce((m,L)=>Math.max(m,L.id),0)+1; }
function updPal(){ palRGB=doc.palette.map(hex2rgb); }
const activeLayer=()=>doc.layers[ui.layer];
function cel(f=ui.frame,id){ const L=id==null?activeLayer():null; return doc.frames[f].cels[id==null?L.id:id]; }

function sampleDoc(){
  const d=makeDoc(16,16,PRESETS['PICO-8 (16색)'],L('물약 (예시)'));
  d.layers=[mkLayer(1,L('예시 · 병')),mkLayer(2,L('예시 · 거품'))];
  const bottle=['................','......kkkk......','.....kCCcck.....','......kkkk......','......kbbk......','......kbbk......','.....kbbbbk.....','....kbrrrrbk....','...kbrrrrrrbk...','...kbrrrrrrbk...','...kbrrrrrdbk...','...kbrrrrrdbk...','....kbrrrdbk....','.....kbbbbk.....','......kkkk......','................'];
  const map={k:1,C:16,c:5,b:7,r:9,d:3,w:8};
  const a=new Uint8Array(256); bottle.forEach((row,y)=>{ for(let x=0;x<16;x++){ const v=map[row[x]]; if(v) a[y*16+x]=v; } });
  const bub=(pts)=>{ const u=new Uint8Array(256); for(const [x,y] of pts) u[y*16+x]=8; return u; };
  // the bottle cel is linked across both frames; only the bubbles change
  d.frames=[{dur:320,cels:{1:a,2:bub([[6,8],[6,9],[8,7],[9,10]])}},{dur:320,cels:{1:a,2:bub([[6,9],[6,10],[7,5],[8,8]])}}];
  d.tags=[{name:L('보글보글'),from:0,to:1,dir:'forward',color:'#3549d6'}];
  return d;
}

/* ================= compositing ================= */
function composite(fi,only){
  const {w,h:H}=doc, n=w*H, out=new Uint8ClampedArray(n*4);
  const fr=doc.frames[fi]; if(!fr) return out;
  for(const L of doc.layers){
    if(only!=null){ if(L.id!==only) continue; } else if(!L.visible) continue;
    const c=fr.cels[L.id]; if(!c) continue;
    const a=only!=null?1:L.opacity; const oc=L.outline?palRGB[L.outline-1]:null;
    for(let i=0;i<n;i++){
      const v=c[i]; let rgb;
      if(v) rgb=palRGB[v-1];
      else if(oc){ const x=i%w, y=(i/w)|0; if((x>0&&c[i-1])||(x<w-1&&c[i+1])||(y>0&&c[i-w])||(y<H-1&&c[i+w])) rgb=oc; else continue; }
      else continue;
      if(!rgb) continue;
      const j=i*4, da=out[j+3]/255;
      if(a>=1||da===0){ out[j]=rgb[0]; out[j+1]=rgb[1]; out[j+2]=rgb[2]; out[j+3]=a*255; continue; }
      const oa=a+da*(1-a);
      out[j]=(rgb[0]*a+out[j]*da*(1-a))/oa; out[j+1]=(rgb[1]*a+out[j+1]*da*(1-a))/oa; out[j+2]=(rgb[2]*a+out[j+2]*da*(1-a))/oa; out[j+3]=oa*255;
    }
  }
  return out;
}
const fcache=new Map();
function invalidate(){ fcache.clear(); }
function frameCanvas(fi){
  let e=fcache.get(fi);
  if(!e){ const cv=document.createElement('canvas'); cv.width=doc.w; cv.height=doc.h; cv.getContext('2d').putImageData(new ImageData(composite(fi),doc.w,doc.h),0,0); e={cv}; fcache.set(fi,e); }
  return e.cv;
}
function tinted(fi,color){
  frameCanvas(fi); const e=fcache.get(fi); const k='t'+color;
  if(!e[k]){ const cv=document.createElement('canvas'); cv.width=doc.w; cv.height=doc.h; const c=cv.getContext('2d'); c.drawImage(e.cv,0,0); c.globalCompositeOperation='source-atop'; c.globalAlpha=.6; c.fillStyle=color; c.fillRect(0,0,doc.w,doc.h); e[k]=cv; }
  return e[k];
}

/* ================= view ================= */
const view=$('#view'), vctx=view.getContext('2d'), stage=$('#stage');
let vw=1,vh=1,dpr=1,drawQueued=false,tok={},checkPat=null;
function readTokens(){ const cs=getComputedStyle(document.documentElement); for(const k of ['check-a','check-b','grid','grid-major','ants','frame-edge','stage','guide','guide-2','panel']) tok[k]=cs.getPropertyValue('--'+k).trim(); checkPat=null; }
function getCheck(){
  if(!checkPat){ const c=document.createElement('canvas'); c.width=c.height=16; const x=c.getContext('2d'); x.fillStyle=tok['check-a']; x.fillRect(0,0,16,16); x.fillStyle=tok['check-b']; x.fillRect(0,0,8,8); x.fillRect(8,8,8,8); checkPat=vctx.createPattern(c,'repeat'); }
  return checkPat;
}
function resizeView(){
  // vw/vh are layout pixels; dpr is device pixels per layout pixel, including any CSS scaling of the page (an embedding viewer may scale it)
  const r=stage.getBoundingClientRect(); vw=Math.max(1,stage.clientWidth||r.width); vh=Math.max(1,stage.clientHeight||r.height);
  dpr=(window.devicePixelRatio||1)*(r.width>0&&stage.clientWidth?r.width/stage.clientWidth:1);
  view.width=Math.round(vw*dpr); view.height=Math.round(vh*dpr);
  if(doc && (!ui.fitted || !ui.userView)){ fitView(); ui.fitted=true; }
  requestDraw();
}
function requestDraw(){ if(!drawQueued){ drawQueued=true; requestAnimationFrame(draw); } }
function drawRef(ctx,ox,oy,W,H){
  if(!ref.img||!ref.visible) return;
  const iw=ref.img.naturalWidth, ih=ref.img.naturalHeight; const s=Math.min(W/iw,H/ih); const dw=iw*s, dh=ih*s;
  ctx.save(); ctx.globalAlpha=ref.opacity; ctx.imageSmoothingEnabled=true; ctx.drawImage(ref.img,ox+(W-dw)/2,oy+(H-dh)/2,dw,dh); ctx.restore();
}
let antsPhase=0;
function draw(){
  drawQueued=false; if(!doc) return;
  const ctx=vctx; ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,vw,vh); ctx.imageSmoothingEnabled=false;
  const z=ui.zoom, W=doc.w*z, H=doc.h*z, ox=ui.panX, oy=ui.panY;
  const fi=ui.playing?ui.playFrame:ui.frame;
  const offs=ui.tile?[-1,0,1]:[0];
  ctx.fillStyle=getCheck();
  for(const ty of offs) for(const tx of offs){ ctx.save(); ctx.translate(ox+tx*W,oy+ty*H); ctx.fillRect(0,0,W,H); ctx.restore(); }
  if(!ref.above) drawRef(ctx,ox,oy,W,H);
  if(ui.onion && !ui.playing && doc.frames.length>1){
    ctx.globalAlpha=.4;
    if(fi>0) ctx.drawImage(tinted(fi-1,'#ff3b5c'),ox,oy,W,H);
    if(fi<doc.frames.length-1) ctx.drawImage(tinted(fi+1,'#2f8bff'),ox,oy,W,H);
    ctx.globalAlpha=1;
  }
  const fc=frameCanvas(fi);
  for(const ty of offs) for(const tx of offs){ ctx.globalAlpha=(tx||ty)?.5:1; ctx.drawImage(fc,ox+tx*W,oy+ty*H,W,H); }
  ctx.globalAlpha=1;
  if(ref.above) drawRef(ctx,ox,oy,W,H);
  const lw=1/dpr;
  if(ui.grid && z>=6){
    ctx.lineWidth=lw;
    ctx.beginPath(); for(let x=1;x<doc.w;x++){ if(x%8){ ctx.moveTo(ox+x*z+lw/2,oy); ctx.lineTo(ox+x*z+lw/2,oy+H);} } for(let y=1;y<doc.h;y++){ if(y%8){ ctx.moveTo(ox,oy+y*z+lw/2); ctx.lineTo(ox+W,oy+y*z+lw/2);} } ctx.strokeStyle=tok.grid; ctx.stroke();
    ctx.beginPath(); for(let x=8;x<doc.w;x+=8){ ctx.moveTo(ox+x*z+lw/2,oy); ctx.lineTo(ox+x*z+lw/2,oy+H);} for(let y=8;y<doc.h;y+=8){ ctx.moveTo(ox,oy+y*z+lw/2); ctx.lineTo(ox+W,oy+y*z+lw/2);} ctx.strokeStyle=tok['grid-major']; ctx.stroke();
  }
  ctx.lineWidth=1; ctx.strokeStyle=tok['frame-edge']; ctx.strokeRect(ox-.5,oy-.5,W+1,H+1);
  if(!ui.playing) drawCompGuides(ctx,ox,oy,W,H);
  if(ui.sel && ui.selEdges.length){
    ctx.beginPath(); for(const [x1,y1,x2,y2] of ui.selEdges){ ctx.moveTo(ox+x1*z+.5,oy+y1*z+.5); ctx.lineTo(ox+x2*z+.5,oy+y2*z+.5); }
    ctx.setLineDash([4,4]); ctx.lineDashOffset=-antsPhase; ctx.strokeStyle='#000'; ctx.stroke(); ctx.lineDashOffset=-antsPhase+4; ctx.strokeStyle='#fff'; ctx.stroke(); ctx.setLineDash([]);
  }
  const hv=ui.hover;
  if(hv && !ui.playing && ['pencil','eraser','line','rect','ellipse'].includes(ui.tool)){
    const s=ui.brush, o=brushOrigin(s);
    ctx.strokeStyle=tok.ants; ctx.lineWidth=1;
    for(const [mx,my] of mirrors(hv.x-o,hv.y-o,s)) ctx.strokeRect(ox+mx*z+.5,oy+my*z+.5,s*z-1,s*z-1);
  }
  // drawing tools hide the system cursor and draw a crosshair from the same coordinates the brush uses, so the two always line up
  const cu=ui.cursor;
  if(cu && !ui.playing && cursorFor(ui.tool)==='none' && !spaceDown && !(drag&&drag.pan)){
    const cx=Math.round(cu.x)+.5, cy=Math.round(cu.y)+.5, g=3, a=8; ctx.save(); ctx.setLineDash([]);
    const arms=()=>{ ctx.beginPath(); ctx.moveTo(cx-a,cy); ctx.lineTo(cx-g,cy); ctx.moveTo(cx+g,cy); ctx.lineTo(cx+a,cy); ctx.moveTo(cx,cy-a); ctx.lineTo(cx,cy-g); ctx.moveTo(cx,cy+g); ctx.lineTo(cx,cy+a); ctx.stroke(); ctx.fillRect(cx-.5,cy-.5,1,1); };
    ctx.lineWidth=3; ctx.strokeStyle=tok.panel; ctx.fillStyle=tok.panel; ctx.globalAlpha=.9; arms(); ctx.globalAlpha=1;
    ctx.lineWidth=1; ctx.strokeStyle=tok.ants; ctx.fillStyle=tok.ants; arms(); ctx.restore();
  }
}
setInterval(()=>{ if(ui.sel){ antsPhase=(antsPhase+1)%8; requestDraw(); } },140);
function fitView(){
  ui.userView=false;
  const z=clamp(Math.floor(Math.min((vw-40)/doc.w,(vh-40)/doc.h)),1,64);
  ui.zoom=z; ui.panX=Math.round((vw-doc.w*z)/2); ui.panY=Math.round((vh-doc.h*z)/2); updZoom(); requestDraw();
}
const ZSTEPS=[1,2,3,4,5,6,8,10,12,16,20,24,32,40,48,64];
function zoomAt(nz,mx,my){ ui.userView=true; const oz=ui.zoom; nz=clamp(Math.round(nz),1,64); if(nz===oz) return; ui.panX=Math.round(mx-(mx-ui.panX)*nz/oz); ui.panY=Math.round(my-(my-ui.panY)*nz/oz); ui.zoom=nz; updZoom(); requestDraw(); }
function zoomStep(dir,mx=vw/2,my=vh/2){ const z=ui.zoom; let nz; if(dir>0) nz=ZSTEPS.find(s=>s>z)||64; else nz=[...ZSTEPS].reverse().find(s=>s<z)||1; zoomAt(nz,mx,my); }
function updZoom(){ $('#zoomLbl').textContent=(ui.zoom*100)+'%'; }

/* ================= history ================= */
const hist=[], redoS=[]; let pend=null;
function snap(){ return {doc:structuredClone(doc),layer:ui.layer,frame:ui.frame}; }
function eqArr(a,b){ if(a.length!==b.length) return false; for(let i=0;i<a.length;i++) if(a[i]!==b[i]) return false; return true; }
function beginEdit(){ pend={kind:'cel',f:ui.frame,id:activeLayer().id,before:cel().slice()}; }
function endEdit(){
  if(!pend) return; const c=doc.frames[pend.f]?.cels[pend.id];
  if(c && !eqArr(c,pend.before)){ pend.after=c.slice(); pushHist(pend); }
  pend=null; changed();
}
function pushHist(e){ hist.push(e); if(hist.length>150) hist.shift(); redoS.length=0; updHistBtns(); scheduleSave(); recordTL(); }
function docChange(fn){ const b=snap(); const r=fn(); if(r===false) return false; pushHist({kind:'doc',before:b,after:snap()}); updPal(); recalcIds(); refreshAll(); return true; }
function applyHist(e,k){
  if(e.kind==='cel'){ const c=doc.frames[e.f]?.cels[e.id]; if(c) c.set(e[k]); ui.frame=Math.min(e.f,doc.frames.length-1); const li=doc.layers.findIndex(L=>L.id===e.id); if(li>=0) ui.layer=li; }
  else { const s=e[k]; doc=structuredClone(s.doc); ui.layer=s.layer; ui.frame=s.frame; updPal(); recalcIds(); }
  ui.layer=clamp(ui.layer,0,doc.layers.length-1); ui.frame=clamp(ui.frame,0,doc.frames.length-1);
  if(ui.sel && ui.sel.length!==doc.w*doc.h) setSel(null);
}
function undo(){ if(pend||!hist.length) return; stopPlay(); const e=hist.pop(); const sz=doc.w+'x'+doc.h; applyHist(e,'before'); redoS.push(e); refreshAll(); scheduleSave(); if(sz!==doc.w+'x'+doc.h) fitView(); }
function redo(){ if(pend||!redoS.length) return; stopPlay(); const e=redoS.pop(); const sz=doc.w+'x'+doc.h; applyHist(e,'after'); hist.push(e); refreshAll(); scheduleSave(); if(sz!==doc.w+'x'+doc.h) fitView(); }
function updHistBtns(){ $('#bUndo').disabled=!hist.length; $('#bRedo').disabled=!redoS.length; }
let thumbT=null;
function changed(){ invalidate(); requestDraw(); clearTimeout(thumbT); thumbT=setTimeout(updateThumbs,120); }

/* ================= painting primitives ================= */
function mirrors(x,y,s=1){ const {w,h:H}=doc; const r=[[x,y]]; if(ui.mirrorX) r.push([w-x-s,y]); if(ui.mirrorY) r.push([x,H-y-s]); if(ui.mirrorX&&ui.mirrorY) r.push([w-x-s,H-y-s]); return r; }
function idxOf(x,y){ const {w,h:H}=doc; if(ui.tile){ x=mod(x,w); y=mod(y,H); } if(x<0||y<0||x>=w||y>=H) return -1; return y*w+x; }
function setPx(c,x,y,v,di){
  const i=idxOf(x,y); if(i<0) return; if(ui.sel&&!ui.sel[i]) return;
  if(compLocked(i%doc.w,(i/doc.w)|0)) return;   // component mode: corners and edges are locked
  const L=activeLayer(); if(L.alphaLock&&(c[i]===0||v===0)) return;
  if(di&&((mod(x,doc.w)+mod(y,doc.h))&1)) return;
  c[i]=v;
}
// Brushes sit centred on the cursor. An odd size has a middle pixel: the pixel under the cursor.
// An even size has none, so pencil, eraser and line centre it on the grid corner nearest the cursor (toolPos rounds there)
// and the block spans size/2 pixels on each side; other tools keep the pixel under the cursor.
const CENTRED=['pencil','eraser','line'];
function brushOrigin(size,tool=ui.tool){ return size%2===0&&CENTRED.includes(tool)?size/2:Math.floor((size-1)/2); }
function plot(c,x,y,v,di,size=ui.brush){
  const o=brushOrigin(size);
  for(const [mx,my] of mirrors(x-o,y-o,size)) for(let dy=0;dy<size;dy++) for(let dx=0;dx<size;dx++) setPx(c,mx+dx,my+dy,v,di);
}
function line(a,b){
  const pts=[]; let x0=a.x,y0=a.y; const x1=b.x,y1=b.y; const dx=Math.abs(x1-x0), dy=-Math.abs(y1-y0), sx=x0<x1?1:-1, sy=y0<y1?1:-1; let err=dx+dy;
  for(;;){ pts.push({x:x0,y:y0}); if(x0===x1&&y0===y1) break; const e2=2*err; if(e2>=dy){err+=dy;x0+=sx;} if(e2<=dx){err+=dx;y0+=sy;} }
  return pts;
}
function ellipsePts(x0,y0,x1,y1,fill){
  const cx=(x0+x1+1)/2, cy=(y0+y1+1)/2, rx=(x1-x0+1)/2, ry=(y1-y0+1)/2; const out=new Map(); const add=(x,y)=>out.set(x+','+y,[x,y]);
  const span=(t,c,r)=>{ const d=r*Math.sqrt(Math.max(0,1-t*t)); let l=Math.ceil(c-d-0.5), rr=Math.floor(c+d-0.5); if(rr<l){ l=Math.floor(c-0.5); rr=Math.ceil(c-0.5); } return [l,rr]; };
  for(let y=y0;y<=y1;y++){ const [l,r]=span((y+0.5-cy)/ry,cx,rx); if(fill){ for(let x=l;x<=r;x++) add(x,y); } else { add(l,y); add(r,y); } }
  if(!fill) for(let x=x0;x<=x1;x++){ const [t,b]=span((x+0.5-cx)/rx,cy,ry); add(x,t); add(x,b); }
  return [...out.values()];
}

/* ================= selection ================= */
function setSel(m){
  if(m && !m.some(v=>v)) m=null;
  ui.sel=m; ui.selEdges=[];
  if(m){ const {w,h:H}=doc; const E=ui.selEdges;
    for(let y=0;y<H;y++) for(let x=0;x<w;x++){ if(!m[y*w+x]) continue;
      if(y===0||!m[(y-1)*w+x]) E.push([x,y,x+1,y]); if(y===H-1||!m[(y+1)*w+x]) E.push([x,y+1,x+1,y+1]);
      if(x===0||!m[y*w+x-1]) E.push([x,y,x,y+1]); if(x===w-1||!m[y*w+x+1]) E.push([x+1,y,x+1,y+1]); }
  }
  renderToolOpts(); renderEditHint(); requestDraw();
}
function selBBox(){ const m=ui.sel; if(!m) return null; const {w,h:H}=doc; let x0=w,y0=H,x1=-1,y1=-1; for(let i=0;i<m.length;i++) if(m[i]){ const x=i%w,y=(i/w)|0; if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; } return x1<0?null:{x:x0,y:y0,w:x1-x0+1,h:y1-y0+1}; }
function rectMask(a,b){ const {w,h:H}=doc; const x0=clamp(Math.min(a.x,b.x),0,w-1),x1=clamp(Math.max(a.x,b.x),0,w-1),y0=clamp(Math.min(a.y,b.y),0,H-1),y1=clamp(Math.max(a.y,b.y),0,H-1); const m=new Uint8Array(w*H); for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++) m[y*w+x]=1; return m; }
function selectAll(){ setSel(new Uint8Array(doc.w*doc.h).fill(1)); }
function clearSelPixels(){ if(!ui.sel||!canEdit()) return; beginEdit(); const c=cel(); for(let i=0;i<c.length;i++) if(ui.sel[i]) c[i]=0; endEdit(); }
function flip(axis){
  if(!canEdit()) return; const {w,h:H}=doc; const b=selBBox()||{x:0,y:0,w,h:H}; beginEdit(); const c=cel(); const src=c.slice(); const m=ui.sel; const nm=m?new Uint8Array(w*H):null;
  for(let y=b.y;y<b.y+b.h;y++) for(let x=b.x;x<b.x+b.w;x++){ const i=y*w+x; if(m&&!m[i]) continue; c[i]=0; }
  for(let y=b.y;y<b.y+b.h;y++) for(let x=b.x;x<b.x+b.w;x++){ const i=y*w+x; if(m&&!m[i]) continue; const tx=axis==='x'?b.x+b.x+b.w-1-x:x, ty=axis==='y'?b.y+b.y+b.h-1-y:y; const t=ty*w+tx; if(nm) nm[t]=1; if(src[i]||!m) c[t]=src[i]; }
  endEdit(); if(nm) setSel(nm);
}
let clip=null;
function copySel(){ const b=selBBox(); if(!b){ toast('복사할 영역을 먼저 선택하세요'); return; } const c=cel(); const data=new Uint8Array(b.w*b.h); for(let y=0;y<b.h;y++) for(let x=0;x<b.w;x++){ const i=(b.y+y)*doc.w+b.x+x; if(ui.sel[i]) data[y*b.w+x]=c[i]; } clip={...b,data}; toast('복사했습니다'); }
function pasteClip(){
  if(!clip){ toast('복사한 내용이 없습니다'); return; }
  const cb=clip; docChange(()=>{ const id=nextId++; const L=mkLayer(id,'붙여넣기'); const at=ui.layer+1; doc.layers.splice(at,0,L); for(const f of doc.frames) f.cels[id]=new Uint8Array(doc.w*doc.h); const c=doc.frames[ui.frame].cels[id];
    for(let y=0;y<cb.h;y++) for(let x=0;x<cb.w;x++){ const tx=cb.x+x, ty=cb.y+y; if(tx<doc.w&&ty<doc.h&&cb.data[y*cb.w+x]) c[ty*doc.w+tx]=cb.data[y*cb.w+x]; } ui.layer=at; });
  const m=new Uint8Array(doc.w*doc.h); for(let y=0;y<cb.h;y++) for(let x=0;x<cb.w;x++){ const tx=cb.x+x,ty=cb.y+y; if(tx<doc.w&&ty<doc.h) m[ty*doc.w+tx]=1; } setSel(m); setTool('move'); toast('새 레이어에 붙여넣었습니다. 이동 도구로 옮기세요.');
}

/* ================= tools ================= */
function canEdit(){
  const L=activeLayer(); if(!L) return false;
  if(L.locked){ toast('잠긴 레이어입니다. 레이어 목록에서 자물쇠를 풀어 주세요.'); return false; }
  if(!L.visible){ toast('숨긴 레이어에는 그릴 수 없습니다. 눈 아이콘으로 다시 보이게 하세요.'); return false; }
  return true;
}
const colorOf=button=>button===2?ui.secondary:ui.primary;
let drag=null;
function strokeAdd(q){
  const pts=drag.pts, c=cel(); const last=pts[pts.length-1];
  if(last&&last.x===q.x&&last.y===q.y) return;
  pts.push(q); plot(c,q.x,q.y,drag.v,ui.dither&&!drag.erase);
  if(ui.pixelPerfect&&ui.brush===1&&pts.length>=3){
    const a=pts[pts.length-3], b=pts[pts.length-2];
    if(Math.abs(a.x-q.x)===1&&Math.abs(a.y-q.y)===1&&((b.x===a.x&&b.y===q.y)||(b.y===a.y&&b.x===q.x))){
      for(const [mx,my] of mirrors(b.x,b.y,1)){ const i=idxOf(mx,my); if(i>=0) c[i]=pend.before[i]; }
      for(const p of [a,q]) plot(c,p.x,p.y,drag.v,ui.dither&&!drag.erase);
      pts.splice(pts.length-2,1);
    }
  }
}
function strokeDown(p,e,erase){
  if(!canEdit()){ drag.dead=true; return; }
  beginEdit(); drag.erase=erase; drag.v=erase?0:colorOf(e.button); const c=cel();
  if(e.shiftKey&&ui.lastPt){ for(const q of line(ui.lastPt,p)) plot(c,q.x,q.y,drag.v,ui.dither&&!erase); drag.pts=[p]; }
  else strokeAdd(p);
  changed();
}
function strokeTo(p){ if(drag.dead) return; const pts=line(drag.last,p); pts.shift(); for(const q of pts) strokeAdd(q); changed(); }
function strokeUp(){ if(drag.dead) return; ui.lastPt=drag.last; endEdit(); }
function drawShape(kind,p,shift){
  const c=cel(); c.set(pend.before); const a=drag.start; const b={x:p.x,y:p.y}; const dx=b.x-a.x, dy=b.y-a.y;
  if(shift){
    if(kind==='line'){ const ax=Math.abs(dx), ay=Math.abs(dy); if(ax>ay*2) b.y=a.y; else if(ay>ax*2) b.x=a.x; else { const d=Math.max(ax,ay); b.x=a.x+(dx<0?-d:d); b.y=a.y+(dy<0?-d:d); } }
    else { const d=Math.max(Math.abs(dx),Math.abs(dy)); b.x=a.x+(dx<0?-d:d); b.y=a.y+(dy<0?-d:d); }
  }
  const v=drag.v, di=ui.dither;
  if(kind==='line'){ for(const q of line(a,b)) plot(c,q.x,q.y,v,di); }
  else { const x0=Math.min(a.x,b.x),x1=Math.max(a.x,b.x),y0=Math.min(a.y,b.y),y1=Math.max(a.y,b.y);
    if(kind==='rect'){ if(ui.shapeFill){ for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++) plot(c,x,y,v,di,1); } else { for(let x=x0;x<=x1;x++){ plot(c,x,y0,v,di); plot(c,x,y1,v,di); } for(let y=y0;y<=y1;y++){ plot(c,x0,y,v,di); plot(c,x1,y,v,di); } } }
    else for(const [x,y] of ellipsePts(x0,y0,x1,y1,ui.shapeFill)) plot(c,x,y,v,di,ui.shapeFill?1:ui.brush);
  }
  changed();
}
function shapeTool(kind){ return {
  down(p,e){ if(!canEdit()){ drag.dead=true; return; } beginEdit(); drag.v=colorOf(e.button); drawShape(kind,p,e.shiftKey); },
  move(p,e){ if(!drag.dead) drawShape(kind,p,e.shiftKey); },
  up(){ if(!drag.dead) endEdit(); } }; }
function flood(x,y,v,global){
  const {w,h:H}=doc; const i0=idxOf(x,y); if(i0<0) return; const c=cel(); const t=c[i0]; const sel=ui.sel; if(sel&&!sel[i0]) return;
  if(t===v&&!ui.dither) return;
  const targets=[];
  if(global){ for(let i=0;i<w*H;i++) if(c[i]===t&&(!sel||sel[i])) targets.push(i); }
  else { const seen=new Uint8Array(w*H); const st=[i0]; seen[i0]=1;
    while(st.length){ const i=st.pop(); targets.push(i); const px_=i%w, py=(i/w)|0;
      const nb=[]; if(px_>0) nb.push(i-1); if(px_<w-1) nb.push(i+1); if(py>0) nb.push(i-w); if(py<H-1) nb.push(i+w);
      for(const j of nb) if(!seen[j]&&c[j]===t&&(!sel||sel[j])){ seen[j]=1; st.push(j); } } }
  for(const i of targets) setPx(c,i%w,(i/w)|0,v,ui.dither);
  changed();
}
function pick(p,button){
  const {w,h:H}=doc; if(p.x<0||p.y<0||p.x>=w||p.y>=H) return; const i=p.y*w+p.x; let v=0;
  for(let k=doc.layers.length-1;k>=0;k--){ const L=doc.layers[k]; if(!L.visible) continue; const c=doc.frames[ui.frame].cels[L.id]; if(c&&c[i]){ v=c[i]; break; } }
  if(button===2) ui.secondary=v; else ui.primary=v; renderColors(); renderPalette();
}
function wand(p,add){
  const {w,h:H}=doc; if(p.x<0||p.y<0||p.x>=w||p.y>=H) return; const c=cel(); const i0=p.y*w+p.x, t=c[i0];
  const m=add&&ui.sel?ui.sel.slice():new Uint8Array(w*H); const seen=new Uint8Array(w*H); const st=[i0]; seen[i0]=1;
  while(st.length){ const i=st.pop(); m[i]=1; const x=i%w,y=(i/w)|0; for(const j of [x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<H-1?i+w:-1]) if(j>=0&&!seen[j]&&c[j]===t){ seen[j]=1; st.push(j); } }
  setSel(m);
}
function applyMove(dx,dy){
  const c=cel(), src=drag.src, m=drag.mask, {w,h:H}=doc;
  const tgt=(x,y)=>{ let tx=x+dx, ty=y+dy; if(ui.tile){ tx=mod(tx,w); ty=mod(ty,H); } else if(tx<0||ty<0||tx>=w||ty>=H) return -1; return ty*w+tx; };
  if(m){ c.set(src); const nm=new Uint8Array(w*H); for(let i=0;i<w*H;i++) if(m[i]) c[i]=0;
    for(let i=0;i<w*H;i++) if(m[i]){ const t=tgt(i%w,(i/w)|0); if(t<0) continue; nm[t]=1; if(src[i]) c[t]=src[i]; }
    ui.sel=nm; setSelEdgesOnly(); }
  else { c.fill(0); for(let i=0;i<w*H;i++) if(src[i]){ const t=tgt(i%w,(i/w)|0); if(t>=0) c[t]=src[i]; } }
  changed();
}
function setSelEdgesOnly(){ const keep=ui.sel; ui.sel=null; setSel(keep); }
const TOOLS={
  pencil:{down(p,e){strokeDown(p,e,false);},move(p){strokeTo(p);},up(){strokeUp();}},
  eraser:{down(p,e){strokeDown(p,e,true);},move(p){strokeTo(p);},up(){strokeUp();}},
  fill:{down(p,e){ if(!canEdit()) return; beginEdit(); flood(p.x,p.y,colorOf(e.button),e.shiftKey); endEdit(); }},
  picker:{down(p,e){pick(p,e.button);},move(p){pick(p,drag.button);}},
  line:shapeTool('line'), rect:shapeTool('rect'), ellipse:shapeTool('ellipse'),
  select:{down(){drag.moved=false;},move(p){drag.moved=true; setSel(rectMask(drag.start,p));},up(){ if(!drag.moved) setSel(null); }},
  wand:{down(p,e){wand(p,e.shiftKey);}},
  move:{down(){ if(!canEdit()){drag.dead=true;return;} beginEdit(); drag.src=cel().slice(); drag.mask=ui.sel?ui.sel.slice():null; },move(p){ if(!drag.dead) applyMove(p.x-drag.start.x,p.y-drag.start.y); },up(){ if(!drag.dead) endEdit(); }},
  hand:{},
};
function setTool(id){ ui.tool=id; $$('#toolBtns .tool').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tool===id))); renderToolOpts(); updStatus(); view.style.cursor=cursorFor(id); requestDraw(); }
// system cursor for a tool: drawing tools use the crosshair drawn on the canvas (see draw())
const DRAWN_CURSOR=['pencil','eraser','fill','picker','line','rect','ellipse'];
function cursorFor(tool){ return tool==='hand'?'grab':DRAWN_CURSOR.includes(tool)?'none':'crosshair'; }

/* ================= pointer input ================= */
const pointers=new Map(); let gesture=null, spaceDown=false, wheelAcc=0;
function viewPt(e){ const r=view.getBoundingClientRect(), sx=view.clientWidth&&r.width?r.width/view.clientWidth:1, sy=view.clientHeight&&r.height?r.height/view.clientHeight:1; return {x:(e.clientX-r.left)/sx, y:(e.clientY-r.top)/sy}; }
function docPos(e){ const q=viewPt(e); return {x:Math.floor((q.x-ui.panX)/ui.zoom), y:Math.floor((q.y-ui.panY)/ui.zoom)}; }
// the point a tool works on: the pixel under the cursor, or for an even-sized centred brush the nearest grid corner
function toolPos(e,tool=ui.tool){ if(ui.brush%2||!CENTRED.includes(tool)) return docPos(e); const q=viewPt(e); return {x:Math.round((q.x-ui.panX)/ui.zoom), y:Math.round((q.y-ui.panY)/ui.zoom)}; }
view.addEventListener('pointerdown',e=>{
  view.setPointerCapture(e.pointerId); pointers.set(e.pointerId,viewPt(e)); ui.cursor=e.pointerType==='touch'?null:viewPt(e);
  if(pointers.size===2){ if(drag&&pend){ const c=doc.frames[pend.f].cels[pend.id]; c.set(pend.before); pend=null; changed(); } drag=null; startGesture(); return; }
  if(pointers.size>2) return;
  stopPlay();
  if(e.button===1||spaceDown||ui.tool==='hand'){ e.preventDefault(); const q=viewPt(e); drag={pan:true,sx:q.x,sy:q.y,px:ui.panX,py:ui.panY}; view.style.cursor='grabbing'; return; }
  if(e.button!==0&&e.button!==2) return;
  if(ui.mode==='comp'&&guideDown(e)) return;   // 9-slice guides come before the tool
  const p=toolPos(e); drag={tool:ui.tool,button:e.button,start:p,last:p,pts:[]};
  if(ui.mode==='comp') compLockHint(p);
  TOOLS[ui.tool].down?.(p,e);
});
view.addEventListener('pointermove',e=>{
  if(pointers.has(e.pointerId)) pointers.set(e.pointerId,viewPt(e));
  const prevC=ui.cursor; ui.cursor=e.pointerType==='touch'?null:viewPt(e); if(!drag&&ui.cursor&&(!prevC||prevC.x!==ui.cursor.x||prevC.y!==ui.cursor.y)&&cursorFor(ui.tool)==='none') requestDraw();
  if(gesture){ moveGesture(); return; }
  if(guideMove(e)) return;
  const p=toolPos(e,drag&&drag.tool?drag.tool:ui.tool); const prevH=ui.hover; ui.hover=p; updStatus(docPos(e));
  if(!drag){ if(!prevH||prevH.x!==p.x||prevH.y!==p.y) requestDraw(); return; }
  if(drag.pan){ const q=viewPt(e); ui.userView=true; ui.panX=Math.round(drag.px+q.x-drag.sx); ui.panY=Math.round(drag.py+q.y-drag.sy); requestDraw(); return; }
  if(p.x===drag.last.x&&p.y===drag.last.y) return;
  TOOLS[drag.tool].move?.(p,e); drag.last=p; requestDraw();
});
function endPointer(e){
  pointers.delete(e.pointerId);
  if(gesture){ if(pointers.size<2) gesture=null; return; }
  if(guideUp()) return;
  if(!drag) return;
  if(drag.pan){ drag=null; view.style.cursor=spaceDown?'grab':cursorFor(ui.tool); return; }
  TOOLS[drag.tool].up?.(toolPos(e,drag.tool),e); drag=null;
}
view.addEventListener('pointerup',endPointer);
view.addEventListener('pointercancel',endPointer);
view.addEventListener('pointerleave',()=>{ ui.cursor=null; if(!drag){ ui.hover=null; updStatus(); } requestDraw(); });
view.addEventListener('contextmenu',e=>e.preventDefault());
view.addEventListener('wheel',e=>{
  e.preventDefault(); const q=viewPt(e);
  if(e.shiftKey&&!e.ctrlKey){ ui.panX-=Math.round(e.deltaY||e.deltaX); requestDraw(); return; }
  wheelAcc+=e.deltaY*(e.deltaMode===1?30:1);
  if(Math.abs(wheelAcc)>=(e.ctrlKey?12:50)){ zoomStep(wheelAcc<0?1:-1,q.x,q.y); wheelAcc=0; }
},{passive:false});
// pointers hold canvas layout coordinates (viewPt)
function startGesture(){ const [a,b]=[...pointers.values()]; gesture={d:Math.hypot(a.x-b.x,a.y-b.y)||1,mx:(a.x+b.x)/2,my:(a.y+b.y)/2,z:ui.zoom,px:ui.panX,py:ui.panY}; }
function moveGesture(){
  const [a,b]=[...pointers.values()]; if(!b) return; const g=gesture;
  const d=Math.hypot(a.x-b.x,a.y-b.y), mx=(a.x+b.x)/2, my=(a.y+b.y)/2;
  const nz=clamp(Math.round(g.z*d/g.d),1,64); const docx=(g.mx-g.px)/g.z, docy=(g.my-g.py)/g.z;
  ui.userView=true; ui.zoom=nz; ui.panX=Math.round(mx-docx*nz); ui.panY=Math.round(my-docy*nz); updZoom(); requestDraw();
}

/* ================= layers ================= */
function addLayer(){ docChange(()=>{ const id=nextId++; const at=ui.layer+1; doc.layers.splice(at,0,mkLayer(id,L('레이어 '+id))); for(const f of doc.frames) f.cels[id]=new Uint8Array(doc.w*doc.h); ui.layer=at; }); }
function dupLayer(){ docChange(()=>{ const s=activeLayer(); const id=nextId++; const L={...s,id,name:s.name+' 복사'}; const at=ui.layer+1; doc.layers.splice(at,0,L); const copies=new Map(); for(const f of doc.frames){ const src=f.cels[s.id]; if(!copies.has(src)) copies.set(src,src.slice()); f.cels[id]=copies.get(src); } ui.layer=at; }); }
function delLayer(){ if(doc.layers.length<2){ toast('레이어가 하나뿐이라 삭제할 수 없습니다'); return; } docChange(()=>{ const L=activeLayer(); doc.layers.splice(ui.layer,1); for(const f of doc.frames) delete f.cels[L.id]; ui.layer=clamp(ui.layer-1,0,doc.layers.length-1); }); }
function moveLayer(dir){ const j=ui.layer+dir; if(j<0||j>=doc.layers.length) return; docChange(()=>{ const a=doc.layers; [a[ui.layer],a[j]]=[a[j],a[ui.layer]]; ui.layer=j; }); }
function mergeDown(){
  if(ui.layer===0){ toast('맨 아래 레이어는 합칠 대상이 없습니다'); return; }
  docChange(()=>{ const U=doc.layers[ui.layer], D=doc.layers[ui.layer-1]; const {w,h:H}=doc;
    const seen=new Set(); for(const f of doc.frames){ if(seen.has(f.cels[D.id])) f.cels[D.id]=f.cels[D.id].slice(); seen.add(f.cels[D.id]); }
    for(const f of doc.frames){ const u=f.cels[U.id], d=f.cels[D.id];
      for(let i=0;i<w*H;i++){ if(u[i]) d[i]=u[i]; else if(U.outline){ const x=i%w,y=(i/w)|0; if((x>0&&u[i-1])||(x<w-1&&u[i+1])||(y>0&&u[i-w])||(y<H-1&&u[i+w])) d[i]=U.outline; } }
      delete f.cels[U.id]; }
    doc.layers.splice(ui.layer,1); ui.layer--; });
}

/* ================= frames & playback ================= */
let playT=null;
function shiftTags(at,delta){
  for(const t of doc.tags){ if(delta>0){ if(t.from>=at) t.from+=delta; if(t.to>=at) t.to+=delta; } else { if(t.from>at) t.from--; if(t.to>=at) t.to--; } }
  doc.tags=doc.tags.filter(t=>t.from>=0&&t.to>=t.from);
}
// mode: 'empty' | 'dup' (independent copy) | 'link' (shares every cel with the current frame)
function addFrame(mode){ docChange(()=>{ const cur=doc.frames[ui.frame]; const cels={}; for(const L of doc.layers) cels[L.id]=mode==='link'?cur.cels[L.id]:mode==='dup'?cur.cels[L.id].slice():new Uint8Array(doc.w*doc.h); shiftTags(ui.frame+1,1); for(const t of doc.tags) if(t.from<=ui.frame&&t.to===ui.frame) t.to++; const fr={dur:cur.dur,cels}; if(doc.comp) fr.name=mode==='empty'?`상태 ${doc.frames.length+1}`:`${stateName(ui.frame)} 복사`; doc.frames.splice(ui.frame+1,0,fr); ui.frame++; }); }
function isLinked(fi,id){ const c=doc.frames[fi].cels[id]; return doc.frames.some((g,i)=>i!==fi&&g.cels[id]===c); }
function linkedWithPrev(fi,id){ return fi>0&&doc.frames[fi].cels[id]===doc.frames[fi-1].cels[id]; }
function unlinkCel(){
  const id=activeLayer().id; if(!isLinked(ui.frame,id)){ toast('이 프레임의 셀은 다른 프레임과 링크되어 있지 않습니다'); return; }
  docChange(()=>{ const f=doc.frames[ui.frame]; f.cels[id]=f.cels[id].slice(); }); toast('링크를 풀었습니다. 이제 이 프레임만 따로 고칠 수 있습니다.');
}
// tag directions in Aseprite's order (the file stores the index)
const TAGDIRS=['forward','reverse','pingpong','pingpong_reverse'];
const TAGCOLORS=['#3549d6','#d6345a','#1f9d55','#d68a00','#8a3fd6','#0f9bb5'];
function saveTag(t,idx){ docChange(()=>{ if(idx==null) doc.tags.push(t); else doc.tags[idx]=t; doc.tags.sort((a,b)=>a.from-b.from||a.to-b.to); }); }
function deleteTag(idx){ docChange(()=>{ doc.tags.splice(idx,1); }); ui.playTag=-1; }
function delFrame(){ if(doc.frames.length<2){ toast('프레임이 하나뿐이라 삭제할 수 없습니다'); return; } docChange(()=>{ shiftTags(ui.frame,-1); doc.frames.splice(ui.frame,1); ui.frame=clamp(ui.frame-1,0,doc.frames.length-1); }); }
function moveFrame(dir){ const j=ui.frame+dir; if(j<0||j>=doc.frames.length) return; docChange(()=>{ const a=doc.frames; [a[ui.frame],a[j]]=[a[j],a[ui.frame]]; ui.frame=j; }); }
function gotoFrame(i){ stopPlay(); ui.frame=mod(i,doc.frames.length); renderTimeline(); renderLayers(); changed(); }
function playRange(){ const t=ui.playTag>=0&&doc.tags[ui.playTag]; const last=doc.frames.length-1; return t?{from:Math.min(t.from,last),to:Math.min(t.to,last),dir:t.dir}:{from:0,to:last,dir:'forward'}; }
// frame order for one loop of a range, as Aseprite plays it (ping-pong does not repeat the end frames)
function playSequence(r){ const f=[], fwd=()=>{ for(let i=r.from;i<=r.to;i++) f.push(i); }, back=()=>{ for(let i=r.to;i>=r.from;i--) f.push(i); };
  if(r.dir==='reverse') back(); else if(r.dir==='pingpong_reverse'){ back(); for(let i=r.from+1;i<r.to;i++) f.push(i); } else { fwd(); if(r.dir==='pingpong') for(let i=r.to-1;i>r.from;i--) f.push(i); } return f; }
function play(){
  const r=playRange(); if(r.to-r.from<1){ toast(ui.playTag>=0?'이 태그에는 프레임이 하나뿐입니다':'프레임을 2개 이상 만들면 재생할 수 있습니다'); return; }
  ui.playSeq=playSequence(r); const k=ui.playSeq.indexOf(ui.frame); ui.playPos=k>=0?k:0; ui.playFrame=ui.playSeq[ui.playPos]; ui.playing=true; renderPlayBtn(); tick();
}
function tick(){ if(!ui.playing) return; requestDraw(); markPlaying(); playT=setTimeout(()=>{ ui.playPos=(ui.playPos+1)%ui.playSeq.length; ui.playFrame=ui.playSeq[ui.playPos]; tick(); },doc.frames[ui.playFrame].dur); }
function stopPlay(){ if(!ui.playing) return; ui.playing=false; clearTimeout(playT); renderPlayBtn(); markPlaying(); requestDraw(); }
function markPlaying(){ $$('#frameList .fcell').forEach((c,i)=>c.classList.toggle('play',ui.playing&&i===ui.playFrame)); }
function renderPlayBtn(){ const b=$('#bPlay'); b.innerHTML=ui.playing?ICON.stop:ICON.play; b.setAttribute('aria-label',ui.playing?'정지':'재생'); }

/* ================= palette ops ================= */
function remapAll(map){ const seen=new Set(); for(const f of doc.frames) for(const id in f.cels){ const c=f.cels[id]; if(seen.has(c)) continue; seen.add(c); for(let i=0;i<c.length;i++) c[i]=map[c[i]]??0; } for(const L of doc.layers) L.outline=map[L.outline]??0; ui.primary=map[ui.primary]??0; ui.secondary=map[ui.secondary]??0; }
function applyPalette(np,mode){
  np=np.filter(isHex).map(normHex);
  if(!np.length){ toast('읽을 수 있는 색이 없습니다'); return; }
  docChange(()=>{
    if(mode==='append'){ let added=0; for(const c of np){ if(doc.palette.length>=MAXPAL) break; if(!doc.palette.includes(c)){ doc.palette.push(c); added++; } } toast(added?`${added}색을 추가했습니다`:'새로 추가할 색이 없습니다'); return; }
    np=np.slice(0,MAXPAL); const nrgb=np.map(hex2rgb); const map=[0];
    if(mode==='nearest'){ for(let v=1;v<=doc.palette.length;v++) map[v]=nearestIdx(palRGB[v-1],nrgb)+1; }
    else { for(let v=1;v<=doc.palette.length;v++) map[v]=v<=np.length?v:nearestIdx(palRGB[v-1],nrgb)+1; }
    remapAll(map); doc.palette=np;
  });
}
function deleteColor(v){
  if(!v){ toast('투명은 삭제할 수 없습니다'); return; }
  if(doc.palette.length<2){ toast('색이 하나뿐이라 삭제할 수 없습니다'); return; }
  docChange(()=>{ const rest=palRGB.filter((_,i)=>i!==v-1); const near=nearestIdx(palRGB[v-1],rest)+1; const map=[0]; for(let k=1;k<=doc.palette.length;k++) map[k]=k<v?k:k>v?k-1:near; remapAll(map); doc.palette.splice(v-1,1); });
}
function makeRamp(n){
  const a=ui.primary, b=ui.secondary; if(!a||!b||a===b){ toast('주 색상과 보조 색상에 서로 다른 색을 고른 뒤 사용하세요'); return; }
  const room=MAXPAL-doc.palette.length; if(room<=0){ toast(`팔레트는 최대 ${MAXPAL}색입니다`); return; }
  n=Math.min(n,room); const A=palRGB[a-1], B=palRGB[b-1];
  docChange(()=>{ for(let k=1;k<=n;k++){ const t=k/(n+1); doc.palette.push(rgb2hex(A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t,A[2]+(B[2]-A[2])*t)); } });
  toast(`중간색 ${n}개를 팔레트 끝에 추가했습니다`);
}
function parsePaletteText(t){
  const out=[]; const lines=String(t).split(/\r?\n/);
  if(/^GIMP Palette/i.test(lines[0]||'')){ for(const ln of lines){ const m=ln.trim().match(/^(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})/); if(m) out.push(rgb2hex(+m[1],+m[2],+m[3])); } }
  else { for(const m of String(t).matchAll(/#?\b([0-9a-fA-F]{6})\b/g)) out.push('#'+m[1].toLowerCase()); }
  return [...new Set(out)];
}

/* ================= serialization & autosave ================= */
function b64enc(u){ let s=''; for(let i=0;i<u.length;i+=0x8000) s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000)); return btoa(s); }
function b64dec(s){ const b=atob(s); const u=new Uint8Array(b.length); for(let i=0;i<b.length;i++) u[i]=b.charCodeAt(i); return u; }
function rle(u){ const out=[]; let i=0; while(i<u.length){ const v=u[i]; let n=1; while(i+n<u.length&&u[i+n]===v&&n<255) n++; out.push(v,n); i+=n; } return b64enc(Uint8Array.from(out)); }
function unrle(s,n){ const b=b64dec(s); const u=new Uint8Array(n); let p=0; for(let i=0;i+1<b.length&&p<n;i+=2){ u.fill(b[i],p,Math.min(n,p+b[i+1])); p+=b[i+1]; } return u; }
function serialize(){
  const celOut=(fi,L)=>{ const c=doc.frames[fi].cels[L.id]; for(let k=0;k<fi;k++) if(doc.frames[k].cels[L.id]===c) return {link:k}; return rle(c); };
  // version 3: optional frame names (component states) and doc.comp
  return JSON.stringify({format:'dotlab',version:3,name:doc.name,w:doc.w,h:doc.h,palette:doc.palette,
    layers:doc.layers.map(L=>({id:L.id,name:L.name,visible:L.visible,opacity:L.opacity,locked:L.locked,alphaLock:L.alphaLock,outline:L.outline})),
    frames:doc.frames.map((f,fi)=>Object.assign({dur:f.dur,cels:Object.fromEntries(doc.layers.map(L=>[L.id,celOut(fi,L)]))},f.name?{name:f.name}:{})),
    tags:doc.tags.map(t=>({name:t.name,from:t.from,to:t.to,dir:t.dir,color:t.color})),
    comp:doc.comp?{kind:doc.comp.kind,slice:doc.comp.slice,pad:doc.comp.pad,padAuto:doc.comp.padAuto,lock:!!doc.comp.lock,fill:doc.comp.fill,label:doc.comp.label,opts:doc.comp.opts,libId:doc.comp.libId}:undefined});
}
function deserialize(o){
  if(!o||o.format!=='dotlab') throw new Error('도트랩 프로젝트 파일이 아닙니다');
  const w=o.w|0, H=o.h|0; if(w<1||H<1||w>MAXSIZE||H>MAXSIZE) throw new Error('캔버스 크기가 올바르지 않습니다');
  const palette=(o.palette||[]).filter(isHex).map(normHex).slice(0,MAXPAL); if(!palette.length) palette.push('#000000','#ffffff');
  const layers=(o.layers||[]).map((L,i)=>({id:(L.id|0)||i+1,name:String(L.name||'레이어'),visible:L.visible!==false,opacity:clamp(+L.opacity||1,0,1),locked:!!L.locked,alphaLock:!!L.alphaLock,outline:clamp(L.outline|0,0,palette.length)}));
  if(!layers.length) layers.push(mkLayer(1,L('레이어 1')));
  const frames=[];
  (o.frames||[]).forEach((f,fi)=>{ const cels={};
    for(const L of layers){ const v=f.cels&&f.cels[L.id]; let c;
      if(v&&typeof v==='object'&&Number.isInteger(v.link)&&v.link>=0&&v.link<fi) c=frames[v.link].cels[L.id];
      else { try{ c=typeof v==='string'?unrle(v,w*H):new Uint8Array(w*H); }catch(e){ c=new Uint8Array(w*H); } for(let i=0;i<c.length;i++) if(c[i]>palette.length) c[i]=0; }
      cels[L.id]=c; }
    const fr={dur:clamp(f.dur|0||120,20,5000),cels}; if(f.name) fr.name=String(f.name).slice(0,30); frames.push(fr); });
  if(!frames.length){ const cels={}; for(const L of layers) cels[L.id]=new Uint8Array(w*H); frames.push({dur:120,cels}); }
  const last=frames.length-1;
  const tags=(Array.isArray(o.tags)?o.tags:[]).map(t=>({name:String(t.name||'태그').slice(0,40),from:clamp(t.from|0,0,last),to:clamp(t.to|0,0,last),dir:TAGDIRS.includes(t.dir)?t.dir:'forward',color:isHex(t.color)?normHex(t.color):TAGCOLORS[0]})).filter(t=>t.to>=t.from);
  let comp=null; if(o.comp&&typeof o.comp==='object'){ const s=o.comp.slice; const sl=s&&typeof s==='object'?{l:clamp(s.l|0,0,w-1),t:clamp(s.t|0,0,H-1),r:clamp(s.r|0,0,w-1),b:clamp(s.b|0,0,H-1)}:null;
    if(sl&&(sl.l+sl.r>=w||sl.t+sl.b>=H)){ sl.l=sl.r=Math.floor((w-1)/2); sl.t=sl.b=Math.floor((H-1)/2); }
    comp={kind:String(o.comp.kind||'custom').slice(0,20),slice:sl,label:String(o.comp.label||'').slice(0,24),lock:!!o.comp.lock&&!!sl,fill:o.comp.fill==='tile'?'tile':'stretch',padAuto:o.comp.padAuto!==false};
    const p=o.comp.pad; comp.pad=p&&typeof p==='object'?fitPad(p,w,H):fitPad(sl||{l:1,t:1,r:1,b:1},w,H);
    if(o.comp.opts&&typeof o.comp.opts==='object'&&COMPKINDS[comp.kind]) comp.opts=Object.assign(compOpts(comp.kind,o.comp.opts),{w,h:H,base:isHex(o.comp.opts.base||'')?normHex(o.comp.opts.base):'#3d7be0'});
    if(o.comp.libId) comp.libId=String(o.comp.libId).slice(0,40); }
  const d={name:String(o.name||'작품'),w,h:H,palette,layers,frames,tags}; if(comp) d.comp=comp; return d;
}
let saveT=null;
// autosave keeps every open canvas (workspaceData / parseWorkspace in tabs.js)
function scheduleSave(){ clearTimeout(saveT); saveT=setTimeout(()=>{ try{ localStorage.setItem('dotlab.autosave',workspaceData()); }catch(e){} },700); }
function loadAutosave(){ try{ const s=localStorage.getItem('dotlab.autosave'); return s?parseWorkspace(s):null; }catch(e){ return null; } }
function replaceDoc(nd){ if(!nd.tags) nd.tags=[]; ui.playTag=-1; docChange(()=>{ doc=nd; ui.layer=doc.layers.length-1; ui.frame=0; }); setSel(null); ui.lastPt=null; resetTL(); fitView(); }
