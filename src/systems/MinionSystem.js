/**
 * MinionSystem.js
 * Manages Hostess mini-balls.
 *
 * Minis:
 *   - Chase nearest non-team enemy, no gravity
 *   - Contact damage 1, high knockback on self after hit
 *   - Get knocked back more by enemy hits (knockbackMult on velocity)
 *   - Max 8 per Hostess instance at once
 *   - Not destroyable
 *   - Have a lifetime, expire naturally
 */
import { Vector2 } from '../core/Vector2.js';

const BASE_MINI_RADIUS = 10;
const MINI_SPEED      = 420;   // max chase speed
const MINI_ACCEL      = 600;   // px/s² toward target
const SELF_KNOCKBACK  = 600;   // px/s away from target after hitting
const DMGCOOL_FRAMES  = 30;    // frames between hits per mini-ball pair

export class MinionSystem {
  constructor() {
    this.minions = [];
    this._dmgCooldowns = new Map();
  }

  /**
   * Spawn a batch of minis for a Hostess ball.
   */
  spawn({ count, x, y, lifetime, color, ownerId, ownerTeam = 0, ownerWeapon }) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const scale = ownerWeapon?.scale ?? 1;
      const radius = BASE_MINI_RADIUS * scale;
      this.minions.push({
        id        : `mini-${ownerId}-${Date.now()}-${i}`,
        position  : new Vector2(
          x + Math.cos(angle) * 40,
          y + Math.sin(angle) * 40,
        ),
        velocity  : new Vector2(Math.cos(angle) * 80, Math.sin(angle) * 80),
        radius,
        lifetime,
        color,
        ownerId,
        ownerTeam,
        ownerWeapon,
      });
    }
  }

  /** Count of live minions owned by a given ball */
  countFor(ownerId) {
    return this.minions.filter(m => m.ownerId === ownerId).length;
  }

  update(dt, balls, arena, obstacleSystem = null, spikeSystem = null) {
    // Decay damage cooldowns
    for (const [key, t] of this._dmgCooldowns) {
      if (t <= 1) this._dmgCooldowns.delete(key);
      else        this._dmgCooldowns.set(key, t - 1);
    }

    for (const mini of this.minions) {
      mini.lifetime -= dt;

      // Find nearest enemy to chase
      let nearest = null, nearestDist = Infinity;
      for (const ball of balls) {
        if (!ball.alive) continue;
        if (ball.id === mini.ownerId) continue;
        if (mini.ownerTeam !== 0 && ball.team === mini.ownerTeam) continue;
        const d = mini.position.distanceTo(ball.position);
        if (d < nearestDist) { nearestDist = d; nearest = ball; }
      }

      // Wall repulsion — push away from nearby walls to prevent hugging
      const { x: ax, y: ay, width: aw, height: ah } = arena;
      const mr = mini.radius;
      const repulse  = MINI_ACCEL * 1.5 * dt;
      const wallZone = mr * 4; // repulsion starts within 4 radii of wall
      let repX = 0, repY = 0;
      if (mini.position.x - ax        < wallZone) repX += repulse;
      if (ax + aw - mini.position.x   < wallZone) repX -= repulse;
      if (mini.position.y - ay        < wallZone) repY += repulse;
      if (ay + ah - mini.position.y   < wallZone) repY -= repulse;

      // Chase — apply acceleration toward target
      if (nearest) {
        const dir = nearest.position.sub(mini.position).normalized;
        mini.velocity = mini.velocity.add(dir.scale(MINI_ACCEL * dt));
      }

      // Apply repulsion on top of chase
      mini.velocity = new Vector2(mini.velocity.x + repX, mini.velocity.y + repY);

      // Clamp speed
      const spd = mini.velocity.magnitude;
      if (spd > MINI_SPEED) mini.velocity = mini.velocity.scale(MINI_SPEED / spd);

      // Hard-zero velocity into walls before moving
      if (mini.position.x <= ax + mr      && mini.velocity.x < 0) mini.velocity = new Vector2(0, mini.velocity.y);
      if (mini.position.x >= ax + aw - mr && mini.velocity.x > 0) mini.velocity = new Vector2(0, mini.velocity.y);
      if (mini.position.y <= ay + mr      && mini.velocity.y < 0) mini.velocity = new Vector2(mini.velocity.x, 0);
      if (mini.position.y >= ay + ah - mr && mini.velocity.y > 0) mini.velocity = new Vector2(mini.velocity.x, 0);

      // Move
      mini.position = mini.position.add(mini.velocity.scale(dt));

      // Hard clamp position to arena bounds
      mini.position = new Vector2(
        Math.max(ax + mr, Math.min(mini.position.x, ax + aw - mr)),
        Math.max(ay + mr, Math.min(mini.position.y, ay + ah - mr)),
      );

      // Obstacle collision — push mini out of any AABB obstacles
      if (obstacleSystem) {
        for (const obs of obstacleSystem.obstacles) {
          const nearX = Math.max(obs.x, Math.min(mini.position.x, obs.x + obs.width));
          const nearY = Math.max(obs.y, Math.min(mini.position.y, obs.y + obs.height));
          const dx    = mini.position.x - nearX;
          const dy    = mini.position.y - nearY;
          const dist  = Math.sqrt(dx*dx + dy*dy);
          if (dist < mr && dist > 0) {
            const push = (mr - dist) / dist;
            mini.position = new Vector2(mini.position.x + dx * push, mini.position.y + dy * push);
            // Cancel velocity into obstacle
            const nx = dx / dist, ny = dy / dist;
            const dot = mini.velocity.x * nx + mini.velocity.y * ny;
            if (dot < 0) mini.velocity = new Vector2(
              mini.velocity.x - dot * nx,
              mini.velocity.y - dot * ny,
            );
          }
        }
      }

      // Check contact with balls
      for (const ball of balls) {
        if (!ball.alive) continue;
        if (ball.id === mini.ownerId) continue;
        if (mini.ownerTeam !== 0 && ball.team === mini.ownerTeam) continue;

        const dist = mini.position.distanceTo(ball.position);
        if (dist >= mini.radius + ball.radius) continue;

        const key = `${mini.id}-${ball.id}`;
        if (this._dmgCooldowns.has(key)) continue;

        // Deal damage to ball — no velocity burst (silent) but apply small push
        ball.takeDamage(1, null, true);
        // Small push to ball
        const away = ball.position.sub(mini.position).normalized;
        ball.velocity = ball.velocity.add(away.scale(110 * (ball.knockbackResist ?? 1)));

        if (mini.ownerWeapon) {
          mini.ownerWeapon.damageDealt += 1;
          mini.ownerWeapon._onMiniHit?.();
        }

        // Mini bounces away — reduced by miniKnockback scaling
        const selfKb    = mini.ownerWeapon?.miniKnockback ?? SELF_KNOCKBACK;
        const bounceDir = mini.position.sub(ball.position).normalized;
        mini.velocity   = bounceDir.scale(selfKb);

        this._dmgCooldowns.set(key, DMGCOOL_FRAMES);
      }

      // Minis get knocked back more by balls colliding into them
      for (const ball of balls) {
        if (!ball.alive) continue;
        const dist = mini.position.distanceTo(ball.position);
        if (dist >= mini.radius + ball.radius) continue;
      // Push mini away from ball
        const away2   = mini.position.sub(ball.position).normalized;
        const ballSpd = ball.velocity.magnitude;
        const recvKb  = mini.ownerWeapon?.miniKnockback ?? SELF_KNOCKBACK;
        if (ballSpd > 50) mini.velocity = mini.velocity.add(away2.scale(ballSpd * 0.25 * (recvKb / SELF_KNOCKBACK)));
      }
    }

    this.minions = this.minions.filter(m => m.lifetime > 0);
  }

  clear() { this.minions = []; this._dmgCooldowns.clear(); }
}