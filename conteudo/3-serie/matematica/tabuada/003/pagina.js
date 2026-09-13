(() => {
  const container = document.querySelector('#game');
  if (window.BENA_CONFIG.serieAtual !== 3) {
    container.innerHTML = '<p class="loading-message">Este jogo não pertence à série atual. Volte aos jogos para explorar sua série.</p>';
    return;
  }
  let dispose;
  const sair = () => window.BenaPartida.confirmarSaida(() => {
    location.href = '../../../../../index.html#jogos-tabuada';
  });
  async function iniciarJogo() {
    try {
      container.setAttribute('aria-busy', 'true');
      const partida = await window.BenaPartida.iniciar('3-serie/matematica/tabuada/003');
      dispose = window.BENA_JOGO.iniciar(container, sair, partida);
    } catch (erro) {
      console.warn('[Partida] Não foi possível iniciar:', erro);
      container.innerHTML = `<p class="loading-message">${erro.message}</p>`;
    } finally {
      container.removeAttribute('aria-busy');
    }
  }
  void iniciarJogo();
  window.addEventListener('pagehide', () => dispose?.(), { once: true });
  window.addEventListener('pageshow', event => { if (event.persisted) location.reload(); });
})();

