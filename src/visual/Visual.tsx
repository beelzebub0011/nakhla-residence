import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as RPointerEvent } from 'react';
import { useStore } from '../state/store';
import { floorLabel, useT, type MsgKey } from '../i18n';
import { Icon, LogoMark } from '../ui/Icon';
import { ExperienceSwitch } from '../ui/ExperienceSwitch';
import { UNIT_TYPES } from '../domain/tower';
import { unitBalconyArea, unitNetArea } from '../domain/audit';
import { compactValue, priceRange } from '../domain/pricing';
import { PriceDisclaimer } from '../ui/Pricing';
import { CHAPTERS, HERO_SCENE, SCENES, SCENE_BY_ID, chapterScenes, groupScenes, imageFallback, imageSrc, type ChapterId, type PhotoScene } from './catalog';
import './visual.css';

// ---------------------------------------------------------------------------------------------
// V11.5 Experience B — the photoreal architectural website, redesigned as a developer microsite:
// an editorial overview (hero, statement, numbered chapter index with a live preview, residence spec
// sheets, a day-to-night comparison, amenities by level) and a full-bleed viewer (time-stamped hour
// variants, position counter + progress line, all-views drawer, click-to-zoom on 2560 px masters).
// Honesty labels, demo-price disclaimers and every test hook are kept.
// ---------------------------------------------------------------------------------------------

const ORDER = SCENES.map((s) => s.id);
const fmt = (n: number) => (Math.round(n * 10) / 10).toString();
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const two = (n: number) => String(n).padStart(2, '0');

function Img({ id, sizes = '100vw', className, alt, eager, style, hi }: { id: string; sizes?: string; className?: string; alt: string; eager?: boolean; style?: CSSProperties; hi?: boolean }) {
  return (
    <picture className={className} style={style}>
      <source type="image/webp" srcSet={`${imageSrc(id, 960)} 960w, ${imageSrc(id, 1600)} 1600w, ${imageSrc(id, 2560)} 2560w${hi ? `, ${imageSrc(id, 3840)} 3840w` : ''}`} sizes={sizes} />
      <img src={imageFallback(id)} alt={alt} loading={eager ? 'eager' : 'lazy'} decoding="async" draggable={false} />
    </picture>
  );
}

export function Visual() {
  const sceneId = useStore((s) => s.sceneId) ?? 'home';
  return sceneId === 'home' || !SCENE_BY_ID[sceneId] ? <VisualHome /> : <SceneViewer id={sceneId} />;
}

function VisualHeader({ chapter }: { chapter: ChapterId | 'home' }) {
  const { t } = useT();
  const setScene = useStore((s) => s.setScene); const openOverlay = useStore((s) => s.openOverlay); const overlay = useStore((s) => s.overlay);
  return (
    <header className="vs-bar">
      <button type="button" className="vs-brand" onClick={() => setScene('home')} aria-label={`${t('brand.name')} — ${t('vs.home')}`}>
        <LogoMark size={24} /><span><b>{t('brand.name')}</b><small>{t('concept.badge')}</small></span>
      </button>
      <nav className="vs-chapters" aria-label={t('vs.chapters')}>
        <button type="button" aria-current={chapter === 'home' ? 'page' : undefined} onClick={() => setScene('home')}>{t('vs.home')}</button>
        {CHAPTERS.map((c) => <button key={c} type="button" aria-current={chapter === c ? 'page' : undefined} onClick={() => setScene(chapterScenes(c)[0].id)}>{t(`vs.ch.${c}` as MsgKey)}</button>)}
      </nav>
      <div className="vs-utils">
        <ExperienceSwitch tone="dark" />
        <button type="button" className="vs-icon" onClick={() => openOverlay(overlay === 'pricing' ? null : 'pricing')} aria-label={t('ui.pricing')} aria-expanded={overlay === 'pricing'} data-testid="vs-pricing"><Icon name="tag" size={18} /></button>
        <button type="button" className="vs-icon" onClick={() => openOverlay(overlay === 'ai' ? null : 'ai')} aria-label={t('ui.ask')} aria-expanded={overlay === 'ai'}><Icon name="ask" size={18} /></button>
        <button type="button" className="vs-icon" onClick={() => openOverlay('lang')} aria-label={t('ui.language')}><Icon name="globe" size={18} /></button>
        <button type="button" className="vs-icon" onClick={() => openOverlay('contact')} aria-label={t('ui.contact')}><Icon name="user" size={18} /></button>
      </div>
    </header>
  );
}

