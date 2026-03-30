/**
 * main.js — wiring only.
 * Arena configs and ball configs defined here.
 * PreGameUI drives ball selection and arena choice before each game.
 */

import { GameLoop }               from './core/GameLoop.js';
import { GRAVITY, resolveCircleCollision } from './core/Physics.js';
import { genSpawnPositions, genSpawnVelocities } from './core/SpawnPlacement.js';
import { Ball }                   from './entities/Ball.js';
import { Renderer }               from './ui/Renderer.js';
import { HUD }                    from './ui/HUD.js';
import { PreGameUI }              from './ui/PreGameUI.js';
import { Vector2 }                from './core/Vector2.js';
import { bus, EVENTS }            from './systems/EventBus.js';
import { CombatSystem }           from './systems/CombatSystem.js';
import { EffectsSystem }          from './systems/EffectsSystem.js';
import { SpikeSystem }            from './systems/SpikeSystem.js';
import { ProjectileSystem }       from './systems/ProjectileSystem.js';
import { ObstacleSystem }         from './systems/ObstacleSystem.js';
import { TrailSystem }            from './systems/TrailSystem.js';
import { HealBoxSystem }          from './systems/HealBoxSystem.js';
import { ShockSystem }            from './systems/ShockSystem.js';
import { FrostAreaSystem }        from './systems/FrostAreaSystem.js';
import { BlackholeSystem }        from './systems/BlackholeSystem.js';
import { MinionSystem }           from './systems/MinionSystem.js';
import { MenderSystem }           from './systems/MenderSystem.js';
import { AudioSystem }            from './systems/AudioSystem.js';

import { SwordWeapon }            from './weapons/SwordWeapon.js';
import { DaggerWeapon }           from './weapons/DaggerWeapon.js';
import { SiphonWeapon }            from './weapons/SiphonWeapon.js';
import { ChanceWeapon }           from './weapons/ChanceWeapon.js';
import { FrostWeapon }            from './weapons/FrostWeapon.js';
import { RushWeapon }             from './weapons/RushWeapon.js';
import { SpikeWeapon }            from './weapons/SpikeWeapon.js';
import { ArcherWeapon }           from './weapons/ArcherWeapon.js';
import { PelletWeapon }           from './weapons/PelletWeapon.js';
import { ShotgunWeapon }          from './weapons/ShotgunWeapon.js';
import { VenomWeapon }            from './weapons/VenomWeapon.js';
import { ZipWeapon }              from './weapons/ZipWeapon.js';
import { DummyWeapon }            from './weapons/DummyWeapon.js';
import { GuardWeapon }            from './weapons/GuardWeapon.js';
import { SurgeWeapon }            from './weapons/SurgeWeapon.js';
import { ShieldWeapon }           from './weapons/ShieldWeapon.js';
import { ShockWeapon }            from './weapons/ShockWeapon.js';
import { SnipeWeapon }            from './weapons/SnipeWeapon.js';
import { BlackholeWeapon }        from './weapons/BlackholeWeapon.js';
import { HostessWeapon }          from './weapons/HostessWeapon.js';
import { MenderWeapon }           from './weapons/MenderWeapon.js';

import { BlightWeaponless }       from './weapons/BlightWeaponless.js';
import { BlightMelee }            from './weapons/BlightMelee.js';
import { BlightRanger }           from './weapons/BlightRanger.js';
import { WaveSystem }             from './systems/WaveSystem.js';

