/**
 * EventBus.js
 * A lightweight publish/subscribe event system.
 *
 * Why do we need this?
 *   Without it, systems call each other directly — Ball calls Renderer,
 *   Renderer calls RoundManager, etc. That creates a web of tight coupling
 *   that's hard to extend and impossible to test in isolation.
 *
 *   With EventBus, each system only knows about the bus:
 *     - A ball takes damage  → emits 'ball:damaged'
 *     - A ball dies          → emits 'ball:died'
 *     - The UI listens       → updates the HUD
 *     - The RoundManager listens → checks win condition
 *   No system knows the others exist.
 *
 * Usage:
 *   import { bus } from './EventBus.js';
 *
 *   bus.on('ball:died', ({ ball }) => { ... });
 *   bus.emit('ball:died', { ball });
 *   bus.off('ball:died', handler);   // cleanup
 */

class EventBus {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this._listeners = new Map();
  }

  /**
   * Subscribe to an event.
   * @param {string}   event
   * @param {Function} handler
   */
  on(event, handler) {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set());
    }
    this._listeners.get(event).add(handler);
  }

  /**
   * Unsubscribe a handler from an event.
   * @param {string}   event
   * @param {Function} handler
   */
  off(event, handler) {
    this._listeners.get(event)?.delete(handler);
  }

  /**
   * Publish an event with an optional payload.
   * @param {string} event
   * @param {*}      [payload]
   */
  emit(event, payload) {
    const handlers = this._listeners.get(event);
    if (!handlers) return;
    for (const handler of handlers) {
      handler(payload);
    }
  }

  /** Remove all listeners (useful for round resets). */
  clear() {
    this._listeners.clear();
  }
}

// Export a single shared instance — every module imports the same bus.
export const bus = new EventBus();

/**
 * Canonical event names used across the game.
 * Keeping them here prevents typos and makes events discoverable.
 */
export const EVENTS = {
  BALL_DAMAGED : 'ball:damaged',   // { ball, amount, source }
  BALL_HEALED  : 'ball:healed',    // { ball, amount }
  BALL_DIED    : 'ball:died',      // { ball, killer }
  BALL_STUNNED : 'ball:stunned',   // { ball, duration }
  ROUND_START  : 'round:start',    // { balls }
  ROUND_END    : 'round:end',      // { winner }           (step 6)
};
