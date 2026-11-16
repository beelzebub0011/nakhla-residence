import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { FloorId, LocaleKey } from '../domain/types';
import { FLOOR_BY_ID, UNIT_BY_ID, isFloorId, isUnitId } from '../domain/tower';
import { getFloorPlan } from '../domain/plans';
import { MATERIAL_BY_ID, PACKAGE_IDS, SURFACES, SURFACE_BY_ID, sanitizeOverrides, type Overrides, type PackageId } from '../domain/materials';
import { SEASONS, WEATHERS, type SeasonId, type WeatherId } from '../engine/environment';
import { HERO_SCENE, SCENE_BY_ID, placeForScene, sceneForPlace } from '../visual/catalog';

// ---------------------------------------------------------------------------------------------
// Single source of truth for the experience. The 3D engine, the 2D Lite view, the Nakhla
// assistant and the URL all read/write THIS store through validated actions.
// ---------------------------------------------------------------------------------------------

export type Section = 'explore' | 'tour' | 'design' | 'amenities';
export const SECTIONS: Section[] = ['explore', 'tour', 'design', 'amenities'];
export type View = 'tower' | 'floor' | 'unit' | 'room';
export type Mode = 'cinematic' | 'guided' | 'free_walk' | 'property_explorer';
export const MODES: Mode[] = ['property_explorer', 'guided', 'free_walk', 'cinematic'];
export type Quality = 'auto' | 'lite' | 'low' | 'balanced' | 'high' | 'ultra';
export type Tier = 'lite' | 'low' | 'balanced' | 'high' | 'ultra';
export type MotionPref = 'gentle' | 'reduced';
export type OverlayId = 'ai' | 'env' | 'summary' | 'contact' | 'help' | 'gallery' | 'inquiry' | 'finder' | 'compare' | 'pricing' | 'menu' | 'lang' | 'plan' | null;
export const LOCALES: LocaleKey[] = ['ar', 'en', 'ckb', 'zh'];
/** V11.2: the two complete experiences — real-time 3D and the photoreal website */
export type Experience = '3d' | 'visual' | 'plans';   // V12: the 2D plans section is the third experience
export type SceneNotice = 'room_not_rendered' | 'floor_overview' | 'same_type_other_floor' | null;
const EXP_KEY = 'nakhla.experience';
export const lastExperience = (): Experience | null => { try { const v = localStorage.getItem(EXP_KEY); return v === '3d' || v === 'visual' || v === 'plans' ? v : null; } catch { return null; } };

interface MatSnapshot { packageId: PackageId; overrides: Overrides }

export interface AppState {
  locale: LocaleKey;
  landing: boolean;
  experience: Experience;
  /** photoreal website: current scene ('home' = the editorial overview page) */
  sceneId: string | null;
  /** honest note shown after a mode switch that could not land on the exact same place */
  sceneNotice: SceneNotice;
  section: Section;
  view: View;
  floorId: FloorId | null;
  unitId: string | null;
  roomKey: string | null;
  mode: Mode;
  selectedSurfaceId: string | null;
  packageId: PackageId;
  overrides: Overrides;
  past: MatSnapshot[];
  future: MatSnapshot[];
  beforeAfter: boolean;
  env: { timeMinutes: number; seasonId: SeasonId; weatherId: WeatherId };
  quality: Quality;
  tier: Tier;
  motionPref: MotionPref;
  audio: { muted: boolean; optedInThisPageLoad: boolean };
  overlay: OverlayId;
  hoverFloorId: FloorId | null;
  hoverKey: string | null;
  xray: boolean;
  compareIds: string[];
  webgl: 'pending' | 'ok' | 'lost' | 'unavailable';
  toast: { id: number; key: string; vars?: Record<string, string> } | null;
  cine: { active: boolean; paused: boolean; chapter: number };
  /** Focus view: the interface is hidden so only the architecture is on screen */
  focus: boolean;
  /** Showroom film: the cinematic tour loops until the visitor leaves */
  showcase: boolean;
  /** Apartment lighting: auto follows the hour, on / off are explicit (not persisted) */
  lights: 'auto' | 'on' | 'off';
  hud: boolean;
  motionPhase: string;
  ready3d: boolean;
  /** visitor chose the 2D plan view (always available; also used when WebGL is missing) */
  lite: boolean;

