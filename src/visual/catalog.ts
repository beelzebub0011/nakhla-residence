import type { FloorId } from '../domain/types';
import { VIEWS, VIEW_BY_ID, type ViewDef } from '../domain/views';
import { FLOOR_BY_ID, UNIT_BY_ID } from '../domain/tower';
import { getFloorPlan } from '../domain/plans';
import { roomDims } from '../domain/audit';

// ---------------------------------------------------------------------------------------------
// SceneCatalog (V11.2 §29): the photoreal website's scenes, built from the SAME camera bookmarks the
// Cycles renders come from (src/domain/views.ts). Every scene maps to a semantic place in the 3D model
// (floor / unit type / room) and back, with honest fallbacks when a place has no rendered view.
// ---------------------------------------------------------------------------------------------

export type ChapterId = 'arrival' | 'building' | 'residence_a' | 'residence_b' | 'amenities';
export const CHAPTERS: ChapterId[] = ['arrival', 'building', 'residence_a', 'residence_b', 'amenities'];
export type Variant = 'day' | 'golden' | 'evening' | 'night';

export interface PhotoScene {
  id: string; view: ViewDef; chapter: ChapterId;
  /** scenes of the same place at other hours share a group */
  group: string; variant: Variant;
  floorId: FloorId | null; unitType: 'A' | 'B' | null; roomKey: string | null;
  /** model-derived area of the room shown (m²), when it is a room */
  areaSqm: number | null;
}

const variantOf = (t: number): Variant => (t >= 1230 ? 'night' : t >= 1150 ? 'evening' : t >= 1090 ? 'golden' : 'day');
const GROUP: Record<string, string> = {
  street_arrival: 'arrival', street_golden_sun: 'sunset', street_arrival_dusk: 'arrival', street_arrival_night: 'arrival',
  street_entrance: 'entrance', street_entrance_night: 'entrance',
  exterior_day: 'tower', exterior_golden: 'tower', exterior_dusk: 'tower', exterior_night: 'tower',
  living: 'A.living', living_golden: 'A.living', living_evening: 'A.living', living_night: 'A.living',
  balcony: 'A.balcony', A_balcony_evening: 'A.balcony',
  restaurant: 'restaurant', restaurant_evening: 'restaurant', terrace: 'terrace', terrace_dusk: 'terrace', terrace_night: 'terrace',
  lobby: 'lobby', lobby_night: 'lobby',
};
const CHAPTER_ORDER: Record<ChapterId, string[]> = {
  arrival: ['street_arrival_dusk', 'street_arrival', 'street_golden_sun', 'street_arrival_night', 'street_entrance', 'street_entrance_night'],
  building: ['exterior_dusk', 'exterior_golden', 'exterior_day', 'exterior_night', 'lobby', 'lobby_night'],
  residence_a: ['living', 'living_golden', 'living_evening', 'living_night', 'kitchen', 'master', 'A_bedroom2', 'A_dressing', 'bathroom', 'A_master_bath', 'A_entry', 'A_hall', 'balcony', 'A_balcony_evening'],
  residence_b: ['B_living', 'B_kitchen', 'B_master', 'B_bedroom2', 'B_bedroom3', 'B_dressing', 'B_bathroom', 'B_master_bath', 'B_hall', 'B_laundry', 'B_balcony'],
  amenities: ['pool', 'gym', 'spa', 'wellness_lounge', 'restaurant', 'restaurant_evening', 'cafe', 'terrace', 'terrace_dusk', 'terrace_night', 'shisha_lounge'],
};

function areaOf(v: ViewDef): number | null {
  if (!v.floor || !v.roomKey) return null;
  const r = getFloorPlan(v.floor).rooms.find((x) => x.key === v.roomKey); return r ? Math.round(roomDims(r).area * 10) / 10 : null;
}

export const SCENES: PhotoScene[] = CHAPTERS.flatMap((chapter) => CHAPTER_ORDER[chapter].filter((id) => VIEW_BY_ID[id]).map((id) => {
  const v = VIEW_BY_ID[id]; const rk = v.roomKey ?? null;
  return { id, view: v, chapter, group: GROUP[id] ?? (rk ?? id), variant: variantOf(v.time), floorId: v.floor ?? null,
    unitType: rk?.startsWith('A.') ? 'A' : rk?.startsWith('B.') ? 'B' : null, roomKey: rk, areaSqm: areaOf(v) } satisfies PhotoScene;
}));
export const SCENE_BY_ID: Record<string, PhotoScene> = Object.fromEntries(SCENES.map((s) => [s.id, s]));
export const HERO_SCENE = 'street_arrival_dusk';
/** every camera bookmark is reachable in the photo site (guard for the test) */
export const UNUSED_VIEWS = VIEWS.filter((v) => !SCENE_BY_ID[v.id]).map((v) => v.id);

