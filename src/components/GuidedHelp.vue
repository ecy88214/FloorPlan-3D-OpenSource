<template>
  <Teleport to="body">
    <div v-if="tourOpen && currentRect" class="fp-tour-highlight" :style="currentRect" aria-hidden="true"></div>
    <section v-if="tourOpen" class="fp-guide-card" role="dialog" aria-modal="false" :aria-label="t('ui.guide.tour.title')">
      <div class="fp-guide-head"><strong>👋 {{ t('ui.guide.tour.title') }}</strong><button type="button" @click="closeTour" :aria-label="t('ui.guide.close.tour')">✕</button></div>
      <div class="fp-guide-count">{{ t('ui.guide.step.counter', { current: stepIndex + 1, total: steps.length }) }}</div>
      <h3>{{ step.title }}</h3><p>{{ step.description }}</p>
      <div class="fp-guide-progress"><span :style="{width:((stepIndex+1)/steps.length*100)+'%'}"></span></div>
      <div class="fp-guide-actions"><button type="button" @click="closeTour">{{ t('ui.guide.end') }}</button><span></span><button type="button" :disabled="stepIndex===0" @click="changeStep(-1)">{{ t('ui.guide.previous') }}</button><button type="button" class="primary" @click="changeStep(1)">{{ stepIndex === steps.length - 1 ? t('ui.guide.done') : t('ui.guide.next') }}</button></div>
    </section>
    <div v-if="helpOpen || settingsOpen" class="fp-help-backdrop" @click.self="closeDialogs">
      <section class="fp-help-modal" role="dialog" aria-modal="true" :aria-label="settingsOpen ? t('ui.tutorial.settings.2') : t('ui.user.guide')">
        <header><h2>{{ settingsOpen ? '⚙ ' + t('ui.tutorial.settings.2') : '📖 ' + t('ui.user.guide') }}</h2><button type="button" @click="closeDialogs" :aria-label="t('ui.close')">✕</button></header>
        <template v-if="settingsOpen">
          <div style="display:flex;flex-direction:column;gap:14px;">
            <div class="fp-settings-card">
              <div class="fp-settings-card-head">
                <strong>🎨 {{ t('ui.style.title') }}</strong>
              </div>
              <p class="fp-help-muted" style="margin:4px 0 10px 0;">{{ t('ui.style.description') }}</p>
              <div class="fp-style-grid">
                <button type="button" class="fp-style-card" :class="{ selected: editorPreferences.renderStyle !== 'handDrawn' }" @click="changeRenderStyle('default')">
                  <div class="fp-style-card-badge">📐</div>
                  <div class="fp-style-card-body">
                    <strong>{{ t('ui.style.default.name') }}</strong>
                    <p>{{ t('ui.style.default.desc') }}</p>
                  </div>
                  <div class="fp-style-check" aria-hidden="true">{{ editorPreferences.renderStyle !== 'handDrawn' ? '✓' : '' }}</div>
                </button>
                <button type="button" class="fp-style-card" :class="{ selected: editorPreferences.renderStyle === 'handDrawn' }" @click="changeRenderStyle('handDrawn')">
                  <div class="fp-style-card-badge">🎨</div>
                  <div class="fp-style-card-body">
                    <strong>{{ t('ui.style.handdrawn.name') }}</strong>
                    <p>{{ t('ui.style.handdrawn.desc') }}</p>
                  </div>
                  <div class="fp-style-check" aria-hidden="true">{{ editorPreferences.renderStyle === 'handDrawn' ? '✓' : '' }}</div>
                </button>
              </div>
            </div>
            <div class="fp-settings-card">
              <label class="fp-guide-switch">
                <input type="checkbox" :checked="editorPreferences.ribbonShowLabels" @change="toggleRibbonLabels($event.target.checked)"/>
                <span>{{ t('ui.ribbon.show.labels') }}（{{ localeState.locale.startsWith('zh') ? '圖＋文' : t('ui.ribbon.show.labels') }}）</span>
              </label>
              <p class="fp-help-muted" style="margin:6px 0 0 4px;">{{ t('ui.ribbon.show.labels.description') }}</p>
            </div>
            <div class="fp-settings-card">
              <label class="fp-guide-switch"><input type="checkbox" v-model="autoGuide" @change="savePreferences"/> <span>{{ t('ui.guide.settings.enable') }}</span></label>
              <p class="fp-help-muted" style="margin:6px 0 0 4px;">{{ t('ui.guide.settings.description') }}</p>
              <p class="fp-help-muted" style="margin:4px 0 0 4px;">{{ t('ui.guide.settings.disabled.notice') }}</p>
            </div>
          </div>
          <div class="fp-help-footer"><button type="button" @click="startTour">▶ {{ t('ui.guide.replay') }}</button><button type="button" class="primary" @click="closeDialogs">{{ t('ui.guide.done') }}</button></div>
        </template>
        <template v-else>
          <div class="fp-help-tools"><input v-model="search" :placeholder="t('ui.guide.search.placeholder')" :aria-label="t('ui.guide.search.label')"/><button type="button" @click="startTour">▶ {{ t('ui.guide.start') }}</button><button type="button" @click="openSettings">⚙ {{ t('ui.guide.settings.short') }}</button></div>
          <div class="fp-help-body">
            <article v-for="item in filteredHelp" :key="item.title" class="fp-help-topic"><h3>{{ item.title }}</h3><ol><li v-for="(line,i) in item.lines" :key="i">{{line}}</li></ol></article>
            <p v-if="!filteredHelp.length">{{ t('ui.guide.no.results') }}</p>
          </div>
          <footer><span>{{ t('ui.guide.shortcuts') }}</span><button type="button" class="primary" @click="closeDialogs">{{ t('ui.close') }}</button></footer>
        </template>
      </section>
    </div>
  </Teleport>
