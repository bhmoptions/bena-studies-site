(() => {
  const container = document.querySelector('#game');
  if (!container) return;

  if (window.BENA_CONFIG && window.BENA_CONFIG.serieAtual !== 3) {
    container.innerHTML = '<p class="loading-message">Este jogo não pertence à série atual. Volte aos jogos para explorar sua série.</p>';
    return;
  }

  const dispose = window.BENA_JOGO?.iniciar(container, () => {
    location.href = '../../../../../index.html#jogos-tabuada';
  });

  window.addEventListener('pagehide', () => dispose?.(), { once: true });
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
})();
