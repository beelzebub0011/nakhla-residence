import type { L10n } from './types';

// ---------------------------------------------------------------------------------------------
// Finish catalogue — 6 categories × 3 concept samples = 18. ORIGINAL procedural PBR looks authored
// for this project (no supplier, brand, price, warranty or certification is implied or known).
// ---------------------------------------------------------------------------------------------

export type CategoryId = 'flooring' | 'wall_paint' | 'wood_finish' | 'kitchen_cabinet' | 'countertop' | 'bathroom_tile';
export const CATEGORY_IDS: CategoryId[] = ['flooring', 'wall_paint', 'wood_finish', 'kitchen_cabinet', 'countertop', 'bathroom_tile'];

export type Recipe =
  | { type: 'tile'; base: string; vein?: string; grout: string; module: [number, number]; rough: number; veinAmount?: number; speckle?: number; groutW?: number; toneVar?: number }
  | { type: 'plank'; base: string; dark: string; module: [number, number]; rough: number }
  | { type: 'veneer'; base: string; dark: string; rough: number }
  | { type: 'paint'; base: string; rough: number }
  | { type: 'laminate'; base: string; rough: number }
  | { type: 'stone'; base: string; vein?: string; veinAmount?: number; speckle?: number; rough: number }
  /** photo-scanned CC0 PBR set (public/textures). base = representative colour; tint recolours neutral sets; gain brightens */
  | { type: 'photo'; set: string; base: string; rough: number; tint?: string; gain?: number; scale?: number };

export interface CatalogMaterial {
  id: string;
  category: CategoryId;
  name: L10n;
  swatch: string;
  isDefault: boolean;
  recipe: Recipe;
  /** nominal visual module in mm as modelled (illustrative, not a product specification) */
  moduleMm: [number, number] | null;
  finish: 'matte' | 'satin' | 'polished-look';
  use: L10n;
}

const m = (id: string, category: CategoryId, name: L10n, swatch: string, isDefault: boolean, recipe: Recipe, moduleMm: [number, number] | null, finish: CatalogMaterial['finish'], use: L10n): CatalogMaterial =>
  ({ id, category, name, swatch, isDefault, recipe, moduleMm, finish, use });

const USE = {
  dry: { ar: 'أرضيات داخلية جافة', en: 'Dry interior floors', ckb: 'زەوی ناوەوەی وشک', zh: '室内干区地面' },
  walls: { ar: 'جدران داخلية', en: 'Interior walls', ckb: 'دیواری ناوەوە', zh: '室内墙面' },
  panels: { ar: 'ألواح وتجاليد داخلية', en: 'Interior panels & joinery', ckb: 'پانێڵ و دارتاشیی ناوەوە', zh: '室内护墙板与木作' },
  fronts: { ar: 'واجهات خزائن المطبخ', en: 'Kitchen cabinet fronts', ckb: 'ڕووی دۆڵابی چێشتخانە', zh: '橱柜门板' },
  tops: { ar: 'أسطح العمل والمغاسل', en: 'Worktops & vanities', ckb: 'ڕووی کارکردن و دەستشۆر', zh: '台面与洗手台' },
  wet: { ar: 'جدران وأرضيات الحمام (بعد التحقق)', en: 'Bathroom walls & floors (subject to verification)', ckb: 'دیوار و زەوی گەرماو (دوای پشتڕاستکردنەوە)', zh: '浴室墙地面（需核实）' },
} satisfies Record<string, L10n>;

