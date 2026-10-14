import { room } from './shared.js';

export const guide = {name:'空白房型', title:'自訂房型 · 裝修設計', enTitle:'Custom floor plan', note:'自訂長寬後，從家具庫加入牆體、門窗、房間與陽台。', en:'Set dimensions, then add walls, openings, rooms and balconies.'};
export function createEmptyGeometry(width=8000, depth=6000) {
  const t=180;
  return {complete:true, rooms:[room('space','開放空間',0,0,width,depth,'tile800')],
    walls:[[0,-t,width,0,'e'],[-t,-t,0,depth+t,'e'],[width,-t,width+t,depth+t,'e'],[0,depth,width,depth+t,'e']],wins:[],doors:[],slides:[]};
}
export const createFurniture = () => [];
export default createEmptyGeometry();
