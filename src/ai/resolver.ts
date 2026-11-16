import type { FloorId, LocaleKey, UnitTypeId } from '../domain/types';
import { FLOORS, FLOOR_BY_ID, UNITS, UNIT_BY_ID, UNIT_TYPES, WALL, isFloorId } from '../domain/tower';
import { AMENITY_ZONES, UNIT_PLANS, getFloorPlan } from '../domain/plans';
import { roomDims, unitBalconyArea, unitNetArea } from '../domain/audit';
import { CATALOG, CATEGORY_MATERIALS, MATERIAL_BY_ID, PACKAGES, PACKAGE_IDS, SURFACES, SURFACE_BY_ID, resolveSurfaceMaterial, surfaceFor, type Overrides, type PackageId } from '../domain/materials';
import { translate, toWesternDigits, type T } from '../i18n';
import type { MsgKey } from '../i18n/en';
import { AI, type AiKey } from './strings';
import { PRICE_BY_UNIT, PRICING, priceRange } from '../domain/pricing';

// ---------------------------------------------------------------------------------------------
// NAKHLA ASSISTANT — deterministic, local, source-grounded fact resolver (V6).
// It is a guided search over the SAME data the 3D scene uses: no network, no model weights, no
// generative text. Every answer carries a fact status + source, and unknown facts stay unknown.
// ---------------------------------------------------------------------------------------------

export type FactStatus = 'verified_source' | 'concept_estimate' | 'demo_schema' | 'unknown' | 'proposal';
export type AiAction =
  | { type: 'selectFloor'; floorId: FloorId }
  | { type: 'selectUnit'; unitId: string }
  | { type: 'focusRoom'; floorId: FloorId; roomKey: string }
  | { type: 'navigateToAmenity'; floorId: FloorId; roomKey: string }
  | { type: 'openFinishEditor'; surfaceId: string | null }
  | { type: 'confirmMaterialChange'; surfaceId: string; materialId: string }
  | { type: 'openComparison' } | { type: 'openCreatorContact' } | { type: 'openPrintSummary' } | { type: 'show2DAlternative' }
  | { type: 'openEnvironment' } | { type: 'openHelp' } | { type: 'openLanguages' } | { type: 'openPricing' };
export interface AiSuggestion { label: string; action: AiAction; needsConfirm?: boolean }
export interface AiAnswer { intent: string; text: string; status: FactStatus; source: string; actions: AiSuggestion[]; auto?: AiAction }
export interface AiContext { locale: LocaleKey; floorId: FloorId | null; unitId: string | null; roomKey: string | null; selectedSurfaceId: string | null; packageId: PackageId; overrides: Overrides }

export const MAX_QUERY = 500;

