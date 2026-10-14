import test from 'node:test';
import assert from 'node:assert/strict';
import {createCommandSystem} from '../src/editor/commandSystem.js';
import {createHistoryManager} from '../src/editor/historyManager.js';

function setup(){
  let state={furniture:[{id:'chair',cx:100,cy:200}], architecture:{walls:[[0,0,100,20]]}};
  let geometry=[[0,0,100,20]];
  const history=createHistoryManager();
  const changes=[];
  const snapshot=()=>JSON.stringify(state);
  const system=createCommandSystem({snapshot,
    restore:before=>{state=JSON.parse(before);geometry=structuredClone(state.architecture.walls);},
    record:before=>{state.architecture.walls=structuredClone(geometry);return history.record(before,state);},
    onChange:e=>changes.push(e)});
  return {system,history,changes,snapshot,read:()=>state,geometry:()=>geometry};
}

test('pointer drag becomes exactly one undoable command even after many move events',()=>{
  const c=setup(), before=c.snapshot();
  for(let i=0;i<20;i++)c.read().furniture[0].cx+=10;
  assert.equal(c.system.complete(before,{name:'furniture-2d-drag'}),true);
  assert.equal(c.history.undoCount,1);
  assert.deepEqual(c.changes.at(-1),{changed:true,type:'commit',name:'furniture-2d-drag'});
  assert.equal(c.history.undo(c.read()).furniture[0].cx,100);
});

test('cancel restores geometry and furniture without creating a history entry',()=>{
  const c=setup(),before=c.snapshot();
  c.geometry()[0][2]=600;
  c.read().furniture[0].cx=950;
  c.system.cancel(before,{name:'wallMove'});
  assert.equal(c.geometry()[0][2],100);
  assert.equal(c.read().furniture[0].cx,100);
  assert.equal(c.history.undoCount,0);
  assert.equal(c.changes.at(-1).type,'cancel');
});

test('wall geometry is recorded with project in a single commit',()=>{
  const c=setup(),before=c.snapshot();
  c.geometry()[0][2]=900;
  assert.equal(c.system.complete(before,{name:'wallLength'}),true);
  assert.equal(c.read().architecture.walls[0][2],900);
  assert.equal(c.history.undoCount,1);
});

test('failed command rolls back and never persists changes',()=>{
  const c=setup();
  assert.throws(()=>c.system.execute({name:'door-edit',execute(){c.read().furniture[0].cx=600;throw Error('invalid door');}}),/invalid door/);
  assert.equal(c.read().furniture[0].cx,100);
  assert.equal(c.history.undoCount,0);
});
