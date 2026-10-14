<template>
<header class="office-ribbon" :class="{ 'show-ribbon-labels': editorPreferences.ribbonShowLabels }">
  <div class="ribbon-topline">
    <div class="ribbon-brand"><div class="brand"><b id="brandTitle">{{ $t("ui.header.initial.title") }}</b><span id="subtitle">{{ $t("ui.header.initial.subtitle") }}</span></div></div>
    <nav class="ribbon-tabs" aria-label="功能分頁" role="tablist">
      <button v-for="tab in tabs" :key="tab.id" type="button" class="ribbon-tab" role="tab" :aria-label="$t(tab.name)" :aria-selected="activeTab === tab.id" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id"><span class="ribbon-tab-icon" aria-hidden="true">{{ tab.icon }}</span><span class="ribbon-button-text">{{ $t(tab.name) }}</span></button>
    </nav>
    <div class="ribbon-top-actions">    <div class="grp" id="langSel" role="group" aria-label="Language"><select class="locale-select" :value="localeState.locale" @change="setLocale($event.target.value)" aria-label="Language"><option v-for="item in locales" :key="item.code" :value="item.code">{{item.name}}</option></select></div><button type="button" class="btn ribbon-help-button" data-ribbon-icon="?" :aria-label="$t('ui.user.guide')" @click="openHelp"><span class="ribbon-button-text">{{ $t("ui.user.guide") }}</span></button><button type="button" class="btn ribbon-help-button" data-ribbon-icon="⚙" :aria-label="$t('ui.tutorial.settings.2')" @click="openGuideSettings"><span class="ribbon-button-text">{{ $t("ui.tutorial.settings.2") }}</span></button></div>
  </div>
  <div class="ribbon-content" aria-label="功能工具帶">
    <div v-show="activeTab === 'home'" class="ribbon-page ribbon-home">
      <section class="ribbon-section ribbon-home-section ribbon-layout-section" aria-label="快速房數規劃">
        <RoomLayoutPicker home />
        <span class="ribbon-section-label">{{ $t("ui.room.layout.2") }}</span>
      </section>
      <section v-for="group in homeGroups" :key="group.name" class="ribbon-section ribbon-home-section" :aria-label="group.name">
        <div class="ribbon-home-actions">
          <button v-for="item in group.actions" :key="item.label" type="button" class="btn ribbon-quick-action"
            :id="item.selector === '#undo' ? 'undo' : item.selector === '#redo' ? 'redo' : undefined"
            :class="{danger:item.danger, 'is-active':quickActive(item)}" :data-ribbon-icon="item.icon"
            :title="item.title || item.label" :aria-label="$t(item.label)" :disabled="quickDisabled(item)"
            @click="runQuickAction(item)">{{ $t(item.label) }}</button>
        </div>
        <span class="ribbon-section-label">{{ $t(group.name) }}</span>
      </section>
    </div>
    <div v-show="activeTab === 'edit'" class="ribbon-page"><section class="ribbon-section " aria-label="編輯工具">
    <div class="grp only2d" id="tools">
      <button class="btn on" data-tool="select" title="選取 / 移動 (V)" data-ribbon-icon="↖">{{ $t("ui.select") }}</button>
      <button class="btn" data-tool="measure" title="量測 (M)" data-ribbon-icon="⌁">{{ $t("ui.measure") }}</button>
      <button class="btn" data-tool="wallDraw" title="兩點繪製任意角度牆體，Shift 鎖定正交；靠近端點自動接合" data-ribbon-icon="▰">{{ $t("ui.draw.wall") }}</button>
      <button class="btn" data-tool="wallMove" title="拖曳移動牆體" data-ribbon-icon="✥">{{ $t("ui.move.wall") }}</button>
      <button class="btn" id="splitWall" title="選取牆段後從中點分割" data-ribbon-icon="✂">{{ $t("ui.split.wall") }}</button>
      <button class="btn" data-tool="demolish" title="拆除／變更非承重牆 (X)" data-ribbon-icon="⚒">{{ $t("ui.modify.walls") }}</button>
    </div>
<span class="ribbon-section-label">{{ $t("ui.edit.tools") }}</span>
</section><section class="ribbon-section" aria-label="配置管理"><div class="grp"><button class="btn danger" id="clearAll" title="清空所有家具及家電（可復原）" data-ribbon-icon="⌫">{{ $t("ui.clear.layout") }}</button></div><span class="ribbon-section-label">{{ $t("ui.layout.management") }}</span></section></div>
    <div v-show="activeTab === 'building'" class="ribbon-page"><section class="ribbon-section " aria-label="房型與尺寸">
    <RoomLayoutPicker />
    <button class="btn" id="houseSettings" data-ribbon-icon="▣">{{ $t("ui.house.dimensions.blank.layout") }}</button>
    <HouseSettings />
