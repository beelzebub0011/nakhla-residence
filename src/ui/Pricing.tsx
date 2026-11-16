import { useMemo, useState } from 'react';
import { useStore } from '../state/store';
import { UNIT_BY_ID } from '../domain/tower';
import type { UnitTypeId } from '../domain/types';
import { PACKAGES, type PackageId } from '../domain/materials';
import { DEMO_PRICES, PACKAGES_IN_ORDER, PRICE_BY_UNIT, PRICING, compactValue, fmtAmount, priceRange, toUsd, type DemoPrice } from '../domain/pricing';
import { floorLabel, unitCode, useT } from '../i18n';
import { Icon } from './Icon';

// ---------------------------------------------------------------------------------------------
// V11.4 demo pricing (both experiences). Every figure comes from src/domain/pricing.ts and is
// labelled illustrative; there is no availability, no booking, no payment and no urgency here.
// ---------------------------------------------------------------------------------------------

type T = ReturnType<typeof useT>['t'];
export const priceMillions = (t: T, locale: string, n: number) => t('price.compact', { n: compactValue(n, locale as never) });
export const priceFull = (t: T, n: number) => t('price.full', { n: fmtAmount(n) });

/** the one-line disclaimer used everywhere a price appears */
export function PriceDisclaimer({ compact }: { compact?: boolean }) {
  const { t } = useT();
  return <p className={`price-note ${compact ? 'price-note-compact' : ''}`} role="note" data-testid="price-disclaimer"><Icon name="info" size={15} /><span>{t('price.disclaimer')}</span></p>;
}

/** small badge for unit panels: "Demo price ≈ 246 M IQD" (opens the pricing sheet) */
export function PriceBadge({ unitId }: { unitId: string }) {
  const { t, locale } = useT(); const open = useStore((s) => s.openOverlay); const pkg = useStore((s) => s.packageId);
  const p = PRICE_BY_UNIT[unitId]; if (!p) return null;
  return (
    <button type="button" className="price-badge" onClick={() => open('pricing')} data-testid="price-badge">
      <span className="price-badge-k">{t('spec.demo')}</span>
      <bdi className="price-badge-v">{priceMillions(t, locale, p.total[pkg])}</bdi>
      <span className="price-badge-go" aria-hidden="true">›</span>
    </button>
  );
}

function Breakdown({ p, pkg }: { p: DemoPrice; pkg: PackageId }) {
  const { t, l } = useT(); const pct = (f: number) => `${f >= 1 ? '+' : '−'}${Math.abs(Math.round((f - 1) * 1000) / 10)}%`;
  const rows: [string, string][] = [
    [t('price.netArea'), `${p.netArea} m²`],
    [t('price.balconyArea'), `${p.balconyArea} m² × ${PRICING.base.balconyWeight}`],
    [t('price.saleable'), `${p.saleableArea} m²`],
    [t('price.baseRate'), t('price.perSqm', { n: fmtAmount(PRICING.base.ratePerSqm) })],
    [t('price.factorType'), pct(p.typeFactor)], [t('price.factorSide'), pct(p.sideFactor)], [t('price.factorFloor'), pct(p.floorFactor)],
    [t('price.base'), priceFull(t, p.base)],
    [l(PACKAGES[pkg].name), p.finishExtra[pkg] ? `+ ${priceFull(t, p.finishExtra[pkg])}` : t('price.included')],
  ];
  return (
    <div className="price-detail" data-testid="price-detail" data-unit={p.unitId}>
      <table className="table price-table"><tbody>{rows.map(([k, v]) => <tr key={k}><td>{k}</td><td><bdi>{v}</bdi></td></tr>)}</tbody></table>
      <p className="price-total"><span>{t('price.total')}</span><bdi data-testid="price-total">{priceFull(t, p.total[pkg])}</bdi></p>
      <p className="meta"><bdi>{t('price.usd', { n: fmtAmount(toUsd(p.total[pkg])), r: fmtAmount(PRICING.usd.iqdPerUsd) })}</bdi></p>
      <p className="fine" data-testid="price-stamp">{t('price.stamp', { d: PRICING.stampDate })} · {t('price.methodShort')}</p>
    </div>
  );
}

