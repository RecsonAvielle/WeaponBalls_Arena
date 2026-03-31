import { Vector2 } from '../core/Vector2.js';

export class BlightAISystem {
  update(dt, alive, currentArena) {
    if (!currentArena.isWaveArena) return;

    const challengers = alive.filter(b => b.team === 1);
    const blight      = alive.filter(b => b.isBlight);

    // Blight chase AI
    for (const ball of blight) {
      if (ball.blightType === 'weaponless' || ball.blightType === 'melee') {
        let nearest = null, nearestDist = Infinity;
        for (const t of challengers) {
          const d = ball.position.distanceTo(t.position);
          if (d < nearestDist) { nearestDist = d; nearest = t; }
        }
        if (nearest) {
          const dir   = nearest.position.sub(ball.position).normalized;
          const accel = 280 * dt;
          ball.velocity = new Vector2(
            ball.velocity.x + dir.x * accel,
            ball.velocity.y + dir.y * accel,
          );
        }
      }
      
      // Update blight ranger target list
      if (ball.weapon && ball.weapon.targetBalls !== undefined) {
        ball.weapon.targetBalls = challengers;
      }
    }

    // Division wall logic — challengers can't cross above divisionY
    const divY = currentArena.divisionY;
    for (const ball of alive.filter(b => !b.isBlight)) {
      if (ball.position.y - ball.radius < divY) {
        ball.position = new Vector2(ball.position.x, divY + ball.radius);
        // Only cancel upward component — preserve all other velocity
        if (ball.velocity.y < 0) {
          ball.velocity = new Vector2(ball.velocity.x, Math.abs(ball.velocity.y) * 0.6);
        }
      }
    }
  }
}
