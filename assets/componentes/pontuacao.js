// Cálculo puro compartilhado. Não é um ranking oficial nem valida respostas no servidor.
window.BenaPontuacao = (() => {
  const regras = window.BENA_REGRAS_PONTUACAO;
  const rodadasNestaAba = new Map();
  function inteiro(nome, valor, minimo) {
    if (!Number.isSafeInteger(valor) || valor < minimo) throw new Error(`${nome} inválido`);
  }
  function calcular({ total, acertosPrimeira, erros, rodada, concluida, tempoAtivo = false, segundos = null, referenciaSegundos = null }) {
    inteiro('total', total, 1);
    inteiro('acertosPrimeira', acertosPrimeira, 0);
    inteiro('erros', erros, 0);
    inteiro('rodada', rodada, 1);
    if (acertosPrimeira > total || erros < total - acertosPrimeira && concluida || acertosPrimeira === total && erros > 0) throw new Error('Contagens inconsistentes');
    if (typeof concluida !== 'boolean' || typeof tempoAtivo !== 'boolean') throw new Error('Indicadores inválidos');
    if (tempoAtivo && (!Number.isFinite(segundos) || segundos < 0 || !Number.isFinite(referenciaSegundos) || referenciaSegundos <= 0)) throw new Error('Tempo inválido');
    const precisao = acertosPrimeira / total;
    const repeticao = rodada <= regras.maxRodadasPontuaveis ? regras.fatorRepeticao ** (rodada - 1) : 0;
    const pesoErro = regras.pesoErro * (1 + regras.aumentoErroPorRepeticao * (rodada - 1));
    const descontoErros = pesoErro * erros / total;
    const qualidade = Math.max(0, precisao ** 2 - descontoErros);
    // Atingir metade do tempo de referência já dá o bônus máximo; correr mais não ajuda.
    const velocidade = tempoAtivo ? Math.max(0, 1 - segundos / referenciaSegundos) * 2 : 0;
    const bonusTempo = tempoAtivo && precisao >= regras.precisaoMinimaBonusTempo
      ? regras.bonusTempoMaximo * Math.min(1, velocidade) : 0;
    const pontos = concluida ? Math.round(regras.pontosBase * qualidade * repeticao * (1 + bonusTempo)) : 0;
    return Object.freeze({ versao: regras.versao, pontos, total, acertosPrimeira, erros, rodada,
      precisao, percentualAcertos: Math.round(precisao * 1000) / 10,
      fatorRepeticao: repeticao, pesoErro, descontoErros, qualidade, bonusTempo,
      tempoAtivo, segundos: tempoAtivo ? segundos : null, concluida,
      somenteTreino: rodada > regras.maxRodadasPontuaveis });
  }
  // Protótipo: memória desta aba, compartilhada entre reaberturas dos jogos.
  // O futuro servidor deve substituir este contador por um registro por aluno/temporada.
  function iniciarRodada(chave) {
    if (typeof chave !== 'string' || !chave.trim()) throw new Error('Chave do jogo inválida');
    const rodada = (rodadasNestaAba.get(chave) || 0) + 1;
    rodadasNestaAba.set(chave, rodada);
    return rodada;
  }
  return Object.freeze({ calcular, iniciarRodada });
})();
