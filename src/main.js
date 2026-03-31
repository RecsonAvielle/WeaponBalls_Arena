/**
 * main.js — Game Entry Point
 * Wires the GameManager, CameraManager, and UI systems together.
 */

import { GameLoop }      from './core/GameLoop.js';
import { GameManager }   from './core/GameManager.js';
import { PreGameUI }     from './ui/PreGameUI.js';
import { CameraManager } from './ui/CameraManager.js';
import { ARENA_CONFIGS } from './data/ArenaConfigs.js';

// ── Zoom Controls ─────────────────────────────────────────────────────────────
new CameraManager();

// ── Game Ecosystem ────────────────────────────────────────────────────────────
const canvas     = document.getElementById('game-canvas');
const hudElement = document.getElementById('ball-details');
const gameManager = new GameManager(canvas, hudElement);

// ── PreGame UI ────────────────────────────────────────────────────────────────
const pregameEl = document.getElementById('pregame');
const pregameUI = new PreGameUI(
  pregameEl,
  gameManager.ballConfigs,
  ARENA_CONFIGS,
  ({ ballSelections, arenaConfig, healBoxes = true }) => {
    gameManager.spawnBalls(ballSelections, arenaConfig, healBoxes);
  },
);
pregameUI.show();

// ── Reset ─────────────────────────────────────────────────────────────────────
document.getElementById('btn-reset')?.addEventListener('click', () => {
  gameManager.reset();
  window._zoomReset?.();
  const timer = document.getElementById('game-timer');
  if (timer) timer.textContent = '';
  pregameUI.show();
});

// ── Game Loop ─────────────────────────────────────────────────────────────────
const update = (dt) => gameManager.update(dt);
const render = (alpha) => gameManager.render(alpha);

new GameLoop({ update, render, targetFPS: 60 }).start();