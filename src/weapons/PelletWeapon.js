/**
 * PelletWeapon.js — Pellet ball (Sage green)
 *
 * Spinning weapon — same short shape as Trapper (reach 26).
 * Fires a burst of shotCount projectiles ONE BY ONE with 0.15s between each,
 * then waits BURST_INTERVAL before next burst. Like Archer but spin-directed.
 *
 * All shots fire in the spinAngle direction at burst start (not real-time aim).
 * Square 7×7 projectiles.
 *
 * On each projectile hit: shotCount += 1.
 * Regular parry — no cooldown penalty.
 */
import { Weapon }     from './Weapon.js';
import { Projectile } from '../entities/Projectile.js';

const BURST_INTERVAL   = 1.0;
const SHOT_DELAY       = 0.01;
const PROJECTILE_SPEED = 420;
const PROJ_SIZE        = 7;
const BASE_DAMAGE      = 1;

export class PelletWeapon extends Weapon {
  constructor(projSystem) {
    super({ name: 'Pellet', cooldown: 0, color: '#52B788', reach: 26, weaponWidth: 14 });
    this.projSystem      = projSystem;
    this.baseDamage      = BASE_DAMAGE;
    this.shotCount       = 1;
    this._shotsLeft      = 0;
    this._shotTimer      = 0;
    this._intervalTimer  = 0;
    this._hitsTowardNext = 0; // hits accumulated toward next shot unlock
  }

  /** Required hits to gain next shot = floor(shotCount / 10) + 1 */
  get hitsRequired() { return Math.floor(this.shotCount / 10) + 1; }

  onProjectileHit() {
    this.hitsLanded++;
    this._hitsTowardNext++;
    if (this._hitsTowardNext >= this.hitsRequired) {
      this.shotCount++;
      this._hitsTowardNext = 0;
    }
  }

  onTick(dt, owner) {
    super.onTick(dt, owner);
    if (owner.isFrozen || owner.isImmune) return;

    if (this._shotsLeft > 0) {
      this._shotTimer -= dt;
      if (this._shotTimer <= 0) {
        this._fireOne(owner);
        this._shotsLeft--;
        this._shotTimer = this._shotsLeft > 0 ? SHOT_DELAY : 0;
        if (this._shotsLeft === 0) this._intervalTimer = BURST_INTERVAL;
      }
    } else {
      this._intervalTimer -= dt;
      if (this._intervalTimer <= 0) {
        this._shotsLeft  = this.shotCount;
        this._shotTimer  = 0;
      }
    }
  }

  _fireOne(owner) {
    // Always fires in the weapon's CURRENT direction at the moment of the shot
    const angle = owner.spinAngle;
    const tipX  = owner.position.x + Math.cos(angle) * (owner.radius + this.scaledReach);
    const tipY  = owner.position.y + Math.sin(angle) * (owner.radius + this.scaledReach);
    this.projSystem.add(new Projectile({
      x: tipX, y: tipY, angle,
      speed      : PROJECTILE_SPEED,
      damage     : BASE_DAMAGE,
      ownerId    : owner.id,
      ownerTeam  : owner.team ?? 0,
      color      : owner.color,
      projWidth  : PROJ_SIZE * (this.scale ?? 1),
      projHeight : PROJ_SIZE * (this.scale ?? 1),
      radius     : 5 * (this.scale ?? 1),
    }));
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