<span class="ribbon-section-label">{{ $t("ui.layouts.dimensions") }}</span>
</section><section class="ribbon-section " aria-label="圖面圖層">
    <div class="grp only2d" id="layers">
      <button class="btn chip on" data-layer="dims" data-ribbon-icon="↔">{{ $t("ui.dimensions") }}</button>
      <button class="btn chip on" data-layer="customDimensions" title="顯示或隱藏手動量測標註" data-ribbon-icon="⌁">{{ $t("ui.measurement.lines") }}</button>
      <button class="btn chip on" data-layer="labels" data-ribbon-icon="▤">{{ $t("ui.rooms.2") }}</button>
      <button class="btn chip on" data-layer="furn" data-ribbon-icon="▦">{{ $t("ui.furniture") }}</button>
      <button class="btn chip" data-layer="grid" data-ribbon-icon="▦">{{ $t("ui.grid") }}</button>
      <button class="btn chip" data-layer="bearing" data-ribbon-icon="▥">{{ $t("ui.load.bearing.walls") }}</button>
      <button class="btn chip" id="constructionMode" data-ribbon-icon="▤">{{ $t("ui.construction.drawing") }}</button>
      <button class="btn chip on" data-layer="smartSnap" title="家具中心線、邊緣與其他家具自動對齊" data-ribbon-icon="⌗">{{ $t("ui.smart.snapping") }}</button>
      <button class="btn chip" data-layer="diagnostics" title="檢查全圖家具碰撞、間距與狹窄通道" data-ribbon-icon="☷">{{ $t("ui.space.check") }}</button>
      <button class="btn chip on" data-layer="collisionWarnings" title="選取家具時顯示重疊及 600 mm 安全距離不足警告（可自由擺放）" data-ribbon-icon="⚠">{{ $t("ui.collision.alerts") }}</button>
      <button class="btn chip on" data-layer="wallSnap" title="拖曳家具時貼齊牆面" data-ribbon-icon="⊞">{{ $t("ui.snap.to.walls") }}</button>
    </div>
<span class="ribbon-section-label">{{ $t("ui.drawing.layers") }}</span>
</section></div>
    <div v-show="activeTab === 'furniture'" class="ribbon-page"><section class="ribbon-section " aria-label="面板">
    <div class="grp" id="furnitureTransform" aria-label="自由旋轉與群組">
      <button class="btn" data-furn-rotate="-15" title="逆時針 15 度" data-ribbon-icon="↶">-15°</button>
      <button class="btn" data-furn-rotate="15" title="順時針 15 度" data-ribbon-icon="↷">+15°</button>
      <button class="btn" data-furn-rotate="45" title="旋轉 45 度" data-ribbon-icon="⟳">+45°</button>
      <button class="btn" data-furn-rotate="custom" title="輸入任意旋轉角度" data-ribbon-icon="◉">{{ $t("ui.custom.angle") }}</button>
      <button class="btn" data-furn-group="create" title="將選取的家具建立群組" data-ribbon-icon="▣">{{ $t("ui.create.group") }}</button>
      <button class="btn" data-furn-group="break" title="解除選取家具所屬群組" data-ribbon-icon="▧">{{ $t("ui.ungroup") }}</button>
    </div><span class="ribbon-section-label">{{ $t("ui.rotate.group") }}</span></section><section class="ribbon-section" aria-label="家具批次排列"><div class="grp" id="furnitureArrange" aria-label="家具批次排列">
      <button class="btn" data-furn-arrange="left" title="左緣對齊" data-ribbon-icon="⇤">{{ $t("ui.align.left") }}</button>
      <button class="btn" data-furn-arrange="centerX" title="水平置中" data-ribbon-icon="↔">{{ $t("ui.center.horizontally") }}</button>
      <button class="btn" data-furn-arrange="right" title="右緣對齊" data-ribbon-icon="⇥">{{ $t("ui.align.right") }}</button>
      <button class="btn" data-furn-arrange="top" title="上緣對齊" data-ribbon-icon="⇡">{{ $t("ui.align.top") }}</button>
      <button class="btn" data-furn-arrange="centerY" title="垂直置中" data-ribbon-icon="↕">{{ $t("ui.center.vertically") }}</button>
      <button class="btn" data-furn-arrange="bottom" title="下緣對齊" data-ribbon-icon="⇣">{{ $t("ui.align.bottom") }}</button>
      <button class="btn" data-furn-arrange="distributeX" title="水平等距，至少三件" data-ribbon-icon="⋯">{{ $t("ui.distribute.horizontally") }}</button>
      <button class="btn" data-furn-arrange="distributeY" title="垂直等距，至少三件" data-ribbon-icon="⋮">{{ $t("ui.distribute.vertically") }}</button>
    </div><span class="ribbon-section-label">{{ $t("ui.arrange.shift.multi.select") }}</span></section><section class="ribbon-section" aria-label="面板"><div class="grp" id="paneBtns">
      <button class="btn chip" id="tgLib" data-ribbon-icon="▤">◧ {{ $t("ui.ribbon.library") }}</button>
      <button class="btn chip" id="tgPanel" data-ribbon-icon="☷">{{ $t("ui.ribbon.properties") }} ◨</button>
    </div>
