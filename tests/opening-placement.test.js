import test from 'node:test';
import assert from 'node:assert/strict';
import {wallCentreLines,placeOpening,openingInterval} from '../src/architecture/core/openingPlacement.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<.01,`${a} != ${b}`);
test('新畫水平牆可嵌入建築窗戶並建立洞口區間',()=>{
 const [wall]=wallCentreLines([], [{id:'wall-a',start:{x:0,y:0},end:{x:3000,y:0},thickness:180}]);
 const f={type:'windowbuilt',cx:1500,cy:120,w:1200,rot:0};
 const pos=placeOpening(f,[wall]); assert.equal(pos.wallId,'wall-a'); near(pos.cy,0);
 const hole=openingInterval({...f,...pos},wall);near(hole.start,900);near(hole.end,2100);
});
test('斜牆門窗吸附旋轉角度並對齊中心線',()=>{
 const [wall]=wallCentreLines([], [{id:'diagonal',start:{x:0,y:0},end:{x:3000,y:3000},thickness:200}]);
 const f={type:'dooropen',cx:1650,cy:1550,w:850,rot:0};
 const pos=placeOpening(f,[wall]);near(pos.rot,45);near(pos.cx,pos.cy);
 assert.ok(openingInterval({...f,...pos},wall));
});
test('十字分割後仍可將窗戶放在其一牆段',()=>{
 const lines=wallCentreLines([], [{id:'left',start:{x:0,y:0},end:{x:2000,y:0},thickness:180},{id:'right',start:{x:2000,y:0},end:{x:4000,y:0},thickness:180}]);
 const f={type:'windowbuilt',cx:3000,cy:130,w:1000,rot:0};
 const pos=placeOpening(f,lines); assert.equal(pos.wallId,'right');
 assert.ok(openingInterval({...f,...pos},lines[1]));
});
test('窗戶寬度超出牆段時不應造成非法開洞',()=>{
 const [wall]=wallCentreLines([], [{id:'short',start:{x:0,y:0},end:{x:600,y:0},thickness:180}]);
 const f={type:'window',cx:250,cy:5,w:1200,rot:0};
 assert.equal(openingInterval(f,wall),null);
});
test('既有舊牆仍可用相同定位介面',()=>{
 const [wall]=wallCentreLines([[0,0,3000,240,'b']],[]);
 const p=placeOpening({cx:1500,cy:300,w:900},[wall]);assert.equal(p.wallId,'legacy-0');near(p.cy,120);
});
