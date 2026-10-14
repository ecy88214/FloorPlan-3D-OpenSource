/** 與 DOM 無關的尺寸、面積、旋轉幾何計算。 */
export const area = poly => Math.abs(poly.reduce((a,p,i) => { const q = poly[(i+1)%poly.length]; return a + p[0]*q[1] - q[0]*p[1]; }, 0)) / 2 / 1e6;
export const perim = poly => poly.reduce((a,p,i) => { const q = poly[(i+1)%poly.length]; return a + Math.hypot(q[0]-p[0], q[1]-p[1]); }, 0) / 1000;
export const bbox = poly => { const xs = poly.map(p=>p[0]), ys = poly.map(p=>p[1]); return [Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)]; };
export function aabb(f){ const a = f.rot*Math.PI/180, c = Math.abs(Math.cos(a)), s = Math.abs(Math.sin(a)); return {hw:f.w/2*c + f.d/2*s, hh:f.w/2*s + f.d/2*c}; }
export const fmt = (n, d=2) => n.toFixed(d);
export const ping = sqm => sqm / 3.305785;
export const areaUnit = (sqm, digits=2) => `${fmt(sqm, digits)} m²／${fmt(ping(sqm), digits)} 坪`;
export const norm = a => ((Math.round(a) % 360) + 360) % 360;