// ------------------------------------------------------------------ overview (editorial page)
function VisualHome() {
  const { t, l, locale } = useT();
  const setScene = useStore((s) => s.setScene); const openOverlay = useStore((s) => s.openOverlay);
  const types = [['A', 'TYPE_A', 'living', 'residence_a'], ['B', 'TYPE_B', 'B_living', 'residence_b']] as const;
  const amen: [string, string, string[]][] = [['G', 'vs.amen.G', ['lobby', 'lobby_night']], ['10', 'vs.amen.F10', ['pool', 'gym', 'spa']], ['11', 'vs.amen.F11', ['restaurant_evening', 'cafe', 'terrace_night']]];
  const [hover, setHover] = useState<ChapterId>('arrival'); const [film, setFilm] = useState(false);
  if (film) return <Film onClose={() => setFilm(false)} />;
  return (
    <div className="vs vs-home" data-testid="visual-home">
      <VisualHeader chapter="home" />
      <main className="vs-scroll">
        <section className="vs-hero" aria-labelledby="vs-hero-title">
          <Img id={HERO_SCENE} className="vs-hero-img" alt={l(SCENE_BY_ID[HERO_SCENE].view.title)} eager />
          <div className="vs-hero-shade" aria-hidden="true" />
          <div className="vs-wrap vs-hero-copy vs-keynote" data-enter>
            <h1 id="vs-hero-title" className="vs-display">{t('brand.name')}</h1>
            <p className="vs-lede">{t('brand.tagline')}</p>
            <div className="vs-hero-actions">
              <button type="button" className="vs-cta" onClick={() => setScene(HERO_SCENE)} data-testid="vs-begin">{t('vs.begin')}<span className="vs-arrow"><Icon name="back" size={16} /></span></button>
              <button type="button" className="vs-ghost" onClick={() => setFilm(true)} data-testid="vs-film"><Icon name="play" size={16} />{t('vs.film')}</button>
            </div>
          </div>
          {/* V12 bold style 2: big rounded photo tiles straight into the four ways in */}
          <nav className="vs-wrap vs-tiles" aria-label={t('vs.chapters')}>
            <button type="button" className="vs-tile" onClick={() => setScene('living_golden')}><Img id="living_golden" sizes="(max-width: 700px) 46vw, 22vw" alt="" /><span>{t('home.apartments')}</span></button>
            <button type="button" className="vs-tile" onClick={() => setScene('pool')}><Img id="pool" sizes="(max-width: 700px) 46vw, 22vw" alt="" /><span>{t('home.amenities')}</span></button>
            <button type="button" className="vs-tile vs-tile-wide" onClick={() => useStore.getState().chooseExperience('3d')}><Img id="exterior_golden" sizes="22vw" alt="" /><span>{t('home.explore3d')}</span></button>
            <button type="button" className="vs-tile vs-tile-wide vs-tile-plan" onClick={() => useStore.getState().chooseExperience('plans')}><span>{t('home.plans')}</span></button>
          </nav>
          <p className="vs-render-note vs-hero-note">{t('vs.render')}</p>
        </section>
        <div className="vs-wrap vs-hero-foot"><ul className="vs-stats"><li>{t('landing.levels')}</li><li>{t('landing.units')}</li><li>{t('landing.amenities')}</li></ul><p className="vs-render-note">{t('brand.location')}</p></div>

        <section className="vs-sec vs-statement">
          <div className="vs-wrap vs-statement-grid">
            <h2 className="vs-h2">{t('vs.intro.title')}</h2>
            <p className="vs-body">{t('vs.intro.text')}</p>
          </div>
        </section>

        <section className="vs-sec vs-index" aria-labelledby="vs-index-title">
          <div className="vs-wrap">
            <h2 id="vs-index-title" className="vs-h2">{t('vs.index.title')}</h2>
            <div className="vs-index-grid">
              <ol className="vs-index-list" aria-label={t('vs.chapters')}>
                {CHAPTERS.map((c, i) => { const sc = chapterScenes(c); return (
                  <li key={c}>
                    <button type="button" className="vs-index-row" aria-current={hover === c ? 'true' : undefined} onMouseEnter={() => setHover(c)} onFocus={() => setHover(c)} onClick={() => setScene(sc[0].id)}>
                      <span className="vs-index-n">{two(i + 1)}</span><span className="vs-index-name">{t(`vs.ch.${c}` as MsgKey)}</span><span className="vs-index-count">{t('vs.views', { n: sc.length })}</span><span className="vs-arrow vs-index-go"><Icon name="back" size={16} /></span>
                    </button>
                  </li>); })}
              </ol>
              <button type="button" className="vs-index-preview" onClick={() => setScene(chapterScenes(hover)[0].id)} aria-label={`${t('vs.open')}: ${t(`vs.ch.${hover}` as MsgKey)}`}>
                {CHAPTERS.map((c) => <Img key={c} id={chapterScenes(c)[0].id} sizes="(max-width: 900px) 100vw, 58vw" alt="" className={c === hover ? 'on' : ''} />)}
              </button>
            </div>
          </div>
        </section>

        <section className="vs-sec vs-res" aria-labelledby="vs-res-title">
          <div className="vs-wrap">
            <h2 id="vs-res-title" className="vs-h2">{t('vs.res.title')}</h2>
            <div className="vs-types">
              {types.map(([side, typeId, scene, ch]) => { const u = UNIT_TYPES[typeId]; return (
                <article key={side} className="vs-type">
                  <button type="button" className="vs-type-img vs-zoomable" onClick={() => setScene(scene)} aria-label={t(`vs.ch.${ch}` as MsgKey)}><Img id={scene} sizes="(max-width: 900px) 100vw, 46vw" alt={l(SCENE_BY_ID[scene].view.title)} /></button>
                  <h3 className="vs-h3">{t(`vs.ch.${ch}` as MsgKey)}</h3>
                  <ul className="vs-spec">
                    <li>{t('vs.res.area', { a: fmt(unitNetArea(typeId)) })}</li>
                    <li>{t('vs.res.beds', { n: u.bedrooms })} · {t('vs.res.baths', { n: u.bathrooms })}</li>
                    <li>{t('vs.res.balcony', { a: fmt(unitBalconyArea(typeId)) })}</li>
                    <li className="vs-price-line"><bdi>{t('price.demoShort')}: {t('price.range', { a: compactValue(priceRange(typeId).min, locale), b: compactValue(priceRange(typeId).max, locale) })}</bdi></li>
                  </ul>
                </article>); })}
            </div>
            <div className="vs-pricing-cta">
              <PriceDisclaimer compact />
              <button type="button" className="vs-ghost" onClick={() => openOverlay('pricing')} data-testid="vs-pricing-open">{t('price.open')}</button>
            </div>
          </div>
        </section>

        <section className="vs-sec vs-compare-sec" aria-labelledby="vs-compare-title">
          <div className="vs-wrap">
            <h2 id="vs-compare-title" className="vs-h2">{t('vs.daynight.title')}</h2>
            <Compare a="living" b="living_night" />
            <div className="vs-level-row vs-four">{['living', 'living_golden', 'living_evening', 'living_night'].map((id) => (
              <button key={id} type="button" onClick={() => setScene(id)} className="vs-thumb-btn"><Img id={id} sizes="(max-width: 900px) 50vw, 24vw" alt={l(SCENE_BY_ID[id].view.title)} /><span><b>{t(`vs.v.${SCENE_BY_ID[id].variant}` as MsgKey)}</b><small>{hhmm(SCENE_BY_ID[id].view.time)}</small></span></button>))}</div>
          </div>
        </section>

        <section className="vs-sec vs-amen" aria-labelledby="vs-amen-title">
          <div className="vs-wrap">
            <h2 id="vs-amen-title" className="vs-h2">{t('vs.amen.title')}</h2>
            <ol className="vs-levels">
              {amen.map(([n, k, ids]) => (
                <li key={k} className="vs-level">
                  <div className="vs-level-head"><span className="vs-level-n" aria-hidden="true">{n}</span><h3 className="vs-h3">{t(k as MsgKey)}</h3></div>
                  <div className="vs-level-row">{ids.map((id) => <button key={id} type="button" onClick={() => setScene(id)} className="vs-thumb-btn"><Img id={id} sizes="(max-width: 900px) 50vw, 22vw" alt={l(SCENE_BY_ID[id].view.title)} /><span><b>{l(SCENE_BY_ID[id].view.title)}</b></span></button>)}</div>
                </li>))}
            </ol>
          </div>
        </section>

        <footer className="vs-credits">
          <div className="vs-wrap vs-credits-grid">
            <div><LogoMark size={30} /><h2 className="vs-h2">{t('vs.credits.title')}</h2></div>
            <div className="vs-credits-copy">
              <p>{t('concept.full')}</p>
              <p className="vs-copy">{t('contact.copyright')}</p>
              <button type="button" className="vs-ghost" onClick={() => openOverlay('contact')}>{t('ui.contact')}</button>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}

// ------------------------------------------------------------------ V11.5 reel-style film (story player)
/** Curated sequence: arrival at dusk, golden street, the tower, home by day and night, wellness, sky dining, night. */
const FILM: { id: string; move: 'in' | 'out' | 'left' | 'right' | 'up' }[] = [
  { id: 'street_arrival_dusk', move: 'in' }, { id: 'street_golden_sun', move: 'left' }, { id: 'exterior_golden', move: 'up' }, { id: 'street_entrance', move: 'in' },
  { id: 'lobby', move: 'right' }, { id: 'living_golden', move: 'left' }, { id: 'kitchen', move: 'in' }, { id: 'master', move: 'right' }, { id: 'living_night', move: 'out' },
  { id: 'pool', move: 'in' }, { id: 'spa', move: 'left' }, { id: 'restaurant_evening', move: 'right' }, { id: 'terrace_night', move: 'in' }, { id: 'exterior_night', move: 'out' },
];
const SHOT_MS = 4600;
function Film({ onClose }: { onClose: () => void }) {
  const { t, l } = useT(); const setScene = useStore((s) => s.setScene); const reduced = useStore((s) => s.motionPref) === 'reduced';
  const [i, setI] = useState(0); const [paused, setPaused] = useState(false); const [done, setDone] = useState(false);
  const shot = FILM[i]; const sc = SCENE_BY_ID[shot.id];
  const next = useCallback(() => setI((k) => { if (k + 1 >= FILM.length) { setDone(true); return k; } return k + 1; }), []);
  const prevS = useCallback(() => { setDone(false); setI((k) => Math.max(0, k - 1)); }, []);
  useEffect(() => { if (paused || done) return; const h = window.setTimeout(next, SHOT_MS); return () => window.clearTimeout(h); }, [i, paused, done, next]);
  useEffect(() => { const n = FILM[Math.min(FILM.length - 1, i + 1)].id; const im = new Image(); im.src = imageSrc(n, window.innerWidth * (window.devicePixelRatio || 1) > 1700 ? 2560 : 1600); }, [i]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); else if (e.key === ' ') { e.preventDefault(); setPaused((p) => !p); } else if (e.key === 'ArrowRight') next(); else if (e.key === 'ArrowLeft') prevS(); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [onClose, next, prevS]);
  const words = l(sc.view.title).split(/\s+/);
  return (
    <div className="vs vs-film-player" role="region" aria-label={t('vs.film.label')} data-testid="vs-film-player" data-paused={paused ? 'true' : 'false'}>
      {FILM.map((f, k) => (Math.abs(k - i) <= 1 ? <Img key={f.id} id={f.id} className={`vs-fshot vs-move-${f.move} ${k === i ? 'on' : ''} ${reduced ? 'still' : ''}`} alt={k === i ? l(SCENE_BY_ID[f.id].view.title) : ''} eager={k === i} /> : null))}
      <div className="vs-fshade" aria-hidden="true" />
      <div className="vs-fbars" aria-hidden="true">{FILM.map((f, k) => <span key={f.id}><i className={k < i || done ? 'full' : k === i ? 'run' : ''} style={{ animationDuration: `${SHOT_MS}ms` }} /></span>)}</div>
      <div className="vs-ftop">
        <span className="vs-kicker">{t(`vs.ch.${sc.chapter}` as MsgKey)} · {hhmm(sc.view.time)}</span>
        <div className="vs-ftop-actions">
          <button type="button" className="vs-icon" onClick={() => setPaused((p) => !p)} aria-label={t(paused ? 'vs.film.play' : 'vs.film.pause')} aria-pressed={paused}><Icon name={paused ? 'play' : 'reset'} size={17} /></button>
          <button type="button" className="vs-icon" onClick={onClose} aria-label={t('vs.close')}><Icon name="close" size={17} /></button>
        </div>
      </div>
      <button type="button" className="vs-ftap vs-ftap-prev" onClick={prevS} aria-label={t('vs.prev')} />
      <button type="button" className="vs-ftap vs-ftap-next" onClick={next} aria-label={t('vs.next')} />
      <div className="vs-fcap" key={shot.id} aria-live="polite">
        <h2 className="vs-ftitle">{words.map((w, k) => <span key={k} style={{ animationDelay: `${180 + k * 90}ms` }}>{w}</span>)}</h2>
        <p className="vs-render-note">{t('vs.render')}</p>
      </div>
      {done && (
        <div className="vs-fend">
          <LogoMark size={40} /><h2 className="vs-display">{t('brand.name')}</h2>
          <div className="vs-hero-actions"><button type="button" className="vs-cta" onClick={() => { onClose(); setScene(HERO_SCENE); }}>{t('vs.film.end')}</button><button type="button" className="vs-ghost" onClick={() => { setDone(false); setI(0); }}><Icon name="reset" size={16} />{t('vs.film.play')}</button></div>
        </div>
      )}
    </div>
  );
}

