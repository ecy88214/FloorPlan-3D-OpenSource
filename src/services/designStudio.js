// Pure project snapshots, version comparison and preliminary Taiwan-dollar estimate.
export const FINISHES = Object.freeze({
 wood:{i18nKey:'ui.materials.floor.wood',label:'淺橡木地板',unit:1800},walnut:{i18nKey:'ui.materials.floor.walnut',label:'胡桃木地板',unit:2400},tile800:{i18nKey:'ui.materials.floor.tile800',label:'800 磁磚',unit:1700},tile600:{i18nKey:'ui.materials.floor.tile600',label:'600 磁磚',unit:1450},antislip:{i18nKey:'ui.materials.floor.antislip',label:'防滑磚',unit:1900},marble:{i18nKey:'ui.materials.floor.marble',label:'大理石',unit:3200},terrazzo:{i18nKey:'ui.materials.floor.terrazzo',label:'磨石子',unit:2100},carpet:{i18nKey:'ui.materials.floor.carpet',label:'地毯',unit:1200}
});
export function plainSnapshot(source){return JSON.parse(JSON.stringify(source));}
export function polygonArea(points=[]){if(points.length<3)return 0;let sum=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];sum+=a[0]*b[1]-b[0]*a[1];}return Math.abs(sum)/2000000;}
export function calculateEstimate(project, options={}){
 const finishPrices={...Object.fromEntries(Object.entries(FINISHES).map(([k,v])=>[k,v.unit])),...(options.finishPrices||{})};
 const rooms=project.architecture?.rooms||[];
 const floor=rooms.filter(r=>r.counted!==false).map(r=>({name:project.rooms?.[r.id]?.name||r.name||r.id,mat:project.rooms?.[r.id]?.mat||r.mat||'tile800',area:polygonArea(r.poly)}));
 const rows=floor.map(r=>({...r,category:'地坪',quantity:r.area,unit:'m²',unitPrice:Math.max(0,Number(finishPrices[r.mat])||0),total:Math.round(r.area*(Number(finishPrices[r.mat])||0))}));
 const furniture=(project.furniture||[]).filter(f=>!String(f.type).startsWith('window')&&!String(f.type).startsWith('door'));
 const price=options.furniturePrices||{};
 for(const f of furniture){const unitPrice=Math.max(0,Number(price[f.type]??f.estimatePrice??3000)||0);rows.push({name:f.name||f.type,category:'家具',quantity:1,unit:'件',unitPrice,total:unitPrice});}
 const subtotal=rows.reduce((a,r)=>a+r.total,0),contingencyRate=Math.max(0,Math.min(1,Number(options.contingencyRate??.1))),contingency=Math.round(subtotal*contingencyRate);
 return {rows,subtotal,contingency,total:subtotal+contingency,area:floor.reduce((a,r)=>a+r.area,0),assumptions:'概算示範單價（新臺幣）；未包含拆除、管線、工資、稅金及現場丈量誤差。'};
}
export function compareDesigns(a,b){const x=calculateEstimate(a),y=calculateEstimate(b);return {roomsA:Object.keys(a.rooms||{}).length,roomsB:Object.keys(b.rooms||{}).length,furnitureA:a.furniture?.length||0,furnitureB:b.furniture?.length||0,areaA:x.area,areaB:y.area,totalA:x.total,totalB:y.total,delta:y.total-x.total};}
export function serializeCsv(rows, currency='TWD'){const values=[['分類','品名','數量','單位',`單價 (${currency})`,`金額 (${currency})`],...rows.map(r=>[r.category,r.name,r.quantity,r.unit,r.unitPrice,r.total])];return '\uFEFF'+values.map(row=>row.map(v=>'"'+String(v??'').replaceAll('"','""')+'"').join(',')).join('\r\n');}
export function safeTitle(value){return String(value||'方案').replace(/[<>\\/:"|?*\x00-\x1f]/g,'_').slice(0,60);}
