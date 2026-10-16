<template>
<header class="office-ribbon" :class="{ 'show-ribbon-labels': editorPreferences.ribbonShowLabels }">
  <div class="ribbon-topline">
    <div class="ribbon-brand"><div class="brand"><b id="brandTitle">{{ $t("ui.header.initial.title") }}</b><span id="subtitle">{{ $t("ui.header.initial.subtitle") }}</span></div></div>
    <nav class="ribbon-tabs" aria-label="功能分頁" role="tablist">
      <button v-for="tab in tabs" :key="tab.id" type="button" class="ribbon-tab" role="tab" :aria-label="$t(tab.name)" :aria-selected="activeTab === tab.id" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id"><span class="ribbon-tab-icon" aria-hidden="true">{{ tab.icon }}</span><span class="ribbon-button-text">{{ $t(tab.name) }}</span></button>
    </nav>
    <div class="ribbon-top-actions">    <div class="grp" id="langSel" role="group" aria-label="Language"><select class="locale-select" :value="localeState.locale" @change="setLocale($event.target.value)" aria-label="Language"><option v-for="item in locales" :key="item.code" :value="item.code">{{item.name}}</option></select></div><button type="button" class="btn ribbon-help-button" data-ribbon-icon="📖" :aria-label="$t('ui.user.guide')" @click="openHelp"><span class="ribbon-button-text">{{ $t("ui.user.guide") }}</span></button><button type="button" class="btn ribbon-help-button" data-ribbon-icon="⚙️" :aria-label="$t('ui.tutorial.settings.2')" @click="openGuideSettings"><span class="ribbon-button-text">{{ $t("ui.tutorial.settings.2") }}</span></button></div>
  </div>
  <div class="ribbon-content" aria-label="功能工具帶">
    <div v-show="activeTab === 'home'" class="ribbon-page ribbon-home">
      <section class="ribbon-section ribbon-home-section ribbon-layout-section" aria-label="快速房數規劃">
        <RoomLayoutPicker home />
        <span class="ribbon-section-label">{{ $t("ui.room.layout.2") }}</span>
      </section>
      <section v-for="group in homeGroups" :key="group.name" class="ribbon-section ribbon-home-section" :aria-label="$t(group.name)">
        <div class="ribbon-home-actions">
          <button v-for="item in group.actions" :key="item.label" type="button" class="btn ribbon-quick-action"
            :id="item.selector === '#undo' ? 'undo' : item.selector === '#redo' ? 'redo' : undefined"
            :class="{danger:item.danger, 'is-active':quickActive(item)}" :data-ribbon-icon="item.icon"
            :title="item.title ? $t(item.title) : $t(item.label)" :aria-label="$t(item.label)" :disabled="quickDisabled(item)"
            @click="runQuickAction(item)"><span class="ribbon-button-text">{{ $t(item.label) }}</span></button>
        </div>
        <span class="ribbon-section-label">{{ $t(group.name) }}</span>
      </section>
    </div>
    <div v-show="activeTab === 'edit'" class="ribbon-page"><section class="ribbon-section " aria-label="編輯工具">
    <div class="grp only2d" id="tools">
      <button class="btn on" data-tool="select" :title="$t('ui.select') + ' (V)'" data-ribbon-icon="↖️"><span class="ribbon-button-text">{{ $t("ui.select") }}</span></button>
      <button class="btn" data-tool="measure" :title="$t('ui.measure') + ' (M)'" data-ribbon-icon="📏"><span class="ribbon-button-text">{{ $t("ui.measure") }}</span></button>
      <button class="btn" data-tool="wallDraw" title="兩點繪製任意角度牆體，Shift 鎖定正交；靠近端點自動接合" data-ribbon-icon="🧱"><span class="ribbon-button-text">{{ $t("ui.draw.wall") }}</span></button>
      <button class="btn" data-tool="wallMove" title="拖曳移動牆體" data-ribbon-icon="✥"><span class="ribbon-button-text">{{ $t("ui.move.wall") }}</span></button>
      <button class="btn" id="splitWall" title="選取牆段後從中點分割" data-ribbon-icon="✂️"><span class="ribbon-button-text">{{ $t("ui.split.wall") }}</span></button>
      <button class="btn" data-tool="demolish" title="拆除／變更非承重牆 (X)" data-ribbon-icon="🔨"><span class="ribbon-button-text">{{ $t("ui.modify.walls") }}</span></button>
    </div>
