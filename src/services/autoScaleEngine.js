// Automated architectural scale estimation. Never silently manufacture a physical scale.
// OCR words/lines and dimension extensions are measured in the SAME raster coordinate system.
export function parseMillimetres(text) {
  const raw=String(text||'').replace(/[Oo]/g,'0').replace(/[Il|]/g,'1').replace(/[，,\s]/g,'');
  const matched=raw.match(/^(?:[ØΦ∅])?(\d{1,6}(?:\.\d+)?)(mm|cm|m)?$/i);
  if(!matched)return null;
  let n=Number(matched[1]);const unit=(matched[2]||'').toLowerCase();
  if(unit==='cm')n*=10;else if(unit==='m')n*=1000;
  return n>=300&&n<=50000 ? n : null;
}
export function scaleConsensus(candidates) {
  const items=candidates.filter(c=>Number.isFinite(c.mmPerPixel)&&c.mmPerPixel>0&&Number.isFinite(c.weight)&&c.weight>0);
  if(!items.length)return null;
  const sorted=items.slice().sort((a,b)=>a.mmPerPixel-b.mmPerPixel);
  let best=null;
  for(const pivot of sorted){
    const group=items.filter(c=>Math.abs(c.mmPerPixel-pivot.mmPerPixel)/pivot.mmPerPixel<=.07);
    const weight=group.reduce((sum,c)=>sum+c.weight,0);
    const quality=group.reduce((sum,c)=>sum+c.weight*(c.quality||.5),0);
    const candidate={group,weight,quality};
    if(!best||candidate.weight+candidate.quality*.3>best.weight+best.quality*.3)best=candidate;
  }
  const total=items.reduce((sum,c)=>sum+c.weight,0);
  const estimate=best.group.reduce((sum,c)=>sum+c.mmPerPixel*c.weight,0)/best.weight;
  const confidence=best.weight/total;
  const highQuality=best.group.some(c=>(c.quality||0)>=.8&&c.confidence>=75);
  // One unequivocal line can be accepted, but must be a strong geometrically supported match.
  const confident=(best.group.length>=2&&confidence>=.68)||
    (best.group.length===1&&items.length===1&&highQuality);
  return {mmPerPixel:estimate,confident,matched:best.group.length,total:items.length,support:confidence,candidates:best.group};
}
const luminance=(data,w,x,y)=>{const i=(y*w+x)*4;return (data[i]*299+data[i+1]*587+data[i+2]*114)/1000;};
function rowInk(image,y,a,b,limit=170){
 const w=image.width; if(y<0||y>=image.height)return 0;
 let dark=0,valid=0;for(let x=Math.max(0,Math.round(a));x<=Math.min(w-1,Math.round(b));x++){dark+=luminance(image.data,w,x,y)<limit;valid++;}
 return valid?dark/valid:0;
}
function colInk(image,x,a,b,limit=170){
 const h=image.height,w=image.width;if(x<0||x>=w)return 0;
 let dark=0,valid=0;for(let y=Math.max(0,Math.round(a));y<=Math.min(h-1,Math.round(b));y++){dark+=luminance(image.data,w,x,y)<limit;valid++;}
 return valid?dark/valid:0;
}
function groups(indices,gap=3){
 const out=[];for(const item of indices){let g=out[out.length-1];if(g&&item-g[g.length-1]<=gap)g.push(item);else out.push([item]);}
 return out.map(g=>g[Math.floor(g.length/2)]);
}
export function dimensionCandidate(image,box,text,confidence=50,axis='horizontal') {
 const mm=parseMillimetres(text);if(!mm||!box)return null;
 const w=image.width,h=image.height;
 const x0=Math.max(0,Math.round(box.x0)),x1=Math.min(w-1,Math.round(box.x1));
 const y0=Math.max(0,Math.round(box.y0)),y1=Math.min(h-1,Math.round(box.y1));
 if(x1<=x0||y1<=y0)return null;
 const horizontal=axis==='horizontal',start=horizontal?x0:y0,end=horizontal?x1:y1;
 const mid=horizontal?(y0+y1)/2:(x0+x1)/2;
 const labelSize=end-start,transverse=horizontal?(y1-y0):(x1-x0);
 const imageLength=horizontal?w:h;
 const radius=Math.round(Math.min(imageLength*.48,Math.max(130,labelSize*9)));
 const pre=[],post=[];
 const nearbyA=Math.max(0,Math.round(mid-transverse*2.1)),nearbyB=Math.round(mid+transverse*2.1);
 for(let p=Math.max(1,start-radius);p<=Math.min(imageLength-2,end+radius);p++){
  if(p>=start-4&&p<=end+4)continue;
  const strength=horizontal?colInk(image,p,nearbyA,nearbyB):rowInk(image,p,nearbyA,nearbyB);
  if(strength>=.48){(p<start?pre:post).push(p);}
 }
 const a=groups(pre),b=groups(post);
 if(!a.length||!b.length)return null;
 let best=null;
 // Pair possible extension lines; verify dimension strokes on BOTH sides of the label.
 for(const left of a.slice(-15))for(const right of b.slice(0,15)){
  const px=right-left;if(px<Math.max(28,labelSize*1.7))continue;
  const middleA=start-left,middleB=right-end;
  for(const delta of [-transverse*.85,transverse*.85,-transverse*1.6,transverse*1.6]){
   const cross=Math.round(mid+delta);
   const c1=horizontal?rowInk(image,cross,left+3,start-3):colInk(image,cross,left+3,start-3);
   const c2=horizontal?rowInk(image,cross,end+3,right-3):colInk(image,cross,end+3,right-3);
   if(Math.min(c1,c2)<.30)continue;
   const coverage=(c1+c2)/2;
   // Measure how extended the candidate is and reject implausible room scales.
   const scale=mm/px;
   if(scale<.05||scale>300)continue;
   const quality=Math.min(1,coverage)*.68+Math.min(1,px/(labelSize*3))*.2+
      Math.min(1,Math.min(middleA,middleB)/labelSize)*.12;
   const weight=(Math.max(.2,Math.min(1,confidence/100)))*(quality);
   const candidate={mmPerPixel:scale,weight,quality,text:String(text),mm,pixels:px,left,right,confidence,axis};
   if(!best||quality>best.quality)best=candidate;
  }
 }
 return best;
}
export function normalizeOCRWords(data){
 const words=[];
 const walk=(obj)=>{
  if(!obj)return;
  if(Array.isArray(obj)){for(const x of obj)walk(x);return;}
  for(const key of ['blocks','paragraphs','lines','words'])if(Array.isArray(obj[key]))walk(obj[key]);
  if(typeof obj.text==='string'&&obj.bbox&&!Array.isArray(obj.words)&&!Array.isArray(obj.lines)&&!Array.isArray(obj.paragraphs)){
   words.push({text:obj.text,bbox:obj.bbox,confidence:obj.confidence??obj.conf??70});
  }
 };
 walk(data);
 return words;
}
export function extractDimensionScales(image,ocrWords){
 const candidates=[];
 for(const word of ocrWords||[]){const box=word.bbox||word.box;if(!box)continue;
  // Try both axis directions: vertical dimensions on architectural plans are common.
  for(const axis of ['horizontal','vertical']){
   const c=dimensionCandidate(image,box,word.text,word.confidence??70,axis);
   if(c)candidates.push(c);
  }
 }
 return scaleConsensus(candidates);
}
function makeCanvas(image){const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;canvas.getContext('2d').putImageData(image,0,0);return canvas;}
export async function recognizeDimensions(imageData){
 if(!globalThis.Tesseract){
  await new Promise((resolve,reject)=>{
   const existing=document.querySelector('script[data-floorplan-ocr]');
   if(existing){if(globalThis.Tesseract)return resolve();existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return;}
   const script=document.createElement('script');script.dataset.floorplanOcr='1';script.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
   script.onload=resolve;script.onerror=()=>reject(new Error('OCR 模組載入失敗'));document.head.appendChild(script);
  });
 }
 if(!globalThis.Tesseract?.createWorker)throw new Error('OCR 無法啟動');
 const worker=await globalThis.Tesseract.createWorker('eng');
 try{
  // Important: Tesseract.js 5 does NOT necessarily provide data.words without explicit output.
  await worker.setParameters({tessedit_char_whitelist:'0123456789mMcC.ØΦ²/坪㎡ ',preserve_interword_spaces:'1'});
  const canvas=makeCanvas(imageData);
  const result=await worker.recognize(canvas,{}, {text:true,blocks:true,tsv:true});
  let words=normalizeOCRWords(result.data);
  // TSV fallback for distributions which omit the blocks hierarchy.
  if(!words.length&&typeof result.data.tsv==='string'){
   for(const line of result.data.tsv.split(/\r?\n/).slice(1)){
    const f=line.split('\t');if(f.length<12||f[0]!=='5'||!f[11]?.trim())continue;
    const x=Number(f[6]),y=Number(f[7]),w=Number(f[8]),h=Number(f[9]);
    words.push({text:f.slice(11).join(' ').trim(),bbox:{x0:x,y0:y,x1:x+w,y1:y+h},confidence:Number(f[10])});
   }
  }
  // Re-run OCR on a clockwise-rotated image to recognize vertical annotation text.
  const rotated=document.createElement('canvas');rotated.width=canvas.height;rotated.height=canvas.width;
  const rctx=rotated.getContext('2d');rctx.translate(rotated.width,0);rctx.rotate(Math.PI/2);rctx.drawImage(canvas,0,0);
  const vertical=await worker.recognize(rotated,{}, {text:true,blocks:true,tsv:true});
  let extra=normalizeOCRWords(vertical.data);
  if(!extra.length && typeof vertical.data.tsv==='string'){
   for(const line of vertical.data.tsv.split(/\r?\n/).slice(1)){
    const f=line.split('\t');if(f.length<12||f[0]!=='5'||!f[11]?.trim())continue;
    const x=Number(f[6]),y=Number(f[7]),w=Number(f[8]),h=Number(f[9]);
    extra.push({text:f.slice(11).join(' ').trim(),bbox:{x0:x,y0:y,x1:x+w,y1:y+h},confidence:Number(f[10])});
   }
  }
  for(const word of extra){
   const box=word.bbox;
   // Clockwise transform inverse: original x = rotated y, original y = H - rotated x.
   if(!box)continue;
   words.push({...word,bbox:{x0:box.y0,y0:canvas.height-box.x1,x1:box.y1,y1:canvas.height-box.x0},rotated:true});
  }
  return {words,rawText:result.data.text||''};
 }finally{await worker.terminate();}
}
