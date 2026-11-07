/* ================= frame tags ================= */
// doc.tags: [{name, from, to, dir, color}] — frame indices (0-based, inclusive). dir: forward | reverse | pingpong | pingpong_reverse
const TAGDIRS={forward:'앞으로',reverse:'거꾸로',pingpong:'왕복',pingpong_reverse:'거꾸로 왕복'};
const TAGCOLORS=['#e05d5d','#e8a33d','#4caf72','#3d8be8','#9b6be0','#8a8f98'];
function cleanTags(list,n){
  const out=[];
  for(const t of (Array.isArray(list)?list:[])){
    if(!t) continue; let a=t.from|0, b=t.to|0; if(a>b) [a,b]=[b,a]; a=clamp(a,0,n-1); b=clamp(b,0,n-1);
    out.push({name:String(t.name||'태그').slice(0,40),from:a,to:b,dir:TAGDIRS[t.dir]?t.dir:'forward',color:isHex(t.color||'')?normHex(t.color):TAGCOLORS[out.length%TAGCOLORS.length]});
  }
  return out;
}
function tagAt(fi){ const ts=(doc.tags||[]).filter(t=>fi>=t.from&&fi<=t.to); return ts.sort((a,b)=>(a.to-a.from)-(b.to-b.from))[0]||null; }
// a frame was inserted at index i: tags after it move, tags around it grow
function tagsInsert(i){ for(const t of (doc.tags||[])){ if(t.from>=i){ t.from++; t.to++; } else if(t.to>=i) t.to++; } }
// the frame at index i was removed: tags shrink, a tag left with no frames is dropped
function tagsRemove(i){ doc.tags=(doc.tags||[]).filter(t=>!(t.from===i&&t.to===i)); for(const t of doc.tags){ if(t.from>i) t.from--; if(t.to>=i) t.to--; } }
function tagDialog(t){
  const isNew=!t; const n=doc.frames.length;
  if(isNew) t={name:'',from:ui.frame,to:ui.frame,dir:'forward',color:TAGCOLORS[(doc.tags||[]).length%TAGCOLORS.length]};
  const name=h('input',{value:t.name,placeholder:'예: 걷기','aria-label':'태그 이름',style:'width:160px'});
  const from=h('input',{type:'number',min:1,max:n,value:t.from+1,'aria-label':'시작 프레임',style:'width:64px'});
  const to=h('input',{type:'number',min:1,max:n,value:t.to+1,'aria-label':'끝 프레임',style:'width:64px'});
  const dir=h('select',{'aria-label':'재생 방향'},Object.entries(TAGDIRS).map(([v,l])=>h('option',{value:v,text:l,selected:v===t.dir})));
  let color=t.color;
  const sw=h('div',{class:'swrow tagcols'},TAGCOLORS.map(c=>{ const b=h('button',{class:'tagsw','aria-label':'태그 색 '+c,'aria-pressed':String(c===color),style:'background:'+c,onclick:()=>{ color=c; $$('.tagsw',sw).forEach(x=>x.setAttribute('aria-pressed',String(x===b))); }}); return b; }));
  const actions=[{label:'취소'}];
  if(!isNew) actions.push({label:'태그 삭제',danger:true,onClick:()=>{ const i=doc.tags.indexOf(t); docChange(()=>{ doc.tags.splice(i,1); }); }});
  actions.push({label:isNew?'추가':'적용',primary:true,onClick:()=>{
    const nm=name.value.trim(); if(!nm){ toast('태그 이름을 적어 주세요'); name.focus(); return false; }
    let a=clamp((from.value|0)-1,0,n-1), b=clamp((to.value|0)-1,0,n-1); if(a>b) [a,b]=[b,a];
    const nt={name:nm.slice(0,40),from:a,to:b,dir:dir.value,color};
    const i=isNew?-1:doc.tags.indexOf(t);
    docChange(()=>{ if(!doc.tags) doc.tags=[]; if(i<0) doc.tags.push(nt); else doc.tags[i]=nt; });
  }});
  modal({title:isNew?'프레임 태그 추가':'프레임 태그 편집',body:h('div',{style:'display:flex;flex-direction:column;gap:10px'},
    h('p',{class:'hint',text:'「걷기」, 「공격」처럼 프레임 구간에 이름을 붙입니다. 태그 안의 프레임에서 재생하면 그 구간만 반복하고, 스프라이트 시트 JSON과 .aseprite 파일에도 저장됩니다.'}),
    h('label',{class:'row2'},'이름',name),
    h('div',{class:'row2'},h('label',null,'프레임',from),h('span',{text:'~'}),h('label',null,to),h('span',{class:'hint',text:`전체 ${n}개`})),
    h('label',{class:'row2'},'재생 방향',dir), sw),actions});
}

