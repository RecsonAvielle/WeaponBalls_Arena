import { Vector2 } from '../core/Vector2.js';

export class PitchSystem {
  constructor() {
    this.projectiles = [];
    this.knockbacks = [];
  }

  addProjectile(proj) {
    this.projectiles.push(proj);
  }

  applyKnockback(ball, velocity, ownerWeapon) {
    ball.velocity = velocity;
    this.knockbacks = this.knockbacks.filter(k => k.ball.id !== ball.id);
    this.knockbacks.push({
      ball,
      ownerWeapon,
      prevPos: ball.position.clone(),
      timer: 1.0, 
      accumulatedDist: 0,
    });
  }

  update(dt, aliveBalls, arena, obsSystem) {
    for (const proj of this.projectiles) {
      if (!proj.alive) continue;
      
      proj.position.x += proj.velocity.x * dt;
      proj.position.y += proj.velocity.y * dt;

      // Arena Wall Bounce
      let bounced = false;
      const m = proj.radius;
      if (proj.position.x < arena.x + m) { proj.position.x = arena.x + m; proj.velocity.x *= -1; bounced = true; }
      else if (proj.position.x > arena.x + arena.width - m) { proj.position.x = arena.x + arena.width - m; proj.velocity.x *= -1; bounced = true; }
      
      if (proj.position.y < arena.y + m) { proj.position.y = arena.y + m; proj.velocity.y *= -1; bounced = true; }
      else if (proj.position.y > arena.y + arena.height - m) { proj.position.y = arena.y + arena.height - m; proj.velocity.y *= -1; bounced = true; }

      if (bounced) {
        proj.bounces = (proj.bounces ?? 0) + 1;
        if (proj.bounces > 1) {
          proj.alive = false;
          continue;
        }
      }

      // Obstacle Bounce
      if (obsSystem) {
        for (const obs of obsSystem.obstacles) {
            const cx = Math.max(obs.x, Math.min(proj.position.x, obs.x + obs.width));
            const cy = Math.max(obs.y, Math.min(proj.position.y, obs.y + obs.height));
            const dx = proj.position.x - cx;
            const dy = proj.position.y - cy;
            if (dx * dx + dy * dy < proj.radius * proj.radius) {
                if (Math.abs(dx) > Math.abs(dy)) proj.velocity.x *= -1;
                else proj.velocity.y *= -1;
                
                proj.bounces = (proj.bounces ?? 0) + 1;
                if (proj.bounces > 1) { proj.alive = false; break; }
            }
        }
      }
      if (!proj.alive) continue;

      // Enemy hit (Massive Knockback)
      for (const ball of aliveBalls) {
        if (ball.id === proj.ownerId || !ball.alive || ball.isImmune) continue;
        if (proj.ownerTeam !== 0 && ball.team === proj.ownerTeam) continue;
        
        const dx = ball.position.x - proj.position.x;
        const dy = ball.position.y - proj.position.y;
        if (dx*dx + dy*dy < (ball.radius + proj.radius)**2) {
            const knockNormX = dx / Math.sqrt(dx*dx + dy*dy);
            const knockNormY = dy / Math.sqrt(dx*dx + dy*dy);
            const massiveKnock = 900; 
            
            ball.takeDamage(5, proj.ownerWeapon?.owner);
            if (proj.ownerWeapon) proj.ownerWeapon.damageDealt += 5;
            if (proj.ownerWeapon) proj.ownerWeapon.hitsLanded++;

            this.applyKnockback(ball, new Vector2(knockNormX * massiveKnock, knockNormY * massiveKnock), proj.ownerWeapon);
            
            // Instantly destroy projectile so it doesn't linger and get stuck.
            proj.alive = false;
            break;
        }
      }
    }
    this.projectiles = this.projectiles.filter(p => p.alive);

    // Track massive knockback dot damage
    for (const k of this.knockbacks) {
      k.timer -= dt;
      if (!k.ball.alive) { k.timer = 0; continue; }
      
      const dx = k.ball.position.x - k.prevPos.x;
      const dy = k.ball.position.y - k.prevPos.y;
      const dist = Math.sqrt(dx*dx + dy*dy);

      k.accumulatedDist += dist;
      k.prevPos = k.ball.position.clone();

      if (dist > 3 && k.ownerWeapon) {
          const dmg = dist * 0.5; // Exactly * 0.5 as requested
          k.ball.takeDamage(dmg, k.ownerWeapon.owner, true);
          k.ownerWeapon.damageDealt += dmg;
      }

      // If they naturally slow down, or collide tightly with a wall triggering consecutive frame bounces
      if (k.ball.velocity.magnitude < 200 || k.ball._bouncedThisFrame) {
          k.timer = 0;
      }
    }
    this.knockbacks = this.knockbacks.filter(k => k.timer > 0);
  }

  clear() {
    this.projectiles = [];
    this.knockbacks = [];
  }
}