export const CATALOG: CatalogMaterial[] = [
  m('MAT_IVORY_PORCELAIN', 'flooring', { ar: 'بورسلان عاجي مطفي', en: 'Ivory Matte Porcelain', ckb: 'پۆرسلینی عاجیی مات', zh: '象牙白哑光瓷砖' }, '#d6c9b4', true,
    { type: 'tile', base: '#d8ccb8', grout: '#b9ad9a', module: [0.6, 1.2], rough: 0.62, speckle: 0.05 }, [600, 1200], 'matte', USE.dry),
  m('MAT_PEARL_MARBLELOOK', 'flooring', { ar: 'بورسلان بمظهر رخام لؤلؤي', en: 'Pearl Marble-Look Porcelain', ckb: 'پۆرسلینی شێوە مەڕمەڕی مرواری', zh: '珍珠白大理石纹瓷砖' }, '#ebe9e3', false,
    { type: 'tile', base: '#ecebe6', vein: '#b9b6ad', grout: '#d2cfc7', module: [0.6, 1.2], rough: 0.28, veinAmount: 0.8 }, [600, 1200], 'polished-look', USE.dry),
  m('MAT_ENGINEERED_OAK', 'flooring', { ar: 'خشب هندسي أوك', en: 'Engineered Oak', ckb: 'داری ئەندازەیی بەڕوو', zh: '橡木复合地板' }, '#b88d62', false,
    { type: 'photo', set: 'laminate_floor_02', base: '#a88c6c', rough: 0.45, gain: 1.12 }, [180, 1800], 'matte', USE.dry),

  m('MAT_WARM_CREAM', 'wall_paint', { ar: 'كريمي دافئ', en: 'Warm Cream', ckb: 'کرێمی گەرم', zh: '暖奶油色' }, '#e7d9c6', true, { type: 'paint', base: '#e9dcc9', rough: 0.9 }, null, 'matte', USE.walls),
  m('MAT_SOFT_GREY', 'wall_paint', { ar: 'رمادي فاتح', en: 'Soft Grey', ckb: 'خۆڵەمێشیی کاڵ', zh: '柔和浅灰' }, '#c9c9c6', false, { type: 'paint', base: '#cdcdca', rough: 0.9 }, null, 'matte', USE.walls),
  m('MAT_SAGE', 'wall_paint', { ar: 'زيتي هادئ', en: 'Muted Sage', ckb: 'سەوزی هێمن', zh: '静谧鼠尾草绿' }, '#a3aca0', false, { type: 'paint', base: '#a9b2a5', rough: 0.9 }, null, 'matte', USE.walls),

  m('MAT_LIGHT_OAK', 'wood_finish', { ar: 'قشرة أوك فاتح', en: 'Light Oak Veneer-Look', ckb: 'توێکڵی بەڕووی کاڵ', zh: '浅橡木饰面' }, '#c19a70', true, { type: 'photo', set: 'oak_veneer_01', base: '#b8936a', rough: 0.55, gain: 1.15 }, null, 'matte', USE.panels),
  m('MAT_WALNUT', 'wood_finish', { ar: 'قشرة جوز دافئ', en: 'Warm Walnut Veneer-Look', ckb: 'توێکڵی گوێزی گەرم', zh: '暖胡桃木饰面' }, '#7c513b', false, { type: 'photo', set: 'walnut_veneer', base: '#7c5a45', rough: 0.55, tint: '#e6d2c6' }, null, 'satin', USE.panels),
  m('MAT_DARK_WALNUT', 'wood_finish', { ar: 'قشرة جوز غامق', en: 'Dark Walnut Veneer-Look', ckb: 'توێکڵی گوێزی تۆخ', zh: '深胡桃木饰面' }, '#4b332c', false, { type: 'photo', set: 'smoked_walnut_veneer', base: '#4b3a34', rough: 0.6, tint: '#6b5850' }, null, 'satin', USE.panels),

  m('MAT_MATTE_IVORY', 'kitchen_cabinet', { ar: 'عاجي مطفي', en: 'Matte Ivory', ckb: 'عاجیی مات', zh: '哑光象牙白' }, '#f1e9d7', true, { type: 'laminate', base: '#f0e8d7', rough: 0.6 }, null, 'matte', USE.fronts),
  m('MAT_WALNUT_CABINET', 'kitchen_cabinet', { ar: 'جوز دافئ', en: 'Walnut Cabinet Fronts', ckb: 'ڕووی دۆڵابی گوێز', zh: '胡桃木橱柜门板' }, '#885d45', false, { type: 'photo', set: 'walnut_veneer', base: '#84624b', rough: 0.55, tint: '#f1e2d6' }, null, 'satin', USE.fronts),
  m('MAT_CHARCOAL', 'kitchen_cabinet', { ar: 'فحمي مطفي', en: 'Charcoal Matte', ckb: 'خەڵووزیی مات', zh: '哑光炭灰' }, '#4b4b49', false, { type: 'laminate', base: '#4c4c4a', rough: 0.58 }, null, 'matte', USE.fronts),

  m('MAT_WHITE_QUARTZLOOK', 'countertop', { ar: 'سطح أبيض بمظهر كوارتز', en: 'White Quartz-Look', ckb: 'ڕووی سپیی شێوە کوارتز', zh: '白色石英石纹台面' }, '#eceae3', true, { type: 'stone', base: '#eeece6', speckle: 0.12, rough: 0.3 }, null, 'polished-look', USE.tops),
  m('MAT_DARK_GRANITELOOK', 'countertop', { ar: 'سطح داكن بمظهر گرانيت', en: 'Dark Granite-Look', ckb: 'ڕووی تۆخی شێوە گرانیت', zh: '深色花岗岩纹台面' }, '#393b3a', false, { type: 'stone', base: '#3a3c3b', speckle: 0.5, rough: 0.32 }, null, 'polished-look', USE.tops),
  m('MAT_IVORY_MARBLELOOK', 'countertop', { ar: 'سطح عاجي بمظهر رخام', en: 'Ivory Marble-Look', ckb: 'ڕووی عاجیی شێوە مەڕمەڕ', zh: '象牙白大理石纹台面' }, '#d9d0c0', false, { type: 'stone', base: '#dcd3c3', vein: '#a8997f', veinAmount: 0.9, rough: 0.3 }, null, 'polished-look', USE.tops),

  m('MAT_STONELOOK_GRIP', 'bathroom_tile', { ar: 'بلاط بمظهر حجر رملي', en: 'Warm Stone-Look Tile', ckb: 'کاشیی شێوە بەردی گەرم', zh: '暖色仿石砖' }, '#bbb0a0', true,
    { type: 'tile', base: '#beb3a3', grout: '#a3998a', module: [0.6, 0.6], rough: 0.72, speckle: 0.18 }, [600, 600], 'matte', USE.wet),
  m('MAT_GREY_PORCELAIN', 'bathroom_tile', { ar: 'بورسلان رمادي ساتان', en: 'Satin Grey Porcelain', ckb: 'پۆرسلینی خۆڵەمێشیی ساتان', zh: '缎面灰瓷砖' }, '#a7a9a9', false,
    { type: 'tile', base: '#aaacac', grout: '#8f9191', module: [0.6, 0.6], rough: 0.45, speckle: 0.06 }, [600, 600], 'satin', USE.wet),
  m('MAT_WHITE_MARBLELOOK', 'bathroom_tile', { ar: 'رخامي أبيض', en: 'White Marble-Look Porcelain', ckb: 'پۆرسلینی سپیی شێوە مەڕمەڕ', zh: '白色大理石纹瓷砖' }, '#ece9e3', false,
    { type: 'tile', base: '#eeebe5', vein: '#b3b0a8', grout: '#d6d3cb', module: [0.6, 1.2], rough: 0.3, veinAmount: 0.7 }, [600, 1200], 'polished-look', USE.wet),
];

