import { authorizeExport } from '../services/exportAccess.js';
import {loadCustomFurniture} from '../furniture/models/modelLoader.js';
import { wallCentreLines, openingInterval } from '../architecture/core/openingPlacement.js';
import { registerScene } from '../services/sceneController.js';
import { ANGLED_WALLS, R, entry, WALLS, WINS, DOORS, SLIDES, ROOMS, tr, nm, COARSE, TAP, $, state, ui, view, snap, commit, cancelCommand as cancelDrag, getF, area, ln, renderAll, esc, drawer, closeDrawers, near, select, snapMove, drag, download } from '../editor/planEditor.js';

/* ============================================================
 *  3D 場景（three.js）—— 與 2D 共用 state / ui，切換時帶過渡動畫：
 *  2D → 3D：3D 相機先以正俯視對齊當前 2D 視口（比例、位置一致），
 *           交叉淡入後鏡頭傾斜環繞、牆體從地面升起、家具隨後立起；
 *  3D → 2D：反向——家具收起、牆體下沉、鏡頭回到正俯視並淡出到平面圖。
 * ============================================================ */
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {TransformControls} from 'three/addons/controls/TransformControls.js';
import {PointerLockControls} from 'three/addons/controls/PointerLockControls.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {RoomEnvironment} from 'three/addons/environments/RoomEnvironment.js';
import {CSS2DRenderer, CSS2DObject} from 'three/addons/renderers/CSS2DRenderer.js';

const stage = $('#stage'), host = $('#view3d');
const OX = 6000, OY = 5300, H = 2.8, FOV = 45;       // 房型中心放在世界原點，層高 2.8 m
const wx = x => (x - OX) / 1000, wz = y => (y - OY) / 1000, M = v => v / 1000;
const SW = () => stage.clientWidth, SH = () => stage.clientHeight;
const opt = {cut:2.8, furn:true, labels:true, night:false, hour:10, mode:'orbit'};
const studio = {tool:'translate',quality:'medium',lighting:'day',wallColor:'#f4f1eb'};
let transform = null, transformBefore = null, transformFid = null;

let inited = false, active = false, raf = 0, anim = null, fly = null;
let renderer, labelRenderer, scene, camera, orbit, walkCtl, hemi, sun, ground, glassMat, wallMat, capMat, frameMat;
let archFloor, archUp, furnG, labelG, lampG, colliders = [], selKey = null, selHelper = null;
let sigArch = '', sigFurn = '', sigLabels = '', grow = 1, furnGrow = 1;
const doors = [], keys = {};

/* ======================= 初始化 ======================= */
function init(){
  if (inited) return; inited = true;
  renderer = new THREE.WebGLRenderer({antialias:true, preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(SW(), SH());
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  host.prepend(renderer.domElement);
  labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(SW(), SH());
  Object.assign(labelRenderer.domElement.style, {position:'absolute', inset:'0', pointerEvents:'none'});
  host.appendChild(labelRenderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(FOV, SW()/SH(), .05, 300);
  orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true; orbit.maxPolarAngle = Math.PI*.495; orbit.minDistance = 1.5; orbit.maxDistance = 45;
  transform = new TransformControls(camera,renderer.domElement);
  transform.setSize(.85);
  transform.setTranslationSnap(.05);
  transform.setRotationSnap(Math.PI/12);
  transform.addEventListener('dragging-changed', e=>{orbit.enabled=!e.value;if(e.value){transformBefore=snap();}else if(transformBefore){const before=transformBefore;transformBefore=null;const f=getF(transformFid);const obj=transform.object;if(f&&obj){
    if(studio.tool==='translate'){f.cx=Math.round(obj.position.x*1000+OX);f.cy=Math.round(obj.position.z*1000+OY);}
    if(studio.tool==='rotate'){f.rot=((Math.round(-obj.rotation.y*180/Math.PI)%360)+360)%360;}
    if(studio.tool==='scale'){f.w=Math.max(100,Math.round(f.w*obj.scale.x));f.d=Math.max(100,Math.round(f.d*obj.scale.z));obj.scale.set(1,1,1);}
    commit(before,'furniture-3d-gizmo');sync(true);
  }}});
  transform.addEventListener('objectChange',()=>{if(selHelper)selHelper.update();});
  scene.add(typeof transform.getHelper === 'function' ? transform.getHelper() : transform);
  window.addEventListener('floorplan:studio-3d',e=>{
    const next=e.detail||{};
    Object.assign(studio,next);
    if(!inited)return;
    transform.setMode(studio.tool==='off'?'translate':studio.tool);
    renderer.setPixelRatio(Math.min(devicePixelRatio,studio.quality==='low'?1:studio.quality==='medium'?1.5:2));
    renderer.shadowMap.enabled=studio.quality!=='low';
    sun.shadow.mapSize.setScalar(studio.quality==='high'?4096:studio.quality==='medium'?2048:1024);
    sun.shadow.map?.dispose();sun.shadow.map=null;sun.shadow.needsUpdate=true;
    opt.night=studio.lighting==='night';opt.hour=studio.lighting==='evening'?17:10;
    wallMat.color.set(studio.wallColor);applyLight();updateSel();
  });
  walkCtl = new PointerLockControls(camera, document.body);
  walkCtl.addEventListener('lock', () => { $('#walkOverlay').style.display = 'none'; $('#cross').style.display = 'block'; });
  walkCtl.addEventListener('unlock', () => { if (opt.mode === 'walk'){ $('#walkOverlay').style.display = 'flex'; $('#cross').style.display = 'none'; } });

  hemi = new THREE.HemisphereLight(0xfff8ee, 0xb9a88f, 1.1);
  sun = new THREE.DirectionalLight(0xfff1dd, 2.6);
  sun.castShadow = true; sun.shadow.mapSize.setScalar(COARSE ? 2048 : 4096);   // 平板 GPU 用小一點的陰影貼圖
  Object.assign(sun.shadow.camera, {left:-11, right:11, top:11, bottom:-11, near:1, far:60});
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02;
  ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({color:0xf2eee7, roughness:1}));
  ground.rotation.x = -Math.PI/2; ground.position.y = -0.015; ground.receiveShadow = true;
  scene.add(hemi, sun, sun.target, ground);

  const pm = new THREE.PMREMGenerator(renderer); envTex = pm.fromScene(new RoomEnvironment(), .04).texture; pm.dispose();
  glassMat = new THREE.MeshPhysicalMaterial({color:0xcfe6ef, roughness:.05, transparent:true, opacity:.28, depthWrite:false, side:THREE.DoubleSide});
  wallMat = mat('#f4f1eb', {roughness:.92}); capMat = mat('#34312d', {roughness:.9}); frameMat = mat('#5d6166', {roughness:.5, metalness:.4});

  archFloor = new THREE.Group(); archUp = new THREE.Group(); furnG = new THREE.Group(); labelG = new THREE.Group(); lampG = new THREE.Group();
  scene.add(archFloor, archUp, furnG, labelG, lampG);

  const cv = renderer.domElement; let downAt = null, look = null;
  cv.addEventListener('pointerdown', e => {
    downAt = [e.clientX, e.clientY]; closeDrawers();
    if (touchWalk && !look){ look = {id:e.pointerId, x:e.clientX, y:e.clientY}; cv.setPointerCapture(e.pointerId); }
  });
  cv.addEventListener('pointermove', e => {
    if (!look || e.pointerId !== look.id) return;
    lookBy(e.clientX - look.x, e.clientY - look.y); look.x = e.clientX; look.y = e.clientY;
  });
  cv.addEventListener('pointercancel', e => { if (look?.id === e.pointerId) look = null; });

  // 按住已選取的家具拖曳：沿地面擺放（與 2D 共用網格和貼齊牆面）。
  // 在父元素上用捕獲階段監聽，趕在 OrbitControls 之前關掉它，避免同時旋轉鏡頭
  let fdrag = null;
  host.addEventListener('pointerdown', e => {
    if (studio.tool!=='off' || e.target !== cv || !e.isPrimary || anim || opt.mode !== 'orbit' || ui.sel?.kind !== 'furn') return;
    const h = pick(e), f = h?.fid === ui.sel.id && getF(h.fid), g = f && groundAt(e.clientX, e.clientY);
    if (!g) return;
    fdrag = {id:f.id, pid:e.pointerId, sx:e.clientX, sy:e.clientY, ox:g.x - f.cx, oy:g.y - f.cy, before:snap(), moved:false};
    orbit.enabled = false; fly = null; cv.setPointerCapture(e.pointerId);
  }, true);
  cv.addEventListener('pointermove', e => {
    if (!fdrag || e.pointerId !== fdrag.pid) return;
    if (!fdrag.moved && Math.hypot(e.clientX - fdrag.sx, e.clientY - fdrag.sy) < TAP) return;
    const f = getF(fdrag.id), g = groundAt(e.clientX, e.clientY); if (!f || !g) return;
    fdrag.moved = true; cv.style.cursor = 'grabbing';
    [f.cx, f.cy] = snapMove(f, g.x - fdrag.ox, g.y - fdrag.oy);
    furnG.children.find(o => o.userData.fid === f.id)?.position.set(wx(f.cx), bayCushionHeightOffset(f), wz(f.cy));   // 拖曳中只挪模型，鬆手再整體同步
  });
  const endF = e => {
    if (!fdrag || e.pointerId !== fdrag.pid) return;
    const d = fdrag; fdrag = null; orbit.enabled = true; cv.style.cursor = '';
    if (e.type === 'pointercancel') {
      // A cancelled 3D gesture must never persist a half-moved furniture item.
      cancelDrag(d.before);
    } else if (d.moved) { commit(d.before, 'furniture-3d-drag'); }
  };
  cv.addEventListener('pointerup', endF); cv.addEventListener('pointercancel', endF);

  cv.addEventListener('pointerup', e => {
    const tap = downAt && Math.hypot(e.clientX-downAt[0], e.clientY-downAt[1]) <= TAP;
    if (look?.id === e.pointerId){
      look = null;
      if (tap){ const h = pick(e); if (h?.door && h.dist < 3.5) h.door.open = !h.door.open; }   // 漫遊時點擊門片開關
      return;
    }
    if (anim || opt.mode !== 'orbit' || !tap) return;
    const h = pick(e);
    if (h?.initialWindow !== undefined) select({kind:'window', index:h.initialWindow});
    else if (h?.initialDoor !== undefined) select({kind:'door', index:h.initialDoor});
    else if (h?.door) h.door.open = !h.door.open;
    else if (h?.fid) select({kind:'furn', id:h.fid});
    else if (h?.room) select({kind:'room', id:h.room});
    else select(null);
  });
  new ResizeObserver(() => {
    renderer.setSize(SW(), SH()); labelRenderer.setSize(SW(), SH());
    camera.aspect = SW()/SH(); camera.updateProjectionMatrix();
  }).observe(stage);
  bindUI();
}

/* ======================= 材質 ======================= */
const matCache = new Map();
let envTex = null, envK = 1;
function mat(color, o = {}){
  const key = color + JSON.stringify(o);
  if (!matCache.has(key)){
    const m = new THREE.MeshStandardMaterial({color, roughness:.7, ...o});
    // 金屬 / 光滑表面掛環境反射，牆面等啞光材質不掛，避免整體變亮
    if (envTex && (m.metalness > 0 || m.roughness < .4)){ m.envMap = envTex; m.userData.env = m.metalness > .5 ? 1 : .5; m.envMapIntensity = m.userData.env*envK; }
    matCache.set(key, m);
  }
  return matCache.get(key);
}
function rng(seed){ return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const rgbK = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = v => Math.max(0, Math.min(255, Math.round(v*k))); return `rgb(${f(n>>16&255)},${f(n>>8&255)},${f(n&255)})`; };
// 地面貼圖按真實尺寸平鋪（UV 單位 = 米）
const TEX = {
  wood:{sx:1.8, sy:.36, base:'#d6b58a', rough:.55}, walnut:{sx:1.8, sy:.36, base:'#9a6f4b', rough:.5},
  tile800:{sx:.8, sy:.8, base:'#ebe6dd', grout:'#cfc6b7', rough:.3}, tile600:{sx:.6, sy:.6, base:'#dfe3e0', grout:'#bfc6c1', rough:.35},
  antislip:{sx:.3, sy:.3, base:'#d3d8d4', grout:'#aab2ac', rough:.8}, marble:{sx:1.2, sy:1.2, base:'#f2efe9', grout:'#d9d2c4', rough:.18},
  terrazzo:{sx:.5, sy:.5, base:'#e6dfd3', rough:.4}, carpet:{sx:.3, sy:.3, base:'#c6bfd2', rough:1},
};
const floorMats = {};
function floorMat(kind){
  if (floorMats[kind]) return floorMats[kind];
  const s = TEX[kind] || TEX.tile800, R = rng(kind.length*977 + 13), cv = document.createElement('canvas');
  const wood = kind === 'wood' || kind === 'walnut';
  cv.width = wood ? 1024 : 512; cv.height = wood ? 205 : 512;
  const g = cv.getContext('2d'), W = cv.width, Hh = cv.height;
  g.fillStyle = s.base; g.fillRect(0, 0, W, Hh);
  if (wood){
    const rowH = Hh/2, joints = [[W*2/3], [W/3]];
    for (let r = 0; r < 2; r++){
      let x0 = 0;
      [...joints[r], W].forEach(x1 => {
        g.fillStyle = rgbK(s.base, .9 + R()*.2); g.fillRect(x0, r*rowH, x1-x0, rowH);
        g.strokeStyle = rgbK(s.base, .8); g.globalAlpha = .35; g.lineWidth = 1.2;
        for (let k = 0; k < 7; k++){ const y = r*rowH + 6 + R()*(rowH-12); g.beginPath(); g.moveTo(x0, y);
          for (let x = x0; x <= x1; x += 40) g.lineTo(x, y + Math.sin(x*.02 + k)*2.5); g.stroke(); }
        g.globalAlpha = 1; g.fillStyle = rgbK(s.base, .62); g.fillRect(x1-1.5, r*rowH, 3, rowH); x0 = x1;
      });
      g.fillStyle = rgbK(s.base, .62); g.fillRect(0, r*rowH, W, 2.5);
    }
  } else if (kind === 'marble'){
    g.strokeStyle = 'rgba(160,150,135,.35)';
    for (let k = 0; k < 6; k++){ g.lineWidth = 1 + R()*3; g.beginPath(); g.moveTo(R()*W, 0); g.bezierCurveTo(R()*W, R()*Hh, R()*W, R()*Hh, R()*W, Hh); g.stroke(); }
  } else if (kind === 'terrazzo'){
    const cs = ['#b9a58c','#8fa3a0','#c9b7a2','#a88f76','#7e8a86'];
    for (let k = 0; k < 160; k++){ g.fillStyle = cs[k%5]; g.beginPath(); g.arc(R()*W, R()*Hh, 2 + R()*7, 0, 7); g.fill(); }
  } else {
    for (let k = 0; k < 1500; k++){ g.fillStyle = `rgba(0,0,0,${R()*.04})`; g.fillRect(R()*W, R()*Hh, 2, 2); }
  }
  if (s.grout){ g.fillStyle = s.grout; g.fillRect(0, 0, W, 3); g.fillRect(0, 0, 3, Hh); }
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1/s.sx, 1/s.sy);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return floorMats[kind] = new THREE.MeshStandardMaterial({map:t, roughness:s.rough});
}

/* ======================= 几何小工具（y = 底面高度） ======================= */
const asMat = m => typeof m === 'string' ? mat(m) : m;
const sh = o => { o.castShadow = o.receiveShadow = true; return o; };
const mesh = (geo, m) => sh(new THREE.Mesh(geo, asMat(m)));
const rot = (o, x = 0, y = 0, z = 0) => { o.rotation.set(x, y, z); return o; };
function box(w, h, d, m, x = 0, y = 0, z = 0){
  const o = mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y + h/2, z); return o;
}
function rbox(w, h, d, m, x = 0, y = 0, z = 0, r = .04){
  const o = mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w/2-.001, h/2-.001, d/2-.001)), m); o.position.set(x, y + h/2, z); return o;
}
function cyl(rt, rb, h, m, x = 0, y = 0, z = 0, seg = 28){
  const o = mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m); o.position.set(x, y + h/2, z); return o;
}
// 旋轉體：pts = [[半徑, 高度], …] 自下而上，y = 底面
function lathe(pts, m, x = 0, y = 0, z = 0, seg = 40){
  const o = mesh(new THREE.LatheGeometry(pts.map(([r, h]) => new THREE.Vector2(Math.max(r, 1e-4), h)), seg), m); o.position.set(x, y, z); return o;
}
// 兩點之間的圓桿，r0 在 a 端、r1 在 b 端（收分椅腿、斜撐）
function rod(a, b, r0, m, r1 = r0, seg = 12){
  const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), o = mesh(new THREE.CylinderGeometry(r1, r0, A.distanceTo(B), seg), m);
  o.position.copy(A).add(B).multiplyScalar(.5); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.sub(A).normalize()); return o;
}
// 沿曲線的圓管（水龍頭、扶手、燈臂）
const tube = (pts, r, m, seg = 40) => mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new THREE.Vector3(...p)), false, 'centripetal'), seg, r, 10), m);
// 橢球（靠墊、葉片、豆袋），y = 中心
function blob(rx, ry, rz, m, x = 0, y = 0, z = 0, seg = 24){
  const o = mesh(new THREE.SphereGeometry(1, seg, Math.round(seg*.7)), m); o.scale.set(rx, ry, rz); o.position.set(x, y, z); return o;
}
// 水平圓環，y = 中心
function ring(R, r, m, x = 0, y = 0, z = 0){ const o = mesh(new THREE.TorusGeometry(R, r, 10, 48), m); o.rotation.x = Math.PI/2; o.position.set(x, y, z); return o; }
function rrect(w, d, r){
  const s = new THREE.Shape(), x = -w/2, y = -d/2; r = Math.min(r, w/2 - .001, d/2 - .001);
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
  s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s;
}
// 中空圓角框（浴缸、水槽沿、椅背框）：外 w×d、壁厚 t、高 h
function shell(w, d, h, t, r, m, x = 0, y = 0, z = 0){
  const s = rrect(w, d, r); s.holes.push(rrect(w - 2*t, d - 2*t, Math.max(.004, r - t)));
  const geo = new THREE.ExtrudeGeometry(s, {depth:h, bevelEnabled:false, curveSegments:10}); geo.rotateX(-Math.PI/2);
  const o = mesh(geo, m); o.position.set(x, y, z); return o;
}
const darker = (hex, k = .8) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();
const lighter = (hex, k = .2) => '#' + new THREE.Color(hex).lerp(new THREE.Color('#ffffff'), k).getHexString();
// 四條收分腿：inset 為距邊距離，r 為腿底半徑（頂部略粗）
const legs = (g, w, d, h, m, inset = .05, r = .02) => [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a, b]) => g.add(rod([a*(w/2-inset), 0, b*(d/2-inset)], [a*(w/2-inset), h, b*(d/2-inset)], r*.7, m, r)));
const metal = () => mat('#cfd2d4', {metalness:.9, roughness:.25});
const chrome = () => mat('#eef0f2', {metalness:1, roughness:.08});
const hwMat = () => mat('#b9b3a8', {metalness:.85, roughness:.3});
const blackMetal = () => mat('#2b2b2d', {metalness:.6, roughness:.4});
const mirror = () => mat('#dfeaee', {metalness:.55, roughness:.06});
const ceramic = (o = {}) => mat('#fbfbf9', {roughness:.12, ...o});
const fabric = c => mat(c, {roughness:.96});
const woodM = c => mat(c, {roughness:.55});
const screenMat = (glow = '#1a2636') => mat('#0b0e13', {roughness:.1, metalness:.3, emissive:glow, emissiveIntensity:.35});
const glowMat = (c = '#fff4dc', e = '#ffdca0', k = .5) => mat(c, {emissive:e, emissiveIntensity:k, roughness:.9, side:THREE.DoubleSide});

