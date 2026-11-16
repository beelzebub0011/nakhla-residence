import type { FloorDef, FloorId, UnitDef, UnitTypeId } from './types';

// ---------------------------------------------------------------------------------------------
// NAKHLA RESIDENCE — canonical tower model (ORIGINAL FICTIONAL CONCEPT, NOT ENGINEER-VERIFIED).
// 12 occupied levels: G + F01..F09 residential + F10 wellness + F11 sky dining.
// The roof plant zone is NOT an occupied floor.
// ---------------------------------------------------------------------------------------------

export const SITE = { frontage: 24, depth: 32 } as const;
export const FOOTPRINT = { w: 18, d: 24 } as const; // 432 m² enclosed plate (concept hypothesis)
export const SLAB = 0.3;            // structural slab + finishes zone below FFL (m)
export const WALL = { ext: 0.3, party: 0.24, int: 0.12 } as const;
export const PLINTH = 0.45;         // ground floor FFL above site datum
export const ROOF_PLANT_H = 2.6;    // unoccupied plant screen height above roof slab

const heights: [FloorId, FloorDef['category'], number, number][] = [
  ['G', 'ground', 4.6, 4.0],
  ['F01', 'residential', 3.4, 2.8], ['F02', 'residential', 3.4, 2.8], ['F03', 'residential', 3.4, 2.8],
  ['F04', 'residential', 3.4, 2.8], ['F05', 'residential', 3.4, 2.8], ['F06', 'residential', 3.4, 2.8],
  ['F07', 'residential', 3.4, 2.8], ['F08', 'residential', 3.4, 2.8], ['F09', 'residential', 3.4, 2.8],
  ['F10', 'wellness', 4.8, 4.1],
  ['F11', 'dining', 4.2, 3.5],
];

const zones: Partial<Record<FloorId, string[]>> = {
  G: ['lobby', 'reception', 'security', 'services'],
  F10: ['gym', 'pool', 'spa', 'changing', 'wellness-lounge'],
  F11: ['restaurant', 'cafe', 'kitchen', 'terrace', 'shisha-conditional'],
};

export const FLOORS: FloorDef[] = (() => {
  let ffl = PLINTH;
  return heights.map(([id, category, f2f, clear], number) => {
    const nn = String(number).padStart(2, '0');
    const def: FloorDef = {
      id, number, category, ffl: +ffl.toFixed(3), floorToFloor: f2f, clear,
      unitIds: category === 'residential' ? [`U${nn}A`, `U${nn}B`] : [],
      zoneIds: zones[id] ?? [],
    };
    ffl += f2f;
    return def;
  });
})();

export const FLOOR_IDS = FLOORS.map((f) => f.id);
export const FLOOR_BY_ID = Object.fromEntries(FLOORS.map((f) => [f.id, f])) as Record<FloorId, FloorDef>;
export const ROOF_LEVEL = +(FLOORS[11].ffl + FLOORS[11].floorToFloor).toFixed(3); // top of occupied levels
export const TOWER_TOP = ROOF_LEVEL + ROOF_PLANT_H;

export const UNITS: UnitDef[] = FLOORS.filter((f) => f.category === 'residential').flatMap((f) =>
  (['A', 'B'] as const).map((side) => ({
    id: `U${String(f.number).padStart(2, '0')}${side}`,
    floorId: f.id,
    typeId: (side === 'A' ? 'TYPE_A' : 'TYPE_B') as UnitTypeId,
    side,
  })),
);
export const UNIT_BY_ID = Object.fromEntries(UNITS.map((u) => [u.id, u])) as Record<string, UnitDef>;

export const UNIT_TYPES: Record<UnitTypeId, { bedrooms: number; bathrooms: number; conceptAreaSqm: number; hero: boolean }> = {
  TYPE_A: { bedrooms: 2, bathrooms: 2, conceptAreaSqm: 125, hero: true },
  TYPE_B: { bedrooms: 3, bathrooms: 2, conceptAreaSqm: 145, hero: false },
};

export const isFloorId = (v: unknown): v is FloorId => typeof v === 'string' && v in FLOOR_BY_ID;
export const isUnitId = (v: unknown): v is string => typeof v === 'string' && v in UNIT_BY_ID;

/** Plan (x east, y north) -> world (X east, Z south) with footprint centred on the origin. */
export const toWorldX = (x: number) => x - FOOTPRINT.w / 2;
export const toWorldZ = (y: number) => FOOTPRINT.d / 2 - y;
