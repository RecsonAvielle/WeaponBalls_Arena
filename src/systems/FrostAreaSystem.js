/**
 * FrostAreaSystem.js
 * Frost weapon leaves small frost circles when it hits an enemy.
 * Balls inside a circle get a secondary frost debuff (stackable with weapon frost).
 * Area does NOT deal damage, just applies debuff while ball is inside.
 *
 * Weapon frost:  35% speed, 25% spin (applied once on hit)
 * Area frost:    35% speed, 25% spin (applied each frame while inside)
 * Stacked:       70% speed reduction, 50% spin reduction
 */
import { Vector2 } from '../core/Vector2.js';

const AREA_RADIUS = 28;

export class FrostAreaSystem {
  constructor() {
    /** @type {Array<{x,y,radius,duration,t,color,ownerTeam}>} */
    this.areas = [];
  }

  spawn({ x, y, duration, color, ownerTeam = 0, scale = 1 }) {
    this.areas.push({
      x, y,
      radius  : AREA_RADIUS * scale,
      duration,
      t       : duration,
      color,
      ownerTeam,
    });
  }

  update(dt, balls) {
    for (const area of this.areas) area.t -= dt;
    this.areas = this.areas.filter(a => a.t > 0);

    for (const ball of balls) {
      if (!ball.alive) continue;
      // Skip if ball is on own team as frost owner (ownerTeam 0 = FFA, hits anyone)
      let inArea = false;
      for (const area of this.areas) {
        if (area.ownerTeam !== 0 && ball.team === area.ownerTeam) continue;
        const dx = ball.position.x - area.x;
        const dy = ball.position.y - area.y;
        if (Math.sqrt(dx*dx + dy*dy) <= area.radius + ball.radius) {
          inArea = true;
          break;
        }
      }

      if (inArea) {
        ball._areaFrost = true;
      } else {
        ball._areaFrost = false;
      }
    }
  }

  clear() { this.areas = []; }
}
