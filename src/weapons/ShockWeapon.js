/**
 * ShockWeapon.js — Shock ball (Electric yellow)
 *
 * Body weapon: contact damage 2.
 * Every 2s: main shock AOE (base 100px radius) at self position.
 * Main AOE grows +1.5px each time it fires.
 * Every 2px of total radius growth: main shock damage +1.
 * Chains: up to 5 consecutives. Chain fires at CURRENT position of target ball.
 */
import { Weapon } from './Weapon.js';

const SHOCK_INTERVAL   = 2.0;
const SHOCK_RADIUS     = 100;
const CHAIN_RADIUS     = 80;
const SHOCK_DAMAGE     = 2;
const CONTACT_DAMAGE   = 2;
const CONTACT_COOLDOWN = 0.4;

export class ShockWeapon extends Weapon {
  constructor(shockSystem) {
    super({ name: 'Shock', cooldown: CONTACT_COOLDOWN, color: '#F5C518', reach: 0, weaponWidth: 0 });
    this.isBodyWeapon   = true;
    this.baseDamage     = CONTACT_DAMAGE;
    this.shockSystem    = shockSystem;
    this._shockTimer    = SHOCK_INTERVAL;
    this.mainAoeRadius  = SHOCK_RADIUS;
    this.chainAoeRadius = CHAIN_RADIUS;
    this._bonusDamage   = 0;   // grows as radius crosses damage tiers
    this._radiusGrowth  = 0;   // total px grown since start
    this._damageTier    = 0;   // current tier = floor(growth / 2)
  }

  onTick(dt, owner) {
    super.onTick(dt, owner);
    if (owner.isFrozen || owner.isImmune) return;
    this._shockTimer -= dt;
    if (this._shockTimer <= 0) {
      this._shockTimer = SHOCK_INTERVAL;
      this.shockSystem.spawn({
        x           : owner.position.x,
        y           : owner.position.y,
        radius      : this.mainAoeRadius * (this.scale ?? 1),
        damage      : SHOCK_DAMAGE + this._bonusDamage,
        color       : owner.color,
        ownerId     : owner.id,
        ownerTeam   : owner.team ?? 0,
        ownerWeapon : this,
        chainLeft   : 5,
        delay       : 0,
        isMain      : true,
        targetBall  : null,
      });
    }
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