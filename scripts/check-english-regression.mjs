import fs from 'node:fs';
const root = new URL('../', import.meta.url);
const load = (f) => fs.readFileSync(new URL(f,root),'utf8');
const en = JSON.parse(load('src/i18n/en.json'));
const invalid = Object.entries(en).filter(([key,value]) => /[\u3400-\u9fff]/u.test(value));
if (invalid.length) {console.error('English locale contains CJK characters:',invalid);process.exitCode=1;}
for (const id of ['ui.header.design.title','ui.keyboard.title','ui.user.guide','ui.tutorial.settings.2']){
 if (!en[id]) {console.error('Missing English key:',id);process.exitCode=1;}
}
const editor = load('src/editor/planEditor.js');
if (editor.includes('${tr(`<section><h3>鍵盤快捷鍵')) {console.error('Legacy shortcuts translation detected');process.exitCode=1;}
console.log('English locale and shortcut regression checks completed');
