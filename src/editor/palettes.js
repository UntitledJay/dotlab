/* ================= preferences, theme, palette shelf =================
   Preferences (language, theme, saved palettes) are one small object. Web and Pages keep it in localStorage;
   the Figma build redeclares prefLoad/prefStore to use figma.clientStorage through the main thread. */
const PREFKEY='dotlab.prefs';
const PREFS={};
function prefLoad(){ try{ return JSON.parse(localStorage.getItem(PREFKEY)||'{}')||{}; }catch(e){ return {}; } }
function prefStore(p){ try{ localStorage.setItem(PREFKEY,JSON.stringify(p)); }catch(e){} }
function prefGet(k,def){ return PREFS[k]===undefined?def:PREFS[k]; }
function prefSet(k,v){ if(PREFS[k]===v&&typeof v!=='object') return; PREFS[k]=v; prefStore(PREFS); }
function prefsInit(p){ Object.assign(PREFS,p&&typeof p==='object'?p:prefLoad()); }

/* light by default whatever the system theme; the button switches and remembers it */
function setTheme(t){
  t=t==='dark'?'dark':'light'; document.documentElement.dataset.theme=t; prefSet('theme',t);
  const b=$('#bTheme'); if(b){ b.innerHTML=t==='dark'?ICON.sun:ICON.moon; const lbl=t==='dark'?'라이트 모드로 바꾸기':'다크 모드로 바꾸기'; b.title=lbl; b.setAttribute('aria-label',lbl); }
}

/* 팔레트 모음: the open palette, palettes the user saved (including AI ones) and the presets, side by side */
function shelfList(){ const a=prefGet('palettes',[]); return Array.isArray(a)?a.filter(p=>p&&Array.isArray(p.colors)):[]; }
function shelfSave(name,colors){
  colors=(colors||doc.palette).filter(isHex).map(normHex).slice(0,MAXPAL); if(!colors.length) return;
  const list=shelfList(); const nm=String(name||doc.name||'팔레트').trim().slice(0,40)||'팔레트';
  const same=list.findIndex(p=>p.name===nm); const item={id:same>=0?list[same].id:'p'+Date.now().toString(36)+Math.random().toString(36).slice(2,5),name:nm,colors};
  if(same>=0) list[same]=item; else list.unshift(item);
  prefSet('palettes',list.slice(0,40)); renderShelf(); toast('팔레트를 모음에 저장했습니다');
}
function shelfDelete(id){
  modal({title:'팔레트 삭제',body:h('p',{class:'hint',text:'이 팔레트를 모음에서 지웁니다. 되돌릴 수 없습니다.'}),
    actions:[{label:'취소'},{label:'삭제',primary:true,onClick:()=>{ prefSet('palettes',shelfList().filter(p=>p.id!==id)); renderShelf(); toast('팔레트를 지웠습니다'); }}]});
}
function shelfSaveDialog(colors,name){
  const inp=h('input',{value:name||doc.name||'','aria-label':'팔레트 이름',style:'width:100%'});
  modal({title:'팔레트 저장',body:h('label',{class:'row2'},'이름',inp),
    actions:[{label:'취소'},{label:'저장',primary:true,onClick:()=>shelfSave(inp.value,colors)}]});
  setTimeout(()=>{ inp.focus(); inp.select(); },30);
}
// use one colour from any palette: select it if the open palette has it, otherwise append it
function shelfPick(c,secondary){
  c=normHex(c); let v=doc.palette.indexOf(c)+1;
  if(!v){ if(doc.palette.length>=MAXPAL){ toast('팔레트가 꽉 차서 색을 더할 수 없습니다'); return; } docChange(()=>{ doc.palette.push(c); }); v=doc.palette.length; }
  if(secondary) ui.secondary=v; else ui.primary=v; renderColors(); renderPalette();
}
function renderShelf(){
  const box=$('#palShelf'); if(!box||box.hidden) return; box.textContent='';
  const row=(name,colors,{id,current,user}={})=>{
    const sw=h('div',{class:'shelfsw'},colors.map(c=>{ const on=!current&&doc.palette.includes(normHex(c));
      return h('button',{class:on?'in':'',style:'background:'+c,title:c,'aria-label':c,onclick:()=>shelfPick(c),oncontextmenu:e=>{ e.preventDefault(); shelfPick(c,true); }}); }));
    return h('div',{class:'shelfrow'+(current?' cur':'')},
      h('div',{class:'shelfhead'},h('b',{text:name,'data-i18n':user?'off':null}),h('span',{class:'count',text:String(colors.length)}),
        current?h('button',{class:'btn sm',text:'모음에 저장',onclick:()=>shelfSaveDialog(doc.palette.slice())}):h('button',{class:'btn sm',text:'바꾸기',title:'이 팔레트로 바꾸기',onclick:()=>presetDialog(colors.slice(),name)}),
        user?h('button',{class:'mini',title:'팔레트 삭제','aria-label':'팔레트 삭제',html:ICON.trash,onclick:()=>shelfDelete(id)}):null),
      sw);
  };
  box.append(h('p',{class:'hint',text:'색을 클릭하면 주 색상으로, 오른쪽 클릭하면 보조 색상으로 씁니다. 지금 팔레트에 없는 색은 끝에 추가됩니다.'}));
  box.append(row('지금 팔레트',doc.palette,{current:true}));
  const mine=shelfList();
  box.append(h('div',{class:'shelfsec',text:'저장한 팔레트'}));
  if(!mine.length) box.append(h('p',{class:'hint',text:'아직 저장한 팔레트가 없습니다. 지금 팔레트나 AI가 만든 팔레트를 저장해 두면 여기서 함께 볼 수 있습니다.'}));
  for(const p of mine) box.append(row(p.name,p.colors,{id:p.id,user:true}));
  box.append(h('div',{class:'shelfsec',text:'프리셋'}));
  for(const k of Object.keys(PRESETS)) box.append(row(k,PRESETS[k]));
}
function toggleShelf(force){
  const box=$('#palShelf'); const open=force===undefined?box.hidden:force; box.hidden=!open;
  $('#pShelf').setAttribute('aria-pressed',String(open)); prefSet('shelf',open); renderShelf();
}
