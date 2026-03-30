/**
 * SpikeSystem.js
 * Manages spike hazards placed by the Spike ball.
 *
 * Each spike is a small square that:
 *   - Acts as a wall — balls bounce off it (circle vs AABB)
 *   - Deals damage to all balls EXCEPT the one whose id matches spikeBallId
 *   - Has a limited duration that fades visually near the end
 *
 * Usage (main.js):
 *   const spikes = new SpikeSystem();
 *   // in update():  spikes.update(dt, aliveBalls, spikeBallId);
 *   // in render():  pass spikes.spikes to Renderer
 *   // on reset():   spikes.clear();
 */

import { Vector2 } from '../core/Vector2.js';

const SPIKE_DAMAGE    = 2;   // flat damage per contact
const SPIKE_DMG_COOLDOWN_FRAMES = 20; // frames between damage ticks per ball

export class SpikeSystem {
  constructor() {
    /** @type {Array<{x,y,size,t,maxT,color}>} */
    this.spikes = [];
    // Per spike-ball pair damage cooldown: `${spikeIdx}-${ballId}` → frames
    this._dmgCooldowns = new Map();
  }

  /**
   * Spawn a new spike.
   * @param {{ x: number, y: number, duration: number, color: string, size?: number }} opts
   */
  spawn({ x, y, duration, color = '#8B4513', size = 18, ownerTeam = 0 }) {
    this.spikes.push({ x, y, size, t: duration, maxT: duration, color, ownerTeam });
  }

  /**
   * Tick all spikes, resolve ball-spike collisions.
   * @param {number} dt
   * @param {import('../entities/Ball.js').Ball[]} balls  alive balls only
   * @param {import('../entities/Ball.js').Ball|null} spikeBall  immune + damage credited
   */
  update(dt, balls, spikeBall) {
    for (const spike of this.spikes) spike.t -= dt;
    this.spikes = this.spikes.filter(s => s.t > 0);

    for (const [key, t] of this._dmgCooldowns) {
      if (t <= 0) this._dmgCooldowns.delete(key);
      else        this._dmgCooldowns.set(key, t - 1);
    }

    for (const ball of balls) {
      this.spikes.forEach((spike, si) => {
        this._resolveSpikeBall(spike, si, ball, spikeBall);
      });
    }
  }

  _resolveSpikeBall(spike, spikeIdx, ball, spikeBall) {
    const hs = spike.size / 2;
    const sx1 = spike.x - hs, sx2 = spike.x + hs;
    const sy1 = spike.y - hs, sy2 = spike.y + hs;

    const cx = Math.max(sx1, Math.min(ball.position.x, sx2));
    const cy = Math.max(sy1, Math.min(ball.position.y, sy2));
    const dx = ball.position.x - cx;
    const dy = ball.position.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist >= ball.radius || dist === 0) return;

    const nx = dx / dist;
    const ny = dy / dist;
    const overlap = ball.radius - dist;
    ball.position = new Vector2(
      ball.position.x + nx * (overlap + 0.5),
      ball.position.y + ny * (overlap + 0.5),
    );

    const dot = ball.velocity.x * nx + ball.velocity.y * ny;
    if (dot < 0) {
      ball.velocity = new Vector2(
        ball.velocity.x - 2 * dot * nx,
        ball.velocity.y - 2 * dot * ny,
      );
    }

    // Spike ball is immune; teammates are immune
    if (spikeBall && ball.id === spikeBall.id) return;
    if (spike.ownerTeam !== 0 && ball.team === spike.ownerTeam) return;

    const key = `${spikeIdx}-${ball.id}`;
    if (this._dmgCooldowns.has(key)) return;

    // Deal damage — attribute to Spike's weapon for dealt tracking
    ball.takeDamage(SPIKE_DAMAGE, null, true);
    if (spikeBall?.weapon) spikeBall.weapon.damageDealt += SPIKE_DAMAGE;
    this._dmgCooldowns.set(key, SPIKE_DMG_COOLDOWN_FRAMES);
  }

  clear() {
    this.spikes = [];
    this._dmgCooldowns.clear();
  }
}