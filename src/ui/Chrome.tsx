import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { SECTIONS, LOCALES, useStore, sideOf, type Section } from '../state/store';
import { FLOORS, FLOOR_BY_ID } from '../domain/tower';
import { getFloorPlan } from '../domain/plans';
import { LOCALE_META, floorLabel, hasKey, roomLabel, unitCode, useT, type MsgKey } from '../i18n';
import { Icon, LogoMark } from './Icon';
import { ExperienceSwitch } from './ExperienceSwitch';
import { engineRef } from './Stage';
import { setAmbience } from '../audio/ambience';
import { CHAPTERS } from '../state/chapters';

const SECTION_ICON: Record<Section, string> = { explore: 'explore', tour: 'tour', design: 'design', amenities: 'amenities' };

export function TopBar() {
  const { t, locale } = useT();
  const section = useStore((s) => s.section); const setSection = useStore((s) => s.setSection); const home = useStore((s) => s.home);
  const muted = useStore((s) => s.audio.muted); const toggleSound = useStore((s) => s.toggleSound); const openOverlay = useStore((s) => s.openOverlay);
  const overlay = useStore((s) => s.overlay); const notify = useStore((s) => s.notify);
  const onSound = () => { const willPlay = muted; toggleSound(); setAmbience(willPlay); notify(willPlay ? 'toast.soundOn' : 'toast.soundOff'); };
  // a single glossy indicator glides between the four sections (transform only — never re-layouts)
  const navRef = useRef<HTMLElement>(null); const indRef = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const nav = navRef.current, ind = indRef.current; if (!nav || !ind) return;
    const place = () => { const b = nav.querySelector<HTMLElement>('.tab[aria-current="page"]'); if (!b) { ind.style.opacity = '0'; return; } ind.style.opacity = '1'; ind.style.width = `${b.offsetWidth}px`; ind.style.transform = `translateX(${b.offsetLeft}px)`; };
    place(); const ro = new ResizeObserver(place); ro.observe(nav); nav.querySelectorAll('.tab').forEach((b) => ro.observe(b));
    void document.fonts?.ready.then(place);                      // widths change once the web fonts arrive
    return () => ro.disconnect();
  }, [section, locale]);
  return (
    <header className="topbar">
      <button type="button" className="brand" onClick={home} aria-label={`${t('brand.name')} — ${t('ui.home')}`}>
        <LogoMark size={30} />
        <span className="brand-text"><b>{t('brand.name')}</b><small>{t('concept.badge')}</small></span>
      </button>
      <nav className="tabs" aria-label={t('a11y.main')} ref={navRef}>
        <span className="tab-ind" ref={indRef} aria-hidden="true" />
        {SECTIONS.map((s) => (
          <button key={s} type="button" className="tab" aria-current={section === s ? 'page' : undefined} onClick={() => setSection(s)} data-section={s}>
            <Icon name={SECTION_ICON[s]} size={20} /><span>{t(`sec.${s}`)}</span>
          </button>
        ))}
      </nav>
      <div className="utils" role="toolbar" aria-label={t('a11y.utilities')}>
        <ExperienceSwitch tone="dark" />
        <button type="button" className="util util-ask" onClick={() => openOverlay(overlay === 'ai' ? null : 'ai')} aria-expanded={overlay === 'ai'} data-testid="ask">
          <Icon name="ask" /><span className="util-label">{t('ui.ask')}</span>
        </button>
        <button type="button" className="util" onClick={onSound} aria-pressed={!muted} aria-label={muted ? t('ui.sound.turnOn') : t('ui.sound.turnOff')} title={muted ? t('ui.sound.off') : t('ui.sound.on')} data-testid="sound">
          <Icon name={muted ? 'soundOff' : 'soundOn'} /><span className="util-label util-label-wide">{muted ? t('ui.sound.off') : t('ui.sound.on')}</span>
        </button>
        <button type="button" className="util" onClick={() => openOverlay(overlay === 'lang' ? null : 'lang')} aria-expanded={overlay === 'lang'} aria-label={t('ui.language')} data-testid="lang">
          <Icon name="globe" /><span className="util-label util-label-wide">{LOCALE_META[locale].native}</span>
        </button>
        <button type="button" className="util" onClick={() => openOverlay(overlay === 'menu' ? null : 'menu')} aria-expanded={overlay === 'menu'} aria-label={t('ui.menu')} data-testid="menu">
          <Icon name="menu" />
        </button>
      </div>
    </header>
  );
}

