/**
 * Architecture Engine v1 相容層。
 * 舊牆陣列：[x0,y0,x1,y1,'b'|'e'|'n'|'low']，保留原貌供既有 SVG/Three.js 使用。
 * 新牆資料使用中心線+厚度+唯一 ID，可表示任意方向。
 * 注意：第一階段仍以 legacy walls 為編輯來源，保存時同步產生 wallSegments。
 */
import {length} from '../core/geometry.js';
const kinds={b:'structural',e:'exterior',n:'partition',low:'low'};
const legacyKinds={structural:'b',exterior:'e',partition:'n',low:'low'};
const round=v=>Math.round(v*1000)/1000;
export function signatureOfWall(w){return [round(w[0]),round(w[1]),round(w[2]),round(w[3]),w[4]||'n'].join(':');}
function wallId(){return `wall-${globalThis.crypto?.randomUUID?.() || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`}`;}
export function legacyWallToSegment(w, previous){
  if (!Array.isArray(w) || w.length<4 || !w.slice(0,4).every(Number.isFinite)) throw new TypeError('無效的舊版牆體座標');
  const [x0,y0,x1,y1,k='n']=w;
  if (x1<=x0 || y1<=y0) throw new RangeError('舊版牆體必須是非零面積矩形');
  const horizontal=(x1-x0)>=(y1-y0);
  const segment={
    id:previous?.id || wallId(),
    start:horizontal?{x:x0,y:(y0+y1)/2}:{x:(x0+x1)/2,y:y0},
    end:horizontal?{x:x1,y:(y0+y1)/2}:{x:(x0+x1)/2,y:y1},
    thickness:horizontal?y1-y0:x1-x0,
    height:previous?.height ?? 2800,
    type:kinds[k]||'partition',
    loadBearing:k==='b',
    materialId:previous?.materialId??null,
    legacyKind:k,
    legacyRect:[...w],
  };
  return segment;
}
export function segmentToLegacyWall(s){
  if (!s || !Number.isFinite(s.thickness)||s.thickness<=0 || length(s.start,s.end)<=0) throw new RangeError('無效的牆段');
  const {start:a,end:b,thickness:t}=s;
  if (Math.abs(a.y-b.y)<0.001) return [Math.min(a.x,b.x),a.y-t/2,Math.max(a.x,b.x),a.y+t/2,legacyKinds[s.type]||s.legacyKind||'n'];
  if (Math.abs(a.x-b.x)<0.001) return [a.x-t/2,Math.min(a.y,b.y),a.x+t/2,Math.max(a.y,b.y),legacyKinds[s.type]||s.legacyKind||'n'];
  throw new Error('斜牆不能轉成舊版矩形；請由新版繪圖器渲染');
}
export function synchronizeWallSegments(walls,previous=[]){
  const buckets=new Map();
  for(const s of previous||[]){
    const key=s.legacyRect?signatureOfWall(s.legacyRect):null;
    if(key){if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(s);}
  }
  return walls.map(w=>legacyWallToSegment(w,buckets.get(signatureOfWall(w))?.shift()));
}
export function normalizeArchitecture(a){
  const walls=Array.isArray(a?.walls)?a.walls:(a?.wallSegments||[]).map(segmentToLegacyWall);
  const wallSegments=synchronizeWallSegments(walls,a?.wallSegments);
  return {...a,walls:structuredClone(walls),wallSegments,wallSchemaVersion:1};
}
