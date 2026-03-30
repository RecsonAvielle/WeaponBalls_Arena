/**
 * SpikeWeapon.js — Spike ball (Brown)
 *
 * Melee weapon. On each hit: spawns a spike hazard at the midpoint between balls.
 * Base spike duration: 5s. +1s per hit landed.
 * Spike damages all balls except Spike ball (handled by SpikeSystem).
 */
import { Weapon } from './Weapon.js';

export class SpikeWeapon extends Weapon {
  constructor(spikeSystem) {
    super({ name: 'Spike', cooldown: 0.7, color: '#A0522D', reach: 26, weaponWidth: 14 });
    this.baseDamage   = 2;
    this.baseDuration = 5.0;
    this.spikeSystem  = spikeSystem;
  }

  get currentDuration() { return this.baseDuration + this.hitsLanded * 1.0; }

  onCollide(owner, target) {
    if (!this.isReady || !target.alive || target.isImmune) return false;

    target.takeDamage(this.baseDamage, owner);
    this.damageDealt += this.baseDamage;

    const mx = (owner.position.x + target.position.x) / 2;
    const my = (owner.position.y + target.position.y) / 2;
    this.spikeSystem.spawn({
      x        : mx,
      y        : my,
      duration : this.currentDuration,
      color    : owner.color,
      ownerTeam: owner.team ?? 0,
      size     : 18 * (this.scale ?? 1),
    });

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
  ctx.moveTo(radius + 4, -h / 2 + 3);
  ctx.lineTo(radius + w - 4, -h / 2 + 3);
  ctx.stroke();
  ctx.restore();
}