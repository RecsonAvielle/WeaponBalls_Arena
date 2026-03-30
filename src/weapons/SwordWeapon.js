/**
 * SwordWeapon.js — Sword ball (Red)
 *
 * Scaling: +2 damage per hit (hit 1 → 2, hit 2 → 4, hit 3 → 6 ...)
 * Spin bonus: +1% of base per hit, capped at +20%.
 */
import { Weapon } from './Weapon.js';

export class SwordWeapon extends Weapon {
  constructor() {
    super({ name: 'Sword', cooldown: 0.5, color: '#E63946', reach: 46, weaponWidth: 14 });
    this.baseDamage = 2;
  }

  get currentDamage() { return this.baseDamage + this.hitsLanded * 2; }

  onTick(dt, owner) {
    super.onTick(dt, owner);
    const bonus = Math.min(this.hitsLanded * 0.01, 0.20);
    owner.spinSpeed = owner.baseSpinSpeed * (1 + bonus);
  }

  onCollide(owner, target) {
    if (!this.isReady || !target.alive || target.isImmune) return false;
    const dmg = this.currentDamage;
    target.takeDamage(dmg, owner);
    this.damageDealt += dmg;
    this.hitsLanded++;
    this.resetCooldown();
    return true;
  }

  render(ctx, x, y, radius, spinAngle) {
    renderRect(ctx, x, y, radius, spinAngle, this.scaledReach, this.scaledWeaponWidth, this.isReady ? this.color : '#fff');
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