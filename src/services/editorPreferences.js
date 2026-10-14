import { reactive } from 'vue';

const KEY = 'floorplan:ribbon-show-labels';
function readPreference() {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}
export const editorPreferences = reactive({ ribbonShowLabels: readPreference() });
export function setRibbonShowLabels(value) {
  editorPreferences.ribbonShowLabels = Boolean(value);
  try { localStorage.setItem(KEY, value ? '1' : '0'); } catch { /* private browsing */ }
}
