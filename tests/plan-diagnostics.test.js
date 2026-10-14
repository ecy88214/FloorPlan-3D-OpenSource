import test from 'node:test';
import assert from 'node:assert/strict';
import {collectPlanIssues, chooseIssueSummary, makeDimensionLabel} from '../src/editor/planDiagnostics.js';
const f=(id,cx,cy,w=400,d=400)=>({id,type:'chair',name:`Chair ${id}`,cx,cy,w,d,rot:0});
test('overlapping furniture is counted only once',()=>{
 const issues=collectPlanIssues([f('a',0,0),f('b',100,0)]);
 assert.equal(issues.filter(x=>x.severity==='collision').length,1);
 assert.equal(chooseIssueSummary(issues).collisions,1);
});
test('clearance warnings distinguish from collisions',()=>{
 const issues=collectPlanIssues([f('a',0,0),f('b',750,0)]);
 assert.equal(issues.length,1);
 assert.equal(issues[0].severity,'clearance');
});
test('narrow passage advisory is distinguished from clearance',()=>{
 const issues=collectPlanIssues([f('a',0,0),f('b',1100,0)]);
 assert.equal(issues.length,1);
 assert.equal(issues[0].kind,'walkway');
});
test('distant furniture is not reported',()=>assert.deepEqual(collectPlanIssues([f('a',0,0),f('b',5000,0)]),[]));
test('wall overlaps are reported',()=>{
 const issues=collectPlanIssues([f('a',0,0)], [[-60,-900,60,900,'n']]);
 assert.ok(issues.some(x=>x.kind==='wall'&&x.severity==='collision'));
});
test('dimensions convert correctly',()=>{
 assert.equal(makeDimensionLabel(1250),'1,250 mm');
 assert.equal(makeDimensionLabel(1250,'m'),'1.25 m');
 assert.equal(makeDimensionLabel(-1),'—');
});
