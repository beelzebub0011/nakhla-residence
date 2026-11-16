import { useState, type ReactNode } from 'react';
import { PriceBadge } from './Pricing';
import { MODES, useStore, sideOf, isAmenityFloor, type Mode } from '../state/store';
import { FLOOR_BY_ID, UNIT_BY_ID, UNIT_TYPES } from '../domain/tower';
import { AMENITY_ZONES, getFloorPlan, type PlacedRoom } from '../domain/plans';
import { roomDims, unitBalconyArea, unitNetArea } from '../domain/audit';
import { CATEGORY_MATERIALS, MATERIAL_BY_ID, PACKAGES, PACKAGE_IDS, SURFACES, SURFACE_BY_ID, resolveSurfaceMaterial } from '../domain/materials';
import { getSwatchDataUrl } from '../engine/textures';
import { floorLabel, fmtNum, hasKey, roomLabel, unitCode, useT, type MsgKey } from '../i18n';
import { Icon } from './Icon';
import { unitSideLabel } from './Chrome';
import { CHAPTERS, CHAPTER_IDS } from '../state/chapters';

function Panel({ title, kicker, children, testid }: { title: string; kicker?: string; children: ReactNode; testid?: string }) {
  const [open, setOpen] = useState(true); const { t } = useT();
  return (
    <aside className="panel" data-open={open} data-testid={testid}>
      <header className="panel-head">
        <div><h2>{title}</h2>{kicker && <p className="panel-sub">{kicker}</p>}</div>
        <button type="button" className="iconbtn panel-toggle" onClick={() => setOpen(!open)} aria-expanded={open} aria-label={open ? t('ui.close') : t('ui.menu')}><Icon name={open ? 'chevDown' : 'chevUp'} /></button>
      </header>
      {open && <div className="panel-body">{children}</div>}
    </aside>
  );
}

const Tag = ({ children, tone }: { children: ReactNode; tone?: 'warn' | 'plain' }) => <span className={`tag ${tone === 'warn' ? 'tag-warn' : ''}`}>{children}</span>;

function RoomDims({ room }: { room: PlacedRoom }) {
  const { t, locale } = useT(); const d = roomDims(room);
  return <span className="dims"><bdi>{d.w && d.d ? t('room.dims', { w: fmtNum(d.w, locale, 2), d: fmtNum(d.d, locale, 2), a: fmtNum(d.area, locale) }) : t('room.area', { a: fmtNum(d.area, locale) })}</bdi></span>;
}

// ------------------------------------------------------------------------------ EXPLORE
function UnitCard({ unitId }: { unitId: string }) {
  const { t, locale } = useT(); const u = UNIT_BY_ID[unitId]; const ty = UNIT_TYPES[u.typeId];
  const selectUnit = useStore((s) => s.selectUnit); const toggleCompare = useStore((s) => s.toggleCompare); const inCmp = useStore((s) => s.compareIds.includes(unitId)); const setHoverKey = useStore((s) => s.setHoverKey);
  return (
    <article className="card" onPointerEnter={() => setHoverKey(unitId)} onPointerLeave={() => setHoverKey(null)}>
      <header><h3><bdi>{t('unit.name', { id: unitCode(unitId) })}</bdi></h3><Tag>{t(u.typeId === 'TYPE_A' ? 'unit.typeA' : 'unit.typeB')}</Tag></header>
      <p className="meta">{t('unit.beds', { n: ty.bedrooms })} · {t('unit.baths', { n: ty.bathrooms })} · {unitSideLabel(t, unitId)}</p>
      <p className="meta"><bdi>{t('unit.area', { a: ty.conceptAreaSqm })}</bdi></p>
      <p className="fine">{t('unit.net', { a: fmtNum(unitNetArea(u.typeId), locale, 2) })}</p>
      <div className="row">
        <button type="button" className="btn btn-primary" onClick={() => selectUnit(unitId)} data-testid={`unit-${unitId}`}>{t('unit.select')}</button>
        <button type="button" className="btn btn-quiet" aria-pressed={inCmp} onClick={() => toggleCompare(unitId)}><Icon name="scale" size={16} />{t(inCmp ? 'unit.inCompare' : 'unit.addCompare')}</button>
      </div>
    </article>
  );
}

