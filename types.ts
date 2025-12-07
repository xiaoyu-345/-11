import { Vector3, Color } from 'three';

export enum TreeState {
  FORMED = 'FORMED',
  CHAOS = 'CHAOS'
}

export interface ParticleData {
  chaosPos: Vector3;
  targetPos: Vector3;
  color: Color;
  size: number;
  speed: number;
  phase: number;
}

export interface OrnamentData {
  id: number;
  chaosPos: Vector3;
  targetPos: Vector3;
  type: 'ball' | 'gift' | 'photo' | 'candy' | 'snowflake' | 'gingerbread' | 'reindeer' | 'glitter' | 'ribbon' | 'baseGift';
  color: string;
  rotation: [number, number, number];
  scale: number;
  imgUrl?: string; // For polaroids
}

export interface GestureState {
  isHandDetected: boolean;
  isOpen: boolean; // True = Unleash/Chaos, False = Formed
  isOk: boolean; // True = OK Gesture (Grab photo)
  handPosition: { x: number, y: number }; // Normalized -1 to 1
  zoom: number; // 0 (Far) to 1 (Close), based on hand size
}