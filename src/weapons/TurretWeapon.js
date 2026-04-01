import { Weapon } from './Weapon.js';

export class TurretWeapon extends Weapon {
  constructor(turretSystem) {
    super({ name: 'Turret', cooldown: 0.6, color: '#4682B4', reach: 30, weaponWidth: 14 });
    this.turretSystem = turretSystem;
    this.baseDamage = 2;
    this.bulletCount = 4;
  }

  get currentDamage() { return this.baseDamage; }

  onCollide(owner, target) {
    if (!this.isReadyFor(target.id) || !target.alive || target.isImmune) return false;

    target.takeDamage(this.baseDamage, owner);

    this.bulletCount++;

    const mx = (owner.position.x + target.position.x) / 2;
    const my = (owner.position.y + target.position.y) / 2;

    this.turretSystem.spawn({
      x: mx,
      y: my,
      ownerId: owner.id,
      ownerTeam: owner.team ?? 0,
      bulletCount: this.bulletCount,
      color: owner.color,
      scale: owner.scale ?? 1,
      weaponScale: this.scale ?? 1
    });

    this.damageDealt += this.baseDamage;
    this.hitsLanded++;
    this.resetCooldownFor(target.id);
    return true;
  }

  render(ctx, x, y, radius, spinAngle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spinAngle);

    const w = this.scaledReach;
    const h = this.scaledWeaponWidth;

    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#2C2C2C';
    ctx.lineWidth = 1.5;
    ctx.fillRect(radius + 1, -h / 2, w, h);
    ctx.strokeRect(radius + 1, -h / 2, w, h);

    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(radius + 4, -h / 2 + 3);
    ctx.lineTo(radius + w - 4, -h / 2 + 3);
    ctx.stroke();

    ctx.restore();
  }

  resetScaling() {
    super.resetScaling();
    this.bulletCount = 4;
  }
}
