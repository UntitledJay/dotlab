ICON.eraser=px('.....##.. ....####. ...###### ..#.####. .#...##.. #...#.... .#.#..... ..#...... .........');

/* ================= panels ================= */
function swatchStyle(el,v){ if(v&&doc.palette[v-1]){ el.classList.remove('checker'); el.style.background=doc.palette[v-1]; } else { el.style.background=''; el.classList.add('checker'); } }
function renderColors(){ swatchStyle($('#swPri'),ui.primary); swatchStyle($('#swSec'),ui.secondary); $('#swPri').title='주 색상: '+(ui.primary?doc.palette[ui.primary-1]:'투명'); $('#swSec').title='보조 색상: '+(ui.secondary?doc.palette[ui.secondary-1]:'투명'); }
function renderPalette(){
  const g=$('#palGrid'); g.textContent='';
  const mk=v=>{ const b=h('button',{title:v?`${doc.palette[v-1]} (${v})`:'투명','aria-label':v?doc.palette[v-1]:'투명',
      onclick:()=>{ ui.primary=v; renderColors(); renderPalette(); },
      oncontextmenu:e=>{ e.preventDefault(); ui.secondary=v; renderColors(); renderPalette(); },
      ondblclick:()=>editColor(v)});
    swatchStyle(b,v); if(ui.primary===v) b.classList.add('pri'); if(ui.secondary===v) b.classList.add('sec'); return b; };
  g.append(mk(0)); for(let v=1;v<=doc.palette.length;v++) g.append(mk(v));
  $('#palCount').textContent=`${doc.palette.length} / ${MAXPAL}`;
  renderAIHints(); renderShelf();
}
let layerThumbs=[], frameThumbs=[];
function drawThumb(cv,data){ cv.width=doc.w; cv.height=doc.h; cv.getContext('2d').putImageData(new ImageData(data,doc.w,doc.h),0,0); }
function updateThumbs(){
  for(const [cv,id] of layerThumbs) drawThumb(cv,composite(ui.frame,id));
  frameThumbs.forEach((cv,i)=>{ cv.width=doc.w; cv.height=doc.h; cv.getContext('2d').drawImage(frameCanvas(i),0,0); });
}
function renderLayers(){
  const list=$('#layerList'); list.textContent=''; layerThumbs=[];
  for(let k=doc.layers.length-1;k>=0;k--){
    const L=doc.layers[k]; const cv=h('canvas',{class:'thumb checker'}); layerThumbs.push([cv,L.id]);
    const name=h('span',{class:'lname','data-i18n':'off',text:L.name,title:'더블클릭해 이름 바꾸기'});
    name.addEventListener('dblclick',e=>{ e.stopPropagation(); const inp=h('input',{value:L.name,'aria-label':'레이어 이름'}); name.textContent=''; name.append(inp); inp.focus(); inp.select();
      const done=()=>{ const v=inp.value.trim(); if(v) L.name=v.slice(0,40); renderLayers(); scheduleSave(); };
      inp.addEventListener('blur',done); inp.addEventListener('keydown',ev=>{ if(ev.key==='Enter') inp.blur(); if(ev.key==='Escape'){ inp.value=L.name; inp.blur(); } }); });
    const row=h('div',{class:'lrow'+(k===ui.layer?' on':''),onclick:()=>{ ui.layer=k; renderLayers(); }},
      h('button',{class:'mini'+(L.visible?'':' off'),title:L.visible?'숨기기':'보이기','aria-label':L.visible?'레이어 숨기기':'레이어 보이기',html:ICON.eye,onclick:e=>{ e.stopPropagation(); L.visible=!L.visible; changed(); renderLayers(); scheduleSave(); }}),
      cv, name,
      L.alphaLock?h('span',{class:'badge',title:'알파 잠금',text:'α'}):null,
      L.outline?h('span',{class:'badge',title:'외곽선 효과',text:'외곽'}):null,
      L.opacity<1?h('span',{class:'badge',text:Math.round(L.opacity*100)+'%'}):null,
      h('button',{class:'mini'+(L.locked?'':' off'),title:L.locked?'잠금 풀기':'잠그기','aria-label':L.locked?'레이어 잠금 풀기':'레이어 잠그기',html:L.locked?ICON.lock:ICON.unlock,onclick:e=>{ e.stopPropagation(); L.locked=!L.locked; renderLayers(); scheduleSave(); }}));
    list.append(row);
  }
  const L=activeLayer(); const pr=$('#layerProps'); pr.textContent='';
  const op=h('input',{type:'range',min:0,max:100,value:Math.round(L.opacity*100),'aria-label':'불투명도'});
  op.addEventListener('input',()=>{ L.opacity=op.value/100; changed(); });
  op.addEventListener('change',()=>{ renderLayers(); scheduleSave(); });
  const al=h('input',{type:'checkbox',checked:L.alphaLock}); al.addEventListener('change',()=>{ L.alphaLock=al.checked; renderLayers(); scheduleSave(); });
  const ol=h('input',{type:'checkbox',checked:!!L.outline}); ol.addEventListener('change',()=>{ L.outline=ol.checked?(ui.primary||1):0; changed(); renderLayers(); scheduleSave(); });
  const olSw=h('span',{style:'display:inline-block;width:12px;height:12px;border-radius:2px;border:1px solid var(--line);'+(L.outline?'background:'+doc.palette[L.outline-1]:'')});
  pr.append(h('label',null,'불투명도',op), h('label',{title:'이미 칠한 픽셀만 다시 칠합니다'},al,'알파 잠금'), h('label',{title:'켜는 순간의 주 색상으로 1px 외곽선을 그립니다. 원본 픽셀은 바뀌지 않습니다.'},ol,'외곽선 효과',L.outline?olSw:null));
  updateThumbs();
}
function renderTimeline(){
  const list=$('#frameList'); list.textContent=''; frameThumbs=[];
  const lid=activeLayer().id;
  doc.frames.forEach((f,i)=>{ const cv=h('canvas',{class:'checker'}); frameThumbs.push(cv);
    const linked=linkedWithPrev(i,lid), tag=doc.tags.find(t=>i>=t.from&&i<=t.to);
    list.append(h('button',{class:'fcell'+(i===ui.frame?' on':'')+(linked?' linked':''),style:tag?`--tc:${tag.color}`:null,'data-tag':tag?'1':null,
      title:`프레임 ${i+1} · ${f.dur}ms`+(linked?' · 「'+activeLayer().name+'」 셀이 앞 프레임과 링크됨':'')+(tag?` · 태그 「${tag.name}」`:''),onclick:()=>gotoFrame(i),ondblclick:()=>{ if(ui.mode==='comp'&&doc.comp) renameState(i); }},cv,ui.mode==='comp'&&doc.comp?h('span',{class:'fn st',text:stateName(i),title:'더블클릭해 상태 이름 바꾸기'}):h('span',{class:'fn',text:String(i+1)}))); });
  const row=$('#tagRow'); row.textContent='';
  doc.tags.forEach((t,k)=>row.append(h('button',{class:'tagchip',style:`--tc:${t.color}`,title:'태그 편집',onclick:()=>tagDialog(k)},h('i'),h('span',{'data-i18n':'off',text:t.name}),` · ${t.from+1}–${t.to+1}`,t.dir!=='forward'?h('span',{class:'tdir',text:{reverse:'역방향',pingpong:'핑퐁',pingpong_reverse:'역방향 핑퐁'}[t.dir]}):null)));
  row.hidden=!doc.tags.length;
  if(ui.playTag>=doc.tags.length) ui.playTag=-1;
  const ps=$('#playScope'); ps.textContent=''; ps.append(h('option',{value:-1,text:'전체 프레임'}),...doc.tags.map((t,k)=>h('option',{value:k,text:'태그: '+t.name}))); ps.value=String(ui.playTag);
  $('#frUnlink').disabled=!isLinked(ui.frame,lid);
  $('#frDur').value=doc.frames[ui.frame].dur;
  const total=doc.frames.reduce((s,f)=>s+f.dur,0);
  $('#frInfo').textContent=ui.mode==='comp'&&doc.comp?`상태 ${ui.frame+1} / ${doc.frames.length} · 「${stateName(ui.frame)}」 · 더블클릭해 이름 바꾸기`:`${ui.frame+1} / ${doc.frames.length} 프레임 · 전체 ${(total/1000).toFixed(2)}초`;
  markPlaying(); updateThumbs();
}
function chip(label,on,onclick,title){ return h('button',{class:'chip','aria-pressed':String(!!on),onclick,title}); }
function renderToolOpts(){
  const o=$('#toolOpts'); if(!o||!doc) return; o.textContent=''; const t=ui.tool, d=toolDef(t);
  o.append(h('span',{class:'tname',text:d.name}));
  if(['pencil','eraser','line','rect','ellipse'].includes(t)){
    o.append(h('span',{class:'stepper'},'크기',h('button',{class:'btn ic sm',text:'−','aria-label':'브러시 작게',onclick:()=>{ ui.brush=clamp(ui.brush-1,1,8); renderToolOpts(); requestDraw(); }}),h('span',{class:'mono',text:String(ui.brush)}),h('button',{class:'btn ic sm',text:'+','aria-label':'브러시 크게',onclick:()=>{ ui.brush=clamp(ui.brush+1,1,8); renderToolOpts(); requestDraw(); }})));
  }
  const tog=(label,key,title)=>{ const b=h('button',{class:'chip','aria-pressed':String(!!ui[key]),title,text:label,onclick:()=>{ ui[key]=!ui[key]; renderToolOpts(); }}); o.append(b); };
  if(t==='pencil'||t==='eraser') tog('픽셀 퍼펙트','pixelPerfect','곡선에서 생기는 L자 꺾임 픽셀을 자동으로 지웁니다 (크기 1일 때)');
  if(['pencil','fill','line','rect','ellipse'].includes(t)) tog('디더','dither','체커보드 무늬로 한 칸씩 건너 칠합니다');
  if(t==='rect'||t==='ellipse') tog('속 채우기','shapeFill');
  if(ui.sel){
    o.append(h('span',{class:'vsep'}),
      h('button',{class:'btn sm',text:'선택 해제',onclick:()=>setSel(null)}),
      h('button',{class:'btn sm',text:'좌우 뒤집기',onclick:()=>flip('x')}),
      h('button',{class:'btn sm',text:'상하 뒤집기',onclick:()=>flip('y')}),
      h('button',{class:'btn sm',text:'복사',onclick:copySel}),
      h('button',{class:'btn sm danger',text:'지우기',onclick:clearSelPixels}));
  } else if(['select','wand','move'].includes(t)){
    o.append(h('button',{class:'btn sm',text:'전체 선택',onclick:selectAll}), h('button',{class:'btn sm',text:'좌우 뒤집기',title:'레이어 전체',onclick:()=>flip('x')}), h('button',{class:'btn sm',text:'상하 뒤집기',title:'레이어 전체',onclick:()=>flip('y')}));
  }
  if(clip) o.append(h('button',{class:'btn sm',text:'붙여넣기',onclick:pasteClip}));
  o.append(h('span',{class:'hint',text:d.hint}));
}
function updStatus(p){
  if(!doc) return;
  if(p&&p.x>=0&&p.y>=0&&p.x<doc.w&&p.y<doc.h) $('#stPos').textContent=`${p.x}, ${p.y}`; else if(!p) $('#stPos').textContent='–';
  const b=selBBox();
  $('#stSize').textContent=`${doc.w}×${doc.h} · 레이어 ${doc.layers.length}개 · 프레임 ${doc.frames.length}개`+(b?` · 선택 ${b.w}×${b.h}`:'');
  $('#stHint').textContent='';
}
function toggleBtn(id,key,after){ const b=$(id); b.setAttribute('aria-pressed',String(!!ui[key])); b.onclick=()=>{ ui[key]=!ui[key]; b.setAttribute('aria-pressed',String(ui[key])); after&&after(); requestDraw(); }; }
function refreshAll(){
  updPal(); invalidate(); renderColors(); renderPalette(); renderLayers(); renderTimeline(); renderToolOpts(); renderAISize(); renderEditHint(); renderCands(); renderComp();
  $('#docName').value=doc.name; updStatus(); updHistBtns(); requestDraw();
}

