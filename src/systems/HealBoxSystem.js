/**
 * HealBoxSystem.js
 * Manages heal box collectibles in the arena.
 *
 * Each box:
 *   - Heals the first ball that overlaps it
 *   - Becomes consumed (invisible/inactive) for RESPAWN_TIME seconds
 *   - Then reappears
 *
 * Arena configs define box positions via healBoxes: [{x, y, amount}]
 * Size is fixed at BOX_SIZE px square.
 */

import { Vector2 } from '../core/Vector2.js';
import { bus }     from './EventBus.js';

const BOX_SIZE     = 24;   // px
const RESPAWN_TIME = 30;   // seconds until box reappears

export class HealBoxSystem {
  /**
   * @param {Array<{x, y, amount}>} definitions
   */
  constructor(definitions = []) {
    this.boxes = definitions.map(d => ({
      x             : d.x,
      y             : d.y,
      amount        : d.amount ?? 25,
      size          : BOX_SIZE,
      team          : d.team ?? 0,   // 0 = neutral (any ball), N = team N only
      consumed      : true,
      respawnTimer  : RESPAWN_TIME * 2,
    }));
  }

  /**
   * @param {number} dt
   * @param {import('../entities/Ball.js').Ball[]} aliveBalls
   */
  update(dt, aliveBalls) {
    // Don't tick or activate boxes when only 1 or 2 balls remain
    const challengers = aliveBalls.filter(b => !b.isBlight);
    const canSpawn = challengers.length > 2 || aliveBalls.some(b => b.isBlight);

    for (const box of this.boxes) {
      if (box.consumed) {
        if (canSpawn) box.respawnTimer -= dt;
        if (box.respawnTimer <= 0) box.consumed = false;
        continue;
      }

      // Also hide already-visible boxes when ≤2 remain
      if (!canSpawn) continue;

      for (const ball of aliveBalls) {
        // Team box: only heals matching team. Neutral (0): heals anyone.
        // Special: team 1 wave boxes also heal team 0 (FFA challengers)
        if (box.team !== 0 && ball.team !== box.team) {
          // Allow FFA challengers to use wave heal boxes
          if (!(box.team === 1 && ball.team === 0 && !ball.isBlight)) continue;
        }
        if (this._overlaps(box, ball)) {
          ball.hp         += box.amount;
          box.consumed     = true;
          box.respawnTimer = RESPAWN_TIME;
          bus.emit('ball:healed', { ball, amount: box.amount });
          break;
        }
      }
    }
  }

  _overlaps(box, ball) {
    // Circle vs AABB
    const hs = box.size / 2;
    const cx = Math.max(box.x - hs, Math.min(ball.position.x, box.x + hs));
    const cy = Math.max(box.y - hs, Math.min(ball.position.y, box.y + hs));
    const dx = ball.position.x - cx;
    const dy = ball.position.y - cy;
    return dx * dx + dy * dy < ball.radius * ball.radius;
  }

  reset() {
    for (const box of this.boxes) {
      box.consumed     = true;
      box.respawnTimer = RESPAWN_TIME * 2;
    }
  }}