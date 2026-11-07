/* ================= .aseprite / .ase files =================
   Spec: https://github.com/aseprite/aseprite/blob/main/docs/ase-file-specs.md
   Read: indexed, RGBA and grayscale sprites; image layers (groups flattened, tilemaps skipped), linked cels, tags, palette.
   Write: indexed mode. DotLab pixel values map 1:1 to palette indices (0 = transparent index). */

async function zlibInflate(u8){ return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer()); }
async function zlibDeflate(u8){ return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer()); }

async function parseAseprite(buf){
  const dv=new DataView(buf.buffer,buf.byteOffset,buf.byteLength); let p=0; const td=new TextDecoder();
  const u8=()=>dv.getUint8(p++), u16=()=>{ const v=dv.getUint16(p,true); p+=2; return v; }, i16=()=>{ const v=dv.getInt16(p,true); p+=2; return v; }, u32=()=>{ const v=dv.getUint32(p,true); p+=4; return v; };
  const str=()=>{ const n=u16(); const s=td.decode(buf.subarray(p,p+n)); p+=n; return s; };
  if(buf.length<128||dv.getUint16(4,true)!==0xA5E0) throw new Error('Aseprite 파일이 아니거나 손상된 파일입니다');
  p=6; const nFrames=u16(), W=u16(), H=u16(), depth=u16(), flags=u32();
  p=28; const transIdx=u8(); p=128;
  if(![8,16,32].includes(depth)) throw new Error('지원하지 않는 색 형식입니다 ('+depth+'bpp)');
  const layers=[], palette=[], oldPalette=[], tags=[], frames=[];
  for(let f=0;f<nFrames;f++){
    const start=p, bytes=u32(); if(u16()!==0xF1FA) throw new Error('프레임 데이터가 손상되었습니다 ('+(f+1)+'번 프레임)');
    const oldCount=u16(), dur=u16(); p+=2; const newCount=u32(); const count=newCount||oldCount;
    const cels=[];
    for(let c=0;c<count&&p<start+bytes;c++){
      const cs=p, size=u32(), type=u16(), end=cs+size;
      if(type===0x2004){ const fl=u16(), lt=u16(), child=u16(); p+=4; const blend=u16(), op=u8(); p+=3; layers.push({flags:fl,type:lt,child,blend,opacity:op,name:str()}); }
      else if(type===0x2005){
        const li=u16(), x=i16(), y=i16(), op=u8(), ct=u16(); p+=7;
        if(ct===0||ct===2){ const w=u16(), hh=u16(); let data=buf.subarray(p,end); if(ct===2) data=await zlibInflate(data); cels.push({li,x,y,op,type:ct,w,h:hh,data}); }
        else if(ct===1) cels.push({li,op,type:1,link:u16()});
      }
      else if(type===0x2019){ u32(); const first=u32(), last=u32(); p+=8; for(let i=first;i<=last;i++){ const fl=u16(); palette[i]=[u8(),u8(),u8(),u8()]; if(fl&1) str(); } }
      else if(type===0x0004||type===0x0011){ const n=u16(); let idx=0; for(let k=0;k<n;k++){ idx+=u8(); let m=u8(); if(m===0) m=256; for(let j=0;j<m;j++){ let r=u8(),g=u8(),b=u8(); if(type===0x0011){ r=r*255/63|0; g=g*255/63|0; b=b*255/63|0; } oldPalette[idx++]=[r,g,b,255]; } } }
      else if(type===0x2018){ const n=u16(); p+=8; for(let k=0;k<n;k++){ const from=u16(), to=u16(), dir=u8(); u16(); p+=6; const rgb=[u8(),u8(),u8()]; p+=1; tags.push({from,to,dir,rgb,name:str()}); } }
      p=end;
    }
    frames.push({dur,cels}); p=start+bytes;
  }
  return {W,H,depth,flags,transIdx,layers,palette:palette.length?palette:oldPalette,tags,frames};
}