  // actions
  setLocale(l: LocaleKey): void;
  enter(): void;
  chooseExperience(e: Experience): void;
  setScene(id: string): void;
  setSection(s: Section): void;
  selectFloor(id: FloorId | null): void;
  selectUnit(id: string): void;
  focusRoom(key: string | null): void;
  enterRoom(key: string): void;
  setMode(m: Mode): void;
  back(): void;
  home(): void;
  selectSurface(id: string | null): void;
  setOverride(surfaceId: string, materialId: string): void;
  setPackage(p: PackageId): void;
  undo(): void; redo(): void; resetFinishes(): void;
  setBeforeAfter(b: boolean): void;
  setEnv(e: Partial<AppState['env']>): void;
  setQuality(q: Quality): void;
  setTier(t: Tier): void;
  setMotionPref(m: MotionPref): void;
  toggleSound(): void;
  openOverlay(o: OverlayId): void;
  setHoverFloor(id: FloorId | null): void;
  setHoverKey(k: string | null): void;
  setXray(b: boolean): void;
  toggleCompare(unitId: string): void;
  setWebgl(s: AppState['webgl']): void;
  notify(key: string, vars?: Record<string, string>): void;
  clearToast(): void;
  setCine(c: Partial<AppState['cine']>): void;
  setFocus(on: boolean): void;
  setLights(l: AppState['lights']): void;
  startShowcase(): void;
  set(partial: Partial<AppState>): void;
}

const DEFAULT_UNIT = 'U04A';
export const sideOf = (unitId: string) => UNIT_BY_ID[unitId].side;
export const isAmenityFloor = (f: FloorId | null) => f === 'F10' || f === 'F11';
export const roomExists = (floorId: FloorId, key: string) => getFloorPlan(floorId).rooms.some((r) => r.key === key);
export const defaultRoomFor = (floorId: FloorId, unitId: string | null): string =>
  unitId ? `${sideOf(unitId)}.living` : floorId === 'F10' ? 'zone.pool' : floorId === 'F11' ? 'zone.restaurant' : floorId === 'G' ? 'zone.lobby_hall' : 'core.lobby';

const prefersReduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

const STORE_KEY = 'nakhla.v8';
interface Persisted { locale?: LocaleKey; packageId?: PackageId; overrides?: Overrides; quality?: Quality; motionPref?: MotionPref }
function loadPersisted(): Persisted {
  try {
    const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(STORE_KEY) : null;
    if (!raw) return {};
    const p = JSON.parse(raw) as Record<string, unknown>; const out: Persisted = {};
    if (LOCALES.includes(p.locale as LocaleKey)) out.locale = p.locale as LocaleKey;
    if (PACKAGE_IDS.includes(p.packageId as PackageId)) out.packageId = p.packageId as PackageId;
    out.overrides = sanitizeOverrides(p.overrides);
    if (['auto', 'lite', 'low', 'balanced', 'high', 'ultra'].includes(p.quality as string)) out.quality = p.quality as Quality;
    if (p.motionPref === 'gentle' || p.motionPref === 'reduced') out.motionPref = p.motionPref;
    return out; // NOTE: audio is deliberately never persisted — every page load starts muted (V4).
  } catch { return {}; }
}

const persisted = loadPersisted();
let toastId = 0;

