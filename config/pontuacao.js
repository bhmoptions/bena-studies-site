// Regras centrais. Alterações exigem nova versão e atualização de docs/pontuacao.md.
window.BENA_REGRAS_PONTUACAO = Object.freeze({
  versao: '1.1.0',
  pontosBase: 1000,
  percentualDepositoAbandono: 0.10,
  pesoErro: 0.15,
  aumentoErroPorRepeticao: 0.5,
  fatorRepeticao: 0.5,
  maxRodadasPontuaveis: 5,
  bonusTempoMaximo: 0.10,
  precisaoMinimaBonusTempo: 0.80
});

// Chaves completas: série / matéria / tema / jogo. Tempo desativado por padrão.
window.BENA_CONFIG_PONTUACAO = {
  '3-serie/matematica/tabuada/003': { tempoAtivo: false },
  '3-serie/matematica/tabuada/001': {
    tempoAtivo: false,
    // Só terá efeito se tempoAtivo for true. Referência a calibrar com o responsável.
    tempoReferenciaSegundos: 120
  },
  '3-serie/matematica/tabuada/004': {
    tempoAtivo: false,
    // Só terá efeito se tempoAtivo for true. Referência a calibrar com o responsável.
    tempoReferenciaSegundos: 120
  },
  '3-serie/ciencias/andrews-run': {
    tempoAtivo: false
  }
};