// 拉手：y 為拉手中心，z 為門板正面
function pull(g, len, vert, x, y, z){
  const m = hwMat(), o = new THREE.Group();
  o.add(vert ? box(.01, len, .01, m, 0, -len/2, .028) : box(len, .01, .01, m, 0, -.005, .028));
  [-1, 1].forEach(s => o.add(vert ? box(.008, .008, .028, m, 0, s*(len/2 - .015) - .004, .014) : box(.008, .008, .028, m, s*(len/2 - .015), -.004, .014)));
  o.position.set(x, y, z); g.add(o);
}
function knob(g, x, y, z){ const k = cyl(.011, .014, .02, hwMat(), x, y - .01, z + .01, 16); k.rotation.x = Math.PI/2; g.add(k, blob(.014, .014, .008, hwMat(), x, y, z + .022, 12)); }
// 櫃門 / 抽屜面板：x0..x0+w、y0..y0+h 區域內 nx 列 × ny 行，正面朝 +z（z = 櫃體正面）
// hd：'bar' 金屬拉手 | 'knob' 圓鈕 | 'edge' 頂部隱形拉槽 | 'none'；hy：門拉手中心高度（null = 面板中部）
function fronts(g, x0, y0, w, h, z, nx, ny, m, hd = 'bar', hy = null){
  const gap = .005, pw = w/nx, ph = h/ny, fz = z + .018;
  g.add(box(w, h, .002, '#2a2724', x0 + w/2, y0, z + .001));                     // 縫隙裡透出的暗色
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++){
    const cx = x0 + pw*(i + .5), yb = y0 + ph*j, drawer = ph < .4 && pw >= ph;
    g.add(rbox(pw - gap, ph - gap, .018, m, cx, yb + gap/2, z + .009, .003));
    if (hd === 'none') continue;
    if (hd === 'edge'){ g.add(box(pw - .05, .01, .006, '#3c3a37', cx, yb + ph - gap - .018, fz)); continue; }
    if (drawer){ hd === 'knob' ? knob(g, cx, yb + ph/2, fz) : pull(g, Math.min(.3, pw*.45), false, cx, yb + ph/2, fz); continue; }
    const len = Math.min(.45, ph*.35), hx = nx === 1 ? cx + pw/2 - .045 : (i % 2 ? cx - pw/2 + .04 : cx + pw/2 - .04);
    const y = Math.min(yb + ph - .05 - len/2, Math.max(yb + .05 + len/2, hy ?? yb + ph/2));
    hd === 'knob' ? knob(g, hx, y, fz) : pull(g, len, true, hx, y, fz);
  }
}
const vasePts = (r, h) => [[0, 0], [r*.65, 0], [r, h*.32], [r*.92, h*.62], [r*.42, h*.86], [r*.5, h]];
function vase(g, x, y, z, r, h, c, R, flowers = true){
  g.add(lathe(vasePts(r, h), mat(c, {roughness:.35, side:THREE.DoubleSide}), x, y, z, 32));
  if (!flowers) return;
  const cols = ['#f3e6d8', '#e8b4a0', '#f6d27a', '#ffffff'];
  for (let k = 0; k < 5; k++){
    const a = k*1.26 + R()*.4, s = .03 + R()*.05, top = [x + Math.cos(a)*s, y + h + .12 + R()*.14, z + Math.sin(a)*s];
    g.add(rod([x, y + h*.6, z], top, .003, '#6f8f4a', .003, 6), blob(.022, .018, .022, cols[k % 4], ...top, 12));
  }
}
function tableLamp(g, x, y, z, s = 1){
  g.add(lathe([[0, 0], [.06*s, 0], [.075*s, .05*s], [.08*s, .12*s], [.055*s, .2*s], [.018*s, .25*s], [.012*s, .3*s]], ceramic({roughness:.3}), x, y, z, 32));
  g.add(lathe([[.13*s, 0], [.1*s, .18*s]], glowMat('#f6ecd9', '#ffdca0', .35), x, y + .26*s, z, 40), blob(.03*s, .03*s, .03*s, glowMat('#fff', '#ffe2b0', 1), x, y + .31*s, z, 12));
}
const plate = (g, r, x, y, z) => g.add(lathe([[0, 0], [r*.6, 0], [r*.72, .008], [r, .02]], ceramic({side:THREE.DoubleSide}), x, y, z, 32));

/* ======================= 家具模型（局部座標：背面朝 -z） ======================= */
// Match the cushion seat surface to the associated bay-window sill.
// Window projections have an 850 mm sill; ordinary bay windows have a 480 mm sill.
// Leave unrelated/remote cushions at their original 450 mm reference height.
function bayCushionHeightOffset(f){
  if (f.type !== 'baycushion') return 0;
  const nearby = state.furniture
    .filter(w => w.type === 'windowbay' || w.type === 'windowproject')
    .map(w => {
      const dx = Math.abs(f.cx - w.cx), dy = Math.abs(f.cy - w.cy);
      // The original window is centred on the wall, whereas the cushion sits
      // in the recess; tolerate the projection but not an unrelated window.
      const windowLongSide = Math.max(w.w, w.d);
      const cushionLongSide = Math.max(f.w, f.d);
      const reach = (windowLongSide + cushionLongSide) / 2 + 400;
      const distance = Math.hypot(dx, dy);
      return {w, distance, reach};
    })
    .filter(m => m.distance <= m.reach)
    .sort((a,b) => a.distance - b.distance)[0];
  if (!nearby) return 0;
  const sill = nearby.w.type === 'windowproject' ? .85 : .48;
  return sill - .45;
}

