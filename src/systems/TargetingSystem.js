export class TargetingSystem {
  update(alive, obsSystem) {
    for (const ball of alive) {
      if (ball.weapon) {
        if (ball.weapon.requiresTargeting) {
          ball.weapon.targetBalls = alive.filter(
            b => b !== ball && (ball.team === 0 || b.team !== ball.team)
          );
        }
        if (ball.weapon.requiresObstacles) {
          ball._obstacleSystem = obsSystem;
        }
      }
    }
  }
}
