/* ================= open canvases (tabs) =================
   Several documents stay open side by side. The active one is the global `doc`; the others are parked in
   TABS.list with their own undo/redo stacks, timelapse, view and colour choice. Opening or creating a
   document (새로 만들기, 열기, 이미지 → 새 캔버스, 내 컴포넌트 열기, Figma 선택 편집) adds a tab; replaceDoc still
   swaps the active tab's document (templates, tests). Autosave keeps every tab (workspaceData).
   The Figma build redeclares tabExtraSave/tabExtraLoad to keep each tab's linked Figma object. */
const TABS={list:[],cur:0,max:12};
let tabSeq=1;
function tabExtraSave(){ return {}; }
function tabExtraLoad(x){}
function tabMake(d){ return {id:tabSeq++,doc:d,hist:[],redo:[],tl:[],st:null,extra:{},saved:null}; }
function tabCur(){ return TABS.list[TABS.cur]; }
// run fn with another document as the global one (serialize, composite and friends read `doc` / `palRGB`)
function withDoc(d,fn){ if(d===doc) return fn(); const keep=[doc,palRGB]; doc=d; palRGB=d.palette.map(hex2rgb); try{ return fn(); } finally{ doc=keep[0]; palRGB=keep[1]; } }

// park the active document and everything that belongs to it
function tabStash(){
  const t=tabCur(); if(!t) return;
  t.doc=doc; t.hist=hist.splice(0); t.redo=redoS.splice(0); t.tl=TL.snaps;
  t.st={layer:ui.layer,frame:ui.frame,zoom:ui.zoom,panX:ui.panX,panY:ui.panY,userView:ui.userView,playTag:ui.playTag,primary:ui.primary,secondary:ui.secondary};
  t.extra=tabExtraSave(); try{ t.saved=serialize(); }catch(e){ t.saved=null; }
}
function tabActivate(t){
  doc=t.doc; hist.push(...t.hist); redoS.push(...t.redo); t.hist=[]; t.redo=[]; t.saved=null;
  TL.snaps=t.tl||[]; updPal(); recalcIds(); setSel(null); ui.lastPt=null;
  const s=t.st;
  if(s){ Object.assign(ui,{layer:s.layer,frame:s.frame,playTag:s.playTag,primary:s.primary,secondary:s.secondary}); }
  else { ui.layer=doc.layers.length-1; ui.frame=0; ui.playTag=-1; ui.primary=Math.min(1,doc.palette.length); ui.secondary=0; }
  ui.layer=clamp(ui.layer,0,doc.layers.length-1); ui.frame=clamp(ui.frame,0,doc.frames.length-1);
  if(ui.primary>doc.palette.length) ui.primary=Math.min(1,doc.palette.length); if(ui.secondary>doc.palette.length) ui.secondary=0;
  if(!TL.snaps.length) recordTL();
  tabExtraLoad(t.extra||{});
  if(doc.comp&&ui.mode!=='comp') setMode('comp');   // a component opens in component mode; other canvases keep the current mode
  refreshAll();
  if(s&&s.userView){ ui.userView=true; ui.zoom=s.zoom; ui.panX=s.panX; ui.panY=s.panY; updZoom(); requestDraw(); } else fitView();
  scheduleSave();
}
function switchTab(i){
  if(i===TABS.cur||i<0||i>=TABS.list.length||pend||drag) return;
  stopPlay(); tabStash(); TABS.cur=i; tabActivate(tabCur());
}
// open a document in a new tab next to the active one
function openDoc(nd){
  if(!nd.tags) nd.tags=[];
  if(TABS.list.length>=TABS.max){ replaceDoc(nd); toast(`캔버스는 ${TABS.max}개까지 열 수 있어 지금 탭을 바꿨습니다. Ctrl+Z로 되돌릴 수 있습니다.`); return; }
  stopPlay(); tabStash();
  const t=tabMake(nd); TABS.list.splice(TABS.cur+1,0,t); TABS.cur++;
  tabActivate(t);
}
function closeTab(i){
  const t=TABS.list[i]; if(!t) return;
  const busy=i===TABS.cur?hist.length>0:t.hist.length>0;
  const go=()=>{
    stopPlay();
    if(TABS.list.length===1){ hist.length=0; redoS.length=0; TABS.list[0]=tabMake(makeDoc(doc.w,doc.h,doc.palette,L('새 작품'))); TABS.cur=0; tabActivate(TABS.list[0]); return; }
    if(i===TABS.cur){ hist.length=0; redoS.length=0; TABS.list.splice(i,1); TABS.cur=Math.min(i,TABS.list.length-1); tabActivate(tabCur()); }
    else { TABS.list.splice(i,1); if(i<TABS.cur) TABS.cur--; renderTabs(); scheduleSave(); }
  };
  if(!busy) return go();
  const nm=i===TABS.cur?doc.name:t.doc.name;
  modal({title:'캔버스 닫기',body:h('p',{class:'hint',text:`「${nm}」을(를) 닫습니다. 실행 취소 기록도 함께 사라집니다. 보관하려면 먼저 저장하세요.`}),
    actions:[{label:'취소'},{label:'닫기',primary:true,onClick:go}]});
}

