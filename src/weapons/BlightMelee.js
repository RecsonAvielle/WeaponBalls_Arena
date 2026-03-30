/**
 * BlightMelee.js
 * Melee weapon, reach 26, slow spin. Base damage 2 + floor(wave/10), +2 per 2 hits.
 */
import { Weapon }  from './Weapon.js';
import { Vector2 } from '../core/Vector2.js';

export class BlightMelee extends Weapon {
  constructor(wave = 1) {
    super({ name: 'Blight', cooldown: 0.6, color: '#8B1A1A', reach: 26, weaponWidth: 14 });
    this.baseDamage = 2 + Math.floor(wave / 10);
    this._hitCount  = 0;
  }

  get currentDamage() { return this.baseDamage + Math.floor(this._hitCount / 2) * 2; }

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

  render(ctx, x, y, radius, spinAngle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spinAngle);
    const rW = this.scaledReach, rH = this.scaledWeaponWidth;
    ctx.fillStyle   = this.isReady ? this.color : '#ffffff';
    ctx.strokeStyle = '#2C2C2C'; ctx.lineWidth = 1.5;
    ctx.fillRect(radius + 1, -rH / 2, rW, rH);
    ctx.strokeRect(radius + 1, -rH / 2, rW, rH);
    ctx.restore();
  }
}
