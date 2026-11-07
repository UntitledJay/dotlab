/* ================= colour style transfer =================
   Takes the colours of the reference image and maps them onto the current palette by brightness rank,
   so dark stays dark and light stays light; indices do not change, only the palette colours do. */
const XF={img:null,n:0,cols:null};
function refColors(img,n){
  if(XF.img===img&&XF.n===n) return XF.cols;
  const k=Math.min(1,128/Math.max(img.naturalWidth,img.naturalHeight)); const cv=document.createElement('canvas'); cv.width=Math.max(1,Math.round(img.naturalWidth*k)); cv.height=Math.max(1,Math.round(img.naturalHeight*k));
  const c=cv.getContext('2d',{willReadFrequently:true}); c.drawImage(img,0,0,cv.width,cv.height); const d=c.getImageData(0,0,cv.width,cv.height).data; const pts=[];
  for(let i=0;i<d.length;i+=4) if(d[i+3]>=128) pts.push([d[i],d[i+1],d[i+2]]);
  const cols=kmeans(pts,n).sort((a,b)=>lum(a)-lum(b));
  Object.assign(XF,{img,n,cols}); return cols;
}
function xferPalette(amount){
  const n=doc.palette.length; const ref_=refColors(ref.img,n); if(!ref_.length) return null;
  const order=palRGB.map((c,i)=>({c,i})).sort((a,b)=>lum(a.c)-lum(b.c)); const out=doc.palette.slice();
  // when the reference has fewer colours than the palette, interpolate along its brightness ramp so palette entries stay distinct
  const m=ref_.length, at=t=>{ const x=t*(m-1), i=Math.min(m-1,Math.floor(x)), j=Math.min(m-1,i+1), f=x-i; return [0,1,2].map(k=>ref_[i][k]+(ref_[j][k]-ref_[i][k])*f); };
  order.forEach((o,rank)=>{ const r=at(n>1?rank/(n-1):0); out[o.i]=rgb2hex(o.c[0]+(r[0]-o.c[0])*amount,o.c[1]+(r[1]-o.c[1])*amount,o.c[2]+(r[2]-o.c[2])*amount); });
  return out;
}
function renderXfer(){
  const box=$('#xferPrev'); if(!box) return; box.textContent=''; const go=$('#xferGo');
  if(!ref.img){ go.disabled=true; $('#xferHint').textContent='위에서 참조 이미지를 올리면, 그 색감을 지금 팔레트에 입힐 수 있습니다. 밝기 순서대로 짝지어 바꾸므로 그림의 명암 구조는 그대로 남습니다.'; return; }
  $('#xferHint').textContent='참조 이미지의 색감을 지금 팔레트에 입힙니다. 밝기 순서대로 짝지어 바꾸므로 그림의 명암 구조는 그대로 남습니다.';
  const np=xferPalette(+$('#xferAmt').value/100); go.disabled=!np; if(!np) return;
  const row=list=>h('div',{class:'swrow'},list.map(c=>h('i',{style:'background:'+c,title:c})));
  box.append(h('span',{text:'지금'}),row(doc.palette),h('span',{text:'적용 후'}),row(np));
}
function applyXfer(){ const np=xferPalette(+$('#xferAmt').value/100); if(!np) return; docChange(()=>{ doc.palette=np; }); toast('참조 이미지의 색감을 팔레트에 입혔습니다. Ctrl+Z로 되돌릴 수 있습니다.'); }
