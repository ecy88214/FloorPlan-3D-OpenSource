import test from 'node:test';
import assert from 'node:assert/strict';
import {rotateFurnitureSet,makeFurnitureGroup,clearFurnitureGroup} from '../src/furniture/core/groupEngine.js';
const furniture = () => [{id:'a',cx:0,cy:0,rot:0},{id:'b',cx:1000,cy:0,rot:30}];
test('rotating selected furniture around shared midpoint keeps spacing',()=>{const r=rotateFurnitureSet(furniture(),90);assert.equal(r[0].cx,500);assert.equal(r[0].cy,-500);assert.equal(r[1].cx,500);assert.equal(r[1].cy,500);assert.equal(r[1].rot,120);});
test('free rotation retains decimal angle',()=>{assert.equal(rotateFurnitureSet(furniture(),32.5)[0].rot,32.5);});
test('group and ungroup keeps individual furniture items',()=>{const f=furniture();assert.equal(makeFurnitureGroup(f,'group-1'),true);assert.equal(f[0].groupId,'group-1');clearFurnitureGroup(f,new Set(['group-1']));assert.equal(f[0].groupId,null);assert.equal(f[1].groupId,null);});
test('group refuses a single item',()=>{const f=furniture();assert.equal(makeFurnitureGroup([f[0]],'x'),false);});
test('no rotation for invalid number',()=>{assert.deepEqual(rotateFurnitureSet(furniture(),NaN),[]);});
