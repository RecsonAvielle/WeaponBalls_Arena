/**
 * PreGameUI.js
 * Pre-game overlay: ball selection, per-instance team assignment, arena picker.
 *
 * Each ball type shows count buttons. When count > 0, shows one team selector
 * per instance — so 2 Swords can be on different teams.
 *
 * Team 0 = FFA (fights everyone). Teams 1–8 = fight other teams only.
 */

const TEAM_COLORS = [
  null,       // 0 = FFA (no color)
  '#E63946',  // 1 red
  '#457B9D',  // 2 blue
  '#2A9D8F',  // 3 teal
  '#F4A261',  // 4 orange
  '#6D4C9C',  // 5 purple
  '#A8C256',  // 6 green
  '#E76F51',  // 7 coral
  '#D4A017',  // 8 gold
];

export class PreGameUI {
  constructor(overlayEl, ballDefs, arenaDefs, onStart) {
    this.overlay   = overlayEl;
    this.ballDefs  = ballDefs;
    this.arenaDefs = arenaDefs;
    this.onStart   = onStart;

    this._selectedArena = 0;
    // _counts[ballId] = number of this type
    // _instanceTeams[ballId] = array of team per instance
    this._counts       = {};
    this._instanceTeams = {};
    this._bossBall      = null;
    this._healBoxes     = true; // toggle heal box spawning
    ballDefs.forEach(b => {
      this._counts[b.id]        = 0;
      this._instanceTeams[b.id] = [];
    });
    this._render();
  }

  show() { this.overlay.style.display = 'flex'; }
  hide() { this.overlay.style.display = 'none'; }

  _setCount(id, newCount) {
    const old = this._counts[id];
    this._counts[id] = newCount;
    if (newCount > old) {
      for (let k = old; k < newCount; k++) this._instanceTeams[id].push(0);
    } else {
      this._instanceTeams[id] = this._instanceTeams[id].slice(0, newCount);
    }
  }

