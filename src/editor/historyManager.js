/** 純資料歷史引擎：與 Vue、DOM、Three.js 無耦合。 */
export function createHistoryManager({limit = 150, serialize = JSON.stringify, deserialize = JSON.parse} = {}) {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError('limit must be a positive integer');
  const undoEntries = [];
  const redoEntries = [];
  const capture = value => serialize(value);
  const record = (before, after) => {
    const next = capture(after);
    if (before === next) return false;
    undoEntries.push(before);
    if (undoEntries.length > limit) undoEntries.shift();
    redoEntries.length = 0;
    return true;
  };
  return {
    snapshot: capture,
    record,
    execute(current, change) {
      if (typeof change !== 'function') throw new TypeError('change must be a function');
      const before = capture(current);
      // 操作失敗時不新增歷史；若已變更資料，還原原始狀態。
      try { change(current); }
      catch (error) { return {value: deserialize(before), changed: false, error}; }
      return {value:current, changed:record(before,current)};
    },
    undo(current) {
      if (!undoEntries.length) return null;
      const previous = undoEntries.pop();
      redoEntries.push(capture(current));
      return deserialize(previous);
    },
    redo(current) {
      if (!redoEntries.length) return null;
      const next = redoEntries.pop();
      undoEntries.push(capture(current));
      if (undoEntries.length > limit) undoEntries.shift();
      return deserialize(next);
    },
    clear() { undoEntries.length = 0; redoEntries.length = 0; },
    get canUndo() { return undoEntries.length > 0; },
    get canRedo() { return redoEntries.length > 0; },
    get undoCount() { return undoEntries.length; },
    get redoCount() { return redoEntries.length; },
    // 沿用既有 UI 的 history.length 讀取方式，禁止直接修改堆疊。
    undoEntries,
    redoEntries
  };
}
