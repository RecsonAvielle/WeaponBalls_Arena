/**
 * ShieldWeapon.js — Shield ball (Silver)
 *
 * Same weapon shape as Archer (wide flat face, pointing forward).
 * No contact damage. On parry: reflects attacker's damage & effect back.
 * Each parry: shield width grows by 10% (no cap).
 *
 * Width multiplier = 1 + parryCount * 0.1
 * So after 10 parries the shield is 2× as wide, etc.
 */
import { Weapon }  from './Weapon.js';
import { Vector2 } from '../core/Vector2.js';

const BASE_REACH = 46;
const BASE_THICK = 14;

export class ShieldWeapon extends Weapon {
  constructor() {
    super({ name: 'Shield', cooldown: 0, color: '#8D99AE', reach: BASE_REACH, weaponWidth: BASE_THICK });
  }

  get widthMult() { return 1 + this.hitsLanded * 0.02; } // +2% per parry

  // Only WIDTH (reach, the long axis) grows — depth (thick) stays fixed
  get effectiveReach() { return BASE_REACH * this.widthMult * (this.scale ?? 1); }
  get effectiveThick() { return BASE_THICK                  * (this.scale ?? 1); }

  onCollide() { return false; }

  onParry(owner, attacker) {
    this.hitsLanded++;

    if (!attacker?.weapon) return;
    const w   = attacker.weapon;
    const dmg = typeof w.currentDamage === 'function'
      ? w.currentDamage(attacker)
      : (w.currentDamage ?? w.baseDamage ?? 2);
    if (dmg > 0) {
      attacker.takeDamage(dmg, owner);
      this.damageDealt += dmg;
    }
    if (owner.effects?.burn)  attacker.applyEffect('burn',  { ...owner.effects.burn });
    if (owner.effects?.frost) attacker.applyEffect('frost', { ...owner.effects.frost });
  }

  getWorldSegment(ball) {
    const angle = ball.spinAngle;
    const fx = Math.cos(angle), fy = Math.sin(angle);
    const rx = -fy,             ry =  fx;
    // Depth uses BASE_THICK (scaled only, never grows), width uses effectiveReach
    const depth = ball.radius + 1 + this.effectiveThick;
    const cx    = ball.position.x + fx * depth;
    const cy    = ball.position.y + fy * depth;
    const half  = this.effectiveReach / 2;
    return {
      start : new Vector2(cx - rx * half, cy - ry * half),
      end   : new Vector2(cx + rx * half, cy + ry * half),
    };
  }

  render(ctx, x, y, radius, spinAngle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spinAngle);

    const rX = radius + 1;
    const rW = this.effectiveThick;   // depth — fixed
    const rH = this.effectiveReach;   // width — grows

    ctx.fillStyle   = this.color;
    ctx.strokeStyle = '#2C2C2C';
    ctx.lineWidth   = 1.5;
    ctx.fillRect(rX, -rH / 2, rW, rH);
    ctx.strokeRect(rX, -rH / 2, rW, rH);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(rX + 3, -rH / 2 + 3);
    ctx.lineTo(rX + rW - 3, -rH / 2 + 3);
    ctx.stroke();
    ctx.restore();
  }
}