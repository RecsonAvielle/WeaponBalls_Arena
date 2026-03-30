/**
 * WaveSystem.js
 * Manages wave progression for the Wave Arena.
 *
 * Wave pattern (loops 1-5, every 10 replaces wave 5 slot with Giga):
 *   1: 5 Weaponless
 *   2: 4 Melee
 *   3: 3 Ranged + 3 Melee
 *   4: 10 Weaponless (1/5 HP)
 *   5: 2 Melee (2x HP) + 3 Weaponless
 *   10,20,30...: Giga (alt W/M) + escorts, replaces wave-5 slot
 *
 * Scaling: base HP = 40 + floor(wave/5)*10. Damage +1 per 10 waves.
 * Old blight do NOT receive new scaling — only freshly spawned ones.
 */

export class WaveSystem {
  constructor() {
    this.wave          = 0;
    this.active        = false;
    this._timer        = 0;       // 20s fallback timer
    this._nextWaveIn   = 0;       // brief pause before next wave drops
    this._gigaType     = 'weaponless'; // alternates each giga wave
    this.pendingSpawns = [];      // { type, count, hpMult, dmgMult, isGiga }
    this.onSpawn       = null;    // callback(spawnList, wave)
    this.onWaveEnd     = null;    // callback(wave)
  }

  start() {
    this.wave    = 0;
    this.active  = true;
    this._advanceWave();
  }

  /** Call each frame. blightBalls = currently alive blight balls. */
  update(dt, blightBalls) {
    if (!this.active) return;

    if (this._nextWaveIn > 0) {
      this._nextWaveIn -= dt;
      if (this._nextWaveIn <= 0) this._advanceWave();
      return;
    }

    const blightAlive = blightBalls.filter(b => b.alive).length;

    if (blightAlive === 0) {
      // All blight dead — short pause then next wave
      this._nextWaveIn = 2.0;
      this._timer      = 0;
    } else {
      this._timer -= dt;
      if (this._timer <= 0) {
        // 20s elapsed — drop next wave without clearing old blight
        this._nextWaveIn = 1.0;
        this._timer      = 0;
      }
    }
  }

  get timeLeft()   { return Math.max(0, this._timer); }
  get isWaiting()  { return this._nextWaveIn > 0; }

  _advanceWave() {
    this.wave++;
    this._timer = 20;

    const w      = this.wave;
    const slot   = ((w - 1) % 5) + 1; // 1-5 cycle
    const isGiga = w % 10 === 0;

    const baseHp = 40 + Math.floor(w / 5) * 10;
    const list   = [];

    if (isGiga) {
      const gigaType = this._gigaType;
      this._gigaType = gigaType === 'weaponless' ? 'melee' : 'weaponless';
      list.push({ type: gigaType, count: 1, hpMult: 8, dmgMult: 2, isGiga: true, baseHp });
      if (gigaType === 'weaponless') {
        list.push({ type: 'ranged', count: 2, hpMult: 1, dmgMult: 1, isGiga: false, baseHp });
      } else {
        list.push({ type: 'melee', count: 3, hpMult: 1, dmgMult: 1, isGiga: false, baseHp });
      }
    } else {
      switch (slot) {
        case 1: list.push({ type: 'weaponless', count: 5,  hpMult: 1,   dmgMult: 1, baseHp }); break;
        case 2: list.push({ type: 'melee',      count: 4,  hpMult: 1,   dmgMult: 1, baseHp }); break;
        case 3:
          list.push({ type: 'ranged', count: 3, hpMult: 1, dmgMult: 1, baseHp });
          list.push({ type: 'melee',  count: 3, hpMult: 1, dmgMult: 1, baseHp });
          break;
        case 4: list.push({ type: 'weaponless', count: 10, hpMult: 0.2, dmgMult: 1, baseHp }); break;
        case 5:
          list.push({ type: 'melee',      count: 2, hpMult: 2, dmgMult: 1, baseHp });
          list.push({ type: 'weaponless', count: 3, hpMult: 1, dmgMult: 1, baseHp });
          break;
      }
    }

    this.onSpawn?.(list, w);
  }

  stop() { this.active = false; }
  reset() { this.wave = 0; this.active = false; this._timer = 0; this._nextWaveIn = 0; this._gigaType = 'weaponless'; }
}
