import fs from 'node:fs';
const entries = JSON.parse(fs.readFileSync(new URL('../src/i18n/zh-TW.json', import.meta.url)));
const simplifiedOnly = /[卫卧砖婴单双橱柜书厨墙图导选户区厅飘长发电机风开关线绘测标视设轮颗过]/u;
// Targeted check only; some Han characters are valid in both scripts, so this is not a linguistic proof.
const warnings=Object.entries(entries).filter(([,value])=>simplifiedOnly.test(value));
for (const [key,value] of warnings) console.log(`${key}: ${value}`);
console.log(`Review candidates: ${warnings.length}`);
