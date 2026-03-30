/**
 * ProjectileSystem.js
 * Manages all active projectiles each frame.
 *
 * Minions can be passed in — projectiles knock them back but don't score damage.
 */
import { Vector2 } from '../core/Vector2.js';
import { segmentToPointDistance } from '../core/Physics.js';

export class ProjectileSystem {
  constructor() {
    this.projectiles = [];
  }

  add(projectile) { this.projectiles.push(projectile); }

  update(dt, aliveBalls, obstacleSystem = null, minions = []) {
    for (const proj of this.projectiles) {
      if (!proj.alive) continue;
      proj.update(dt);
      if (!proj.alive) continue;

      if (obstacleSystem?.resolveProjectile(proj)) continue;

      let hit = false;
      for (const ball of aliveBalls) {
        if (ball.id === proj.ownerId) continue;
        if (proj.ownerTeam !== 0 && ball.team === proj.ownerTeam) continue;

        // 1. Hit enemy ball body → damage
        const dist = proj.position.distanceTo(ball.position);
        if (dist < ball.radius + proj.radius) {
          ball.takeDamage(proj.damage, null, true);
          const owner = aliveBalls.find(b => b.id === proj.ownerId);
          if (owner?.weapon) {
            owner.weapon.damageDealt += proj.damage;
            owner.weapon.onProjectileHit?.();
          }
          proj.alive = false;
          hit = true;
          break;
        }

        // 2. Hit enemy weapon segment → reflect
        if (!ball.weapon || ball.weapon.isBodyWeapon) continue;
        const seg = ball.weapon.getWorldSegment(ball);
        if (!seg) continue;
        const { dist: segDist } = segmentToPointDistance(seg.start, seg.end, proj.position);
        if (segDist < ball.weapon.scaledWeaponWidth / 2 + proj.radius) {
          const dx  = seg.end.x - seg.start.x;
          const dy  = seg.end.y - seg.start.y;
          const len = Math.sqrt(dx * dx + dy * dy) || 1;
          const nx  = -dy / len;
          const ny  =  dx / len;
          const dot = proj.velocity.x * nx + proj.velocity.y * ny;
          proj.velocity  = new Vector2(proj.velocity.x - 2 * dot * nx, proj.velocity.y - 2 * dot * ny);
          proj.ownerId   = ball.id;
          proj.ownerTeam = ball.team ?? 0;
          hit = true;
          break;
        }
      }
      if (hit) continue;

      // 3. Hit minion → knockback only, no damage scoring, destroy projectile
      for (const mini of minions) {
        if (mini.ownerId === proj.ownerId) continue;
        if (proj.ownerTeam !== 0 && mini.ownerTeam === proj.ownerTeam) continue;
        const dist = proj.position.distanceTo(mini.position);
        if (dist < mini.radius + proj.radius) {
          const away    = mini.position.sub(proj.position).normalized;
          mini.velocity = mini.velocity.add(away.scale(450));
          proj.alive    = false;
          break;
        }
      }
    }

    this.projectiles = this.projectiles.filter(p => p.alive);
  }

  clear() { this.projectiles = []; }
}