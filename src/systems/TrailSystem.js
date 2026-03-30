/**
 * TrailSystem.js
 * Manages Zip's electric trail segments and landing circles.
 *
 * Trails: line segments, 28px wide.
 * Circles: point hazards with radius 40px, fixed 3s duration.
 * Both: 1 dmg per 0.2s (owner immune), +0.1s per tick to ownerWeapon.trailDuration.
 * Fade in last 1s like spikes.
 */

import { Vector2 } from '../core/Vector2.js';
import { segmentToPointDistance } from '../core/Physics.js';

export const TRAIL_WIDTH     = 28;
const        DAMAGE_PER_TICK = 1;
const        DAMAGE_INTERVAL = 0.2;

export class TrailSystem {
  constructor() {
    this.trails  = []; // segments
    this.circles = []; // landing bursts
  }

  spawn({ start, end, duration, color, ownerId, ownerTeam = 0, ownerWeapon, width }) {
    const w = width ?? TRAIL_WIDTH;
    this.trails.push({ start, end, t: duration, maxT: duration,
      color, ownerId, ownerTeam, ownerWeapon, width: w, _dmgTimers: new Map() });
  }

  spawnCircle({ x, y, radius, duration, color, ownerId, ownerTeam = 0, ownerWeapon }) {
    this.circles.push({ x, y, radius: radius ?? 40, t: duration, maxT: duration,
      color, ownerId, ownerTeam, ownerWeapon, _dmgTimers: new Map() });
  }

  update(dt, balls) {
    for (const t of this.trails)  t.t -= dt;
    for (const c of this.circles) c.t -= dt;
    this.trails  = this.trails.filter(t => t.t > 0);
    this.circles = this.circles.filter(c => c.t > 0);

    for (const trail of this.trails) {
      for (const [id, t] of trail._dmgTimers) {
        const next = t - dt;
        if (next <= 0) trail._dmgTimers.delete(id);
        else           trail._dmgTimers.set(id, next);
      }
      for (const ball of balls) {
        if (ball.id === trail.ownerId) continue;
        if (trail.ownerTeam !== 0 && ball.team === trail.ownerTeam) continue;
        this._checkTrail(trail, ball);
      }
    }

    for (const circle of this.circles) {
      for (const [id, t] of circle._dmgTimers) {
        const next = t - dt;
        if (next <= 0) circle._dmgTimers.delete(id);
        else           circle._dmgTimers.set(id, next);
      }
      for (const ball of balls) {
        if (ball.id === circle.ownerId) continue;
        if (circle.ownerTeam !== 0 && ball.team === circle.ownerTeam) continue;
        this._checkCircle(circle, ball);
      }
    }
  }

  _checkTrail(trail, ball) {
    const { dist } = segmentToPointDistance(trail.start, trail.end, ball.position);
    if (dist >= (trail.width ?? TRAIL_WIDTH) / 2 + ball.radius) return;
    if (trail._dmgTimers.has(ball.id)) return;
    ball.takeDamage(DAMAGE_PER_TICK, null, true);
    if (trail.ownerWeapon) {
      trail.ownerWeapon.damageDealt  += DAMAGE_PER_TICK;
      trail.ownerWeapon.trailDuration += 0.1;
      trail.t += 0.1;
    }
    trail._dmgTimers.set(ball.id, DAMAGE_INTERVAL);
  }

  _checkCircle(circle, ball) {
    const dx   = ball.position.x - circle.x;
    const dy   = ball.position.y - circle.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist >= circle.radius + ball.radius) return;
    if (circle._dmgTimers.has(ball.id)) return;
    ball.takeDamage(DAMAGE_PER_TICK, null, true);
    if (circle.ownerWeapon) {
      circle.ownerWeapon.damageDealt  += DAMAGE_PER_TICK;
      circle.ownerWeapon.trailDuration += 0.1;
    }
    circle._dmgTimers.set(ball.id, DAMAGE_INTERVAL);
  }

  clear() { this.trails = []; this.circles = []; }
}