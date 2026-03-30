/**
 * BlightRanger.js
 * Projectile weapon. Slow aim (2 rad/s base), 3.5s reload, ±0.15 rad spread.
 * 8s parry window + 3s penalty. Accuracy and speed improve every 5 waves.
 * Base damage: 1 + floor(wave/10). No shot count scaling.
 */
import { Weapon }     from './Weapon.js';
import { Projectile } from '../entities/Projectile.js';
import { Vector2 }    from '../core/Vector2.js';

export class BlightRanger extends Weapon {
  constructor(projSystem, wave = 1) {
    super({ name: 'Blight', cooldown: 0, color: '#8B4500', reach: 26, weaponWidth: 14 });
    this.projSystem     = projSystem;
    this.baseDamage     = 1 + Math.floor(wave / 10);
    // Accuracy: spread reduces every 5 waves (min 0.03)
    this.spread         = Math.max(0.03, 0.15 - Math.floor(wave / 5) * 0.02);
    // Reload: 3.5s base, reduces every 5 waves (min 2.0)
    this.reloadTime     = Math.max(2.0, 3.5 - Math.floor(wave / 5) * 0.15);
    // Aim speed: 2 rad/s base, increases every 5 waves (max 4.0)
    this.aimSpeed       = Math.min(4.0, 2.0 + Math.floor(wave / 5) * 0.2);
    this._aimAngle      = 0;
    this._fireTimer     = this.reloadTime;
    this._parryCooldown = 0;
    this._parryPenalty  = 0;
    this.targetBalls    = [];
  }

  onProjectileHit() { this.hitsLanded++; }

  onTick(dt, owner) {
    super.onTick(dt, owner);
    if (this._parryCooldown > 0) this._parryCooldown -= dt;
    if (this._parryPenalty  > 0) this._parryPenalty  -= dt;

    // Aim at nearest target
    const targets = this.targetBalls.filter(b => b.alive);
    let nearest = null, nearestDist = Infinity;
    for (const t of targets) {
      const d = owner.position.distanceTo(t.position);
      if (d < nearestDist) { nearestDist = d; nearest = t; }
    }
    if (nearest) {
      const desired = Math.atan2(nearest.position.y - owner.position.y, nearest.position.x - owner.position.x);
      let diff = desired - this._aimAngle;
      while (diff >  Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this._aimAngle += Math.sign(diff) * Math.min(Math.abs(diff), this.aimSpeed * dt);
    }
    owner.spinAngle = this._aimAngle;

    if (owner.isFrozen || owner.isImmune || this._parryPenalty > 0) return;

    this._fireTimer -= dt;
    if (this._fireTimer <= 0 && nearest) {
      this._fireTimer = this.reloadTime;
      const spread    = (Math.random() - 0.5) * 2 * this.spread;
      this.projSystem.add(new Projectile({
        x         : owner.position.x,
        y         : owner.position.y,
        angle     : this._aimAngle + spread,
        speed     : 480,
        damage    : this.baseDamage,
        ownerId   : owner.id,
        ownerTeam : owner.team ?? 0,
        color     : owner.color,
        projWidth : 22, projHeight: 6, radius: 4,
      }));
    }
  }

  onParry(owner) {
    this._parryCooldown = 8.0;
    this._parryPenalty  = 3.0;
    this._fireTimer     = this.reloadTime;
  }

  getWorldSegment(ball) {
    if (this._parryCooldown > 0) return null;
    const cos = Math.cos(ball.spinAngle), sin = Math.sin(ball.spinAngle);
    return {
      start: new Vector2(ball.position.x + ball.radius * cos, ball.position.y + ball.radius * sin),
      end:   new Vector2(ball.position.x + (ball.radius + this.scaledReach) * cos,
                         ball.position.y + (ball.radius + this.scaledReach) * sin),
    };
  }

  onCollide() { return false; }

  render(ctx, x, y, radius, spinAngle) {
    const cd = this._parryCooldown > 0;
    ctx.save();
    ctx.translate(x, y); ctx.rotate(spinAngle);
    const rW = this.scaledReach, rH = this.scaledWeaponWidth;
    ctx.fillStyle   = cd ? '#AAAAAA' : this.color;
    ctx.strokeStyle = '#2C2C2C'; ctx.lineWidth = 1.5;
    ctx.fillRect(radius + 1, -rH / 2, rW, rH);
    ctx.strokeRect(radius + 1, -rH / 2, rW, rH);
    ctx.restore();
  }
}
