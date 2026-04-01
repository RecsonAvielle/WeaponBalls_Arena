/**
 * Weapon.js — base class for all weapons.
 *
 * Subclasses override:
 *   onCollide, onDeath, onHit, getSpinMultiplier, getDisplayStats
 */

import { Vector2 } from '../core/Vector2.js';

export class Weapon {
  constructor({ name, cooldown = 1, color = '#ffffff', reach = 38, weaponWidth = 14 }) {
    this.name        = name;
    this.cooldown    = cooldown;
    this.color       = color;
    this.reach       = reach;
    this.weaponWidth = weaponWidth;
    this.scale       = 1.0;  // boss multiplier — scales reach and render
    this._timer      = 0;
    this.hitsLanded  = 0;
    this.damageDealt = 0; // total damage dealt — shown in details panel
    this._targetCooldowns = new Map(); // per-target hit cooldown for melee
    this.owner       = null;
    this.baseDamage  = 2; // default; overridden by subclasses
    
    // Interface properties for GameManager to resolve automatically
    this.requiresTargeting = false; 
    this.requiresObstacles = false;
  }

  get scaledReach()       { return this.reach       * this.scale; }
  get scaledWeaponWidth() { return this.weaponWidth * this.scale; }

  get isReady()   { return this._timer <= 0; }
  resetCooldown() {
    if (this._currentTargetId != null) {
      this._targetCooldowns.set(this._currentTargetId, this.cooldown);
    } else {
      this._timer = this.cooldown; // fallback for body weapons
    }
  }

  isReadyFor(targetId) { return !this._targetCooldowns.has(targetId); }
  resetCooldownFor(targetId) { this._targetCooldowns.set(targetId, this.cooldown); }

  /**
   * Multiplier applied to spinSpeed each tick.
   * Weapons that modify spin override this.
   * The SIGN of spinSpeed is preserved — this multiplier only affects magnitude.
   */
  getSpinMultiplier() { return 1; }

  /**
   * Returns an array of [label, value] pairs for the details panel.
   * Override in each weapon to show relevant stats.
   */
  getDisplayStats() {
    return [['Damage', Math.ceil(this.getCurrentDamage())]];
  }

  /** Current effective damage — override in subclasses that scale. */
  getCurrentDamage() { return this.baseDamage; }

  /** World segment for parry detection. */
  getWorldSegment(ball) {
    const cos = Math.cos(ball.spinAngle), sin = Math.sin(ball.spinAngle);
    const r   = this.scaledReach;
    return {
      start : new Vector2(ball.position.x + ball.radius * cos,              ball.position.y + ball.radius * sin),
      end   : new Vector2(ball.position.x + (ball.radius + r) * cos,        ball.position.y + (ball.radius + r) * sin),
    };
  }

  onTick(dt, owner) {
    if (this._timer > 0) this._timer -= dt;
    for (const [id, t] of this._targetCooldowns) {
      const next = t - dt;
      if (next <= 0) this._targetCooldowns.delete(id);
      else           this._targetCooldowns.set(id, next);
    } 
  }

  onCollide(owner, target)  { return false; }
  onDeath(owner)            {}
  onHit(owner, amount, src) {}
  /** Called by CombatSystem when this weapon is involved in a parry. */
  onParry(owner)            {}

  /** Default render: flat rectangle. Subclasses call super or replace entirely. */
  render(ctx, x, y, radius, spinAngle, owner) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spinAngle);
    const rX = radius + 1, rW = this.scaledReach, rH = this.scaledWeaponWidth, rY = -rH / 2;
    ctx.fillStyle   = this.isReady ? this.color : '#ffffff';
    ctx.strokeStyle = '#2C2C2C';
    ctx.lineWidth   = 1.5;
    ctx.fillRect(rX, rY, rW, rH);
    ctx.strokeRect(rX, rY, rW, rH);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(rX + 3, rY + 3);
    ctx.lineTo(rX + rW - 4, rY + 3);
    ctx.stroke();
    ctx.restore();
  }

  resetScaling() {
    this.hitsLanded = 0;
    this.damageDealt = 0;
    this._targetCooldowns.clear();
  }
}