export function Breadcrumb() {
  const { t, dir } = useT();
  const view = useStore((s) => s.view); const floorId = useStore((s) => s.floorId); const unitId = useStore((s) => s.unitId); const roomKey = useStore((s) => s.roomKey);
  const back = useStore((s) => s.back); const home = useStore((s) => s.home); const selectFloor = useStore((s) => s.selectFloor); const selectUnit = useStore((s) => s.selectUnit);
  if (view === 'tower') return null;
  const room = floorId && roomKey ? getFloorPlan(floorId).rooms.find((r) => r.key === roomKey) : null;
  return (
    <nav className="crumbs" aria-label={t('a11y.breadcrumb')}>
      <button type="button" className="btn btn-back" onClick={back} data-testid="back"><Icon name={dir === 'rtl' ? 'forward' : 'back'} size={18} /><span>{t('ui.back')}</span></button>
      <ol>
        <li><button type="button" onClick={home}>{t('crumb.tower')}</button></li>
        {floorId && <li><button type="button" onClick={() => selectFloor(floorId)} aria-current={view === 'floor' ? 'location' : undefined}>{floorLabel(t, floorId)}</button></li>}
        {unitId && <li><button type="button" onClick={() => selectUnit(unitId)} aria-current={view === 'unit' ? 'location' : undefined}><bdi>{t('unit.name', { id: unitCode(unitId) })}</bdi></button></li>}
        {room && (view === 'room' || view === 'unit') && <li><span aria-current={view === 'room' ? 'location' : undefined}>{roomLabel(t, room.kind)}</span></li>}
      </ol>
    </nav>
  );
}