function buildFurniture(f){
  const g = new THREE.Group(), w = M(f.w), d = M(f.d), c = f.color || '#ddd', bz = -d/2, R = rng(Math.round(f.w*7 + f.d*13 + f.cx + f.cy));
  switch (f.type){
    case 'bench': {
      g.add(box(w,.08,d,woodM(c),0,.42,0));
      for(const x of [-w*.4,w*.4])for(const z of [-d*.32,d*.32])g.add(box(.06,.42,.06,mat('#444039'),x,0,z));
      break;
    }
    case 'wall': {
      g.add(box(w, 2.8, d, mat(c, {roughness:.8}), 0, 0, 0));
      break;
    }
    case 'walllow': {
      g.add(box(w, 1.1, d, mat(c, {roughness:.8}), 0, 0, 0));
      break;
    }
    case 'wallglass': {
      g.add(box(w, 2.4, Math.max(d,.03), glassMat, 0, 0, 0));
      break;
    }
    case 'wallcurve': {
      g.add(box(w, 2.8, d, mat(c, {roughness:.8}), 0, 0, 0));
      break;
    }
    case 'door': {
      g.add(box(w, 2.05, Math.max(d, .04), woodM(c), 0, 0, 0));
      break;
    }
    case 'bed': {
      const fr = woodM('#8d7258'), fab = fabric(c), fh = .3, mt = .22, top = fh + mt, n = Math.max(3, Math.round(w/.28)), sw = (w - .04)/n;
      g.add(box(w - .12, .06, d - .14, '#4a3e33', 0, 0, .03), rbox(w, fh - .06, d - .08, fr, 0, .06, .04, .015));        // 內縮踢腳 + 床箱
      g.add(rbox(w, 1.08, .06, fr, 0, 0, bz + .03, .012));                                                                 // 床頭板
      for (let i = 0; i < n; i++) g.add(rbox(sw - .006, .62, .06, fabric(darker(c, .8)), -w/2 + .02 + sw*(i + .5), .42, bz + .08, .025));   // 豎向軟包
      const md = d - .13, dd = md*.66, dz = d/2 - .015 - dd/2;
      g.add(rbox(w - .06, mt, md, '#f6f3ee', 0, fh, bz + .11 + md/2, .07));                                              // 床墊
      g.add(rbox(w + .02, .27, dd, fab, 0, top - .2, dz, .04), rbox(w + .024, .06, .22, fabric('#fbfaf7'), 0, top + .025, dz - dd/2 + .11, .025));   // 被子 + 翻邊
      g.add(rbox(w + .05, .285, .42, fabric(darker(c, .62)), 0, top - .205, d/2 - .35, .03));                               // 床尾巾
      const np = w >= 1.3 ? 2 : 1, pw = (w - .16 - (np-1)*.06)/np;
      for (let i = 0; i < np; i++){
        const x = -w/2 + .08 + pw/2 + i*(pw + .06);
        g.add(rot(rbox(pw, .15, .42, fabric('#ffffff'), x, top - .01, bz + .34, .07), -.28), rot(rbox(pw*.62, .3, .1, fabric(i ? '#efe7da' : darker(c, .7)), x, top, bz + .54, .045), -.3));
      }
      break;
    }
    case 'sofa': case 'armchair': {
      const fab = fabric(c), dk = fabric(darker(c, .88)), a = Math.min(.18, w*.14), n = f.type === 'armchair' ? 1 : (w > 2.2 ? 3 : 2), cw = (w - 2*a)/n, bd = Math.min(.2, d*.24), lh = .12, sd = d - bd - .02;
      legs(g, w, d, lh, woodM('#3a3027'), .07, .018);
      g.add(rbox(w, .16, d, dk, 0, lh, 0, .03), rbox(w, .73, bd, dk, 0, lh, bz + bd/2, .06));
      [-1, 1].forEach(s => g.add(rbox(a, .5, d, dk, s*(w/2 - a/2), lh, 0, .07)));
      for (let i = 0; i < n; i++){
        const x = -w/2 + a + cw/2 + i*cw;
        g.add(rbox(cw - .012, .15, sd, fab, x, lh + .16, bz + bd + sd/2, .055), rot(rbox(cw - .03, .44, .16, fab, x, lh + .3, bz + bd + .08, .07), -.16));
      }
      if (n > 1) [-1, 1].forEach(s => g.add(rot(rbox(.42, .42, .12, fabric(s < 0 ? '#ece5d8' : darker(c, .7)), s*(w/2 - a - .26), lh + .32, bz + bd + .22, .06), -.3, s*-.25)));
      else g.add(rot(rbox(.4, .26, .1, fabric('#ece5d8'), 0, lh + .33, bz + bd + .2, .05), -.25));
      break;
    }
    case 'cornersofa': {
      const k = Math.min(.95, d*.56, w*.4), b = .2, fab = fabric(c), dk = fabric(darker(c, .88)), lh = .1, sw = (w - b - .2)/2;
      [[-w/2+.07, bz+.07], [w/2-.07, bz+.07], [w/2-.07, bz+k-.07], [-w/2+.07, d/2-.07], [-w/2+k-.07, d/2-.07], [-w/2+k-.07, bz+k-.07]]
        .forEach(([x, z]) => g.add(rod([x, 0, z], [x, lh, z], .012, woodM('#3a3027'), .018)));
      g.add(rbox(w, .18, k, dk, 0, lh, bz + k/2, .03), rbox(k, .18, d - k + .02, dk, -w/2 + k/2, lh, bz + k + (d - k)/2 - .01, .03));
      g.add(rbox(w, .72, b, dk, 0, lh, bz + b/2, .06), rbox(b, .72, d, dk, -w/2 + b/2, lh, 0, .06), rbox(.2, .5, k, dk, w/2 - .1, lh, bz + k/2, .07), rbox(k, .5, .2, dk, -w/2 + k/2, lh, d/2 - .1, .07));
      for (let i = 0; i < 2; i++){
        const x = -w/2 + b + sw/2 + i*sw;
        g.add(rbox(sw - .012, .15, k - b - .02, fab, x, lh + .18, bz + b + (k - b)/2, .055), rot(rbox(sw - .04, .42, .16, fab, x, lh + .3, bz + b + .07, .07), -.16));
      }
      g.add(rbox(k - b - .02, .15, d - k - .22, fab, -w/2 + b + (k - b)/2, lh + .18, bz + k + (d - k - .2)/2, .055));
      const L = d - .2 - b - .18, nl = Math.max(1, Math.round(L/.75));
      for (let i = 0; i < nl; i++) g.add(rot(rbox(.16, .42, L/nl - .03, fab, -w/2 + b + .07, lh + .3, bz + b + .18 + L/nl*(i + .5), .07), 0, 0, .16));
      g.add(rot(rbox(.42, .42, .12, fabric('#ece5d8'), -w/2 + b + .3, lh + .34, bz + b + .24, .06), -.35, .6), rot(rbox(.4, .4, .12, fabric(darker(c, .7)), w/2 - .5, lh + .34, bz + b + .2, .06), -.3, -.25));
      break;
    }
    case 'nightstand': {
      const wm = woodM(c);
      legs(g, w, d, .1, woodM('#5a4a3b'), .04, .014);
      g.add(rbox(w, .4, d - .02, wm, 0, .1, -.01, .012));
      fronts(g, -w/2 + .02, .12, w - .04, .36, d/2 - .02, 1, 2, wm, 'bar');
      tableLamp(g, -w*.12, .5, -d*.12);
      g.add(box(.16, .025, .22, '#2f5d62', w*.24, .5, .04), box(.14, .02, .2, '#e6dccd', w*.24, .525, .04));
      break;
    }
    case 'wardrobe': case 'cabinet': case 'shoecab': {
      const cm = mat(c, {roughness:.55}), fz = d/2 - .02;
      if (f.type === 'wardrobe'){
        const h = 2.2, n = Math.max(1, Math.round(w/.5));
        g.add(box(w - .02, .08, d - .06, '#4a4641', 0, 0, -.03), box(w, h - .08, d - .02, cm, 0, .08, -.01));
        fronts(g, -w/2, .08, w, h - .1, fz, n, 1, cm, 'bar', 1.05);
        g.add(box(w, .02, d - .02, darker(c, .9), 0, h - .02, -.01));
      } else if (f.type === 'shoecab'){
        const h = 1.0, y0 = .16, n = Math.max(1, Math.round(w/.45));
        g.add(box(w, h - y0, d - .02, cm, 0, y0, -.01), box(w - .04, .01, .03, glowMat('#fff7e6', '#ffe9c4', .8), 0, y0 - .01, fz - .06));   // 懸空 + 底部燈帶
        fronts(g, -w/2, y0, w, h - y0, fz, n, 1, cm, 'edge');
        g.add(rbox(w + .01, .025, d, woodM(darker(c, .8)), 0, h, 0, .006));
        g.add(rbox(.22, .015, .14, woodM('#6b543f'), -w*.25, h + .025, 0, .006));
        vase(g, w*.28, h + .025, -.03, .05, .2, '#d8cfc2', R);
      } else {
        const h = .85, n = Math.max(1, Math.round(w/.5));
        legs(g, w, d, .1, woodM('#3a3027'), .05, .016);
        g.add(box(w, h - .13, d - .02, cm, 0, .1, -.01));
        fronts(g, -w/2, .62, w, .2, fz, n, 1, cm, 'bar');
        fronts(g, -w/2, .1, w, .52, fz, n, 1, cm, 'bar', .52);
        g.add(rbox(w + .02, .03, d + .01, woodM(darker(c, .78)), 0, h - .03, 0, .008));
        vase(g, w*.3, h, 0, .07, .24, '#e9e2d6', R);
        g.add(rot(box(.3, .38, .02, woodM('#3a3027'), -w*.25, h, bz + .06), -.12), rot(box(.25, .33, .005, '#d9cfbf', -w*.25, h + .03, bz + .075), -.12));   // 靠牆畫框
        g.add(lathe([[0, 0], [.05, 0], [.12, .06], [.13, .07]], mat('#b8a58c', {roughness:.5, side:THREE.DoubleSide}), 0, h, .02, 32));
        for (let k = 0; k < 3; k++) g.add(blob(.035, .035, .035, ['#d98c4a', '#c9ad4f', '#b5463a'][k], Math.cos(k*2.1)*.04, h + .045, .02 + Math.sin(k*2.1)*.04, 14));
      }
      break;
    }
    case 'dresser': {
      const wm = woodM(c), r = Math.min(.34, w*.3);
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a, b]) => g.add(rod([a*(w/2 - .04), 0, b*(d/2 - .04)], [a*(w/2 - .05), .58, b*(d/2 - .05)], .012, wm, .02)));
      g.add(box(w - .04, .14, d - .04, wm, 0, .58), rbox(w, .03, d, wm, 0, .72, 0, .008));
      fronts(g, -w/2 + .03, .585, w - .06, .13, d/2 - .02, 2, 1, wm, 'knob');
      const mr = new THREE.Mesh(new THREE.TorusGeometry(r, .018, 12, 64), woodM(darker(c, .7))); mr.position.set(0, .77 + r, bz + .04); sh(mr);
      const mg = new THREE.Mesh(new THREE.CircleGeometry(r, 64), mirror()); mg.position.set(0, .77 + r, bz + .035);
      g.add(mr, mg, box(.08, .03, .06, woodM(darker(c, .7)), 0, .75, bz + .04));
      [['#e7c9b5', .03, .09], ['#b9d0d8', .025, .12], ['#f0e3cf', .02, .07]].forEach(([cc, rr, hh], i) => g.add(cyl(rr, rr, hh, mat(cc, {roughness:.15, transparent:true, opacity:.8}), w*.25 + i*.06, .75, .02)));
      g.add(rbox(.16, .06, .1, woodM('#6b543f'), -w*.28, .75, .03, .01));
      const sz = d/2 + .25;
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a, b]) => g.add(rod([a*.13, 0, sz + b*.13], [a*.12, .4, sz + b*.12], .01, wm, .014)));
      g.add(rbox(.34, .08, .34, fabric('#e8ddd0'), 0, .4, sz, .035));
      break;
    }
    case 'desk': {
      const tm = woodM(c), bm = blackMetal();
      g.add(rbox(w, .025, d, tm, 0, .72, 0, .006));
      [-1, 1].forEach(s => {
        const x = s*(w/2 - .06);
        g.add(box(.03, .72, .03, bm, x, 0, d/2 - .06), box(.03, .72, .03, bm, x, 0, bz + .06), box(.03, .03, d - .1, bm, x, 0, 0), box(.03, .03, d - .1, bm, x, .69, 0));
      });
      g.add(box(w - .12, .04, .015, bm, 0, .66, bz + .06), box(.4, .09, d - .12, tm, w/2 - .32, .63, 0));
      pull(g, .16, false, w/2 - .32, .675, d/2 - .06);
      const my = .745, mz = bz + .15;
      g.add(rbox(.22, .012, .16, bm, 0, my, mz, .004), rod([0, my, mz - .02], [0, my + .2, mz - .03], .012, bm));
      g.add(rbox(.62, .37, .02, '#1d1d1f', 0, my + .12, mz - .04, .006), box(.6, .33, .002, screenMat('#27405c'), 0, my + .15, mz - .029));
      g.add(rbox(.42, .015, .13, '#e8e8ea', 0, my, .06, .004), rbox(.4, .004, .11, '#d2d2d6', 0, my + .014, .06, .002), blob(.03, .015, .05, '#e8e8ea', .3, my + .012, .07, 16));
      const lx = -w/2 + .15, lz = bz + .12;
      g.add(cyl(.07, .075, .02, bm, lx, my, lz, 28), tube([[lx, my + .02, lz], [lx, my + .3, lz + .03], [lx + .12, my + .42, lz + .1]], .008, bm));
      const hd = cyl(.02, .06, .1, bm, lx + .14, my + .34, lz + .12, 24); hd.rotation.x = .5; g.add(hd);
      g.add(cyl(.04, .038, .09, ceramic({roughness:.3}), w/2 - .15, my, .05, 20), rbox(.2, .015, .28, '#3b5566', -w/2 + .3, my, .1, .004));
      break;
    }
    case 'chair': {
      const lw = woodM('#6b543f'), fab = fabric(c), sy = .44;
      [[-1, 1], [1, 1]].forEach(([s]) => g.add(rod([s*(w/2 - .04), 0, d/2 - .05], [s*(w/2 - .05), sy, d/2 - .07], .012, lw, .018)));
      [-1, 1].forEach(s => g.add(rod([s*(w/2 - .04), 0, bz + .03], [s*(w/2 - .05), .86, bz + .07], .012, lw, .018)));
      g.add(box(w - .08, .025, .02, lw, 0, .15, d/2 - .06), box(w - .08, .025, .02, lw, 0, .15, bz + .05));
      [-1, 1].forEach(s => g.add(box(.02, .025, d - .12, lw, s*(w/2 - .045), .18, 0)));
      g.add(box(w - .06, .04, d - .1, lw, 0, sy - .03, 0), rbox(w - .04, .05, d - .08, fab, 0, sy, .005, .022));
      g.add(rot(rbox(w - .08, .15, .025, lw, 0, .66, bz + .065, .012), -.12), rot(box(w - .08, .025, .02, lw, 0, .52, bz + .055), -.12));
      break;
    }
    case 'bookshelf': {
      const h = 1.8, t = .022, ns = 5, wm = woodM(c), sh0 = (h - .06 - t)/ns, cols = ['#b88a6a','#6f8f8a','#d9c08c','#9aa58c','#a8675e','#e6dccd','#7d8ea3','#c9bfae'];
      g.add(box(w, h, .012, woodM(darker(c, .85)), 0, 0, bz + .006), box(t, h, d, wm, -w/2 + t/2), box(t, h, d, wm, w/2 - t/2), box(w - 2*t, .06, d - .03, wm, 0, 0, .0));
      for (let s = 0; s <= ns; s++){
        const y = s < ns ? .06 + s*sh0 : h - t; g.add(box(w - 2*t, t, d - .012, wm, 0, y, .006));
        if (s === ns) break;
        const yb = y + t, end = w/2 - t - .01; let x = -w/2 + t + .01, deco = R() < .55 ? x + R()*(w - .45) : 99;
        while (x < end - .03){
          if (x >= deco){
            deco = 99;
            if (R() < .5) vase(g, x + .07, yb, 0, .045, .16, cols[Math.floor(R()*8)], R, false);
            else for (let k = 0; k < 3; k++) g.add(box(.2 - k*.02, .028, d*.7, mat(cols[Math.floor(R()*8)], {roughness:.8}), x + .1, yb + k*.028, .01));
            x += .2; continue;
          }
          if (R() < .07){ x += .03 + R()*.05; continue; }
          const bw = .018 + R()*.03, bh = Math.min(sh0 - t - .03, .17 + R()*.13), bd = d*(.62 + R()*.22);
          if (x + bw > end) break;
          g.add(box(bw, bh, bd, mat(cols[Math.floor(R()*8)], {roughness:.75}), x + bw/2, yb, d/2 - .015 - bd/2));
          x += bw + .002;
        }
      }
      break;
    }
    case 'baycushion':
      g.add(rbox(w, .08, d, fabric(c), 0, .45, 0, .03));
      g.add(rot(rbox(w - .1, .34, .14, fabric('#ffffff'), 0, .52, bz + .14, .06), .25), rot(rbox(w - .1, .34, .14, fabric('#f0e6d6'), 0, .52, d/2 - .14, .06), -.25));
      g.add(rbox(w*.8, .04, .3, fabric(darker(c, .7)), 0, .53, d*.12, .02), rbox(.28, .015, .2, woodM('#8d7258'), 0, .53, -d*.15, .006), cyl(.035, .03, .06, ceramic(), 0, .545, -d*.15, 20));
      break;
    case 'coffeetable': {
      const tm = mat(c, {roughness:.35}), lw = woodM('#3a3027');
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a, b]) => g.add(rod([a*(w/2 - .05), 0, b*(d/2 - .05)], [a*(w/2 - .07), .365, b*(d/2 - .07)], .012, lw, .02)));
      g.add(rbox(w, .035, d, tm, 0, .365, 0, .015), rbox(w - .12, .02, d - .12, woodM(darker(c, .85)), 0, .12, 0, .006));
      g.add(box(.3, .03, .22, '#2f5d62', w*.2, .14, 0), box(.26, .025, .19, '#d9b36c', w*.2, .17, .01));
      g.add(rbox(.38, .015, .24, woodM('#6b543f'), -w*.2, .4, 0, .006), box(.22, .025, .16, '#e6dccd', -w*.22, .415, 0));
      g.add(lathe([[0, 0], [.025, 0], [.035, .07], [.034, .08]], ceramic({side:THREE.DoubleSide}), -w*.12, .415, .06, 20));
      vase(g, w*.24, .4, -.05, .055, .18, '#e9e2d6', R);
      break;
    }
    case 'tvstand': {
      const sm = mat(c, {roughness:.5}), n = Math.max(2, Math.round(w/.6));
      legs(g, w, d, .1, blackMetal(), .08, .012);
      g.add(rbox(w, .4, d - .02, sm, 0, .1, -.01, .01));
      fronts(g, -w/2 + .005, .105, w - .01, .39, d/2 - .02, n, 1, sm, 'edge');
      g.add(rbox(1.45, .84, .025, mat('#18181a', {roughness:.4, metalness:.3}), 0, .95, bz + .03, .004), box(1.43, .81, .002, screenMat(), 0, .962, bz + .0435));
      g.add(rbox(.9, .06, .09, '#2a2a2c', 0, .5, -.02, .02), box(.86, .045, .002, fabric('#3a3a3c'), 0, .507, .026));
      vase(g, w/2 - .25, .5, 0, .06, .26, '#d8cfc2', R);
      g.add(box(.25, .035, .18, '#a9433b', -w/2 + .3, .5, 0), box(.22, .03, .16, '#e6dccd', -w/2 + .3, .535, 0));
      break;
    }
    case 'rug':
      [[w, d, .01, c, 0], [w - .16, d - .16, .002, darker(c, .82), .01], [w - .26, d - .26, .002, lighter(c, .12), .0115]].forEach(([a, b, h, cc, y]) => {
        const r = box(a, h, b, mat(cc, {roughness:1}), 0, y + .002); r.castShadow = false; g.add(r);
      });
      break;
    case 'plant': {
      const r = Math.min(w, d)/2, H = .9 + r*1.6, pot = mat('#d9d2c5', {roughness:.6}), lm = [mat('#5f8f4e', {roughness:.6, side:THREE.DoubleSide}), mat('#79a862', {roughness:.6, side:THREE.DoubleSide})];
      g.add(lathe([[0, 0], [r*.4, 0], [r*.44, .02], [r*.54, .36], [r*.57, .4], [r*.52, .4], [r*.5, .37], [0, .37]], pot, 0, 0, 0, 36), cyl(r*.49, r*.49, .005, '#4a3a2c', 0, .368, 0, 28));
      g.add(rod([0, .37, 0], [.02, H*.62, -.01], .016, '#6b5540', .009));
      const N = 20 + Math.round(r*36), sc = Math.sqrt(r/.25);
      for (let k = 0; k < N; k++){
        const t = k/N, a = k*2.399 + R()*.3, len = (.14 + R()*.08)*(1.1 - t*.4)*sc, s0 = .03 + R()*.08*sc, p = new THREE.Group();
        p.position.set(0, H*(.42 + .58*t), 0); p.rotation.set(0, -a, .1 + t*.5 + R()*.3, 'YXZ');
        const lf = blob(len/2, .005, len*.27, lm[k % 2], s0 + len/2, 0, 0, 16); lf.rotation.z = -.3;
        p.add(box(s0, .005, .005, '#6f8f4a', s0/2, 0, 0), lf); g.add(p);
      }
      break;
    }
    case 'table': {
      const tm = mat(c, {roughness:.4}), lw = woodM(darker(c, .55)), ns = Math.max(1, Math.round(w/.62)), top = .75;
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a, b]) => g.add(rod([a*(w/2 - .08), 0, b*(d/2 - .08)], [a*(w/2 - .1), .715, b*(d/2 - .1)], .016, lw, .026)));
      g.add(rbox(w, .035, d, tm, 0, .715, 0, .012), box(w - .22, .07, d - .22, lw, 0, .645));
      g.add(box(w*.7, .003, .32, fabric('#b9a58c'), 0, top, 0));
      for (let i = 0; i < ns; i++) [-1, 1].forEach(s => {
        const x = -w/2 + w/ns*(i + .5), z = s*(d/2 - .17);
        g.add(box(.38, .003, .28, fabric('#e7dfd1'), x, top, z)); plate(g, .12, x, top + .003, z);
        g.add(cyl(.03, .026, .1, mat('#dfeef3', {transparent:true, opacity:.35, roughness:.05}), x + .15, top + .003, z - s*.1, 16));
      });
      vase(g, 0, top + .003, 0, .06, .2, '#e9e2d6', R);
      break;
    }
    case 'roundtable': {
      const b = Math.min(.25, w*.3), lw = woodM('#4a3e33'), top = .75;
      g.add(lathe([[b, 0], [b, .015], [b*.8, .035], [.06, .12], [.045, .35], [.05, .6], [.12, .69], [.18, .715]], lw, 0, 0, 0, 40), cyl(w/2, w/2, .035, mat(c, {roughness:.4}), 0, .715, 0, 64));
      for (let k = 0; k < 4; k++){ const a = k*Math.PI/2 + .4, rr = w/2 - .17; plate(g, .11, Math.cos(a)*rr, top, Math.sin(a)*rr); }
      vase(g, 0, top, 0, .05, .18, '#e9e2d6', R);
      break;
    }
    case 'counter': {
      const cm = mat(c, {roughness:.45}), stone = mat('#dcd7cf', {roughness:.22}), n = Math.max(1, Math.round(w/.6)), fz = d/2 - .04;
      g.add(box(w - .01, .1, d - .1, '#4a4641', 0, 0, -.05), box(w, .72, d - .04, cm, 0, .1, -.02));
      fronts(g, -w/2, .64, w, .18, fz, n, 1, cm, 'bar'); fronts(g, -w/2, .1, w, .54, fz, n, 1, cm, 'bar', .56);
      g.add(rbox(w + .01, .04, d, stone, 0, .82, 0, .004), box(w, .62, .01, mat('#efece6', {roughness:.3}), 0, .86, bz + .005));
      g.add(box(w, .7, .33, cm, 0, 1.48, bz + .165)); fronts(g, -w/2, 1.48, w, .7, bz + .33, n, 1, cm, 'bar', 1.56);
      g.add(box(w - .04, .01, .02, glowMat('#fff7e6', '#ffe9c4', .8), 0, 1.47, bz + .29));
      if (w >= .8){
        g.add(rbox(.36, .018, .25, woodM('#c9a27a'), -w/2 + .3, .86, .0, .005));
        [.07, .06, .05].forEach((r, i) => g.add(cyl(r, r, .16 - i*.03, mat(['#e9e2d6', '#d6cfc3', '#bfb6a8'][i], {roughness:.4}), w/2 - .15 - i*.15, .86, bz + .1, 24)));
        g.add(cyl(.05, .045, .14, ceramic({roughness:.3}), w/2 - .6, .86, bz + .1, 20));
        for (let k = 0; k < 4; k++) g.add(rod([w/2 - .6, .9, bz + .1], [w/2 - .6 + (k - 1.5)*.018, 1.1, bz + .1 + (k % 2 - .5)*.02], .005, woodM('#8d7258'), .006, 6));
      }
      break;
    }
    case 'stove': {
      const sm = mat('#b9bec3', {metalness:.8, roughness:.3});
      g.add(rbox(w, .012, d, mat('#0d0d0e', {roughness:.06, metalness:.3}), 0, .862, 0, .004));
      (w/d > 1.4 ? [[-w/4, 0], [w/4, 0]] : [[-w/4,-d/4],[w/4,-d/4],[-w/4,d/4],[w/4,d/4]]).forEach(([x, z]) => {
        g.add(cyl(.085, .09, .008, '#2b2b2b', x, .874, z, 32), cyl(.045, .05, .014, mat('#6b5a45', {metalness:.7, roughness:.35}), x, .874, z, 28), cyl(.028, .028, .022, '#1a1a1a', x, .874, z, 20));
        for (let k = 0; k < 5; k++){ const a = k*Math.PI*2/5; g.add(rot(box(.07, .014, .012, '#1c1c1c', x + Math.cos(a)*.1, .874, z + Math.sin(a)*.1), 0, -a)); }
        g.add(cyl(.02, .022, .018, '#222', x, .874, d/2 - .04, 20));
      });
      g.add(rbox(w, .06, .5, sm, 0, 1.55, bz + .25, .01), box(.3, .72, .26, sm, 0, 1.61, bz + .13));
      g.add(rot(box(w - .02, .3, .008, mat('#15181b', {roughness:.05, metalness:.5}), 0, 1.58, bz + .38), -.9), box(.16, .012, .003, mat('#101214', {emissive:'#6fd0ff', emissiveIntensity:.6}), 0, 1.575, bz + .502));
      break;
    }
    case 'ksink': {
      const st = mat('#c7ccd1', {metalness:.85, roughness:.28}), inner = mat('#9aa1a8', {metalness:.8, roughness:.35}), two = w >= .75, bw = two ? w*.42 : w*.7, bd = d*.66;
      g.add(box(w, .008, d, st, 0, .862, 0));
      (two ? [-w*.23, w*.23] : [0]).forEach(x => g.add(shell(bw, bd, .02, .015, .04, st, x, .862, .03), box(bw - .03, .002, bd - .03, inner, x, .87, .03), cyl(.03, .03, .003, chrome(), x, .872, .03, 20)));
      const fx = two ? 0 : w*.3, cm = chrome();
      g.add(cyl(.025, .028, .03, cm, fx, .87, bz + .06, 20), tube([[fx, .9, bz + .06], [fx, 1.12, bz + .06], [fx, 1.17, bz + .1], [fx, 1.14, bz + .18], [fx, 1.08, bz + .2]], .012, cm));
      g.add(rot(box(.012, .012, .09, cm, fx + .035, .98, bz + .09), -.3));
      break;
    }
    case 'fridge': {
      const fm = mat(c, {metalness:.45, roughness:.28}), h = 1.8, fz = d/2 - .05;
      g.add(box(w - .02, .06, d - .06, '#2a2c2e', 0, 0, -.03), rbox(w, h - .06, d - .05, fm, 0, .06, -.025, .02), box(w - .01, h - .07, .003, '#2a2c2e', 0, .065, fz + .0015));
      if (w > .85){
        [-1, 1].forEach(s => { g.add(rbox(w/2 - .004, h - .08, .04, fm, s*w/4, .07, fz + .023, .012)); pull(g, .8, true, s*.035, 1.05, fz + .043); });
        g.add(box(.1, .14, .003, screenMat('#2a6f8f'), -w/4, 1.25, fz + .044));
      } else {
        g.add(rbox(w - .006, 1.06, .04, fm, 0, .72, fz + .023, .012), rbox(w - .006, .64, .04, fm, 0, .07, fz + .023, .012));
        pull(g, .5, true, -w/2 + .06, 1.05, fz + .043); pull(g, w*.5, false, 0, .64, fz + .043);
        g.add(box(.08, .1, .003, screenMat('#2a6f8f'), w*.22, 1.4, fz + .044));
      }
      break;
    }
    case 'toilet': case 'bidettoilet': {
      const cer = ceramic(), Rb = w*.45, zc = bz + d*.62, kz = (d*.37)/Rb, cm = chrome();
      g.add(rbox(w*.88, .4, d*.24, cer, 0, .36, bz + d*.12, .04), rbox(w*.92, .03, d*.27, cer, 0, .76, bz + d*.135, .012), cyl(.022, .022, .006, cm, 0, .79, bz + d*.135, 20));
      const ped = lathe([[0, 0], [Rb*.62, 0], [Rb*.66, .02], [Rb*.56, .12], [Rb*.62, .22], [Rb*.92, .33], [Rb, .37]], cer, 0, 0, zc, 40);
      const seat = cyl(Rb*1.01, Rb*1.01, .022, mat('#f4f4f2', {roughness:.2}), 0, .37, zc, 40), lid = cyl(Rb*.97, Rb*.99, .02, mat('#f4f4f2', {roughness:.2}), 0, .392, zc, 40);
      ped.scale.z = seat.scale.z = lid.scale.z = kz; g.add(ped, seat, lid);
      [-1, 1].forEach(s => g.add(box(.03, .02, .03, cm, s*w*.18, .39, zc - Rb*kz - .005)));
      if (f.type === 'bidettoilet') {
        // 免治馬桶的電子控制座、側邊操作面板與機身指示燈。
        const plastic = mat('#f8fbfa', {roughness:.22});
        g.add(rbox(w*.82, .085, d*.17, plastic, 0, .445, bz + d*.32, .02));
        g.add(rbox(w*.18, .045, d*.32, plastic, w*.43, .42, bz + d*.56, .016));
        g.add(box(w*.045, .004, d*.09, screenMat('#7fb7c1'), w*.43, .446, bz + d*.56));
        g.add(cyl(.01,.01,.004,chrome(),w*.43,.453,bz+d*.48,12));
      }
      break;
    }
    case 'vanity': {
      const vm = mat(c, {roughness:.5}), stone = mat('#fafafa', {roughness:.18}), nb = w >= 1.1 ? 2 : 1, cd = d - .04, cm = chrome();
      g.add(rbox(w, .45, cd, vm, 0, .33, bz + cd/2, .008));
      fronts(g, -w/2 + .005, .335, w - .01, .44, d/2 - .04, nb, 2, vm, 'edge');
      g.add(rbox(w, .03, d, stone, 0, .78, 0, .006));
      const rb = Math.min(.19, w/nb*.36);
      for (let i = 0; i < nb; i++){
        const x = nb === 1 ? 0 : (i ? w/4 : -w/4);
        g.add(lathe([[0, 0], [rb*.55, 0], [rb*.85, .03], [rb, .1], [rb*.97, .12]], ceramic({side:THREE.DoubleSide}), x, .81, .03, 40), cyl(.018, .018, .003, cm, x, .812, .03, 16));
        g.add(cyl(.02, .022, .02, cm, x, .81, bz + .06, 16), tube([[x, .83, bz + .06], [x, 1.03, bz + .06], [x, 1.07, bz + .11], [x, 1.03, bz + .15]], .01, cm), rot(box(.01, .01, .06, cm, x, 1.05, bz + .04), .4));
      }
      const mw = Math.min(w*.9, nb*.7);
      g.add(rbox(mw + .02, .82, .02, glowMat('#fff7e6', '#ffe9c4', .9), 0, 1.14, bz + .01, .01), box(mw, .8, .01, mirror(), 0, 1.15, bz + .025));
      g.add(cyl(.028, .028, .12, mat('#c8b8a6', {roughness:.3}), w/2 - .08, .81, bz + .1, 16), rbox(.18, .03, .12, fabric('#e9e2d6'), -w/2 + .12, .81, .05, .012));
      break;
    }
    case 'shower': {
      const cm = chrome(), x = -w/4;
      g.add(rbox(w, .05, d, mat('#f4f4f2', {roughness:.3}), 0, 0, 0, .01), box(w*.6, .003, .05, mat('#9aa1a8', {metalness:.8, roughness:.3}), 0, .05, bz + .08));
      [[w, .01, 0, d/2 - .005], [.01, d, w/2 - .005, 0]].forEach(([gw, gd, px, pz]) => { const p = box(gw, 1.95, gd, glassMat, px, .05, pz); p.castShadow = false; g.add(p); });
      g.add(box(.02, 1.95, .02, frameMat, w/2 - .01, .05, d/2 - .01), box(.02, 1.95, .03, frameMat, -w/2 + .01, .05, d/2 - .005), box(.03, 1.95, .02, frameMat, w/2 - .005, .05, bz + .01));
      g.add(box(w, .015, .02, frameMat, 0, 1.985, d/2 - .005), box(.02, .015, d, frameMat, w/2 - .005, 1.985, 0));
      g.add(rbox(.14, .1, .04, cm, x, 1.0, bz + .02, .01), rod([x, 1.1, bz + .03], [x, 1.95, bz + .03], .012, cm));
      g.add(tube([[x, 1.95, bz + .03], [x, 2.02, bz + .06], [x, 2.03, bz + .22]], .01, cm), rbox(.24, .012, .24, cm, x, 2.02, bz + .25, .004));
      g.add(rot(cyl(.015, .02, .2, cm, x + .1, 1.25, bz + .05, 16), .25), blob(.03, .012, .03, cm, x + .1, 1.47, bz + .08, 16));
      g.add(box(.26, .012, .1, ceramic(), w/2 - .2, 1.2, bz + .05));
      [['#e6dccd', .03, .18], ['#2f5d62', .025, .15], ['#f4f4f2', .028, .12]].forEach(([cc, r, hh], i) => g.add(cyl(r, r, hh, mat(cc, {roughness:.3}), w/2 - .28 + i*.07, 1.212, bz + .05, 16)));
      break;
    }
    case 'bathtub': {
      const cer = ceramic(), h = .56, t = .07, cm = chrome();
      g.add(shell(w, d, h, t, .14, cer), box(w - .1, .12, d - .1, cer, 0, 0, 0), box(w - 2*t + .004, .004, d - 2*t + .004, mat('#bfe0ea', {roughness:.03, transparent:true, opacity:.6}), 0, .4, 0));
      const fx = w/2 - t/2;
      g.add(tube([[fx, h - .02, 0], [fx, h + .1, 0], [fx - .06, h + .13, 0], [fx - .13, h + .09, 0]], .014, cm));
      [-1, 1].forEach(s => g.add(cyl(.02, .02, .04, cm, fx, h, s*.1, 16)));
      g.add(rot(rbox(.08, .16, .3, cer, -w/2 + t + .06, h - .12, 0, .04), 0, 0, -.5), rbox(.22, .05, .16, fabric('#e9e2d6'), fx - .05, h, d/2 - .1, .02));
      break;
    }
    case 'washer': case 'dryer': {
      const bm = mat(c, {roughness:.35}), R0 = Math.min(w, d)*.25, fz = d/2 - .02;
      g.add(box(w - .02, .04, d - .04, '#8f969b', 0, 0, -.02), rbox(w, .81, d - .02, bm, 0, .04, -.01, .025));
      g.add(box(w - .04, .1, .006, lighter(c, .3), 0, .72, fz + .003), rbox(.18, .07, .01, bm, -w/2 + .12, .735, fz + .006, .004));
      g.add(box(.12, .035, .003, screenMat('#1f6f6a'), w*.14, .745, fz + .007));
      const kn = cyl(.03, .03, .02, chrome(), -w*.02, .75, fz + .016, 28); kn.rotation.x = Math.PI/2; g.add(kn);
      const dr = new THREE.Mesh(new THREE.CircleGeometry(R0, 40), mat('#1b1f22', {roughness:.6})); dr.position.set(0, .4, fz + .004); g.add(dr);
      const rg = new THREE.Mesh(new THREE.TorusGeometry(R0 + .02, .022, 14, 48), mat('#c7cfd5', {metalness:.7, roughness:.25})); rg.position.set(0, .4, fz + .016); sh(rg); g.add(rg);
      const Rs = R0*1.42, cap = new THREE.Mesh(new THREE.SphereGeometry(Rs, 32, 12, 0, Math.PI*2, 0, .78), mat(f.type === 'dryer' ? '#4a4038' : '#26343d', {roughness:.04, metalness:.2, transparent:true, opacity:.8}));
      cap.rotation.x = Math.PI/2; cap.position.set(0, .4, fz + .012 - Rs*Math.cos(.78)); g.add(cap);
      g.add(box(w - .06, .004, .003, '#b9c3ca', 0, .08, fz + .002));
      break;
    }
    case 'crib': {
      const wm = woodM(c);
      g.add(rbox(w - .09, .12, d - .09, fabric('#ffffff'), 0, .3, 0, .04), box(w - .06, .025, d - .06, wm, 0, .28));
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(([a, b]) => g.add(rbox(.045, .95, .045, wm, a*(w/2 - .022), 0, b*(d/2 - .022), .008), blob(.028, .028, .028, wm, a*(w/2 - .022), .97, b*(d/2 - .022), 14)));
      [-1, 1].forEach(s => {
        const z = s*(d/2 - .022), x = s*(w/2 - .022);
        g.add(rbox(w - .05, .035, .03, wm, 0, .88, z, .008), rbox(w - .05, .035, .03, wm, 0, .25, z, .008), rbox(.03, .035, d - .05, wm, x, .88, 0, .008), rbox(.03, .035, d - .05, wm, x, .25, 0, .008));
        for (let p = -w/2 + .09; p < w/2 - .05; p += .075) g.add(rod([p, .28, z], [p, .88, z], .009, wm, .009, 8));
        for (let p = -d/2 + .09; p < d/2 - .05; p += .075) g.add(rod([x, .28, p], [x, .88, p], .009, wm, .009, 8));
      });
      g.add(rbox(w*.5, .03, d - .14, fabric('#f3d9c9'), w*.12, .42, 0, .015), rbox(.3, .06, .2, fabric('#fbfaf7'), -w/2 + .22, .42, 0, .03));
      const bx = -w*.3 + .1, bear = '#c9a27a';
      g.add(blob(.05, .06, .045, bear, bx, .5, .12), blob(.045, .042, .04, bear, bx, .59, .12), blob(.016, .016, .01, bear, bx - .032, .625, .12), blob(.016, .016, .01, bear, bx + .032, .625, .12));
      break;
    }
    case 'beanbag': {
      const fab = mat(c, {roughness:.95});
      g.add(blob(w*.5, .3, d*.5, fab, 0, .3, 0, 40), blob(w*.42, .22, d*.22, fab, 0, .5, bz + d*.26, 32));
      break;
    }
    case 'sidetable': {
      const r = Math.min(w, d)/2, bm = blackMetal();
      g.add(lathe([[r*.55, 0], [r*.55, .012], [.03, .035], [.018, .3], [.025, .5], [.08, .52]], bm, 0, 0, 0, 40), cyl(r, r*.98, .025, mat(c, {roughness:.35}), 0, .52, 0, 48));
      g.add(box(.16, .02, .12, '#4f6b8a', -r*.25, .545, 0));
      vase(g, r*.35, .545, -r*.1, .035, .12, '#e9e2d6', R, false);
      break;
    }
    case 'floorlamp': {
      const r = Math.min(w, d)/2, lm = mat(c, {roughness:.35, metalness:.5});
      g.add(lathe([[0, 0], [r*.55, 0], [r*.58, .012], [r*.5, .03], [.02, .035]], lm, 0, 0, 0, 40), rod([0, .03, 0], [0, 1.36, 0], .011, lm));
      g.add(lathe([[r*.85, 0], [r*.55, .36]], glowMat('#f6ecd9', '#ffdca0', .45), 0, 1.22, 0, 48), blob(.035, .035, .035, glowMat('#fff', '#ffe2b0', 1.2), 0, 1.36, 0, 12));
      g.add(ring(r*.85, .004, lm, 0, 1.22, 0), ring(r*.55, .004, lm, 0, 1.58, 0));
      break;
    }
    case 'island': {
      const cm = mat(c, {roughness:.45}), stone = mat('#dcd7cf', {roughness:.2}), cd = d - .3, n = Math.max(1, Math.round((w - .1)/.6)), cab = new THREE.Group(), fz = cd/2 - .03;
      cab.add(box(w - .12, .1, cd - .08, '#4a4641', 0, 0, -.04), box(w - .1, .74, cd - .03, cm, 0, .1, -.015));
      fronts(cab, -w/2 + .05, .64, w - .1, .2, fz, n, 1, cm, 'bar'); fronts(cab, -w/2 + .05, .1, w - .1, .54, fz, n, 1, cm, 'bar', .56);
      cab.rotation.y = Math.PI; cab.position.z = bz + cd/2; g.add(cab);                    // 櫃門朝 -z，+z 側留出吧台挑空
      g.add(rbox(w, .05, d, stone, 0, .84, 0, .006));
      [-1, 1].forEach(s => g.add(box(.04, .84, d, stone, s*(w/2 - .02), 0, 0)));             // 瀑布式側板
      g.add(lathe([[0, 0], [.06, 0], [.14, .06], [.15, .07]], mat('#6b543f', {roughness:.5, side:THREE.DoubleSide}), w*.22, .89, 0, 32));
      for (let k = 0; k < 4; k++) g.add(blob(.04, .04, .04, ['#d98c4a', '#9fbf5a', '#b5463a', '#e6c14f'][k], w*.22 + Math.cos(k*1.6)*.05, .935 + (k === 3 ? .04 : 0), Math.sin(k*1.6)*.05, 14));
      vase(g, -w*.25, .89, -.05, .05, .22, '#e9e2d6', R);
      break;
    }
    case 'barstool': {
      const r = Math.min(w, d)/2, bm = blackMetal(), sy = .7;
      [[1,1],[1,-1],[-1,1],[-1,-1]].forEach(([a, b]) => g.add(rod([a*r*.72, 0, b*r*.72], [a*r*.4, sy, b*r*.4], .011, bm)));
      g.add(ring(Math.SQRT2*r*(.72 - .32*.4), .008, bm, 0, .28, 0), cyl(r*.55, r*.55, .02, bm, 0, sy - .01, 0, 32));
      g.add(lathe([[0, 0], [r*.85, 0], [r*.95, .02], [r*.97, .045], [r*.9, .07], [0, .075]], mat(c, {roughness:.6}), 0, sy, 0, 40));
      break;
    }
    case 'waterheater': {
      const r = Math.min(d/2, .23), L = w - .06, yc = 1.95, zc = bz + r + .02, tm = mat(c, {roughness:.35}), cp = mat('#cfd4d8', {roughness:.4});
      const tank = mesh(new THREE.CylinderGeometry(r, r, L, 40), tm); tank.rotation.z = Math.PI/2; tank.position.set(0, yc, zc); g.add(tank);
      [-1, 1].forEach(s => g.add(blob(.035, r*.99, r*.99, cp, s*L/2, yc, zc, 32), box(.05, r*1.1, .02, '#9a9ea3', s*L*.3, yc - r*.55, bz + .01)));
      g.add(rbox(.2, .09, .02, '#e7eaec', L*.18, yc - .05, zc + r*.93, .008), box(.07, .03, .002, screenMat('#2f8f7a'), L*.18 - .04, yc - .02, zc + r*.93 + .011));
      [[-L*.3, '#3b7bbf'], [-L*.18, '#c0463a']].forEach(([x, cc]) => g.add(rod([x, yc - r*.8, zc], [x, 1.3, zc], .012, metal()), cyl(.02, .02, .03, cc, x, 1.5, zc, 12)));
      break;
    }
    case 'tv': {
      const th = w*.5625, yb = 1.2 - th/2, z = bz + .03;
      g.add(rbox(w*.6, th*.6, .03, '#222', 0, yb + th*.2, bz + .015, .01));
      g.add(rbox(w, th, .025, mat('#18181a', {roughness:.4, metalness:.3}), 0, yb, z + .01, .004), box(w - .016, th - .022, .002, screenMat('#1f2b3a'), 0, yb + .014, z + .0235), box(.04, .006, .002, '#8a8a8e', 0, yb + .004, z + .0235));
      break;
    }
    case 'aircon': {
      const am = mat(c, {roughness:.3}), h = 1.8, fz = d/2 - .005;
      g.add(rbox(w, .06, d, '#cfd3d6', 0, 0, 0, .015), rbox(w - .01, h - .06, d - .01, am, 0, .06, 0, .06));
      g.add(rbox(w - .06, 1.0, .01, mat(lighter(c, .4), {roughness:.12}), 0, .22, fz, .005), box(w - .1, .42, .01, '#3d4145', 0, 1.28, fz));
      for (let i = 0; i < 8; i++) g.add(rot(box(w - .11, .012, .03, '#e4e7ea', 0, 1.3 + i*.05, fz + .008), -.35));
      g.add(box(.1, .035, .003, mat('#101214', {emissive:'#4fb3a5', emissiveIntensity:.7}), 0, 1.12, fz + .006));
      for (let i = 0; i < 8; i++) g.add(box(w - .12, .005, .004, '#b9bfc4', 0, .09 + i*.015, fz + .002));
      break;
    }
    case 'acwall': {
      const h = .3, am = mat(c, {roughness:.3}), s = new THREE.Shape();
      s.moveTo(0, .02); s.lineTo(0, h); s.lineTo(d*.75, h); s.quadraticCurveTo(d, h, d, h*.55); s.quadraticCurveTo(d, 0, d*.55, 0); s.lineTo(.02, 0); s.lineTo(0, .02);
      const geo = new THREE.ExtrudeGeometry(s, {depth:w - .02, bevelEnabled:true, bevelThickness:.01, bevelSize:.006, bevelSegments:3, curveSegments:16});
      geo.rotateY(-Math.PI/2); geo.translate((w - .02)/2, 2.2, bz); g.add(mesh(geo, am));
      g.add(box(w - .12, .004, .07, '#3a3d40', 0, 2.19, bz + d*.55), rot(box(w - .12, .008, .06, am, 0, 2.18, bz + d*.72), .35));
      g.add(box(.06, .018, .002, mat('#101214', {emissive:'#4fb3a5', emissiveIntensity:.7}), w*.3, 2.2 + h*.5, bz + d + .007));
      for (let i = 0; i < 6; i++) g.add(box(w - .12, .003, .008, '#d5d9dc', 0, 2.2 + h + .006, bz + .03 + i*.022));
      break;
    }
    case 'dishwasher': {
      const dm = mat(c, {metalness:.55, roughness:.28}), fz = d/2 - .02;
      g.add(box(w - .01, .08, d - .07, '#3a3834', 0, 0, -.035), box(w - .005, .76, d - .03, '#8b9095', 0, .08, -.015));
      g.add(rbox(w - .006, .7, .02, dm, 0, .085, fz, .004), box(w - .006, .055, .02, '#26282a', 0, .785, fz));
      for (let i = 0; i < 4; i++) g.add(box(.012, .006, .002, mat('#101214', {emissive:i ? '#6fd0ff' : '#7fe08a', emissiveIntensity:.8}), w*.1 + i*.03, .81, fz + .011));
      pull(g, w*.6, false, 0, .74, fz + .01);
      break;
    }
    case 'ovencol': {
      const cm = mat(c, {roughness:.5}), h = 2.1, fz = d/2 - .02, frm = mat('#1c1d1f', {roughness:.3, metalness:.5}), gl = mat('#0b0c0d', {roughness:.03, metalness:.6});
      g.add(box(w - .02, .08, d - .06, '#4a4641', 0, 0, -.03), box(w, h - .08, d - .02, cm, 0, .08, -.01));
      fronts(g, -w/2, .08, w, .6, fz, 1, 2, cm, 'bar'); fronts(g, -w/2, 1.78, w, h - 1.8, fz, 1, 1, cm, 'bar', 1.84);
      [[.7, .58], [1.3, .46]].forEach(([y, ah]) => {
        g.add(box(w - .02, ah - .01, .02, frm, 0, y, fz + .01), box(w - .1, ah*.52, .003, gl, 0, y + ah*.1, fz + .021), box(w - .04, .06, .003, '#2a2c2e', 0, y + ah - .075, fz + .021));
        g.add(box(.08, .022, .002, mat('#101214', {emissive:'#ff9a3c', emissiveIntensity:.7}), 0, y + ah - .056, fz + .023));
        pull(g, w*.7, false, 0, y + ah*.72, fz + .02);
      });
      break;
    }
    case 'purifier': {
      const pm = mat(c, {roughness:.45}), h = .72;
      g.add(rbox(w, h, d, pm, 0, 0, 0, Math.min(w, d)*.2), rbox(w - .05, .006, d - .05, '#8d959b', 0, h - .002, 0, .02));
      for (let i = 0; i < 7; i++) g.add(box(w - .07, .004, .006, '#6f777d', 0, h + .002, -d/2 + .05 + i*(d - .1)/6));
      g.add(rbox(w - .06, .42, .006, fabric('#c8ccd0'), 0, .06, d/2 - .001, .01));
      const rg = new THREE.Mesh(new THREE.TorusGeometry(.03, .004, 8, 32), mat('#101214', {emissive:'#4fb3a5', emissiveIntensity:.8})); rg.position.set(0, .6, d/2 + .002); g.add(rg);
      break;
    }
    case 'officechair': {
      const r = Math.min(w, d)*.46, dk = darker(c, .75), bm = mat('#2b2b2d', {roughness:.45}), cm = chrome();
      for (let k = 0; k < 5; k++){
        const a = k*Math.PI*2/5, tx = Math.sin(a)*r*.95, tz = Math.cos(a)*r*.95;
        g.add(rod([0, .1, 0], [tx, .07, tz], .022, bm, .014, 10), cyl(.008, .008, .03, bm, tx, .04, tz, 8), rot(cyl(.026, .026, .03, '#111', tx, .026 - .015, tz, 16), 0, a, Math.PI/2));
      }
      g.add(cyl(.05, .06, .05, bm, 0, .08, 0, 20), cyl(.025, .025, .22, cm, 0, .12, 0, 16), cyl(.036, .036, .12, bm, 0, .12, 0, 16), rbox(.22, .05, .22, bm, 0, .34, .02, .01));
      g.add(rbox(w*.78, .03, d*.72, bm, 0, .38, .04, .01), rbox(w*.8, .08, d*.74, fabric(c), 0, .4, .05, .035));
      g.add(tube([[0, .36, 0], [0, .38, bz + .12], [0, .6, bz + .07]], .02, bm));
      const bf = shell(w*.72, .6, .03, .025, .08, bm); bf.rotation.x = Math.PI/2 - .12; bf.position.set(0, .88, bz + .06); g.add(bf);
      g.add(rot(box(w*.68, .56, .006, mat(dk, {roughness:.85, transparent:true, opacity:.88, side:THREE.DoubleSide}), 0, .6, bz + .085), -.12), rot(rbox(w*.5, .08, .03, fabric(c), 0, .66, bz + .11, .015), -.12));
      g.add(rod([-.05, 1.14, bz + .025], [-.05, 1.22, bz + .015], .008, bm), rod([.05, 1.14, bz + .025], [.05, 1.22, bz + .015], .008, bm), rbox(w*.45, .12, .05, fabric(dk), 0, 1.2, bz + .02, .025));
      [-1, 1].forEach(s => g.add(box(.035, .22, .035, bm, s*w*.4, .42, .04), rbox(.07, .03, d*.4, bm, s*w*.4, .63, .04, .012)));
      break;
    }
    case 'piano': {
      const pk = mat(c, {roughness:.12, metalness:.1}), bd = d*.5, kz = bz + bd, h = 1.25, kd = d*.22 - .03, iv = mat('#faf8f3', {roughness:.3}), eb = mat('#111', {roughness:.25}), kw = (w - .12)/52;
      g.add(box(w, h, bd, pk, 0, 0, bz + bd/2), rbox(w + .02, .03, bd + .03, pk, 0, h, bz + bd/2 + .01, .008));
      [-1, 1].forEach(s => g.add(rbox(.06, .13, kd + .06, pk, s*(w/2 - .03), .6, kz + (kd + .06)/2, .01), box(.05, .6, .05, pk, s*(w/2 - .08), 0, kz + kd + .01), box(.06, .04, d - bd, pk, s*(w/2 - .08), 0, kz + (d - bd)/2)));
      g.add(box(w - .12, .08, kd + .05, pk, 0, .6, kz + (kd + .05)/2), box(w - .12, .1, .03, pk, 0, .68, kz + .015));
      for (let i = 0; i < 52; i++){
        const x = -w/2 + .06 + kw*(i + .5); g.add(box(kw - .0015, .022, kd, iv, x, .68, kz + .03 + kd/2));
        if (i < 51 && 'ACDFG'.includes('ABCDEFG'[i % 7])) g.add(box(kw*.58, .02, kd*.62, eb, x + kw/2, .7, kz + .03 + kd*.31));
      }
      g.add(rot(box(w*.42, .18, .012, pk, 0, .84, kz + .012), -.25));
      [-.06, 0, .06].forEach(x => g.add(box(.025, .012, .07, mat('#c9a35a', {metalness:.9, roughness:.3}), x, .05, kz + .03)));
      const mt = cyl(.0, .05, .2, woodM('#5a3e2b'), w*.3, h + .03, bz + bd/2, 4); mt.rotation.y = Math.PI/4; g.add(mt);
      g.add(rot(box(.14, .18, .015, woodM('#c9a27a'), -w*.3, h + .03, bz + .06), -.15), rot(box(.11, .14, .002, '#9fb3c2', -w*.3, h + .05, bz + .07), -.15));
      break;
    }
    case 'treadmill': {
      const tm = mat(c, {roughness:.55}), bm = mat('#2a2a2c', {roughness:.5}), al = mat('#9a9ea3', {metalness:.6, roughness:.4});
      g.add(rbox(w, .14, d - .25, tm, 0, .03, .125, .03), box(w - .16, .006, d - .5, '#141414', 0, .17, .15));
      [-1, 1].forEach(s => g.add(box(.07, .008, d - .45, al, s*(w/2 - .05), .17, .15)));
      [bz + .06, d/2 - .06].forEach(z => [-1, 1].forEach(s => g.add(box(.06, .03, .06, bm, s*(w/2 - .06), 0, z))));
      g.add(rbox(w, .22, .32, tm, 0, 0, bz + .16, .05));
      [-1, 1].forEach(s => g.add(rod([s*(w/2 - .06), .15, bz + .2], [s*(w/2 - .06), 1.15, bz + .3], .025, bm, .022), tube([[s*(w/2 - .06), 1.0, bz + .28], [s*(w/2 - .06), 1.0, bz + .5], [s*(w/2 - .07), .97, bz + .62]], .018, bm)));
      const cg = new THREE.Group(); cg.position.set(0, 1.2, bz + .31); cg.rotation.x = -.5;
      cg.add(rbox(w*.8, .2, .08, bm, 0, -.1, 0, .02), box(w*.4, .11, .004, screenMat('#2a5d8f'), 0, -.055, .041)); g.add(cg);
      break;
    }
    default: g.add(box(w, .8, d, c));
  }
  g.position.set(wx(f.cx), bayCushionHeightOffset(f), wz(f.cy));
  g.rotation.y = -f.rot * Math.PI/180;       // 平面順時針旋轉 → 繞 Y 軸負向
  g.userData.fid = f.id;
  return g;
}

