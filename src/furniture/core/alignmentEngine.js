/** F3 家具批次排列：輸入不可變，回傳位置變更，單位 mm。 */
export function furnitureBounds(f){
 const a=(f.rot||0)*Math.PI/180,c=Math.abs(Math.cos(a)),s=Math.abs(Math.sin(a));
 const hx=(f.w*c+f.d*s)/2,hy=(f.w*s+f.d*c)/2;
 return {left:f.cx-hx,right:f.cx+hx,top:f.cy-hy,bottom:f.cy+hy,cx:f.cx,cy:f.cy};
}
export function alignFurniture(items,mode){
 if(items.length<2)return [];
 const box=items.map(f=>({f,b:furnitureBounds(f)}));
 const left=Math.min(...box.map(x=>x.b.left)),right=Math.max(...box.map(x=>x.b.right));
 const top=Math.min(...box.map(x=>x.b.top)),bottom=Math.max(...box.map(x=>x.b.bottom));
 return box.map(({f,b})=>({id:f.id,cx:mode==='left'?f.cx+left-b.left:mode==='right'?f.cx+right-b.right:mode==='centerX'?(left+right)/2:f.cx,cy:mode==='top'?f.cy+top-b.top:mode==='bottom'?f.cy+bottom-b.bottom:mode==='centerY'?(top+bottom)/2:f.cy}));
}
export function distributeFurniture(items,mode){
 if(items.length<3)return [];
 const horizontal=mode==='distributeX';
 if(!horizontal&&mode!=='distributeY')return [];
 const sorted=items.map(f=>({f,b:furnitureBounds(f)})).sort((a,b)=>horizontal?a.b.left-b.b.left:a.b.top-b.b.top);
 const begin=horizontal?'left':'top',end=horizontal?'right':'bottom';
 const space=(sorted.at(-1).b[end]-sorted[0].b[begin]-sorted.reduce((v,x)=>v+x.b[end]-x.b[begin],0))/(sorted.length-1);
 let cursor=sorted[0].b[end];
 return sorted.map(({f,b},i)=>{let d=0;if(i!==0&&i!==sorted.length-1){d=cursor+space-b[begin];cursor=cursor+space+(b[end]-b[begin]);}else if(i===sorted.length-1){d=0;}return {id:f.id,cx:f.cx+(horizontal?d:0),cy:f.cy+(horizontal?0:d)};});
}
