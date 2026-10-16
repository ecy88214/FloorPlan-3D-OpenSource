<template>
  <!-- Teleport 可避免 Ribbon 分頁切換時，對話框被 v-show 隱藏。 -->
  <Teleport to="body">
    <dialog id="rotateFurnitureDialog" aria-labelledby="rotateFurnitureTitle">
      <form id="rotateFurnitureForm">
        <h3 id="rotateFurnitureTitle">{{ tr('自訂家具旋轉角度', 'Custom Furniture Rotation') }}</h3>
        <p class="muted">{{ tr('輸入要旋轉的角度。正數為順時針，負數為逆時針；多選或群組會繞共同中心旋轉。', 'Enter rotation angle. Positive is clockwise, negative is counter-clockwise. Multi-selection or groups rotate around shared center.') }}</p>
        <div class="form">
          <label for="rotateFurnitureAngle">{{ tr('旋轉角度（°）', 'Rotation Angle (°)') }}
            <input id="rotateFurnitureAngle" name="degrees" type="number" value="45" step="any" required autofocus inputmode="decimal" />
          </label>
        </div>
        <p id="rotateFurnitureError" class="rotate-furniture-error" role="alert" hidden>{{ tr('請輸入有效的旋轉角度。', 'Please enter a valid rotation angle.') }}</p>
        <div class="actions">
          <button class="btn primary" type="submit">{{ tr('確定旋轉', 'Rotate') }}</button>
          <button class="btn" type="button" id="cancelFurnitureRotation">{{ tr('取消', 'Cancel') }}</button>
        </div>
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
