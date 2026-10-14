import test from 'node:test';
import assert from 'node:assert/strict';
import { createProjectStore } from '../src/stores/projectStore.js';
import { queueProjectBackup } from '../src/services/projectStorage.js';

function mockDB() {
  const docs = new Map();
  globalThis.indexedDB = {
    open() {
      const request = {};
      queueMicrotask(() => {
        const db = {
          objectStoreNames: { contains: () => true },
          transaction() {
            const tx = { error: null };
            tx.objectStore = () => ({
              get(key) {
                const r = {};
                queueMicrotask(() => { r.result = docs.get(key); r.onsuccess?.(); queueMicrotask(() => tx.oncomplete?.()); });
                return r;
              },
              put(value, key) {
                const r = {};
                queueMicrotask(() => { docs.set(key, value); r.result = key; r.onsuccess?.(); queueMicrotask(() => tx.oncomplete?.()); });
                return r;
              }
            });
            return tx;
          },
          close() {}
        };
        request.result = db;
        request.onsuccess?.();
      });
      return request;
    }
  };
  return docs;
}

test('backup accepts deep reactive Proxy and snapshots state at save time', async () => {
  const docs = mockDB();
  const store = createProjectStore({ layoutType:'3', furniture:[{id:'bed',cx:1}], architecture:{walls:[[1,2,3,4]]} });
  const proxy = store.getState();
  assert.throws(() => structuredClone(proxy), {name:'DataCloneError'});
  const first = queueProjectBackup(proxy);
  proxy.layoutType = '1';
  proxy.furniture[0].cx = 7;
  const second = queueProjectBackup(proxy);
  await Promise.all([first, second]);
  assert.equal(docs.get('project:latest').value.layoutType,'1');
  assert.equal(docs.get('project:latest').value.furniture[0].cx,7);
  assert.equal(docs.get('project:backup').value.layoutType,'3');
  assert.equal(docs.get('project:backup').value.furniture[0].cx,1);
});
