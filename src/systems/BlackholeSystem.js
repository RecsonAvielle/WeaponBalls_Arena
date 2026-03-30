/**
 * BlackholeSystem.js
 *
 * Phase 1 — Projectile: travels to fixed target position at PROJ_SPEED.
 *   Destroyed by walls or obstacles on contact (fires pull event at hit point).
 *   Does NOT damage balls on contact — passes through them.
 *
 * Phase 2 — Channel: 1.5s pulsing circle at arrival point.
 *   All enemies in radius get pulled to center each tick.
 *
 * Phase 3 — Pull: deals damage to all enemies still in radius, then ends.
 */
import { Vector2 } from '../core/Vector2.js';

const PROJ_SPEED    = 340;
const CHANNEL_TIME  = 1.5;
const PULL_RADIUS   = 100;

export class BlackholeSystem {
  constructor() {
    this.projectiles      = [];
    this.channels         = [];
    this.pendingTeleports = []; // { ball, x, y } — applied after physics
  }

  /**
   * Fire a blackhole projectile toward a fixed world position.
   */
  fire({ fromX, fromY, targetX, targetY, damage, pullRadius = PULL_RADIUS, color, ownerId, ownerTeam = 0, ownerWeapon }) {
    const dx   = targetX - fromX;
    const dy   = targetY - fromY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 1) return;
    const speed = PROJ_SPEED;
    this.projectiles.push({
      x: fromX, y: fromY,
      vx: (dx / dist) * speed,
      vy: (dy / dist) * speed,
      targetX, targetY,
      dist, traveled: 0,
      damage, pullRadius, color, ownerId, ownerTeam, ownerWeapon,
      alive: true,
    });
  }

  update(dt, balls, arena, obstacleSystem) {
    // Move projectiles
    for (const proj of this.projectiles) {
      if (!proj.alive) continue;
      proj.x        += proj.vx * dt;
      proj.y        += proj.vy * dt;
      proj.traveled += Math.sqrt(proj.vx ** 2 + proj.vy ** 2) * dt;

      // Reached target position
      if (proj.traveled >= proj.dist) {
        this._spawnChannel(proj, proj.targetX, proj.targetY, arena);
        proj.alive = false;
        continue;
      }

      // Hit arena wall
      const margin = 5;
      if (proj.x < arena.x + margin || proj.x > arena.x + arena.width  - margin ||
          proj.y < arena.y + margin || proj.y > arena.y + arena.height - margin) {
        this._spawnChannel(proj, proj.x, proj.y, arena);
        proj.alive = false;
        continue;
      }

      // Hit obstacle
      if (obstacleSystem?.resolveProjectile({ position: new Vector2(proj.x, proj.y), radius: 5, alive: true })) {
        this._spawnChannel(proj, proj.x, proj.y, arena);
        proj.alive = false;
      }
    }
    this.projectiles = this.projectiles.filter(p => p.alive);

    // Tick channels
    for (const ch of this.channels) {
      ch.timer -= dt;

      if (ch.timer <= 0) {
        // Channel ends — teleport enemies to center (keep velocity), deal damage
        let hitCount = 0;
        for (const ball of balls) {
          if (!ball.alive) continue;
          if (ball.id === ch.ownerId) continue;
          if (ch.ownerTeam !== 0 && ball.team === ch.ownerTeam) continue;

          const dx   = ch.x - ball.position.x;
          const dy   = ch.y - ball.position.y;
          if (Math.sqrt(dx * dx + dy * dy) > ch.pullRadius + ball.radius) continue;

          // Queue teleport — applied after physics to preserve velocity correctly
          this.pendingTeleports.push({ ball, x: ch.x, y: ch.y });
          ball.takeDamage(ch.damage, null, true);
          hitCount++;
        }

        // +2 base damage once per instance (regardless of how many balls hit)
        if (hitCount > 0 && ch.ownerWeapon) {
          ch.ownerWeapon.damageDealt += ch.damage * hitCount;
          ch.ownerWeapon.hitsLanded++;
          ch.ownerWeapon.baseDamage  += 2;
        }

        ch.alive = false;
      }
    }
    this.channels = this.channels.filter(c => c.alive);
  }

  _spawnChannel(proj, x, y, arena) {
    // Clamp channel center to arena bounds so balls never teleport outside
    const margin = 40;
    const cx = arena
      ? Math.max(arena.x + margin, Math.min(x, arena.x + arena.width  - margin))
      : x;
    const cy = arena
      ? Math.max(arena.y + margin, Math.min(y, arena.y + arena.height - margin))
      : y;
    this.channels.push({
      x: cx, y: cy,
      timer      : CHANNEL_TIME,
      maxTimer   : CHANNEL_TIME,
      pullRadius : proj.pullRadius ?? PULL_RADIUS,
      damage     : proj.damage,
      color      : proj.color,
      ownerId    : proj.ownerId,
      ownerTeam  : proj.ownerTeam,
      ownerWeapon: proj.ownerWeapon,
      alive      : true,
    });
  }

  clear() { this.projectiles = []; this.channels = []; this.pendingTeleports = []; }
}