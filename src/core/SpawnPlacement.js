/**
 * SpawnPlacement.js
 * Generates well-distributed spawn positions inside an arena.
 *
 * Strategy:
 *   1. Build a candidate grid of positions (margin from walls, minimum spacing)
 *   2. Use a greedy furthest-point algorithm to pick N positions that are
 *      as far apart from each other as possible
 *   3. Add small random jitter within each cell so spawns don't feel rigid
 *
 * Works cleanly for 2–16 balls in any arena size.
 */

import { Vector2 } from './Vector2.js';

const WALL_MARGIN = 60;  // px from arena edge
const JITTER      = 18;  // px random offset within cell

/**
 * @param {number}   count   number of positions needed
 * @param {{x,y,width,height}} arena
 * @returns {Vector2[]}
 */
export function genSpawnPositions(count, arena) {
  const minX = arena.x + WALL_MARGIN;
  const maxX = arena.x + arena.width  - WALL_MARGIN;
  const minY = arena.y + WALL_MARGIN;
  const maxY = arena.y + arena.height - WALL_MARGIN;

  // Build a dense candidate grid
  const cols  = Math.max(4, Math.ceil(Math.sqrt(count * 3)));
  const rows  = cols;
  const candidates = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      candidates.push(new Vector2(
        minX + (c / (cols - 1)) * (maxX - minX),
        minY + (r / (rows - 1)) * (maxY - minY),
      ));
    }
  }

  // Greedy furthest-point selection
  const chosen = [];
  // Start from a random candidate
  chosen.push(candidates[Math.floor(Math.random() * candidates.length)]);

  while (chosen.length < count && chosen.length < candidates.length) {
    let best = null, bestDist = -1;
    for (const cand of candidates) {
      if (chosen.some(c => c.distanceTo(cand) < 1)) continue; // already chosen
      // Minimum distance to any chosen point
      const minDist = Math.min(...chosen.map(c => c.distanceTo(cand)));
      if (minDist > bestDist) { bestDist = minDist; best = cand; }
    }
    if (!best) break;
    chosen.push(best);
  }

  // Add jitter
  return chosen.map(p => new Vector2(
    p.x + (Math.random() - 0.5) * JITTER * 2,
    p.y + (Math.random() - 0.5) * JITTER * 2,
  ));
}

/**
 * Generate outward velocities from arena center.
 * Zero-G arenas get random directions instead.
 * @param {Vector2[]} positions
 * @param {{x,y,width,height}} arena
 * @param {number} gravity
 * @returns {Vector2[]}
 */
export function genSpawnVelocities(positions, arena, gravity) {
  const cx = arena.x + arena.width  / 2;
  const cy = arena.y + arena.height / 2;
  return positions.map(pos => {
    if (gravity === 0) {
      // Zero-G: random direction
      const angle = Math.random() * Math.PI * 2;
      return new Vector2(Math.cos(angle) * 160, Math.sin(angle) * 160);
    }
    const dir   = pos.sub(new Vector2(cx, cy));
    const speed = 200 + Math.random() * 60;
    return dir.magnitude > 0
      ? dir.normalized.scale(speed)
      : new Vector2((Math.random() - 0.5) * 300, -200);
  });
}
