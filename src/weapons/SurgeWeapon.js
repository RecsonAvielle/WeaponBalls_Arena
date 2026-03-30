/**
 * SurgeWeapon.js — Surge ball (Crimson)
 *
 * NORMAL STATE: flat 2 damage always.
 * SURGE STATE: damage = 2 + surgeDamageBonus.
 *
 * Per damage hit (any state):
 *   - surgeDamageBonus += 1
 *   - nextBoostDuration += 0.5s (applies to NEXT or current surge)
 *
 * On parry:
 *   - If not surging: activates surge, fires 800 px/s away from parrier.
 *   - If already surging: does NOT extend duration (only hits do).
 *
 * During surge: knockbackResist = 0 (immune to parry pushes).
 * After surge ends: knockbackResist resets to owner's normal value.
 */
import { Weapon }  from './Weapon.js';
import { Vector2 } from '../core/Vector2.js';

const BOOST_SPEED         = 1040;
const BASE_BOOST_DURATION = 2.0;
const SURGE_MAX_SPEED     = 2000;

export class SurgeWeapon extends Weapon {
  constructor() {
    super({ name: 'Surge', cooldown: 0.5, color: '#C1121F', reach: 64, weaponWidth: 14 });
    this.baseDamage        = 2;
    this.surgeDamageBonus  = 0;   // grows +1 per hit
    this.nextBoostDuration = BASE_BOOST_DURATION; // grows +0.5s per hit
    this._boosting         = false;
    this._boostTimer       = 0;
    this._baseKnockback    = 1.0;
    this._baseMaxSpeed     = 700;
    this._shield           = 0;  // absorbs damage while surging
  }

  get isBoosting()    { return this._boosting; }
  get currentDamage() {
    return this._boosting
      ? this.baseDamage + this.surgeDamageBonus
      : this.baseDamage;
  }

  onTick(dt, owner) {
    super.onTick(dt, owner);
    if (this._boosting) {
      this._boostTimer -= dt;
      if (this._boostTimer <= 0) {
        this._boosting        = false;
        owner.knockbackResist = this._baseKnockback;
        owner.maxSpeed        = this._baseMaxSpeed;
        this._shield          = 0;
      } else {
        // Lock weapon to face movement direction during surge
        const spd = owner.velocity.magnitude;
        if (spd > 20) owner.spinAngle = Math.atan2(owner.velocity.y, owner.velocity.x);
      }
    }
  }

  onParry(owner, other) {
    if (this._boosting) return; // no reset mid-surge

    const away = owner.position.sub(other.position);
    const dir  = away.magnitude > 0 ? away.normalized : new Vector2(0, -1);

    this._baseKnockback     = owner.knockbackResist ?? 1.0;
    this._baseMaxSpeed      = owner.maxSpeed;
    owner.velocity          = dir.scale(BOOST_SPEED);
    owner.knockbackResist   = 0;
    owner.maxSpeed          = SURGE_MAX_SPEED;
    this._boosting          = true;
    this._boostTimer        = this.nextBoostDuration;
    this._shield            = Math.floor(this.nextBoostDuration * 0.5) + 1; // ~1-3 shield per second
  }

  onCollide(owner, target) {
    if (!this.isReady || !target.alive || target.isImmune) return false;
    const dmg = this.currentDamage;
    target.takeDamage(dmg, owner);
    this.damageDealt       += dmg;
    // Scaling differs by state:
    // Normal: +1 damage, +0.2s duration per hit
    // Surge:  +1 damage every 2 hits, +0.1s duration per hit
    this.hitsLanded++;
    if (this._boosting) {
      if (this.hitsLanded % 2 === 0) this.surgeDamageBonus += 1;
      this.nextBoostDuration += 0.1;
      const spd = owner.velocity.magnitude;
      if (spd > 0) owner.velocity = owner.velocity.normalized.scale(
        Math.min(spd + 120, owner.maxSpeed)
      );
    } else {
      this.surgeDamageBonus  += 1;
      this.nextBoostDuration += 0.2;
    }
    this.resetCooldown();
    return true;
  }

  render(ctx, x, y, radius, spinAngle) {
    // Gold (#FFD700) during surge — same as Chance crit flash
    const color = this._boosting ? '#FFD700' : (this.isReady ? this.color : '#ffffff');
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spinAngle);
    const rW = this.scaledReach, rH = this.scaledWeaponWidth;
    ctx.fillStyle   = color;
    ctx.strokeStyle = '#2C2C2C';
    ctx.lineWidth   = 1.5;
    ctx.fillRect(radius + 1, -rH / 2, rW, rH);
    ctx.strokeRect(radius + 1, -rH / 2, rW, rH);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(radius + 4, -rH / 2 + 3);
    ctx.lineTo(radius + rW - 4, -rH / 2 + 3);
    ctx.stroke();
    ctx.restore();
  }
}