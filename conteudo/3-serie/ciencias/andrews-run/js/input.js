/* input.js — keyboard, swipe, on-screen buttons (global: Input) */
(function () {
  'use strict';
  const Input = {
    handlers: [],
    onAction(fn) { this.handlers.push(fn); },
    emit(action) { this.handlers.forEach((fn) => { try { fn(action); } catch (e) {} }); },
    init() {
      window.addEventListener('keydown', (e) => {
        if (e.repeat) return;
        const k = e.key;
        if (k === 'ArrowLeft' || k === 'a' || k === 'A') { e.preventDefault(); this.emit('left'); }
        else if (k === 'ArrowRight' || k === 'd' || k === 'D') { e.preventDefault(); this.emit('right'); }
        else if (k === 'ArrowUp' || k === 'w' || k === 'W') { e.preventDefault(); this.emit('jump'); }
        else if (k === 'ArrowDown' || k === 's' || k === 'S') { e.preventDefault(); this.emit('slide'); }
        else if (k === ' ') { e.preventDefault(); this.emit('boost-on'); }
        else if (k === 'Enter') { e.preventDefault(); this.emit('enter'); }
        else if (k === 'p' || k === 'P' || k === 'Escape') { this.emit('pause'); }
      });
      window.addEventListener('keyup', (e) => { if (e.key === ' ') { e.preventDefault(); this.emit('boost-off'); } });
      window.addEventListener('blur', () => this.emit('boost-off'));

      // Swipe on the game container
      const zone = document.getElementById('game-wrap');
      let sx = 0, sy = 0, tracking = false;
      const TH = 24;
      zone.addEventListener('touchstart', (e) => {
        document.body.classList.add('touch');
        const t = e.changedTouches[0];
        sx = t.clientX; sy = t.clientY; tracking = true;
      }, { passive: true });
      zone.addEventListener('touchend', (e) => {
        if (!tracking) return;
        tracking = false;
        const t = e.changedTouches[0];
        const dx = t.clientX - sx, dy = t.clientY - sy;
        if (Math.abs(dx) < TH && Math.abs(dy) < TH) { this.emit('tap'); return; }
        if (Math.abs(dx) > Math.abs(dy)) this.emit(dx > 0 ? 'right' : 'left');
        else this.emit(dy > 0 ? 'slide' : 'jump');
      }, { passive: true });

      // Mouse drag as swipe (desktop testing)
      let mDown = false, mx = 0, my = 0;
      zone.addEventListener('mousedown', (e) => { mDown = true; mx = e.clientX; my = e.clientY; });
      window.addEventListener('mouseup', (e) => {
        if (!mDown) return;
        mDown = false;
        const dx = e.clientX - mx, dy = e.clientY - my;
        if (Math.abs(dx) < TH && Math.abs(dy) < TH) return;
        if (Math.abs(dx) > Math.abs(dy)) this.emit(dx > 0 ? 'right' : 'left');
        else this.emit(dy > 0 ? 'slide' : 'jump');
      });

      // On-screen buttons
      document.querySelectorAll('#touch-controls button').forEach((b) => {
        b.addEventListener('touchstart', (e) => { e.preventDefault(); this.emit(b.dataset.action); }, { passive: false });
        b.addEventListener('mousedown', (e) => { e.preventDefault(); this.emit(b.dataset.action); });
      });
    }
  };
  window.Input = Input;
})();
