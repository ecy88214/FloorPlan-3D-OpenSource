// Approximate footprint scale from labeled room areas when a drawing has no dimension lines.
// This is an *estimate*, not a surveyed scale: net room area excludes walls.
export function parseAreaLabels(text) {
  const s=String(text||'').replace(/\u00a0/g,' ').replace(/[，]/g,',').replace(/[Ｏ〇]/g,'0');
  const out=[];
  const re=/(\d{1,3}(?:[.,]\d{1,2})?)\s*(?:m\s*[²2]|㎡|m\s*\^\s*2)\s*(?:\/|／|\||\s)*\s*(?:(\d{1,3}(?:[.,]\d{1,2})?)\s*坪)?/gi;
  let match;
  while((match=re.exec(s))){
    const squareMetres=Number(match[1].replace(',','.'));
    const ping=match[2]?Number(match[2].replace(',','.')):null;
    if(!(squareMetres>=.5&&squareMetres<=300))continue;
    const ratio=ping?squareMetres/(ping*3.305785):1;
    if(ping&&Math.abs(ratio-1)>.18)continue;
    out.push({squareMetres,ping});
  }
  return out;
}
export function findAreaLabels(words,rawText='') {
  const blocks=[String(rawText||'')];
  // OCR commonly splits the number, m² and 坪 into separate tokens.
  for(const w of words||[]){if(w?.text)blocks.push(w.text);}
  const fromText=parseAreaLabels(blocks[0]);
  if(fromText.length>=2)return fromText;
  const combined=parseAreaLabels(blocks.slice(1).join(' '));
  return combined.length>fromText.length?combined:fromText;
}
function luminance(r,g,b){return (r*299+g*587+b*114)/1000;}
// Locate the main occupied plan using horizontal runs of pixels that differ from page background.
// It intentionally ignores isolated thin annotations and throws if the silhouette is uncertain.
export function estimateFootprintPixels(image) {
  if(!image?.data||image.width<100||image.height<100)return null;
  const {width:w,height:h,data}=image;
  const samples=[];
  for(const [x,y] of [[4,4],[w-5,4],[4,h-5],[w-5,h-5],[Math.round(w/2),4]]){
    const i=(y*w+x)*4;samples.push([data[i],data[i+1],data[i+2]]);
  }
  const bg=[0,1,2].map(i=>samples.map(s=>s[i]).sort((a,b)=>a-b)[2]);
  const rows=[];
  let valid=0;
  for(let y=Math.round(h*.035);y<h*.94;y+=3){
    const xs=[];
    for(let x=Math.round(w*.025);x<w*.975;x+=3){
      const p=(y*w+x)*4;
      const d=Math.abs(data[p]-bg[0]) + Math.abs(data[p+1]-bg[1])+Math.abs(data[p+2]-bg[2]);
      if(d>36||luminance(data[p],data[p+1],data[p+2])<200)xs.push(x);
    }
    if(xs.length<Math.max(12,w*.035))continue;
    // Keep substantial contiguous activity; text or arrow annotations alone are too small.
    let left=xs[Math.floor(xs.length*.02)],right=xs[Math.floor(xs.length*.98)];
    if(right-left<w*.16)continue;
    rows.push({y,left,right});valid++;
  }
  if(rows.length<h/3/5)return null;
  // Suppress isolated labels by considering the dominant horizontal occupancy band.
  const widths=rows.map(r=>r.right-r.left).sort((a,b)=>a-b);
  const typical=widths[Math.floor(widths.length*.6)];
  const usable=rows.filter(r=>r.right-r.left>=typical*.38);
  if(usable.length<h*.18/3)return null;
  // Using horizontal row spans slightly overestimates concave notches; expose lower confidence.
  const pixels=usable.reduce((sum,r)=>sum+(r.right-r.left)*3,0);
  const coverage=pixels/(w*h);
  return coverage>.16&&coverage<.86?{pixels,coverage,bounds:{left:Math.min(...usable.map(r=>r.left)),right:Math.max(...usable.map(r=>r.right)),top:usable[0].y,bottom:usable[usable.length-1].y},method:'row-envelope'}:null;
}
export function estimateScaleFromRoomAreas(image,labels){
  if(!Array.isArray(labels)||labels.length<3)return null;
  const area=labels.reduce((sum,l)=>sum+l.squareMetres,0);
  if(area<12||area>1200)return null;
  const footprint=estimateFootprintPixels(image);
  if(!footprint)return null;
  // Unit areas normally exclude wall thickness, while the footprint includes walls.
  // No constant can make this exact; present a conservative *estimated* calibration.
  const mmPerPixel=1000*Math.sqrt(area/footprint.pixels);
  if(!Number.isFinite(mmPerPixel)||mmPerPixel<.3||mmPerPixel>80)return null;
  return {mmPerPixel,estimated:true,areas:labels.length,totalSquareMetres:area,footprintPixels:footprint.pixels,coverage:footprint.coverage,uncertainty:'約 ±15～25%，依牆體與未標面積而異'};
}
