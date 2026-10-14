// Phase 2: pure, deterministic floor-plan diagnostics. Coordinates are millimetres.
import { checkFurnitureCollision, excludedFurniture, polygonForFurniture, polygonForWall, polygonDistance, overlapSAT } from '../furniture/core/collisionEngine.js';
const finite = n => Number.isFinite(Number(n));
export function collectPlanIssues(furniture = [], walls = [], { clearance = 600, walkway = 900 } = {}) {
  const objects = furniture.filter(f => f && finite(f.cx) && finite(f.cy) && Number(f.w)>0 && Number(f.d)>0 && !excludedFurniture(f));
  const issues = [], seen = new Set();
  for (const f of objects) {
    const hits = checkFurnitureCollision(f, objects, walls, {clearance});
    for (const hit of hits) {
      const other = hit.type === 'furniture' ? objects.find(x => x.id === hit.otherId) : null;
      const key = hit.type === 'furniture' ? `f:${[String(f.id),String(hit.otherId)].sort().join('|')}` : `w:${String(f.id)}:${hit.wallId}`;
      if (seen.has(key)) continue;
      seen.add(key);
      issues.push({id:key, kind:hit.type, severity:hit.severity, furnitureId:f.id, otherId:other?.id ?? null,
        title:hit.severity === 'collision' ? '物件重疊' : '家具間距不足',
        detail:hit.type === 'wall' ? '家具與牆體重疊' : `${f.name||f.type} / ${other?.name||other?.type||'家具'} · 間距 ${Math.round(hit.distance)} mm`,
        x:(Number(f.cx)+Number(other?.cx ?? f.cx))/2, y:(Number(f.cy)+Number(other?.cy ?? f.cy))/2,
        distance:hit.distance, required:hit.required});
    }
  }
  // A conservative walkway advisory: two parallel-facing furniture edges separated by
  // less than walkway width. This does not claim to perform full path connectivity.
  for (let i=0;i<objects.length;i++) for(let j=i+1;j<objects.length;j++) {
    const a=objects[i],b=objects[j], key=`f:${[String(a.id),String(b.id)].sort().join('|')}`;
    if(seen.has(key))continue;
    const dx=Math.abs(a.cx-b.cx),dy=Math.abs(a.cy-b.cy);
    const horizontalFacing = dy < (a.d+b.d)/2 && dx >= (a.w+b.w)/2;
    const verticalFacing = dx < (a.w+b.w)/2 && dy >= (a.d+b.d)/2;
    if (!horizontalFacing && !verticalFacing) continue;
    const distance=polygonDistance(polygonForFurniture(a),polygonForFurniture(b));
    if(distance >= walkway || distance < clearance)continue;
    issues.push({id:`path:${key}`,kind:'walkway',severity:'advisory',furnitureId:a.id,otherId:b.id,
      title:'可能的狹窄通道',detail:`${a.name||a.type} / ${b.name||b.type} · 淨距約 ${Math.round(distance)} mm（建議 ${walkway} mm）`,
      x:(a.cx+b.cx)/2,y:(a.cy+b.cy)/2,distance,required:walkway});
  }
  return issues;
}
export function makeDimensionLabel(value, unit='mm') {
  const n=Number(value);
  if(!Number.isFinite(n)||n<0)return '—';
  return unit === 'm' ? `${(n/1000).toFixed(2)} m` : `${Math.round(n).toLocaleString('en-US')} mm`;
}
export function chooseIssueSummary(issues){
 return {collisions:issues.filter(i=>i.severity==='collision').length, clearances:issues.filter(i=>i.severity==='clearance').length, walkways:issues.filter(i=>i.severity==='advisory').length};
}