<span class="ribbon-section-label">{{ $t("ui.panels") }}</span>
</section></div>
    <div v-show="activeTab === 'view'" class="ribbon-page"><section class="ribbon-section " aria-label="視圖">
    <div class="grp seg" id="viewSeg" title="切換 2D / 3D (T)" data-en-title="Switch 2D / 3D (T)">
      <span class="pill"></span>
      <button class="btn" data-view="2d" data-ribbon-icon="▱">{{ $t("ui.two.d.plan") }}</button>
      <button class="btn" data-view="3d" data-ribbon-icon="⬡">{{ $t("ui.three.d.scene") }}</button>
    </div>
<span class="ribbon-section-label">{{ $t("ui.view") }}</span>
</section><section class="ribbon-section " aria-label="快速顯示">
    <div class="grp only2d">
      <button class="btn" id="zoomOut" title="縮小" data-en-title="Zoom out" data-ribbon-icon="−">−</button>
      <button class="btn" id="zoomIn" title="放大" data-en-title="Zoom in" data-ribbon-icon="+">＋</button>
      <button class="btn" id="fit" title="符合視窗 (F)" data-ribbon-icon="⛶">{{ $t("ui.fit") }}</button>
      <button class="btn" id="s60" title="按 1:60 顯示（與原圖同比例）" data-en-title="Show at 1:60 (same scale as the original plan)" data-ribbon-icon="◴">1:60</button>
      <button class="btn" id="s100" title="按 1:100 顯示" data-en-title="Show at 1:100" data-ribbon-icon="◷">1:100</button>
    </div>
<span class="ribbon-section-label">{{ $t("ui.quick.view") }}</span>
</section><section class="ribbon-section " aria-label="3D 操作">
    <div class="grp only3d" id="modes3d">
      <button class="btn on" data-mode="orbit" data-ribbon-icon="◉">{{ $t("ui.orbit") }}</button>
      <button class="btn" data-mode="walk" data-ribbon-icon="♟">{{ $t("ui.walk") }}</button>
    </div>
    <div class="grp only3d">
      <button class="btn" id="vIso" data-ribbon-icon="◇">{{ $t("ui.isometric") }}</button>
      <button class="btn" id="vTop" data-ribbon-icon="▱">{{ $t("ui.top") }}</button>
    </div>
    <div class="grp only3d">
      <button class="btn chip on" data-cut="2.8" data-ribbon-icon="▥">{{ $t("ui.full.height.walls") }}</button>
      <button class="btn chip" data-cut="1.2" data-ribbon-icon="◫">{{ $t("ui.cutaway.walls") }}</button>
    </div>
    <div class="grp only3d" id="toggles3d">
      <button class="btn chip on" data-t="furn" data-ribbon-icon="▦">{{ $t("ui.furniture") }}</button>
      <button class="btn chip on" data-t="labels" data-ribbon-icon="▤">{{ $t("ui.room.labels") }}</button>
      <button class="btn chip" data-t="night" data-en="Night" data-ribbon-icon="☾">夜景</button>
    </div>
    <div class="grp only3d"><label class="range"><span>{{ $t("ui.view.sunlight") }}</span> <input type="range" id="sun" min="7" max="18" step=".25" value="10" style="width:84px"><span id="sunT">10:00</span></label></div>
<span class="ribbon-section-label">{{ $t("ui.view.three.d.controls") }}</span>
</section><section class="ribbon-section " aria-label="視窗">
    <button class="btn" id="fullscreen" :title="$t('ui.view.fullscreen.tooltip')" style="border:1px solid var(--line);background:#fff" data-ribbon-icon="⛶">⛶ {{ $t("ui.view.fullscreen") }}</button>
<span class="ribbon-section-label">{{ $t("ui.view.window") }}</span>
</section></div>
    <div v-show="activeTab === 'file'" class="ribbon-page"><section class="ribbon-section " aria-label="匯入與匯出">
