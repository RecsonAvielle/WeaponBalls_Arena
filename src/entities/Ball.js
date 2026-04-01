import { Vector2 }                                            from '../core/Vector2.js';
import { integrate, applyGravity, bounceOffWalls, clampSpeed, GRAVITY } from '../core/Physics.js';
import { bus, EVENTS }                                        from '../systems/EventBus.js';

const BURST_RECEIVED = 180;
const BURST_DEALT    =  50;

export const DEFAULT_MAX_SPEED = 680;

export class Ball {
  constructor({
    id, position, velocity,
    radius        = 28,
    color         = '#457B9D',
    label         = '',
    team          = 0,
    maxHp         = 200,
    spinSpeed     = 6.28,
    spawnImmunity = 1.5,
    frozenTimer   = 3.0,
    maxSpeed      = DEFAULT_MAX_SPEED,
    gravityScale  = 1.0,
  }) {
    this.id    = id;
    this.team  = team;
    this.color = color;
    this.label = label;

    this.radius       = radius;
    this.position     = position;
    this.prevPosition = position.clone();
    this.velocity     = velocity ?? new Vector2(
      (Math.random() - 0.5) * 300,
      -150 - Math.random() * 100,
    );

    this.baseSpinSpeed = spinSpeed;
    this.spinSpeed     = spinSpeed;
    this.spinAngle     = Math.random() * Math.PI * 2;
    this.prevSpinAngle = this.spinAngle;

    this.spawnImmunity = spawnImmunity;
    this.frozenTimer   = frozenTimer;
    this._parryFreeze  = 0;
    this.maxSpeed      = maxSpeed;
    this.gravityScale  = gravityScale;

    this.maxHp           = maxHp;
    this.hp              = maxHp;
    this.alive           = true;
    this.weapon          = null;
    this.knockbackResist = 1.0;
    this.hitFlash        = 0;

    this._menderPenalty  = false; // set true by MenderWeapon — +1 damage received
    this._overhealDepletionTimer = 0;

    this.enableTrail = false;
    this.trail       = [];

    this.effects = { burn: null, slow: null, stun: null, frost: null };
  }

  get hpRatio()   { return Math.max(0, this.hp / this.maxHp); }
  get isSlowed()  { return this.effects.slow  !== null; }
  get isStunned() { return this.effects.stun  !== null; }
  get isFrosted() { return this.effects.frost !== null; }
  get isImmune()  { return this.spawnImmunity > 0; }
  get isFrozen()  { return this.frozenTimer   > 0; }

  takeDamage(amount, source = null, silent = false) {
    if (!this.alive || amount <= 0 || this.isImmune) return;

    // Mender penalty: +1 to all damage received
    if (this._menderPenalty) amount += 1;

    // Shield absorption
    if (this.weapon?._shield > 0) {
      const absorbed = Math.min(this.weapon._shield, amount);
      this.weapon._shield -= absorbed;
      amount -= absorbed;
      if (amount <= 0) return;
    }

    this.hp = Math.max(0, this.hp - amount);
    this.hitFlash = 6;

    if (!silent) {
      const burst = BURST_RECEIVED * this.knockbackResist;
      if (source) {
        const away = this.position.sub(source.position);
        const dir  = away.magnitude > 0
          ? away.normalized
          : new Vector2(Math.random() - 0.5, -1).normalized;
        this.velocity   = this.velocity.add(dir.scale(burst));
        source.velocity = source.velocity.sub(dir.scale(BURST_DEALT));
      } else {
        this.velocity = this.velocity.add(new Vector2(0, -burst * 0.4));
      }
    }

    this.weapon?.onDamaged?.();

    bus.emit(EVENTS.BALL_DAMAGED, { ball: this, amount, source });
    if (this.hp === 0) {
      this.alive = false;
      bus.emit(EVENTS.BALL_DIED, { ball: this, killer: source });
    }
  }

  heal(amount) {
    if (!this.alive || amount <= 0) return;
    this.hp += amount; // no cap — overcap always allowed
    bus.emit(EVENTS.BALL_HEALED, { ball: this, amount });
  }

  applyEffect(type, params) {
    if (this.isImmune) return;
    this.effects[type] = { ...params };
    if (type === 'stun') bus.emit(EVENTS.BALL_STUNNED, { ball: this, duration: params.duration });
  }

  clearEffect(type) { this.effects[type] = null; }
  flipSpin()        { this.spinSpeed = -this.spinSpeed; this.baseSpinSpeed = -this.baseSpinSpeed; }

  update(dt, arena, arenaGravity = GRAVITY) {
    if (!this.alive) return;

    if (this.spawnImmunity > 0) this.spawnImmunity -= dt;
    if (this.frozenTimer   > 0) this.frozenTimer   -= dt;
    if (this._parryFreeze  > 0) this._parryFreeze  -= dt;

    this._tickEffects(dt);

    if (!this.isFrozen && !this.isStunned && this._parryFreeze <= 0) {
      this.prevPosition = this.position.clone();
      this.velocity = new Vector2(
        this.velocity.x,
        this.velocity.y + arenaGravity * this.gravityScale * dt,
      );

      let speedCap = this.maxSpeed;
      if (this.isFrosted)  speedCap *= this.effects.frost.speedFactor;
      if (this._areaFrost) speedCap *= 0.65;
      this.velocity = clampSpeed(this.velocity, speedCap);

      if (this.isSlowed) {
        this.velocity = this.velocity.scale(Math.pow(this.effects.slow.factor, dt));
      }
      this.position = integrate(this.position, this.velocity, dt);
      bounceOffWalls(this, arena);

      if (this.enableTrail) {
        this.trail.push({ x: this.position.x, y: this.position.y });
        if (this.trail.length > 14) this.trail.shift();
      }
    } else if (this.isFrozen) {
      this.prevPosition = this.position.clone();
    }

    this.prevSpinAngle = this.spinAngle;
    let effectiveSpin = this.spinSpeed;
    if (this.isFrosted)  effectiveSpin *= (this.effects.frost.spinFactor ?? this.effects.frost.speedFactor);
    if (this._areaFrost) effectiveSpin *= 0.75;
    this.spinAngle += effectiveSpin * dt;
    if (this.hitFlash > 0) this.hitFlash--;
    
    // Global overheal penalty
    if (this.hp > this.maxHp * 1.5) {
        this._overhealDepletionTimer += dt;
        if (this._overhealDepletionTimer >= 0.6) {
            this.hp -= 1;
            this._overhealDepletionTimer = 0;
        }
    }
    
    this.weapon?.onTick(dt, this);
  }

  _tickEffects(dt) {
    for (const type of ['burn', 'slow', 'stun', 'frost']) {
      const fx = this.effects[type];
      if (!fx) continue;
      fx.duration -= dt;

      if (type === 'burn') {
        fx.tickTimer = (fx.tickTimer ?? 0) - dt;
        if (fx.tickTimer <= 0 && fx.tickDamage > 0) {
          this.takeDamage(fx.tickDamage, null, true);
          fx.tickTimer = fx.tickInterval ?? 0.15;
        }
      }

      if (fx.duration <= 0) {
        this.effects[type] = null;
      }
    }
  }
}