// Converts a parsed sprite into a DotLab document. Returns {doc, warnings}.
async function asepriteToDoc(buf,name){
  const a=await parseAseprite(buf); const warn=new Set();
  if(a.W>MAXSIZE||a.H>MAXSIZE) throw new Error(`캔버스가 ${a.W}×${a.H}입니다. 도트랩은 ${MAXSIZE}×${MAXSIZE}까지 열 수 있습니다.`);
  const n=a.W*a.H;
  const imgLayers=[]; a.layers.forEach((L,i)=>{ if(L.type===0) imgLayers.push(i); else if(L.type===1) warn.add('그룹은 풀어서 가져왔습니다'); else warn.add('타일맵 레이어는 가져오지 않았습니다'); if(L.type===0&&L.blend) warn.add('혼합 모드는 보통으로 바꿨습니다'); });
  if(!imgLayers.length) throw new Error('그림이 들어 있는 레이어가 없습니다');
  // 1) decode every cel to a full-canvas RGBA buffer; links reuse the same buffer
  const pal=a.palette;
  const pix=(L,data,i)=>{
    if(a.depth===32) return [data[i*4],data[i*4+1],data[i*4+2],data[i*4+3]];
    if(a.depth===16){ const v=data[i*2]; return [v,v,v,data[i*2+1]]; }
    const k=data[i]; if(k===a.transIdx&&!(L.flags&8)) return [0,0,0,0]; const c=pal[k]||[0,0,0,255]; return c;
  };
  const rgbaFrames=a.frames.map(()=>({}));
  a.frames.forEach((fr,fi)=>{
    for(const c of fr.cels){
      if(!imgLayers.includes(c.li)) continue;
      if(c.type===1){ const src=rgbaFrames[c.link]&&rgbaFrames[c.link][c.li]; if(src) rgbaFrames[fi][c.li]=src; continue; }
      if(c.op<255) warn.add('셀 불투명도는 무시했습니다');
      const L=a.layers[c.li], out=new Uint8ClampedArray(n*4);
      for(let y=0;y<c.h;y++){ const ty=c.y+y; if(ty<0||ty>=a.H) continue; for(let x=0;x<c.w;x++){ const tx=c.x+x; if(tx<0||tx>=a.W) continue; const v=pix(L,c.data,y*c.w+x); const j=(ty*a.W+tx)*4; out[j]=v[0]; out[j+1]=v[1]; out[j+2]=v[2]; out[j+3]=v[3]; } }
      rgbaFrames[fi][c.li]=out;
    }
  });
  // 2) palette: keep the file's palette order when it fits, otherwise build one from the colours actually used
  const used=new Map(); const seenBuf=new Set(); let partial=false;
  for(const fr of rgbaFrames) for(const li in fr){ const b=fr[li]; if(seenBuf.has(b)) continue; seenBuf.add(b); for(let i=0;i<n;i++){ const al=b[i*4+3]; if(al>0&&al<255) partial=true; if(al<128) continue; const k=(b[i*4]<<16)|(b[i*4+1]<<8)|b[i*4+2]; used.set(k,(used.get(k)||0)+1); } }
  if(partial) warn.add('반투명 픽셀은 불투명도 절반을 기준으로 불투명하거나 투명하게 바꿨습니다');
  let palette;
  if(a.depth===8){ const fp=[]; pal.forEach((c,i)=>{ if(i===a.transIdx||!c) return; const hx=rgb2hex(c[0],c[1],c[2]); if(!fp.includes(hx)) fp.push(hx); }); if(fp.length&&fp.length<=MAXPAL) palette=fp; }
  if(!palette){
    const cols=[...used.keys()].map(k=>[(k>>16)&255,(k>>8)&255,k&255]);
    if(cols.length<=MAXPAL) palette=cols.sort((x,y)=>lum(x)-lum(y)).map(c=>rgb2hex(...c));
    else { palette=kmeans(cols,MAXPAL).sort((x,y)=>lum(x)-lum(y)).map(c=>rgb2hex(...c)); warn.add(`${cols.length}색을 ${MAXPAL}색으로 줄였습니다`); }
  }
  if(!palette.length) palette=['#000000','#ffffff'];
  const prgb=palette.map(hex2rgb), vcache=new Map();
  const toVal=(b,i)=>{ if(b[i*4+3]<128) return 0; const k=(b[i*4]<<16)|(b[i*4+1]<<8)|b[i*4+2]; let v=vcache.get(k); if(v===undefined){ v=nearestIdx([b[i*4],b[i*4+1],b[i*4+2]],prgb)+1; vcache.set(k,v); } return v; };
  // 3) build the document; shared RGBA buffers become shared (linked) cels
  const layers=imgLayers.map((li,k)=>{ const L=a.layers[li]; return {id:k+1,name:L.name||`레이어 ${k+1}`,visible:!!(L.flags&1),opacity:(a.flags&1)?L.opacity/255:1,locked:!(L.flags&2),alphaLock:false,outline:0}; });
  const conv_=new Map();
  const frames=rgbaFrames.map((fr,fi)=>{ const cels={}; imgLayers.forEach((li,k)=>{ const b=fr[li]; if(!b){ cels[k+1]=new Uint8Array(n); return; } if(!conv_.has(b)){ const u=new Uint8Array(n); for(let i=0;i<n;i++) u[i]=toVal(b,i); conv_.set(b,u); } cels[k+1]=conv_.get(b); }); return {dur:clamp(a.frames[fi].dur||100,20,5000),cels}; });
  const last=frames.length-1;
  const tags=a.tags.map((t,k)=>{ if(t.dir===3) warn.add('역방향 핑퐁 태그는 핑퐁으로 바꿨습니다'); const col=(t.rgb[0]||t.rgb[1]||t.rgb[2])?rgb2hex(...t.rgb):TAGCOLORS[k%TAGCOLORS.length]; return {name:t.name||'태그',from:clamp(t.from,0,last),to:clamp(t.to,0,last),dir:t.dir===1?'reverse':t.dir>=2?'pingpong':'forward',color:col}; }).filter(t=>t.to>=t.from);
  return {doc:{name:name||'Aseprite',w:a.W,h:a.H,palette,layers,frames,tags},warnings:[...warn]};
}

