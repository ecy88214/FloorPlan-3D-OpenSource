/** 建築幾何的純函式。單位一律為 mm。 */
export const EPSILON = 0.001;
export function length(start, end) { return Math.hypot(end.x-start.x, end.y-start.y); }
export function pointAt(segment, distance) {
  const len = length(segment.start, segment.end);
  if (len < EPSILON) return {...segment.start};
  return {x: segment.start.x + (segment.end.x-segment.start.x)*distance/len,
          y: segment.start.y + (segment.end.y-segment.start.y)*distance/len};
}
export function normal(segment) {
  const len = length(segment.start, segment.end);
  return len < EPSILON ? {x:0,y:0} : {x:-(segment.end.y-segment.start.y)/len, y:(segment.end.x-segment.start.x)/len};
}
export function boundsOfSegment(segment) {
  const n=normal(segment), h=segment.thickness/2;
  const pts=[segment.start,segment.end].flatMap(p=>[
    {x:p.x+n.x*h,y:p.y+n.y*h},{x:p.x-n.x*h,y:p.y-n.y*h}
  ]);
  return {minX:Math.min(...pts.map(p=>p.x)),minY:Math.min(...pts.map(p=>p.y)),maxX:Math.max(...pts.map(p=>p.x)),maxY:Math.max(...pts.map(p=>p.y))};
}
export function segmentFootprint(segment) {
  const n=normal(segment), h=segment.thickness/2, {start:s,end:e}=segment;
  return [[s.x+n.x*h,s.y+n.y*h],[e.x+n.x*h,e.y+n.y*h],
          [e.x-n.x*h,e.y-n.y*h],[s.x-n.x*h,s.y-n.y*h]];
}
