/**
 * HostessWeapon.js — Hostess ball (Rose pink)
 *
 * Weaponless body ball.
 * Every SUMMON_COOLDOWN seconds (after last mini expires): summons COUNT minis.
 * Base summon count: 2. +1 per 50 total damage dealt by minis.
 * Base mini lifetime: 5s. +0.5s per 5 damage dealt by minis.
 * Max 8 minis at once.
 */
import { Weapon } from './Weapon.js';

const BASE_LIFETIME     = 5.0;
const BASE_COUNT        = 2;
const MAX_MINIONS       = 16;
const SUMMON_COOLDOWN   = 4.0; // flat 4s after last mini expires

export class HostessWeapon extends Weapon {
  constructor(minionSystem) {
    super({ name: 'Hostess', cooldown: 0.4, color: '#FF6B9D', reach: 0, weaponWidth: 0 });
    this.isBodyWeapon   = true;
    this.baseDamage     = 2;
    this.minionSystem   = minionSystem;
    this.totalDamage       = 0;
    this._extraMinis       = 0;
    this._hitsTowardNext   = 0;
    this._nextMiniThreshold = 10;
    this._miniHitTotal     = 0;  // total mini hits — drives knockback reduction
    this._cooldown         = SUMMON_COOLDOWN;
    this._waiting          = false;
  }

  _onMiniHit() {
    this.totalDamage++;
    this._miniHitTotal++;
    this._hitsTowardNext++;
    if (this._hitsTowardNext >= this._nextMiniThreshold && this._extraMinis + BASE_COUNT < MAX_MINIONS) {
      this._extraMinis++;
      this._hitsTowardNext    = 0;
      this._nextMiniThreshold = (BASE_COUNT + this._extraMinis) * 10;
    }
  }

  // Knockback minis receive — reduces by 1 every 2 mini hits, min 0
  get miniKnockback() { return Math.max(0, 600 - Math.floor(this._miniHitTotal)); }

  get currentLifetime() { return BASE_LIFETIME + this.totalDamage * 0.1; }
  get summonCount() {
    // To get nth mini: need 30 + (n-3)*15 hits SINCE the last unlock
    // Track via _miniUnlockDamage watermarks stored separately
    // Simpler: precompute unlock thresholds (non-cumulative per tier)
    // Threshold[0]=30 (for 3rd), Threshold[1]=45 (for 4th), etc.
    // Each threshold is independent — _miniUnlockProgress tracks hits toward next
    return Math.min(BASE_COUNT + this._extraMinis, MAX_MINIONS);
  }

  onTick(dt, owner) {
    super.onTick(dt, owner);
    if (owner.isFrozen || owner.isImmune) return;

    const liveCount = this.minionSystem.countFor(owner.id);

    if (liveCount > 0) {
      // Minions still alive — reset cooldown waiting flag
      this._waiting = false;
    } else if (!this._waiting) {
      // Minions just expired — start cooldown
      this._waiting  = true;
      this._cooldown = SUMMON_COOLDOWN;
    } else {
      // Waiting for cooldown
      this._cooldown -= dt;
      if (this._cooldown <= 0) {
        this._waiting = false;
        this.minionSystem.spawn({
          count      : this.summonCount,
          x          : owner.position.x,
          y          : owner.position.y,
          lifetime   : this.currentLifetime,
          color      : owner.color,
          ownerId    : owner.id,
          ownerTeam  : owner.team ?? 0,
          ownerWeapon: this,
        });
      }
    }
  }

  // Contact damage — Hostess herself deals 1
  onCollide(owner, target) {
    if (!this.isReady || !target.alive || target.isImmune) return false;
    target.takeDamage(2, owner);
    this.damageDealt += 2;
    this.hitsLanded++;
    this.resetCooldown();
    return true;
  }

  render() {}
  getWorldSegment() { return null; }
}