/** Day-to-night comparison: drag the divider (pointer) or use the range input (keyboard / screen reader). */
function Compare({ a, b }: { a: string; b: string }) {
  const { t, l, dir } = useT(); const [v, setV] = useState(30); /* windows sit in the left third: start with night sky beside daylight */ const box = useRef<HTMLDivElement>(null); const drag = useRef(false);
  const at = (e: RPointerEvent) => { const r = box.current!.getBoundingClientRect(); let k = ((e.clientX - r.left) / r.width) * 100; if (dir === 'rtl') k = 100 - k; setV(Math.max(2, Math.min(98, k))); };
  return (
    <div className="vs-compare" ref={box} style={{ '--cmp': `${v}%` } as CSSProperties}
      onPointerDown={(e) => { drag.current = true; (e.target as HTMLElement).setPointerCapture?.(e.pointerId); at(e); }} onPointerMove={(e) => { if (drag.current) at(e); }} onPointerUp={() => { drag.current = false; }} onPointerCancel={() => { drag.current = false; }}>
      <Img id={b} sizes="(max-width: 900px) 100vw, 92vw" alt={l(SCENE_BY_ID[b].view.title)} className="vs-cmp-b" />
      <Img id={a} sizes="(max-width: 900px) 100vw, 92vw" alt={l(SCENE_BY_ID[a].view.title)} className="vs-cmp-a" />
      <span className="vs-cmp-tag vs-cmp-tag-a">{t('vs.v.day')} · {hhmm(SCENE_BY_ID[a].view.time)}</span>
      <span className="vs-cmp-tag vs-cmp-tag-b">{t('vs.v.night')} · {hhmm(SCENE_BY_ID[b].view.time)}</span>
      <span className="vs-cmp-handle" aria-hidden="true"><span><Icon name="back" size={14} /><span className="vs-arrow"><Icon name="back" size={14} /></span></span></span>
      <input type="range" min={2} max={98} value={Math.round(v)} onChange={(e) => setV(Number(e.target.value))} aria-label={t('vs.compare.label')} className="vs-cmp-range" />
      <p className="vs-cmp-hint">{t('vs.compare.hint')}</p>
    </div>
  );
}

