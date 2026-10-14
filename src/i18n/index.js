import { reactive } from 'vue';
import t0 from './en.json';
import t1 from './zh.json';
import t2 from './zh-TW.json';
import t3 from './ja.json';
import t4 from './ko.json';
import t5 from './tr.json';
import t6 from './ru.json';
import t7 from './vi.json';
import t8 from './th.json';
import t9 from './de.json';
import t10 from './es.json';
import t11 from './fr.json';
import t12 from './uk.json';
import t13 from './pl.json';
import t14 from './pt-BR.json';
import t15 from './ar.json';
import t16 from './fa.json';
import t17 from './id.json';
import t18 from './it.json';
import t19 from './el.json';
import legacyAliases from './legacy-aliases.json';

export const locales = [{"code": "en", "name": "English"}, {"code": "zh", "name": "简体中文"}, {"code": "zh-TW", "name": "繁體中文"}, {"code": "ja", "name": "日本語"}, {"code": "ko", "name": "한국어"}, {"code": "tr", "name": "Türkçe"}, {"code": "ru", "name": "Русский"}, {"code": "vi", "name": "Tiếng Việt"}, {"code": "th", "name": "ไทย"}, {"code": "de", "name": "Deutsch"}, {"code": "es", "name": "Español"}, {"code": "fr", "name": "Français"}, {"code": "uk", "name": "Українська"}, {"code": "pl", "name": "Polski"}, {"code": "pt-BR", "name": "Português (Brasil)"}, {"code": "ar", "name": "العربية"}, {"code": "fa", "name": "فارسی"}, {"code": "id", "name": "Bahasa Indonesia"}, {"code": "it", "name": "Italiano"}, {"code": "el", "name": "Ελληνικά"}];
const catalogs = { "en":t0, "zh":t1, "zh-TW":t2, "ja":t3, "ko":t4, "tr":t5, "ru":t6, "vi":t7, "th":t8, "de":t9, "es":t10, "fr":t11, "uk":t12, "pl":t13, "pt-BR":t14, "ar":t15, "fa":t16, "id":t17, "it":t18, "el":t19 };
const available = new Set(locales.map(item => item.code));
function readInitialLocale() {
  try {
    const previous = localStorage.getItem('floorplan:locale') || localStorage.getItem('huxing-lang');
    return previous === 'zht' ? 'zh-TW' : available.has(previous) ? previous : 'en';
  } catch { return 'en'; }
}
export const localeState = reactive({ locale: readInitialLocale() });
export function setLocale(locale) {
  if (!available.has(locale)) return;
  localeState.locale = locale;
  document.documentElement.lang = locale;
  document.documentElement.dir = ['ar', 'fa'].includes(locale) ? 'rtl' : 'ltr';
  try { localStorage.setItem('floorplan:locale', locale); localStorage.setItem('huxing-lang', locale === 'zh-TW' ? 'zht' : locale); } catch {}
  window.dispatchEvent(new CustomEvent('floorplan:locale-changed', { detail: locale }));
}
// All catalogs contain ONLY canonical ids. Legacy labels are resolved here,
// never duplicated in translation catalogs.
const missing = new Set();
export function t(id, params) {
  if (id === undefined || id === null) return '';
  const input = String(id);
  const key = Object.hasOwn(catalogs.en, input) ? input : legacyAliases[input.trim()];
  if (!key) { missing.add(input); return input; }
  const current = catalogs[localeState.locale] || catalogs.en;
  let value = current[key];
  if (typeof value !== 'string' || !value.trim()) value = catalogs.en[key];
  if (params && typeof params === 'object')
    return value.replace(/\{([\w]+)\}/g, (_, param) => String(params[param] ?? `{${param}}`));
  return value;
}
export function missingTranslationKeys() { return [...missing].sort(); }
export function initLocale() {
  document.documentElement.lang = localeState.locale;
  document.documentElement.dir = ['ar', 'fa'].includes(localeState.locale) ? 'rtl' : 'ltr';
}
