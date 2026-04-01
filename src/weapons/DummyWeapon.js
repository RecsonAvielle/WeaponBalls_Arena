import { Weapon } from './Weapon.js';

export class DummyWeapon extends Weapon {
  constructor() {
    super({ name: 'Dummy', cooldown: 0.2, color: '#A0A0A0', reach: 45, weaponWidth: 14 });
    this.baseDamage = 0;
  }
  
  onCollide(owner, target) { return false; }
  
  onTick(dt, owner) {
    super.onTick(dt, owner);
    // Dummy persistently spins fast
    owner.spinSpeed = 5.0;
  }

  resetScaling() {}
}
