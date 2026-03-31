import { GRAVITY } from '../core/Physics.js';

export const ARENA_CONFIGS = [
  {
    id          : 'standard',
    name        : 'Standard',
    description : '480×480 · gravity',
    canvasSize  : 520,
    arena       : { x: 20, y: 20, width: 480, height: 480 },
    gravity     : GRAVITY,
    maxBalls    : 8,
    obstacles   : [],
    healBoxes   : [{ x: 260, y: 260 }],
  },
  {
    id          : 'small',
    name        : 'Small',
    description : '320×320 · gravity',
    canvasSize  : 360,
    arena       : { x: 20, y: 20, width: 320, height: 320 },
    gravity     : GRAVITY,
    maxBalls    : 8,
    obstacles   : [],
    healBoxes   : [{ x: 180, y: 180 }],
  },
  {
    id          : 'large-zerog',
    name        : 'Zero-G',
    description : '760×760 · no gravity',
    canvasSize  : 800,
    arena       : { x: 20, y: 20, width: 760, height: 760 },
    gravity     : 0,
    maxBalls    : 16,
    obstacles   : [],
    healBoxes   : [
      { x: 400, y: 200 },
      { x: 400, y: 600 },
      { x: 200, y: 400 },
      { x: 600, y: 400 },
    ],
  },
  {
    id          : 'large-wall',
    name        : 'Center Wall',
    description : '760×760 · no gravity · center wall',
    canvasSize  : 800,
    arena       : { x: 20, y: 20, width: 760, height: 760 },
    gravity     : 0,
    maxBalls    : 16,
    obstacles   : [{ x: 320, y: 320, width: 160, height: 160 }],
    healBoxes   : [
      { x: 180, y: 180 },
      { x: 620, y: 180 },
      { x: 180, y: 620 },
      { x: 620, y: 620 },
    ],
  },
  {
    id          : 'boss',
    name        : 'Boss Battle',
    description : '1060×1060 · no gravity · team heals',
    canvasSize  : 1100,
    arena       : { x: 20, y: 20, width: 1060, height: 1060 },
    gravity     : 0,
    maxBalls    : 9,  // 1 boss + up to 8 challengers
    obstacles   : [],
    // Team heal boxes at corners — team 1 = challengers only
    healBoxes   : [
      { x: 100, y: 100, team: 1, amount: 50 },
      { x: 1000, y: 100, team: 1, amount: 50 },
      { x: 100, y: 1000, team: 1, amount: 50 },
      { x: 1000, y: 1000, team: 1, amount: 50 },
    ],
    isBossArena : true,
  },
  {
    id          : 'wave',
    name        : 'Wave Arena',
    description : '760×760 · waves of blight',
    canvasSize  : 800,
    canvasHeight: 980,
    // Full physics arena including staging zone on top
    arena       : { x: 20, y: 20, width: 760, height: 940 },
    // Battle zone — where challengers live
    battleArena : { x: 20, y: 200, width: 760, height: 760 },
    // Staging zone — blight spawn here, invisible to player
    stagingZone : { x: 20, y: 20,  width: 760, height: 180 },
    divisionY   : 200,
    gravity     : 260,
    maxBalls    : 4,
    obstacles   : [],
    // Heal boxes at center-left and center-right of battle area
    healBoxes   : [
      { x: 80,  y: 580, team: 1, amount: 50 },
      { x: 740, y: 580, team: 1, amount: 50 },
    ],
    isWaveArena : true,
  },
];