// ── Arena configs ─────────────────────────────────────────────────────────────
const ARENA_CONFIGS = [
  {
    id          : 'standard',
    name        : 'Standard',
    description : '480×480 · gravity',
    canvasSize  : 520,
    arena       : { x: 20, y: 20, width: 480, height: 480 },
    gravity     : GRAVITY,
    maxBalls    : 8,
    obstacles   : [],
    healBoxes   : [{ x: 260, y: 260 }],
  },
  {
    id          : 'small',
    name        : 'Small',
    description : '320×320 · gravity',
    canvasSize  : 360,
    arena       : { x: 20, y: 20, width: 320, height: 320 },
    gravity     : GRAVITY,
    maxBalls    : 8,
    obstacles   : [],
    healBoxes   : [{ x: 180, y: 180 }],
  },
  {
    id          : 'large-zerog',
    name        : 'Zero-G',
    description : '760×760 · no gravity',
    canvasSize  : 800,
    arena       : { x: 20, y: 20, width: 760, height: 760 },
    gravity     : 0,
    maxBalls    : 16,
    obstacles   : [],
    healBoxes   : [
      { x: 400, y: 200 },
      { x: 400, y: 600 },
      { x: 200, y: 400 },
      { x: 600, y: 400 },
    ],
  },
  {
    id          : 'large-wall',
    name        : 'Center Wall',
    description : '760×760 · no gravity · center wall',
    canvasSize  : 800,
    arena       : { x: 20, y: 20, width: 760, height: 760 },
    gravity     : 0,
    maxBalls    : 16,
    obstacles   : [{ x: 320, y: 320, width: 160, height: 160 }],
    healBoxes   : [
      { x: 180, y: 180 },
      { x: 620, y: 180 },
      { x: 180, y: 620 },
      { x: 620, y: 620 },
    ],
  },
  {
    id          : 'boss',
    name        : 'Boss Battle',
    description : '1060×1060 · no gravity · team heals',
    canvasSize  : 1100,
    arena       : { x: 20, y: 20, width: 1060, height: 1060 },
    gravity     : 0,
    maxBalls    : 9,  // 1 boss + up to 8 challengers
    obstacles   : [],
    // Team heal boxes at corners — team 1 = challengers only
    healBoxes   : [
      { x: 100, y: 100, team: 1, amount: 50 },
      { x: 1000, y: 100, team: 1, amount: 50 },
      { x: 100, y: 1000, team: 1, amount: 50 },
      { x: 1000, y: 1000, team: 1, amount: 50 },
    ],
    isBossArena : true,
  },
  {
    id          : 'wave',
    name        : 'Wave Arena',
    description : '760×760 · waves of blight',
    canvasSize  : 800,
    canvasHeight: 980,
    // Full physics arena including staging zone on top
    arena       : { x: 20, y: 20, width: 760, height: 940 },
    // Battle zone — where challengers live
    battleArena : { x: 20, y: 200, width: 760, height: 760 },
    // Staging zone — blight spawn here, invisible to player
    stagingZone : { x: 20, y: 20,  width: 760, height: 180 },
    divisionY   : 200,
    gravity     : 260,
    maxBalls    : 4,
    obstacles   : [],
    // Heal boxes at center-left and center-right of battle area
    healBoxes   : [
      { x: 80,  y: 580, team: 1, amount: 50 },
      { x: 740, y: 580, team: 1, amount: 50 },
    ],
    isWaveArena : true,
  },
];