export const useStore = create<AppState>()(subscribeWithSelector((set, get) => {
  const pushHistory = () => { const s = get(); return { past: [...s.past.slice(-29), { packageId: s.packageId, overrides: s.overrides }], future: [] as MatSnapshot[] }; };
  return {
    locale: persisted.locale ?? 'ar',
    landing: true,
    experience: '3d',
    sceneId: null,
    sceneNotice: null,
    section: 'explore',
    view: 'tower',
    floorId: null, unitId: null, roomKey: null,
    mode: 'property_explorer',
    selectedSurfaceId: null,
    packageId: persisted.packageId ?? 'standard',
    overrides: persisted.overrides ?? {},
    past: [], future: [],
    beforeAfter: false,
    env: { timeMinutes: 960, seasonId: 'summer', weatherId: 'clear' },
    quality: persisted.quality ?? 'auto',
    tier: 'balanced',
    motionPref: persisted.motionPref ?? (prefersReduced() ? 'reduced' : 'gentle'),
    audio: { muted: true, optedInThisPageLoad: false },
    overlay: null,
    hoverFloorId: null, hoverKey: null,
    xray: false,
    compareIds: [],
    webgl: 'pending',
    toast: null,
    cine: { active: false, paused: false, chapter: 0 },
    focus: false, showcase: false, lights: 'auto',
    hud: false,
    motionPhase: 'IDLE',
    ready3d: false,
    lite: typeof location !== 'undefined' && /[?&]lite=1/.test(location.search),

    setLocale: (locale) => set({ locale, overlay: null }),
    enter: () => set({ landing: false }),
    chooseExperience: (e) => {
      const s = get(); try { sessionStorage.setItem('nakhla.entered', '1'); localStorage.setItem(EXP_KEY, e); } catch { /* ignore */ }
      const calm = { overlay: null, focus: false, showcase: false, cine: { active: false, paused: false, chapter: 0 } } as const;
      if (e === 'plans') {   // V12: same floor / apartment / room as the place the visitor came from
        const floorId = s.floorId ?? (s.experience === 'visual' && s.sceneId && SCENE_BY_ID[s.sceneId]?.floorId) ?? 'F04';
        set({ ...calm, experience: 'plans', landing: false, floorId: floorId as FloorId, sceneNotice: null });
        return;
      }
      if (e === 'visual') {
        // from the gateway: the signature arrival scene; from 3D: the same place when it is rendered, else its honest parent
        // an exterior scene the visitor came from is remembered while they stay on the whole-tower view in 3D
        const prev = s.sceneId ? SCENE_BY_ID[s.sceneId] : undefined;
        const m = s.landing || s.experience === 'visual' ? { sceneId: s.sceneId ?? HERO_SCENE, exact: true, reason: 'tower' as const }
          : prev && !prev.roomKey && s.view === 'tower' ? { sceneId: prev.id, exact: true, reason: 'tower' as const }
          : sceneForPlace({ floorId: s.floorId, unitId: s.unitId, roomKey: s.roomKey, view: s.view, timeMinutes: s.env.timeMinutes });
        set({ ...calm, experience: 'visual', landing: false, sceneId: m.sceneId, sceneNotice: m.exact || m.reason === 'tower' || m.reason === 'match' ? null : m.reason });
        return;
      }
      if (s.experience === 'visual' && s.sceneId && s.sceneId !== 'home' && SCENE_BY_ID[s.sceneId]) {
        const p = placeForScene(s.sceneId, { floorId: s.floorId, unitId: s.unitId });
        set({ ...calm, experience: '3d', landing: false, section: p.section, floorId: p.floorId, unitId: p.unitId, roomKey: p.roomKey, view: p.view,
          mode: p.view === 'room' ? 'guided' : 'property_explorer', selectedSurfaceId: null, env: { ...s.env, timeMinutes: p.timeMinutes }, sceneNotice: p.note });
        return;
      }
      set({ ...calm, experience: '3d', landing: false, sceneNotice: null });
    },
    setScene: (id) => set({ sceneId: id === 'home' || SCENE_BY_ID[id] ? id : 'home', sceneNotice: null, overlay: null }),

    setSection: (section) => {
      const s = get(); const patch: Partial<AppState> = { section, landing: false, overlay: null, cine: { active: false, paused: false, chapter: 0 } };
      if (section === 'explore') {
        if (s.view === 'room') { patch.view = s.unitId ? 'unit' : s.floorId ? 'floor' : 'tower'; patch.mode = 'property_explorer'; }
        if (isAmenityFloor(s.floorId)) { patch.floorId = null; patch.unitId = null; patch.roomKey = null; patch.view = 'tower'; }
        patch.selectedSurfaceId = null;
      } else if (section === 'tour') {
        let floorId = s.floorId, unitId = s.unitId, roomKey = s.roomKey;
        if (!floorId || (FLOOR_BY_ID[floorId].category === 'residential' && !unitId) || floorId === 'G') { unitId = unitId ?? DEFAULT_UNIT; floorId = UNIT_BY_ID[unitId].floorId; roomKey = null; }
        if (!roomKey || !roomExists(floorId, roomKey)) roomKey = defaultRoomFor(floorId, unitId);
        Object.assign(patch, { floorId, unitId, roomKey, view: 'room', mode: s.mode === 'free_walk' ? 'free_walk' : 'guided', selectedSurfaceId: null });
      } else if (section === 'design') {
        let unitId = s.unitId ?? DEFAULT_UNIT; const floorId = UNIT_BY_ID[unitId].floorId;
        if (isAmenityFloor(s.floorId) || s.floorId === 'G') unitId = DEFAULT_UNIT;
        let roomKey = s.roomKey && s.roomKey.startsWith(sideOf(unitId) + '.') ? s.roomKey : `${sideOf(unitId)}.living`;
        if (!roomExists(UNIT_BY_ID[unitId].floorId, roomKey)) roomKey = `${sideOf(unitId)}.living`;
        const view: View = s.view === 'unit' && s.unitId === unitId ? 'unit' : 'room';
        Object.assign(patch, { floorId: UNIT_BY_ID[unitId].floorId ?? floorId, unitId, roomKey, view, mode: view === 'room' ? (s.mode === 'free_walk' ? 'free_walk' : 'guided') : 'property_explorer' });
      } else {
        if (!isAmenityFloor(s.floorId)) Object.assign(patch, { floorId: 'F10', unitId: null, roomKey: null, view: 'floor', mode: 'property_explorer' });
        else if (s.view === 'tower') patch.view = 'floor';
        patch.selectedSurfaceId = null;
      }
      set(patch);
    },

    selectFloor: (id) => {
      if (id === null) { set({ floorId: null, unitId: null, roomKey: null, view: 'tower', selectedSurfaceId: null, mode: 'property_explorer', hoverKey: null }); return; }
      if (!isFloorId(id)) return;
      const s = get();
      set({ floorId: id, unitId: null, roomKey: null, view: 'floor', selectedSurfaceId: null, landing: false, mode: 'property_explorer', hoverKey: null,
        section: isAmenityFloor(id) ? 'amenities' : s.section === 'amenities' || s.section === 'tour' || s.section === 'design' ? 'explore' : s.section });
    },
    selectUnit: (id) => {
      if (!isUnitId(id)) return; const s = get();
      set({ floorId: UNIT_BY_ID[id].floorId, unitId: id, roomKey: null, view: 'unit', landing: false, mode: 'property_explorer', selectedSurfaceId: null, hoverKey: null,
        section: s.section === 'design' ? 'design' : 'explore' });
    },
    focusRoom: (key) => {
      const s = get(); if (!s.floorId) return;
      if (key === null || roomExists(s.floorId, key)) set({ roomKey: key });
    },
    enterRoom: (key) => {
      const s = get(); if (!s.floorId || !roomExists(s.floorId, key)) return;
      const patch: Partial<AppState> = { roomKey: key, view: 'room', landing: false, hoverKey: null, mode: s.mode === 'free_walk' ? 'free_walk' : 'guided' };
      if (key.startsWith('A.') || key.startsWith('B.')) {
        const unitId = FLOOR_BY_ID[s.floorId].unitIds.find((u) => sideOf(u) === key[0]);
        if (!unitId) return;
        patch.unitId = unitId; patch.section = s.section === 'design' ? 'design' : 'tour';
      } else {
        patch.section = isAmenityFloor(s.floorId) ? 'amenities' : s.section === 'tour' ? 'tour' : 'explore';
      }
      set(patch);
    },
    setMode: (mode) => {
      const s = get();
      if (mode === 'property_explorer') { set({ mode, view: s.unitId ? 'unit' : s.floorId ? 'floor' : 'tower', cine: { active: false, paused: false, chapter: 0 } }); return; }
      if (mode === 'cinematic') { set({ mode, cine: { active: true, paused: false, chapter: 0 }, overlay: null }); return; }
      let floorId = s.floorId, unitId = s.unitId, roomKey = s.roomKey;
      if (!floorId) { unitId = DEFAULT_UNIT; floorId = UNIT_BY_ID[unitId].floorId; }
      if (FLOOR_BY_ID[floorId].category === 'residential' && !unitId) unitId = FLOOR_BY_ID[floorId].unitIds[0];
      if (!roomKey || !roomExists(floorId, roomKey)) roomKey = defaultRoomFor(floorId, unitId);
      set({ mode, floorId, unitId, roomKey, view: 'room', cine: { active: false, paused: false, chapter: 0 } });
    },
    back: () => {
      const s = get();
      if (s.overlay) { set({ overlay: null }); return; }
      if (s.cine.active) { set({ cine: { active: false, paused: false, chapter: 0 }, mode: 'guided', showcase: false, focus: false }); return; }
      if (s.view === 'room') set({ view: s.unitId ? 'unit' : 'floor', mode: 'property_explorer', selectedSurfaceId: null, section: s.section === 'tour' ? 'explore' : s.section });
      else if (s.view === 'unit') set({ view: 'floor', unitId: null, roomKey: null, selectedSurfaceId: null, section: s.section === 'design' ? 'explore' : s.section });
      else if (s.view === 'floor') set({ view: 'tower', floorId: null, roomKey: null, section: s.section === 'amenities' ? 'amenities' : 'explore' });
    },
    home: () => set({ view: 'tower', floorId: null, unitId: null, roomKey: null, selectedSurfaceId: null, section: 'explore', mode: 'property_explorer', overlay: null, cine: { active: false, paused: false, chapter: 0 } }),

    selectSurface: (id) => { if (id === null || SURFACE_BY_ID[id]) set({ selectedSurfaceId: id }); },
    setOverride: (surfaceId, materialId) => {
      const def = SURFACE_BY_ID[surfaceId]; const mat = MATERIAL_BY_ID[materialId];
      if (!def || !mat || mat.category !== def.category) return; // typed + validated: never an arbitrary write
      const s = get(); if (s.overrides[surfaceId] === materialId) return;
      set({ ...pushHistory(), overrides: { ...s.overrides, [surfaceId]: materialId } });
    },
    setPackage: (p) => { if (!PACKAGE_IDS.includes(p)) return; const s = get(); if (s.packageId === p && !Object.keys(s.overrides).length) return; set({ ...pushHistory(), packageId: p, overrides: {} }); },
    undo: () => { const s = get(); const prev = s.past[s.past.length - 1]; if (!prev) return; set({ past: s.past.slice(0, -1), future: [{ packageId: s.packageId, overrides: s.overrides }, ...s.future], packageId: prev.packageId, overrides: prev.overrides }); },
    redo: () => { const s = get(); const next = s.future[0]; if (!next) return; set({ future: s.future.slice(1), past: [...s.past, { packageId: s.packageId, overrides: s.overrides }], packageId: next.packageId, overrides: next.overrides }); },
    resetFinishes: () => { const s = get(); if (s.packageId === 'standard' && !Object.keys(s.overrides).length) return; set({ ...pushHistory(), packageId: 'standard', overrides: {} }); },
    setBeforeAfter: (beforeAfter) => set({ beforeAfter }),

    setEnv: (e) => {
      const cur = get().env; const next = { ...cur };
      if (typeof e.timeMinutes === 'number' && Number.isFinite(e.timeMinutes)) next.timeMinutes = Math.min(1439, Math.max(0, Math.round(e.timeMinutes)));
      if (e.seasonId && SEASONS.includes(e.seasonId)) next.seasonId = e.seasonId;
      if (e.weatherId && WEATHERS.includes(e.weatherId)) next.weatherId = e.weatherId;
      set({ env: next });
    },
    setQuality: (quality) => set({ quality }),
    setTier: (tier) => set({ tier }),
    setMotionPref: (motionPref) => set({ motionPref }),
    toggleSound: () => { const a = get().audio; set({ audio: { muted: !a.muted, optedInThisPageLoad: a.optedInThisPageLoad || a.muted } }); },
    openOverlay: (overlay) => set({ overlay }), // single active overlay by construction
    setHoverFloor: (hoverFloorId) => { if (get().hoverFloorId !== hoverFloorId) set({ hoverFloorId }); },
    setHoverKey: (hoverKey) => { if (get().hoverKey !== hoverKey) set({ hoverKey }); },
    setXray: (xray) => set({ xray }),
    toggleCompare: (unitId) => {
      if (!isUnitId(unitId)) return; const c = get().compareIds;
      set({ compareIds: c.includes(unitId) ? c.filter((x) => x !== unitId) : [...c, unitId].slice(-2) });
    },
    setWebgl: (webgl) => set({ webgl }),
    notify: (key, vars) => set({ toast: { id: ++toastId, key, vars } }),
    clearToast: () => set({ toast: null }),
    setCine: (c) => set({ cine: { ...get().cine, ...c } }),
    setFocus: (on) => set({ focus: on, overlay: null }),
    setLights: (l) => set({ lights: l }),
    startShowcase: () => set({ showcase: true, focus: true, landing: false, overlay: null, section: 'tour', mode: 'cinematic', cine: { active: true, paused: false, chapter: 0 } }),
    set: (partial) => set(partial),
  };
}));

