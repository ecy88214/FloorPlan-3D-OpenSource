import { t, localeState } from './index.js';
// DOM integration for legacy renderer (SVG / furniture library) and still-static Vue labels.
// The source text is preserved so repeated locale changes do not translate translations.
const saved = new WeakMap();
const attributes = ['title','placeholder','aria-label'];
let working = false;
const VUE_UI = '.office-ribbon, .ribbon, .admin-page, .login-page, .help-overlay, .guided-help, .guide-modal';
function isVueManaged(el) { return Boolean(el?.closest?.(VUE_UI)); }
function translateText(original) {
  const m = /^(\s*)(.*?)(\s*)$/s.exec(original || '');
  if (!m || !m[2]) return original;
  const exact=t(m[2]);
  if (exact!==m[2]) return m[1]+exact+m[3];
  // Retain numeric prefixes and suffixes, translating the textual segment.
  return original.replace(/[\u3400-\u9fff][\u3400-\u9fff A-Za-z0-9/（）·＋：－—]{0,70}/g, segment => {
    const x=segment.trim();return t(x)!==x?segment.replace(x,t(x)):segment;
  });
}
export function applyDomLocale(root=document.body){
  if(!root || working)return;
  working=true;
  try {
    const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];let node;
    while((node=walk.nextNode())) nodes.push(node);
    for(const n of nodes){
      if(['SCRIPT','STYLE','TEXTAREA'].includes(n.parentElement?.tagName)||isVueManaged(n.parentElement))continue;
      const previous=saved.get(n);const original=previous && previous.last===n.nodeValue ? previous.original : n.nodeValue;
      const translated=translateText(original);
      if(n.nodeValue!==translated)n.nodeValue=translated;
      saved.set(n,{original,last:translated});
    }
    for(const el of [root,...root.querySelectorAll('*')]){
      for(const a of attributes){if(isVueManaged(el)||!el.hasAttribute?.(a))continue;
        const current=el.getAttribute(a),record=saved.get(el)||{},old=record[a];
        const original=old?.last===current?old.original:current;
        const translated=translateText(original);
        if(current!==translated)el.setAttribute(a,translated);
        record[a]={original,last:translated};saved.set(el,record);
      }
    }
  } finally {working=false;}
}
export function startDomLocale(){
  let pending=false;
  const schedule=()=>{if(pending)return;pending=true;queueMicrotask(()=>{pending=false;applyDomLocale();});};
  const observer=new MutationObserver(m=>{if(working)return; if(m.some(x=>x.type==='childList'||x.type==='characterData'||x.type==='attributes'))schedule();});
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['title','placeholder','aria-label']});
  window.addEventListener('floorplan:locale-changed',schedule);
  schedule();
  return ()=>observer.disconnect();
}
