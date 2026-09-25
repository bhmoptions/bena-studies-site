/* catalog.js — temporary in-game catalog of every educational animation */
(function () {
  'use strict';

  const T = window.THREE;
  const overlay = document.getElementById('screen-catalog');
  const grid = document.getElementById('catalog-grid');
  const canvas = document.getElementById('catalog-canvas');
  const scroll = document.getElementById('catalog-scroll');
  const btnOpen = document.getElementById('btn-catalog');
  const btnClose = document.getElementById('btn-catalog-close');
  let speedButtons = [];

  function buildSpeedControls() {
    const container = document.querySelector('.game-speed-options');
    if (!container) return;

    const speeds = (window.EducationData?.speeds?.length)
      ? window.EducationData.speeds
      : [
          { nome: 'Lento', valor: 0.5, padrao: false },
          { nome: 'Normal', valor: 1, padrao: true },
          { nome: 'Rápido', valor: 2, padrao: false },
          { nome: 'Supersônico', valor: 3, padrao: false }
        ];

    const defaultItem = speeds.find(s => s.padrao) || speeds.find(s => s.valor === 1) || speeds[0];
    const defaultVal = defaultItem ? defaultItem.valor : 1;

    let savedVal = window.Utils ? window.Utils.store.get('andrews_run_speed', defaultVal) : defaultVal;
    savedVal = Number(savedVal);
    if (!speeds.some(s => s.valor === savedVal)) {
      savedVal = defaultVal;
    }

    if (window.Game) {
      window.Game.speedMultiplier = savedVal;
    }

    container.innerHTML = '';
    speedButtons = speeds.map(s => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.dataset.speed = String(s.valor);
      btn.textContent = s.nome;
      if (s.valor === savedVal) {
        btn.classList.add('active');
      }
      btn.addEventListener('click', () => {
        Catalog.setSpeed(s.valor);
      });
      container.appendChild(btn);
      return btn;
    });
  }

  if (!T || !overlay || !grid || !canvas || !btnOpen || !btnClose || !window.Collectibles3D) return;

  const Catalog = {
    renderer: null,
    cards: [],
    openState: null,
    raf: 0,
    active: false,

    init() {
      const entries = Collectibles3D.catalogEntries();
      grid.innerHTML = '';
      this.cards = entries.map((entry, index) => {
        const card = document.createElement('div');
        card.className = 'catalog-card';
        const preview = document.createElement('div');
        preview.className = 'catalog-preview';
        const label = document.createElement('div');
        label.className = 'catalog-name';
        label.textContent = entry.name;
        card.append(preview, label);
        grid.appendChild(card);

        const scene = new T.Scene();
        scene.add(new T.AmbientLight(0xffffff, 1.25));
        const key = new T.DirectionalLight(0xffffff, 1.45); key.position.set(3, 5, 8); scene.add(key);
        const rim = new T.DirectionalLight(0x88aaff, 0.6); rim.position.set(-4, -2, -5); scene.add(rim);
        const camera = new T.OrthographicCamera(-1.45, 1.45, 1.18, -1.18, -100, 100); camera.position.z = 10;
        const object = Collectibles3D.createVariant(entry.variantKey);
        const box = new T.Box3().setFromObject(object), size = new T.Vector3(), center = new T.Vector3();
        box.getSize(size); box.getCenter(center); object.position.sub(center);
        const max = Math.max(size.x, size.y, size.z, 0.1);
        const baseScale = 1.72 / max;
        object.scale.setScalar(baseScale);
        object.userData.catalogBaseScale = baseScale;
        object.userData.catalogBaseRotX = object.rotation.x;
        object.userData.catalogBaseRotY = object.rotation.y;
        object.userData.catalogBaseRotZ = object.rotation.z;
        object.userData.catalogBaseY = object.position.y;
        scene.add(object);
        return { entry, index, preview, scene, camera, object };
      });

      this.renderer = new T.WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
      this.renderer.setClearColor(0x000000, 0);
      this.renderer.autoClear = false;
      this.resize();
      window.addEventListener('resize', () => this.resize());
      btnOpen.addEventListener('click', () => this.requestOpen());

      buildSpeedControls();
      if (window.EducationDataPromise) {
        window.EducationDataPromise.then(() => {
          buildSpeedControls();
        }).catch(() => {});
      }

      btnClose.addEventListener('click', () => this.close());
      overlay.addEventListener('mousedown', (e) => { if (e.target === overlay) this.close(); });
      document.addEventListener('keydown', (e) => { if (this.active && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); this.close(); } }, true);
    },

    resize() {
      if (!this.renderer) return;
      this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    },

    requestOpen() {
      if (this.active || !window.Game || Game.state !== 'playing') return;
      const password = window.prompt('Digite a senha para acessar as configurações:');
      if (password === null) return;
      if (password !== '5555') { window.alert('Senha incorreta.'); return; }
      this.open();
    },

    setSpeed(multiplier) {
      const num = Number(multiplier);
      if (!window.Game || isNaN(num) || num <= 0) return;
      Game.speedMultiplier = num;
      if (window.Utils) {
        window.Utils.store.set('andrews_run_speed', num);
      }
      speedButtons.forEach(btn => btn.classList.toggle('active', Number(btn.dataset.speed) === num));
    },

    syncSpeedButtons() {
      const current = window.Game?.speedMultiplier ?? 1;
      speedButtons.forEach(btn => btn.classList.toggle('active', Number(btn.dataset.speed) === current));
    },

    open() {
      if (this.active || !window.Game || Game.state !== 'playing') return;
      this.openState = Game.state;
      Game.boosting = false;
      Game.state = 'catalog';
      this.active = true;
      this.syncSpeedButtons();
      overlay.classList.remove('hidden');
      this.resize();
      this.animate(performance.now());
    },

    close() {
      if (!this.active) return;
      this.active = false;
      cancelAnimationFrame(this.raf);
      overlay.classList.add('hidden');
      if (window.Game && this.openState === 'playing') { Game.state = 'playing'; Game.last = performance.now(); }
      this.openState = null;
      if (this.renderer) { this.renderer.setScissorTest(false); this.renderer.clear(); }
    },

    animate(ms) {
      if (!this.active) return;
      this.raf = requestAnimationFrame((t) => this.animate(t));
      const time = ms / 1000, w = window.innerWidth, h = window.innerHeight;
      this.renderer.setScissorTest(false);
      this.renderer.clear();
      this.renderer.setScissorTest(true);

      for (const card of this.cards) {
        const r = card.preview.getBoundingClientRect(), sr = scroll.getBoundingClientRect();
        const clipLeft = Math.max(0, r.left, sr.left), clipRight = Math.min(w, r.right, sr.right);
        const clipTop = Math.max(0, r.top, sr.top), clipBottom = Math.min(h, r.bottom, sr.bottom);
        if (clipRight - clipLeft < 2 || clipBottom - clipTop < 2) continue;
        const obj = card.object, special = obj.userData.special;
        const base = obj.userData.catalogBaseScale;

        obj.position.y = obj.userData.catalogBaseY;
        obj.scale.setScalar(base);
        if (special === 'bhImage') {
          const pulse = 1 + Math.sin(time * 2.4 + card.index * 0.37) * 0.055;
          obj.scale.setScalar(base * pulse);
          obj.position.y = obj.userData.catalogBaseY + Math.sin(time * 1.8 + card.index * 0.53) * 0.08;
          obj.rotation.set(obj.userData.catalogBaseRotX, 0, obj.userData.catalogBaseRotZ);
          if (obj.children[0]?.material) obj.children[0].material.opacity = 0.96 + Math.sin(time * 2.1) * 0.04;
          if (obj.children[1]?.material) obj.children[1].material.opacity = 0.34 + Math.sin(time * 2.0) * 0.08;
          if (obj.children[2]?.material) obj.children[2].material.opacity = 0.22 + Math.sin(time * 2.5 + 1) * 0.06;
        } else if (special === 'realMoon') {
          const pulse = 1 + Math.sin(time * 1.7 + card.index * 0.31) * 0.018;
          obj.scale.setScalar(base * pulse);
          obj.rotation.set(obj.userData.catalogBaseRotX, obj.userData.catalogBaseRotY + time * 0.18, obj.userData.catalogBaseRotZ);
          if (obj.userData.moonMesh?.material?.map) obj.userData.moonMesh.material.map.offset.x = (time * 0.02) % 1;
          if (obj.userData.moonGlow?.material) obj.userData.moonGlow.material.opacity = 0.04 + Math.sin(time * 1.6 + card.index) * 0.012;
          if (obj.userData.moonShadow?.material) obj.userData.moonShadow.material.opacity = 0.88;
        } else if (special === 'emojiEarth') {
          const frame = Math.floor((time * 2) % obj.userData.emojiFrames.length);
          if (frame !== obj.userData.emojiIndex) {
            obj.userData.emojiIndex = frame;
            const pack = obj.userData.emojiPack;
            pack.ctx.clearRect(0,0,256,256);
            pack.ctx.textAlign='center'; pack.ctx.textBaseline='middle';
            pack.ctx.font='188px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
            pack.ctx.fillText(obj.userData.emojiFrames[frame],128,138);
            pack.tex.needsUpdate = true;
          }
          obj.rotation.set(obj.userData.catalogBaseRotX, 0, obj.userData.catalogBaseRotZ);
        } else if (obj.userData.fx) {
          const fx = obj.userData.fx;
          const pulse = 1 + Math.sin(time * fx.pulseSpeed + card.index * 0.31) * fx.pulseAmp;
          obj.scale.setScalar(base * pulse);
          obj.position.y = obj.userData.catalogBaseY + Math.sin(time * fx.floatSpeed + card.index * 0.53) * fx.catalogFloatAmp;
          obj.rotation.set(obj.userData.catalogBaseRotX, 0, obj.userData.catalogBaseRotZ);
          if (obj.userData.fxGlow?.material && obj.userData.fxGlowBase) {
            const glowPulse = 1 + Math.sin(time * (fx.pulseSpeed + 0.2) + card.index) * fx.glowScaleAmp;
            obj.userData.fxGlow.scale.set(obj.userData.fxGlowBase.x * glowPulse, obj.userData.fxGlowBase.y * glowPulse, 1);
            obj.userData.fxGlow.material.opacity = fx.glowBase + Math.sin(time * (fx.pulseSpeed + 0.1) + card.index) * fx.glowVar;
          }
        } else {
          obj.rotation.y = obj.userData.catalogBaseRotY + time * (0.48 + (card.index % 5) * 0.055);
          if (special === 'sun2') obj.rotation.z = obj.userData.catalogBaseRotZ + time * 0.08;
          if (special === 'galaxy') obj.rotation.y = obj.userData.catalogBaseRotY + time * 0.3;
        }

        const left = r.left, bottom = h - r.bottom, rw = r.width, rh = r.height;
        this.renderer.setViewport(left, bottom, rw, rh);
        this.renderer.setScissor(clipLeft, h - clipBottom, clipRight - clipLeft, clipBottom - clipTop);
        this.renderer.clear(true, true, true);
        this.renderer.render(card.scene, card.camera);
      }
      this.renderer.setScissorTest(false);
    }
  };

  window.ElementCatalog = Catalog;
  Catalog.init();
})();
