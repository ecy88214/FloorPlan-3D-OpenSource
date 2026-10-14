// Door/window attachment for both legacy axis-aligned and modern angled walls.
// All distances use millimetres in plan (x,y) coordinates.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const isOpening = f => /^(window|door)/.test(f?.type || '');
export function wallCentreLines(legacy = [], angled = [], demolished = []) {
  const lines = [];
  legacy.forEach((w, index) => {
    if (demolished.includes('w'+index)) return;
    const horizontal = Math.abs(w[2]-w[0]) >= Math.abs(w[3]-w[1]);
    const p = horizontal ? {x:w[0], y:(w[1]+w[3])/2} : {x:(w[0]+w[2])/2,y:w[1]};
    const q = horizontal ? {x:w[2], y:p.y} : {x:p.x,y:w[3]};
    lines.push({id:`legacy-${index}`,p,q,thickness:horizontal?Math.abs(w[3]-w[1]):Math.abs(w[2]-w[0]),legacy:true});
  });
  angled.forEach((w,index) => lines.push({id:w.id || `angled-${index}`,p:w.start,q:w.end,thickness:w.thickness || 180,legacy:false}));
  return lines;
}
export function projectToWall(x,y,wall) {
  const dx=wall.q.x-wall.p.x,dy=wall.q.y-wall.p.y;
  const length=Math.hypot(dx,dy);
  if(length<1) return null;
  const t=clamp(((x-wall.p.x)*dx+(y-wall.p.y)*dy)/(length*length),0,1);
  const px=wall.p.x+dx*t,py=wall.p.y+dy*t;
  return {...wall,x:px,y:py,t,length,angle:Math.atan2(dy,dx)*180/Math.PI,distance:Math.hypot(x-px,y-py)};
}
export function closestWall(x,y,walls,maxDistance=Infinity) {
  let best=null;
  for(const wall of walls){const projected=projectToWall(x,y,wall);
    if(projected && projected.distance <= maxDistance && (!best || projected.distance<best.distance))best=projected;
  }
  return best;
}
export function placeOpening(f,walls,maxDistance=Infinity) {
  const nearest=closestWall(f.cx,f.cy,walls,maxDistance);
  if(!nearest)return null;
  // A full-width opening must stay within its wall segment.
  const length=Math.max(50,Math.min(f.w,nearest.length));
  if(nearest.length<length || nearest.length<100)return null;
  const offset=clamp(nearest.t*nearest.length,length/2,nearest.length-length/2);
  const dx=(nearest.q.x-nearest.p.x)/nearest.length,dy=(nearest.q.y-nearest.p.y)/nearest.length;
  return {wallId:nearest.id,cx:nearest.p.x+dx*offset,cy:nearest.p.y+dy*offset,
    rot:nearest.angle,depth:nearest.thickness,offset};
}
export function openingInterval(f,wall,tolerance=140){
  const p=projectToWall(f.cx,f.cy,wall);
  if(!p || p.distance>Math.max(tolerance,wall.thickness/2+60))return null;
  const angle=((f.rot||0)-p.angle)*Math.PI/180;
  if(Math.abs(Math.sin(angle))>.25)return null;
  const start=p.t*p.length-f.w/2,end=p.t*p.length+f.w/2;
  if(start < -2 || end > p.length+2)return null;
  return {f,start:clamp(start,0,p.length),end:clamp(end,0,p.length)};
}