<span class="ribbon-section-label">{{ $t("ui.edit.tools") }}</span>
</section><section class="ribbon-section" aria-label="配置管理"><div class="grp"><button class="btn danger" id="clearAll" title="清空所有家具及家電（可復原）" data-ribbon-icon="🗑️"><span class="ribbon-button-text">{{ $t("ui.clear.layout") }}</span></button></div><span class="ribbon-section-label">{{ $t("ui.layout.management") }}</span></section></div>
    <div v-show="activeTab === 'building'" class="ribbon-page"><section class="ribbon-section " aria-label="房型與尺寸">
    <RoomLayoutPicker />
    <button class="btn" id="houseSettings" data-ribbon-icon="📐"><span class="ribbon-button-text">{{ $t("ui.house.dimensions.blank.layout") }}</span></button>
    <HouseSettings />
<span class="ribbon-section-label">{{ $t("ui.layouts.dimensions") }}</span>
</section><section class="ribbon-section " aria-label="圖面圖層">
    <div class="grp only2d" id="layers">
      <button class="btn chip on" data-layer="dims" data-ribbon-icon="↔️"><span class="ribbon-button-text">{{ $t("ui.dimensions") }}</span></button>
      <button class="btn chip on" data-layer="customDimensions" title="顯示或隱藏手動量測標註" data-ribbon-icon="📏"><span class="ribbon-button-text">{{ $t("ui.measurement.lines") }}</span></button>
      <button class="btn chip on" data-layer="labels" data-ribbon-icon="🏷️"><span class="ribbon-button-text">{{ $t("ui.rooms.2") }}</span></button>
      <button class="btn chip on" data-layer="furn" data-ribbon-icon="🛋️"><span class="ribbon-button-text">{{ $t("ui.furniture") }}</span></button>
      <button class="btn chip" data-layer="grid" data-ribbon-icon="▦"><span class="ribbon-button-text">{{ $t("ui.grid") }}</span></button>
      <button class="btn chip" data-layer="bearing" data-ribbon-icon="🧱"><span class="ribbon-button-text">{{ $t("ui.load.bearing.walls") }}</span></button>
      <button class="btn chip" id="constructionMode" data-ribbon-icon="📐"><span class="ribbon-button-text">{{ $t("ui.construction.drawing") }}</span></button>
      <button class="btn chip on" data-layer="smartSnap" title="家具中心線、邊緣與其他家具自動對齊" data-ribbon-icon="🧲"><span class="ribbon-button-text">{{ $t("ui.smart.snapping") }}</span></button>
      <button class="btn chip" data-layer="diagnostics" title="檢查全圖家具碰撞、間距與狹窄通道" data-ribbon-icon="🩺"><span class="ribbon-button-text">{{ $t("ui.space.check") }}</span></button>
      <button class="btn chip on" data-layer="collisionWarnings" title="選取家具時顯示重疊及 600 mm 安全距離不足警告（可自由擺放）" data-ribbon-icon="⚠️"><span class="ribbon-button-text">{{ $t("ui.collision.alerts") }}</span></button>
      <button class="btn chip on" data-layer="wallSnap" title="拖曳家具時貼齊牆面" data-ribbon-icon="🧱"><span class="ribbon-button-text">{{ $t("ui.snap.to.walls") }}</span></button>
    </div>
