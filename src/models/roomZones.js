// 從既有房間裁掉新地坪所佔範圍，避免陽台／自訂空間重複計坪。
function clip(poly, axis, edge, positive) {
  const result=[];
  for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length],ia=positive?a[axis]>=edge:a[axis]<=edge,ib=positive?b[axis]>=edge:b[axis]<=edge;
    if(ia)result.push(a);
    if(ia!==ib){const t=(edge-a[axis])/(b[axis]-a[axis]);result.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}
  }
  return result;
}
const polygonArea=p=>Math.abs(p.reduce((sum,a,i)=>{const b=p[(i+1)%p.length];return sum+a[0]*b[1]-b[0]*a[1];},0))/2;
export function subtractZone(poly,[x0,y0,x1,y1]) {
  let inside=poly;const pieces=[];
  for(const [axis,edge,positive] of [[0,x0,true],[0,x1,false],[1,y0,true],[1,y1,false]]){
    if(!inside.length)break;
    const outside=clip(inside,axis,edge,!positive);
    if(outside.length>=3&&polygonArea(outside)>1)pieces.push(outside);
    inside=clip(inside,axis,edge,positive);
  }
  return pieces;
}