// ── Ball type definitions ─────────────────────────────────────────────────────
// weapon is a factory; each spawned ball gets a fresh instance.
const BALL_CONFIGS = [
  { id: 'sword',   color: '#E63946', name: 'Sword',   spinSpeed:  6.2,  maxSpeed: 700, gravityScale: 1.0,  weapon: () => new SwordWeapon()            },
  { id: 'dagger',  color: '#F4A261', name: 'Dagger',  spinSpeed:  6.2,  maxSpeed: 700, gravityScale: 1.0,  weapon: () => new DaggerWeapon()           },
  { id: 'siphon',   color: '#457B9D', name: 'Siphon',   spinSpeed:  6.2,  maxSpeed: 700, gravityScale: 1.0,  weapon: () => new SiphonWeapon()            },
  { id: 'chance',  color: '#6D4C9C', name: 'Chance',  spinSpeed:  6.2,  maxSpeed: 700, gravityScale: 1.0,  weapon: () => new ChanceWeapon()           },
  { id: 'frost',   color: '#2A9D8F', name: 'Frost',   spinSpeed: -6.28, maxSpeed: 700, gravityScale: 1.0,  weapon: () => new FrostWeapon(frostAreaSys) },
  { id: 'rush',    color: '#E76F51', name: 'Rush',    spinSpeed:  0,    maxSpeed: 650, gravityScale: 0.45, weapon: () => new RushWeapon(),  trail: true  },
  { id: 'spike', color: '#A0522D', name: 'Spike', spinSpeed:  6.2,  maxSpeed: 700, gravityScale: 1.0,  weapon: () => new SpikeWeapon(spikes)    },
  { id: 'archer',  color: '#D4A017', name: 'Archer',  spinSpeed:  0,    maxSpeed: 700, gravityScale: 1.0,  weapon: () => new ArcherWeapon(projSys)    },
  { id: 'pellet',  color: '#52B788', name: 'Pellet',  spinSpeed:  4.2,  maxSpeed: 700, gravityScale: 1.0,  weapon: () => new PelletWeapon(projSys)    },
  { id: 'shotgun', color: '#7EC8A4', name: 'Shotgun', spinSpeed:  6.2,  maxSpeed: 700, gravityScale: 1.0,  weapon: () => new ShotgunWeapon(projSys)   },
  { id: 'venom',   color: '#A8C256', name: 'Venom',   spinSpeed:  6.2,  maxSpeed: 700, gravityScale: 1.0,  weapon: () => new VenomWeapon()            },
  { id: 'zip',     color: '#38BDF8', name: 'Zip',     spinSpeed:  0,    maxSpeed: 900, gravityScale: 0.3,  weapon: () => new ZipWeapon(trails)        },
  { id: 'dummy',   color: '#9CA3AF', name: 'Dummy',   spinSpeed:  0,    maxSpeed: 700, gravityScale: 1.0,  weapon: () => new DummyWeapon(), maxHp: 500 },
  { id: 'guard',   color: '#6B8CAE', name: 'Guard',   spinSpeed:  6.2,  maxSpeed: 700, gravityScale: 1.0,  weapon: () => new GuardWeapon()            },
  { id: 'surge',   color: '#C1121F', name: 'Surge',   spinSpeed:  6.2,  maxSpeed: 700, gravityScale: 1.0,  weapon: () => new SurgeWeapon()            },
  { id: 'shield',  color: '#8D99AE', name: 'Shield',  spinSpeed:  3.1,  maxSpeed: 700, gravityScale: 1.0,  weapon: () => new ShieldWeapon()           },
  { id: 'shock',     color: '#F5C518', name: 'Shock',     spinSpeed:  0,    maxSpeed: 700, gravityScale: 1.0,  weapon: () => new ShockWeapon(shockSys)    },
  { id: 'snipe',     color: '#1B4332', name: 'Snipe',     spinSpeed:  0,    maxSpeed: 700, gravityScale: 1.0,  weapon: () => new SnipeWeapon(projSys)     },
  { id: 'blackhole', color: '#4A0E8F', name: 'Blackhole', spinSpeed:  0,    maxSpeed: 700, gravityScale: 1.0,  weapon: () => new BlackholeWeapon(bhSys)   },
  { id: 'hostess',   color: '#FF6B9D', name: 'Hostess',   spinSpeed:  0,    maxSpeed: 900, gravityScale: 0.3,  weapon: () => new HostessWeapon(minionSys) },
  { id: 'mender',   color: '#4CAF50', name: 'Mender',   spinSpeed: 0,       maxSpeed: 700, gravityScale: 1.0, weapon: () => new MenderWeapon(menderSys) },
];

// ── System instances ──────────────────────────────────────────────────────────
const canvas   = document.getElementById('game-canvas');
const renderer = new Renderer(canvas);
const hud      = new HUD(document.getElementById('ball-details'));
const combat   = new CombatSystem({ friendlyFire: true });
const effects  = new EffectsSystem();
const spikes   = new SpikeSystem();
const projSys  = new ProjectileSystem();
const trails   = new TrailSystem();
const shockSys    = new ShockSystem();
const frostAreaSys = new FrostAreaSystem();
const audio        = new AudioSystem();
const bhSys     = new BlackholeSystem();
const minionSys = new MinionSystem();
const menderSys = new MenderSystem();
const waveSys   = new WaveSystem();
let   obsSystem  = new ObstacleSystem([]);
let   healBoxSys = new HealBoxSystem([]);

// ── Active game state ─────────────────────────────────────────────────────────
let balls          = [];
let currentArena   = ARENA_CONFIGS[0];
let spikeBallRef = null;
let stopwatch      = 0;    // seconds elapsed since match started (after freeze)
const FREEZE_S     = 3.0;

// ── Spawn helpers ─────────────────────────────────────────────────────────────