export function PricingSheetBody() {
  const { t, l, locale } = useT();
  const unitId = useStore((s) => s.unitId); const pkg0 = useStore((s) => s.packageId);
  const compareIds = useStore((s) => s.compareIds); const toggleCompare = useStore((s) => s.toggleCompare);
  const [type, setType] = useState<'' | UnitTypeId>(''); const [band, setBand] = useState(0); const [budget, setBudget] = useState(0); const [pkg, setPkg] = useState<PackageId>(pkg0);
  const sel = unitId && PRICE_BY_UNIT[unitId] ? PRICE_BY_UNIT[unitId] : null;
  const rows = useMemo(() => DEMO_PRICES.filter((p) => (!type || p.typeId === type) && (!band || Math.ceil(p.level / 3) === band) && (!budget || p.total[pkg] <= budget)), [type, band, budget, pkg]);
  const pick = (id: string) => {
    const s = useStore.getState();
    if (s.experience === '3d') s.selectUnit(id); else s.set({ unitId: id, floorId: UNIT_BY_ID[id].floorId });
  };
  const showOnTower = (id: string) => { const s = useStore.getState(); if (s.experience !== '3d') s.chooseExperience('3d'); useStore.getState().selectUnit(id); s.openOverlay(null); };
  const showPhotos = (id: string) => { const s = useStore.getState(); const scene = UNIT_BY_ID[id].typeId === 'TYPE_A' ? 'living' : 'B_living'; if (s.experience !== 'visual') { s.set({ sceneId: scene }); s.chooseExperience('visual'); } useStore.getState().setScene(scene); };
  const Chip = ({ on, label, onClick, testid }: { on: boolean; label: string; onClick: () => void; testid?: string }) => <button type="button" className="chip" aria-pressed={on} onClick={onClick} data-testid={testid}>{label}</button>;
  const ra = priceRange('TYPE_A', pkg), rb = priceRange('TYPE_B', pkg);
  return (
    <div className="pricing" data-testid="pricing">
      <PriceDisclaimer />
      <div className="price-ranges">
        {([['TYPE_A', ra, PRICE_BY_UNIT.U01A], ['TYPE_B', rb, PRICE_BY_UNIT.U01B]] as const).map(([tid, r, p]) => (
          <button key={tid} type="button" className="price-range" aria-pressed={type === tid} onClick={() => setType(type === tid ? '' : tid)} data-testid={`price-range-${tid}`}>
            <b>{t(tid === 'TYPE_A' ? 'unit.typeA' : 'unit.typeB')}</b>
            <span><bdi>{t('price.range', { a: compactValue(r.min, locale), b: compactValue(r.max, locale) })}</bdi></span>
            <small><bdi>{t('price.areaLine', { a: p.netArea, b: p.balconyArea })}</bdi></small>
          </button>))}
      </div>
      <h3 className="sub">{t('finder.level')}</h3>
      <div className="chips"><Chip on={!band} label={t('finder.any')} onClick={() => setBand(0)} /><Chip on={band === 1} label={t('finder.low')} onClick={() => setBand(1)} /><Chip on={band === 2} label={t('finder.mid')} onClick={() => setBand(2)} /><Chip on={band === 3} label={t('finder.high')} onClick={() => setBand(3)} testid="price-band-high" /></div>
      <h3 className="sub">{t('price.finish')}</h3>
      <div className="seg" role="radiogroup" aria-label={t('price.finish')}>{PACKAGES_IN_ORDER.map((p) => <button key={p} type="button" role="radio" aria-checked={pkg === p} className="seg-btn" onClick={() => setPkg(p)} data-testid={`price-pkg-${p}`}>{l(PACKAGES[p].name)}</button>)}</div>
      <h3 className="sub">{t('price.budget')}</h3>
      <div className="chips"><Chip on={!budget} label={t('finder.any')} onClick={() => setBudget(0)} />{PRICING.budgetSteps.map((b) => <Chip key={b} on={budget === b} label={t('price.upTo', { n: compactValue(b, locale) })} onClick={() => setBudget(b)} testid={`price-budget-${b}`} />)}</div>
      <p className="meta" role="status" data-testid="price-count">{t('finder.results', { n: rows.length })}</p>
      <ul className="list price-list">{rows.map((p) => (
        <li key={p.unitId}>
          <button type="button" className="list-btn" aria-pressed={sel?.unitId === p.unitId} onClick={() => pick(p.unitId)} data-testid={`price-row-${p.unitId}`}>
            <span><bdi>{t('unit.name', { id: unitCode(p.unitId) })}</bdi> <small>· {floorLabel(t, p.floorId)}</small></span>
            <span className="dims"><bdi>{t(p.typeId === 'TYPE_A' ? 'unit.typeA' : 'unit.typeB')} · {p.saleableArea} m²</bdi></span>
            <b className="price-v"><bdi>{t('price.compact', { n: compactValue(p.total[pkg], locale) })}</bdi></b>
          </button>
        </li>))}</ul>
      {sel && (
        <section className="price-sel" aria-label={t('unit.name', { id: unitCode(sel.unitId) })}>
          <h3 className="sub"><bdi>{t('unit.name', { id: unitCode(sel.unitId) })}</bdi> · {floorLabel(t, sel.floorId)}</h3>
          <Breakdown p={sel} pkg={pkg} />
          <div className="row">
            <button type="button" className="btn btn-secondary" onClick={() => showOnTower(sel.unitId)} data-testid="price-show3d"><Icon name="cube" size={16} />{t('price.showTower')}</button>
            <button type="button" className="btn btn-quiet" onClick={() => showPhotos(sel.unitId)} data-testid="price-photos"><Icon name="image" size={16} />{t('price.showPhotos')}</button>
            <button type="button" className="btn btn-quiet" aria-pressed={compareIds.includes(sel.unitId)} onClick={() => toggleCompare(sel.unitId)} data-testid="price-compare"><Icon name="scale" size={16} />{t('price.compare')}</button>
          </div>
        </section>
      )}
      {!sel && <p className="meta">{t('price.pickHint')}</p>}
      <p className="fine">{t('price.method')}</p>
    </div>
  );
}
