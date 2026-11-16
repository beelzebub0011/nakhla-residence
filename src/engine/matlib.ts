import * as THREE from 'three';
import { CATALOG, MATERIAL_BY_ID, SURFACES, resolveSurfaceMaterial, type Overrides, type PackageId } from '../domain/materials';
import { getTextureSet, prepareTextureSet, type TexRecipe } from './textures';

// Material registry. One instance per slot; surfaces own ONE material each so a finish change
// touches exactly the intended surface. All textured materials share the same shader variant,
// so swapping a finish only rebinds textures — no shader recompilation hitch (V8).

export type Def =
  | { t: 'tex'; recipe: TexRecipe; metal?: number; env?: number; side2?: boolean; lit?: TexRecipe }
  | { t: 'plain'; color: string; rough: number; metal?: number; env?: number; emissive?: string; glow?: number; side2?: boolean }
  | { t: 'basic'; color: string }
  | { t: 'glass'; color: string; opacity: number; rough: number };

export const FIXED: Record<string, Def> = {
  stone: { t: 'tex', recipe: { type: 'tile', base: '#c9b897', grout: '#8b7e6a', module: [1.2, 0.6], rough: 0.84, speckle: 0.14, groutW: 0.009, toneVar: 0.075 } },   // V11.4: 9 mm open joints, panel-to-panel tone shift (up-close façade detail)
  stone_base: { t: 'tex', recipe: { type: 'tile', base: '#45413d', grout: '#2d2b29', module: [1.2, 0.6], rough: 0.68, speckle: 0.22 } },
  band: { t: 'plain', color: '#e2d8c5', rough: 0.8 },
  slab: { t: 'plain', color: '#b7b0a4', rough: 0.9 },
  bronze: { t: 'plain', color: '#8f6f4c', rough: 0.36, metal: 0.86, env: 1.2 },
  // bronze-colour polyester powder coat on aluminium (how terrace pergolas are normally finished): a paint, so not a metal
  bronze_pc: { t: 'plain', color: '#8a6a4a', rough: 0.55 },
  frame: { t: 'plain', color: '#5f4b37', rough: 0.42, metal: 0.8, env: 1.1 },
  glass: { t: 'glass', color: '#a9bfc4', opacity: 0.3, rough: 0.04 },
  glass_bal: { t: 'glass', color: '#cfe0e2', opacity: 0.2, rough: 0.05 },
  fill_dark: { t: 'basic', color: '#1b2023' },
  fill_lit: { t: 'basic', color: '#1b2023' },
  wallcore: { t: 'plain', color: '#efebe4', rough: 0.92 },
  ceiling: { t: 'plain', color: '#f4f1ea', rough: 0.95, emissive: '#fff1de', glow: 0.1 },
  skirting: { t: 'plain', color: '#f4f0e9', rough: 0.6 },
  door_leaf: { t: 'tex', recipe: { type: 'veneer', base: '#b89670', dark: '#96744f', rough: 0.5 } },
  door_entry: { t: 'tex', recipe: { type: 'veneer', base: '#5d3f2d', dark: '#3d281c', rough: 0.45 } },
  threshold: { t: 'plain', color: '#c9bfae', rough: 0.6 },
  paving_balcony: { t: 'tex', recipe: { type: 'photo', set: 'marble_01', base: '#b8a888', rough: 0.75, gain: 1.05 } },
  paving_dark: { t: 'tex', recipe: { type: 'tile', base: '#746e66', grout: '#57524c', module: [0.6, 0.6], rough: 0.82, speckle: 0.16 } },
  deck_wood: { t: 'tex', recipe: { type: 'photo', set: 'laminate_floor_02', base: '#9a7a5c', rough: 0.75, tint: '#c8a27e' } },   // weathered timber decking
  floor_stone: { t: 'tex', recipe: { type: 'tile', base: '#dcd3c3', vein: '#b3a68c', grout: '#c4baa8', module: [0.6, 1.2], rough: 0.26, veinAmount: 0.6 } },
  floor_concrete: { t: 'tex', recipe: { type: 'concrete', base: '#a7a299', rough: 0.86 } },
  floor_rubber: { t: 'tex', recipe: { type: 'concrete', base: '#3b3e40', rough: 0.92 } },
  floor_pool: { t: 'tex', recipe: { type: 'tile', base: '#d2cbbd', grout: '#b5ad9e', module: [0.6, 0.6], rough: 0.76, speckle: 0.12 } },
  floor_wood: { t: 'tex', recipe: { type: 'photo', set: 'laminate_floor_02', base: '#a88c6c', rough: 0.45, gain: 1.12 } },
  floor_utility: { t: 'tex', recipe: { type: 'tile', base: '#c6c4bf', grout: '#a9a7a2', module: [0.6, 0.6], rough: 0.6, speckle: 0.08 } },
  tile_pool: { t: 'tex', recipe: { type: 'mosaic', base: '#3f93a8', grout: '#2c6f81', module: [0.15, 0.15], rough: 0.3 } },
  wall_plain: { t: 'tex', recipe: { type: 'paint', base: '#ece7de', rough: 0.92 } },
  wall_lobby: { t: 'tex', recipe: { type: 'paint', base: '#e3d7c3', rough: 0.9 } },
  wall_dark: { t: 'tex', recipe: { type: 'paint', base: '#5a554e', rough: 0.9 } },
  wall_pool: { t: 'tex', recipe: { type: 'tile', base: '#e9e5dc', grout: '#cfcac0', module: [0.6, 1.2], rough: 0.4, speckle: 0.05 } },
  wall_wood: { t: 'tex', recipe: { type: 'veneer', base: '#b28c64', dark: '#8a6644', rough: 0.55 } },
  fabric_sand: { t: 'tex', recipe: { type: 'photo', set: 'rough_linen', base: '#cdbfa6', rough: 0.95, tint: '#cdbfa6', scale: 1.4 } },
  fabric_taupe: { t: 'tex', recipe: { type: 'photo', set: 'rough_linen', base: '#93877a', rough: 0.95, tint: '#93877a', scale: 1.4 } },
  fabric_charcoal: { t: 'tex', recipe: { type: 'photo', set: 'rough_linen', base: '#4a4b4f', rough: 0.95, tint: '#4a4b4f', scale: 1.4 } },
  fabric_outdoor: { t: 'tex', recipe: { type: 'photo', set: 'rough_linen', base: '#b3ad9f', rough: 0.95, tint: '#b3ad9f' } },
  linen_white: { t: 'tex', recipe: { type: 'photo', set: 'rough_linen', base: '#efeae0', rough: 0.95, tint: '#efeae0' } },
  linen_sand: { t: 'tex', recipe: { type: 'photo', set: 'rough_linen', base: '#d8ccb8', rough: 0.95, tint: '#d8ccb8' } },
  rug: { t: 'tex', recipe: { type: 'photo', set: 'velour_velvet', base: '#b9ad98', rough: 1, tint: '#b9ad98', scale: 3 } },
  rubber_mat: { t: 'plain', color: '#2d3235', rough: 0.95 },
  rubber: { t: 'plain', color: '#1f2123', rough: 0.9 },
  curtain_fabric: { t: 'tex', recipe: { type: 'photo', set: 'rough_linen', base: '#ebe5d8', rough: 1, tint: '#ebe5d8' }, side2: true },
  wood_mid: { t: 'tex', recipe: { type: 'photo', set: 'oak_veneer_01', base: '#b8936a', rough: 0.55, gain: 1.15 } },
  laminate: { t: 'tex', recipe: { type: 'laminate', base: '#f0e8d7', rough: 0.6 } },
  stone_top: { t: 'tex', recipe: { type: 'stone', base: '#e3ddd2', speckle: 0.1, rough: 0.3 }, env: 0.5 },
  ceramic: { t: 'plain', color: '#f5f4f1', rough: 0.14, env: 1.1 },
  ceramic_shade: { t: 'plain', color: '#d6d4cf', rough: 0.2 },
  steel: { t: 'plain', color: '#b9bcc0', rough: 0.28, metal: 0.92, env: 1.2 },
  steel_dark: { t: 'plain', color: '#4b4e52', rough: 0.36, metal: 0.85, env: 1.1 },
  equip_dark: { t: 'plain', color: '#2b2d30', rough: 0.6 },
  screen_black: { t: 'plain', color: '#0c0d0e', rough: 0.18, env: 1.2 },
  mirror: { t: 'plain', color: '#c3cbcd', rough: 0.1, env: 1.0 }, // no real-time reflections yet: reads as a pale glass panel lit by the room
  lamp_shade: { t: 'plain', color: '#f3e6cc', rough: 0.8, emissive: '#ffcf8a' },
  pot: { t: 'tex', recipe: { type: 'photo', set: 'white_plaster_02', base: '#8d877d', rough: 0.9, tint: '#8d877d' } },
  foliage: { t: 'plain', color: '#4a6a39', rough: 0.85 },
  contact: { t: 'basic', color: '#000000' },
  art: { t: 'plain', color: '#8f7d64', rough: 0.7 },
  gap_dark: { t: 'basic', color: '#191817' },
  water: { t: 'glass', color: '#2d8299', opacity: 0.84, rough: 0.07 },
  // ---- Golden Apartment materials (scanned CC0 sets + calibrated plain PBR)
  linen_grey: { t: 'tex', recipe: { type: 'photo', set: 'rough_linen', base: '#b9b4aa', rough: 0.95, tint: '#b9b4aa' } },
  rug_outdoor: { t: 'tex', recipe: { type: 'photo', set: 'rough_linen', base: '#9f9a8c', rough: 1, tint: '#9f9a8c', scale: 4 } },
  throw: { t: 'tex', recipe: { type: 'photo', set: 'wool_boucle', base: '#8f8676', rough: 1 }, side2: true },
  towel: { t: 'tex', recipe: { type: 'photo', set: 'rough_linen', base: '#eeeae2', rough: 1, tint: '#eeeae2', scale: 2 }, side2: true },
  velvet_olive: { t: 'tex', recipe: { type: 'photo', set: 'velour_velvet', base: '#5c6347', rough: 0.9, tint: '#5c6347' } },
  velvet_rust: { t: 'tex', recipe: { type: 'photo', set: 'velour_velvet', base: '#a35f3f', rough: 0.9, tint: '#a35f3f' } },
  leather_tan: { t: 'tex', recipe: { type: 'photo', set: 'brown_leather', base: '#8a5a36', rough: 0.6, gain: 1.9 } },
  oak: { t: 'tex', recipe: { type: 'photo', set: 'oak_veneer_01', base: '#b8936a', rough: 0.55, gain: 1.15 } },
  teak: { t: 'tex', recipe: { type: 'photo', set: 'oak_veneer_01', base: '#b98a5c', rough: 0.6, tint: '#e2b98f' } },
  marble: { t: 'tex', recipe: { type: 'stone', base: '#ece8e0', vein: '#a39d92', veinAmount: 0.85, rough: 0.22 }, env: 0.6 },
  basket: { t: 'tex', recipe: { type: 'photo', set: 'rough_linen', base: '#a98a5e', rough: 1, tint: '#a98a5e', scale: 0.6 } },
  brass: { t: 'plain', color: '#b08a55', rough: 0.34, metal: 1, env: 1.0 },
  black_metal: { t: 'plain', color: '#1c1c1d', rough: 0.5, metal: 0.85, env: 0.8 },
  chrome: { t: 'plain', color: '#d7d9db', rough: 0.12, metal: 1, env: 1.2 },
  chrome_matte: { t: 'plain', color: '#c2c4c6', rough: 0.38, metal: 1, env: 1.0 },
  carcass: { t: 'plain', color: '#2b2825', rough: 0.85 },
  kick_dark: { t: 'plain', color: '#151413', rough: 0.9 },
  glass_black: { t: 'plain', color: '#08090a', rough: 0.08, env: 1.0 },
  hob_ring: { t: 'plain', color: '#5c5f63', rough: 0.4 },
  tv_screen: { t: 'plain', color: '#050506', rough: 0.06, env: 0.9 },
  laptop: { t: 'plain', color: '#a9acb0', rough: 0.4, metal: 0.9, env: 1.0 },
  led: { t: 'plain', color: '#fff3df', rough: 0.6, emissive: '#ffd9a8', glow: 2.2 },
  ceiling_trim: { t: 'plain', color: '#f3f0ea', rough: 0.6 },
  candle: { t: 'plain', color: '#f1e8d6', rough: 0.7, emissive: '#ffb45e', glow: 0.25 },
  glass_clear: { t: 'glass', color: '#e9f1f0', opacity: 0.16, rough: 0.03 },
  ceramic_sand: { t: 'plain', color: '#cdbfa8', rough: 0.72 },
  ceramic_dark: { t: 'plain', color: '#3a3836', rough: 0.6 },
  pot_white: { t: 'plain', color: '#dedad2', rough: 0.8 },
  soil: { t: 'plain', color: '#2e2620', rough: 1 },
  stem: { t: 'plain', color: '#5a4a35', rough: 0.9 },
  leaf: { t: 'plain', color: '#3d5a2c', rough: 0.62, side2: true },
  leaf_light: { t: 'plain', color: '#5d7a3c', rough: 0.62, side2: true },
  leaf_dry: { t: 'plain', color: '#b79f78', rough: 0.9 },
  fruit_y: { t: 'plain', color: '#d8b13c', rough: 0.5 },
  fruit_g: { t: 'plain', color: '#7d9440', rough: 0.45 },
  paper: { t: 'plain', color: '#efebe2', rough: 0.9 },
  book_a: { t: 'plain', color: '#7b6a58', rough: 0.8 },
  book_b: { t: 'plain', color: '#2f3b40', rough: 0.8 },
  book_c: { t: 'plain', color: '#b8a58a', rough: 0.8 },
  book_d: { t: 'plain', color: '#8c4a35', rough: 0.8 },
  art_a: { t: 'tex', recipe: { type: 'art', base: '#2c2a28', palette: ['#e8dfd0', '#c9b79a', '#a8876a', '#7f8a7a', '#d9cdb8'], rough: 0.85 } },
  art_b: { t: 'tex', recipe: { type: 'art', base: '#b08a55', palette: ['#ded6c8', '#9aa39a', '#4f5b58', '#c8b08a', '#e9e2d6'], rough: 0.85 } },
  // ---- amenity materials
  switch_plate: { t: 'plain', color: '#f2efe8', rough: 0.45 },
  switch_rocker: { t: 'plain', color: '#e9e5dc', rough: 0.35 },
  leather_black: { t: 'tex', recipe: { type: 'photo', set: 'brown_leather', base: '#2a211c', rough: 0.55, gain: 0.45 } },
  leather_cream: { t: 'tex', recipe: { type: 'photo', set: 'rough_linen', base: '#e6dccb', rough: 0.7, tint: '#e6dccb', scale: 3 } },
  cedar: { t: 'tex', recipe: { type: 'photo', set: 'oak_veneer_01', base: '#c08a5a', rough: 0.7, tint: '#ffcf9e' } },
  canvas: { t: 'tex', recipe: { type: 'photo', set: 'rough_linen', base: '#ece5d6', rough: 0.95, tint: '#ece5d6', scale: 1.5 }, side2: true },
  kilim: { t: 'tex', recipe: { type: 'photo', set: 'velour_velvet', base: '#8e4f3b', rough: 1, tint: '#8e4f3b', scale: 3 } },
  mat_sage: { t: 'plain', color: '#7d8a74', rough: 0.85 },
  mat_sand: { t: 'plain', color: '#b8a588', rough: 0.85 },
  mat_slate: { t: 'plain', color: '#4f5658', rough: 0.85 },
  ball_grey: { t: 'plain', color: '#8a8d8f', rough: 0.55 },
  stone_grey: { t: 'plain', color: '#57544f', rough: 0.9 },
  glass_amber: { t: 'glass', color: '#a8662a', opacity: 0.62, rough: 0.05 },
  glass_green: { t: 'glass', color: '#3c6438', opacity: 0.62, rough: 0.05 },
  glass_smoke: { t: 'glass', color: '#6c7c82', opacity: 0.45, rough: 0.05 },
  pastry: { t: 'plain', color: '#b9773d', rough: 0.7 },
  pastry_light: { t: 'plain', color: '#dcb47c', rough: 0.75 },
  coffee: { t: 'plain', color: '#3a2416', rough: 0.8 },
  board_dark: { t: 'plain', color: '#2a2c2b', rough: 0.9 },
  chalk: { t: 'plain', color: '#e8e4da', rough: 0.9 },
  // site
  ground: { t: 'tex', recipe: { type: 'photo', set: 'concrete_pavement', base: '#b5a583', rough: 0.95, gain: 1.2, scale: 1.6 } },   // V11: urban hardstanding, not raw sand
  plaza: { t: 'tex', recipe: { type: 'photo', set: 'rectangular_paving', base: '#b9ad96', rough: 0.85, gain: 1.4 } },   // V11: scanned paving (2 m tile)
  asphalt: { t: 'tex', recipe: { type: 'photo', set: 'asphalt_02', base: '#4a4a4b', rough: 0.9, gain: 0.85 } },   // V11: scanned asphalt
  context: { t: 'plain', color: '#cfc5b3', rough: 0.95 },
  // ---- fictional urban context (illustrative; not a real place)
  // V11.5: realistic reflectance (≈35–55 %, was ≈80 %) and a Basra palette: limestone, yellow brick, ochre and
  // sand plaster, grey concrete, a sage render. The old near-white tones read as an untextured model.
  ctx_a: { t: 'tex', recipe: { type: 'facade', base: '#bba98a', glass: '#2f3b43', trim: '#5a4935', rough: 0.9, balcony: true }, lit: { type: 'facade', base: '#bba98a', glass: '#2f3b43', trim: '#5a4935', rough: 1, lit: true, balcony: true }, env: 0.3 },
  ctx_b: { t: 'tex', recipe: { type: 'facade', base: '#9c9a94', glass: '#2b3640', trim: '#3c3f42', rough: 0.9 }, lit: { type: 'facade', base: '#9c9a94', glass: '#2b3640', trim: '#3c3f42', rough: 1, lit: true }, env: 0.3 },
  ctx_c: { t: 'tex', recipe: { type: 'facade', base: '#c4b495', glass: '#35444b', trim: '#6a5843', rough: 0.9, balcony: true }, lit: { type: 'facade', base: '#c4b495', glass: '#35444b', trim: '#6a5843', rough: 1, lit: true, balcony: true }, env: 0.3 },
  ctx_d: { t: 'tex', recipe: { type: 'facade', base: '#b59a72', glass: '#303b40', trim: '#6b4f37', rough: 0.9, balcony: true, brick: true, mortar: '#cbbf9f' }, lit: { type: 'facade', base: '#b59a72', glass: '#303b40', trim: '#6b4f37', rough: 1, lit: true, balcony: true, brick: true, mortar: '#cbbf9f' }, env: 0.3 },
  ctx_e: { t: 'tex', recipe: { type: 'facade', base: '#a69d8c', glass: '#2e3a44', trim: '#58544e', rough: 0.9 }, lit: { type: 'facade', base: '#a69d8c', glass: '#2e3a44', trim: '#58544e', rough: 1, lit: true }, env: 0.3 },
  ctx_f: { t: 'tex', recipe: { type: 'facade', base: '#b39470', glass: '#2c383e', trim: '#5c4430', rough: 0.9, balcony: true }, lit: { type: 'facade', base: '#b39470', glass: '#2c383e', trim: '#5c4430', rough: 1, lit: true, balcony: true }, env: 0.3 },
  ctx_g: { t: 'tex', recipe: { type: 'facade', base: '#c2a67a', glass: '#323f45', trim: '#6e5640', rough: 0.9, brick: true, mortar: '#d2c6a8' }, lit: { type: 'facade', base: '#c2a67a', glass: '#323f45', trim: '#6e5640', rough: 1, lit: true, brick: true, mortar: '#d2c6a8' }, env: 0.3 },
  ctx_h: { t: 'tex', recipe: { type: 'facade', base: '#919a8a', glass: '#2b3840', trim: '#4b4f49', rough: 0.9, balcony: true }, lit: { type: 'facade', base: '#919a8a', glass: '#2b3840', trim: '#4b4f49', rough: 1, lit: true, balcony: true }, env: 0.3 },
  ctx_roof: { t: 'tex', recipe: { type: 'concrete', base: '#8f887c', rough: 0.95 } },   // V11.5: weathered roof screed, not white
  ctx_far: { t: 'plain', color: '#a49b8b', rough: 1 },
  curb: { t: 'tex', recipe: { type: 'photo', set: 'concrete_pavement', base: '#b3aca0', rough: 0.9, scale: 0.4 } },
  road_line: { t: 'plain', color: '#e6e1d4', rough: 0.85 },
  grass: { t: 'tex', recipe: { type: 'concrete', base: '#5f7a3c', rough: 1 } },
  hedge: { t: 'tex', recipe: { type: 'concrete', base: '#4b6238', rough: 1 } },
  car_white: { t: 'plain', color: '#e6e4df', rough: 0.32, metal: 0.25, env: 0.9 },
  car_grey: { t: 'plain', color: '#7c8086', rough: 0.34, metal: 0.4, env: 0.9 },
  car_dark: { t: 'plain', color: '#23262b', rough: 0.3, metal: 0.4, env: 0.9 },
  tyre: { t: 'plain', color: '#141414', rough: 0.9 },
  lamp_pole: { t: 'plain', color: '#3b3d40', rough: 0.5, metal: 0.8, env: 0.8 },
  lamp_head: { t: 'plain', color: '#fff3dc', rough: 0.5, emissive: '#ffd49a', glow: 0.1 },
  glow_pool: { t: 'basic', color: '#ffc27a' },
  trunk: { t: 'tex', recipe: { type: 'photo', set: 'palm_tree_bark', base: '#7b6650', rough: 0.95, tint: '#a8875f' } },
  render_sand: { t: 'tex', recipe: { type: 'photo', set: 'painted_plaster_wall', base: '#c4b08f', rough: 0.92, tint: '#c4b08f' } },
  render_ivory: { t: 'tex', recipe: { type: 'photo', set: 'painted_plaster_wall', base: '#d0c4ad', rough: 0.92, tint: '#d0c4ad' } },
  render_grey: { t: 'tex', recipe: { type: 'photo', set: 'painted_plaster_wall', base: '#aeaba3', rough: 0.92, tint: '#aeaba3' } },
  shop_glass: { t: 'plain', color: '#2b3236', rough: 0.08, metal: 0.1, env: 1.2 },
  awning: { t: 'tex', recipe: { type: 'photo', set: 'rough_linen', base: '#8a6a4a', rough: 1, tint: '#8a6a4a' } },
  water_tank: { t: 'plain', color: '#c9c4b8', rough: 0.55 },
  ctx_dark: { t: 'plain', color: '#2e3033', rough: 0.6 },
  core_cap: { t: 'tex', recipe: { type: 'concrete', base: '#77726a', rough: 0.95 } },   // V11.5: solid top over lift / service shafts
  car_glass: { t: 'plain', color: '#1d2429', rough: 0.04, env: 1.4 },
  ac_unit: { t: 'plain', color: '#d6d4cf', rough: 0.6 },
  car_bronze: { t: 'plain', color: '#5d4a3a', rough: 0.28, metal: 0.5, env: 0.9 },
  car_sand: { t: 'plain', color: '#cbbd9f', rough: 0.3, metal: 0.35, env: 0.9 },
  rim: { t: 'plain', color: '#9a9ca0', rough: 0.3, metal: 0.9, env: 1 },
  tail_light: { t: 'plain', color: '#5a0d0d', rough: 0.3, emissive: '#ff2a1a', glow: 0.05 },
  mulch: { t: 'plain', color: '#5a4636', rough: 1 },
  // V11 round 2 (exterior)
  granite_polish: { t: 'plain', color: '#2b2825', rough: 0.32, env: 0.12 },            // honed-and-polished forecourt stone
  shop_lit: { t: 'plain', color: '#2b3236', rough: 0.08, metal: 0.1, env: 1.2, emissive: '#d98a3e', glow: 0 },   // open shop: warm interior after sunset
  lantern: { t: 'plain', color: '#efe4d0', rough: 0.55, emissive: '#ffc98a', glow: 0 },   // V11.4 roof crown (D18): lantern screen and light lines, pale by day
  tree_grate: { t: 'plain', color: '#2f3133', rough: 0.55, metal: 0.6, env: 0.6 },
  bark: { t: 'plain', color: '#6a5d50', rough: 0.95 },
};

