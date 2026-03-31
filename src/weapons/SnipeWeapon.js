/**
 * SnipeWeapon.js — Snipe ball (Dark teal)
 *
 * Same weapon shape as Surge (reach 46, width 14).
 * Aims at nearest enemy (AIM_SMOOTHING = 6 rad/s — faster than Archer).
 * Parry cooldown: 8s (same as Archer).
 * Fires single shot every FIRE_INTERVAL seconds.
 * Projectile: 40×7px, speed 800px/s.
 * Base damage: 4. +2 per projectile hit. No burst — one shot per interval.
 */
import { Weapon }     from './Weapon.js';
import { Projectile } from '../entities/Projectile.js';
import { Vector2 }    from '../core/Vector2.js';

const AIM_SMOOTHING  = 6.0;
const FIRE_INTERVAL  = 2.5;
const PROJ_SPEED     = 800;
const BASE_DAMAGE    = 2;
const PROJ_W         = 40;
const PROJ_H         = 7;
const WEAPON_REACH   = 46;
const WEAPON_THICK   = 14;
const PARRY_COOLDOWN = 8.0;

export class SnipeWeapon extends Weapon {
  constructor(projSystem) {
    super({ name: 'Snipe', cooldown: 0, color: '#1B4332', reach: WEAPON_REACH, weaponWidth: WEAPON_THICK });
    this.projSystem      = projSystem;
    this.baseDamage      = BASE_DAMAGE;
    this._aimAngle       = 0;
    this._fireTimer      = FIRE_INTERVAL;
    this._parryCooldown  = 0;
    this.targetBalls     = [];
    this.requiresTargeting = true;
  }

  onProjectileHit() {
    this.baseDamage += 1;
    this.hitsLanded++;
  }

  onTick(dt, owner) {
    super.onTick(dt, owner);
    if (this._parryCooldown > 0) this._parryCooldown -= dt;

    // Aim toward nearest enemy
    const targets = this.targetBalls.filter(b => b.alive);
    if (targets.length > 0) {
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
    }
    owner.spinAngle = this._aimAngle;

    if (owner.isFrozen || owner.isImmune) return;

    this._fireTimer -= dt;
    if (this._fireTimer <= 0) {
      this._fire(owner);
      this._fireTimer = FIRE_INTERVAL;
    }
  }

  _fire(owner) {
    const s = this.scale ?? 1;
    this.projSystem.add(new Projectile({
      x          : owner.position.x,
      y          : owner.position.y,
      angle      : this._aimAngle,
      speed      : PROJ_SPEED,
      damage     : this.baseDamage,
      ownerId    : owner.id,
      ownerTeam  : owner.team ?? 0,
      color      : owner.color,
      projWidth  : PROJ_W  * s,
      projHeight : PROJ_H  * s,
      radius     : 5       * s,
    }));
  }

  onParry(owner) {
    this._parryCooldown = PARRY_COOLDOWN;
    this._fireTimer     = FIRE_INTERVAL + 1.0; // reset + 2s penalty
  }

  getWorldSegment(ball) {
    if (this._parryCooldown > 0) return null;
    const cos = Math.cos(ball.spinAngle), sin = Math.sin(ball.spinAngle);
    return {
      start : new Vector2(ball.position.x + ball.radius * cos,                         ball.position.y + ball.radius * sin),
      end   : new Vector2(ball.position.x + (ball.radius + this.scaledReach) * cos,    ball.position.y + (ball.radius + this.scaledReach) * sin),
    };
  }

  onCollide() { return false; }

  render(ctx, x, y, radius, spinAngle) {
    const inCooldown = this._parryCooldown > 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spinAngle);
    const rX = radius + 1;
    const rW = this.scaledReach;        // long axis outward
    const rH = this.scaledWeaponWidth;  // short axis height
    ctx.fillStyle   = inCooldown ? '#AAAAAA' : this.color;
    ctx.strokeStyle = '#2C2C2C';
    ctx.lineWidth   = 1.5;
    ctx.fillRect(rX, -rH / 2, rW, rH);
    ctx.strokeRect(rX, -rH / 2, rW, rH);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(rX + 3,      -rH / 2 + 3);
    ctx.lineTo(rX + rW - 4, -rH / 2 + 3);
    ctx.stroke();
    ctx.restore();
  }
}