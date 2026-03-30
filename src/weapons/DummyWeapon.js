/**
 * DummyWeapon.js — Dummy ball (Gray)
 * No weapon, no damage. Used for hitbox/behavior testing.
 * Ball is destroyable (high HP) but deals no damage to others.
 */
import { Weapon } from './Weapon.js';

export class DummyWeapon extends Weapon {
  constructor() {
    super({ name: 'None', cooldown: 999, color: '#888888', reach: 0, weaponWidth: 0 });
    this.isBodyWeapon = false;
  }

  onCollide()      { return false; }
  render()         {}
  getWorldSegment() { return null; }
}
