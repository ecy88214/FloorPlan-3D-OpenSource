// Smart Furniture F1: pure millimetre geometry; no DOM, Three.js, or editor state.
const dot=(a,b)=>a.x*b.x+a.y*b.y;
const rad=deg=>deg*Math.PI/180;
const round10=v=>Math.round(v/10)*10;
export function furnitureHalfExtents(f){const c=Math.abs(Math.cos(rad(f.rot||0))),s=Math.abs(Math.sin(rad(f.rot||0)));return {x:(f.w*c+f.d*s)/2,y:(f.w*s+f.d*c)/2};}
export function wallSegmentsFromPlan(rects=[],angled=[],demolished=[]){const result=[];rects.forEach((r,i)=>{if(demolished.includes('w'+i))return;const [x0,y0,x1,y1]=r;const horizontal=(x1-x0)>=(y1-y0);result.push({a:horizontal?{x:x0,y:(y0+y1)/2}:{x:(x0+x1)/2,y:y0},b:horizontal?{x:x1,y:(y0+y1)/2}:{x:(x0+x1)/2,y:y1},thickness:horizontal?y1-y0:x1-x0});});angled.forEach(w=>{if(w.start&&w.end)result.push({a:w.start,b:w.end,thickness:w.thickness||180});});return result;}
export function calculateFurnitureSnap(f,candidate,others=[],walls=[],tolerance=100,{wallSnap=true,furnitureSnap=true}={}){
 let x=round10(candidate.x),y=round10(candidate.y);let guides=[];
 const half=furnitureHalfExtents(f),tol=Math.max(1,tolerance);
 // X and Y each select one nearest edge/centre guide (not a chain of independent snapping).
 const best={x:null,y:null};
 const offer=(axis,target,distance,guide)=>{const delta=Math.abs(distance);if(delta>tol||best[axis]&&best[axis].delta<=delta)return;best[axis]={target,delta,guide};};
 if(furnitureSnap)for(const other of others){if(other.id===f.id||!Number.isFinite(other.cx)||!Number.isFinite(other.cy))continue;
 const h=furnitureHalfExtents(other);
 const ox=[other.cx-h.x,other.cx,other.cx+h.x],oy=[other.cy-h.y,other.cy,other.cy+h.y];
 const nearY=Math.abs(y-other.cy)<(half.y+h.y+tol+500),nearX=Math.abs(x-other.cx)<(half.x+h.x+tol+500);
 if(nearY)for(const anchor of ox)for(const offset of [-half.x,0,half.x])offer('x',anchor-offset,(anchor-offset)-candidate.x,{axis:'x',position:anchor,from:Math.min(y-half.y,other.cy-h.y)-300,to:Math.max(y+half.y,other.cy+h.y)+300,kind:'furniture'});
 if(nearX)for(const anchor of oy)for(const offset of [-half.y,0,half.y])offer('y',anchor-offset,(anchor-offset)-candidate.y,{axis:'y',position:anchor,from:Math.min(x-half.x,other.cx-h.x)-300,to:Math.max(x+half.x,other.cx+h.x)+300,kind:'furniture'});
 }
 // Wall snapping: project furniture centre onto actual wall normal. Support half extent for rotated furniture.
 // Only align to the centreline span (plus half-size tolerance), never to an infinite wall extension.
 let wallBest=null;
 if(wallSnap)for(const w of walls){const vx=w.b.x-w.a.x,vy=w.b.y-w.a.y,L=Math.hypot(vx,vy);if(L<20)continue;
 const u={x:vx/L,y:vy/L},n={x:-u.y,y:u.x};const along=dot({x:candidate.x-w.a.x,y:candidate.y-w.a.y},u);
 const alongAllowance=half.x*Math.abs(u.x)+half.y*Math.abs(u.y);
 if(along < -alongAllowance||along>L+alongAllowance)continue;
 const side=dot({x:candidate.x-w.a.x,y:candidate.y-w.a.y},n);
 const extent=half.x*Math.abs(n.x)+half.y*Math.abs(n.y),desired=Math.sign(side||1)*((w.thickness||180)/2+extent);
 const delta=desired-side;
 if(Math.abs(delta)>tol||wallBest&&wallBest.delta<=Math.abs(delta))continue;
 wallBest={delta:Math.abs(delta),x:candidate.x+n.x*delta,y:candidate.y+n.y*delta,guide:{axis:'wall',a:w.a,b:w.b,position:{x:candidate.x+n.x*delta,y:candidate.y+n.y*delta},distance:Math.round(Math.abs(delta)),kind:'wall'}};
 }
 // Prefer walls when closer; avoid mixing wall adjustment with orthogonal alignment that pulls the item away.
 if(wallBest&&(!best.x&&!best.y||wallBest.delta <= Math.min(best.x?.delta??Infinity,best.y?.delta??Infinity))){
   x=wallBest.x;y=wallBest.y;guides=[wallBest.guide];
 }else{
   if(best.x){x=best.x.target;guides.push(best.x.guide);}
   if(best.y){y=best.y.target;guides.push(best.y.guide);}
 }
 return {x,y,guides};
}