/* ======================= 建築 ======================= */
// Dispose scene-owned geometry/materials; GLB assets belong to the shared model cache.
function clearGroup(g){
  const sharedMaterials=new Set([...matCache.values(),...Object.values(floorMats),glassMat,wallMat,capMat,frameMat,edgeMat,skirtMat].filter(Boolean));
  const disposedGeometries=new Set(),disposedMaterials=new Set();
  g.traverse(o=>{
    let parent=o;
    while(parent&&parent!==g){if(parent.userData?.fid && o!==parent && parent.userData?.sharedModel)return;parent=parent.parent;}
    if(o.geometry&&!disposedGeometries.has(o.geometry)){
      disposedGeometries.add(o.geometry);o.geometry.dispose();
    }
    for(const m of (Array.isArray(o.material)?o.material:[o.material])){
      if(m&&!sharedMaterials.has(m)&&!disposedMaterials.has(m)){
        disposedMaterials.add(m);m.dispose();
      }
    }
  });
  g.clear();
}
function wallBox([x0, y0, x1, y1], yb, yt, m){
  if (yt - yb <= .001) return;
  const o = new THREE.Mesh(new THREE.BoxGeometry(M(x1-x0), yt-yb, M(y1-y0)), m || [wallMat, wallMat, capMat, wallMat, wallMat, wallMat]);
  o.position.set(wx((x0+x1)/2), (yb+yt)/2, wz((y0+y1)/2)); o.castShadow = o.receiveShadow = true; archUp.add(o);
  // 漫遊輔助：牆體稜線 + 踢腳線，讓相鄰牆面、牆角一眼可分（僅漫遊模式顯示）
  const ln = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry), edgeMat); ln.position.copy(o.position); ln.userData.walkOnly = true; ln.visible = opt.mode === 'walk'; archUp.add(ln);
  if (yb <= .001){
    const p = o.geometry.parameters, sh = Math.min(.12, yt), sk = new THREE.Mesh(new THREE.BoxGeometry(p.width + .02, sh, p.depth + .02), skirtMat);
    sk.position.set(o.position.x, sh/2, o.position.z); sk.userData.walkOnly = true; sk.visible = opt.mode === 'walk'; archUp.add(sk);
  }
}
const edgeMat = new THREE.LineBasicMaterial({color:0x6f675b}), skirtMat = new THREE.MeshStandardMaterial({color:'#8b7f6e', roughness:.6});
function shapeOf(poly, flip){ const s = new THREE.Shape(); poly.forEach(([x, y], i) => s[i ? 'lineTo' : 'moveTo'](wx(x), flip ? wz(y) : -wz(y))); return s; }

