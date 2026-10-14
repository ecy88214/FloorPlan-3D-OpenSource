import fs from 'node:fs';
const dir=new URL('../src/i18n/',import.meta.url);
const languages=['en','zh','zh-TW','ja','ko','tr','ru','vi','th','de','es','fr','uk','pl','pt-BR','ar','fa','id','it','el'];
const base=JSON.parse(fs.readFileSync(new URL('en.json',dir)));
const reference=Object.keys(base).sort();
let issues=0;
for(const lang of languages){
 const dictionary=JSON.parse(fs.readFileSync(new URL(`${lang}.json`,dir)));
 const keys=Object.keys(dictionary).sort();
 const missing=reference.filter(x=>!(x in dictionary));
 const extra=keys.filter(x=>!(x in base));
 const bad=keys.filter(x=>!/^ui\.[a-z0-9.]+$/.test(x));
 const empty=keys.filter(x=>typeof dictionary[x]!=='string'||!dictionary[x].trim());
 const englishFallback=lang==='en'?[]:keys.filter(x=>dictionary[x]===base[x]);
 console.log(`${lang.padEnd(6)} entries=${keys.length} missing=${missing.length} extra=${extra.length} invalidKeys=${bad.length} empty=${empty.length} sameAsEnglish=${englishFallback.length}`);
 if(missing.length||extra.length||bad.length||empty.length){issues++;console.error({lang,missing,extra,bad,empty});}
}
if(issues)process.exitCode=1;
