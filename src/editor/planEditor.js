import { authorizeExport } from '../services/exportAccess.js';
import { formatCurrency } from '../i18n/currency.js';
import { createProjectStore } from '../stores/projectStore.js';
import { createSelectionManager } from './selectionManager.js';
import { createSvgRenderer, setSvgLayerMarkup } from './svgRendering.js';
import { area, perim, bbox, aabb, fmt, ping, areaUnit, norm } from './planMetrics.js';
import { createHistoryManager } from './historyManager.js';
import { createCommandSystem } from './commandSystem.js';
import { createPointerController } from './pointerController.js';
import { collectPlanIssues, chooseIssueSummary, makeDimensionLabel } from './planDiagnostics.js';
import { queueProjectBackup, saveLegacyProject, recoverProject } from '../services/projectStorage.js';
import {refreshModelCatalog} from '../furniture/models/modelStore.js';
import {openModelManager} from '../services/modelManager.js';
import { rotateFurnitureSet, makeFurnitureGroup, clearFurnitureGroup } from '../furniture/core/groupEngine.js';
import { alignFurniture, distributeFurniture } from '../furniture/core/alignmentEngine.js';
import { checkFurnitureCollision, polygonForFurniture, excludedFurniture } from '../furniture/core/collisionEngine.js';
import { calculateFurnitureSnap, wallSegmentsFromPlan } from '../furniture/core/snapEngine.js';
import { isOpening, wallCentreLines, placeOpening } from '../architecture/core/openingPlacement.js';
import { showFurniturePreview } from '../services/furniturePreview3d.js';
import { sceneController } from '../services/sceneController.js';
import { synchronizeWallSegments, normalizeArchitecture } from '../architecture/core/wallEngine.js';
import { segmentFootprint, length as segmentLength } from '../architecture/core/geometry.js';
import { snapEndpoint, joinFootprints } from '../architecture/core/cornerEngine.js';
import { insertWallAtJunctions, snapToJunction } from '../architecture/core/junctionEngine.js';
import { viewState } from '../stores/viewState.js';
import { layouts, LAYOUT_GUIDES, layoutFurniture } from '../layouts/index.js';
import { R, shell, entry } from '../layouts/shared.js';
import { MATS, LIB, typeColor } from '../data/catalog.js';
import { F, uid } from '../models/furniture.js';
import { createEmptyGeometry } from '../layouts/EmptyLayout.js';
import { houseBounds, resizeArchitecture } from '../models/houseGeometry.js';
import { balconyPresets } from '../data/balconyPresets.js';
import { completeCatalog } from '../data/completeCatalog.js';
import { subtractZone } from '../models/roomZones.js';
const WALLS=[], WINS=[], DOORS=[], SLIDES=[], ROOMS=[];
let WALL_SEGMENTS = [];
const ANGLED_WALLS = [];

/* ======================= 多語言（繁體中文 / English，預設繁體中文） ======================= */
const LANG_KEY = 'huxing-lang';
const LANGS = ["en", "zh", "zh-TW", "ja", "ko", "tr", "ru", "vi", "th", "de", "es", "fr", "uk", "pl", "pt-BR", "ar", "fa", "id", "it", "el", "zht"];
let LANG = (() => { try { const l = localStorage.getItem(LANG_KEY); return LANGS.includes(l) ? l : 'en'; } catch(e) { return 'en'; } })();
// 简 → 繁：先按词替換一字多义的字，再逐字查表（表由 OpenCC s2tw 按本頁用到的字生成）
const S2T_PHRASES = [
  ['布置','佈置'],['布局','佈局'],['台面','檯面'],['复制','複製'],
  ['户型','戶型'],['房间','房間'],['家具库','家具庫'],['平面图','平面圖'],
  ['选择','選取'],['测量','量測'],['拆改','拆除／變更'],['导入','匯入'],['导出','匯出'],['漫游','漫遊']
];
const S2T = new Map(('与與两兩个個为為书書于於仅僅从從价價会會传傳体體余餘侧側倾傾储儲儿兒关關内內写寫净淨准準击擊则則刚剛删刪制製办辦动動势勢区區单單占佔卧臥卫衛厅廳历歷压壓厨廚双雙发發变變叶葉后後吗嗎听聽启啟哑啞围圍图圖圆圓场場坐座块塊垫墊墙牆处處备備复復头頭妆妝婴嬰实實宽寬对對导導层層屉屜属屬岛島带帶干乾并並库庫应應开開当當径徑态態总總悬懸懒懶户戶护護拟擬择擇挂掛挡擋挤擠损損换換据據摆擺摇搖撑撐数數无無时時显顯暂暫机機杂雜杆桿条條来來松鬆构構柜櫃标標栈棧栏欄样樣梁樑棱稜椭橢横橫橱櫥气氣没沒注註浅淺测測浏瀏游遊滚滾满滿灯燈灵靈点點热熱状狀独獨环環现現电電画畫监監盖蓋盘盤砖磚确確离離积積称稱竖豎筑築签籤类類约約级級线線结結绕繞绘繪给給统統继繼绿綠缀綴编編缝縫缩縮网網联聯脚腳获獲虚虛装裝见見视視览覽触觸计計认認让讓议議记記设設识識译譯该該语語请請读讀调調负負败敗质質贴貼赶趕转轉轮輪软軟轴軸轻輕载載较較辅輔辑輯边邊过過这這进進远遠适適选選邻鄰里裡针針钢鋼钮鈕铰鉸铺鋪销銷锁鎖键鍵镜鏡长長门門闭閉闲閒间間阅閱阳陽阴陰阶階随隨隐隱静靜页頁顶頂项項顺順颜顏飘飄飞飛马馬鸟鳥齐齊龙龍').match(/../gu).map(p => [...p]));
const TW_TERMS = [['没有可撤销的操作','沒有可復原的操作'],['撤销','復原'],['撤銷','復原'],['可撤销','可復原'],['可撤銷','可復原'],['户型装修设计','房型室內設計'],['户型装修方案','房型室內設計方案'],['装修设计','室內設計'],['装修方案','設計方案'],['户型','房型'],['戶型','房型'],['入户门','入口門'],['入戶門','入口門'],['入户','入口'],['入戶','入口'],['鼠标','滑鼠'],['鼠標','滑鼠'],['左键','滑鼠左鍵'],['右键','滑鼠右鍵'],['左鍵','滑鼠左鍵'],['右鍵','滑鼠右鍵'],['点击','點擊'],['點選','點選'],['选中','選取'],['选择','選取'],['取消选择','取消選取'],['拖动','拖曳'],['拖動','拖曳'],['摇杆','搖桿'],['适应窗口','符合視窗'],['適應窗口','符合視窗'],['全屏','全螢幕'],['全螢幕幕','全螢幕'],['语言','語言'],['語言 / 語言','語言 / Language'],['清空所有家具家电','清空所有家具及家電'],['家具家电','家具與家電'],['布置','配置'],['佈置','配置'],['布局','格局'],['佈局','格局'],['燃气灶','瓦斯爐'],['燃氣灶','瓦斯爐'],['马桶','馬桶'],['淋浴房','淋浴間'],['飘窗','飄窗'],['橱柜台面','廚櫃檯面'],['橱柜','廚櫃'],['橱櫃','廚櫃'],['台面','檯面'],['绿植','植栽'],['綠植','植栽'],['大植栽','大型植栽'],['落地灯','立燈'],['落地燈','立燈'],['餐厨','餐廚'],['子女房','次臥室'],['小孩房','兒童房'],['休闲','休閒'],['茶几','茶几'],['过道','走道'],['洗衣池','洗衣槽'],['洗手盆','洗手台'],['水槽','水槽'],['干湿分离','乾濕分離'],['對開門冰箱','對開式冰箱'],['对开门冰箱','對開式冰箱'],['65 寸','65 吋'],['55 寸','55 吋'],['空调','冷氣'],['空調','冷氣'],['烘干机','烘衣機'],['烘乾機','烘衣機'],['储物柜','收納櫃'],['儲物櫃','收納櫃'],['柜机','落地式'],['櫃機','落地式'],['挂机','壁掛式'],['掛機','壁掛式'],['点门开关','點擊門片開關'],['开关门','開關門'],['點擊門片開關門','點擊門片開關'],['画面上拖曳','畫面上拖曳'],['拖曳摆放','拖曳擺放'],['平面图','平面圖'],['复制','複製'],['删除','刪除'],['清空','清空'],['占地面积','占地面積'],['适应','符合'],['默认','預設'],['恢复为','還原成'],['恢复','還原'],['測量','量測'],['测量','量測'],['贴墙吸附','貼齊牆面']];
const s2t = s => {
  const localized = TW_TERMS.reduce((a, [from, to]) => a.replaceAll(from, to), String(s ?? ''));
  return S2T_PHRASES.reduce((a, [from, to]) => a.replaceAll(from, to), localized).replace(/[\u3400-\u9fff]/g, c => S2T.get(c) || c);
};
const tr = (zh, en) => {
  const translate = window.floorplanTranslate;
  const fallback = en || zh;
  if (!translate) return fallback;
  const fromEnglish = translate(fallback);
  if (fromEnglish !== fallback) return fromEnglish;
  const fromChinese = translate(zh);
  // Never send Chinese originals back into the English UI when no key exists.
  if (LANG === 'en') return fallback;
  return fromChinese !== zh ? fromChinese : fallback;
};
const T = (key, params) => window.floorplanTranslate?.(key, params) ?? key;
const money = value => formatCurrency(value, LANG);
// 內置的房間 / 材料 / 家具名稱存的是中文；英文界面下顯示譯名，用戶自己改過的名稱原樣顯示
const NAMES_EN = {
  '主卧室':'Master Bedroom', '主卫浴':'Master Bath', '小孩房':"Kids' Room", '客卫浴':'Guest Bath', '洗衣阳台':'Laundry Balcony',
  '子女房':"Children's Room", '厨房':'Kitchen', '餐厅':'Dining', '过道':'Hallway', '客厅':'Living Room', '休闲阳台':'Leisure Balcony',
  '主卧飘窗':'Master Bay Window', '子女房飘窗':"Children's Bay Window",
  '橡木地板':'Oak Flooring', '胡桃木地板':'Walnut Flooring', '800 地砖':'800 Tile', '600 地砖':'600 Tile', '大理石':'Marble',
  '300 防滑砖':'300 Anti-slip Tile', '水磨石':'Terrazzo', '满铺地毯':'Wall-to-wall Carpet',
  '卧室':'Bedroom', '餐厨':'Dining & Kitchen', '卫浴':'Bathroom', '家电':'Appliances', '书房 · 休闲':'Study & Leisure',
  '双人床 1.8m':'Double Bed 1.8m', '双人床 1.5m':'Double Bed 1.5m', '双人床':'Double Bed', '单人床':'Single Bed', '婴儿床':'Crib',
  '床头柜':'Nightstand', '衣柜':'Wardrobe', '小衣柜':'Small Wardrobe', '梳妆台':'Dresser', '书桌':'Desk', '椅子':'Chair',
  '书架':'Bookshelf', '飘窗垫':'Bay Cushion', '三人沙发':'3-Seat Sofa', '双人沙发':'Loveseat', '转角沙发':'Corner Sofa',
  '单人沙发':'Armchair', '懒人沙发':'Beanbag', '茶几':'Coffee Table', '边几':'Side Table', '电视柜':'TV Stand', '地毯':'Rug',
  '鞋柜':'Shoe Cabinet', '玄关柜':'Entry Cabinet', '落地灯':'Floor Lamp', '绿植':'Plant', '大绿植':'Large Plant',
  '餐桌':'Dining Table', '六人餐桌':'6-Seat Dining Table', '圆桌':'Round Table', '餐椅':'Dining Chair', '岛台':'Kitchen Island',
  '吧椅':'Bar Stool', '橱柜台面':'Kitchen Counter', '燃气灶':'Gas Stove', '水槽':'Sink', '冰箱':'Fridge', '餐边柜':'Sideboard',
  '马桶':'Toilet', '免治馬桶':'Bidet Toilet', '浴室柜':'Vanity', '双盆浴室柜':'Double Vanity', '淋浴房':'Shower', '淋浴区':'Shower Area', '浴缸':'Bathtub',
  '洗衣机':'Washer', '洗衣池':'Laundry Sink', '电热水器':'Water Heater', '储物柜':'Storage Cabinet', '65 寸电视':'65" TV',
  '55 寸电视':'55" TV', '对开门冰箱':'French-door Fridge', '柜机空调':'Floor AC', '挂机空调':'Wall AC', '洗碗机':'Dishwasher',
  '蒸烤箱高柜':'Oven Tower', '烘干机':'Dryer', '空气净化器':'Air Purifier', '长书桌':'Long Desk', '办公椅':'Office Chair',
  '大书架':'Large Bookshelf', '立式钢琴':'Upright Piano', '跑步机':'Treadmill', '阅读椅':'Reading Chair', '茶桌':'Tea Table', '休闲椅':'Lounge Chair',
};
const ROOM_NAME_KEYS = {
  '小孩房':'ui.kids.room', '兒童房':'ui.kids.room', "Kids' Room":'ui.kids.room', 'Kids’ Room':'ui.kids.room', 'Kids Room':'ui.kids.room',
  '子女房':'ui.children.room', '次臥室':'ui.children.room', "Children's Room":'ui.children.room', 'Children’s Room':'ui.children.room', 'Children Room':'ui.children.room'
};
const nm = s => {
  const normalized = String(s ?? '').trim().replace(/[‘’]/g, "'");
  const roomKey = ROOM_NAME_KEYS[normalized];
  if (roomKey) return T(roomKey);
  const direct=window.floorplanTranslate?.(s) ?? s;
  if (direct !== s) return direct;
  const english=NAMES_EN[s] ?? Object.entries(NAMES_EN).find(([key]) => s2t(key) === s2t(s))?.[1] ?? s;
  return window.floorplanTranslate?.(english) ?? english;
};
// 靜態文案：元素上寫 data-en / data-en-title，中文原文首次切換時存進 dataset
function applyStaticLang(){
  document.documentElement.lang = LANG === 'zht' ? 'zh-TW' : LANG;
  document.title = tr('房型室內設計', 'Floor Plan Designer');
  document.querySelectorAll('[data-en]').forEach(el => { if (el.closest('.ribbon, .admin-page, .login-page, .help-overlay')) return; el.dataset.zh ??= el.textContent; el.textContent = tr(el.dataset.zh, el.dataset.en); });
  document.querySelectorAll('[data-en-title]').forEach(el => { if (el.closest('.ribbon, .admin-page, .login-page, .help-overlay')) return; el.dataset.zhTitle ??= el.title; el.title = tr(el.dataset.zhTitle, el.dataset.enTitle); });
  document.querySelectorAll('#langSel [data-lang]').forEach(b => { const on = b.dataset.lang === LANG; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); });
}

function applyLayoutGeometry(type){
  const p = layouts[type].geometry;
  const walls = type === '3' || p.complete ? p.walls : [...shell(p.doors?.find(d => d.entry)?.rect || entry.rect, p.height || 10560), ...p.walls];
  const doors = type === '3' ? p.doors : p.doors;
  ROOMS.splice(0, ROOMS.length, ...structuredClone(p.rooms));
  WALLS.splice(0, WALLS.length, ...structuredClone(walls));
  WALL_SEGMENTS = synchronizeWallSegments(WALLS);
  ANGLED_WALLS.length = 0;
  WINS.splice(0, WINS.length, ...structuredClone(p.wins || [[1800,-240,3600,0],[7000,-240,9000,0],[10270,6500,10510,9000]]));
  DOORS.splice(0, DOORS.length, ...structuredClone(doors));
  SLIDES.splice(0, SLIDES.length, ...structuredClone(p.slides || []));
}
// 將建築格局中的固定窗戶變成和家具庫相同的可編輯物件。
// 幾何矩形永遠保持 axis-aligned，直向窗戶使用旋轉 90 度表示。
function moveArchitecturalWindowsIntoFurniture(furniture) {
  if (!WINS.length) return;
  const converted = WINS.map(([x0,y0,x1,y1]) => {
    const horizontal = x1 - x0 >= y1 - y0;
    return F('windowbuilt', '建築窗戶', (x0+x1)/2, (y0+y1)/2,
      horizontal ? x1-x0 : y1-y0,
      horizontal ? y1-y0 : x1-x0,
      horizontal ? 0 : 90, '#b9dce9');
  });
  furniture.push(...converted);
  WINS.splice(0, WINS.length);
}

function makeState(type = '3'){
  applyLayoutGeometry(type);
  setPlanBounds(type);
  const rooms = {}; ROOMS.forEach(r => rooms[r.id] = {name:r.name, mat:r.mat});
  const furniture = layoutFurniture(type);
  moveArchitecturalWindowsIntoFurniture(furniture);
  return {layoutType:type, furniture, rooms, architecture:captureArchitecture(rooms), demolished:[], measures:[], archVersion:0};
}

function defaultState(){
  return makeState('3');
}



const STORE = 'huxing-design-v1';
const ARCHITECTURE_VERSION = 2;

// 所有結構性資料集中在 architecture；畫面上的 WALLS／WINS／DOORS／ROOMS
// 只是目前格局的工作副本。如此牆、窗、門和房間能與家具一起被永久保存。
function captureArchitecture(roomSettings = {}){
  return {
    version: ARCHITECTURE_VERSION,
    walls: structuredClone(WALLS),
    wallSegments: structuredClone([... (WALL_SEGMENTS = synchronizeWallSegments(WALLS, WALL_SEGMENTS)), ...ANGLED_WALLS]),
    angledWalls: structuredClone(ANGLED_WALLS),
    wallSchemaVersion: 1,
    windows: structuredClone(WINS),
    doors: structuredClone(DOORS),
    slides: structuredClone(SLIDES),
    rooms: structuredClone(ROOMS).map(r => ({...r, ...(roomSettings[r.id] || {})}))
  };
}
function hasArchitecture(a){
  return !!a && Array.isArray(a.walls) && Array.isArray(a.windows) && Array.isArray(a.doors) && Array.isArray(a.slides) && Array.isArray(a.rooms);
}
function restoreArchitecture(a){
  if (!hasArchitecture(a)) return false;
  // Project Store exposes deep Proxy objects. structuredClone() cannot clone a
  // Proxy (including nested arrays), so remove the reactive wrapper at this
  // boundary before normalizeArchitecture and the architecture working copies.
  const architecture = JSON.parse(JSON.stringify(a));
  const normalized = normalizeArchitecture(architecture);
  WALLS.splice(0, WALLS.length, ...structuredClone(normalized.walls));
  WALL_SEGMENTS = normalized.wallSegments.filter(seg => seg.legacyRect);
  ANGLED_WALLS.splice(0, ANGLED_WALLS.length, ...structuredClone(architecture.angledWalls || normalized.wallSegments.filter(seg => !seg.legacyRect)));
  WINS.splice(0, WINS.length, ...structuredClone(architecture.windows));
  DOORS.splice(0, DOORS.length, ...structuredClone(architecture.doors));
  SLIDES.splice(0, SLIDES.length, ...structuredClone(architecture.slides));
  ROOMS.splice(0, ROOMS.length, ...structuredClone(architecture.rooms));
  return true;
}
function syncArchitecture(){
  if (!state) return;
  state.architecture = captureArchitecture(state.rooms || {});
}
function load(){
  try { const s = JSON.parse(localStorage.getItem(STORE)); if (s && Array.isArray(s.furniture)) return fixState(s); } catch(e) {}
  return null;
}
function fixState(s){
  const type = LAYOUT_GUIDES[s.layoutType] ? s.layoutType : '3';
  const d = makeState(type);
  const savedArchitectureVersion = Number(s?.architecture?.version || 0);
  // 尊重使用者已儲存的建築修改；僅無效或缺少架構時才使用預設房型。
  const shouldRefreshDefaultArchitecture = !hasArchitecture(s.architecture);
  if (!shouldRefreshDefaultArchitecture && restoreArchitecture(s.architecture)) {
    // keep saved architecture
  } else {
    applyLayoutGeometry(type);
  }
  // 舊版的 architecture.windows 不可操作：載入時轉成家具物件並清掉舊窗。
  // 當舊快取刷新房型時，依現有座標比對以免產生重複窗戶。
  const convertedWindows = [];
  moveArchitecturalWindowsIntoFurniture(convertedWindows);
  for (const f of convertedWindows) {
    const exists = s.furniture.some(other => other.type === 'windowbuilt' &&
      Math.abs(other.cx-f.cx) < 3 && Math.abs(other.cy-f.cy) < 3 &&
      Math.abs(other.w-f.w) < 3 && Math.abs(other.d-f.d) < 3);
    if (!exists) s.furniture.push(f);
  }
  const archRooms = Object.fromEntries(ROOMS.map(r => [r.id, {name:r.name, mat:r.mat}]));
  s.rooms = Object.assign(d.rooms, archRooms, s.rooms || {});
  s.layoutType = type;
  s.demolished = s.demolished || [];
  s.measures = s.measures || [];
  s.archVersion = s.archVersion || 0;
  s.architecture = captureArchitecture(s.rooms); // 舊版方案載入時自動升級
  return s;
}

const PX_MM = 25.4 / 96;                       // 1 CSS px = 0.2646 mm
const COARSE = matchMedia('(pointer:coarse)').matches;   // iPad / 手機等觸屏為主的設備
const TAP = COARSE ? 9 : 4;                    // 手指按下後移動超過該像素才算拖曳
const narrow = () => matchMedia('(max-width:1100px)').matches;
let BOUNDS = {x:-1850, y:-1750, w:15600, h:14100};
// 一房參考圖是較緊湊的 9m 外框，不能再使用三房的 10.56m 畫布，
// 否則平面會被大量空白稀釋，視覺比例就會與提供的配置圖相差太多。
function setPlanBounds(type){
  BOUNDS = type === '1'
    ? {x:-1500, y:-1550, w:13300, h:12100}
    : {x:-1850, y:-1750, w:15600, h:14100};
}
const $ = s => document.querySelector(s);
const svg = $('#plan');


/* ======================= 狀態 / 歷史 / 存儲 ======================= */
const initialStoredProject = load();
const projectStore = createProjectStore(initialStoredProject || defaultState());
let state = projectStore.getState();
// Keep older editor callbacks compatible while Project Store owns state replacement.
function replaceProject(next) { state = projectStore.replace(next); return state; }
setPlanBounds(state.layoutType);
// Recover an IndexedDB project if localStorage is empty (e.g. quota exceeded).
// Do not overwrite changes performed while the asynchronous read was pending.
if(!initialStoredProject){
  const initialState=state;
  recoverProject().then(recovered=>{
    if(!recovered||state!==initialState||undoStack.length||redoStack.length)return;
    replaceProject(fixState(recovered));setPlanBounds(state.layoutType);renderAll();
    toast('已從本機備份還原方案');
  }).catch(e=>console.warn('無法載入方案備份',e));
}

const ui = {tool:'select', sel:null, mA:null, mCur:null, wallStart:null, wallCursor:null,
  layers:{dims:true, labels:true, furn:true, grid:false, bearing:false, wallSnap:true, smartSnap:true, collisionWarnings:true, customDimensions:true, diagnostics:false}, construction:false, savedLayers:null};
let view = {x0:0, y0:0, s:.06};
const history = createHistoryManager({limit:150});
const undoStack = history.undoEntries, redoStack = history.redoEntries;
const PHASE2_LAYERS_KEY = 'floorplan-layer-prefs-v2';
try { const layerPrefs = JSON.parse(localStorage.getItem(PHASE2_LAYERS_KEY) || '{}'); for (const key of ['dims','labels','furn','grid','bearing','wallSnap','smartSnap','collisionWarnings','customDimensions','diagnostics']) if (typeof layerPrefs[key] === 'boolean') ui.layers[key] = layerPrefs[key]; } catch { /* ignore incompatible preferences */ }

