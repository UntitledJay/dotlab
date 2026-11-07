/* ================= timelapse =================
   Every history step stores a flattened snapshot of the frame being edited (palette values, not RGBA).
   Kept in memory for this session only; opening or creating a document starts a new recording. */
const TL={snaps:[],max:1200};
function flatSnap(){
  const out=new Uint8Array(doc.w*doc.h), fr=doc.frames[ui.frame];
  for(const L of doc.layers){ if(!L.visible) continue; const c=fr.cels[L.id]; if(!c) continue; for(let i=0;i<out.length;i++) if(c[i]) out[i]=c[i]; }
  return out;
}
function recordTL(){
  if(!doc) return;
  const s={w:doc.w,h:doc.h,pal:doc.palette.join(','),px:flatSnap()}; const last=TL.snaps[TL.snaps.length-1];
  if(last&&last.w===s.w&&last.h===s.h&&last.pal===s.pal&&eqArr(last.px,s.px)) return;
  if(last&&(last.w!==s.w||last.h!==s.h)) TL.snaps=[];
  TL.snaps.push(s);
  if(TL.snaps.length>TL.max) TL.snaps=TL.snaps.filter((_,i,a)=>i%2===0||i===a.length-1);
}
function resetTL(){ TL.snaps=[]; recordTL(); }
function buildTimelapseGIF(s){
  let snaps=TL.snaps.filter(x=>x.w===doc.w&&x.h===doc.h);
  const MAXF=240; if(snaps.length>MAXF){ const step=(snaps.length-1)/(MAXF-1); snaps=Array.from({length:MAXF},(_,i)=>snaps[Math.round(i*step)]); }
  const {w,h:H}=doc, W=w*s, HH=H*s; const maps=new Map();
  const mapFor=pal=>{ if(!maps.has(pal)){ const m=[0]; pal.split(',').forEach((hx,i)=>{ m[i+1]=nearestIdx(hex2rgb(hx),palRGB)+1; }); maps.set(pal,m); } return maps.get(pal); };
  const frames=snaps.map((sn,k)=>{ const m=mapFor(sn.pal), idx=new Uint8Array(W*HH);
    for(let y=0;y<H;y++) for(let x=0;x<w;x++){ const v=m[sn.px[y*w+x]]||0; if(v) for(let yy=0;yy<s;yy++){ const row=(y*s+yy)*W+x*s; idx.fill(v,row,row+s); } }
    return {idx,delay:k===0?60:k===snaps.length-1?250:8}; });
  return encodeGIF(W,HH,[[0,0,0],...palRGB],frames);
}
function exportTimelapse(s){
  if(TL.snaps.length<3){ toast('기록된 과정이 아직 적습니다. 몇 번 더 그린 뒤 다시 시도하세요.'); return; }
  const fit=Math.max(1,Math.min(s,Math.floor(512/Math.max(doc.w,doc.h))));
  offerFiles([{filename:`${base()}-timelapse.gif`,data:new Blob([buildTimelapseGIF(fit)],{type:'image/gif'})}]);
}