// ------------------------------------------------------------------ persistence (never audio)
useStore.subscribe((s) => [s.locale, s.packageId, s.overrides, s.quality, s.motionPref] as const, ([locale, packageId, overrides, quality, motionPref]) => {
  try { localStorage.setItem(STORE_KEY, JSON.stringify({ locale, packageId, overrides, quality, motionPref })); } catch { /* storage may be unavailable */ }
}, { equalityFn: (a, b) => a.every((v, i) => v === b[i]) });

// ------------------------------------------------------------------ URL <-> state (share links, Back/Forward)
const overridesToParam = (o: Overrides) => Object.entries(o).map(([sid, mid]) => `${SURFACES.findIndex((x) => x.id === sid)}-${mid.replace('MAT_', '')}`).join('.');
const paramToOverrides = (p: string | null): Overrides => {
  const raw: Record<string, string> = {};
  for (const part of (p ?? '').split('.')) { const [i, m] = part.split('-'); const sdef = SURFACES[Number(i)]; if (sdef && m) raw[sdef.id] = `MAT_${m}`; }
  return sanitizeOverrides(raw);
};

/** Compact, allow-listed share state. Never contains visitor contact data. */
export function stateToHash(s: AppState): string {
  const q = new URLSearchParams();
  if (s.floorId) q.set('f', s.floorId); if (s.unitId) q.set('u', s.unitId); if (s.roomKey) q.set('r', s.roomKey);
  if (s.view !== 'tower') q.set('v', s.view); if (s.view === 'room') q.set('m', s.mode === 'cinematic' ? 'guided' : s.mode);
  if (s.packageId !== 'standard') q.set('p', s.packageId);
  const o = overridesToParam(s.overrides); if (o) q.set('o', o);
  if (s.env.timeMinutes !== 960) q.set('t', String(s.env.timeMinutes)); if (s.env.seasonId !== 'summer') q.set('s', s.env.seasonId); if (s.env.weatherId !== 'clear') q.set('w', s.env.weatherId);
  // V11.4 demo pricing deep link: ?pr=1 (3D, the unit is in u=) or ?pr=U04A (photoreal site)
  if (s.overlay === 'pricing') q.set('pr', s.experience === 'visual' && s.unitId ? s.unitId : '1');
  if (s.experience === 'visual' && !s.landing) return `#/${s.locale}/visual/${s.sceneId ?? 'home'}${s.overlay === 'pricing' ? `?pr=${s.unitId ?? '1'}` : ''}`;
  if (s.experience === 'plans' && !s.landing) { const pq = new URLSearchParams(); if (s.floorId) pq.set('f', s.floorId); if (s.unitId) pq.set('u', s.unitId); if (s.roomKey) pq.set('r', s.roomKey); const ps = pq.toString(); return `#/${s.locale}/plans${ps ? `?${ps}` : ''}`; }
  const qs = q.toString();
  return `#/${s.locale}/${s.section}${qs ? `?${qs}` : ''}`;
}

