import type { FloorId, LocaleKey, UnitTypeId } from './types';
import { FLOOR_BY_ID, UNITS, UNIT_BY_ID, UNIT_TYPES } from './tower';
import { unitBalconyArea, unitNetArea } from './audit';
import type { PackageId } from './materials';
import RAW from '../data/pricing-demo.json';

// ---------------------------------------------------------------------------------------------
// V11.4 DEMO PRICING — illustrative prices for a FICTIONAL concept that is not for sale.
// One editable source (src/data/pricing-demo.json); every number shown anywhere is computed here.
// Method + market anchoring: project_artifacts/pricing/MARKET_ANCHORING.md
// ---------------------------------------------------------------------------------------------

export interface PricingConfig {
  version: string; stampDate: string; currency: 'IQD';
  usd: { iqdPerUsd: number; hypothetical: boolean };
  base: { ratePerSqm: number; balconyWeight: number; roundTo: number };
  typeFactor: Record<UnitTypeId, number>;
  sideFactor: Record<'A' | 'B', number>;
  floorPremiumPerLevel: number;
  finishPerSqm: Record<PackageId, number>;
  budgetSteps: number[];
}
export const PRICING: PricingConfig = RAW as PricingConfig;
export const PACKAGES_IN_ORDER: PackageId[] = ['standard', 'premium', 'luxury'];

export interface DemoPrice {
  unitId: string; typeId: UnitTypeId; floorId: FloorId; level: number; side: 'A' | 'B';
  /** model-measured areas (m²) */
  netArea: number; balconyArea: number; saleableArea: number;
  typeFactor: number; sideFactor: number; floorFactor: number;
  /** effective rate after all factors (IQD per m², not rounded) */
  ratePerSqm: number;
  /** rounded base price with the standard finish (IQD) */
  base: number;
  /** rounded optional finish-package extra per package (IQD; standard = 0) */
  finishExtra: Record<PackageId, number>;
  /** base + finish extra, per package */
  total: Record<PackageId, number>;
}

const roundTo = (v: number, step: number) => Math.round(v / step) * step;
const r2 = (v: number) => Math.round(v * 100) / 100;

export function computePrice(unitId: string, cfg: PricingConfig = PRICING): DemoPrice {
  const u = UNIT_BY_ID[unitId]; if (!u) throw new Error(`unknown unit ${unitId}`);
  const level = FLOOR_BY_ID[u.floorId].number;
  const netArea = r2(unitNetArea(u.typeId)), balconyArea = r2(unitBalconyArea(u.typeId));
  const saleableArea = r2(netArea + cfg.base.balconyWeight * balconyArea);
  const typeFactor = cfg.typeFactor[u.typeId], sideFactor = cfg.sideFactor[u.side];
  const floorFactor = 1 + cfg.floorPremiumPerLevel * (level - 1);
  const ratePerSqm = cfg.base.ratePerSqm * typeFactor * sideFactor * floorFactor;
  const base = roundTo(saleableArea * ratePerSqm, cfg.base.roundTo);
  const finishExtra = Object.fromEntries(PACKAGES_IN_ORDER.map((p) => [p, roundTo(saleableArea * cfg.finishPerSqm[p], cfg.base.roundTo)])) as Record<PackageId, number>;
  const total = Object.fromEntries(PACKAGES_IN_ORDER.map((p) => [p, base + finishExtra[p]])) as Record<PackageId, number>;
  return { unitId, typeId: u.typeId, floorId: u.floorId, level, side: u.side, netArea, balconyArea, saleableArea, typeFactor, sideFactor, floorFactor, ratePerSqm, base, finishExtra, total };
}

/** all 18 apartments, in tower order (F01 A, F01 B, …) */
export const DEMO_PRICES: DemoPrice[] = UNITS.map((u) => computePrice(u.id));
export const PRICE_BY_UNIT: Record<string, DemoPrice> = Object.fromEntries(DEMO_PRICES.map((p) => [p.unitId, p]));

export function priceRange(typeId?: UnitTypeId, pkg: PackageId = 'standard'): { min: number; max: number } {
  const v = DEMO_PRICES.filter((p) => !typeId || p.typeId === typeId).map((p) => p.total[pkg]);
  return { min: Math.min(...v), max: Math.max(...v) };
}

/** western digits with locale grouping (the app shows western digits in all four languages) */
export function groupDigits(n: number): string { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
/** full amount, e.g. "246,000,000" — the caller adds the currency word from i18n */
export const fmtAmount = (n: number) => groupDigits(n);
/** compact number for cards: millions (ar/en/ckb) or 亿 (zh = 100 M) */
export function compactValue(n: number, locale: LocaleKey): string {
  if (locale === 'zh') return (Math.round(n / 1e6) / 100).toFixed(2).replace(/0$/, '');
  return String(Math.round(n / 1e6));
}
export const toUsd = (iqd: number, cfg: PricingConfig = PRICING) => Math.round(iqd / cfg.usd.iqdPerUsd / 1000) * 1000;

/** unit types are always ordered by total size; used by tests and the assistant */
export const TYPE_SIZE_ORDER: UnitTypeId[] = (Object.keys(UNIT_TYPES) as UnitTypeId[]).sort((a, b) => unitNetArea(a) - unitNetArea(b));