export const MATERIAL_BY_ID = Object.fromEntries(CATALOG.map((c) => [c.id, c])) as Record<string, CatalogMaterial>;
export const CATEGORY_MATERIALS = Object.fromEntries(
  CATEGORY_IDS.map((c) => [c, CATALOG.filter((x) => x.category === c).map((x) => x.id)]),
) as Record<CategoryId, string[]>;

export type PackageId = 'standard' | 'premium' | 'luxury';
export const PACKAGE_IDS: PackageId[] = ['standard', 'premium', 'luxury'];
export const PACKAGES: Record<PackageId, { name: L10n; ids: Record<CategoryId, string> }> = {
  standard: {
    name: { ar: 'العاجي الدافئ', en: 'Warm Ivory', ckb: 'عاجیی گەرم', zh: '暖象牙' },
    ids: { flooring: 'MAT_IVORY_PORCELAIN', wall_paint: 'MAT_WARM_CREAM', wood_finish: 'MAT_LIGHT_OAK', kitchen_cabinet: 'MAT_MATTE_IVORY', countertop: 'MAT_WHITE_QUARTZLOOK', bathroom_tile: 'MAT_STONELOOK_GRIP' },
  },
  premium: {
    name: { ar: 'تناغم الجوز', en: 'Walnut Harmony', ckb: 'هاوئاهەنگیی گوێز', zh: '胡桃和韵' },
    ids: { flooring: 'MAT_PEARL_MARBLELOOK', wall_paint: 'MAT_WARM_CREAM', wood_finish: 'MAT_WALNUT', kitchen_cabinet: 'MAT_WALNUT_CABINET', countertop: 'MAT_WHITE_QUARTZLOOK', bathroom_tile: 'MAT_GREY_PORCELAIN' },
  },
  luxury: {
    name: { ar: 'اللؤلؤ العصري', en: 'Modern Pearl', ckb: 'مرواریی سەردەم', zh: '摩登珍珠' },
    ids: { flooring: 'MAT_PEARL_MARBLELOOK', wall_paint: 'MAT_SOFT_GREY', wood_finish: 'MAT_DARK_WALNUT', kitchen_cabinet: 'MAT_CHARCOAL', countertop: 'MAT_IVORY_MARBLELOOK', bathroom_tile: 'MAT_WHITE_MARBLELOOK' },
  },
};