<span class="ribbon-section-label">{{ $t("ui.drawing.layers") }}</span>
</section></div>
    <div v-show="activeTab === 'furniture'" class="ribbon-page"><section class="ribbon-section " aria-label="面板">
    <div class="grp" id="furnitureTransform" aria-label="自由旋轉與群組">
      <button class="btn" data-furn-rotate="-15" title="逆時針 15 度" data-ribbon-icon="↺"><span class="ribbon-button-text">-15°</span></button>
      <button class="btn" data-furn-rotate="15" title="順時針 15 度" data-ribbon-icon="↻"><span class="ribbon-button-text">+15°</span></button>
      <button class="btn" data-furn-rotate="45" title="旋轉 45 度" data-ribbon-icon="🔄"><span class="ribbon-button-text">+45°</span></button>
      <button class="btn" data-furn-rotate="custom" title="輸入任意旋轉角度" data-ribbon-icon="🎯"><span class="ribbon-button-text">{{ $t("ui.custom.angle") }}</span></button>
      <button class="btn" data-furn-group="create" title="將選取的家具建立群組" data-ribbon-icon="📦"><span class="ribbon-button-text">{{ $t("ui.create.group") }}</span></button>
      <button class="btn" data-furn-group="break" title="解除選取家具所屬群組" data-ribbon-icon="📤"><span class="ribbon-button-text">{{ $t("ui.ungroup") }}</span></button>
    </div><span class="ribbon-section-label">{{ $t("ui.rotate.group") }}</span></section><section class="ribbon-section" aria-label="家具批次排列"><div class="grp" id="furnitureArrange" aria-label="家具批次排列">
      <button class="btn" data-furn-arrange="left" title="左緣對齊" data-ribbon-icon="⇤"><span class="ribbon-button-text">{{ $t("ui.align.left") }}</span></button>
      <button class="btn" data-furn-arrange="centerX" title="水平置中" data-ribbon-icon="↔️"><span class="ribbon-button-text">{{ $t("ui.center.horizontally") }}</span></button>
      <button class="btn" data-furn-arrange="right" title="右緣對齊" data-ribbon-icon="⇥"><span class="ribbon-button-text">{{ $t("ui.align.right") }}</span></button>
      <button class="btn" data-furn-arrange="top" title="上緣對齊" data-ribbon-icon="⇡"><span class="ribbon-button-text">{{ $t("ui.align.top") }}</span></button>
      <button class="btn" data-furn-arrange="centerY" title="垂直置中" data-ribbon-icon="↕️"><span class="ribbon-button-text">{{ $t("ui.center.vertically") }}</span></button>
      <button class="btn" data-furn-arrange="bottom" title="下緣對齊" data-ribbon-icon="⇣"><span class="ribbon-button-text">{{ $t("ui.align.bottom") }}</span></button>
      <button class="btn" data-furn-arrange="distributeX" title="水平等距，至少三件" data-ribbon-icon="⋯"><span class="ribbon-button-text">{{ $t("ui.distribute.horizontally") }}</span></button>
      <button class="btn" data-furn-arrange="distributeY" title="垂直等距，至少三件" data-ribbon-icon="⋮"><span class="ribbon-button-text">{{ $t("ui.distribute.vertically") }}</span></button>
    </div><span class="ribbon-section-label">{{ $t("ui.arrange.shift.multi.select") }}</span></section><section class="ribbon-section" aria-label="面板"><div class="grp" id="paneBtns">
      <button class="btn chip" id="tgLib" data-ribbon-icon="🛋️"><span class="ribbon-button-text">{{ $t("ui.ribbon.library") }}</span></button>
      <button class="btn chip" id="tgPanel" data-ribbon-icon="📋"><span class="ribbon-button-text">{{ $t("ui.ribbon.properties") }}</span></button>
    </div>
<span class="ribbon-section-label">{{ $t("ui.panels") }}</span>
</section></div>
    <div v-show="activeTab === 'view'" class="ribbon-page"><section class="ribbon-section " aria-label="視圖">
    <div class="grp seg" id="viewSeg" title="切換 2D / 3D (T)" data-en-title="Switch 2D / 3D (T)">
      <span class="pill"></span>
      <button class="btn" data-view="2d" data-ribbon-icon="🗺️"><span class="ribbon-button-text">{{ $t("ui.two.d.plan") }}</span></button>
      <button class="btn" data-view="3d" data-ribbon-icon="🧊"><span class="ribbon-button-text">{{ $t("ui.three.d.scene") }}</span></button>
    </div>
<span class="ribbon-section-label">{{ $t("ui.view") }}</span>
</section><section class="ribbon-section " aria-label="快速顯示">
    <div class="grp only2d">
      <button class="btn" id="zoomOut" title="縮小" data-en-title="Zoom out" data-ribbon-icon="➖"><span class="ribbon-button-text">−</span></button>
      <button class="btn" id="zoomIn" title="放大" data-en-title="Zoom in" data-ribbon-icon="➕"><span class="ribbon-button-text">＋</span></button>
      <button class="btn" id="fit" title="符合視窗 (F)" data-ribbon-icon="🔍"><span class="ribbon-button-text">{{ $t("ui.fit") }}</span></button>
      <button class="btn" id="s60" title="按 1:60 顯示（與原圖同比例）" data-en-title="Show at 1:60 (same scale as the original plan)" data-ribbon-icon="📐"><span class="ribbon-button-text">1:60</span></button>
      <button class="btn" id="s100" title="按 1:100 顯示" data-en-title="Show at 1:100" data-ribbon-icon="📐"><span class="ribbon-button-text">1:100</span></button>
    </div>