const selectionManager = createSelectionManager({ getFurniture: () => state.furniture });
const multiFurniture = selectionManager.ids;
function selectedFurniture(){ return state.furniture.filter(f=>multiFurniture.has(f.id)); }
function includeFurnitureGroup(id){const item=getF(id);return item?.groupId?state.furniture.filter(f=>f.groupId===item.groupId).map(f=>f.id):[id];}
function updateMultiSelection(){syncMultiSelection();refreshArrangementButtons();refreshGroupButtons();}
function syncMultiSelection(){ selectionManager.reconcile(ui.sel); }
function selectFurniture(id, additive=false){ui.sel=selectionManager.selectFurniture(id,{additive,groupIds:includeFurnitureGroup(id)});svgRenderer.invalidate([8,10]);svgRenderer.renderDirty();renderPanel();refreshGroupButtons();}
function applyFurnitureArrangement(mode){const items=selectedFurniture();if(items.length<2){toast('請按住 Shift 選取至少 2 件家具');return;}const changes=mode.startsWith('distribute')?distributeFurniture(items,mode):alignFurniture(items,mode);if(!changes.length){toast('此功能至少需要 3 件家具');return;}mutate(()=>{for(const change of changes){const f=getF(change.id);if(f){f.cx=change.cx;f.cy=change.cy;}}});toast('已完成家具排列');}
function refreshArrangementButtons(){document.querySelectorAll('[data-furn-arrange]').forEach(b=>{b.disabled=multiFurniture.size<2;});}
function refreshGroupButtons(){const n=selectedFurniture().length;document.querySelectorAll('[data-furn-group]').forEach(b=>{b.disabled=b.dataset.furnGroup==='create'?n<2:!selectedFurniture().some(f=>f.groupId);});}
function rotateFurnitureSelection(degrees){const selected=selectedFurniture();if(!selected.length)return toast('請先選取家具');if(!Number.isFinite(degrees))return toast('請輸入有效的角度');const changes=rotateFurnitureSet(selected,degrees);mutate(()=>{for(const change of changes){const f=getF(change.id);if(f)Object.assign(f,change);}});}
function groupFurnitureSelection(){const selected=selectedFurniture();if(selected.length<2)return toast('請至少選取兩件家具');const groupId=uid();mutate(()=>{const oldGroups=new Set(selected.map(f=>f.groupId).filter(Boolean));const all=state.furniture.filter(f=>selected.some(x=>x.id===f.id)||oldGroups.has(f.groupId));makeFurnitureGroup(all,groupId);for(const item of all)multiFurniture.add(item.id);});toast('已建立家具群組');}
function ungroupFurnitureSelection(){const selected=selectedFurniture(),ids=new Set(selected.map(f=>f.groupId).filter(Boolean));if(!ids.size)return toast('所選家具尚未群組');mutate(()=>clearFurnitureGroup(state.furniture,ids));toast('已解除群組');}


function save(){
  syncArchitecture();
  const legacyOK=saveLegacyProject(state);
  // Persistent backup failures should not roll back a successful edit.
  const reportBackupError = e => {
    console.error('方案備份失敗', e);
    window.dispatchEvent(new CustomEvent('floorplan:storage-error', {detail:{message:'方案備份失敗，請使用 JSON 匯出保存'}}));
  };
  try {
    queueProjectBackup(state).catch(reportBackupError);
  } catch (error) {
    reportBackupError(error);
  }
  if(!legacyOK) toast('本機儲存空間不足，正嘗試 IndexedDB 備份');
}
const snap = () => history.snapshot(state);
// 拖曳 / 導入 / 重設共用同一筆提交機制，未改變內容不會清空 redo。
// Changes from the 2D editor and the 3D scene must pass through this
// transaction boundary, including pointer drags finalized on pointerup.
function recordChange(before){
  syncArchitecture();
  if (!history.record(before, state)) return false;
  save();
  return true;
}
function publishProjectChange(event){
  // This event is emitted only after a committed command, never for each pointer
  // move. 3D remains synchronized by renderAll()'s sceneController.sync().
  if (event.changed) window.dispatchEvent(new CustomEvent('floorplan:project-change', {
    detail:{...event, revision:projectStore.revision, layoutType:state.layoutType}
  }));
  renderAll();
}
const commandSystem = createCommandSystem({
  snapshot: snap,
  restore: before => {replaceProject(JSON.parse(before));restoreArchitecture(state.architecture);},
  record: recordChange,
  onChange: publishProjectChange
});
function commit(before, name='edit-drag') {return commandSystem.complete(before, {name});}
function cancelCommand(before, name='edit-drag') {return commandSystem.cancel(before, {name});}
function mutate(fn, name='edit') {
  return commandSystem.execute({name,execute:()=>projectStore.batch(fn)});
}

function restoreSnapshot(next){
  if (next === null) return false;
  replaceProject(next);
  if (!restoreArchitecture(state.architecture)) applyLayoutGeometry(state.layoutType);
  validateSel(); save(); renderAll();
  return true;
}
function undo(){ if (!restoreSnapshot(history.undo(state))) toast(tr('沒有可復原的操作', 'Nothing to undo')); }
function redo(){ restoreSnapshot(history.redo(state)); }
function validateSel(){ if (ui.sel?.kind==='furn' && !getF(ui.sel.id)) ui.sel = null; syncMultiSelection();refreshGroupButtons(); }
const getF = id => state.furniture.find(f => f.id === id);

/* ======================= 几何工具 ======================= */
function snapRects(){ return WALLS.filter((w,i) => !state.demolished.includes('w'+i)).concat(WINS); }

/* ======================= 顏色 / 材質圖案 ======================= */
function hex2rgb(h){ h = h.replace('#',''); if (h.length===3) h = h.split('').map(c=>c+c).join(''); const n = parseInt(h,16); return [(n>>16)&255,(n>>8)&255,n&255]; }
function shade(h,k){ const f = v => Math.max(0,Math.min(255,Math.round(k>1 ? v+(255-v)*(k-1)*2 : v*k))); return '#'+hex2rgb(h).map(v=>f(v).toString(16).padStart(2,'0')).join(''); }

function buildDefs(){
  const plank = (id,base,line) => `<pattern id="m-${id}" patternUnits="userSpaceOnUse" width="1800" height="360">
      <rect width="1800" height="360" fill="${base}"/>
      <path d="M0 0H1800M0 180H1800M1200 0V180M600 180V360" stroke="${line}" stroke-width="8"/>
      <path d="M100 70Q500 60 900 85T1700 75M200 260Q700 250 1100 275T1750 262" stroke="${line}" stroke-width="4" fill="none" opacity=".4"/></pattern>`;
  const tile = (id,size,base,line) => `<pattern id="m-${id}" patternUnits="userSpaceOnUse" width="${size}" height="${size}">
      <rect width="${size}" height="${size}" fill="${base}"/><path d="M0 0H${size}M0 0V${size}" stroke="${line}" stroke-width="8"/></pattern>`;
  $('#defs').innerHTML =
    plank('wood','#eedecb','#d8c2aa') + plank('walnut','#bda188','#9d8169') +
    tile('tile800',800,'#f6f3ed','#e5dfd5') + tile('tile600',600,'#eef1ef','#d7ddd9') + tile('antislip',300,'#e5ebea','#cbd4d2') +
    `<pattern id="m-marble" patternUnits="userSpaceOnUse" width="1200" height="1200">
      <rect width="1200" height="1200" fill="#faf8f5"/><path d="M0 0H1200M0 0V1200" stroke="#e8dfd5" stroke-width="8"/>
      <path d="M-50 300C250 260 380 520 700 470S1100 640 1260 600M200 1200C300 950 520 980 640 820" stroke="#ded5c7" stroke-width="8" fill="none"/></pattern>
    <pattern id="m-terrazzo" patternUnits="userSpaceOnUse" width="500" height="500">
      <rect width="500" height="500" fill="#ece5da"/>
      <circle cx="60" cy="80" r="18" fill="#b9a58c"/><circle cx="310" cy="140" r="14" fill="#8fa3a0"/><circle cx="190" cy="330" r="22" fill="#c9b7a2"/>
      <circle cx="420" cy="400" r="16" fill="#a88f76"/><circle cx="90" cy="440" r="11" fill="#8fa3a0"/><circle cx="440" cy="40" r="9" fill="#b9a58c"/></pattern>
    <pattern id="m-carpet" patternUnits="userSpaceOnUse" width="120" height="120">
      <rect width="120" height="120" fill="#d9d4cc"/><circle cx="30" cy="30" r="8" fill="#c9c3ba"/><circle cx="90" cy="90" r="8" fill="#c9c3ba"/></pattern>
    <pattern id="grid" patternUnits="userSpaceOnUse" width="1000" height="1000">
      <path d="M500 0V1000M0 500H1000" stroke="#eae4d8" stroke-width="8"/><path d="M0 0V1000M0 0H1000" stroke="#ddd6c9" stroke-width="14"/></pattern>
    <filter id="furn-shadow" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#2a2219" flood-opacity="0.14"/>
    </filter>`;
}

/* ======================= 家具圖例 (現代簡約 · 平面色塊風) ======================= */
const ST = 'stroke="#443f3b" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"';
const ST_FINE = 'stroke="#7d7368" stroke-width="0.9" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"';
const ST_FAINT = 'stroke="#b2a89c" stroke-width="0.8" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"';
const rc = (x,y,w,h,f,ex='') => `<rect x="${x}" y="${y}" width="${Math.max(0,w)}" height="${Math.max(0,h)}" fill="${f}" ${ST} ${ex}/>`;
const ec = (cx,cy,rx,ry,f,ex='') => `<ellipse cx="${cx}" cy="${cy}" rx="${Math.max(0,rx)}" ry="${Math.max(0,ry)}" fill="${f}" ${ST} ${ex}/>`;
const ln = (x1,y1,x2,y2,ex='') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${ST} ${ex}/>`;
const pa = (d,f='none',ex='') => `<path d="${d}" fill="${f}" ${ST} ${ex}/>`;
const DASH = 'stroke-dasharray="4 3"';

function plantSvg(cx, cy, r, potCol = '#c48a60', leafCol = '#5f8a69') {
  let s = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${potCol}" ${ST}/>`;
  const n = 8, lr = r * 0.75, lw = r * 0.38;
  for (let k = 0; k < n; k++) {
    const angle = (k * 360) / n;
    const lcol = k % 2 === 0 ? leafCol : shade(leafCol, 1.14);
    s += `<ellipse cx="${cx}" cy="${cy - r * 0.45}" rx="${lw}" ry="${lr}" transform="rotate(${angle} ${cx} ${cy})" fill="${lcol}" ${ST}/>`;
  }
  s += `<circle cx="${cx}" cy="${cy}" r="${r * 0.28}" fill="#3d5a44" ${ST}/>`;
  return s;
}

function bookSvg(bx, by, bw, bh, col = '#475569', rot = 0) {
  const trans = rot ? `transform="rotate(${rot} ${bx + bw/2} ${by + bh/2})"` : '';
  return `<g ${trans}>
    <rect x="${bx}" y="${by}" width="${bw}" height="${bh}" rx="2" fill="${col}" ${ST_FINE}/>
    <rect x="${bx + 2}" y="${by + 2}" width="${bw - 4}" height="${bh - 4}" fill="#faf7f2" opacity="0.9"/>
    <line x1="${bx + bw * 0.42}" y1="${by}" x2="${bx + bw * 0.42}" y2="${by + bh}" stroke="${col}" stroke-width="0.8"/>
  </g>`;
}

