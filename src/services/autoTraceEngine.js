// Auto Trace V1: deterministic browser-side line detector. Input is an ImageData-like
// RGBA buffer; output coordinates are in source pixels. No OCR or AI claims.
export function detectWallLines(image, options={}) {
  const {data,width:w,height:h}=image;
  if(!data||w<8||h<8) throw new Error('底圖尺寸無效');
  const minLength=Math.max(24,Number(options.minLength)||Math.round(Math.min(w,h)*.12));
  const threshold=Number(options.threshold)||140;
  const stride=Math.max(1,Math.floor(Math.max(w,h)/850));
  const pixels=[];
  for(let y=0;y<h;y+=stride)for(let x=0;x<w;x+=stride){
    const i=(y*w+x)*4, lum=(data[i]*299+data[i+1]*587+data[i+2]*114)/1000;
    if(data[i+3]>100&&lum<threshold)pixels.push({x,y});
  }
  if(pixels.length<12)return [];
  // Parallel-line accumulator. A line is u*x + v*y = rho.
  const candidates=[];
  for(const angle of [0,15,30,45,60,75,90,105,120,135,150,165]){
    const theta=angle*Math.PI/180,nx=-Math.sin(theta),ny=Math.cos(theta);
    const bins=new Map();
    for(const p of pixels){const b=Math.round((nx*p.x+ny*p.y)/3);bins.set(b,(bins.get(b)||0)+1);}
    const peaks=[...bins].filter(([,n])=>n>=Math.max(12,minLength/(stride*3))).sort((a,b)=>b[1]-a[1]).slice(0,22);
    const tx=Math.cos(theta),ty=Math.sin(theta);
    for(const [bin] of peaks){
      const dist=bin*3, vals=[];
      for(const p of pixels){if(Math.abs(nx*p.x+ny*p.y-dist)<=2.8)vals.push(tx*p.x+ty*p.y);}
      if(vals.length<8)continue;
      vals.sort((a,b)=>a-b);
      const maxGap=Math.max(9,5*stride);let start=vals[0],last=vals[0],count=1;
      function emit(){if(last-start>=minLength&&count>=Math.max(10,(last-start)/(stride*7))){candidates.push({x1:nx*dist+tx*start,y1:ny*dist+ty*start,x2:nx*dist+tx*last,y2:ny*dist+ty*last,length:last-start,angle});}}
      for(let i=1;i<vals.length;i++){
        if(vals[i]-last>maxGap){emit();start=vals[i];count=0;}
        last=vals[i];count++;
      }emit();
    }
  }
  // Suppress parallel double-lines / Hough bin aliases, keep longest representative.
  candidates.sort((a,b)=>b.length-a.length);
  const kept=[];
  for(const line of candidates){
    const ux=(line.x2-line.x1)/line.length,uy=(line.y2-line.y1)/line.length;
    const cx=(line.x1+line.x2)/2,cy=(line.y1+line.y2)/2;
    const duplicate=kept.some(other=>{
      const vx=(other.x2-other.x1)/other.length,vy=(other.y2-other.y1)/other.length;
      if(Math.abs(ux*vx+uy*vy)<.985)return false;
      const od=Math.abs(-uy*(other.x1-cx)+ux*(other.y1-cy));
      const along=Math.abs((other.x1+other.x2)/2*ux+(other.y1+other.y2)/2*uy-(cx*ux+cy*uy));
      return od<=Math.max(5,Number(options.mergeDistance)||9)&&along<=(line.length+other.length)*.48;
    });
    if(!duplicate)kept.push(line);
    if(kept.length>=150)break;
  }
  return kept;
}

export function convertDetectedWalls(lines, underlay, imageWidth, imageHeight, thickness=180){
  const sx=underlay.width/imageWidth,sy=underlay.height/imageHeight;
  return lines.map(line=>({
    start:{x:Math.round(underlay.x+line.x1*sx),y:Math.round(underlay.y+line.y1*sy)},
    end:{x:Math.round(underlay.x+line.x2*sx),y:Math.round(underlay.y+line.y2*sy)},
    thickness:Number(thickness)||180,height:2800,type:'partition',loadBearing:false,materialId:null
  })).filter(w=>Math.hypot(w.end.x-w.start.x,w.end.y-w.start.y)>=100);
}