/** Semantic level list — full keyboard / screen-reader parity with 3D floor picking. */
export function FloorRail() {
  const { t } = useT();
  const floorId = useStore((s) => s.floorId); const hover = useStore((s) => s.hoverFloorId); const view = useStore((s) => s.view); const section = useStore((s) => s.section);
  const selectFloor = useStore((s) => s.selectFloor); const setHoverFloor = useStore((s) => s.setHoverFloor);
  if (view === 'room' || view === 'unit' || section === 'tour' || section === 'design') return null;
  return (
    <nav className="rail" aria-label={t('floor.list')}>
      <span className="rail-title">{t('floor.list')}</span>
      <ol>
        {[...FLOORS].reverse().map((f) => (
          <li key={f.id}>
            <button type="button" className="rail-btn" data-cat={f.category} data-hover={hover === f.id} aria-pressed={floorId === f.id} data-testid={`floor-${f.id}`}
              aria-label={`${floorLabel(t, f.id)} — ${t(`floor.cat.${f.category}`)}`} title={`${floorLabel(t, f.id)} · ${t(`floor.cat.${f.category}`)}`}
              onClick={() => selectFloor(floorId === f.id ? null : f.id)} onPointerEnter={() => view === 'tower' && setHoverFloor(f.id)} onPointerLeave={() => setHoverFloor(null)}
              onFocus={() => view === 'tower' && setHoverFloor(f.id)} onBlur={() => setHoverFloor(null)}>
              <bdi>{f.id === 'G' ? 'G' : String(f.number).padStart(2, '0')}</bdi>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function CameraControls() {
  const { t } = useT(); const landing = useStore((s) => s.landing); const ready = useStore((s) => s.ready3d); const openOverlay = useStore((s) => s.openOverlay);
  const view = useStore((s) => s.view); const lights = useStore((s) => s.lights); const setLights = useStore((s) => s.setLights); const setFocus = useStore((s) => s.setFocus); const notify = useStore((s) => s.notify);
  if (landing || !ready) return null;
  const cycle = () => { const n = lights === 'auto' ? 'on' : lights === 'on' ? 'off' : 'auto'; setLights(n); notify(`lights.${n}`); };
  return (
    <div className="camctl" role="group" aria-label={t('ui.resetCamera')}>
      <button type="button" className="iconbtn" onClick={() => setFocus(true)} aria-label={t('ui.focus')} title={t('ui.focus')} data-testid="focus"><Icon name="eyeOff" /></button>
      {(view === 'room' || view === 'unit') && <button type="button" className="iconbtn" data-state={lights} onClick={cycle} aria-label={`${t('lights.title')}: ${t(`lights.${lights}`)}`} title={`${t('lights.title')}: ${t(`lights.${lights}`)}`} data-testid="lights"><Icon name="bulb" /></button>}
      {view === 'tower' && <button type="button" className="iconbtn" onClick={() => { const e = engineRef.current; if (!e) return; const next = e.streetView === 'street_arrival' ? 'street_entrance' : 'street_arrival'; e.goStreetView(next); }} aria-label={t('xp.street')} title={t('xp.street')} data-testid="street-view"><Icon name="walk" /></button>}
      <button type="button" className="iconbtn" onClick={() => openOverlay('env')} aria-label={t('ui.environment')} title={t('ui.environment')} data-testid="env"><Icon name="sun" /></button>
      <button type="button" className="iconbtn" onClick={() => engineRef.current?.zoomBy(0.8)} aria-label={t('ui.zoomIn')} title={t('ui.zoomIn')}><Icon name="zoomIn" /></button>
      <button type="button" className="iconbtn" onClick={() => engineRef.current?.zoomBy(1.25)} aria-label={t('ui.zoomOut')} title={t('ui.zoomOut')}><Icon name="zoomOut" /></button>
      <button type="button" className="iconbtn" onClick={() => engineRef.current?.resetCamera()} aria-label={t('ui.resetCamera')} title={t('ui.resetCamera')}><Icon name="reset" /></button>
    </div>
  );
}

/**
 * V12 dollhouse navigator (visitor feedback): from above, step between apartments (floor view) or rooms (apartment
 * view) with previous / next buttons or the arrow keys, and enter the highlighted one. Far rooms can be hard to read
 * from some angles; this never depends on clicking a small label.
 */
export function DollNav() {
  const { t } = useT(); const landing = useStore((s) => s.landing); const ready = useStore((s) => s.ready3d);
  const view = useStore((s) => s.view); const floorId = useStore((s) => s.floorId); const unitId = useStore((s) => s.unitId); const roomKey = useStore((s) => s.roomKey); const hoverKey = useStore((s) => s.hoverKey);
  const items = useMemo(() => {
    if (!floorId) return [] as { key: string; label: string; kind: 'unit' | 'room' }[];
    const plan = getFloorPlan(floorId); const f = FLOOR_BY_ID[floorId];
    if (view === 'floor') return f.category === 'residential' ? f.unitIds.map((u) => ({ key: u, label: t('unit.name', { id: u.slice(1) }), kind: 'unit' as const }))
      : plan.rooms.filter((r) => r.owner === 'zone' && r.view).map((r) => ({ key: r.key, label: roomLabel(t, r.kind), kind: 'room' as const }));
    if (view === 'unit' && unitId) { const side = unitId.endsWith('A') ? 'A' : 'B'; return plan.rooms.filter((r) => r.owner === side && r.view && r.kind !== 'hall').map((r) => ({ key: r.key, label: roomLabel(t, r.kind), kind: 'room' as const })); }
    return [];
  }, [view, floorId, unitId, t]);
  const [i, setI] = useState(0);
  useEffect(() => { setI(0); }, [view, floorId, unitId]);
  const cur = items[Math.min(i, items.length - 1)];
  useEffect(() => { if (cur) useStore.getState().setHoverKey(cur.kind === 'room' ? cur.key : null); }, [cur]);
  const go = useCallback((d: number) => setI((k) => (k + d + items.length) % Math.max(1, items.length)), [items.length]);
  const open = useCallback(() => { if (!cur) return; const s = useStore.getState(); if (cur.kind === 'unit') s.selectUnit(cur.key); else s.enterRoom(cur.key); }, [cur]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if ((e.target as HTMLElement)?.closest('input, textarea, [role=dialog]') || useStore.getState().overlay) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); go(document.dir === 'rtl' ? -1 : 1); } else if (e.key === 'ArrowLeft') { e.preventDefault(); go(document.dir === 'rtl' ? 1 : -1); } else if (e.key === 'Enter' && document.activeElement === document.body) open(); };
    if (items.length) { window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }
  }, [items.length, go, open]);
  void roomKey; void hoverKey;
  if (landing || !ready || items.length < 2) return null;
  return (
    <div className="dollnav" role="group" aria-label={t('pl.rooms')} data-testid="dollnav">
      <button type="button" className="iconbtn" onClick={() => go(-1)} aria-label={t('pl.prevRoom')}><span className="dn-prev"><Icon name="back" /></span></button>
      <button type="button" className="dollnav-cur" onClick={open} data-tip={t('pl.open3d')}><b>{cur?.label}</b><small>{i + 1} / {items.length}</small></button>
      <button type="button" className="iconbtn" onClick={() => go(1)} aria-label={t('pl.nextRoom')}><span className="dn-next"><Icon name="back" /></span></button>
    </div>
  );
}

/** Focus view / Showroom film: the only interface left on screen — a quiet pill to bring everything back. */
export function FocusBar() {
  const { t } = useT(); const focus = useStore((s) => s.focus); const showcase = useStore((s) => s.showcase); const cine = useStore((s) => s.cine);
  const setFocus = useStore((s) => s.setFocus); const back = useStore((s) => s.back);
  useEffect(() => {
    if (!focus) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' || e.key === 'h' || e.key === 'H') { e.stopPropagation(); if (useStore.getState().showcase) back(); else setFocus(false); } };
    window.addEventListener('keydown', onKey, true); return () => window.removeEventListener('keydown', onKey, true);
  }, [focus, back, setFocus]);
  if (!focus) return null;
  const ch = CHAPTERS[cine.chapter];
  const caption = showcase && ch ? (hasKey(`tour.ch.${ch.id}`) ? t(`tour.ch.${ch.id}` as MsgKey) : ch.kind ? roomLabel(t, ch.kind) : t('brand.name')) : '';
  return (
    <div className="focusbar" data-showcase={showcase} role="group" aria-label={t('ui.focus')}>
      {showcase && <span className="focus-caption" aria-live="polite">{caption}</span>}
      <button type="button" className="focus-exit" onClick={() => (showcase ? back() : setFocus(false))} data-testid="focus-exit"><Icon name="eye" size={16} />{t(showcase ? 'ui.exit' : 'ui.focusExit')}</button>
      <span className="focus-concept">{t('concept.short')}</span>
    </div>
  );
}

export function ConceptBadge() {
  const { t } = useT(); const openOverlay = useStore((s) => s.openOverlay);
  return (
    <button type="button" className="concept" onClick={() => openOverlay('contact')}>
      <Icon name="info" size={16} /><span>{t('concept.short')}</span><b>Rashid Omar Mohammed</b>
    </button>
  );
}

export function Toast() {
  const { t } = useT(); const toast = useStore((s) => s.toast); const clear = useStore((s) => s.clearToast);
  useEffect(() => { if (!toast) return; const id = window.setTimeout(clear, 3200); return () => window.clearTimeout(id); }, [toast, clear]);
  return <div className="toast-region" role="status" aria-live="polite">{toast && hasKey(toast.key) && <div className="toast" key={toast.id}>{t(toast.key, toast.vars)}</div>}</div>;
}

export function Landing() {
  const { t, locale } = useT();
  const landing = useStore((s) => s.landing); const enter = useStore((s) => s.enter); const setLocale = useStore((s) => s.setLocale); const set = useStore((s) => s.set);
  const cta = useRef<HTMLButtonElement>(null);
  useEffect(() => { if (landing) cta.current?.focus({ preventScroll: true }); }, [landing]);
  if (!landing) return null;
  const go = () => { try { sessionStorage.setItem('nakhla.entered', '1'); } catch { /* ignore */ } enter(); };
  return (
    <section className="landing" aria-labelledby="landing-title">
      <div className="landing-inner">
        <div className="landing-mark"><LogoMark size={46} /></div>
        <p className="landing-kicker">{t('brand.location')}</p>
        <h1 id="landing-title" className="landing-title">{t('brand.name')}</h1>
        <p className="landing-tag">{t('brand.tagline')}</p>
        <ul className="landing-facts"><li>{t('landing.levels')}</li><li>{t('landing.units')}</li><li>{t('landing.amenities')}</li></ul>
        <div className="landing-actions">
          <button ref={cta} type="button" className="btn btn-primary btn-lg" onClick={go} data-testid="enter">{t('landing.cta')}</button>
          <button type="button" className="btn btn-ghost-light" onClick={() => { set({ lite: true }); go(); }}>{t('landing.lite')}</button>
        </div>
        <div className="landing-langs" role="group" aria-label={t('ui.language')}>
          {LOCALES.map((l) => <button key={l} type="button" lang={LOCALE_META[l].htmlLang} aria-pressed={locale === l} onClick={() => setLocale(l)}>{LOCALE_META[l].native}</button>)}
        </div>
        <p className="landing-note"><Icon name="soundOff" size={16} /> {t('landing.sound')}</p>
        <p className="landing-disclaimer">{t('concept.full')}</p>
      </div>
    </section>
  );
}

/** Persistent strip for 3D failures: selections stay, 2D keeps every fact reachable (V7 G5). */
export function WebglNotice() {
  const { t } = useT(); const webgl = useStore((s) => s.webgl); const lite = useStore((s) => s.lite); const set = useStore((s) => s.set);
  if (webgl !== 'lost' && webgl !== 'unavailable') return null;
  return (
    <div className="notice" role="alert">
      <Icon name="info" size={18} /><span>{t(webgl === 'lost' ? 'webgl.lost' : 'webgl.unavailable')}</span>
      {!lite && <button type="button" className="btn btn-small" onClick={() => set({ lite: true })}>{t('ui.lite')}</button>}
      {webgl === 'lost' && <button type="button" className="btn btn-small" onClick={() => location.reload()}>{t('webgl.restore')}</button>}
    </div>
  );
}

export const unitSideLabel = (t: ReturnType<typeof useT>['t'], unitId: string) => t(sideOf(unitId) === 'A' ? 'unit.south' : 'unit.north');
export { FLOOR_BY_ID };
