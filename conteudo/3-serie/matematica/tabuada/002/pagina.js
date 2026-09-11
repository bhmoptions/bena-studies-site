const sair = () => { location.href = '../../../../../index.html#jogos-tabuada'; };
const gameContainer = document.querySelector('#game');
if (window.BENA_CONFIG.serieAtual === 3) {
  // Mede o cabeçalho real (incluindo quebra de linha/zoom), sem supor sua altura.
  const header = document.querySelector('.game-page-header');
  function ajustarAltura() {
    const style = getComputedStyle(gameContainer);
    const viewport = window.visualViewport?.height || window.innerHeight;
    const available = Math.max(1, viewport - header.getBoundingClientRect().height
      - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom));
    gameContainer.style.setProperty('--room-available-height', `${available}px`);
  }
  const observer = new ResizeObserver(ajustarAltura);
  observer.observe(header);
  window.addEventListener('resize', ajustarAltura);
  window.visualViewport?.addEventListener('resize', ajustarAltura);
  const dispose = window.BENA_JOGO.iniciar(gameContainer, sair);
  ajustarAltura();
  window.addEventListener('pagehide', () => { dispose?.(); observer.disconnect(); window.removeEventListener('resize', ajustarAltura); window.visualViewport?.removeEventListener('resize', ajustarAltura); }, {once:true});
  window.addEventListener('pageshow', event => { if(event.persisted) location.reload(); });
} else {
  gameContainer.innerHTML = '<h1>Este jogo não pertence à série atual.</h1><p>Volte ao início para explorar os jogos disponíveis.</p>';
}
