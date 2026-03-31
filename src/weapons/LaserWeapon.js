/**
 * LaserWeapon.js — Laser ball (Red-orange)
 *
 * Ranged ball. Aims at nearest enemy (6 rad/s).
 * Parry window 8s — weapon grays out during cooldown.
 * Fire cycle: 2.5s wait → 1s channel (aim locked, ball still moves) → fire.
 * On fire: pierces ALL enemy balls in path to wall. Base damage 2, +2 per ball hit.
 * Channel visual: weapon turns orange and glows.
 */
import { Weapon }  from './Weapon.js';
import { Vector2 } from '../core/Vector2.js';

const AIM_SMOOTHING  = 6.0;
const FIRE_INTERVAL  = 1.2;
const CHANNEL_TIME   = 0.25;
const PARRY_COOLDOWN = 4.0;

export class LaserWeapon extends Weapon {
  constructor(laserSystem) {
    super({ name: 'Laser', cooldown: 0, color: '#FF3D00', reach: 46, weaponWidth: 14 });
    this.laserSystem    = laserSystem;
    this.baseDamage     = 2;
    this._aimAngle      = 0;
    this._fireTimer     = FIRE_INTERVAL;
    this._channeling    = false;
    this._channelTimer  = 0;
    this._parryCooldown = 0;
    this.targetBalls    = [];
  }

  onTick(dt, owner) {
    super.onTick(dt, owner);
    if (this._parryCooldown > 0) this._parryCooldown -= dt;

    // Aim — frozen while channeling so shot direction is committed
    if (!this._channeling) {
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
    }
    owner.spinAngle = this._aimAngle;

    if (owner.isFrozen || owner.isImmune) return;

    if (this._channeling) {
      this._channelTimer -= dt;
      if (this._channelTimer <= 0) {
        this._channeling = false;
        this._fireTimer  = FIRE_INTERVAL;
        this.laserSystem.fire({
          owner,
          angle      : this._aimAngle,
          balls      : this.targetBalls,
          ownerWeapon: this,
          obstacleSystem: owner._obstacleSystem ?? null,
        });
      }
    } else {
      this._fireTimer -= dt;
      if (this._fireTimer <= 0) {
        this._channeling   = true;
        this._channelTimer = CHANNEL_TIME;
      }
    }
  }

  onParry(owner) { this._parryCooldown = PARRY_COOLDOWN; }

  getWorldSegment(ball) {
    if (this._parryCooldown > 0) return null;
    const cos = Math.cos(ball.spinAngle), sin = Math.sin(ball.spinAngle);
    return {
      start: new Vector2(
        ball.position.x + ball.radius * cos,
        ball.position.y + ball.radius * sin,
      ),
      end: new Vector2(
        ball.position.x + (ball.radius + this.scaledReach) * cos,
        ball.position.y + (ball.radius + this.scaledReach) * sin,
      ),
    };
  }

  onCollide() { return false; }

  render(ctx, x, y, radius, spinAngle) {
    const inParryCooldown = this._parryCooldown > 0;
    const color = inParryCooldown  ? '#AAAAAA'
                : this._channeling ? '#FFAA00'
                : this.color;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spinAngle);
    const rX = radius + 1, rW = this.scaledReach, rH = this.scaledWeaponWidth;

    ctx.fillStyle   = color;
    ctx.strokeStyle = '#2C2C2C';
    ctx.lineWidth   = 1.5;
    ctx.fillRect(rX, -rH / 2, rW, rH);
    ctx.strokeRect(rX, -rH / 2, rW, rH);

    // Growing glow outline during channel
    if (this._channeling) {
      const prog = 1 - this._channelTimer / CHANNEL_TIME;
      ctx.strokeStyle = `rgba(255,170,0,${0.4 + prog * 0.5})`;
      ctx.lineWidth   = 2 + prog * 3;
      ctx.strokeRect(rX - 2, -rH / 2 - 2, rW + 4, rH + 4);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(rX + 3, -rH / 2 + 3);
    ctx.lineTo(rX + rW - 4, -rH / 2 + 3);
    ctx.stroke();
    ctx.restore();
  }
}