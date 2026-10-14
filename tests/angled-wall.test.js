import test from 'node:test';
import assert from 'node:assert/strict';
import {snapEndpoint, joinFootprints} from '../src/architecture/core/cornerEngine.js';
import {segmentFootprint} from '../src/architecture/core/geometry.js';
import {validateWallSegments} from '../src/architecture/core/wallEngine.js';
const a={id:'angle-1',start:{x:0,y:0},end:{x:1000,y:0},thickness:180,height:2800,type:'partition'};
const b={id:'angle-2',start:{x:1000,y:0},end:{x:1000,y:1000},thickness:180,height:2800,type:'partition'};
const c={id:'angle-3',start:{x:1000,y:0},end:{x:1800,y:900},thickness:180,height:2800,type:'partition'};
test('任意角度斜牆生成非矩形牆體輪廓',()=>{
 const p=segmentFootprint(c);assert.equal(p.length,4);
 assert.ok(p[1][0]!==p[0][0] && p[1][1]!==p[0][1]);
 assert.deepEqual(validateWallSegments([a,c]),[]);
});
test('斜牆靠近已有端點會吸附',()=>{
 assert.deepEqual(snapEndpoint({x:1025,y:18},[],[a],60),{x:1000,y:0});
 assert.deepEqual(snapEndpoint({x:1250,y:100},[],[a],60),{x:1250,y:100});
});
test('斜牆能吸附到舊版矩形牆體中心線端點',()=>{
 assert.deepEqual(snapEndpoint({x:1015,y:185},[[0,100,1000,280,'n']],[],50),{x:1000,y:190});
});
test('兩面等厚牆的 90 度接合計算為相同的牆角頂點',()=>{
 const [p,q]=joinFootprints([a,b]);
 assert.deepEqual(p[1],q[0]);assert.deepEqual(p[2],q[3]);
});
test('斜牆 + 斜牆轉角可得到閉合多邊形',()=>{
 const [p,q]=joinFootprints([a,c]);
 assert.equal(p.length,4);assert.equal(q.length,4);
 assert.ok([...p.flat(),...q.flat()].every(Number.isFinite));
});
test('三岔接角保持原牆輪廓，避免自交',()=>{
 const [p,q,r]=joinFootprints([a,b,c]);
 assert.deepEqual(p,segmentFootprint(a));
 assert.deepEqual(q,segmentFootprint(b));
 assert.deepEqual(r,segmentFootprint(c));
});
