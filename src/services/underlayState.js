import { readDocument, writeDocument, deleteDocument } from './projectStorage.js';
import { reactive } from 'vue';

export const underlay = reactive({ image: '', name: '', x: 0, y: 0, width: 4000, height: 3000, opacity: .42, visible: true, calibrated: false });
export const underlayKey = 'floorplan:underlay:v1';
export async function restoreUnderlay() {
  try { const saved=await readDocument('underlay:latest'); if(saved?.image?.startsWith('data:image/')) { Object.assign(underlay,saved); return; } } catch(e) { console.warn('底圖備份讀取失敗',e); }
  try {
    const data = JSON.parse(localStorage.getItem(underlayKey) || 'null');
    if (data && typeof data.image === 'string' && data.image.startsWith('data:image/')) { Object.assign(underlay, data); saveUnderlay(); }
  } catch (e) { console.warn('無法恢復底圖', e); }
}
let underlayWrite=Promise.resolve();
export function saveUnderlay() {
  // Metadata + image are persisted asynchronously to avoid localStorage's ~5MB quota.
  const snapshot=structuredClone({...underlay});
  underlayWrite=underlayWrite.catch(()=>{}).then(()=>writeDocument('underlay:latest',snapshot));
  underlayWrite.catch(e=>{
    console.warn('底圖儲存失敗',e);
    if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('floorplan:storage-error',{detail:{message:'底圖儲存失敗，請匯出方案備份'}}));
  });
  return true;
}
export function clearUnderlay() {
  Object.assign(underlay,{image:'',name:'',x:0,y:0,width:4000,height:3000,opacity:.42,visible:true,calibrated:false});
  underlayWrite=underlayWrite.catch(()=>{}).then(()=>deleteDocument('underlay:latest'));
  underlayWrite.catch(e=>console.warn('底圖刪除失敗',e));
  try{localStorage.removeItem(underlayKey)}catch{}
}
export function calibrateUnderlay(a, b, millimetres) {
  const measured = Math.hypot(b.x-a.x, b.y-a.y);
  if (!Number.isFinite(millimetres) || millimetres <= 0 || measured < 2) throw new Error('請選擇兩個不同的端點，並輸入大於 0 的實際長度');
  const f = millimetres / measured;
  underlay.x = a.x + (underlay.x-a.x)*f;
  underlay.y = a.y + (underlay.y-a.y)*f;
  underlay.width *= f;
  underlay.height *= f;
  underlay.calibrated = true;
  return f;
}
// Apply a pixel-derived physical scale while keeping the image centre fixed in plan coordinates.
export function calibrateUnderlayFromPixels(mmPerPixel, imageWidth, imageHeight) {
  if(!Number.isFinite(mmPerPixel)||mmPerPixel<=0||!Number.isFinite(imageWidth)||imageWidth<=0||!Number.isFinite(imageHeight)||imageHeight<=0)throw new Error('自動比例數值無效');
  const centerX=underlay.x+underlay.width/2,centerY=underlay.y+underlay.height/2;
  underlay.width=mmPerPixel*imageWidth;underlay.height=mmPerPixel*imageHeight;
  underlay.x=centerX-underlay.width/2;underlay.y=centerY-underlay.height/2;
  underlay.calibrated=true;
}
