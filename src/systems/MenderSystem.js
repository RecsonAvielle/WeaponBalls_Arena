/**
 * MenderSystem.js
 * Manages Mender's heal pulse aoe fields.
 *
 * Each field follows the Mender ball while active.
 * Heals self + allies (same team) 1hp every HEAL_INTERVAL seconds.
 * In FFA (team 0), only heals the Mender itself.
 * Each tick costs 1 healCharge from the weapon.
 * Field expires when healCharges reach 0 or Mender dies.
 * No hp cap on healing.
 */

export const HEAL_INTERVAL = 0.3;
export const MENDER_RADIUS = 100;

export class MenderSystem {
  constructor() {
    /** @type {Array<{ownerId, ownerTeam, ownerBall, ownerWeapon, tickTimer}>} */
    this.fields = [];
  }

  spawn({ ownerId, ownerTeam, ownerBall, ownerWeapon }) {
    // Only one active field per Mender at a time
    this.fields = this.fields.filter(f => f.ownerId !== ownerId);
    this.fields.push({ ownerId, ownerTeam, ownerBall, ownerWeapon, tickTimer: 0 });
  }

  update(dt, balls) {
    for (const field of this.fields) {
      if (!field.ownerBall.alive) continue;
      if (field.ownerWeapon.healCharges <= 0) continue;

      field.tickTimer -= dt;
      if (field.tickTimer > 0) continue;
      field.tickTimer = HEAL_INTERVAL;

      const fx = field.ownerBall.position.x;
      const fy = field.ownerBall.position.y;

      for (const ball of balls) {
        if (!ball.alive) continue;
        if (field.ownerWeapon.healCharges <= 0) break;

        const isOwner = ball.id === field.ownerId;
        const isAlly  = field.ownerTeam !== 0 && ball.team === field.ownerTeam;
        if (!isOwner && !isAlly) continue;

        const dx = ball.position.x - fx;
        const dy = ball.position.y - fy;
        const scale = field.ownerWeapon.scale ?? 1;
        if (Math.sqrt(dx * dx + dy * dy) > MENDER_RADIUS * scale + ball.radius) continue;

        ball.heal(1);
        field.ownerWeapon.healCharges--;
      }
    }

    this.fields = this.fields.filter(f =>
      f.ownerBall.alive && f.ownerWeapon.healCharges > 0
    );
  }

  isActive(ownerId) {
    return this.fields.some(f => f.ownerId === ownerId && f.ownerWeapon.healCharges > 0);
  }

  clear() { this.fields = []; }
}