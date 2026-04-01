import { Projectile } from '../entities/Projectile.js';

export class TurretSystem {
  constructor(projSystem) {
    this.projSystem = projSystem;
    this.turrets = [];
  }

  spawn({ x, y, ownerId, ownerTeam, bulletCount, color, scale, weaponScale }) {
    this.turrets.push({
      x,
      y,
      ownerId,
      ownerTeam,
      bulletCount,
      color,
      scale,
      weaponScale,
      radius: 18 * weaponScale,
      state: 'SETUP',
      timer: 2.5,
      aimAngle: 0
    });
  }

  update(dt, aliveBalls) {
    for (const tur of this.turrets) {
      // Physical obstacle pushing logic
      for (const ball of aliveBalls) {
        const dx = ball.position.x - tur.x;
        const dy = ball.position.y - tur.y;
        const dist2 = dx * dx + dy * dy;
        const minDist = tur.radius + ball.radius;
        if (dist2 > 0.001 && dist2 < minDist * minDist) {
          const dist = Math.sqrt(dist2);
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;
          
          ball.position.x += nx * overlap;
          ball.position.y += ny * overlap;
          
          const dot = ball.velocity.x * nx + ball.velocity.y * ny;
          if (dot < 0) {
            ball.velocity.x -= 2 * dot * nx;
            ball.velocity.y -= 2 * dot * ny;
            ball._bouncedThisFrame = true;
          }
        }
      }

      // Logic state machine
      if (tur.state === 'SETUP') {
        tur.timer -= dt;
        if (tur.timer <= 0) {
          tur.state = 'SHOOTING';
          tur.timer = 0.6; // initial fire interval
        }
      } else if (tur.state === 'SHOOTING') {
        tur.timer -= dt;

        let target = null;
        let minDist = Infinity;
        for (const b of aliveBalls) {
          if (b.id === tur.ownerId || !b.alive || b.isImmune) continue;
          if (tur.ownerTeam !== 0 && b.team === tur.ownerTeam) continue;
          
          const dist = (b.position.x - tur.x) ** 2 + (b.position.y - tur.y) ** 2;
          if (dist < minDist) {
            minDist = dist;
            target = b;
          }
        }

        if (target) {
          const desired = Math.atan2(target.position.y - tur.y, target.position.x - tur.x);
          let diff = desired - tur.aimAngle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          tur.aimAngle += diff * 8.0 * dt; // slightly slower smooth aim for turret
        } else {
          tur.aimAngle += dt * 0.5; // lazy spin when no target
        }

        if (tur.timer <= 0) {
          if (tur.bulletCount > 0) {
            tur.bulletCount--;
            tur.timer = 0.6; // interval
            const s = tur.weaponScale ?? 1;
            
            this.projSystem.add(new Projectile({
              x: tur.x, y: tur.y,
              angle: tur.aimAngle,
              speed: 400,
              damage: 1,
              ownerId: tur.ownerId,
              ownerTeam: tur.ownerTeam,
              color: tur.color,
              radius: 5 * s,
              isCircle: true
            }));
          } else {
            tur.state = 'LINGER';
            tur.timer = 4.0;
          }
        }
      } else if (tur.state === 'LINGER') {
        tur.timer -= dt;
      }
    }

    this.turrets = this.turrets.filter(t => t.state !== 'LINGER' || t.timer > 0);
  }

  clear() {
    this.turrets = [];
  }
}