/* ================= modal ================= */
function modal({title,body,actions,wide}){
  $('#mTitle').textContent=title; const mb=$('#mBody'); mb.textContent='';
  if(typeof body==='string') mb.innerHTML=body; else if(body) mb.append(body);
  const ma=$('#mActions'); ma.textContent='';
  for(const a of (actions||[{label:'닫기'}])) ma.append(h('button',{class:'btn'+(a.primary?' primary':'')+(a.danger?' danger':''),text:a.label,onclick:async()=>{ const r=a.onClick?await a.onClick():undefined; if(r!==false) closeModal(); }}));
  $('.dialog').classList.toggle('wide',!!wide); $('#modal').hidden=false;
  setTimeout(()=>{ (mb.querySelector('input:not([type=radio]),select,textarea')||ma.querySelector('.primary')||ma.querySelector('button'))?.focus(); },0);
}
function closeModal(){ $('#modal').hidden=true; }
$('#modal').addEventListener('pointerdown',e=>{ if(e.target.id==='modal') closeModal(); });

function newDialog(){
  let W=doc.w, H=doc.h;
  const wi=h('input',{type:'number',min:1,max:MAXSIZE,value:W,'aria-label':'너비',style:'width:80px'}), hi=h('input',{type:'number',min:1,max:MAXSIZE,value:H,'aria-label':'높이',style:'width:80px'});
  const sizes=h('div',{class:'sizes'},[8,16,24,32,48,64,128].map(s=>h('button',{class:'btn sm',text:`${s}×${s}`,onclick:()=>{ wi.value=s; hi.value=s; }})));
  const ps=h('select',{'aria-label':'팔레트'},h('option',{value:'',text:'지금 쓰는 팔레트 유지'}),Object.keys(PRESETS).map(k=>h('option',{value:k,text:k})));
  modal({title:'새 캔버스',body:h('div',{style:'display:flex;flex-direction:column;gap:10px'},sizes,h('div',{class:'row2'},h('label',null,'너비',wi),h('label',null,'높이',hi),h('span',{class:'hint',text:`최대 ${MAXSIZE}px`})),h('label',{class:'row2',style:'color:var(--muted)'},'팔레트 ',ps),h('p',{class:'hint',text:'지금 작업은 실행 취소(Ctrl+Z)로 되돌릴 수 있습니다. 보관하려면 먼저 저장하세요.'})),
    actions:[{label:'취소'},{label:'만들기',primary:true,onClick:()=>{ const w=clamp(wi.value|0,1,MAXSIZE), hh=clamp(hi.value|0,1,MAXSIZE); const pal=ps.value?PRESETS[ps.value]:doc.palette; replaceDoc(makeDoc(w,hh,pal,'새 작품')); ui.primary=Math.min(1,doc.palette.length); ui.secondary=0; renderColors(); renderPalette(); }}]});
}
function editColor(v,isNew){
  if(!isNew&&!v){ toast('투명은 편집할 수 없습니다. 다른 색을 고르세요.'); return; }
  const start=isNew?(ui.primary?doc.palette[ui.primary-1]:'#ffffff'):doc.palette[v-1];
  const ci=h('input',{type:'color',value:start,'aria-label':'색 선택'}); const hx=h('input',{value:start,'aria-label':'16진수 색상 코드',style:'width:110px;font-family:var(--f-mono)'});
  const pv=h('span',{style:`width:40px;height:40px;border-radius:5px;border:1px solid var(--line);background:${start}`});
  ci.addEventListener('input',()=>{ hx.value=ci.value; pv.style.background=ci.value; });
  hx.addEventListener('input',()=>{ if(isHex(hx.value)){ const n=normHex(hx.value); ci.value=n; pv.style.background=n; } });
  modal({title:isNew?'팔레트에 색 추가':`색 편집 (${v}번)`,body:h('div',{class:'colorpick'},ci,hx,pv,h('span',{class:'hint',text:isNew?'':'이 색을 쓰는 모든 픽셀이 함께 바뀝니다.'})),
    actions:[{label:'취소'},{label:isNew?'추가':'적용',primary:true,onClick:()=>{ if(!isHex(hx.value)){ toast('#rrggbb 형식으로 입력하세요'); return false; } const c=normHex(hx.value);
      if(isNew){ if(doc.palette.length>=MAXPAL){ toast(`팔레트는 최대 ${MAXPAL}색입니다`); return; } docChange(()=>{ doc.palette.push(c); ui.primary=doc.palette.length; }); }
      else docChange(()=>{ doc.palette[v-1]=c; }); }}]});
}
function presetDialog(list,title){
  const opts=list?null:h('select',{'aria-label':'프리셋'},Object.keys(PRESETS).map(k=>h('option',{value:k,text:k})));
  const pv=h('div',{class:'swrow'});
  const cur=()=>list||PRESETS[opts.value];
  const paint=()=>{ pv.textContent=''; for(const c of cur()) pv.append(h('i',{style:'background:'+c,title:c})); };
  if(opts) opts.addEventListener('change',paint); paint();
  const mode=h('div',{class:'optlist'},
    h('label',{class:'opt'},h('input',{type:'radio',name:'pm',value:'nearest',checked:true}),h('div',null,h('b',{text:'가장 가까운 색으로 변환'}),h('span',{text:'그림의 모든 픽셀을 새 팔레트에서 가장 비슷한 색으로 바꿉니다.'}))),
    h('label',{class:'opt'},h('input',{type:'radio',name:'pm',value:'keep'}),h('div',null,h('b',{text:'색 번호 유지 (팔레트 스왑)'}),h('span',{text:'1번 색은 1번 색으로 그대로 교체합니다. 같은 그림을 다른 색 조합으로 바꿔 볼 때 씁니다.'}))),
    h('label',{class:'opt'},h('input',{type:'radio',name:'pm',value:'append'}),h('div',null,h('b',{text:'끝에 추가'}),h('span',{text:'지금 팔레트는 그대로 두고 없는 색만 덧붙입니다.'}))));
  modal({title:title||'팔레트 프리셋',body:h('div',{style:'display:flex;flex-direction:column;gap:10px'},opts,pv,mode),
    actions:[{label:'취소'},{label:'적용',primary:true,onClick:()=>applyPalette(cur(),$('input[name=pm]:checked').value)}]});
}
function rampDialog(){
  const n=h('input',{type:'number',min:1,max:12,value:3,style:'width:70px','aria-label':'중간색 개수'});
  modal({title:'색 램프 만들기',body:h('div',{style:'display:flex;flex-direction:column;gap:8px'},h('p',{class:'hint',text:'주 색상과 보조 색상 사이를 고르게 나눈 중간색을 팔레트 끝에 추가합니다.'}),h('label',{class:'row2'},'중간색 개수',n)),
    actions:[{label:'취소'},{label:'추가',primary:true,onClick:()=>makeRamp(clamp(n.value|0,1,12))}]});
}
function helpDialog(){
  const mac=/Mac|iPhone|iPad/.test(navigator.platform||navigator.userAgent);
  const rows=[['연필 · 지우개 · 채우기 · 스포이드','B E G I'],['직선 · 사각형 · 원','L U O'],['사각 선택 · 마술봉 · 이동 · 화면 이동','M W V H'],['주/보조 색 바꾸기','X'],['브러시 크기','[ ]'],['화면 이동 (가운데 버튼 드래그도 가능)','Space + 드래그'],['확대 / 축소','휠 · \\+ −'],['화면에 맞춤','0'],['실행 취소 / 다시 실행','Ctrl+Z / Ctrl+Shift+Z'],['전체 선택 · 선택 해제','Ctrl+A · Esc'],['복사 / 새 레이어로 붙여넣기','Ctrl+C / Ctrl+V'],['선택 영역 지우기','Delete'],['이전 / 다음 프레임',', .'],['애니메이션 재생 / 정지','Enter'],['프로젝트 저장','Ctrl+S']];
  // every key gets its own keycap; '/', '·' and words such as 「드래그」 stay plain text
  const caps=spec=>h('span',{class:'kcaps'},spec.split(' ').flatMap(tok=>{
    if(tok==='/'||tok==='·') return [h('span',{text:tok})];
    if(/[가-힣]/.test(tok)) return [h('span',{text:tok})];
    if(tok==='+') return [h('span',{text:'+'})];
    if(tok==='\\+') return [h('kbd',{text:'+'})];   // a literal + key
    const keys=tok.length>1&&tok.includes('+')?tok.split('+'):[tok];
    return keys.map(k=>h('kbd',{text:mac?({Ctrl:'⌘',Shift:'⇧'}[k]||k):k}));
  }));
  modal({title:'단축키',body:h('div',{class:'keys'},rows.map(([d,k])=>h('div',{class:'krow'},h('span',{class:'kd',text:d}),caps(k))))});
}