/** Generate spawn positions arranged in a circle inside the arena. */
function spawnBalls(ballSelections, arenaConfig, healBoxes = true) {
  effects.clear();
  spikes.clear();
  projSys.clear();
  trails.clear();
  shockSys.clear();
  frostAreaSys.clear();
  bhSys.clear();
  minionSys.clear();
  menderSys.clear();
  waveSys.reset();
  stopwatch      = 0;
  obsSystem      = new ObstacleSystem(arenaConfig.obstacles);
  // Boss arena: use team fields as defined. Other arenas: all neutral.
  const rawBoxes = healBoxes ? (arenaConfig.healBoxes ?? []) : [];
  healBoxSys = new HealBoxSystem(
    (arenaConfig.isBossArena || arenaConfig.isWaveArena)
      ? rawBoxes
      : rawBoxes.map(b => ({ ...b, team: 0 }))
  );
  currentArena   = arenaConfig;
  spikeBallRef = null;

  const cw = arenaConfig.canvasSize;
  const ch = arenaConfig.canvasHeight ?? arenaConfig.canvasSize;
  renderer.resize(cw, ch);
  requestAnimationFrame(() => window._applyZoom?.());

  // Boss gets center; challengers get distributed positions around it
  const bossIdx     = ballSelections.findIndex(b => b.isBoss === true);
  const nonBoss     = ballSelections.filter((_, i) => i !== bossIdx);
  const nonBossPos  = genSpawnPositions(nonBoss.length, arenaConfig.arena);
  const nonBossVel  = genSpawnVelocities(nonBossPos, arenaConfig.arena, arenaConfig.gravity);

  // Build full position/velocity arrays, inserting center for boss
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

  // Disable friendly fire if any balls are assigned to teams
  const hasTeams = arenaConfig.isWaveArena || ballSelections.some(cfg => (cfg.instanceTeam ?? 0) !== 0);
  combat.friendlyFire = !hasTeams;

  const bs = ballSelections.map((cfg, i) => {
    const isBoss   = cfg.isBoss === true;
    const radius   = isBoss ? 72 : 28;
    const maxSpeed = isBoss ? Math.min(cfg.maxSpeed * 0.75, 520) : cfg.maxSpeed;
    const ball = new Ball({
      id           : `ball-${i}`,
      color        : cfg.color,
      team         : cfg.instanceTeam ?? 0,
      maxHp        : isBoss ? 10000 : (arenaConfig.isBossArena ? 750 : (cfg.maxHp ?? 200)),
      spinSpeed    : cfg.spinSpeed,
      maxSpeed,
      gravityScale : cfg.gravityScale ?? 1.0,
      position     : positions[i],
      velocity     : velocities[i],
      radius,
      spawnImmunity: FREEZE_S + 0.2,
      frozenTimer  : FREEZE_S,
    });
    ball.enableTrail      = cfg.trail ?? false;
    ball.weapon           = cfg.weapon();
    ball.weapon.owner     = ball;
    ball._configId        = cfg.id;
    if (isBoss) {
      ball.weapon.scale    = 2.0;
      ball.knockbackResist = 0;   // immune to all external pushes — walls still reflect normally
    }

    if (cfg.id === 'spike') spikeBallRef = ball;
    return ball;
  });

  hud.build(bs, ballSelections.map(cfg => ({ name: cfg.name, color: cfg.color })));
  return bs;
}

/** Spawn a batch of blight from the wave spawn list */
function spawnBlight(spawnList, wave) {
  const arena   = currentArena;
  const staging = arena.stagingZone ?? arena.arena;
  const newBalls = [];

  for (const entry of spawnList) {
    const { type, count, hpMult, dmgMult, isGiga, baseHp } = entry;
    const hp     = Math.round(baseHp * hpMult);
    const radius = isGiga ? 56 : 28;

    for (let i = 0; i < count; i++) {
      // Spawn above the staging zone (above canvas top) so they fall in naturally
      const spread = staging.width * 0.6;
      const cx     = staging.x + staging.width / 2;
      const px     = Math.max(staging.x + radius + 10,
                      Math.min(staging.x + staging.width - radius - 10,
                        cx + (Math.random() - 0.5) * spread));
      const py     = staging.y - radius - 10 - i * (radius * 2 + 8); // stagger above top

      let weapon;
      const w = wave * dmgMult;
      if      (type === 'weaponless') weapon = new BlightWeaponless(w);
      else if (type === 'melee')      weapon = new BlightMelee(w);
      else                            weapon = new BlightRanger(projSys, w);

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

      if (type === 'melee') {
        ball.spinAngle = Math.random() * Math.PI * 2;
      }

      newBalls.push(ball);
    }
  }

  // Add ranged blight to target lists
  for (const b of newBalls) {
    if (b.weapon instanceof BlightRanger) {
      b.weapon.targetBalls = balls.filter(c => c.alive && c.team === 1);
    }
  }

  balls.push(...newBalls);
  // HUD only tracks challenger balls — blight have their own wave counter display
  const challengers = balls.filter(b => !b.isBlight);
  const chalCfgs    = challengers.map(b => BALL_CONFIGS.find(c => c.id === b._configId) ?? { name: 'Ball' });
  hud.build(challengers, chalCfgs);
}