export const groupScenes = (s: PhotoScene) => SCENES.filter((x) => x.group === s.group);
export const chapterScenes = (c: ChapterId) => SCENES.filter((x) => x.chapter === c);
const closestVariant = (list: PhotoScene[], minutes: number) => list.reduce((a, b) => (Math.abs(b.view.time - minutes) < Math.abs(a.view.time - minutes) ? b : a));

/** Where a 3D visitor is → the matching photo scene, or the closest honest parent (V11.2 §27). */
export interface SemanticPlace { floorId: FloorId | null; unitId: string | null; roomKey: string | null; view: 'tower' | 'floor' | 'unit' | 'room'; timeMinutes: number }
export function sceneForPlace(p: SemanticPlace): { sceneId: string; exact: boolean; reason: 'match' | 'room_not_rendered' | 'floor_overview' | 'tower' } {
  const pick = (group: string) => { const g = SCENES.filter((s) => s.group === group); return g.length ? closestVariant(g, p.timeMinutes).id : null; };
  if (p.roomKey) {
    const g = SCENES.find((s) => s.roomKey === p.roomKey)?.group; const id = g && pick(g);
    if (id) return { sceneId: id, exact: true, reason: 'match' };
    const side = p.roomKey.startsWith('A.') ? 'A' : p.roomKey.startsWith('B.') ? 'B' : null;
    if (side) return { sceneId: pick(`${side}.living`) ?? (side === 'B' ? 'B_living' : 'living'), exact: false, reason: 'room_not_rendered' };
  }
  if (p.unitId) { const side = UNIT_BY_ID[p.unitId]?.side; return { sceneId: side === 'B' ? 'B_living' : pick('A.living')!, exact: true, reason: 'match' }; }
  if (p.floorId) {
    const cat = FLOOR_BY_ID[p.floorId].category;
    const id = cat === 'ground' ? 'lobby' : cat === 'wellness' ? 'pool' : cat === 'dining' ? pick('restaurant') : null;
    if (id) return { sceneId: id, exact: false, reason: 'floor_overview' };
    return { sceneId: pick('tower')!, exact: false, reason: 'floor_overview' };
  }
  return { sceneId: pick('arrival') ?? HERO_SCENE, exact: true, reason: 'tower' };
}

/** A photo scene → the 3D place to open. Keeps the visitor's own apartment when it has the same plan type. */
export function placeForScene(sceneId: string, current: { floorId: FloorId | null; unitId: string | null }): {
  section: 'explore' | 'tour' | 'amenities'; floorId: FloorId | null; unitId: string | null; roomKey: string | null; view: 'tower' | 'room'; timeMinutes: number; note: 'same_type_other_floor' | null;
} {
  const s = SCENE_BY_ID[sceneId] ?? SCENE_BY_ID[HERO_SCENE]; const t = s.view.time;
  if (!s.roomKey || !s.floorId) return { section: 'explore', floorId: null, unitId: null, roomKey: null, view: 'tower', timeMinutes: t, note: null };
  if (s.unitType) {
    const mine = current.unitId && UNIT_BY_ID[current.unitId]?.side === s.unitType ? current.unitId : null;
    const unitId = mine ?? `U04${s.unitType}`;
    return { section: 'tour', floorId: UNIT_BY_ID[unitId].floorId, unitId, roomKey: s.roomKey, view: 'room', timeMinutes: t, note: mine && UNIT_BY_ID[mine].floorId !== 'F04' ? 'same_type_other_floor' : null };
  }
  return { section: 'amenities', floorId: s.floorId, unitId: null, roomKey: s.roomKey, view: 'room', timeMinutes: t, note: null };
}

/** Responsive image sources (generated by tools/web_images.py). */
/** V11.5: three widths (960 / 1600 / 2560) cut from the 2560 × 1440 masters — the viewer never upscales. */
export const IMAGE_WIDTHS = [960, 1600, 2560, 3840] as const;   // V12: 3840 cut, loaded only when a photo is zoomed
export const imageSrc = (id: string, w: 960 | 1600 | 2560 | 3840) => `${import.meta.env.BASE_URL}renders/w/${id}_${w}.webp`;
export const imageFallback = (id: string) => `${import.meta.env.BASE_URL}renders/${id}.jpg`;
