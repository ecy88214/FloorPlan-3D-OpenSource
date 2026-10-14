/** Maintains furniture multi-selection, with optional group expansion. */
export function createSelectionManager({ getFurniture }) {
  if (typeof getFurniture !== 'function') throw new TypeError('getFurniture is required');
  const ids = new Set();
  let selected = null;
  function valid(id) { return getFurniture().some(f => f.id === id); }
  function selectionForIds() { return ids.size ? {kind:'furn', id:[...ids].at(-1)} : null; }
  return {
    ids,
    getSelection: () => selected,
    select(selection) {
      ids.clear();
      selected = selection ? {...selection} : null;
      return selected;
    },
    selectFurniture(id, { additive = false, groupIds = [id] } = {}) {
      const members = [...new Set(groupIds)].filter(valid);
      if (!additive) ids.clear();
      if (additive && members.length && members.every(member => ids.has(member))) {
        for (const member of members) ids.delete(member);
      } else {
        for (const member of members) ids.add(member);
      }
      selected = selectionForIds();
      return selected;
    },
    reconcile(selection = selected) {
      for (const id of ids) if (!valid(id)) ids.delete(id);
      if (selection?.kind === 'furn' && valid(selection.id)) ids.add(selection.id);
      if (selection?.kind === 'furn' && !valid(selection.id)) selected = selectionForIds();
      else selected = selection;
      return selected;
    },
    clear() { ids.clear(); selected = null; return null; }
  };
}
