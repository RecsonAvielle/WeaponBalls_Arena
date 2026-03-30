/**
 * RushWeapon.js — Rush (body weapon, no parry)
 *
 * Damage formula: min(baseDamageCap + floor(speed / 100), maxDamageCap)
 *   - baseDamageCap starts at 2, +1 every 5 hits
 *   - maxDamageCap = baseDamageCap + 10 (always 10 above base)
 *   - So early Rush does 2 damage at low speed, more when fast
 *   - After 5 hits: base cap becomes 3, after 10: becomes 4, etc.
 *
 * On each hit:
 *   - hitsLanded++  (updates baseDamageCap)
 *   - owner.maxSpeed += 35 px/s
 *   - Rush bounces away from target
 *
 * Passive in onTick:
 *   - Accelerates toward maxSpeed at PASSIVE_ACCEL px/s²
 *   - If below MIN_RUSH_SPEED, acceleration is doubled for a stronger push
 *
 * gravityScale 0.45 + higher starting maxSpeed (850) in main.js config.
 */
import { Weapon }  from './Weapon.js';
import { Vector2 } from '../core/Vector2.js';

const SPEED_PER_HIT   = 12;   // px/s added to maxSpeed each hit (was 35)
const RUSH_BOUNCE     = 240;  // px/s outward impulse after hitting
const SPEED_DIVISOR   = 160;  // speed / this = damage bonus (was 100 — nerf ratio)
const PASSIVE_ACCEL   = 120;  // px/s² toward maxSpeed
const MIN_RUSH_SPEED  = 350;  // below this, acceleration doubles (wider recovery window)

export class RushWeapon extends Weapon {
  constructor() {
    super({ name: 'Rush', cooldown: 0.4, color: '#E76F51', reach: 0, weaponWidth: 0 });
    this.isBodyWeapon = true;
    this.baseDamage   = 2;
  }

  /** Base cap grows every 5 hits. Max cap is always 10 above base. */
  get baseDamageCap() { return Math.floor(this.hitsLanded / 5); }
  get maxDamageCap()  { return this.baseDamageCap + 3; }

  currentDamage(owner) {
    const speedBonus = Math.floor(owner.velocity.magnitude / SPEED_DIVISOR);
    return Math.min(this.baseDamageCap + speedBonus, this.maxDamageCap);
  }

  onTick(dt, owner) {
    super.onTick(dt, owner);
    const spd   = owner.velocity.magnitude;
    const accel = spd < MIN_RUSH_SPEED ? PASSIVE_ACCEL * 2 : PASSIVE_ACCEL;
    if (spd < owner.maxSpeed && spd > 10) {
      const dir  = owner.velocity.normalized;
      const push = Math.min(accel * dt, owner.maxSpeed - spd);
      owner.velocity = owner.velocity.add(dir.scale(push));
    }
  }

  onCollide(owner, target) {
    if (!this.isReady || !target.alive || target.isImmune) return false;

    const dmg = this.currentDamage(owner);
    target.takeDamage(dmg, owner);
    this.damageDealt += dmg;

    // Bounce Rush away from target
    const away = owner.position.sub(target.position);
    const dir  = away.magnitude > 0 ? away.normalized : new Vector2(0, -1);
    owner.velocity = owner.velocity.add(dir.scale(RUSH_BOUNCE));

    this.hitsLanded++;
    owner.maxSpeed += SPEED_PER_HIT;
    this.resetCooldown();
    return true;
  }

  render() {}
  getWorldSegment() { return null; }
}