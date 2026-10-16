import { reactive } from 'vue';

const KEY_LABELS = 'floorplan:ribbon-show-labels';
const KEY_STYLE = 'floorplan:render-style';

function readLabelsPreference() {
  try { return localStorage.getItem(KEY_LABELS) === '1'; } catch { return false; }
}

function readStylePreference() {
  try { return localStorage.getItem(KEY_STYLE) || 'default'; } catch { return 'default'; }
}

export const editorPreferences = reactive({
  ribbonShowLabels: readLabelsPreference(),
  renderStyle: readStylePreference()
});

export function setRibbonShowLabels(value) {
  editorPreferences.ribbonShowLabels = Boolean(value);
  try { localStorage.setItem(KEY_LABELS, value ? '1' : '0'); } catch { /* private browsing */ }
}

export function applyRenderStyleToDOM(style = editorPreferences.renderStyle) {
  if (typeof document === 'undefined') return;
  const isHand = style === 'handDrawn';
  document.body.classList.toggle('style-hand-drawn', isHand);
  const app = document.querySelector('.app');
  if (app) app.classList.toggle('style-hand-drawn', isHand);
}

export function setRenderStyle(style) {
  const validStyle = style === 'handDrawn' ? 'handDrawn' : 'default';
  editorPreferences.renderStyle = validStyle;
  try { localStorage.setItem(KEY_STYLE, validStyle); } catch { /* private browsing */ }
  applyRenderStyleToDOM(validStyle);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('floorplan:render-style-changed', { detail: validStyle }));
  }
}