function buildArch(){
  clearGroup(archFloor); clearGroup(archUp); clearGroup(lampG); doors.length = 0; colliders = [];
  const top = opt.cut;
  ROOMS.forEach(r => {
    const m = floorMat(state.rooms[r.id].mat), bay = r.counted === false;
    const geo = bay ? new THREE.ExtrudeGeometry(shapeOf(r.poly), {depth:.45, bevelEnabled:false}) : new THREE.ShapeGeometry(shapeOf(r.poly));
    geo.rotateX(-Math.PI/2);
    const fl = new THREE.Mesh(geo, bay ? [m, mat('#e9e4da')] : m);
    fl.receiveShadow = true; fl.userData.room = r.id;
    if (bay){ fl.castShadow = true; archUp.add(fl); } else archFloor.add(fl);
    // 天花：法線朝下，只在室內仰視時可見
    const cg = new THREE.ShapeGeometry(shapeOf(r.poly, true)); cg.rotateX(Math.PI/2);
    const ceil = new THREE.Mesh(cg, mat('#fbfaf7', {roughness:1})); ceil.position.y = H; ceil.visible = top >= H; archUp.add(ceil);
    if (r.at){
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .02, 32), new THREE.MeshStandardMaterial({color:'#fff', emissive:'#fff2d6', emissiveIntensity:.3}));
      lamp.position.set(wx(r.at[0]), H - .012, wz(r.at[1])); lamp.visible = top >= H; lampG.add(lamp);
      const pl = new THREE.PointLight(0xffd9a8, 0, 7, 1.6); pl.position.set(wx(r.at[0]), H - .25, wz(r.at[1])); lampG.add(pl);
    }
  });
  [...DOORS, ...SLIDES].forEach(d => { const [x0, y0, x1, y1] = d.rect; const s = box(M(x1-x0), .012, M(y1-y0), mat('#d8d0c0', {roughness:.3}), wx((x0+x1)/2), 0, wz((y0+y1)/2)); s.castShadow = false; archFloor.add(s); });
  // 使用者窗戶會實際切開相鄰牆段，並在開口中建立玻璃及窗框。
  const userWindows = state.furniture.filter(f => f.type.startsWith('window'));
  const userDoors = state.furniture.filter(f => f.type.startsWith('door'));
  // 凸窗不是貼在牆上的玻璃：先在牆面切開洞口，再將「兩側實牆 + 窗台 + 頂板 + 外側窗框」整體推向室外。
  // 以房間多邊形檢查內外側，避免不同方位外牆的凸窗都往同一方向伸出。
  const insideRoom = (px, py) => ROOMS.some(room => {
    const polygon = room.poly;
    if (!polygon || polygon.length < 3) return false;
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i], b = polygon[j];
      if (((a[1] > py) !== (b[1] > py)) &&
          px < (b[0] - a[0]) * (py - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside;
  });
  const addBayWindow = (f, horiz, wall = null) => {
    const isProject = f.type === 'windowproject';
    const width = M(f.w), projection = Math.max(.35, M(f.d));
    const sill = isProject ? .85 : .48, head = 2.35;
    const wallThickness = wall ? M(horiz ? Math.abs(wall[3]-wall[1]) : Math.abs(wall[2]-wall[0])) : .18;
    const wallHalf = Math.max(.06, wallThickness / 2);
    // 垂直牆 local +Z = -X；水平牆 local +Z = +Y（平面座標）。
    const normalX = horiz ? 0 : -1, normalY = horiz ? 1 : 0;
    const probe = Math.max(300, (wallThickness * 1000) / 2 + 200);
    const insidePlus = insideRoom(f.cx + normalX * probe, f.cy + normalY * probe);
    const insideMinus = insideRoom(f.cx - normalX * probe, f.cy - normalY * probe);
    // 僅一側是室內時，朝另一側突出。兩側同為室內／室外時可透過 180° 旋轉翻轉。
    const manualFlip = ((Math.round((f.rot || 0) / 180) % 2) + 2) % 2 === 1;
    const outward = insidePlus !== insideMinus ? (insidePlus ? -1 : 1) : (manualFlip ? -1 : 1);
    const group = new THREE.Group();
    group.position.set(wx(f.cx), 0, wz(f.cy));
    group.rotation.y = horiz ? 0 : -Math.PI / 2;
    const put = (w, h, d, x, y, z, material) => {
      if (h <= .001) return;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), material);
      mesh.position.set(x,y,z * outward);
      mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh);
    };
    const wallFinish = mat('#aba499', {roughness:.94});
    const plaster = mat('#d4d0c9', {roughness:.85});
    const sillMat = mat('#e9e5de', {roughness:.7});
    const outerZ = wallHalf + projection;
    const returnDepth = projection + wallHalf;
    const returnMid = (outerZ - wallHalf) / 2 + wallHalf;
    const cheek = .13; // 兩側向室外延伸的實體牆（不再是整面側玻璃）
    const innerWidth = Math.max(.3, width - cheek * 2);
    // 下段外凸實牆：延伸到地面，外觀看起來是建築外牆真正向外折出。
    if (isProject) {
      put(width, sill, .13, 0, sill/2, outerZ - .065, wallFinish);
      put(width, .13, returnDepth, 0, .065, returnMid, wallFinish);
    }
    // 左右實體側牆與上方檐口連接原有外牆；內部開口不會被玻璃堵住。
    [-1, 1].forEach(side => {
      // 外推牆從地面延續至目前顯示的牆頂，不在窗戶上緣中斷。
      const sideHeight = isProject ? top : Math.min(head, top);
      put(cheek, sideHeight, returnDepth, side*(width/2 - cheek/2), sideHeight/2, returnMid, plaster);
    });
    // 凸窗頂部必須保持開放：不建立跨越原牆與外推窗框的水平頂板。
    // 外側過樑仍由下面的垂直牆段建立，兩側牆也維持至牆頂。
    if (isProject && top > head) {
      // 原牆窗洞上方的過樑也往外推：外側實牆與兩側牆齊平，
      // 在室內保留通往窗龕的開口，不在舊牆中心再畫一片牆。
      const lintelHeight = top - head;
      put(width, lintelHeight, cheek, 0, head + lintelHeight/2, outerZ - cheek/2, wallFinish);
      // 不建立窗龕頂部水平封板，從上方可直接看見凸窗內部。
    }
    put(width + .08, .085, returnDepth + .08, 0, sill - .042, returnMid, sillMat);
    // 窗面安裝於推出去的最外側，而不是原牆面。
    put(innerWidth, head - sill - .12, .028, 0, (head+sill)/2, outerZ - .015, glassMat);
    const paneHeight = head - sill;
    const frameDepth = .06;
    [-innerWidth/2, 0, innerWidth/2].forEach(x => {
      put(.045, paneHeight, frameDepth, x, (sill+head)/2, outerZ, frameMat);
    });
    [sill, head, sill + paneHeight*.52].forEach(y => {
      put(innerWidth + .05, .045, frameDepth, 0, y, outerZ, frameMat);
    });
    // 斷面收邊：舊外牆的洞口到凸窗之間保留可看到的窗龕。
    put(innerWidth, .06, returnDepth, 0, sill, returnMid, sillMat);
    group.userData.fid = f.id;
    archUp.add(group);
  };
  const placedBayWindows = new Set();
  const placedStandardWindows = new Set();
  const addUserWindow = (f, horiz, wall = null) => {
    if (f.type === 'windowbay' || f.type === 'windowproject') {
      if (!placedBayWindows.has(f.id)) { addBayWindow(f, horiz, wall); placedBayWindows.add(f.id); }
      return;
    }
    const sill = f.type === 'windowwide' ? .05 : .85, head = 2.35, gh = head - sill;
    const L = M(f.w), cx = wx(f.cx), cz = wz(f.cy);
    placedStandardWindows.add(f.id);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(horiz ? L : .025, gh, horiz ? .025 : L), glassMat);
    pane.position.set(cx, sill + gh/2, cz); archUp.add(pane);
    const n = f.type === 'window' ? 1 : f.type === 'windowcorner' ? 3 : 2;
    for (let k=0;k<=n;k++){
      const t = -L/2 + k*L/n, frame = new THREE.Mesh(new THREE.BoxGeometry(horiz ? .045 : .045, gh, horiz ? .045 : .045), frameMat);
      frame.position.set(cx + (horiz ? t : 0), sill + gh/2, cz + (horiz ? 0 : t)); archUp.add(frame);
    }
    [sill, head].forEach(y => { const frame = new THREE.Mesh(new THREE.BoxGeometry(horiz ? L : .045, .045, horiz ? .045 : L), frameMat); frame.position.set(cx,y,cz); archUp.add(frame); });
  };
  // 共用的鉸鏈式開門模型：依 2D 符號讓門片相對門洞開啟 90°。
  // 可掛在世界座標，亦可掛在已旋轉的斜牆群組中。
  const addSwingDoor = (f, parent, cx, cz, localAngle = 0, width = M(f.w)) => {
    const entry = f.type === 'doorentry';
    const frameMaterial = mat(entry ? '#514239' : '#947357');
    const leafThickness = entry ? .065 : .045;
    const h = Math.min(2.08, top);
    const base = new THREE.Group();
    base.position.set(cx, 0, cz);
    base.rotation.y = localAngle;
    parent.add(base);
    const hinge = new THREE.Group();
    hinge.position.x = -width / 2;
    // THREE.js 的 +Y 旋轉將門片由本地 +X 方向轉往 -Z，與 2D 的向上開門符號一致。
    hinge.rotation.y = Math.PI / 2;
    base.add(hinge);
    const panel = new THREE.Mesh(new THREE.BoxGeometry(width, h, leafThickness), woodM(f.color || (entry ? '#755942' : '#b78b63')));
    panel.position.set(width / 2, h / 2, 0);
    panel.castShadow = true;
    panel.userData.fid = f.id;
    hinge.add(panel);
    const handle = new THREE.Mesh(new THREE.SphereGeometry(.045, 10, 10), metal());
    handle.position.set(Math.max(.08, width - .13), Math.min(1.02, h - .08), leafThickness / 2 + .03);
    handle.userData.fid = f.id;
    hinge.add(handle);
    // 門框門楣沿原牆中心線，不跟著門扇旋轉。
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(width, .06, .085), frameMaterial);
    lintel.position.y = Math.min(2.1, top);
    base.add(lintel);
    return base;
  };
  const addUserDoor = (f, horiz) => {
    const L = M(f.w), cx = wx(f.cx), cz = wz(f.cy), thick = Math.max(M(f.d), .04);
    if (f.type === 'dooropen' || f.type === 'doorentry') {
      addSwingDoor(f, archUp, cx, cz, -(f.rot || 0) * Math.PI / 180, L);
      return;
    }
    const leafMat = f.type === 'doorglass'  ? glassMat : woodM(f.color || '#b78b63');
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(horiz ? L : thick, 2.05, horiz ? thick : L), leafMat);
    leaf.position.set(cx, 1.025, cz); archUp.add(leaf);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(.065, 16, 10), metal());
    knob.position.set(cx + (horiz ? L/2 - .13 : 0), 1.02, cz + (horiz ? thick/2 + .035 : L/2 - .13)); archUp.add(knob);
    if (['doorslide','doorglass','doorfold'].includes(f.type)) { const line = new THREE.Mesh(new THREE.BoxGeometry(horiz ? L : .03, .05, horiz ? .03 : L), frameMat); line.position.set(cx,2.1,cz); archUp.add(line); }
  };
  // 新牆體與舊牆使用同一個定位資料。斜牆門窗沿中心線切開牆面，
  // 空白部分依窗台／過樑高度保留實體牆，避免 3D 被完整牆擋住。
  const placementLines=wallCentreLines(WALLS,ANGLED_WALLS,state.demolished);
  ANGLED_WALLS.forEach(w=>{
    const a=w.start,b=w.end,L=Math.hypot(b.x-a.x,b.y-a.y),height=Math.min(top,(w.height||2800)/1000);
    if(L<100||height<=0)return;
    const line=placementLines.find(l=>l.id===w.id && !l.legacy) || {p:a,q:b,thickness:w.thickness};
    const openings=[...userWindows,...userDoors]
      .map(f=>openingInterval(f,line)).filter(Boolean).sort((a,b)=>a.start-b.start);
    const group=new THREE.Group();
    group.position.set(wx(a.x),0,wz(a.y));
    group.rotation.y=-Math.atan2(b.y-a.y,b.x-a.x);
    archUp.add(group);
    const thick=M(w.thickness);
    const wallPart=(start,end,low,high)=>{
      if(end-start<2||high-low<.005)return;
      const mesh=new THREE.Mesh(new THREE.BoxGeometry(M(end-start),high-low,thick),wallMat);
      mesh.position.set(M((start+end)/2),(low+high)/2,0);
      mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
    };
    let cursor=0;
    openings.forEach(({f,start,end})=>{
      if(end<=cursor+1)return;
      wallPart(cursor,start,0,height);
      const isDoor=f.type.startsWith('door');
      if(!isDoor){placedStandardWindows.add(f.id);placedBayWindows.add(f.id);}
      const sill=isDoor?0:f.type==='windowwide'?.05:f.type==='windowbay'?.48:.85;
      const head=isDoor?2.1:2.35;
      wallPart(start,end,0,Math.min(sill,height));
      wallPart(start,end,head,height);
      const mid=M((start+end)/2), width=M(end-start);
      if(isDoor){
        if (f.type === 'dooropen' || f.type === 'doorentry') {
          // 斜牆群組已依牆角旋轉，門片直接使用牆面本地座標。
          addSwingDoor(f, group, mid, 0, 0, width);
        } else {
          const frame=new THREE.Mesh(new THREE.BoxGeometry(width,.055,.08),frameMat);
          frame.position.set(mid,Math.min(head,height),0);group.add(frame);
          const panel=new THREE.Mesh(new THREE.BoxGeometry(width,Math.min(2.05,height),.04),woodM(f.color||'#ab886b'));
          panel.position.set(mid,Math.min(2.05,height)/2,0);panel.userData.fid=f.id;group.add(panel);
        }
      }else{
        const low=Math.min(sill,height),high=Math.min(head,height);
        if(high>low){
          const pane=new THREE.Mesh(new THREE.BoxGeometry(width,high-low,.026),glassMat);
          pane.position.set(mid,(low+high)/2,0);pane.userData.fid=f.id;group.add(pane);
          const frameV=(x)=>{const v=new THREE.Mesh(new THREE.BoxGeometry(.045,high-low,.07),frameMat);v.position.set(x,(low+high)/2,0);group.add(v);};
          frameV(mid-width/2);frameV(mid+width/2);
          for(const y of [low,high]){const h=new THREE.Mesh(new THREE.BoxGeometry(width,.05,.07),frameMat);h.position.set(mid,y,0);group.add(h);}
        }
      }
      cursor=Math.max(cursor,end);
    });
    wallPart(cursor,L,0,height);
  });
  const junctions=new Map();
  ANGLED_WALLS.forEach(w=>{for(const p of [w.start,w.end]){const key=`${p.x.toFixed(1)}:${p.y.toFixed(1)}`;const item=junctions.get(key)||{p,r:0,n:0};item.r=Math.max(item.r,w.thickness/2000);item.n++;junctions.set(key,item);}});
  junctions.forEach(({p,r,n})=>{if(n<2)return;const height=Math.min(top,2.8);const mesh=new THREE.Mesh(new THREE.CylinderGeometry(r,r,height,16),wallMat);mesh.position.set(wx(p.x),height/2,wz(p.y));mesh.castShadow=mesh.receiveShadow=true;archUp.add(mesh);});
  WALLS.forEach((w, i) => {
    if (state.demolished.includes('w'+i)) return;
    const horiz = Math.abs(w[2]-w[0]) >= Math.abs(w[3]-w[1]), axis0 = horiz ? Math.min(w[0],w[2]) : Math.min(w[1],w[3]), axis1 = horiz ? Math.max(w[0],w[2]) : Math.max(w[1],w[3]);
    const wins = [...userWindows, ...userDoors].filter(f => {
      const near = horiz ? Math.abs(f.cy-(w[1]+w[3])/2) < Math.max(180, Math.abs(w[3]-w[1])*1.5) : Math.abs(f.cx-(w[0]+w[2])/2) < Math.max(180, Math.abs(w[2]-w[0])*1.5);
      const a = horiz ? f.cx : f.cy; return near && a+f.w/2 > axis0 && a-f.w/2 < axis1;
    }).sort((a,b) => (horiz ? a.cx-b.cx : a.cy-b.cy));
    if (!wins.length) { wallBox(w, 0, w[4] === 'low' ? Math.min(1, top) : top); colliders.push([wx(w[0]), wz(w[1]), wx(w[2]), wz(w[3])]); return; }
    let cursor = axis0;
    wins.forEach(f => {
      const a = Math.max(axis0, (horiz ? f.cx : f.cy)-f.w/2), b = Math.min(axis1, (horiz ? f.cx : f.cy)+f.w/2);
      if (a > cursor) wallBox(horiz ? [cursor,w[1],a,w[3]] : [w[0],cursor,w[2],a], 0, top);
      const isDoor = f.type.startsWith('door'), sill = isDoor ? 0 : (f.type === 'windowbay' ? .48 : f.type === 'windowproject' ? .85 : f.type === 'windowwide' ? .05 : .85), head = isDoor ? 2.1 : 2.35;
      wallBox(horiz ? [a,w[1],b,w[3]] : [w[0],a,w[2],b], 0, Math.min(sill,top));
      // 突出牆體窗戶的上方牆段已在凸窗最外側建立，不能留在原牆面。
      if (top > head && f.type !== 'windowproject') wallBox(horiz ? [a,w[1],b,w[3]] : [w[0],a,w[2],b], head, top);
      isDoor ? addUserDoor(f,horiz) : addUserWindow(f,horiz,w); cursor = Math.max(cursor,b);
    });
    if (cursor < axis1) wallBox(horiz ? [cursor,w[1],axis1,w[3]] : [w[0],cursor,w[2],axis1], 0, top);
  });
  // JSON 原有的窗戶原本處在牆段之間的開口中，未必與任何 WALLS
  // 重疊。將它們轉為家具後，仍要建立獨立玻璃與窗框，以供 3D 顯示。
  userWindows.filter(f => !['windowbay','windowproject'].includes(f.type) &&
    !placedStandardWindows.has(f.id))
    .forEach(f => addUserWindow(f, Math.abs(((f.rot || 0) % 180) + 180) % 180 !== 90));
  // 未嵌入現有牆體的飄窗也必須可見（例如從家具庫直接拖到空地）。
  userWindows.filter(f => (f.type === 'windowbay' || f.type === 'windowproject') && !placedBayWindows.has(f.id))
    .forEach(f => addBayWindow(f, Math.abs((f.rot || 0) % 180) !== 90));
  // 門洞及推拉門上方的過樑，僅依目前房型資料產生。
  // 禁止使用固定的三房格局座標，否則空白房型會在建築物外出現漂浮牆。
  [...DOORS.map(d => [d.rect, 2.1]), ...SLIDES.map(s => [s.rect, s.v ? 2.4 : 2.1])]
    .forEach(([r, h]) => { if (top > h) wallBox(r, h, top); });
  WINS.forEach((r, i) => {
    const sill = i === 0 ? 1.4 : i >= 6 ? .45 : .9, head = 2.4;
    wallBox(r, 0, Math.min(sill, top)); if (top > head) wallBox(r, head, top);
    colliders.push([wx(r[0]), wz(r[1]), wx(r[2]), wz(r[3])]);
    const gTop = Math.min(head, top); if (gTop <= sill) return;
    const [x0, y0, x1, y1] = r, hz = (x1-x0) >= (y1-y0), L = M(hz ? x1-x0 : y1-y0), gh = gTop - sill, cx = wx((x0+x1)/2), cz = wz((y0+y1)/2);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(hz ? L : .01, gh, hz ? .01 : L), glassMat); pane.position.set(cx, sill + gh/2, cz); pane.userData.initialWindow=i; archUp.add(pane);
    const n = Math.max(1, Math.round(L/.9));
    for (let k = 0; k <= n; k++){ const t = -L/2 + k*L/n, mu = new THREE.Mesh(new THREE.BoxGeometry(hz ? .04 : .06, gh, hz ? .06 : .04), frameMat);
      mu.position.set(cx + (hz ? t : 0), sill + gh/2, cz + (hz ? 0 : t)); mu.userData.initialWindow=i; mu.castShadow = true; archUp.add(mu); }
    [sill + .02, gTop - .02].forEach(y => { const tr = new THREE.Mesh(new THREE.BoxGeometry(hz ? L : .06, .04, hz ? .06 : L), frameMat); tr.position.set(cx, y, cz); tr.userData.initialWindow=i; archUp.add(tr); });
  });
  DOORS.forEach((d, initialDoorIndex) => {
    const pivot = new THREE.Group(), L = M(d.len), dh = Math.min(2.05, top);
    pivot.position.set(wx(d.h[0]), 0, wz(d.h[1]));
    const leaf = box(L, dh, .04, mat(d.entry ? '#6b4f3a' : '#efe6d8', {roughness:.5}), L/2);
    const plate = box(.13, .13, .018, metal(), L - .14, Math.min(1, dh - .06), .032);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(.055, 16, 10), metal()); knob.position.set(L - .14, Math.min(1, dh - .05), .075); knob.scale.z = .65;
    leaf.userData.initialDoor = plate.userData.initialDoor = knob.userData.initialDoor = initialDoorIndex;
    pivot.add(leaf, plate, knob);
    const ang = v => Math.atan2(-v[1], v[0]), door = {pivot, a0:ang(d.c), a1:ang(d.o), open:true};
    if (door.a1 - door.a0 > Math.PI) door.a1 -= Math.PI*2; if (door.a0 - door.a1 > Math.PI) door.a1 += Math.PI*2;
    door.cur = door.a1; pivot.rotation.y = door.cur; leaf.userData.door = knob.userData.door = door;
    doors.push(door); archUp.add(pivot);
  });
  SLIDES.forEach(({rect:[x0, y0, x1, y1], v}) => {
    const L = M(v ? y1-y0 : x1-x0), ph = Math.min(v ? 2.4 : 2.1, top), pl = L*.55;
    [[-1, -.02], [1, .02]].forEach(([s, off]) => {
      const c = s < 0 ? -L/2 + pl/2 : L/2 - pl/2, x = v ? wx((x0+x1)/2) + off : wx(x0) + L/2 + c, z = v ? wz(y0) + L/2 + c : wz((y0+y1)/2) + off;
      const p = new THREE.Mesh(new THREE.BoxGeometry(v ? .02 : pl, ph, v ? pl : .02), glassMat); p.position.set(x, ph/2, z); archUp.add(p);
      [ph - .03, .03].forEach(y => { const fr = new THREE.Mesh(new THREE.BoxGeometry(v ? .04 : pl, .05, v ? pl : .04), frameMat); fr.position.set(x, y, z); archUp.add(fr); });
      [-1, 1].forEach(e => { const fr = new THREE.Mesh(new THREE.BoxGeometry(.04, ph, .04), frameMat); fr.position.set(v ? x : x + e*pl/2, ph/2, v ? z + e*pl/2 : z); archUp.add(fr); });
    });
  });
  applyLight(); applyGrow();
}

