// 房屋長寬以房間地坪的包圍框（毫米）為準，不含外牆厚度。
export function houseBounds(rooms) {
  const points=rooms.flatMap(r=>r.poly);
  if (!points.length) return [0,0,8000,6000];
  return [Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))];
}
export function resizeArchitecture(architecture, furniture, measures, width, depth) {
  const [x,y,x1,y1]=houseBounds(architecture.rooms), sx=width/(x1-x), sy=depth/(y1-y);
  const point=p=>[x+(p[0]-x)*sx,y+(p[1]-y)*sy];
  const rect=r=>[...point(r.slice(0,2)),...point(r.slice(2,4)),...r.slice(4)];
  architecture.walls=architecture.walls.map(rect);
  architecture.windows=architecture.windows.map(rect);
  architecture.slides.forEach(s=>s.rect=rect(s.rect));
  architecture.doors.forEach(d=>{d.rect=rect(d.rect);d.h=point(d.h);d.len*=Math.hypot(d.c[0]*sx,d.c[1]*sy);});
  architecture.rooms.forEach(r=>{r.poly=r.poly.map(point);if(r.at)r.at=point(r.at);});
  // 家具保留真實尺寸，只調整中心位置；門窗需同步調整開口尺寸。
  furniture.forEach(f=>{[f.cx,f.cy]=point([f.cx,f.cy]);if (/^(door|window|wall)/.test(f.type)) {const a=f.rot*Math.PI/180; f.w*=Math.hypot(Math.cos(a)*sx,Math.sin(a)*sy);f.d*=Math.hypot(Math.sin(a)*sx,Math.cos(a)*sy);}});
  measures.forEach(m=>{[m.a.x,m.a.y]=point([m.a.x,m.a.y]);[m.b.x,m.b.y]=point([m.b.x,m.b.y]);});
  return architecture;
}