// Writes the current document as an indexed .aseprite file.
async function docToAseprite(){
  const W=doc.w, H=doc.h, n=W*H; const out=[]; const te=new TextEncoder();
  const u8=v=>out.push(v&255), u16=v=>out.push(v&255,(v>>8)&255), i16=v=>u16(v<0?v+65536:v), u32=v=>out.push(v&255,(v>>>8)&255,(v>>>16)&255,(v>>>24)&255);
  const str=s=>{ const b=te.encode(s); u16(b.length); for(const x of b) out.push(x); };
  const zero=k=>{ for(let i=0;i<k;i++) out.push(0); };
  const patch32=(at,v)=>{ out[at]=v&255; out[at+1]=(v>>>8)&255; out[at+2]=(v>>>16)&255; out[at+3]=(v>>>24)&255; };
  // the outline effect has no Aseprite equivalent, so it is baked into the pixels
  const baked=new Map();
  const celData=(L,c)=>{ if(!L.outline) return c; if(baked.has(c)) return baked.get(c); const b=c.slice(); for(let i=0;i<n;i++){ if(c[i]) continue; const x=i%W,y=(i/W)|0; if((x>0&&c[i-1])||(x<W-1&&c[i+1])||(y>0&&c[i-W])||(y<H-1&&c[i+W])) b[i]=L.outline; } baked.set(c,b); return b; };
  // header (128 bytes)
  u32(0); u16(0xA5E0); u16(doc.frames.length); u16(W); u16(H); u16(8); u32(1); u16(doc.frames[0].dur); u32(0); u32(0);
  u8(0); zero(3); u16(doc.palette.length+1); u8(1); u8(1); i16(0); i16(0); u16(16); u16(16); zero(84);
  const emitted=doc.frames.map(()=>new Set()); // layer indices that got a cel in each frame
  for(let fi=0;fi<doc.frames.length;fi++){
    const fstart=out.length; u32(0); u16(0xF1FA); const countAt=out.length; u16(0); u16(doc.frames[fi].dur); zero(2); u32(0);
    let chunks=0;
    const chunk=async(type,body)=>{ const cs=out.length; u32(0); u16(type); await body(); patch32(cs,out.length-cs); chunks++; };
    if(fi===0){
      await chunk(0x2019,()=>{ u32(doc.palette.length+1); u32(0); u32(doc.palette.length); zero(8); u16(0); u8(0); u8(0); u8(0); u8(0); for(const c of palRGB){ u16(0); u8(c[0]); u8(c[1]); u8(c[2]); u8(255); } });
      for(const L of doc.layers) await chunk(0x2004,()=>{ u16((L.visible?1:0)|(L.locked?0:2)); u16(0); u16(0); u16(0); u16(0); u16(0); u8(Math.round(L.opacity*255)); zero(3); str(L.name); });
      if(doc.tags.length) await chunk(0x2018,()=>{ u16(doc.tags.length); zero(8); for(const t of doc.tags){ u16(t.from); u16(t.to); u8(t.dir==='reverse'?1:t.dir==='pingpong'?2:0); u16(0); zero(6); const c=hex2rgb(t.color); u8(c[0]); u8(c[1]); u8(c[2]); u8(0); str(t.name); } });
    }
    for(let li=0;li<doc.layers.length;li++){
      const L=doc.layers[li], c=doc.frames[fi].cels[L.id];
      let link=-1; for(let k=0;k<fi;k++) if(doc.frames[k].cels[L.id]===c&&emitted[k].has(li)){ link=k; break; }
      if(link>=0){ await chunk(0x2005,()=>{ u16(li); i16(0); i16(0); u8(255); u16(1); i16(0); zero(5); u16(link); }); emitted[fi].add(li); continue; }
      const d=celData(L,c); let x0=W,y0=H,x1=-1,y1=-1;
      for(let i=0;i<n;i++) if(d[i]){ const x=i%W,y=(i/W)|0; if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
      if(x1<0) continue;
      const cw=x1-x0+1, ch=y1-y0+1, crop=new Uint8Array(cw*ch); for(let y=0;y<ch;y++) crop.set(d.subarray((y0+y)*W+x0,(y0+y)*W+x0+cw),y*cw);
      const z=await zlibDeflate(crop);
      await chunk(0x2005,()=>{ u16(li); i16(x0); i16(y0); u8(255); u16(2); i16(0); zero(5); u16(cw); u16(ch); for(const b of z) out.push(b); });
      emitted[fi].add(li);
    }
    patch32(fstart,out.length-fstart); out[countAt]=Math.min(chunks,0xFFFF)&255; out[countAt+1]=(Math.min(chunks,0xFFFF)>>8)&255; patch32(countAt+6,chunks);
  }
  patch32(0,out.length);
  return new Uint8Array(out);
}
async function exportAseprite(){
  try{ const bytes=await docToAseprite(); offerFiles([{filename:base()+'.aseprite',data:new Blob([bytes],{type:'application/octet-stream'})}]); }
  catch(e){ toast('Aseprite 파일을 만들지 못했습니다: '+(e.message||e)); }
}
