/* audio.js — WebAudio bleeps, no external files (global: SoundFX) */
(function () {
  'use strict';
  const SoundFX = {
    ctx: null,
    muted: window.Utils ? Utils.store.get('ss_muted', false) : false,

    ensure() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
      } catch (e) { /* no audio */ }
    },

    toggleMute() {
      this.muted = !this.muted;
      Utils.store.set('ss_muted', this.muted);
      return this.muted;
    },

    tone(freq, dur, type, vol, slideTo) {
      if (this.muted || !this.ctx) return;
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type || 'square';
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
      g.gain.setValueAtTime(vol || 0.12, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.ctx.destination);
      o.start(t); o.stop(t + dur + 0.02);
    },

    click()  { this.ensure(); this.tone(600, 0.07, 'square', 0.08, 900); },
    jump()   { this.ensure(); this.tone(280, 0.18, 'square', 0.10, 720); },
    slide()  { this.ensure(); this.tone(500, 0.16, 'sawtooth', 0.07, 140); },
    coin()   { this.ensure(); this.tone(950, 0.09, 'square', 0.09, 1500); setTimeout(() => this.tone(1400, 0.12, 'square', 0.07, 1900), 55); },
    power()  { this.ensure(); [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.12, 'square', 0.09), i * 70)); },
    swoosh() { this.ensure(); this.tone(300, 0.12, 'sine', 0.08, 900); },
    crash() {
      this.ensure();
      this.tone(160, 0.4, 'sawtooth', 0.16, 40);
      setTimeout(() => this.tone(90, 0.5, 'square', 0.12, 30), 80);
    }
  };
  window.SoundFX = SoundFX;
})();
