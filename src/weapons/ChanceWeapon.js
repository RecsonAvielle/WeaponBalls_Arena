/**
 * ChanceWeapon.js — Chance ball (Purple)
 *
 * Base damage: always 2 on normal hits.
 * Per hit: +2% crit chance, +3 flat crit bonus damage.
 * Crit deals: 2 + (hitsLanded * 3).
 */
import { Weapon } from './Weapon.js';

export class ChanceWeapon extends Weapon {
  constructor() {
    super({ name: 'Chance', cooldown: 0.9, color: '#6D4C9C', reach: 46, weaponWidth: 14 });
    this.baseDamage = 2;
    this.lastCrit   = false;
  }

  get critChance() { return Math.min(0.06 + this.hitsLanded * 0.02, 1.0); }
  get critDamage() { return 9 + this.hitsLanded * 3; }

  onCollide(owner, target) {
    if (!this.isReady || !target.alive || target.isImmune) return false;
    const isCrit    = Math.random() < this.critChance;
    const dmg       = isCrit ? this.critDamage : this.baseDamage;
    this.lastCrit   = isCrit;
    target.takeDamage(dmg, owner);
    this.damageDealt += dmg;
    this.hitsLanded++;
    this.resetCooldown();
    return true;
  }

  render(ctx, x, y, radius, spinAngle) {
    const color = this.lastCrit && !this.isReady
      ? '#FFD700'
      : this.isReady ? this.color : '#fff';
    renderRect(ctx, x, y, radius, spinAngle, this.scaledReach, this.scaledWeaponWidth, color);
  }
}

function renderRect(ctx, x, y, radius, spinAngle, w, h, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(spinAngle);
  ctx.fillStyle = color; ctx.strokeStyle = '#2C2C2C'; ctx.lineWidth = 1.5;
  ctx.fillRect(radius + 1, -h / 2, w, h);
  ctx.strokeRect(radius + 1, -h / 2, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(radius + 4, -h / 2 + 3); ctx.lineTo(radius + w - 4, -h / 2 + 3);
  ctx.stroke();
  ctx.restore();
}