function cupSvg(cx, cy, r = 26) {
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="#ffffff" ${ST_FINE}/>
    <circle cx="${cx}" cy="${cy}" r="${r * 0.72}" fill="#5a3d2e"/>
    <path d="M${cx + r * 0.8} ${cy - r * 0.3} Q${cx + r * 1.5} ${cy} ${cx + r * 0.8} ${cy + r * 0.3}" fill="none" ${ST_FINE}/>`;
}

function laptopSvg(cx, cy, w = 240, d = 160) {
  const x = cx - w / 2, y = cy - d / 2;
  const kw = w * 0.82, kh = d * 0.46;
  const kx = cx - kw / 2, ky = y + d * 0.15;
  const tw = w * 0.28, th = d * 0.22;
  const tx = cx - tw / 2, ty = y + d * 0.68;
  return `<rect x="${x}" y="${y}" width="${w}" height="${d}" rx="8" fill="#d8dcde" ${ST}/>
    <rect x="${x + 4}" y="${y + 4}" width="${w - 8}" height="${d - 8}" rx="5" fill="#f1f3f5"/>
    <rect x="${kx}" y="${ky}" width="${kw}" height="${kh}" rx="3" fill="#2d3748" ${ST_FINE}/>
    <rect x="${tx}" y="${ty}" width="${tw}" height="${th}" rx="2" fill="#cbd5e1" ${ST_FAINT}/>`;
}

function furnSVG(t,w,d,c){
  if(t==='customglb')return rc(-w/2,-d/2,w,d,'#dae7f2')+ln(-w/2,-d/2,w/2,d/2,'stroke="#547ca0"')+ln(w/2,-d/2,-w/2,d/2,'stroke="#547ca0"');
  const x = -w/2, y = -d/2, m = Math.min(w,d);
  switch (t){
    case 'balconyutility':case 'balconylounge':case 'balconygarden':case 'roomzone':
      return rc(x,y,w,d,c)+rc(x+w*.08,y+d*.08,w*.84,d*.84,'none',DASH)+ (t==='balconylounge'?ec(0,0,w*.14,d*.23,'#ede3d1'):t==='balconygarden'?plantSvg(-w*.22,0,w*.12,'#c48a60','#5c8766')+plantSvg(w*.22,0,w*.12,'#c48a60','#5c8766'):t==='balconyutility'?rc(x+w*.1,y+d*.15,w*.25,d*.5,'#f8fafc'):'');
    case 'bench':
      return rc(x,y,w,d,'#d8bea2','rx="8"')+ln(x+20,y+d/3,x+w-20,y+d/3,ST_FINE)+ln(x+20,y+d*2/3,x+w-20,y+d*2/3,ST_FINE);
    case 'wallbearing':case 'wallexterior':case 'wallpillar':
      return rc(x,y,w,d,c);
    case 'wall':
      return rc(x,y,w,d,c,'rx="6"') + ln(x,y+d*.25,x+w,y+d*.25,'opacity=".35"') + ln(x,y+d*.75,x+w,y+d*.75,'opacity=".35"');
    case 'walllow':
      return rc(x,y,w,d,c,'rx="6"') + ln(x,y+d*.5,x+w,y+d*.5,'opacity=".4"');
    case 'wallglass':
      return rc(x,y,w,d,'rgba(186,230,253,.45)') + ln(x+w*.33,y,x+w*.33,y+d,'stroke="#64748b"') + ln(x+w*.66,y,x+w*.66,y+d,'stroke="#64748b"');
    case 'wallcurve':
      return pa(`M${x} ${y+d}Q0 ${y-d*.4} ${x+w} ${y+d}`,c) + pa(`M${x} ${y+d}Q0 ${y-d*.4} ${x+w} ${y+d}`,'none','stroke="#443f3b"');
    case 'door': case 'dooropen': case 'doorentry': case 'doordouble': case 'doorslide': case 'doorfold': case 'doorglass': {
      const s = rc(x,y,w,d,'#eedecb');
      if (t === 'dooropen' || t === 'doorentry') {
        const entry = t === 'doorentry';
        const hingeX = x, baseY = y + d / 2, r = w;
        const thickness = Math.min(Math.max(d * .85, 58), entry ? 145 : 115);
        const wallShade = entry ? '#a68c74' : '#c8ab8d';
        const doorShade = entry ? '#7d634d' : '#9e856e';
        const openLeaf = `<rect x="${hingeX}" y="${baseY-r}" width="${thickness}" height="${r}" fill="${wallShade}"/>`
          + `<rect x="${hingeX}" y="${baseY-r}" width="${Math.max(thickness*.25,12)}" height="${r}" fill="${doorShade}" opacity=".85"/>`;
        const threshold = `<line x1="${hingeX}" y1="${baseY}" x2="${hingeX+r}" y2="${baseY}" stroke="${entry ? '#be6e3b' : '#c6794b'}" stroke-width="${entry?5:4}" vector-effect="non-scaling-stroke"/>`;
        const swing = `<path d="M ${hingeX} ${baseY-r} A ${r} ${r} 0 0 1 ${hingeX+r} ${baseY}" fill="none" stroke="#77716b" stroke-width="1.2" stroke-dasharray="6 5" vector-effect="non-scaling-stroke"/>`;
        return openLeaf + threshold + swing;
      }
      if (t === 'doorslide' || t === 'doorglass') return rc(x,y,w,d,t==='doorglass'?'rgba(186,230,253,.45)':'#eedecb') + ln(0,y,0,y+d,'stroke="#7b5638"') + ln(x,y+d*.25,x+w,y+d*.25,'stroke="#7b5638"') + ln(x,y+d*.75,x+w,y+d*.75,'stroke="#7b5638"');
      if (t === 'doorfold') return s + ln(x+w*.33,y,x+w*.33,y+d,'stroke="#7b5638"') + ln(x+w*.66,y,x+w*.66,y+d,'stroke="#7b5638"');
      if (t === 'doordouble') return s + ln(0,y,0,y+d,'stroke="#7b5638"') + pa(`M${x} ${y+d}A${w/2} ${w/2} 0 0 1 0 ${y}`, 'none', 'stroke="#7b5638"') + pa(`M${x+w} ${y+d}A${w/2} ${w/2} 0 0 0 0 ${y}`, 'none', 'stroke="#7b5638"');
      return s + pa(`M${x} ${y+d}A${w} ${w} 0 0 1 ${x+w} ${y}`, 'none', 'stroke="#7b5638"') + ln(x,y+d,x+w,y,'stroke="#7b5638"');
    }
    case 'windowproject': {
      const side = Math.min(w*.1, 140), back = Math.min(d*.18, 95);
      return rc(x,y,w,d,'#f5f0ea')
        + rc(x+side,y+back,w-side*2,d-back*2,'#e8f4f8')
        + rc(x,y,side,d,'#bdaea1') + rc(x+w-side,y,side,d,'#bdaea1')
        + rc(x,y+d-back,w,back,'#bae6fd')
        + ln(0,y+d-back,0,y+d,'stroke="#64748b"')
        + ln(x,y,x+w,y,'stroke="#655e56" stroke-dasharray="18 10"');
    }
    case 'windowbuilt': case 'window': case 'windowwide': case 'windowslide': case 'windowbay': case 'windowcorner': {
      let s = rc(x,y,w,d,'#eaf5fb');
      const n = t === 'window' ? 1 : t === 'windowcorner' ? 3 : 2;
      for (let i=1;i<n;i++) s += ln(x+w*i/n,y,x+w*i/n,y+d,'stroke="#64748b"');
      return s + ln(x,y+d*.25,x+w,y+d*.25,'stroke="#64748b"') + ln(x,y+d*.75,x+w,y+d*.75,'stroke="#64748b"');
    }
    case 'bed': {
      if (w < 1350) {
        // 單人床 (90 × 200 風格)：粉綠色折疊棉被、白枕頭、淡木床框
        const pw = Math.min(w - 160, 520), ph = Math.min(270, d * 0.16);
        const px = x + (w - pw) / 2, py = y + 105;
        const by = y + d * 0.46, bh = y + d - 30 - by;
        return rc(x, y, w, 70, '#c8ab8d', 'rx="6"') // 床頭板
          + rc(x + 10, y + 60, w - 20, d - 70, '#d4bca2', 'rx="16"') // 床框
          + rc(x + 22, y + 72, w - 44, d - 92, '#faf8f5', 'rx="12"') // 床單
          + rc(px, py, pw, ph, '#ffffff', 'rx="28"') // 枕頭
          + ln(px + pw * 0.3, py + ph / 2, px + pw * 0.7, py + ph / 2, ST_FAINT) // 枕頭折痕
          + rc(x + 22, by, w - 44, bh, '#8ea896', 'rx="12"') // 粉綠色棉被
          + rc(x + 22, by, w - 44, 75, '#9eb8a5', 'rx="8"') // 棉被反折
          + ln(x + 30, by + 75, x + w - 30, by + 75, 'stroke="#6b8f75" stroke-dasharray="8 6"')
          + rc(x + 10, y + d - 18, w - 20, 14, '#c8ab8d', 'rx="4"'); // 床尾框
      }
      // 雙人床 (150 × 200 / 180 × 200 風格)：雙枕頭、暖燕麥翻褶棉被、焦糖奶茶色床尾巾
      const pw = (w - 160) / 2, ph = Math.min(300, d * 0.17), py = y + 115;
      const dy = py + ph + 35;
      const ry = y + d * 0.58, rh = y + d - 30 - ry;
      return rc(x, y, w, 80, '#c8ab8d', 'rx="8"') // 床頭板
        + rc(x + 10, y + 70, w - 20, d - 80, '#d4bca2', 'rx="18"') // 床框
        + rc(x + 22, y + 82, w - 44, d - 102, '#faf8f5', 'rx="14"') // 白色床單
        + rc(x + 35, py, pw - 20, ph, '#ffffff', 'rx="30"') // 左枕頭
        + ln(x + 55, py + ph / 2, x + 15 + pw, py + ph / 2, ST_FAINT)
        + rc(x + 55 + pw, py, pw - 20, ph, '#ffffff', 'rx="30"') // 右枕頭
        + ln(x + 75 + pw, py + ph / 2, x + 35 + 2 * pw, py + ph / 2, ST_FAINT)
        + rc(x + 22, dy, w - 44, y + d - 30 - dy, '#f4efe8', 'rx="14"') // 翻摺棉被
        + rc(x + 22, ry, w - 44, rh, '#d5bfab', 'rx="14"') // 暖駝色床尾飾巾
        + rc(x + 22, ry, w - 44, 80, '#e2cfbd', 'rx="8"')
        + ln(x + 30, ry + 80, x + w - 30, ry + 80, 'stroke="#b59c86" stroke-dasharray="10 8"')
        + rc(x + 10, y + d - 18, w - 20, 14, '#c8ab8d', 'rx="4"'); // 床尾框
    }
    case 'sofa': {
      const col = c || '#ede8df';
      const aw = Math.min(180, Math.max(110, w * 0.11)), bd = Math.min(220, Math.max(140, d * 0.25));
      const n = w >= 1900 ? 3 : 2, cw = (w - 2 * aw - 28) / n;
      let s = rc(x, y, w, d, shade(col, 0.94), 'rx="24"') // 沙發主體圓角輪廓
        + rc(x + 10, y + 10, w - 20, bd, col, 'rx="18"') // 靠背
        + rc(x + 10, y + 10, aw, d - 20, col, 'rx="18"') // 左扶手
        + rc(x + w - aw - 10, y + 10, aw, d - 20, col, 'rx="18"'); // 右扶手
      for (let i = 0; i < n; i++) {
        const cx_i = x + aw + 14 + i * cw;
        s += rc(cx_i, y + bd + 10, cw, d - bd - 22, shade(col, 1.04), 'rx="16"')
          + ln(cx_i + 12, y + d - 25, cx_i + cw - 12, y + d - 25, ST_FAINT);
      }
      // 右扶手上的焦糖奶茶色抱枕（傾斜點綴）
      const pw = Math.min(220, w * 0.12), ph = Math.min(180, d * 0.22);
      const px = x + w - aw - pw - 15, py = y + bd + 20;
      s += `<g transform="rotate(-18 ${px + pw/2} ${py + ph/2})">
        <rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="14" fill="#cbb094" ${ST}/>
        <line x1="${px + pw*0.25}" y1="${py + ph/2}" x2="${px + pw*0.75}" y2="${py + ph/2}" stroke="#a88c70" stroke-width="1.2"/>
      </g>`;
      return s;
    }
    case 'cornersofa': {
      // L 型沙發 (270 × 200 風格)：圓角轉角、雙抱枕、雅緻米白座墊
      const col = c || '#ede8df';
      const cw = Math.min(1050, w * 0.38), sd = Math.min(950, d * 0.48), b = 180;
      let s = pa(`M${x+30} ${y} H${x+w-50} Q${x+w} ${y} ${x+w} ${y+50} V${y+d-30} Q${x+w} ${y+d} ${x+w-30} ${y+d} H${x+w-cw+30} Q${x+w-cw} ${y+d} ${x+w-cw} ${y+d-30} V${y+sd+30} Q${x+w-cw} ${y+sd} ${x+w-cw-30} ${y+sd} H${x+30} Q${x} ${y+sd} ${x} ${y+sd-30} V${y+30} Q${x} ${y} ${x+30} ${y} Z`, shade(col, 0.94));
      // 靠背
      s += rc(x + 10, y + 10, w - 20, b, col, 'rx="16"')
        + rc(x + w - b - 10, y + 10, b, d - 20, col, 'rx="16"')
        + rc(x + 10, y + 10, b, sd - 20, col, 'rx="16"');
      // 座墊分割
      const n = 2, mw = (w - cw - b - 20) / n;
      for (let i = 0; i < n; i++) s += rc(x + b + 10 + i * mw, y + b + 10, mw, sd - b - 20, shade(col, 1.04), 'rx="14"');
      s += rc(x + w - cw + 10, y + b + 10, cw - b - 20, d - b - 20, shade(col, 1.04), 'rx="16"');
      // 2 顆灰綠色抱枕（角落與左側）
      const p1x = x + b + 15, p1y = y + b + 25;
      s += `<g transform="rotate(22 ${p1x + 70} ${p1y + 60})"><rect x="${p1x}" y="${p1y}" width="140" height="120" rx="12" fill="#76937f" ${ST}/></g>`;
      const p2x = x + w - cw - 40, p2y = y + b + 25;
      s += `<g transform="rotate(-25 ${p2x + 70} ${p2y + 60})"><rect x="${p2x}" y="${p2y}" width="140" height="120" rx="12" fill="#76937f" ${ST}/></g>`;
      return s;
    }
    case 'armchair': {
      // 現代單人休閒沙發 (80 × 80 風格)：飽滿圓角軟包、寬厚扶手、深陷座墊與跳色抱枕
      const col = c || '#76937f';
      const aw = Math.min(150, Math.max(100, w * 0.17)), bd = Math.min(200, Math.max(120, d * 0.25));
      const cw = w - 2 * aw - 24;
      const pillowCol = (col === '#76937f' || col === '#5c8766') ? '#b87462' : '#76937f';
      let s = rc(x, y, w, d, shade(col, 0.92), 'rx="20"') // 主體圓角輪廓
        + rc(x + 10, y + 10, w - 20, bd, col, 'rx="16"') // 豐厚靠背
        + rc(x + 10, y + 10, aw, d - 20, col, 'rx="14"') // 左扶手
        + rc(x + w - aw - 10, y + 10, aw, d - 20, col, 'rx="14"'); // 右扶手
      // 中央厚實坐墊
      s += rc(x + aw + 12, y + bd + 10, cw, d - bd - 22, shade(col, 1.06), 'rx="14"')
        + ln(x + aw + 24, y + d - 25, x + w - aw - 24, y + d - 25, ST_FAINT);
      // 傾斜點綴的精緻方型抱枕
      const pw = Math.min(240, w * 0.32), ph = Math.min(170, d * 0.22);
      const px = x + w/2 - pw/2 + 10, py = y + bd + 15;
      s += `<g transform="rotate(-15 ${px + pw/2} ${py + ph/2})">
        <rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="12" fill="${pillowCol}" ${ST}/>
        <line x1="${px + pw*0.25}" y1="${py + ph/2}" x2="${px + pw*0.75}" y2="${py + ph/2}" stroke="${shade(pillowCol, 0.8)}" stroke-width="1.2"/>
      </g>`;
      return s;
    }
    case 'nightstand': {
      // 床頭櫃 (45 × 45 風格)：淡木色圓角方桌、圓形暖色小夜燈、精緻書籍
      return rc(x, y, w, d, '#d8bea2', 'rx="16"')
        + rc(x + 12, y + 12, w - 24, d - 24, '#dfcbb5', 'rx="12"')
        + `<circle cx="${x + w * 0.72}" cy="${y + d * 0.35}" r="${w * 0.22}" fill="#fff6dd" ${ST}/>`
        + `<circle cx="${x + w * 0.72}" cy="${y + d * 0.35}" r="${w * 0.13}" fill="#ffeed0" ${ST_FINE}/>`
        + `<circle cx="${x + w * 0.72}" cy="${y + d * 0.35}" r="${w * 0.06}" fill="#e5a86a"/>`
        + bookSvg(x + w * 0.14, y + d * 0.48, w * 0.38, d * 0.36, '#475569', -12);
    }
    case 'wardrobe': {
      // 衣櫃 (180 × 60 風格)：淡雅木紋、三門均分、俐落把手
      const n = w >= 1500 ? 3 : 2, pw = (w - 20) / n;
      let s = rc(x, y, w, d, '#c8ab8d', 'rx="8"');
      for (let i = 0; i < n; i++) {
        const px = x + 10 + i * pw;
        s += rc(px, y + 10, pw, d - 20, '#dfcbba', 'rx="4"')
          + ln(px + pw - 25, y + d/2 - 40, px + pw - 25, y + d/2 + 40, 'stroke="#6e5d50" stroke-width="2.5"')
          + ln(px + 30, y + 30, px + pw - 30, y + d - 30, ST_FAINT);
      }
      return s;
    }
    case 'desk': {
      // 書桌 (140 × 60 風格)：溫潤木桌、筆記型電腦 (鍵盤/觸控板)、咖啡杯、盆栽
      const lw = Math.min(340, w * 0.26), ld = Math.min(220, d * 0.4);
      return rc(x, y, w, d, '#d8bea2', 'rx="12"')
        + rc(x + 12, y + 12, w - 24, d - 24, '#dfcbb5', 'rx="8"')
        + laptopSvg(0, 0, lw, ld)
        + cupSvg(x + w - 160, 0, Math.min(38, d * 0.08))
        + plantSvg(x + 160, 0, Math.min(70, d * 0.14), '#c48a60', '#5c8766');
    }
    case 'officechair': {
      // 辦公椅 (65 × 65 風格)：人體工學曲線靠背、五星滾輪底座、扶手與頭枕
      let s = '';
      for (let k = 0; k < 5; k++) s += `<line x1="0" y1="0" x2="0" y2="${m * 0.48}" transform="rotate(${k * 72})" stroke="#475569" stroke-width="2.5" vector-effect="non-scaling-stroke"/>
        <circle cx="0" cy="${m * 0.48}" r="12" transform="rotate(${k * 72})" fill="#1e293b"/>`;
      return s + rc(x + w * 0.14, y + d * 0.22, w * 0.72, d * 0.56, '#8a95a5', 'rx="32"') // 座墊
        + rc(x + w * 0.18, y + d * 0.06, w * 0.64, d * 0.18, '#6b7787', 'rx="16"') // 靠背
        + rc(x + w * 0.3, y - d * 0.04, w * 0.4, d * 0.1, '#535c69', 'rx="10"') // 頭枕
        + rc(x + w * 0.04, y + d * 0.3, w * 0.1, d * 0.36, '#475569', 'rx="14"') // 左扶手
        + rc(x + w * 0.86, y + d * 0.3, w * 0.1, d * 0.36, '#475569', 'rx="14"'); // 右扶手
    }
    case 'chair': {
      // 餐椅 (50 × 50 風格)：圓弧椅背與乾燥玫瑰暖紅/灰綠軟墊
      return rc(x + 20, y, w - 40, d * 0.22, '#5c534b', 'rx="12"')
        + rc(x + 25, y + d * 0.18, w - 50, d * 0.76, c || '#b87462', 'rx="22"')
        + ln(x + 40, y + d - 20, x + w - 40, y + d - 20, ST_FAINT);
    }
    case 'table': {
      // 四人餐桌 (140 × 80 風格)：淡木圓角長餐桌、中央盆栽、周圍四張包覆餐椅
      const col = c || '#d8bea2';
      let s = rc(x + w * 0.05, y, w * 0.9, d, col, 'rx="24"')
        + rc(x + w * 0.05 + 12, y + 12, w * 0.9 - 24, d - 24, '#dfcbb5', 'rx="18"')
        + plantSvg(0, 0, Math.min(w, d) * 0.16, '#c48a60', '#5c8766');
      // 上下側餐椅 (乾燥玫瑰色軟座＋椅背)
      const cw = Math.min(280, w * 0.22), cd = Math.min(160, d * 0.22);
      s += rc(-w * 0.28, y - cd * 0.55, cw, cd, '#b87462', 'rx="18"')
        + rc(w * 0.06, y - cd * 0.55, cw, cd, '#b87462', 'rx="18"')
        + rc(-w * 0.28, y + d - cd * 0.45, cw, cd, '#b87462', 'rx="18"')
        + rc(w * 0.06, y + d - cd * 0.45, cw, cd, '#b87462', 'rx="18"');
      // 若是 6 人餐桌左右兩側再增加椅子
      if (w >= 1700) {
        s += rc(x - cd * 0.4, -cw * 0.5, cd, cw, '#b87462', 'rx="18"')
          + rc(x + w - cd * 0.6, -cw * 0.5, cd, cw, '#b87462', 'rx="18"');
      }
      return s;
    }
    case 'roundtable': {
      // 圓桌：淡木圓頂、中央盆栽、四方弧形餐椅
      let s = ec(0, 0, w/2, d/2, '#d8bea2') + ec(0, 0, w/2 - 14, d/2 - 14, '#dfcbb5')
        + plantSvg(0, 0, w * 0.16, '#c48a60', '#5c8766');
      const r = w/2, cr = w * 0.16;
      s += ec(0, -r - cr * 0.3, cr * 1.3, cr * 0.7, '#b87462')
        + ec(0, r + cr * 0.3, cr * 1.3, cr * 0.7, '#b87462')
        + ec(-r - cr * 0.3, 0, cr * 0.7, cr * 1.3, '#b87462')
        + ec(r + cr * 0.3, 0, cr * 0.7, cr * 1.3, '#b87462');
      return s;
    }
    case 'coffeetable': {
      if (Math.abs(w - d) < 120) {
        // 圓形茶几 (Ø 80 風格)：大理石紋圓台面、書籍、多肉小盆栽
        return ec(0, 0, w/2, d/2, '#f8f8f7')
          + pa(`M${-w*0.2} ${-d*0.3} Q${0} ${-d*0.1} ${w*0.3} ${-d*0.25}`, 'none', 'stroke="#e5e5e5" stroke-width="1.5"')
          + bookSvg(-w * 0.28, -d * 0.12, w * 0.28, d * 0.36, '#475569', -12)
          + plantSvg(w * 0.2, -d * 0.14, w * 0.15, '#c48a60', '#5c8766');
      }
      // 異形／花生豆型茶几 (120 × 60 風格)：柔和天然木質曲面、精巧書籍
      return `<path d="M${x+w*0.2} ${y+12} C${x+w*0.5} ${y+d*0.22} ${x+w*0.8} ${y+12} ${x+w-20} ${y+d*0.35} C${x+w} ${y+d*0.75} ${x+w*0.75} ${y+d-12} ${x+w*0.48} ${y+d-28} C${x+w*0.25} ${y+d-15} ${x+15} ${y+d*0.8} ${x+15} ${y+d*0.4} C${x+15} ${y+d*0.15} ${x+w*0.08} ${y+12} ${x+w*0.2} ${y+12}Z" fill="#d8bea2" ${ST}/>`
        + bookSvg(-w * 0.08, -d * 0.12, w * 0.24, d * 0.38, '#475569', -15);
    }
    case 'sidetable': {
      return ec(0, 0, w/2, d/2, '#f8f8f7') + ec(0, 0, w/2 - 10, d/2 - 10, '#f0efe9')
        + plantSvg(0, 0, w * 0.22, '#c48a60', '#5c8766');
    }
    case 'tvstand': {
      // 電視櫃 (200 × 40 風格)：淡木櫃體、極窄邊框電視、端側綠植盆栽
      return rc(x, y, w, d, '#d8bea2', 'rx="10"')
        + rc(x + 10, y + 10, w - 20, d - 20, '#dfcbb5', 'rx="6"')
        + rc(-180, y + d * 0.44, 360, d * 0.14, '#2d3748', 'rx="4"') // 電視底座
        + rc(-w * 0.28, y + d * 0.4, w * 0.56, d * 0.1, '#1a202c', 'rx="3"') // 電視本體
        + plantSvg(x + w - 180, 0, d * 0.22, '#c48a60', '#5c8766');
    }
    case 'bookshelf': {
      // 書架／書櫃 (180 × 30 風格)：整齊多彩書脊、中央點綴綠植
      let s = rc(x, y, w, d, '#d8bea2', 'rx="6"');
      const bookCols = ['#f8fafc','#475569','#b87462','#76937f','#d8bea2','#334155','#e2e8f0','#c48a60'];
      let bx = x + 30;
      while (bx < -120) {
        const bw = 35 + ((bx * 7) % 25);
        s += rc(bx, y + 10, bw, d - 20, bookCols[Math.abs(bx) % bookCols.length], 'rx="2"');
        bx += bw + 8;
      }
      s += plantSvg(0, 0, d * 0.32, '#c48a60', '#5c8766');
      bx = 120;
      while (bx < x + w - 40) {
        const bw = 35 + ((bx * 11) % 25);
        s += rc(bx, y + 10, bw, d - 20, bookCols[Math.abs(bx) % bookCols.length], 'rx="2"');
        bx += bw + 8;
      }
      return s;
    }
    case 'cabinet': case 'shoecab': {
      // 收納櫃／玄關櫃 (120 × 40 風格)：木質收納格、格柵門紋、桌面綠植托盤
      let s = rc(x, y, w, d, '#d8bea2', 'rx="8"')
        + rc(x + 10, y + 10, w * 0.38, d - 20, '#dfcbb5', 'rx="4"')
        + rc(x + w * 0.38 + 15, y + 10, w * 0.62 - 25, d - 20, '#ebe1d3', 'rx="4"');
      for (let fx = x + w * 0.38 + 35; fx < x + w - 25; fx += 35) {
        s += ln(fx, y + 12, fx, y + d - 12, ST_FAINT);
      }
      return s + plantSvg(x + w - 140, 0, d * 0.22, '#c48a60', '#5c8766');
    }
    case 'dresser': {
      return rc(x, y, w, d, '#d8bea2', 'rx="10"')
        + rc(x + 10, y + 10, w - 20, d - 20, '#dfcbb5', 'rx="6"')
        + ln(x + w * 0.15, y + 25, x + w * 0.85, y + 25, 'stroke="#64748b" stroke-width="2"')
        + ec(0, d/2 + 180, 160, 140, '#dfcbb5');
    }
    case 'counter': {
      // 廚房檯面 (240 × 60 風格)：白色石英石台面、嵌入式不銹鋼水槽、雙口黑晶感應爐
      return rc(x, y, w, d, '#f8f8f7', 'rx="8"')
        + rc(x + 120, y + 70, 560, d - 140, '#cbd5e1', 'rx="16"') // 水槽外框
        + rc(x + 140, y + 90, 520, d - 180, '#94a3b8', 'rx="12"') // 水槽槽體
        + `<circle cx="${x + 400}" cy="0" r="32" fill="#e2e8f0" ${ST_FINE}/>` // 排水孔
        + `<circle cx="${x + 400}" cy="${y + 45}" r="24" fill="#cbd5e1" ${ST}/>` // 水龍頭
        + rc(x + w - 850, y + 65, 720, d - 130, '#1f2937', 'rx="12"') // 黑晶瓦斯/感應爐
        + `<circle cx="${x + w - 670}" cy="0" r="140" fill="none" stroke="#4b5563" stroke-width="2" vector-effect="non-scaling-stroke"/>`
        + `<circle cx="${x + w - 670}" cy="0" r="65" fill="#374151" ${ST_FINE}/>`
        + `<circle cx="${x + w - 310}" cy="0" r="140" fill="none" stroke="#4b5563" stroke-width="2" vector-effect="non-scaling-stroke"/>`
        + `<circle cx="${x + w - 310}" cy="0" r="65" fill="#374151" ${ST_FINE}/>`;
    }
    case 'island': {
      // 中島 (180 × 90 風格)：大理石瀑布島台、嵌入式洗滌槽、3 張草綠色高腳吧椅
      return rc(x, y, w, d, '#f8f8f7', 'rx="12"')
        + rc(-300, y + 100, 600, 400, '#cbd5e1', 'rx="16"')
        + `<circle cx="0" cy="${y + 300}" r="30" fill="#e2e8f0" ${ST_FINE}/>`
        + `<circle cx="0" cy="${y + 60}" r="24" fill="#94a3b8" ${ST}/>`
        + ec(-w * 0.28, y + d + 30, 150, 95, '#76937f')
        + ec(0, y + d + 30, 150, 95, '#76937f')
        + ec(w * 0.28, y + d + 30, 150, 95, '#76937f');
    }
    case 'barstool': {
      return ec(0, 0, w/2, d/2, '#76937f') + ec(0, -d * 0.12, w * 0.38, d * 0.22, '#8ea896');
    }
    case 'stove': {
      return rc(x, y, w, d, '#1f2937', 'rx="12"')
        + `<circle cx="${-w/4}" cy="0" r="${m*0.3}" fill="none" stroke="#4b5563" stroke-width="2" vector-effect="non-scaling-stroke"/>`
        + `<circle cx="${-w/4}" cy="0" r="${m*0.14}" fill="#374151"/>`
        + `<circle cx="${w/4}" cy="0" r="${m*0.3}" fill="none" stroke="#4b5563" stroke-width="2" vector-effect="non-scaling-stroke"/>`
        + `<circle cx="${w/4}" cy="0" r="${m*0.14}" fill="#374151"/>`;
    }
    case 'ksink': {
      return rc(x, y, w, d, '#d5d9dd', 'rx="12"')
        + rc(x + 50, y + 60, w - 100, d - 120, '#94a3b8', 'rx="14"')
        + `<circle cx="0" cy="0" r="30" fill="#e2e8f0" ${ST_FINE}/>`
        + `<circle cx="0" cy="${y + 35}" r="22" fill="#cbd5e1" ${ST}/>`;
    }
    case 'fridge': {
      // 冰箱 (70 × 70 風格)：拉絲鉑銀質感、下層冷凍抽屜縫線、極簡把手
      return rc(x, y, w, d, '#d5d9dd', 'rx="14"')
        + ln(x + 10, y + d * 0.68, x + w - 10, y + d * 0.68, 'stroke="#8a9299" stroke-width="2.5"')
        + rc(x + w * 0.2, y + d * 0.64, w * 0.6, 20, '#64748b', 'rx="4"');
    }
    case 'washer': case 'dryer': {
      // 洗衣機 (60 × 60 風格)：純白機身、大圓黑鏡門蓋＋金屬圈、上方旋鈕控制板
      return rc(x, y, w, d, '#ffffff', 'rx="14"')
        + ln(x + 10, y + 100, x + w - 10, y + 100, ST_FINE)
        + `<circle cx="${x + w - 130}" cy="${y + 50}" r="24" fill="#e2e8f0" ${ST_FINE}/>`
        + rc(x + 40, y + 36, 120, 28, '#1e293b', 'rx="3"')
        + `<circle cx="0" cy="${y + 340}" r="210" fill="#cbd5e1" ${ST}/>`
        + `<circle cx="0" cy="${y + 340}" r="175" fill="${t==='dryer'?'#374151':'#1e293b'}"/>`
        + ec(30, y + 310, 120, 80, 'rgba(255,255,255,0.18)', `transform="rotate(-25 30 ${y+310})"`);
    }
    case 'toilet': case 'bidettoilet': {
      // 馬桶 (40 × 70 風格)：方正蓄水箱、流線橢圓座圈與內圈蓄水區
      return rc(x + 20, y, w - 40, 200, '#ffffff', 'rx="16"')
        + rc(-35, y + 80, 70, 36, '#e2e8f0', 'rx="8"')
        + ec(0, y + 440, w * 0.46, d * 0.34, '#ffffff')
        + ec(0, y + 440, w * 0.36, d * 0.26, '#f8fafc')
        + ec(0, y + 460, w * 0.24, d * 0.16, '#e2e8f0');
    }
    case 'vanity': {
      // 洗手盆／浴室櫃 (60 × 45 風格)：石英白台面、下嵌長方形面盆、鍍鉻龍頭
      return rc(x, y, w, d, '#ffffff', 'rx="10"')
        + rc(x + 60, y + 70, w - 120, d - 140, '#f1f5f9', 'rx="12"')
        + rc(x + 85, y + 95, w - 170, d - 190, '#e2e8f0', 'rx="8"')
        + `<circle cx="0" cy="${y + d * 0.58}" r="20" fill="#cbd5e1"/>`
        + rc(-15, y + 30, 30, 50, '#cbd5e1', 'rx="6"');
    }
    case 'shower': {
      // 淋浴間 (90 × 90 風格)：極簡通透玻璃隔屏、底盆、頂噴花灑與地漏
      return rc(x, y, w, d, '#f1f5f9', 'rx="8"')
        + rc(x, y, 20, d, 'rgba(186,230,253,0.5)', 'stroke="#64748b"')
        + rc(x, y + d - 20, w * 0.7, 20, 'rgba(186,230,253,0.5)', 'stroke="#64748b"')
        + `<circle cx="${x + w - 180}" cy="${y + 180}" r="70" fill="#cbd5e1" ${ST}/>`
        + `<circle cx="${x + w - 180}" cy="${y + 180}" r="25" fill="#94a3b8"/>`
        + rc(x + w - 210, y + 150, 60, 60, '#cbd5e1', 'rx="4"');
    }
    case 'bathtub': {
      // 浴缸 (170 × 75 風格)：獨立蛋型圓角浴缸、清澈漸變水藍水面、鍍鉻龍頭
      return rc(x, y, w, d, '#ffffff', 'rx="120"')
        + rc(x + 40, y + 35, w - 80, d - 70, '#bae6fd', 'rx="100"')
        + rc(x + 80, y + 65, w - 160, d - 130, '#93c5fd', 'rx="80"')
        + `<circle cx="${x + 120}" cy="0" r="24" fill="#cbd5e1" ${ST_FINE}/>`;
    }
    case 'plant': {
      // 盆栽 (Ø 50 / Ø 35 風格)：層次分明、向外綻放的多葉翠綠植栽
      return plantSvg(0, 0, m / 2, '#c48a60', '#5f8a69');
    }
    case 'rug': {
      return rc(x, y, w, d, '#ede7dc', 'rx="30"')
        + rc(x + 80, y + 80, w - 160, d - 160, 'none', 'rx="20" stroke="#d5ccbe" stroke-dasharray="6 6"');
    }
    case 'floorlamp': {
      return `<circle cx="0" cy="0" r="${m * 0.45}" fill="#fff6dd" ${ST}/>`
        + `<circle cx="0" cy="0" r="${m * 0.28}" fill="none" stroke="#f0d8a8" stroke-dasharray="4 3"/>`
        + `<circle cx="0" cy="0" r="${m * 0.1}" fill="#e5a86a"/>`;
    }
    case 'piano': {
      const kx = x + 80, kw = w - 160, kd = d * 0.24;
      let s = rc(x, y, w, d * 0.58, '#242322', 'rx="8"')
        + rc(x + 40, y + d * 0.58, w - 80, d * 0.38, '#32302e', 'rx="8"')
        + rc(kx, y + d * 0.58, kw, kd, '#faf8f5');
      for (let i = 1; i < 26; i++) s += ln(kx + kw * i / 26, y + d * 0.58, kx + kw * i / 26, y + d * 0.58 + kd, ST_FAINT);
      return s;
    }
    case 'treadmill': {
      return rc(x, y, w, d, '#374151', 'rx="40"')
        + rc(x + 90, y + 300, w - 180, d - 420, '#111827', 'rx="20"')
        + rc(x, y, w, 240, '#4b5563', 'rx="30"');
    }
    case 'crib': {
      let s = rc(x, y, w, d, '#dfcbba', 'rx="16"') + rc(x + 40, y + 40, w - 80, d - 80, '#ffffff', 'rx="12"');
      for (let sx = x + 80; sx < x + w - 50; sx += 80) s += ln(sx, y, sx, y + 40, ST_FAINT) + ln(sx, y + d - 40, sx, y + d, ST_FAINT);
      return s;
    }
    case 'beanbag': {
      return ec(0, 0, w/2, d/2, '#ede8df') + ec(-w * 0.06, -d * 0.06, w * 0.32, d * 0.28, '#dfcbba', 'opacity=".8"');
    }
    case 'waterheater': {
      return rc(x, y, w, d, '#f8fafc', `rx="${d/2}"`) + rc(x + w * 0.2, y + 10, w * 0.6, d - 20, 'none', 'stroke="#cbd5e1" stroke-dasharray="4 3"');
    }
    case 'aircon': {
      return rc(x, y, w, d, '#ffffff', 'rx="20"') + ln(x + 30, y + d * 0.7, x + w - 30, y + d * 0.7, ST_FINE);
    }
    case 'acwall': {
      return rc(x, y, w, d, '#ffffff', 'rx="16"') + ln(x + 30, y + d * 0.65, x + w - 30, y + d * 0.65, ST_FINE);
    }
    case 'dishwasher': {
      return rc(x, y, w, d, '#d5d9dd', 'rx="12"') + ln(x + 10, y + d - 70, x + w - 10, y + d - 70, ST_FINE) + rc(x + w * 0.3, y + d - 45, w * 0.4, 20, '#64748b', 'rx="3"');
    }
    case 'ovencol': {
      return rc(x, y, w, d, '#dfcbba', 'rx="8"') + rc(x + 40, y + 40, w - 80, d * 0.45, '#1e293b', 'rx="6"') + rc(x + 40, y + d * 0.52, w - 80, d * 0.42, '#1e293b', 'rx="6"');
    }
    case 'purifier': {
      return rc(x, y, w, d, '#ffffff', 'rx="30"') + rc(x + 30, y + 30, w - 60, d - 60, 'none', 'rx="20" stroke="#cbd5e1" stroke-dasharray="3 3"');
    }
    default: return rc(x, y, w, d, c, 'rx="8"');
  }
}

/* ======================= 渲染 ======================= */
const NOLABEL = ['plant','floorlamp','sidetable','barstool','beanbag','nightstand','coffeetable','tvstand','chair','stove','ksink'];
function renderRooms(){
  let s = '';
  ROOMS.forEach(r => s += `<polygon class="room" data-room="${r.id}" points="${r.poly.map(p=>p.join(',')).join(' ')}" fill="url(#m-${state.rooms[r.id].mat})"/>`);
  const sill = ([a,b,c,d]) => `<rect x="${a}" y="${b}" width="${c-a}" height="${d-b}" fill="#eedecb" stroke="#c8ab8d" stroke-width="1" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
  DOORS.forEach(d => s += sill(d.rect)); SLIDES.forEach(d => s += sill(d.rect));
  setSvgLayerMarkup('#gRooms', s);
}

