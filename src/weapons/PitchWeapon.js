import { Weapon } from './Weapon.js';
import { Vector2 } from '../core/Vector2.js';

export class PitchWeapon extends Weapon {
  constructor(pitchSystem) {
    super({ name: 'Pitch', cooldown: 3.5, color: '#FF4500', reach: 0, weaponWidth: 0 });
    this.isBodyWeapon = false;
    this.pitchSystem = pitchSystem;
    this.fireTimer = 3.5;
  }

  get currentDamage() { return 0; }

  onTick(dt, owner) {
    super.onTick(dt, owner);

    if (owner.isFrozen || owner.isImmune) return;

    this.fireTimer -= dt;
    if (this.fireTimer <= 0) {
        this.fireTimer = 3.5;
        
        // Spawn slightly outside the ball so it doesn't instantly collide with touching targets
        const spawnRadius = owner.radius + 6;
        const px = owner.position.x + Math.cos(owner.spinAngle) * spawnRadius;
        const py = owner.position.y + Math.sin(owner.spinAngle) * spawnRadius;

        this.pitchSystem.addProjectile({
            position: new Vector2(px, py),
            velocity: new Vector2(Math.cos(owner.spinAngle) * 900, Math.sin(owner.spinAngle) * 900),
            radius: 12 * (this.scale ?? 1),
            color: owner.color,
            ownerId: owner.id,
            ownerTeam: owner.team ?? 0,
            ownerWeapon: this,
            alive: true,
            bounces: 0,
            isCircle: true
        });
    }
  }

  onCollide() { return false; }

  render(ctx, x, y, radius, spinAngle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spinAngle);
    ctx.fillStyle = this.color;
    ctx.strokeStyle = '#2C2C2C';
    ctx.lineWidth = 1.5;
    ctx.fillRect(radius, -7 / 2, 26, 7);
    ctx.strokeRect(radius, -7 / 2, 26, 7);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)'; // Slight highlight
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(radius + 2, -7 / 2 + 1.5);
    ctx.lineTo(radius + 24, -7 / 2 + 1.5);
    ctx.stroke();
    ctx.restore();
  }
}
