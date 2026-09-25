/* utils.js — small helpers (global: Utils) */
(function () {
  'use strict';
  const Utils = {
    clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
    lerp(a, b, t) { return a + (b - a) * t; },
    rand(a, b) { return a + Math.random() * (b - a); },
    randInt(a, b) { return Math.floor(a + Math.random() * (b - a + 1)); },
    choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; },
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
    store: {
      get(k, fallback) {
        try { const v = localStorage.getItem(k); return v == null ? fallback : JSON.parse(v); }
        catch (e) { return fallback; }
      },
      set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
    }
  };
  window.Utils = Utils;
})();
