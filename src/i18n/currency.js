// All estimates are stored in TWD. These deliberately fixed display rates keep
// a saved estimate stable; they are not fetched from a live exchange-rate feed.
const PROFILES = Object.freeze({
  en: { currency: 'USD', locale: 'en-US', rate: 0.031 }, zh: { currency: 'CNY', locale: 'zh-CN', rate: 0.22 },
  'zh-TW': { currency: 'TWD', locale: 'zh-TW', rate: 1 }, zht: { currency: 'TWD', locale: 'zh-TW', rate: 1 },
  ja: { currency: 'JPY', locale: 'ja-JP', rate: 4.8 }, ko: { currency: 'KRW', locale: 'ko-KR', rate: 42 },
  tr: { currency: 'TRY', locale: 'tr-TR', rate: 1.1 }, ru: { currency: 'RUB', locale: 'ru-RU', rate: 2.8 },
  vi: { currency: 'VND', locale: 'vi-VN', rate: 780 }, th: { currency: 'THB', locale: 'th-TH', rate: 1.08 },
  de: { currency: 'EUR', locale: 'de-DE', rate: 0.029 }, es: { currency: 'EUR', locale: 'es-ES', rate: 0.029 },
  fr: { currency: 'EUR', locale: 'fr-FR', rate: 0.029 }, uk: { currency: 'UAH', locale: 'uk-UA', rate: 1.3 },
  pl: { currency: 'PLN', locale: 'pl-PL', rate: 0.12 }, 'pt-BR': { currency: 'BRL', locale: 'pt-BR', rate: 0.17 },
  ar: { currency: 'SAR', locale: 'ar-SA', rate: 0.116 }, fa: { currency: 'IRR', locale: 'fa-IR', rate: 1300 },
  id: { currency: 'IDR', locale: 'id-ID', rate: 500 }, it: { currency: 'EUR', locale: 'it-IT', rate: 0.029 },
  el: { currency: 'EUR', locale: 'el-GR', rate: 0.029 }
});
const FALLBACK = PROFILES.en;
const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND', 'IRR', 'IDR']);

export function currencyProfile(locale = 'en') { return PROFILES[locale] || FALLBACK; }
export function convertFromTwd(value, locale = 'en') { return (Number(value) || 0) * currencyProfile(locale).rate; }
export function formatCurrency(value, locale = 'en') {
  const profile = currencyProfile(locale), fractionDigits = ZERO_DECIMAL.has(profile.currency) ? 0 : 2;
  return new Intl.NumberFormat(profile.locale, { style: 'currency', currency: profile.currency, minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits }).format(convertFromTwd(value, locale));
}
export function currencyCode(locale = 'en') { return currencyProfile(locale).currency; }
