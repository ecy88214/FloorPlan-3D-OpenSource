import test from 'node:test';
import assert from 'node:assert/strict';
import {parseAreaLabels,findAreaLabels,estimateScaleFromRoomAreas} from '../src/services/areaScaleEngine.js';
test('room area annotations and ping conversions',()=>{
 const areas=parseAreaLabels('主臥室 10.15 m² / 3.07 坪 衛浴 3.96 m2 / 1.20 坪 廚房 4.52㎡/1.37坪');
 assert.equal(areas.length,3);
 assert.equal(areas[0].squareMetres,10.15);
});
test('reject inconsistent ping number',()=>{
 assert.equal(parseAreaLabels('10.15 m² / 10.15 坪').length,0);
});
test('fallback OCR tokens extracted from word list',()=>{
 const words=['10.15','m²','/','3.07','坪','12.23','m2','/','3.70','坪'].map(text=>({text}));
 assert.equal(findAreaLabels(words,'').length,2);
});
test('no dimension info never invents a scale',()=>{
 assert.equal(estimateScaleFromRoomAreas(null,[{squareMetres:10},{squareMetres:12},{squareMetres:4}]),null);
});
test('estimate from a synthetic building-shaped raster',()=>{
 const w=240,h=220,data=new Uint8ClampedArray(w*h*4).fill(255);
 for(let y=22;y<190;y++)for(let x=27;x<210;x++){
  const k=(y*w+x)*4;data[k]=200;data[k+1]=184;data[k+2]=160;data[k+3]=255;
 }
 const r=estimateScaleFromRoomAreas({data,width:w,height:h},[{squareMetres:8},{squareMetres:9},{squareMetres:11}]);
 assert.ok(r?.mmPerPixel>0);
 assert.equal(r.estimated,true);
});
