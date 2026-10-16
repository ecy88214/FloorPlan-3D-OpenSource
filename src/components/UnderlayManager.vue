<template>
  <Teleport to="body">
    <div v-if="open" class="ul-overlay" @click.self="close">
      <section class="ul-dialog" role="dialog" aria-modal="true" :aria-label="tr('底圖匯入與比例校正', 'Underlay Import & Scale Calibration')">
        <header><h2>📐 {{ tr('2D 底圖描繪', '2D Underlay Tracing') }}</h2><button type="button" @click="close" :aria-label="tr('關閉', 'Close')">✕</button></header>
        <div class="ul-scroll">
          <p class="ul-muted">{{ tr('匯入平面圖作為描繪參考，可使用尺寸辨識輔助比例校正，牆體請在 2D 編輯器中手動繪製。', 'Import a floor plan as reference. Automatic dimension recognition aids scale calibration; walls are drawn manually in 2D.') }}</p>
          <label class="ul-upload">{{ tr('底圖檔案（JPG、PNG、WEBP 或 PDF）', 'Underlay File (JPG, PNG, WEBP, or PDF)') }}<input type="file" accept="image/png,image/jpeg,image/webp,application/pdf,.pdf" @change="onFile" /></label>
          <div v-if="pdfBuffer" class="ul-line"><label>{{ tr('PDF 頁碼', 'PDF Page') }} <input type="number" min="1" :max="pdfPages" v-model.number="pdfPage" /></label><span>{{ tr(`共 ${pdfPages} 頁`, `${pdfPages} pages total`) }}</span><button type="button" @click="renderPage" :disabled="busy">{{ tr('載入頁面', 'Load Page') }}</button></div>
          <p v-if="busy" class="ul-muted" role="status">{{progressMessage || tr("處理底圖中，請稍候…", "Processing underlay, please wait…")}}</p>
          <p v-if="error" class="ul-error" role="alert">{{ error }}</p>
          <template v-if="underlay.image">
            <div class="ul-preview"><img :src="underlay.image" :alt="underlay.name || tr('平面圖底圖', 'Plan underlay')" /></div>
            <div class="ul-line"><strong>{{underlay.name}}</strong><label><input type="checkbox" v-model="underlay.visible" @change="persist" /> {{ tr('顯示底圖', 'Show underlay') }}</label></div>
            <div class="ul-line"><label>{{ tr(`透明度 ${Math.round(underlay.opacity*100)}%`, `Opacity ${Math.round(underlay.opacity*100)}%`) }} <input type="range" min="0.1" max="1" step="0.05" v-model.number="underlay.opacity" @change="persist" /></label></div>
            <div class="ul-fields"><label>{{ tr('X 座標（mm）', 'X (mm)') }}<input type="number" v-model.number="underlay.x" @change="persist" /></label><label>{{ tr('Y 座標（mm）', 'Y (mm)') }}<input type="number" v-model.number="underlay.y" @change="persist" /></label><label>{{ tr('底圖寬度（mm）', 'Underlay Width (mm)') }}<input type="number" min="1" v-model.number="underlay.width" @change="fixRatio" /></label></div>
            <div class="ul-calibration">
              <div class="ul-line"><strong>{{ tr('輔助比例校正', 'Scale Calibration') }}</strong><button type="button" class="ul-primary" :disabled="busy" @click="runAutomatic">{{busy ? tr('自動處理中…', 'Processing…') : tr('↻ 自動辨識尺寸', '↻ Auto Recognize Dimensions')}}</button></div>
              <p class="ul-muted">{{ tr('優先分析尺寸線；沒有尺寸線時，嘗試由房間面積估算比例。估算結果不能作為施工尺寸，牆體必須手動描繪。', 'Analyzes dimension lines first; falls back to room areas. Estimates cannot be used as construction dimensions; walls must be drawn manually.') }}</p>
              <p v-if="scaleMessage" :class="scaleConfirmed?'ul-success':'ul-warning'">{{scaleMessage}}</p>
              <details><summary>{{ tr('進階：手動比例校正（僅供圖面缺少尺寸時使用）', 'Advanced: Manual Scale Calibration (for plans without dimensions)') }}</summary>
              <b>{{ tr('比例校正', 'Calibration') }} {{ underlay.calibrated ? tr('✓ 已校正', '✓ Calibrated') : tr('（尚未校正）', '(Not calibrated)') }}</b>
              <p>{{ tr('按「選取兩點」後，依序在 2D 圖面點擊舊圖上的一條已知尺寸線的兩端，最後輸入實際長度（mm）。這兩次點擊不會建立牆體。', 'Click "Pick Two Points", tap both ends of a known dimension line on the 2D plan, then enter actual length (mm). No walls are created.') }}</p>
              <div class="ul-line"><button type="button" class="ul-primary" @click="beginCalibration">{{ points.length === 1 ? tr('選取第二點…', 'Pick second point…') : tr('選取兩點校正', 'Pick Two Points') }}</button><span v-if="points.length">{{ tr(`已選 ${points.length}／2 點`, `${points.length}/2 points picked`) }}</span></div>
              <div class="ul-line"><label>{{ tr('實際距離（mm）', 'Actual Distance (mm)') }}<input type="number" v-model.number="realLength" min="1" step="1" /></label><button type="button" :disabled="points.length!==2" @click="applyCalibration">{{ tr('套用比例', 'Apply Scale') }}</button></div>
              </details>
            </div>

          </template>
        </div>
        <footer><button type="button" v-if="underlay.image" @click="remove">{{ tr('移除底圖', 'Remove Underlay') }}</button><span></span><button type="button" @click="close" class="ul-primary">{{ tr('完成，開始描繪', 'Done, Start Tracing') }}</button></footer>
      </section>
    </div>
    <div v-if="calibrating" class="ul-calibration-banner">{{ tr(`請在平面圖上點擊第 ${points.length===0?'一':'二'} 個校正端點（Esc 取消）`, `Click point ${points.length===0?'1':'2'} on plan for calibration (Esc to cancel)`) }} <button @click="stopCalibration">{{ tr('取消', 'Cancel') }}</button></div>
  </Teleport>
