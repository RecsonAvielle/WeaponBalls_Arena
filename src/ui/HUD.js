/**
 * HUD.js — Ball details panel.
 * Always 4 cards per row, left-aligned. Fixed card size.
 * In boss mode: boss card centered, challengers 2+2 on each side.
 */

export class HUD {
  constructor(panelEl) {
    this.panel   = panelEl;
    this._isBoss = false;
    this._bossId = null;
  }

  build(balls, configs) {
    if (!this.panel) return;

    const bossIdx = balls.findIndex(b => b.maxHp >= 5000);
    this._isBoss = bossIdx !== -1;
    this._bossId = this._isBoss ? balls[bossIdx].id : null;

    if (this._isBoss) {
      this._buildBossLayout(balls, configs, bossIdx);
    } else {
      this._buildNormalLayout(balls, configs);
    }
  }

  _cardHTML(ball, cfg) {
    return `
      <div class="ball-card" id="card-${ball.id}">
        <div class="ball-card-header">
          <span class="ball-dot" style="background:${ball.color}"></span>
          <span class="ball-name">${cfg.name}</span>
        </div>
        <div class="ball-divider"></div>
        <span class="ball-weapon-name">${ball.weapon?.name ?? '—'}</span>
        <span class="ball-stat"        id="card-${ball.id}-dmg">DMG: 2</span>
        <span class="ball-stat hp-full" id="card-${ball.id}-hp">HP: ${ball.maxHp}</span>
        <span class="ball-stat"        id="card-${ball.id}-dealt">Dealt: 0</span>
        <span class="ball-stat"        id="card-${ball.id}-extra"></span>
      </div>`;
  }

  _buildNormalLayout(balls, configs) {
    // 4 per row, left-aligned — pad last row with ghost cells
    const cards   = balls.map((b, i) => this._cardHTML(b, configs[i])).join('');
    const rem     = balls.length % 4;
    const ghosts  = rem === 0 ? '' : Array(4 - rem).fill('<div class="ball-card ghost"></div>').join('');
    this.panel.className = 'ball-details-grid';
    this.panel.innerHTML = cards + ghosts;
  }

  _buildBossLayout(balls, configs, bossIdx) {
    const challengers = balls.filter((_, i) => i !== bossIdx);
    const chalCfgs    = configs.filter((_, i) => i !== bossIdx);
    const boss        = balls[bossIdx];
    const bossCfg     = configs[bossIdx];

    // Split challengers into left half and right half
    const half  = Math.ceil(challengers.length / 2);
    const left  = challengers.slice(0, half);
    const right = challengers.slice(half);
    const leftC = chalCfgs.slice(0, half);
    const rightC = chalCfgs.slice(half);

    // Pad each side to multiple of 2
    const padTo2 = (arr, isCard) => {
      const rem = arr.length % 2;
      return rem === 0 ? arr : [...arr, isCard ? '<div class="ball-card ghost"></div>' : null];
    };

    const leftCards  = left.map((b, i) => this._cardHTML(b, leftC[i]));
    const rightCards = right.map((b, i) => this._cardHTML(b, rightC[i]));
    padTo2(leftCards, true);
    padTo2(rightCards, true);

    this.panel.className = 'ball-details-boss';
    this.panel.innerHTML = `
      <div class="boss-side boss-side-left">
        ${leftCards.join('')}
        ${left.length % 2 !== 0 ? '<div class="ball-card ghost"></div>' : ''}
      </div>
      <div class="boss-center">
        ${this._cardHTML(boss, bossCfg)}
      </div>
      <div class="boss-side boss-side-right">
        ${rightCards.join('')}
        ${right.length % 2 !== 0 ? '<div class="ball-card ghost"></div>' : ''}
      </div>`;
  }