<div class="ribbon-file-actions"><button class="btn"  id="exportPng" data-ribbon-icon="▧">{{ $t("ui.export.image") }}</button>
<button class="btn"  id="exportConstruction" data-ribbon-icon="▤">{{ $t("ui.file.export.construction") }}</button>
<button class="btn"  id="exportJson" data-ribbon-icon="⇩">{{ $t("ui.export.project.json") }}</button>
<button class="btn" id="importJson" data-ribbon-icon="⇧">{{ $t("ui.file.import.plan") }}</button>
<button class="btn danger" id="reset" data-ribbon-icon="↺">{{ $t("ui.file.reset.default") }}</button></div>
<span class="ribbon-section-label">{{ $t("ui.file.import.export") }}</span>
</section></div>
  </div>
  <input type="file" id="fileIn" accept=".json,application/json" hidden>
</header>
</template>
<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue';
import {editorPreferences} from '../services/editorPreferences.js';
import {locales,localeState,setLocale} from '../i18n/index.js';
import RoomLayoutPicker from './RoomLayoutPicker.vue';
import HouseSettings from './HouseSettings.vue';
const tabs = [
 { id:'home', name:'首頁', icon:'⌂' }, { id:'edit', name:'編輯', icon:'✎' },
 { id:'building', name:'建築', icon:'▥' }, { id:'furniture', name:'家具', icon:'▦' },
 { id:'view', name:'檢視', icon:'◉' }, { id:'file', name:'檔案', icon:'▤' }
];
const activeTab = ref('home');
function openHelp() { window.dispatchEvent(new CustomEvent('floorplan:help')); }
function openGuideSettings() { window.dispatchEvent(new CustomEvent('floorplan:guide-settings')); }
function chooseTab(event) { if (tabs.some(tab => tab.id === event.detail)) activeTab.value = event.detail; }

// 首頁為快捷入口，不複製原有按鈕 ID，也不增加新的操作邏輯。
const homeGroups = [
  { name:'ui.ribbon.common.editing', actions:[
    {label:'選取',icon:'↖',selector:'[data-tool="select"]'},
    {label:'復原',icon:'↶',selector:'#undo'},
    {label:'重做',icon:'↷',selector:'#redo'},
    {label:'量測',icon:'⌁',selector:'[data-tool="measure"]'}
  ]},
  { name:'ui.ribbon.layouts.furniture', actions:[
    {label:'房屋尺寸',icon:'▣',selector:'#houseSettings'},
    {label:'家具庫',icon:'▦',selector:'#tgLib'},
    {label:'家具屬性',icon:'☷',selector:'#tgPanel'}
  ]},
  { name:'ui.ribbon.view.modes', actions:[
    {label:'2D 平面',icon:'▱',selector:'[data-view="2d"]'},
    {label:'3D 場景',icon:'⬡',selector:'[data-view="3d"]'},
    {label:'符合視窗',icon:'⛶',selector:'#fit'}
  ]},
  { name:'ui.ribbon.common.files', actions:[
    {label:'匯出圖片',icon:'▧',selector:'#exportPng'},
    {label:'儲存方案',icon:'⇩',selector:'#exportJson'}
  ]}
];
const version = ref(0);
let observer;
function targetFor(item) { return document.querySelector(item.selector); }
function runQuickAction(item) {
  // 復原／重做是首頁上的實際按鈕，原本編輯器會直接綁定其 click 事件。
  if (item.selector === '#undo' || item.selector === '#redo') return;
  const target=targetFor(item);
  if (target && !target.disabled) target.click();
  version.value++;
}
function quickDisabled(item) {
  version.value;
  const target=targetFor(item);
  return !target || target.disabled;
}
function quickActive(item) {
  version.value;
  const target=targetFor(item);
  if (!target) return false;
  if (item.selector==='[data-view="2d"]') return !document.body.classList.contains('m3d');
  if (item.selector==='[data-view="3d"]') return document.body.classList.contains('m3d');
  return target.classList.contains('on');
}
function syncRibbonTooltipLabels() {
  document.querySelectorAll('.office-ribbon button[data-ribbon-icon]').forEach(button => {
    const label = button.textContent.replace(/\s+/g, ' ').trim();
    if (label) button.setAttribute('aria-label', label);
  });
}
watch(() => localeState.locale, () => nextTick(syncRibbonTooltipLabels));
onMounted(() => {
  syncRibbonTooltipLabels();
  window.addEventListener('floorplan:tour-tab',chooseTab);
  observer=new MutationObserver(() => {version.value++;});
  observer.observe(document.body,{attributes:true,attributeFilter:['class']});
  for (const group of homeGroups) for (const item of group.actions) {
    const target=targetFor(item);
    if (target) observer.observe(target,{attributes:true,attributeFilter:['class','disabled']});
  }
});
onUnmounted(() => {observer?.disconnect();window.removeEventListener('floorplan:tour-tab',chooseTab);});
</script>