export function hashToPatch(hash: string): Partial<AppState> | null {
  const pm = /^#\/(ar|en|ckb|zh)\/plans(?:\?(.*))?$/.exec(hash);   // V12: 2D plans section
  if (pm) {
    const q = new URLSearchParams(pm[2] ?? ''); const f = q.get('f'), u = q.get('u'), r = q.get('r');
    let floorId: FloorId = isFloorId(f) ? f : 'F04'; const unitId = isUnitId(u) ? u : null; if (unitId) floorId = UNIT_BY_ID[unitId].floorId;
    return { locale: pm[1] as LocaleKey, experience: 'plans', landing: false, floorId, unitId, roomKey: r && roomExists(floorId, r) ? r : null };
  }
  const vm = /^#\/(ar|en|ckb|zh)\/visual(?:\/([a-zA-Z0-9_]+))?(?:\?pr=([A-Z0-9]+))?$/.exec(hash);
  if (vm) {
    const id = vm[2] && (vm[2] === 'home' || SCENE_BY_ID[vm[2]]) ? vm[2] : 'home';
    const patch: Partial<AppState> = { locale: vm[1] as LocaleKey, experience: 'visual', sceneId: id, landing: false };
    if (vm[3]) { patch.overlay = 'pricing'; if (isUnitId(vm[3])) { patch.unitId = vm[3]; patch.floorId = UNIT_BY_ID[vm[3]].floorId; } }
    return patch;
  }
  // V11.3 audit fix: a bare language link (#/en, #/en/) opens the entry screen in that language (it used to be ignored)
  const lm = /^#\/(ar|en|ckb|zh)\/?$/.exec(hash);
  if (lm) return { locale: lm[1] as LocaleKey };
  const m = /^#\/(ar|en|ckb|zh)\/(explore|tour|design|amenities)(?:\?(.*))?$/.exec(hash);
  if (!m) return null;
  const q = new URLSearchParams(m[3] ?? ''); const patch: Partial<AppState> = { locale: m[1] as LocaleKey, section: m[2] as Section, experience: '3d' };
  const f = q.get('f'), u = q.get('u'), r = q.get('r'), v = q.get('v'), mode = q.get('m');
  let floorId: FloorId | null = isFloorId(f) ? f : null; let unitId: string | null = isUnitId(u) ? u : null;
  if (unitId) floorId = UNIT_BY_ID[unitId].floorId;                       // invariant: unit belongs to floor
  if (floorId && FLOOR_BY_ID[floorId].category !== 'residential') unitId = null; // no apartments on G/F10/F11
  let roomKey = floorId && r && roomExists(floorId, r) ? r : null;
  if (roomKey && unitId && (roomKey.startsWith('A.') || roomKey.startsWith('B.')) && roomKey[0] !== sideOf(unitId)) roomKey = null;
  let view: View = 'tower';
  if (floorId) view = v === 'room' && roomKey ? 'room' : v === 'unit' && unitId ? 'unit' : unitId && v !== 'floor' ? 'unit' : 'floor';
  Object.assign(patch, { floorId, unitId, roomKey: view === 'tower' ? null : roomKey, view,
    mode: view === 'room' ? (mode === 'free_walk' ? 'free_walk' : 'guided') : 'property_explorer' });
  const p = q.get('p'); patch.packageId = PACKAGE_IDS.includes(p as PackageId) ? (p as PackageId) : 'standard';
  patch.overrides = paramToOverrides(q.get('o'));
  const t = Number(q.get('t') ?? 960); const season = q.get('s') as SeasonId, weather = q.get('w') as WeatherId;
  patch.env = { timeMinutes: Number.isFinite(t) ? Math.min(1439, Math.max(0, Math.round(t))) : 960, seasonId: SEASONS.includes(season) ? season : 'summer', weatherId: WEATHERS.includes(weather) ? weather : 'clear' };
  if (view !== 'tower') patch.landing = false;
  if (q.get('pr')) { patch.overlay = 'pricing'; patch.landing = false; }
  return patch;
}

