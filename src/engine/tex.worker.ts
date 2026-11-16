/// <reference lib="webworker" />
import { synthesize, type TexRecipe } from './texgen';

// Texture synthesis worker: pure number crunching, no DOM, nothing leaves the device.
self.onmessage = (e: MessageEvent<{ id: number; key: string; recipe: TexRecipe; size: number }>) => {
  const { id, key, recipe, size } = e.data;
  const maps = synthesize(key, recipe, size);
  (self as unknown as DedicatedWorkerGlobalScope).postMessage({ id, maps }, [maps.albedo.buffer, maps.normal.buffer, maps.rough.buffer]);
};
