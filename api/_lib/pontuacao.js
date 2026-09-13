// These values mirror config/pontuacao.js. The API owns the persisted
// abandonment deposit, so clients cannot choose their own deposit amount.
const PONTOS_BASE = 1000;
const PERCENTUAL_DEPOSITO_ABANDONO = 0.10;
const PONTOS_DEPOSITO_ABANDONO = Math.round(
  PONTOS_BASE * PERCENTUAL_DEPOSITO_ABANDONO
);

function calcularPontuacao({ total, acertosPrimeira, erros, rodada }) {
  const repeticao = rodada <= 5 ? 0.5 ** (rodada - 1) : 0;
  const pesoErro = 0.15 * (1 + 0.5 * (rodada - 1));
  const qualidade = Math.max(
    0,
    (acertosPrimeira / total) ** 2 - pesoErro * erros / total
  );
  return Math.round(PONTOS_BASE * qualidade * repeticao);
}

module.exports = {
  PONTOS_DEPOSITO_ABANDONO,
  calcularPontuacao
};
