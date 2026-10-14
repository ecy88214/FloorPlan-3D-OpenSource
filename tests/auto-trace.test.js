import { test } from 'node:test';
import assert from 'node:assert/strict';
import {detectWallLines,convertDetectedWalls} from '../src/services/autoTraceEngine.js';
function raster(w,h,lines){const data=new Uint8ClampedArray(w*h*4);for(let i=0;i<data.length;i+=4){data[i]=data[i+1]=data[i+2]=255;data[i+3]=255;}for(const [x1,y1,x2,y2] of lines){const steps=Math.ceil(Math.hypot(x2-x1,y2-y1));for(let k=0;k<=steps;k++){const x=Math.round(x1+(x2-x1)*k/steps),y=Math.round(y1+(y2-y1)*k/steps);for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const px=x+dx,py=y+dy;if(px>=0&&py>=0&&px<w&&py<h){const n=(py*w+px)*4;data[n]=data[n+1]=data[n+2]=0;}}}}return {width:w,height:h,data};}
test('detects a horizontal long wall',()=>{const lines=detectWallLines(raster(240,180,[[15,65,225,65]]),{minLength:85});assert.ok(lines.some(l=>Math.abs(l.y1-l.y2)<5&&l.length>150));});
test('detects vertical walls',()=>{const lines=detectWallLines(raster(240,180,[[95,10,95,165]]),{minLength:85});assert.ok(lines.some(l=>Math.abs(l.x1-l.x2)<5&&l.length>110));});
test('maps image coordinates to calibrated plan units',()=>{const out=convertDetectedWalls([{x1:0,y1:0,x2:200,y2:0}],{x:100,y:200,width:4000,height:2000},200,100);assert.equal(out[0].end.x,4100);assert.equal(out[0].start.y,200);});
test('rejects tiny images',()=>assert.throws(()=>detectWallLines(raster(6,6,[]))));
