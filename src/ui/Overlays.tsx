import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { getMix, setMix } from '../audio/ambience';
import { create } from 'zustand';
import { LOCALES, useStore, stateToHash, sideOf, type Quality } from '../state/store';
import { FLOOR_BY_ID, UNITS, UNIT_BY_ID, UNIT_TYPES } from '../domain/tower';
import { getFloorPlan } from '../domain/plans';
import { unitBalconyArea, unitNetArea } from '../domain/audit';
import { MATERIAL_BY_ID, PACKAGES, SURFACES, resolveSurfaceMaterial } from '../domain/materials';
import { SEASONS, WEATHERS } from '../engine/environment';
import { LOCALE_META, floorLabel, fmtNum, fmtTime, roomLabel, unitCode, useT } from '../i18n';
import type { MsgKey } from '../i18n/en';
import { MAX_QUERY, QUICK_CHIPS, answer, type AiAction, type AiAnswer } from '../ai/resolver';
import { Icon } from './Icon';
import { engineRef } from './Stage';
import { unitSideLabel } from './Chrome';
import { PriceDisclaimer, PricingSheetBody, priceFull } from './Pricing';
import { PRICE_BY_UNIT } from '../domain/pricing';

const CREATOR = { name: 'Rashid Omar Mohammed', nameAr: 'راشد عمر محمد', phone: '+9647700864990', tel: 'tel:+9647700864990', email: 'rashid.iq12@gmail.com', mailto: 'mailto:rashid.iq12@gmail.com', whatsapp: 'https://wa.me/9647700864990' };

function Sheet({ title, children, wide, menu, scrim = true, footer, testid }: { title: string; children: ReactNode; wide?: boolean; menu?: boolean; scrim?: boolean; footer?: ReactNode; testid: string }) {
  const { t } = useT(); const close = () => useStore.getState().openOverlay(null);
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('[data-autofocus], button, [href], input, select, textarea')?.focus({ preventScroll: true });
    return () => { if (prev && document.contains(prev)) prev.focus({ preventScroll: true }); };
  }, []);
  return (
    <>
      {scrim && <div className="scrim no-print" onClick={close} aria-hidden="true" />}
      <section ref={ref} className={`sheet ${wide ? 'sheet-wide' : ''} ${menu ? 'sheet-menu' : ''}`} role="dialog" aria-modal={scrim} aria-label={title} data-testid={testid}>
        <header className="sheet-head"><h2>{title}</h2><button type="button" className="iconbtn no-print" onClick={close} aria-label={t('ui.close')} data-testid="sheet-close"><Icon name="close" /></button></header>
        <div className="sheet-body">{children}</div>
        {footer}
      </section>
    </>
  );
}

// ------------------------------------------------------------------ language / menu
function LangSheet() {
  const { t, locale } = useT(); const setLocale = useStore((s) => s.setLocale);
  return (
    <Sheet title={t('ui.language')} menu testid="sheet-lang">
      <div className="menu-list" role="radiogroup" aria-label={t('ui.language')}>
        {LOCALES.map((l) => <button key={l} type="button" role="radio" aria-checked={locale === l} className="menu-item" lang={LOCALE_META[l].htmlLang} onClick={() => setLocale(l)} data-testid={`lang-${l}`}>{LOCALE_META[l].native}</button>)}
      </div>
      <p className="fine">{t('contact.translation')}</p>
    </Sheet>
  );
}

const QUALITIES: Quality[] = ['auto', 'high', 'balanced', 'low', 'lite'];
function SoundLevels() {
  const { t } = useT(); const [m, setM] = useState(getMix());
  const set = (k: keyof ReturnType<typeof getMix>, v: number) => { setMix({ [k]: v }); setM({ ...getMix() }); };
  return (
    <>
      <h3 className="sub">{t('sound.title')}</h3>
      {(['music', 'ambience', 'effects'] as const).map((k) => (
        <label key={k} className="field"><span>{t(`sound.${k}`)}</span>
          <input className="range" type="range" min={0} max={1} step={0.05} value={m[k]} onChange={(e) => set(k, Number(e.target.value))} aria-valuetext={`${Math.round(m[k] * 100)}%`} data-testid={`level-${k}`} />
        </label>
      ))}
      <p className="meta">{t('sound.hint')}</p>
    </>
  );
}

