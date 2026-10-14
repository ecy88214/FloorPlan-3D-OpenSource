<template>
<div class="grp layout-picker" :class="{'home-layout-picker': home}" aria-label="房數規劃">
  <label :for="home ? 'homeLayoutType' : 'layoutType'">{{ $t(home ? '選擇房型' : '房數規劃') }}</label>
  <select :id="home ? 'homeLayoutType' : 'layoutType'" aria-label="房數規劃"
    :value="viewState.layoutType" @change="handleChange">
    <option v-for="option in options" :key="option.id" :value="option.id" :data-en="option.name">{{ $t(option.name) }}</option>
  </select>
</div>
</template>
<script setup>
import { nextTick } from 'vue';
import { layouts } from '../layouts/index.js';
import { viewState } from '../stores/viewState.js';
const props = defineProps({home: {type:Boolean, default:false}});
const options = Object.entries(layouts).map(([id, layout]) => ({ id, name: layout.guide.name }));
async function handleChange(event) {
  if (!props.home) return; // Building picker is handled by planEditor.js.
  const source = document.getElementById('layoutType');
  if (!source) { event.target.value = viewState.layoutType; return; }
  source.value = event.target.value;
  // Reuse the existing Command System, confirm / cancel dialog and state updates.
  source.dispatchEvent(new Event('change', {bubbles:true}));
  await nextTick();
  event.target.value = viewState.layoutType; // Restore value if switching was cancelled.
}
</script>