/** Language-independent normalisation (Arabic/Sorani letter variants, digits, punctuation). */
export function normalize(input: string): string {
  return toWesternDigits(input.normalize('NFKC').toLowerCase())
    .replace(/[ً-ٰٟـ]/g, '')            // tashkeel + tatweel
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[ؤ]/g, 'و').replace(/[ئ]/g, 'ي')
    .replace(/گ/g, 'ك').replace(/ڤ/g, 'ف').replace(/چ/g, 'ج').replace(/پ/g, 'ب')
    .replace(/[یێ]/g, 'ي').replace(/ک/g, 'ك').replace(/[ھە]/g, 'ه').replace(/[ۆ]/g, 'و').replace(/ڕ/g, 'ر').replace(/ڵ/g, 'ل')
    .replace(/[؟?!.,،؛:;"'«»()\[\]{}<>]/g, ' ').replace(/\s+/g, ' ').trim();
}
const N = (list: string[]) => list.map(normalize);
/** V11.5: a short keyword (≤ 3 letters) must be a whole word (Arabic prefixes ال / و / ب / بال / ل allowed), so "مات" no
 *  longer fires inside "الخدمات" and "hi" not inside "this". CJK has no spaces: substring matching stays. */
const CJK = /[\u3400-\u9fff]/;
const boundary = new Map<string, RegExp>();
function has(q: string, k: string): boolean {
  if (!k) return false; if (k.length > 3 || CJK.test(k)) return q.includes(k);
  let re = boundary.get(k); if (!re) { re = new RegExp(`(?:^|\\s)(?:ال|و|ب|بال|ل)?${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:ي|ه|ها|ات|ين|هكه|هكان)?(?:\\s|$)`); boundary.set(k, re); }   // Arabic / Sorani suffixes allowed
  return re.test(q);
}

// ------------------------------------------------------------------ vocabulary (4 locales, incl. Iraqi dialect)
const ROOM_WORDS: Record<string, string[]> = {
  living: N(['living', 'lounge', 'dining', 'sitting', 'المعيشه', 'معيشه', 'الصاله', 'صاله', 'الهول', 'هول', 'الطعام', 'دانيشتن', 'نانخواردن', 'هۆڵ', '客厅', '餐厅', '起居']),
  kitchen: N(['kitchen', 'المطبخ', 'مطبخ', 'چێشتخانە', '厨房']),
  master: N(['master bedroom', 'master', 'main bedroom', 'غرفه النوم الرييسيه', 'الماستر', 'ماستر', 'الرييسيه', 'ژووری نووستنی سەرەکی', 'سەرەکی', '主卧']),
  second_bedroom: N(['second bedroom', 'bedroom 2', 'الغرفه الثانيه', 'غرفه النوم الثانيه', 'ژووری دووەم', 'نووستنی دووەم', '次卧']),
  third_bedroom: N(['third bedroom', 'bedroom 3', 'الغرفه الثالثه', 'غرفه النوم الثالثه', 'ژووری سێیەم', 'نووستنی سێیەم', '第三卧室']),
  master_bath: N(['ensuite', 'en-suite', 'master bath', 'حمام الماستر', 'حمام الغرفه الرييسيه', 'گەرماوی ژووری سەرەکی', '主卫', '套内浴室']),
  bathroom: N(['bathroom', 'bath', 'toilet', 'الحمام', 'حمام', 'گەرماو', '浴室', '卫生间']),
  balcony: N(['balcony', 'terrace of the apartment', 'البلكونه', 'بلكونه', 'الشرفه', 'باڵکۆن', '阳台']),
  entry: N(['entrance', 'foyer', 'entry', 'المدخل', 'مدخل', 'دەروازە', '玄关']),
  laundry: N(['laundry', 'storage', 'الغسيل', 'غسيل', 'التخزين', 'جلشۆرین', '洗衣']),
  dressing: N(['dressing', 'wardrobe room', 'closet', 'غرفه الملابس', 'الملابس', 'جلوبەرگ', '衣帽间']),
};
const AMENITY_WORDS: Record<string, string[]> = {
  pool: N(['pool', 'swimming', 'المسبح', 'مسبح', 'السباحه', 'مەلەوانگە', 'مەلە', '泳池', '游泳']),
  gym: N(['gym', 'fitness', 'الجم', 'جم', 'النادي الرياضي', 'الرياضي', 'القاعه الرياضيه', 'وەرزش', '健身']),
  spa: N(['spa', 'sauna', 'السبا', 'سبا', 'الساونا', 'ساونا', 'سپا', '水疗', '桑拿']),
  changing: N(['changing', 'locker', 'تبديل الملابس', 'جلگۆڕین', '更衣']),
  'wellness-lounge': N(['relaxation', 'wellness lounge', 'الاسترخاء', 'حەوانەوە', '休憩']),
  restaurant: N(['restaurant', 'dining room', 'المطعم', 'مطعم', 'ڕێستۆرانت', '餐馆', '餐厅层']),
  cafe: N(['cafe', 'café', 'coffee', 'الكافيه', 'كافيه', 'المقهي', 'الكوفي', 'کافێ', '咖啡']),
  terrace: N(['terrace', 'rooftop', 'التراس', 'تراس', 'السطح', 'تێراس', '露台']),
  'shisha-conditional': N(['shisha', 'hookah', 'nargile', 'الشيشه', 'شيشه', 'الاركيله', 'اركيله', 'نركيله', 'نێرگەلە', '水烟']),
};
const CATEGORY_WORDS: Record<string, string[]> = {
  flooring: N(['floor', 'flooring', 'الارضيه', 'ارضيه', 'الارض', 'الكاشي', 'زەوی', '地面', '地板']),
  wall_paint: N(['wall', 'paint', 'الجدار', 'جدار', 'الحايط', 'حايط', 'الصبغ', 'دهان', 'دیوار', 'بۆیە', '墙']),
  wood_finish: N(['wood', 'panel', 'veneer', 'الخشب', 'خشب', 'دار', '木']),
  kitchen_cabinet: N(['cabinet', 'cupboard', 'خزاين', 'الخزاين', 'كاونترات', 'دۆڵاب', '橱柜']),
  countertop: N(['countertop', 'worktop', 'counter', 'سطح العمل', 'السطح', 'الرخامه', '台面']),
  bathroom_tile: N(['tile', 'tiles', 'البلاط', 'بلاط', 'السيراميك', 'کاشی', '瓷砖']),
};

interface Intent { id: string; kw: string[] }
const INTENTS: Intent[] = ([
  // V11.5: questions visitors actually ask first (used to fall back to "try a suggestion")
  ['greeting', ['hello', 'hi', 'hey', 'good morning', 'good evening', 'salam', 'مرحبا', 'هلو', 'هلا', 'السلام عليكم', 'شلونك', 'سلاو', 'سڵاو', '您好', '你好']],
  ['project_overview', ['about the project', 'tell me about', 'overview', 'what is this project', 'what is nakhla', 'introduce', 'شنو هذا المشروع', 'عن المشروع', 'نبذه', 'عرفني', 'ما هو المشروع', 'شنو المشروع', 'دەربارەی پڕۆژە', 'پڕۆژەکە چییە', '介绍', '这个项目', '项目介绍']],
  ['amenity_list', ['amenities', 'facilities', 'services', 'what does the building have', 'المرافق', 'الخدمات', 'خدمات', 'شنو اكو بالبنايه', 'خزمەتگوزاری', '配套', '设施']],
  ['parking', ['parking', 'car park', 'garage', 'park my car', 'كراج', 'موقف', 'مواقف', 'باركنك', 'پارکینگ', 'گەراج', '停车']],
  ['building_location', ['where is the building', 'building located', 'location of the building', 'address', 'neighbourhood', 'neighborhood', 'وين البنايه', 'موقع البنايه', 'وين موقع', 'العنوان', 'وين يقع', 'وين المشروع', 'ناونیشان', '地址', '位置在哪', '在哪里建']],
  ['cheapest_unit', ['cheapest', 'lowest price', 'least expensive', 'ارخص', 'اقل سعر', 'هەرزانترین', '最便宜', '最低价']],
  ['best_unit', ['best apartment', 'which apartment should', 'recommend', 'افضل شقه', 'احسن شقه', 'تنصحني', 'باشترین', '推荐', '哪套好']],
  ['lifts', ['elevator', 'elevators', 'lift', 'lifts', 'مصعد', 'اسانسير', 'المصاعد', 'ئاسانسۆر', '电梯']],
  ['completion', ['when will', 'finished', 'completion', 'delivery', 'handover', 'متي', 'يخلص', 'التسليم', 'ينتهي', 'كەی تەواو', 'کەی تەواو', '交付', '什么时候', '完工']],
  ['security_info', ['security', 'guard', 'الامن', 'حراسه', 'حارس', 'امان', 'پاسەوان', '安保', '保安']],
  ['night_view', ['night view', 'the night view', 'at night', 'evening view', 'بالليل', 'منظر الليل', 'شەو', '夜景', '晚上']],
  ['walk_to_room', ['take me', 'go to', 'show me the', 'walk to', 'navigate to', 'i want to see', 'let me see', 'اريد اشوف', 'خليني اشوف', 'اشوف', 'شوفني', 'ورني', 'ورّني', 'وديني', 'خذني', 'اخذني', 'روحني', 'انتقل', 'اذهب', 'بمبە بۆ', 'بمبە', 'بچۆ بۆ', 'دەتبەم', '带我去', '前往', '去看']],
  ['price_method', ['how was the price', 'how is the price', 'price calculated', 'how are prices', 'pricing method', 'price method', 'كيف حسبتو السعر', 'كيف تم حساب السعر', 'طريقه حساب السعر', 'طريقه التسعير', 'كيف انحسب السعر', 'شلون انحسب السعر', 'شلون حسبتو السعر', 'چون نرخ', 'شيوازي حيسابي نرخ', 'حيسابي نرخ', '价格怎么算', '怎么计算价格', '价格计算', '定价方法']],
  ['unit_price', ['price', 'cost', 'how much is', 'payment', 'السعر', 'سعر', 'بكم', 'بيش', 'شكد سعر', 'الثمن', 'قسط', 'نرخ', 'بە چەند', '价格', '多少钱', '售价']],
  ['unit_availability', ['available', 'availability', 'for sale', 'sold', 'reserve', 'book', 'متوفر', 'متوفره', 'متاح', 'للبيع', 'محجوز', 'احجز', 'حجز', 'بەردەست', 'فرۆشتن', '在售', '可售', '预订', '有货']],
  ['amenity_pool_depth', ['pool depth', 'how deep', 'عمق المسبح', 'عمق', 'قووڵی', '泳池深', '多深']],
  ['amenity_hours', ['opening hours', 'open', 'hours', 'close', 'دوام', 'يفتح', 'يسد', 'اوقات', 'کاتی کارکردن', '营业时间', '几点']],
  ['material_brand', ['brand', 'supplier', 'manufacturer', 'warranty', 'guarantee', 'الماركه', 'ماركه', 'المورد', 'الشركه المصنعه', 'ضمان', 'براند', 'دابینکەر', 'گەرەنتی', '品牌', '供应商', '保修']],
  ['material_origin', ['origin', 'made in', 'made', 'tile made', 'come from', 'comes from', 'imported', 'country', 'وين مصنوع', 'من وين', 'المنشا', 'منشا', 'مستورد', 'صناعه', 'وڵاتی', '产地', '进口']],
  ['material_wet_safe', ['slip', 'wet', 'waterproof', 'انزلاق', 'يزلك', 'مقاوم للماء', 'البلل', 'خلیسکان', '防滑', '防水']],
  ['material_dimensions', ['tile size', 'plank size', 'module', 'قياس البلاط', 'حجم البلاط', 'قياس الكاشي', 'مقاس', 'قەبارەی کاشی', '砖尺寸', '规格']],
  ['material_finish', ['matte', 'glossy', 'polished', 'satin', 'مطفي', 'لماع', 'لامع', 'مصقول', 'مات', '哑光', '抛光']],
  ['material_options', ['options', 'alternatives', 'other finishes', 'what else', 'choices', 'الخيارات', 'خيارات', 'البدايل', 'بدايل', 'غير هذا', 'هەڵبژاردن', '选项', '可选']],
  ['current_material', ['what material', 'which material', 'what finish', 'what is this', 'looking at', 'شنو هذي الماده', 'شنو الماده', 'شنو هاي', 'ما هذه الماده', 'نوع الماده', 'الماده', 'التشطيب الحالي', 'ئەمە چییە', 'چ ماددە', 'ماددە', '什么材料', '这是什么', '材质']],
  ['compare_packages', ['compare packages', 'difference between packages', 'قارن الباقات', 'الفرق بين الباقات', 'بەراوردی پاکێج', '对比套餐', '套餐区别']],
  ['finish_package', ['finishes can i choose', 'which finishes', 'finish options', 'التشطيبات', 'تشطيبات', 'package', 'packages', 'الباقه', 'باقه', 'الباقات', 'پاکێج', '套餐']],
  ['compare_units', ['compare', 'difference between', 'versus', ' vs ', 'قارن', 'الفرق بين', 'مقارنه', 'بەراورد', 'جیاوازی', '对比', '区别']],
  ['find_three_bedroom', ['three bedroom', '3 bedroom', '3 bed', 'ثلاث غرف', '3 غرف', 'ثلاث نوم', 'سێ ژوور', '3 ژوور', '三居', '三间卧室']],
  ['find_largest', ['largest', 'biggest', 'الاكبر', 'اكبر شقه', 'اكبر', 'گەورەترین', '最大']],
  ['balcony_view', ['view from', 'the view', 'overlook', 'الاطلاله', 'اطلاله', 'المنظر', 'تطل علي', 'دیمەن', '景观', '视野']],
  ['sunlight', ['sun', 'sunlight', 'daylight', 'shade', 'orientation', 'facing', 'الشمس', 'شمس', 'الضوء', 'الاتجاه', 'تطل', 'خۆر', 'ڕووگە', '日照', '朝向', '阳光']],
  ['balcony_size', ['balcony size', 'balcony area', 'مساحه البلكونه', 'قياس البلكونه', 'حجم البلكونه', 'ڕووبەری باڵکۆن', '阳台面积', '阳台多大']],
  ['ceiling_height', ['ceiling', 'height of', 'how high', 'ارتفاع السقف', 'ارتفاع', 'السقف', 'بەرزی', 'بنمیچ', '层高', '净高', '多高']],
  ['window_measure', ['window', 'glazing', 'الشباك', 'شباك', 'النافذه', 'نافذه', 'الشبابيك', 'پەنجەرە', '窗']],
  ['door_measure', ['door', 'الباب', 'باب', 'الابواب', 'دەرگا', '门']],
  ['wall_measure', ['wall thickness', 'thick', 'سماكه الجدار', 'سمك', 'سماكه', 'ئەستووری', '墙厚']],
  ['room_length', ['length', 'how long', 'طول', 'الطول', 'درێژی', '长度', '多长']],
  ['room_width', ['width', 'how wide', 'عرض', 'العرض', 'پانی', '宽度', '多宽']],
  ['area_basis', ['how is the area', 'net area', 'gross', 'area basis', 'كيف تحسب', 'شلون محسوبه', 'صافيه', 'اجماليه', 'چۆن ژمێردراوە', '面积怎么算', '净面积']],
  ['room_area', ['room size', 'room area', 'dimensions', 'how big is the', 'size of the', 'قياس الغرفه', 'قياسات', 'ابعاد', 'مساحه الغرفه', 'شكد قياس', 'شكد كبر', 'پێوانە', 'قەبارەی ژوور', '房间多大', '尺寸']],
  ['unit_area', ['area', 'square met', 'sqm', 'm2', 'how big', 'size', 'شكد المساحه', 'المساحه', 'مساحه', 'كم متر', 'شكد متر', 'ڕووبەر', 'چەند مەتر', '面积', '多大', '平方米', '平米']],
  ['bedroom_count', ['bedroom', 'bedrooms', 'غرف النوم', 'غرفه نوم', 'كم غرفه', 'شكد غرفه', 'ژووری نووستن', '卧室', '几居']],
  ['bathroom_count', ['bathrooms', 'how many bath', 'كم حمام', 'شكد حمام', 'الحمامات', 'چەند گەرماو', '几个浴室', '几卫']],
  ['unit_count', ['how many apartments', 'how many units', 'apartments', 'units', 'كم شقه', 'شكد شقه', 'عدد الشقق', 'الشقق', 'چەند شوقە', '多少套', '几套']],
  ['building_floors', ['how many floors', 'floors', 'levels', 'storeys', 'كم طابق', 'شكد طابق', 'عدد الطوابق', 'الطوابق', 'چەند نهۆم', 'نهۆمەکان', '多少层', '几层', '楼层数']],
  ['floor_purpose', ['what is on', 'what is in floor', 'شنو بالطابق', 'ماذا في الطابق', 'شنو موجود', 'چی لە نهۆم', '层有什么', '楼有什么']],
  ['amenity_location', ['where is', 'which floor', 'location', 'وين', 'اين', 'باي طابق', 'موقع', 'لە کوێیە', 'کام نهۆم', '在哪', '几楼', '哪层']],
  ['creator_contact', ['who made', 'creator', 'contact', 'owner', 'phone number', 'email', 'منو سوي', 'من صمم', 'صاحب', 'تواصل', 'رقم الهاتف', 'ايميل', 'کێ دروستی', 'پەیوەندی', '谁做的', '联系', '作者']],
  ['engineering_status', ['approved', 'permit', 'engineer', 'structural', 'real building', 'is it real', 'built', 'معتمد', 'ترخيص', 'هندسي', 'انشايي', 'حقيقي', 'مبني', 'پەسەندکراو', 'ڕاستەقینە', '批准', '真实', '建成', '结构']],
  ['spec_pdf', ['pdf', 'print', 'download', 'export', 'summary', 'طباعه', 'اطبع', 'تنزيل', 'ملخص', 'چاپ', '打印', '导出', '下载']],
  ['furniture_fit', ['furniture', 'sofa fit', 'will my', 'اثاث', 'الاثاث', 'قنفه', 'يدخل', 'کەلوپەل', '家具', '放得下']],
  ['accessibility', ['accessib', 'keyboard', 'wheelchair', 'screen reader', 'reduce motion', 'dizzy', 'لوحه المفاتيح', 'كرسي متحرك', 'دوخه', 'تخفيف الحركه', 'تەختەکلیل', '无障碍', '键盘', '头晕']],
  ['mute_help', ['sound', 'mute', 'music', 'audio', 'الصوت', 'صوت', 'موسيقي', 'كتم', 'دەنگ', '声音', '静音', '音乐']],
  ['translate_ui', ['language', 'english', 'arabic', 'kurdish', 'chinese', 'translate', 'اللغه', 'لغه', 'عربي', 'انكليزي', 'كردي', 'صيني', 'ترجمه', 'زمان', '语言', '中文', '翻译']],
  ['help_navigation', ['help', 'how do i', 'how to use', 'مساعده', 'ساعدني', 'شلون استخدم', 'كيف استخدم', 'یارمەتی', '帮助', '怎么用']],
] as [string, string[]][]).map(([id, kw]) => ({ id, kw: N(kw) }));

function scoreIntent(q: string): { id: string; score: number } {
  let best = { id: 'fallback', score: 0 };
  for (const it of INTENTS) {
    let s = 0;
    for (const k of it.kw) if (k && has(q, k)) s += 1 + k.length * 0.12 + (k.includes(' ') ? 0.8 : 0);
    if (s > best.score) best = { id: it.id, score: s };
  }
  return best;
}

const findIn = (q: string, table: Record<string, string[]>): string | null => {
  let best: string | null = null; let len = 0;
  for (const [id, words] of Object.entries(table)) for (const w of words) if (w && has(q, w) && w.length > len) { best = id; len = w.length; }
  return best;
};

function extract(q: string) {
  const unit = /(?:^|[^a-z0-9])u?0?([1-9])\s*([ab])(?![a-z])/.exec(q);
  const type = /(?:type|نموذج|نمط|جوري|جور|户型)\s*([ab])/.exec(q) ?? /([ab])\s*户型/.exec(q);
  let floorId: FloorId | null = null;
  const fl = /(?:floor|level|طابق|الطابق|نهومي|نهوم|楼|层)\s*(\d{1,2})/.exec(q) ?? /(\d{1,2})\s*(?:楼|层|th floor|st floor|nd floor|rd floor)/.exec(q) ?? /\bf(\d{1,2})\b/.exec(q);
  if (fl) { const n = Number(fl[1]); if (n >= 1 && n <= 11) floorId = `F${String(n).padStart(2, '0')}` as FloorId; }
  if (/ground|الارضي|ارضي|نهومي زهوي|首层|一楼/.test(q)) floorId = 'G';
  const material = CATALOG.find((m) => (['ar', 'en', 'ckb', 'zh'] as LocaleKey[]).some((l) => q.includes(normalize(m.name[l]))))?.id ?? null;
  const pkg = PACKAGE_IDS.find((p) => (['ar', 'en', 'ckb', 'zh'] as LocaleKey[]).some((l) => q.includes(normalize(PACKAGES[p].name[l])))) ?? null;
  return {
    unitId: unit ? `U0${unit[1]}${unit[2].toUpperCase()}` : null,
    typeId: (type ? `TYPE_${type[1].toUpperCase()}` : null) as UnitTypeId | null,
    floorId, room: findIn(q, ROOM_WORDS), amenity: AMENITY_WORDS['shisha-conditional'].some((w) => has(q, w)) ? 'shisha-conditional' : findIn(q, AMENITY_WORDS),
    amenities: ((l: string[]) => (l.includes('shisha-conditional') ? l.filter((x) => x !== 'terrace') : l))(Object.entries(AMENITY_WORDS).filter(([, ws]) => ws.some((w) => has(q, w))).map(([id]) => id)), /* "shisha terrace" is one place */ category: findIn(q, CATEGORY_WORDS), material, pkg,
  };
}

const r2 = (n: number) => (Math.round(n * 100) / 100).toString();

export function answer(rawQuery: string, ctx: AiContext): AiAnswer {
  const L = ctx.locale; const t: T = (k, v) => translate(L, k, v);
  const s = (k: AiKey, vars?: Record<string, string | number>) => { let out = AI[L][k]; if (vars) for (const [a, b] of Object.entries(vars)) out = out.split(`{${a}}`).join(String(b)); return out; };
  const mk = (intent: string, text: string, status: FactStatus, source: AiKey, actions: AiSuggestion[] = [], auto?: AiAction): AiAnswer => ({ intent, text, status, source: AI[L][source], actions: actions.slice(0, 2), auto });
  if (rawQuery.length > MAX_QUERY) return mk('too_long', s('tooLong'), 'unknown', 'srcNone');
  const q = normalize(rawQuery); const e = extract(q); const hit = scoreIntent(q);

  // ---- context resolution (explicit entity > current selection > hero default)
  const unitId = e.unitId && UNIT_BY_ID[e.unitId] ? e.unitId : ctx.unitId;
  const typeId: UnitTypeId = e.typeId ?? (unitId ? UNIT_BY_ID[unitId].typeId : 'TYPE_A');
  const side = typeId === 'TYPE_A' ? 'A' : 'B';
  const typeName = t(typeId === 'TYPE_A' ? 'unit.typeA' : 'unit.typeB');
  const floorName = (f: FloorId) => (f === 'G' ? t('floor.G') : t('floor.n', { n: String(FLOOR_BY_ID[f].number).padStart(2, '0') }));
  const roomName = (kind: string) => t(`room.${kind}` as MsgKey);
  const plan = UNIT_PLANS[typeId];
  const ctxRoomId = ctx.roomKey && /^[AB]\./.test(ctx.roomKey) ? ctx.roomKey.slice(2) : null;
  const roomId = e.room ?? ctxRoomId;
  const room = roomId ? plan.rooms.find((r) => r.id === roomId) ?? null : null;
  const navUnit = unitId ?? (typeId === 'TYPE_A' ? 'U04A' : 'U04B');
  const navFloor = UNIT_BY_ID[navUnit].floorId;
  const roomAction = (rid: string): AiSuggestion => ({ label: s('actRoom', { room: roomName(plan.rooms.find((r) => r.id === rid)!.kind) }), action: { type: 'focusRoom', floorId: navFloor, roomKey: `${side}.${rid}` } });
  const amenityOf = (id: string) => AMENITY_ZONES.find((z) => z.id === id)!;
  const amenityName = (id: string) => roomName(getFloorPlan(amenityOf(id).floorId).rooms.find((r) => r.key === amenityOf(id).roomKey)!.kind);
  const curSurface = ctx.selectedSurfaceId && SURFACE_BY_ID[ctx.selectedSurfaceId] ? ctx.selectedSurfaceId : null;
  const surfaceByCat = e.category && roomId ? SURFACES.find((x) => x.category === e.category && (x.roomId === roomId || x.id === surfaceFor(roomId, 'floor') || x.id === surfaceFor(roomId, 'wall')))?.id ?? null : null;
  const surfaceId = surfaceByCat ?? curSurface;
  const matOf = (sid: string) => MATERIAL_BY_ID[resolveSurfaceMaterial(sid, ctx.packageId, ctx.overrides)];
  const surfName = (sid: string) => t(`surf.${sid}` as MsgKey);
  const finishName = (f: string) => t(`design.finish.${f}` as MsgKey);
  const theMat = e.material ? MATERIAL_BY_ID[e.material] : surfaceId ? matOf(surfaceId) : null;

  let intent = hit.id;
  // a bare amenity / room mention with a movement verb, or just an amenity name, is a location question
  if (intent === 'fallback' && e.amenity) intent = 'amenity_location';
  if (intent === 'amenity_location' && e.amenities.length > 1) intent = 'amenity_multi';
  if (intent === 'fallback' && e.room) intent = 'room_area';
  if (intent === 'unit_area' && e.room && !e.unitId && !e.typeId) intent = 'room_area';
  if ((intent === 'amenity_location' || intent === 'floor_purpose') && !e.amenity && e.floorId) intent = 'floor_purpose';
  if (intent === 'amenity_location' && !e.amenity && e.room) intent = 'walk_to_room';
  // V11.4: any price word steers comparison / count questions to the demo pricing answers
  if ((intent === 'compare_units' || intent === 'unit_count' || intent === 'compare_packages' || intent === 'finish_package') && /price|cost|سعر|اسعار|نرخ|价格|价钱/.test(q)) intent = 'unit_price';
  if (intent === 'compare_units' && (e.pkg || /باق|package|پاكيج|套餐/.test(q))) intent = 'compare_packages';

  switch (intent) {
    case 'building_floors': return mk(intent, s('floors'), 'demo_schema', 'srcTower');
    case 'floor_purpose': {
      const f = e.floorId ?? ctx.floorId; if (!f || !isFloorId(f)) return mk(intent, s('floors'), 'demo_schema', 'srcTower');
      const def = FLOOR_BY_ID[f]; const act: AiSuggestion[] = [{ label: s('actFloor', { floor: floorName(f) }), action: { type: 'selectFloor', floorId: f } }];
      if (def.category === 'residential') return mk(intent, s('floorPurposeRes', { floor: floorName(f), a: def.unitIds[0].slice(1), b: def.unitIds[1].slice(1) }), 'demo_schema', 'srcTower', act);
      const zones = getFloorPlan(f).rooms.filter((r) => r.owner === 'zone').map((r) => roomName(r.kind)).join(L === 'zh' ? '、' : L === 'en' ? ', ' : '، ');
      return mk(intent, s('floorPurposeZone', { floor: floorName(f), cat: t(`floor.cat.${def.category}`), zones }), 'demo_schema', 'srcTower', act);
    }
    case 'unit_count': return mk(intent, s('unitCount'), 'demo_schema', 'srcTower');
    case 'unit_area':
      return mk(intent, s('unitArea', { type: typeName, concept: UNIT_TYPES[typeId].conceptAreaSqm, net: r2(unitNetArea(typeId)), balcony: r2(unitBalconyArea(typeId)) }), 'concept_estimate', 'srcModel',
        [{ label: s('actUnit', { unit: t('unit.name', { id: navUnit.slice(1) }) }), action: { type: 'selectUnit', unitId: navUnit } }, { label: s('actCompare'), action: { type: 'openComparison' } }]);
    case 'room_area': case 'room_length': case 'room_width': {
      if (!room) return mk(intent, s('roomPick', { type: typeName, list: plan.rooms.filter((r) => r.kind !== 'hall').map((r) => roomName(r.kind)).join(L === 'zh' ? '、' : L === 'en' ? ', ' : '، ') }), 'demo_schema', 'srcModel');
      const d = roomDims({ ...room, key: `${side}.${room.id}`, owner: side });
      const text = d.w && d.d ? s('roomDims', { room: roomName(room.kind), type: typeName, w: r2(d.w), d: r2(d.d), a: r2(d.area) }) : s('roomArea', { room: roomName(room.kind), type: typeName, a: r2(d.area) });
      return mk(intent, text, 'concept_estimate', 'srcModel', [roomAction(room.id)]);
    }
    case 'ceiling_height': { const f = e.floorId ?? ctx.floorId ?? navFloor; const def = FLOOR_BY_ID[f]; return mk(intent, s('ceiling', { floor: floorName(f), clear: def.clear, f2f: def.floorToFloor }), 'concept_estimate', 'srcModel'); }
    case 'wall_measure': return mk(intent, s('walls', { ext: WALL.ext, party: WALL.party, int: WALL.int }), 'concept_estimate', 'srcModel');
    case 'window_measure': {
      if (!room) return mk(intent, s('roomPick', { type: typeName, list: plan.rooms.filter((r) => r.kind !== 'hall').map((r) => roomName(r.kind)).join(', ') }), 'demo_schema', 'srcModel');
      const ops = plan.openings.filter((o) => (o.kind === 'window' || o.kind === 'slider') && o.id.includes(`.${room.id}.`));
      if (!ops.length) return mk(intent, s('noWindows', { room: roomName(room.kind) }), 'concept_estimate', 'srcModel', [roomAction(room.id)]);
      const list = ops.map((o) => `${r2(Math.max(o.rect.x1 - o.rect.x0, o.rect.y1 - o.rect.y0))} × ${r2(o.head - o.sill)} m`).join(L === 'zh' ? '；' : ' · ');
      return mk(intent, s('windows', { room: roomName(room.kind), list }), 'concept_estimate', 'srcModel', [roomAction(room.id)]);
    }
    case 'door_measure': return mk(intent, s('doors', { w: 0.9, h: 2.1, ew: 1.0, eh: 2.2 }), 'concept_estimate', 'srcModel');
    case 'balcony_size': { const b = plan.rooms.find((r) => r.id === 'balcony')!.rects[0]; return mk(intent, s('balcony', { type: typeName, w: r2(b.x1 - b.x0), d: r2(b.y1 - b.y0), a: r2(unitBalconyArea(typeId)) }), 'concept_estimate', 'srcModel', [roomAction('balcony')]); }
    case 'bedroom_count': return mk(intent, s('beds', { type: typeName, n: UNIT_TYPES[typeId].bedrooms }), 'demo_schema', 'srcTower');
    case 'bathroom_count': return mk(intent, s('baths', { type: typeName, n: UNIT_TYPES[typeId].bathrooms }), 'demo_schema', 'srcTower');
    case 'current_material': {
      if (surfaceId) { const m = matOf(surfaceId); return mk(intent, s('curMat', { surface: surfName(surfaceId), mat: m.name[L], finish: finishName(m.finish), origin: t('design.sample') }), 'verified_source', 'srcState', [{ label: s('actFinishes'), action: { type: 'openFinishEditor', surfaceId } }]); }
      const rid = roomId ?? 'living'; const here = SURFACES.filter((x) => x.roomId === rid && (!x.onlyType || x.onlyType === typeId));
      const list = here.map((x) => `${surfName(x.id)}: ${matOf(x.id).name[L]}`).join(L === 'zh' ? '；' : ' · ');
      return mk(intent, s('curMatList', { room: roomName(plan.rooms.find((r) => r.id === rid)?.kind ?? rid), list }), 'verified_source', 'srcState', [{ label: s('actFinishes'), action: { type: 'openFinishEditor', surfaceId: here[0]?.id ?? null } }]);
    }
    case 'material_brand': case 'material_origin': return mk(intent, s('noSupplier'), 'unknown', 'srcNone');
    case 'material_wet_safe': return mk(intent, s('wetUnknown'), 'unknown', 'srcNone');
    case 'material_dimensions': {
      const m = theMat ?? matOf('living.flooring');
      return m.moduleMm ? mk(intent, s('matModule', { mat: m.name[L], w: m.moduleMm[0], h: m.moduleMm[1] }), 'concept_estimate', 'srcCatalog') : mk(intent, s('matNoModule', { mat: m.name[L] }), 'demo_schema', 'srcCatalog');
    }
    case 'material_finish': { const m = theMat ?? matOf('living.flooring'); return mk(intent, s('matFinish', { mat: m.name[L], finish: finishName(m.finish) }), 'demo_schema', 'srcCatalog'); }
    case 'material_options': {
      const sid = surfaceId ?? 'living.flooring'; const cat = SURFACE_BY_ID[sid].category; const cur = matOf(sid).id;
      const opts = CATEGORY_MATERIALS[cat]; const list = opts.map((id) => MATERIAL_BY_ID[id].name[L]).join(L === 'zh' ? '、' : L === 'en' ? ', ' : '، ');
      // changing a finish is never automatic: it is offered and needs the visitor's confirmation
      const acts: AiSuggestion[] = opts.filter((id) => id !== cur).slice(0, 2).map((id) => ({ label: s('actApply', { mat: MATERIAL_BY_ID[id].name[L] }), action: { type: 'confirmMaterialChange', surfaceId: sid, materialId: id }, needsConfirm: true }));
      return mk(intent, s('matOptions', { surface: surfName(sid), list }), 'demo_schema', 'srcCatalog', acts);
    }
    case 'finish_package': {
      const n = Object.keys(ctx.overrides).length;
      return mk(intent, s('pkg', { pkg: PACKAGES[ctx.packageId].name[L], custom: n ? ` (+${n})` : '', list: PACKAGE_IDS.map((p) => PACKAGES[p].name[L]).join(L === 'zh' ? '、' : L === 'en' ? ', ' : '، ') }), 'verified_source', 'srcState', [{ label: s('actFinishes'), action: { type: 'openFinishEditor', surfaceId: null } }]);
    }
    case 'compare_packages': {
      const list = PACKAGE_IDS.map((p) => `${PACKAGES[p].name[L]}: ${(['flooring', 'wood_finish', 'kitchen_cabinet'] as const).map((c) => MATERIAL_BY_ID[PACKAGES[p].ids[c]].name[L]).join(' + ')}`).join(L === 'zh' ? '。' : '. ');
      return mk(intent, s('pkgCompare', { list }), 'demo_schema', 'srcCatalog', [{ label: s('actFinishes'), action: { type: 'openFinishEditor', surfaceId: null } }]);
    }
    case 'compare_units':
      return mk(intent, s('unitCompare', { ab: UNIT_TYPES.TYPE_A.bedrooms, aa: UNIT_TYPES.TYPE_A.conceptAreaSqm, an: r2(unitNetArea('TYPE_A')), bb: UNIT_TYPES.TYPE_B.bedrooms, ba: UNIT_TYPES.TYPE_B.conceptAreaSqm, bn: r2(unitNetArea('TYPE_B')) }), 'concept_estimate', 'srcModel', [{ label: s('actCompare'), action: { type: 'openComparison' } }]);
    case 'find_three_bedroom':
      return mk(intent, s('threeBed', { list: UNITS.filter((u) => u.typeId === 'TYPE_B').map((u) => u.id.slice(1)).join(', ') }), 'demo_schema', 'srcTower', [{ label: s('actUnit', { unit: t('unit.name', { id: '04B' }) }), action: { type: 'selectUnit', unitId: 'U04B' } }]);
    case 'find_largest': return mk(intent, s('largest', { a: UNIT_TYPES.TYPE_B.conceptAreaSqm, n: r2(unitNetArea('TYPE_B')) }), 'concept_estimate', 'srcModel', [{ label: s('actUnit', { unit: t('unit.name', { id: '04B' }) }), action: { type: 'selectUnit', unitId: 'U04B' } }]);
    case 'amenity_location': {
      if (!e.amenity) return mk(intent, s('goWhere'), 'demo_schema', 'srcTower');
      const z = amenityOf(e.amenity); const act: AiSuggestion = { label: s('actAmenity', { amenity: amenityName(e.amenity) }), action: { type: 'navigateToAmenity', floorId: z.floorId, roomKey: z.roomKey } };
      return mk(intent, s('amenityAt', { amenity: amenityName(e.amenity), floor: floorName(z.floorId), cat: t(`floor.cat.${FLOOR_BY_ID[z.floorId].category}`) }) + (z.conditional ? ` ${t('amen.shishaCaveat')}` : ''), z.conditional ? 'proposal' : 'demo_schema', 'srcTower', [act]);
    }
    case 'amenity_multi': {
      const sep = L === 'zh' ? '' : ' ';
      const text = e.amenities.slice(0, 4).map((id) => { const z = amenityOf(id); return s('amenityAt', { amenity: amenityName(id), floor: floorName(z.floorId), cat: t(`floor.cat.${FLOOR_BY_ID[z.floorId].category}`) }); }).join(sep);
      return mk(intent, text, 'demo_schema', 'srcTower', e.amenities.slice(0, 2).map((id) => { const z = amenityOf(id); return { label: s('actAmenity', { amenity: amenityName(id) }), action: { type: 'navigateToAmenity', floorId: z.floorId, roomKey: z.roomKey } } as AiSuggestion; }));
    }
    case 'greeting': return mk(intent, s('greet'), 'demo_schema', 'srcTower', [{ label: s('actUnit', { unit: t('unit.name', { id: '04A' }) }), action: { type: 'selectUnit', unitId: 'U04A' } }, { label: s('actPricing'), action: { type: 'openPricing' } }]);
    case 'project_overview': return mk(intent, s('overview'), 'demo_schema', 'srcTower', [{ label: s('actCompare'), action: { type: 'openComparison' } }, { label: s('actAmenity', { amenity: amenityName('pool') }), action: { type: 'navigateToAmenity', floorId: 'F10', roomKey: 'zone.pool' } }]);
    case 'amenity_list': return mk(intent, s('amenityList'), 'demo_schema', 'srcTower', [{ label: s('actAmenity', { amenity: amenityName('pool') }), action: { type: 'navigateToAmenity', floorId: 'F10', roomKey: 'zone.pool' } }, { label: s('actAmenity', { amenity: amenityName('terrace') }), action: { type: 'navigateToAmenity', floorId: 'F11', roomKey: 'zone.terrace' } }]);
    case 'parking': return mk(intent, s('parking'), 'unknown', 'srcNone');
    case 'building_location': return mk(intent, s('location'), 'demo_schema', 'srcTower');
    case 'lifts': return mk(intent, s('lifts'), 'demo_schema', 'srcModel');
    case 'completion': return mk(intent, s('completion'), 'unknown', 'srcNone', [{ label: s('actContact'), action: { type: 'openCreatorContact' } }]);
    case 'security_info': return mk(intent, s('security'), 'demo_schema', 'srcModel');
    case 'night_view': return mk(intent, s('nightView'), 'demo_schema', 'srcTower', [{ label: s('actEnv'), action: { type: 'openEnvironment' } }]);
    case 'best_unit': return mk(intent, s('best'), 'concept_estimate', 'srcModel', [{ label: s('actCompare'), action: { type: 'openComparison' } }, { label: s('actPricing'), action: { type: 'openPricing' } }]);
    case 'cheapest_unit': {
      const p = ctx.packageId; const ids = Object.keys(PRICE_BY_UNIT); const low = ids.reduce((a, b) => (PRICE_BY_UNIT[b].total[p] < PRICE_BY_UNIT[a].total[p] ? b : a), ids[0]);
      const u = UNIT_BY_ID[low]; const money = (n: number) => translate(L, 'price.full', { n: n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') });
      return mk(intent, s('cheapest', { unit: t('unit.name', { id: low.slice(1) }), type: t(u.typeId === 'TYPE_A' ? 'unit.typeA' : 'unit.typeB'), floor: floorName(u.floorId), price: money(PRICE_BY_UNIT[low].total[p]), pkg: PACKAGES[p].name[L], disc: s('priceDisc') }), 'demo_schema', 'srcPricing',
        [{ label: s('actUnit', { unit: t('unit.name', { id: low.slice(1) }) }), action: { type: 'selectUnit', unitId: low } }, { label: s('actPricing'), action: { type: 'openPricing' } }]);
    }
    case 'amenity_hours': return mk(intent, s('hoursUnknown'), 'unknown', 'srcNone');
    case 'amenity_pool_depth': return mk(intent, s('poolDepthUnknown'), 'unknown', 'srcNone', [{ label: s('actAmenity', { amenity: amenityName('pool') }), action: { type: 'navigateToAmenity', floorId: 'F10', roomKey: 'zone.pool' } }]);
    case 'unit_price': case 'price_method': {
      // V11.4: demo prices from the one pricing dataset; every answer carries the disclaimer
      const money = (n: number) => translate(L, 'price.full', { n: n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',') });
      const pkgName = (p: PackageId) => PACKAGES[p].name[L]; const disc = s('priceDisc');
      const openP: AiSuggestion = { label: s('actPricing'), action: { type: 'openPricing' } };
      const pct = (f: number) => `${f >= 1 ? '+' : '−'}${Math.round(Math.abs(f - 1) * 1000) / 10}%`;
      if (intent === 'price_method') return mk(intent, s('priceMethod', { rate: money(PRICING.base.ratePerSqm).replace(/[^\d,]/g, ''), tb: pct(PRICING.typeFactor.TYPE_B), sb: pct(PRICING.sideFactor.B), fp: Math.round(PRICING.floorPremiumPerLevel * 1000) / 10, disc }), 'demo_schema', 'srcPricing', [openP]);
      const uName = (id: string) => t('unit.name', { id: id.slice(1) });
      if (/قارن|مقارن|الفرق|compare|difference|versus| vs |بەراورد|جياوازي|对比|区别/.test(q)) {
        const a = unitId ?? 'U04A'; const b = FLOOR_BY_ID[UNIT_BY_ID[a].floorId].unitIds.find((x) => x !== a)!;
        const pa = PRICE_BY_UNIT[a].total[ctx.packageId], pb = PRICE_BY_UNIT[b].total[ctx.packageId];
        return mk('price_compare', s('priceCompare', { a: uName(a), pa: money(pa), b: uName(b), pb: money(pb), d: money(Math.abs(pa - pb)), disc }), 'demo_schema', 'srcPricing', [openP, { label: s('actCompare'), action: { type: 'openComparison' } }]);
      }
      if (unitId && (e.pkg || /باق|package|پاكيج|套餐|تشطيب|finish|تهواوكاري|装修/.test(q))) {
        const p = e.pkg ?? ctx.packageId; const pr = PRICE_BY_UNIT[unitId];
        return mk('price_finish', s('priceFinish', { unit: uName(unitId), pkg: pkgName(p), extra: money(pr.finishExtra[p]), disc }), 'demo_schema', 'srcPricing', [openP]);
      }
      if (unitId) {
        const pr = PRICE_BY_UNIT[unitId]; const p = ctx.packageId;
        return mk(intent, s('priceUnit', { unit: uName(unitId), type: typeName, floor: floorName(pr.floorId), total: money(pr.total[p]), pkg: pkgName(p), base: money(pr.base), extra: pr.finishExtra[p] ? ` + ${money(pr.finishExtra[p])}` : '', disc }), 'demo_schema', 'srcPricing', [openP]);
      }
      const ra = priceRange('TYPE_A'), rb = priceRange('TYPE_B');
      const rng = (a: number, b: number) => (L === 'ar' ? `من ${money(a)} إلى ${money(b)}` : L === 'ckb' ? `لە ${money(a)} تا ${money(b)}` : `${money(a)}–${money(b)}`);   // RTL-safe ranges
      return mk(intent, s('priceAll', { a: rng(ra.min, ra.max), b: rng(rb.min, rb.max), disc }), 'demo_schema', 'srcPricing', [openP]);
    }
    case 'unit_availability': return mk(intent, s('availUnknown'), 'unknown', 'srcNone', [{ label: s('actContact'), action: { type: 'openCreatorContact' } }]);
    case 'area_basis': return mk(intent, s('areaBasis'), 'concept_estimate', 'srcModel');
    case 'sunlight': return mk(intent, s('sunlight'), 'concept_estimate', 'srcModel', [{ label: s('actEnv'), action: { type: 'openEnvironment' } }]);
    case 'balcony_view': return mk(intent, s('view'), 'unknown', 'srcNone');
    case 'walk_to_room': {
      // an explicit "take me to …" is a navigation request: executed through a typed, validated action
      if (e.amenity) { const z = amenityOf(e.amenity); return mk(intent, s('going', { place: amenityName(e.amenity) }), z.conditional ? 'proposal' : 'demo_schema', 'srcTower', [], { type: 'navigateToAmenity', floorId: z.floorId, roomKey: z.roomKey }); }
      if (e.room && plan.rooms.some((r) => r.id === e.room)) return mk(intent, s('going', { place: roomName(plan.rooms.find((r) => r.id === e.room)!.kind) }), 'demo_schema', 'srcTower', [], { type: 'focusRoom', floorId: navFloor, roomKey: `${side}.${e.room}` });
      if (e.floorId) return mk(intent, s('going', { place: floorName(e.floorId) }), 'demo_schema', 'srcTower', [], { type: 'selectFloor', floorId: e.floorId });
      return mk(intent, s('goWhere'), 'demo_schema', 'srcTower');
    }
    case 'help_navigation': return mk(intent, s('helpNav'), 'demo_schema', 'srcTower', [{ label: s('actHelp'), action: { type: 'openHelp' } }]);
    case 'translate_ui': return mk(intent, s('languages'), 'demo_schema', 'srcTower', [{ label: s('actLang'), action: { type: 'openLanguages' } }]);
    case 'mute_help': return mk(intent, s('mute'), 'demo_schema', 'srcTower');
    case 'creator_contact': return mk(intent, s('creator'), 'verified_source', 'srcCreator', [{ label: s('actContact'), action: { type: 'openCreatorContact' } }]);
    case 'engineering_status': return mk(intent, s('engineering'), 'demo_schema', 'srcTower');
    case 'spec_pdf': return mk(intent, s('pdf'), 'demo_schema', 'srcTower', [{ label: s('actSummary'), action: { type: 'openPrintSummary' } }]);
    case 'furniture_fit': return mk(intent, s('furnitureFit'), 'unknown', 'srcNone');
    case 'accessibility': return mk(intent, s('accessibility'), 'demo_schema', 'srcTower', [{ label: s('actLite'), action: { type: 'show2DAlternative' } }]);
    default: return mk('fallback', s('fallbackHint'), 'unknown', 'srcNone', [{ label: s('actHelp'), action: { type: 'openHelp' } }]);
  }
}

export const INTENT_IDS = INTENTS.map((i) => i.id);
export const QUICK_CHIPS: Record<LocaleKey, string[]> = {
  ar: ['شكد المساحة؟', 'شنو هذي المادة؟', 'ودّيني للمسبح', 'شكد قياس غرفة المعيشة؟'],
  en: ['What is the area?', 'What material is this?', 'Take me to the pool', 'How big is the living room?'],
  ckb: ['ڕووبەرەکەی چەندە؟', 'ئەمە چ ماددەیەکە؟', 'بمبە بۆ مەلەوانگە', 'ژووری دانیشتن چەند گەورەیە؟'],
  zh: ['面积多大？', '这是什么材料？', '带我去泳池', '客厅多大？'],
};
export { FLOORS };
