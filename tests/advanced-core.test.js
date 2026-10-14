import test from 'node:test';
import assert from 'node:assert/strict';
import {createProjectStore} from '../src/stores/projectStore.js';
import {createCommandSystem} from '../src/editor/commandSystem.js';
import {createPointerController} from '../src/editor/pointerController.js';
import {createSvgRenderer} from '../src/editor/svgRendering.js';

test('reactive project store tracks nested edits and batches updates',()=>{
 const store=createProjectStore({furniture:[{id:'one',cx:1}],rooms:[]});
 const revisions=[];
 const off=store.subscribe((s,old,meta)=>revisions.push(meta.reason));
 store.getState().furniture[0].cx=9;
 assert.equal(revisions.length,1);
 store.batch(s=>{s.furniture[0].cx=10;s.furniture.push({id:'two'});});
 assert.equal(revisions.length,2);
 assert.equal(store.getState().furniture.length,2);
 off();store.getState().furniture.pop();assert.equal(revisions.length,2);
});
test('command system ignores noops and restores failed operation',()=>{
 let value={number:2}, changes=0;
 const snapshot=()=>JSON.stringify(value);
 const restore=s=>{value=JSON.parse(s);};
 const record=before=>before!==snapshot();
 const command=createCommandSystem({snapshot,restore,record,onChange:()=>changes++});
 assert.equal(command.execute(()=>{}),false);
 assert.equal(command.execute(()=>{value.number++;}),true);
 assert.equal(value.number,3);
 assert.throws(()=>command.execute(()=>{value.number=8;throw Error('cancel');}),/cancel/);
 assert.equal(value.number,3);assert.equal(changes,3);
});
test('pointer controller attaches once and detaches all handlers',()=>{
 const handlers=new Map(), el={addEventListener(k,fn){handlers.set(k,fn);},removeEventListener(k){handlers.delete(k);}};
 let downs=0;const control=createPointerController(el,{onDown:()=>downs++,onWheel:()=>{}});
 control.attach();control.attach();assert.equal(handlers.size,2);
 handlers.get('pointerdown')();assert.equal(downs,1);
 control.detach();assert.equal(handlers.size,0);assert.equal(control.attached,false);
});
test('svg renderer updates only invalidated stages',()=>{
 const calls=[];const renderer=createSvgRenderer({layers:[()=>calls.push(0),()=>calls.push(1),()=>calls.push(2)],afterRender:()=>calls.push('after')});
 renderer.renderDirty();assert.deepEqual(calls,[0,1,2,'after']);calls.length=0;
 renderer.invalidate([2]);renderer.renderDirty();assert.deepEqual(calls,[2,'after']);
 assert.equal(renderer.dirtyCount,0);
});
