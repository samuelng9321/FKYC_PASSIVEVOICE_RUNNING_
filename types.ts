
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// Augment JSX namespace for React Three Fiber elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      points: any;
      bufferGeometry: any;
      bufferAttribute: any;
      pointsMaterial: any;
      planeGeometry: any;
      meshBasicMaterial: any;
      shaderMaterial: any;
      sphereGeometry: any;
      fog: any;
      color: any;
      ambientLight: any;
      directionalLight: any;
      pointLight: any;
      ringGeometry: any;
      meshStandardMaterial: any;
      circleGeometry: any;
    }
  }
}

export enum GameStatus {
  MENU = 'MENU',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  SHOP = 'SHOP',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY',
  ART_ROOM = 'ART_ROOM'
}

export type GameMode = 'NORMAL' | 'CHALLENGE';

export enum ObjectType {
  OBSTACLE = 'OBSTACLE', 
  GEM = 'GEM',
  DOOR = 'DOOR',
  LETTER = 'LETTER'
}

export interface GameObject {
  id: string;
  type: ObjectType;
  position: [number, number, number]; // x, y, z
  active: boolean;
  
  // Door specific
  text?: string;      // The answer text displayed on the door
  isCorrect?: boolean; // Is this the correct answer?
  
  // Gem specific
  points?: number; 
  color?: string;

  // Letter specific
  letterChar?: string; // 'F', 'K', 'Y', 'C'
  
  // Visual state
  isHit?: boolean; // For animation when hit
}

export const LANE_WIDTH = 2.2;
export const JUMP_HEIGHT = 2.5;
export const JUMP_DURATION = 0.6; // seconds
export const RUN_SPEED_BASE = 12.0; // Slower start
export const SPAWN_DISTANCE = 120;
export const REMOVE_DISTANCE = 20; // Behind player

// Colors for UI
export const GEMINI_COLORS = [
    '#2979ff', // G - Blue
    '#ff1744', // E - Red
    '#ffea00', // M - Yellow
    '#2979ff', // I - Blue
    '#00e676', // N - Green
    '#ff1744', // I - Red
];

export interface ShopItem {
    id: string;
    name: string;
    description: string;
    cost: number;
    icon: any; // Lucide icon component
    oneTime?: boolean; // If true, remove from pool after buying
}

export interface Question {
    active: string;      // "I booked a room"
    passive: string;     // "A room was booked by me"
    distractors: string[]; // ["A room is booked by me", "I was booked by a room"]
}

export interface Mistake {
    question: Question;
    selectedAnswer: string;
}
