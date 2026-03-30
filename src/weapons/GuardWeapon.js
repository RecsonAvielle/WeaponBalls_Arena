/**
 * GuardWeapon.js — Guard ball (Steel blue)
 * Standard melee weapon — same stats as Sword base.
 * Used for testing parry interactions.
 * No damage scaling — flat 2 damage always, clean baseline.
 */
import { Weapon } from './Weapon.js';

export class GuardWeapon extends Weapon {
  constructor() {
    super({ name: 'Guard', cooldown: 0.5, color: '#6B8CAE', reach: 46, weaponWidth: 14 });
    this.baseDamage = 2;
  }

  get currentDamage() { return this.baseDamage; }

  // Guard does not deal damage — exists purely for parry testing
  // (and potentially as a base for a future tank/shield ball type)
  onCollide(owner, target) { return false; }

  render(ctx, x, y, radius, spinAngle) {
    ctx.save();
    ctx.translate(x, y); ctx.rotate(spinAngle);
    const rW = this.reach, rH = 14;
    ctx.fillStyle   = this.isReady ? this.color : '#ffffff';
    ctx.strokeStyle = '#2C2C2C'; ctx.lineWidth = 1.5;
    ctx.fillRect(radius + 1, -rH / 2, rW, rH);
    ctx.strokeRect(radius + 1, -rH / 2, rW, rH);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(radius + 4, -rH / 2 + 3); ctx.lineTo(radius + rW - 4, -rH / 2 + 3);
    ctx.stroke();
    ctx.restore();
  }
}