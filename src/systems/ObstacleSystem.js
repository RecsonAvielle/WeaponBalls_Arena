/**
 * ObstacleSystem.js
 * Permanent rectangular obstacles — balls bounce off, projectiles are destroyed.
 *
 * Used by the "Large Center Wall" arena to place a square block in the middle.
 * Can hold multiple obstacles for future arena designs.
 *
 * Usage:
 *   const obs = new ObstacleSystem([{ x, y, width, height }]);
 *   obs.resolveBalls(aliveBalls);          // call each physics step
 *   obs.resolveProjectile(proj);           // call from ProjectileSystem
 *   renderer.render(..., obs.obstacles);
 */

import { Vector2 } from '../core/Vector2.js';

export class ObstacleSystem {
  /** @param {Array<{x,y,width,height}>} obstacles */
  constructor(obstacles = []) {
    this.obstacles = obstacles;
  }

  /** Push all alive balls out of any overlapping obstacles and bounce them. */
  resolveBalls(balls) {
    for (const ball of balls) {
      for (const obs of this.obstacles) {
        this._resolveBallObstacle(ball, obs);
      }
    }
  }

  /**
   * Check if a projectile overlaps any obstacle — destroy it if so.
   * Called by ProjectileSystem before ball checks.
   * @param {import('../entities/Projectile.js').Projectile} proj
   * @returns {boolean} true if projectile was destroyed
   */
  resolveProjectile(proj) {
    for (const obs of this.obstacles) {
      const cx = Math.max(obs.x, Math.min(proj.position.x, obs.x + obs.width));
      const cy = Math.max(obs.y, Math.min(proj.position.y, obs.y + obs.height));
      const dx = proj.position.x - cx;
      const dy = proj.position.y - cy;
      if (dx * dx + dy * dy < proj.radius * proj.radius) {
        proj.alive = false;
        return true;
      }
    }
    return false;
  }

  _resolveBallObstacle(ball, obs) {
    const cx = Math.max(obs.x, Math.min(ball.position.x, obs.x + obs.width));
    const cy = Math.max(obs.y, Math.min(ball.position.y, obs.y + obs.height));
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
  }
}
