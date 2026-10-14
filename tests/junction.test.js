import test from 'node:test';
import assert from 'node:assert/strict';
import {insertWallAtJunctions,intersectCenterlines,snapToJunction} from '../src/architecture/core/junctionEngine.js';
const W=(id,x0,y0,x1,y1)=>({id,start:{x:x0,y:y0},end:{x:x1,y:y1},thickness:180,height:2800,type:'partition'});
test('X 交叉：兩個中心線切為四個獨立牆段，保留第一段 ID',()=>{
 const r=insertWallAtJunctions([W('old',0,500,2000,500)],W('new',1000,-500,1000,1500));
 assert.equal(r.angledWalls.length,4);
 assert.equal(r.junctions[0].kind,'X');
 assert.deepEqual(r.angledWalls.map(x=>x.id),['old','old-j1','new','new-j1']);
 for(const w of r.angledWalls)assert.ok([w.start,w.end].some(p=>p.x===1000&&p.y===500));
});
test('T 接點：垂直接到橫牆中段，自動將橫牆切成兩段',()=>{
 const r=insertWallAtJunctions([W('old',0,500,2000,500)],W('new',1000,500,1000,1500));
 assert.equal(r.angledWalls.length,3);
 assert.equal(r.junctions[0].kind,'T');
 assert.deepEqual(r.angledWalls[0].end,{x:1000,y:500});
 assert.deepEqual(r.angledWalls[1].start,{x:1000,y:500});
});
test('斜牆交叉：交點在中心線上並切出四段',()=>{
 const r=insertWallAtJunctions([W('a',0,0,2000,2000)],W('b',0,2000,2000,0));
 assert.equal(r.angledWalls.length,4);
 for(const w of r.angledWalls)assert.ok([w.start,w.end].some(p=>p.x===1000&&p.y===1000));
});
test('舊矩形牆：有安全開口才保留原牆不分割',()=>{
 const legacy=[[0,410,2000,590,'n']];
 const r=insertWallAtJunctions([],W('new',1000,-500,1000,1500),legacy,{canSplitLegacy:()=>false});
 assert.deepEqual(r.legacyWalls,legacy);
 assert.equal(r.angledWalls.length,1);
});
test('舊矩形牆：安全時沿中心線自動切割',()=>{
 const r=insertWallAtJunctions([],W('new',1000,-500,1000,1500),[[0,410,2000,590,'n']]);
 assert.equal(r.legacyWalls.length,2);
 assert.equal(r.angledWalls.length,2);
 assert.deepEqual(r.legacyWalls[0],[0,410,1000,590,'n']);
 assert.deepEqual(r.legacyWalls[1],[1000,410,2000,590,'n']);
 assert.deepEqual(r.legacyMap[0],[0,1]);
});
test('接點吸附：游標接近既有牆中段時貼到牆中心線',()=>{
 assert.deepEqual(snapToJunction({x:900,y:550},[],[W('a',0,500,2000,500)],100),{x:900,y:500});
});
test('線段平行不產生虛假交點',()=>{
 assert.equal(intersectCenterlines(W('a',0,0,1000,0),W('b',0,100,1000,100)),null);
});
test('靠近端點的細碎段避免自動切割',()=>{
 const r=insertWallAtJunctions([W('a',0,0,1000,0)],W('b',50,-500,50,500));
 assert.equal(r.angledWalls.length,2);
 assert.equal(r.angledWalls[0].id,'a');
 assert.equal(r.angledWalls[1].id,'b');
});
