import { describe, expect, it } from 'vitest';
import { DICTS, LOCALE_META } from '../../src/i18n';
import { en } from '../../src/i18n/en';
import { AI } from '../../src/ai/strings';
import { CATALOG, PACKAGES, SURFACES } from '../../src/domain/materials';

const ph = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
const LOCALES = ['ar', 'en', 'ckb', 'zh'] as const;

describe('V4 four complete locales', () => {
  it('every locale covers every key with non-empty text', () => {
    const keys = Object.keys(en).sort();
    for (const l of LOCALES) {
      expect(Object.keys(DICTS[l]).sort()).toEqual(keys);
      for (const k of keys) expect((DICTS[l] as Record<string, string>)[k].trim().length, `${l}:${k}`).toBeGreaterThan(0);
    }
  });
  it('interpolation placeholders match in every locale', () => {
    for (const l of LOCALES) for (const k of Object.keys(en)) expect(ph((DICTS[l] as Record<string, string>)[k]), `${l}:${k}`).toBe(ph((en as Record<string, string>)[k]));
    for (const l of LOCALES) for (const k of Object.keys(AI.en)) expect(ph((AI[l] as Record<string, string>)[k]), `ai ${l}:${k}`).toBe(ph((AI.en as Record<string, string>)[k]));
  });
  it('direction and language tags are correct and all marked unverified', () => {
    expect(LOCALE_META.ar).toMatchObject({ dir: 'rtl', htmlLang: 'ar-IQ' });
    expect(LOCALE_META.ckb).toMatchObject({ dir: 'rtl', htmlLang: 'ckb-IQ' });
    expect(LOCALE_META.en).toMatchObject({ dir: 'ltr', htmlLang: 'en' });
    expect(LOCALE_META.zh).toMatchObject({ dir: 'ltr', htmlLang: 'zh-Hans' });
    for (const l of LOCALES) expect(LOCALE_META[l].review).toBe('DRAFT_UNVERIFIED');
  });
  it('non-English locales are actually translated (not English fallbacks)', () => {
    for (const l of ['ar', 'ckb', 'zh'] as const) {
      const same = Object.keys(en).filter((k) => k !== 'contact.whatsapp' && (DICTS[l] as Record<string, string>)[k] === (en as Record<string, string>)[k]); // WhatsApp is a product name
      expect(same, `${l} untranslated keys`).toEqual([]);
    }
  });
  it('Sorani uses Central Kurdish letters and Chinese is Simplified', () => {
    const ckb = Object.values(DICTS.ckb).join(' ');
    expect(/[ەێۆڕڵ]/.test(ckb)).toBe(true);
    const zh = Object.values(DICTS.zh).join('');
    for (const trad of ['樓', '層', '廳', '臥', '設計', '區', '陽台', '餐廳']) expect(zh.includes(trad), `traditional form ${trad}`).toBe(false);
  });
  it('catalogue, packages and surfaces are localised in all four languages', () => {
    for (const m of CATALOG) for (const l of LOCALES) { expect(m.name[l].length).toBeGreaterThan(1); expect(m.use[l].length).toBeGreaterThan(1); }
    for (const p of Object.values(PACKAGES)) for (const l of LOCALES) expect(p.name[l].length).toBeGreaterThan(1);
    for (const s of SURFACES) for (const l of LOCALES) expect((DICTS[l] as Record<string, string>)[`surf.${s.id}`], `${l} surf.${s.id}`).toBeTruthy();
  });
  it('creator identity is exact', () => {
    expect(DICTS.en['contact.copyright']).toContain('Rashid Omar Mohammed');
    expect(DICTS.ar['contact.copyright']).toContain('راشد عمر محمد');
    for (const l of LOCALES) { expect(AI[l].creator).toContain('+9647700864990'); expect(AI[l].creator).toContain('rashid.iq12@gmail.com'); }
  });
});
