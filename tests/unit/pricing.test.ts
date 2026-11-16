import { describe, expect, it } from 'vitest';
import { DEMO_PRICES, PRICE_BY_UNIT, PRICING, compactValue, computePrice, fmtAmount, priceRange, toUsd, type PricingConfig } from '../../src/domain/pricing';
import { UNITS, UNIT_BY_ID } from '../../src/domain/tower';
import { unitBalconyArea, unitNetArea } from '../../src/domain/audit';
import { translate } from '../../src/i18n';
import { en } from '../../src/i18n/en';
import { answer, type AiContext } from '../../src/ai/resolver';
import { hashToPatch, stateToHash, useStore } from '../../src/state/store';

// V11.4 demo pricing: one dataset, consistent maths, honest labels in four languages.
const r2 = (v: number) => Math.round(v * 100) / 100;

describe('demo pricing data', () => {
  it('prices all 18 apartments, one record each, linked to the model areas', () => {
    expect(DEMO_PRICES).toHaveLength(18);
    expect(DEMO_PRICES.map((p) => p.unitId)).toEqual(UNITS.map((u) => u.id));
    for (const p of DEMO_PRICES) {
      const u = UNIT_BY_ID[p.unitId];
      expect(p.typeId).toBe(u.typeId); expect(p.floorId).toBe(u.floorId); expect(p.side).toBe(u.side);
      expect(p.netArea).toBe(r2(unitNetArea(u.typeId))); expect(p.balconyArea).toBe(r2(unitBalconyArea(u.typeId)));
      expect(p.saleableArea).toBe(r2(p.netArea + PRICING.base.balconyWeight * p.balconyArea));
    }
    expect(PRICE_BY_UNIT.U04A.netArea).toBeCloseTo(124.86, 2); expect(PRICE_BY_UNIT.U04B.netArea).toBeCloseTo(145.02, 2);
  });
  it('recomputes every price independently from the stated formula', () => {
    for (const p of DEMO_PRICES) {
      const rate = PRICING.base.ratePerSqm * PRICING.typeFactor[p.typeId] * PRICING.sideFactor[p.side] * (1 + PRICING.floorPremiumPerLevel * (p.level - 1));
      expect(p.base).toBe(Math.round((p.saleableArea * rate) / 1e6) * 1e6);
      expect(p.finishExtra.standard).toBe(0);
      for (const k of ['standard', 'premium', 'luxury'] as const) {
        expect(p.total[k]).toBe(p.base + p.finishExtra[k]);
        expect(p.total[k] % PRICING.base.roundTo).toBe(0);
      }
      expect(p.finishExtra.premium).toBeLessThan(p.finishExtra.luxury);
    }
  });
  it('is internally consistent: bigger flat costs more in total, higher level costs more, no surprises', () => {
    for (let lv = 1; lv <= 9; lv++) {
      const n = String(lv).padStart(2, '0'); const a = PRICE_BY_UNIT[`U${n}A`], b = PRICE_BY_UNIT[`U${n}B`];
      expect(b.base).toBeGreaterThan(a.base);                                 // Type B is larger …
      expect(b.base / b.saleableArea).toBeLessThan(a.base / a.saleableArea);  // … but cheaper per m²
      if (lv > 1) { expect(a.base).toBeGreaterThanOrEqual(PRICE_BY_UNIT[`U${String(lv - 1).padStart(2, '0')}A`].base); expect(b.base).toBeGreaterThanOrEqual(PRICE_BY_UNIT[`U${String(lv - 1).padStart(2, '0')}B`].base); }
    }
    const all = priceRange(); const ra = priceRange('TYPE_A'), rb = priceRange('TYPE_B');
    expect(all.min).toBe(ra.min); expect(all.max).toBe(rb.max);
    expect(ra.min).toBe(PRICE_BY_UNIT.U01A.base); expect(rb.max).toBe(PRICE_BY_UNIT.U09B.base);
    // plausibility guard against the anchoring note (≈1.4–2.1 M IQD per m² in Basra, Nov 2026)
    for (const p of DEMO_PRICES) { const perSqm = p.base / p.saleableArea; expect(perSqm).toBeGreaterThan(1.4e6); expect(perSqm).toBeLessThan(2.2e6); }
  });
  it('recalculates from the central config only', () => {
    const cfg: PricingConfig = { ...PRICING, base: { ...PRICING.base, ratePerSqm: 2_000_000 } };
    expect(computePrice('U04A', cfg).base).toBeGreaterThan(PRICE_BY_UNIT.U04A.base);
  });
  it('formats numbers and currency predictably, with a hypothetical USD conversion', () => {
    expect(fmtAmount(246000000)).toBe('246,000,000');
    expect(compactValue(246000000, 'en')).toBe('246'); expect(compactValue(246000000, 'ar')).toBe('246'); expect(compactValue(246000000, 'zh')).toBe('2.46');
    expect(PRICING.usd.hypothetical).toBe(true);
    expect(toUsd(300_000_000)).toBe(Math.round(300_000_000 / PRICING.usd.iqdPerUsd / 1000) * 1000);
    expect(translate('en', 'price.compact', { n: '246' })).toBe('246 M IQD');
    expect(translate('ar', 'price.compact', { n: '246' })).toBe('246 مليون د.ع');
  });
  it('carries the disclaimer in all four languages (exact Arabic wording from the brief)', () => {
    expect(translate('ar', 'price.disclaimer')).toBe('أسعار افتراضية للعرض فقط — المشروع تصوّري وغير مطروح للبيع');
    for (const l of ['en', 'ar', 'ckb', 'zh'] as const) for (const k of Object.keys(en).filter((x) => x.startsWith('price.'))) expect(translate(l, k as never), `${l} ${k}`).not.toBe(k);
    // no sales pressure anywhere in the pricing copy
    for (const l of ['en', 'ar', 'ckb', 'zh'] as const) for (const k of Object.keys(en).filter((x) => x.startsWith('price.'))) expect(translate(l, k as never)).not.toMatch(/\bsold\b|available now|ends today|buy now|deposit/i);
  });
});

