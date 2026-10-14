/** Ordered SVG stages with dirty-layer support and independent render post-processing. */
export function setSvgLayerMarkup(target, markup, root = globalThis.document) {
  const element = typeof target === 'string' ? root?.querySelector(target) : target;
  if (!element) return false;
  const next = String(markup ?? '');
  if (element.innerHTML !== next) element.innerHTML = next;
  return true;
}
export function createSvgRenderer({layers = [], afterRender = () => {}} = {}) {
  const stages = [...layers];
  if (stages.some(stage => typeof stage !== 'function')) throw new TypeError('Every SVG stage must be a function');
  const dirty = new Set(stages.map((_,i)=>i));
  const indices = () => [...dirty].sort((a,b)=>a-b);
  const run = (items, after=true) => {for (const index of items) if (stages[index]) {stages[index]();dirty.delete(index);} if (after) afterRender();};
  return {
    invalidate(items) {if (items == null) stages.forEach((_,i)=>dirty.add(i)); else for (const index of items) if (Number.isInteger(index) && index>=0 && index<stages.length) dirty.add(index);},
    render() {this.invalidate();run(indices());},
    renderDirty() {if (dirty.size) run(indices());},
    renderLayers(items) {run(items,false);},
    get dirtyCount() {return dirty.size;},
    get layerCount() {return stages.length;}
  };
}
