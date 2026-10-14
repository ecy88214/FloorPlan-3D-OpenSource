import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMillimetres,scaleConsensus,dimensionCandidate,extractDimensionScales} from '../src/services/autoScaleEngine.js';
test('dimension parsing accepts mm with common OCR substitutions',()=>{
  assert.equal(parseMillimetres('3,600'),3600);
  assert.equal(parseMillimetres('1200mm'),1200);
  assert.equal(parseMillimetres('9O0'),900);
  assert.equal(parseMillimetres('48'),null);
  assert.equal(parseMillimetres('door'),null);
});
test('scale consensus requires multiple agreeing anchors',()=>{
  const one=scaleConsensus([{mmPerPixel:10,weight:1}]);
  assert.equal(one.confident,false);
  const result=scaleConsensus([{mmPerPixel:10,weight:1},{mmPerPixel:10.2,weight:.9},{mmPerPixel:35,weight:.1}]);
  assert.equal(result.confident,true);
  assert.ok(result.mmPerPixel>10 && result.mmPerPixel<10.3);
});
test('scale consensus rejects inconsistent dimension matches',()=>{
  const r=scaleConsensus([{mmPerPixel:9,weight:1},{mmPerPixel:11,weight:1}]);
  assert.equal(r.confident,false);
});
test('dimension candidate does not fabricate scale from empty image',()=>{
  const data=new Uint8ClampedArray(320*160*4).fill(255);
  const image={width:320,height:160,data};
  assert.equal(dimensionCandidate(image,{x0:110,y0:30,x1:155,y1:48},'3600'),null);
  assert.equal(extractDimensionScales(image,[]),null);
});

test('OCR hierarchy words are normalized from blocks',async()=>{
 const {normalizeOCRWords}=await import('../src/services/autoScaleEngine.js');
 const data={blocks:[{paragraphs:[{lines:[{words:[{text:'3600',confidence:95,bbox:{x0:5,y0:8,x1:33,y1:21}}]}]}]}]};
 assert.equal(normalizeOCRWords(data).length,1);
 assert.equal(normalizeOCRWords(data)[0].text,'3600');
});
test('units convert to millimetres',()=>{
 assert.equal(parseMillimetres('360cm'),3600);
 assert.equal(parseMillimetres('3.6m'),3600);
});