/* ================= files: open / save / export ================= */
let downloads=null;
function base(){ return (doc.name||'dotlab').replace(/[\\/:*?"<>|]+/g,'').trim().slice(0,60)||'dotlab'; }
async function offerFiles(files){
  if(downloads){
    for(const f of files){
      try{ await downloads.save(f); }
      catch(e){ const c=e&&e.code;
        if(c==='declined') return;
        if(c==='rate_limited'){ toast('저장 확인 창이 이미 열려 있습니다. 잠시 후 다시 시도하세요.'); return; }
        if(['unavailable','not_granted','capability_disabled','capability_removed'].includes(c)){ downloads=null; return fallbackFiles(files); }
        toast('파일을 저장하지 못했습니다'+(c?` (${c})`:'')); return; }
    }
    toast(files.length>1?`${files.length}개 파일을 저장했습니다`:'저장했습니다: '+files[0].filename); return;
  }
  fallbackFiles(files);
}
// plain browser download, one file after another (Figma plugin and GitHub Pages builds)
async function anchorDownload(files){
  try{
    for(const f of files){
      const blob=f.data instanceof Blob?f.data:new Blob([f.data],{type:'application/octet-stream'}); const url=URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download=f.filename; document.body.append(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),5000); await new Promise(r=>setTimeout(r,350));
    }
    toast(files.length>1?`${files.length}개 파일을 내려받았습니다`:'내려받았습니다: '+files[0].filename);
  }catch(e){ fallbackFiles(files); }
}
function fallbackFiles(files){
  const body=h('div',{class:'fallback',style:'display:flex;flex-direction:column;gap:10px'},h('p',{class:'hint',text:'이 화면에서는 파일을 바로 내려받을 수 없습니다. 이미지는 길게 누르거나 오른쪽 클릭해 저장하고, 텍스트는 복사해 파일로 저장하세요.'}));
  for(const f of files){
    if(f.data instanceof Blob && /\.(png|gif)$/.test(f.filename)){ body.append(h('b',{text:f.filename}),h('img',{src:URL.createObjectURL(f.data),alt:f.filename})); }
    else { const ta=h('textarea',{readonly:true}); ta.value=typeof f.data==='string'?f.data:''; body.append(h('b',{text:f.filename}),ta,h('button',{class:'btn sm',text:'복사',onclick:async()=>{ try{ await navigator.clipboard.writeText(ta.value); toast('복사했습니다'); }catch(e){ ta.select(); toast('텍스트를 선택했습니다. Ctrl+C로 복사하세요.'); } }})); }
  }
  modal({title:'파일 저장',body,wide:true});
}
const toBlob=cv=>new Promise(r=>cv.toBlob(r,'image/png'));
function saveProject(){ offerFiles([{filename:base()+'.dotlab.json',data:serialize()}]); }
function scaledFrame(fi,s){ const cv=document.createElement('canvas'); cv.width=doc.w*s; cv.height=doc.h*s; const c=cv.getContext('2d'); c.imageSmoothingEnabled=false; c.drawImage(frameCanvas(fi),0,0,cv.width,cv.height); return cv; }
async function exportPNG(s){ offerFiles([{filename:`${base()}${doc.frames.length>1?'-'+(ui.frame+1):''}@${s}x.png`,data:await toBlob(scaledFrame(ui.frame,s))}]); }
async function exportSheet(s){
  const n=doc.frames.length, fw=doc.w*s, fh=doc.h*s; const cols=Math.min(n,Math.max(1,Math.floor(4096/fw))); const rows=Math.ceil(n/cols);
  const cv=document.createElement('canvas'); cv.width=fw*cols; cv.height=fh*rows; const c=cv.getContext('2d'); c.imageSmoothingEnabled=false;
  const frames=doc.frames.map((f,i)=>{ const x=(i%cols)*fw, y=Math.floor(i/cols)*fh; c.drawImage(frameCanvas(i),x,y,fw,fh); return {filename:`${base()} ${i}`,frame:{x,y,w:fw,h:fh},duration:f.dur}; });
  const json=JSON.stringify({frames,meta:{app:'DotLab',version:'1',image:`${base()}-sheet@${s}x.png`,format:'RGBA8888',size:{w:cv.width,h:cv.height},scale:String(s),frameTags:doc.tags.map(t=>({name:t.name,from:t.from,to:t.to,direction:t.dir,color:t.color+'ff'})),layers:doc.layers.map(L=>({name:L.name,opacity:Math.round(L.opacity*255)}))}},null,1);
  offerFiles([{filename:`${base()}-sheet@${s}x.png`,data:await toBlob(cv)},{filename:`${base()}-sheet@${s}x.json`,data:json}]);
}
function lzw(idx,minCode){
  const clear=1<<minCode, eoi=clear+1; let size=minCode+1, next=eoi+1, table=new Map(); const out=[]; let cur=0, bits=0;
  const emit=c=>{ cur|=c<<bits; bits+=size; while(bits>=8){ out.push(cur&255); cur>>>=8; bits-=8; } };
  emit(clear); let pre=idx[0];
  for(let i=1;i<idx.length;i++){ const k=idx[i]; const key=(pre<<8)|k; const code=table.get(key);
    if(code!==undefined){ pre=code; continue; }
    emit(pre);
    if(next===4096){ emit(clear); next=eoi+1; size=minCode+1; table=new Map(); }
    else { if(next>=(1<<size)) size++; table.set(key,next++); }
    pre=k; }
  emit(pre); emit(eoi); if(bits>0) out.push(cur&255); return out;
}
function encodeGIF(W,H,colors,frames){
  let k=1; while((1<<k)<colors.length) k++; const size=1<<k; const out=[]; const w16=v=>out.push(v&255,(v>>8)&255); const str=s=>{ for(const ch of s) out.push(ch.charCodeAt(0)); };
  str('GIF89a'); w16(W); w16(H); out.push(0x80|((k-1)<<4)|(k-1),0,0);
  for(let i=0;i<size;i++){ const c=colors[i]||[0,0,0]; out.push(c[0],c[1],c[2]); }
  out.push(0x21,0xFF,0x0B); str('NETSCAPE2.0'); out.push(3,1,0,0,0);
  const minCode=Math.max(2,k);
  for(const f of frames){
    out.push(0x21,0xF9,4,(2<<2)|1); w16(f.delay); out.push(0,0);
    out.push(0x2C); w16(0); w16(0); w16(W); w16(H); out.push(0);
    out.push(minCode); const data=lzw(f.idx,minCode);
    for(let i=0;i<data.length;i+=255){ const n=Math.min(255,data.length-i); out.push(n); for(let j=0;j<n;j++) out.push(data[i+j]); }
    out.push(0);
  }
  out.push(0x3B); return new Uint8Array(out);
}
function buildGIF(s,seq){
  const {w,h:H}=doc, W=w*s, HH=H*s; const colors=[[0,0,0],...palRGB]; const km=new Map(); palRGB.forEach((c,i)=>{ const key=(c[0]<<16)|(c[1]<<8)|c[2]; if(!km.has(key)) km.set(key,i+1); });
  const order=seq||doc.frames.map((_,i)=>i); const cache=new Map();
  const frames=order.map(fi=>{ const f=doc.frames[fi]; if(cache.has(fi)) return {idx:cache.get(fi),delay:Math.max(2,Math.round(f.dur/10))}; const rgba=composite(fi); const idx=new Uint8Array(W*HH); cache.set(fi,idx);
    for(let y=0;y<H;y++) for(let x=0;x<w;x++){ const j=(y*w+x)*4; let v=0;
      if(rgba[j+3]>=128){ const key=(rgba[j]<<16)|(rgba[j+1]<<8)|rgba[j+2]; v=km.get(key); if(v===undefined){ v=nearestIdx([rgba[j],rgba[j+1],rgba[j+2]],palRGB)+1; km.set(key,v); } }
      if(v) for(let yy=0;yy<s;yy++){ const row=(y*s+yy)*W+x*s; idx.fill(v,row,row+s); } }
    return {idx,delay:Math.max(2,Math.round(f.dur/10))}; });
  return encodeGIF(W,HH,colors,frames);
}
function exportGIF(s,tagIdx){ const t=tagIdx>=0?doc.tags[tagIdx]:null; const seq=t?playSequence({from:t.from,to:Math.min(t.to,doc.frames.length-1),dir:t.dir}):null; offerFiles([{filename:`${base()}${t?'-'+t.name:''}@${s}x.gif`,data:new Blob([buildGIF(s,seq)],{type:'image/gif'})}]); }
function exportPalette(){ offerFiles([{filename:base()+'-palette.txt',data:doc.palette.map(c=>c.slice(1)).join('\n')+'\n'}]); }
function exportDialog(pre){
  const maxS=Math.max(1,Math.floor(2048/Math.max(doc.w,doc.h)));
  const sc=h('select',{'aria-label':'배율'},[1,2,4,8,16,32].filter(s=>s<=Math.max(1,maxS)||s===1).map(s=>h('option',{value:s,text:`${s}× (${doc.w*s}×${doc.h*s})`,selected:s===Math.min(8,maxS)})));
  const anim=doc.frames.length>1, compFirst=!!doc.comp&&(pre==='component'||ui.mode==='comp');
  const gr=h('select',{'aria-label':'GIF 범위'},h('option',{value:-1,text:'전체 프레임'}),doc.tags.map((t,k)=>h('option',{value:k,text:`태그 「${t.name}」 (${t.from+1}–${t.to+1})`,selected:k===ui.playTag})));
  const opt=(v,t,d,c)=>h('label',{class:'opt'},h('input',{type:'radio',name:'ex',value:v,checked:!!c}),h('div',null,h('b',{text:t}),h('span',{text:d})));
  modal({title:'내보내기',body:h('div',{style:'display:flex;flex-direction:column;gap:10px'},
      h('div',{class:'optlist'},
        doc.comp?opt('component','UI 컴포넌트 (상태별 PNG + 9-slice JSON + CSS)',`상태 ${doc.frames.length}개를 각각 PNG로, 늘어날 여백(9-slice)을 게임 엔진용 JSON과 CSS border-image로 저장합니다. 호버·누름·비활성 같은 상태 이름은 CSS 선택자로 이어집니다.`,compFirst):null,
        opt('png','PNG 이미지',`현재 프레임(${ui.frame+1}번)을 보간 없이 확대해 저장합니다. 투명 배경을 유지합니다.`,!anim&&!compFirst),
        opt('gif','GIF 애니메이션',`프레임 ${doc.frames.length}개와 프레임별 지속시간을 담아 반복 재생합니다.`,anim&&!compFirst),
        opt('sheet','스프라이트 시트 + JSON','모든 프레임을 한 장에 배치하고, 게임 엔진에서 읽는 프레임 좌표와 태그 JSON(Aseprite 형식)을 함께 저장합니다.'),
        opt('aseprite','Aseprite 파일 (.aseprite)','레이어·프레임·태그·링크 셀·팔레트를 그대로 담아 Aseprite에서 이어서 작업할 수 있습니다. 배율은 적용되지 않습니다.'),
        opt('timelapse','타임랩스 GIF',TL.snaps.length>2?`이 작업을 연 뒤부터 기록한 과정 ${TL.snaps.length}단계를 짧은 GIF로 만듭니다. AI가 만든 단계에는 왼쪽 위에 AI 표시가 붙습니다.`:'아직 기록된 과정이 거의 없습니다. 그림을 그리면 단계마다 자동으로 기록됩니다.'),
        opt('project','프로젝트 파일 (.dotlab.json)','레이어·프레임·팔레트를 그대로 보존합니다. 열기로 다시 불러올 수 있습니다.'),
        opt('palette','팔레트 (.txt)','한 줄에 색 하나씩 적은 hex 목록입니다.')),
      h('label',{class:'row2',style:'color:var(--muted)'},'배율 ',sc),
      doc.tags.length?h('label',{class:'row2',style:'color:var(--muted)'},'GIF 범위 ',gr):null),
    actions:[{label:'취소'},{label:'내보내기',primary:true,onClick:()=>{ const v=$('input[name=ex]:checked').value, s=+sc.value;
      if(v==='component') exportComponent(s); else if(v==='png') exportPNG(s); else if(v==='gif') exportGIF(s,+gr.value); else if(v==='sheet') exportSheet(s); else if(v==='aseprite') exportAseprite(); else if(v==='timelapse') exportTimelapse(s); else if(v==='project') saveProject(); else exportPalette(); }}]});
}
function readText(f){ return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(String(r.result)); r.onerror=()=>rej(r.error); r.readAsText(f); }); }
function loadImageFile(f){ return new Promise((res,rej)=>{ const url=URL.createObjectURL(f); const im=new Image(); im.onload=()=>res(im); im.onerror=()=>rej(new Error('이미지를 읽을 수 없습니다')); im.src=url; }); }
async function handleFile(f){
  if(!f) return; const n=f.name.toLowerCase();
  try{
    if(n.endsWith('.json')){ const o=JSON.parse(await readText(f)); if(o&&o.format==='dotlab-library'){ libImport(o); return; } const nd=deserialize(o); replaceDoc(nd); toast('프로젝트를 열었습니다: '+nd.name); }
    else if(/\.(hex|gpl|txt)$/.test(n)){ const cols=parsePaletteText(await readText(f)); if(!cols.length) throw new Error('파일에서 색을 찾지 못했습니다'); presetDialog(cols,`팔레트 가져오기 (${cols.length}색)`); }
    else if(f.type.startsWith('image/')||/\.(png|jpe?g|gif|webp|bmp)$/.test(n)){ showTab('pConv'); await setConvImage(f); }
    else if(n.endsWith('.aseprite')||n.endsWith('.ase')){ const r=await asepriteToDoc(new Uint8Array(await f.arrayBuffer()),f.name.replace(/\.(aseprite|ase)$/i,'')); replaceDoc(r.doc); toast(`Aseprite 파일을 열었습니다: ${r.doc.w}×${r.doc.h} · 레이어 ${r.doc.layers.length} · 프레임 ${r.doc.frames.length}`+(r.warnings.length?'. '+r.warnings.join(' · '):'')); }
    else toast('열 수 없는 파일 형식입니다');
  }catch(e){ toast(e.message||'파일을 열지 못했습니다'); }
}