function MenuSheet() {
  const { t } = useT(); const open = useStore((s) => s.openOverlay); const set = useStore((s) => s.set);
  const lite = useStore((s) => s.lite); const quality = useStore((s) => s.quality); const tier = useStore((s) => s.tier); const motion = useStore((s) => s.motionPref);
  const setQuality = useStore((s) => s.setQuality); const setTier = useStore((s) => s.setTier); const setMotion = useStore((s) => s.setMotionPref); const webgl = useStore((s) => s.webgl);
  const pickQ = (q: Quality) => { setQuality(q); if (q !== 'auto' && q !== 'lite') setTier(q); set({ lite: q === 'lite' ? true : lite }); };
  return (
    <Sheet title={t('ui.menu')} menu testid="sheet-menu">
      <div className="menu-list">
        <button type="button" className="menu-item" onClick={() => open('summary')} data-testid="menu-summary"><Icon name="key" />{t('ui.myApartment')}</button>
        <button type="button" className="menu-item" onClick={() => open('env')}><Icon name="sun" />{t('ui.environment')}</button>
        <button type="button" className="menu-item" onClick={() => useStore.getState().setFocus(true)} disabled={lite} data-testid="menu-focus"><Icon name="eyeOff" />{t('ui.focus')}</button>
        <button type="button" className="menu-item" onClick={() => useStore.getState().startShowcase()} disabled={lite} data-testid="menu-showcase"><Icon name="film" />{t('ui.showcase')}</button>
        <button type="button" className="menu-item" onClick={() => open('gallery')} data-testid="menu-gallery"><Icon name="image" />{t('ui.gallery')}</button>
        <button type="button" className="menu-item" onClick={() => open('finder')}><Icon name="search" />{t('ui.finder')}</button>
        <button type="button" className="menu-item" onClick={() => open('compare')}><Icon name="scale" />{t('ui.compare')}</button>
        <button type="button" className="menu-item" onClick={() => open('pricing')} data-testid="menu-pricing"><Icon name="tag" />{t('ui.pricing')}</button>
        <button type="button" className="menu-item" aria-pressed={lite} disabled={webgl === 'unavailable' || quality === 'lite'} onClick={() => { set({ lite: !lite }); open(null); }} data-testid="menu-lite"><Icon name="plan" />{lite ? t('ui.back3d') : t('ui.lite')}</button>
        <button type="button" className="menu-item" onClick={() => open('help')}><Icon name="help" />{t('ui.help')}</button>
        <button type="button" className="menu-item" onClick={() => open('contact')} data-testid="menu-contact"><Icon name="user" />{t('ui.about')}</button>
        <button type="button" className="menu-item menu-phone" onClick={() => open('lang')}><Icon name="globe" />{t('ui.language')}</button>
        <button type="button" className="menu-item" onClick={() => { open(null); useStore.getState().chooseExperience('plans'); }} data-testid="menu-plans"><Icon name="plan" />{t('xp.plans')}</button>
      </div>
      <SoundLevels />
      <h3 className="sub">{t('ui.motion')}</h3>
      <p className="fine">{t('ui.motion.explain')}</p>
      <div className="seg" role="radiogroup" aria-label={t('ui.motion')}>
        <button type="button" role="radio" aria-checked={motion === 'gentle'} className="seg-btn" onClick={() => setMotion('gentle')} data-testid="motion-gentle">{t('ui.motion.gentle')}</button>
        <button type="button" role="radio" aria-checked={motion === 'reduced'} className="seg-btn" onClick={() => setMotion('reduced')} data-testid="motion-reduced">{t('ui.motion.reduced')}</button>
      </div>
      <h3 className="sub">{t('ui.quality')}</h3>
      <p className="fine">{t('q.explain')}</p>
      <div className="menu-list" role="radiogroup" aria-label={t('ui.quality')}>
        {QUALITIES.map((q) => <button key={q} type="button" role="radio" aria-checked={quality === q} className="menu-item" onClick={() => pickQ(q)} data-testid={`q-${q}`}>{t(`q.${q}`)}</button>)}
      </div>
      <p className="fine">{t('q.current', { t: t(`q.${tier}`) })} · {t('q.reloadNote')}</p>
    </Sheet>
  );
}

