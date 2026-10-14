import geometry1, { guide as guide1, createFurniture as furniture1 } from './OneBedroom.js';
import geometry2, { guide as guide2, createFurniture as furniture2 } from './TwoBedroom.js';
import geometry3, { guide as guide3, createFurniture as furniture3 } from './ThreeBedroom.js';
import geometry4, { guide as guide4, createFurniture as furniture4 } from './FourBedroom.js';
import emptyGeometry, {guide as emptyGuide, createFurniture as emptyFurniture} from './EmptyLayout.js';
// Vite 將 src/layouts/*.json 於建置時匯入；放入新檔後請重新啟動 dev server。
const jsonModules = import.meta.glob('./*.json', { eager: true, import: 'default' });
const fileNames = { '1':'OneBedroom.json', '2':'TwoBedroom.json', '3':'ThreeBedroom.json', '4':'FourBedroom.json', empty:'EmptyLayout.json' };

// 相容兩種檔案：匯出方案 {architecture, furniture, rooms}，以及 {geometry, furniture}。
function readJsonLayout(type, fallback) {
  const fileName = fileNames[type];
  const data = jsonModules[`./${fileName}`];
  if (!data) return fallback;
  const raw = data.architecture || data.geometry || data;
  const windows = raw.windows || raw.wins || [];
  const result = {
    complete: true,
    height: raw.height || fallback.geometry.height,
    walls: raw.walls,
    wins: windows,
    doors: raw.doors || [],
    slides: raw.slides || [],
    rooms: raw.rooms,
  };
  if (!Array.isArray(result.walls) || !Array.isArray(result.rooms)) {
    console.error(`房型 JSON 格式不正確：${fileName}，改用內建房型`);
    return fallback;
  }
  // clone: the editor mutates furniture and room objects when editing.
  const furniture = Array.isArray(data.furniture) ? data.furniture : fallback.createFurniture();
  return {
    geometry: result,
    guide: { ...fallback.guide, ...(data.guide || {}) },
    createFurniture: () => structuredClone(furniture),
    source: fileName,
  };
}

export const layouts = {'1': {geometry:geometry1,guide:guide1,createFurniture:furniture1},'2': {geometry:geometry2,guide:guide2,createFurniture:furniture2},'3': {geometry:geometry3,guide:guide3,createFurniture:furniture3},'4': {geometry:geometry4,guide:guide4,createFurniture:furniture4}};
layouts.empty = {geometry:emptyGeometry, guide:emptyGuide, createFurniture:emptyFurniture};
for (const type of Object.keys(layouts)) {
  layouts[type] = readJsonLayout(type, layouts[type]);
}

export const LAYOUT_GUIDES = Object.fromEntries(Object.entries(layouts).map(([id, layout]) => [id, layout.guide]));
export const layoutFurniture = type => layouts[type].createFurniture();
