/**
 * GameLoop.js
 * A fixed-timestep game loop using requestAnimationFrame.
 *
 * Why fixed timestep?
 *   Physics (velocity, collision) must be deterministic regardless of frame rate.
 *   We accumulate real elapsed time and simulate in fixed steps.
 *   Any leftover time carries over to the next frame.
 *
 * Usage:
 *   const loop = new GameLoop({ update, render });
 *   loop.start();
 */
export class GameLoop {
  /**
   * @param {object} callbacks
   * @param {(dt: number) => void} callbacks.update  - called with fixed dt in seconds
   * @param {(alpha: number) => void} callbacks.render - called with interpolation alpha [0,1]
   * @param {number} [targetFPS=60]
   */
  constructor({ update, render, targetFPS = 60 }) {
    this._update   = update;
    this._render   = render;
    this._stepMs   = 1000 / targetFPS;   // fixed step in milliseconds
    this._stepSec  = this._stepMs / 1000; // same in seconds (passed to update)

    this._accumulator = 0;
    this._lastTime    = null;
    this._rafId       = null;
    this._running     = false;
  }

  start() {
    if (this._running) return;
    this._running  = true;
    this._lastTime = performance.now();
    this._rafId    = requestAnimationFrame(this._tick.bind(this));
  }

  stop() {
    this._running = false;
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
  }

  get isRunning() { return this._running; }

  _tick(timestamp) {
    if (!this._running) return;

    // Clamp elapsed to avoid a "spiral of death" if the tab was backgrounded
    const elapsed = Math.min(timestamp - this._lastTime, 200);
    this._lastTime     = timestamp;
    this._accumulator += elapsed;

    // Consume accumulated time in fixed steps
    while (this._accumulator >= this._stepMs) {
      this._update(this._stepSec);
      this._accumulator -= this._stepMs;
    }

    // Alpha tells the renderer how far we are between the last two steps (0–1)
    const alpha = this._accumulator / this._stepMs;
    this._render(alpha);

    this._rafId = requestAnimationFrame(this._tick.bind(this));
  }
}
