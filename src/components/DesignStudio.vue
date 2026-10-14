<template>
  <aside class="studio-panel" :class="{collapsed:!expanded}">
    <button class="studio-toggle" @click="expanded=!expanded" :aria-expanded="expanded">{{ $t('ui.studio.title') }} {{ expanded ? '▾' : '▴' }}</button>
    <div v-if="expanded" class="studio-body">
      <div class="studio-tabs"><button v-for="item in ['3D / 材質','方案 / 版本','估價 / 匯出']" :key="item" :class="{active:tab===item}" @click="tab=item">{{ $t(item==='3D / 材質' ? 'ui.studio.materials' : item==='方案 / 版本' ? 'ui.studio.versions' : 'ui.studio.export') }}</button></div>
      <template v-if="tab==='3D / 材質'">
        <label>{{ $t('ui.studio.tools') }} <select v-model="tool" @change="emit3d"><option value="translate">{{ $t("ui.translate.gizmo") }}</option><option value="rotate">{{ $t("ui.rotate.gizmo") }}</option><option value="scale">{{ $t("ui.scale.gizmo") }}</option><option value="off">{{ $t("ui.disable.gizmo") }}</option></select></label>
        <p class="studio-hint">{{ $t("ui.select.furniture.in.three.d.then.use.the.axis.controls.one.undo.step.is.recorded.when.the.ac") }}</p>
        <label>{{ $t('ui.studio.quality') }} <select v-model="quality" @change="emit3d"><option value="low">{{ $t("ui.power.saving") }}</option><option value="medium">{{ $t("ui.balanced") }}</option><option value="high">{{ $t("ui.high.quality") }}</option></select></label>
        <label>{{ $t('ui.studio.lighting') }} <select v-model="lighting" @change="emit3d"><option value="day">{{ $t("ui.day") }}</option><option value="evening">{{ $t("ui.evening") }}</option><option value="night">{{ $t("ui.night") }}</option></select></label>
        <label>{{ $t('ui.studio.wall.color') }} <input type="color" v-model="wallColor" @input="emit3d" /></label>
        <label>{{ $t('ui.studio.furniture.color') }} <input type="color" v-model="furnitureColor" /></label>
        <button @click="applyFurnitureColor">{{ $t("ui.apply.color.to.selected.furniture") }}</button>
        <label>{{ $t('ui.studio.floor.finish') }} <select v-model="finish"><option v-for="(m,k) in FINISHES" :key="k" :value="k">{{ $t(m.i18nKey) }}</option></select></label>
        <button @click="applyFinish">{{ $t("ui.apply.to.selected.room") }}</button><p class="studio-hint">{{ $t("ui.select.a.room.in.two.d.or.three.d.first.furniture.can.be.dragged.and.edited.using.gizmo.in.t") }}</p>
      </template>
      <template v-if="tab==='方案 / 版本'">
        <label>{{ $t('ui.studio.version.name') }} <input v-model.trim="versionName" :placeholder="$t('ui.studio.save.example')" maxlength="80" /></label>
        <button @click="saveVersion">{{ $t('ui.studio.version.save') }}</button>
        <label>{{ $t('ui.studio.version.compare') }} <select v-model="baseline"><option value="">{{ $t('ui.studio.choose') }}</option><option v-for="v in versions" :key="v.id" :value="v.id">{{v.name}} · {{v.createdAt.slice(0,10)}}</option></select></label>
        <template v-if="baseline && comparison"><p>{{ $t('ui.studio.rooms') }} {{comparison.roomsA}} → {{comparison.roomsB}}; {{ $t('ui.studio.furniture') }} {{comparison.furnitureA}} → {{comparison.furnitureB}}</p><p>{{ $t('ui.studio.delta') }} {{currency(comparison.delta)}}</p></template>
        <button :disabled="!baseline" @click="restoreVersion">{{ $t('ui.studio.version.restore') }}</button><button :disabled="!baseline" @click="deleteVersion">{{ $t('ui.studio.version.delete') }}</button>
      </template>
      <template v-if="tab==='估價 / 匯出'">
        <p>{{ $t('ui.estimate.area.caption') }} {{estimate.area.toFixed(2)}} m² · {{ $t('ui.estimate.area.note') }}</p>
        <label>{{ $t('ui.estimate.contingency') }} <select v-model.number="reserve"><option :value="0">0%</option><option :value=".1">10%</option><option :value=".15">15%</option><option :value=".2">20%</option></select></label>
        <div class="studio-total">{{ $t('ui.estimate.total.caption') }} {{currency(estimate.total)}}</div><p class="studio-hint">{{ $t('ui.estimate.assumptions') }}</p>
        <button  @click="exportEstimate">{{ $t('ui.estimate.export.csv') }}</button><button  @click="exportReport">{{ $t('ui.estimate.export.html') }}</button><button  @click="exportProject">{{ $t('ui.estimate.export.json') }}</button>
      </template>
      <p v-if="message" class="studio-message" role="status">{{message}}</p>
    </div>
  </aside>
