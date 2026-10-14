/** Unified command boundary for immediate edits and pointer-drag transactions. */
export function createCommandSystem({snapshot, restore, record, onChange = () => {}}) {
  if ([snapshot,restore,record,onChange].some(fn=>typeof fn!=='function')) throw new TypeError('Command callbacks required');
  let executing = false;
  function complete(before, {name='edit', finalize} = {}) {
    if (executing) throw new Error('Nested commands are not supported');
    executing = true;
    try {
      // Architecture drafts are kept in separate working arrays: capture them
      // inside the same transaction before creating the history entry.
      if (finalize) finalize();
      const changed = record(before);
      onChange({changed, type:'commit', name});
      return changed;
    } catch(error) {
      restore(before);
      onChange({changed:false, type:'rollback', name});
      throw error;
    } finally { executing=false; }
  }
  function execute(command) {
    const action = typeof command === 'function' ? command : command?.execute;
    if (typeof action !== 'function') throw new TypeError('Invalid command');
    if (executing) throw new Error('Nested commands are not supported');
    const before = snapshot();
    executing=true;
    try {
      action();
      const changed = record(before);
      onChange({changed, type:'execute', name:command?.name || 'edit'});
      return changed;
    } catch(error) {
      restore(before);
      onChange({changed:false, type:'rollback', name:command?.name || 'edit'});
      throw error;
    } finally {executing=false;}
  }
  function cancel(before, {name='drag'} = {}) {
    if(executing) throw new Error('Nested commands are not supported');
    restore(before);
    onChange({changed:false,type:'cancel',name});
  }
  return {execute, complete, cancel};
}