function renderFurn(){
  const g = $('#gFurn');
  g.setAttribute('display', ui.layers.furn ? 'inline' : 'none');
  // All user-added objects share ONE SVG stacking context. The last item
  // in state.furniture is painted on top, including windows and doors.
  g.innerHTML = state.furniture.map(f => {
    const opening = f.type.startsWith('window') || f.type.startsWith('door');
    const fs = Math.max(80, Math.min(170, Math.min(f.w,f.d)*.2));
    const label = !opening && Math.min(f.w,f.d) >= 380 && !NOLABEL.includes(f.type)
      ? `<text transform="rotate(${-f.rot})" font-size="${fs}" text-anchor="middle" dominant-baseline="central" fill="#4a443c" opacity=".8" pointer-events="none">${esc(nm(f.name))}</text>` : '';
    const hitArea = opening
      ? `<rect x="${-f.w/2-80}" y="${-f.d/2-80}" width="${f.w+160}" height="${f.d+160}" fill="transparent" pointer-events="all"/>` : '';
    return `<g class="furn" data-fid="${f.id}" transform="translate(${f.cx} ${f.cy}) rotate(${f.rot})">${furnSVG(f.type,f.w,f.d,f.color)}${label}${hitArea}</g>`;
  }).join('');
}

function renderWalls(){
  const joins = joinFootprints(ANGLED_WALLS);
  const angledMarkup = ANGLED_WALLS.map((w,i)=>`<polygon class="wall" data-angled="${i}" points="${joins[i].map(p=>p.join(',')).join(' ')}" fill="${w.type==='structural'?'#b8412c':w.type==='exterior'?'#5c5750':'#8a8378'}"/>`).join('');
  $('#gWalls').innerHTML = angledMarkup + WALLS.map((w,i) => {
    const [x0,y0,x1,y1,k] = w, id = 'w'+i, dem = state.demolished.includes(id);
    let fill = k==='b' ? (ui.layers.bearing ? '#b8412c' : '#3f3c38') : k==='low' ? '#e9e3d8' : k==='e' ? '#5c5750' : '#8a8378';
    let ex = k==='low' ? 'stroke="#8f897d" stroke-width="1" vector-effect="non-scaling-stroke"' : '';
    if (dem){ fill = 'rgba(198,91,58,.12)'; ex = 'stroke="#c65b3a" stroke-width="1.2" stroke-dasharray="5 3" vector-effect="non-scaling-stroke"'; }
    return `<rect class="wall" data-wall="${id}" x="${x0}" y="${y0}" width="${x1-x0}" height="${y1-y0}" fill="${fill}" ${ex}/>`;
  }).join('');
}

function renderOpenings(){
  const WS = 'stroke="#4f7394" stroke-width="1" vector-effect="non-scaling-stroke"';
  let s = '';
  WINS.forEach(([x0,y0,x1,y1],index) => {
    const w = x1-x0, h = y1-y0;
    s += `<rect x="${x0}" y="${y0}" width="${w}" height="${h}" fill="#f7fbfd" ${WS}/>`;
    if (w >= h) [1/3,2/3].forEach(t => s += `<line x1="${x0}" y1="${y0+h*t}" x2="${x1}" y2="${y0+h*t}" ${WS}/>`);
    else [1/3,2/3].forEach(t => s += `<line x1="${x0+w*t}" y1="${y0}" x2="${x0+w*t}" y2="${y1}" ${WS}/>`);
  });
  const DS = 'stroke="#3d3a34" stroke-width="1" vector-effect="non-scaling-stroke"';
  DOORS.forEach(d => {
    const [hx,hy] = d.h, L = d.len, T = 40;
    const ox = hx + d.o[0]*L, oy = hy + d.o[1]*L, cx = hx + d.c[0]*L, cy = hy + d.c[1]*L;
    const sweep = d.o[0]*d.c[1] - d.o[1]*d.c[0] > 0 ? 1 : 0;
    const col = d.entry ? '#b5653a' : '#3d3a34';
    s += `<polygon class="furn" data-door="${DOORS.indexOf(d)}" points="${hx},${hy} ${ox},${oy} ${ox+d.c[0]*T},${oy+d.c[1]*T} ${hx+d.c[0]*T},${hy+d.c[1]*T}" fill="#fff" stroke="${col}" stroke-width="${d.entry?1.8:1}" vector-effect="non-scaling-stroke"/>`;
    s += `<path d="M${ox} ${oy}A${L} ${L} 0 0 ${sweep} ${cx} ${cy}" fill="none" ${DS} stroke-dasharray="5 3" opacity=".7"/>`;
  });
  SLIDES.forEach(({rect:[x0,y0,x1,y1],v}) => {
    if (v){ const L = y1-y0, m = (x0+x1)/2; s += `<rect x="${m-45}" y="${y0}" width="40" height="${L*.55}" fill="#fff" ${DS}/><rect x="${m+5}" y="${y1-L*.55}" width="40" height="${L*.55}" fill="#fff" ${DS}/>`; }
    else { const L = x1-x0, m = (y0+y1)/2; s += `<rect x="${x0}" y="${m-45}" width="${L*.55}" height="40" fill="#fff" ${DS}/><rect x="${x1-L*.55}" y="${m+5}" width="${L*.55}" height="40" fill="#fff" ${DS}/>`; }
  });
  // 入口標示必須跟著實際入口門移動；不再固定在舊格局的左下位置。
  const entryDoor = DOORS.find(d => d.entry);
  if (entryDoor) {
    const [x0,y0,x1,y1] = entryDoor.rect;
    const cx = (x0 + x1) / 2, baseY = Math.max(y0,y1);
    s += `<path d="M${cx} ${baseY+720}V${baseY+170}M${cx-150} ${baseY+330}L${cx} ${baseY+170}L${cx+150} ${baseY+330}" fill="none" stroke="#b5653a" stroke-width="2" vector-effect="non-scaling-stroke"/>
          <text x="${cx}" y="${baseY+930}" font-size="200" text-anchor="middle" fill="#b5653a">${tr('入口','Entry')}</text>`;
  }
  // 在圖形最上方增加透明門窗點選區，不受下層牆面或細線影響。
  WINS.forEach((r,i)=>{ const [x0,y0,x1,y1]=r, pad=65;
    s+=`<rect data-window="${i}" x="${x0-pad}" y="${y0-pad}" width="${x1-x0+pad*2}" height="${y1-y0+pad*2}" fill="transparent" pointer-events="all" style="cursor:pointer"/>`;
  });
  DOORS.forEach((d,i)=>{ const [x0,y0,x1,y1]=d.rect, pad=65;
    s+=`<rect data-door="${i}" x="${x0-pad}" y="${y0-pad}" width="${x1-x0+pad*2}" height="${y1-y0+pad*2}" fill="transparent" pointer-events="all" style="cursor:pointer"/>`;
  });
  setSvgLayerMarkup('#gOpen', s);
}

function renderLabels(){
  const g = $('#gLabels');
  g.setAttribute('display', ui.layers.labels ? 'inline' : 'none');
  g.innerHTML = ROOMS.filter(r => r.at).map(r => {
    const [x,y] = r.at, halo = 'stroke="#fbf9f4" stroke-width="45" paint-order="stroke" stroke-linejoin="round"';
    return `<text x="${x}" y="${y}" font-size="250" font-weight="600" text-anchor="middle" fill="#2b2824" ${halo}>${esc(nm(state.rooms[r.id].name))}</text>
      <text x="${x}" y="${y+260}" font-size="175" text-anchor="middle" fill="#7d7366" ${halo}>${fmt(area(r.poly))} m²／${fmt(ping(area(r.poly)))} 坪</text>`;
  }).join('');
}

function renderDims(){
  const DC = '#7d7160', LS = `stroke="${DC}" stroke-width="1" vector-effect="non-scaling-stroke"`, TK = `stroke="${DC}" stroke-width="2" vector-effect="non-scaling-stroke"`;
  const txt = (x,y,v,rot) => `<text x="${x}" y="${y}" font-size="${v<400?140:200}" text-anchor="middle" fill="${DC}" ${rot?`transform="rotate(-90 ${x} ${y})"`:''}>${v}</text>`;
  const chain = (horiz, at, start, segs) => {
    const pts = [start]; segs.forEach(v => pts.push(pts[pts.length-1]+v));
    let s = horiz ? `<line x1="${pts[0]}" y1="${at}" x2="${pts.at(-1)}" y2="${at}" ${LS}/>` : `<line x1="${at}" y1="${pts[0]}" x2="${at}" y2="${pts.at(-1)}" ${LS}/>`;
    pts.forEach(p => s += horiz
      ? `<line x1="${p}" y1="${at-170}" x2="${p}" y2="${at+170}" ${LS}/><line x1="${p-80}" y1="${at+80}" x2="${p+80}" y2="${at-80}" ${TK}/>`
      : `<line x1="${at-170}" y1="${p}" x2="${at+170}" y2="${p}" ${LS}/><line x1="${at-80}" y1="${p+80}" x2="${at+80}" y2="${p-80}" ${TK}/>`);
    // 依文字實際佔用的尺寸逐段避讓；空間不足時保留界線與箭頭、略過文字，
    // 防止 20／90／240 等密集尺寸彼此覆蓋。
    let lastEnd = -Infinity;
    segs.forEach((v,i) => {
      const mid = (pts[i]+pts[i+1])/2, labelSize = Math.max(230, String(Math.round(v)).length * 115 + 80);
      if (mid - labelSize/2 <= lastEnd + 35) return;
      lastEnd = mid + labelSize/2;
      s += horiz ? txt(mid, at-70, v) : txt(at-70, mid, v, true);
    });
    return s;
  };
  const g = $('#gDims');
  // 頂端尺寸鏈不能沿用原始格局的固定數字；由目前所有直向牆的牆皮生成，
  // 每段牆厚（例如 240）便會永遠落在實際牆體上。
  const [frameLeft,frameTop,frameRight,frameBottom] = houseBounds(ROOMS);
  // 外框高度依目前房間資料決定。一房縮短外框後，底部尺寸鏈與兩側總尺寸
  // 也會同步縮短，不會再殘留三房的 10,560mm 尺度。
  // 家具庫加入的牆也視為尺寸來源；以其寬、深與旋轉角度換成牆皮座標。
  // 已標示拆除的原牆則不再參與尺寸計算。
  const dimensionWalls = [
    ...WALLS.filter((_, i) => !state.demolished.includes('w' + i)),
    ...state.furniture.filter(f => f.type.startsWith('wall')).map(f => {
      const vertical = Math.abs(Math.sin(f.rot * Math.PI / 180)) > Math.abs(Math.cos(f.rot * Math.PI / 180));
      const len = f.w, thick = f.d;
      return vertical
        ? [f.cx - thick / 2, f.cy - len / 2, f.cx + thick / 2, f.cy + len / 2, 'n']
        : [f.cx - len / 2, f.cy - thick / 2, f.cx + len / 2, f.cy + thick / 2, 'n'];
    })
  ];
  // 只標註真正接觸該側外緣的牆皮。先前把所有室內牆投影到四周，
  // 導致在沒有牆體的留白處出現 240、780 等假尺寸。
  // 允許 300 mm 誤差，以涵蓋一般 120–240 mm 厚的外牆。
  const EDGE_TOL = 300;
  const uniqueSorted = values => values.sort((a,b) => a-b)
    .filter((v,i,arr) => i === 0 || Math.abs(v-arr[i-1]) > 1);
  const onOuterEdge = (w, side) => {
    const [x0,y0,x1,y1] = w;
    if (side === 'top') return Math.min(y0,y1) <= frameTop + EDGE_TOL && Math.max(y0,y1) >= frameTop - EDGE_TOL;
    if (side === 'bottom') return Math.min(y0,y1) <= frameBottom + EDGE_TOL && Math.max(y0,y1) >= frameBottom - EDGE_TOL;
    if (side === 'left') return Math.min(x0,x1) <= frameLeft + EDGE_TOL && Math.max(x0,x1) >= frameLeft - EDGE_TOL;
    return Math.min(x0,x1) <= frameRight + EDGE_TOL && Math.max(x0,x1) >= frameRight - EDGE_TOL;
  };
  const segmentOnSide = side => {
    const horiz = side === 'top' || side === 'bottom';
    const start = horiz ? frameLeft : frameTop;
    const end = horiz ? frameRight : frameBottom;
    const edges = dimensionWalls
      .filter(w => onOuterEdge(w, side))
      .filter(w => horiz
        ? Math.abs(w[2]-w[0]) <= Math.abs(w[3]-w[1])
        : Math.abs(w[3]-w[1]) <= Math.abs(w[2]-w[0]))
      .flatMap(w => horiz ? [w[0],w[2]] : [w[1],w[3]])
      .filter(v => v > start && v < end);
    const pts = uniqueSorted([start,...edges,end]);
    return pts.slice(1).map((v,i) => v-pts[i]);
  };
  const topSegments = segmentOnSide('top');
  const bottomSegments = segmentOnSide('bottom');
  const leftSegments = segmentOnSide('left');
  const rightSegments = segmentOnSide('right');
  g.innerHTML =
    chain(true,frameTop-750,frameLeft,topSegments) + chain(true,frameTop-1250,frameLeft,[frameRight-frameLeft]) +
    chain(true,frameBottom+790,frameLeft,bottomSegments) + chain(true,frameBottom+1290,frameLeft,[frameRight-frameLeft]) +
    chain(false,frameLeft-800,frameTop,leftSegments) + chain(false,frameLeft-1300,frameTop,[frameBottom-frameTop]) +
    chain(false,frameRight+800,frameTop,rightSegments) + chain(false,frameRight+1300,frameTop,[frameBottom-frameTop]);
  g.setAttribute('display', ui.layers.dims ? 'inline' : 'none');
}

function renderGrid(){
  $('#gGrid').innerHTML = `<rect x="-20000" y="-20000" width="55000" height="55000" fill="${ui.layers.grid ? 'url(#grid)' : 'transparent'}" data-bg="1"/>`;
}

function renderMeasure(){
  const k = 1/view.s, fs = 12*k;
  const one = (a,b,tmp,item) => {
    const L = Math.hypot(b.x-a.x, b.y-a.y); if (L < 1) return '';
    let ang = Math.atan2(b.y-a.y, b.x-a.x)*180/Math.PI; if (ang > 90 || ang < -90) ang += 180;
    const mx = (a.x+b.x)/2, my = (a.y+b.y)/2, nx = -(b.y-a.y)/L*5*k, ny = (b.x-a.x)/L*5*k;
    const col = tmp ? '#2f5d62' : '#b5653a', S = `stroke="${col}" stroke-width="1.5" vector-effect="non-scaling-stroke"`;
    return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" ${S}/>
      <line x1="${a.x-nx}" y1="${a.y-ny}" x2="${a.x+nx}" y2="${a.y+ny}" ${S}/><line x1="${b.x-nx}" y1="${b.y-ny}" x2="${b.x+nx}" y2="${b.y+ny}" ${S}/>
      <text x="${mx}" y="${my-5*k}" font-size="${fs}" text-anchor="middle" fill="${col}" font-weight="600" transform="rotate(${ang} ${mx} ${my})"
        stroke="#fff" stroke-width="${3.5*k}" paint-order="stroke">${tmp ? Math.round(L) : (item?.label ?? Math.round(L))} mm</text>`;
  };
  let s = state.measures.map(m => one(m.a,m.b,false,m)).join('');
  if (ui.mA && ui.mCur) s += one(ui.mA, ui.mCur, true);
  if (ui.mA) s += `<circle cx="${ui.mA.x}" cy="${ui.mA.y}" r="${3*k}" fill="#2f5d62"/>`;
  setSvgLayerMarkup('#gMeasure', s);
  $('#gMeasure').setAttribute('display', ui.layers.customDimensions ? 'inline' : 'none');
}

function renderSel(){
  const k = 1/view.s; let s = '';
  if (ui.sel?.kind === 'furn'){
    const f = getF(ui.sel.id);
    if (f){
      // 觸屏上手柄更大、離家具更遠，並各帶一圈透明的大熱區
      const p = 5*k, A = 'stroke="#b5653a" vector-effect="non-scaling-stroke"', hs = COARSE ? 1.7 : 1, ro = (COARSE ? 40 : 26)*k, hit = (COARSE ? 24 : 11)*k;
      const sx = f.w/2+p, sy = f.d/2+p;
      s += `<g transform="translate(${f.cx} ${f.cy}) rotate(${f.rot})">
        <rect x="${-f.w/2-p}" y="${-f.d/2-p}" width="${f.w+2*p}" height="${f.d+2*p}" fill="none" ${A} stroke-width="1.5" stroke-dasharray="5 3" pointer-events="none"/>
        <line x1="0" y1="${-f.d/2-p}" x2="0" y2="${-f.d/2-ro}" ${A} stroke-width="1" pointer-events="none"/>
        <circle data-handle="rot" cx="0" cy="${-f.d/2-ro}" r="${hit}" fill="transparent"/>
        <circle data-handle="rot" cx="0" cy="${-f.d/2-ro}" r="${6*hs*k}" fill="#fff" ${A} stroke-width="1.5"><title>${tr('拖曳旋轉（Shift 自由角度）','Drag to rotate (Shift for free angle)')}</title></circle>
        <circle data-handle="size" cx="${sx}" cy="${sy}" r="${hit}" fill="transparent"/>
        <rect data-handle="size" x="${sx-5*hs*k}" y="${sy-5*hs*k}" width="${10*hs*k}" height="${10*hs*k}" fill="#b5653a"><title>${tr('拖曳調整尺寸','Drag to resize')}</title></rect></g>`;
      const {hh} = aabb(f);
      s += `<text x="${f.cx}" y="${f.cy+hh+24*k}" font-size="${12*k}" text-anchor="middle" fill="#b5653a" font-weight="600" pointer-events="none"
        stroke="#fff" stroke-width="${3*k}" paint-order="stroke">${f.w} × ${f.d}</text>`;
    }
  } else if (ui.sel?.kind === 'window'){
    const r=WINS[ui.sel.index]; if(r) s+=`<rect x="${r[0]}" y="${r[1]}" width="${r[2]-r[0]}" height="${r[3]-r[1]}" fill="none" stroke="#b5653a" stroke-width="3" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
  } else if (ui.sel?.kind === 'room'){
    const r = ROOMS.find(r => r.id === ui.sel.id);
    s += `<polygon points="${r.poly.map(p=>p.join(',')).join(' ')}" fill="rgba(181,101,58,.08)" stroke="#b5653a" stroke-width="2" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
  } else if (ui.sel?.kind === 'angledWall'){
    const w=ANGLED_WALLS[ui.sel.index]; if(w){const poly=joinFootprints(ANGLED_WALLS)[ui.sel.index];s+=`<polygon points="${poly.map(p=>p.join(',')).join(' ')}" fill="none" stroke="#b5653a" stroke-width="3" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
    for(const [i,p] of [w.start,w.end].entries()) s+=`<circle data-angled-end="${i}" cx="${p.x}" cy="${p.y}" r="${12/view.s}" fill="#fff" stroke="#b5653a" stroke-width="2" vector-effect="non-scaling-stroke" style="cursor:move"/>`;
    }
  } else if (ui.sel?.kind === 'wall'){
    const w = WALLS[ui.sel.index];
    if (w) s += `<rect x="${w[0]}" y="${w[1]}" width="${w[2]-w[0]}" height="${w[3]-w[1]}" fill="none" stroke="#b5653a" stroke-width="3" vector-effect="non-scaling-stroke" pointer-events="none"/>`;
    if (w) {
      const horizontal=w[2]-w[0]>=w[3]-w[1];
      const ends=horizontal ? [[w[0],(w[1]+w[3])/2],[w[2],(w[1]+w[3])/2]] : [[(w[0]+w[2])/2,w[1]],[(w[0]+w[2])/2,w[3]]];
      ends.forEach(([x,y],i)=>s+=`<circle data-wall-end="${i}" cx="${x}" cy="${y}" r="${14*k}" fill="transparent" style="cursor:${horizontal?'ew':'ns'}-resize"/><circle data-wall-end="${i}" cx="${x}" cy="${y}" r="${6*k}" fill="#fff" stroke="#b5653a" stroke-width="2" vector-effect="non-scaling-stroke" style="cursor:${horizontal?'ew':'ns'}-resize"><title>拖曳調整牆長（Shift：不吸附）</title></circle>`);
      s+=`<text x="${(w[0]+w[2])/2}" y="${w[1]-16*k}" font-size="${12*k}" fill="#b5653a" text-anchor="middle">${Math.round(Math.max(w[2]-w[0],w[3]-w[1]))} mm</text>`;
    }
  }
  for(const f of selectedFurniture()){if(ui.sel?.kind==='furn'&&ui.sel.id===f.id)continue;s+=`<g transform="translate(${f.cx} ${f.cy}) rotate(${f.rot})"><rect x="${-f.w/2}" y="${-f.d/2}" width="${f.w}" height="${f.d}" fill="rgba(30,136,180,.10)" stroke="#198cbd" stroke-width="2" vector-effect="non-scaling-stroke" stroke-dasharray="7 5" pointer-events="none"/></g>`;}
  setSvgLayerMarkup('#gSel', s);refreshArrangementButtons();refreshGroupButtons();
}

function renderWallDraft(){
  const node=$('#gWallDraft');if(!node)return;
  if(ui.tool!=='wallDraw'||!ui.wallStart||!ui.wallCursor){setSvgLayerMarkup(node, '');return;}
  const a=ui.wallStart,b=ui.wallCursor;
  if(Math.hypot(a.x-b.x,a.y-b.y)<30){setSvgLayerMarkup(node, '');return;}
  const poly=segmentFootprint({start:a,end:b,thickness:180});
  setSvgLayerMarkup(node, `<polygon points="${poly.map(p=>p.join(',')).join(' ')}" fill="rgba(181,101,58,.25)" stroke="#b5653a" stroke-dasharray="9 5" pointer-events="none"/>`);
}
const svgRenderer = createSvgRenderer({
  layers: [renderGrid, renderRooms, renderFurn, renderWalls, renderOpenings,
    renderDims, renderLabels, renderMeasure, renderSel, renderWallDraft,
    renderCollisionWarnings, renderPlanDiagnostics],
  afterRender: () => { renderPanel(); updateHeader(); sceneController?.sync(); }
});
function renderAll(){ svgRenderer.render(); }
function renderChangedLayers(indices){ svgRenderer.invalidate(indices); svgRenderer.renderDirty(); }

function updateHeader(){
  const tot = ROOMS.filter(r => r.counted !== false).reduce((a,r) => a + area(r.poly), 0);
  const guide = LAYOUT_GUIDES[state.layoutType], layout = guide.name;
  $('#layoutType').value = state.layoutType;
  if (viewState) viewState.layoutType = state.layoutType;
  $('#brandTitle').textContent = T('ui.header.design.title', {layout: T(`ui.layout.name.${state.layoutType}`)});
  document.title = T('ui.header.design.title', {layout: T(`ui.layout.name.${state.layoutType}`)});
  $('#subtitle').textContent = window.floorplanTranslate?.('ui.header.plan.subtitle', {layout: window.floorplanTranslate?.(`ui.layout.name.${state.layoutType}`) ?? layout, area: areaUnit(tot)}) ?? `${layout} plan · Net floor area ≈ ${areaUnit(tot)} · Units: mm · Original scale 1:60`;
  $('#undo').disabled = !undoStack.length; $('#redo').disabled = !redoStack.length;
  $('#undo').style.opacity = undoStack.length ? 1 : .4; $('#redo').style.opacity = redoStack.length ? 1 : .4;
}

/* ======================= 右側面板 ======================= */
const esc = s => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

function renderPanel(){
  renderFab();
  const p = $('#panel');
  if (ui.sel?.kind === 'furn' && multiFurniture.size > 1){p.innerHTML=`<div class="section"><h3>${T('ui.room.multi.selection', {count: multiFurniture.size})}</h3><p class="muted">${T('ui.room.multi.help')}</p><label>${T('ui.room.multi.rotation')}<input type="number" id="multiRotAngle" value="45" step="1"></label><div class="actions"><button class="btn" id="multiRotApply">${T('ui.room.multi.rotate.all')}</button><button class="btn" id="clearFurnMulti">${T('ui.deselect')}</button></div></div>`;$('#multiRotApply').onclick=()=>rotateFurnitureSelection(Number($('#multiRotAngle').value));$('#clearFurnMulti').onclick=()=>select(null);return;}
  if (ui.sel?.kind === 'furn'){ const f = getF(ui.sel.id); if (f){ p.innerHTML = furnPanel(f); bindFurnPanel(f); return; } }
  if (ui.sel?.kind === 'door'){ p.innerHTML = doorPanel(ui.sel.index); bindDoorPanel(ui.sel.index); return; }
  if (ui.sel?.kind === 'window'){ p.innerHTML = windowPanel(ui.sel.index); bindWindowPanel(ui.sel.index); return; }
  if (ui.sel?.kind === 'room'){ p.innerHTML = roomPanel(ROOMS.find(r => r.id === ui.sel.id)); bindRoomPanel(); return; }
  if (ui.sel?.kind === 'wall'){ p.innerHTML = wallPanel(ui.sel.index); bindWallPanel(ui.sel.index); return; }
  if (ui.sel?.kind === 'angledWall'){ p.innerHTML = angledWallPanel(ui.sel.index); bindAngledWallPanel(ui.sel.index); return; }
  p.innerHTML = overviewPanel(); bindOverview();
}

