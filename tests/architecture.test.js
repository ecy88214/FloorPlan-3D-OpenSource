import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {legacyWallToSegment,segmentToLegacyWall,normalizeArchitecture,synchronizeWallSegments} from '../src/architecture/adapters/legacyLayoutAdapter.js';
import {validateWallSegments} from '../src/architecture/core/wallEngine.js';
import {length,segmentFootprint} from '../src/architecture/core/geometry.js';
const wall=[0,0,2400,240,'b'];
test('既有矩形牆轉換後保留牆厚、類型與尺寸',()=>{
 const s=legacyWallToSegment(wall);
 assert.equal(s.thickness,240);assert.equal(s.type,'structural');assert.equal(s.loadBearing,true);
 assert.equal(length(s.start,s.end),2400);assert.deepEqual(segmentToLegacyWall(s),wall);
 assert.equal(segmentFootprint(s).length,4);
});
test('未更動的牆體維持穩定 ID；新增／刪除牆體不影響其他 ID',()=>{
 const initial=synchronizeWallSegments([wall,[3000,0,3240,1800,'n']]);
 const after=synchronizeWallSegments([[3000,0,3240,1800,'n']],initial);
 assert.equal(after[0].id,initial[1].id);
 const added=synchronizeWallSegments([[3000,0,3240,1800,'n'],[4000,0,4240,1800,'n']],after);
 assert.equal(added[0].id,after[0].id);assert.notEqual(added[1].id,after[0].id);
});
test('使用者儲存的 wallSegments 保留自訂高度及材質',()=>{
 const a=normalizeArchitecture({walls:[wall]});
 a.wallSegments[0].height=3100;a.wallSegments[0].materialId='oak';
 const b=normalizeArchitecture(a);
 assert.equal(b.wallSegments[0].id,a.wallSegments[0].id);
 assert.equal(b.wallSegments[0].height,3100);
 assert.equal(b.wallSegments[0].materialId,'oak');
});
test('無效牆厚或零長度會被檢查出來',()=>{
 const s=legacyWallToSegment(wall);s.thickness=0;
 assert.ok(validateWallSegments([s]).length);
});
for(const filename of fs.readdirSync(new URL('../src/layouts/', import.meta.url)).filter(f=>f.endsWith('.json'))){
 test(`房型相容轉換：${filename}`,()=>{
  const doc=JSON.parse(fs.readFileSync(new URL(`../src/layouts/${filename}`,import.meta.url)));
  const input=doc.architecture||doc.geometry||doc;
  const normalized=normalizeArchitecture(input);
  assert.equal(normalized.walls.length,normalized.wallSegments.length);
  assert.equal(new Set(normalized.wallSegments.map(s=>s.id)).size,normalized.wallSegments.length);
  assert.deepEqual(normalized.wallSegments.map(segmentToLegacyWall),normalized.walls);
  assert.deepEqual(validateWallSegments(normalized.wallSegments),[]);
 });
}
