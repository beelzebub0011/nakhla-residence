import * as THREE from 'three';
import { generate, synthesize, type MapArrays, type TexRecipe } from './texgen';
import { PHOTO_SETS } from './photosets';

// Texture cache for the ORIGINAL procedural PBR sets (albedo + normal + roughness).
// Synthesis is pure and runs in a Web Worker for everything that can be prepared ahead, so
// preparing finishes never blocks a frame (V8); a synchronous fallback keeps correctness if a
// set is requested before the worker has delivered it.

export type { TexRecipe } from './texgen';
export interface TextureSet { map: THREE.Texture; normalMap: THREE.Texture; roughnessMap: THREE.Texture; cover: [number, number]; tint?: THREE.Color; roughScale?: number }

// ---- photo-scanned CC0 sets (public/textures). One GPU copy per set+scale, shared by every material that uses it.
type PhotoRecipe = Extract<TexRecipe, { type: 'photo' }>;
interface PhotoEntry { map: THREE.Texture; normalMap: THREE.Texture; roughnessMap: THREE.Texture; cover: [number, number]; ready: Promise<void> }
const photos = new Map<string, PhotoEntry>();
const BASE = (import.meta as unknown as { env?: { BASE_URL?: string } }).env?.BASE_URL ?? './';
let onPhotoLoaded: (() => void) | null = null;
/** Called whenever a scanned texture finishes decoding (the engine requests a redraw). */
export function setPhotoLoadedHook(fn: (() => void) | null) { onPhotoLoaded = fn; }
function photoEntry(r: PhotoRecipe, size: number, anisotropy: number): PhotoEntry {
  const scale = r.scale ?? 1; const key = `${r.set}:${scale}`;
  let e = photos.get(key); if (e) return e;
  const meta = PHOTO_SETS[r.set]; const cover: [number, number] = [meta.cover[0] * scale, meta.cover[1] * scale];
  const mk = (fill: string, srgb: boolean) => {
    const t = new THREE.Texture(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / cover[0], 1 / cover[1]); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = anisotropy; t.flipY = false;
    if (typeof document !== 'undefined') { const c = document.createElement('canvas'); c.width = c.height = 2; const g = c.getContext('2d')!; g.fillStyle = fill; g.fillRect(0, 0, 2, 2); t.image = c; t.needsUpdate = true; }
    return t;
  };
  const rg = Math.round(meta.rough * 255);
  const map = mk(meta.avg, true), normalMap = mk('#8080ff', false), roughnessMap = mk(`rgb(${rg},${rg},${rg})`, false);
  const load = async (t: THREE.Texture, suffix: string) => {
    try {
      const res = await fetch(`${BASE}textures/${r.set}_${suffix}.jpg`); const blob = await res.blob();
      const opts: ImageBitmapOptions = { imageOrientation: 'flipY', colorSpaceConversion: 'none' }; if (size <= 256) { opts.resizeWidth = 512; opts.resizeHeight = 512; opts.resizeQuality = 'high'; }
      t.image = await createImageBitmap(blob, opts); t.needsUpdate = true; onPhotoLoaded?.();
    } catch { /* keeps the flat placeholder */ }
  };
  const ready = typeof fetch === 'undefined' || typeof createImageBitmap === 'undefined' ? Promise.resolve() : Promise.all([load(map, 'd'), load(normalMap, 'n'), load(roughnessMap, 'r')]).then(() => undefined);
  e = { map, normalMap, roughnessMap, cover, ready }; photos.set(key, e); return e;
}
function photoSet(r: PhotoRecipe, size: number, anisotropy: number): TextureSet {
  const e = photoEntry(r, size, anisotropy); const meta = PHOTO_SETS[r.set];
  const tint = new THREE.Color(r.tint ?? '#ffffff'); if (meta.tint) tint.multiplyScalar(1 / 0.6); if (r.gain) tint.multiplyScalar(r.gain);
  return { map: e.map, normalMap: e.normalMap, roughnessMap: e.roughnessMap, cover: e.cover, tint, roughScale: r.rough / Math.max(0.05, meta.rough) };
}

const cache = new Map<string, TextureSet>();
const pending = new Map<string, Promise<void>>();
const workers: Worker[] = []; let workerFailed = false; let seq = 0;
/** texture synthesis runs on a small pool so a cold start is not queued behind one worker */
const POOL = typeof navigator !== 'undefined' ? Math.max(1, Math.min(3, (navigator.hardwareConcurrency ?? 2) - 1)) : 1;
const waiters = new Map<number, (m: MapArrays | null) => void>();

