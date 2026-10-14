import {plainSnapshot} from './designStudio.js';
const KEY='floorplan:design-versions-v3';
export function createDesignVersions(storage=typeof localStorage==='undefined'?null:localStorage){
 const read=()=>{try{const data=JSON.parse(storage?.getItem(KEY)||'[]');return Array.isArray(data)?data.filter(v=>v?.id&&v?.project).slice(-30):[];}catch{return [];}};
 const write=list=>{if(!storage)throw Error('瀏覽器儲存空間不可用');storage.setItem(KEY,JSON.stringify(list));return list;};
 return {list:()=>read().map(({project,...meta})=>meta),get:id=>{const x=read().find(v=>v.id===id);return x?plainSnapshot(x.project):null;},save:(name,project)=>{const items=read();const record={id:`v-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,name:String(name||'未命名方案').slice(0,80),createdAt:new Date().toISOString(),project:plainSnapshot(project)};write([...items.slice(-29),record]);return {id:record.id,name:record.name,createdAt:record.createdAt};},remove:id=>write(read().filter(v=>v.id!==id))};
}
