/** Pure furniture transformations in millimeters, measured about the selection center. */
export function rotateFurnitureSet(items, angleDegrees) {
  if (!items.length || !Number.isFinite(angleDegrees)) return [];
  const minX = Math.min(...items.map(f => f.cx));
  const maxX = Math.max(...items.map(f => f.cx));
  const minY = Math.min(...items.map(f => f.cy));
  const maxY = Math.max(...items.map(f => f.cy));
  const mx = (minX + maxX) / 2, my = (minY + maxY) / 2;
  const angle = angleDegrees * Math.PI / 180, c = Math.cos(angle), s = Math.sin(angle);
  return items.map(f => {
    const x = f.cx - mx, y = f.cy - my;
    return { id: f.id, cx: Math.round((mx + x * c - y * s) * 100) / 100,
      cy: Math.round((my + x * s + y * c) * 100) / 100,
      rot: ((Number(f.rot || 0) + angleDegrees) % 360 + 360) % 360 };
  });
}
export function makeFurnitureGroup(items, groupId) {
  if (!groupId || items.length < 2) return false;
  for (const furniture of items) furniture.groupId = groupId;
  return true;
}
export function clearFurnitureGroup(items, ids) {
  for (const furniture of items) if (ids.has(furniture.groupId)) furniture.groupId = null;
}
