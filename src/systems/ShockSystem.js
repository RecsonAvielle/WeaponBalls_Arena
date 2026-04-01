/**
 * ShockSystem.js
 *
 * Shocks have two tiers:
 *   - Main: fires at fixed position, base radius 100px, +1.5px per fire
 *   - Chain: fires at CURRENT position of targetBall, base 80px
 *
 * Every 2px of main radius growth: main shock damage +1 (tracked on weapon).
 * Chain delay: 0.25s. Up to 5 chains total.
 * Visual: instant flash, 0.2s fade.
 */

const CHAIN_DELAY = 0.25;

export class ShockSystem {
  constructor() {
    this.pending = [];
    this.rings   = [];
  }

  spawn({ x, y, radius, damage, color, ownerId, ownerTeam = 0, ownerWeapon,
          chainLeft = 5, delay = 0, isMain = false, targetBall = null, prevTargetId = null }) {
    this.pending.push({ x, y, radius, damage, color, ownerId, ownerTeam,
      ownerWeapon, chainLeft, timer: delay, isMain, targetBall, prevTargetId });
  }

  update(dt, balls) {
    for (const r of this.rings) r.t -= dt;
    this.rings = this.rings.filter(r => r.t > 0);

    const toFire = [];
    for (const s of this.pending) {
      s.timer -= dt;
      if (s.timer <= 0) toFire.push(s);
    }
    this.pending = this.pending.filter(s => s.timer > 0);
    for (const shock of toFire) this._fire(shock, balls);
  }

  _fire(shock, balls) {
    const fx = shock.targetBall?.alive ? shock.targetBall.position.x : shock.x;
    const fy = shock.targetBall?.alive ? shock.targetBall.position.y : shock.y;

    this.rings.push({ x: fx, y: fy, radius: shock.radius, t: 0.2, maxT: 0.2, color: shock.color });

    const chainCandidates = [];
    let hitCount = 0;

    for (const ball of balls) {
      if (!ball.alive) continue;
      if (ball.id === shock.prevTargetId) continue;

      const dx = ball.position.x - fx;
      const dy = ball.position.y - fy;
      if (Math.sqrt(dx * dx + dy * dy) > shock.radius + ball.radius) continue;

      chainCandidates.push(ball);

      if (ball.id === shock.ownerId) continue;
      if (shock.ownerTeam !== 0 && ball.team === shock.ownerTeam) continue;

      ball.takeDamage(shock.damage, null, true);
      if (shock.ownerWeapon) shock.ownerWeapon.damageDealt += shock.damage;
      hitCount++;
    }

    // Main shock: grow radius and check damage tier
    if (shock.ownerWeapon && shock.isMain && hitCount > 0) {
      shock.ownerWeapon._radiusGrowth  = (shock.ownerWeapon._radiusGrowth  ?? 0) + 1.0;
      shock.ownerWeapon.mainAoeRadius += 1.0;
      
      shock.ownerWeapon._hitCounter = (shock.ownerWeapon._hitCounter ?? 0) + 1;
      if (shock.ownerWeapon._hitCounter >= 2) {
          shock.ownerWeapon._hitCounter = 0;
          shock.ownerWeapon._damageTier  = (shock.ownerWeapon._damageTier ?? 0) + 1;
          shock.ownerWeapon._bonusDamage = (shock.ownerWeapon._bonusDamage ?? 0) + 1;
      }
    }

    // Chain
    if (shock.chainLeft > 0 && chainCandidates.length > 0) {
      const target     = chainCandidates[Math.floor(Math.random() * chainCandidates.length)];
      const w          = shock.ownerWeapon;
      const nextPrevId = shock.targetBall?.id ?? shock.ownerId;
      this.spawn({
        x           : target.position.x,
        y           : target.position.y,
        radius      : 100, // Explicit 100 no-scaling
        damage      : 2,   // Explicit 2 dmg no-scaling
        color       : shock.color,
        ownerId     : shock.ownerId,
        ownerTeam   : shock.ownerTeam,
        ownerWeapon : w,
        chainLeft   : shock.chainLeft - 1,
        delay       : CHAIN_DELAY,
        isMain      : false,
        targetBall  : target,
        prevTargetId: nextPrevId,
      });
    }
  }

  clear() { this.pending = []; this.rings = []; }
}