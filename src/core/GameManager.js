import { Vector2 } from './Vector2.js';
import { resolveAllCollisions } from './Physics.js';
import { genSpawnPositions, genSpawnVelocities } from './SpawnPlacement.js';
import { Ball } from '../entities/Ball.js';

import { Renderer } from '../ui/Renderer.js';
import { HUD } from '../ui/HUD.js';

import { CombatSystem } from '../systems/CombatSystem.js';
import { EffectsSystem } from '../systems/EffectsSystem.js';
import { SpikeSystem } from '../systems/SpikeSystem.js';
import { ProjectileSystem } from '../systems/ProjectileSystem.js';
import { ObstacleSystem } from '../systems/ObstacleSystem.js';
import { TrailSystem } from '../systems/TrailSystem.js';
import { HealBoxSystem } from '../systems/HealBoxSystem.js';
import { ShockSystem } from '../systems/ShockSystem.js';
import { FrostAreaSystem } from '../systems/FrostAreaSystem.js';
import { BlackholeSystem } from '../systems/BlackholeSystem.js';
import { MinionSystem } from '../systems/MinionSystem.js';
import { MenderSystem } from '../systems/MenderSystem.js';
import { AudioSystem } from '../systems/AudioSystem.js';
import { LaserSystem } from '../systems/LaserSystem.js';
import { WaveSystem } from '../systems/WaveSystem.js';
import { BlightAISystem } from '../systems/BlightAISystem.js';
import { BossSystem } from '../systems/BossSystem.js';
import { TargetingSystem } from '../systems/TargetingSystem.js';
import { TurretSystem } from '../systems/TurretSystem.js';
import { bus, EVENTS } from '../systems/EventBus.js';

import { getBallConfigs } from '../data/BallConfigs.js';
import { ARENA_CONFIGS } from '../data/ArenaConfigs.js';

import { BlightWeaponless } from '../weapons/BlightWeaponless.js';
import { BlightMelee } from '../weapons/BlightMelee.js';
import { BlightRanger } from '../weapons/BlightRanger.js';
import { DummyWeapon } from '../weapons/DummyWeapon.js';