</template>
<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { t, localeState } from '../i18n/index.js';
import { editorPreferences, setRibbonShowLabels, setRenderStyle } from '../services/editorPreferences.js';
function toggleRibbonLabels(val) { setRibbonShowLabels(val); }
function changeRenderStyle(style) { setRenderStyle(style); }
const preferenceKey='floorplan:guide-enabled:v1';
const completedKey='floorplan:guide-seen:v1';
const tourOpen=ref(false),helpOpen=ref(false),settingsOpen=ref(false),autoGuide=ref(true),stepIndex=ref(0),currentRect=ref(null),search=ref('');
const steps = [
  {tab:"home",selector:".ribbon-tabs",titleKey:"ui.guide.tour.1.title",descriptionKey:"ui.guide.tour.1.description"},
  {tab:"home",selector:"#homeLayoutType",titleKey:"ui.guide.tour.2.title",descriptionKey:"ui.guide.tour.2.description"},
  {tab:"building",selector:"#houseSettings",titleKey:"ui.guide.tour.3.title",descriptionKey:"ui.guide.tour.3.description"},
  {tab:"edit",selector:"[data-tool=\"wallDraw\"]",titleKey:"ui.guide.tour.4.title",descriptionKey:"ui.guide.tour.4.description"},
  {tab:"furniture",selector:".lib",titleKey:"ui.guide.tour.5.title",descriptionKey:"ui.guide.tour.5.description"},
  {tab:"furniture",selector:"#furnitureArrange",titleKey:"ui.guide.tour.6.title",descriptionKey:"ui.guide.tour.6.description"},
  {tab:"furniture",selector:"#furnitureTransform",titleKey:"ui.guide.tour.7.title",descriptionKey:"ui.guide.tour.7.description"},
  {tab:"building",selector:"[data-layer=\"smartSnap\"]",titleKey:"ui.guide.tour.8.title",descriptionKey:"ui.guide.tour.8.description"},
  {tab:"view",selector:"#viewSeg",titleKey:"ui.guide.tour.9.title",descriptionKey:"ui.guide.tour.9.description"},
  {tab:"file",selector:"#exportJson",titleKey:"ui.guide.tour.10.title",descriptionKey:"ui.guide.tour.10.description"},
  {tab:"home",selector:".ribbon-help-button",titleKey:"ui.guide.tour.11.title",descriptionKey:"ui.guide.tour.11.description"}
];
const topics = [
  { titleKey: "ui.guide.topic.1.title", lineKeys: ["ui.guide.topic.1.line.1", "ui.guide.topic.1.line.2", "ui.guide.topic.1.line.3", "ui.guide.topic.1.line.4"] },
  { titleKey: "ui.guide.topic.2.title", lineKeys: ["ui.guide.topic.2.line.1", "ui.guide.topic.2.line.2", "ui.guide.topic.2.line.3"] },
  { titleKey: "ui.guide.topic.3.title", lineKeys: ["ui.guide.topic.3.line.1", "ui.guide.topic.3.line.2", "ui.guide.topic.3.line.3"] },
  { titleKey: "ui.guide.topic.4.title", lineKeys: ["ui.guide.topic.4.line.1", "ui.guide.topic.4.line.2", "ui.guide.topic.4.line.3"] },
  { titleKey: "ui.guide.topic.5.title", lineKeys: ["ui.guide.topic.5.line.1", "ui.guide.topic.5.line.2", "ui.guide.topic.5.line.3"] },
  { titleKey: "ui.guide.topic.6.title", lineKeys: ["ui.guide.topic.6.line.1", "ui.guide.topic.6.line.2", "ui.guide.topic.6.line.3", "ui.guide.topic.6.line.4"] },
  { titleKey: "ui.guide.topic.7.title", lineKeys: ["ui.guide.topic.7.line.1", "ui.guide.topic.7.line.2", "ui.guide.topic.7.line.3"] },
  { titleKey: "ui.guide.topic.8.title", lineKeys: ["ui.guide.topic.8.line.1", "ui.guide.topic.8.line.2"] },
  { titleKey: "ui.guide.topic.9.title", lineKeys: ["ui.guide.topic.9.line.1", "ui.guide.topic.9.line.2", "ui.guide.topic.9.line.3"] },
  { titleKey: "ui.guide.topic.10.title", lineKeys: ["ui.guide.topic.10.line.1", "ui.guide.topic.10.line.2", "ui.guide.topic.10.line.3"] },
  { titleKey: "ui.guide.topic.11.title", lineKeys: ["ui.guide.topic.11.line.1", "ui.guide.topic.11.line.2", "ui.guide.topic.11.line.3"] },
  { titleKey: "ui.guide.topic.12.title", lineKeys: ["ui.guide.topic.12.line.1", "ui.guide.topic.12.line.2", "ui.guide.topic.12.line.3"] },
  { titleKey: "ui.guide.topic.13.title", lineKeys: ["ui.guide.topic.13.line.1", "ui.guide.topic.13.line.2", "ui.guide.topic.13.line.3", "ui.guide.topic.13.line.4"] },
  { titleKey: "ui.guide.topic.14.title", lineKeys: ["ui.guide.topic.14.line.1", "ui.guide.topic.14.line.2", "ui.guide.topic.14.line.3"] }
];const step=computed(()=>{ void localeState.locale; const s=steps[stepIndex.value]; return {...s,title:t(s.titleKey),description:t(s.descriptionKey)}; });
const filteredHelp=computed(()=>{ void localeState.locale; const localized=topics.map(item=>({title:t(item.titleKey),lines:item.lineKeys.map(t)})); return localized.filter(item=>(item.title+' '+item.lines.join(' ')).toLowerCase().includes(search.value.trim().toLowerCase())); });
let resizeObserver;
function savePreferences(){try{localStorage.setItem(preferenceKey,autoGuide.value?'1':'0');}catch{}}
function closeDialogs(){helpOpen.value=false;settingsOpen.value=false;}
function openSettings(){closeDialogs();settingsOpen.value=true;}
function openHelp(){closeTour();closeDialogs();search.value='';helpOpen.value=true;}
function syncHighlight(){if(!tourOpen.value)return;const target=document.querySelector(step.value.selector);if(!target){currentRect.value=null;return;}const r=target.getBoundingClientRect();currentRect.value=r.width>0&&r.height>0?{left:Math.max(0,r.left-5)+'px',top:Math.max(0,r.top-5)+'px',width:r.width+10+'px',height:r.height+10+'px'}:null;}
async function jumpToStep(){window.dispatchEvent(new CustomEvent('floorplan:tour-tab',{detail:step.value.tab}));await nextTick();requestAnimationFrame(syncHighlight);}
function startTour(){closeDialogs();stepIndex.value=0;tourOpen.value=true;jumpToStep();}
function closeTour(){tourOpen.value=false;currentRect.value=null;try{localStorage.setItem(completedKey,'1');}catch{}}
function changeStep(delta){if(delta>0 && stepIndex.value===steps.length-1){closeTour();return;}stepIndex.value=Math.max(0,Math.min(steps.length-1,stepIndex.value+delta));jumpToStep();}
function keydown(e){if(e.key==='Escape'){if(helpOpen.value||settingsOpen.value)closeDialogs();else if(tourOpen.value)closeTour();}}
onMounted(()=>{try{autoGuide.value=localStorage.getItem(preferenceKey)!=='0';}catch{};window.addEventListener('floorplan:help',openHelp);window.addEventListener('floorplan:guide-settings',openSettings);window.addEventListener('resize',syncHighlight);window.addEventListener('scroll',syncHighlight,true);window.addEventListener('keydown',keydown);if(autoGuide.value){let seen=false;try{seen=localStorage.getItem(completedKey)==='1';}catch{};if(!seen) setTimeout(()=>{if(!helpOpen.value&&!settingsOpen.value)startTour();},750);}});
onUnmounted(()=>{window.removeEventListener('floorplan:help',openHelp);window.removeEventListener('floorplan:guide-settings',openSettings);window.removeEventListener('resize',syncHighlight);window.removeEventListener('scroll',syncHighlight,true);window.removeEventListener('keydown',keydown);});
</script>