// ── PreGame UI ────────────────────────────────────────────────────────────────
const pregameEl = document.getElementById('pregame');
const pregameUI = new PreGameUI(
  pregameEl,
  BALL_CONFIGS,
  ARENA_CONFIGS,
  ({ ballSelections, arenaConfig, healBoxes = true }) => {
    balls = spawnBalls(ballSelections, arenaConfig, healBoxes);
    if (arenaConfig.isWaveArena) {
      waveSys.reset();
      waveSys.onSpawn = spawnBlight;
      waveSys.start();
    }
  },
);
pregameUI.show();

// ── Event bus ─────────────────────────────────────────────────────────────────
bus.on(EVENTS.BALL_DAMAGED, ({ ball, amount }) => { hud.refresh(ball); audio.playHit(amount); });
bus.on('sfx:parry', () => audio.playParry());
bus.on(EVENTS.BALL_HEALED,  ({ ball }) => hud.refresh(ball));
bus.on(EVENTS.BALL_DIED,    ({ ball }) => { hud.refresh(ball); effects.spawnPop(ball); });

// ── Game loop ─────────────────────────────────────────────────────────────────
function update(dt) {
  if (!balls.length) return;
  const alive = balls.filter(b => b.alive);
  const g     = currentArena.gravity;

  // Blight chase AI — steer toward nearest team-1 ball
  if (currentArena.isWaveArena) {
    const challengers = alive.filter(b => b.team === 1);
    for (const ball of alive.filter(b => b.isBlight)) {
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
      if (ball.weapon?.targetBalls !== undefined) {
        ball.weapon.targetBalls = challengers;
      }
    }

    // Division wall — challengers can't cross above divisionY
    // Only cancel upward velocity component, leave horizontal untouched
    const divY = currentArena.divisionY;
    for (const ball of alive.filter(b => !b.isBlight)) {
      if (ball.position.y - ball.radius < divY) {
        ball.position = new Vector2(ball.position.x, divY + ball.radius);
        // Only cancel upward component — preserve all other velocity
        if (ball.velocity.y < 0) ball.velocity = new Vector2(ball.velocity.x, Math.abs(ball.velocity.y) * 0.6);
      }
    }
  }
  // Stopwatch — always shown; wave info shown below in wave mode
  const challAlive = currentArena.isWaveArena
    ? balls.filter(b => b.alive && !b.isBlight).length
    : null;
  const wavePaused = currentArena.isWaveArena && challAlive === 0;

  if (!currentArena.isWaveArena) {
    // Standard mode: pause when ≤1 team/ball alive
    const _alive = balls.filter(b => b.alive);
    const _teams = new Set(_alive.filter(b => b.team !== 0).map(b => b.team));
    const _ffa   = _alive.filter(b => b.team === 0).length;
    const _competing = _ffa + _teams.size;
    const unfrozen = _alive.some(b => b.frozenTimer <= 0);
    if (unfrozen && _competing > 1) stopwatch += dt;
  } else {
    // Wave mode: stopwatch pauses when all challengers are dead
    const challAlive = alive.filter(b => !b.isBlight).length;
    const unfrozen   = alive.some(b => b.frozenTimer <= 0);
    if (unfrozen && challAlive > 0) stopwatch += dt;
    waveSys.update(dt, alive.filter(b => b.isBlight));
  }  for (const ball of balls) {
    const wname = ball.weapon?.constructor.name;
    if (wname === 'ArcherWeapon' || wname === 'SnipeWeapon' || wname === 'BlackholeWeapon') {
      ball.weapon.targetBalls = alive.filter(b => b !== ball && (ball.team === 0 || b.team !== ball.team));
    }
  }

  for (const ball of balls) {
    ball.update(dt, currentArena.arena, g);
    if (ball._bouncedThisFrame) { audio.playBounce(ball.velocity.magnitude); ball._bouncedThisFrame = false; }
  }

  combat.update(alive, minionSys.minions);

  for (let pass = 0; pass < 5; pass++) {
    for (let i = 0; i < alive.length; i++)
      for (let j = i + 1; j < alive.length; j++)
        resolveCircleCollision(alive[i], alive[j]);
  }

  // Resolve obstacles (center wall etc.)
  obsSystem.resolveBalls(alive);
  healBoxSys.update(dt, alive);
  effects.update(dt);
  spikes.update(dt, alive, spikeBallRef);
  projSys.update(dt, alive, obsSystem, minionSys.minions);
  trails.update(dt, alive);
  shockSys.update(dt, alive);
  frostAreaSys.update(dt, alive);
  bhSys.update(dt, alive, currentArena.arena, obsSystem);
  // Apply blackhole teleports after all physics so velocity is preserved correctly
  for (const { ball, x, y } of bhSys.pendingTeleports) {
    if (ball.alive) ball.position = new Vector2(x, y);
  }
  bhSys.pendingTeleports = [];
  minionSys.update(dt, alive, currentArena.arena, obsSystem, spikes);
  menderSys.update(dt, alive);
}