function buildFurn(){
  transform?.detach();
  clearGroup(furnG);
  state.furniture.filter(f => !f.type.startsWith('window') && !f.type.startsWith('door')).forEach(f => {
    if(f.type==='customglb'){
      const holder=new THREE.Group();holder.userData.fid=f.id;
      holder.position.set(wx(f.cx),0,wz(f.cy));holder.rotation.y=-f.rot*Math.PI/180;
      furnG.add(holder);
      const sourceGroup=furnG;
      loadCustomFurniture(f).then(model=>{
        // An async load must not insert old furniture after a layout switch.
        if(holder.parent!==sourceGroup)return;
        holder.userData.sharedModel=true;holder.add(model);
        model.traverse(o=>{if(o.isMesh)o.userData.fid=f.id;});
      }).catch(e=>{
        if(holder.parent!==sourceGroup)return;
        console.warn('GLB 載入失敗',f.name,e);
        // Visible fallback rather than a silently missing object; stays selectable.
        const w=Math.max(.2,M(f.w)), d=Math.max(.2,M(f.d));
        const missing=new THREE.Mesh(
          new THREE.BoxGeometry(w,Math.max(.4,M(f.modelHeight||800)),d),
          new THREE.MeshBasicMaterial({color:'#db675c',wireframe:true,depthTest:true})
        );
        missing.position.y=Math.max(.4,M(f.modelHeight||800))/2;
        missing.userData.fid=f.id;
        holder.add(missing);
        holder.userData.modelError=e.message;
      });
    }else furnG.add(buildFurniture(f));
  });
  // 窗戶的外觀由建築群組生成；此透明熱區只負責 3D 射線選取。
  state.furniture.filter(f => f.type.startsWith('window') || f.type.startsWith('door')).forEach(f => {
    const g = new THREE.Group(), hit = new THREE.Mesh(
      new THREE.BoxGeometry(M(f.w), 2.45, Math.max(M(f.d) * 3, .12)),
      new THREE.MeshBasicMaterial({transparent:true, opacity:0, depthWrite:false})
    );
    g.add(hit); g.position.set(wx(f.cx), 1.2, wz(f.cy)); g.rotation.y = -f.rot * Math.PI/180; g.userData.fid = f.id;
    furnG.add(g);
  });
  furnG.visible = opt.furn; selKey = null; applyGrow();updateSel();
}