describe('demo pricing in the assistant', () => {
  const ctx = (o: Partial<AiContext> = {}): AiContext => ({ locale: 'en', floorId: 'F04', unitId: 'U04A', roomKey: null, selectedSurfaceId: null, packageId: 'standard', overrides: {}, ...o });
  it('answers unit prices from the dataset, always with the disclaimer', () => {
    const q = { en: 'what is the price?', ar: 'شكد السعر؟', ckb: 'نرخی چەندە؟', zh: '价格多少钱？' } as const;
    for (const l of ['en', 'ar', 'ckb', 'zh'] as const) {
      const a = answer(q[l], ctx({ locale: l }));
      expect(a.status, l).toBe('demo_schema');
      expect(a.text, l).toContain(fmtAmount(PRICE_BY_UNIT.U04A.total.standard));
      expect(a.actions.some((x) => x.action.type === 'openPricing'), l).toBe(true);
    }
    expect(answer('what is the price?', ctx()).text).toMatch(/hypothetical demonstration values/);
    expect(answer('شكد السعر؟', ctx({ locale: 'ar' })).text).toContain('قيم افتراضية للعرض فقط');
    const lux = answer('what is the price?', ctx({ packageId: 'luxury', unitId: 'U09B' })); expect(lux.text).toContain(fmtAmount(PRICE_BY_UNIT.U09B.total.luxury));
  });
  it('explains the method and compares two apartments', () => {
    const m = answer('how is the price calculated?', ctx()); expect(m.intent).toBe('price_method'); expect(m.text).toContain('1,850,000');
    const c = answer('compare the price of these apartments', ctx()); expect(c.intent).toBe('price_compare');
    expect(c.text).toContain(fmtAmount(PRICE_BY_UNIT.U04B.total.standard - PRICE_BY_UNIT.U04A.total.standard));
    expect(answer('Is unit 04A available?', ctx()).status).toBe('unknown');      // availability never exists
  });
});

describe('demo pricing deep links and mode switching', () => {
  it('opens pricing from a 3D or photoreal link and keeps the unit', () => {
    expect(hashToPatch('#/en/explore?f=F07&u=U07B&v=unit&pr=1')).toMatchObject({ overlay: 'pricing', unitId: 'U07B' });
    expect(hashToPatch('#/ar/visual/home?pr=U07B')).toMatchObject({ overlay: 'pricing', unitId: 'U07B', floorId: 'F07', experience: 'visual' });
    expect(hashToPatch('#/ar/visual/home?pr=XX')).toMatchObject({ overlay: 'pricing' });
    expect(hashToPatch('#/ar/visual/home?pr=XX')?.unitId).toBeUndefined();
  });
  it('keeps the selected unit (and so its price) when switching experiences', () => {
    const s = useStore.getState();
    s.set({ landing: false, experience: '3d' }); s.selectUnit('U07B'); s.openOverlay('pricing');
    expect(stateToHash(useStore.getState())).toContain('pr=1');
    useStore.getState().chooseExperience('visual');
    expect(useStore.getState().unitId).toBe('U07B');
    useStore.getState().openOverlay('pricing');
    expect(stateToHash(useStore.getState())).toContain('?pr=U07B');
    useStore.getState().chooseExperience('3d');
    expect(PRICE_BY_UNIT[useStore.getState().unitId ?? 'U04A'].typeId).toBe('TYPE_B');
  });
});