function overviewPanel(){
  // 動線與飄窗等非計坪輔助區只用於幾何計算，不列入使用者的房間清單，
  // 讓一房資訊面板與參考圖一致，只呈現可使用空間。
  const rows = ROOMS.filter(r => r.counted !== false).map(r => {
    const st = state.rooms[r.id];
    return `<tr class="click" data-room="${r.id}"><td><span class="sw" style="background:${MATS[st.mat].sw}"></span>${esc(nm(st.name))}${r.counted===false?' <span class="muted">*</span>':''}</td>
      <td class="r">${areaUnit(area(r.poly))}</td></tr>`;
  }).join('');
  const tot = ROOMS.filter(r => r.counted !== false).reduce((a,r) => a + area(r.poly), 0);
  const byMat = {};
  ROOMS.forEach(r => { const m = state.rooms[r.id].mat; byMat[m] = (byMat[m]||0) + area(r.poly); });
  let cost = 0;
  const matRows = Object.entries(byMat).map(([m,a]) => { const c = a*MATS[m].price*1.05; cost += c;
    return `<tr><td><span class="sw" style="background:${MATS[m].sw}"></span>${T(({ '橡木地板':'ui.room.flooring.oak', '胡桃木地板':'ui.room.flooring.walnut', '300 防滑磚':'ui.room.flooring.antislip', '800 地磚':'ui.room.flooring.tile800', '600 地磚':'ui.room.flooring.tile600', '大理石':'ui.materials.floor.marble', '水磨石':'ui.materials.floor.terrazzo', '滿鋪地毯':'ui.materials.floor.carpet' })[MATS[m].name] || MATS[m].name)}</td><td class="r">${fmt(a,1)} m²</td><td class="r">${money(c)}</td></tr>`; }).join('');
  const dem = state.demolished.map(id => WALLS[+id.slice(1)]);
  const demLen = dem.reduce((a,w) => a + Math.max(w[2]-w[0], w[3]-w[1]), 0) / 1000;
  return `
  <section><h3>${T('ui.room.areas')} <small>${T('ui.room.flooring.help')}</small></h3>
    <table>${rows}</table>
    <div class="total"><span>${T('ui.room.net.floor')}</span><b>${areaUnit(tot)}</b></div>
    <div class="muted" style="font-size:11px;margin-top:4px">${T('ui.room.net.note')}</div></section>
  <section><h3>${T('ui.room.flooring.estimate')} <small>${T('ui.room.waste')}</small></h3>
    <table>${matRows}</table>
    <div class="total"><span>${T('ui.room.flooring.total')}</span><b>${money(cost)}</b></div></section>
  <section><h3>${T('ui.room.bedroom.plan')}</h3>
    <div class="stats"><div><small>${T('ui.room.selected')}</small><span class="big">${T(`ui.layout.name.${state.layoutType}`)}</span></div></div>
    <div class="muted">${T(`ui.room.guide.${({'1':'one','2':'two','3':'three','4':'four','empty':'empty'})[state.layoutType] || 'one'}`)}</div></section>
  <section><h3>${T('ui.room.plan.stats')}</h3>
    <div class="stats"><div><small>${T('ui.furniture')}</small><span class="big">${state.furniture.length}</span></div>
      <div><small>${T('ui.room.walls.removed')}</small><span class="big">${fmt(demLen,1)}</span> m</div></div>
    <div class="actions"><button class="btn" id="clearMeasure">${T('ui.room.clear.measures')} (${state.measures.length})</button>
      <button class="btn danger" id="clearFurn">${T('ui.clear.layout')}</button></div></section>
  ${state.measures.length ? `<section><h3>${T('ui.room.custom.dimensions')}</h3><div class="form">${state.measures.map((m,i) => `<label>${tr(`尺寸 ${i+1}`,'Dimension')}<input data-measure="${i}" type="number" value="${m.label ?? Math.round(Math.hypot(m.b.x-m.a.x,m.b.y-m.a.y))}" min="1" step="10"></label>`).join('')}</div><div class="muted" style="margin-top:7px">${T('ui.room.measure.note')}</div></section>` : ''}
  ${COARSE ? tr(`<section><h3>觸屏操作</h3><div class="kbd">
    <kbd>單指拖曳</kbd><span>空白處平移畫面</span><kbd>雙指</kbd><span>捏合縮放、拖曳平移</span>
    <kbd>家具庫</kbd><span>點一下放到畫面中央，或按住向右拖到指定位置</span>
    <kbd>點家具</kbd><span>選取後拖曳移動；拖頂部圓點旋轉、右下方塊改尺寸</span>
    <kbd>工具條</kbd><span>選取後底部可旋轉 / 複製 / 刪除</span>
    <kbd>量測</kbd><span>按住拖出一條線，或依次點兩點</span>
    <kbd>3D 漫遊</kbd><span>左下搖桿移動，拖曳屏幕轉向，點擊門片開關</span>
  </div></section>`, `<section><h3>Touch Controls</h3><div class="kbd">
    <kbd>1-finger drag</kbd><span>Pan on empty space</span><kbd>2 fingers</kbd><span>Pinch to zoom, drag to pan</span>
    <kbd>Library</kbd><span>Tap to place at center, or hold and drag right to a spot</span>
    <kbd>Tap item</kbd><span>Drag to move; top dot rotates, bottom-right square resizes</span>
    <kbd>Toolbar</kbd><span>Bottom bar can rotate / duplicate / delete</span>
    <kbd>Measure</kbd><span>Hold and drag a line, or tap two points</span>
    <kbd>3D walk</kbd><span>Joystick moves, drag to look, tap doors to open</span>
  </div></section>`) : ''}
  <section><h3>${T('ui.keyboard.title')}</h3><div class="kbd">
    <kbd>${T('ui.keyboard.drag.key')}</kbd><span>${T('ui.keyboard.drag.description')}</span>
    <kbd>${T('ui.keyboard.v.key')}</kbd><span>${T('ui.keyboard.v.description')}</span>
    <kbd>${T('ui.keyboard.m.key')}</kbd><span>${T('ui.keyboard.m.description')}</span>
    <kbd>${T('ui.keyboard.x.key')}</kbd><span>${T('ui.keyboard.x.description')}</span>
    <kbd>${T('ui.keyboard.r.key')}</kbd><span>${T('ui.keyboard.r.description')}</span>
    <kbd>${T('ui.keyboard.arrows.key')}</kbd><span>${T('ui.keyboard.arrows.description')}</span>
    <kbd>${T('ui.keyboard.copy.key')}</kbd><span>${T('ui.keyboard.copy.description')}</span>
    <kbd>${T('ui.keyboard.delete.key')}</kbd><span>${T('ui.keyboard.delete.description')}</span>
    <kbd>${T('ui.keyboard.undo.key')}</kbd><span>${T('ui.keyboard.undo.description')}</span>
    <kbd>${T('ui.keyboard.toggle.key')}</kbd><span>${T('ui.keyboard.toggle.description')}</span>
    <kbd>${T('ui.keyboard.fit.key')}</kbd><span>${T('ui.keyboard.fit.description')}</span>
    <kbd>${T('ui.keyboard.deselect.key')}</kbd><span>${T('ui.keyboard.deselect.description')}</span>
  </div></section>`;
}
function bindOverview(){
  document.querySelectorAll('#panel tr[data-room]').forEach(tr => tr.onclick = () => { select({kind:'room', id:tr.dataset.room}); if (is3D()) sceneController.flyToRoom(tr.dataset.room); });
  $('#clearMeasure').onclick = () => state.measures.length && mutate(() => state.measures = []);
  $('#clearFurn').onclick = clearLayout;
  document.querySelectorAll('#panel [data-measure]').forEach(input => input.onchange = e => {
    const i = +e.target.dataset.measure, value = Math.max(1, Math.round(+e.target.value || 0));
    mutate(() => state.measures[i].label = value);
  });
}

// 底部浮動工具條：觸屏沒有鍵盤，旋轉 / 複製 / 刪除都放在這裡
function renderFab(){
  const fab = $('#fab'), f = ui.sel?.kind === 'furn' && getF(ui.sel.id), r = ui.sel?.kind === 'room' && ROOMS.find(r => r.id === ui.sel.id);
  if (!f && !r){ fab.classList.remove('show'); return; }
  fab.innerHTML = f
    ? `<span class="name">${esc(nm(f.name))}</span><button class="btn" data-a="rotL">↺</button><button class="btn" data-a="rotR">↻ ${tr('旋轉','Rotate')}</button>
       <button class="btn" data-a="dup">${tr('複製','Duplicate')}</button><button class="btn danger" data-a="del">${tr('刪除','Delete')}</button><span class="sep"></span>
       <button class="btn narrow-only" data-a="prop">${tr('屬性','Properties')}</button><button class="btn" data-a="done">${tr('完成','Done')}</button>`
    : `<span class="name">${esc(nm(state.rooms[r.id].name))}</span><button class="btn narrow-only" data-a="prop">${tr('地面 / 屬性','Floor / Properties')}</button><button class="btn" data-a="done">${tr('完成','Done')}</button>`;
  fab.classList.add('show');
  fab.querySelectorAll('[data-a]').forEach(b => b.onclick = () => ({
    rotL:() => rotateSel(-90), rotR:() => rotateSel(90), dup:duplicateSel, del:deleteSel,
    prop:() => drawer('panel', true), done:() => { select(null); closeDrawers(); },
  })[b.dataset.a]());
}

function clearLayout(){
  const n = state.furniture.length;
  if (!n) return toast(tr('當前沒有配置任何家具', 'There is no furniture to clear'));
  if (!confirm(tr(`確定清空全部 ${n} 件家具 / 家電嗎？\n牆體、地面材料和量測線會保留，可點「復原」還原。`, `Remove all ${n} furniture / appliance items?\nWalls, flooring and measurements are kept. You can Undo this.`))) return;
  ui.sel = null; mutate(() => state.furniture = []);
  toast(tr('已清空配置，可點「復原」還原', 'Layout cleared — Undo to restore'));
}

/* 側欄開合：which = 'lib' | 'panel' | null，open 不傳則切換。
 * 寬屏：側欄在格局中收起 / 展開（記住選取）；窄屏：側欄是浮層抽屜，一次只開一個，which = null 表示全部關閉 */
const PANES = 'huxing-panes';
const panes = (() => { try { return JSON.parse(localStorage.getItem(PANES)) || {}; } catch(e) { return {}; } })();
function drawer(which, open){
  const app = $('.app'), els = {lib:$('aside.lib'), panel:$('aside.right')}, n = narrow();
  if (n){
    Object.entries(els).forEach(([k, el]) => el.classList.toggle('open', k === which && (open ?? !el.classList.contains('open'))));
  } else {
    Object.values(els).forEach(el => el.classList.remove('open'));
    if (which){
      const k = which === 'lib' ? 'hideLib' : 'hidePanel';
      panes[k] = open === undefined ? !panes[k] : !open;
      try { localStorage.setItem(PANES, JSON.stringify(panes)); } catch(e) {}
    }
  }
  app.classList.toggle('hide-lib', !!panes.hideLib); app.classList.toggle('hide-panel', !!panes.hidePanel);
  syncPaneBtns();
}
function syncPaneBtns(){
  const els = {lib:$('aside.lib'), panel:$('aside.right')}, n = narrow();
  const vis = k => n ? els[k].classList.contains('open') : !panes[k === 'lib' ? 'hideLib' : 'hidePanel'];
  $('#tgLib').classList.toggle('on', vis('lib')); $('#tgPanel').classList.toggle('on', vis('panel'));
  $('#tgLib').title = T(vis('lib') ? 'ui.ribbon.title.library.hide' : 'ui.ribbon.title.library.show');
  $('#tgPanel').title = T(vis('panel') ? 'ui.ribbon.title.properties.hide' : 'ui.ribbon.title.properties.show');
  $('#stage').classList.toggle('drawer-panel', n && vis('panel'));   // 屬性抽屜蓋住畫面時讓出底部工具條
}
function closeDrawers(){ if (narrow()) drawer(null); }

function roomPanel(r){
  const st = state.rooms[r.id], a = area(r.poly), [x0,y0,x1,y1] = bbox(r.poly), inside = state.furniture.filter(f => f.cx>x0&&f.cx<x1&&f.cy>y0&&f.cy<y1);
  const mats = Object.entries(MATS).map(([k,m]) => `<button class="mat ${k===st.mat?'on':''}" data-mat="${k}"><i style="background:${m.sw}"></i><span>${nm(m.name)}<small>${money(m.price)}/m²</small></span></button>`).join('');
  return `<section><h3>${tr('房間','Room')}</h3>
    <div class="form"><label class="full">${tr('名稱','Name')}<input id="rName" value="${esc(nm(st.name))}"></label></div>
    <div class="stats" style="margin-top:10px">
      <div><small>${tr('使用面積','Floor area')}</small><span class="big">${fmt(a)}</span> m²<br><small>${fmt(ping(a))} 坪</small></div>
      <div><small>${tr('周長','Perimeter')}</small><span class="big">${fmt(perim(r.poly),1)}</span> m</div>
      <div><small>${tr('開間','Width')}</small><span class="big">${x1-x0}</span> mm</div>
      <div><small>${tr('進深','Depth')}</small><span class="big">${y1-y0}</span> mm</div></div>
    <div class="muted">${tr(`牆面面積（層高 2.8m，未扣門窗）約 ${fmt(perim(r.poly)*2.8,1)} m²`, `Wall area (2.8m ceiling, openings not deducted) ≈ ${fmt(perim(r.poly)*2.8,1)} m²`)}</div></section>
  <section><h3>${tr('地面材料','Flooring')}</h3><div class="mats">${mats}</div>
    <div class="total"><span>${tr('材料估價','Estimated cost')}</span><b>${money(a*MATS[st.mat].price*1.05)}</b></div></section>
  <section><h3>${tr('房間內家具','Furniture in room')} <small>${tr(`${inside.length} 件`, `${inside.length} items`)}</small></h3>
    <table>${inside.map(f => `<tr class="click" data-fid="${f.id}"><td>${esc(nm(f.name))}</td><td class="r muted">${f.w}×${f.d}</td></tr>`).join('') || `<tr><td class="muted">${tr('暫無','None')}</td></tr>`}</table>
    <div class="actions">${r.zone?`<button class="btn danger" id="removeZone">${tr('刪除此新增空間與配套家具','Delete this space and its preset furniture')}</button>`:''}<button class="btn" id="back">${tr('← 返回總覽','← Back to overview')}</button></div></section>`;
}
function bindRoomPanel(){
  const id = ui.sel.id;
  $('#rName').onchange = e => mutate(() => state.rooms[id].name = e.target.value.trim() || state.rooms[id].name);
  document.querySelectorAll('#panel [data-mat]').forEach(b => b.onclick = () => mutate(() => state.rooms[id].mat = b.dataset.mat));
  document.querySelectorAll('#panel tr[data-fid]').forEach(tr => tr.onclick = () => select({kind:'furn', id:tr.dataset.fid}));
  $('#back').onclick = () => select(null);
  if($('#removeZone'))$('#removeZone').onclick=deleteSel;
}
function doorPanel(index){
  const d=DOORS[index]; if(!d)return '';
  const [x0,y0,x1,y1]=d.rect;
  return `<section><h3>${tr('既有房門','Existing door')}</h3><div class="form">
    <label class="full">${tr('名稱','Name')}<input id="dName" value="${esc(d.name)}"></label>
    <label>${tr('中心 X','Center X')} (mm)<input id="dX" type="number" step="10" value="${(x0+x1)/2}"></label>
    <label>${tr('中心 Y','Center Y')} (mm)<input id="dY" type="number" step="10" value="${(y0+y1)/2}"></label>
    <label>${tr('門寬','Door width')} (mm)<input id="dLen" type="number" min="500" max="2500" step="10" value="${d.len}"></label>
  </div><div class="muted" style="margin-top:8px">${tr('可修改房門位置、名稱與寬度；2D 與 3D 會同步更新。','Edit position, name and width; 2D and 3D update together.')}</div>
  <div class="actions"><button class="btn danger" id="dDel">${tr('刪除房門','Delete door')}</button><button class="btn" id="back">${tr('← 返回','← Back')}</button></div></section>`;
}
function bindDoorPanel(index){
  const update=()=>mutate(()=>{
    const d=DOORS[index]; if(!d)return;
    const cx=Number($('#dX').value),cy=Number($('#dY').value);
    const L=Math.max(500,Math.min(2500,Number($('#dLen').value)||d.len));
    if(!Number.isFinite(cx)||!Number.isFinite(cy))return;
    const oldLen=d.len, oldCx=(d.rect[0]+d.rect[2])/2,oldCy=(d.rect[1]+d.rect[3])/2;
    const dx=cx-oldCx,dy=cy-oldCy;
    const oldRect=d.rect;
    const horizontal=(oldRect[2]-oldRect[0])>=(oldRect[3]-oldRect[1]);
    const thick=horizontal?oldRect[3]-oldRect[1]:oldRect[2]-oldRect[0];
    d.rect=horizontal?[cx-L/2,cy-thick/2,cx+L/2,cy+thick/2]:[cx-thick/2,cy-L/2,cx+thick/2,cy+L/2];
    const hingeRelativeX=d.h[0]-oldCx,hingeRelativeY=d.h[1]-oldCy;
    d.h=[cx+(horizontal?Math.sign(hingeRelativeX||-1)*L/2:hingeRelativeX),cy+(horizontal?hingeRelativeY:Math.sign(hingeRelativeY||-1)*L/2)];
    d.name=$('#dName').value.trim()||d.name; d.len=L;
    state.archVersion=(state.archVersion||0)+1;
  });
  ['dName','dX','dY','dLen'].forEach(id=>$('#'+id).onchange=update);
  $('#dDel').onclick=()=>{if(!confirm(tr('確定刪除此房門？','Delete door?')))return;mutate(()=>{DOORS.splice(index,1);state.archVersion=(state.archVersion||0)+1;});select(null);};
  $('#back').onclick=()=>select(null);
}

function windowPanel(index){
  const r = WINS[index]; if (!r) return '';
  const horizontal = (r[2]-r[0]) >= (r[3]-r[1]);
  return `<section><h3>${tr('既有窗戶','Existing window')}</h3><div class="form">
    <label>${tr('中心 X','Center X')} (mm)<input id="winX" type="number" step="10" value="${(r[0]+r[2])/2}"></label>
    <label>${tr('中心 Y','Center Y')} (mm)<input id="winY" type="number" step="10" value="${(r[1]+r[3])/2}"></label>
    <label>${tr('窗戶寬度','Window width')} (mm)<input id="winL" type="number" min="200" step="10" value="${horizontal?r[2]-r[0]:r[3]-r[1]}"></label>
    <label>${tr('牆厚','Wall thickness')} (mm)<input id="winT" type="number" min="50" step="10" value="${horizontal?r[3]-r[1]:r[2]-r[0]}"></label>
  </div><div class="actions"><button class="btn danger" id="winDel">${tr('刪除窗戶','Delete window')}</button><button class="btn" id="back">${tr('← 返回','← Back')}</button></div></section>`;
}
function bindWindowPanel(index){
  const update = () => mutate(() => {
    const r = WINS[index]; if (!r) return;
    const horizontal = r[2]-r[0] >= r[3]-r[1];
    const x = Number($('#winX').value), y = Number($('#winY').value);
    const L = Math.max(200, Number($('#winL').value)||200), T = Math.max(50, Number($('#winT').value)||50);
    if (!Number.isFinite(x)||!Number.isFinite(y)) return;
    WINS[index] = horizontal ? [x-L/2,y-T/2,x+L/2,y+T/2] : [x-T/2,y-L/2,x+T/2,y+L/2];
    state.archVersion=(state.archVersion||0)+1;
  });
  ['winX','winY','winL','winT'].forEach(id=>$('#'+id).onchange=update);
  $('#winDel').onclick=()=>{ if (!confirm(tr('確定刪除此窗戶？','Delete window?'))) return; mutate(()=>{WINS.splice(index,1);state.archVersion=(state.archVersion||0)+1;}); select(null); };
  $('#back').onclick=()=>select(null);
}

// 牆角節點共享：拖曳相連端點時，所有共享同一中心線座標的斜牆端點同步移動。
function moveConnectedAngledEndpoints(oldPoint, newPoint, excludedIndex=-1){
  const tol=0.01;
  ANGLED_WALLS.forEach((w,i)=>{
    if(i===excludedIndex)return;
    for(const key of ['start','end']){
      if(Math.hypot(w[key].x-oldPoint.x,w[key].y-oldPoint.y)<tol)w[key]={...newPoint};
    }
  });
}
function angledWallPanel(index){
  const w=ANGLED_WALLS[index];if(!w)return '';
  return `<section><h3>斜牆屬性</h3><div class="form"><label>起點 X<input id="ax0" type="number" value="${Math.round(w.start.x)}"></label><label>起點 Y<input id="ay0" type="number" value="${Math.round(w.start.y)}"></label><label>終點 X<input id="ax1" type="number" value="${Math.round(w.end.x)}"></label><label>終點 Y<input id="ay1" type="number" value="${Math.round(w.end.y)}"></label><label>牆厚 (mm)<input id="at" type="number" value="${w.thickness}" min="50"></label><label>牆高 (mm)<input id="ah" type="number" value="${w.height}" min="100"></label><label>長度 (mm)<input value="${Math.round(segmentLength(w.start,w.end))}" disabled></label></div><div class="actions"><button class="btn danger" id="aDel">刪除牆面</button><button class="btn" id="back">← 返回</button></div></section>`;
}
function bindAngledWallPanel(index){
  const edit=()=>{const w=ANGLED_WALLS[index];const a={x:+$('#ax0').value,y:+$('#ay0').value},b={x:+$('#ax1').value,y:+$('#ay1').value};if(![a.x,a.y,b.x,b.y].every(Number.isFinite)||segmentLength(a,b)<100)return toast('牆體長度不可小於 100 mm');mutate(()=>{moveConnectedAngledEndpoints(w.start,a,index);moveConnectedAngledEndpoints(w.end,b,index);w.start=a;w.end=b;w.thickness=Math.max(50,+$('#at').value||180);w.height=Math.max(100,+$('#ah').value||2800);state.archVersion++;});};
  ['ax0','ay0','ax1','ay1','at','ah'].forEach(id=>$('#'+id).onchange=edit);
  $('#aDel').onclick=()=>{mutate(()=>ANGLED_WALLS.splice(index,1));select(null);};$('#back').onclick=()=>select(null);
}
function wallPanel(index){
  const w = WALLS[index]; if (!w) return '';
  const [x0,y0,x1,y1,k] = w, thickness = Math.min(Math.abs(x1-x0), Math.abs(y1-y0));
  return `<section><h3>${tr('牆面屬性','Wall properties')}</h3><div class="form">
    <label>${tr('起點 X','Start X')}<input id="wx0" type="number" value="${x0}" step="10"></label><label>${tr('起點 Y','Start Y')}<input id="wy0" type="number" value="${y0}" step="10"></label>
    <label>${tr('終點 X','End X')}<input id="wx1" type="number" value="${x1}" step="10"></label><label>${tr('終點 Y','End Y')}<input id="wy1" type="number" value="${y1}" step="10"></label>
    <label>${tr('牆厚','Thickness')} (mm)<input id="wThick" type="number" value="${thickness}" min="50" step="10"></label><label class="full">${tr('牆體類型','Wall type')}<select id="wType"><option value="n">${tr('隔間牆','Partition')}</option><option value="b">${tr('承重牆','Bearing')}</option><option value="e">${tr('外牆','Exterior')}</option><option value="low">${tr('矮牆','Low wall')}</option></select></label>
  </div><div class="actions"><button class="btn danger" id="wDel">${tr('移除牆面','Remove wall')}</button><button class="btn" id="back">${tr('← 返回','← Back')}</button></div></section>`;
}
function bindWallPanel(index){
  $('#wType').value = WALLS[index][4];
  const edit = () => mutate(() => {
    const w = WALLS[index], before = structuredClone(w); ['wx0','wy0','wx1','wy1'].forEach((id,i) => { const v = +$('#'+id).value; if (Number.isFinite(v)) w[i] = v; });
    const thick = Math.max(50, +$('#wThick').value || 0), horiz = Math.abs(w[2]-w[0]) >= Math.abs(w[3]-w[1]);
    if (horiz) w[3] = w[1] + Math.sign(w[3]-w[1] || 1)*thick; else w[2] = w[0] + Math.sign(w[2]-w[0] || 1)*thick;
    w[4] = $('#wType').value; updateRoomsForMovedWall(before,w); state.archVersion = (state.archVersion || 0) + 1;
  });
  ['#wx0','#wy0','#wx1','#wy1','#wThick','#wType'].forEach(id => $(id).onchange = edit);
  $('#wDel').onclick = () => { if (confirm(tr('移除此牆面？','Remove this wall?'))) { mutate(() => { mergeRoomsAcrossWall(WALLS[index]); WALLS.splice(index,1); state.archVersion = (state.archVersion || 0) + 1; }); select(null); } };
  $('#back').onclick = () => select(null);
}

