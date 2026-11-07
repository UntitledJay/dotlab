/* ================= Figma plugin bridge (overrides the web build's storage, files and AI) ================= */
const FG={init:null,linkedId:null,linkedName:'',selection:null,resolve:null};
function toMain(msg){ try{ parent.postMessage({pluginMessage:msg},'*'); }catch(e){} }
window.addEventListener('message',e=>{ const m=e.data&&e.data.pluginMessage; if(m&&m.type) onMain(m); });
function onMain(m){
  if(m.type==='init'){ FG.init=m; if(FG.resolve) FG.resolve(); }
  else if(m.type==='selection'){ FG.selection=m; renderFgSel(); }
  else if(m.type==='import-image'){
    const f=new File([new Blob([m.bytes],{type:'image/png'})],(m.name||'Figma 레이어')+'.png',{type:'image/png'});
    showTab('pConv'); setConvImage(f).then(()=>toast('선택한 레이어를 가져왔습니다. 격자를 확인한 뒤 「새 캔버스로 열어 수정」을 누르세요.')).catch(err=>toast(err.message));
  }
  else if(m.type==='open-project'){
    try{ const nd=deserialize(JSON.parse(m.data)); replaceDoc(nd); FG.linkedId=m.nodeId; FG.linkedName=m.name||nd.name; renderFgSel(); toast('도트랩 개체를 열었습니다. 고친 뒤 「Figma에 넣기」로 원래 자리에 교체하세요.'); }
    catch(err){ toast('이 개체의 도트랩 데이터를 읽지 못했습니다'); }
  }
  else if(m.type==='inserted'){ FG.linkedId=m.nodeId; FG.linkedName=m.name; renderFgSel(); toast(m.updated?'Figma 개체를 교체했습니다':'Figma 캔버스에 넣었습니다'); }
  else if(m.type==='error'){ toast(m.text); }
}

/* storage: figma.clientStorage through the main thread */
function scheduleSave(){ clearTimeout(saveT); saveT=setTimeout(()=>{ try{ toMain({type:'autosave',data:serialize()}); }catch(e){} },800); }
function loadAutosave(){ try{ const s=FG.init&&FG.init.autosave; return s?deserialize(JSON.parse(s)):null; }catch(e){ return null; } }

/* files: plain browser download inside the plugin window */
async function offerFiles(files){
  try{
    for(const f of files){
      const blob=f.data instanceof Blob?f.data:new Blob([f.data],{type:'application/octet-stream'}); const url=URL.createObjectURL(blob);
      const a=document.createElement('a'); a.href=url; a.download=f.filename; document.body.append(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),5000); await new Promise(r=>setTimeout(r,350));
    }
    toast(files.length>1?`${files.length}개 파일을 내려받았습니다`:'내려받았습니다: '+files[0].filename);
  }catch(e){ fallbackFiles(files); }
}