function getWorker(): Worker | null {
  if (workerFailed) return null;
  try {
    if (workers.length < POOL) {
      const w = new Worker(new URL('./tex.worker.ts', import.meta.url), { type: 'module' });
      w.onmessage = (e: MessageEvent<{ id: number; maps: MapArrays }>) => { waiters.get(e.data.id)?.(e.data.maps); waiters.delete(e.data.id); };
      w.onerror = () => { workerFailed = true; for (const x of waiters.values()) x(null); waiters.clear(); for (const k of workers.splice(0)) k.terminate(); };
      workers.push(w); return w;
    }
    return workers[seq % workers.length];
  } catch { workerFailed = true; return null; }
}

function toTexture(data: Uint8ClampedArray, size: number, cover: [number, number], srgb: boolean, anisotropy: number): THREE.Texture {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const ctx = c.getContext('2d')!; const img = ctx.createImageData(size, size); img.data.set(data); ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / cover[0], 1 / cover[1]);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = anisotropy; t.generateMipmaps = true; t.needsUpdate = true; return t;
}
function fromArrays(m: MapArrays, anisotropy: number): TextureSet {
  return { map: toTexture(m.albedo, m.size, m.cover, true, anisotropy), normalMap: toTexture(m.normal, m.size, m.cover, false, anisotropy), roughnessMap: toTexture(m.rough, m.size, m.cover, false, anisotropy), cover: m.cover };
}

/** Synchronous access (generates on the main thread only if the set was never prepared). */
export function getTextureSet(key: string, recipe: TexRecipe, size: number, anisotropy: number): TextureSet {
  const ck = `${key}@${size}`;
  let set = cache.get(ck);
  if (!set) { set = recipe.type === 'photo' ? photoSet(recipe, size, anisotropy) : fromArrays(synthesize(key, recipe, size), anisotropy); cache.set(ck, set); }
  return set;
}

/** Prepare a set off the main thread. Resolves when it is in the cache. */
export function prepareTextureSet(key: string, recipe: TexRecipe, size: number, anisotropy: number): Promise<void> {
  const ck = `${key}@${size}`;
  if (recipe.type === 'photo') { getTextureSet(key, recipe, size, anisotropy); return photoEntry(recipe, size, anisotropy).ready; }
  if (cache.has(ck)) return Promise.resolve();
  const p0 = pending.get(ck); if (p0) return p0;
  const w = getWorker();
  const p = new Promise<void>((resolve) => {
    if (!w) { getTextureSet(key, recipe, size, anisotropy); resolve(); return; }
    const id = ++seq;
    waiters.set(id, (maps) => { if (!cache.has(ck)) cache.set(ck, maps ? fromArrays(maps, anisotropy) : fromArrays(synthesize(key, recipe, size), anisotropy)); pending.delete(ck); resolve(); });
    w.postMessage({ id, key, recipe, size });
  });
  pending.set(ck, p); return p;
}
export const hasTextureSet = (key: string, size: number) => cache.has(`${key}@${size}`);

/** Small swatch data-URL for UI thumbnails — rendered from the SAME recipe as the 3D surface. */
const thumbCache = new Map<string, string>();
export function getSwatchDataUrl(key: string, recipe: TexRecipe): string {
  const hit = thumbCache.get(key); if (hit) return hit;
  if (recipe.type === 'photo' && !recipe.tint && !recipe.gain) { const u = `${BASE}textures/${recipe.set}_d.jpg`; thumbCache.set(key, u); return u; }
  const { f } = generate(recipe, 96, key);
  const c = document.createElement('canvas'); c.width = c.height = 96; const ctx = c.getContext('2d')!; const img = ctx.createImageData(96, 96); img.data.set(f.rgb); ctx.putImageData(img, 0, 0);
  const url = c.toDataURL('image/png'); thumbCache.set(key, url); return url;
}

export function disposeTextureCache() {
  for (const s of cache.values()) { s.map.dispose(); s.normalMap.dispose(); s.roughnessMap.dispose(); }
  photos.clear(); cache.clear(); pending.clear(); for (const w of workers.splice(0)) w.terminate(); waiters.clear();
}
export const textureCacheSize = () => cache.size;