  refresh(ball) {
    const card    = document.getElementById(`card-${ball.id}`);
    const hpEl    = document.getElementById(`card-${ball.id}-hp`);
    const dmgEl   = document.getElementById(`card-${ball.id}-dmg`);
    const dealtEl = document.getElementById(`card-${ball.id}-dealt`);
    const extraEl = document.getElementById(`card-${ball.id}-extra`);
    if (!card) return;

    const w = ball.weapon;

    if (!ball.alive) {
      card.classList.add('dead');
      if (hpEl)    { hpEl.textContent = 'HP: 0'; hpEl.className = 'ball-stat hp-low'; }
      if (dealtEl && w) dealtEl.textContent = `Dealt: ${Math.floor(w.damageDealt)}`;
      return;
    }

    if (hpEl) {
      const pct = ball.hp / ball.maxHp;
      hpEl.textContent = `HP: ${Math.ceil(ball.hp)}`;
      hpEl.className   = ball.hp > ball.maxHp
        ? 'ball-stat hp-over'
        : ball.maxHp >= 5000 ? 'ball-stat hp-boss'
        : `ball-stat ${pct > 0.6 ? 'hp-full' : pct > 0.3 ? 'hp-mid' : 'hp-low'}`;
    }

    if (!w) return;
    if (dealtEl) dealtEl.textContent = `Dealt: ${Math.floor(w.damageDealt)}`;

    if (dmgEl) {
      if (w.constructor.name === 'ChanceWeapon')
        dmgEl.textContent = `DMG: 2 | Crit: ${(w.critChance * 100).toFixed(0)}%`;
      else if (w.constructor.name === 'RushWeapon')
        dmgEl.textContent = `DMG: ${w.currentDamage(ball)} | Cap: ${w.maxDamageCap}`;
      else if (w.constructor.name === 'VenomWeapon')
        dmgEl.textContent = `DMG: ${Math.ceil(w.currentDamage)} (DoT)`;
      else if (w.constructor.name === 'ShieldWeapon' || w.constructor.name === 'DummyWeapon')
        dmgEl.textContent = `DMG: —`;
      else
        dmgEl.textContent = `DMG: ${Math.ceil(w.currentDamage ?? w.baseDamage)}`;
    }

    if (extraEl) {
      switch (w.constructor.name) {
        case 'ChanceWeapon':   extraEl.textContent = `Crit DMG: ${w.critDamage}`; break;
        case 'SiphonWeapon':    extraEl.textContent = `Heal/hit: ${w.currentLifesteal}`; break;
        case 'FrostWeapon':    extraEl.textContent = `Frost: ${w.currentFrostDur.toFixed(1)}s`; break;
        case 'DaggerWeapon': { const bonus = Math.min(w.hitsLanded * 5, 500); extraEl.textContent = `Spin+: ${(100+bonus).toFixed(0)}%`; break; }
        case 'RushWeapon':     extraEl.textContent = `Base: ${w.baseDamageCap} | Spd: ${Math.floor(ball.maxSpeed)}`; break;
        case 'SpikeWeapon':  extraEl.textContent = `Spike: ${w.currentDuration.toFixed(1)}s`; break;
        case 'ArcherWeapon':   extraEl.textContent = w._parryCooldown > 0 ? `Parry: ${w._parryCooldown.toFixed(1)}s` : `Shots: ${w.shotCount}`; break;
        case 'PelletWeapon':   extraEl.textContent = `Shots: ${w.shotCount} (${w._hitsTowardNext}/${w.hitsRequired})`; break;
        case 'ShotgunWeapon':  extraEl.textContent = `Shots: ${w.shotCount}`; break;
        case 'VenomWeapon':    extraEl.textContent = `Parries: ${w.parryCount} | Dur: ${w.currentDuration.toFixed(2)}s`; break;
        case 'ZipWeapon':      extraEl.textContent = w._isDashing ? `Dashing!` : `Trail: ${w.trailDuration.toFixed(1)}s`; break;
        case 'SurgeWeapon':    extraEl.textContent = w.isBoosting ? `SURGE ${w._boostTimer.toFixed(1)}s | DMG: ${w.currentDamage}` : `Surge DMG: ${w.baseDamage + w.surgeDamageBonus} | Dur: ${w.nextBoostDuration.toFixed(1)}s`; break;
        case 'ShieldWeapon':   extraEl.textContent = `Width: ×${w.widthMult.toFixed(1)} (${w.hitsLanded} parries)`; break;
        case 'ShockWeapon':    extraEl.textContent = `AOE: ${Math.round(w.mainAoeRadius)}/${Math.round(w.chainAoeRadius)}px`; break;
        case 'SnipeWeapon':    extraEl.textContent = w._parryCooldown > 0 ? `Parry: ${w._parryCooldown.toFixed(1)}s` : `Next: ${w._fireTimer.toFixed(1)}s`; break;
        case 'BlackholeWeapon': extraEl.textContent = w._parryCooldown > 0 ? `Parry: ${w._parryCooldown.toFixed(1)}s` : `Next: ${w._fireTimer.toFixed(1)}s`; break;
        case 'HostessWeapon': { const live = w.minionSystem?.countFor(ball.id) ?? 0; extraEl.textContent = live > 0 ? `Minis: ${live} | Dur: ${w.currentLifetime.toFixed(1)}s` : `Summon in: ${w._cooldown > 0 ? w._cooldown.toFixed(1)+'s' : 'ready'}`; break; }
        case 'MenderWeapon':  extraEl.textContent = w._pulsing ? `Healing! Left: ${w._activeCharges}` : `Base: ${w.baseCharges} | CD: ${w._pulseTimer.toFixed(1)}s`; break;
        case 'DummyWeapon':    extraEl.textContent = '— testing dummy'; break;
        case 'GuardWeapon':    extraEl.textContent = `Hits: ${w.hitsLanded}`; break;
        case 'SwordWeapon':    extraEl.textContent = `Spin+: ${Math.min(w.hitsLanded, 20).toFixed(0)}%`; break;
        default:               extraEl.textContent = '';
      }
    }
  }
}