async function setRefImage(src){ ref.img=src instanceof HTMLImageElement?src:await loadImageFile(src); ref.visible=true; $('#refVis').checked=true; $('#refDel').disabled=false; requestDraw(); renderXfer(); }
function tagDialog(idx){
  const t=idx!=null?doc.tags[idx]:{name:`태그 ${doc.tags.length+1}`,from:ui.frame,to:ui.frame,dir:'forward',color:TAGCOLORS[doc.tags.length%TAGCOLORS.length]};
  const N=doc.frames.length;
  const nm=h('input',{value:t.name,'aria-label':'태그 이름',maxlength:40});
  const fr=h('input',{type:'number',min:1,max:N,value:t.from+1,style:'width:70px','aria-label':'시작 프레임'}), to=h('input',{type:'number',min:1,max:N,value:t.to+1,style:'width:70px','aria-label':'끝 프레임'});
  const dir=h('select',{'aria-label':'재생 방향'},[['forward','정방향'],['reverse','역방향'],['pingpong','핑퐁 (갔다가 돌아오기)'],['pingpong_reverse','역방향 핑퐁 (끝에서 시작해 돌아오기)']].map(([v,l])=>h('option',{value:v,text:l,selected:v===t.dir})));
  let color=t.color; const sw=h('div',{class:'swrow',role:'radiogroup','aria-label':'태그 색'});
  const paint=()=>{ sw.textContent=''; for(const c of TAGCOLORS) sw.append(h('button',{class:'tagsw'+(c===color?' on':''),style:'background:'+c,'aria-label':c,'aria-pressed':String(c===color),onclick:()=>{ color=c; paint(); }})); }; paint();
  const actions=[{label:'취소'},{label:'저장',primary:true,onClick:()=>{ let a=clamp(fr.value|0,1,N)-1, b=clamp(to.value|0,1,N)-1; if(b<a) [a,b]=[b,a]; saveTag({name:nm.value.trim().slice(0,40)||'태그',from:a,to:b,dir:dir.value,color},idx); }}];
  if(idx!=null) actions.unshift({label:'태그 삭제',danger:true,onClick:()=>deleteTag(idx)});
  modal({title:idx!=null?'태그 편집':'새 태그',body:h('div',{style:'display:flex;flex-direction:column;gap:10px'},
    h('label',{class:'row2',style:'color:var(--muted)'},'이름 ',nm),
    h('div',{class:'row2'},h('label',null,'프레임 ',fr),'부터',h('label',null,to),'까지'),
    h('label',{class:'row2',style:'color:var(--muted)'},'재생 방향 ',dir),
    h('div',{class:'row2',style:'color:var(--muted)'},'색 ',sw),
    h('p',{class:'hint',text:'태그는 "걷기", "공격"처럼 프레임 구간에 이름을 붙입니다. 재생과 GIF 내보내기에서 태그 구간만 고를 수 있고, 스프라이트 시트 JSON과 Aseprite 파일에도 그대로 들어갑니다.'})),actions});
}
