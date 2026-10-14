import {LIB} from '../data/catalog.js';
import {getAllModels,loadModelFile,deleteModel,refreshModelCatalog} from '../furniture/models/modelStore.js';
import {parseGLB, invalidateModelCache} from '../furniture/models/modelLoader.js';
import * as THREE from 'three';
let overlay=null;
function close(){overlay?.remove();overlay=null;}
function text(el,content){el.textContent=content;}
export async function openModelManager({onChange}={}){
  close();overlay=document.createElement('div');overlay.className='f5-overlay';
  overlay.innerHTML=`<section class="f5-dialog" role="dialog" aria-modal="true" aria-label="我的 3D 模型"><header><strong>我的 3D 模型庫</strong><button type="button" class="f5-close">×</button></header>
    <p>匯入 GLB（上限 30 MB），儲存在目前瀏覽器。模型尺寸以毫米為單位，可稍後從家具屬性調整寬深。</p>
    <label>選擇 GLB 檔案 <input class="f5-file" type="file" accept=".glb,model/gltf-binary"></label>
    <div class="f5-fields"><label>名稱 <input class="f5-name" placeholder="例如：北歐單人椅"></label><label>寬度 mm <input class="f5-width" type="number" min="50" value="1000"></label><label>深度 mm <input class="f5-depth" type="number" min="50" value="1000"></label><label>高度 mm <input class="f5-height" type="number" min="50" value="1000"></label></div>
    <button type="button" class="f5-import">匯入模型</button><div class="f5-status" role="status"></div><h4>已匯入模型</h4><div class="f5-list"></div>
    <footer>提醒：清除網站資料、更換裝置或瀏覽器後，需重新匯入 GLB。此功能不會將模型上傳至遠端伺服器。</footer></section>`;
  document.body.appendChild(overlay);
  overlay.querySelector('.f5-close').onclick=close;
  overlay.addEventListener('pointerdown',e=>{if(e.target===overlay)close();});
  const fileInput=overlay.querySelector('.f5-file'),status=overlay.querySelector('.f5-status');
  fileInput.addEventListener('change',async()=>{
    const f=fileInput.files?.[0];if(!f)return;
    overlay.querySelector('.f5-name').value=f.name.replace(/\.glb$/i,'');
    if(!/\.glb$/i.test(f.name)){text(status,'請選擇 .glb 檔案');return;}
    try{const model=await parseGLB(f),box=new THREE.Box3().setFromObject(model),s=box.getSize(new THREE.Vector3());
      const w=Math.round(s.x*1000),d=Math.round(s.z*1000),h=Math.round(s.y*1000);
      if(w>0&&w<20000)overlay.querySelector('.f5-width').value=w;
      if(d>0&&d<20000)overlay.querySelector('.f5-depth').value=d;
      if(h>0&&h<20000)overlay.querySelector('.f5-height').value=h;
      text(status,'已辨識模型大小；請確認尺寸是否正確。');
    }catch(e){text(status,'模型解析失敗：'+e.message);}
  });
  overlay.querySelector('.f5-import').onclick=async()=>{
    const f=fileInput.files?.[0];if(!f){text(status,'請先選擇 GLB');return;}
    const fields=['width','depth','height'].map(k=>Number(overlay.querySelector('.f5-'+k).value));
    if(fields.some(v=>!Number.isFinite(v)||v<50||v>30000)){text(status,'尺寸需介於 50～30000 mm');return;}
    try {await parseGLB(f);await loadModelFile(f,{name:overlay.querySelector('.f5-name').value.trim()||undefined,width:fields[0],depth:fields[1],height:fields[2]});await refreshModelCatalog(LIB);onChange?.();await renderList();text(status,'匯入成功，可在「我的 3D 模型」分類新增家具。');}
    catch(e){text(status,'匯入失敗：'+e.message);}
  };
  async function renderList(){const entries=await getAllModels(),host=overlay?.querySelector('.f5-list');if(!host)return;host.replaceChildren();
    if(!entries.length){host.textContent='尚無自訂模型';return;}
    for(const entry of entries){const row=document.createElement('div');row.className='f5-row';const label=document.createElement('span');label.textContent=`${entry.name} · ${entry.width}×${entry.depth}×${entry.height} mm · ${(entry.bytes/1024/1024).toFixed(1)} MB`;
      const remove=document.createElement('button');remove.type='button';remove.textContent='刪除';remove.onclick=async()=>{if(!confirm(`確定刪除「${entry.name}」？已放置的家具將失去模型。`))return;await deleteModel(entry.id);invalidateModelCache(entry.id);await refreshModelCatalog(LIB);onChange?.();renderList();};row.append(label,remove);host.append(row);}
  }
  try{await renderList();}catch(e){text(status,'模型庫無法開啟：'+e.message);}
}
