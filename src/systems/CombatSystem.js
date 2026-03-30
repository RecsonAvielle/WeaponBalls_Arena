import { circlesOverlap, segmentToPointDistance, segmentDistance } from '../core/Physics.js';
import { Vector2 } from '../core/Vector2.js';
import { bus }     from './EventBus.js';

const PARRY_IMPULSE = 400;

export class CombatSystem {
  constructor({ friendlyFire = false } = {}) {
    this.friendlyFire     = friendlyFire;
    this._parryCooldowns  = new Map();
    this._damageCooldowns = new Map();
    this._allyHealCooldowns = new Map(); // separate from damage cooldowns
  }

  update(balls, minions = []) {
    for (const [key, t] of this._parryCooldowns) {
      if (t <= 0) this._parryCooldowns.delete(key); else this._parryCooldowns.set(key, t - 1);
    }
    for (const [key, t] of this._damageCooldowns) {
      if (t <= 0) this._damageCooldowns.delete(key); else this._damageCooldowns.set(key, t - 1);
    }
    for (const [key, t] of this._allyHealCooldowns) {
      if (t <= 0) this._allyHealCooldowns.delete(key); else this._allyHealCooldowns.set(key, t - 1);
    }

    for (let i = 0; i < balls.length; i++) {
      for (let j = i + 1; j < balls.length; j++) {
        const a = balls[i];
        const b = balls[j];
        if (a.isFrozen || b.isFrozen) continue;

        const teammates = !this.friendlyFire && a.team !== 0 && a.team === b.team;

        if (!teammates) {
          if (a.weapon) {
            if (a.weapon.isBodyWeapon) this._checkBodyHit(a, b);
            else                       this._checkWeaponHit(a, b);
          }
          if (b.weapon) {
            if (b.weapon.isBodyWeapon) this._checkBodyHit(b, a);
            else                       this._checkWeaponHit(b, a);
          }
        }

        // Siphon ally heal — runs even for teammates
        if (teammates || a.team === b.team) {
          if (a.weapon?.constructor.name === 'SiphonWeapon') this._checkSiphonAllyHeal(a, b);
          if (b.weapon?.constructor.name === 'SiphonWeapon') this._checkSiphonAllyHeal(b, a);
        }

        if (a.weapon && b.weapon && !a.weapon.isBodyWeapon && !b.weapon.isBodyWeapon) {
          this._checkParry(a, b);
        }
      }
    }

    // Weapon knockback on minions
    for (const ball of balls) {
      if (ball.isFrozen || !ball.weapon || ball.weapon.isBodyWeapon) continue;
      const seg = ball.weapon.getWorldSegment(ball);
      if (!seg) continue;
      for (const mini of minions) {
        if (mini.ownerId === ball.id) continue;
        if (ball.team !== 0 && mini.ownerTeam === ball.team) continue;
        const { dist } = segmentToPointDistance(seg.start, seg.end, mini.position);
        if (dist >= (ball.weapon.scaledWeaponWidth ?? 14) / 2 + mini.radius) continue;
        const away = mini.position.sub(ball.position).normalized;
        mini.velocity = mini.velocity.add(away.scale(500));
      }
    }
  }

  _checkSiphonAllyHeal(attacker, target) {
    if (!attacker.weapon.isReady || !target.alive) return;
    if (attacker.team === 0 || attacker.team !== target.team) return;

    // Weapon segment contact — same logic as _checkWeaponHit
    const weaponDir = new Vector2(Math.cos(attacker.spinAngle), Math.sin(attacker.spinAngle));
    const toTarget  = target.position.sub(attacker.position).normalized;
    if (weaponDir.dot(toTarget) <= 0) return;

    const seg = attacker.weapon.getWorldSegment(attacker);
    if (!seg) return;
    const { dist } = segmentToPointDistance(seg.start, seg.end, target.position);
    if (dist >= target.radius) return;

    attacker.weapon.onCollide(attacker, target);
  }

  _checkBodyHit(attacker, target) {
    if (!attacker.weapon.isReady || !target.alive || target.isImmune) return;
    const key = `${attacker.id}→${target.id}`;
    if (this._damageCooldowns.has(key)) return;
    if (!circlesOverlap(attacker, target)) return;
    attacker.weapon.onCollide(attacker, target);
    this._damageCooldowns.set(key, Math.ceil(attacker.weapon.cooldown * 60) + 2);
  }

  _checkWeaponHit(attacker, target) {
    if (!attacker.weapon.isReady || !target.alive || target.isImmune) return;

    const weaponDir = new Vector2(Math.cos(attacker.spinAngle), Math.sin(attacker.spinAngle));
    const toTarget  = target.position.sub(attacker.position).normalized;
    if (weaponDir.dot(toTarget) <= 0) return;

    const seg = attacker.weapon.getWorldSegment(attacker);
    if (!seg) return;
    const { dist } = segmentToPointDistance(seg.start, seg.end, target.position);
    if (dist >= target.radius) return;

    attacker.weapon.onCollide(attacker, target);
  }

  _checkParry(a, b) {
    if (a.isImmune || b.isImmune) return;
    if (a.team !== 0 && a.team === b.team) return;
    const pairKey = `${a.id}:${b.id}`;
    if (this._parryCooldowns.has(pairKey)) return;

    const segA = a.weapon.getWorldSegment(a);
    const segB = b.weapon.getWorldSegment(b);
    if (!segA || !segB) return;

    const threshold = (a.weapon.weaponWidth + b.weapon.weaponWidth) / 2;
    if (segmentDistance(segA.start, segA.end, segB.start, segB.end) > threshold) return;

    const apart  = b.position.sub(a.position);
    const dir    = apart.magnitude > 0 ? apart.normalized : new Vector2(1, 0);
    a.velocity   = a.velocity.sub(dir.scale(PARRY_IMPULSE * (a.knockbackResist ?? 1.0)));
    b.velocity   = b.velocity.add(dir.scale(PARRY_IMPULSE * (b.knockbackResist ?? 1.0)));
    a.flipSpin();
    b.flipSpin();
    a._parryFreeze = 0.12;
    b._parryFreeze = 0.12;
    a.weapon.onParry?.(a, b);
    b.weapon.onParry?.(b, a);
    bus.emit('sfx:parry', {});
    this._parryCooldowns.set(pairKey, 30);
  }
}