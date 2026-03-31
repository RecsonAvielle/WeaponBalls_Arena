/**
 * LaserSystem.js
 * Raycasts to nearest arena wall, pierces all enemy balls in path.
 * Beam visual: white flash → ball color → fade out.
 */

export class LaserSystem {
  constructor() {
    this.beams  = []; // { x1,y1,x2,y2,color,t,maxT }
    this._arena = null;
  }

  setArena(arena) { this._arena = arena; }

  fire({ owner, angle, balls, ownerWeapon, obstacleSystem }) {
    // Fallback so beam always has a wall to stop at
    const arena = this._arena ?? { x: 0, y: 0, width: 800, height: 800 };

    const cos    = Math.cos(angle);
    const sin    = Math.sin(angle);
    const startX = owner.position.x + cos * (owner.radius + 2);
    const startY = owner.position.y + sin * (owner.radius + 2);

    const dist = this._rayWallDist(startX, startY, cos, sin, arena, obstacleSystem);
    const endX  = startX + cos * dist;
    const endY  = startY + sin * dist;

    // Pierce all enemy balls along the ray
    let hitCount = 0;
    for (const ball of balls) {
      if (!ball.alive || ball.isImmune) continue;
      if (ball.id === owner.id) continue;
      if (owner.team !== 0 && ball.team === owner.team) continue;

      const d = this._pointSegDist(
        ball.position.x, ball.position.y,
        startX, startY, endX, endY,
      );
      if (d < ball.radius) {
        ball.takeDamage(ownerWeapon.baseDamage, null, true);
        ownerWeapon.damageDealt += ownerWeapon.baseDamage;
        ownerWeapon.hitsLanded++;
        hitCount++;
      }
    }

    // +2 base damage per ball hit this shot
    ownerWeapon.baseDamage += hitCount * 2;

    this.beams.push({
      x1: startX, y1: startY,
      x2: endX,   y2: endY,
      color: owner.color,
      t: 0.45, maxT: 0.45,
    });
  }

  _rayWallDist(ox, oy, dx, dy, arena, obstacleSystem) {
    const m = 4;
    let tMin = Infinity;
    const tryT = t => { if (t > 0.001 && t < tMin) tMin = t; };

    // Arena walls
    if (Math.abs(dx) > 0.001) {
        tryT((arena.x + m            - ox) / dx);
        tryT((arena.x + arena.width  - m - ox) / dx);
    }
    if (Math.abs(dy) > 0.001) {
        tryT((arena.y + m            - oy) / dy);
        tryT((arena.y + arena.height - m - oy) / dy);
    }

    // Obstacles — ray vs AABB slab test
    for (const obs of obstacleSystem?.obstacles ?? []) {
        const txMin = Math.abs(dx) > 0.001 ? (obs.x             - ox) / dx : -Infinity;
        const txMax = Math.abs(dx) > 0.001 ? (obs.x + obs.width - ox) / dx :  Infinity;
        const tyMin = Math.abs(dy) > 0.001 ? (obs.y              - oy) / dy : -Infinity;
        const tyMax = Math.abs(dy) > 0.001 ? (obs.y + obs.height - oy) / dy :  Infinity;

        const tEnter = Math.max(Math.min(txMin, txMax), Math.min(tyMin, tyMax));
        const tExit  = Math.min(Math.max(txMin, txMax), Math.max(tyMin, tyMax));

        if (tExit > 0.001 && tEnter < tExit) tryT(tEnter);
    }

    return tMin === Infinity ? 800 : tMin;
    }

  _pointSegDist(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(px - ax, py - ay);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }

  update(dt) {
    for (const b of this.beams) b.t -= dt;
    this.beams = this.beams.filter(b => b.t > 0);
  }

  clear() { this.beams = []; }
}