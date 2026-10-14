/** Reactive project document, compatible with legacy mutable editor operations. */
export function createProjectStore(initialState) {
  if (!initialState || typeof initialState !== 'object' || !Array.isArray(initialState.furniture)) throw new TypeError('Invalid project');
  let raw = initialState;
  const listeners = new Set();
  const proxies = new WeakMap();
  let revision = 0, depth = 0, pending = false;
  const notify = (previous, reason) => {
    revision++;
    if (depth) { pending = true; return; }
    for (const cb of [...listeners]) cb(root, previous, {revision, reason});
  };
  const proxy = object => {
    if (!object || typeof object !== 'object') return object;
    if (proxies.has(object)) return proxies.get(object);
    const wrapped = new Proxy(object, {
      get(target, key, receiver) { return proxy(Reflect.get(target, key, receiver)); },
      set(target, key, value, receiver) {
        const old = target[key];
        const changed = !Object.is(old, value);
        const ok = Reflect.set(target, key, value, receiver);
        if (ok && changed) notify(root, 'mutation');
        return ok;
      },
      deleteProperty(target, key) {
        const present = Object.hasOwn(target,key);
        const ok = Reflect.deleteProperty(target,key);
        if (present && ok) notify(root, 'mutation');
        return ok;
      }
    });
    proxies.set(object, wrapped);
    return wrapped;
  };
  let root = proxy(raw);
  const valid = value => value && typeof value === 'object' && Array.isArray(value.furniture);
  function batch(fn) {
    depth++;
    try { return fn(root); }
    finally { depth--; if (!depth && pending) { pending = false; for (const cb of [...listeners]) cb(root, root, {revision, reason:'batch'}); } }
  }
  return {
    getState: () => root,
    get revision() {return revision;},
    replace(next) {
      if (!valid(next)) throw new TypeError('Invalid project');
      if (Object.is(root,next)) return root;
      const previous = root;
      raw = structuredClone(next);
      root = proxy(raw);
      notify(previous,'replace');
      return root;
    },
    update(mutator) {
      if (typeof mutator !== 'function') throw new TypeError('Mutator required');
      const next = structuredClone(raw);
      mutator(next);
      return this.replace(next);
    },
    batch,
    subscribe(listener) {
      if (typeof listener !== 'function') throw new TypeError('Listener required');
      listeners.add(listener);
      return () => listeners.delete(listener);
    }
  };
}
