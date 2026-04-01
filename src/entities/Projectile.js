/**
 * Projectile.js
 * A single projectile fired by Archer, Pellet, or future ranged balls.
 *
 * projWidth / projHeight control the rendered rectangle shape.
 * For a square (Pellet): projWidth = projHeight = 7.
 * For a rectangle (Archer): projWidth = 26, projHeight = 7.
 */
import { Vector2 } from '../core/Vector2.js';

export class Projectile {
  constructor({ x, y, angle, speed, damage, ownerId, ownerTeam = 0, color,
                radius = 5, lifetime = 2.5, projWidth = 26, projHeight = 7, isCircle = false }) {
    this.position   = new Vector2(x, y);
    this.velocity   = new Vector2(Math.cos(angle) * speed, Math.sin(angle) * speed);
    this.damage     = damage;
    this.ownerId    = ownerId;
    this.ownerTeam  = ownerTeam;
    this.color      = color;
    this.radius     = radius;
    this.lifetime   = lifetime;
    this.alive      = true;
    this.projWidth  = projWidth;
    this.projHeight = projHeight;
    this.isCircle   = isCircle;
  }

  update(dt) {
    this.lifetime -= dt;
    if (this.lifetime <= 0) { this.alive = false; return; }
    this.position = this.position.add(this.velocity.scale(dt));
  }
}