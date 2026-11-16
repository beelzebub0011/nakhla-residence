import type { FloorId } from '../domain/types';
import type { View } from './store';

// Cinematic shot list (concept visuals only): exterior -> lobby -> apartment -> wellness -> dining -> night.
// Used by the opt-in cinematic tour and by the looping Showroom film. Every shot is the REAL 3D scene.
export interface Chapter { id: string; floorId: FloorId | null; unitId: string | null; roomKey: string | null; view: View; time: number; seconds: number; kind?: string }

export const CHAPTERS: Chapter[] = [
  { id: 'exterior_day', floorId: null, unitId: null, roomKey: null, view: 'tower', time: 600, seconds: 10 },
  { id: 'lobby', floorId: 'G', unitId: null, roomKey: 'zone.lobby_hall', view: 'room', time: 630, seconds: 8, kind: 'reception' },
  { id: 'sunrise_balcony', floorId: 'F04', unitId: 'U04A', roomKey: 'A.balcony', view: 'room', time: 390, seconds: 8 },
  { id: 'living_finish', floorId: 'F04', unitId: 'U04A', roomKey: 'A.living', view: 'room', time: 660, seconds: 9 },
  { id: 'kitchen', floorId: 'F04', unitId: 'U04A', roomKey: 'A.kitchen', view: 'room', time: 720, seconds: 8, kind: 'kitchen' },
  { id: 'master', floorId: 'F04', unitId: 'U04A', roomKey: 'A.master', view: 'room', time: 960, seconds: 8, kind: 'master' },
  { id: 'bathroom', floorId: 'F04', unitId: 'U04A', roomKey: 'A.bathroom', view: 'room', time: 960, seconds: 7, kind: 'bathroom' },
  { id: 'apartment_dollhouse', floorId: 'F04', unitId: 'U04A', roomKey: null, view: 'unit', time: 900, seconds: 9 },
  { id: 'wellness', floorId: 'F10', unitId: null, roomKey: 'zone.pool', view: 'room', time: 900, seconds: 9 },
  { id: 'gym', floorId: 'F10', unitId: null, roomKey: 'zone.gym', view: 'room', time: 930, seconds: 7, kind: 'gym' },
  { id: 'restaurant', floorId: 'F11', unitId: null, roomKey: 'zone.restaurant', view: 'room', time: 1050, seconds: 8, kind: 'restaurant' },
  { id: 'sunset_cafe', floorId: 'F11', unitId: null, roomKey: 'zone.cafe', view: 'room', time: 1080, seconds: 8 },
  { id: 'terrace', floorId: 'F11', unitId: null, roomKey: 'zone.terrace', view: 'room', time: 1110, seconds: 9, kind: 'terrace' },
  { id: 'living_night', floorId: 'F04', unitId: 'U04A', roomKey: 'A.living', view: 'room', time: 1290, seconds: 8, kind: 'living' },
  { id: 'night_exterior', floorId: null, unitId: null, roomKey: null, view: 'tower', time: 1260, seconds: 10 },
];
export const CHAPTER_IDS = CHAPTERS.map((c) => c.id);