</template>
<script setup>
import {ref,computed,onMounted,onUnmounted,nextTick} from 'vue';
import {authorizeExport} from '../services/exportAccess.js';
import {FINISHES,calculateEstimate,compareDesigns,serializeCsv,plainSnapshot,safeTitle} from '../services/designStudio.js';
import {createDesignVersions} from '../services/designVersions.js';
import {convertFromTwd,currencyCode,currencyProfile,formatCurrency} from '../i18n/currency.js';
import {localeState} from '../i18n/index.js';
let editor = null;
const expanded=ref(false),tab=ref('3D / 材質'),tool=ref('translate'),quality=ref('medium'),lighting=ref('day'),wallColor=ref('#f4f1eb'),furnitureColor=ref('#b8c3ab'),finish=ref('wood'),versionName=ref('設計方案'),reserve=ref(.1),baseline=ref(''),message=ref(''),revision=ref(0),versions=ref([]);
const manager=createDesignVersions();
const current=()=>editor?plainSnapshot(editor.state):null;
const estimate=computed(()=>{revision.value;return calculateEstimate(editor?.state||{rooms:{},furniture:[]},{contingencyRate:reserve.value});});
const comparison=computed(()=>{revision.value;const old=manager.get(baseline.value);return old?compareDesigns(old,current()):null;});
const currency=v=>formatCurrency(v,localeState.locale);
const update=()=>{revision.value++;versions.value=manager.list()};
onMounted(async()=>{await nextTick();editor=await import('../editor/planEditor.js');update();window.addEventListener('floorplan:project-change',update)});onUnmounted(()=>window.removeEventListener('floorplan:project-change',update));
function emit3d(){window.dispatchEvent(new CustomEvent('floorplan:studio-3d',{detail:{tool:tool.value,quality:quality.value,lighting:lighting.value,wallColor:wallColor.value}}));}
function applyFinish(){const id=editor?.ui.sel?.kind==='room'?editor.ui.sel.id:null;if(!editor||!id||!editor.state.rooms[id]){message.value='請先選取房間';return;}const before=editor.snap();editor.state.rooms[id].mat=finish.value;editor.commit(before,'room-finish');editor.renderAll();message.value='已套用所選房間材質';}
function applyFurnitureColor(){const f=editor?.ui.sel?.kind==='furn'&&editor.getF(editor.ui.sel.id);if(!f){message.value='請先在 2D/3D 選取家具';return;}const before=editor.snap();f.color=furnitureColor.value;editor.commit(before,'furniture-finish');editor.renderAll();message.value='家具顏色已更新';}
function saveVersion(){try{if(!editor)throw Error('編輯器尚未準備完成');manager.save(versionName.value,current());update();message.value='已儲存版本';}catch(e){message.value='儲存失敗：'+e.message;}}
function restoreVersion(){const old=manager.get(baseline.value);if(!old)return; if(!confirm('將目前畫面改為所選版本？目前操作仍可 Undo。'))return;window.dispatchEvent(new CustomEvent('floorplan:studio-restore',{detail:{project:old}}));message.value='已提出版本還原';}
function deleteVersion(){manager.remove(baseline.value);baseline.value='';update();message.value='已刪除版本';}
async function file(name,blob,type){if(!await authorizeExport(name))return;const url=URL.createObjectURL(new Blob([blob],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
function exportEstimate(){const locale=localeState.locale,rows=estimate.value.rows.map(row=>({...row,unitPrice:convertFromTwd(row.unitPrice,locale),total:convertFromTwd(row.total,locale)}));file('室內設計估價.csv',serializeCsv(rows,currencyCode(locale)),'text/csv;charset=utf-8');}
function exportProject(){file(safeTitle(versionName.value)+'.json',JSON.stringify(current(),null,2),'application/json');}
function exportReport(){const e=estimate.value,profile=currencyProfile(localeState.locale);const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const rows=e.rows.map(r=>`<tr><td>${escape(r.category)}</td><td>${escape(r.name)}</td><td>${r.quantity.toFixed?.(2)??r.quantity}</td><td>${escape(r.unit)}</td><td>${currency(r.total)}</td></tr>`).join('');const html=`<!doctype html><html lang="${profile.locale}"><meta charset="utf-8"><title>室內設計概算</title><style>body{font:16px system-ui;max-width:900px;margin:40px auto}table{width:100%;border-collapse:collapse}td,th{border:1px solid #aaa;padding:8px;text-align:left}@media print{button{display:none}}</style><h1>${escape(versionName.value)} · 室內設計概算</h1><p>日期：${new Date().toLocaleDateString(profile.locale)} · 面積 ${e.area.toFixed(2)} m²</p><table><thead><tr><th>分類</th><th>品名</th><th>數量</th><th>單位</th><th>金額</th></tr></thead><tbody>${rows}</tbody></table><h2>估算總額：${currency(e.total)}</h2><p>${escape(e.assumptions)}</p><button onclick="print()">列印 / 儲存 PDF</button></html>`;file('室內設計報告.html',html,'text/html;charset=utf-8');}
</script>
<style scoped>
.studio-panel{position:fixed;right:14px;top:112px;width:min(340px,calc(100vw - 28px));z-index:120;background:#fffaf4;border:1px solid #dabfa7;border-radius:12px;box-shadow:0 8px 30px #0002;color:#483426;max-height:calc(100vh - 135px);overflow:auto}.studio-toggle{width:100%;padding:12px;border:0;background:#f4e4d4;font-weight:700;cursor:pointer;text-align:left}.studio-body{padding:12px;display:grid;gap:10px}.studio-tabs{display:flex;gap:3px}.studio-tabs button{flex:1;font-size:11px;padding:7px 3px}.studio-tabs .active{background:#b66c3f;color:white}.studio-body label{display:grid;gap:4px;font-size:13px}.studio-body input,.studio-body select{width:100%;padding:7px;border:1px solid #d0b9a5;border-radius:5px;background:white}.studio-body button{padding:8px;border:1px solid #bb8e6f;border-radius:6px;background:#fff5ed;cursor:pointer}.studio-hint{font-size:11px;color:#77685b;margin:0}.studio-total{font-weight:700;font-size:18px}.studio-message{font-size:12px;color:#00665c}.collapsed{width:auto}
</style>
