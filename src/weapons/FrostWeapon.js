/**
 * FrostWeapon.js — Frost (Teal)
 *
 * Weapon frost (on direct hit): -35% speed, -25% spin. Duration scales with hits.
 * Area frost (from frost circle left on hit): -35% speed, -25% spin while inside.
 * Stacked (hit + in area): -70% speed, -50% spin.
 */
import { Weapon } from './Weapon.js';

export class FrostWeapon extends Weapon {
  constructor(frostAreaSystem) {
    super({ name: 'Frost', cooldown: 0.5, color: '#2A9D8F', reach: 46, weaponWidth: 14 });
    this.baseDamage     = 2;
    this.baseFrostDur   = 3.0;
    this.frostAreaSystem = frostAreaSystem;
  }

  get currentDamage()   { return this.baseDamage + this.hitsLanded; }
  get currentFrostDur() { return this.baseFrostDur + this.hitsLanded * 0.5; }

  onCollide(owner, target) {
    if (!this.isReady || !target.alive || target.isImmune) return false;

    const dmg = this.currentDamage;
    target.takeDamage(dmg, owner);
    this.damageDealt += dmg;

    // Weapon frost: reduced to 35% speed, 25% spin
    target.applyEffect('frost', {
      duration    : this.currentFrostDur,
      speedFactor : 0.65, // -35% max speed
      spinFactor  : 0.75, // -25% spin speed
    });

    // Leave a frost area at midpoint between balls
    const mx = (owner.position.x + target.position.x) / 2;
    const my = (owner.position.y + target.position.y) / 2;
    this.frostAreaSystem?.spawn({
      x        : mx,
      y        : my,
      duration : this.currentFrostDur,
      color    : this.color,
      ownerTeam: owner.team ?? 0,
      scale    : this.scale ?? 1,
    });

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
  ctx.fillStyle   = color;
  ctx.strokeStyle = '#2C2C2C';
  ctx.lineWidth   = 1.5;
  ctx.fillRect(radius + 1, -h / 2, w, h);
  ctx.strokeRect(radius + 1, -h / 2, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth   = 1;
  ctx.beginPath();
  ctx.moveTo(radius + 4, -h / 2 + 3);
  ctx.lineTo(radius + w - 4, -h / 2 + 3);
  ctx.stroke();
  ctx.restore();
}