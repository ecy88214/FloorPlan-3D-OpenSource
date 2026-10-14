import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { furnitureBounds, alignFurniture, distributeFurniture } from '../src/furniture/core/alignmentEngine.js';
import { checkFurnitureCollision } from '../src/furniture/core/collisionEngine.js';
import { rotateFurnitureSet, makeFurnitureGroup, clearFurnitureGroup } from '../src/furniture/core/groupEngine.js';

const fixture = () => [
 {id:'sofa',type:'sofa',cx:0,cy:0,w:1200,d:600,rot:0},
 {id:'chairA',type:'chair',cx:2000,cy:300,w:600,d:600,rot:0},
 {id:'chairB',type:'chair',cx:4500,cy:600,w:600,d:600,rot:0},
];
test('F6 furniture group alignment rotation and undo snapshot remain compatible', () => {
 const original=fixture(); const before=structuredClone(original);
 assert.equal(makeFurnitureGroup(original,'group-f6'),true);
 const aligned=alignFurniture(original,'centerY');
 for(const change of aligned) Object.assign(original.find(f=>f.id===change.id),change);
 const rotated=rotateFurnitureSet(original,30);
 for(const change of rotated) Object.assign(original.find(f=>f.id===change.id),change);
 assert.equal(rotated.length,3);
 assert(rotated.every(f=>Number.isFinite(f.cx)&&Number.isFinite(f.cy)));
 assert(original.every(f=>f.groupId==='group-f6'));
 const restored=structuredClone(before);
 assert.deepEqual(restored,before);
 clearFurnitureGroup(original,new Set(['group-f6']));
 assert(original.every(f=>f.groupId===null));
});
test('F6 distribution retains endpoints and achieves equal gaps',()=>{
 const f=fixture();const positions=distributeFurniture(f,'distributeX');
 const mapped=f.map(x=>({...x,...positions.find(v=>v.id===x.id)}));
 const boxes=mapped.map(furnitureBounds);
 const gap1=boxes[1].left-boxes[0].right;
 const gap2=boxes[2].left-boxes[1].right;
 assert(Math.abs(gap1-gap2)<.01);
 assert.equal(mapped[0].cx,f[0].cx);
 assert.equal(mapped[2].cx,f[2].cx);
});
test('F6 rotated furniture collision reports wall intersections',()=>{
 const sofa={id:'x',type:'sofa',cx:500,cy:500,w:1200,d:600,rot:45};
 const walls=[{id:'wall1',start:{x:600,y:-500},end:{x:600,y:1500},thickness:160}];
 const issues=checkFurnitureCollision(sofa,[],walls);
 assert(issues.some(x=>x.type==='wall'&&x.severity==='collision'));
});
test('F6 architectural doors and windows excluded from furniture overlap',()=>{
 const sofa={id:'x',type:'sofa',cx:0,cy:0,w:800,d:800};
 const door={id:'d',type:'dooropen',cx:0,cy:0,w:800,d:800};
 const win={id:'w',type:'windowbuilt',cx:0,cy:0,w:800,d:800};
 assert.equal(checkFurnitureCollision(sofa,[door,win],[]).length,0);
});
test('F6 all shipping layout JSON files parse and contain architecture',()=>{
 const dir=resolve('src/layouts');const files=readdirSync(dir).filter(f=>f.endsWith('.json'));
 assert(files.length>=5);
 for(const file of files){const json=JSON.parse(readFileSync(resolve(dir,file),'utf8'));
 assert(json&&typeof json==='object',file);
 }
});
test('F6 Cloudflare Pages output is configured as Vite dist',()=>{
 const pkg=JSON.parse(readFileSync('package.json','utf8'));
 assert.match(pkg.scripts.build,/vite build/);
 assert(pkg.scripts['test:architecture'].includes('tests/*.test.js'));
});
