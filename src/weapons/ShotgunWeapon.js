/**
 * ShotgunWeapon.js — Shotgun ball (Light green)
 *
 * Fires a spread burst of shotCount projectiles every BURST_INTERVAL seconds.
 * Base damage: 1 per projectile. Starts with 5 shots.
 * shotCount only increases by 1 if AT LEAST ONE projectile in a burst deals damage
 * (tracked via _burstHitFlag, reset each burst).
 * Projectile lifetime: 1.2s — prevents full-arena wipe.
 */
import { Weapon }     from './Weapon.js';
import { Projectile } from '../entities/Projectile.js';

const BURST_INTERVAL   = 1.6;
const PROJECTILE_SPEED = 520;
const SPREAD_ANGLE     = 0.08;
const PROJ_SIZE        = 7;
const BASE_DAMAGE      = 1;
const PROJ_LIFETIME    = 1.2;

export class ShotgunWeapon extends Weapon {
  constructor(projSystem) {
    super({ name: 'Shotgun', cooldown: 0, color: '#7EC8A4', reach: 38, weaponWidth: 14 });
    this.projSystem      = projSystem;
    this.baseDamage      = BASE_DAMAGE;
    this.shotCount       = 5;        // starts with 5
    this._burstTimer     = BURST_INTERVAL;
    this._burstHitFlag   = false;    // true if any shot in current burst dealt damage
  }

  /** Called by ProjectileSystem on hit — only increment once per burst */
  onProjectileHit() {
    this.hitsLanded++;
    if (!this._burstHitFlag) {
      this._burstHitFlag = true;
      // Actual shotCount increment happens when next burst starts
    }
  }

  onTick(dt, owner) {
    super.onTick(dt, owner);
    if (owner.isFrozen || owner.isImmune) return;

    this._burstTimer -= dt;
    if (this._burstTimer <= 0) {
      // Apply last burst's hit reward before firing new one
      if (this._burstHitFlag) {
        this.shotCount++;
        this._burstHitFlag = false;
      }
      this._fireBurst(owner);
      this._burstTimer = BURST_INTERVAL;
    }
  }

  _fireBurst(owner) {
    const baseAngle = owner.spinAngle;
    const total     = this.shotCount;
    const halfSpan  = ((total - 1) / 2) * SPREAD_ANGLE;
    for (let i = 0; i < total; i++) {
      const angle = baseAngle - halfSpan + i * SPREAD_ANGLE;
      const tipX  = owner.position.x + Math.cos(baseAngle) * (owner.radius + this.scaledReach);
      const tipY  = owner.position.y + Math.sin(baseAngle) * (owner.radius + this.scaledReach);
      this.projSystem.add(new Projectile({
        x: tipX, y: tipY, angle,
        speed      : PROJECTILE_SPEED,
        damage     : BASE_DAMAGE,
        ownerId    : owner.id,
      ownerTeam  : owner.team ?? 0,
        color      : owner.color,
        projWidth  : 26 * (this.scale ?? 1),
        projHeight : PROJ_SIZE * (this.scale ?? 1),
        radius     : 5 * (this.scale ?? 1),
        lifetime   : PROJ_LIFETIME,
      }));
    }
  }

  onCollide() { return false; }

  render(ctx, x, y, radius, spinAngle) {
    renderRect(ctx, x, y, radius, spinAngle, this.scaledReach, this.scaledWeaponWidth, this.color);
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