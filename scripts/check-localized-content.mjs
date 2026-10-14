import fs from 'node:fs';

const dir = new URL('../src/i18n/', import.meta.url);
const languages = ['zh', 'zh-TW', 'ja', 'ko', 'tr', 'ru', 'vi', 'th', 'de', 'es', 'fr', 'uk', 'pl', 'pt-BR', 'ar', 'fa', 'id', 'it', 'el'];
const english = JSON.parse(fs.readFileSync(new URL('en.json', dir), 'utf8'));
const immutable = new Set(Object.keys(english).filter(key => key.startsWith('ui.keyboard.') && key.endsWith('.key')));
const acceptedSharedValues = new Set(['Captcha', 'Sideboard', 'Terrazzo', 'Administration', 'Date', 'Dimensions', 'Plans / Versions', 'Toilet', 'ping']);
let failures = 0;

for (const language of languages) {
  const dictionary = JSON.parse(fs.readFileSync(new URL(`${language}.json`, dir), 'utf8'));
  const fallbacks = Object.keys(english).filter(key => !immutable.has(key) && !acceptedSharedValues.has(english[key]) && dictionary[key] === english[key] && /[A-Za-z]{3,}/.test(english[key]));
  console.log(`${language.padEnd(6)} untranslatedEnglish=${fallbacks.length}`);
  if (fallbacks.length) {
    failures += fallbacks.length;
    console.error(`${language}: ${fallbacks.join(', ')}`);
  }
}

if (failures) process.exitCode = 1;
