import {segmentFootprint} from './geometry.js';
/** 端點吸附：牆中心線端點是唯一接合座標（mm）。 */
export function snapEndpoint(point, legacyWalls=[], angledWalls=[], tolerance=120, skip=-1){
  const endpoints=[];
  legacyWalls.forEach(w=>{const horizontal=(w[2]-w[0])>=(w[3]-w[1]);if(horizontal)endpoints.push({x:w[0],y:(w[1]+w[3])/2},{x:w[2],y:(w[1]+w[3])/2});else endpoints.push({x:(w[0]+w[2])/2,y:w[1]},{x:(w[0]+w[2])/2,y:w[3]});});
  angledWalls.forEach((w,i)=>{if(i!==skip)endpoints.push(w.start,w.end);});
  let closest=point, dist=tolerance;
  for(const p of endpoints){const d=Math.hypot(point.x-p.x,point.y-p.y);if(d<dist){dist=d;closest=p;}}
  return {...closest};
}
function intersection(a,v,b,w){const d=v.x*w.y-v.y*w.x;if(Math.abs(d)<1e-7)return null;const s=((b.x-a.x)*w.y-(b.y-a.y)*w.x)/d;return {x:a.x+s*v.x,y:a.y+s*v.y};}
/** 同厚度接角做 miter 拼接，超過斜接限制則保留方角，避免尖刺。 */
export function joinFootprints(walls){
  const shapes=walls.map(w=>segmentFootprint(w));
  const groups=new Map();
  walls.forEach((w,i)=>[w.start,w.end].forEach((p,end)=>{
    const k=`${p.x.toFixed(3)}:${p.y.toFixed(3)}`;
    if(!groups.has(k))groups.set(k,[]);
    groups.get(k).push({i,end,p});
  }));
  // 只對恰好兩段共端點、同厚度牆進行 miter；T 字接點和多岔口不裁切，避免拓樸破損。
  for(const pair of groups.values()){
    if(pair.length!==2)continue;
    const [a,b]=pair,A=walls[a.i],B=walls[b.i];
    if(Math.abs(A.thickness-B.thickness)>1)continue;
    const dir=(w,end)=>{
      const other=end===0?w.end:w.start;
      const l=Math.hypot(other.x-w[end===0?'start':'end'].x,other.y-w[end===0?'start':'end'].y);
      return {x:(other.x-a.p.x)/l,y:(other.y-a.p.y)/l};
    };
    const da=dir(A,a.end),db=dir(B,b.end);
    if(Math.abs(da.x*db.y-da.y*db.x)<0.08)continue;
    const offsets=(entry,w,d)=>{
      const n={x:-d.y*w.thickness/2,y:d.x*w.thickness/2};
      return [{p:{x:entry.p.x+n.x,y:entry.p.y+n.y},idx:entry.end===0?0:2},
              {p:{x:entry.p.x-n.x,y:entry.p.y-n.y},idx:entry.end===0?3:1}];
    };
    const oa=offsets(a,A,da),ob=offsets(b,B,db);
    // 對同一外側的兩條邊相交形成共同 miter 點，並限制接角延伸不超過三倍牆厚。
    for(const side of [0,1]){
      const pa=oa[side],pb=ob[1-side];
      const meet=intersection(pa.p,da,pb.p,db);
      if(!meet||Math.hypot(meet.x-a.p.x,meet.y-a.p.y)>3*A.thickness)continue;
      shapes[a.i][pa.idx]=[meet.x,meet.y];
      shapes[b.i][pb.idx]=[meet.x,meet.y];
    }
  }
  return shapes;
}
