/* ================= .aseprite import / export ================= */
// File format: https://github.com/aseprite/aseprite/blob/main/docs/ase-file-specs.md
// zlib streams use the browser's CompressionStream('deflate') — no library needed.
async function zlibInflate(u8){ return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('deflate'))).arrayBuffer()); }
async function zlibDeflate(u8){ return new Uint8Array(await new Response(new Blob([u8]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer()); }
const ASE_DIRS=['forward','reverse','pingpong','pingpong_reverse'];

async function readAseprite(buf,fallbackName){
  const dv=new DataView(buf), bytes=new Uint8Array(buf), td=new TextDecoder(); let p=0;
  const u8=()=>dv.getUint8(p++), u16=()=>{ const v=dv.getUint16(p,true); p+=2; return v; }, i16=()=>{ const v=dv.getInt16(p,true); p+=2; return v; }, u32=()=>{ const v=dv.getUint32(p,true); p+=4; return v; };
  const str=()=>{ const n=u16(); const s=td.decode(bytes.subarray(p,p+n)); p+=n; return s; };
  if(buf.byteLength<128||dv.getUint16(4,true)!==0xA5E0) throw new Error('Aseprite 파일이 아니거나 손상되었습니다');
  const nFrames=dv.getUint16(6,true), W=dv.getUint16(8,true), H=dv.getUint16(10,true), depth=dv.getUint16(12,true), hflags=dv.getUint32(14,true), trans=dv.getUint8(28);
  if(W>MAXSIZE||H>MAXSIZE) throw new Error(`캔버스가 ${W}×${H}입니다. 도트랩은 ${MAXSIZE}×${MAXSIZE}까지 열 수 있습니다. Aseprite에서 크기를 줄여 저장해 주세요.`);
  if(![8,16,32].includes(depth)) throw new Error('지원하지 않는 색 형식의 Aseprite 파일입니다');
  const bpp=depth/8;
  const layers=[]; const frames=[]; let pal=[]; const tags=[]; let udTags=null, udPos=0; let skippedTilemap=0;
  p=128;
  for(let fi=0;fi<nFrames;fi++){
    const fstart=p, fsize=u32(); if(u16()!==0xF1FA) throw new Error('Aseprite 프레임 정보가 손상되었습니다');
    const oldN=u16(), dur=u16(); p+=2; const newN=u32(); const nChunks=newN||oldN;
    const fr={dur,cels:[]}; frames.push(fr);
    for(let ci=0;ci<nChunks&&p<fstart+fsize;ci++){
      const cstart=p, csize=u32(), type=u16();
      if(type!==0x2020) udTags=null;
      if(type===0x2004){ // layer
        const fl=u16(), lt=u16(), level=u16(); p+=4; u16(); const op=u8(); p+=3; const name=str();
        layers.push({flags:fl,type:lt,level,opacity:op,name});
      } else if(type===0x2005){ // cel
        const li=u16(), x=i16(), y=i16(); u8(); const ct=u16(); p+=7;
        if(ct===0||ct===2){ const w=u16(), hh=u16(); const raw=bytes.subarray(p,cstart+csize); const px_=ct===2?await zlibInflate(raw):raw.slice(0,w*hh*bpp); fr.cels.push({li,x,y,w,h:hh,px:px_}); }
        else if(ct===1) fr.cels.push({li,link:u16()});
      } else if(type===0x2018){ // tags
        const n=u16(); p+=8; udTags=[]; udPos=0;
        for(let k=0;k<n;k++){ const from=u16(), to=u16(), dir=u8(); u16(); p+=6; const r=u8(),g=u8(),b=u8(); u8(); const t={name:str(),from,to,dir:ASE_DIRS[dir]||'forward',color:rgb2hex(r,g,b)}; tags.push(t); udTags.push(t); }
      } else if(type===0x2020){ // user data: right after the tags chunk, one per tag (holds the tag colour in Aseprite 1.3+)
        const fl=u32(); if(fl&1) str(); let col=null; if(fl&2){ col=rgb2hex(u8(),u8(),u8()); u8(); }
        if(udTags&&udPos<udTags.length){ if(col) udTags[udPos].color=col; udPos++; }
      } else if(type===0x2019){ // palette
        u32(); const first=u32(), last=u32(); p+=8;
        for(let k=first;k<=last;k++){ const fl=u16(); pal[k]=[u8(),u8(),u8(),u8()]; if(fl&1) str(); }
      } else if((type===0x0004||type===0x0011)&&!pal.length){ // old palette chunks, only when there is no new one
        const packets=u16(); let k=0;
        for(let q=0;q<packets;q++){ k+=u8(); let n=u8(); if(n===0) n=256; for(let j=0;j<n;j++,k++){ let c=[u8(),u8(),u8()]; if(type===0x0011) c=c.map(v=>Math.round(v*255/63)); pal[k]=[...c,255]; } }
      }
      p=cstart+csize;
    }
    p=fstart+fsize;
  }
  // image layers only; a hidden group hides everything inside it
  const keep=[]; const groupVis=[];
  layers.forEach((L,i)=>{ groupVis.length=L.level; const parentVis=groupVis.every(Boolean); const vis=!!(L.flags&1)&&parentVis;
    if(L.type===1){ groupVis[L.level]=vis; return; }
    if(L.type===2){ skippedTilemap++; return; }
    keep.push({src:i,name:L.name||'레이어',visible:vis,locked:!(L.flags&2),opacity:(hflags&1)?L.opacity/255:1}); });
  if(!keep.length) throw new Error('이 파일에는 불러올 수 있는 이미지 레이어가 없습니다');
  // decode cels to canvas-sized colour keys: indexed → palette index (-1 transparent), RGBA/gray → 0xRRGGBB+1 (0 transparent)
  const n=W*H, keyCels=new Map(), linkOf=new Map(), used=new Map();
  const srcPos=new Map(keep.map((k,i)=>[k.src,i]));
  frames.forEach((fr,fi)=>{ for(const c of fr.cels){ const li=srcPos.get(c.li); if(li===undefined) continue;
    if(c.link!==undefined){ linkOf.set(fi+':'+li,c.link+':'+li); continue; }
    const out=new Int32Array(n).fill(depth===8?-1:0);
    for(let y=0;y<c.h;y++){ const ty=c.y+y; if(ty<0||ty>=H) continue; for(let x=0;x<c.w;x++){ const tx=c.x+x; if(tx<0||tx>=W) continue; const q=(y*c.w+x)*bpp; let k;
      if(depth===8){ k=c.px[q]; if(k===trans&&!(layers[keep[li].src].flags&8)) k=-1; }   // background layers have no transparent index
      else if(depth===32){ k=c.px[q+3]>=128?((c.px[q]<<16)|(c.px[q+1]<<8)|c.px[q+2])+1:0; }
      else { const v=c.px[q]; k=c.px[q+1]>=128?((v<<16)|(v<<8)|v)+1:0; }
      out[ty*W+tx]=k; if(k>(depth===8?-1:0)) used.set(k,(used.get(k)||0)+1); } }
    keyCels.set(fi+':'+li,out); } });
  // palette: keep the file's palette when it fits, otherwise the colours actually used (reduced to MAXPAL if needed)
  const notes=[]; const rgbOfKey=k=>depth===8?(pal[k]||[0,0,0]).slice(0,3):[((k-1)>>16)&255,((k-1)>>8)&255,(k-1)&255];
  let palette, keyToVal=new Map();
  const filePal=pal.map((c,i)=>({c,i})).filter(e=>e.c&&!(depth===8&&e.i===trans));
  if(depth===8&&filePal.length&&filePal.length<=MAXPAL){ palette=filePal.map(e=>rgb2hex(...e.c)); filePal.forEach((e,j)=>keyToVal.set(e.i,j+1)); }
  else {
    const keys=[...used.keys()];
    if(depth!==8){ const pk=new Map(); filePal.forEach((e,j)=>{ const k=((e.c[0]<<16)|(e.c[1]<<8)|e.c[2])+1; if(!pk.has(k)) pk.set(k,pk.size+1); });
      if(pk.size&&pk.size<=MAXPAL&&keys.every(k=>pk.has(k))){ palette=[...pk.keys()].map(k=>rgb2hex(...rgbOfKey(k))); keyToVal=pk; } }
    if(!palette){
      const cols=keys.map(rgbOfKey);
      if(keys.length<=MAXPAL){ const order=keys.map((k,i)=>[k,cols[i]]).sort((a,b)=>lum(a[1])-lum(b[1])); palette=order.map(e=>rgb2hex(...e[1])); order.forEach((e,j)=>keyToVal.set(e[0],j+1)); }
      else { const pts=[]; keys.forEach((k,i)=>{ const m=Math.min(used.get(k),50); for(let r=0;r<m;r++) pts.push(cols[i]); });
        const reps=kmeans(pts,MAXPAL).sort((a,b)=>lum(a)-lum(b)); palette=reps.map(c=>rgb2hex(...c)); keys.forEach((k,i)=>keyToVal.set(k,nearestIdx(cols[i],reps)+1));
        notes.push(`색이 ${keys.length}개라 ${MAXPAL}색으로 줄였습니다`); }
    }
  }
  if(!palette.length) palette=['#000000','#ffffff'];
  // build the document; linked cels share one array
  const dl=keep.map((k,i)=>({id:i+1,name:k.name.slice(0,40),visible:k.visible,opacity:clamp(k.opacity,0,1),locked:k.locked,alphaLock:false,outline:0}));
  const docFrames=frames.map(fr=>({dur:clamp(fr.dur||100,20,5000),cels:{}}));
  const conv_=key=>{ const src=keyCels.get(key); const c=new Uint8Array(n); if(src) for(let i=0;i<n;i++){ const k=src[i]; if(k>(depth===8?-1:0)) c[i]=keyToVal.get(k)||0; } return c; };
  const resolve=(key,seen=0)=>{ const t=linkOf.get(key); return t&&seen<nFrames?resolve(t,seen+1):key; };
  const made=new Map();
  docFrames.forEach((f,fi)=>dl.forEach((L,li)=>{ const key=resolve(fi+':'+li); if(!made.has(key)) made.set(key,conv_(key)); f.cels[L.id]=made.get(key); }));
  if(skippedTilemap) notes.push(`타일맵 레이어 ${skippedTilemap}개는 지원하지 않아 뺐습니다`);
  const d={name:(fallbackName||'Aseprite').slice(0,60),w:W,h:H,palette,layers:dl,frames:docFrames,tags:cleanTags(tags,docFrames.length)};
  return {doc:d,notes};
}

// Indexed (8-bit) file: index 0 is transparent and index v is palette[v-1], exactly like the editor's cels.
async function writeAseprite(){
  const te=new TextEncoder(); const parts=[];
  class W_{ constructor(){ this.a=[]; } b(v){ this.a.push(v&255); return this; } w(v){ return this.b(v).b(v>>8); } d(v){ return this.w(v).w(v>>>16); } z(n){ for(let i=0;i<n;i++) this.a.push(0); return this; } s(t){ const e=te.encode(t); this.w(e.length); for(const x of e) this.a.push(x); return this; } raw(u){ for(const x of u) this.a.push(x); return this; } }
  const chunk=(type,body)=>{ const c=new W_().d(body.a.length+6).w(type); c.a.push(...body.a); return c.a; };
  const {w,h:H}=doc, pal=[[0,0,0,0],...palRGB.map(c=>[...c,255])];
  const frameChunks=doc.frames.map(()=>[]);
  // first frame: palette (new + old chunk for older readers), layers, tags
  const np=new W_().d(pal.length).d(0).d(pal.length-1).z(8); for(const c of pal) np.w(0).b(c[0]).b(c[1]).b(c[2]).b(c[3]);
  const op=new W_().w(1).b(0).b(pal.length); for(const c of pal) op.b(c[0]).b(c[1]).b(c[2]);
  frameChunks[0].push(chunk(0x0004,op),chunk(0x2019,np));
  for(const L of doc.layers) frameChunks[0].push(chunk(0x2004,new W_().w((L.visible?1:0)|(L.locked?0:2)).w(0).w(0).w(0).w(0).w(0).b(Math.round(L.opacity*255)).z(3).s(L.name)));
  const tags=doc.tags||[];
  if(tags.length){ const t=new W_().w(tags.length).z(8);
    for(const g of tags){ const [r,gg,b]=hex2rgb(g.color); t.w(g.from).w(g.to).b(Math.max(0,ASE_DIRS.indexOf(g.dir))).w(0).z(6).b(r).b(gg).b(b).b(0).s(g.name); }
    frameChunks[0].push(chunk(0x2018,t));
    for(const g of tags){ const [r,gg,b]=hex2rgb(g.color); frameChunks[0].push(chunk(0x2020,new W_().d(2).b(r).b(gg).b(b).b(255))); } }
  // cels: linked → type 1, otherwise the trimmed bounding box zlib-compressed (type 2); empty cels are left out
  for(let fi=0;fi<doc.frames.length;fi++) for(let li=0;li<doc.layers.length;li++){
    const id=doc.layers[li].id, c=doc.frames[fi].cels[id]; let x0=w,y0=H,x1=-1,y1=-1;
    for(let i=0;i<c.length;i++) if(c[i]){ const x=i%w, y=(i/w)|0; if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
    if(x1<0){ if(!isLinked(fi,id)) continue; x0=y0=x1=y1=0; }   // an empty cel that other frames link to is kept as 1×1 transparent
    const g=linkSource(fi,id);
    if(g<fi){ frameChunks[fi].push(chunk(0x2005,new W_().w(li).w(0).w(0).b(255).w(1).w(0).z(5).w(g))); continue; }
    const cw=x1-x0+1, ch=y1-y0+1, data=new Uint8Array(cw*ch); for(let y=0;y<ch;y++) data.set(c.subarray((y0+y)*w+x0,(y0+y)*w+x0+cw),y*cw);
    frameChunks[fi].push(chunk(0x2005,new W_().w(li).w(x0).w(y0).b(255).w(2).w(0).z(5).w(cw).w(ch).raw(await zlibDeflate(data))));
  }
  for(let fi=0;fi<doc.frames.length;fi++){ const cs=frameChunks[fi]; const len=16+cs.reduce((s,c)=>s+c.length,0);
    const fh=new W_().d(len).w(0xF1FA).w(Math.min(cs.length,0xFFFF)).w(doc.frames[fi].dur).z(2).d(cs.length); parts.push(Uint8Array.from(fh.a)); for(const c of cs) parts.push(Uint8Array.from(c)); }
  const total=128+parts.reduce((s,u)=>s+u.length,0);
  const hd=new W_().d(total).w(0xA5E0).w(doc.frames.length).w(w).w(H).w(8).d(1).w(100).d(0).d(0).b(0).z(3).w(pal.length).b(1).b(1).w(0).w(0).w(16).w(16).z(84);
  const out=new Uint8Array(total); out.set(hd.a,0); let o=128; for(const u of parts){ out.set(u,o); o+=u.length; }
  return out;
}
async function exportAseprite(){
  try{ offerFiles([{filename:base()+'.aseprite',data:new Blob([await writeAseprite()],{type:'application/octet-stream'})}]); }
  catch(e){ toast('Aseprite 파일을 만들지 못했습니다'); }
}