// ---------------------------------------------------------------------------------------------
// Editable surface registry: surface id -> room + category. Every id maps to real meshes.

export interface SurfaceDef { id: string; roomId: string; category: CategoryId; part: 'floor' | 'wall' | 'joinery' | 'top'; onlyType?: 'TYPE_B' }

const s = (id: string, category: CategoryId, part: SurfaceDef['part'], onlyType?: 'TYPE_B'): SurfaceDef => ({ id, roomId: id.split('.')[0], category, part, onlyType });

export const SURFACES: SurfaceDef[] = [
  s('living.flooring', 'flooring', 'floor'), s('living.walls', 'wall_paint', 'wall'), s('living.feature_panel', 'wood_finish', 'joinery'),
  s('kitchen.cabinet_fronts', 'kitchen_cabinet', 'joinery'), s('kitchen.countertop', 'countertop', 'top'), s('kitchen.walls', 'wall_paint', 'wall'),
  s('master.flooring', 'flooring', 'floor'), s('master.walls', 'wall_paint', 'wall'), s('master.feature_panel', 'wood_finish', 'joinery'),
  s('bathroom.wall_tiles', 'bathroom_tile', 'wall'), s('bathroom.floor_tiles', 'bathroom_tile', 'floor'), s('bathroom.vanity', 'countertop', 'top'),
  s('second_bedroom.flooring', 'flooring', 'floor'), s('second_bedroom.walls', 'wall_paint', 'wall'),
  s('third_bedroom.flooring', 'flooring', 'floor', 'TYPE_B'), s('third_bedroom.walls', 'wall_paint', 'wall', 'TYPE_B'),
  s('master_bath.tiles', 'bathroom_tile', 'wall'),
  s('laundry.walls', 'wall_paint', 'wall'),
  s('entry.flooring', 'flooring', 'floor'), s('entry.walls', 'wall_paint', 'wall'),
];
export const SURFACE_BY_ID = Object.fromEntries(SURFACES.map((x) => [x.id, x])) as Record<string, SurfaceDef>;

/** Which editable surface finishes the floor / walls of a unit room. null = fixed (non-editable). */
export function surfaceFor(roomId: string, part: 'floor' | 'wall'): string | null {
  switch (roomId) {
    case 'living': return part === 'floor' ? 'living.flooring' : 'living.walls';
    case 'kitchen': return part === 'floor' ? 'living.flooring' : 'kitchen.walls'; // open-plan continuous floor
    case 'master': return part === 'floor' ? 'master.flooring' : 'master.walls';
    case 'bathroom': return part === 'floor' ? 'bathroom.floor_tiles' : 'bathroom.wall_tiles';
    case 'master_bath': return 'master_bath.tiles';
    case 'second_bedroom': return part === 'floor' ? 'second_bedroom.flooring' : 'second_bedroom.walls';
    case 'third_bedroom': return part === 'floor' ? 'third_bedroom.flooring' : 'third_bedroom.walls';
    case 'entry': case 'hall': case 'hall_e': case 'dressing': return part === 'floor' ? 'entry.flooring' : 'entry.walls';
    case 'laundry': return part === 'floor' ? null : 'laundry.walls';
    default: return null;
  }
}

export type Overrides = Record<string, string>;

/** Resolve the catalogue material currently applied to a surface (override > package default). */
export function resolveSurfaceMaterial(surfaceId: string, pkg: PackageId, overrides: Overrides): string {
  const def = SURFACE_BY_ID[surfaceId];
  if (!def) throw new Error(`Unknown surface ${surfaceId}`);
  const o = overrides[surfaceId];
  if (o && MATERIAL_BY_ID[o]?.category === def.category) return o;
  return PACKAGES[pkg].ids[def.category];
}

/** Validate an override map against the registry (used for URL/share/localStorage input). */
export function sanitizeOverrides(input: unknown): Overrides {
  const out: Overrides = {};
  if (!input || typeof input !== 'object') return out;
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    const def = SURFACE_BY_ID[k];
    if (def && typeof v === 'string' && MATERIAL_BY_ID[v]?.category === def.category) out[k] = v;
  }
  return out;
}
