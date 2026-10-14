import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Regression guard: each room option must map to a distinct architectural blueprint.
test('bedroom presets contain distinct architecture and furniture data', () => {
  const plans = ['1','2','3','4'].map((number) => {
    const names = {'1':'OneBedroom','2':'TwoBedroom','3':'ThreeBedroom','4':'FourBedroom'};
    const data = JSON.parse(readFileSync(new URL(`../src/layouts/${names[number]}.json`, import.meta.url)));
    assert.equal(String(data.layoutType), number);
    const architecture = data.architecture ?? data.geometry ?? data;
    assert.ok(architecture.walls.length > 0);
    assert.ok(architecture.rooms.length > 0);
    return JSON.stringify([architecture.walls,architecture.rooms,data.furniture]);
  });
  assert.equal(new Set(plans).size, 4);
});

test('room selector switch explicitly restores architectural geometry before rendering', () => {
  const source = readFileSync(new URL('../src/editor/planEditor.js', import.meta.url), 'utf8');
  const handler = source.slice(source.indexOf('function switchRoomLayout(next)'),source.indexOf("$('#splitWall').onclick"));
  assert.ok(handler.includes('restoreArchitecture(state.architecture)'));
  assert.ok(handler.includes('setPlanBounds(next)'));
  assert.ok(handler.includes('svgRenderer.invalidate()'));
  assert.ok(handler.includes('fitView()'));
  assert.ok(handler.includes('renderAll()'));
});

test('layout switching must snapshot reactive Proxy state before cloning', async () => {
  const {createProjectStore} = await import('../src/stores/projectStore.js');
  const store = createProjectStore({layoutType:'3',furniture:[],architecture:{walls:[[0,0,100,20,'n']],windows:[],doors:[],slides:[],rooms:[]}});
  const state = store.getState();
  assert.throws(() => structuredClone(state), {name:'DataCloneError'});
  assert.throws(() => structuredClone(state.architecture.walls), {name:'DataCloneError'});
  const snapshot = JSON.stringify(state);
  const previous = JSON.parse(snapshot);
  assert.equal(previous.layoutType, '3');
  const architecture = JSON.parse(JSON.stringify(state.architecture));
  assert.deepEqual(structuredClone(architecture.walls), [[0,0,100,20,'n']]);
  store.replace({...previous,layoutType:'1'});
  assert.equal(store.getState().layoutType, '1');
});

test('layout change never directly structuredClone()s reactive state or architecture', () => {
  const source = readFileSync(new URL('../src/editor/planEditor.js', import.meta.url), 'utf8');
  const switcher = source.slice(source.indexOf('function switchRoomLayout(next)'),source.indexOf("$('#splitWall').onclick"));
  assert.ok(switcher.includes('const previous = JSON.parse(before)'));
  assert.doesNotMatch(switcher, /structuredClone\(state\)/);
  const restoration = source.slice(source.indexOf('function restoreArchitecture(a)'),source.indexOf('function syncArchitecture()'));
  assert.ok(restoration.includes('JSON.parse(JSON.stringify(a))'));
  assert.ok(restoration.includes('normalizeArchitecture(architecture)'));
});
