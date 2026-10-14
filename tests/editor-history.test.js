import test from 'node:test';
import assert from 'node:assert/strict';
import {createHistoryManager} from '../src/editor/historyManager.js';
import {area, perim, bbox, aabb, norm, ping} from '../src/editor/planMetrics.js';

test('編輯與 Undo/Redo 恢復狀態', () => {
  const history=createHistoryManager();
  const state={furniture:[{id:'a',cx:100}],rooms:{}};
  const before=history.snapshot(state);
  state.furniture[0].cx=200;
  assert.equal(history.record(before,state),true);
  const undone=history.undo(state);
  assert.equal(undone.furniture[0].cx,100);
  const redone=history.redo(undone);
  assert.equal(redone.furniture[0].cx,200);
});

test('無變化的操作不新增紀錄且保留重做',()=>{
  const history=createHistoryManager();
  const state={x:1};
  history.execute(state,s=>s.x++);
  const old=history.undo(state);
  assert.equal(history.record(history.snapshot(old),old),false);
  assert.equal(history.canRedo,true);
});

test('修改後分支清除 redo',()=>{
  const history=createHistoryManager();
  const state={x:0};
  history.execute(state,s=>s.x++);
  const old=history.undo(state);
  history.execute(old,s=>s.x=5);
  assert.equal(history.canRedo,false);
});

test('歷史上限確實裁切最早操作',()=>{
  const h=createHistoryManager({limit:2});
  const state={x:0};
  for(let i=0;i<4;i++)h.execute(state,s=>s.x++);
  assert.equal(h.undoCount,2);
  assert.equal(h.undo(h.undo(state)).x,2);
});

test('操作例外不會污染歷史並回傳復原狀態',()=>{
  const h=createHistoryManager();
  const original={x:1};
  const r=h.execute(original,s=>{s.x=99;throw Error('failed');});
  assert.equal(r.value.x,1);
  assert.equal(r.changed,false);
  assert.equal(h.undoCount,0);
  assert.equal(r.error.message,'failed');
});

test('空歷史與清空狀態',()=>{
  const h=createHistoryManager();
  assert.equal(h.undo({}),null);
  assert.equal(h.redo({}),null);
  h.execute({x:1},s=>s.x=2);
  h.clear();
  assert.equal(h.canUndo,false);
});

test('面積、周長、邊界、旋轉邊界數值維持一致',()=>{
  const square=[[0,0],[2000,0],[2000,2000],[0,2000]];
  assert.equal(area(square),4);
  assert.equal(perim(square),8);
  assert.deepEqual(bbox(square),[0,0,2000,2000]);
  assert.equal(aabb({w:200,d:100,rot:90}).hw,50.00000000000001);
  assert.equal(norm(-90),270);
  assert.ok(Math.abs(ping(3.305785)-1)<1e-10);
});