/* AI: Anthropic Messages API with the user's own key, streamed */
const MODELS={quick:'claude-haiku-4-5-20251001',default:'claude-sonnet-5-5',complex:'claude-opus-5-5'};
let apiKey='';
Object.assign(AIERR,{no_key:'먼저 Anthropic API 키를 입력하세요.',auth:'API 키가 올바르지 않습니다. 키를 다시 확인하세요.',bad_model:'이 키로 쓸 수 없는 모델입니다. 품질을 다른 단계로 바꿔 보세요.',billing:'API 계정의 크레딧이 부족합니다.',network:'api.anthropic.com에 연결하지 못했습니다. 인터넷 연결을 확인하세요.'});
function parseLooseJSON(t){
  try{ return JSON.parse(t); }catch(e){}
  const m=t.match(/```(?:json)?\s*([\s\S]*?)```/); if(m){ try{ return JSON.parse(m[1]); }catch(e){} }
  const a=t.search(/[[{]/), b=Math.max(t.lastIndexOf('}'),t.lastIndexOf(']')); if(a>=0&&b>a){ try{ return JSON.parse(t.slice(a,b+1)); }catch(e){} }
  throw {code:'invalid_json',text:t};
}
async function claudeCall(prompt,opts){
  opts=opts||{}; if(!apiKey){ $('#keyBox').open=true; $('#apiKey').focus(); throw {code:'no_key'}; }
  let res;
  try{
    res=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',signal:opts.signal,
      headers:{'content-type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:MODELS[opts.modelTier]||MODELS.default,max_tokens:8000,stream:true,messages:[{role:'user',content:prompt+'\n\nA program parses your reply, so output only the JSON value.'}]})});
  }catch(e){ if(e&&e.name==='AbortError') throw {code:'cancelled'}; throw {code:'network'}; }
  if(!res.ok){
    let body=''; try{ body=await res.text(); }catch(e){}
    const c=res.status===401||res.status===403?'auth':res.status===429?'rate_limited':res.status===404||(res.status===400&&/model/i.test(body))?'bad_model':(res.status===400&&/credit|balance|billing/i.test(body))?'billing':'upstream_error';
    throw {code:c,message:body};
  }
  const reader=res.body.getReader(), dec=new TextDecoder(); let buf='', text='', stop=null;
  try{
    for(;;){ const {done,value}=await reader.read(); if(done) break; buf+=dec.decode(value,{stream:true}); let i;
      while((i=buf.indexOf('\n'))>=0){ const line=buf.slice(0,i).trim(); buf=buf.slice(i+1); if(!line.startsWith('data:')) continue; let ev; try{ ev=JSON.parse(line.slice(5)); }catch(e){ continue; }
        if(ev.type==='content_block_delta'&&ev.delta&&ev.delta.type==='text_delta'){ text+=ev.delta.text; if(opts.onText) try{ opts.onText({text,delta:ev.delta.text}); }catch(e){} }
        else if(ev.type==='message_delta'&&ev.delta) stop=ev.delta.stop_reason;
        else if(ev.type==='error') throw {code:'upstream_error',text}; } }
  }catch(e){ if(e&&e.name==='AbortError') throw {code:'cancelled',text}; throw (e&&e.code)?e:{code:'upstream_error',text}; }
  if(!text.trim()) throw {code:'empty_completion'};
  return {text,truncated:stop==='max_tokens'};
}
const claudeShim=Object.assign((p,o)=>claudeCall(p,o),{json:async(p,o)=>parseLooseJSON((await claudeCall(p,o)).text)});
function updKeyUI(){
  $('#apiKey').value=''; $('#apiKey').placeholder=apiKey?`저장된 키 …${apiKey.slice(-4)}`:'sk-ant-로 시작하는 키';
  $('#apiKeyDel').hidden=!apiKey; $('#keyBox').open=!apiKey;
  const n=$('#aiNote'); n.hidden=false;
  n.textContent=apiKey?'Claude가 현재 팔레트로 도트를 직접 그립니다. 요청 비용은 입력한 API 키의 계정에 청구됩니다.':'AI 생성을 쓰려면 아래에 Anthropic API 키를 입력하세요. 에디터, 이미지 변환, Figma 넣기·가져오기는 키 없이 쓸 수 있습니다.';
}
async function initCapabilities(){ sample=claudeShim; downloads=null; aiOff=false; apiKey=(FG.init&&FG.init.apiKey)||''; updKeyUI(); aiBusy(false); }

/* Figma canvas: insert, update, import */
function xmlEsc(s){ return String(s).replace(/[<>&"']/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#39;'}[c])); }
function frameSVG(fi,s){
  const {w,h:H}=doc; const groups=[], names=[];
  for(const L of doc.layers){
    if(!L.visible) continue; const c=doc.frames[fi].cels[L.id]; if(!c) continue;
    const byColor=new Map(); const add=(v,x,y,n)=>{ if(!byColor.has(v)) byColor.set(v,[]); byColor.get(v).push(`M${x*s} ${y*s}h${n*s}v${s}h-${n*s}z`); };
    const val=(x,y)=>{ const i=y*w+x, v=c[i]; if(v) return v; if(L.outline&&((x>0&&c[i-1])||(x<w-1&&c[i+1])||(y>0&&c[i-w])||(y<H-1&&c[i+w]))) return L.outline; return 0; };
    for(let y=0;y<H;y++){ let x=0; while(x<w){ const v=val(x,y); let n=1; while(x+n<w&&val(x+n,y)===v) n++; if(v&&doc.palette[v-1]) add(v,x,y,n); x+=n; } }
    if(!byColor.size) continue;
    const paths=[...byColor].sort((a,b)=>a[0]-b[0]).map(([v,d])=>`<path fill="${doc.palette[v-1]}" d="${d.join('')}"/>`).join('');
    groups.push(`<g id="${xmlEsc(L.name)}"${L.opacity<1?` opacity="${L.opacity}"`:''}>${paths}</g>`); names.push(L.name);
  }
  return {svg:`<svg xmlns="http://www.w3.org/2000/svg" width="${w*s}" height="${H*s}" viewBox="0 0 ${w*s} ${H*s}" shape-rendering="crispEdges">${groups.join('')}</svg>`,layerNames:names};
}
function figmaInsertDialog(){
  const maxS=Math.max(1,Math.floor(4096/Math.max(doc.w,doc.h)));
  const sc=h('select',{'aria-label':'배율'},[1,2,4,8,16,32].filter(s=>s<=maxS).map(s=>h('option',{value:s,text:`${s}× (${doc.w*s}×${doc.h*s})`,selected:s===Math.min(maxS,Math.max(1,Math.round(256/Math.max(doc.w,doc.h))))})));
  const opt=(name,v,t,d,c)=>h('label',{class:'opt'},h('input',{type:'radio',name,value:v,checked:!!c}),h('div',null,h('b',{text:t}),h('span',{text:d})));
  const anim=doc.frames.length>1;
  const styles=h('input',{type:'checkbox'}); const repl=h('input',{type:'checkbox',checked:!!FG.linkedId}); const asComp=h('input',{type:'checkbox',checked:!!doc.comp});
  modal({title:'Figma에 넣기',body:h('div',{style:'display:flex;flex-direction:column;gap:10px'},
      h('div',{class:'optlist'},
        opt('fm','vector','벡터 (편집 가능)','레이어마다 그룹, 색마다 도형 하나로 만듭니다. Figma에서 색을 바꾸거나 다른 크기로 키워도 선명합니다.',true),
        opt('fm','image','PNG 이미지','픽셀을 그대로 담은 이미지 한 장입니다. 레이어가 가볍고 빠릅니다.')),
      anim?h('div',{class:'optlist'},opt('ff','cur','현재 프레임만',`${ui.frame+1}번 프레임 하나를 넣습니다.`,true),opt('ff','all','모든 프레임',`프레임 ${doc.frames.length}개를 가로로 나란히 담은 프레임으로 넣습니다.`)):null,
      h('label',{class:'row2',style:'color:var(--muted)'},'배율 ',sc),
      doc.comp?h('label',{class:'row2 chk',title:'상태마다 변형(Variant)을 가진 컴포넌트 세트로 넣습니다. 9-slice 여백은 컴포넌트 설명에 적힙니다.'},asComp,`컴포넌트로 넣기 (상태 ${doc.frames.length}개 → 변형)`):null,
      h('label',{class:'row2 chk'},styles,'팔레트를 Figma 색 스타일로 저장'),
      FG.linkedId?h('label',{class:'row2 chk'},repl,`연결된 개체 「${FG.linkedName||'도트랩'}」를 이 결과로 교체`):null,
      h('p',{class:'hint',text:'넣은 개체에는 도트랩 데이터가 함께 저장됩니다. 나중에 선택하고 「선택 편집」을 누르면 레이어와 프레임 그대로 다시 열립니다.'})),
    actions:[{label:'취소'},{label:'넣기',primary:true,onClick:()=>figmaInsert({mode:$('input[name=fm]:checked').value,asComponents:!!doc.comp&&asComp.checked,all:anim&&$('input[name=ff]:checked').value==='all',scale:+sc.value,styles:styles.checked,replace:repl.checked&&!!FG.linkedId})}]});
}
async function figmaInsert(o){
  const comp=!!o.asComponents&&!!doc.comp; const list=o.all||comp?doc.frames.map((_,i)=>i):[ui.frame]; const frames=[];
  for(const fi of list){
    if(o.mode==='vector') frames.push(frameSVG(fi,o.scale));
    else { const blob=await toBlob(scaledFrame(fi,o.scale)); frames.push({png:new Uint8Array(await blob.arrayBuffer())}); }
  }
  toMain({type:'insert',mode:o.mode,name:doc.name,w:doc.w*o.scale,h:doc.h*o.scale,frames,frameNames:list.map(i=>comp?`상태=${stateName(i)}`:list.length>1?`${doc.name} · ${i+1}`:doc.name),asComponents:comp,
    note:comp?compNote():null,project:serialize(),replaceId:o.replace?FG.linkedId:null,palette:o.styles?doc.palette.slice():null});
  toast('Figma에 넣는 중…');
}
function renderFgSel(){
  const s=FG.selection, el=$('#fgSel'), b=$('#bFgImport'); if(!el) return;
  if(!s||!s.count){ el.textContent='Figma 선택 없음'; b.disabled=true; b.textContent='선택 가져오기'; }
  else { el.textContent=`Figma 선택: ${s.name}${s.count>1?` 외 ${s.count-1}개`:''}`; b.disabled=false; b.textContent=s.dotlab?'선택 편집':'선택 가져오기'; b.title=s.dotlab?'도트랩으로 만든 개체를 레이어·프레임 그대로 다시 엽니다':'선택한 레이어를 이미지로 가져와 도트로 변환합니다'; }
}
function initFigmaUI(){
  $('#bFgInsert').onclick=figmaInsertDialog;
  $('#bFgImport').onclick=()=>{ toMain({type:'import-selection'}); };
  $('#apiKeySave').onclick=()=>{ const k=$('#apiKey').value.trim(); if(!/^sk-ant-/.test(k)){ toast('sk-ant-로 시작하는 Anthropic API 키를 입력하세요'); return; } apiKey=k; toMain({type:'set-key',key:k}); updKeyUI(); toast('API 키를 저장했습니다'); };
  $('#apiKey').addEventListener('keydown',e=>{ if(e.key==='Enter') $('#apiKeySave').click(); });
  $('#apiKeyDel').onclick=()=>{ apiKey=''; toMain({type:'set-key',key:''}); updKeyUI(); toast('API 키를 지웠습니다'); };
  const rz=$('#resizer'); let st=null;
  rz.addEventListener('pointerdown',e=>{ rz.setPointerCapture(e.pointerId); st={x:e.clientX,y:e.clientY,w:window.innerWidth,h:window.innerHeight}; });
  rz.addEventListener('pointermove',e=>{ if(!st) return; toMain({type:'resize',w:Math.max(720,Math.round(st.w+e.clientX-st.x)),h:Math.max(520,Math.round(st.h+e.clientY-st.y))}); });
  rz.addEventListener('pointerup',()=>{ st=null; });
  renderFgSel();
}
function boot(){
  let started=false; const go=()=>{ if(started) return; started=true; init(); initFigmaUI(); };
  FG.resolve=go; toMain({type:'ready'}); setTimeout(go,2000);
}
