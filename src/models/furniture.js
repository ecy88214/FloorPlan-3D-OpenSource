import { typeColor } from '../data/catalog.js';
let _n = 1;
export const uid = () => 'f' + Date.now().toString(36) + (_n++);
export const F = (type,name,cx,cy,w,d,rot=0,color) => ({id:uid(),type,name,cx,cy,w,d,rot,color:color||typeColor(type)});
