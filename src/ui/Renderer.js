/**
 * Renderer.js — 520×520 square canvas.
 *
 * Death pops: passed in as an array of { x, y, color, t, maxT }.
 *   t counts down from maxT to 0. Renderer draws an expanding+fading ring.
 *   Dead balls no longer leave a ghost — arena stays clean.
 *
 * Weapon jitter fix: spinAngle interpolated between prevSpinAngle and spinAngle.
 */

export let CANVAS_W = 520;
export let CANVAS_H = 520;

export class Renderer {
  constructor(canvas) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    this.resize(CANVAS_W, CANVAS_H);
  }

  resize(w, h = w) {
    CANVAS_W = w; CANVAS_H = h;
    this.canvas.width  = w;
    this.canvas.height = h;
  }

  get width()   { return CANVAS_W; }
  get height()  { return CANVAS_H; }
  get isReady() { return true; }

  render(balls, deathPops, spikes, projectiles, obstacles, trails, healBoxes, shockRings, bhData, minions, frostAreas, laserBeams, alpha, arena, extraData = null) {
    const { ctx } = this;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

    ctx.fillStyle   = '#F5EFE0';
    ctx.strokeStyle = '#C4B99A';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    roundedRect(ctx, arena.x, arena.y, arena.width, arena.height, 8);
    ctx.fill();
    ctx.stroke();

    // Wave arena: staging zone background + division line
    if (extraData?.divisionY) {
      const { stagingZone, divisionY } = extraData;
      ctx.fillStyle = '#EDE6D8';
      ctx.fillRect(stagingZone.x, stagingZone.y, stagingZone.width, divisionY - stagingZone.y);
      ctx.strokeStyle = '#A09080';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([8, 5]);
      ctx.beginPath();
      ctx.moveTo(stagingZone.x, divisionY);
      ctx.lineTo(stagingZone.x + stagingZone.width, divisionY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Blight drawn after arena fill — visible in staging/battle zone
    if (extraData?.divisionY) {
      for (const ball of balls) {
        if (ball.alive && ball.isBlight) this._drawBall(ball, alpha);
      }
    }

    for (const obs    of obstacles)       this._drawObstacle(obs);
    for (const box    of healBoxes)       this._drawHealBox(box);
    for (const ring   of shockRings)      this._drawShockRing(ring);
    for (const fa     of frostAreas)      this._drawFrostArea(fa);
    for (const ch     of bhData.channels) this._drawBHChannel(ch);
    for (const beam of laserBeams)        this._drawLaserBeam(beam);
    for (const trail  of trails.trails)   this._drawTrail(trail);
    for (const circle of trails.circles)  this._drawCircle(circle);
    for (const spike  of spikes)          this._drawSpike(spike);
    for (const pop    of deathPops)       this._drawPop(pop);
    for (const proj   of projectiles)         this._drawProjectile(proj);
    for (const proj   of bhData.projectiles)  this._drawBHProjectile(proj);
    for (const mini   of minions)             this._drawMinion(mini);
    for (const ball   of balls) {
      if (ball.alive && !ball.isBlight) this._drawBall(ball, alpha);
    }

    // Wave arena: mask above staging area so spawning blight are hidden until they cross the top
    if (extraData?.divisionY) {
      const { stagingZone } = extraData;
      ctx.fillStyle = '#FDFAF5'; // matches page background
      ctx.fillRect(0, 0, CANVAS_W, stagingZone.y);
    }
  }

  _drawHealBox(box) {
    if (box.consumed) return;
    const { ctx } = this;
    const hs = box.size / 2;

    const t     = Date.now() / 1000;
    const phase = (box.x * 0.037 + box.y * 0.019) % (Math.PI * 2);
    const wobX  = Math.sin(t * 1.8 + phase)       * 2.5;
    const wobY  = Math.cos(t * 1.4 + phase + 1.1) * 2.0;
    const bx    = box.x + wobX;
    const by    = box.y + wobY;

    const TEAM_COLORS = [null,'#E63946','#457B9D','#2A9D8F','#F4A261','#6D4C9C','#A8C256','#E76F51','#D4A017'];
    const teamColor = box.team > 0 ? TEAM_COLORS[box.team] : null;

    ctx.save();

    // Fill — always plain green
    ctx.fillStyle = '#5CB85C';
    ctx.beginPath();
    roundedRect(ctx, bx - hs, by - hs, box.size, box.size, 4);
    ctx.fill();

    // Full black outline — always
    ctx.strokeStyle = '#2C2C2C';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    roundedRect(ctx, bx - hs, by - hs, box.size, box.size, 4);
    ctx.stroke();

    // Team outline — clipped to top-left quadrant (only when team box)
    if (teamColor) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(bx - hs - 4, by - hs - 4, hs + 4, hs + 4);
      ctx.clip();
      ctx.strokeStyle = teamColor;
      ctx.lineWidth   = 3;
      ctx.beginPath();
      roundedRect(ctx, bx - hs - 1, by - hs - 1, box.size + 2, box.size + 2, 5);
      ctx.stroke();
      ctx.restore();
    }

    // Amount number
    const txt      = String(box.amount);
    const fontSize = Math.max(10, box.size * 0.38 - (txt.length - 2));
    ctx.fillStyle    = '#1A1A1A';
    ctx.font         = `bold ${fontSize}px monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(txt, bx, by);
    ctx.restore();
  }

  _drawShockRing(ring) {
    const { ctx } = this;
    const alpha = ring.t / ring.maxT; // fades from 1 → 0 quickly
    ctx.save();
    // Bright filled circle flash
    ctx.globalAlpha = alpha * 0.35;
    ctx.fillStyle   = ring.color;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
    ctx.fill();
    // Sharp stroke ring
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = ring.color;
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.arc(ring.x, ring.y, ring.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  _drawTrail(trail) {
    const { ctx } = this;
    const fade  = Math.min(1, trail.t / 1.0); // fade last 1s like spikes
    const dx    = trail.end.x - trail.start.x;
    const dy    = trail.end.y - trail.start.y;
    const len   = Math.sqrt(dx * dx + dy * dy);
    if (len < 1) return;
    const angle = Math.atan2(dy, dx);
    const cx    = (trail.start.x + trail.end.x) / 2;
    const cy    = (trail.start.y + trail.end.y) / 2;
    const h     = trail.width ?? 28; // per-trail width (scales with boss)

    ctx.save();
    ctx.globalAlpha = fade * 0.75;
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.fillStyle   = trail.color;
    ctx.strokeStyle = '#ffffff55';
    ctx.lineWidth   = 1;
    ctx.fillRect(-len / 2, -h / 2, len, h);
    ctx.strokeRect(-len / 2, -h / 2, len, h);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  _drawLaserBeam(beam) {
    const { ctx } = this;
    const life  = beam.t / beam.maxT;       // 1.0 = just fired, 0.0 = expired
    const age   = 1 - life;                 // 0.0 = just fired, 1.0 = expired

    // Phase 1 (first 25% of lifetime): white flash fading to ball color
    // Phase 2 (remaining 75%): ball color fading to transparent
    const isFlash   = age < 0.25;
    const flashFrac = age / 0.25;           // 0→1 during flash phase
    const fadeFrac  = isFlash ? 1.0 : life / 0.75; // sustain then fade

    const dx    = beam.x2 - beam.x1;
    const dy    = beam.y2 - beam.y1;
    const len   = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);
    const cx    = (beam.x1 + beam.x2) / 2;
    const cy    = (beam.y1 + beam.y2) / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.globalAlpha = fadeFrac;

    if (isFlash) {
      // White → ball color blend using two overlapping rects
      ctx.fillStyle   = beam.color;
      ctx.fillRect(-len / 2, -3, len, 6);
      ctx.globalAlpha = fadeFrac * (1 - flashFrac); // white overlay fades out
      ctx.fillStyle   = '#FFFFFF';
      ctx.fillRect(-len / 2, -3, len, 6);
    } else {
      // Solid ball color, fading
      ctx.fillStyle = beam.color;
      ctx.fillRect(-len / 2, -3, len, 6);
    }

    ctx.restore();
    ctx.globalAlpha = 1;
  }

  _drawCircle(circle) {
    const { ctx } = this;
    const fade = Math.min(1, circle.t / 1.0);
    ctx.save();
    ctx.globalAlpha = fade * 0.6;
    ctx.fillStyle   = circle.color;
    ctx.strokeStyle = circle.color;
    ctx.lineWidth   = 3;
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = fade;
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  _drawObstacle(obs) {
    const { ctx } = this;
    ctx.fillStyle   = '#C4B99A';
    ctx.strokeStyle = '#8A7A60';
    ctx.lineWidth   = 2;
    ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
    ctx.strokeRect(obs.x, obs.y, obs.width, obs.height);
  }

  _drawProjectile(proj) {
    const { ctx } = this;
    const spd   = Math.sqrt(proj.velocity.x ** 2 + proj.velocity.y ** 2);
    const angle = spd > 0 ? Math.atan2(proj.velocity.y, proj.velocity.x) : 0;
    const rW    = proj.projWidth  ?? 26;
    const rH    = proj.projHeight ?? 7;

    ctx.save();
    ctx.translate(proj.position.x, proj.position.y);
    ctx.rotate(angle);
    ctx.fillStyle   = proj.color;
    ctx.strokeStyle = '#2C2C2C';
    ctx.lineWidth   = 1;
    ctx.fillRect(-rW / 2, -rH / 2, rW, rH);
    ctx.strokeRect(-rW / 2, -rH / 2, rW, rH);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(-rW / 2 + 2, -rH / 2 + 1.5);
    ctx.lineTo( rW / 2 - 2, -rH / 2 + 1.5);
    ctx.stroke();
    ctx.restore();
  }

  _drawSpike(spike) {
    const { ctx } = this;
    const hs   = spike.size / 2;
    const fade = Math.min(1, spike.t / 1.0);

    ctx.save();
    ctx.globalAlpha = fade;
    ctx.translate(spike.x, spike.y);
    ctx.rotate(Math.PI / 4); // 45° — diamond shape
    ctx.fillStyle   = spike.color;
    ctx.strokeStyle = '#2C2C2C';
    ctx.lineWidth   = 1.5;
    ctx.fillRect(-hs, -hs, spike.size, spike.size);
    ctx.strokeRect(-hs, -hs, spike.size, spike.size);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  _drawPop(pop) {
    const { ctx } = this;
    const prog  = 1 - (pop.t / pop.maxT); // 0 = just died, 1 = fully gone
    const r     = pop.radius * (1 + prog * 2.2); // expands to 3.2× original
    const alpha = 1 - prog;                       // fades out

    // Outer expanding ring
    ctx.strokeStyle = pop.color;
    ctx.lineWidth   = 3 * alpha;
    ctx.globalAlpha = alpha * 0.8;
    ctx.beginPath();
    ctx.arc(pop.x, pop.y, r, 0, Math.PI * 2);
    ctx.stroke();

    // Inner filled circle that shrinks
    const innerR = pop.radius * (1 - prog);
    if (innerR > 0) {
      ctx.fillStyle   = pop.color;
      ctx.globalAlpha = alpha * 0.4;
      ctx.beginPath();
      ctx.arc(pop.x, pop.y, innerR, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  _drawFrostArea(area) {
    const { ctx } = this;
    const fade = Math.min(1, area.t / 0.5); // fade last 0.5s
    ctx.save();
    ctx.globalAlpha = fade * 0.35;
    ctx.fillStyle   = '#2A9D8F';
    ctx.beginPath();
    ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = fade * 0.7;
    ctx.strokeStyle = '#2A9D8F';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.arc(area.x, area.y, area.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  _drawBHChannel(ch) {
    const { ctx } = this;
    const prog  = 1 - ch.timer / ch.maxTimer; // 0=just started, 1=about to fire
    const pulse = 0.6 + 0.4 * Math.sin(prog * Math.PI * 8); // pulsing opacity

    ctx.save();
    // Outer ring — shrinks as it channels (draws inward)
    const r = (ch.pullRadius ?? 100) * (1 - prog * 0.3);
    ctx.strokeStyle = ch.color;
    ctx.lineWidth   = 3;
    ctx.globalAlpha = pulse * 0.9;
    ctx.beginPath();
    ctx.arc(ch.x, ch.y, r, 0, Math.PI * 2);
    ctx.stroke();
    // Inner fill — grows as it charges
    ctx.fillStyle   = ch.color;
    ctx.globalAlpha = prog * 0.25 * pulse;
    ctx.beginPath();
    ctx.arc(ch.x, ch.y, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  _drawBHProjectile(proj) {
    const { ctx } = this;
    ctx.save();
    ctx.fillStyle = proj.color;
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, 7, 0, Math.PI * 2);
    ctx.fill();
    // Spiral effect — small cross
    ctx.strokeStyle = '#ffffff88';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.moveTo(proj.x - 5, proj.y); ctx.lineTo(proj.x + 5, proj.y);
    ctx.moveTo(proj.x, proj.y - 5); ctx.lineTo(proj.x, proj.y + 5);
    ctx.stroke();
    ctx.restore();
  }

  _drawMinion(mini) {
    const { ctx }   = this;
    const r = mini.radius;
    const fadeFrac  = Math.min(1, mini.lifetime / 0.8); // fade last 0.8s
    ctx.save();
    ctx.globalAlpha = fadeFrac;
    ctx.fillStyle   = mini.color;
    ctx.strokeStyle = '#2C2C2C';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.arc(mini.position.x, mini.position.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  _drawBall(ball, alpha) {
    const { ctx } = this;
    const x = ball.prevPosition.x + (ball.position.x - ball.prevPosition.x) * alpha;
    const y = ball.prevPosition.y + (ball.position.y - ball.prevPosition.y) * alpha;
    const r = ball.radius;

    // Interpolate spin angle — shortest path wrap-around
    let diff = ball.spinAngle - (ball.prevSpinAngle ?? ball.spinAngle);
    while (diff >  Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    const spinAngle = (ball.prevSpinAngle ?? ball.spinAngle) + diff * alpha;

    // Trail (Rush) — drawn before everything so it sits behind the ball
    if (ball.enableTrail && ball.trail.length > 1) {
      const len = ball.trail.length;
      for (let i = 0; i < len; i++) {
        const pt      = ball.trail[i];
        const frac    = (i + 1) / len;         // 0 = oldest, 1 = newest
        const trailR  = r * frac * 0.85;       // shrinks toward tail
        const trailA  = frac * 0.35;           // fades toward tail
        ctx.globalAlpha = trailA;
        ctx.fillStyle   = ball.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, trailR, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Weapon behind ball
    ball.weapon?.render(ctx, x, y, r, spinAngle, ball);

    // Ball body
    ctx.fillStyle   = ball.color;
    ctx.strokeStyle = '#2C2C2C';
    ctx.lineWidth   = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Team arc — 90° in top-left quadrant (π → 3π/2) when ball belongs to a team
    const TEAM_COLORS = [null,'#E63946','#457B9D','#2A9D8F','#F4A261','#6D4C9C','#A8C256','#E76F51','#D4A017'];
    if (ball.team > 0 && TEAM_COLORS[ball.team]) {
      ctx.strokeStyle = TEAM_COLORS[ball.team];
      ctx.lineWidth   = 3.5;
      ctx.beginPath();
      ctx.arc(x, y, r + 5, Math.PI, Math.PI * 1.5); // top-left 90°
      ctx.stroke();
    }

    // Surge shield arc — bottom 90° (π/2 → π, i.e. bottom of ball) with shield value
    const shield = ball.weapon?._shield ?? 0;
    if (shield > 0) {
      const arcR = r + 5;
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth   = 3.5;
      ctx.beginPath();
      ctx.arc(x, y, arcR, Math.PI * 0.5, Math.PI); // bottom-left quarter
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x, y, arcR, 0, Math.PI * 0.5);       // bottom-right quarter
      ctx.stroke();
      // Shield number below the ball
      ctx.fillStyle    = '#1A1A1A';
      ctx.font         = `bold ${Math.max(12, r * 0.52)}px monospace`;
      ctx.textAlign    = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(String(shield), x, y + arcR + 2);
    }

    // Status ring
    const statusColor = ball.effects?.stun  ? '#FFD700'
                      : ball.effects?.burn  ? '#FF6B35'
                      : ball.effects?.frost ? '#A8E6F0'
                      : ball.effects?.slow  ? '#00BFFF'
                      : null;
    if (statusColor) {
      ctx.strokeStyle = statusColor;
      ctx.lineWidth   = 2.5;
      ctx.setLineDash([5, 4]);
      ctx.beginPath();
      ctx.arc(x, y, r + 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Zip dashing glow — bright ring while dash is active
    if (ball.weapon?.isDashing) {
      ctx.strokeStyle = ball.color;
      ctx.lineWidth   = 3;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.arc(x, y, r + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    
    if (ball.weapon?.menderSystem?.isActive?.(ball.id)) {
      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.fillStyle   = '#4CAF50';
      ctx.beginPath();
      ctx.arc(x, y, 80, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = '#4CAF50';
      ctx.lineWidth   = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.arc(x, y, 80, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    // Hit flash — white overlay briefly when ball takes damage
    if (ball.hitFlash > 0) {
      const flashAlpha = ball.hitFlash / 6 * 0.55;
      ctx.fillStyle   = `rgba(255,255,255,${flashAlpha})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // HP number — larger, dark color
    const hpText   = String(Math.ceil(ball.hp));
    const fontSize = Math.max(15, r * 0.75 - (hpText.length - 2) * 2);
    ctx.fillStyle    = '#1A1A1A';
    ctx.font         = `bold ${fontSize}px monospace`;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(hpText, x, y);
  }

  drawCountdown(secondsLeft) {
    const ctx   = this.ctx;
    const num   = Math.ceil(secondsLeft);
    const frac  = secondsLeft % 1;
    const scale = 1 + (1 - frac) * 0.35;

    ctx.save();
    ctx.translate(CANVAS_W / 2, CANVAS_H / 2);    ctx.scale(scale, scale);
    ctx.fillStyle = 'rgba(253,250,245,0.75)';
    ctx.beginPath();
    ctx.arc(0, 0, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle    = '#2C2C2C';
    ctx.font         = 'bold 52px monospace';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(num), 0, 2);
    ctx.restore();
  }

  drawStopwatch(seconds, arenaY = 20) {
    const ctx  = this.ctx;
    const m    = Math.floor(seconds / 60);
    const s    = Math.floor(seconds % 60);
    const txt  = `${m}:${String(s).padStart(2, '0')}`;
    const scale = CANVAS_W / 520;
    const fs    = Math.round(12 * scale);
    ctx.save();
    ctx.font         = `bold ${fs}px monospace`;
    ctx.textAlign    = 'right';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle    = '#9C9080';
    // Always 4px above the arena top edge, regardless of canvas size
    ctx.fillText(txt, CANVAS_W - 4, arenaY - 4);
    ctx.restore();
  }

  destroy() {}
}

function roundedRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y,     x + w, y + h, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x,     y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x,     y + h, x,     y,     r);
  ctx.lineTo(x,    y + r);
  ctx.arcTo(x,     y,     x + w, y,     r);
  ctx.closePath();
}