import test from 'node:test';
import assert from 'node:assert/strict';
import {createProjectStore} from '../src/stores/projectStore.js';
import {createSelectionManager} from '../src/editor/selectionManager.js';
import {createSvgRenderer,setSvgLayerMarkup} from '../src/editor/svgRendering.js';

test('project store notifies subscribers and supports unsubscribe',()=>{
 const store=createProjectStore({furniture:[],value:1});const calls=[];
 const off=store.subscribe((next,prev)=>calls.push([next.value,prev.value]));
 store.update(p=>{p.value=2});off();store.update(p=>{p.value=3});
 assert.deepEqual(calls,[[2,1]]);assert.equal(store.getState().value,3);
});
test('project store guards invalid replacement',()=>{
 const store=createProjectStore({furniture:[]});assert.throws(()=>store.replace({foo:1}),/Invalid project/);
});
test('selection manager handles grouped additive selection',()=>{
 let furniture=[{id:'a'},{id:'b'},{id:'c'}];const manager=createSelectionManager({getFurniture:()=>furniture});
 assert.equal(manager.selectFurniture('a',{groupIds:['a','b']}).id,'b');
 assert.equal(manager.ids.size,2);
 manager.selectFurniture('a',{additive:true,groupIds:['a','b']});assert.equal(manager.ids.size,0);
 manager.selectFurniture('c');furniture=[];manager.reconcile(null);assert.equal(manager.ids.size,0);
});
test('svg renderer orders stages and afterRender',()=>{
 const calls=[];const renderer=createSvgRenderer({layers:[()=>calls.push(1),()=>calls.push(2)],afterRender:()=>calls.push(3)});
 renderer.render();assert.deepEqual(calls,[1,2,3]);assert.equal(renderer.layerCount,2);
});
test('svg layer avoids redundant markup replacements',()=>{
 let writes=0;const layer={_html:'A',get innerHTML(){return this._html},set innerHTML(s){writes++;this._html=s}};
 assert.equal(setSvgLayerMarkup(layer,'A'),true);assert.equal(writes,0);
 setSvgLayerMarkup(layer,'B');assert.equal(writes,1);
});
