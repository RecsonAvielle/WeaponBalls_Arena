/**
 * ArcherWeapon.js — Archer ball
 *
 * WEAPON: same rectangle template as melee weapons, but rotated 90°
 *   so height becomes the long axis (length=44, width=14 → appears tall & narrow).
 *   This makes it easy to replace with a sprite — same ctx.drawImage() approach.
 *   CAN parry. CANNOT deal contact damage (onCollide always returns false).
 *
 * PROJECTILES:
 *   Fires a burst of shotCount arrows. Base: 1. +1 each time any projectile
 *   deals damage (onProjectileHit is called by ProjectileSystem).
 *   Between shots in a burst: 0.15s. Between bursts: 1.5s.
 *
 * AIMING: spinAngle is driven by this weapon — points at nearest enemy smoothly.
 */
import { Weapon }     from './Weapon.js';
import { Projectile } from '../entities/Projectile.js';
import { Vector2 }    from '../core/Vector2.js';

const PROJECTILE_SPEED = 640;
const BURST_INTERVAL   = 1.5;
const SHOT_DELAY       = 0.15;
const AIM_SMOOTHING    = 5.0; // slower rotation — enemies have more time to approach   // rad/s turn speed
const ARROW_DAMAGE     = 2;

// Weapon rectangle dimensions — swapped vs melee (reach=height, width=14)
const WEAPON_REACH = 46; // long axis (was width in melee)
const WEAPON_THICK = 14; // short axis (was height in melee)

export class ArcherWeapon extends Weapon {
  constructor(projSystem) {
    super({ name: 'Bow', cooldown: 0, color: '#D4A017', reach: WEAPON_REACH, weaponWidth: WEAPON_THICK });
    this.projSystem     = projSystem;
    this.baseDamage     = ARROW_DAMAGE;
    this.shotCount      = 1;
    this._shotsLeft     = 0;
    this._shotTimer     = 0;
    this._intervalTimer = 0;
    this._aimAngle      = 0;
    this.targetBalls    = [];
    this._parryCooldown = 0; // seconds remaining before parry is available again
    this.requiresTargeting = true;
  }

  /**
   * Called by ProjectileSystem when one of our arrows deals damage.
   * Increments shotCount so next burst fires more arrows.
   */
  onProjectileHit() {
    this.shotCount++;
    this.hitsLanded++;
  }

  onTick(dt, owner) {
    super.onTick(dt, owner);
    if (this._parryCooldown > 0) this._parryCooldown -= dt;

    // ── Aim toward nearest alive enemy ───────────────────────────────────
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

    // Weapon angle is fully controlled here — overrides spinAngle
    owner.spinAngle = this._aimAngle;

    if (owner.isFrozen || owner.isImmune) return;

    // ── Burst state machine ───────────────────────────────────────────────
    if (this._shotsLeft > 0) {
      this._shotTimer -= dt;
      if (this._shotTimer <= 0) {
        this._fireProjectile(owner);
        this._shotsLeft--;
        this._shotTimer = this._shotsLeft > 0 ? SHOT_DELAY : 0;
        if (this._shotsLeft === 0) this._intervalTimer = BURST_INTERVAL;
      }
    } else {
      this._intervalTimer -= dt;
      if (this._intervalTimer <= 0) {
        this._shotsLeft = this.shotCount;
        this._shotTimer = 0;
      }
    }
  }

  _fireProjectile(owner) {
    const s = this.scale ?? 1;
    this.projSystem.add(new Projectile({
      x          : owner.position.x,
      y          : owner.position.y,
      angle      : this._aimAngle,
      speed      : PROJECTILE_SPEED,
      damage     : ARROW_DAMAGE,
      ownerId    : owner.id,
      ownerTeam  : owner.team ?? 0,
      color      : owner.color,
      projWidth  : 40 * s,
      projHeight : 7  * s,
      radius     : 5  * s,
    }));
  }

  /**
   * Segment runs ACROSS the weapon face (perpendicular to aim),
   * positioned at depth WEAPON_THICK outward from ball edge.
   * This matches what the eye sees — a wide flat face in front of the ball.
   */
  /** After a parry, block parrying for 3 seconds — still shoots freely. */
  onParry(owner) {
    this._parryCooldown = 8.0; // 8s window — gives enemies real chance to close in
  }

  /** Returns null during parry cooldown so CombatSystem skips parry checks. */
  getWorldSegment(ball) {
    if (this._parryCooldown > 0) return null;
    const angle  = ball.spinAngle;
    const fx = Math.cos(angle), fy = Math.sin(angle);
    const rx = -fy,             ry =  fx;
    const depth = ball.radius + 1 + this.scaledWeaponWidth;
    const cx    = ball.position.x + fx * depth;
    const cy    = ball.position.y + fy * depth;
    const half  = this.scaledReach / 2;
    return {
      start : new Vector2(cx - rx * half, cy - ry * half),
      end   : new Vector2(cx + rx * half, cy + ry * half),
    };
  }

  // No contact damage
  onCollide() { return false; }

  render(ctx, x, y, radius, spinAngle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spinAngle);

    const rX = radius + 1;
    const rW = this.scaledWeaponWidth;
    const rH = this.scaledReach;

    const inCooldown = this._parryCooldown > 0;
    ctx.fillStyle   = inCooldown ? '#AAAAAA' : this.color;
    ctx.strokeStyle = '#2C2C2C';
    ctx.lineWidth   = 1.5;
    ctx.fillRect(rX, -rH / 2, rW, rH);
    ctx.strokeRect(rX, -rH / 2, rW, rH);

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(rX + 3,      -rH / 2 + 3);
    ctx.lineTo(rX + rW - 3, -rH / 2 + 3);
    ctx.stroke();

    ctx.restore();
  }
}