/**
 * BlightWeaponless.js
 * Body weapon. Contact damage starts at (1 + floor(wave/10)), +1 per 2 hits.
 */
import { Weapon } from './Weapon.js';

export class BlightWeaponless extends Weapon {
  constructor(wave = 1) {
    super({ name: 'Blight', cooldown: 0.35, color: '#6B2D8B', reach: 0, weaponWidth: 0 });
    this.isBodyWeapon = true;
    this.baseDamage   = 1 + Math.floor(wave / 10);
    this._hitCount    = 0; // tracks hits for per-2-hit bonus
  }

  get currentDamage() { return this.baseDamage + Math.floor(this._hitCount / 2); }

  onCollide(owner, target) {
    if (!this.isReady || !target.alive || target.isImmune) return false;
    const dmg = this.currentDamage;
    target.takeDamage(dmg, owner);
    this.damageDealt += dmg;
    this._hitCount++;
    this.hitsLanded++;
    this.resetCooldown();
    return true;
  }

  render() {}
  getWorldSegment() { return null; }
}