// ------------------------------------------------------------------ environment
const PRESETS: [MsgKey, number][] = [['env.preset.dawn', 345], ['env.preset.morning', 540], ['env.preset.noon', 720], ['env.preset.golden', 1050], ['env.preset.night', 1260]];
function EnvSheet() {
  const { t } = useT(); const env = useStore((s) => s.env); const setEnv = useStore((s) => s.setEnv); const lights = useStore((s) => s.lights); const setLights = useStore((s) => s.setLights);
  return (
    <Sheet title={t('env.title')} scrim={false} testid="sheet-env">
      <label className="field"><span>{t('env.time')} — <bdi className="time-read" data-testid="env-time">{fmtTime(env.timeMinutes)}</bdi></span>
        <input className="range" type="range" min={0} max={1425} step={15} value={env.timeMinutes} onChange={(e) => setEnv({ timeMinutes: Number(e.target.value) })} aria-valuetext={fmtTime(env.timeMinutes)} data-testid="env-slider" />
      </label>
      <div className="chips">{PRESETS.map(([k, m]) => <button key={k} type="button" className="chip" aria-pressed={env.timeMinutes === m} onClick={() => setEnv({ timeMinutes: m })} data-testid={`preset-${m}`}>{t(k)}</button>)}</div>
      <h3 className="sub">{t('env.season')}</h3>
      <div className="chips" role="radiogroup" aria-label={t('env.season')}>{SEASONS.map((x) => <button key={x} type="button" role="radio" aria-checked={env.seasonId === x} aria-pressed={env.seasonId === x} className="chip" onClick={() => setEnv({ seasonId: x })} data-testid={`season-${x}`}>{t(`env.season.${x}`)}</button>)}</div>
      <h3 className="sub">{t('env.weather')}</h3>
      <div className="chips" role="radiogroup" aria-label={t('env.weather')}>{WEATHERS.map((x) => <button key={x} type="button" role="radio" aria-checked={env.weatherId === x} aria-pressed={env.weatherId === x} className="chip" onClick={() => setEnv({ weatherId: x })} data-testid={`weather-${x}`}>{t(`env.weather.${x}`)}</button>)}</div>
      <h3 className="sub">{t('lights.title')}</h3>
      <div className="seg" role="radiogroup" aria-label={t('lights.title')}>{(['auto', 'on', 'off'] as const).map((x) => <button key={x} type="button" role="radio" aria-checked={lights === x} onClick={() => setLights(x)} data-testid={`lights-${x}`}>{t(`lights.${x}`)}</button>)}</div>
      <p className="meta">{t('lights.hint')}</p>
      <p className="caveat"><Icon name="info" size={14} /> {t('env.simulated')}</p>
    </Sheet>
  );
}

// ------------------------------------------------------------------ help / contact
function HelpSheet() {
  const { t } = useT();
  return (
    <Sheet title={t('help.title')} testid="sheet-help">
      <ol className="list" style={{ gap: 8 }}>{(['help.1', 'help.2', 'help.3', 'help.4', 'help.5'] as MsgKey[]).map((k) => <li key={k} className="meta">{t(k)}</li>)}</ol>
      <p className="fine">{t('help.keys')}</p>
      <p className="caveat"><Icon name="info" size={14} /> {t('concept.full')}</p>
    </Sheet>
  );
}

function CreatorCard() {
  const { t, locale } = useT();
  return (
    <div className="contact-card" data-testid="creator-card">
      <p className="kicker">{t('contact.role')}</p>
      <h3><bdi>{locale === 'ar' ? CREATOR.nameAr : CREATOR.name}</bdi></h3>
      <div className="contact-links">
        <a href={CREATOR.tel} data-testid="link-tel"><Icon name="phone" /><span>{t('contact.call')}</span><span><bdi dir="ltr">{CREATOR.phone}</bdi></span></a>
        <a href={CREATOR.mailto} data-testid="link-mail"><Icon name="mail" /><span>{t('contact.write')}</span><span><bdi dir="ltr">{CREATOR.email}</bdi></span></a>
        <a href={CREATOR.whatsapp} target="_blank" rel="noopener noreferrer" data-testid="link-wa"><Icon name="ask" /><span>{t('contact.chat')}</span><span>{t('contact.whatsapp')}</span></a>
      </div>
    </div>
  );
}
function ContactSheet() {
  const { t } = useT();
  return (
    <Sheet title={t('contact.title')} testid="sheet-contact">
      <CreatorCard />
      <p className="meta">{t('contact.about')}</p>
      <p className="caveat"><Icon name="info" size={14} /> {t('concept.short')} {t('contact.notDeveloper')}</p>
      <p className="fine">{t('contact.translation')}</p>
      <p className="fine">{t('contact.copyright')}</p>
    </Sheet>
  );
}

