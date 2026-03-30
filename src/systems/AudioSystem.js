/**
 * AudioSystem.js — Procedural SFX via Web Audio API.
 */
export class AudioSystem {
  constructor() {
    this._ctx     = null;
    this._enabled = true;
    try {
      this._ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch (e) {
      this._enabled = false;
    }
  }

  _resume() {
    if (this._ctx?.state === 'suspended') this._ctx.resume();
  }

  /** Wall bounce — sine pitch drop, volume and pitch scale with speed */
  playBounce(speed = 300) {
    if (!this._enabled || !this._ctx) return;
    this._resume();
    const ctx = this._ctx;
    const t   = ctx.currentTime;

    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const freq = 60 + speed * 0.08;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.3, t + 0.08);

    gain.gain.setValueAtTime(Math.min(0.18, 0.06 + speed * 0.0002), t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);

    osc.start(t);
    osc.stop(t + 0.1);
  }

  /** Weapon/body hit — noise burst */
  playHit(damage = 2) {
    if (!this._enabled || !this._ctx) return;
    this._resume();
    const ctx = this._ctx;
    const t   = ctx.currentTime;
    const vol = Math.min(0.25, 0.08 + damage * 0.015);

    const len  = Math.floor(ctx.sampleRate * 0.06);
    const buf  = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src    = ctx.createBufferSource();
    src.buffer   = buf;
    const filter = ctx.createBiquadFilter();
    filter.type  = 'bandpass';
    filter.frequency.value = 800 + damage * 40;
    filter.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    src.connect(filter); filter.connect(g); g.connect(ctx.destination);
    src.start(t);
  }

  /** Parry — tuning fork (user-tuned params) */
  playParry() {
    if (!this._enabled || !this._ctx) return;
    this._resume();
    const ctx    = this._ctx;
    const t      = ctx.currentTime;
    const freq   = 2900;
    const decay  = 0.25;
    const attack = 0.01;
    const vol    = 0.04;
    const harmV  = 1.0;
    const clickV = 0.2;

    const master = ctx.createGain();
    master.connect(ctx.destination);

    // Primary triangle tone
    const osc1 = ctx.createOscillator();
    osc1.type  = 'triangle';
    osc1.frequency.setValueAtTime(freq, t);
    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(0, t);
    g1.gain.linearRampToValueAtTime(vol, t + attack);
    g1.gain.exponentialRampToValueAtTime(0.001, t + decay);
    osc1.connect(g1); g1.connect(master);
    osc1.start(t); osc1.stop(t + decay);

    // 2nd harmonic
    const osc2 = ctx.createOscillator();
    osc2.type  = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, t);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0, t);
    g2.gain.linearRampToValueAtTime(vol * harmV, t + attack);
    g2.gain.exponentialRampToValueAtTime(0.001, t + decay * 0.6);
    osc2.connect(g2); g2.connect(master);
    osc2.start(t); osc2.stop(t + decay);

    // Click transient
    const bLen = Math.floor(ctx.sampleRate * 0.008);
    const buf  = ctx.createBuffer(1, bLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bLen; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bLen);
    const click = ctx.createBufferSource();
    click.buffer = buf;
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(clickV, t);
    click.connect(cg); cg.connect(master);
    click.start(t);
  }

  enable()  { this._enabled = true; }
  disable() { this._enabled = false; }
}