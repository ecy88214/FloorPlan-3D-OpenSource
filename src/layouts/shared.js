export const R = (x0,y0,x1,y1) => [[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
export const room = (id, name, x0, y0, x1, y1, mat) => ({id, name, poly:R(x0,y0,x1,y1), mat, at:[(x0+x1)/2,(y0+y1)/2]});
export const shell = (entryRect, height = 10560) => {
  const [entryX0,,,] = entryRect, entryX1 = entryRect[2];
  return [[0,-240,10270,0,'e'],[-240,0,0,height,'e'],[10270,0,10510,height,'e'],[0,height,entryX0,height+240,'e'],[entryX1,height,10270,height+240,'e']];
};
export const entry = {name:'入口門',rect:[4300,10320,5200,10560],h:[4300,10560],c:[0,-1],o:[1,0],len:900,entry:true};