function RoomList({ rooms, current, onPick }: { rooms: PlacedRoom[]; current: string | null; onPick: (key: string) => void }) {
  const { t } = useT(); const setHoverKey = useStore((s) => s.setHoverKey);
  return (
    <ul className="list">
      {rooms.map((r) => (
        <li key={r.key}>
          <button type="button" className="list-btn" aria-current={current === r.key ? 'true' : undefined} onClick={() => onPick(r.key)} onPointerEnter={() => setHoverKey(r.key)} onPointerLeave={() => setHoverKey(null)} data-testid={`room-${r.key}`}>
            <span>{roomLabel(t, r.kind)}</span><RoomDims room={r} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function ExplorePanel() {
  const { t, locale } = useT();
  const view = useStore((s) => s.view); const floorId = useStore((s) => s.floorId); const unitId = useStore((s) => s.unitId); const roomKey = useStore((s) => s.roomKey);
  const openOverlay = useStore((s) => s.openOverlay); const enterRoom = useStore((s) => s.enterRoom); const setSection = useStore((s) => s.setSection);
  const compareN = useStore((s) => s.compareIds.length); const toggleCompare = useStore((s) => s.toggleCompare); const set = useStore((s) => s.set);
  if (view === 'tower' || !floorId) {
    return (
      <Panel title={t('sec.explore')} kicker={t('brand.location')} testid="panel-explore">
        <p className="lead">{t('sec.explore.hint')}</p>
        <p className="fine">{t('ui.orbitHint')}</p>
        <div className="tools">
          <button type="button" className="btn btn-quiet" onClick={() => openOverlay('finder')}><Icon name="search" size={16} />{t('ui.finder')}</button>
          <button type="button" className="btn btn-quiet" onClick={() => openOverlay('compare')}><Icon name="scale" size={16} />{t('ui.compare')}{compareN ? ` (${compareN})` : ''}</button>
          <button type="button" className="btn btn-quiet" onClick={() => openOverlay('env')}><Icon name="sun" size={16} />{t('ui.environment')}</button>
          <button type="button" className="btn btn-quiet" onClick={() => set({ lite: true })}><Icon name="plan" size={16} />{t('ui.lite')}</button>
        </div>
      </Panel>
    );
  }
  const f = FLOOR_BY_ID[floorId]; const plan = getFloorPlan(floorId);
  if (view === 'floor') {
    return (
      <Panel title={floorLabel(t, floorId)} kicker={t(`floor.cat.${f.category}`)} testid="panel-floor">
        <p className="fine"><bdi>{t('floor.height', { h: fmtNum(f.floorToFloor, locale) })}</bdi></p>
        {f.category === 'residential' ? (<><p className="lead">{t('floor.hint')}</p><div className="cards">{f.unitIds.map((u) => <UnitCard key={u} unitId={u} />)}</div></>) : (
          <><p className="lead">{t('floor.zonesHint')}</p><RoomList rooms={plan.rooms.filter((r) => r.owner === 'zone' && r.view && r.tier !== 'proxy')} current={roomKey} onPick={enterRoom} /></>
        )}
      </Panel>
    );
  }
  if (!unitId) return null;
  const u = UNIT_BY_ID[unitId]; const ty = UNIT_TYPES[u.typeId]; const side = sideOf(unitId); const inCmp = useStore.getState().compareIds.includes(unitId);
  return (
    <Panel title={t('unit.name', { id: unitCode(unitId) })} kicker={t('pl.bedrooms', { n: UNIT_TYPES[u.typeId].bedrooms })} testid="panel-unit">
      {/* V12 "spec sheet": the four facts as big numbers, a dark demo-price card, one primary action */}
      <p className="meta">{unitSideLabel(t, unitId)}</p>
      <div className="spec" data-testid="unit-spec">
        <div className="spec-t" data-tip={t('ai.status.concept_estimate')}><b>{ty.conceptAreaSqm}</b><small>{t('spec.area')}</small></div>
        <div className="spec-t"><b>{ty.bedrooms}</b><small>{t('spec.beds', { b: ty.bathrooms })}</small></div>
        <div className="spec-t" data-tip={t('room.modelMeasured')}><b>{fmtNum(unitNetArea(u.typeId), locale, 1)}</b><small>{t('spec.net')}</small></div>
        <div className="spec-t"><b>{fmtNum(unitBalconyArea(u.typeId), locale, 1)}</b><small>{t('spec.balcony')}</small></div>
      </div>
      <PriceBadge unitId={unitId} />
      <p className="fine">{t(ty.hero ? 'unit.hero' : 'unit.medium')} · {t('unit.demoOnly')}</p>
      <button type="button" className="btn btn-primary btn-hero" onClick={() => setSection('tour')} data-testid="go-tour"><Icon name="tour" size={17} />{t('unit.tour')}</button>
      <button type="button" className="btn btn-secondary" onClick={() => setSection('design')} data-testid="go-design"><Icon name="design" size={16} />{t('unit.design')}</button>
      <h3 className="sub">{t('unit.rooms')}</h3>
      <RoomList rooms={plan.rooms.filter((r) => r.owner === side && r.view && r.kind !== 'hall')} current={roomKey} onPick={enterRoom} />
      <button type="button" className="btn btn-quiet" aria-pressed={inCmp} onClick={() => toggleCompare(unitId)}><Icon name="scale" size={16} />{t(inCmp ? 'unit.inCompare' : 'unit.addCompare')}</button>
    </Panel>
  );
}

// ------------------------------------------------------------------------------ TOUR
const MODE_ICON: Record<Mode, string> = { property_explorer: 'cube', guided: 'eye', free_walk: 'walk', cinematic: 'film' };

export function ModeSelector() {
  const { t } = useT(); const mode = useStore((s) => s.mode); const setMode = useStore((s) => s.setMode); const view = useStore((s) => s.view); const cine = useStore((s) => s.cine.active);
  const active: Mode = cine ? 'cinematic' : view === 'room' ? (mode === 'free_walk' ? 'free_walk' : 'guided') : 'property_explorer';
  return (
    <div className="modes" role="radiogroup" aria-label={t('mode.title')}>
      {MODES.map((m) => (
        <button key={m} type="button" role="radio" aria-checked={active === m} className="mode" onClick={() => setMode(m)} data-testid={`mode-${m}`} title={t(`mode.${m}.hint`)}>
          <Icon name={MODE_ICON[m]} size={18} /><span>{t(`mode.${m}`)}</span>
        </button>
      ))}
    </div>
  );
}

function CineControls() {
  const { t } = useT(); const cine = useStore((s) => s.cine); const setCine = useStore((s) => s.setCine); const back = useStore((s) => s.back);
  const id = CHAPTER_IDS[cine.chapter] ?? CHAPTER_IDS[0]; const ch = CHAPTERS[cine.chapter] ?? CHAPTERS[0];
  const caption = hasKey(`tour.ch.${id}`) ? t(`tour.ch.${id}` as MsgKey) : ch.kind ? roomLabel(t, ch.kind) : t('brand.name');
  return (
    <div className="cine" role="group" aria-label={t('mode.cinematic')}>
      <p className="cine-caption" aria-live="polite">{caption}</p>
      <p className="panel-sub">{t('tour.chapter', { n: cine.chapter + 1, t: CHAPTER_IDS.length })}</p>
      <div className="row">
        <button type="button" className="btn btn-secondary" onClick={() => setCine({ paused: !cine.paused })} data-testid="cine-pause"><Icon name={cine.paused ? 'play' : 'pause'} size={16} />{t(cine.paused ? 'ui.resume' : 'ui.pause')}</button>
        <button type="button" className="btn btn-secondary" onClick={() => setCine({ chapter: cine.chapter + 1 })} data-testid="cine-skip"><Icon name="skip" size={16} />{t('ui.skip')}</button>
        <button type="button" className="btn btn-primary" onClick={back} data-testid="cine-exit">{t('ui.exit')}</button>
      </div>
    </div>
  );
}

function TourPanel() {
  const { t } = useT();
  const floorId = useStore((s) => s.floorId); const unitId = useStore((s) => s.unitId); const roomKey = useStore((s) => s.roomKey); const mode = useStore((s) => s.mode); const view = useStore((s) => s.view);
  const enterRoom = useStore((s) => s.enterRoom); const focusRoom = useStore((s) => s.focusRoom); const cine = useStore((s) => s.cine.active);
  if (!floorId) return null;
  const plan = getFloorPlan(floorId); const side = unitId ? sideOf(unitId) : null;
  const rooms = plan.rooms.filter((r) => (side ? r.owner === side : r.owner === 'zone') && r.view && r.tier !== 'proxy' && r.kind !== 'hall');
  const room = plan.rooms.find((r) => r.key === roomKey);
  const coarse = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  const title = unitId ? t('unit.name', { id: unitCode(unitId) }) : floorLabel(t, floorId);
  return (
    <Panel title={room ? roomLabel(t, room.kind) : title} kicker={`${t('sec.tour')} · ${title}`} testid="panel-tour">
      <ModeSelector />
      {cine ? <CineControls /> : (
        <>
          <p className="fine">{view === 'room' ? (mode === 'free_walk' ? t(coarse ? 'tour.walk.touch' : 'tour.walk.desktop') : t('tour.look')) : t('mode.property_explorer.hint')}</p>
          {room && <p className="meta"><RoomDims room={room} /> <Tag>{t('room.modelMeasured')}</Tag></p>}
          <h3 className="sub">{t('tour.rooms')}</h3>
          <RoomList rooms={rooms} current={roomKey} onPick={(k) => (view === 'room' ? enterRoom(k) : focusRoom(k))} />
        </>
      )}
    </Panel>
  );
}

// ------------------------------------------------------------------------------ DESIGN
function Swatch({ materialId, selected, onPick }: { materialId: string; selected: boolean; onPick: () => void }) {
  const { l } = useT(); const m = MATERIAL_BY_ID[materialId];
  return (
    <button type="button" className="swatch" aria-pressed={selected} onClick={onPick} data-testid={`mat-${materialId}`} title={l(m.name)}>
      <span className="swatch-chip" style={{ backgroundImage: `url(${getSwatchDataUrl(m.id, m.recipe)})`, backgroundColor: m.swatch }} />
      <span className="swatch-name">{l(m.name)}</span>
      {selected && <span className="swatch-check"><Icon name="check" size={14} /></span>}
    </button>
  );
}

function DesignPanel() {
  const { t, l } = useT();
  const unitId = useStore((s) => s.unitId); const roomKey = useStore((s) => s.roomKey); const sel = useStore((s) => s.selectedSurfaceId);
  const pkg = useStore((s) => s.packageId); const overrides = useStore((s) => s.overrides); const past = useStore((s) => s.past.length); const future = useStore((s) => s.future.length);
  const selectSurface = useStore((s) => s.selectSurface); const setOverride = useStore((s) => s.setOverride); const setPackage = useStore((s) => s.setPackage);
  const undo = useStore((s) => s.undo); const redo = useStore((s) => s.redo); const reset = useStore((s) => s.resetFinishes); const setBA = useStore((s) => s.setBeforeAfter);
  const openOverlay = useStore((s) => s.openOverlay); const view = useStore((s) => s.view); const enterRoom = useStore((s) => s.enterRoom); const focusRoom = useStore((s) => s.focusRoom);
  if (!unitId) return null;
  const typeId = UNIT_BY_ID[unitId].typeId; const side = sideOf(unitId); const roomId = roomKey?.split('.')[1] ?? 'living';
  const surfaces = SURFACES.filter((s) => !s.onlyType || s.onlyType === typeId);
  const roomsWithSurfaces = [...new Set(surfaces.map((s) => s.roomId))];
  const here = surfaces.filter((s) => s.roomId === roomId || (roomId === 'kitchen' && s.id === 'living.flooring') || (['hall', 'hall_e', 'dressing'].includes(roomId) && s.roomId === 'entry'));
  const def = sel ? SURFACE_BY_ID[sel] : null; const current = def ? resolveSurfaceMaterial(def.id, pkg, overrides) : null; const mat = current ? MATERIAL_BY_ID[current] : null;
  const nCustom = Object.keys(overrides).length;
  const goRoom = (rid: string) => { const key = `${side}.${rid}`; if (view === 'room') enterRoom(key); else focusRoom(key); selectSurface(null); };
  return (
    <Panel title={t('design.title')} kicker={`${t('sec.design')} · ${t('unit.name', { id: unitCode(unitId) })}`} testid="panel-design">
      <div className="pkgs" role="radiogroup" aria-label={t('design.package')}>
        {PACKAGE_IDS.map((p) => (
          <button key={p} type="button" role="radio" aria-checked={pkg === p} className="pkg" onClick={() => setPackage(p)} data-testid={`pkg-${p}`}>
            <span className="pkg-strip">{Object.values(PACKAGES[p].ids).slice(0, 5).map((id) => <i key={id} style={{ background: MATERIAL_BY_ID[id].swatch }} />)}</span>
            <span>{l(PACKAGES[p].name)}</span>
          </button>
        ))}
      </div>
      <div className="row row-tight">
        <button type="button" className="btn btn-quiet" onClick={undo} disabled={!past} data-testid="undo"><Icon name="undo" size={16} />{t('design.undo')}</button>
        <button type="button" className="btn btn-quiet" onClick={redo} disabled={!future} data-testid="redo"><Icon name="redo" size={16} />{t('design.redo')}</button>
        <button type="button" className="btn btn-quiet" onClick={reset} disabled={pkg === 'standard' && !nCustom} data-testid="reset">{t('design.reset')}</button>
      </div>
      <p className="fine">{nCustom ? t('design.custom', { n: nCustom }) : t('design.noCustom')}</p>
      <div className="chips" role="group" aria-label={t('unit.rooms')}>
        {roomsWithSurfaces.map((rid) => <button key={rid} type="button" className="chip" aria-pressed={rid === roomId} onClick={() => goRoom(rid)}>{roomLabel(t, rid)}</button>)}
      </div>
      <h3 className="sub">{t('design.surfaces')}</h3>
      {!sel && <p className="fine">{t('design.tapSurface')}</p>}
      <ul className="list">
        {here.map((s) => {
          const mid = resolveSurfaceMaterial(s.id, pkg, overrides); const m = MATERIAL_BY_ID[mid];
          return (
            <li key={s.id}>
              <button type="button" className="list-btn" aria-current={sel === s.id ? 'true' : undefined} onClick={() => selectSurface(sel === s.id ? null : s.id)} data-testid={`surf-${s.id}`}>
                <span className="dot" style={{ background: m.swatch }} /><span>{t(`surf.${s.id}` as never)}</span><span className="dims">{l(m.name)}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {def && mat && (
        <section className="passport" aria-label={t(`surf.${def.id}` as never)} data-testid="passport">
          <div className="swatches">{CATEGORY_MATERIALS[def.category].map((id) => <Swatch key={id} materialId={id} selected={id === current} onPick={() => setOverride(def.id, id)} />)}</div>
          <dl className="facts facts-compact">
            <div><dt>{t('design.category')}</dt><dd>{t(`cat.${def.category}`)}</dd></div>
            <div><dt>{t('design.finish')}</dt><dd>{t(`design.finish.${mat.finish}`)}</dd></div>
            {mat.moduleMm && <div><dt>{t('design.module')}</dt><dd><bdi>{t('design.moduleValue', { w: mat.moduleMm[0], h: mat.moduleMm[1] })}</bdi></dd></div>}
            <div><dt>{t('design.use')}</dt><dd>{l(mat.use)}</dd></div>
            <div><dt>{t('design.code')}</dt><dd><bdi className="mono">{mat.id}</bdi></dd></div>
            <div><dt>{t('sum.source')}</dt><dd>{overrides[def.id] ? t('design.yourChoice') : t('design.inPackage')}</dd></div>
          </dl>
          <p className="fine"><Icon name="info" size={14} /> {t('design.sample')}</p>
        </section>
      )}
      <div className="row">
        <button type="button" className="btn btn-quiet btn-hold" onPointerDown={() => setBA(true)} onPointerUp={() => setBA(false)} onPointerLeave={() => setBA(false)} onPointerCancel={() => setBA(false)}
          onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') setBA(true); }} onKeyUp={() => setBA(false)} onBlur={() => setBA(false)} data-testid="compare-hold"><Icon name="eye" size={16} />{t('design.compare')}</button>
        <button type="button" className="btn btn-primary" onClick={() => openOverlay('summary')} data-testid="open-summary">{t('ui.myApartment')}</button>
      </div>
    </Panel>
  );
}

// ------------------------------------------------------------------------------ AMENITIES
function AmenitiesPanel() {
  const { t } = useT();
  const floorId = useStore((s) => s.floorId); const roomKey = useStore((s) => s.roomKey); const view = useStore((s) => s.view);
  const selectFloor = useStore((s) => s.selectFloor); const enterRoom = useStore((s) => s.enterRoom); const setHoverKey = useStore((s) => s.setHoverKey);
  const fid = isAmenityFloor(floorId) ? floorId! : 'F10'; const plan = getFloorPlan(fid);
  const zones = AMENITY_ZONES.filter((z) => z.floorId === fid);
  return (
    <Panel title={t(`amen.${fid}.title` as never)} kicker={t('sec.amenities')} testid="panel-amenities">
      <div className="seg" role="radiogroup" aria-label={t('floor.list')}>
        {(['F10', 'F11'] as const).map((f) => <button key={f} type="button" role="radio" aria-checked={fid === f} className="seg-btn" onClick={() => selectFloor(f)} data-testid={`amen-${f}`}>{floorLabel(t, f)} · {t(`floor.cat.${FLOOR_BY_ID[f].category}`)}</button>)}
      </div>
      <p className="lead">{t(`amen.${fid}.desc` as never)}</p>
      {view === 'room' && <ModeSelector />}
      <ul className="list">
        {zones.map((z) => {
          const room = plan.rooms.find((r) => r.key === z.roomKey)!;
          return (
            <li key={z.id}>
              <button type="button" className="list-btn" aria-current={roomKey === z.roomKey && view === 'room' ? 'true' : undefined} onClick={() => enterRoom(z.roomKey)} onPointerEnter={() => setHoverKey(z.roomKey)} onPointerLeave={() => setHoverKey(null)} data-testid={`zone-${z.id}`}>
                <span>{roomLabel(t, room.kind)}</span><RoomDims room={room} />
              </button>
            </li>
          );
        })}
      </ul>
      {view === 'room' && <button type="button" className="btn btn-quiet" onClick={() => selectFloor(fid)}><Icon name="cube" size={16} />{t('amen.overview')}</button>}
      <p className="caveat"><Icon name="info" size={14} /> {t(fid === 'F10' ? 'amen.poolCaveat' : 'amen.shishaCaveat')}</p>
      <p className="fine">{t('amen.viewCaveat')}</p>
    </Panel>
  );
}

export function ContextPanel() {
  const section = useStore((s) => s.section); const landing = useStore((s) => s.landing);
  if (landing) return null;
  return section === 'explore' ? <ExplorePanel /> : section === 'tour' ? <TourPanel /> : section === 'design' ? <DesignPanel /> : <AmenitiesPanel />;
}
