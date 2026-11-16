import { beforeEach, describe, expect, it } from 'vitest';
import { hashToPatch, stateToHash, useStore } from '../../src/state/store';

const s = () => useStore.getState();
const reset = () => {
  s().home(); s().resetFinishes();
  useStore.setState({ past: [], future: [], overrides: {}, packageId: 'standard', locale: 'ar', env: { timeMinutes: 960, seasonId: 'summer', weatherId: 'clear' }, audio: { muted: true, optedInThisPageLoad: false }, overlay: null, mode: 'property_explorer', compareIds: [] });
};

describe('experience state invariants', () => {
  beforeEach(reset);
  it('starts muted, Arabic, on the tower, in Explore', () => {
    expect(s().audio.muted).toBe(true); expect(s().locale).toBe('ar'); expect(s().view).toBe('tower'); expect(s().section).toBe('explore');
  });
  it('every active unit belongs to the active floor', () => {
    s().selectUnit('U07B'); expect(s().floorId).toBe('F07'); expect(s().view).toBe('unit');
    s().selectFloor('F03'); expect(s().unitId).toBeNull();
  });
  it('no apartments on amenity floors and amenity floors switch section', () => {
    s().selectUnit('U04A'); s().selectFloor('F10'); expect(s().unitId).toBeNull(); expect(s().section).toBe('amenities');
    s().enterRoom('A.living'); expect(s().roomKey).toBeNull(); // that room does not exist on F10
    s().enterRoom('zone.pool'); expect(s().roomKey).toBe('zone.pool'); expect(s().view).toBe('room');
  });
  it('the four sections keep a valid, navigable context', () => {
    s().setSection('tour'); expect(s().unitId).toBe('U04A'); expect(s().roomKey).toBe('A.living'); expect(s().view).toBe('room');
    s().setSection('design'); expect(s().unitId).toBe('U04A'); expect(s().section).toBe('design');
    s().setSection('amenities'); expect(s().floorId).toBe('F10'); expect(s().unitId).toBeNull();
    s().setSection('explore'); expect(s().view).toBe('tower');
  });
  it('material overrides are typed, validated and undoable', () => {
    s().setOverride('living.flooring', 'MAT_ENGINEERED_OAK'); expect(s().overrides['living.flooring']).toBe('MAT_ENGINEERED_OAK');
    s().setOverride('living.flooring', 'MAT_SAGE'); expect(s().overrides['living.flooring']).toBe('MAT_ENGINEERED_OAK'); // wrong category rejected
    s().setOverride('nope.surface', 'MAT_SAGE'); expect(Object.keys(s().overrides)).toHaveLength(1);
    s().setPackage('luxury'); expect(s().overrides).toEqual({}); expect(s().packageId).toBe('luxury');
    s().undo(); expect(s().packageId).toBe('standard'); expect(s().overrides['living.flooring']).toBe('MAT_ENGINEERED_OAK');
    s().undo(); expect(s().overrides).toEqual({}); s().redo(); expect(s().overrides['living.flooring']).toBe('MAT_ENGINEERED_OAK');
  });
  it('locale, environment, mode and sound changes never reset selections', () => {
    s().selectUnit('U04A'); s().enterRoom('A.kitchen'); s().setOverride('kitchen.countertop', 'MAT_DARK_GRANITELOOK');
    const snap = () => ({ f: s().floorId, u: s().unitId, r: s().roomKey, o: s().overrides, p: s().packageId });
    const before = snap();
    for (const l of ['en', 'ckb', 'zh', 'ar'] as const) { s().setLocale(l); expect(snap()).toEqual(before); }
    s().setEnv({ timeMinutes: 1260, seasonId: 'winter', weatherId: 'dust' }); expect(snap()).toEqual(before);
    s().setMode('free_walk'); s().setMode('guided'); expect(snap()).toEqual(before);
    s().toggleSound(); expect(snap()).toEqual(before); expect(s().audio.muted).toBe(false);
    s().setLocale('en'); s().setEnv({ weatherId: 'light_rain' }); s().selectFloor('F11'); expect(s().audio.muted).toBe(false); // navigation never changes the mute state
  });
  it('environment input is clamped and allow-listed', () => {
    s().setEnv({ timeMinutes: 99999 }); expect(s().env.timeMinutes).toBe(1439);
    s().setEnv({ weatherId: 'snowstorm' as never, seasonId: 'monsoon' as never }); expect(s().env.weatherId).toBe('clear'); expect(s().env.seasonId).toBe('summer');
  });
  it('compare holds at most two units', () => { for (const u of ['U01A', 'U02B', 'U03A']) s().toggleCompare(u); expect(s().compareIds).toEqual(['U02B', 'U03A']); });
  it('only one overlay can be open', () => { s().openOverlay('ai'); s().openOverlay('env'); expect(s().overlay).toBe('env'); s().back(); expect(s().overlay).toBeNull(); });
});

describe('share link / URL state', () => {
  beforeEach(reset);
  it('round-trips the allow-listed state', () => {
    s().selectUnit('U06A'); s().enterRoom('A.master'); s().setPackage('premium'); s().setOverride('master.flooring', 'MAT_ENGINEERED_OAK'); s().setEnv({ timeMinutes: 1050, weatherId: 'partly_cloudy' }); s().setLocale('en');
    const patch = hashToPatch(stateToHash(s()))!;
    expect(patch).toMatchObject({ locale: 'en', floorId: 'F06', unitId: 'U06A', roomKey: 'A.master', view: 'room', packageId: 'premium', overrides: { 'master.flooring': 'MAT_ENGINEERED_OAK' } });
    expect(patch.env).toMatchObject({ timeMinutes: 1050, weatherId: 'partly_cloudy' });
  });
  it('never contains contact or free-text fields', () => {
    s().selectUnit('U04A'); const h = stateToHash(s());
    for (const bad of ['name', 'phone', 'email', 'token', 'notes']) expect(h.includes(bad + '=')).toBe(false);
  });
  it('rejects or repairs hostile / inconsistent links', () => {
    expect(hashToPatch('#/xx/explore')).toBeNull(); expect(hashToPatch('#/ar/admin')).toBeNull();
    expect(hashToPatch('#/en')).toEqual({ locale: 'en' }); expect(hashToPatch('#/zh/')).toEqual({ locale: 'zh' });   // V11.3: bare language links set the language
    expect(hashToPatch('#/xx')).toBeNull();
    const p = hashToPatch('#/ar/explore?f=F10&u=U04A&r=A.living&v=room&o=0-EVIL.1-ENGINEERED_OAK.99-SAGE&p=%3Cscript%3E&t=abc&w=tornado')!;
    expect(p.floorId).toBe('F04'); expect(p.unitId).toBe('U04A'); // the unit decides the floor
    expect(p.packageId).toBe('standard'); expect(p.overrides).toEqual({}); expect(p.env).toEqual({ timeMinutes: 960, seasonId: 'summer', weatherId: 'clear' });
    const q = hashToPatch('#/en/amenities?f=F11&u=U99Z&r=zone.cafe&v=room')!;
    expect(q.unitId).toBeNull(); expect(q.roomKey).toBe('zone.cafe'); expect(q.view).toBe('room');
  });
});
