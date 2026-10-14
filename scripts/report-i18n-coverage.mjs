import fs from 'node:fs';
const dir = new URL('../src/i18n/', import.meta.url);
const langs = ['en','zh','zh-TW','ja','ko','tr','ru','vi','th','de','es','fr','uk','pl','pt-BR','ar','fa','id','it','el'];
const en = JSON.parse(fs.readFileSync(new URL('en.json', dir)));
const report = ['# Translation coverage (string equality heuristic)', '', 'Identical text may be intentional for technical terms. This report is not proof of translation quality.', '', '| Locale | Keys | Exact matches with English | Guide prose exact English |', '|---|---:|---:|---:|'];
for (const lang of langs) {
  const locale = JSON.parse(fs.readFileSync(new URL(`${lang}.json`, dir)));
  const keys = Object.keys(en);
  const equal = keys.filter(k => lang !== 'en' && en[k] === locale[k]).length;
  const guide = keys.filter(k => /^ui\.guide\.(topic|tour)\./.test(k));
  const guideEqual = guide.filter(k => lang !== 'en' && en[k] === locale[k]).length;
  report.push(`| ${lang} | ${keys.length} | ${equal} | ${guideEqual} / ${guide.length} |`);
}
console.log(report.join('\n'));
