import type { FloorId } from './types';

// ---------------------------------------------------------------------------------------------
// Camera bookmarks shared by the Blender/Cycles export (tests/unit/export-artifacts.test.ts) and the
// photoreal website's scene catalogue (src/visual/catalog.ts). One list: same ids, times and titles.
// Coordinates are plot coordinates (x east, y north, metres); time = minutes after midnight (summer).
// ---------------------------------------------------------------------------------------------
export type ViewTitle = { en: string; ar: string; ckb: string; zh: string };
export interface ViewDef {
  id: string; kind: 'orbit' | 'street' | 'room'; time: number; title: ViewTitle; golden?: boolean;
  orbit?: { az: number; pol: number; dist: number; ty: number };
  street?: { x: number; y: number; lx: number; ly: number; fov: number; shiftY: number; /** eye height, m (default 1.65) */ z?: number };
  /** Cycles only: soft glare round a low sun in frame, denser dusty air (V11.4, G5) */
  fx?: { glare?: boolean; dust?: boolean };
  floor?: FloorId; roomKey?: string;
}

export const VIEWS: ViewDef[] = [
  { id: 'exterior_day', kind: 'orbit', time: 960, orbit: { az: -0.66, pol: 1.34, dist: 114, ty: 21 }, title: { en: 'Tower — afternoon', ar: 'البرج — عصراً', ckb: 'تاوەر — پاشنیوەڕۆ', zh: '塔楼 — 下午' } },
  { id: 'exterior_golden', kind: 'orbit', time: 1080, orbit: { az: 0.7, pol: 1.4, dist: 104, ty: 20 }, title: { en: 'Tower — golden hour', ar: 'البرج — الساعة الذهبية', ckb: 'تاوەر — کاتژمێری زێڕین', zh: '塔楼 — 黄金时刻' } },
  { id: 'exterior_dusk', kind: 'orbit', time: 1165, orbit: { az: 0.22, pol: 1.36, dist: 118, ty: 24 }, title: { en: 'Tower and city — blue hour', ar: 'البرج والمدينة — الغسق', ckb: 'تاوەر و شار — کاتی شینی ئێوارە', zh: '塔楼与城市 — 蓝调时刻' } },
  { id: 'exterior_night', kind: 'orbit', time: 1260, orbit: { az: -0.5, pol: 1.42, dist: 100, ty: 20 }, title: { en: 'Tower — night', ar: 'البرج — ليلاً', ckb: 'تاوەر — شەو', zh: '塔楼 — 夜晚' } },
  { id: 'street_arrival', kind: 'street', time: 1115, street: { x: -46, y: -21.2, lx: 12, ly: 4, fov: 70, shiftY: 0.197 }, title: { en: 'Street arrival — golden hour', ar: 'الوصول من الشارع — الساعة الذهبية', ckb: 'گەیشتن لە شەقامەوە — کاتژمێری زێڕین', zh: '街道抵达 · 黄金时刻' } },
  { id: 'street_golden_sun', kind: 'street', time: 1090, street: { x: 60, y: -32, lx: 34, ly: -17, fov: 62, shiftY: 0.04, z: 18 }, fx: { glare: true, dust: true }, title: { en: 'Low aerial — into the sunset', ar: 'لقطة جوية منخفضة — باتجاه الغروب', ckb: 'وێنەی ئاسمانی نزم — بەرەو ئاوابوون', zh: '低空 · 迎着夕阳' } },
  { id: 'street_arrival_dusk', kind: 'street', time: 1165, street: { x: -46, y: -21.2, lx: 12, ly: 4, fov: 70, shiftY: 0.197 }, title: { en: 'Street arrival — blue hour', ar: 'الوصول من الشارع — الغسق', ckb: 'گەیشتن لە شەقامەوە — کاتی شینی ئێوارە', zh: '街道抵达 · 蓝调时刻' } },
  { id: 'street_arrival_night', kind: 'street', time: 1290, street: { x: -46, y: -21.2, lx: 12, ly: 4, fov: 70, shiftY: 0.197 }, title: { en: 'Street arrival — night', ar: 'الوصول من الشارع — ليلاً', ckb: 'گەیشتن لە شەقامەوە — شەو', zh: '街道抵达 · 夜晚' } },
  { id: 'street_entrance', kind: 'street', time: 960, street: { x: 3.2, y: -15.5, lx: 9.5, ly: -1.5, fov: 58, shiftY: 0.14 }, title: { en: 'Entrance and forecourt — afternoon', ar: 'المدخل والساحة الأمامية — عصراً', ckb: 'دەروازە و حەوشەی پێشەوە — پاشنیوەڕۆ', zh: '入口与前庭 · 下午' } },
  { id: 'street_entrance_night', kind: 'street', time: 1290, street: { x: 3.2, y: -15.5, lx: 9.5, ly: -1.5, fov: 58, shiftY: 0.14 }, title: { en: 'Entrance and forecourt — night', ar: 'المدخل والساحة الأمامية — ليلاً', ckb: 'دەروازە و حەوشەی پێشەوە — شەو', zh: '入口与前庭 · 夜晚' } },
  { id: 'living', kind: 'room', time: 900, floor: 'F04', roomKey: 'A.living', title: { en: 'Model One — living & dining', ar: 'النموذج الأول — المعيشة والطعام', ckb: 'مۆدێلی یەکەم — دانیشتن و نانخواردن', zh: '一号户型 — 客厅与餐厅' }, golden: true },
  { id: 'kitchen', kind: 'room', time: 900, floor: 'F04', roomKey: 'A.kitchen', title: { en: 'Model One — kitchen', ar: 'النموذج الأول — المطبخ', ckb: 'مۆدێلی یەکەم — چێشتخانە', zh: '一号户型 — 厨房' }, golden: true },
  { id: 'master', kind: 'room', time: 960, floor: 'F04', roomKey: 'A.master', title: { en: 'Model One — master bedroom', ar: 'النموذج الأول — غرفة النوم الرئيسية', ckb: 'مۆدێلی یەکەم — ژووری نووستنی سەرەکی', zh: '一号户型 — 主卧室' }, golden: true },
  { id: 'bathroom', kind: 'room', time: 900, floor: 'F04', roomKey: 'A.bathroom', title: { en: 'Model One — bathroom', ar: 'النموذج الأول — الحمّام', ckb: 'مۆدێلی یەکەم — گەرماو', zh: '一号户型 — 浴室' }, golden: true },
  { id: 'balcony', kind: 'room', time: 1000, floor: 'F04', roomKey: 'A.balcony', title: { en: 'Model One — balcony', ar: 'النموذج الأول — البلكونة', ckb: 'مۆدێلی یەکەم — باڵکۆن', zh: '一号户型 — 阳台' }, golden: true },
  { id: 'living_golden', kind: 'room', time: 1110, floor: 'F04', roomKey: 'A.living', title: { en: 'Model One — living, golden hour', ar: 'النموذج الأول — المعيشة، الساعة الذهبية', ckb: 'مۆدێلی یەکەم — دانیشتن، کاتژمێری زێڕین', zh: '一号户型 — 客厅 · 黄金时刻' }, golden: true },
  { id: 'living_evening', kind: 'room', time: 1170, floor: 'F04', roomKey: 'A.living', title: { en: 'Model One — living, evening', ar: 'النموذج الأول — المعيشة، المساء', ckb: 'مۆدێلی یەکەم — دانیشتن، ئێوارە', zh: '一号户型 — 客厅 · 傍晚' }, golden: true },
  { id: 'living_night', kind: 'room', time: 1320, floor: 'F04', roomKey: 'A.living', title: { en: 'Model One — living, night', ar: 'النموذج الأول — المعيشة، ليلاً', ckb: 'مۆدێلی یەکەم — دانیشتن، شەو', zh: '一号户型 — 客厅 · 夜晚' }, golden: true },
  { id: 'B_living', kind: 'room', time: 900, floor: 'F04', roomKey: 'B.living', title: { en: 'Model Two — living & dining', ar: 'النموذج الثاني — المعيشة والطعام', ckb: 'مۆدێلی دووەم — دانیشتن و نانخواردن', zh: '二号户型 — 客厅与餐厅' } },
  { id: 'lobby', kind: 'room', time: 900, floor: 'G', roomKey: 'zone.lobby_hall', title: { en: 'Ground floor — lobby & reception', ar: 'الطابق الأرضي — الردهة والاستقبال', ckb: 'نهۆمی زەوی — هۆڵ و پێشوازی', zh: '首层 — 大堂与接待' } },
  { id: 'cafe', kind: 'room', time: 1080, floor: 'F11', roomKey: 'zone.cafe', title: { en: 'Level 11 — café', ar: 'الطابق ١١ — المقهى', ckb: 'نهۆمی ١١ — کافێ', zh: '11 层 — 咖啡厅' } },
  { id: 'spa', kind: 'room', time: 900, floor: 'F10', roomKey: 'zone.spa', title: { en: 'Level 10 — spa & sauna', ar: 'الطابق ١٠ — السبا والساونا', ckb: 'نهۆمی ١٠ — سپا و ساونا', zh: '10 层 — 水疗与桑拿' } },
  { id: 'pool', kind: 'room', time: 900, floor: 'F10', roomKey: 'zone.pool', title: { en: 'Level 10 — indoor pool', ar: 'الطابق ١٠ — المسبح الداخلي', ckb: 'نهۆمی ١٠ — مەلەوانگەی ناوەکی', zh: '10 层 — 室内泳池' } },
  { id: 'gym', kind: 'room', time: 900, floor: 'F10', roomKey: 'zone.gym', title: { en: 'Level 10 — gym', ar: 'الطابق ١٠ — النادي الرياضي', ckb: 'نهۆمی ١٠ — هۆڵی وەرزش', zh: '10 层 — 健身房' } },
  { id: 'restaurant', kind: 'room', time: 1020, floor: 'F11', roomKey: 'zone.restaurant', title: { en: 'Level 11 — restaurant', ar: 'الطابق ١١ — المطعم', ckb: 'نهۆمی ١١ — ڕێستۆرانت', zh: '11 层 — 餐厅' } },
  { id: 'terrace', kind: 'room', time: 1050, floor: 'F11', roomKey: 'zone.terrace', title: { en: 'Level 11 — panoramic terrace', ar: 'الطابق ١١ — التراس البانورامي', ckb: 'نهۆمی ١١ — تێراسی پانۆرامی', zh: '11 层 — 全景露台' } },
  // V11 photoreal-site coverage (each apartment type: living, kitchen, bedrooms, bathroom, balcony; amenities day + evening)
  { id: 'A_bedroom2', kind: 'room', time: 960, floor: 'F04', roomKey: 'A.second_bedroom', title: { en: 'Model One — second bedroom', ar: 'النموذج الأول — غرفة النوم الثانية', ckb: 'مۆدێلی یەکەم — ژووری نووستنی دووەم', zh: '一号户型 — 次卧' } },
  { id: 'A_balcony_evening', kind: 'room', time: 1170, floor: 'F04', roomKey: 'A.balcony', title: { en: 'Model One — balcony, evening', ar: 'النموذج الأول — البلكونة، المساء', ckb: 'مۆدێلی یەکەم — باڵکۆن، ئێوارە', zh: '一号户型 — 阳台 · 傍晚' } },
  { id: 'B_kitchen', kind: 'room', time: 900, floor: 'F04', roomKey: 'B.kitchen', title: { en: 'Model Two — kitchen', ar: 'النموذج الثاني — المطبخ', ckb: 'مۆدێلی دووەم — چێشتخانە', zh: '二号户型 — 厨房' } },
  { id: 'B_master', kind: 'room', time: 960, floor: 'F04', roomKey: 'B.master', title: { en: 'Model Two — master bedroom', ar: 'النموذج الثاني — غرفة النوم الرئيسية', ckb: 'مۆدێلی دووەم — ژووری نووستنی سەرەکی', zh: '二号户型 — 主卧室' } },
  { id: 'B_bathroom', kind: 'room', time: 900, floor: 'F04', roomKey: 'B.bathroom', title: { en: 'Model Two — bathroom', ar: 'النموذج الثاني — الحمّام', ckb: 'مۆدێلی دووەم — گەرماو', zh: '二号户型 — 浴室' } },
  { id: 'B_balcony', kind: 'room', time: 1050, floor: 'F04', roomKey: 'B.balcony', title: { en: 'Model Two — balcony', ar: 'النموذج الثاني — البلكونة', ckb: 'مۆدێلی دووەم — باڵکۆن', zh: '二号户型 — 阳台' } },
  { id: 'B_bedroom2', kind: 'room', time: 960, floor: 'F04', roomKey: 'B.second_bedroom', title: { en: 'Model Two — second bedroom', ar: 'النموذج الثاني — غرفة النوم الثانية', ckb: 'مۆدێلی دووەم — ژووری نووستنی دووەم', zh: '二号户型 — 次卧' } },
  { id: 'terrace_dusk', kind: 'room', time: 1165, floor: 'F11', roomKey: 'zone.terrace', title: { en: 'Level 11 — terrace, blue hour', ar: 'الطابق ١١ — التراس، الغسق', ckb: 'نهۆمی ١١ — تێراس، کاتی شینی ئێوارە', zh: '11 层 — 露台 · 蓝调时刻' } },
  { id: 'restaurant_evening', kind: 'room', time: 1200, floor: 'F11', roomKey: 'zone.restaurant', title: { en: 'Level 11 — restaurant, evening', ar: 'الطابق ١١ — المطعم، المساء', ckb: 'نهۆمی ١١ — ڕێستۆرانت، ئێوارە', zh: '11 层 — 餐厅 · 傍晚' } },
  // V11.3 coverage: the rooms that had no rendered view (ensuites, dressing rooms, entry, Model Two third bedroom) and the
  // lobby / wellness lounge / terrace after dark; the shisha lounge is labelled conditional (it needs a qualified
  // smoke-management review — no compliance is implied)
  { id: 'A_master_bath', kind: 'room', time: 900, floor: 'F04', roomKey: 'A.master_bath', title: { en: 'Model One — master ensuite', ar: 'النموذج الأول — حمّام الجناح الرئيسي', ckb: 'مۆدێلی یەکەم — گەرماوی ژووری سەرەکی', zh: '一号户型 — 主卧套内浴室' } },
  { id: 'A_dressing', kind: 'room', time: 960, floor: 'F04', roomKey: 'A.dressing', title: { en: 'Model One — dressing room', ar: 'النموذج الأول — غرفة الملابس', ckb: 'مۆدێلی یەکەم — ژووری جلوبەرگ', zh: '一号户型 — 衣帽间' } },
  { id: 'A_entry', kind: 'room', time: 1170, floor: 'F04', roomKey: 'A.entry', title: { en: 'Model One — entrance hall, evening', ar: 'النموذج الأول — مدخل الشقة، المساء', ckb: 'مۆدێلی یەکەم — هۆڵی چوونەژوورەوە، ئێوارە', zh: '一号户型 — 入户玄关 · 傍晚' } },
  { id: 'B_bedroom3', kind: 'room', time: 960, floor: 'F04', roomKey: 'B.third_bedroom', title: { en: 'Model Two — third bedroom', ar: 'النموذج الثاني — غرفة النوم الثالثة', ckb: 'مۆدێلی دووەم — ژووری نووستنی سێیەم', zh: '二号户型 — 第三卧室' } },
  { id: 'B_master_bath', kind: 'room', time: 900, floor: 'F04', roomKey: 'B.master_bath', title: { en: 'Model Two — master ensuite', ar: 'النموذج الثاني — حمّام الجناح الرئيسي', ckb: 'مۆدێلی دووەم — گەرماوی ژووری سەرەکی', zh: '二号户型 — 主卧套内浴室' } },
  { id: 'A_hall', kind: 'room', time: 1170, floor: 'F04', roomKey: 'A.hall', title: { en: 'Model One — hallway, evening', ar: 'النموذج الأول — الممر، المساء', ckb: 'مۆدێلی یەکەم — ڕاڕەو، ئێوارە', zh: '一号户型 — 走廊 · 傍晚' } },
  { id: 'B_laundry', kind: 'room', time: 960, floor: 'F04', roomKey: 'B.laundry', title: { en: 'Model Two — laundry', ar: 'النموذج الثاني — غرفة الغسيل', ckb: 'مۆدێلی دووەم — ژووری جلشۆردن', zh: '二号户型 — 洗衣间' } },
  { id: 'B_hall', kind: 'room', time: 1170, floor: 'F04', roomKey: 'B.hall', title: { en: 'Model Two — hallway, evening', ar: 'النموذج الثاني — الممر، المساء', ckb: 'مۆدێلی دووەم — ڕاڕەو، ئێوارە', zh: '二号户型 — 走廊 · 傍晚' } },
  { id: 'B_dressing', kind: 'room', time: 960, floor: 'F04', roomKey: 'B.dressing', title: { en: 'Model Two — dressing room', ar: 'النموذج الثاني — غرفة الملابس', ckb: 'مۆدێلی دووەم — ژووری جلوبەرگ', zh: '二号户型 — 衣帽间' } },
  { id: 'lobby_night', kind: 'room', time: 1290, floor: 'G', roomKey: 'zone.lobby_hall', title: { en: 'Ground floor — lobby at night', ar: 'الطابق الأرضي — الردهة ليلاً', ckb: 'نهۆمی زەوی — هۆڵ لە شەودا', zh: '首层 — 大堂 · 夜晚' } },
  { id: 'wellness_lounge', kind: 'room', time: 960, floor: 'F10', roomKey: 'zone.wellness-lounge', title: { en: 'Level 10 — wellness lounge', ar: 'الطابق ١٠ — صالة الاسترخاء', ckb: 'نهۆمی ١٠ — هۆڵی پشوودان', zh: '10 层 — 康体休息厅' } },
  { id: 'terrace_night', kind: 'room', time: 1290, floor: 'F11', roomKey: 'zone.terrace', title: { en: 'Level 11 — terrace, late evening', ar: 'الطابق ١١ — التراس، آخر المساء', ckb: 'نهۆمی ١١ — تێراس، درەنگانی ئێوارە', zh: '11 层 — 露台 · 入夜时分' } },
  { id: 'shisha_lounge', kind: 'room', time: 1230, floor: 'F11', roomKey: 'zone.shisha-conditional', title: { en: 'Level 11 — shisha lounge (conditional concept)', ar: 'الطابق ١١ — ركن الشيشة (مفهوم مشروط)', ckb: 'نهۆمی ١١ — گۆشەی نێرگەلە (چەمکی مەرجدار)', zh: '11 层 — 水烟休息区（有条件的概念）' } },
];

export const VIEW_BY_ID: Record<string, ViewDef> = Object.fromEntries(VIEWS.map((v) => [v.id, v]));