function buildLabels(){
  labelG.children.slice().forEach(o => { o.element.remove(); labelG.remove(o); });
  ROOMS.filter(r => r.at).forEach(r => {
    const el = document.createElement('div'); el.className = 'rlabel';
    el.innerHTML = `${esc(nm(state.rooms[r.id].name))}<small>${area(r.poly).toFixed(1)}m²</small>`;
    const o = new CSS2DObject(el); o.position.set(wx(r.at[0]), opt.cut + .15, wz(r.at[1])); o.visible = labelG.visible; labelG.add(o);
  });
  const counted = ROOMS.filter(r => r.counted !== false);
  $('#roomList').innerHTML = counted.map(r => `<button data-room="${r.id}"><span>${esc(nm(state.rooms[r.id].name))}</span><small>${area(r.poly).toFixed(2)} m²</small></button>`).join('')
    + `<button data-room="__all"><span>${tr('全屋', 'Whole home')}</span><small>${counted.reduce((a, r) => a + area(r.poly), 0).toFixed(2)} m²</small></button>`;
  document.querySelectorAll('#roomList button').forEach(b => b.onclick = () => {
    document.querySelectorAll('#roomList button').forEach(x => x.classList.toggle('on', x === b));
    if (opt.mode === 'walk') setMode('orbit');
    b.dataset.room === '__all' ? flyTo(isoWhole()) : flyToRoom(b.dataset.room);
  });
}

// 只重建變化的部分
function sync(force){
  if (!inited || (!active && !force)) return;
  const a = JSON.stringify([state.rooms, state.demolished, state.archVersion, state.furniture.filter(f => f.type.startsWith('window') || f.type.startsWith('door')), opt.cut]), f = JSON.stringify(state.furniture), l = JSON.stringify([state.rooms, opt.cut]);
  if (force || a !== sigArch){ sigArch = a; buildArch(); }
  if (force || f !== sigFurn){ sigFurn = f; buildFurn(); }
  if (force || l !== sigLabels){ sigLabels = l; buildLabels(); }
}

// CSS2DRenderer 只看標籤自身的 visible，不繼承父級，所以逐個設置
function showLabels(v){ labelG.visible = v; labelG.children.forEach(o => o.visible = v); }
function applyGrow(){
  if (!inited) return;
  archUp.scale.y = Math.max(grow, .001);
  furnG.scale.y = Math.max(furnGrow, .001);
  lampG.visible = grow > .99;
}

/* ======================= 日照 / 夜景 ======================= */
function applyLight(){
  const t = (opt.hour - 6) / 12, az = Math.PI * (.15 + t*.7), el = Math.sin(Math.PI*t) * 1.05 + .15, warm = 1 - Math.sin(Math.PI*t);
  sun.position.set(Math.cos(az)*18, Math.sin(el)*20 + 3, -Math.sin(az)*10 + 8); sun.target.position.set(0, 0, 0);
  sun.color.setHSL(.09, .5 + warm*.4, .92 - warm*.12);
  sun.intensity = opt.night ? .05 : 1.4 + Math.sin(Math.PI*t)*1.6;
  hemi.intensity = opt.night ? .12 : 1.1;
  scene.background = new THREE.Color(opt.night ? 0x1c2130 : 0xf7f4ee);
  ground.material.color.set(opt.night ? 0x2a2e38 : 0xf2eee7);
  lampG.children.forEach(o => { if (o.isPointLight) o.intensity = opt.night ? 6 : 0; else o.material.emissiveIntensity = opt.night ? 2 : .3; });
  renderer.toneMappingExposure = opt.night ? 1.25 : 1.05;
  envK = opt.night ? .15 : 1; matCache.forEach(m => { if (m.envMap) m.envMapIntensity = m.userData.env*envK; });
  const h = Math.floor(opt.hour), m = Math.round((opt.hour - h)*60);
  $('#sunT').textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
}

/* ======================= 相機位姿 / 動畫 ======================= */
const ease = t => t < .5 ? 4*t*t*t : 1 - (-2*t + 2)**3/2;
const clamp01 = t => Math.max(0, Math.min(1, t));
const pose = (t, p) => ({t, p});
// 與當前 2D 視口完全重合的正俯視位姿：透視相機在該高度下，地面可視高度 = 2D 視口高度
function planPose(){
  const cx = view.x0 + SW()/2/view.s, cy = view.y0 + SH()/2/view.s, visH = SH()/view.s/1000;
  const dist = visH / 2 / Math.tan(FOV/2*Math.PI/180), t = new THREE.Vector3(wx(cx), 0, wz(cy));
  return pose(t, new THREE.Vector3(t.x, dist, t.z + 1e-4));
}
function isoFrom(P){
  const d = THREE.MathUtils.clamp(P.p.y, 5, 30), dir = new THREE.Vector3(.3, .82, .49).normalize();
  return pose(P.t.clone(), P.t.clone().addScaledVector(dir, d));
}
const isoWhole = () => pose(new THREE.Vector3(0, 0, 0), new THREE.Vector3(5.5, 15.5, 10));
const topWhole = () => pose(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 19, 1e-4));
const curPose = () => pose(orbit.target.clone(), camera.position.clone());
// 以目標點為中心做球座標插值：鏡頭沿弧線傾斜環繞，而不是直線穿越
function camTween(A, B, e){
  const t = A.t.clone().lerp(B.t, e);
  const sa = new THREE.Spherical().setFromVector3(A.p.clone().sub(A.t)), sb = new THREE.Spherical().setFromVector3(B.p.clone().sub(B.t));
  let dth = sb.theta - sa.theta; dth = Math.atan2(Math.sin(dth), Math.cos(dth));
  const s = new THREE.Spherical(sa.radius + (sb.radius - sa.radius)*e, sa.phi + (sb.phi - sa.phi)*e, sa.theta + dth*e);
  camera.position.copy(t).add(new THREE.Vector3().setFromSpherical(s)); camera.lookAt(t); orbit.target.copy(t);
}
function setPose(P){ camera.position.copy(P.p); orbit.target.copy(P.t); camera.lookAt(P.t); }
function animate(dur, fn){ return new Promise(res => { anim = {t0:performance.now(), dur, fn, res}; }); }
const wait = ms => new Promise(r => setTimeout(r, ms));
function flyTo(B, dur = 900){ fly = {t0:performance.now(), dur, A:curPose(), B}; }
function flyToRoom(id){
  const r = ROOMS.find(r => r.id === id), xs = r.poly.map(p => p[0]), ys = r.poly.map(p => p[1]);
  const t = new THREE.Vector3(wx((Math.min(...xs)+Math.max(...xs))/2), .6, wz((Math.min(...ys)+Math.max(...ys))/2));
  const size = M(Math.max(Math.max(...xs)-Math.min(...xs), Math.max(...ys)-Math.min(...ys)));
  const dir = camera.position.clone().sub(orbit.target).setY(0); if (dir.lengthSq() < .01) dir.set(.6, 0, .8); dir.normalize();
  const dist = size*1.3 + 2.2;
  flyTo(pose(t, new THREE.Vector3(t.x + dir.x*dist*.7, dist*1.05, t.z + dir.z*dist*.7)));
}

/* ======================= 進入 / 退出 3D ======================= */
async function enter(){
  init(); active = true;
  renderer.setSize(SW(), SH()); labelRenderer.setSize(SW(), SH()); camera.aspect = SW()/SH(); camera.updateProjectionMatrix();
  sync(true);
  opt.mode = 'orbit'; orbit.enabled = false; showLabels(false);
  const A = planPose(), B = isoFrom(A);
  grow = 0; furnGrow = 0; applyGrow(); setPose(A);
  stage.classList.add('animating');
  startLoop(); renderer.render(scene, camera);
  stage.classList.add('is3d');                       // 交叉淡入：此刻 3D 畫面與 2D 平面完全重合
  await wait(420);
  await animate(1700, t => {
    camTween(A, B, ease(clamp01(t/.85)));
    grow = ease(clamp01((t - .1)/.55));
    furnGrow = ease(clamp01((t - .45)/.5));
    applyGrow();
  });
  orbit.enabled = true; showLabels(opt.labels);
  stage.classList.remove('animating');updateSel();
}
async function exit(){
  if (opt.mode === 'walk'){ walkCtl.unlock(); stopTouchWalk(); $('#hint3d').textContent = HINT_ORBIT; $('#walkOverlay').style.display = 'none'; $('#cross').style.display = 'none';
    const dir = new THREE.Vector3(); camera.getWorldDirection(dir); orbit.target.copy(camera.position).addScaledVector(dir, 3).setY(0); opt.mode = 'orbit'; syncModeBtns(); }
  fly = null; orbit.enabled = false; showLabels(false); stage.classList.add('animating');
  const A = curPose(), B = planPose();
  await animate(1300, t => {
    camTween(A, B, ease(clamp01((t - .1)/.9)));
    furnGrow = 1 - ease(clamp01(t/.45));
    grow = 1 - ease(clamp01((t - .2)/.6));
    applyGrow();
  });
  stage.classList.remove('is3d');                    // 此刻 3D 已壓平為正俯視，與 2D 重合後淡出
  await wait(450);
  transform?.detach();active = false; cancelAnimationFrame(raf); raf = 0; lastRender=0;
  stage.classList.remove('animating');
  grow = furnGrow = 1; applyGrow();
}