let applyingHash = false;
export function initRouting() {
  const fromHash = hashToPatch(location.hash);
  if (fromHash) useStore.setState({ ...fromHash, past: [], future: [] });   // a pricing deep link keeps its overlay
  let lastNav = '';
  const navKey = (s: AppState) => `${s.experience}|${s.sceneId}|${s.section}|${s.view}|${s.floorId}|${s.unitId}|${s.roomKey}`;   // plans: floor / unit / room changes are history steps too
  lastNav = navKey(useStore.getState());
  history.replaceState(null, '', stateToHash(useStore.getState()));
  useStore.subscribe((s) => {
    if (applyingHash) return;
    const h = stateToHash(s); if (h === location.hash) return;
    const k = navKey(s);
    if (k !== lastNav && !s.cine.active) { history.pushState(null, '', h); lastNav = k; } else history.replaceState(null, '', h);
  });
  window.addEventListener('hashchange', () => {
    const patch = hashToPatch(location.hash); if (!patch) return;
    applyingHash = true; useStore.setState({ ...patch, overlay: patch.overlay ?? null, cine: { active: false, paused: false, chapter: 0 } }); lastNav = navKey(useStore.getState()); applyingHash = false;
  });
  window.addEventListener('popstate', () => {
    const patch = hashToPatch(location.hash); if (!patch) return;
    applyingHash = true; useStore.setState({ ...patch, overlay: null, cine: { active: false, paused: false, chapter: 0 } }); lastNav = navKey(useStore.getState()); applyingHash = false;
  });
}