/* tab strip above the stage: a small picture, the name and a close button per canvas */
function tabThumb(t,cv){
  const d=t===tabCur()?doc:t.doc, fi=t===tabCur()?ui.frame:(t.st?t.st.frame:0);
  const img=withDoc(d,()=>composite(Math.min(fi,d.frames.length-1)));
  cv.width=d.w; cv.height=d.h; cv.getContext('2d').putImageData(new ImageData(img,d.w,d.h),0,0);
}
function renderTabs(){
  const bar=$('#docTabs'); if(!bar||!doc) return; bar.textContent='';
  TABS.list.forEach((t,i)=>{
    const d=i===TABS.cur?doc:t.doc, on=i===TABS.cur;
    const cv=h('canvas',{class:'tthumb checker'}); tabThumb(t,cv);
    const tab=h('div',{class:'dtab'+(on?' on':''),role:'tab','aria-selected':String(on),title:`${d.name} · ${d.w}×${d.h}`,onclick:()=>switchTab(i),
      onauxclick:e=>{ if(e.button===1){ e.preventDefault(); closeTab(i); } }},
      cv,h('span',{class:'tname','data-i18n':'off',text:d.name}),
      h('button',{class:'tclose',title:'캔버스 닫기','aria-label':`「${d.name}」 닫기`,text:'×',onclick:e=>{ e.stopPropagation(); closeTab(i); }}));
    bar.append(tab);
  });
  bar.append(h('button',{class:'tadd',title:'새 캔버스 (새 탭)','aria-label':'새 캔버스',text:'+',onclick:newDialog}));
  const on=bar.querySelector('.dtab.on'); if(on&&on.scrollIntoView&&bar.scrollWidth>bar.clientWidth) on.scrollIntoView({block:'nearest',inline:'nearest'});
}
function updTabThumb(){ const cv=$('#docTabs .dtab.on canvas'); if(cv) tabThumb(tabCur(),cv); }

/* autosave: every open canvas in one string */
function workspaceData(){
  const docs=TABS.list.map((t,i)=>i===TABS.cur?serialize():(t.saved||(t.saved=withDoc(t.doc,serialize))));
  return JSON.stringify({format:'dotlab-workspace',version:1,active:TABS.cur,docs});
}
// accepts a workspace or a single project (older autosaves)
function parseWorkspace(s){
  const o=typeof s==='string'?JSON.parse(s):s; if(!o) return null;
  if(o.format==='dotlab-workspace'){
    const docs=[]; let active=0;
    (o.docs||[]).forEach((x,i)=>{ try{ const d=deserialize(typeof x==='string'?JSON.parse(x):x); if(i===o.active) active=docs.length; docs.push(d); }catch(e){} });
    return docs.length?{docs:docs.slice(0,TABS.max),active:Math.min(active,TABS.max-1)}:null;
  }
  return {docs:[deserialize(o)],active:0};
}
function tabsInit(ws){
  TABS.list=(ws?ws.docs:[sampleDoc()]).map(tabMake); TABS.cur=ws?ws.active:0;
  doc=tabCur().doc; TABS.list.forEach((t,i)=>{ if(i!==TABS.cur) t.saved=null; });
}
