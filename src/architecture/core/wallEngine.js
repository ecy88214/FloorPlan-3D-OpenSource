import {length,boundsOfSegment,segmentFootprint} from './geometry.js';
import {synchronizeWallSegments,normalizeArchitecture} from '../adapters/legacyLayoutAdapter.js';
/** 第一階段資料模型與相容介面；第二階段加入安全編輯命令。 */
export {synchronizeWallSegments,normalizeArchitecture,length,boundsOfSegment,segmentFootprint};
export function validateWallSegments(segments){
  const ids=new Set(), errors=[];
  for(const s of segments){
    if(!s.id || ids.has(s.id))errors.push(`牆段 ID 重複或缺失：${s.id}`);
    ids.add(s.id);
    if(!Number.isFinite(s.thickness)||s.thickness<=0)errors.push(`${s.id} 牆厚錯誤`);
    if(!Number.isFinite(s.height)||s.height<=0)errors.push(`${s.id} 牆高錯誤`);
    if(![s.start.x,s.start.y,s.end.x,s.end.y].every(Number.isFinite)||length(s.start,s.end)<0.001)errors.push(`${s.id} 座標錯誤`);
  }
  return errors;
}
