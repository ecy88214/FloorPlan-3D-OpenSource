// Persistent snapshots in IndexedDB; legacy localStorage keys remain readable.
const DB = 'floorplan-projects-v2';
const STORE = 'documents';
const LEGACY = 'huxing-design-v1';
export function openProjectDB(){
  return new Promise((resolve,reject)=>{
    if(typeof indexedDB==='undefined')return reject(new Error('IndexedDB 不可使用'));
    const req=indexedDB.open(DB,1);
    req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE)};
    req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);
  });
}
async function operate(mode,fn){
  const db=await openProjectDB();
  try {return await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);
    const request=fn(store);let result;
    request.onsuccess=()=>{result=request.result};request.onerror=()=>reject(request.error);
    tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('交易取消'));
  });}finally{db.close()}
}
export const readDocument=key=>operate('readonly',store=>store.get(key));
export const writeDocument=(key,value)=>operate('readwrite',store=>store.put(value,key));
export const deleteDocument=key=>operate('readwrite',store=>store.delete(key));
let pending=Promise.resolve();
export function queueProjectBackup(project){
  // Serialise snapshots so an older save cannot overwrite a newer one.
  // Reactive Project Store state is a deep Proxy, which structuredClone rejects.
  // Serialize immediately so the queued write keeps the exact save-time state.
  const snapshot=JSON.parse(JSON.stringify(project));
  pending=pending.catch(()=>{}).then(async()=>{
    const previous=await readDocument('project:latest');
    if(previous?.value)await writeDocument('project:backup',previous);
    await writeDocument('project:latest',{version:2,updatedAt:new Date().toISOString(),value:snapshot});
  });
  return pending;
}
export async function recoverProject(){
  for(const key of ['project:latest','project:backup']){
    try{const data=await readDocument(key);if(data?.value&&Array.isArray(data.value.furniture))return data.value;}catch(e){console.warn('備份讀取失敗',e)}
  }
  return null;
}
export function saveLegacyProject(project){
  try{localStorage.setItem(LEGACY,JSON.stringify(project));return true}catch(e){console.warn('localStorage 儲存失敗',e);return false}
}