export class GameManager {
  constructor(canvas, hudElement) {
    this.renderer     = new Renderer(canvas);
    this.hud          = new HUD(hudElement);
    this.audio        = new AudioSystem();

    this.combat       = new CombatSystem({ friendlyFire: true });
    this.effects      = new EffectsSystem();
    this.spikes       = new SpikeSystem();
    this.projSys      = new ProjectileSystem();
    this.trails       = new TrailSystem();
    this.shockSys     = new ShockSystem();
    this.frostAreaSys = new FrostAreaSystem();
    this.bhSys        = new BlackholeSystem();
    this.laserSys     = new LaserSystem();
    this.minionSys    = new MinionSystem();
    this.menderSys    = new MenderSystem();
    this.waveSys      = new WaveSystem();
    
    this.blightAISys  = new BlightAISystem();
    this.bossSys      = new BossSystem();
    this.targetingSys = new TargetingSystem();

    this.turretSys    = new TurretSystem(this.projSys);

    this.obsSystem    = new ObstacleSystem([]);
    this.healBoxSys   = new HealBoxSystem([]);

    this.ballConfigs  = getBallConfigs({
      frostAreaSys: this.frostAreaSys,
      spikes:       this.spikes,
      projSys:      this.projSys,
      trails:       this.trails,
      shockSys:     this.shockSys,
      bhSys:        this.bhSys,
      minionSys:    this.minionSys,
      menderSys:    this.menderSys,
      laserSys:     this.laserSys,
      turretSys:    this.turretSys,
    });

    this.balls        = [];
    this.currentArena = ARENA_CONFIGS[0];
    this.spikeBallRef = null;
    this.stopwatch    = 0;
    this.FREEZE_S     = 3.0;
    
    // Testing & Config Tracking
    this.testToolsEnabled  = false;
    this.scaleResetEnabled = false;
    this.mouseProps        = { x: -1000, y: -1000, leftDown: false, rightDown: false };
    this._leftClickAoETimer = 0;
    this.testDummy         = null;

    canvas.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      this.mouseProps.x = (e.clientX - rect.left) * scaleX;
      this.mouseProps.y = (e.clientY - rect.top) * scaleY;
    });
    canvas.addEventListener('mousedown', e => { 
        if (e.button === 0) { this.mouseProps.leftDown = true; this._leftClickAoETimer = 0.2; }
        if (e.button === 2) { this.mouseProps.rightDown = true; } 
    });
    window.addEventListener('mouseup', e => { 
        if (e.button === 0) { this.mouseProps.leftDown = false; }
        if (e.button === 2) { this.mouseProps.rightDown = false; } 
    });
    canvas.addEventListener('contextmenu', e => e.preventDefault());

    this._setupEvents();
  }

  _setupEvents() {
    bus.on(EVENTS.BALL_DAMAGED, ({ ball, amount }) => { this.hud.refresh(ball); this.audio.playHit(amount); });
    bus.on('sfx:parry', () => this.audio.playParry());
    bus.on(EVENTS.BALL_HEALED,  ({ ball }) => this.hud.refresh(ball));
    bus.on(EVENTS.BALL_DIED,    ({ ball }) => { 
        this.hud.refresh(ball); 
        this.effects.spawnPop(ball); 
        if (this.scaleResetEnabled) {
            for (const b of this.balls) {
                if (b.alive && b.weapon) b.weapon.resetScaling?.();
            }
        }
    });
  }

  reset() {
    this.balls = [];
    this.stopwatch = 0;
  }

  spawnBalls(ballSelections, arenaConfig, healBoxes = true, testTools = false, scaleReset = false) {
    this.testToolsEnabled = testTools;
    this.scaleResetEnabled = scaleReset;
    this.effects.clear();
    this.spikes.clear();
    this.projSys.clear();
    this.trails.clear();
    this.shockSys.clear();
    this.frostAreaSys.clear();
    this.bhSys.clear();
    this.laserSys.clear();
    this.laserSys.setArena(arenaConfig.arena);
    this.minionSys.clear();
    this.menderSys.clear();
    this.turretSys.clear();
    this.waveSys.reset();
    
    this.stopwatch = 0;
    this.obsSystem = new ObstacleSystem(arenaConfig.obstacles);
    
    const rawBoxes = healBoxes ? (arenaConfig.healBoxes ?? []) : [];
    this.healBoxSys = new HealBoxSystem(
      (arenaConfig.isBossArena || arenaConfig.isWaveArena)
        ? rawBoxes
        : rawBoxes.map(b => ({ ...b, team: 0 }))
    );
    this.currentArena = arenaConfig;
    this.spikeBallRef = null;

    const cw = arenaConfig.canvasSize;
    const ch = arenaConfig.canvasHeight ?? arenaConfig.canvasSize;
    this.renderer.resize(cw, ch);
    requestAnimationFrame(() => window._applyZoom?.());

    const bossIdx     = ballSelections.findIndex(b => b.isBoss === true);
    const nonBoss     = ballSelections.filter((_, i) => i !== bossIdx);
    const nonBossPos  = genSpawnPositions(nonBoss.length, arenaConfig.arena);
    const nonBossVel  = genSpawnVelocities(nonBossPos, arenaConfig.arena, arenaConfig.gravity);

    const cx = arenaConfig.arena.x + arenaConfig.arena.width  / 2;
    const cy = arenaConfig.arena.y + arenaConfig.arena.height / 2;
    const positions  = [];
    const velocities = [];
    let nonBossI = 0;
    for (let i = 0; i < ballSelections.length; i++) {
      if (i === bossIdx) {
        positions.push(new Vector2(cx, cy));
        const bAngle = Math.random() * Math.PI * 2;
        velocities.push(new Vector2(Math.cos(bAngle) * 120, Math.sin(bAngle) * 120));
      } else {
        positions.push(nonBossPos[nonBossI]);
        velocities.push(nonBossVel[nonBossI]);
        nonBossI++;
      }
    }

    const hasTeams = arenaConfig.isWaveArena || ballSelections.some(cfg => (cfg.instanceTeam ?? 0) !== 0);
    this.combat.friendlyFire = !hasTeams;

    this.balls = ballSelections.map((cfg, i) => {
      const isBoss = cfg.isBoss === true;
      const ball = new Ball({
        id           : `ball-${i}`,
        color        : cfg.color,
        team         : cfg.instanceTeam ?? 0,
        spinSpeed    : cfg.spinSpeed,
        gravityScale : cfg.gravityScale ?? 1.0,
        position     : positions[i],
        velocity     : velocities[i],
        spawnImmunity: this.FREEZE_S + 0.2,
        frozenTimer  : this.FREEZE_S,
        maxHp        : cfg.maxHp ?? 200,   // overridden by boss system later
        maxSpeed     : cfg.maxSpeed,
      });

      ball.enableTrail      = cfg.trail ?? false;
      ball.weapon           = cfg.weapon();
      ball.weapon.owner     = ball;
      ball._configId        = cfg.id;

      if (isBoss) {
        this.bossSys.setupBoss(ball, cfg);
      } else if (arenaConfig.isBossArena) {
        this.bossSys.setupChallenger(ball);
      }

      if (cfg.id === 'spike') this.spikeBallRef = ball;
      return ball;
    });

    this.hud.build(this.balls, ballSelections.map(cfg => ({ name: cfg.name, color: cfg.color })));

    if (arenaConfig.isWaveArena) {
      this.waveSys.reset();
      this.waveSys.onSpawn = (spawnList, wave) => this.spawnBlight(spawnList, wave);
      this.waveSys.start();
    }
    
    return this.balls;
  }

  spawnBlight(spawnList, wave) {
    const arena   = this.currentArena;
    const staging = arena.stagingZone ?? arena.arena;
    const newBalls = [];

    for (const entry of spawnList) {
      const { type, count, hpMult, dmgMult, isGiga, baseHp } = entry;
      const hp     = Math.round(baseHp * hpMult);
      const radius = isGiga ? 56 : 28;

      for (let i = 0; i < count; i++) {
        const spread = staging.width * 0.6;
        const cx     = staging.x + staging.width / 2;
        const px     = Math.max(staging.x + radius + 10,
                        Math.min(staging.x + staging.width - radius - 10,
                          cx + (Math.random() - 0.5) * spread));
        const py     = staging.y - radius - 10 - i * (radius * 2 + 8);

        let weapon;
        const w = wave * dmgMult;
        if      (type === 'weaponless') weapon = new BlightWeaponless(w);
        else if (type === 'melee')      weapon = new BlightMelee(w);
        else                            weapon = new BlightRanger(this.projSys, w);

        const ball = new Ball({
          id          : `blight-${wave}-${type}-${i}-${Date.now()}`,
          color       : type === 'weaponless' ? '#6B2D8B' : type === 'melee' ? '#8B1A1A' : '#8B4500',
          team        : 2,
          maxHp       : hp,
          spinSpeed   : type === 'melee' ? 2.5 : 0,
          maxSpeed    : isGiga ? 380 : 500,
          gravityScale: 1.0,
          position    : new Vector2(px, py),
          velocity    : new Vector2((Math.random() - 0.5) * 60, 20),
          radius,
          spawnImmunity: 0.5,
          frozenTimer  : 0,
        });

        ball.isBlight   = true;
        ball.blightType = type;
        ball.weapon     = weapon;
        weapon.owner    = ball;
        if (isGiga) weapon.scale = 2.0;
        if (type === 'melee') ball.spinAngle = Math.random() * Math.PI * 2;

        newBalls.push(ball);
      }
    }

    this.balls.push(...newBalls);
    
    const challengers = this.balls.filter(b => !b.isBlight);
    const chalCfgs    = challengers.map(b => this.ballConfigs.find(c => c.id === b._configId) ?? { name: 'Ball' });
    this.hud.build(challengers, chalCfgs);
  }

  update(dt) {
    if (!this.balls.length) return;
    const alive = this.balls.filter(b => b.alive);
    const g     = this.currentArena.gravity;

    this.blightAISys.update(dt, alive, this.currentArena);
    this.bossSys.update(dt, alive, this.currentArena);

    // Stopwatch logic
    if (!this.currentArena.isWaveArena) {
      const _teams = new Set(alive.filter(b => b.team !== 0).map(b => b.team));
      const _ffa   = alive.filter(b => b.team === 0).length;
      const _competing = _ffa + _teams.size;
      const unfrozen = alive.some(b => b.frozenTimer <= 0);
      if (unfrozen && _competing > 1) this.stopwatch += dt;
    } else {
      const challAlive = alive.filter(b => !b.isBlight).length;
      const unfrozen   = alive.some(b => b.frozenTimer <= 0);
      if (unfrozen && challAlive > 0) this.stopwatch += dt;
      this.waveSys.update(dt, alive.filter(b => b.isBlight));
    }

    this.targetingSys.update(alive, this.obsSystem);

    for (const ball of this.balls) {
      ball.update(dt, this.currentArena.arena, g);
      if (ball._bouncedThisFrame) { this.audio.playBounce(ball.velocity.magnitude); ball._bouncedThisFrame = false; }
    }

    this.combat.update(alive, this.minionSys.minions);
    resolveAllCollisions(alive, 5);

    this.obsSystem.resolveBalls(alive);
    this.healBoxSys.update(dt, alive);
    this.effects.update(dt);
    this.spikes.update(dt, alive, this.spikeBallRef);
    this.projSys.update(dt, alive, this.obsSystem, this.minionSys.minions);
    this.trails.update(dt, alive);
    this.shockSys.update(dt, alive);
    this.frostAreaSys.update(dt, alive);
    this.bhSys.update(dt, alive, this.currentArena.arena, this.obsSystem);
    this.laserSys.update(dt);
    
    for (const { ball, x, y } of this.bhSys.pendingTeleports) {
      if (ball.alive) ball.position = new Vector2(x, y);
    }
    this.bhSys.pendingTeleports = [];
    
    this.minionSys.update(dt, alive, this.currentArena.arena, this.obsSystem, this.spikes);
    this.menderSys.update(dt, alive);
    this.turretSys.update(dt, alive);

    if (this.testToolsEnabled) {
        if (this.mouseProps.leftDown) {
            this._leftClickAoETimer += dt;
            if (this._leftClickAoETimer >= 0.2) {
                this._leftClickAoETimer = 0;
                for (const ball of alive) {
                    const dx = ball.position.x - this.mouseProps.x;
                    const dy = ball.position.y - this.mouseProps.y;
                    if (dx*dx+dy*dy <= 100 * 100) ball.takeDamage(1, null, false);
                }
            }
        } else {
            this._leftClickAoETimer = 0;
        }

        if (this.mouseProps.rightDown) {
            if (!this.testDummy) {
                this.testDummy = new Ball({
                    id: 'test-dummy', color: '#888', team: 0, spinSpeed: 0, gravityScale: 0, 
                    position: new Vector2(this.mouseProps.x, this.mouseProps.y), velocity: new Vector2(0,0), 
                    spawnImmunity: 0, frozenTimer: 0, maxHp: 999999, maxSpeed: 0
                });
                this.testDummy.weapon = new DummyWeapon();
                this.testDummy.weapon.owner = this.testDummy;
                this.balls.push(this.testDummy);
            }
            this.testDummy.position = new Vector2(this.mouseProps.x, this.mouseProps.y);
            this.testDummy.velocity = new Vector2(0,0);
            this.testDummy.hp = this.testDummy.maxHp;
            if (!alive.includes(this.testDummy)) alive.push(this.testDummy);
        } else {
            if (this.testDummy) {
                this.balls = this.balls.filter(b => b.id !== 'test-dummy');
                this.testDummy = null;
            }
        }
    } else if (this.testDummy) {
        this.balls = this.balls.filter(b => b.id !== 'test-dummy');
        this.testDummy = null;
    }
  }

  render(alpha) {
    if (!this.balls.length) return;
    
    this.renderer.render(
      this.balls, this.effects.pops, this.spikes.spikes,
      this.projSys.projectiles, this.obsSystem.obstacles, this.trails,
      this.healBoxSys.boxes, this.shockSys.rings, this.bhSys, this.minionSys.minions, this.frostAreaSys.areas, this.laserSys.beams, this.turretSys.turrets, 
      alpha, this.currentArena.arena, this.currentArena.isWaveArena ? this.currentArena : null,
    );
    
    const maxFreeze = Math.max(...this.balls.map(b => b.frozenTimer));
    if (maxFreeze > 0) this.renderer.drawCountdown(maxFreeze);

    // Testing Tools: AoE circle drawn on top of everything
    if (this.testToolsEnabled) {
      const arena = this.currentArena.arena;
      const mx = this.mouseProps.x;
      const my = this.mouseProps.y;
      const insideArena = mx >= arena.x && mx <= arena.x + arena.width &&
                          my >= arena.y && my <= arena.y + arena.height;

      if (insideArena) {
        const ctx = this.renderer.ctx;
        const holding = this.mouseProps.leftDown;
        ctx.save();
        if (holding) {
          ctx.fillStyle = 'rgba(255, 60, 60, 0.15)';
          ctx.beginPath();
          ctx.arc(mx, my, 100, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.strokeStyle = holding ? 'rgba(255, 60, 60, 0.9)' : 'rgba(255, 60, 60, 0.35)';
        ctx.lineWidth   = holding ? 2 : 1;
        ctx.setLineDash(holding ? [] : [6, 5]);
        ctx.beginPath();
        ctx.arc(mx, my, 100, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.restore();
      }
    }

    if (this.stopwatch > 0) {
      const m = Math.floor(this.stopwatch / 60);
      const s = Math.floor(this.stopwatch % 60);
      const timerEl = document.getElementById('game-timer');
      if (timerEl) {
        let txt = `${m}:${String(s).padStart(2, '0')}`;
        if (this.currentArena.isWaveArena) {
          const blightLeft = this.balls.filter(b => b.alive && b.isBlight).length;
          const tLeft      = Math.ceil(this.waveSys.timeLeft);
          const waveLine   = blightLeft > 0
            ? `Wave ${this.waveSys.wave}  ·  ${blightLeft} blight  ·  ${tLeft}s`
            : this.waveSys.isWaiting ? `Wave ${this.waveSys.wave} — cleared!`
            : `Wave ${this.waveSys.wave}`;
          txt += `\n${waveLine}`;
        }
        timerEl.textContent = txt;
      }
    }

    for (const ball of this.balls) {
      if (ball.alive) this.hud.refresh(ball);
    }
  }
}