/* ================= linked cels ================= */
// A linked cel is the same Uint8Array object in several frames, so drawing on one draws on all of them.
// structuredClone (history snapshots) keeps that sharing.
function linkSource(fi,id){ const c=doc.frames[fi].cels[id]; for(let g=0;g<fi;g++) if(doc.frames[g].cels[id]===c) return g; return fi; }
function isLinked(fi,id){ const c=doc.frames[fi].cels[id]; return doc.frames.some((f,g)=>g!==fi&&f.cels[id]===c); }
function addLinkedFrame(){ docChange(()=>{ const cur=doc.frames[ui.frame]; doc.frames.splice(ui.frame+1,0,{dur:cur.dur,cels:{...cur.cels}}); tagsInsert(ui.frame+1); ui.frame++; }); toast('링크 프레임을 만들었습니다. 한 프레임에서 고치면 연결된 프레임도 함께 바뀝니다.'); }
function unlinkCel(){
  const L=activeLayer(); if(!isLinked(ui.frame,L.id)){ toast('이 레이어의 현재 프레임은 링크되어 있지 않습니다'); return; }
  docChange(()=>{ const f=doc.frames[ui.frame]; f.cels[L.id]=f.cels[L.id].slice(); });
  toast('링크를 풀었습니다. 이제 이 프레임만 따로 고칠 수 있습니다.');
}
// mark cels of the active layer that share pixels with the previous frame, and draw tag bars over the frame list
ICON.link=px('......... .##...... #..#..... #..#.#... .##.##... ...#.##.. ....#..#. ....#..#. .....##..');
function decorateTimeline(list){
  const L=activeLayer(); if(!L) return;
  const cells=$$('.fcell',list);
  cells.forEach((c,i)=>{ if(isLinked(i,L.id)){ c.classList.add('linked'); c.append(h('span',{class:'lk',title:`「${L.name}」 레이어가 다른 프레임과 링크됨`,html:ICON.link})); } });
  list.classList.toggle('hastags',!!(doc.tags&&doc.tags.length));
  for(const t of (doc.tags||[])){
    const a=cells[t.from], b=cells[t.to]; if(!a||!b) continue;
    list.append(h('button',{class:'tagbar',title:`${t.name} · 프레임 ${t.from+1}~${t.to+1} · ${TAGDIRS[t.dir]} (눌러서 편집)`,style:`left:${a.offsetLeft}px;width:${b.offsetLeft+b.offsetWidth-a.offsetLeft}px;--tag:${t.color}`,text:t.name,onclick:()=>tagDialog(t)}));
  }
}
function tagButton(){ const t=tagAt(ui.frame); if(t) tagDialog(t); else tagDialog(); }

