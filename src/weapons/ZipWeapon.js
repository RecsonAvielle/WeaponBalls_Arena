/**
 * ZipWeapon.js — Zip ball (Electric blue)
 *
 * Body weapon: contact damage 1.
 * Low gravity (0.3), high maxSpeed (900).
 *
 * DASH: every 3s, fires a burst of speed in movement direction.
 * At dash END:
 *   1. Places a trail segment (start → end position)
 *   2. Places a large circle burst at the landing position
 *
 * TRAIL: 28px wide, 1 dmg per 0.2s, owner immune.
 * CIRCLE: radius 40px, same damage/interval, duration 3s fixed.
 * Both extend trailDuration by 0.1s per damage tick.
 */
import { Weapon }  from './Weapon.js';
import { Vector2 } from '../core/Vector2.js';

const DASH_COOLDOWN   = 3.0;
const DASH_IMPULSE    = 900;
const DASH_DURATION   = 0.28;
const BASE_TRAIL_DUR  = 2.0;
const CIRCLE_DURATION = 3.0;
const CIRCLE_RADIUS   = 40;
const CONTACT_DAMAGE  = 1;
const CONTACT_COOLDOWN = 0.55;

export class ZipWeapon extends Weapon {
  constructor(trailSystem) {
    super({ name: 'Zip', cooldown: CONTACT_COOLDOWN, color: '#38BDF8', reach: 0, weaponWidth: 0 });
    this.isBodyWeapon  = true;
    this.baseDamage    = CONTACT_DAMAGE;
    this.trailSystem   = trailSystem;
    this.trailDuration = BASE_TRAIL_DUR;

    this._dashCooldown = 1.0;
    this._isDashing    = false;
    this._dashTimer    = 0;
    this._dashStart    = null;
  }

  get isDashing() { return this._isDashing; }

  onTick(dt, owner) {
    super.onTick(dt, owner);
    if (owner.isFrozen || owner.isImmune) return;

    if (this._isDashing) {
      this._dashTimer -= dt;
      if (this._dashTimer <= 0) {
        this._isDashing = false;
        if (this._dashStart) {
          const start = this._dashStart;
          const end   = owner.position.clone();

          // Trail segment
          if (start.distanceTo(end) > 10) {
            this.trailSystem.spawn({
              start, end,
              duration    : this.trailDuration,
              color       : owner.color,
              ownerId     : owner.id,
              ownerTeam   : owner.team ?? 0,
              ownerWeapon : this,
              width       : 28 * (this.scale ?? 1),
            });
          }

          // Circle burst at landing point
          this.trailSystem.spawnCircle({
            x           : end.x,
            y           : end.y,
            radius      : CIRCLE_RADIUS * (this.scale ?? 1),
            duration    : CIRCLE_DURATION,
            color       : owner.color,
            ownerId     : owner.id,
            ownerTeam   : owner.team ?? 0,
            ownerWeapon : this,
          });
        }
        this._dashCooldown = DASH_COOLDOWN;
      }
    } else {
      this._dashCooldown -= dt;
      if (this._dashCooldown <= 0) {
        this._triggerDash(owner);
      }
    }
  }

  _triggerDash(owner) {
    const spd = owner.velocity.magnitude;
    const dir = spd > 20
      ? owner.velocity.normalized
      : new Vector2(Math.random() - 0.5, -1).normalized;
    this._dashStart = owner.position.clone();
    owner.velocity  = owner.velocity.add(dir.scale(DASH_IMPULSE));
    this._isDashing = true;
    this._dashTimer = DASH_DURATION;
  }

  onCollide(owner, target) {
    if (!this.isReady || !target.alive || target.isImmune) return false;
    target.takeDamage(CONTACT_DAMAGE, owner);
    this.damageDealt += CONTACT_DAMAGE;
    this.hitsLanded++;
    this.resetCooldown();
    return true;
  }

  render() {}
  getWorldSegment() { return null; }
}