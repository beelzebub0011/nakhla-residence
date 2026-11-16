import type { FloorId, L10n, LocaleKey } from '../domain/types';
import { FLOOR_BY_ID } from '../domain/tower';
import { useStore } from '../state/store';
import { en, type Dict, type MsgKey } from './en';
export type { MsgKey } from './en';
import { ar } from './ar';
import { ckb } from './ckb';
import { zh } from './zh';

export const DICTS: Record<LocaleKey, Dict> = { ar, en, ckb, zh };

export const LOCALE_META: Record<LocaleKey, { htmlLang: string; dir: 'rtl' | 'ltr'; native: string; review: 'DRAFT_UNVERIFIED' }> = {
  ar: { htmlLang: 'ar-IQ', dir: 'rtl', native: 'العربية', review: 'DRAFT_UNVERIFIED' },
  en: { htmlLang: 'en', dir: 'ltr', native: 'English', review: 'DRAFT_UNVERIFIED' },
  ckb: { htmlLang: 'ckb-IQ', dir: 'rtl', native: 'کوردی (سۆرانی)', review: 'DRAFT_UNVERIFIED' },
  zh: { htmlLang: 'zh-Hans', dir: 'ltr', native: '简体中文', review: 'DRAFT_UNVERIFIED' },
};

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
/** Western digits are used for identifiers and measurements in every locale (never mirrored). */
export function fmtNum(n: number, locale: LocaleKey, digits = 1): string {
  void locale;
  return Number.isInteger(n) ? String(n) : n.toFixed(digits).replace(/\.0+$/, '');
}
export const toWesternDigits = (s: string) => s.replace(/[٠-٩]/g, (d) => String(ARABIC_DIGITS.indexOf(d))).replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)));

export function translate(locale: LocaleKey, key: MsgKey, vars?: Record<string, string | number>): string {
  let s: string = DICTS[locale][key] ?? en[key] ?? key;
  // V12: an apartment is named by its model and floor ("Model One · Floor 04"); callers keep passing the id ("04A")
  if (key === 'unit.name' && vars && typeof vars.id === 'string' && !('model' in vars)) {
    const m = /^U?(\d{2})([AB])$/.exec(vars.id);
    if (m) vars = { ...vars, floor: m[1], model: DICTS[locale][m[2] === 'A' ? 'unit.typeA' : 'unit.typeB'] ?? en[m[2] === 'A' ? 'unit.typeA' : 'unit.typeB'] };
  }
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
  return s;
}
export type T = (key: MsgKey, vars?: Record<string, string | number>) => string;

export function useT(): { t: T; locale: LocaleKey; dir: 'rtl' | 'ltr'; l: (v: L10n) => string } {
  const locale = useStore((s) => s.locale);
  return { t: (key, vars) => translate(locale, key, vars), locale, dir: LOCALE_META[locale].dir, l: (v) => v[locale] };
}

export const hasKey = (k: string): k is MsgKey => k in en;

export function floorLabel(t: T, id: FloorId): string {
  return id === 'G' ? t('floor.G') : t('floor.n', { n: String(FLOOR_BY_ID[id].number).padStart(2, '0') });
}
export const unitCode = (unitId: string) => unitId.slice(1);
export function roomLabel(t: T, kind: string): string { const k = `room.${kind}`; return hasKey(k) ? t(k) : kind; }
export function fmtTime(minutes: number): string { const h = Math.floor(minutes / 60), m = minutes % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; }
