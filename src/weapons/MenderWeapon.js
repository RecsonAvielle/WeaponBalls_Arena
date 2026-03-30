/**
 * MenderWeapon.js — Mender ball (Green)
 *
 * Weaponless body ball. 1 contact damage per hit.
 * Passive nerf: all damage received by Mender +1 (via ball._menderPenalty).
 *
 * Heal pulse:
 *   Activates an aoe field with _activeCharges = baseCharges.
 *   Field heals self + allies 1hp every 0.5s, costs 1 charge per tick.
 *   baseCharges starts at 3, +1 permanently per contact damage dealt.
 *   6s cooldown begins only AFTER the pulse fully finishes (all charges consumed).
 */
import { Weapon } from './Weapon.js';

const PULSE_COOLDOWN  = 6.0;

export class MenderWeapon extends Weapon {
  constructor(menderSystem) {
    super({ name: 'Mender', cooldown: 0.4, color: '#4CAF50', reach: 0, weaponWidth: 0 });
    this.isBodyWeapon   = true;
    this.baseDamage     = 1;
    this.menderSystem   = menderSystem;
    this.baseCharges    = 3;    // permanent — grows with hits, never consumed
    this._activeCharges = 0;    // charges remaining in current active pulse
    this._pulseTimer    = PULSE_COOLDOWN; // countdown before next pulse
    this._pulsing       = false; // true while field is active
  }

  get healCharges()    { return this._activeCharges; }
  set healCharges(val) {
    this._activeCharges = val;
    // When charges run out, mark pulse done so cooldown can begin
    if (this._activeCharges <= 0 && this._pulsing) {
      this._pulsing    = false;
      this._pulseTimer = PULSE_COOLDOWN;
    }
  }

  onTick(dt, owner) {
    super.onTick(dt, owner);
    owner._menderPenalty = true;

    if (owner.isFrozen || owner.isImmune) return;

    // Only tick cooldown when not actively pulsing
    if (!this._pulsing) {
      this._pulseTimer -= dt;
      if (this._pulseTimer <= 0) {
        this._pulseTimer    = 0;
        this._activeCharges = this.baseCharges;
        this._pulsing       = true;
        this.menderSystem.spawn({
          ownerId    : owner.id,
          ownerTeam  : owner.team,
          ownerBall  : owner,
          ownerWeapon: this,
        });
      }
    }
  }

  onCollide(owner, target) {
    if (!this.isReady || !target.alive || target.isImmune) return false;
    target.takeDamage(1, owner);
    this.damageDealt++;
    this.hitsLanded++;
    this.baseCharges++;
    this.resetCooldown();
    return true;
  }

  render() {}
  getWorldSegment() { return null; }
}