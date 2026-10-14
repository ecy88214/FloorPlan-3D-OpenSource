// Smart Furniture F2: independent millimetre-based 2D footprint and clearance calculations.
// No DOM or Three.js dependency: shared by previews, live dragging and unit tests.
const EPS = 1e-7;
export const excludedFurniture = f => /^(window|door|wall)/.test(f.type || '') || ['rug','carpet','flooring','plant','floorlamp'].includes(f.type);
const dot = (p,a) => p.x*a.x+p.y*a.y;
export function polygonForFurniture(f, expansion=0) {
  const w=Math.max(0,Number(f.w)||0)/2+expansion, h=Math.max(0,Number(f.d)||0)/2+expansion;
  const a=(Number(f.rot)||0)*Math.PI/180, c=Math.cos(a), s=Math.sin(a);
  return [[-w,-h],[w,-h],[w,h],[-w,h]].map(([x,y])=>({x:(Number(f.cx)||0)+x*c-y*s,y:(Number(f.cy)||0)+x*s+y*c}));
}
export function polygonForWall(w) {
  if(Array.isArray(w)) return [{x:w[0],y:w[1]},{x:w[2],y:w[1]},{x:w[2],y:w[3]},{x:w[0],y:w[3]}];
  const a=w.start,b=w.end,t=(Number(w.thickness)||180)/2,L=Math.hypot(b.x-a.x,b.y-a.y);
  if(L<EPS)return [];
  const nx=-(b.y-a.y)/L*t,ny=(b.x-a.x)/L*t;
  return [{x:a.x+nx,y:a.y+ny},{x:b.x+nx,y:b.y+ny},{x:b.x-nx,y:b.y-ny},{x:a.x-nx,y:a.y-ny}];
}
export function overlapSAT(a,b){
 if(a.length<3||b.length<3)return false;
 for(const poly of [a,b])for(let i=0;i<poly.length;i++){
   const p=poly[i],q=poly[(i+1)%poly.length],axis={x:-(q.y-p.y),y:q.x-p.x};
   const aa=a.map(v=>dot(v,axis)),bb=b.map(v=>dot(v,axis));
   if(Math.max(...aa)<=Math.min(...bb)+EPS || Math.max(...bb)<=Math.min(...aa)+EPS)return false;
 }
 return true;
}
function pointSegmentDistance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,l=dx*dx+dy*dy;
 const t=l?Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l)):0;
 return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);
}
export function polygonDistance(a,b){
 if(overlapSAT(a,b))return 0;
 let best=Infinity;
 for(const [p,q] of [[a,b],[b,a]])for(const pt of p)for(let i=0;i<q.length;i++)best=Math.min(best,pointSegmentDistance(pt,q[i],q[(i+1)%q.length]));
 return best;
}
export function checkFurnitureCollision(f, furniture=[], walls=[], options={}){
 if(!f||excludedFurniture(f))return [];
 const gap=Math.max(0,Number(options.clearance ?? f.smart?.clearance ?? 600));
 const footprint=polygonForFurniture(f),result=[];
 for(const other of furniture){if(other.id===f.id||excludedFurniture(other))continue;
   const target=polygonForFurniture(other),overlap=overlapSAT(footprint,target);
   const distance=overlap?0:polygonDistance(footprint,target);
   if(overlap||distance<gap-EPS)result.push({type:'furniture',severity:overlap?'collision':'clearance',otherId:other.id,distance,required:gap,polygon:target});
 }
 walls.forEach((w,index)=>{if(w?.demolished)return;
   const target=polygonForWall(w);if(!target.length)return;
   const overlap=overlapSAT(footprint,target),distance=overlap?0:polygonDistance(footprint,target);
   // A wall contact is normal for wall-side furniture; only warn actual wall overlap.
   if(overlap)result.push({type:'wall',severity:'collision',wallId:w.id??index,distance:0,required:0,polygon:target});
 });
 return result;
}
