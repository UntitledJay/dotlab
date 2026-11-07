/* ================= AI (Claude via sample capability) ================= */
let sample=null, aiCtl=null, aiRunning=false, aiOff=false;
const cands=[]; let candSeq=1;
const STYLES={char:'game character sprite, front-facing, full body, cute compact proportions',side:'game character sprite, side view facing right, full body',item:'single item icon, centered, slightly angled for depth',monster:'monster or enemy sprite for a game, full body, appealing silhouette',tile:'seamless terrain/background tile that fills the whole square edge to edge and repeats without visible seams',icon:'simple bold emoji-like icon',free:'pixel art illustration'};
function aiSizes(){ const m=Math.min(doc.w,doc.h); const o=[8,12,16,24,32,48,64].filter(s=>s<=m).map(s=>[s,s]); if((doc.w!==doc.h||!o.length)&&doc.w<=64&&doc.h<=64) o.push([doc.w,doc.h]); return o; }
function renderAISize(){
  const sel=$('#aiSize'); const prev=sel.value; sel.textContent=''; const o=aiSizes();
  if(!o.length){ sel.append(h('option',{value:'',text:'캔버스가 64px보다 작아야 합니다'})); renderAIHints(); return; }
  for(const [w,hh] of o) sel.append(h('option',{value:`${w}x${hh}`,text:w===doc.w&&hh===doc.h?`${w}×${hh} (캔버스 전체)`:`${w}×${hh}`}));
  if([...sel.options].some(op=>op.value===prev)) sel.value=prev; else { const d=[...o].reverse().find(([w])=>w<=32)||o[0]; sel.value=`${d[0]}x${d[1]}`; }
  renderAIHints();
}
function renderAIHints(){ const n=Math.min(doc.palette.length,MAXPAL); $('#aiPalHint').textContent=`현재 팔레트의 ${n}색만 사용해 그립니다. 결과는 그리드에 딱 맞는 인덱스 픽셀이라 바로 손으로 다듬을 수 있습니다.`; }
function renderEditHint(){ const b=selBBox(); $('#editHint').textContent=b?`선택한 ${b.w}×${b.h} 영역만 다시 그립니다. 주변 픽셀과 이어지도록 맞춥니다.`:'선택 도구로 영역을 고르면 그 부분만 다시 그립니다. 선택이 없으면 그림 전체를 지시대로 고칩니다.'; }
function setAIStatus(t){ $('#aiStatus').textContent=t; }
function aiBusy(b){ aiRunning=b; $('#aiStop').hidden=!b; for(const id of ['#aiGo','#aiEditGo','#palGo']) $(id).disabled=b||aiOff||!sample; }
function aiDisable(msg){ aiOff=true; const n=$('#aiNote'); n.hidden=false; n.textContent=msg; aiBusy(false); }
const AIERR={rate_limited:'요청이 많습니다. 잠시 후 다시 시도하세요.',refused:'이 요청은 그릴 수 없습니다. 다른 설명으로 시도해 보세요.',invalid_json:'결과 형식을 읽지 못했습니다. 다시 시도하세요.',empty_completion:'결과가 비어 있습니다. 설명을 더 구체적으로 적어 보세요.',session_expired:'로그인이 만료되었습니다. 다시 로그인한 뒤 시도하세요.',prompt_too_large:'그림이 너무 커서 보낼 수 없습니다. 더 작은 영역을 선택하세요.'};
function aiError(e){
  const c=e&&e.code;
  if(c==='cancelled'){ setAIStatus('중지했습니다'); return; }
  if(['not_granted','sampling_disabled','not_declared','capability_disabled','capability_removed'].includes(c)){ aiDisable(c==='not_granted'?'Claude 사용을 허용하지 않아 AI 기능이 꺼졌습니다. 페이지 권한 메뉴에서 허용하면 다시 쓸 수 있습니다. 에디터와 이미지 변환은 그대로 쓸 수 있습니다.':'이 계정에서는 AI 기능을 쓸 수 없습니다. 에디터와 이미지 변환은 그대로 쓸 수 있습니다.'); setAIStatus(''); return; }
  setAIStatus(AIERR[c]||'연결 문제로 실패했습니다. 다시 시도하세요.');
}
function palSpec(){ return doc.palette.slice(0,MAXPAL).map((c,i)=>`${CH[i]} = ${c} (${colorName(c)})`).join('\n'); }
function rowsToData(rows,W,H){
  const d=new Uint8Array(W*H); const n=Math.min(doc.palette.length,MAXPAL);
  for(let y=0;y<Math.min(H,rows.length);y++){ let r=String(rows[y]); if(r.length>W) r=r.replace(/\s+/g,'');
    for(let x=0;x<Math.min(W,r.length);x++){ const k=CH.indexOf(r[x]); if(k>=0&&k<n) d[y*W+x]=k+1; } }
  return d;
}
function partialRows(text){ const i=text.indexOf('"rows"'); if(i<0) return []; return [...text.slice(i+6).matchAll(/"([^"\\\n]*)"/g)].map(m=>m[1]); }
function gridRows(fi,x0,y0,W,H){
  const rgba=composite(fi); const cache=new Map(); const rows=[]; const n=Math.min(palRGB.length,MAXPAL); const pal=palRGB.slice(0,n);
  for(let y=y0;y<y0+H;y++){ let s=''; for(let x=x0;x<x0+W;x++){ const j=(y*doc.w+x)*4; if(rgba[j+3]<128){ s+='.'; continue; } const key=(rgba[j]<<16)|(rgba[j+1]<<8)|rgba[j+2]; let c=cache.get(key); if(c===undefined){ c=CH[nearestIdx([rgba[j],rgba[j+1],rgba[j+2]],pal)]; cache.set(key,c); } s+=c; } rows.push(s); }
  return rows;
}
function addCand(c){ c.id=candSeq++; cands.unshift(c); while(cands.length>4){ const i=cands.map(x=>!x.pending).lastIndexOf(true); if(i<0) break; cands.splice(i,1); } renderCands(); return c; }
function drawCand(c){
  const cv=document.querySelector(`canvas[data-cand="${c.id}"]`); if(!cv) return; cv.width=c.w; cv.height=c.h; const id=new ImageData(c.w,c.h);
  for(let i=0;i<c.data.length;i++){ const v=c.data[i]; const rgb=v&&palRGB[v-1]; if(rgb) id.data.set([rgb[0],rgb[1],rgb[2],255],i*4); }
  cv.getContext('2d').putImageData(id,0,0);
}
function renderCands(){
  const box=$('#cands'); box.textContent='';
  if(!cands.length){ box.append(h('p',{class:'empty',text:'생성한 후보가 여기에 최대 4개까지 쌓입니다. 마음에 드는 후보를 레이어로 넣은 뒤 연필로 다듬으세요.'})); return; }
  for(const c of cands){
    const cv=h('canvas',{class:'checker','data-cand':c.id,width:c.w,height:c.h});
    const acts=c.pending?[h('span',{class:'status-txt',text:c.status||'그리는 중…'})]:[
      h('button',{class:'btn sm primary',text:'새 레이어',title:'새 레이어로 넣기',onclick:()=>candToLayer(c)}),
      c.kind==='edit'?h('button',{class:'btn sm',text:'현재 레이어에 적용',onclick:()=>candApply(c)}):null,
      h('button',{class:'btn sm ghost',text:'삭제','aria-label':'후보 삭제',onclick:()=>{ cands.splice(cands.indexOf(c),1); renderCands(); }})];
    box.append(h('div',{class:'cand'+(c.pending?' pending':'')},cv,h('span',{class:'cl',title:c.label,text:c.label}),h('div',{class:'ca'},acts)));
    drawCand(c);
  }
}
function place(cl,c,overwrite){ for(let y=0;y<c.h;y++) for(let x=0;x<c.w;x++){ const dx=c.x+x, dy=c.y+y; if(dx<0||dy<0||dx>=doc.w||dy>=doc.h) continue; if(c.mask&&!c.mask[y*c.w+x]) continue; let v=c.data[y*c.w+x]; if(v>doc.palette.length) v=0; if(v||overwrite) cl[dy*doc.w+dx]=v; } }
function candToLayer(c){ TL.mark='ai'; docChange(()=>{ const id=nextId++; const at=ui.layer+1; doc.layers.splice(at,0,mkLayer(id,('AI · '+c.label).slice(0,28))); for(const f of doc.frames) f.cels[id]=new Uint8Array(doc.w*doc.h); place(doc.frames[ui.frame].cels[id],c,false); ui.layer=at; }); toast('새 레이어로 넣었습니다. 연필로 바로 다듬을 수 있습니다.'); }
function candApply(c){ if(!canEdit()) return; TL.mark='ai'; beginEdit(); place(cel(),c,true); endEdit(); toast('현재 레이어에 적용했습니다. Ctrl+Z로 되돌릴 수 있습니다.'); }
async function runAI(prompt,c,tier){
  aiBusy(true); aiCtl=new AbortController(); setAIStatus('생각하는 중… (보통 10~60초)'); c.status='생각하는 중…'; renderCands();
  try{
    const val=await sample.json(prompt,{modelTier:tier,cache:false,signal:aiCtl.signal,onText:({text})=>{ const rows=partialRows(text); if(rows.length){ if(c.status!=='그리는 중…'){ c.status='그리는 중…'; renderCands(); } setAIStatus(`그리는 중… ${Math.min(rows.length,c.h)}/${c.h}줄`); c.data=rowsToData(rows,c.w,c.h); drawCand(c); } }});
    const rows=Array.isArray(val?.rows)?val.rows:Array.isArray(val)?val:null; if(!rows) throw {code:'invalid_json'};
    c.data=rowsToData(rows,c.w,c.h); c.pending=false; renderCands();
    if(!c.data.some(v=>v)) setAIStatus('결과가 비어 있습니다. 설명을 바꿔 다시 시도하세요.'); else setAIStatus('완료. 후보를 레이어로 넣어 다듬으세요.');
  }catch(e){
    if(c.data.some(v=>v)&&e?.code!=='refused'){ c.pending=false; c.label+=' (중단됨)'; } else { const ci=cands.indexOf(c); if(ci>=0) cands.splice(ci,1); }
    renderCands(); aiError(e);
  }finally{ aiBusy(false); }
}
function aiGenerate(){
  if(aiRunning||!sample) return; const q=$('#aiPrompt').value.trim(); if(!q){ toast('무엇을 그릴지 적어 주세요'); $('#aiPrompt').focus(); return; }
  const sz=$('#aiSize').value; if(!sz){ toast('AI 생성은 64×64 이하 캔버스에서 쓸 수 있습니다'); return; }
  const [W,H]=sz.split('x').map(Number); const style=$('#aiStyle').value, tile=style==='tile', outline=$('#aiOutline').checked, bg=$('#aiBg').checked;
  const prompt=[`You are an expert pixel artist. Draw a ${W}x${H} pixel art image as a character grid.`,`Subject (the request may be in Korean): ${q}`,`Style: ${STYLES[style]}`,'',
    'Palette. Use ONLY these characters, one character per pixel:','. = transparent',palSpec(),'','Rules:',
    `- Exactly ${H} rows, and every row exactly ${W} characters.`,
    '- Real hand-made pixel art: a strong readable silhouette, deliberate color clusters, 2-4 shades per material, a consistent light source from the top-left, no noise and no stray single pixels.',
    outline&&!tile?'- Give the subject a clean 1-pixel outline in the darkest suitable palette color.':'- Do not add a separate outline; define shapes with color and shading.',
    tile?'- Fill every pixel (no transparency). Make the left/right and top/bottom edges continue seamlessly.':bg?'- Keep the background transparent (.). Center the subject and leave about 1 pixel of margin.':'- Fill the background with a simple fitting color from the palette (no transparency).',
    '','Reply with only JSON in exactly this shape: {"rows": ["<row 1>", "<row 2>", "..."]}'].join('\n');
  const c=addCand({kind:'gen',label:q,w:W,h:H,x:Math.floor((doc.w-W)/2),y:Math.floor((doc.h-H)/2),data:new Uint8Array(W*H),pending:true});
  runAI(prompt,c,$('#aiTier').value);
}
function aiEdit(){
  if(aiRunning||!sample) return; const q=$('#aiEdit').value.trim(); if(!q){ toast('어떻게 고칠지 적어 주세요'); $('#aiEdit').focus(); return; }
  const b=selBBox()||{x:0,y:0,w:doc.w,h:doc.h};
  if(b.w>64||b.h>64){ toast('다시 그릴 영역은 64×64 이하여야 합니다. 선택 도구로 영역을 고르세요.'); return; }
  const m=8; const cx0=Math.max(0,b.x-m), cy0=Math.max(0,b.y-m), cx1=Math.min(doc.w,b.x+b.w+m), cy1=Math.min(doc.h,b.y+b.h+m);
  const grid=gridRows(ui.frame,cx0,cy0,cx1-cx0,cy1-cy0), region=gridRows(ui.frame,b.x,b.y,b.w,b.h);
  const whole=!ui.sel;
  const prompt=['You are an expert pixel artist editing an existing pixel art image.',`Instruction (may be in Korean): ${q}`,'','Palette (one character per pixel):','. = transparent',palSpec(),'',
    `The image (${cx1-cx0} columns x ${cy1-cy0} rows):`,grid.join('\n'),'',
    whole?'Return the whole edited image. Keep everything the instruction does not mention unchanged.':`Redraw ONLY the ${b.w}x${b.h} region at columns ${b.x-cx0}..${b.x-cx0+b.w-1} and rows ${b.y-cy0}..${b.y-cy0+b.h-1} (0-based) of the image above. Its current content is:\n${region.join('\n')}\nMake the new content connect cleanly with the surrounding pixels at the region border.`,
    '','Rules:',`- Exactly ${b.h} rows, every row exactly ${b.w} characters, palette characters only.`,'- Match the existing style, outline and shading.','','Reply with only JSON in exactly this shape: {"rows": ["<row 1>", "..."]}'].join('\n');
  let mask=null; if(ui.sel){ mask=new Uint8Array(b.w*b.h); for(let y=0;y<b.h;y++) for(let x=0;x<b.w;x++) mask[y*b.w+x]=ui.sel[(b.y+y)*doc.w+b.x+x]; }
  const c=addCand({kind:'edit',label:'수정: '+q,w:b.w,h:b.h,x:b.x,y:b.y,mask,data:new Uint8Array(b.w*b.h),pending:true});
  runAI(prompt,c,$('#aiTier').value);
}
async function aiPalette(){
  if(aiRunning||!sample) return; const q=$('#palQ').value.trim(); if(!q){ toast('팔레트 주제를 적어 주세요'); $('#palQ').focus(); return; }
  const n=+$('#palN').value; const out=$('#palOut'); out.textContent=''; aiBusy(true); aiCtl=new AbortController(); setAIStatus('팔레트를 만드는 중…');
  try{
    const val=await sample.json(`Create a pixel art color palette of exactly ${n} colors for this theme (may be in Korean): "${q}".\nIt must work for game sprites: include a near-black for outlines and a light highlight color, and build ramps from dark to light with slight hue shifting. List colors ramp by ramp, dark to light.\nReply with only JSON in exactly this shape: {"name": "<short name in the language of the theme>", "colors": ["#rrggbb", "..."]}`,{modelTier:'quick',cache:false,signal:aiCtl.signal});
    const cols=(val?.colors||[]).filter(isHex).map(normHex); if(!cols.length) throw {code:'invalid_json'};
    const nm=String(val.name||q).slice(0,40);
    out.append(h('b',{text:`${nm} · ${cols.length}색`}),h('div',{class:'swrow'},cols.map(c=>h('i',{style:'background:'+c,title:c}))),
      h('div',{class:'actions'},h('button',{class:'btn sm primary',text:'적용 방법 고르기',onclick:()=>presetDialog(cols,`팔레트 적용: ${nm}`)}),h('button',{class:'btn sm',text:'끝에 추가',onclick:()=>applyPalette(cols,'append')}),h('button',{class:'btn sm',text:'모음에 저장',onclick:()=>shelfSave(nm,cols)})));
    setAIStatus('팔레트를 만들었습니다');
  }catch(e){ aiError(e); }finally{ aiBusy(false); }
}
async function initCapabilities(){
  if(!window.claude||typeof window.claude.use!=='function'){ aiDisable('AI 생성은 Claude 안에서 이 페이지를 열면 쓸 수 있습니다. 에디터와 이미지 변환은 지금 바로 쓸 수 있습니다.'); return; }
  const [s,d]=await Promise.all([window.claude.use('sample').catch(()=>null),window.claude.use('downloads').catch(()=>null)]);
  downloads=d; sample=s;
  if(!sample){ aiDisable('이 화면에서는 AI 생성을 쓸 수 없습니다. 에디터와 이미지 변환은 그대로 쓸 수 있습니다.'); return; }
  $('#aiNote').hidden=false; $('#aiNote').textContent='Claude가 현재 팔레트로 도트를 직접 그립니다. 처음 생성할 때 사용 허락을 묻고, 요청은 내 Claude 사용량에서 차감됩니다.'; aiBusy(false);
}