/* ================= timelapse ================= */
// Every history step (and undo/redo) records the current frame as an indexed image, kept in memory for this session.
const TL={steps:[],max:600,mark:''};
function tlReset(){ TL.steps=[]; }
function tlRecord(){
  if(!doc||!doc.frames[ui.frame]) return;
  const w=doc.w, H=doc.h, rgba=composite(ui.frame), idx=new Uint8Array(w*H), cols=[], km=new Map();
  for(let i=0;i<w*H;i++){ const j=i*4; if(rgba[j+3]<128) continue; const k=(rgba[j]<<16)|(rgba[j+1]<<8)|rgba[j+2]; let v=km.get(k); if(v===undefined){ cols.push([rgba[j],rgba[j+1],rgba[j+2]]); v=cols.length; km.set(k,v); } idx[i]=v; }
  const last=TL.steps[TL.steps.length-1], mark=TL.mark; TL.mark='';
  if(last&&last.w===w&&last.h===H&&eqArr(last.idx,idx)&&JSON.stringify(last.cols)===JSON.stringify(cols)) return;
  TL.steps.push({w,h:H,idx,cols,ai:mark==='ai'});
  if(TL.steps.length>TL.max) TL.steps=TL.steps.filter((s,i)=>i===0||i%2===1);   // keep the whole story, at half the density
}
// tiny 3×5 "AI" badge drawn into timelapse frames made by AI generation
const AIBADGE=['###.###','#.#..#.','###..#.','#.#..#.','#.#.###'];
function buildTimelapseGIF(s,stepMs){
  const steps=TL.steps; if(steps.length<2) return null;
  const pick=steps.length>400?Array.from({length:400},(_,i)=>steps[Math.round(i*(steps.length-1)/399)]):steps;
  const MW=Math.max(...pick.map(t=>t.w)), MH=Math.max(...pick.map(t=>t.h)); s=Math.max(1,Math.min(s,Math.floor(1024/Math.max(MW,MH))));
  // one global colour table: index 0 transparent, then every colour used (most frequent first if over the limit), then the badge colours
  const freq=new Map(); for(const t of pick){ const n=new Uint32Array(t.cols.length+1); for(const v of t.idx) n[v]++; t.cols.forEach((c,i)=>{ const k=(c[0]<<16)|(c[1]<<8)|c[2]; freq.set(k,(freq.get(k)||0)+n[i+1]); }); }
  const keys=[...freq.keys()].sort((a,b)=>freq.get(b)-freq.get(a)).slice(0,253); const colors=[[0,0,0],...keys.map(k=>[(k>>16)&255,(k>>8)&255,k&255])];
  const BG=colors.length, FG=BG+1; colors.push([40,40,48],[255,255,255]);
  const pal=colors.slice(1,BG), gidx=new Map(keys.map((k,i)=>[k,i+1]));
  const W=MW*s, HH=MH*s, b=Math.max(2,Math.round(Math.min(W,HH)/64));
  const frames=pick.map((t,fi)=>{
    const map=t.cols.map(c=>{ const k=(c[0]<<16)|(c[1]<<8)|c[2]; return gidx.get(k)??(nearestIdx(c,pal)+1); });
    const idx=new Uint8Array(W*HH), ox=Math.floor((MW-t.w)/2), oy=Math.floor((MH-t.h)/2);
    for(let y=0;y<t.h;y++) for(let x=0;x<t.w;x++){ const v=t.idx[y*t.w+x]; if(!v) continue; const g=map[v-1]; for(let yy=0;yy<s;yy++){ const r=((oy+y)*s+yy)*W+(ox+x)*s; idx.fill(g,r,r+s); } }
    if(t.ai){ const bw=(AIBADGE[0].length+2)*b, bh=(AIBADGE.length+2)*b;
      for(let y=0;y<bh&&y<HH;y++) idx.fill(BG,y*W,y*W+Math.min(bw,W));
      AIBADGE.forEach((row,ry)=>{ for(let rx=0;rx<row.length;rx++) if(row[rx]==='#') for(let yy=0;yy<b;yy++){ const y=(ry+1)*b+yy; if(y<HH) idx.fill(FG,y*W+(rx+1)*b,Math.min(y*W+W,y*W+(rx+2)*b)); } }); }
    return {idx,delay:fi===pick.length-1?150:Math.max(2,Math.round(stepMs/10))};
  });
  return encodeGIF(W,HH,colors,frames);
}
function exportTimelapse(s,stepMs){
  const g=buildTimelapseGIF(s,stepMs); if(!g){ toast('기록된 작업 단계가 아직 없습니다. 몇 번 그린 뒤 다시 시도하세요.'); return; }
  offerFiles([{filename:`${base()}-timelapse.gif`,data:new Blob([g],{type:'image/gif'})}]);
}
