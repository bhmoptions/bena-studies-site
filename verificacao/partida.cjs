const assert = require('node:assert/strict');
const {
  PONTOS_DEPOSITO_ABANDONO,
  calcularPontuacao
} = require('../api/_lib/pontuacao');

assert.equal(PONTOS_DEPOSITO_ABANDONO, 100);
assert.equal(calcularPontuacao({ total: 10, acertosPrimeira: 10, erros: 0, rodada: 1 }), 1000);
assert.equal(calcularPontuacao({ total: 10, acertosPrimeira: 9, erros: 1, rodada: 1 }), 795);
assert.equal(calcularPontuacao({ total: 10, acertosPrimeira: 9, erros: 1, rodada: 2 }), 394);
assert.equal(calcularPontuacao({ total: 10, acertosPrimeira: 0, erros: 10, rodada: 1 }), 0);
assert.equal(calcularPontuacao({ total: 10, acertosPrimeira: 10, erros: 0, rodada: 6 }), 0);

console.log('OK: depósito global e cálculo persistido da partida.');