  _render() {
    // Save scroll positions before wiping innerHTML
    const scrolls = {};
    ['pg-col-arena','pg-col-balls','pg-col-options'].forEach(cls => {
      const el = this.overlay.querySelector('.' + cls);
      if (el) scrolls[cls] = el.scrollTop;
    });

    const arena = this.arenaDefs[this._selectedArena];
    const total = Object.values(this._counts).reduce((s, n) => s + n, 0);
    const max   = arena.maxBalls;
    const valid = total >= (arena.isWaveArena ? 1 : 2) && total <= max;

    this.overlay.innerHTML = `
      <div class="pg-box">
        <h2 class="pg-title">Ball Arena</h2>
        <button class="pg-start ${valid ? '' : 'disabled'}" ${valid ? '' : 'disabled'}>
          ▶ Start Battle
          <span class="pg-count ${valid ? '' : 'invalid'}">
            ${total} / ${max}${total < (arena.isWaveArena ? 1 : 2) ? ' — min 1' : total > max ? ' — too many' : ''}
          </span>
        </button>

        <div class="pg-columns">
          <!-- LEFT: Arena -->
          <div class="pg-col pg-col-arena">
            <div class="pg-section-label">Arena</div>
            <div class="pg-arena-list">
              ${this.arenaDefs.map((a, i) => `
                <button class="pg-arena-btn ${i === this._selectedArena ? 'active' : ''}" data-arena="${i}">
                  <span class="pg-arena-name">${a.name}</span>
                  <span class="pg-arena-sub">${a.description}</span>
                </button>`).join('')}
            </div>
          </div>

          <!-- CENTER: Balls -->
          <div class="pg-col pg-col-balls">
            <div class="pg-section-label">Balls</div>
            <div class="pg-ball-grid">
              ${this.ballDefs.map(b => {
                const cnt = this._counts[b.id];
                const teams = this._instanceTeams[b.id];
                return `
                  <div class="pg-ball-card ${cnt > 0 ? 'selected' : ''}">
                    <div class="pg-ball-card-top">
                      <span class="pg-ball-dot" style="background:${b.color}"></span>
                      <span class="pg-ball-name">${b.name}</span>
                    </div>
                    <div class="pg-ball-counter">
                      <button class="pg-cnt-btn" data-action="dec" data-ball="${b.id}">−</button>
                      <span class="pg-cnt-val">${cnt}</span>
                      <button class="pg-cnt-btn" data-action="inc" data-ball="${b.id}">+</button>
                    </div>
                    ${cnt > 0 ? `<div class="pg-instances">
                      ${teams.map((t, k) => `
                        <div class="pg-instance-row">
                          <span class="pg-instance-label">#${k+1}</span>
                          ${arena.isBossArena ? `<button class="pg-boss-btn ${this._bossBall?.id===b.id&&this._bossBall?.idx===k?'active':''}" data-boss-ball="${b.id}" data-boss-idx="${k}">B</button>` : ''}
                          ${arena.isWaveArena
                            ? [0,1,2,3,4].map(ti => `
                            <button class="pg-team-btn ${t === ti ? 'active' : ''}"
                              data-team="${ti}" data-ball="${b.id}" data-idx="${k}"
                              style="${ti === 0
                                ? `background:${t===0?'#C4B99A':'#F0EAE0'}`
                                : `background:${t===ti?TEAM_COLORS[ti]:'#F0EAE0'};color:${t===ti?'#fff':'#5C5040'}`}">
                              ${ti === 0 ? 'F' : ti}
                            </button>`).join('')
                            : [0,1,2,3,4,5,6,7,8].map(ti => `
                            <button class="pg-team-btn ${t === ti ? 'active' : ''}"
                              data-team="${ti}" data-ball="${b.id}" data-idx="${k}"
                              style="${ti === 0
                                ? `background:${t===0?'#C4B99A':'#F0EAE0'}`
                                : `background:${t===ti?TEAM_COLORS[ti]:'#F0EAE0'};color:${t===ti?'#fff':'#5C5040'}`}">
                              ${ti === 0 ? 'F' : ti}
                            </button>`).join('')}
                        </div>`).join('')}
                    </div>` : ''}
                  </div>`;
              }).join('')}
            </div>
          </div>

          <!-- RIGHT: Options -->
          <div class="pg-col pg-col-options">
            <div class="pg-section-label">Options</div>
            <button class="pg-toggle-btn ${this._healBoxes ? 'active' : ''}" id="pg-healbox-toggle">
              Heal Boxes: ${this._healBoxes ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      </div>`;

    // Restore scroll positions
    ['pg-col-arena','pg-col-balls','pg-col-options'].forEach(cls => {
      const el = this.overlay.querySelector('.' + cls);
      if (el && scrolls[cls] != null) el.scrollTop = scrolls[cls];
    });

    // Arena buttons
    this.overlay.querySelectorAll('[data-arena]').forEach(btn => {
      btn.addEventListener('click', () => {
        this._selectedArena = +btn.dataset.arena;
        if (!this.arenaDefs[this._selectedArena].isBossArena) {
          this._bossBall = null; // clear boss on non-boss arenas
        }
        const newMax = this.arenaDefs[this._selectedArena].maxBalls;
        let t = Object.values(this._counts).reduce((s, n) => s + n, 0);
        for (const id of Object.keys(this._counts).reverse()) {
          while (this._counts[id] > 0 && t > newMax) {
            this._setCount(id, this._counts[id] - 1); t--;
          }
        }
        this._render();
      });
    });

    // Count buttons
    this.overlay.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id    = btn.dataset.ball;
        const total = Object.values(this._counts).reduce((s, n) => s + n, 0);
        const max   = this.arenaDefs[this._selectedArena].maxBalls;
        if (btn.dataset.action === 'inc' && total < max)
          this._setCount(id, this._counts[id] + 1);
        else if (btn.dataset.action === 'dec' && this._counts[id] > 0)
          this._setCount(id, this._counts[id] - 1);
        this._render();
      });
    });

    // Team buttons (per instance)
    this.overlay.querySelectorAll('[data-team]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id  = btn.dataset.ball;
        const idx = +btn.dataset.idx;
        this._instanceTeams[id][idx] = +btn.dataset.team;
        this._render();
      });
    });

    // Heal box toggle
    this.overlay.querySelector('#pg-healbox-toggle')?.addEventListener('click', () => {
      this._healBoxes = !this._healBoxes;
      this._render();
    });

    // Boss designation
    this.overlay.querySelectorAll('[data-boss-ball]').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const id  = btn.dataset.bossBall;
        const idx = +btn.dataset.bossIdx;
        if (this._bossBall?.id === id && this._bossBall?.idx === idx) {
          this._bossBall = null; // toggle off
        } else {
          this._bossBall = { id, idx };
        }
        this._render();
      });
    });

    // Start
    this.overlay.querySelector('.pg-start')?.addEventListener('click', () => {
      if (!valid) return;
      const ballSelections = [];
      for (const b of this.ballDefs) {
        for (let k = 0; k < this._counts[b.id]; k++) {
          const isBoss = this._bossBall?.id === b.id && this._bossBall?.idx === k;
          ballSelections.push({ ...b, instanceTeam: this._instanceTeams[b.id][k] ?? 0, isBoss });
        }
      }
      this.hide();
      this.onStart({ ballSelections, arenaConfig: this.arenaDefs[this._selectedArena], healBoxes: this._healBoxes });
    });
  }
}