// ------------------------------------------------------------------ my apartment + demo enquiry
function Inquiry() {
  const { t } = useT(); const [done, setDone] = useState(false); const [err, setErr] = useState<Record<string, boolean>>({});
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault(); const fd = new FormData(e.currentTarget); const errs: Record<string, boolean> = {};
    for (const k of ['name', 'contact']) if (!String(fd.get(k) ?? '').trim()) errs[k] = true;
    setErr(errs); if (Object.keys(errs).length) return;
    setDone(true); // local demonstration only — nothing leaves the browser, nothing is stored
  };
  if (done) return <div className="caveat" role="status" data-testid="inq-done"><Icon name="check" size={16} /><span>{t('inq.done')} <button type="button" className="btn btn-small" onClick={() => setDone(false)}>{t('inq.again')}</button></span></div>;
  return (
    <form onSubmit={submit} noValidate className="no-print" style={{ display: 'grid', gap: 10 }} data-testid="inq-form">
      <p className="caveat"><Icon name="info" size={14} /> {t('inq.notice')}</p>
      <label className="field"><span>{t('inq.name')}</span><input name="name" autoComplete="name" aria-invalid={!!err.name} />{err.name && <span className="err" role="alert">{t('inq.required')}</span>}</label>
      <label className="field"><span>{t('inq.phone')}</span><input name="contact" autoComplete="tel" aria-invalid={!!err.contact} />{err.contact && <span className="err" role="alert">{t('inq.required')}</span>}</label>
      <label className="field"><span>{t('inq.message')}</span><textarea name="message" maxLength={600} /></label>
      <button type="submit" className="btn btn-primary" data-testid="inq-submit">{t('inq.submit')}</button>
    </form>
  );
}

function SummarySheet() {
  const { t, l, locale } = useT();
  const unitId = useStore((s) => s.unitId) ?? 'U04A'; const hasUnit = useStore((s) => !!s.unitId); const pkg = useStore((s) => s.packageId); const overrides = useStore((s) => s.overrides); const notify = useStore((s) => s.notify);
  const u = UNIT_BY_ID[unitId]; const ty = UNIT_TYPES[u.typeId]; const [inq, setInq] = useState(false);
  const surfaces = SURFACES.filter((s) => !s.onlyType || s.onlyType === u.typeId);
  const copy = async () => { const url = location.origin + location.pathname + stateToHash(useStore.getState()); try { await navigator.clipboard.writeText(url); } catch { window.prompt(t('ui.copyLink'), url); } notify('toast.linkCopied'); };
  return (
    <Sheet title={t('sum.title')} wide testid="sheet-summary">
      <div className="print-only"><h1 style={{ fontSize: 22 }}>{t('brand.name')} — {t('sum.title')}</h1><p>{t('concept.full')}</p></div>
      {!hasUnit && <p className="fine">{t('sum.noUnit')}</p>}
      <dl className="facts">
        <div><dt>{t('sum.unit')}</dt><dd><bdi>{unitCode(unitId)}</bdi> · {unitSideLabel(t, unitId)}</dd></div>
        <div><dt>{t('sum.floor')}</dt><dd>{floorLabel(t, u.floorId)}</dd></div>
        <div><dt>{t('sum.type')}</dt><dd>{t(u.typeId === 'TYPE_A' ? 'unit.typeA' : 'unit.typeB')} · {t('unit.beds', { n: ty.bedrooms })} · {t('unit.baths', { n: ty.bathrooms })}</dd></div>
        <div><dt>{t('unit.area', { a: ty.conceptAreaSqm })}</dt><dd>{t('unit.net', { a: fmtNum(unitNetArea(u.typeId), locale, 2) })}</dd></div>
        <div><dt>{t('sum.package')}</dt><dd>{l(PACKAGES[pkg].name)}</dd></div>
        <div><dt>{t('price.demoShort')}</dt><dd><bdi data-testid="sum-price">{priceFull(t, PRICE_BY_UNIT[unitId].total[pkg])}</bdi></dd></div>
      </dl>
      <PriceDisclaimer compact />
      <h3 className="sub">{t('sum.choices')}</h3>
      <table className="table" data-testid="sum-table">
        <thead><tr><th>{t('sum.surface')}</th><th>{t('sum.finish')}</th><th>{t('design.code')}</th><th>{t('sum.source')}</th></tr></thead>
        <tbody>{surfaces.map((s) => { const m = MATERIAL_BY_ID[resolveSurfaceMaterial(s.id, pkg, overrides)]; return (
          <tr key={s.id}><td>{t(`surf.${s.id}` as MsgKey)}</td><td>{l(m.name)} · {t(`design.finish.${m.finish}`)}</td><td><bdi className="mono" title={m.id}>{m.id.replace(/^MAT_/, '').replace(/_/g, '‑')}</bdi></td><td>{overrides[s.id] ? t('sum.custom') : t('sum.fromPackage')}</td></tr>); })}</tbody>
      </table>
      <p className="fine"><Icon name="info" size={14} /> {t('design.sample')}</p>
      <div className="row no-print">
        <button type="button" className="btn btn-secondary" onClick={copy} data-testid="copy-link"><Icon name="share" size={16} />{t('ui.copyLink')}</button>
        <button type="button" className="btn btn-secondary" onClick={() => window.print()} data-testid="print"><Icon name="print" size={16} />{t('ui.print')}</button>
        <button type="button" className="btn btn-primary" onClick={() => setInq(!inq)} aria-expanded={inq} data-testid="open-inquiry">{t('sum.inquiry')}</button>
      </div>
      <p className="fine no-print">{t('sum.shareNote')} {t('sum.savedLocal')}</p>
      {inq && <Inquiry />}
      <h3 className="sub">{t('sum.preparedBy')}</h3>
      <CreatorCard />
      <p className="fine">{t('contact.copyright')}</p>
    </Sheet>
  );
}

