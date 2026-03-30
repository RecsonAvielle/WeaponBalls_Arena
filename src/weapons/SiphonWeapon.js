/**
 * SiphonWeapon.js — Siphon ball (Blue)
 *
 * Damage: starts at 2, +1 per hit.
 * Lifesteal: starts at 1 flat HP per hit, +1 per 4 hits. Overcap allowed.
 * Ally interaction (team mode): touching an ally heals them by currentLifesteal.
 *   Ally heals do not increment hitsLanded.
 */
import { Weapon } from './Weapon.js';

export class SiphonWeapon extends Weapon {
  constructor() {
    super({ name: 'Siphon', cooldown: 0.65, color: '#457B9D', reach: 46, weaponWidth: 14 });
    this.baseDamage  = 2;
    this.isBodyWeapon = false;
  }

  get currentDamage()    { return this.baseDamage + this.hitsLanded; }
  get currentLifesteal() { return 1 + Math.floor(this.hitsLanded / 4); }

  onCollide(owner, target) {
    if (!this.isReady || !target.alive || target.isImmune) return false;

    const isAlly = owner.team !== 0 && owner.team === target.team;

    if (isAlly) {
      target.hp += this.currentLifesteal; // overcap allowed
      this.damageDealt += this.currentLifesteal;
      this.resetCooldown();
      return true;
    }

    const dmg = this.currentDamage;
    target.takeDamage(dmg, owner);
    owner.hp += this.currentLifesteal; // overcap allowed
    this.damageDealt += dmg;
    this.hitsLanded++;
    this.resetCooldown();
    return true;
  }

  render(ctx, x, y, radius, spinAngle) {
    renderRect(ctx, x, y, radius, spinAngle, this.scaledReach, this.scaledWeaponWidth,
      this.isReady ? this.color : '#fff');
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