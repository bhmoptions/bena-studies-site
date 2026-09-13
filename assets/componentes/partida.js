// Sessões oficiais: registra o depósito ao abrir e só o devolve ao concluir.
// Jogos sem login continuam sendo uma prévia e não gravam dados no banco.
window.BenaPartida = (() => {
  const ativas = new Set();

  const esperar = ms => new Promise(resolve => setTimeout(resolve, ms));

  // O servidor de desenvolvimento em localhost só serve arquivos estáticos;
  // ele não hospeda as APIs da Vercel. Portanto, jogar localmente é sempre
  // uma prévia sem histórico, depósito, reembolso ou penalidade.
  function emPreviewLocal() {
    return ['localhost', '127.0.0.1', '::1', '[::1]'].includes(window.location.hostname);
  }

  async function obterAuth() {
    const limite = Date.now() + 10000;
    while (!window.BENA_AUTH && Date.now() < limite) await esperar(25);
    if (!window.BENA_AUTH) throw new Error('Não foi possível preparar a sua conta. Tente recarregar a página.');
    if (!window.BENA_AUTH.isAuthReady()) {
      await new Promise(resolve => window.BENA_AUTH.onAuthReady(resolve));
    }
    return window.BENA_AUTH;
  }

  function novoId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    throw new Error('Seu navegador não consegue iniciar uma partida oficial.');
  }

  function haPartidaAtiva() {
    return [...ativas].some(partida => partida.ativa);
  }

  function encerrarAtivasSemReembolso() {
    for (const partida of ativas) partida.ativa = false;
    ativas.clear();
  }

  async function iniciar(jogoId) {
    if (emPreviewLocal()) {
      return { oficial: false, ativa: false, previewLocal: true, jogoId };
    }

    const auth = await obterAuth();
    if (!auth.currentUser()) return { oficial: false, ativa: false, jogoId };

    const partidaId = novoId();
    const resultado = await auth.iniciarPartida({ jogo_id: jogoId, partida_id: partidaId });
    if (!resultado?.ok) throw new Error(resultado?.error || 'Não foi possível iniciar a partida.');

    const partida = {
      oficial: true,
      ativa: true,
      jogoId,
      partidaId,
      deposito: resultado.deposito,
      rodada: resultado.rodada
    };
    ativas.add(partida);
    return partida;
  }

  async function concluir(partida, dados) {
    if (!partida?.oficial) return { ok: true, preview: true };
    if (!partida.ativa) return { ok: false, error: 'Partida já foi encerrada.' };

    const auth = await obterAuth();
    const resultado = await auth.salvarPartida({ ...dados, partida_id: partida.partidaId });
    if (resultado?.ok) {
      partida.ativa = false;
      ativas.delete(partida);
    }
    return resultado;
  }

  function confirmarSaida(continuar) {
    if (!haPartidaAtiva()) {
      continuar();
      return true;
    }
    const confirmar = window.confirm(
      'Você ainda não terminou esta partida. Se sair agora, não poderá recuperar os 100 pontos de participação. Deseja sair mesmo assim?'
    );
    if (!confirmar) return false;
    encerrarAtivasSemReembolso();
    continuar();
    return true;
  }

  function recarregar() {
    return confirmarSaida(() => window.location.reload());
  }

  // Links que realmente trocam de página recebem a confirmação automaticamente.
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
    const destino = new URL(link.href, window.location.href);
    if (destino.origin === location.origin && destino.pathname === location.pathname && destino.search === location.search) return;
    if (!haPartidaAtiva()) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    confirmarSaida(() => window.location.assign(destino.href));
  }, true);

  // Browsers do not allow custom text here, but their built-in confirmation is
  // still useful for refreshes and closing a tab. The persisted deposit is the
  // actual enforcement if the browser does not show this prompt.
  window.addEventListener('beforeunload', event => {
    if (!haPartidaAtiva()) return;
    event.preventDefault();
    event.returnValue = '';
  });

  return Object.freeze({ iniciar, concluir, confirmarSaida, recarregar });
})();
