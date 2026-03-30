/**
 * EffectsSystem.js
 * Manages purely visual transient effects — things that have no game-logic
 * impact, only rendering impact.
 *
 * Currently: death pops.
 * Future candidates: hit sparks, frost crystals, heal pulses, crit flashes.
 *
 * Usage:
 *   const effects = new EffectsSystem();
 *   effects.spawnPop(ball);          // call on BALL_DIED
 *   effects.update(dt);              // call each physics step
 *   renderer.render(..., effects.pops, ...);
 */

export class EffectsSystem {
  constructor() {
    /** @type {Array<{x,y,color,radius,t,maxT}>} */
    this.pops = [];
  }

  /**
   * Spawn a death-pop effect at the ball's last position.
   * @param {import('../entities/Ball.js').Ball} ball
   */
  spawnPop(ball) {
    const POP_DURATION = 0.45;
    this.pops.push({
      x      : ball.position.x,
      y      : ball.position.y,
      color  : ball.color,
      radius : ball.radius,
      t      : POP_DURATION,
      maxT   : POP_DURATION,
    });
  }

  /**
   * Advance all active effects, removing expired ones.
   * @param {number} dt  seconds per physics step
   */
  update(dt) {
    for (const pop of this.pops) pop.t -= dt;
    this.pops = this.pops.filter(p => p.t > 0);
  }

  /** Clear all effects — call on reset. */
  clear() {
    this.pops = [];
  }
}
