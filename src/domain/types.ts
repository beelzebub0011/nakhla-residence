// Canonical metric domain types — ONE geometry drives 3D, 2D plans, AI facts and Blender export.
// Plan coordinates: origin at footprint SW corner, x = east (0..18 m), y = north (0..24 m),
// z = elevation above the floor's finished floor level (FFL). Right-handed, metres.

export type FloorId = 'G' | 'F01' | 'F02' | 'F03' | 'F04' | 'F05' | 'F06' | 'F07' | 'F08' | 'F09' | 'F10' | 'F11';
export type FloorCategory = 'ground' | 'residential' | 'wellness' | 'dining';
export type UnitTypeId = 'TYPE_A' | 'TYPE_B';
export type LocaleKey = 'ar' | 'en' | 'ckb' | 'zh';
export type L10n = Record<LocaleKey, string>;

export interface Rect { x0: number; y0: number; x1: number; y1: number }

export type OpeningKind =
  | 'door'      // interior hinged door, passable
  | 'entry'     // unit entry door (closed leaf, not part of unit walk graph)
  | 'arch'      // open passage with lintel, passable
  | 'window'    // glazed with sill, not passable
  | 'slider'    // floor-to-head glazed sliding door, passable
  | 'screen';   // full glass partition, not passable

export interface Opening {
  id: string;
  kind: OpeningKind;
  /** Plan rectangle spanning the wall thickness. */
  rect: Rect;
  sill: number;
  head: number;
  /** true when the opening is in an external (facade) wall */
  facade?: 'S' | 'N' | 'E' | 'W';
}

export type RoomKind =
  | 'living' | 'kitchen' | 'master' | 'second_bedroom' | 'third_bedroom' | 'bathroom' | 'master_bath'
  | 'laundry' | 'entry' | 'hall' | 'dressing' | 'balcony'
  | 'lobby' | 'stair' | 'lift' | 'service'
  | 'reception' | 'security' | 'management' | 'mail' | 'plant'
  | 'gym' | 'pool' | 'spa' | 'changing' | 'wellness-lounge'
  | 'restaurant' | 'cafe' | 'kitchen-commercial' | 'terrace' | 'shisha-conditional';

export interface Room {
  /** Local id, unique within its owner (unit or floor zone set). */
  id: string;
  kind: RoomKind;
  /** One or more axis-aligned clear-floor rectangles (union). */
  rects: Rect[];
  outdoor?: boolean;
  /** hero | secondary | proxy — honest fidelity tier */
  tier: 'hero' | 'secondary' | 'proxy';
  /** default eye-level viewpoint [x,y] and look-at target [x,y] in plan metres */
  view?: { eye: [number, number]; look: [number, number]; /** photo camera only (Cycles): eye height, level look and lens shift for straight verticals */ photo?: { z: number; fov: number; shiftY: number } };
}

export interface UnitPlan {
  typeId: UnitTypeId;
  /** Net internal outline polygon (inner face of external/party walls), CCW, plan metres. */
  outline: [number, number][];
  rooms: Room[];
  openings: Opening[];
}

export interface FloorDef {
  id: FloorId;
  number: number;
  category: FloorCategory;
  /** Elevation of finished floor level above ground datum (m). */
  ffl: number;
  floorToFloor: number;
  /** Clear ceiling height used for interior modelling (m). */
  clear: number;
  unitIds: string[];
  zoneIds: string[];
}

export interface UnitDef {
  id: string;
  floorId: FloorId;
  typeId: UnitTypeId;
  side: 'A' | 'B';
}

/** Neutral geometric primitive list: consumed by the Three.js builder AND the Blender builder. */
export type PrimGroup = 'shell' | 'glass' | 'fill' | 'interior' | 'lining' | 'floor' | 'ceiling' | 'furn' | 'roof' | 'site' | 'nav' | 'leaf' | 'mirror';

export interface BoxPrim {
  k: 'box';
  sem: string;      // stable semantic id
  room?: string;    // owning room key (for picking / surface scoping)
  mat: string;      // material slot id
  grp: PrimGroup;
  x0: number; x1: number; y0: number; y1: number; z0: number; z1: number;
  /** soft edge radius (m) for furniture */
  r?: number;
  /** surface id for the configurator (optional) */
  surf?: string;
  noShadow?: boolean;
}
export interface CylPrim {
  k: 'cyl';
  sem: string; mat: string; grp: PrimGroup; room?: string;
  cx: number; cy: number; r: number; z0: number; z1: number;
  r2?: number; // top radius (cone/taper)
  surf?: string;
}
/** Vertical lining quad on a wall face, facing into the room. */
export interface QuadPrim {
  k: 'quad';
  sem: string; mat: string; grp: PrimGroup; room?: string;
  ax: number; ay: number; bx: number; by: number; z0: number; z1: number;
  /** outward normal of the quad in plan (unit axis vector) */
  nx: number; ny: number;
  surf?: string;
  /** lightmap atlas rectangle [u0,v0,u1,v1] */
  lm?: [number, number, number, number];
}
/** Horizontal rectangle (floor finish or ceiling). */
export interface SlabPrim {
  k: 'slab';
  sem: string; mat: string; grp: PrimGroup; room?: string;
  x0: number; x1: number; y0: number; y1: number; z: number;
  up: boolean;
  surf?: string;
  /** lightmap atlas rectangle [u0,v0,u1,v1] */
  lm?: [number, number, number, number];
}
/** Modelled triangle mesh (non-indexed), plan metres, z up. Produced by modelkit.ts. */
export interface MeshPrim {
  k: 'mesh';
  sem: string; mat: string; grp: PrimGroup; room?: string; surf?: string; noShadow?: boolean;
  pos: Float32Array; nrm: Float32Array; uv: Float32Array;
}
export type Prim = BoxPrim | CylPrim | QuadPrim | SlabPrim | MeshPrim;

export const rectArea = (r: Rect) => (r.x1 - r.x0) * (r.y1 - r.y0);
export const rectsArea = (rs: Rect[]) => rs.reduce((s, r) => s + rectArea(r), 0);
export const rectCenter = (r: Rect): [number, number] => [(r.x0 + r.x1) / 2, (r.y0 + r.y1) / 2];
export const R = (x0: number, y0: number, x1: number, y1: number): Rect => ({ x0, y0, x1, y1 });

export function polygonArea(pts: [number, number][]): number {
  let a = 0;
  for (let i = 0; i < pts.length; i++) {
    const [x1, y1] = pts[i];
    const [x2, y2] = pts[(i + 1) % pts.length];
    a += x1 * y2 - x2 * y1;
  }
  return Math.abs(a) / 2;
}