// ------------------------------------------------------------------ smart finder / compare
function FinderSheet() {
  const { t } = useT(); const selectUnit = useStore((s) => s.selectUnit);
  const [beds, setBeds] = useState(0); const [band, setBand] = useState(0); const [facing, setFacing] = useState<'' | 'A' | 'B'>('');
  const res = UNITS.filter((u) => (!beds || UNIT_TYPES[u.typeId].bedrooms === beds) && (!facing || u.side === facing) && (!band || Math.ceil(FLOOR_BY_ID[u.floorId].number / 3) === band));
  const Opt = ({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) => <button type="button" className="chip" aria-pressed={on} onClick={onClick}>{label}</button>;
  return (
    <Sheet title={t('finder.title')} testid="sheet-finder">
      <h3 className="sub">{t('finder.beds')}</h3>
      <div className="chips"><Opt on={!beds} label={t('finder.any')} onClick={() => setBeds(0)} /><Opt on={beds === 2} label="2" onClick={() => setBeds(2)} /><Opt on={beds === 3} label="3" onClick={() => setBeds(3)} /></div>
      <h3 className="sub">{t('finder.level')}</h3>
      <div className="chips"><Opt on={!band} label={t('finder.any')} onClick={() => setBand(0)} /><Opt on={band === 1} label={t('finder.low')} onClick={() => setBand(1)} /><Opt on={band === 2} label={t('finder.mid')} onClick={() => setBand(2)} /><Opt on={band === 3} label={t('finder.high')} onClick={() => setBand(3)} /></div>
      <h3 className="sub">{t('finder.facing')}</h3>
      <div className="chips"><Opt on={!facing} label={t('finder.any')} onClick={() => setFacing('')} /><Opt on={facing === 'A'} label={t('unit.south')} onClick={() => setFacing('A')} /><Opt on={facing === 'B'} label={t('unit.north')} onClick={() => setFacing('B')} /></div>
      <p className="meta" role="status">{t('finder.results', { n: res.length })}</p>
      <ul className="list">{res.map((u) => <li key={u.id}><button type="button" className="list-btn" onClick={() => selectUnit(u.id)} data-testid={`find-${u.id}`}><span><bdi>{t('unit.name', { id: unitCode(u.id) })}</bdi></span><span className="dims">{t(u.typeId === 'TYPE_A' ? 'unit.typeA' : 'unit.typeB')} · {t('unit.beds', { n: UNIT_TYPES[u.typeId].bedrooms })}</span></button></li>)}</ul>
      <p className="fine">{t('finder.note')}</p>
    </Sheet>
  );
}

function CompareSheet() {
  const { t, locale } = useT(); const ids = useStore((s) => s.compareIds); const set = useStore((s) => s.set); const selectUnit = useStore((s) => s.selectUnit);
  const rows: [string, (id: string) => string][] = [
    [t('sum.floor'), (id) => floorLabel(t, UNIT_BY_ID[id].floorId)],
    [t('sum.type'), (id) => t(UNIT_BY_ID[id].typeId === 'TYPE_A' ? 'unit.typeA' : 'unit.typeB')],
    [t('finder.beds'), (id) => String(UNIT_TYPES[UNIT_BY_ID[id].typeId].bedrooms)],
    [t('room.bathroom'), (id) => String(UNIT_TYPES[UNIT_BY_ID[id].typeId].bathrooms)],
    [t('ai.status.concept_estimate'), (id) => `≈ ${UNIT_TYPES[UNIT_BY_ID[id].typeId].conceptAreaSqm} m²`],
    [t('room.modelMeasured'), (id) => `${fmtNum(unitNetArea(UNIT_BY_ID[id].typeId), locale, 2)} m²`],
    [t('room.balcony'), (id) => `${fmtNum(unitBalconyArea(UNIT_BY_ID[id].typeId), locale, 2)} m²`],
    [t('compare.facing'), (id) => unitSideLabel(t, id)],
    [t('compare.rooms'), (id) => String(getFloorPlan(UNIT_BY_ID[id].floorId).rooms.filter((r) => r.owner === sideOf(id) && r.kind !== 'hall').length)],
    [t('compare.detail'), (id) => t(UNIT_TYPES[UNIT_BY_ID[id].typeId].hero ? 'unit.hero' : 'unit.medium')],
    [t('price.demoShort'), (id) => priceFull(t, PRICE_BY_UNIT[id].total[useStore.getState().packageId])],
  ];
  return (
    <Sheet title={t('compare.title')} wide testid="sheet-compare">
      {ids.length === 0 ? <p className="lead">{t('compare.empty')}</p> : (
        <table className="table">
          <thead><tr><th>{t('compare.metric')}</th>{ids.map((id) => <th key={id}><button type="button" className="btn btn-small" onClick={() => selectUnit(id)}><bdi>{t('unit.name', { id: unitCode(id) })}</bdi></button></th>)}</tr></thead>
          <tbody>{rows.map(([label, fn]) => <tr key={label}><td>{label}</td>{ids.map((id) => <td key={id}><bdi>{fn(id)}</bdi></td>)}</tr>)}</tbody>
        </table>
      )}
      <div className="row">
        {ids.length < 2 && <button type="button" className="btn btn-secondary" onClick={() => set({ compareIds: ['U04A', 'U04B'] })} data-testid="compare-default">{t('unit.typeA')} / {t('unit.typeB')}</button>}
        {ids.length > 0 && <button type="button" className="btn btn-quiet" onClick={() => set({ compareIds: [] })}>{t('compare.clear')}</button>}
      </div>
      {ids.length > 0 && <PriceDisclaimer compact />}
      <p className="fine">{t('finder.note')}</p>
    </Sheet>
  );
}

function PricingSheet() {
  const { t } = useT(); const visual = useStore((s) => s.experience === 'visual');
  // 3D: no scrim, so the selected apartment stays visible on the tower while browsing prices
  return <Sheet title={t('price.title')} wide scrim={visual} testid="sheet-pricing"><PricingSheetBody /></Sheet>;
}

// ------------------------------------------------------------------ gallery (truthful: live captures + labelled offline renders)
interface Shot { id: number; url: string; caption: string }
const useGallery = create<{ shots: Shot[]; add(s: Omit<Shot, 'id'>): void }>((set, get) => ({ shots: [], add: (s) => set({ shots: [{ ...s, id: Date.now() }, ...get().shots].slice(0, 12) }) }));
interface RenderItem { file: string; title: Record<string, string>; scope: string }
function GallerySheet() {
  const { t, l, locale } = useT(); const shots = useGallery((s) => s.shots); const add = useGallery((s) => s.add); const notify = useStore((s) => s.notify); const ready = useStore((s) => s.ready3d);
  const [renders, setRenders] = useState<RenderItem[]>([]);
  useEffect(() => { let on = true; fetch('./renders/manifest.json').then((r) => (r.ok ? r.json() : null)).then((j) => { if (on && j?.items) setRenders(j.items as RenderItem[]); }).catch(() => undefined); return () => { on = false; }; }, []);
  const capture = () => {
    const e = engineRef.current; if (!e) return; const s = useStore.getState();
    const where = s.roomKey && s.floorId ? roomLabel(t, getFloorPlan(s.floorId).rooms.find((r) => r.key === s.roomKey)?.kind ?? '') : s.floorId ? floorLabel(t, s.floorId) : t('crumb.tower');
    add({ url: e.capture(), caption: `${where} · ${l(PACKAGES[s.packageId].name)} · ${fmtTime(s.env.timeMinutes)}` }); notify('toast.captured');
  };
  return (
    <Sheet title={t('gallery.title')} wide testid="sheet-gallery">
      <div className="row"><button type="button" className="btn btn-primary" onClick={capture} disabled={!ready} data-testid="capture"><Icon name="camera" size={16} />{t('gallery.capture')}</button></div>
      <p className="fine">{t('gallery.matchNote')}</p>
      {shots.length === 0 && <p className="meta">{t('gallery.empty')}</p>}
      <div className="gallery-grid">
        {shots.map((s) => <figure key={s.id} className="gallery-item" style={{ margin: 0 }}><img src={s.url} alt={s.caption} /><figcaption>{t('gallery.live')} — {s.caption} · <a href={s.url} download="nakhla-view.jpg">{t('gallery.download')}</a></figcaption></figure>)}
      </div>
      {renders.length > 0 && <><h3 className="sub">{t('gallery.render')}</h3>
        <div className="gallery-grid">{renders.map((r) => <figure key={r.file} className="gallery-item" style={{ margin: 0 }}><img src={`./renders/${r.file}`} alt={r.title[locale] ?? r.title.en} loading="lazy" /><figcaption>{r.title[locale] ?? r.title.en} — {t('gallery.render')} · {l(PACKAGES.standard.name)}</figcaption></figure>)}</div></>}
      <p className="fine">{t('amen.viewCaveat')}</p>
    </Sheet>
  );
}

// ------------------------------------------------------------------ Nakhla assistant
interface ChatItem { id: number; q: string; a: AiAnswer; pending?: AiAction | null }
const useChat = create<{ items: ChatItem[]; push(i: ChatItem): void; clear(): void; setPending(id: number, a: AiAction | null): void }>((set, get) => ({
  items: [], push: (i) => set({ items: [...get().items, i].slice(-30) }), clear: () => set({ items: [] }),
  setPending: (id, a) => set({ items: get().items.map((x) => (x.id === id ? { ...x, pending: a } : x)) }),
}));

/** Typed, allow-listed application actions — the assistant can do nothing else. */
export function runAction(a: AiAction) {
  const s = useStore.getState();
  switch (a.type) {
    case 'selectFloor': s.selectFloor(a.floorId); break;
    case 'selectUnit': s.selectUnit(a.unitId); break;
    case 'openPricing': s.openOverlay('pricing'); break;
    case 'focusRoom': {
      const side = a.roomKey[0]; const unitId = FLOOR_BY_ID[a.floorId]?.unitIds.find((u) => sideOf(u) === side); if (!unitId) return;
      if (s.unitId !== unitId) s.selectUnit(unitId); useStore.getState().enterRoom(a.roomKey); break;
    }
    case 'navigateToAmenity': if (s.floorId !== a.floorId) s.selectFloor(a.floorId); useStore.getState().enterRoom(a.roomKey); break;
    case 'openFinishEditor': s.setSection('design'); if (a.surfaceId) useStore.getState().selectSurface(a.surfaceId); break;
    case 'confirmMaterialChange': s.setOverride(a.surfaceId, a.materialId); break;
    case 'openComparison': if (!s.compareIds.length) s.set({ compareIds: ['U04A', 'U04B'] }); s.openOverlay('compare'); break;
    case 'openCreatorContact': s.openOverlay('contact'); break;
    case 'openPrintSummary': s.openOverlay('summary'); break;
    case 'show2DAlternative': s.set({ lite: true, overlay: null }); break;
    case 'openEnvironment': s.openOverlay('env'); break;
    case 'openHelp': s.openOverlay('help'); break;
    case 'openLanguages': s.openOverlay('lang'); break;
  }
}

const STATUS_CLASS: Record<string, string> = { verified_source: 'tag-ok', concept_estimate: 'tag-warn', demo_schema: '', unknown: 'tag-unknown', proposal: 'tag-warn' };
function AiSheet() {
  const { t, locale } = useT(); const items = useChat((s) => s.items); const push = useChat((s) => s.push); const clear = useChat((s) => s.clear); const setPending = useChat((s) => s.setPending);
  const [text, setText] = useState(''); const logEnd = useRef<HTMLDivElement>(null);
  const ask = (q: string) => {
    const query = q.trim(); if (!query) return;
    const s = useStore.getState();
    const a = answer(query, { locale: s.locale, floorId: s.floorId, unitId: s.unitId, roomKey: s.roomKey, selectedSurfaceId: s.selectedSurfaceId, packageId: s.packageId, overrides: s.overrides });
    push({ id: Date.now() + Math.random(), q: query.slice(0, MAX_QUERY), a }); setText('');
    if (a.auto) runAction(a.auto);
  };
  useEffect(() => { logEnd.current?.scrollIntoView({ block: 'end' }); }, [items.length]);
  return (
    <Sheet title={t('ai.title')} scrim={false} testid="sheet-ai"
      footer={<form className="ai-form" onSubmit={(e) => { e.preventDefault(); ask(text); }}>
        <input value={text} onChange={(e) => setText(e.target.value)} maxLength={MAX_QUERY} placeholder={t('ai.placeholder')} aria-label={t('ai.placeholder')} data-autofocus data-testid="ai-input" enterKeyHint="send" />
        <button type="submit" className="btn btn-primary" data-testid="ai-send">{t('ai.send')}</button>
      </form>}>
      <p className="fine"><Icon name="info" size={14} /> {t('ai.disclosure')}</p>
      {items.length === 0 && <div className="ai-welcome" data-testid="ai-welcome"><h3>{t('ai.welcome.title')}</h3><p>{t('ai.welcome.body')}</p><p className="ai-caps">{t('ai.welcome.caps')}</p></div>}
      {items.length === 0 && <p className="meta">{t('ai.empty')}</p>}
      <div className="chips">{QUICK_CHIPS[locale].map((c) => <button key={c} type="button" className="chip" onClick={() => ask(c)} data-testid="ai-chip">{c}</button>)}</div>
      <div className="ai-log" role="log" aria-live="polite" data-testid="ai-log">
        {items.map((it) => (
          <div key={it.id} style={{ display: 'grid', gap: 6 }}>
            <p className="ai-q">{it.q}</p>
            <div className="ai-a" data-intent={it.a.intent} data-status={it.a.status}>
              <p>{it.a.text}</p>
              <div className="ai-status"><span className={`tag ${STATUS_CLASS[it.a.status]}`}>{t(`ai.status.${it.a.status}`)}</span><span className="src">{t('ai.source')}: {it.a.source}</span></div>
              {it.pending ? (
                <div className="row" role="group" aria-label={t('ai.confirmChange')}><span className="meta">{t('ai.confirmChange')}</span>
                  <button type="button" className="btn btn-primary" onClick={() => { runAction(it.pending!); setPending(it.id, null); }} data-testid="ai-confirm">{t('ui.confirm')}</button>
                  <button type="button" className="btn btn-quiet" onClick={() => setPending(it.id, null)}>{t('ui.cancel')}</button></div>
              ) : it.a.actions.length > 0 && (
                <div className="row row-tight">{it.a.actions.map((s, i) => <button key={i} type="button" className="btn btn-quiet" onClick={() => (s.needsConfirm ? setPending(it.id, s.action) : runAction(s.action))} data-testid="ai-action">{s.label}</button>)}</div>
              )}
            </div>
          </div>
        ))}
        <div ref={logEnd} />
      </div>
      {items.length > 0 && <button type="button" className="btn btn-quiet" onClick={clear}>{t('ai.clear')}</button>}
    </Sheet>
  );
}

export function Overlays() {
  const overlay = useStore((s) => s.overlay);
  switch (overlay) {
    case 'lang': return <LangSheet />; case 'menu': return <MenuSheet />; case 'env': return <EnvSheet />; case 'help': return <HelpSheet />;
    case 'contact': return <ContactSheet />; case 'summary': return <SummarySheet />; case 'finder': return <FinderSheet />; case 'compare': return <CompareSheet />; case 'pricing': return <PricingSheet />;
    case 'gallery': return <GallerySheet />; case 'ai': return <AiSheet />; default: return null;
  }
}