function furnPanel(f){
  return `<section><h3>${tr('家具屬性','Furniture')}</h3>
    <div class="form">
      <label class="full">${tr('名稱','Name')}<input id="fName" value="${esc(nm(f.name))}"></label>
      <label>${tr('寬','Width')} (mm)<input type="number" id="fW" value="${f.w}" min="50" step="10"></label>
      <label>${tr('深','Depth')} (mm)<input type="number" id="fD" value="${f.d}" min="50" step="10"></label>
      <label>${tr('中心','Center')} X (mm)<input type="number" id="fX" value="${Math.round(f.cx)}" step="10"></label>
      <label>${tr('中心','Center')} Y (mm)<input type="number" id="fY" value="${Math.round(f.cy)}" step="10"></label>
      <label>${tr('旋轉','Rotation')} (°)<input type="number" id="fR" value="${f.rot}" step="15"></label>
      <label>${tr('顏色','Color')}<input type="color" id="fC" value="${f.color}"></label>
    </div>
    <div class="muted" style="margin-top:8px">${tr('佔地面積','Footprint')} ${areaUnit(f.w*f.d/1e6)}</div>
    <div class="actions">
      <button class="btn" id="aRot">${tr('旋轉 90°','Rotate 90°')}</button><button class="btn" id="aDup">${tr('複製','Duplicate')}</button>${(f.type.startsWith('window') || f.type.startsWith('door')) ? `<button class="btn primary" id="embedWin">${tr('嵌入最近牆面','Embed in nearest wall')}</button>` : ''}
      <button class="btn" id="aTop">${tr('置於頂層','Bring to front')}</button><button class="btn" id="aBot">${tr('置於底層','Send to back')}</button>
      <button class="btn danger" id="aDel">${tr('刪除','Delete')}</button><button class="btn" id="back">${tr('← 返回','← Back')}</button>
    </div></section>
  <section class="muted" style="font-size:12px">${tr('拖曳家具移動；拖曳上方圓點旋轉；拖曳右下角方塊調整尺寸。開啟「貼齊牆面」後靠近牆面會自動貼齊。', 'Drag to move; drag the top dot to rotate; drag the bottom-right square to resize. With "Wall snap" on, items snap flush to nearby walls.')}</section>`;
}
function bindFurnPanel(f){
  const upd = (fn) => mutate(() => { const g = getF(f.id); if (g) fn(g); });
  const num = (id, fn) => $(id).onchange = e => { const v = parseFloat(e.target.value); if (!isNaN(v)) upd(g => fn(g, v)); };
  $('#fName').onchange = e => upd(g => g.name = e.target.value.trim() || g.name);
  num('#fW', (g,v) => g.w = Math.max(50, Math.round(v)));
  num('#fD', (g,v) => g.d = Math.max(50, Math.round(v)));
  num('#fX', (g,v) => g.cx = v); num('#fY', (g,v) => g.cy = v); num('#fR', (g,v) => g.rot = norm(v));
  $('#fC').onchange = e => upd(g => g.color = e.target.value);
  $('#aRot').onclick = () => rotateSel(90);
  $('#aDup').onclick = duplicateSel;
  $('#aDel').onclick = deleteSel;
  $('#aTop').onclick = () => mutate(() => { const i = state.furniture.findIndex(g => g.id===f.id); if (i >= 0 && i < state.furniture.length - 1) state.furniture.push(state.furniture.splice(i,1)[0]); });
  $('#aBot').onclick = () => mutate(() => { const i = state.furniture.findIndex(g => g.id===f.id); if (i > 0) state.furniture.unshift(state.furniture.splice(i,1)[0]); });
  if (isOpening(f)) $('#embedWin').onclick = () => mutate(() => {
    const g=getF(f.id);
    const position=placeOpening(g,wallCentreLines(WALLS,ANGLED_WALLS,state.demolished));
    if(!position){toast('找不到可容納這個門窗的牆段');return;}
    Object.assign(g,{cx:position.cx,cy:position.cy,rot:position.rot});
    if(!['windowbay','windowproject'].includes(g.type))g.d=Math.max(50,position.depth);
  });
  $('#back').onclick = () => select(null);
}

/* ======================= 操作 ======================= */
// 房間拓樸：牆完整穿越一個矩形房間時分割；牆位移時更新兩側房間邊界；
// 拆除完整隔間時，條件相符的兩個矩形房間會合併。複雜的 L 型房間保留原輪廓，
// 避免在不確定的情況下破壞使用者原有配置。
const ROOM_TOL = 2;
const rectRoom = r => r?.poly?.length === 4 && (() => { const [x0,y0,x1,y1] = bbox(r.poly); return Math.abs(area(r.poly) - (x1-x0)*(y1-y0)/1e6) < .001; })();
const near = (a,b) => Math.abs(a-b) <= ROOM_TOL;
const setRoomRect = (r,x0,y0,x1,y1) => { r.poly = R(x0,y0,x1,y1); r.at = [(x0+x1)/2,(y0+y1)/2]; };
function nextRoomId(){ let n = 1, id; do { id = `room-${n++}`; } while (ROOMS.some(r => r.id === id)); return id; }
function splitRoomsByWall(w){
  const [wx0,wy0,wx1,wy1] = w, vertical = Math.abs(wx1-wx0) <= Math.abs(wy1-wy0);
  const a = vertical ? Math.min(wx0,wx1) : Math.min(wy0,wy1), b = vertical ? Math.max(wx0,wx1) : Math.max(wy0,wy1);
  const span0 = vertical ? Math.min(wy0,wy1) : Math.min(wx0,wx1), span1 = vertical ? Math.max(wy0,wy1) : Math.max(wx0,wx1);
  for (const r of [...ROOMS]){
    if (!rectRoom(r)) continue;
    const [x0,y0,x1,y1] = bbox(r.poly);
    const crosses = vertical
      ? a > x0 + ROOM_TOL && b < x1 - ROOM_TOL && span0 <= y0 + ROOM_TOL && span1 >= y1 - ROOM_TOL
      : a > y0 + ROOM_TOL && b < y1 - ROOM_TOL && span0 <= x0 + ROOM_TOL && span1 >= x1 - ROOM_TOL;
    if (!crosses) continue;
    const copyId = nextRoomId(), copy = structuredClone(r), original = state.rooms[r.id] || {name:r.name, mat:r.mat};
    copy.id = copyId; copy.name = `${original.name} 2`;
    if (vertical){ setRoomRect(r,x0,y0,a,y1); setRoomRect(copy,b,y0,x1,y1); }
    else { setRoomRect(r,x0,y0,x1,a); setRoomRect(copy,x0,b,x1,y1); }
    state.rooms[copyId] = {name:copy.name, mat:original.mat};
    ROOMS.push(copy);
  }
}
function updateRoomsForMovedWall(before, after){
  const oldV = Math.abs(before[2]-before[0]) <= Math.abs(before[3]-before[1]);
  const newV = Math.abs(after[2]-after[0]) <= Math.abs(after[3]-after[1]);
  if (oldV !== newV) { splitRoomsByWall(after); return; }
  const oldA = oldV ? Math.min(before[0],before[2]) : Math.min(before[1],before[3]);
  const oldB = oldV ? Math.max(before[0],before[2]) : Math.max(before[1],before[3]);
  const newA = newV ? Math.min(after[0],after[2]) : Math.min(after[1],after[3]);
  const newB = newV ? Math.max(after[0],after[2]) : Math.max(after[1],after[3]);
  const span0 = oldV ? Math.min(before[1],before[3]) : Math.min(before[0],before[2]);
  const span1 = oldV ? Math.max(before[1],before[3]) : Math.max(before[0],before[2]);
  ROOMS.forEach(r => {
    if (!rectRoom(r)) return;
    const [x0,y0,x1,y1] = bbox(r.poly);
    const overlap = oldV ? Math.min(y1,span1) - Math.max(y0,span0) : Math.min(x1,span1) - Math.max(x0,span0);
    if (overlap <= ROOM_TOL) return;
    if (oldV){
      if (near(x1,oldA)) setRoomRect(r,x0,y0,newA,y1);
      else if (near(x0,oldB)) setRoomRect(r,newB,y0,x1,y1);
    } else {
      if (near(y1,oldA)) setRoomRect(r,x0,y0,x1,newA);
      else if (near(y0,oldB)) setRoomRect(r,x0,newB,x1,y1);
    }
  });
  splitRoomsByWall(after);
}
function mergeRoomsAcrossWall(w){
  const vertical = Math.abs(w[2]-w[0]) <= Math.abs(w[3]-w[1]);
  const a = vertical ? Math.min(w[0],w[2]) : Math.min(w[1],w[3]), b = vertical ? Math.max(w[0],w[2]) : Math.max(w[1],w[3]);
  for (let i=0; i<ROOMS.length; i++) for (let j=i+1; j<ROOMS.length; j++){
    const A=ROOMS[i], B=ROOMS[j]; if (!rectRoom(A) || !rectRoom(B)) continue;
    const [ax0,ay0,ax1,ay1]=bbox(A.poly), [bx0,by0,bx1,by1]=bbox(B.poly);
    const joins = vertical
      ? ((near(ax1,a) && near(bx0,b) || near(bx1,a) && near(ax0,b)) && near(ay0,by0) && near(ay1,by1))
      : ((near(ay1,a) && near(by0,b) || near(by1,a) && near(ay0,b)) && near(ax0,bx0) && near(ax1,bx1));
    if (!joins) continue;
    setRoomRect(A,Math.min(ax0,bx0),Math.min(ay0,by0),Math.max(ax1,bx1),Math.max(ay1,by1));
    delete state.rooms[B.id]; ROOMS.splice(j,1); return;
  }
}
function select(sel){if(sel?.kind==='furn'){selectFurniture(sel.id,false);return;}ui.sel=selectionManager.select(sel);renderSel();renderCollisionWarnings();renderPanel();refreshGroupButtons();}
function rotateSel(d){if(ui.sel?.kind==='furn'){rotateFurnitureSelection(d);}}
function deleteSel(){
  const selected=ui.sel;if(!selected)return;
  if(selected.kind==='furn'&&multiFurniture.size>1){const ids=new Set(multiFurniture);multiFurniture.clear();ui.sel=null;mutate(()=>{state.furniture=state.furniture.filter(f=>!ids.has(f.id));});return;}
  if(selected.kind==='room'&&!ROOMS.find(r=>r.id===selected.id)?.zone)return;
  if(!['furn','wall','angledWall','door','window','room'].includes(selected.kind))return;
  ui.sel=null;
  mutate(()=>{
    if(selected.kind==='furn')state.furniture=state.furniture.filter(f=>f.id!==selected.id);
    if(selected.kind==='door')DOORS.splice(selected.index,1);
    if(selected.kind==='window')WINS.splice(selected.index,1);
    if(selected.kind==='angledWall') ANGLED_WALLS.splice(selected.index,1);
    if(selected.kind==='wall'){
      mergeRoomsAcrossWall(WALLS[selected.index]);WALLS.splice(selected.index,1);
      state.demolished=state.demolished.filter(id=>+id.slice(1)!==selected.index).map(id=>'w'+(+id.slice(1)>selected.index?+id.slice(1)-1:+id.slice(1)));
    }
    if(selected.kind==='room'){
      ROOMS.splice(ROOMS.findIndex(r=>r.id===selected.id),1);delete state.rooms[selected.id];
      state.furniture=state.furniture.filter(f=>f.zoneId!==selected.id);
    }
    state.archVersion=(state.archVersion||0)+1;
  });
}
function duplicateSel(){
  if (ui.sel?.kind !== 'furn') return;
  if(multiFurniture.size>1){const current=selectedFurniture();const groupRemap=new Map();const copies=current.map(f=>({...f,id:uid(),cx:f.cx+200,cy:f.cy+200,groupId:f.groupId?(groupRemap.has(f.groupId)?groupRemap.get(f.groupId):(groupRemap.set(f.groupId,uid()),groupRemap.get(f.groupId))):null}));multiFurniture.clear();for(const f of copies)multiFurniture.add(f.id);ui.sel={kind:'furn',id:copies.at(-1).id};mutate(()=>state.furniture.push(...copies));return;}
  const f = getF(ui.sel.id), n = {...f, id:uid(), cx:f.cx+200, cy:f.cy+200, groupId:null};
  ui.sel = {kind:'furn', id:n.id}; mutate(() => state.furniture.push(n));
}
// 新放下的家具若壓在牆 / 窗上，沿穿透較淺的方向推出來，剛好貼牆
function pushOut(f){
  for (let n = 0; n < 4; n++){
    let moved = false;
    for (const r of snapRects()){
      const {hw, hh} = aabb(f), ox = Math.min(f.cx+hw, r[2]) - Math.max(f.cx-hw, r[0]), oy = Math.min(f.cy+hh, r[3]) - Math.max(f.cy-hh, r[1]);
      if (ox <= 0 || oy <= 0) continue;
      if (ox < oy) f.cx = f.cx < (r[0]+r[2])/2 ? r[0]-hw : r[2]+hw;
      else f.cy = f.cy < (r[1]+r[3])/2 ? r[1]-hh : r[3]+hh;
      moved = true;
    }
    if (!moved) return;
  }
}
function addItem(it, x, y){
  const [type,name,w,d,color,modelAssetId] = it, f = F(type,name,Math.round(x/10)*10,Math.round(y/10)*10,w,d,0,color);
  if(type==='customglb')f.modelAssetId=modelAssetId;
  if(balconyPresets[type]){
    const preset=balconyPresets[type],id=uid(),box=[f.cx-w/2,f.cy-d/2,f.cx+w/2,f.cy+d/2];
    mutate(()=>{
      const remaining=[];
      for(const r of ROOMS){
        const parts=subtractZone(r.poly,box);
        parts.forEach((poly,i)=>{const rid=i?uid():r.id;const bounds=bbox(poly);remaining.push({...r,id:rid,poly,at:r.at?[(bounds[0]+bounds[2])/2,(bounds[1]+bounds[3])/2]:undefined});state.rooms[rid]={...state.rooms[r.id]};});
      }
      remaining.push({id,name:preset.name,poly:R(...box),mat:preset.mat,at:[f.cx,f.cy],zone:true});
      ROOMS.splice(0,ROOMS.length,...remaining);state.rooms[id]={name:preset.name,mat:preset.mat};
      for(const [t,n,dx,dy,fw,fd] of preset.items)state.furniture.push({...F(t,n,f.cx+dx,f.cy+dy,fw,fd),zoneId:id});
      state.archVersion=(state.archVersion||0)+1;ui.sel={kind:'room',id};
    });
    toast(tr('已新增可編輯空間；地坪面積不會重複計算。','Editable space added without double-counting floor area.'));return;
  }
  if (type.startsWith('wall')){
    const kind = type === 'walllow' ? 'low' : type==='wallexterior'?'e':type==='wallbearing'||type==='wallpillar'?'b':'n';
    const wall = [f.cx-w/2, f.cy-d/2, f.cx+w/2, f.cy+d/2, kind];
    mutate(() => { WALLS.push(wall); splitRoomsByWall(wall); state.archVersion = (state.archVersion || 0) + 1; });
    ui.sel = {kind:'wall', index:WALLS.length-1}; renderSel(); renderPanel();
    toast(tr(`已新增結構牆「${name}」`, `Added structural wall "${nm(name)}"`));
    return;
  }
  if(isOpening(f)){
    const pos=placeOpening(f,wallCentreLines(WALLS,ANGLED_WALLS,state.demolished),Math.max(260, f.d+180));
    if(pos){f.cx=pos.cx;f.cy=pos.cy;f.rot=pos.rot;if(!['windowbay','windowproject'].includes(f.type))f.d=Math.max(50,pos.depth);}
  }else pushOut(f);
  ui.sel = {kind:'furn', id:f.id};
  mutate(() => type==='rug' ? state.furniture.unshift(f) : state.furniture.push(f));
  toast(tr(`已添加「${name}」${w}×${d}`, `Added "${nm(name)}" ${w}×${d}`));
}
function toggleWall(id){
  const w = WALLS[+id.slice(1)];
  if (w[4]==='b') return toast(tr('承重牆（黑色）不可拆除', 'Load-bearing walls (black) cannot be removed'));
  if (w[4]==='e') return toast(tr('外牆屬於建築外圍護結構，不建議拆除', 'Exterior walls are part of the building envelope and should not be removed'));
  const on = state.demolished.includes(id);
  mutate(() => {
    state.demolished = on ? state.demolished.filter(x => x!==id) : [...state.demolished, id];
    if (on) splitRoomsByWall(w); else mergeRoomsAcrossWall(w);
  });
  toast(on ? tr('已還原牆體', 'Wall restored') : tr(`已標記拆除 ${Math.max(w[2]-w[0], w[3]-w[1])} mm 牆體`, `Marked ${Math.max(w[2]-w[0], w[3]-w[1])} mm of wall for removal`));
}

// Architecture Engine 2.0 / 第二階段：矩形牆體安全編輯。
// 斜牆將在新版 2D / 3D renderer 完成後啟用；此處保持既有矩形格式相容。
function wallHasOpening(w){
  const openings=[...WINS,...DOORS.map(d=>d.rect),...SLIDES.map(d=>d.rect),...state.furniture.filter(f=>/^(door|window)/.test(f.type)).map(f=>{const box=aabb(f);return [f.cx-box.hw,f.cy-box.hh,f.cx+box.hw,f.cy+box.hh];})];
  return openings.some(r => r[0]<w[2] && r[2]>w[0] && r[1]<w[3] && r[3]>w[1]);
}
function snapWallAxis(point, horizontal, shift=false){
  const xy=horizontal?'x':'y', v=Math.round(point[xy]/10)*10;
  if(shift)return v;
  let best=v,dist=120;
  WALLS.forEach(w=>{
    const h=w[2]-w[0]>=w[3]-w[1];
    const values=h===horizontal ? (h? [w[0],w[2]]:[w[1],w[3]]) : [];
    values.forEach(n=>{ if(Math.abs(n-v)<dist){best=n;dist=Math.abs(n-v);} });
  });
  return best;
}
function rectangleWall(a,b,thickness=180,kind='n', shift=false){
  let horizontal=Math.abs(b.x-a.x)>=Math.abs(b.y-a.y);
  let start=horizontal?Math.round(a.x/10)*10:Math.round(a.y/10)*10;
  let finish=snapWallAxis(b,horizontal,shift);
  if(Math.abs(finish-start)<100)return null;
  const center=Math.round((horizontal?a.y:a.x)/10)*10;
  const half=thickness/2;
  return horizontal ? [Math.min(start,finish),center-half,Math.max(start,finish),center+half,kind]
                    : [center-half,Math.min(start,finish),center+half,Math.max(start,finish),kind];
}
// Intersection processing uses the same normalized centreline for legacy and angled walls.
// Keep the existing demolition references valid when legacy wall indices change.
function addWallWithJunctions(wall){
  const result=insertWallAtJunctions(ANGLED_WALLS,wall,WALLS,{
    minLength:100,
    canSplitLegacy:index=>!wallHasOpening(WALLS[index]) && !state.demolished.includes('w'+index)
  });
  const removed=new Set(state.demolished||[]);
  state.demolished=[...removed].flatMap(id=>{
    const match=/^w(\d+)$/.exec(id);
    if(!match)return [id];
    return (result.legacyMap[+match[1]]||[]).map(i=>'w'+i);
  });
  WALLS.splice(0,WALLS.length,...result.legacyWalls);
  ANGLED_WALLS.splice(0,ANGLED_WALLS.length,...result.angledWalls);
  state.archVersion=(state.archVersion||0)+1;
  return result.newIndices[0] ?? ANGLED_WALLS.length-1;
}
function snapDrawWallPoint(p){
  const tolerance=Math.max(25,12/view.s);
  const q=snapEndpoint(snapPoint(p,false),WALLS,ANGLED_WALLS,tolerance);
  return snapToJunction(q,WALLS,ANGLED_WALLS,tolerance);
}
function splitSelectedWall(){
  if(ui.sel?.kind!=='wall')return toast('請先選取要分割的牆體');
  const index=ui.sel.index,w=WALLS[index]; if(!w)return;
  if(wallHasOpening(w))return toast('這面牆含門窗開口，請先調整門窗位置再分割');
  const horizontal=(w[2]-w[0])>=(w[3]-w[1]);
  const axis=horizontal?0:1, mid=Math.round((w[axis]+w[axis+2])/20)*10;
  if(mid-w[axis]<100 || w[axis+2]-mid<100)return toast('牆體太短，無法分割');
  mutate(()=>{
    const first=[...w], second=[...w]; first[axis+2]=mid;second[axis]=mid;
    WALLS.splice(index,1,first,second);
    // index-based demolition list requires reindexing when inserting walls.
    state.demolished=(state.demolished||[]).flatMap(id=>{
      const i=Number(id.slice(1));return i===index?['w'+index,'w'+(index+1)]:['w'+(i>index?i+1:i)];
    });
    state.archVersion=(state.archVersion||0)+1;
  });
  select({kind:'wall',index});
}
function setTool(t){
  ui.wallStart=null; ui.wallCursor=null;
  ui.tool = t; ui.mA = null; ui.mCur = null;
  svg.setAttribute('class', 'tool-' + t);
  document.querySelectorAll('#tools .btn').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
  syncModeHint();
  renderWallDraft(); renderMeasure();
}
function syncModeHint(){
  const hints = {select:'',
    wallDraw:'點兩下畫任意角度牆；Shift 限制水平／垂直，靠近端點自動接合，Esc 取消。',
    wallMove:'按住牆體拖曳以平移；包含門窗開口的牆體暫時禁止平移。',
    measure:COARSE ? tr('按住拖出量測線，或依次點兩點 · 靠近牆面自動吸附 · 點「選取」退出', 'Hold and drag a line, or tap two points · snaps to walls · tap "Select" to exit')
      : tr('點擊兩點（或按住拖曳）量測距離 · 靠近牆面自動吸附 · Shift 鎖定水平/垂直 · Esc 取消', 'Click two points (or drag) to measure · snaps to walls · Shift locks horizontal/vertical · Esc cancels'),
    demolish:tr('點擊灰色非承重牆標記拆除，再次點擊還原 · 黑色承重牆不可拆', 'Click a grey non-bearing wall to remove it, click again to restore · black bearing walls cannot be removed')};
  const h = $('#modehint'); h.textContent = hints[ui.tool]; h.classList.toggle('show', !!hints[ui.tool]);
}

/* ======================= 視圖 ======================= */
function applyView(){
  const W = svg.clientWidth, H = svg.clientHeight;
  svg.setAttribute('viewBox', `${view.x0} ${view.y0} ${W/view.s} ${H/view.s}`);
  const ratio = 1/(view.s*PX_MM);
  $('#ratio').textContent = '1:' + Math.round(ratio);
  const nice = [100,200,500,1000,2000,5000].find(v => v*view.s >= 60) || 5000;
  $('#sbBar').style.width = nice*view.s + 'px';
  $('#sbText').textContent = nice >= 1000 ? `${nice/1000} m` : `${nice} mm`;
  renderSel(); renderMeasure();
}
function fitView(){
  const [x,y,x1,y1]=houseBounds(ROOMS);
  BOUNDS={x:x-1850,y:y-1750,w:x1-x+3700,h:y1-y+3500};
  const W = svg.clientWidth, H = svg.clientHeight;
  view.s = Math.min(W/BOUNDS.w, H/BOUNDS.h);
  view.x0 = BOUNDS.x - (W/view.s - BOUNDS.w)/2; view.y0 = BOUNDS.y - (H/view.s - BOUNDS.h)/2;
  applyView();
}
function zoomAt(ns, mx, my){
  ns = Math.max(.012, Math.min(2, ns));
  const px = view.x0 + mx/view.s, py = view.y0 + my/view.s;
  view.s = ns; view.x0 = px - mx/ns; view.y0 = py - my/ns; applyView();
}
const zoomCenter = k => zoomAt(view.s*k, svg.clientWidth/2, svg.clientHeight/2);
const setRatio = r => zoomAt(1/(r*PX_MM), svg.clientWidth/2, svg.clientHeight/2);

function toMM(e){
  const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
  return pt.matrixTransform(svg.getScreenCTM().inverse());
}

