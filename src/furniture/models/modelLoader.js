import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { getModel } from './modelStore.js';

const loader = new GLTFLoader();
const MAX_CACHED_MODELS = 8;
const pending = new Map();
const cache = new Map();

export function parseGLB(blob) {
  return new Promise(async (resolve, reject) => {
    try {
      const buffer = await blob.arrayBuffer();
      loader.parse(buffer, '', gltf => resolve(gltf.scene), reject);
    } catch (error) { reject(error); }
  });
}

// Cache parsed GLB geometry and textures by asset ID. Clone the hierarchy on use;
// cached geometry and textures are shared and must not be disposed by individual views.
async function sourceFor(id) {
  if (!id) throw new Error('家具缺少模型 ID');
  if (cache.has(id)) {
    const entry = cache.get(id);
    cache.delete(id); cache.set(id, entry);
    return entry;
  }
  if (pending.has(id)) return pending.get(id);
  const promise = (async () => {
    const asset = await getModel(id);
    if (!asset?.blob) throw new Error('找不到 GLB 模型：' + id + '，請從模型管理重新匯入');
    const scene = await parseGLB(asset.blob);
    const bounds = new THREE.Box3().setFromObject(scene);
    if (bounds.isEmpty() || !Number.isFinite(bounds.min.x) ||
        bounds.getSize(new THREE.Vector3()).lengthSq() <= 1e-12) {
      throw new Error('GLB 模型沒有有效幾何');
    }
    const entry = { scene, height: asset.height };
    cache.set(id, entry);
    while (cache.size > MAX_CACHED_MODELS) cache.delete(cache.keys().next().value);
    return entry;
  })();
  pending.set(id, promise);
  try { return await promise; }
  finally { pending.delete(id); }
}

export function invalidateModelCache(id) {
  if (id) cache.delete(id);
  else cache.clear();
}
export const modelCacheStats = () => ({ entries: cache.size, pending: pending.size, limit: MAX_CACHED_MODELS });

export async function loadCustomFurniture(f) {
  const entry = await sourceFor(f.modelAssetId);
  const model = SkeletonUtils.clone(entry.scene);
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  if (!Number.isFinite(size.x) || !Number.isFinite(size.y) || !Number.isFinite(size.z) ||
      Math.max(size.x, size.y, size.z) <= 0) throw new Error('模型沒有有效幾何');
  const width = Number(f.w) || 1000;
  const depth = Number(f.d) || Number(f.h) || 1000;
  const scaleX = width / 1000 / Math.max(.001, size.x);
  const scaleZ = depth / 1000 / Math.max(.001, size.z);
  const uniform = Math.min(scaleX, scaleZ);
  const desiredHeight = (Number(f.modelHeight) || Number(entry.height) || 1000) / 1000;
  const scaleY = desiredHeight / Math.max(.001, size.y);
  model.scale.set(uniform, scaleY, uniform);
  model.position.set(-center.x * uniform, -box.min.y * scaleY, -center.z * uniform);
  model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  return model;
}
