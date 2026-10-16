import {loadCustomFurniture} from '../furniture/models/modelLoader.js';
import {t, localeState} from '../i18n/index.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

let overlay, renderer, scene, camera, controls, model, frame = 0, observer;
let previewSequence = 0;
const tr = (zh, en) => {
  const loc = localeState?.locale || 'en';
  if (loc === 'en') return en;
  if (loc.startsWith('zh')) return zh;
  const res = t(en);
  return res !== en ? res : en;
};
function onEscape(e){if(e.key==='Escape')closeFurniturePreview();}
function cleanupModel() {
  if (!model) return;
  scene.remove(model);
  // Procedural objects and cached GLB clones may share mesh resources.
  // The renderer releases its own GPU resources when disposed; do not dispose shared geometry here.
  model = null;
}
export function closeFurniturePreview() {
  previewSequence++;
  if (!overlay) return;
  cancelAnimationFrame(frame);
  observer?.disconnect(); observer=null;
  cleanupModel();
  controls?.dispose(); controls=null;
  renderer?.dispose();
  renderer?.domElement.remove(); renderer=null;
  overlay.remove(); overlay=null;
  document.removeEventListener('keydown',onEscape);
}
export async function showFurniturePreview(item) {
  closeFurniturePreview();
  const requestId = previewSequence;
  overlay=document.createElement('div');
  overlay.className='furniture-preview-overlay';
  overlay.innerHTML=`<section class="furniture-preview-dialog" role="dialog" aria-modal="true" aria-label="${tr('家具 3D 預覽', 'Furniture 3D Preview')}"><header><div><strong class="furniture-preview-name"></strong><small class="furniture-preview-size"></small></div><button type="button" class="furniture-preview-close" aria-label="${tr('關閉預覽', 'Close preview')}">×</button></header><div class="furniture-preview-canvas"></div><footer>${tr('滑鼠拖曳旋轉 · 滾輪縮放 · 右鍵平移', 'Left-drag orbits · scroll zooms · right-drag pans')}</footer></section>`;
  document.body.appendChild(overlay);
  overlay.querySelector('.furniture-preview-name').textContent=window.floorplanTranslate?.(item[1]) || item[1];
  overlay.querySelector('.furniture-preview-size').textContent=`${item[2]} × ${item[3]} mm`;
  const host=overlay.querySelector('.furniture-preview-canvas');
  overlay.querySelector('.furniture-preview-close').onclick=closeFurniturePreview;
  overlay.addEventListener('pointerdown',e=>{if(e.target===overlay)closeFurniturePreview();});
  document.addEventListener('keydown',onEscape);
  scene=new THREE.Scene();scene.background=new THREE.Color('#f4f1eb');
  camera=new THREE.PerspectiveCamera(42,1,.01,100);
  try { renderer=new THREE.WebGLRenderer({antialias:true,alpha:false}); }
  catch(e){host.textContent=tr('此瀏覽器無法啟用 WebGL 3D 預覽', 'WebGL 3D preview is not supported in this browser');return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.3;
  host.appendChild(renderer.domElement);
  scene.add(new THREE.HemisphereLight('#ffffff','#bdb1a3',2.2));
  const sun=new THREE.DirectionalLight('#ffffff',2.2);sun.position.set(4,7,6);scene.add(sun);
  try{ const {createFurniturePreviewModel}=await import('../scenes/threeScene.js'); if(!renderer||!overlay||requestId!==previewSequence)return; const loaded=item[0]==='customglb' ? await loadCustomFurniture({type:'customglb',w:item[2],d:item[3],modelAssetId:item[5]}) : createFurniturePreviewModel(item); if(requestId!==previewSequence||!overlay||!renderer)return; model=loaded;}catch(e){if(requestId!==previewSequence||!overlay)return;console.error('3D preview model failed',e);host.textContent=tr('此物件目前無法產生 3D 預覽', 'Cannot generate 3D preview for this item');renderer.dispose();renderer=null;return;}
  scene.add(model);
  // 根據實際模型包圍盒縮放及置中，避免大、小型家具被裁切。
  const box=new THREE.Box3().setFromObject(model);
  const center=box.getCenter(new THREE.Vector3());
  const size=box.getSize(new THREE.Vector3());
  if(!Number.isFinite(size.x)||!Number.isFinite(size.y)||!Number.isFinite(size.z)){
    host.textContent=tr('此物件暫無可顯示的模型', 'No displayable model for this item');return;
  }
  model.position.sub(center);
  const radius=Math.max(size.length()/2,.35),distance=radius/Math.sin(THREE.MathUtils.degToRad(42/2))*1.35;
  camera.position.set(distance*.75,distance*.65,distance);
  camera.lookAt(0,0,0);camera.far=Math.max(100,distance*5);camera.updateProjectionMatrix();
  controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=true;controls.enablePan=true;
  controls.minDistance=Math.max(.25,radius*.6);controls.maxDistance=distance*4;
  function resize(){if(!renderer||!overlay)return;const w=host.clientWidth,h=host.clientHeight;if(w<1||h<1)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
  observer=new ResizeObserver(resize);observer.observe(host);resize();
  function loop(){if(!renderer||!overlay)return;frame=requestAnimationFrame(loop);controls.update();renderer.render(scene,camera);}
  loop();
}