/* ======================= 吸附 ======================= */
const grid = () => 10;
let furnitureGuides=[];
function clearFurnitureGuides(){furnitureGuides=[];document.querySelector('#gSnapGuides')?.replaceChildren();}
function renderFurnitureGuides(){
 const g=document.querySelector('#gSnapGuides');if(!g)return;
 g.innerHTML=furnitureGuides.map(guide=>{
  if(guide.axis==='wall'){
    const {a,b,position}=guide;
    return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#1d93bb" stroke-width="${2/view.s}" stroke-dasharray="${6/view.s} ${4/view.s}"/><circle cx="${position.x}" cy="${position.y}" r="${4/view.s}" fill="#1d93bb"/><text x="${position.x+8/view.s}" y="${position.y-8/view.s}" font-size="${12/view.s}" fill="#087293" stroke="#fff" stroke-width="${3/view.s}" paint-order="stroke">貼齊牆面</text>`;
  }
  const vertical=guide.axis==='x',x1=vertical?guide.position:guide.from,y1=vertical?guide.from:guide.position,x2=vertical?guide.position:guide.to,y2=vertical?guide.to:guide.position;
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#1d93bb" stroke-width="${1.5/view.s}" stroke-dasharray="${5/view.s} ${4/view.s}"/><text x="${x2+5/view.s}" y="${y2-5/view.s}" font-size="${11/view.s}" fill="#087293" stroke="#fff" stroke-width="${3/view.s}" paint-order="stroke">對齊</text>`;
 }).join('');
}
function collisionWalls(){
 return [...WALLS.filter((_,i)=>!state.demolished.includes('w'+i)),...ANGLED_WALLS];
}
function renderCollisionWarnings(){
 const g=document.querySelector('#gCollision');if(!g)return;
 if(!ui.layers.collisionWarnings||!ui.layers.furn){g.innerHTML='';return;}
 const f=ui.sel?.kind==='furn'?getF(ui.sel.id):null;
 if(!f||excludedFurniture(f)){g.innerHTML='';return;}
 const hits=checkFurnitureCollision(f,state.furniture,collisionWalls());
 const poly=polygonForFurniture(f).map(p=>`${p.x},${p.y}`).join(' ');
 const errors=hits.filter(h=>h.severity==='collision'),clear=hits.filter(h=>h.severity==='clearance');
 if(!hits.length){g.innerHTML='';return;}
 const severity=errors.length?'collision':'clearance',color=errors.length?'#dc4e4a':'#e4a12b';
 const label=errors.length?`碰撞警告 ${errors.length} 處`:`安全距離不足 ${clear.length} 處`;
 const escLabel=esc(label);
 const r=Math.max(12,11/view.s),px=f.cx,py=f.cy-(Math.max(f.w,f.d)/2)-22/view.s;
 g.innerHTML=`<polygon points="${poly}" fill="${color}" fill-opacity=".12" stroke="${color}" stroke-width="${2/view.s}" stroke-dasharray="${6/view.s} ${4/view.s}"/>`+
  hits.filter(h=>h.type==='furniture').map(h=>`<polygon points="${h.polygon.map(p=>`${p.x},${p.y}`).join(' ')}" fill="${h.severity==='collision'?'#dc4e4a':'#e4a12b'}" fill-opacity=".06" stroke="${h.severity==='collision'?'#dc4e4a':'#e4a12b'}" stroke-width="${1/view.s}" stroke-dasharray="${5/view.s} ${4/view.s}"/>`).join('')+
  `<circle cx="${px}" cy="${py}" r="${r}" fill="${color}"/><text x="${px}" y="${py+4/view.s}" font-size="${13/view.s}" fill="white" font-weight="700" text-anchor="middle">!</text><text x="${px+17/view.s}" y="${py+4/view.s}" font-size="${12/view.s}" fill="${color}" stroke="white" stroke-width="${3/view.s}" paint-order="stroke">${escLabel}</text>`;
}
function renderPlanDiagnostics(){
 const g=document.querySelector('#gDiagnostics');
 const list=document.querySelector('#diagnosticsList');
 if(!g||!list)return;
 if(!ui.layers.diagnostics||!ui.layers.furn){g.replaceChildren();list.innerHTML='';list.hidden=true;return;}
 const issues=collectPlanIssues(state.furniture, collisionWalls());
 const summary=chooseIssueSummary(issues);
 const k=1/view.s;
 g.innerHTML=issues.map((issue,i)=>{
   const color=issue.severity==='collision'?'#cf3d38':issue.severity==='clearance'?'#dd8b23':'#3477b6';
   return `<g transform="translate(${issue.x} ${issue.y})" pointer-events="none"><circle r="${11*k}" fill="${color}" stroke="white" stroke-width="${2*k}"/><text y="${4*k}" text-anchor="middle" font-size="${11*k}" fill="white" font-weight="bold">${i+1}</text></g>`;
 }).join('');
 list.hidden=false;
 list.innerHTML=`<div class="diag-head"><b>空間檢查</b><button type="button" id="diagClose" aria-label="關閉空間檢查">×</button></div><div class="diag-summary">碰撞 ${summary.collisions} · 間距 ${summary.clearances} · 通道提醒 ${summary.walkways}</div>` +
 (issues.length?issues.slice(0,40).map((issue,i)=>`<button type="button" class="diag-issue" data-diag-fid="${esc(issue.furnitureId)}"><b>${i+1}. ${esc(issue.title)}</b><small>${esc(issue.detail)}</small></button>`).join(''):'<p class="diag-empty">目前沒有發現需要提醒的家具碰撞或間距問題。</p>') +
 (issues.length>40?`<p class="diag-empty">尚有 ${issues.length-40} 項，請先處理已顯示的問題。</p>`:'');
 list.querySelector('#diagClose').onclick=()=>{ui.layers.diagnostics=false;syncLayerButtons();renderPlanDiagnostics();};
 list.querySelectorAll('[data-diag-fid]').forEach(el=>el.onclick=()=>{
   const id=el.dataset.diagFid,f=state.furniture.find(x=>String(x.id)===id);if(!f)return;
   select({kind:'furn',id:f.id});
   view.x0=f.cx-svg.clientWidth/(2*view.s);view.y0=f.cy-svg.clientHeight/(2*view.s);
   applyView();renderAll();
 });
}
function syncLayerButtons(){
 document.querySelectorAll('#layers [data-layer]').forEach(b=>b.classList.toggle('on',!!ui.layers[b.dataset.layer]));
 try { localStorage.setItem(PHASE2_LAYERS_KEY,JSON.stringify(ui.layers)); } catch { /* storage optional */ }
}
function snapMove(f, cx, cy){
 const nx=Math.round(cx/grid())*grid(),ny=Math.round(cy/grid())*grid();
 if(isOpening(f)){
   clearFurnitureGuides();
   if(ui.layers.wallSnap){const pos=placeOpening({...f,cx,cy},wallCentreLines(WALLS,ANGLED_WALLS,state.demolished),Math.max(300,20/view.s));if(pos){f.rot=pos.rot;if(!['windowbay','windowproject'].includes(f.type))f.d=Math.max(50,pos.depth);return [pos.cx,pos.cy];}}
   return [nx,ny];
 }
 if(!ui.layers.smartSnap&&!ui.layers.wallSnap){clearFurnitureGuides();return [nx,ny];}
 const result=calculateFurnitureSnap(f,{x:cx,y:cy},state.furniture,WALLS.length||ANGLED_WALLS.length?wallSegmentsFromPlan(WALLS,ANGLED_WALLS,state.demolished):[],Math.max(10,10/view.s),{wallSnap:ui.layers.wallSnap,furnitureSnap:ui.layers.smartSnap});
 furnitureGuides=result.guides;renderFurnitureGuides();return [result.x,result.y];
}

function snapPoint(p, shift){
  let x = Math.round(p.x/10)*10, y = Math.round(p.y/10)*10;
  const tol = 8/view.s; let bx = tol, by = tol;
  for (const r of snapRects()){
    for (const ex of [r[0], r[2]]) if (Math.abs(ex-p.x) < bx){ bx = Math.abs(ex-p.x); x = ex; }
    for (const ey of [r[1], r[3]]) if (Math.abs(ey-p.y) < by){ by = Math.abs(ey-p.y); y = ey; }
  }
  if (shift && ui.mA){ if (Math.abs(x-ui.mA.x) > Math.abs(y-ui.mA.y)) y = ui.mA.y; else x = ui.mA.x; }
  return {x, y};
}

/* ======================= 指針交互 ======================= */
let drag = null, pinch = null;
const touches = new Map();                     // 當前按在平面圖上的手指
const svgXY = (x, y) => { const r = svg.getBoundingClientRect(); return [x - r.left, y - r.top]; };
function pinchInfo(){
  const [a, b] = [...touches.values()];
  return {d:Math.max(1, Math.hypot(b.x-a.x, b.y-a.y)), c:svgXY((a.x+b.x)/2, (a.y+b.y)/2)};
}
// 結束當前拖曳：移動過的家具記入復原棧
function endDrag(cancel){
  const d = drag; drag = null; svg.classList.remove('panning'); clearFurnitureGuides();
  if (!d) return;
  if(d.kind==='angledMove'||d.kind==='angledEnd'){if(cancel){cancelCommand(d.before, d.kind);return;}if(d.moved){state.archVersion++;commit(d.before, d.kind);}return;}
  if(d.kind==='wallMove'){
    if(cancel){cancelCommand(d.before, d.kind);return;}
    if(d.moved){updateRoomsForMovedWall(d.wall,WALLS[d.index]);state.archVersion=(state.archVersion||0)+1;commit(d.before, d.kind);}
    return;
  }
  if (d.kind === 'wallLength') {
    if (cancel) {cancelCommand(d.before, d.kind);return;}
    if (d.moved) { updateRoomsForMovedWall(d.wall,WALLS[d.index]);state.archVersion=(state.archVersion||0)+1;commit(d.before, d.kind); }
    return;
  }
  if (d.kind === 'measure'){
    if (cancel){ ui.mA = ui.mCur = null; renderMeasure(); return; }
    if (d.moved && ui.mA && ui.mCur && Math.hypot(ui.mCur.x-ui.mA.x, ui.mCur.y-ui.mA.y) > 20){
      const a = ui.mA, b = ui.mCur; ui.mA = ui.mCur = null; mutate(() => state.measures.push({a, b}));
    }
    renderMeasure(); return;                   // 沒拖曳：保留起點，等第二次點擊
  }
  if (d.kind === 'pan'){
    if (!cancel && !d.moved && ui.tool === 'select') select(d.room ? {kind:'room', id:d.room} : null);
    return;
  }
  if(cancel&&d.before){cancelCommand(d.before, d.kind);return;}
  if (d.moved){ commit(d.before, d.kind); }
}

const onEditorPointerDown = e => {
  if (e.button === 1 || e.button === 2) return;
  closeDrawers();
  const legacyFileMenu = $('details.menu');
  if (legacyFileMenu?.open) legacyFileMenu.open = false;
  if (e.pointerType !== 'mouse'){
    touches.set(e.pointerId, {x:e.clientX, y:e.clientY});
    svg.setPointerCapture(e.pointerId);
    if (touches.size >= 2){                    // 第二根手指落下：取消單指操作，進入雙指縮放 / 平移
      endDrag(drag?.kind === 'measure' || drag?.kind === 'pan');
      const {d, c} = pinchInfo();
      pinch = {d, c, s:view.s, px:view.x0 + c[0]/view.s, py:view.y0 + c[1]/view.s};
      return;
    }
  }
  if (pinch) return;
  const p = toMM(e), t = e.target;
  if(ui.tool==='select' && t.closest('[data-angled]')){select({kind:'angledWall',index:+t.closest('[data-angled]').dataset.angled});return;}
  if(ui.tool==='wallDraw'){
    let q=snapDrawWallPoint(p);
    if(!ui.wallStart){ui.wallStart=q;ui.wallCursor=q;renderWallDraft();}
    else{
      const a=ui.wallStart;if(e.shiftKey)q=Math.abs(q.x-a.x)>=Math.abs(q.y-a.y)?{x:q.x,y:a.y}:{x:a.x,y:q.y};
      ui.wallStart=null;ui.wallCursor=null;
      if(segmentLength(a,q)>=100){const w={id:uid(),start:{...a},end:{...q},thickness:180,height:2800,type:'partition',loadBearing:false,materialId:null};let selectedIndex=-1;mutate(()=>{selectedIndex=addWallWithJunctions(w);});select({kind:'angledWall',index:selectedIndex});}
      else renderWallDraft();
    }
    return;
  }
  if(ui.tool==='wallMove' && t.closest('[data-angled]')){
    const index=+t.closest('[data-angled]').dataset.angled;select({kind:'angledWall',index});drag={kind:'angledMove',index,wall:structuredClone(ANGLED_WALLS[index]),origin:p,sx:e.clientX,sy:e.clientY,before:snap(),moved:false};svg.setPointerCapture(e.pointerId);return;
  }
  if(ui.tool==='wallMove' && t.closest('[data-wall]')){
    const index=Number(t.closest('[data-wall]').dataset.wall.slice(1));
    if(wallHasOpening(WALLS[index])){toast('這面牆含門窗開口，請先調整門窗位置再移動');return;}
    select({kind:'wall',index});
    drag={kind:'wallMove',index,wall:[...WALLS[index]],origin:p,sx:e.clientX,sy:e.clientY,before:snap(),moved:false};
    svg.setPointerCapture(e.pointerId);return;
  }
  if (ui.tool === 'measure'){
    const q = snapPoint(p, e.shiftKey);
    if (!ui.mA){ ui.mA = q; ui.mCur = q; drag = {kind:'measure', sx:e.clientX, sy:e.clientY, moved:false}; svg.setPointerCapture(e.pointerId); }
    else { const a = ui.mA; ui.mA = null; ui.mCur = null; if (Math.hypot(q.x-a.x, q.y-a.y) > 20) mutate(() => state.measures.push({a, b:q})); }
    renderMeasure(); return;
  }
  const h = t.closest('[data-handle]');
  if(t.closest('[data-angled-end]') && ui.sel?.kind==='angledWall'){const index=ui.sel.index;drag={kind:'angledEnd',index,end:+t.closest('[data-angled-end]').dataset.angledEnd,wall:structuredClone(ANGLED_WALLS[index]),sx:e.clientX,sy:e.clientY,before:snap(),moved:false};svg.setPointerCapture(e.pointerId);return;}
  if (t.closest('[data-wall-end]') && ui.sel?.kind === 'wall') {
    const index=ui.sel.index;
    const wall=WALLS[index],axis=wall[2]-wall[0]>=wall[3]-wall[1]?0:1;
    const openings=[...WINS,...DOORS.map(d=>d.rect),...SLIDES.map(d=>d.rect),...state.furniture.filter(f=>/^(door|window)/.test(f.type)).map(f=>{const b=aabb(f);return [f.cx-b.hw,f.cy-b.hh,f.cx+b.hw,f.cy+b.hh];})]
      .filter(r=>r[0]<wall[2]+1&&r[2]>wall[0]-1&&r[1]<wall[3]+1&&r[3]>wall[1]-1);
    drag={kind:'wallLength',index,end:+t.closest('[data-wall-end]').dataset.wallEnd,wall:[...wall],minEnd:Math.max(wall[axis],...openings.map(r=>r[axis+2])),maxStart:Math.min(wall[axis+2],...openings.map(r=>r[axis])),sx:e.clientX,sy:e.clientY,before:snap(),moved:false};
  } else if (h && ui.sel?.kind === 'furn'){
    drag = {kind:h.dataset.handle, id:ui.sel.id, sx:e.clientX, sy:e.clientY, before:snap(), moved:false};
  } else if (ui.tool === 'demolish' && t.closest('[data-wall]')){
    toggleWall(t.closest('[data-wall]').dataset.wall); return;
  } else if (ui.tool === 'select' && t.closest('[data-fid]')){
    const f = getF(t.closest('[data-fid]').dataset.fid);
    if(e.shiftKey){selectFurniture(f.id,true);return;}
    if(!multiFurniture.has(f.id))selectFurniture(f.id,false);
    drag = {kind:'move', id:f.id, sx:e.clientX, sy:e.clientY, ox:p.x-f.cx, oy:p.y-f.cy, before:snap(), moved:false, group:multiFurniture.size>1?selectedFurniture().map(item=>({id:item.id,cx:item.cx,cy:item.cy})):null,origin:{cx:f.cx,cy:f.cy}};
  } else if (ui.tool === 'select' && t.closest('[data-window]')){
    select({kind:'window',index:+t.closest('[data-window]').dataset.window}); return;
  } else if (ui.tool === 'select' && t.closest('[data-door]')){
    select({kind:'door',index:+t.closest('[data-door]').dataset.door}); return;
  } else if (ui.tool === 'select' && t.closest('[data-wall]')){
    select({kind:'wall', index:+t.closest('[data-wall]').dataset.wall.slice(1)});
    return;
  } else if (ui.tool === 'select' && t.closest('[data-door]')){
    select({kind:'door', index:+t.closest('[data-door]').dataset.door});
    return;
  } else {
    const room = t.closest('[data-room]');
    drag = {kind:'pan', sx:e.clientX, sy:e.clientY, x0:view.x0, y0:view.y0, room:room && room.dataset.room, moved:false};
  }
  svg.setPointerCapture(e.pointerId);
};

const onEditorPointerMove = e => {
  if (touches.has(e.pointerId)) touches.set(e.pointerId, {x:e.clientX, y:e.clientY});
  if (pinch){
    if (touches.size < 2) return;
    const {d, c} = pinchInfo(), ns = Math.max(.012, Math.min(2, pinch.s * d / pinch.d));
    view.s = ns; view.x0 = pinch.px - c[0]/ns; view.y0 = pinch.py - c[1]/ns; applyView();
    return;
  }
  const p = toMM(e);
  $('#cx').textContent = Math.round(p.x) + ' mm'; $('#cy').textContent = Math.round(p.y) + ' mm';
  if (!drag){
    const room = e.target.closest && e.target.closest('[data-room]');
    $('#hover').innerHTML = room ? `<b>${esc(state.rooms[room.dataset.room].name)}</b> ${areaUnit(area(ROOMS.find(r=>r.id===room.dataset.room).poly))}` : '';
    if(ui.tool==='wallDraw'&&ui.wallStart){let q=snapDrawWallPoint(p);if(e.shiftKey){const a=ui.wallStart;q=Math.abs(q.x-a.x)>=Math.abs(q.y-a.y)?{x:q.x,y:a.y}:{x:a.x,y:q.y};}ui.wallCursor=q;renderWallDraft();}
    if (ui.tool === 'measure' && ui.mA){ ui.mCur = snapPoint(p, e.shiftKey); renderMeasure(); }
    return;
  }
  const far = Math.hypot(e.clientX-drag.sx, e.clientY-drag.sy) >= TAP;
  if (drag.kind === 'measure'){
    if (far) drag.moved = true;
    ui.mCur = snapPoint(p, e.shiftKey); renderMeasure(); return;
  }
  if (drag.kind === 'pan'){
    if (!drag.moved && !far) return;
    drag.moved = true; svg.classList.add('panning');
    view.x0 = drag.x0 - (e.clientX-drag.sx)/view.s; view.y0 = drag.y0 - (e.clientY-drag.sy)/view.s; applyView(); return;
  }
  if(drag.kind==='angledMove'||drag.kind==='angledEnd'){
    if(!drag.moved&&!far)return;drag.moved=true;const w=ANGLED_WALLS[drag.index];
    if(drag.kind==='angledMove'){const dx=Math.round((p.x-drag.origin.x)/10)*10,dy=Math.round((p.y-drag.origin.y)/10)*10;w.start={x:drag.wall.start.x+dx,y:drag.wall.start.y+dy};w.end={x:drag.wall.end.x+dx,y:drag.wall.end.y+dy};}
    else{const candidate=snapEndpoint({x:Math.round(p.x/10)*10,y:Math.round(p.y/10)*10},WALLS,ANGLED_WALLS,Math.max(25,12/view.s),drag.index);const key=drag.end?'end':'start';if(segmentLength(candidate,w[drag.end?'start':'end'])>=100){moveConnectedAngledEndpoints(w[key],candidate,drag.index);w[key]=candidate;}}
    renderWalls();renderSel();return;
  }
  if(drag.kind==='wallMove'){
    if(!drag.moved&&!far)return;
    drag.moved=true;
    const dx=Math.round((p.x-drag.origin.x)/10)*10,dy=Math.round((p.y-drag.origin.y)/10)*10;
    const w=WALLS[drag.index],o=drag.wall;
    for(let i=0;i<4;i++)w[i]=o[i]+(i%2?dy:dx);
    renderWalls();renderDims();renderSel();return;
  }
  if (drag.kind === 'wallLength') {
    if (!drag.moved && !far) return;
    drag.moved=true;
    const w=WALLS[drag.index], horizontal=drag.wall[2]-drag.wall[0]>=drag.wall[3]-drag.wall[1], axis=horizontal?0:1, end=axis+drag.end*2;
    const value=e.shiftKey?(horizontal?p.x:p.y):snapWallAxis(p,horizontal,false);
    const minimum=Math.max(100,drag.wall[horizontal?3:2]-drag.wall[horizontal?1:0]+10);
    w[end]=drag.end?Math.max(w[axis]+minimum,drag.minEnd,value):Math.min(w[axis+2]-minimum,drag.maxStart,value);
    renderWalls();renderOpenings();renderDims();renderSel();return;
  }
  const f = getF(drag.id); if (!f) return;
  if (!drag.moved && !far) return;             // 輕點家具不應讓它抖動一下
  drag.moved = true;
  if (drag.kind === 'move'){
    const [nextX,nextY]=drag.group?[Math.round((p.x-drag.ox)/10)*10,Math.round((p.y-drag.oy)/10)*10]:snapMove(f,p.x-drag.ox,p.y-drag.oy);
    if(drag.group){const dx=nextX-drag.origin.cx,dy=nextY-drag.origin.cy;for(const item of drag.group){const target=getF(item.id);if(target){target.cx=item.cx+dx;target.cy=item.cy+dy;}}clearFurnitureGuides();}else{f.cx=nextX;f.cy=nextY;}
  } else if (drag.kind === 'rot'){
    let a = Math.atan2(p.y-f.cy, p.x-f.cx)*180/Math.PI + 90;
    f.rot = norm(e.shiftKey ? a : Math.round(a/15)*15);
  } else if (drag.kind === 'size'){
    const a = f.rot*Math.PI/180, c = Math.cos(a), s = Math.sin(a);
    const dx = p.x-f.cx, dy = p.y-f.cy, lx = dx*c + dy*s, ly = -dx*s + dy*c;
    const ax = -f.w/2, ay = -f.d/2;
    const nw = Math.max(100, Math.round((lx-ax)/10)*10), nd = Math.max(100, Math.round((ly-ay)/10)*10);
    const mx = ax + nw/2, my = ay + nd/2;
    f.cx += mx*c - my*s; f.cy += mx*s + my*c; f.w = nw; f.d = nd;
  }
  renderFurn(); renderSel(); renderCollisionWarnings();
};

function onPointerEnd(e){
  touches.delete(e.pointerId);
  if (pinch){ if (touches.size < 2) pinch = null; return; }   // 雙指結束後，剩下的手指不再觸發操作
  endDrag(e.type === 'pointercancel');
}

// 阻止 iPad Safari 把雙指手勢當成整頁縮放
['gesturestart','gesturechange','gestureend'].forEach(t => document.addEventListener(t, e => e.preventDefault()));

const onEditorWheel = e => {
  e.preventDefault();
  const r = svg.getBoundingClientRect();
  zoomAt(view.s*Math.exp(-e.deltaY*(e.ctrlKey ? .01 : .0015)), e.clientX-r.left, e.clientY-r.top);
};
const pointerController = createPointerController(svg, {
  onDown:onEditorPointerDown, onMove:onEditorPointerMove, onUp:onPointerEnd, onCancel:onPointerEnd, onWheel:onEditorWheel,
  onDoubleClick:e=>{if(ui.tool==='select' && e.target.closest('[data-fid]'))rotateSel(90);}
});
pointerController.attach();
svg.addEventListener('contextmenu', e => { if (ui.tool==='measure'){ e.preventDefault(); ui.mA = null; renderMeasure(); } });


/* ======================= 鍵盤 ======================= */
document.addEventListener('keydown', e => {
  if (e.target.matches('input,select,textarea')) return;
  if (sceneController?.walking()) return;
  const mod = e.metaKey || e.ctrlKey, k = e.key.toLowerCase();
  if (mod && k === 'z'){ e.preventDefault(); e.shiftKey ? redo() : undo(); return; }
  if (mod && k === 'y'){ e.preventDefault(); redo(); return; }
  if (mod && k === 'd'){ e.preventDefault(); duplicateSel(); return; }
  if (mod) return;
  if (k === '[' || k === ']'){ drawer(k === '[' ? 'lib' : 'panel'); return; }
  if (k === 'f' && e.shiftKey){ toggleFullscreen(); return; }
  if (k === 't') setView(is3D() ? '2d' : '3d');
  else if (is3D() && ['v','m','x','f','+','=','-'].includes(k)) return;
  else if (k === 'v') setTool('select');
  else if (k === 'm') setTool('measure');
  else if (k === 'x') setTool('demolish');
  else if (k === 'f') fitView();
  else if (k === 'r') rotateSel(e.shiftKey ? -90 : 90);
  else if (k === 'delete' || k === 'backspace'){ e.preventDefault(); deleteSel(); }
  else if (k === 'escape'){ if(ui.wallStart){ui.wallStart=null;ui.wallCursor=null;renderWallDraft();} else if (ui.mA){ ui.mA = null; renderMeasure(); } else { if (ui.tool !== 'select') setTool('select'); select(null); } }
  else if (k.startsWith('arrow') && ui.sel?.kind === 'furn'){
    e.preventDefault(); const st = e.shiftKey ? 100 : 10;
    mutate(() => { for(const f of selectedFurniture()){if (k==='arrowleft') f.cx -= st; if (k==='arrowright') f.cx += st; if (k==='arrowup') f.cy -= st; if (k==='arrowdown') f.cy += st;} });
  }
  else if (k === '+' || k === '=') zoomCenter(1.25);
  else if (k === '-') zoomCenter(.8);
});

