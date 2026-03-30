/**
 * VenomWeapon.js — Venom ball
 *
 * DoT model: 1 damage every TICK_INTERVAL seconds, until total = currentDamage.
 *   Duration = currentDamage × TICK_INTERVAL (scales with damage).
 *   At base 2 dmg: 2 ticks × 0.15s = 0.3s duration.
 *   At 10 dmg: 10 ticks × 0.15s = 1.5s duration.
 *
 * Scaling: +2 base damage per weapon hit.
 * Parry bonus: every 4 parries → baseDamage += 1.
 *
 * Reapply: same weapon cannot reapply until its own venom expires on target.
 */
import { Weapon } from './Weapon.js';

const TICK_INTERVAL = 0.15;

export class VenomWeapon extends Weapon {
  constructor() {
    super({ name: 'Venom', cooldown: 0.55, color: '#A8C256', reach: 56, weaponWidth: 14 });
    this.baseDamage = 2;
    this.parryCount = 0;
    this._sourceKey = `venom-${Math.random().toString(36).slice(2, 7)}`;
  }

  get parryBonus()    { return Math.floor(this.parryCount / 4); }
  get currentDamage() { return this.baseDamage + this.parryBonus + this.hitsLanded * 2; }

  /** Duration scales with damage so more damage = longer lasting venom */
  get currentDuration() { return this.currentDamage * TICK_INTERVAL; }

  onParry(owner) { this.parryCount++; }

  onCollide(owner, target) {
    if (!this.isReady || !target.alive || target.isImmune) return false;
    if (target.effects.burn?.sourceId === this._sourceKey) return false;

    target.applyEffect('burn', {
      duration     : this.currentDuration,
      tickDamage   : 1,                // always 1 per tick
      tickInterval : TICK_INTERVAL,
      tickTimer    : 0,
      dps          : 0,
      sourceId     : this._sourceKey,
    });

    this.damageDealt += this.currentDamage;
    this.hitsLanded++;
    this.resetCooldown();
    return true;
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