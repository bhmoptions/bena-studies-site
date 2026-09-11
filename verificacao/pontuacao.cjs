const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const context = vm.createContext({window:{}});
for (const file of ['config/pontuacao.js','assets/componentes/pontuacao.js']) vm.runInContext(fs.readFileSync(file,'utf8'),context);
const api = context.window.BenaPontuacao;
const calc = overrides => api.calcular({total:10,acertosPrimeira:10,erros:0,rodada:1,concluida:true,...overrides});
assert.equal(calc({}).pontos,1000);
assert.equal(calc({acertosPrimeira:9,erros:1}).pontos,795);
assert.equal(calc({acertosPrimeira:8,erros:2}).pontos,610);
assert.equal(calc({acertosPrimeira:9,erros:1,rodada:2}).pontos,394);
assert.equal(calc({acertosPrimeira:9,erros:1,rodada:3}).pontos,195);
assert.equal(calc({acertosPrimeira:0,erros:10}).pontos,0);
assert.equal(calc({rodada:6}).pontos,0);
assert.equal(calc({concluida:false}).pontos,0);
assert.equal(calc({acertosPrimeira:2,erros:0,concluida:false}).pontos,0);
assert.equal([1,2,3,4,5].reduce((sum,rodada)=>sum+calc({rodada}).pontos,0),1938);
assert(calc({acertosPrimeira:9,erros:2}).pontos < calc({acertosPrimeira:9,erros:1}).pontos);
for(const [segundos,pontos] of [[0,1100],[60,1100],[90,1050],[120,1000],[900,1000]]) assert.equal(calc({tempoAtivo:true,segundos,referenciaSegundos:120}).pontos,pontos);
assert.equal(calc({acertosPrimeira:7,erros:3,tempoAtivo:true,segundos:1,referenciaSegundos:120}).bonusTempo,0);
assert.equal(calc({segundos:1,referenciaSegundos:120}).pontos,1000);
assert.equal(calc({segundos:1}).segundos,null);
assert.throws(()=>calc({acertosPrimeira:11}));
assert.throws(()=>calc({acertosPrimeira:9,erros:0}));
assert.throws(()=>calc({erros:1}));
assert.throws(()=>calc({erros:-1}));
assert.throws(()=>calc({rodada:0}));
assert.throws(()=>calc({rodada:NaN}));
assert.throws(()=>calc({tempoAtivo:true,segundos:-1,referenciaSegundos:120}));
assert.throws(()=>calc({tempoAtivo:true,segundos:100,referenciaSegundos:0}));
assert.equal(api.iniciarRodada('a'),1);assert.equal(api.iniciarRodada('a'),2);assert.equal(api.iniciarRodada('b'),1);
// Mais erros ou repetições nunca aumentam os pontos; o bônus não ultrapassa 10%.
for(let a=0;a<=10;a++)for(let r=1;r<=6;r++){
 const e=10-a;const score=calc({acertosPrimeira:a,erros:e,rodada:r});
 assert(score.pontos>=0 && score.pontos<=1000);
 if(a<10)assert(calc({acertosPrimeira:a,erros:e+1,rodada:r}).pontos<=score.pontos);
 if(r<6)assert(calc({acertosPrimeira:a,erros:e,rodada:r+1}).pontos<=score.pontos);
}
console.log('OK: exemplos, limites, tempo, repetição, abandono, validação e monotonicidade.');