/* ======================= 家具庫 ======================= */
function buildLib(){
  const previouslyOpen = [...$('#lib').querySelectorAll('.lib-accordion[open]')].map(el => Number(el.dataset.group));
  const hasPreviousGroups = $('#lib').querySelector('.lib-accordion') !== null;
  const heroBadge = `
    <div class="lib-hero-header">
      <div class="lib-hero-top">
        <span class="lib-hero-badge">${tr('風格 2','Style 2')}</span>
        <span class="lib-hero-tag">${tr('現代簡約 · 平面色塊風','Modern Minimalist · Flat Color Block')}</span>
      </div>
      <div class="lib-hero-desc">${tr('柔和配色 · 清晰易辨識 · 空間規劃標準件','Soft Palette · Clean Legibility · Standard Units')}</div>
    </div>
  `;
  $('#lib').innerHTML = heroBadge + `<button type="button" class="f5-manager-btn">${T('ui.import.manage.glb.models')}</button>` + LIB.map((c,ci) => `<details class="lib-accordion" data-group="${ci}" ${hasPreviousGroups ? (previouslyOpen.includes(ci) ? 'open' : '') : (ci === 0 ? 'open' : '')}><summary class="lib-accordion-header"><span class="lib-accordion-arrow" aria-hidden="true"></span><span class="lib-accordion-title">${esc(nm(c.cat))}</span><span class="lib-accordion-count">${c.items.length}</span></summary><div class="lib-grid">${c.items.map((it,ii) => {
    const [t,n,w,d,col] = it, pad = Math.max(w,d)*.1;
    return `<div class="item" data-key="${ci}:${ii}" title="${T('ui.catalog.add.hint')}">
      <div class="item-preview">
        <svg viewBox="${-w/2-pad} ${-d/2-pad} ${w+2*pad} ${d+2*pad}">${furnSVG(t,w,d,col)}</svg>
      </div>
      <b class="item-name">${esc(window.floorplanTranslate?.(`ui.catalog.item.${ci}.${ii}`) ?? nm(n))}</b>
      <small class="item-dim">${w} × ${d}</small>
      <button type="button" class="preview3d-btn" title="${T('ui.catalog.preview.tooltip')}" aria-label="${T('ui.catalog.preview.tooltip')} ${esc(window.floorplanTranslate?.(`ui.catalog.item.${ci}.${ii}`) ?? nm(n))}">◈ ${T('ui.three.d.preview')}</button>
    </div>`;
  }).join('')}</div></details>`).join('') + `<div class="hint">${T(COARSE ? 'ui.catalog.instructions.touch' : 'ui.catalog.instructions.desktop')}</div>`;
  $('#lib').querySelector('.f5-manager-btn').onclick=()=>openModelManager({onChange:buildLib});
  document.querySelectorAll('.preview3d-btn').forEach(btn => {
    btn.addEventListener('pointerdown', e => e.stopPropagation());
    btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); showFurniturePreview(itemOf(btn.closest('.item'))); });
  });
  document.querySelectorAll('.item').forEach(el => el.addEventListener('pointerdown', e => {
    if (e.button || e.target.closest('.preview3d-btn')) return;
    libDrag = {el, id:e.pointerId, sx:e.clientX, sy:e.clientY, it:itemOf(el), ghost:null};
  }));
}
const itemOf = el => { const [ci, ii] = el.dataset.key.split(':').map(Number); return LIB[ci].items[ii]; };

// 家具庫拖放：用 pointer 事件實現（iPad 上 HTML5 拖放不可靠）。
// 列表設置了 touch-action:pan-y，豎向滑動交給瀏覽器滾動（會觸發 pointercancel），橫向拖曳才開始拖放。
let libDrag = null;
// 屏幕座標 → 房型座標（mm）。2D 取平面圖座標，3D 取射線與地面的交點；s = 該處每 mm 的屏幕像素數
function dropPoint(x, y){
  const r = $('#stage').getBoundingClientRect();
  if (x < r.left || x > r.right || y < r.top || y > r.bottom) return null;
  if (document.elementFromPoint(x, y)?.closest('aside.open,#fab,#walkOverlay,#joy,#walkExit')) return null;
  if (is3D()) return sceneController?.groundAt(x, y) || null;
  const p = toMM({clientX:x, clientY:y}); return {x:p.x, y:p.y, s:view.s};
}
addEventListener('pointermove', e => {
  if (!libDrag || e.pointerId !== libDrag.id) return;
  const {it} = libDrag;
  if (!libDrag.ghost){
    if (Math.hypot(e.clientX-libDrag.sx, e.clientY-libDrag.sy) < TAP) return;
    const g = libDrag.ghost = document.createElement('div'); g.id = 'ghost';
    g.innerHTML = `<svg viewBox="${-it[2]/2} ${-it[3]/2} ${it[2]} ${it[3]}">${furnSVG(it[0],it[2],it[3],it[4])}</svg>`;
    document.body.appendChild(g); libDrag.el.classList.add('dragging');
  }
  // 幽靈圖按落點處的比例顯示真實大小（3D 中近大遠小）
  const g = libDrag.ghost, s = Math.max(dropPoint(e.clientX, e.clientY)?.s || (is3D() ? .05 : view.s), .02);
  Object.assign(g.style, {width:Math.max(28, it[2]*s)+'px', height:Math.max(20, it[3]*s)+'px', left:e.clientX+'px', top:e.clientY+'px'});
  const lib = $('aside.lib');
  if (narrow() && lib.classList.contains('open') && e.clientX > lib.getBoundingClientRect().right) drawer(null);   // 拖出抽屜後自動收起
});
function endLibDrag(e, ok){
  if (!libDrag || e.pointerId !== libDrag.id) return;
  const d = libDrag; libDrag = null;
  d.el.classList.remove('dragging');
  if (d.ghost){
    d.ghost.remove();
    if (!ok) return;
    const p = dropPoint(e.clientX, e.clientY);
    if (p) addItem(d.it, p.x, p.y);
    else if (is3D() && e.clientX > $('#stage').getBoundingClientRect().left) toast(tr('請拖到地面上', 'Drop it on the floor'));
    return;
  }
  if (!ok) return;
  // 輕點：放到選取房間中心，否則放到畫面中心（3D 取屏幕中心對應的地面位置）
  let p = null;
  if (ui.sel?.kind === 'room'){ const b = bbox(ROOMS.find(r => r.id===ui.sel.id).poly); p = {x:(b[0]+b[2])/2, y:(b[1]+b[3])/2}; }
  else if (is3D()){ const r = $('#stage').getBoundingClientRect(); p = sceneController.groundAt(r.left + r.width/2, r.top + r.height/2); }
  if (!p) p = {x:view.x0 + svg.clientWidth/2/view.s, y:view.y0 + svg.clientHeight/2/view.s};
  addItem(d.it, p.x, p.y);
  closeDrawers();
}
addEventListener('pointerup', e => endLibDrag(e, true));
addEventListener('pointercancel', e => endLibDrag(e, false));

/* ======================= 導入導出 ======================= */
async function download(name, blob){ if(!await authorizeExport(name))return; const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
function exportPlanPNG(construction=false){
  if (is3D() && !construction) return sceneController.shot();
  const clone = svg.cloneNode(true), W = 3200, H = Math.round(W*BOUNDS.h/BOUNDS.w);
  clone.setAttribute('viewBox', `${BOUNDS.x} ${BOUNDS.y} ${BOUNDS.w} ${BOUNDS.h}`);
  clone.setAttribute('width', W); clone.setAttribute('height', H);
  clone.querySelector('#gSel').innerHTML = '';
  if (construction){
    clone.querySelector('#gFurn').innerHTML = '';
    clone.querySelector('#gDims').setAttribute('display','inline');
    clone.querySelector('#gLabels').setAttribute('display','inline');
    const title = document.createElementNS('http://www.w3.org/2000/svg','text');
    title.setAttribute('x', BOUNDS.x + 320); title.setAttribute('y', BOUNDS.y + 430);
    title.setAttribute('font-size','250'); title.setAttribute('font-weight','700'); title.setAttribute('fill','#2b2824');
    title.textContent = tr('施工尺寸圖 · 單位 mm · 面積含坪數', 'Construction Dimension Plan · mm · Areas incl. ping');
    clone.appendChild(title);
  }
  clone.querySelector('#gGrid').innerHTML = `<rect x="-20000" y="-20000" width="55000" height="55000" fill="${ui.layers.grid?'url(#grid)':'#f7f4ee'}"/>`;
  const bg = document.createElementNS('http://www.w3.org/2000/svg','rect');
  Object.entries({x:-20000,y:-20000,width:55000,height:55000,fill:'#f7f4ee'}).forEach(([k,v]) => bg.setAttribute(k,v));
  clone.insertBefore(bg, clone.querySelector('#gGrid'));
  const img = new Image();
  img.onload = () => {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    cv.getContext('2d').drawImage(img, 0, 0, W, H);
    cv.toBlob(b => download(construction ? tr('施工尺寸圖', 'construction-dimension-plan') + '.png' : tr('房型裝修方案', 'floor-plan-design') + '.png', b));
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(new XMLSerializer().serializeToString(clone));
}
function exportPNG(){ exportPlanPNG(false); }
function exportConstructionPNG(){ exportPlanPNG(true); }

/* ======================= 雜項 ======================= */
let toastT;
function toast(msg){ const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 1800); }

/* ======================= 2D / 3D 切換 ======================= */
let viewMode = '2d', switching = false;
const is3D = () => viewMode === '3d';
const TIPS = () => ({
  '2d': T(COARSE ? 'ui.tips.2d.touch' : 'ui.tips.2d.desktop'),
  '3d': T(COARSE ? 'ui.tips.3d.touch' : 'ui.tips.3d.desktop')
});
async function setView(m){
  if (m === viewMode || switching) return;
  if (!sceneController) return toast(tr('3D 引擎仍在載入或載入失敗，請稍後再試或重新整理頁面。', 'The 3D engine is loading or failed to load. Try again or reload the page.'));
  switching = true; document.body.classList.add('busy');
  viewMode = m;
  if (viewState) viewState.mode = m;
  if (m === '3d'){ if (ui.tool !== 'select') setTool('select'); ui.mA = null; document.body.classList.add('m3d'); await sceneController.enter(); }
  else { document.body.classList.remove('m3d'); await sceneController.exit(); applyView(); }
  $('#tip').textContent = TIPS()[m];
  switching = false; document.body.classList.remove('busy');
}
document.querySelectorAll('.menu-pop .btn').forEach(b => b.addEventListener('click', () => b.closest('details').open = false));
document.querySelectorAll('#viewSeg .btn').forEach(b => b.onclick = () => setView(b.dataset.view));

document.querySelectorAll('#tools .btn').forEach(b => b.onclick = () => setTool(b.dataset.tool));
syncLayerButtons();
document.querySelectorAll('#layers .btn').forEach(b => b.onclick = () => {
  if (b.id === 'constructionMode') return setConstructionMode(!ui.construction);
  const k = b.dataset.layer; if (!k) return; ui.layers[k] = !ui.layers[k]; syncLayerButtons();
  if (k === 'dims') $('#gDims').setAttribute('display', ui.layers.dims ? 'inline' : 'none');
  else if (k === 'wallSnap' || k === 'smartSnap') clearFurnitureGuides();
  if (k === 'collisionWarnings') renderCollisionWarnings();
  else renderAll();
});
function setConstructionMode(on){
  if (on === ui.construction) return;
  ui.construction = on;
  const b = $('#constructionMode');
  if (on){
    ui.savedLayers = {...ui.layers};
    Object.assign(ui.layers, {dims:true, labels:true, furn:false, grid:false});
  } else if (ui.savedLayers){
    Object.assign(ui.layers, ui.savedLayers); ui.savedLayers = null;
  }
  b.classList.toggle('on', on);
  document.body.classList.toggle('construction', on);
  document.querySelectorAll('#layers [data-layer]').forEach(x => x.classList.toggle('on', !!ui.layers[x.dataset.layer]));
  renderAll();
  toast(on ? tr('已開啟施工圖模式：隱藏家具並保留房名與尺寸', 'Construction mode on: furniture hidden; labels and dimensions retained') : tr('已回復一般編輯模式', 'Returned to normal editing mode'));
}
$('#zoomIn').onclick = () => zoomCenter(1.25);
$('#zoomOut').onclick = () => zoomCenter(.8);
$('#fit').onclick = fitView;
$('#s60').onclick = () => { setRatio(60); toast(tr('已按 1:60 顯示（與原始房型圖同比例）', 'Showing at 1:60 (same scale as the original plan)')); };
$('#s100').onclick = () => setRatio(100);
$('#undo').onclick = undo; $('#redo').onclick = redo;
$('#clearAll').onclick = clearLayout;

/* 全螢幕：標準 API + Safari（iPad）的 webkit 前綴版本 */
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
function toggleFullscreen(){
  const de = document.documentElement;
  if (fsEl()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  else {
    const req = de.requestFullscreen || de.webkitRequestFullscreen;
    if (!req) return toast(tr('當前瀏覽器不支持網頁全螢幕，可在 Safari 中「添加到主屏幕」後以全螢幕方式打開', 'Fullscreen is not supported here — in Safari, use "Add to Home Screen" to open it fullscreen'));
    Promise.resolve(req.call(de)).catch(() => toast(tr('無法進入全螢幕', 'Could not enter fullscreen')));
  }
}
function syncFullscreen(){
  const on = !!fsEl(), b = $('#fullscreen');
  b.textContent = '⛶ ' + (on ? tr('退出全螢幕', 'Exit fullscreen') : tr('全螢幕', 'Fullscreen'));
  b.title = (on ? tr('退出全螢幕', 'Exit fullscreen') : tr('全螢幕', 'Fullscreen')) + ' (Shift+F)';
}
$('#fullscreen').onclick = toggleFullscreen;
['fullscreenchange', 'webkitfullscreenchange'].forEach(t => document.addEventListener(t, syncFullscreen));
// 已從主屏幕以獨立 App 方式打開時本就是全螢幕，隱藏按鈕
if (navigator.standalone || matchMedia('(display-mode: standalone)').matches) $('#fullscreen').hidden = true;
$('#tgLib').onclick = () => drawer('lib');
$('#tgPanel').onclick = () => drawer('panel');
// 觸屏上點菜單以外的地方收起「文件」菜單
document.addEventListener('pointerdown', e => { const m = $('details.menu'); if (m?.open && !m.contains(e.target)) m.open = false; });
matchMedia('(max-width:1100px)').addEventListener('change', () => drawer(null));
drawer(null);                                  // 還原上次的面板收起狀態
$('#exportPng').onclick = exportPNG;
$('#exportConstruction').onclick = exportConstructionPNG;
$('#exportJson').onclick = () => download(tr('房型室內設計方案', 'floor-plan-design') + '.json', new Blob([JSON.stringify(state, null, 2)], {type:'application/json'}));
$('#importJson').onclick = () => $('#fileIn').click();
$('#fileIn').onchange = e => {
  const file = e.target.files[0]; if (!file) return;
  file.text().then(txt => {
    try { const s = JSON.parse(txt); if (!Array.isArray(s.furniture)) throw 0; const b = snap(); replaceProject(fixState(s)); ui.sel = null; commit(b); renderAll(); toast(tr('方案已導入', 'Plan imported')); }
    catch(err){ toast(tr('文件格式不正確', 'Invalid file format')); }
  });
  e.target.value = '';
};
$('#reset').onclick = () => { if (confirm(tr('還原成預設設計方案？（可復原）', 'Reset to the default design? (undoable)'))){ const b = snap(); replaceProject(defaultState()); ui.sel = null; commit(b); renderAll(); } };
// 橫豎屏切換、表頭換行等都會改變畫布尺寸；尺寸從 0 還原（如首次格局）時重新符合視窗
// 其餘尺寸變化（收起 / 展開面板等）保持畫面中心不動
let lastW = 0, lastH = 0;
new ResizeObserver(() => {
  const w = svg.clientWidth, h = svg.clientHeight; if (!w) return;
  if (!lastW) fitView();
  else { view.x0 -= (w - lastW)/2/view.s; view.y0 -= (h - lastH)/2/view.s; applyView(); }
  lastW = w; lastH = h;
}).observe(svg);

function setLang(l){
  LANG = l; try { localStorage.setItem(LANG_KEY, l); } catch(e) {}
  if (viewState) viewState.language = l;
  applyStaticLang(); syncFullscreen(); syncModeHint(); syncPaneBtns();
  buildLib(); renderOpenings(); renderAll();
  $('#tip').textContent = TIPS()[viewMode];
  sceneController?.relang();
}
window.addEventListener('floorplan:locale-changed', e => { const l=e.detail==='zh-TW'?'zht':e.detail; if(l!==LANG)setLang(l); });
function houseDimensions() {
  const form=$('#houseDialog form');
  if (!form.reportValidity()) return null;
  const width=Number($('#houseWidth').value)*1000,depth=Number($('#houseDepth').value)*1000;
  return Number.isFinite(width)&&Number.isFinite(depth)&&width>=1000&&depth>=1000&&width<=50000&&depth<=50000 ? [width,depth] : null;
}
function previewHouseArea(){const dims=houseDimensions();$('#houseArea').textContent=dims?`地坪範圍：${areaUnit(dims[0]*dims[1]/1e6)}`:'';}
$('#houseSettings').onclick=()=>{
  const [x,y,x1,y1]=houseBounds(ROOMS);
  $('#houseWidth').value=((x1-x)/1000).toFixed(2);$('#houseDepth').value=((y1-y)/1000).toFixed(2);
  $('#houseDialog').showModal();previewHouseArea();
};
$('#houseWidth').onchange=previewHouseArea;$('#houseDepth').onchange=previewHouseArea;
$('#resizeHouse').onclick=()=>{
  const dims=houseDimensions();if(!dims)return;
  mutate(()=>{const a=resizeArchitecture(captureArchitecture(state.rooms),state.furniture,state.measures,...dims);restoreArchitecture(a);state.archVersion=(state.archVersion||0)+1;ui.sel=null;});
  $('#houseDialog').close();fitView();toast(tr('已套用房屋尺寸，可使用復原還原。','House resized. Undo is available.'));
};
$('#newEmptyHouse').onclick=()=>{
  const dims=houseDimensions();if(!dims)return;
  const before=snap();replaceProject(makeState('empty'));
  const g=createEmptyGeometry(...dims);
  restoreArchitecture({version:ARCHITECTURE_VERSION,walls:g.walls,windows:g.wins,doors:g.doors,slides:g.slides,rooms:g.rooms});
  state.rooms=Object.fromEntries(g.rooms.map(r=>[r.id,{name:r.name,mat:r.mat}]));ui.sel=null;
  setPlanBounds('empty');
  commit(before);$('#houseDialog').close();renderAll();fitView();toast(tr('已建立空白房型，可從家具庫加入物件。','Blank plan created. Add items from the library.'));
};
// 房數規劃必須同時更新 Project Store 和建築幾何工作副本。
// 僅替換 state 會讓 ROOMS/WALLS 仍停留在前一個房型，造成圖面看似未切換。
function switchRoomLayout(next) {
  if (!LAYOUT_GUIDES[next]) return false;
  if (next === state.layoutType) return false;
  const before = snap();
  // snap() serializes the reactive state into plain JSON; native cloning of
  // the reactive proxy raised DataCloneError before the layout could change.
  const previous = JSON.parse(before);
  try {
    const nextProject = makeState(next);
    replaceProject(nextProject);
    if (!restoreArchitecture(state.architecture)) throw new Error('房型建築資料無法還原');
    setPlanBounds(next);
    ui.sel = null;
    selectionManager.clear?.();
    multiFurniture.clear();
    clearFurnitureGuides();
    validateSel();
    // 房型是整體結構變更，不能只刷新 SVG 的 dirty layers。
    svgRenderer.invalidate();
    fitView();
    commit(before);
    renderAll();
    if (viewState) viewState.layoutType = next;
    toast(tr(`已切換為${LAYOUT_GUIDES[next].name}規劃目標`, `Switched to the ${next}-bedroom planning goal`));
    return true;
  } catch (error) {
    console.error('切換房型失敗', error);
    replaceProject(previous);
    restoreArchitecture(state.architecture);
    setPlanBounds(state.layoutType);
    fitView(); renderAll();
    toast(tr('切換房型失敗，已還原原有設計', 'Could not switch layout; previous design restored'));
    return false;
  }
}
$('#layoutType').addEventListener('change', e => {
  try {
    if (!switchRoomLayout(e.target.value)) e.target.value = state.layoutType;
  } catch (error) {
    console.error('房數規劃切換例外', error);
    e.target.value = state.layoutType;
    toast(tr('房型切換發生錯誤，請查看主控台', 'Layout switch failed; check the console'));
  }
});

$('#splitWall').onclick=splitSelectedWall;
completeCatalog(s2t);
applyStaticLang(); syncFullscreen();
if (viewState) { viewState.language = LANG; viewState.layoutType = state.layoutType; }
buildDefs(); buildLib(); renderOpenings(); renderDims();
$('#tip').textContent = TIPS()['2d'];
fitView(); renderAll();

// 供 3D 場景使用；state 為 live binding，匯入與復原後仍指向最新方案。
export { ANGLED_WALLS, R, entry, WALLS, WINS, DOORS, SLIDES, ROOMS, tr, nm, COARSE, TAP, $, state, ui, view, snap, commit, cancelCommand, getF, area, ln, renderAll, esc, drawer, closeDrawers, near, select, snapMove, drag, download };

// F3: Ribbon 排列指令以單一 mutate 交易寫入，支援整批復原。
document.querySelectorAll('[data-furn-arrange]').forEach(button=>{button.addEventListener('click',()=>applyFurnitureArrangement(button.dataset.furnArrange));});
document.querySelectorAll('[data-furn-group]').forEach(button=>button.addEventListener('click',()=>{if(button.dataset.furnGroup==='create')groupFurnitureSelection();else ungroupFurnitureSelection();}));
// 自訂角度使用原生 modal dialog；確認後才建立一筆旋轉歷史紀錄。
const furnitureRotationDialog = document.getElementById('rotateFurnitureDialog');
const furnitureRotationForm = document.getElementById('rotateFurnitureForm');
const furnitureRotationInput = document.getElementById('rotateFurnitureAngle');
const furnitureRotationError = document.getElementById('rotateFurnitureError');
document.getElementById('cancelFurnitureRotation')?.addEventListener('click', () => furnitureRotationDialog.close());
furnitureRotationForm?.addEventListener('submit', event => {
  event.preventDefault();
  const degrees = Number(furnitureRotationInput.value);
  if (furnitureRotationInput.value.trim() === '' || !Number.isFinite(degrees)) {
    furnitureRotationError.hidden = false;
    furnitureRotationInput.focus();
    return;
  }
  furnitureRotationError.hidden = true;
  furnitureRotationDialog.close();
  rotateFurnitureSelection(degrees);
});
document.querySelectorAll('[data-furn-rotate]').forEach(button => button.addEventListener('click', () => {
  if (button.dataset.furnRotate === 'custom') {
    if (!selectedFurniture().length) { toast('請先選取家具'); return; }
    furnitureRotationInput.value = '45';
    furnitureRotationError.hidden = true;
    furnitureRotationDialog.showModal();
    furnitureRotationInput.focus();
    furnitureRotationInput.select();
    return;
  }
  rotateFurnitureSelection(Number(button.dataset.furnRotate));
}));

// Load persisted GLB catalog without changing the existing layout JSON format.
refreshModelCatalog(LIB).then(buildLib).catch(e=>console.warn('GLB 模型庫載入失敗',e));

window.addEventListener('floorplan:studio-restore', event => {
  const next = event.detail?.project;
  if (!next || !Array.isArray(next.furniture) || !next.architecture || !next.rooms) return;
  const before = snap();
  try {
    replaceProject(JSON.parse(JSON.stringify(next)));
    if (!restoreArchitecture(state.architecture)) applyLayoutGeometry(state.layoutType);
    ui.sel = null;
    commit(before, 'restore-design-version');
    renderAll();
    const layoutSelect = document.getElementById('layoutType');
    if (layoutSelect) layoutSelect.value = state.layoutType;
  } catch (err) {
    console.error('設計版本還原失敗', err);
    replaceProject(JSON.parse(before));
    restoreArchitecture(state.architecture);
    renderAll();
  }
});
window.addEventListener('floorplan:storage-error',event=>{ toast(event.detail?.message||'儲存失敗，請匯出備份'); });