<span class="ribbon-section-label">{{ $t("ui.quick.view") }}</span>
</section><section class="ribbon-section " aria-label="3D 操作">
    <div class="grp only3d" id="modes3d">
      <button class="btn on" data-mode="orbit" data-ribbon-icon="🌐"><span class="ribbon-button-text">{{ $t("ui.orbit") }}</span></button>
      <button class="btn" data-mode="walk" data-ribbon-icon="🚶"><span class="ribbon-button-text">{{ $t("ui.walk") }}</span></button>
    </div>
    <div class="grp only3d">
      <button class="btn" id="vIso" data-ribbon-icon="🧊"><span class="ribbon-button-text">{{ $t("ui.isometric") }}</span></button>
      <button class="btn" id="vTop" data-ribbon-icon="⬇️"><span class="ribbon-button-text">{{ $t("ui.top") }}</span></button>
    </div>
    <div class="grp only3d">
      <button class="btn chip on" data-cut="2.8" data-ribbon-icon="🏢"><span class="ribbon-button-text">{{ $t("ui.full.height.walls") }}</span></button>
      <button class="btn chip" data-cut="1.2" data-ribbon-icon="✂️"><span class="ribbon-button-text">{{ $t("ui.cutaway.walls") }}</span></button>
    </div>
    <div class="grp only3d" id="toggles3d">
      <button class="btn chip on" data-t="furn" data-ribbon-icon="🛋️"><span class="ribbon-button-text">{{ $t("ui.furniture") }}</span></button>
      <button class="btn chip on" data-t="labels" data-ribbon-icon="🏷️"><span class="ribbon-button-text">{{ $t("ui.room.labels") }}</span></button>
      <button class="btn chip" data-t="night" data-ribbon-icon="🌙"><span class="ribbon-button-text">{{ $t("ui.night") }}</span></button>
    </div>
    <div class="grp only3d"><label class="range"><span>{{ $t("ui.view.sunlight") }}</span> <input type="range" id="sun" min="7" max="18" step=".25" value="10" style="width:84px"><span id="sunT">10:00</span></label></div>
<span class="ribbon-section-label">{{ $t("ui.view.three.d.controls") }}</span>
</section><section class="ribbon-section " aria-label="視窗">
    <button class="btn" id="fullscreen" :title="$t('ui.view.fullscreen.tooltip')" style="border:1px solid var(--line);background:#fff" data-ribbon-icon="⛶"><span class="ribbon-button-text">{{ $t("ui.view.fullscreen") }}</span></button>
<span class="ribbon-section-label">{{ $t("ui.view.window") }}</span>
</section></div>
    <div v-show="activeTab === 'file'" class="ribbon-page"><section class="ribbon-section " aria-label="匯入與匯出">
<div class="ribbon-file-actions"><button class="btn" id="exportPng" data-ribbon-icon="🖼️"><span class="ribbon-button-text">{{ $t("ui.export.image") }}</span></button>
<button class="btn" id="exportConstruction" data-ribbon-icon="📐"><span class="ribbon-button-text">{{ $t("ui.file.export.construction") }}</span></button>
<button class="btn" id="exportJson" data-ribbon-icon="💾"><span class="ribbon-button-text">{{ $t("ui.export.project.json") }}</span></button>
<button class="btn" id="importJson" data-ribbon-icon="📂"><span class="ribbon-button-text">{{ $t("ui.file.import.plan") }}</span></button>
<button class="btn danger" id="reset" data-ribbon-icon="🔄"><span class="ribbon-button-text">{{ $t("ui.file.reset.default") }}</span></button></div>
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
 { id:'home', name:'ui.home', icon:'🏠' }, { id:'edit', name:'ui.edit', icon:'✏️' },
 { id:'building', name:'ui.building', icon:'🏗️' }, { id:'furniture', name:'ui.furniture', icon:'🛋️' },
 { id:'view', name:'ui.view', icon:'👁️' }, { id:'file', name:'ui.file', icon:'📁' }
];
const activeTab = ref('home');
function openHelp() { window.dispatchEvent(new CustomEvent('floorplan:help')); }
function openGuideSettings() { window.dispatchEvent(new CustomEvent('floorplan:guide-settings')); }
function chooseTab(event) { if (tabs.some(tab => tab.id === event.detail)) activeTab.value = event.detail; }

// 首頁為快捷入口，不複製原有按鈕 ID，也不增加新的操作邏輯。
const homeGroups = [
  { name:'ui.ribbon.common.editing', actions:[
    {label:'ui.select',icon:'↖️',selector:'[data-tool="select"]'},
    {label:'ui.undo',icon:'↩️',selector:'#undo'},
    {label:'ui.redo',icon:'↪️',selector:'#redo'},
    {label:'ui.measure',icon:'📏',selector:'[data-tool="measure"]'}
  ]},
  { name:'ui.ribbon.layouts.furniture', actions:[
    {label:'ui.house.dimensions',icon:'📐',selector:'#houseSettings'},
    {label:'ui.furniture.library',icon:'🛋️',selector:'#tgLib'},
    {label:'ui.furniture.properties',icon:'📋',selector:'#tgPanel'}
  ]},
  { name:'ui.ribbon.view.modes', actions:[
    {label:'ui.two.d.plan',icon:'🗺️',selector:'[data-view="2d"]'},
    {label:'ui.three.d.scene',icon:'🧊',selector:'[data-view="3d"]'},
    {label:'ui.fit',icon:'🔍',selector:'#fit'}
  ]},
  { name:'ui.ribbon.common.files', actions:[
    {label:'ui.export.image',icon:'🖼️',selector:'#exportPng'},
    {label:'ui.save.plan',icon:'💾',selector:'#exportJson'}
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