// ------------------------------------------------------------------ scene viewer
function SceneViewer({ id }: { id: string }) {
  const { t, l, dir, locale } = useT();
  const setScene = useStore((s) => s.setScene); const choose = useStore((s) => s.chooseExperience); const notice = useStore((s) => s.sceneNotice);
  const overlay = useStore((s) => s.overlay); const reduced = useStore((s) => s.motionPref) === 'reduced';
  const scene = SCENE_BY_ID[id]; const idx = ORDER.indexOf(id);
  const [prev, setPrev] = useState<string | null>(null); const shown = useRef(id);
  const [hideUi, setHideUi] = useState(false); const [playing, setPlaying] = useState(false);
  const swipe = useRef<{ x: number; y: number } | null>(null); const swiped = useRef(false);   // V12: swipe between views on touch screens
  const [zoom, setZoom] = useState(false); const [origin, setOrigin] = useState('50% 50%'); const [drawer, setDrawer] = useState(false);
  const go = useCallback((to: string) => { if (to === shown.current) return; setPrev(shown.current); shown.current = to; setZoom(false); setScene(to); }, [setScene]);
  const step = useCallback((d: number) => go(ORDER[(idx + d + ORDER.length) % ORDER.length]), [go, idx]);
  useEffect(() => { if (id !== shown.current) { setPrev(shown.current); shown.current = id; setZoom(false); } }, [id]);
  // prefetch the neighbours at the width this screen will use (route-by-route loading: never the whole library)
  useEffect(() => { const w = window.innerWidth * (window.devicePixelRatio || 1); const size = w > 1700 ? 2560 : w > 1000 ? 1600 : 960;
    for (const d of [1, -1]) { const n = ORDER[(idx + d + ORDER.length) % ORDER.length]; const im = new Image(); im.src = imageSrc(n, size); } }, [idx]);
  useEffect(() => { if (!playing) return; const h = window.setTimeout(() => step(1), reduced ? 6000 : 7500); return () => window.clearTimeout(h); }, [playing, id, step, reduced]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (overlay || (e.target as HTMLElement)?.closest('input, textarea')) return;
      const fwd = dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight', back = dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft';
      if (e.key === fwd) { setPlaying(false); step(1); } else if (e.key === back) { setPlaying(false); step(-1); }
      else if (e.key === 'Escape') { if (drawer) setDrawer(false); else if (zoom) setZoom(false); else if (hideUi) setHideUi(false); else setScene('home'); }
      else if (e.key === 'h' || e.key === 'H') setHideUi((v) => !v);
      else if (e.key === 'z' || e.key === 'Z') setZoom((v) => !v);
    };
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
  }, [dir, step, overlay, hideUi, setScene, zoom, drawer]);
  const group = useMemo(() => groupScenes(scene), [scene]);
  const film = useMemo(() => chapterScenes(scene.chapter), [scene]);
  const pos = film.findIndex((f) => f.id === id) + 1;
  const facts: string[] = [];
  if (scene.floorId) facts.push(floorLabel(t, scene.floorId));
  if (scene.areaSqm) facts.push(t('vs.area', { a: fmt(scene.areaSqm) }));
  facts.push(hhmm(scene.view.time));
  const pr = scene.unitType ? priceRange(scene.unitType === 'A' ? 'TYPE_A' : 'TYPE_B') : null;
  const aim = (e: RPointerEvent<HTMLDivElement>) => { if (!zoom) return; const r = e.currentTarget.getBoundingClientRect(); setOrigin(`${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}% ${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`); };
  return (
    <div className="vs vs-viewer" data-ui={hideUi ? 'hidden' : 'shown'} data-zoom={zoom ? 'on' : 'off'} data-testid="visual-scene" data-scene={id}>
      <div className="vs-frame" onTouchStart={(e) => { swipe.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }} onTouchEnd={(e) => { const st = swipe.current; swipe.current = null; if (!st || zoom) return; const dx = e.changedTouches[0].clientX - st.x, dy = e.changedTouches[0].clientY - st.y; if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.4) { swiped.current = true; setPlaying(false); step((dx < 0) === (dir !== 'rtl') ? 1 : -1); } }}
        onClick={(e) => { if (swiped.current) { swiped.current = false; return; } setPlaying(false); const r = e.currentTarget.getBoundingClientRect(); setOrigin(`${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}% ${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`); setZoom((z) => !z); }} onPointerMove={aim}>
        {prev && prev !== id && <Img key={`p-${prev}`} id={prev} className="vs-shot vs-shot-prev" alt="" />}
        <Img key={id} id={id} hi sizes={zoom ? '210vw' : '100vw'} className={`vs-shot ${reduced || zoom ? '' : 'vs-kb'}`} alt={l(scene.view.title)} eager style={{ '--zo': origin } as CSSProperties} />
      </div>
      {!hideUi && <VisualHeader chapter={scene.chapter} />}
      {!hideUi && (
        <>
          <div className="vs-caption">
            <h1 className="vs-title">{l(scene.view.title)}</h1>
            <p className="vs-meta"><span className="vs-count"><b>{two(pos)}</b> / {two(film.length)}</span><span>{t(`vs.ch.${scene.chapter}` as MsgKey)}</span>{scene.floorId && <span>{floorLabel(t, scene.floorId)}</span>}</p>
            {/* V12 bold style 3: the key facts as big numbers on glass */}
            <div className="vs-facts" data-testid="vs-facts">
              {scene.areaSqm && <div><b>{fmt(scene.areaSqm)}</b><small>{t('vw.area')}</small></div>}
              {scene.floorId && <div><b>{scene.floorId === 'G' ? 'G' : String(Number(scene.floorId.slice(1))).padStart(2, '0')}</b><small>{t('pl.levels')}</small></div>}
              <div><b>{hhmm(scene.view.time)}</b><small>{t('vw.time')}</small></div>
            </div>
            {pr && <button type="button" className="vs-price-chip" onClick={() => useStore.getState().openOverlay('pricing')} data-testid="vs-price-chip"><bdi>{t('price.demoShort')} · {t('price.range', { a: compactValue(pr.min, locale), b: compactValue(pr.max, locale) })}</bdi></button>}
            {group.length > 1 && (
              <div className="vs-variants" role="group" aria-label={t('env.time')}>
                {group.map((g: PhotoScene) => <button key={g.id} type="button" aria-pressed={g.id === id} onClick={() => go(g.id)}><span>{t(`vs.v.${g.variant}` as MsgKey)}</span><small>{hhmm(g.view.time)}</small></button>)}
              </div>
            )}
            <div className="vs-actions">
              <button type="button" className="vs-cta vs-cta-white" onClick={() => choose('3d')} data-testid="vs-open3d"><Icon name="cube" size={17} />{t('vs.open3d')}</button>
              <button type="button" className="vs-ghost vs-ghost-icon" onClick={() => setZoom((z) => !z)} aria-pressed={zoom} aria-label={t(zoom ? 'vs.zoomOut' : 'vs.zoom')} title={t(zoom ? 'vs.zoomOut' : 'vs.zoom')}><Icon name={zoom ? 'zoomOut' : 'zoomIn'} size={17} /></button>
              <button type="button" className="vs-ghost vs-ghost-icon" onClick={() => setPlaying((p) => !p)} aria-pressed={playing} aria-label={t(playing ? 'vs.pause' : 'vs.play')} title={t(playing ? 'vs.pause' : 'vs.play')}><Icon name={playing ? 'reset' : 'play'} size={16} /></button>
              <button type="button" className="vs-ghost vs-ghost-icon" onClick={() => setHideUi(true)} aria-label={t('ui.focus')} title={t('ui.focus')}><Icon name="eyeOff" size={16} /></button>
              <button type="button" className="vs-ghost" onClick={() => setDrawer(true)} aria-expanded={drawer}><Icon name="grid" size={16} />{t('vs.index')}</button>
            </div>
            {notice && <p className="vs-notice" role="status"><Icon name="info" size={16} />{t(`vs.n.${notice}` as MsgKey)}</p>}
          </div>
          <button type="button" className="vs-nav vs-prev" onClick={() => { setPlaying(false); step(-1); }} aria-label={t('vs.prev')}><Icon name="back" size={22} /></button>
          <button type="button" className="vs-nav vs-next" onClick={() => { setPlaying(false); step(1); }} aria-label={t('vs.next')}><span className="vs-arrow"><Icon name="back" size={22} /></span></button>
          <div className="vs-tabbar"><ExperienceSwitch tone="dark" alt /></div>
          <nav className="vs-film" aria-label={t(`vs.ch.${scene.chapter}` as MsgKey)}>
            {film.map((f) => <button key={f.id} type="button" aria-current={f.id === id ? 'true' : undefined} onClick={() => { setPlaying(false); go(f.id); }} title={l(f.view.title)}><Img id={f.id} sizes="120px" alt={l(f.view.title)} /></button>)}
          </nav>
          <div className="vs-progress" aria-hidden="true"><span style={{ width: `${(pos / film.length) * 100}%` }} /></div>
          <p className="vs-render-note">{t('vs.render')}</p>
        </>
      )}
      {drawer && (
        <div className="vs-drawer" role="dialog" aria-modal="true" aria-label={t('vs.index')} onClick={(e) => { if (e.target === e.currentTarget) setDrawer(false); }}>
          <div className="vs-drawer-panel">
            <div className="vs-drawer-head"><h2 className="vs-h3">{t('vs.index')}</h2><button type="button" className="vs-icon" onClick={() => setDrawer(false)} aria-label={t('vs.close')} autoFocus><Icon name="close" size={18} /></button></div>
            {CHAPTERS.map((c, i) => (
              <section key={c} className="vs-drawer-ch">
                <h3><span>{two(i + 1)}</span>{t(`vs.ch.${c}` as MsgKey)}</h3>
                <div className="vs-drawer-grid">{chapterScenes(c).map((f) => (
                  <button key={f.id} type="button" aria-current={f.id === id ? 'true' : undefined} onClick={() => { setDrawer(false); setPlaying(false); go(f.id); }}><Img id={f.id} sizes="220px" alt="" /><span>{l(f.view.title)}</span></button>))}</div>
              </section>))}
          </div>
        </div>
      )}
      {hideUi && <button type="button" className="vs-restore" onClick={() => setHideUi(false)}><Icon name="eye" size={16} />{t('ui.focusExit')}</button>}
    </div>
  );
}
