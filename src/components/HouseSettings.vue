<template>
<!-- 對話框移至 body，避免被未啟用的 Ribbon v-show 隱藏或裁切 -->
<Teleport to="body">
<dialog id="houseDialog" aria-labelledby="houseDialogTitle">
  <form method="dialog">
    <h3 id="houseDialogTitle">{{ tr('房屋尺寸與空白房型', 'House Dimensions & Blank Layout') }}</h3>
    <p>{{ tr('以地坪範圍設定長寬，不含外牆厚度。單位：公尺。', 'Set length and width based on floor area, excluding exterior wall thickness. Units: meters.') }}</p>
    <div class="form">
      <label>{{ tr('房屋寬度（m）', 'House Width (m)') }}<input id="houseWidth" type="number" min="1" max="50" step="0.01" required></label>
      <label>{{ tr('房屋深度（m）', 'House Depth (m)') }}<input id="houseDepth" type="number" min="1" max="50" step="0.01" required></label>
    </div>
    <p id="houseArea"></p>
    <p class="muted">{{ tr('套用尺寸會縮放牆體、地坪與門窗，並調整家具位置；家具本身尺寸不變。縮小後請檢查家具是否重疊。', 'Applying dimensions scales walls, floors and openings, and adjusts furniture positions. Furniture sizes remain unchanged. Check overlaps if reduced.') }}</p>
    <p class="muted">{{ tr('新增空白房型會替換目前方案，保留四面外牆與空地坪。以上操作皆可復原。', 'Creating a blank layout replaces the current design, retaining four exterior walls and empty floor. Undo is available for all actions.') }}</p>
    <div class="actions"><button class="btn primary" type="button" id="resizeHouse">{{ tr('套用尺寸', 'Apply Dimensions') }}</button><button class="btn" type="button" id="newEmptyHouse">{{ tr('新增空白房型', 'New Blank Layout') }}</button><button class="btn" value="cancel">{{ tr('取消', 'Cancel') }}</button></div>
  </form>
</dialog>
</Teleport>
</template>
<script setup>
import { computed } from 'vue';
import { localeState, t } from '../i18n/index.js';
const isEn = computed(() => localeState.locale === 'en');
const isZh = computed(() => (localeState.locale || '').startsWith('zh'));
const tr = (zh, en) => {
  if (isEn.value) return en;
  if (isZh.value) return zh;
  const translated = t(en);
  return translated !== en ? translated : en;
};
</script>
