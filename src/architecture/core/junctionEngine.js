/** T / X junction topology. Pure geometry, in millimetres. No Three.js / DOM dependency. */
import {length} from './geometry.js';
const EPS=1e-7;
const cross=(a,b)=>a.x*b.y-a.y*b.x;
const sub=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
const lerp=(a,b,t)=>({x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t});
const clamp=t=>Math.min(1,Math.max(0,t));
export function intersectCenterlines(a,b){
  const u=sub(a.end,a.start),v=sub(b.end,b.start),d=cross(u,v);
  if(Math.abs(d)<EPS)return null; // Parallel or overlapping: handled by endpoint snapping.
  const delta=sub(b.start,a.start),t=cross(delta,v)/d,s=cross(delta,u)/d;
  if(t < -EPS||t > 1+EPS||s < -EPS||s > 1+EPS)return null;
  const ta=clamp(t),tb=clamp(s);
  return {point:lerp(a.start,a.end,ta),a:ta,b:tb};
}
export function legacyAsSegments(walls){
  return walls.map((w,index)=>{
    const horizontal=w[2]-w[0]>=w[3]-w[1];
    return {index,start:horizontal?{x:w[0],y:(w[1]+w[3])/2}:{x:(w[0]+w[2])/2,y:w[1]},end:horizontal?{x:w[2],y:(w[1]+w[3])/2}:{x:(w[0]+w[2])/2,y:w[3]},thickness:horizontal?w[3]-w[1]:w[2]-w[0],kind:w[4]||'n',horizontal};
  });
}
export function splitLegacyRect(w,t){
  const h=w[2]-w[0]>=w[3]-w[1],axis=h?0:1;
  const mid=w[axis]+(w[axis+2]-w[axis])*t;
  const a=[...w],b=[...w];a[axis+2]=mid;b[axis]=mid;
  return [a,b];
}
/**
 * Subdivide an added wall wherever it crosses an existing angled / legacy wall.
 * Existing angled walls are also subdivided; legacy walls are subdivided only
 * when canSplitLegacy returns true (to avoid breaking door openings).
 * Intersection points are shared by reference value, IDs stay stable on first piece.
 */
export function insertWallAtJunctions(existing, added, legacy=[], options={}){
  const minLength=options.minLength??100;
  const canSplitLegacy=options.canSplitLegacy??(()=>true);
  const angled=existing.map(w=>structuredClone(w));
  const straight=legacy.map(w=>[...w]);
  const refs=[...angled.map((w,i)=>({kind:'angled',index:i,wall:w})),...legacyAsSegments(straight).map(w=>({kind:'legacy',index:w.index,wall:w}))];
  const cuts=new Map(),addedCuts=[0,1],junctions=[];
  for(const ref of refs){
    const hit=intersectCenterlines(added,ref.wall);if(!hit)continue;
    // If splitting a legacy wall is unsafe, don't create dangling branches there.
    if(ref.kind==='legacy'&&hit.b>EPS&&hit.b<1-EPS&&!canSplitLegacy(ref.index))continue;
    // No tiny wall pieces: reject crossings too close to an endpoint.
    const la=length(added.start,added.end),lb=length(ref.wall.start,ref.wall.end);
    if(hit.a>EPS&&hit.a<1-EPS&&Math.min(hit.a,1-hit.a)*la<minLength)continue;
    if(hit.b>EPS&&hit.b<1-EPS&&Math.min(hit.b,1-hit.b)*lb<minLength)continue;
    addedCuts.push(hit.a);
    if(hit.b>EPS&&hit.b<1-EPS){
      const key=`${ref.kind}:${ref.index}`;
      if(!cuts.has(key))cuts.set(key,[]);
      cuts.get(key).push(hit.b);
    }
    junctions.push({x:hit.point.x,y:hit.point.y,kind:hit.a>EPS&&hit.a<1-EPS&&hit.b>EPS&&hit.b<1-EPS?'X':'T'});
  }
  const unique=ts=>[...new Set(ts.map(t=>Math.round(t*1e9)/1e9))].sort((a,b)=>a-b);
  const pieces=(wall,ts)=>{
    const p=unique([0,...ts,1]),out=[];
    for(let i=1;i<p.length;i++){
      if((p[i]-p[i-1])*length(wall.start,wall.end)<minLength-1e-5)continue;
      out.push({...structuredClone(wall),id:out.length===0?wall.id:`${wall.id}-j${out.length}`,start:lerp(wall.start,wall.end,p[i-1]),end:lerp(wall.start,wall.end,p[i])});
    }
    return out;
  };
  const nextAngled=[];
  angled.forEach((wall,i)=>nextAngled.push(...pieces(wall,cuts.get(`angled:${i}`)||[])));
  const newPieces=pieces(added,addedCuts);
  nextAngled.push(...newPieces);
  const nextLegacy=[],legacyMap=[];
  straight.forEach((wall,i)=>{
    const ts=unique([0,...cuts.get(`legacy:${i}`)||[],1]);
    const start=nextLegacy.length;
    let current=wall;
    for(let j=1;j<ts.length;j++){
      const part=splitLegacyRect(wall,ts[j]);
      const lower=[...wall],axis=wall[2]-wall[0]>=wall[3]-wall[1]?0:1;
      lower[axis]=wall[axis]+(wall[axis+2]-wall[axis])*ts[j-1];
      lower[axis+2]=wall[axis]+(wall[axis+2]-wall[axis])*ts[j];
      nextLegacy.push(lower);
    }
    legacyMap[i]=Array.from({length:nextLegacy.length-start},(_,j)=>start+j);
  });
  return {angledWalls:nextAngled,legacyWalls:nextLegacy,legacyMap,newIndices:newPieces.map((_,i)=>nextAngled.length-newPieces.length+i),junctions};
}
/** Snap a cursor to the nearest wall endpoint OR centerline (for T joints). */
export function snapToJunction(point,legacy=[],angled=[],tolerance=120){
  let best={...point},dist=tolerance;
  for(const wall of [...angled,...legacyAsSegments(legacy)]){
    const dx=wall.end.x-wall.start.x,dy=wall.end.y-wall.start.y,den=dx*dx+dy*dy;
    if(den<EPS)continue;
    const t=clamp(((point.x-wall.start.x)*dx+(point.y-wall.start.y)*dy)/den);
    const q=lerp(wall.start,wall.end,t),d=length(point,q);
    if(d<dist){best=q;dist=d;}
  }
  return best;
}
