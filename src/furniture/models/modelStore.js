// F5: binary GLB assets are kept in IndexedDB; plans store only stable asset IDs.
const DB='floorplan-custom-models-v1', STORE='models';
let dbPromise;
export function openModelDB(){
  if(!dbPromise) dbPromise=new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB,1);
    request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id'});};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
  return dbPromise;
}
async function transact(mode,work){const db=await openModelDB();return new Promise((resolve,reject)=>{const t=db.transaction(STORE,mode),s=t.objectStore(STORE);const request=work(s);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);t.onerror=()=>reject(t.error);});}
export const getModel=id=>transact('readonly',s=>s.get(id));
export const getAllModels=()=>transact('readonly',s=>s.getAll());
export const saveModel=entry=>transact('readwrite',s=>s.put(entry));
export const deleteModel=id=>transact('readwrite',s=>s.delete(id));
export async function loadModelFile(file,metadata={}){
  if(!file || !/\.glb$/i.test(file.name)) throw new Error('目前僅支援 .glb 檔案');
  if(file.size>30*1024*1024)throw new Error('GLB 檔案不得超過 30 MB');
  const id='glb-'+crypto.randomUUID();
  const entry={id,name:metadata.name||file.name.replace(/\.glb$/i,''),width:metadata.width||1000,depth:metadata.depth||1000,height:metadata.height||1000,createdAt:Date.now(),bytes:file.size,blob:file};
  await saveModel(entry);return entry;
}
export const modelCatalogItem=e=>['customglb',e.name,e.width,e.depth,'#b3c5d1',e.id];
export async function refreshModelCatalog(LIB){
  const models=await getAllModels();let cat=LIB.find(c=>c.cat==='我的 3D 模型');
  if(!cat){cat={cat:'我的 3D 模型',items:[]};LIB.push(cat);}
  cat.items=models.sort((a,b)=>b.createdAt-a.createdAt).map(modelCatalogItem);
  return models;
}