</template>
<script setup>
import { onMounted,onUnmounted,ref,computed } from 'vue';
import { localeState, t } from '../i18n/index.js';
import { recognizeDimensions, extractDimensionScales } from '../services/autoScaleEngine.js';
import { findAreaLabels, estimateScaleFromRoomAreas } from '../services/areaScaleEngine.js';
import { underlay, restoreUnderlay, saveUnderlay, clearUnderlay, calibrateUnderlay, calibrateUnderlayFromPixels } from '../services/underlayState.js';
const isEn = computed(() => localeState.locale === 'en');
const isZh = computed(() => (localeState.locale || '').startsWith('zh'));
const tr = (zh, en) => {
  if (isEn.value) return en;
  if (isZh.value) return zh;
  const translated = t(en);
  return translated !== en ? translated : en;
};
const open=ref(false),busy=ref(false),error=ref(''),calibrating=ref(false),points=ref([]),realLength=ref(3000),pdfBuffer=ref(null),pdfPages=ref(0),pdfPage=ref(1);
let pdfDocument=null, pdfLib=null;
const progressMessage=ref(''),scaleMessage=ref(''),scaleConfirmed=ref(false);
async function makeImageData(maxEdge=1100){
  const img=new Image();img.src=underlay.image;await img.decode();
  const scale=Math.min(1,maxEdge/Math.max(img.naturalWidth,img.naturalHeight));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,canvas.width,canvas.height);
  return ctx.getImageData(0,0,canvas.width,canvas.height);
}
async function runAutomatic(){
  if(!underlay.image)return;
  busy.value=true; error.value=''; scaleMessage.value=''; scaleConfirmed.value=false;
  try {
    progressMessage.value=tr('正在辨識尺寸與比例…', 'Recognizing dimensions and scale…');
    const image=await makeImageData(1600);
    const recognition=await recognizeDimensions(image);
    const result=extractDimensionScales(image,recognition.words);
    const labels=findAreaLabels(recognition.words,recognition.rawText);
    const estimate=!result?.confident?estimateScaleFromRoomAreas(image,labels):null;
    const chosen=result?.confident?result:estimate;
    if(chosen){
      calibrateUnderlayFromPixels(chosen.mmPerPixel,image.width,image.height);
      underlay.scaleSource=estimate?'area-estimate':'dimensions';
      persist(); scaleConfirmed.value=!!result?.confident;
      scaleMessage.value=estimate
        ? tr(`依 ${estimate.areas} 筆房間面積推估約 ${estimate.mmPerPixel.toFixed(2)} mm/px。估算結果不可作為施工尺寸，請再手動量測校正。`, `Estimated ≈ ${estimate.mmPerPixel.toFixed(2)} mm/px based on ${estimate.areas} room areas. Not for construction; please calibrate manually.`)
        : tr(`已根據 ${result.matched} 筆尺寸標註校正，約 ${result.mmPerPixel.toFixed(2)} mm/px。請核對已知尺寸。`, `Calibrated ≈ ${result.mmPerPixel.toFixed(2)} mm/px based on ${result.matched} dimension annotations. Please verify known dimensions.`);
    }else scaleMessage.value=tr('未找到足夠可靠的尺寸資訊，請使用下方兩點手動比例校正。', 'No reliable dimension data found; please use two-point manual calibration below.');
  }catch(e){error.value=tr('自動辨識尺寸失敗：', 'Auto recognition failed: ')+e.message;}
  finally{busy.value=false;progressMessage.value='';}
}
function persist(){if(!saveUnderlay())error.value=tr('底圖儲存空間不足；本次可使用，但重新整理後可能需要重新匯入。', 'Storage quota exceeded; underlay works for current session but may need re-import after reload.');}
function fixRatio(){underlay.width=Math.max(1,Number(underlay.width)||1); underlay.height=underlay.width/originalAspect;persist();}
let originalAspect=4/3;
function close(){stopCalibration();open.value=false;}
function start(){open.value=true;error.value='';}
function stopCalibration(){calibrating.value=false;points.value=[];}
function beginCalibration(){open.value=false;points.value=[];calibrating.value=true;}
function capturePoint(event){
  if(!calibrating.value || event.button!==0)return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
  const svg=document.getElementById('plan'),matrix=svg?.getScreenCTM();if(!matrix)return;
  const pt=svg.createSVGPoint();pt.x=event.clientX;pt.y=event.clientY;
  const m=pt.matrixTransform(matrix.inverse());points.value=[...points.value,{x:m.x,y:m.y}];
  if(points.value.length===2){calibrating.value=false;open.value=true;}
}
function applyCalibration(){try{calibrateUnderlay(points.value[0],points.value[1],Number(realLength.value));persist();points.value=[];error.value='';}catch(e){error.value=e.message;}}
function previewImage(src,name,w,h){
  scaleMessage.value='';scaleConfirmed.value=false;
  const svg=document.getElementById('plan'),vb=svg?.viewBox?.baseVal;
  originalAspect=w/h;
  underlay.image=src;underlay.name=name;underlay.width=vb?.width ? vb.width*.75 : 8000;
  underlay.height=underlay.width/originalAspect;
  underlay.x=vb ? vb.x+(vb.width-underlay.width)/2 : 0;
  underlay.y=vb ? vb.y+(vb.height-underlay.height)/2 : 0;
  underlay.calibrated=false;underlay.visible=true;
  persist();
}
function canvasData(canvas){
  // Keep images compact enough for browsers' LocalStorage quota.
  const out=document.createElement('canvas'),factor=Math.min(1,1800/Math.max(canvas.width,canvas.height));
  out.width=Math.max(1,Math.round(canvas.width*factor));out.height=Math.max(1,Math.round(canvas.height*factor));
  out.getContext('2d').drawImage(canvas,0,0,out.width,out.height);
  return {src:out.toDataURL('image/jpeg',.78),width:out.width,height:out.height};
}
async function renderPage(){
  if(!pdfDocument)return;
  busy.value=true;error.value='';
  try {const num=Math.max(1,Math.min(pdfPages.value,Math.floor(Number(pdfPage.value)||1)));pdfPage.value=num;
    const page=await pdfDocument.getPage(num),viewport=page.getViewport({scale:1});
    const scale=Math.min(2.5,2000/Math.max(viewport.width,viewport.height));
    const v=page.getViewport({scale}),canvas=document.createElement('canvas');
    canvas.width=Math.ceil(v.width);canvas.height=Math.ceil(v.height);
    await page.render({canvasContext:canvas.getContext('2d'),viewport:v}).promise;
    const image=canvasData(canvas);previewImage(image.src,`PDF 第 ${num} 頁`,image.width,image.height);
  } catch(e){error.value=`PDF 轉換失敗：${e.message}`;} finally{busy.value=false;}
}
async function onFile(ev){
  const file=ev.target.files?.[0]; if(!file)return;ev.target.value='';
  if(file.size>25*1024*1024){error.value='請使用小於 25 MB 的底圖檔案。';return;}
  busy.value=true;error.value='';
  try {
    if(file.type==='application/pdf' || /\.pdf$/i.test(file.name)){
      // PDF.js is loaded on demand; normal image imports work without network access.
      pdfLib ??= await import(/* @vite-ignore */ 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs');
      pdfLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';
      pdfBuffer.value=await file.arrayBuffer();
      pdfDocument=await pdfLib.getDocument({data:new Uint8Array(pdfBuffer.value)}).promise;
      pdfPages.value=pdfDocument.numPages;pdfPage.value=1;
      busy.value=false;await renderPage();return;
    }
    if(!/^image\/(png|jpeg|webp)$/.test(file.type))throw new Error('僅接受 JPG、PNG、WEBP 或 PDF');
    pdfBuffer.value=null;pdfDocument=null;
    const bitmap=await createImageBitmap(file),canvas=document.createElement('canvas');
    canvas.width=bitmap.width;canvas.height=bitmap.height;canvas.getContext('2d').drawImage(bitmap,0,0);bitmap.close();
    const image=canvasData(canvas);previewImage(image.src,file.name,image.width,image.height);
  } catch(e){error.value='底圖讀取失敗：'+e.message;}finally{busy.value=false;}
}
function remove(){if(confirm('確定要移除底圖嗎？已描繪的牆體與家具不會刪除。')){clearUnderlay();stopCalibration();}}
function keydown(e){if(e.key==='Escape' && calibrating.value){stopCalibration();e.preventDefault();}else if(e.key==='Escape'&&open.value)close();}
onMounted(()=>{restoreUnderlay();window.addEventListener('floorplan:underlay',start);document.getElementById('plan')?.addEventListener('pointerdown',capturePoint,true);window.addEventListener('keydown',keydown);});
onUnmounted(()=>{window.removeEventListener('floorplan:underlay',start);document.getElementById('plan')?.removeEventListener('pointerdown',capturePoint,true);window.removeEventListener('keydown',keydown);});
</script>
