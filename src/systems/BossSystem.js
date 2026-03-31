export class BossSystem {
  setupBoss(ball, cfg) {
    ball.radius = 72;
    ball.maxSpeed = Math.min(cfg.maxSpeed * 0.75, 520);
    ball.maxHp = 10000;
    ball.hp = 10000;
    
    if (ball.weapon) {
      ball.weapon.scale = 2.0;
    }
    ball.knockbackResist = 0; // immune to all external pushes
  }

  setupChallenger(ball) {
    ball.maxHp = 750;
    ball.hp = 750;
  }

  update(dt, alive, currentArena) {
    if (!currentArena.isBossArena) return;
    
    // Future expansion: boss phases, special attacks, dynamic hp scaling checks, etc.
  }
}