function render(alpha) {
  if (!balls.length) return;
  renderer.render(
    balls, effects.pops, spikes.spikes,
    projSys.projectiles, obsSystem.obstacles, trails,
    healBoxSys.boxes, shockSys.rings, bhSys, minionSys.minions, frostAreaSys.areas, alpha,
    currentArena.arena, currentArena.isWaveArena ? currentArena : null,
  );
  const maxFreeze = Math.max(...balls.map(b => b.frozenTimer));
  if (maxFreeze > 0) renderer.drawCountdown(maxFreeze);

  // Stopwatch — DOM element below title
  if (stopwatch > 0) {
    const m = Math.floor(stopwatch / 60);
    const s = Math.floor(stopwatch % 60);
    const timerEl = document.getElementById('game-timer');
    if (timerEl) {
      let txt = `${m}:${String(s).padStart(2, '0')}`;
      if (currentArena.isWaveArena) {
        const blightLeft = balls.filter(b => b.alive && b.isBlight).length;
        const tLeft      = Math.ceil(waveSys.timeLeft);
        const waveLine   = blightLeft > 0
          ? `Wave ${waveSys.wave}  ·  ${blightLeft} blight  ·  ${tLeft}s`
          : waveSys.isWaiting ? `Wave ${waveSys.wave} — cleared!`
          : `Wave ${waveSys.wave}`;
        txt += `\n${waveLine}`;
      }
      timerEl.textContent = txt;
    }
  }

  for (const ball of balls) {
    if (ball.alive) hud.refresh(ball);
  }
}

new GameLoop({ update, render, targetFPS: 60 }).start();

// ── Zoom controls ─────────────────────────────────────────────────────────────
{
  const ZOOM_STEPS = [0.35, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.9, 1.0, 1.1, 1.25, 1.5, 1.75, 2.0];
  let zoomIdx = ZOOM_STEPS.indexOf(1.0);
  const wrapper   = document.getElementById('canvas-wrapper');
  const zoomLabel = document.getElementById('zoom-label');

  window._zoomReset = () => { zoomIdx = ZOOM_STEPS.indexOf(1.0); applyZoom(); };
  window._applyZoom = applyZoom;

  function applyZoom() {
    const z       = ZOOM_STEPS[zoomIdx];
    const canvas  = document.getElementById('game-canvas');
    const baseW   = canvas ? canvas.width  : 560;
    const baseH   = canvas ? canvas.height : 560;
    wrapper.style.width        = `${baseW}px`;
    wrapper.style.height       = `${baseH}px`;
    wrapper.style.transform    = `scale(${z})`;
    wrapper.style.marginBottom = `${baseH * (z - 1)}px`;
    zoomLabel.textContent      = `${Math.round(z * 100)}%`;
  }

  applyZoom();

  document.getElementById('btn-zoom-in')?.addEventListener('click', () => {
    if (zoomIdx < ZOOM_STEPS.length - 1) { zoomIdx++; applyZoom(); }
  });
  document.getElementById('btn-zoom-out')?.addEventListener('click', () => {
    if (zoomIdx > 0) { zoomIdx--; applyZoom(); }
  });
}

// ── Reset ─────────────────────────────────────────────────────────────────────
document.getElementById('btn-reset')?.addEventListener('click', () => {
  balls = [];
  window._zoomReset?.();
  document.getElementById('game-timer').textContent = '';
  pregameUI.show();
});