/* ======================= 選取 / 拾取 ======================= */
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
function pick(e){
  if (!e) ptr.set(0, 0);
  else { const r = renderer.domElement.getBoundingClientRect(); ptr.set((e.clientX - r.left)/r.width*2 - 1, -(e.clientY - r.top)/r.height*2 + 1); }
  ray.setFromCamera(ptr, camera);
  const hits = ray.intersectObjects([...(opt.furn ? [furnG] : []), archUp, archFloor], true);
  // 先找可編輯元件；窗框／玻璃雖可能比透明選取熱區更靠近相機，仍應能選到窗戶。
  for (const h of hits){
    let o = h.object;
    while (o && !o.userData.fid && o !== scene) o = o.parent;
    if (o?.userData.fid) return {fid:o.userData.fid};
  }
  for (const h of hits){ if (h.object.userData.initialWindow !== undefined) return {initialWindow:h.object.userData.initialWindow}; }
  for (const h of hits){ if (h.object.userData.initialDoor !== undefined) return {initialDoor:h.object.userData.initialDoor, door:h.object.userData.door, dist:h.distance}; }
  // 房間地板屬於可選取項目，優先於前景牆體，確保玄關等小空間可點選。
  for (const h of hits){ if (h.object.userData.room) return {room:h.object.userData.room}; }
  for (const h of hits){
    let o = h.object;
    if (o.material === glassMat) continue;
    if (o.userData.door) return {door:o.userData.door, dist:h.distance};
    if (o.userData.room) return {room:o.userData.room};
    return null;                                     // 被牆體擋住
  }
  return null;
}
// 屏幕點 → 地面（y = 0）上的房型座標 mm；s = 該處每 mm 對應的屏幕像素，用於拖放時的幽靈圖大小
const ground0 = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function groundAt(x, y){
  if (!active || anim) return null;
  const r = renderer.domElement.getBoundingClientRect(), hit = new THREE.Vector3();
  ptr.set((x - r.left)/r.width*2 - 1, -(y - r.top)/r.height*2 + 1);
  ray.setFromCamera(ptr, camera);
  if (!ray.ray.intersectPlane(ground0, hit) || hit.distanceTo(camera.position) > 60) return null;
  // 視線先碰到牆體（或飄窗台）時，落點取碰到的位置，而不是穿過牆落到看不見的牆後
  const wall = ray.intersectObjects([archUp, archFloor], true).find(h => h.object.material !== glassMat && h.object.visible);
  if (wall && wall.distance < hit.distanceTo(camera.position) - .01) hit.set(wall.point.x, 0, wall.point.z);
  const px = v => new THREE.Vector2(v.x*r.width/2, v.y*r.height/2), a = px(hit.clone().project(camera));
  const s = Math.max(a.distanceTo(px(hit.clone().add(new THREE.Vector3(1, 0, 0)).project(camera))),
                     a.distanceTo(px(hit.clone().add(new THREE.Vector3(0, 0, 1)).project(camera)))) / 1000;
  return {x:hit.x*1000 + OX, y:hit.z*1000 + OY, s};
}
function updateSel(){
  const key = ui.sel?.kind === 'furn' ? ui.sel.id : '';
  if (key !== selKey){
    selKey = key;
    if (selHelper){ scene.remove(selHelper); selHelper.geometry.dispose(); selHelper = null; }
    const g = key && furnG.children.find(g => g.userData.fid === key);
    if (g){ selHelper = new THREE.BoxHelper(g, 0xb5653a); scene.add(selHelper); }
  }
  if (selHelper) selHelper.update();
  if(transform){const f=key&&getF(key);const group=key&&furnG.children.find(g=>g.userData.fid===key);
    if(active&&opt.mode==='orbit'&&studio.tool!=='off'&&group&&f&&!String(f.type).startsWith('window')&&!String(f.type).startsWith('door')){
      if(transform.object!==group)transform.attach(group);
      transformFid=key;transform.setMode(studio.tool);
    }else {transform.detach();transformFid=null;}
  }
}

/* ======================= 漫遊 ======================= */
// 觸屏漫遊：左下虛擬搖桿移動，在畫面上拖曳轉向（iPad 不支持滑鼠指針鎖定）
const HINT_ORBIT = () => COARSE ? tr('單指旋轉 · 雙指縮放 / 平移 · 點選家具後可拖曳擺放 · 點擊門片開關', '1 finger orbits · 2 fingers zoom / pan · select furniture to drag it · tap doors to open')
  : tr('滑鼠滑鼠左鍵旋轉 · 滑鼠滑鼠右鍵平移 · 滾輪縮放 · 選取家具後拖曳可擺放 · 點擊門開關', 'Left-drag orbits · right-drag pans · scroll zooms · select furniture to drag it · click doors to open');
const HINT_TOUCHWALK = () => tr('左下搖桿移動 · 拖曳畫面轉向 · 點擊門片開關', 'Joystick moves · drag to look · tap doors to open');
const HINT_WALK = () => tr('WASD 移動 · 滑鼠轉向 · Shift 快走 · E 開關門 · Esc 暫停', 'WASD moves · mouse looks · Shift runs · E opens doors · Esc pauses');
function syncHint3d(){ $('#hint3d').textContent = opt.mode === 'orbit' ? HINT_ORBIT() : touchWalk ? HINT_TOUCHWALK() : HINT_WALK(); }
let touchWalk = false;
const joy = {x:0, y:0, id:null}, eul = new THREE.Euler(0, 0, 0, 'YXZ');
function lookBy(dx, dy){
  eul.setFromQuaternion(camera.quaternion);
  eul.y += dx * .005; eul.x = THREE.MathUtils.clamp(eul.x + dy * .005, -1.35, 1.35);
  camera.quaternion.setFromEuler(eul);
}
function startTouchWalk(){
  touchWalk = true;
  $('#walkOverlay').style.display = 'none'; $('#joy').style.display = 'block'; $('#walkExit').style.display = 'block';
  syncHint3d();
}
function stopTouchWalk(){
  touchWalk = false; joy.x = joy.y = 0; joy.id = null; $('#joy i').style.transform = '';
  $('#joy').style.display = 'none'; $('#walkExit').style.display = 'none';
}
function bindJoystick(){
  const el = $('#joy'), knob = $('#joy i'), R = 50;
  const upd = e => {
    const r = el.getBoundingClientRect();
    let dx = e.clientX - (r.left + r.width/2), dy = e.clientY - (r.top + r.height/2);
    const L = Math.hypot(dx, dy); if (L > R){ dx *= R/L; dy *= R/L; }
    joy.x = dx/R; joy.y = dy/R; knob.style.transform = `translate(${dx}px,${dy}px)`;
  };
  el.addEventListener('pointerdown', e => { e.preventDefault(); joy.id = e.pointerId; el.setPointerCapture(e.pointerId); upd(e); });
  el.addEventListener('pointermove', e => { if (e.pointerId === joy.id) upd(e); });
  const end = e => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', end);
}
function setMode(m){
  if (anim) return;
  opt.mode = m; syncModeBtns();
  if (m === 'walk'){
    select(null);
    if (opt.cut < H){ opt.cut = H; syncCutBtns(); sync(); }
    orbit.enabled = false; fly = null;
    camera.position.set(wx(4200), 1.6, wz(8755)); camera.lookAt(wx(7000), 1.5, wz(8755));   // 入口門外
    $('#walkOverlay').style.display = 'flex';
    syncHint3d();
  } else {
    walkCtl.unlock(); stopTouchWalk(); orbit.enabled = true;
    $('#walkOverlay').style.display = 'none'; $('#cross').style.display = 'none';
    syncHint3d();
    orbit.target.set(0, 0, 0); flyTo(isoWhole());
  }
  showLabels(opt.labels && m === 'orbit');
  archUp.traverse(o => { if (o.userData.walkOnly) o.visible = m === 'walk'; });
}
function blocked(x, z, r = .22){
  for (const [x0, z0, x1, z1] of colliders) if (x > x0 - r && x < x1 + r && z > z0 - r && z < z1 + r) return true;
  for (const d of doors){
    const a = d.pivot.rotation.y, px = d.pivot.position.x, pz = d.pivot.position.z, ex = px + Math.cos(a)*.9, ez = pz - Math.sin(a)*.9;
    const t = clamp01(((x-px)*(ex-px) + (z-pz)*(ez-pz)) / ((ex-px)**2 + (ez-pz)**2));
    if (Math.hypot(x - (px + t*(ex-px)), z - (pz + t*(ez-pz))) < r*.8) return true;
  }
  return false;
}
function stepWalk(dt){
  if (!walkCtl.isLocked && !touchWalk) return;
  const sp = (keys.ShiftLeft || keys.ShiftRight ? 2.6 : 1.4) * dt, fwd = new THREE.Vector3();
  camera.getWorldDirection(fwd); fwd.y = 0; fwd.normalize();
  const right = new THREE.Vector3(-fwd.z, 0, fwd.x), mv = new THREE.Vector3();
  if (keys.KeyW || keys.ArrowUp) mv.add(fwd); if (keys.KeyS || keys.ArrowDown) mv.sub(fwd);
  if (keys.KeyD || keys.ArrowRight) mv.add(right); if (keys.KeyA || keys.ArrowLeft) mv.sub(right);
  if (touchWalk){ mv.addScaledVector(fwd, -joy.y).addScaledVector(right, joy.x); }
  const mag = Math.min(1, mv.length());        // 搖桿推得越遠走得越快
  if (mag < .05) return;
  mv.normalize().multiplyScalar(sp * mag);
  const p = camera.position;
  if (!blocked(p.x + mv.x, p.z)) p.x += mv.x;
  if (!blocked(p.x, p.z + mv.z)) p.z += mv.z;
}
addEventListener('keydown', e => {
  if (!active || e.target.matches('input,select,textarea')) return;
  keys[e.code] = true;
  if (opt.mode === 'walk' && e.code === 'KeyE'){ const h = pick(); if (h?.door && h.dist < 2.5) h.door.open = !h.door.open; }
});
addEventListener('keyup', e => keys[e.code] = false);

/* ======================= 工具欄 ======================= */
function syncModeBtns(){ document.querySelectorAll('#modes3d .btn').forEach(b => b.classList.toggle('on', b.dataset.mode === opt.mode)); }
function syncCutBtns(){ document.querySelectorAll('[data-cut]').forEach(b => b.classList.toggle('on', +b.dataset.cut === opt.cut)); }
function syncWalkTexts(){
  const t = COARSE
    ? [tr('點擊開始，從入口門進入', 'Tap to start at the front door'), tr('左下搖桿移動 · 在畫面上拖曳轉向', 'Joystick moves · drag on screen to look'),
       tr('點擊門片開關 · 點「退出漫遊」回到鳥瞰', 'Tap doors to open · "Exit walk" returns to orbit')]
    : [tr('點擊開始，從入口門進入', 'Click to start at the front door'),
       tr('<kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> 移動 · 滑鼠轉向 · <kbd>Shift</kbd> 快走', '<kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> move · mouse looks · <kbd>Shift</kbd> runs'),
       tr('<kbd>E</kbd> 開關正前方的門 · <kbd>Esc</kbd> 暫停', '<kbd>E</kbd> opens the door ahead · <kbd>Esc</kbd> pauses')];
  t.forEach((h, i) => $('#wo' + (i + 1)).innerHTML = h);
  syncHint3d();
}
function bindUI(){
  document.querySelectorAll('#modes3d .btn').forEach(b => b.onclick = () => setMode(b.dataset.mode));
  // 觸屏設備用搖桿漫遊；桌面端鎖定滑鼠，鎖定失敗時也退回到搖桿
  $('#walkOverlay').onclick = () => COARSE ? startTouchWalk() : walkCtl.lock();
  document.addEventListener('pointerlockerror', () => { if (active && opt.mode === 'walk') startTouchWalk(); });
  $('#walkExit').onclick = () => setMode('orbit');
  bindJoystick();
  syncWalkTexts();
  $('#vIso').onclick = () => { if (opt.mode === 'walk') setMode('orbit'); else flyTo(isoWhole()); };
  $('#vTop').onclick = () => { if (opt.mode === 'walk') setMode('orbit'); flyTo(topWhole()); };
  document.querySelectorAll('[data-cut]').forEach(b => b.onclick = () => { if (opt.mode === 'walk') return; opt.cut = +b.dataset.cut; syncCutBtns(); sync(); });
  document.querySelectorAll('#toggles3d .btn').forEach(b => b.onclick = () => {
    const k = b.dataset.t; opt[k] = !opt[k]; b.classList.toggle('on', opt[k]);
    if (k === 'furn'){ furnG.visible = opt.furn; if (!opt.furn && ui.sel?.kind === 'furn') select(null); }
    if (k === 'labels') showLabels(opt.labels && opt.mode === 'orbit' && !anim);
    if (k === 'night') applyLight();
  });
  $('#sun').oninput = e => { opt.hour = +e.target.value; applyLight(); };
}

/* ======================= 主循環 ======================= */
const clock = new THREE.Clock();
function startLoop(){ if (!raf){ clock.getDelta(); raf = requestAnimationFrame(loop); } }
let lastRender=0;
function loop(timestamp=0){
  raf = requestAnimationFrame(loop);
  // In a hidden tab, keep the scene idle; delta is reset so walk movement never jumps.
  if(document.hidden || !active){clock.getDelta();return;}
  const interval=COARSE?1000/30:1000/60;
  if(!anim&&!fly && timestamp-lastRender<interval)return;
  lastRender=timestamp;
  const dt = Math.min(clock.getDelta(), .05), now = performance.now();
  if (anim){ const t = clamp01((now - anim.t0)/anim.dur); anim.fn(t); if (t >= 1){ const r = anim.res; anim = null; r(); } }
  else if (fly){ const t = clamp01((now - fly.t0)/fly.dur); camTween(fly.A, fly.B, ease(t)); if (t >= 1) fly = null; }
  else if (opt.mode === 'orbit') orbit.update();
  else stepWalk(dt);
  doors.forEach(d => { const tg = d.open ? d.a1 : d.a0; d.cur += (tg - d.cur) * Math.min(1, dt*6); d.pivot.rotation.y = d.cur; });
  updateSel();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

async function shot(){ if(!await authorizeExport('3D PNG'))return; const a = document.createElement('a'); a.download = tr('房型室內設計方案', 'floor-plan-design') + '-3D.png'; a.href = renderer.domElement.toDataURL('image/png'); a.click(); }

function relang(){ syncWalkTexts(); if (inited) buildLabels(); }

registerScene({enter, exit, relang, sync:() => sync(), shot, groundAt, flyToRoom:id => active && !anim && flyToRoom(id), walking:() => active && opt.mode === 'walk'});

// 家具庫獨立預覽：沿用場景中的家具建模，不修改主場景或物件資料。
export function createFurniturePreviewModel(item) {
  if (!glassMat) glassMat = new THREE.MeshPhysicalMaterial({color:'#b9dce9',roughness:.08,transparent:true,opacity:.55,side:THREE.DoubleSide});
  if (!frameMat) frameMat = new THREE.MeshStandardMaterial({color:'#595e63',metalness:.55,roughness:.4});
  const f = {type:item[0],name:item[1],w:item[2],d:item[3],color:item[4],cx:6000,cy:5300,rot:0};
  if (f.type === 'customglb') {
    const root=new THREE.Group();
    return root; // GLB previews are loaded asynchronously by furniturePreview3d.js
  }
  if (f.type.startsWith('window') || f.type.startsWith('door')) {
    const g = new THREE.Group(), w=Math.max(.4,f.w/1000), d=Math.max(.06,f.d/1000);
    const frame = new THREE.MeshStandardMaterial({color:f.type.startsWith('door')?'#8c674d':'#59616b',roughness:.6});
    if (f.type.startsWith('door')) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(w,.0+2.08,d),frame);
      panel.position.y=1.04;g.add(panel);
    } else {
      const glass = new THREE.Mesh(new THREE.BoxGeometry(w,1.5,Math.min(d,.12)),glassMat);
      glass.position.y=1.35;g.add(glass);
      for(const x of [-w/2,w/2]){
        const bar=new THREE.Mesh(new THREE.BoxGeometry(.045,1.55,.08),frame);
        bar.position.set(x,1.35,0);g.add(bar);
      }
      for(const y of [.58,2.12]){
        const bar=new THREE.Mesh(new THREE.BoxGeometry(w+.05,.045,.08),frame);
        bar.position.y=y;g.add(bar);
      }
    }
    return g;
  }
  return buildFurniture(f);
}