const WHITE = new THREE.Color('#ffffff');

export class MatLib {
  private mats = new Map<string, THREE.Material>();
  private ghosts = new Map<string, THREE.Material>();
  private surfaceMatId = new Map<string, string>();
  private ghostOpacity = 1;
  private lmMats = new Map<string, THREE.MeshStandardMaterial>();
  private ambMats = new Map<string, THREE.MeshStandardMaterial>();
  /** Top-down map of the baked irradiance at floor level (R sky, G lamps, B bounced sun, A coverage): ambient light for furniture. */
  readonly ambUniforms = { uNkFloor: { value: (() => { const t = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1); t.needsUpdate = true; return t; })() as THREE.Texture } };
  /** Baked indirect light: R = sky light, G = lamp light, B = bounced sunlight (sqrt-encoded luminance). Colours/intensity are live uniforms. */
  /** three.js replaces every material's envMapIntensity by scene.environmentIntensity, which is cut to ~3 % indoors;
   *  real metals have no diffuse colour, so they would turn black. The engine sets this to give them their reflections back. */
  readonly metalRefl = { value: 1 };
  readonly lmUniforms = { uLmSky: { value: new THREE.Color(0, 0, 0) }, uLmLamp: { value: new THREE.Color(0, 0, 0) }, uLmSun: { value: new THREE.Color(0, 0, 0) } };
  private lmTex: THREE.Texture = (() => { const t = new THREE.DataTexture(new Uint8Array([150, 90, 0, 255]), 1, 1); t.needsUpdate = true; t.channel = 1; return t; })();
  night = 0;
  /** 1 = fittings on, ~0 = switched off (drives lamp shades, LED strips, downlights) */
  lamp = 1;
  setLamp(k: number) { if (Math.abs(k - this.lamp) < 0.004) return; this.lamp = k; for (const slot of ['lamp_shade', 'led', 'candle']) for (const m of [this.mats.get(slot), this.ghosts.get(slot), this.ambMats.get(slot)]) if (m) this.applyNightTo(slot, m); }
  constructor(public texSize: number, public anisotropy: number) {}

  private std(def: Extract<Def, { t: 'tex' }>, key: string): THREE.MeshStandardMaterial {
    const set = getTextureSet(key, def.recipe, this.texSize, this.anisotropy);
    const m = new THREE.MeshStandardMaterial({ map: set.map, normalMap: set.normalMap, roughnessMap: set.roughnessMap, roughness: Math.min(1, set.roughScale ?? 1), metalness: def.metal ?? 0, envMapIntensity: def.env ?? 0.32 });
    if (set.tint) m.color.copy(set.tint);
    if (def.side2) m.side = THREE.DoubleSide;
    return m;
  }

  get(slot: string): THREE.Material {
    let m = this.mats.get(slot);
    if (m) return m;
    if (slot.startsWith('surf:')) {
      const sid = slot.slice(5);
      const matId = this.surfaceMatId.get(sid) ?? CATALOG.find((c) => c.category === SURFACES.find((s) => s.id === sid)?.category && c.isDefault)!.id;
      m = this.std({ t: 'tex', recipe: MATERIAL_BY_ID[matId].recipe }, matId);
      m.name = slot; m.userData.materialId = matId;
    } else {
      const def = FIXED[slot];
      if (!def) { console.warn('[matlib] unknown material slot', slot); m = new THREE.MeshStandardMaterial({ color: '#ff00ff' }); }
      else if (def.t === 'tex') { const sm = this.std(def, `fixed:${slot}`); if (def.lit) { sm.emissiveMap = getTextureSet(`fixed:${slot}_lit`, def.lit, this.texSize, this.anisotropy).map; sm.emissive = new THREE.Color('#ffffff'); sm.emissiveIntensity = 0; } m = sm; }
      else if (def.t === 'plain') {
        const s = new THREE.MeshStandardMaterial({ color: def.color, roughness: def.rough, metalness: def.metal ?? 0, envMapIntensity: def.env ?? 0.6 });
        if (def.emissive) { s.emissive = new THREE.Color(def.emissive); s.emissiveIntensity = def.glow ?? (slot === 'ceiling' ? 0.42 : 0.15); }
        if (def.side2) s.side = THREE.DoubleSide;
        // the live renderer cannot occlude sky reflections under the canopy (Cycles traces them), so polished granite
        // would mirror open sky in the canopy's shade and read as water; it is a little more matte here than in Cycles
        if (slot === 'granite_polish') s.roughness = 0.62;
        m = s;
      } else if (def.t === 'basic') {
        m = new THREE.MeshBasicMaterial({ color: def.color });
        if (slot === 'glow_pool') {
          // soft additive pool of light on the ground under a street lamp (visible only at night)
          const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!; const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
          gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.35, '#8a8a8a'); gr.addColorStop(1, '#000000'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
          const b = m as THREE.MeshBasicMaterial; b.map = new THREE.CanvasTexture(c); b.transparent = true; b.blending = THREE.AdditiveBlending; b.opacity = 0; b.depthWrite = false; b.polygonOffset = true; b.polygonOffsetFactor = -2; b.polygonOffsetUnits = -2; b.fog = false;
        }
        if (slot === 'contact') {
          // soft-edged blob used as a cheap contact shadow under furniture
          const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d')!; const img = g.createImageData(64, 64);
          for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { const dx = Math.min(x, 63 - x) / 20, dy = Math.min(y, 63 - y) / 20; const a = Math.min(1, dx) * Math.min(1, dy); const k = a * a * (3 - 2 * a); const i = (y * 64 + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = 255 * k; img.data[i + 3] = 255; }
          g.putImageData(img, 0, 0); const tex = new THREE.CanvasTexture(c);
          const b = m as THREE.MeshBasicMaterial; b.alphaMap = tex; b.transparent = true; b.opacity = 0.36; b.depthWrite = false; b.polygonOffset = true; b.polygonOffsetFactor = -1; b.polygonOffsetUnits = -1;
        }
      }
      else {
        m = new THREE.MeshStandardMaterial({ color: def.color, roughness: def.rough, metalness: 0.05, transparent: true, opacity: def.opacity, depthWrite: false, envMapIntensity: 1.5 });
        if (slot === 'water') {
          const set = getTextureSet('fixed:waternormal', { type: 'concrete', base: '#808080', rough: 0.1 }, 256, 1);
          const nm = set.normalMap.clone(); nm.repeat.set(1 / 2.2, 1 / 2.2); nm.needsUpdate = true;
          (m as THREE.MeshStandardMaterial).normalMap = nm; (m as THREE.MeshStandardMaterial).normalScale.set(0.55, 0.55);
        }
      }
      m.name = slot;
    }
    this.mats.set(slot, m);
    this.applyNightTo(slot, m);
    return m;
  }

  /** Twin of a slot that receives the baked lightmap on uv1 (walls, floors, ceilings of a baked floor). */
  getLM(slot: string): THREE.Material {
    let m = this.lmMats.get(slot);
    if (!m) {
      m = (this.get(slot) as THREE.MeshStandardMaterial).clone(); m.name = `lm:${slot}`;
      m.lightMap = this.lmTex; m.emissiveIntensity = 0; m.envMapIntensity = (m.envMapIntensity ?? 0.3) * 0.6;
      const u = this.lmUniforms;
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uLmSky = u.uLmSky; sh.uniforms.uLmLamp = u.uLmLamp; sh.uniforms.uLmSun = u.uLmSun;
        const chunk = THREE.ShaderChunk.lights_fragment_maps.replace('vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;', 'vec3 lmv = lightMapTexel.rgb * lightMapTexel.rgb; vec3 lightMapIrradiance = lmv.r * uLmSky + lmv.g * uLmLamp + lmv.b * uLmSun;');
        // baked surfaces take ALL their ambient light from the bake (the hemisphere light is only for furniture)
        sh.fragmentShader = 'uniform vec3 uLmSky;\nuniform vec3 uLmLamp;\nuniform vec3 uLmSun;\n' + sh.fragmentShader.replace('#include <lights_fragment_maps>', chunk.replace('irradiance += lightMapIrradiance;', 'irradiance = lightMapIrradiance;') + '\n#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )\n  iblIrradiance = vec3( 0.0 );\n#endif\n');
      };
      m.customProgramCacheKey = () => 'nk-lightmap';
      this.lmMats.set(slot, m);
    }
    return m;
  }
  /** Twin of a slot for furniture / joinery inside a baked floor: ambient light = baked irradiance where the piece stands. */
  getAmb(slot: string): THREE.Material {
    const base = this.get(slot); if (!(base as THREE.MeshStandardMaterial).isMeshStandardMaterial) return base;
    let m = this.ambMats.get(slot);
    if (!m) {
      m = (base as THREE.MeshStandardMaterial).clone(); m.name = `amb:${slot}`;
      const u = this.lmUniforms, a = this.ambUniforms;
      m.onBeforeCompile = (sh) => {
        sh.uniforms.uLmSky = u.uLmSky; sh.uniforms.uLmLamp = u.uLmLamp; sh.uniforms.uLmSun = u.uLmSun; sh.uniforms.uNkFloor = a.uNkFloor;
        sh.vertexShader = 'varying vec2 vNkPlan;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  { vec4 nkW = modelMatrix * vec4(transformed, 1.0); vNkPlan = vec2(nkW.x / 18.0 + 0.5, 0.5 - nkW.z / 24.0); }');
        sh.fragmentShader = 'uniform vec3 uLmSky;\nuniform vec3 uLmLamp;\nuniform vec3 uLmSun;\nuniform sampler2D uNkFloor;\nvarying vec2 vNkPlan;\n' + sh.fragmentShader.replace('#include <lights_fragment_maps>',
          'vec4 nkT = texture2D(uNkFloor, vNkPlan); vec3 nkL = nkT.rgb * nkT.rgb; float nkUp = inverseTransformDirection(normal, viewMatrix).y;\n  vec3 nkI = (nkL.r * uLmSky + nkL.g * uLmLamp + nkL.b * uLmSun) * (5.8 + 1.5 * nkUp); nkI *= 1.0 / (1.0 + 0.22 * max(nkI.r, nkI.g)); irradiance = mix(irradiance, nkI, nkT.a);\n#include <lights_fragment_maps>\n' +
          // indoors the outdoor sky map must not act as diffuse light (it stays for reflections only)
          '#if defined( USE_ENVMAP ) && defined( STANDARD ) && defined( ENVMAP_TYPE_CUBE_UV )\n  iblIrradiance *= (1.0 - nkT.a);\n#endif\n');
      };
      const metal = m.metalness > 0.5;
      if (metal) {
        const d = FIXED[slot]; const k = { value: d && 'env' in d && d.env ? d.env : 1 }; const inner = m.onBeforeCompile;
        m.onBeforeCompile = (sh, r) => {
          inner.call(m, sh, r); sh.uniforms.uNkMetal = this.metalRefl; sh.uniforms.uNkEnvK = k;
          sh.fragmentShader = 'uniform float uNkMetal;\nuniform float uNkEnvK;\n' + sh.fragmentShader.replace('#include <lights_fragment_end>', // indoors a metal mirrors the ROOM, not the sky: approximate the surrounding walls' radiance from the baked irradiance
            // where the piece stands (wall albedo ~0.6, Lambert 1/π → ~0.19 × irradiance)
            '#if defined( RE_IndirectSpecular )\n  radiance = mix(radiance * uNkMetal, nkI * 0.19, nkT.a) * uNkEnvK;\n#endif\n#include <lights_fragment_end>');
        };
      }
      m.customProgramCacheKey = () => (metal ? 'nk-amb-metal' : 'nk-amb');
      this.ambMats.set(slot, m); this.applyNightTo(slot, m);
    }
    return m;
  }
  setFloorIrradiance(tex: THREE.Texture) { tex.colorSpace = THREE.NoColorSpace; this.ambUniforms.uNkFloor.value = tex; }
  setLightmap(tex: THREE.Texture) { tex.channel = 1; tex.colorSpace = THREE.NoColorSpace; this.lmTex = tex; for (const m of this.lmMats.values()) { m.lightMap = tex; m.needsUpdate = false; } }

  /** Fading twin used while the upper floor stack lifts away. */
  ghost(slot: string): THREE.Material {
    let g = this.ghosts.get(slot);
    if (!g) {
      g = this.get(slot).clone(); g.transparent = true; g.opacity = (this.baseOpacity(slot)) * this.ghostOpacity; g.name = `ghost:${slot}`;
      g.userData.baseOpacity = this.baseOpacity(slot);
      this.ghosts.set(slot, g);
    }
    return g;
  }
  private baseOpacity(slot: string) { const d = FIXED[slot]; return d && d.t === 'glass' ? d.opacity : 1; }
  setGhostOpacity(o: number) {
    this.ghostOpacity = o;
    for (const g of this.ghosts.values()) g.opacity = (g.userData.baseOpacity as number) * o;
  }

  surfaceMaterialId(surfaceId: string) { return this.surfaceMatId.get(surfaceId) ?? null; }

  /** Rebind a surface to a catalogue finish. Returns false when nothing changed. */
  applySurface(surfaceId: string, materialId: string): boolean {
    if (this.surfaceMatId.get(surfaceId) === materialId) return false;
    this.surfaceMatId.set(surfaceId, materialId);
    const m = this.mats.get(`surf:${surfaceId}`) as THREE.MeshStandardMaterial | undefined;
    if (m) {
      const set = getTextureSet(materialId, MATERIAL_BY_ID[materialId].recipe, this.texSize, this.anisotropy);
      m.map = set.map; m.normalMap = set.normalMap; m.roughnessMap = set.roughnessMap; m.userData.materialId = materialId;
      m.color.copy(set.tint ?? WHITE); m.roughness = Math.min(1, set.roughScale ?? 1);
      for (const tw of [this.lmMats.get(`surf:${surfaceId}`), this.ambMats.get(`surf:${surfaceId}`)])
        if (tw) { tw.map = set.map; tw.normalMap = set.normalMap; tw.roughnessMap = set.roughnessMap; tw.color.copy(m.color); tw.roughness = m.roughness; tw.userData.materialId = materialId; }
    }
    return true;
  }
  applyAll(pkg: PackageId, overrides: Overrides): string[] {
    const changed: string[] = [];
    for (const s of SURFACES) if (this.applySurface(s.id, resolveSurfaceMaterial(s.id, pkg, overrides))) changed.push(s.id);
    return changed;
  }
  /** Generate (and upload-ready) texture sets ahead of use so a swap never stalls a frame. */
  prewarm(materialId: string): Promise<void> { return prepareTextureSet(materialId, MATERIAL_BY_ID[materialId].recipe, this.texSize, this.anisotropy); }
  /** Prepare (in the worker) every texture set the given material slots will need. */
  prepareSlots(slots: Iterable<string>): Promise<void> {
    const jobs: Promise<void>[] = [];
    for (const slot of new Set(slots)) {
      if (slot.startsWith('surf:')) {
        const sid = slot.slice(5); const matId = this.surfaceMatId.get(sid) ?? CATALOG.find((c) => c.category === SURFACES.find((x) => x.id === sid)?.category && c.isDefault)?.id;
        if (matId) jobs.push(prepareTextureSet(matId, MATERIAL_BY_ID[matId].recipe, this.texSize, this.anisotropy));
      } else { const def = FIXED[slot]; if (def?.t === 'tex') { jobs.push(prepareTextureSet(`fixed:${slot}`, def.recipe, this.texSize, this.anisotropy)); if (def.lit) jobs.push(prepareTextureSet(`fixed:${slot}_lit`, def.lit, this.texSize, this.anisotropy)); } }
    }
    return Promise.all(jobs).then(() => undefined);
  }
  /** GPU textures of a catalogue finish (for staged upload before first use). */
  texturesOfMaterial(materialId: string): THREE.Texture[] { const t = getTextureSet(materialId, MATERIAL_BY_ID[materialId].recipe, this.texSize, this.anisotropy); return [t.map, t.normalMap, t.roughnessMap]; }

  private applyNightTo(slot: string, m: THREE.Material) {
    if (slot === 'fill_lit') (m as THREE.MeshBasicMaterial).color.set('#1b2023').lerp(new THREE.Color('#ffc887'), Math.min(1, this.night * 1.25) * 0.95);
    if (slot === 'fill_dark') (m as THREE.MeshBasicMaterial).color.set('#1b2023').lerp(new THREE.Color('#3b3229'), this.night);   // unlit rooms still catch some city light
    if (slot === 'lamp_shade') (m as THREE.MeshStandardMaterial).emissiveIntensity = (0.25 + this.night * 1.9) * this.lamp;
    if (slot === 'led') (m as THREE.MeshStandardMaterial).emissiveIntensity = (1.4 + this.night * 2.4) * this.lamp;
    if (slot.startsWith('ctx_') && slot.length === 5) (m as THREE.MeshStandardMaterial).emissiveIntensity = this.night * 1.25;
    if (slot === 'lamp_head') (m as THREE.MeshStandardMaterial).emissiveIntensity = 0.1 + this.night * 3.2;
    if (slot === 'glow_pool') (m as THREE.MeshBasicMaterial).opacity = this.night * 0.42;
    if (slot === 'shop_lit') (m as THREE.MeshStandardMaterial).emissiveIntensity = Math.min(1, this.night * 1.4) * 0.85;
    if (slot === 'lantern') (m as THREE.MeshStandardMaterial).emissiveIntensity = Math.min(1, this.night * 1.3) * 0.75;   // V11.4 roof crown: lit after sunset only
    // V11 round 2: an evening sheen on road and paving (stylistic, as in the reference reels — not a weather claim)
    if (slot === 'asphalt' || slot === 'plaza') { const s = m as THREE.MeshStandardMaterial; s.userData.r0 ??= s.roughness; s.roughness = s.userData.r0 * (1 - (slot === 'asphalt' ? 0.4 : 0.25) * this.night); }
  }
  setNight(n: number) {
    if (Math.abs(n - this.night) < 0.004) return;
    this.night = n;
    for (const slot of ['fill_lit', 'fill_dark', 'lamp_shade', 'led', 'ctx_a', 'ctx_b', 'ctx_c', 'ctx_d', 'ctx_e', 'ctx_f', 'ctx_g', 'ctx_h', 'lamp_head', 'glow_pool', 'shop_lit', 'lantern', 'asphalt', 'plaza']) { for (const m of [this.mats.get(slot), this.ghosts.get(slot), this.ambMats.get(slot)]) if (m) this.applyNightTo(slot, m); }
  }
  setEnvIntensityScale(k: number) {
    for (const [slot, m] of this.mats) {
      const s = m as THREE.MeshStandardMaterial; if (!('envMapIntensity' in s)) continue;
      const d = FIXED[slot]; const base = d && 'env' in d && d.env ? d.env : d?.t === 'glass' ? 1.5 : 0.32;
      s.envMapIntensity = base * k;
    }
  }
  all() { return [...this.mats.values(), ...this.ghosts.values(), ...this.lmMats.values(), ...this.ambMats.values()]; }
  dispose() { for (const m of this.all()) m.dispose(); this.mats.clear(); this.ghosts.clear(); this.lmMats.clear(); this.ambMats.clear(); }
}
