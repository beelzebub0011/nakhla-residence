import { buildFloorInterior } from '../domain/prims';
import type { FloorId } from '../domain/types';
import { mergeBuckets } from './builder';

// Builds a floor's interior OFF the main thread: primitives, every modelled furniture mesh, AND the merge into
// draw batches. The main thread only wraps the transferred buffers in meshes, so a first floor entry never stalls (V8).
self.onmessage = (e: MessageEvent<{ id: number; f: FloorId }>) => {
  const t0 = performance.now(); const prims = buildFloorInterior(e.data.f); const t1 = performance.now(); const buckets = mergeBuckets(prims); const t2 = performance.now(); const transfer: ArrayBuffer[] = [];
  for (const b of buckets) { transfer.push(b.pos.buffer as ArrayBuffer, b.nor.buffer as ArrayBuffer, b.uv.buffer as ArrayBuffer); if (b.uv1) transfer.push(b.uv1.buffer as ArrayBuffer); }
  (self as unknown as { postMessage(m: unknown, t: ArrayBuffer[]): void }).postMessage({ id: e.data.id, buckets, ms: { build: Math.round(t1 - t0), merge: Math.round(t2 - t1), workerStart: Math.round(t0) } }, [...new Set(transfer)]);
};
