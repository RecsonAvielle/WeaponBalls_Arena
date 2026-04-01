/**
 * DaggerWeapon.js — Dagger ball (Orange)
 *
 * Passive: +200% spin speed from the start.
 * Per hit: +5% spin speed (from base), NO CAP.
 * Damage: flat 2 always. NO knockback on hit — target stays put,
 *   giving Dagger a chance to land consecutive hits.
 * Reach: 26 (same as Trapper — short but fast).
 */
import { Weapon } from './Weapon.js';

const PASSIVE_BONUS = 2.50; // +250% // +200%

export class DaggerWeapon extends Weapon {
  constructor() {
    super({ name: 'Dagger', cooldown: 0.28, color: '#F4A261', reach: 26, weaponWidth: 14 });
    this.baseDamage = 2;
  }

  onTick(dt, owner) {
    super.onTick(dt, owner);
    // No cap on hit bonus
    const hitBonus = this.hitsLanded * 0.10; // +10% per hit
    owner.spinSpeed = owner.baseSpinSpeed * (1 + PASSIVE_BONUS + hitBonus);
  }

  onCollide(owner, target) {
    if (!this.isReady || !target.alive || target.isImmune) return false;
    // Silent = true — skips velocity burst so target doesn't get knocked away
    target.takeDamage(this.baseDamage, null, true);
    this.damageDealt += this.baseDamage;
    this.hitsLanded++;
    this.resetCooldown();
    return true;
  }

  onParry(owner, target) {
      const bonus = (owner.spinSpeed - owner.baseSpinSpeed) / owner.baseSpinSpeed;
      if (bonus >= 3.0) {
          const parryDamage = Math.floor(bonus - 2);
          target.takeDamage(parryDamage, owner, false);
          
          this.damageDealt += parryDamage;
          // Note: Hitting via parry DOES trigger scaling
          this.hitsLanded += 1;
      }
  }

  render(ctx, x, y, radius, spinAngle) {
    renderRect(ctx, x, y, radius, spinAngle, this.scaledReach, this.scaledWeaponWidth,
      this.isReady ? this.color : '#ffffff');
  }
}

function renderRect(ctx, x, y, radius, spinAngle, w, h, color) {
  ctx.save();
  ctx.translate(x, y); ctx.rotate(spinAngle);
  ctx.fillStyle = color; ctx.strokeStyle = '#2C2C2C'; ctx.lineWidth = 1.5;
  ctx.fillRect(radius + 1, -h / 2, w, h);
  ctx.strokeRect(radius + 1, -h / 2, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(radius + 4, -h / 2 + 3); ctx.lineTo(radius + w - 4, -h / 2 + 3);
  ctx.stroke();
  ctx.restore();
}