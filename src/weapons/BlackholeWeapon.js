/**
 * BlackholeWeapon.js — Blackhole ball (Deep purple)
 *
 * Pellet-size weapon. Aims at nearest enemy (3 rad/s — slower than Archer).
 * Parry cooldown: 8s. Fires every FIRE_INTERVAL seconds.
 * Projectile fires at enemy's CURRENT position at fire-time (no tracking).
 * Projectile does not damage on contact — travels to position then channels.
 * Base damage: 3. +3 per hit instance on channel explosion.
 */
import { Weapon }  from './Weapon.js';
import { Vector2 } from '../core/Vector2.js';

const AIM_SMOOTHING  = 3.0;
const FIRE_INTERVAL  = 3.5;
const PARRY_COOLDOWN = 4.0;

export class BlackholeWeapon extends Weapon {
  constructor(bhSystem) {
    super({ name: 'Blackhole', cooldown: 0, color: '#4A0E8F', reach: 38, weaponWidth: 14 });
    this.bhSystem       = bhSystem;
    this.baseDamage     = 2;
    this._aimAngle      = 0;
    this._fireTimer     = FIRE_INTERVAL;
    this._parryCooldown = 0;
    this.targetBalls    = [];
  }

  onTick(dt, owner) {
    super.onTick(dt, owner);
    if (this._parryCooldown > 0) this._parryCooldown -= dt;

    // Aim
    const targets = this.targetBalls.filter(b => b.alive);
    let nearest = null, nearestDist = Infinity;
    for (const t of targets) {
      const d = owner.position.distanceTo(t.position);
      if (d < nearestDist) { nearestDist = d; nearest = t; }
    }
    if (nearest) {
      const desired = Math.atan2(
        nearest.position.y - owner.position.y,
        nearest.position.x - owner.position.x,
      );
      let diff = desired - this._aimAngle;
      while (diff >  Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this._aimAngle += Math.sign(diff) * Math.min(Math.abs(diff), AIM_SMOOTHING * dt);
    }
    owner.spinAngle = this._aimAngle;

    if (owner.isFrozen || owner.isImmune) return;

    this._fireTimer -= dt;
    if (this._fireTimer <= 0) {
      this._fireTimer = FIRE_INTERVAL;
      // If no target, fire at a fixed distance in current aim direction
      const FIXED_DIST = 200;
      const tx = nearest
        ? nearest.position.x
        : owner.position.x + Math.cos(this._aimAngle) * FIXED_DIST;
      const ty = nearest
        ? nearest.position.y
        : owner.position.y + Math.sin(this._aimAngle) * FIXED_DIST;
      this.bhSystem.fire({
        fromX       : owner.position.x,
        fromY       : owner.position.y,
        targetX     : tx,
        targetY     : ty,
        damage      : this.baseDamage,
        pullRadius  : 100 * (this.scale ?? 1),
        color       : owner.color,
        ownerId     : owner.id,
        ownerTeam   : owner.team ?? 0,
        ownerWeapon : this,
      });
    }
  }

  onParry(owner) { this._parryCooldown = PARRY_COOLDOWN; }

  getWorldSegment(ball) {
    if (this._parryCooldown > 0) return null;
    const cos = Math.cos(ball.spinAngle), sin = Math.sin(ball.spinAngle);
    return {
      start : new Vector2(ball.position.x + ball.radius * cos,
                          ball.position.y + ball.radius * sin),
      end   : new Vector2(ball.position.x + (ball.radius + this.scaledReach) * cos,
                          ball.position.y + (ball.radius + this.scaledReach) * sin),
    };
  }

  onCollide() { return false; }

  render(ctx, x, y, radius, spinAngle) {
    const inCooldown = this._parryCooldown > 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spinAngle);
    const rX = radius + 1, rW = this.scaledReach, rH = this.scaledWeaponWidth;
    ctx.fillStyle   = inCooldown ? '#AAAAAA' : this.color;
    ctx.strokeStyle = '#2C2C2C'; ctx.lineWidth = 1.5;
    ctx.fillRect(rX, -rH / 2, rW, rH);
    ctx.strokeRect(rX, -rH / 2, rW, rH);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rX + 3, -rH / 2 + 3); ctx.lineTo(rX + rW - 4, -rH / 2 + 3);
    ctx.stroke();
    ctx.restore();
  }
}