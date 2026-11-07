/* ================= wiring ================= */
function showTab(id){ $$('.tab').forEach(t=>t.setAttribute('aria-selected',String(t.dataset.tab===id))); $$('.tabpanel').forEach(p=>p.hidden=p.id!==id); try{ localStorage.setItem('dotlab.tab',id); }catch(e){} }
function init(prefs){
  prefsInit(prefs); setTheme(prefGet('theme','light')); I18N.lang=prefGet('lang','ko')==='en'?'en':'ko';
  readTokens();
  new MutationObserver(()=>{ readTokens(); requestDraw(); }).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});

  const tb=$('#toolBtns');
  for(const t of TOOLDEFS) tb.append(h('button',{class:'tool','data-tool':t.id,'aria-pressed':'false','aria-label':t.name,title:`${t.name} (${t.key})`,html:ICON[t.id],onclick:()=>setTool(t.id)}));
  $('#lAdd').innerHTML=ICON.plus; $('#lDup').innerHTML=ICON.copy; $('#lUp').innerHTML=ICON.up; $('#lDown').innerHTML=ICON.down; $('#lMerge').innerHTML=ICON.merge; $('#lDel').innerHTML=ICON.trash;

  const saved=loadAutosave(); doc=saved||sampleDoc(); updPal(); recalcIds(); ui.layer=doc.layers.length-1;
  if(!saved) setTimeout(()=>toast('예시 작품을 열었습니다. 새로 만들기로 빈 캔버스를 시작할 수 있습니다.'),600);
  else setTimeout(()=>toast('자동 저장된 작업을 불러왔습니다'),600);

  $('#bNew').onclick=newDialog; $('#bOpen').onclick=()=>$('#fileOpen').click(); $('#bSave').onclick=saveProject; $('#bExport').onclick=exportDialog;
  $('#fileOpen').addEventListener('change',e=>{ handleFile(e.target.files[0]); e.target.value=''; });
  $('#bUndo').onclick=undo; $('#bRedo').onclick=redo; $('#bHelp').onclick=helpDialog;
  $('#bZoomIn').onclick=()=>zoomStep(1); $('#bZoomOut').onclick=()=>zoomStep(-1); $('#bFit').onclick=fitView;
  toggleBtn('#tGrid','grid'); toggleBtn('#tTile','tile'); toggleBtn('#tMirX','mirrorX'); toggleBtn('#tMirY','mirrorY'); toggleBtn('#tOnion','onion');
  $('#docName').addEventListener('change',e=>{ doc.name=e.target.value.trim().slice(0,60)||'작품'; scheduleSave(); });
  $('#swPri').onclick=()=>editColor(ui.primary); $('#swSec').onclick=()=>editColor(ui.secondary);
  $('#swSwap').onclick=()=>{ [ui.primary,ui.secondary]=[ui.secondary,ui.primary]; renderColors(); renderPalette(); };

  $('#lAdd').onclick=addLayer; $('#lDup').onclick=dupLayer; $('#lDel').onclick=delLayer; $('#lUp').onclick=()=>moveLayer(1); $('#lDown').onclick=()=>moveLayer(-1); $('#lMerge').onclick=mergeDown;
  $('#bPlay').onclick=()=>ui.playing?stopPlay():play(); $('#frAdd').onclick=()=>addFrame('empty'); $('#frDup').onclick=()=>addFrame('dup'); $('#frLink').onclick=()=>addFrame('link'); $('#frUnlink').onclick=unlinkCel; $('#frTag').onclick=()=>tagDialog();
  $('#playScope').addEventListener('change',e=>{ const was=ui.playing; stopPlay(); ui.playTag=+e.target.value; if(was) play(); }); $('#frDel').onclick=delFrame; $('#frL').onclick=()=>moveFrame(-1); $('#frR').onclick=()=>moveFrame(1);
  $('#frDur').addEventListener('change',e=>{ doc.frames[ui.frame].dur=clamp(e.target.value|0,20,5000); renderTimeline(); scheduleSave(); });

  $('#pAdd').onclick=()=>editColor(0,true); $('#pEdit').onclick=()=>editColor(ui.primary); $('#pDel').onclick=()=>deleteColor(ui.primary);
  $('#pRamp').onclick=rampDialog; $('#pPreset').onclick=()=>presetDialog(); $('#pImport').onclick=()=>$('#palFile').click(); $('#pExport').onclick=exportPalette;
  $('#palFile').addEventListener('change',e=>{ handleFile(e.target.files[0]); e.target.value=''; });
  $('#pShelf').onclick=()=>toggleShelf();
  $('#bTheme').onclick=()=>setTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');
  $$('#langSwitch .chip').forEach(b=>b.onclick=()=>setLang(b.dataset.lang));

  $$('.tab').forEach(t=>t.onclick=()=>showTab(t.dataset.tab));
  try{ const t=localStorage.getItem('dotlab.tab'); if(t&&$('#'+t)) showTab(t); }catch(e){}
  $('#aiGo').onclick=aiGenerate; $('#aiEditGo').onclick=aiEdit; $('#palGo').onclick=aiPalette; $('#aiStop').onclick=()=>aiCtl?.abort();
  $('#aiPrompt').addEventListener('keydown',e=>{ if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)) aiGenerate(); });
  aiBusy(false);

  $('#convFile').addEventListener('change',e=>{ const f=e.target.files[0]; if(f) setConvImage(f).catch(err=>toast(err.message)); e.target.value=''; });
  for(const id of ['#convFit','#convSat','#convBg','#convClean','#convN']) $(id).addEventListener('input',()=>runConvert());
  $$('input[name=convMode],input[name=convSize]').forEach(r=>r.addEventListener('change',()=>{ convUI(); runConvert(); }));
  $('#convPx').addEventListener('change',e=>setConvPx(+e.target.value));
  $('#convRedetect').onclick=()=>{ if(conv.d){ conv.det=detectGrid(); convUI(); runConvert(); } };
  $('#convOpen').onclick=convOpenNew; $('#convGo').onclick=convInsert;
  $('#convRef').onclick=()=>{ if(conv.img){ setRefImage(conv.img); showTab('pRef'); toast('참조 이미지로 띄웠습니다'); } };
  document.addEventListener('paste',e=>{ if(e.target.matches&&e.target.matches('input,textarea')) return; const f=[...(e.clipboardData?.files||[])].find(f_=>f_.type.startsWith('image/')); if(f){ e.preventDefault(); showTab('pConv'); setConvImage(f).catch(err=>toast(err.message)); } });
  convUI();
  const cd=$('#convDrop');
  cd.addEventListener('dragover',e=>{ e.preventDefault(); cd.classList.add('over'); }); cd.addEventListener('dragleave',()=>cd.classList.remove('over'));
  cd.addEventListener('drop',e=>{ e.preventDefault(); e.stopPropagation(); cd.classList.remove('over'); const f=e.dataTransfer.files[0]; if(f) setConvImage(f).catch(err=>toast(err.message)); });

  $('#refFile').addEventListener('change',e=>{ const f=e.target.files[0]; if(f) setRefImage(f).catch(err=>toast(err.message)); e.target.value=''; });
  $('#refOp').addEventListener('input',e=>{ ref.opacity=e.target.value/100; requestDraw(); });
  $('#refVis').addEventListener('change',e=>{ ref.visible=e.target.checked; requestDraw(); });
  $('#refAbove').addEventListener('change',e=>{ ref.above=e.target.checked; requestDraw(); });
  $('#refDel').onclick=()=>{ ref.img=null; $('#refDel').disabled=true; requestDraw(); renderXfer(); };
  $('#xferAmt').addEventListener('input',renderXfer); $('#xferMode').addEventListener('change',renderXfer); $('#xferGo').onclick=applyXfer;

  const dh=$('#dropHint');
  stage.addEventListener('dragover',e=>{ e.preventDefault(); dh.hidden=false; });
  stage.addEventListener('dragleave',()=>dh.hidden=true);
  stage.addEventListener('drop',e=>{ e.preventDefault(); dh.hidden=true; handleFile(e.dataTransfer.files[0]); });

  window.addEventListener('keydown',e=>{
    const t=e.target;
    if(!$('#modal').hidden){ if(e.key==='Escape') closeModal(); return; }
    if(t.matches&&t.matches('input,textarea,select,[contenteditable]')) return;
    const mod_=e.ctrlKey||e.metaKey, k=e.key.toLowerCase();
    if(e.code==='Space'){ if(t.matches&&t.matches('button')) return; e.preventDefault(); if(!spaceDown){ spaceDown=true; view.style.cursor='grab'; } return; }
    if(mod_){
      if(k==='z'){ e.preventDefault(); e.shiftKey?redo():undo(); }
      else if(k==='y'){ e.preventDefault(); redo(); }
      else if(k==='a'){ e.preventDefault(); selectAll(); }
      else if(k==='c'&&ui.sel){ e.preventDefault(); copySel(); }
      else if(k==='v'&&clip){ e.preventDefault(); pasteClip(); }
      else if(k==='s'){ e.preventDefault(); saveProject(); }
      return;
    }
    const td=TOOLDEFS.find(d=>d.key.toLowerCase()===k); if(td){ setTool(td.id); return; }
    if(k==='escape') setSel(null);
    else if(k==='delete'||k==='backspace'){ e.preventDefault(); clearSelPixels(); }
    else if(k==='x'){ [ui.primary,ui.secondary]=[ui.secondary,ui.primary]; renderColors(); renderPalette(); }
    else if(k==='['){ ui.brush=clamp(ui.brush-1,1,8); renderToolOpts(); requestDraw(); }
    else if(k===']'){ ui.brush=clamp(ui.brush+1,1,8); renderToolOpts(); requestDraw(); }
    else if(k==='+'||k==='='){ zoomStep(1); }
    else if(k==='-'||k==='_'){ zoomStep(-1); }
    else if(k==='0'){ fitView(); }
    else if(k===','){ gotoFrame(ui.frame-1); }
    else if(k==='.'){ gotoFrame(ui.frame+1); }
    else if(k==='enter'){ ui.playing?stopPlay():play(); }
  });
  window.addEventListener('keyup',e=>{ if(e.code==='Space'){ spaceDown=false; if(!drag) view.style.cursor=cursorFor(ui.tool); requestDraw(); } });
  window.addEventListener('blur',()=>{ spaceDown=false; });

  $$('#modeSwitch .chip').forEach(b=>b.onclick=()=>setMode(b.dataset.mode));
  renderPlayBtn(); setTool('pencil'); refreshAll(); resetTL(); renderXfer();
  let mode='dot'; try{ mode=localStorage.getItem('dotlab.mode')||'dot'; }catch(e){} setMode(mode);
  toggleShelf(!!prefGet('shelf',false)); setLang(I18N.lang);
  new ResizeObserver(resizeView).observe(stage); resizeView();
  initCapabilities();
}
init();
