/* entities.js — Player, spawner, particles (global: Entities) */
(function () {
  'use strict';
  const U = window.Utils;

  class Player {
    constructor() { this.reset(); }
    reset() {
      this.lane = 0;            // -1, 0, 1 (target)
      this.x = 0;               // smooth lane position (float)
      this.y = 0;               // jump / platform height
      this.prevY = 0;
      this.vy = 0;
      this.jumping = false;
      this.sliding = false;
      this.slideT = 0;
      this.slideAge = 0;
      this.slideDuration = 0.82;
      this.runPhase = 0;
      this.slideBlend = 0;
      this.airBlend = 0;
      this.landingT = 0;
      this.onTrain = false;
      this.dead = false;
    }
    move(dir) {
      if (this.dead) return false;
      const next = U.clamp(this.lane + dir, -1, 1);
      if (next !== this.lane) { this.lane = next; window.SoundFX.swoosh(); return true; }
      return false;
    }
    jump() {
      if (this.dead || this.jumping) return false;
      if (this.sliding) { this.sliding = false; this.slideT = 0; }
      this.onTrain = false;
      this.jumping = true;
      this.vy = 5.8;            // high enough to clear and land on train roofs
      window.SoundFX.jump();
      return true;
    }
    slide() {
      if (this.dead) return false;
      if (this.jumping && this.y > 0.35) { this.vy = -7.5; } // slam down
      this.sliding = true;
      this.slideAge = 0;
      this.slideT = this.slideDuration;
      window.SoundFX.slide();
      return true;
    }
    update(dt, boost = 0) {
      // Smooth lane change.
      this.x = U.lerp(this.x, this.lane, Math.min(1, dt * 12));

      // Jump physics + a tiny landing impulse used only by the visual animation.
      this.prevY = this.y;
      const wasJumping = this.jumping;
      if (this.jumping) {
        this.y += this.vy * dt;
        this.vy -= 14.0 * dt;
        if (this.y <= 0) { this.y = 0; this.vy = 0; this.jumping = false; }
      }
      if (wasJumping && !this.jumping) this.landingT = 0.16;
      this.landingT = Math.max(0, this.landingT - dt);

      // Slide timer.
      if (this.sliding) {
        this.slideAge += dt;
        this.slideT -= dt;
        if (this.slideT <= 0) { this.sliding = false; this.slideT = 0; }
      }

      // Blend pose changes instead of snapping from one animation to another.
      const blend = Math.min(1, dt * 18);
      this.slideBlend = U.lerp(this.slideBlend, this.sliding ? 1 : 0, blend);
      this.airBlend = U.lerp(this.airBlend, this.jumping ? 1 : 0, Math.min(1, dt * 14));

      // One full run cycle drives both legs and both arms.
      this.runPhase += dt * (10.2 + this.y * 1.5 + boost * 4.2);
    }
  }

  class Particle {
    constructor(x, y, vx, vy, life, color, size) {
      this.x = x; this.y = y; this.vx = vx; this.vy = vy;
      this.life = life; this.maxLife = life; this.color = color; this.size = size;
    }
    update(dt) { this.x += this.vx * dt; this.y += this.vy * dt; this.vy += 900 * dt; this.life -= dt; }
  }

  // --- Spawner: obstacles only; educational objects are spawned separately by Game.
  const Spawner = {
    nextGap: 0,
    reset() { this.nextGap = 30; },
    spawnRow(game, difficulty) {
      const lanes = U.shuffle([-1, 0, 1]);
      const roll = Math.random();
      const row = { obstacles: [] };
      const z = game.VIEW_DIST;

      if (roll < 0.30) {
        const nTrains = Math.random() < 0.35 + difficulty * 0.3 ? 2 : 1;
        for (let i = 0; i < nTrains; i++) row.obstacles.push({ type: 'train', lane: lanes[i], z: z + U.rand(0, 6), len: U.rand(9, 15 + difficulty * 8), color: U.choice(['#dfe7ee', '#d94a55', '#326aa5', '#338b78', '#dd7a4f', '#7167a8']) });
      } else if (roll < 0.52) {
        const n = Math.random() < 0.5 ? 2 : 1;
        for (let i = 0; i < n; i++) row.obstacles.push({ type: 'low', lane: lanes[i], z, len: 1.2 });
      } else if (roll < 0.72) {
        const n = Math.random() < 0.5 ? 2 : 1;
        for (let i = 0; i < n; i++) row.obstacles.push({ type: 'high', lane: lanes[i], z, len: 1.2 });
      } else if (roll < 0.86) {
        row.obstacles.push({ type: 'train', lane: lanes[0], z: z + U.rand(0, 4), len: U.rand(10, 16), color: U.choice(['#dfe7ee', '#d94a55', '#326aa5', '#338b78', '#dd7a4f']) });
        row.obstacles.push({ type: Math.random() < 0.5 ? 'low' : 'high', lane: lanes[1], z: z + 2, len: 1.2 });
      } else {
        // A lighter row gives the player a short breather; the educational object remains independent.
        if (Math.random() < 0.45) row.obstacles.push({ type: 'low', lane: lanes[0], z: z + 3, len: 1.2 });
      }

      row.obstacles.forEach((o) => game.obstacles.push(o));
      game.spawnEducationalElement(row);

      const base = U.lerp(46, 26, difficulty);
      this.nextGap = U.rand(base * 0.8, base * 1.2);
    }
  };

  window.Entities = { Player, Particle, Spawner };
})();
