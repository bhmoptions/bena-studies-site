/* game.js — main loop, rendering, collisions (global: Game) */
(function () {
  'use strict';
  const U = window.Utils;
  const { Player, Particle, Spawner } = window.Entities;

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const el = (id) => document.getElementById(id);
  const hud = el('hud'), scoreEl = el('score'), bestEl = el('best'),
    questionEl = el('question-text'), feedbackEl = el('score-feedback'),
    feedbackNameEl = el('feedback-element'), feedbackPointsEl = el('feedback-points'),
    questionPromptEl = el('question-prompt'),
    scrStart = el('screen-start'), scrPause = el('screen-pause'), scrOver = el('screen-over'), scrQuestion = el('screen-question');

  const INK = 'rgba(10,8,22,.92)';
  const FONT = '"Arial Black", Arial, sans-serif';

  function hash(n) {
    const s = Math.sin(n * 127.1) * 43758.5453;
    return s - Math.floor(s);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  const Game = {
    W: 0, H: 0, DPR: 1,
    VIEW_DIST: 90,
    state: 'menu',
    player: new Player(),
    obstacles: [], collectibles: [], particles: [],
    speed: 14, speedMultiplier: 1, elapsed: 0, distSinceSpawn: 0,
    boosting: false, boostBlend: 0,
    BOOST_MULTIPLIER: 1.5,
    score: 0, correctCount: 0,
    best: U.store.get('ss_edu_best', 0),
    question: null, questionResolved: 0, questionBatch: 6, collectibleId: 0, feedbackTimer: 0, questionPromptTimer: 0,
    shake: 0, dieT: 0,
    travel: 0, sleepOffset: 0,
    buildings: [], stars: [], clouds: [],
    last: 0,

    init() {
      this.resize();
      if (window.Collectibles3D) Collectibles3D.init();
      window.addEventListener('resize', () => this.resize());

      this.buildings = [];
      for (let i = 0; i < 30; i++) {
        this.buildings.push({
          x: Math.random(), w: U.rand(0.03, 0.1),
          h: U.rand(0.04, 0.16), sp: U.rand(0.2, 0.7),
          ant: Math.random() < 0.3
        });
      }
      this.stars = [];
      for (let i = 0; i < 80; i++) {
        this.stars.push({
          x: Math.random(), y: Math.random() * 0.8,
          r: Math.random() < 0.85 ? 1 : 2,
          a: U.rand(0.2, 0.95), sp: U.rand(1.2, 3.4), ph: U.rand(0, 6.28)
        });
      }
      this.clouds = [];
      const cloudCols = [
        'rgba(58,18,72,.62)', 'rgba(255,108,92,.30)',
        'rgba(28,8,48,.75)', 'rgba(255,168,118,.26)'
      ];
      for (let i = 0; i < 8; i++) {
        this.clouds.push({
          x: Math.random() * 1.3, y: U.rand(0.12, 0.72),
          w: U.rand(0.16, 0.44), hK: U.rand(0.005, 0.013),
          sp: U.rand(0.0015, 0.006), col: U.choice(cloudCols)
        });
      }

      this.updateBest();
      el('btn-mute').textContent = SoundFX.muted ? '🔇' : '🔊';

      Input.init();
      Input.onAction((a) => this.onAction(a));

      el('btn-start').addEventListener('click', () => this.start());
      el('btn-restart').addEventListener('click', () => this.start());
      el('btn-restart-pause').addEventListener('click', () => this.start());
      el('btn-resume').addEventListener('click', () => this.resume());
      el('btn-question-ok').addEventListener('click', () => this.confirmQuestion());
      el('btn-pause').addEventListener('click', () => this.pause());
      el('btn-menu').addEventListener('click', () => this.toMenu());
      el('btn-mute').addEventListener('click', () => {
        SoundFX.ensure();
        const m = SoundFX.toggleMute();
        el('btn-mute').textContent = m ? '🔇' : '🔊';
      });
      document.addEventListener('visibilitychange', () => {
        if (document.hidden && this.state === 'playing') this.pause();
      });

      this.last = performance.now();
      requestAnimationFrame((t) => this.loop(t));
    },

    resize() {
      const wrap = document.getElementById('game-wrap');
      this.DPR = Math.min(2, window.devicePixelRatio || 1);
      this.W = wrap ? wrap.clientWidth : window.innerWidth;
      this.H = wrap ? wrap.clientHeight : (window.innerHeight - 62);
      canvas.width = Math.floor(this.W * this.DPR);
      canvas.height = Math.floor(this.H * this.DPR);
      canvas.style.width = this.W + 'px';
      canvas.style.height = this.H + 'px';
      ctx.setTransform(this.DPR, 0, 0, this.DPR, 0, 0);
      if (window.Collectibles3D) Collectibles3D.resize(this.W, this.H);
    },

    persp(z) { return 1 / (1 + z * 0.055); },
    groundY() { return this.H * 0.94; },
    horizonY() { return this.H * 0.30; },
    laneX(lane, z) {
      const p = this.persp(z);
      return this.W / 2 + lane * this.W * 0.30 * p;
    },
    worldY(z) {
      const p = this.persp(z);
      return U.lerp(this.horizonY(), this.groundY(), p);
    },
    laneW(z) { return this.W * 0.20 * this.persp(z); },

    onAction(a) {
      SoundFX.ensure();
      if (a === 'boost-off') { this.boosting = false; return; }
      if (a === 'boost-on') { if (this.state === 'playing') this.boosting = true; return; }
      if (this.state === 'menu') {
        if (a === 'tap' || a === 'jump') this.start();
        return;
      }
      if (this.state === 'question') {
        if (a === 'enter' || a === 'tap' || a === 'jump') this.confirmQuestion();
        return;
      }
      if (this.state === 'over') {
        if (a === 'tap' || a === 'enter') this.start();
        return;
      }
      if (a === 'pause') {
        if (this.state === 'playing') this.pause();
        else if (this.state === 'paused') this.resume();
        return;
      }
      if (this.state !== 'playing') return;
      if (a === 'left') this.player.move(-1);
      else if (a === 'right') this.player.move(1);
      else if (a === 'jump') { if (this.player.jump()) this.burst(this.playerScreen().x, this.playerScreen().y, 6, '#ffffff'); }
      else if (a === 'slide') this.player.slide();
    },

    async start() {
      if (window.EducationDataPromise) {
        try { await window.EducationDataPromise; } catch (e) {}
      }
      SoundFX.ensure(); SoundFX.click();
      clearTimeout(this.questionPromptTimer);
      this.player.reset();
      this.obstacles = []; this.collectibles = []; this.particles = [];
      if (window.Collectibles3D) Collectibles3D.clear();
      Spawner.reset();
      this.speed = 14; this.elapsed = 0; this.distSinceSpawn = 20;
      this.boosting = false; this.boostBlend = 0;
      this.score = 0; this.correctCount = 0;
      this.questionResolved = 0; this.collectibleId = 0;
      this.shake = 0; this.travel = 0; this.sleepOffset = 0;
      this.state = 'playing';
      scrStart.classList.add('hidden'); scrOver.classList.add('hidden'); scrPause.classList.add('hidden'); scrQuestion.classList.add('hidden');
      hud.classList.remove('hidden');
      this.pickQuestion(false);
    },
    pause() {
      if (this.state !== 'playing') return;
      this.boosting = false;
      this.state = 'paused';
      scrPause.classList.remove('hidden');
    },
    resume() {
      if (this.state !== 'paused') return;
      SoundFX.click();
      this.state = 'playing';
      scrPause.classList.add('hidden');
      this.last = performance.now();
    },
    toMenu() {
      SoundFX.click();
      clearTimeout(this.questionPromptTimer);
      this.boosting = false; this.boostBlend = 0;
      this.state = 'menu';
      scrOver.classList.add('hidden'); scrPause.classList.add('hidden'); scrQuestion.classList.add('hidden');
      scrStart.classList.remove('hidden'); hud.classList.add('hidden');
      this.updateBest();
      if (window.Collectibles3D) Collectibles3D.clear();
    },
    gameOver() {
      this.boosting = false;
      this.state = 'over';
      const s = Math.floor(this.score);
      const isBest = s > this.best;
      if (isBest) { this.best = s; U.store.set('ss_edu_best', s); }
      el('final-score').textContent = 'Pontuação: ' + s;
      el('final-coins').textContent = 'Acertos: ' + this.correctCount;
      el('new-best').classList.toggle('hidden', !isBest);
      setTimeout(() => { scrOver.classList.remove('hidden'); hud.classList.add('hidden'); }, 650);
      this.updateBest();
    },
    updateBest() {
      bestEl.textContent = 'RECORDE ' + this.best;
      el('start-best').textContent = this.best > 0 ? '★ Recorde: ' + this.best + ' ★' : 'Pegue os elementos corretos e evite os errados.';
    },

    playerScreen() {
      const x = this.W / 2 + this.player.x * this.W * 0.30;
      const y = this.groundY() - this.player.y * this.H * 0.38;
      return { x, y };
    },
    trainRoofY() {
      const roofPx = this.H * 0.32 + 30;
      return roofPx / (this.H * 0.38);
    },

    pickQuestion(avoidCurrent) {
      const qs = (window.EducationData && EducationData.questions) || [];
      if (!qs.length) return;
      let q = U.choice(qs);
      if (avoidCurrent && qs.length > 1 && this.question && q.type === this.question.type) q = qs[(qs.indexOf(q) + 1) % qs.length];
      this.question = q;
      this.questionResolved = 0;
      if (questionEl) questionEl.textContent = q.phrase;
      if (questionPromptEl) questionPromptEl.textContent = q.phrase;
      this.boosting = false;
      this.state = 'question';
      clearTimeout(this.questionPromptTimer);
      scrQuestion.classList.add('hidden');
      const delay = avoidCurrent ? 880 : 0;
      this.questionPromptTimer = setTimeout(() => { if (this.state === 'question') scrQuestion.classList.remove('hidden'); }, delay);
    },
    confirmQuestion() {
      if (this.state !== 'question') return;
      SoundFX.ensure(); SoundFX.click();
      scrQuestion.classList.add('hidden');
      this.state = 'playing';
      this.last = performance.now();
    },
    spawnEducationalElement(row) {
      if (this.collectibles.some(c => !c.taken)) return;
      const data = window.EducationData;
      if (!data || !data.elements.length || !this.question) return;
      const element = U.choice(data.elements);
      const trains = row.obstacles.filter(o => o.type === 'train' && o.len >= 8);
      let lane, z = this.VIEW_DIST + 4, y = 0, onTrain = false;
      if (trains.length && Math.random() < 0.28) {
        const train = U.choice(trains);
        lane = train.lane; z = train.z + Math.min(4.2, train.len * 0.36); y = this.trainRoofY(); onTrain = true;
      } else {
        const blocked = new Set(row.obstacles.map(o => o.lane));
        const free = [-1,0,1].filter(l => !blocked.has(l));
        lane = U.choice(free.length ? free : [-1,0,1]);
      }
      this.collectibles.push({ id: ++this.collectibleId, lane, z, y, onTrain, name: element.name, types: element.types.slice(), correct: element.types.includes(this.question.type), variantKey: Collectibles3D.randomVariant(element.name), taken: false });
    },
    showScoreFeedback(name, points) {
      if (!feedbackEl) return;
      clearTimeout(this.feedbackTimer);
      if (feedbackNameEl) feedbackNameEl.textContent = name;
      if (feedbackPointsEl) feedbackPointsEl.textContent = (points > 0 ? '+' : '') + points;
      feedbackEl.className = points > 0 ? 'gain' : 'loss';
      feedbackEl.classList.remove('hidden');
      this.feedbackTimer = setTimeout(() => feedbackEl.classList.add('hidden'), 850);
    },
    resolveEducationalElement(c, mode) {
      if (c.taken) return;
      c.taken = true;
      if (mode === 'collect') {
        if (c.correct) { this.score += 10; this.correctCount++; SoundFX.coin(); this.showScoreFeedback(c.name, 10); }
        else { this.score -= 5; SoundFX.tone(180, 0.18, 'square', 0.09, 90); this.showScoreFeedback(c.name, -5); }
      } else if (mode === 'miss') {
        if (c.correct) { this.score -= 2; this.showScoreFeedback(c.name, -2); }
        else { this.score += 1; this.showScoreFeedback(c.name, 1); }
      }
      this.questionResolved++;
      if (this.questionResolved >= this.questionBatch) this.pickQuestion(true);
    },
    collectibleScreen(c) {
      const p = this.persp(c.z), x = this.laneX(c.lane, c.z), yBase = this.worldY(c.z);
      let y;
      if (c.onTrain) { const roofH = this.H * 0.32 * p + 14 + 16 * p; y = yBase - roofH - (20 * p + 8); }
      else { const lift = (c.y || 0) * this.H * 0.22 * p + 14 * p; y = yBase - 34 * p - lift; }
      return { x, y, p, visible: c.z >= -4 && c.z <= this.VIEW_DIST + 20 };
    },
    drawEducationalElement(time) {
      const active = this.collectibles.filter(c => !c.taken && c.z >= -4 && c.z <= this.VIEW_DIST + 20);
      if (!active.length || !window.Collectibles3D) return;
      const layer = Collectibles3D.render(active, c => this.collectibleScreen(c), time);
      if (layer) ctx.drawImage(layer, 0, 0, this.W, this.H);
    },
    burst(x, y, n, color) {
      for (let i = 0; i < n; i++) {
        this.particles.push(new Particle(x + U.rand(-10, 10), y + U.rand(-10, 10),
          U.rand(-260, 260), U.rand(-420, -40), U.rand(0.3, 0.7), color, U.rand(2, 5)));
      }
    },

    update(dt) {
      this.elapsed += dt;
      const baseSpeed = Math.min(38, 14 + this.elapsed * 0.35);
      const boostTarget = this.boosting ? 1 : 0;
      this.boostBlend = U.lerp(this.boostBlend, boostTarget, Math.min(1, dt * (this.boosting ? 8 : 5)));
      this.speed = baseSpeed * this.speedMultiplier * U.lerp(1, this.BOOST_MULTIPLIER, this.boostBlend);
      const difficulty = U.clamp(this.elapsed / 90, 0, 1);

      this.player.update(dt, this.boostBlend);
      this.travel += this.speed * dt;
      this.sleepOffset = this.travel % 4;

      this.distSinceSpawn += this.speed * dt;
      if (this.distSinceSpawn >= Spawner.nextGap) {
        this.distSinceSpawn = 0;
        Spawner.spawnRow(this, difficulty);
      }

      for (const o of this.obstacles) o.z -= this.speed * dt;
      for (const c of this.collectibles) c.z -= this.speed * dt;

      if (Math.random() < dt * 14 && this.player.y < 0.05 && !this.player.sliding) {
        const ps = this.playerScreen();
        this.particles.push(new Particle(ps.x + U.rand(-12, 12), ps.y + 26, U.rand(-40, 40), U.rand(-120, -20), U.rand(0.25, 0.5), 'rgba(220,200,190,.85)', U.rand(2, 4)));
      }
      if (Math.random() < dt * 34 && this.player.sliding && this.player.y < 0.08) {
        const ps = this.playerScreen();
        this.particles.push(new Particle(ps.x + U.rand(-18, 8), ps.y + U.rand(10, 22), U.rand(-180, -45), U.rand(-95, -15), U.rand(0.18, 0.36), 'rgba(235,215,195,.78)', U.rand(2, 4.5)));
      }

      const ps = this.playerScreen();
      for (const c of this.collectibles) {
        if (c.taken) continue;
        if (Math.abs(c.z) < 1.25 && Math.abs(c.lane - this.player.x) < 0.58 && Math.abs(c.y - this.player.y) < 0.75) {
          this.resolveEducationalElement(c, 'collect');
          this.burst(ps.x, ps.y - 40, 10, c.correct ? '#7dff8a' : '#ff7272');
        } else if (c.z < -2.2) this.resolveEducationalElement(c, 'miss');
      }
      if (this.state !== 'playing') { scoreEl.textContent = Math.floor(this.score); return; }

      // Trains are also platforms: if the player's feet clear the roof, they can land and run on top.
      const roofY = this.trainRoofY();
      let supportedByTrain = false;
      for (const o of this.obstacles) {
        if (o.z < 0.8 && o.z + o.len > -0.8 && Math.abs(this.player.x - o.lane) < 0.55) {
          let hit = false;
          if (o.type === 'train') {
            const clearsRoof = this.player.y >= roofY - 0.08;
            const crossedRoof = this.player.vy <= 0 && this.player.prevY >= roofY - 0.04 && this.player.y < roofY;
            if (this.player.onTrain || clearsRoof || crossedRoof) {
              supportedByTrain = true;
              if (this.player.vy <= 0 || this.player.onTrain) {
                this.player.y = roofY;
                this.player.vy = 0;
                this.player.jumping = false;
                this.player.onTrain = true;
              }
            } else hit = true;
          } else if (o.type === 'low') {
            // The hurdle is only ~50 px tall near the player. The old 0.5 threshold
            // required roughly 150-200 px of lift, causing unfair deaths even when
            // the character was visibly over the barrier.
            const hurdlePx = 50;
            const jumpClearY = hurdlePx / (this.H * 0.38) + 0.035;
            hit = this.player.y < jumpClearY;
          } else if (o.type === 'high') {
            // Use the animated pose as the hitbox too. This avoids the few frames
            // where the character still looks fully slid down but sliding=false.
            const visuallyLowEnough = this.player.sliding || this.player.slideBlend > 0.38;
            hit = !visuallyLowEnough;
          }
          if (hit) { this.die(); return; }
        }
      }
      if (this.player.onTrain && !supportedByTrain) {
        this.player.onTrain = false;
        this.player.jumping = true;
        this.player.vy = Math.min(this.player.vy, -0.15);
      }

      this.obstacles = this.obstacles.filter((o) => o.z + o.len > -12);
      this.collectibles = this.collectibles.filter((c) => !c.taken && c.z > -4);

      for (const pt of this.particles) pt.update(dt);
      this.particles = this.particles.filter((p) => p.life > 0);

      scoreEl.textContent = Math.floor(this.score);


      for (const b of this.buildings) {
        b.x -= dt * 0.008 * b.sp * (this.speed / 20);
        if (b.x < -0.12) { b.x = 1.12; b.h = U.rand(0.04, 0.16); }
      }
    },

    die() {
      this.boosting = false;
      this.state = 'dying';
      this.dieT = 0.7;
      this.shake = 14;
      SoundFX.crash();
      const ps = this.playerScreen();
      this.burst(ps.x, ps.y - 40, 30, '#ff5a5a');
      this.burst(ps.x, ps.y - 40, 20, '#ffffff');
    },

    loop(t) {
      requestAnimationFrame((t2) => this.loop(t2));
      let dt = (t - this.last) / 1000;
      this.last = t;
      if (dt > 0.05) dt = 0.05;
      if (this.state === 'playing') this.update(dt);
      else if (this.state === 'dying') {
        this.dieT -= dt;
        this.shake *= 0.9;
        for (const pt of this.particles) pt.update(dt);
        this.particles = this.particles.filter((p) => p.life > 0);
        if (this.dieT <= 0) { this.shake = 0; this.gameOver(); }
      }
      this.render(t / 1000);
    },

    // ================= RENDER =================
    render(time) {
      const { W, H } = this;
      ctx.save();
      if (this.shake > 0.3) ctx.translate(U.rand(-this.shake, this.shake), U.rand(-this.shake, this.shake));

      this.drawSky(time);
      this.drawTracks();

      const activeEducational = this.collectibles.find(c => !c.taken && c.z >= -4 && c.z <= this.VIEW_DIST + 20);
      if (activeEducational && !activeEducational.onTrain) this.drawEducationalElement(time);

      const drawables = [];
      for (const o of this.obstacles) drawables.push({ z: o.z, o });
      drawables.sort((a, b) => b.z - a.z);
      for (const d of drawables) {
        const behindView = d.o.type === 'train' ? d.o.z + d.o.len < -11 : d.z < -2;
        if (behindView || d.z > this.VIEW_DIST + 20) continue;
        this.drawObstacle(d.o);
      }
      if (activeEducational && activeEducational.onTrain) this.drawEducationalElement(time);

      this.drawWorldFog();

      if (this.state !== 'menu') this.drawPlayer(time);
      this.drawParticles();
      this.drawSpeedLines(time);

      const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(10,4,20,.5)');
      ctx.fillStyle = g;
      ctx.fillRect(-20, -20, W + 40, H + 40);
      ctx.restore();
    },

    drawWorldFog() {
      const { W, H } = this;
      const hz = this.horizonY();
      const g = ctx.createLinearGradient(0, hz - 6, 0, hz + H * 0.44);
      g.addColorStop(0, 'rgba(255,168,120,.78)');
      g.addColorStop(0.45, 'rgba(255,146,116,.32)');
      g.addColorStop(1, 'rgba(255,140,110,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-20, hz - 6, W + 40, H * 0.44 + 30);
    },

    drawSpeedLines(time) {
      if (this.state !== 'playing' && this.state !== 'dying') return;
      const t = U.clamp((this.speed - 16) / 22, 0, 1);
      if (t <= 0.02) return;
      const { W, H } = this;
      const cx = W / 2, cy = this.horizonY() + H * 0.05;
      const R = Math.max(W, H) * 0.6;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = `rgba(255,244,230,${(0.05 + t * 0.11).toFixed(3)})`;
      const N = 26;
      for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2 + hash(i) * 0.4;
        const phase = (time * (0.5 + t * 0.8) + hash(i + 40)) % 1;
        const r0 = (0.2 + phase * 0.8) * R;
        const len = (0.07 + t * 0.1) * R * (0.4 + hash(i + 7));
        ctx.lineWidth = 1 + t * 2.4;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0 * 0.72);
        ctx.lineTo(cx + Math.cos(a) * (r0 + len), cy + Math.sin(a) * (r0 + len) * 0.72);
        ctx.stroke();
      }
      ctx.restore();
    },

    drawSky(time) {
      const { W, H } = this;
      const hz = this.horizonY();

      const sky = ctx.createLinearGradient(0, 0, 0, hz + 50);
      sky.addColorStop(0, '#0a0520');
      sky.addColorStop(0.34, '#2b1058');
      sky.addColorStop(0.66, '#7c1e64');
      sky.addColorStop(0.87, '#e85d4a');
      sky.addColorStop(1, '#ffb65c');
      ctx.fillStyle = sky;
      ctx.fillRect(-20, -20, W + 40, hz + 70);

      for (const s of this.stars) {
        const a = s.a * (0.5 + 0.5 * Math.sin(time * s.sp + s.ph));
        if (a <= 0.02) continue;
        ctx.fillStyle = 'rgba(255,240,225,' + a.toFixed(3) + ')';
        ctx.fillRect(s.x * W, s.y * hz * 0.78, s.r, s.r);
      }

      this.drawSun(time);
      this.drawClouds(time, hz);
      this.drawCity(hz, time);

      const glow = ctx.createLinearGradient(0, hz - H * 0.14, 0, hz + 10);
      glow.addColorStop(0, 'rgba(255,150,80,0)');
      glow.addColorStop(1, 'rgba(255,201,124,.7)');
      ctx.fillStyle = glow;
      ctx.fillRect(-20, hz - H * 0.14, W + 40, H * 0.14 + 32);

      const gr = ctx.createLinearGradient(0, hz, 0, H);
      gr.addColorStop(0, '#2a2440');
      gr.addColorStop(0.3, '#332c4e');
      gr.addColorStop(1, '#14101f');
      ctx.fillStyle = gr;
      ctx.fillRect(-20, hz, W + 40, H - hz + 20);
    },

    drawSun(time) {
      const { W, H } = this;
      const hz = this.horizonY();
      const cx = W * 0.5 + Math.sin(time * 0.04) * 8;
      const cy = hz - H * 0.155;
      const r = Math.min(W, H) * 0.085;

      const gl = ctx.createRadialGradient(cx, cy, r * 0.35, cx, cy, r * 3.4);
      gl.addColorStop(0, 'rgba(255,196,96,.55)');
      gl.addColorStop(0.45, 'rgba(255,124,84,.2)');
      gl.addColorStop(1, 'rgba(255,124,84,0)');
      ctx.fillStyle = gl;
      ctx.beginPath(); ctx.arc(cx, cy, r * 3.4, 0, Math.PI * 2); ctx.fill();

      const disc = ctx.createLinearGradient(0, cy - r, 0, cy + r);
      disc.addColorStop(0, '#fff3b0');
      disc.addColorStop(0.45, '#ffd166');
      disc.addColorStop(1, '#ff6b4a');
      ctx.fillStyle = disc;
      const step = Math.max(3, r * 0.1);
      for (let y = cy - r; y < cy + r; y += step) {
        const dy = (y + step / 2) - cy;
        const hw = Math.sqrt(Math.max(0, r * r - dy * dy));
        if (hw < 0.5) continue;
        const t = U.clamp((y - (cy - r * 0.18)) / (r * 1.18), 0, 1);
        const hh = Math.max(1, step - step * t * 0.55);
        ctx.fillRect(cx - hw, y, hw * 2, hh);
      }
    },

    drawClouds(time, hz) {
      const { W, H } = this;
      for (const c of this.clouds) {
        let x = (c.x + time * c.sp) % 1.3;
        if (x < 0) x += 1.3;
        const px = (x - 0.15) * W;
        const py = c.y * hz;
        const rw = c.w * W * 0.5;
        const rh = Math.max(3, c.hK * H);
        ctx.fillStyle = c.col;
        ctx.beginPath();
        ctx.ellipse(px, py, rw, rh, 0, 0, Math.PI * 2);
        ctx.ellipse(px + rw * 0.55, py + rh * 0.7, rw * 0.7, rh * 0.85, 0, 0, Math.PI * 2);
        ctx.ellipse(px - rw * 0.6, py + rh * 0.9, rw * 0.55, rh * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },

    drawCity(hz, time) {
      const { W, H } = this;
      const layers = [
        { col: '#6b4478', win: null, par: 0.45, hMul: 0.55, widthMul: 1.15 },
        { col: '#3a2458', win: 'rgba(255,206,120,.5)', par: 0.7, hMul: 0.8, widthMul: 1 },
        { col: '#1b1133', win: 'rgba(255,192,96,.88)', par: 1, hMul: 1, widthMul: 0.95 }
      ];
      for (let L = 0; L < layers.length; L++) {
        const cfg = layers[L];
        for (let i = 0; i < this.buildings.length; i++) {
          const b = this.buildings[i];
          let nx = (b.x * cfg.par + L * 0.33) % 1.2;
          if (nx < 0) nx += 1.2;
          nx -= 0.1;
          const bx = nx * W;
          const bw = b.w * W * cfg.widthMul;
          const bh = b.h * H * cfg.hMul;
          if (bx + bw < -4 || bx > W + 4) continue;
          ctx.fillStyle = cfg.col;
          ctx.fillRect(bx, hz - bh, bw, bh);

          if (L === 2 && b.ant) {
            ctx.fillStyle = '#0e0a1e';
            const ax = bx + bw * 0.5;
            ctx.fillRect(ax - 1, hz - bh - H * 0.035, 2, H * 0.035);
            const blink = Math.sin(time * 3 + i) > 0.2;
            ctx.fillStyle = blink ? '#ff4d6d' : 'rgba(255,77,109,.25)';
            ctx.beginPath(); ctx.arc(ax, hz - bh - H * 0.035, 2.5, 0, Math.PI * 2); ctx.fill();
          }

          if (cfg.win) {
            ctx.fillStyle = cfg.win;
            const cellW = 9, cellH = 7;
            for (let wy = hz - bh + 8; wy < hz - 10; wy += cellH + 6) {
              for (let wx = bx + 5; wx < bx + bw - 6; wx += cellW + 5) {
                const k = Math.floor(wx * 0.37 + wy * 0.71 + i * 13.7 + L * 31);
                if (hash(k) < 0.45) ctx.fillRect(wx, wy, cellW, cellH);
              }
            }
          }
        }
      }
    },

    drawTracks() {
      const { W, H } = this;
      const hz = this.horizonY(), gy = this.groundY();

      const far = this.persp(this.VIEW_DIST);
      const halfNear = W * 0.46, halfFar = W * 0.46 * far;
      const bottom = H + 60;

      ctx.fillStyle = '#464160';
      ctx.beginPath();
      ctx.moveTo(-20, hz);
      ctx.lineTo(W / 2 - halfFar, hz);
      ctx.lineTo(W / 2 - halfNear, bottom);
      ctx.lineTo(-20, bottom);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(W + 20, hz);
      ctx.lineTo(W / 2 + halfFar, hz);
      ctx.lineTo(W / 2 + halfNear, bottom);
      ctx.lineTo(W + 20, bottom);
      ctx.closePath(); ctx.fill();

      ctx.strokeStyle = '#e8b923';
      ctx.lineWidth = Math.max(3, W * 0.006);
      ctx.beginPath();
      ctx.moveTo(W / 2 - halfFar, hz);
      ctx.lineTo(W / 2 - halfNear, bottom);
      ctx.moveTo(W / 2 + halfFar, hz);
      ctx.lineTo(W / 2 + halfNear, bottom);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,.35)';
      ctx.lineWidth = Math.max(1, W * 0.002);
      ctx.beginPath();
      ctx.moveTo(W / 2 - halfFar, hz);
      ctx.lineTo(W / 2 - halfNear, bottom);
      ctx.moveTo(W / 2 + halfFar, hz);
      ctx.lineTo(W / 2 + halfNear, bottom);
      ctx.stroke();

      ctx.fillStyle = '#4a4e69';
      ctx.beginPath();
      ctx.moveTo(W / 2 - halfFar, hz);
      ctx.lineTo(W / 2 + halfFar, hz);
      ctx.lineTo(W / 2 + halfNear, gy + 40);
      ctx.lineTo(W / 2 - halfNear, gy + 40);
      ctx.closePath(); ctx.fill();

      const vd = this.VIEW_DIST;
      const tr = this.travel % vd;
      for (let i = 0; i < 56; i++) {
        let z = (hash(i + 1) * vd - tr + vd * 2) % vd;
        if (z < 0.6) continue;
        const p = this.persp(z);
        const side = hash(i + 99) * 2 - 1;
        const x = W / 2 + side * W * 0.44 * p;
        const y = this.worldY(z);
        const r = (1 + hash(i + 7) * 2.4) * p + 0.6;
        ctx.fillStyle = hash(i + 13) > 0.5 ? 'rgba(0,0,0,.2)' : 'rgba(255,255,255,.12)';
        ctx.fillRect(x, y, r, r * 0.7);
      }

      const spacing = 4;
      const n = Math.ceil(vd / spacing);
      for (let i = 0; i < n; i++) {
        let z = i * spacing - this.sleepOffset;
        if (z < 0.5) z = 0.5;
        const y = this.worldY(z);
        const p = this.persp(z);
        const wHalf = W * 0.44 * p;
        const h = Math.max(1.5, 7 * p);
        ctx.fillStyle = 'rgba(0,0,0,.28)';
        ctx.fillRect(W / 2 - wHalf, y - h / 2 + h * 0.55, wHalf * 2, h * 0.7);
        ctx.fillStyle = i % 2 ? '#584a3c' : '#685a48';
        ctx.fillRect(W / 2 - wHalf, y - h / 2, wHalf * 2, h);
        ctx.fillStyle = 'rgba(255,225,190,.08)';
        ctx.fillRect(W / 2 - wHalf, y - h / 2, wHalf * 2, Math.max(1, h * 0.25));
      }

      for (const edge of [-0.5, 0.5]) {
        for (let i = 0; i < n; i++) {
          let z = i * spacing - this.sleepOffset;
          if (z < 0.5) z = 0.5;
          const p = this.persp(z);
          const x = this.laneX(edge, z);
          const y = this.worldY(z);
          const dw = Math.max(1, 4 * p), dh = Math.max(1.5, 11 * p);
          ctx.fillStyle = 'rgba(255,255,255,' + (0.15 + p * 0.3).toFixed(3) + ')';
          ctx.fillRect(x - dw / 2, y - dh / 2, dw, dh);
        }
      }

      for (const lane of [-1, 0, 1]) {
        for (const off of [-0.055, 0.055]) {
          const pts = [];
          for (let z = 0; z <= vd; z += 4) pts.push([this.laneX(lane + off, z), this.worldY(z)]);
          ctx.strokeStyle = '#5d6478';
          ctx.lineWidth = Math.max(2, W * 0.0065);
          ctx.beginPath();
          pts.forEach((pt, i) => i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1]));
          ctx.stroke();
          ctx.strokeStyle = '#eef3fb';
          ctx.lineWidth = Math.max(1, W * 0.0026);
          ctx.beginPath();
          pts.forEach((pt, i) => i ? ctx.lineTo(pt[0], pt[1] - 1) : ctx.moveTo(pt[0], pt[1] - 1));
          ctx.stroke();
        }
      }

      for (const s of [-1, 1]) {
        const grd = ctx.createLinearGradient(0, hz, 0, H);
        grd.addColorStop(0, 'rgba(255,213,74,0)');
        grd.addColorStop(1, 'rgba(255,213,74,.5)');
        ctx.strokeStyle = grd; ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(W / 2 + s * halfFar, hz);
        ctx.lineTo(W / 2 + s * halfNear, gy + 40);
        ctx.stroke();
      }

      this.drawPoles();
    },

    drawPoles() {
      const { W, H } = this;
      const spacing = 14;
      const off = this.travel % spacing;
      const n = Math.ceil(this.VIEW_DIST / spacing);
      for (let i = n; i >= 0; i--) {
        const z = i * spacing - off;
        if (z < 1.5 || z > this.VIEW_DIST) continue;
        const p = this.persp(z);
        const y = this.worldY(z);
        const hgt = H * 0.34 * p + 8;
        const w = Math.max(1.5, 8 * p);
        for (const s of [-1, 1]) {
          const x = this.laneX(s * 1.58, z);
          ctx.fillStyle = '#241a33';
          ctx.fillRect(x - w / 2, y - hgt, w, hgt);
          ctx.fillStyle = 'rgba(255,255,255,.14)';
          ctx.fillRect(x - w / 2, y - hgt, Math.max(1, w * 0.3), hgt);

          const armLen = W * 0.1 * p + 4;
          const armX = s < 0 ? x : x - armLen;
          ctx.fillStyle = '#241a33';
          ctx.fillRect(armX, y - hgt, armLen, Math.max(1.5, w * 0.7));

          const lx = s < 0 ? x + armLen * 0.88 : x - armLen * 0.88;
          const ly = y - hgt + w * 0.85;
          const gr = 24 * p + 6;
          const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, gr);
          glow.addColorStop(0, 'rgba(255,232,166,.85)');
          glow.addColorStop(1, 'rgba(255,232,166,0)');
          ctx.fillStyle = glow;
          ctx.beginPath(); ctx.arc(lx, ly, gr, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#ffe9a3';
          ctx.beginPath(); ctx.arc(lx, ly, Math.max(1.2, 4 * p), 0, Math.PI * 2); ctx.fill();
        }
      }
    },
    drawCoin(c, time) {
      const p = this.persp(c.z);
      const yBase = this.worldY(c.z);
      const x = this.laneX(c.lane, c.z);
      let y;
      if (c.onTrain) {
        const roofH = this.H * 0.32 * p + 14 + 16 * p;
        y = yBase - roofH - (13 * p + 5) + Math.sin(time * 4 + c.z) * 2.2 * p;
      } else {
        const lift = (c.y || 0) * this.H * 0.22 * p + 14 * p;
        y = yBase - 26 * p - lift + Math.sin(time * 4 + c.z) * 3 * p;
      }
      const r = Math.max(3, 13 * p + 4);
      const sq = Math.abs(Math.cos(time * 5 + c.z * 0.5));

      ctx.save();
      ctx.translate(x, y);

      const gl = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, r * 2.3);
      gl.addColorStop(0, 'rgba(255,213,74,.5)');
      gl.addColorStop(1, 'rgba(255,213,74,0)');
      ctx.fillStyle = gl;
      ctx.beginPath(); ctx.arc(0, 0, r * 2.3, 0, Math.PI * 2); ctx.fill();

      ctx.scale(Math.max(0.14, sq), 1);

      const g = ctx.createLinearGradient(0, -r, 0, r);
      g.addColorStop(0, '#fff1a8');
      g.addColorStop(0.5, '#ffd54a');
      g.addColorStop(1, '#e09a00');
      ctx.fillStyle = g;
      ctx.strokeStyle = '#8a5f00';
      ctx.lineWidth = Math.max(1.5, r * 0.16);
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();

      ctx.strokeStyle = 'rgba(138,95,0,.75)';
      ctx.lineWidth = Math.max(1, r * 0.1);
      ctx.beginPath(); ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2); ctx.stroke();

      ctx.fillStyle = '#8a5f00';
      ctx.font = '900 ' + Math.max(7, r * 1.05) + 'px ' + FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('★', 0, 1);

      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.beginPath();
      ctx.ellipse(-r * 0.34, -r * 0.42, r * 0.24, r * 0.12, -0.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const tw = (Math.sin(time * 7 + c.z * 2) + 1) / 2;
      if (tw > 0.7 && p > 0.35) {
        const sr = r * 0.9;
        const sx = x + r * 0.6, sy = y - r * 0.6;
        ctx.strokeStyle = 'rgba(255,255,240,' + ((tw - 0.7) * 3).toFixed(2) + ')';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy - sr); ctx.lineTo(sx, sy + sr);
        ctx.moveTo(sx - sr, sy); ctx.lineTo(sx + sr, sy);
        ctx.stroke();
      }
    },

    drawPower(p, time) {
      const yBase = this.worldY(p.z);
      const x = this.laneX(p.lane, p.z);
      const y = yBase - 40 * this.persp(p.z) + Math.sin(time * 3) * 5;
      const s = 16 * this.persp(p.z) + 12;
      const col = '#22dd66';

      ctx.save();
      ctx.translate(x, y);

      const gl = ctx.createRadialGradient(0, 0, s * 0.3, 0, 0, s * 1.6);
      gl.addColorStop(0, 'rgba(80,255,140,.5)');
      gl.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gl;
      ctx.beginPath(); ctx.arc(0, 0, s * 1.6, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,.75)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 6]);
      ctx.lineDashOffset = time * 20;
      ctx.beginPath(); ctx.arc(0, 0, s * 1.05, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = col;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      const r = s * 0.8;
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i + time;
        const px = Math.cos(a) * r, py = Math.sin(a) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill(); ctx.stroke();

      ctx.fillStyle = '#fff';
      ctx.font = '900 ' + Math.max(10, s * 0.7) + 'px ' + FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('×2', 0, 1);
      ctx.restore();
    },

    drawObstacle(o) {
      if (o.type === 'train') this.drawTrain(o);
      else if (o.type === 'low') this.drawLowBarrier(o);
      else this.drawHighBarrier(o);
    },

    drawTrain(o) {
      // Render a long train as several short cars. Besides looking much more like a
      // real metro train, this prevents the old "rubber train" distortion while it
      // leaves the bottom of the screen.
      const carLen = 5.4;
      const gap = 0.28;
      const endZ = o.z + o.len;
      const cars = [];
      let cursor = o.z;
      let idx = 0;
      while (cursor < endZ - 0.3 && idx < 14) {
        const zB = Math.min(cursor + carLen, endZ);
        if (zB - cursor > 0.7) cars.push({ zF: cursor, zB, idx });
        cursor = zB + gap;
        idx++;
      }

      const body = o.color;
      const bodyLight = this.shade(body, 24);
      const bodyDark = this.shade(body, -30);
      const bodyDarker = this.shade(body, -52);
      const roofCol = this.shade(body, 38);

      const geo = (z) => {
        const p = this.persp(z);
        const x = this.laneX(o.lane, z);
        const y = this.worldY(z);
        const w = this.laneW(z) * 0.92;
        const h = this.H * 0.32 * p + 14 + 16 * p;
        return { z, p, x, y, w, h, l: x - w / 2, r: x + w / 2, t: y - h };
      };

      const poly = (pts, fill, stroke = null, lineWidth = 1) => {
        ctx.beginPath();
        pts.forEach((pt, i) => i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1]));
        ctx.closePath();
        if (fill) { ctx.fillStyle = fill; ctx.fill(); }
        if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke(); }
      };

      const sidePoint = (z, sign, yFrac) => {
        const g = geo(z);
        return [g.x + sign * g.w / 2, g.t + g.h * yFrac];
      };

      const drawSide = (zF, zB, sign, carIndex) => {
        const gF = geo(zF), gB = geo(zB);
        const sideCol = sign < 0 ? this.shade(body, -18) : this.shade(body, -38);
        poly([
          [gF.x + sign * gF.w / 2, gF.t], [gB.x + sign * gB.w / 2, gB.t],
          [gB.x + sign * gB.w / 2, gB.y], [gF.x + sign * gF.w / 2, gF.y]
        ], sideCol);

        // Dark undercarriage/skirt.
        poly([
          sidePoint(zF, sign, 0.82), sidePoint(zB, sign, 0.82),
          sidePoint(zB, sign, 1.0), sidePoint(zF, sign, 1.0)
        ], '#171b24');

        // Thin transit stripe.
        poly([
          sidePoint(zF, sign, 0.56), sidePoint(zB, sign, 0.56),
          sidePoint(zB, sign, 0.625), sidePoint(zF, sign, 0.625)
        ], '#f5c542');

        // Windows and door panels follow the perspective of the side surface.
        const n = 4;
        for (let i = 0; i < n; i++) {
          const ta = (i + 0.12) / n;
          const tb = (i + 0.88) / n;
          const za = U.lerp(zF, zB, ta);
          const zb = U.lerp(zF, zB, tb);
          const isDoor = i === 1 || (i === 2 && carIndex % 2 === 1);
          if (isDoor) {
            poly([
              sidePoint(za, sign, 0.18), sidePoint(zb, sign, 0.18),
              sidePoint(zb, sign, 0.79), sidePoint(za, sign, 0.79)
            ], this.shade(body, -9), 'rgba(10,16,26,.55)', Math.max(1, gF.p * 2));
            poly([
              sidePoint(za, sign, 0.24), sidePoint(zb, sign, 0.24),
              sidePoint(zb, sign, 0.49), sidePoint(za, sign, 0.49)
            ], 'rgba(112,184,218,.92)');
            const zm = (za + zb) * 0.5;
            const a = sidePoint(zm, sign, 0.19), b = sidePoint(zm, sign, 0.79);
            ctx.strokeStyle = 'rgba(12,20,32,.6)';
            ctx.lineWidth = Math.max(1, gF.p * 1.7);
            ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
          } else {
            const topA = sidePoint(za, sign, 0.23), topB = sidePoint(zb, sign, 0.23);
            const botB = sidePoint(zb, sign, 0.48), botA = sidePoint(za, sign, 0.48);
            const glass = ctx.createLinearGradient(0, topA[1], 0, botA[1]);
            glass.addColorStop(0, '#bfe9fa');
            glass.addColorStop(0.5, '#69b0d5');
            glass.addColorStop(1, '#345b78');
            poly([topA, topB, botB, botA], glass, 'rgba(10,20,32,.6)', Math.max(1, gF.p * 1.6));
            ctx.strokeStyle = 'rgba(255,255,255,.48)';
            ctx.lineWidth = Math.max(0.8, gF.p * 1.2);
            ctx.beginPath();
            ctx.moveTo(topA[0], topA[1] + (botA[1] - topA[1]) * 0.2);
            ctx.lineTo(topB[0], topB[1] + (botB[1] - topB[1]) * 0.2);
            ctx.stroke();
          }
        }
      };

      const drawCar = (zF0, zB, isLead, carIndex) => {
        // Segments completely behind the player are discarded only after their roof
        // has actually cleared the viewport. The front is clipped far below screen.
        if (zB < -11 || zF0 > this.VIEW_DIST + 22) return;
        const zF = Math.max(-13, zF0);
        if (zB <= zF + 0.08) return;

        const gF = geo(zF), gB = geo(zB);

        // Soft projected shadow.
        poly([
          [gF.l - gF.w * 0.08, gF.y + 7 * gF.p], [gF.r + gF.w * 0.08, gF.y + 7 * gF.p],
          [gB.r + gB.w * 0.08, gB.y + 5 * gB.p], [gB.l - gB.w * 0.08, gB.y + 5 * gB.p]
        ], 'rgba(0,0,0,.32)');

        drawSide(zF, zB, -1, carIndex);
        drawSide(zF, zB, 1, carIndex);

        // Roof, with a central seam and HVAC boxes.
        poly([[gF.l, gF.t], [gB.l, gB.t], [gB.r, gB.t], [gF.r, gF.t]], roofCol, 'rgba(18,24,34,.48)', Math.max(1, 2.2 * gF.p));
        ctx.strokeStyle = 'rgba(255,255,255,.34)';
        ctx.lineWidth = Math.max(1, 1.6 * gF.p);
        ctx.beginPath();
        ctx.moveTo(gF.x, gF.t); ctx.lineTo(gB.x, gB.t); ctx.stroke();

        for (const t of [0.34, 0.68]) {
          const za = U.lerp(zF, zB, t - 0.07), zb = U.lerp(zF, zB, t + 0.07);
          const a = geo(za), b = geo(zb);
          const wf = a.w * 0.22, wb = b.w * 0.22;
          poly([
            [a.x - wf, a.t - 2 * a.p], [b.x - wb, b.t - 2 * b.p],
            [b.x + wb, b.t - 2 * b.p], [a.x + wf, a.t - 2 * a.p]
          ], '#737b86', 'rgba(20,24,32,.55)', Math.max(0.8, a.p));
        }

        // Near end/front face of each carriage.
        const faceGrad = ctx.createLinearGradient(0, gF.t, 0, gF.y);
        faceGrad.addColorStop(0, bodyLight);
        faceGrad.addColorStop(0.55, body);
        faceGrad.addColorStop(1, bodyDark);
        ctx.fillStyle = faceGrad;
        roundRect(gF.l, gF.t, gF.w, gF.h, Math.max(2, 8 * gF.p));
        ctx.fill();
        ctx.strokeStyle = 'rgba(12,16,25,.82)';
        ctx.lineWidth = Math.max(1.5, 3.2 * gF.p);
        ctx.stroke();

        // Roof lip.
        ctx.fillStyle = 'rgba(255,255,255,.28)';
        ctx.fillRect(gF.l + gF.w * 0.05, gF.t + gF.h * 0.025, gF.w * 0.9, Math.max(2, gF.h * 0.025));

        if (isLead) {
          // Destination display.
          const dh = gF.h * 0.085;
          ctx.fillStyle = '#111721';
          roundRect(gF.x - gF.w * 0.31, gF.t + gF.h * 0.075, gF.w * 0.62, dh, Math.max(2, 3 * gF.p));
          ctx.fill();
          ctx.fillStyle = '#ffcf45';
          ctx.font = '900 ' + Math.max(7, gF.w * 0.085) + 'px ' + FONT;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText('METRO  •  01', gF.x, gF.t + gF.h * 0.117);

          // Large split windshield.
          const wy = gF.t + gF.h * 0.20, wh = gF.h * 0.29;
          const wx = gF.w * 0.075, ww = gF.w * 0.37;
          const glass = ctx.createLinearGradient(0, wy, 0, wy + wh);
          glass.addColorStop(0, '#d9f4ff');
          glass.addColorStop(0.42, '#77bddf');
          glass.addColorStop(1, '#315874');
          for (const sign of [-1, 1]) {
            const x0 = sign < 0 ? gF.x - wx - ww : gF.x + wx;
            ctx.fillStyle = glass;
            roundRect(x0, wy, ww, wh, Math.max(2, 5 * gF.p)); ctx.fill();
            ctx.strokeStyle = '#172536'; ctx.lineWidth = Math.max(1.2, 2.5 * gF.p); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,.34)';
            poly([[x0 + ww * 0.08, wy + wh * 0.1], [x0 + ww * 0.54, wy + wh * 0.1], [x0 + ww * 0.28, wy + wh * 0.42]], 'rgba(255,255,255,.28)');
          }

          // Color band under windshield.
          ctx.fillStyle = '#f3c541';
          ctx.fillRect(gF.l, gF.t + gF.h * 0.55, gF.w, gF.h * 0.075);
          ctx.fillStyle = 'rgba(255,255,255,.18)';
          ctx.fillRect(gF.l, gF.t + gF.h * 0.55, gF.w, Math.max(1, gF.h * 0.015));

          // Headlights + small red marker lights.
          for (const sign of [-1, 1]) {
            const lx = gF.x + sign * gF.w * 0.29, ly = gF.t + gF.h * 0.74;
            const r = Math.max(2.5, gF.w * 0.055);
            const glow = ctx.createRadialGradient(lx, ly, 0, lx, ly, r * 2.8);
            glow.addColorStop(0, 'rgba(255,250,220,.95)'); glow.addColorStop(1, 'rgba(255,240,180,0)');
            ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(lx, ly, r * 2.8, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff7d0'; ctx.beginPath(); ctx.arc(lx, ly, r, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#e64c52'; ctx.beginPath(); ctx.arc(gF.x + sign * gF.w * 0.39, gF.t + gF.h * 0.64, Math.max(1.5, r * 0.38), 0, Math.PI * 2); ctx.fill();
          }

          // Lower bumper / coupler.
          ctx.fillStyle = '#171b24';
          ctx.fillRect(gF.x - gF.w * 0.42, gF.t + gF.h * 0.84, gF.w * 0.84, gF.h * 0.12);
          ctx.fillStyle = '#343a46';
          roundRect(gF.x - gF.w * 0.12, gF.t + gF.h * 0.87, gF.w * 0.24, gF.h * 0.07, Math.max(1, 3 * gF.p)); ctx.fill();
        } else {
          // Inter-car end: simpler and darker, with a connector doorway.
          ctx.fillStyle = bodyDarker;
          ctx.fillRect(gF.l, gF.t + gF.h * 0.58, gF.w, gF.h * 0.08);
          ctx.fillStyle = '#161b24';
          roundRect(gF.x - gF.w * 0.20, gF.t + gF.h * 0.22, gF.w * 0.40, gF.h * 0.58, Math.max(2, 4 * gF.p)); ctx.fill();
          ctx.fillStyle = 'rgba(98,156,187,.72)';
          roundRect(gF.x - gF.w * 0.13, gF.t + gF.h * 0.29, gF.w * 0.26, gF.h * 0.25, Math.max(1, 3 * gF.p)); ctx.fill();
        }
      };

      // Back-to-front so carriage overlaps and gaps look natural in perspective.
      for (let i = cars.length - 1; i >= 0; i--) drawCar(cars[i].zF, cars[i].zB, i === 0, cars[i].idx);
    },

    drawLowBarrier(o) {
      const x = this.laneX(o.lane, o.z), y = this.worldY(o.z);
      const p = this.persp(o.z);
      const w = this.laneW(o.z) * 0.95, h = 34 * p + 16;

      ctx.fillStyle = 'rgba(0,0,0,.35)';
      ctx.beginPath();
      ctx.ellipse(x, y + 4, w * 0.55, Math.max(3, 9 * p + 2), 0, 0, Math.PI * 2);
      ctx.fill();

      const postW = Math.max(3, 7 * p + 3);
      const pg = ctx.createLinearGradient(x - w / 2, 0, x - w / 2 + postW, 0);
      pg.addColorStop(0, '#5a6274'); pg.addColorStop(1, '#2c3140');
      ctx.fillStyle = pg;
      ctx.fillRect(x - w / 2, y - h, postW, h);
      ctx.fillRect(x + w / 2 - postW, y - h, postW, h);

      const bh = h * 0.55;
      const by = y - h;
      ctx.save();
      ctx.beginPath(); ctx.rect(x - w / 2, by, w, bh); ctx.clip();
      ctx.fillStyle = '#f4f6fb';
      ctx.fillRect(x - w / 2, by, w, bh);
      ctx.strokeStyle = '#ff3d5a';
      ctx.lineWidth = Math.max(3, w * 0.1);
      for (let i = -1; i < 8; i++) {
        const x0 = x - w / 2 + i * w * 0.18;
        ctx.beginPath();
        ctx.moveTo(x0, by + bh + 2);
        ctx.lineTo(x0 + bh, by - 2);
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(1.5, 3 * p + 1);
      ctx.strokeRect(x - w / 2, by, w, bh);

      ctx.fillStyle = '#2c3140';
      const br = Math.max(1.5, 3 * p + 1);
      for (const bx of [x - w / 2 + postW / 2, x + w / 2 - postW / 2]) {
        for (const yy of [by + bh * 0.2, by + bh * 0.8]) {
          ctx.beginPath(); ctx.arc(bx, yy, br, 0, Math.PI * 2); ctx.fill();
        }
      }

      const tx = x, ty = by + bh * 0.48;
      ctx.font = '900 ' + Math.max(9, 13 * p + 7) + 'px ' + FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const tw = Math.max(40, ctx.measureText('JUMP!').width + 14);
      const th = Math.max(14, 17 * p + 8);
      ctx.fillStyle = 'rgba(12,8,24,.82)';
      roundRect(tx - tw / 2, ty - th / 2, tw, th, 4 * p + 2);
      ctx.fill();
      ctx.lineWidth = 4; ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,.85)';
      ctx.strokeText('JUMP!', tx, ty);
      ctx.fillStyle = '#ffd54a';
      ctx.fillText('JUMP!', tx, ty);
    },

    drawHighBarrier(o) {
      const x = this.laneX(o.lane, o.z), y = this.worldY(o.z);
      const p = this.persp(o.z);
      const w = this.laneW(o.z) * 1.05, hTop = 30 * p + 18;
      const clearance = 108 * p + 52;
      const top = y - hTop - clearance;
      const legW = Math.max(4, 9 * p + 4);

      ctx.fillStyle = 'rgba(0,0,0,.32)';
      for (const lx of [x - w / 2 + legW / 2, x + w / 2 - legW / 2]) {
        ctx.beginPath();
        ctx.ellipse(lx, y + 4, legW * 1.6, Math.max(2, 6 * p + 2), 0, 0, Math.PI * 2);
        ctx.fill();
      }

      const lg = ctx.createLinearGradient(0, top, 0, y);
      lg.addColorStop(0, '#5f6a80'); lg.addColorStop(1, '#2a3145');
      ctx.fillStyle = lg;
      ctx.fillRect(x - w / 2, top, legW, y - top);
      ctx.fillRect(x + w / 2 - legW, top, legW, y - top);

      ctx.strokeStyle = 'rgba(255,255,255,.18)';
      ctx.lineWidth = Math.max(1, 2 * p);
      for (let i = 0; i < 4; i++) {
        const yy = top + (y - top) * (0.2 + i * 0.2);
        ctx.beginPath();
        ctx.moveTo(x - w / 2, yy); ctx.lineTo(x - w / 2 + legW, yy + legW);
        ctx.moveTo(x + w / 2 - legW, yy); ctx.lineTo(x + w / 2, yy + legW);
        ctx.stroke();
      }

      ctx.save();
      ctx.beginPath(); ctx.rect(x - w / 2, top, w, hTop); ctx.clip();
      ctx.fillStyle = '#17141f';
      ctx.fillRect(x - w / 2, top, w, hTop);
      ctx.strokeStyle = '#ffd54a';
      ctx.lineWidth = Math.max(4, hTop * 0.35);
      for (let i = -1; i < 10; i++) {
        const x0 = x - w / 2 + i * w * 0.16;
        ctx.beginPath();
        ctx.moveTo(x0, top + hTop + 2);
        ctx.lineTo(x0 + hTop, top - 2);
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = INK;
      ctx.lineWidth = Math.max(1.5, 3 * p + 1);
      ctx.strokeRect(x - w / 2, top, w, hTop);

      ctx.font = '900 ' + Math.max(9, 13 * p + 7) + 'px ' + FONT;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 5; ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(0,0,0,.9)';
      ctx.strokeText('▼ SLIDE ▼', x, top + hTop * 0.55);
      ctx.fillStyle = '#fff';
      ctx.fillText('▼ SLIDE ▼', x, top + hTop * 0.55);
    },

    drawPlayer(time) {
      const ps = this.playerScreen();
      const dead = this.state === 'dying' || this.state === 'over';
      const s = Math.min(this.W, this.H) / 350; // smaller, lighter silhouette than the original character
      const phase = this.player.runPhase;
      const air = U.clamp(this.player.airBlend || 0, 0, 1);
      const slide = U.clamp(this.player.slideBlend || 0, 0, 1);
      const jumpTuck = U.clamp(this.player.y / 0.85, 0, 1);
      const slideP = U.clamp((this.player.slideAge || 0) / (this.player.slideDuration || 0.82), 0, 1);
      const rollWave = Math.sin(slideP * Math.PI * 2);
      const stride = Math.sin(phase);
      const bob = (1 - air) * (1 - slide) * Math.abs(Math.sin(phase)) * 1.35 * s;
      const landing = this.player.landingT > 0 ? Math.sin((this.player.landingT / 0.16) * Math.PI) * 2.8 * s : 0;

      const mix = (a, b, t) => U.lerp(a, b, t);
      const P = (x, y) => ({ x, y });
      const mixP = (a, b, t) => P(mix(a.x, b.x, t), mix(a.y, b.y, t));
      const inkStroke = (lw) => { ctx.strokeStyle = INK; ctx.lineWidth = lw; ctx.stroke(); };
      const limb = (pts, outerW, innerW, color) => {
        ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.strokeStyle = INK; ctx.lineWidth = outerW * s;
        ctx.beginPath(); ctx.moveTo(pts[0].x * s, pts[0].y * s);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x * s, pts[i].y * s);
        ctx.stroke();
        ctx.strokeStyle = color; ctx.lineWidth = innerW * s;
        ctx.beginPath(); ctx.moveTo(pts[0].x * s, pts[0].y * s);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x * s, pts[i].y * s);
        ctx.stroke();
      };
      const shoe = (foot, knee, front) => {
        const ang = U.clamp((foot.x - knee.x) * 0.025, -0.28, 0.28) + slide * (front ? -0.38 : 0.24);
        ctx.save(); ctx.translate(foot.x * s, foot.y * s); ctx.rotate(ang);
        ctx.fillStyle = '#f7f9ff'; roundRect(-7.5 * s, -4.2 * s, 16 * s, 8.4 * s, 3.5 * s); ctx.fill(); inkStroke(1.8 * s);
        ctx.fillStyle = '#ff6b57'; roundRect(-7.5 * s, 1.7 * s, 16 * s, 3.2 * s, 1.5 * s); ctx.fill();
        ctx.strokeStyle = '#9aa4bd'; ctx.lineWidth = 1.1 * s;
        ctx.beginPath(); ctx.moveTo(-2.5 * s, -1.4 * s); ctx.lineTo(4 * s, -1.4 * s); ctx.stroke();
        ctx.restore();
      };

      // --- articulated pose --------------------------------------------------
      const legPose = (side, a) => {
        const reach = Math.sin(a);
        const lift = Math.max(0, Math.cos(a));
        const hip = P(side * 5.5, -2);
        const kneeRun = P(side * 6 + reach * 4.5, 10 - lift * 3.5);
        const footRun = P(side * 7 + reach * 11, 28 - lift * 8.5);
        const kneeAir = P(side * 8.5, 7 + (side < 0 ? 1 : 0));
        const footAir = P(side * 11.5, 18 - (side < 0 ? 0 : 1.5));
        const tuck = Math.max(air, jumpTuck * 0.85);
        const knee = mixP(kneeRun, kneeAir, tuck);
        const foot = mixP(footRun, footAir, tuck);
        const slideHip = P(side * 5, 10);
        const slideKnee = side < 0 ? P(-14 - rollWave * 2, 14 + Math.abs(rollWave) * 2) : P(13 + rollWave * 2, 7 - Math.abs(rollWave) * 2);
        const slideFoot = side < 0 ? P(-29 - rollWave * 2, 22) : P(19 + rollWave * 2, 21);
        return {
          hip: mixP(hip, slideHip, slide),
          knee: mixP(knee, slideKnee, slide),
          foot: mixP(foot, slideFoot, slide)
        };
      };
      const leftLeg = legPose(-1, phase);
      const rightLeg = legPose(1, phase + Math.PI);

      const armPose = (side, a) => {
        const swing = -Math.sin(a);
        const shoulderRun = P(side * 10.5, -31);
        const elbowRun = P(side * (15 + swing * 4), -19 + Math.abs(swing) * 1.5);
        const handRun = P(side * (19 + swing * 8), -7 + Math.abs(swing) * 2);
        const elbowAir = P(side * 15, -35);
        const handAir = P(side * 18, -24);
        const elbow = mixP(elbowRun, elbowAir, air);
        const hand = mixP(handRun, handAir, air);
        const shoulderSlide = side < 0 ? P(-7, -2) : P(8, -1);
        const elbowSlide = side < 0 ? P(-16, 7) : P(14, 7);
        const handSlide = side < 0 ? P(-24, 16) : P(5, 16);
        return {
          shoulder: mixP(shoulderRun, shoulderSlide, slide),
          elbow: mixP(elbow, elbowSlide, slide),
          hand: mixP(hand, handSlide, slide)
        };
      };
      const leftArm = armPose(-1, phase);
      const rightArm = armPose(1, phase + Math.PI);

      ctx.save();
      ctx.translate(ps.x, ps.y);

      // Shadow stays attached to the ground while the character jumps.
      const jumpPx = this.player.y * this.H * 0.38;
      const shadowScale = U.clamp(1 - this.player.y * 0.42, 0.48, 1);
      ctx.fillStyle = 'rgba(0,0,0,.34)';
      ctx.beginPath(); ctx.ellipse(0, jumpPx + 4 * s, 21 * s * shadowScale, 5.5 * s * shadowScale, 0, 0, Math.PI * 2); ctx.fill();

      ctx.translate(0, -28 * s + bob + landing + 6 * slide * s);
      if (dead) { ctx.rotate(1.15); ctx.globalAlpha = 0.95; }

      // A subtle torso lean makes the runner feel in motion instead of standing upright.
      const torsoX = 8 * slide;
      const torsoY = -21 + 23 * slide;
      const torsoRot = -0.022 * stride * (1 - air) - (0.96 - rollWave * 0.08) * slide;
      const torsoW = mix(22, 24, slide);
      const torsoH = mix(36, 30, slide);

      // Back leg and back arm first for clean visual layering.
      limb([leftLeg.hip, leftLeg.knee, leftLeg.foot], 10.2, 6.8, '#25324d');
      shoe(leftLeg.foot, leftLeg.knee, false);
      limb([leftArm.shoulder, leftArm.elbow, leftArm.hand], 8.2, 5.5, '#35b8aa');
      ctx.fillStyle = '#efb183'; ctx.beginPath(); ctx.arc(leftArm.hand.x * s, leftArm.hand.y * s, 2.8 * s, 0, Math.PI * 2); ctx.fill(); inkStroke(1.3 * s);

      // Torso / jacket.
      ctx.save(); ctx.translate(torsoX * s, torsoY * s); ctx.rotate(torsoRot);
      const jacket = ctx.createLinearGradient(0, -torsoH * 0.55 * s, 0, torsoH * 0.55 * s);
      jacket.addColorStop(0, '#48d3c2'); jacket.addColorStop(1, '#169889');
      roundRect(-torsoW * 0.5 * s, -torsoH * 0.52 * s, torsoW * s, torsoH * s, 7 * s);
      ctx.fillStyle = jacket; ctx.fill(); inkStroke(2 * s);
      ctx.fillStyle = '#11796f'; roundRect(-torsoW * 0.5 * s, torsoH * 0.27 * s, torsoW * s, torsoH * 0.16 * s, 2 * s); ctx.fill();
      ctx.restore();

      // Front leg and arm.
      limb([rightLeg.hip, rightLeg.knee, rightLeg.foot], 9.5, 6.2, '#2f3d5d');
      shoe(rightLeg.foot, rightLeg.knee, true);
      limb([rightArm.shoulder, rightArm.elbow, rightArm.hand], 8.6, 5.8, '#43c8b9');
      ctx.fillStyle = '#efb183'; ctx.beginPath(); ctx.arc(rightArm.hand.x * s, rightArm.hand.y * s, 2.9 * s, 0, Math.PI * 2); ctx.fill(); inkStroke(1.3 * s);

      // Backpack sits on the visible back of the runner.
      ctx.save(); ctx.translate((torsoX - 0.5) * s, (torsoY + 0.5) * s); ctx.rotate(torsoRot);
      ctx.fillStyle = '#f7b843'; roundRect(-7.2 * s, -11.5 * s, 14.4 * s, 23 * s, 5 * s); ctx.fill(); inkStroke(1.7 * s);
      ctx.fillStyle = '#dc8522'; roundRect(-5.5 * s, 3 * s, 11 * s, 5.4 * s, 2.2 * s); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1.1 * s;
      ctx.beginPath(); ctx.moveTo(-3.4 * s, -7 * s); ctx.lineTo(3.4 * s, -7 * s); ctx.stroke();
      ctx.restore();

      // Head is mostly seen from behind, which suits an endless runner much better.
      const head = P(17 * slide + rollWave * 1.8 * slide, -51 + 47 * slide + Math.abs(rollWave) * 1.8 * slide);
      ctx.fillStyle = '#efb183'; ctx.beginPath(); ctx.arc(head.x * s, head.y * s, 9.2 * s, 0, Math.PI * 2); ctx.fill(); inkStroke(1.9 * s);
      ctx.fillStyle = '#242b40';
      ctx.beginPath(); ctx.arc(head.x * s, (head.y - 1.8) * s, 8.8 * s, Math.PI * 0.95, Math.PI * 2.05); ctx.fill();
      ctx.fillStyle = '#ff6652';
      ctx.beginPath(); ctx.arc(head.x * s, (head.y - 3.6) * s, 8.7 * s, Math.PI * 1.03, Math.PI * 1.97); ctx.lineTo((head.x + 7.9) * s, (head.y - 1.8) * s); ctx.lineTo((head.x - 7.9) * s, (head.y - 1.8) * s); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = INK; ctx.lineWidth = 1.6 * s; ctx.stroke();
      ctx.fillStyle = '#d9473a'; roundRect((head.x - 7.2) * s, (head.y - 3.2) * s, 14.4 * s, 3.2 * s, 1.5 * s); ctx.fill();

      // Hood/collar peeking above the backpack.
      ctx.strokeStyle = '#0f776d'; ctx.lineWidth = 3 * s; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.arc((torsoX + 1.2 * slide) * s, (torsoY - torsoH * 0.47) * s, 6.5 * s, 0.18, Math.PI - 0.18); ctx.stroke();

      ctx.restore();
    },

    drawParticles() {
      for (const p of this.particles) {
        ctx.globalAlpha = U.clamp(p.life / p.maxLife, 0, 1);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },

    drawMagnetAura(time) {
      const ps = this.playerScreen();
      ctx.save();
      ctx.globalAlpha = 0.35 + Math.sin(time * 6) * 0.1;
      ctx.strokeStyle = '#ff5a5a'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ps.x, ps.y - 30, 70 + Math.sin(time * 5) * 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.2;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ps.x, ps.y - 30, 82 + Math.cos(time * 4) * 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    },

    drawMultiAura(time) {
      const ps = this.playerScreen();
      ctx.save();
      ctx.globalAlpha = 0.3 + Math.sin(time * 7) * 0.1;
      ctx.strokeStyle = '#ffd54a'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(ps.x, ps.y - 30, 58 + Math.cos(time * 6) * 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    },

    shade(hex, amt) {
      const n = parseInt(hex.slice(1), 16);
      let r = (n >> 16) + amt, g = ((n >> 8) & 255) + amt, b = (n & 255) + amt;
      r = U.clamp(r, 0, 255); g = U.clamp(g, 0, 255); b = U.clamp(b, 0, 255);
      return 'rgb(' + r + ',' + g + ',' + b + ')';
    }
  };

  window.Game = Game;
  Game.init();
})();
