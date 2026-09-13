import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { test } from 'node:test';
import {generatePuzzle,generateHints,OPERATION_META,dialSolutions,purpleSolutions,validateDial,validatePurple,validateConfiguredDial,balanceTilt,createState,act,isComplete,scoreInput,SIDES,signature,valuesForSide,PURPLE_BOTTLE_GROUPS} from '../conteudo/3-serie/matematica/tabuada/003/logica.mjs';
const entries=JSON.parse(readFileSync(new URL('../assets/files/3rd grade/math/003/Multiplication Box Puzzle.json',import.meta.url),'utf8'));
const contasEntries=JSON.parse(readFileSync(new URL('../assets/files/3rd grade/math/003/Contas.json',import.meta.url),'utf8'));
function seedRng(seed){return()=>((seed=(seed*16807)%2147483647)/2147483647);}
const config=generatePuzzle(entries,()=>0);
test('5.000 rodadas: o JSON seleciona três faixas distintas e cada balança recebe seus cinco frascos',()=>{
 const rng=seedRng(48321);let previous='';
 for(let i=0;i<5000;i++){
  const c=generatePuzzle(entries,rng,[previous]);assert.notEqual(signature(c),previous);previous=signature(c);
  assert.equal(new Set(Object.values(c.targets)).size,3);
  assert(c.targets.blue<=24);assert(c.targets.yellow>24&&c.targets.yellow<=40);assert(c.targets.red>40);
  for(const side of SIDES.slice(0,3)){
   const puzzle=c.dialPuzzles[side];assert.equal(valuesForSide(c,side).length,5);
   assert.deepEqual(valuesForSide(c,side),puzzle.ballsPerBottle);
   for(const [count,value] of puzzle.correct)assert(validateConfiguredDial(Array(count).fill(value),puzzle));
  }
  const purple=purpleSolutions(valuesForSide(c,'purple'));assert(purple.length);
  assert(PURPLE_BOTTLE_GROUPS.some(g => JSON.stringify(g) === JSON.stringify(valuesForSide(c, 'purple'))));
  for(const s of purple)assert(validatePurple(Array(s.leftCount).fill(s.leftValue),Array(s.rightCount).fill(s.rightValue)));
 }
});
test('balança roxa sorteia exclusivamente entre os 4 grupos definidos',()=>{
 assert.deepEqual(PURPLE_BOTTLE_GROUPS, [
  [3,4,5,7,12],
  [4,6,7,9,10],
  [2,3,5,7,8],
  [2,5,6,9,12]
 ]);
});
test('anti-repetição funciona até com RNG constante',()=>{
 const a=generatePuzzle(entries,()=>0),b=generatePuzzle(entries,()=>0,[signature(a)]);assert.notEqual(signature(a),signature(b));
});
test('balanças de ponteiro aceitam multiplicação e rejeitam mistura, vazio, excesso e valores inválidos',()=>{
 assert(validateDial([6,6,6,6],24));assert(validateDial(Array(10).fill(10),100));assert(validateDial([12,12],24));assert(validateDial([2],2));
 for(const values of [[4,10,10],[],[6,6,6],Array(11).fill(2),[0],[NaN],[1.5]])assert(!validateDial(values,24));
});
test('pares corretos do JSON são autoritativos: uma conta possível, mas não listada, falha',()=>{
 const restricted={target:24,ballsPerBottle:[3,4,6,8,12],correct:[[4,6]]};
 const restrictedConfig={dialPuzzles:{blue:restricted,yellow:{target:28,ballsPerBottle:[3,4,6,7,9],correct:[[7,4],[4,7]]},red:{target:42,ballsPerBottle:[4,5,6,7,9],correct:[[7,6],[6,7]]}},targets:{blue:24,yellow:28,red:42},valuesBySide:{blue:restricted.ballsPerBottle,yellow:[3,4,6,7,9],red:[4,5,6,7,9],purple:restricted.ballsPerBottle}};
 let state=createState(restrictedConfig);
 for(let i=0;i<3;i++)state=act(state,{type:'add',side:'blue',value:8}).state;
 state=act(state,{type:'submit',side:'blue'}).state;assert.equal(state.sides.blue.errors,1);assert(!state.sides.blue.solved);
 state=act(state,{type:'clear',side:'blue'}).state;
 for(let i=0;i<4;i++)state=act(state,{type:'add',side:'blue',value:6}).state;
 state=act(state,{type:'submit',side:'blue'}).state;assert(state.sides.blue.solved);
});
test('roxa aceita tipos diferentes e rejeita tipos iguais, totais diferentes, pratos vazios e mistura',()=>{
 assert(validatePurple([3,3],[2,2,2]));assert(validatePurple([4],[2,2]));
 assert(validatePurple(Array(10).fill(2),Array(4).fill(5)));
 for(const [l,r]of [[[3,3],[3,3]],[[3],[2]], [[],[]], [[2],[]],[[2,4],[3,3]]])assert(!validatePurple(l,r));
});
test('inclinação aponta para o prato mais pesado, tem limite e zera no equilíbrio',()=>{
 assert(balanceTilt(20,10)>0);assert(balanceTilt(10,20)<0);assert.equal(balanceTilt(20,20),0);
 assert(Math.abs(balanceTilt(100,0))<=.24);assert(Math.abs(balanceTilt(0,100))<=.24);
 const angle=balanceTilt(12,6);assert(-1.55*Math.sin(angle)<1.55*Math.sin(angle));
});
test('manipulação não conta tentativa; mistura e capacidade são bloqueadas',()=>{
 let state=createState(config);
 const [value,other]=valuesForSide(config,'blue');
 state=act(state,{type:'add',side:'blue',value}).state;
 assert.equal(state.events.length,0);assert.equal(state.sides.blue.errors,0);
 const result=act(state,{type:'add',side:'blue',value:other});assert.equal(result.outcome,'invalid');assert.equal(result.state,state);
 state=act(state,{type:'clear',side:'blue'}).state;
 for(let i=0;i<10;i++)state=act(state,{type:'add',side:'blue',value}).state;
 assert.equal(act(state,{type:'add',side:'blue',value}).outcome,'invalid');
 assert.equal(act(state,{type:'add',side:'blue',pan:'right',value}).outcome,'invalid');
});
test('dois cliques podem esvaziar a balança inteira sem contar erro',()=>{
 let state=createState(config),value=valuesForSide(config,'blue')[0];
 state=act(state,{type:'add',side:'blue',value}).state;
 state=act(state,{type:'add',side:'blue',value}).state;
 const cleared=act(state,{type:'clearScale',side:'blue'});
 assert.equal(cleared.outcome,'changed');
 assert.deepEqual(cleared.state.sides.blue.left,[]);
 assert.deepEqual(cleared.state.sides.blue.right,[]);
 assert.equal(cleared.state.events.length,0);
 assert.equal(cleared.state.sides.blue.errors,0);
});
test('esvaziar a balança roxa limpa os dois pratos',()=>{
 let state=createState(config),value=valuesForSide(config,'purple')[0],other=valuesForSide(config,'purple')[1];
 state=act(state,{type:'add',side:'purple',pan:'left',value}).state;
 state=act(state,{type:'add',side:'purple',pan:'right',value:other}).state;
 state=act(state,{type:'clearScale',side:'purple'}).state;
 assert.deepEqual(state.sides.purple.left,[]);assert.deepEqual(state.sides.purple.right,[]);
});
test('vazio e duplicatas não contam; erros diferentes contam; corrigir não restaura acerto de primeira',()=>{
 let state=createState(config);assert.equal(act(state,{type:'submit',side:'blue'}).state,state);
 const [count,value]=config.dialPuzzles.blue.correct[0],wrong=valuesForSide(config,'blue').find(v=>v!==value),otherWrong=valuesForSide(config,'blue').find(v=>v!==value&&v!==wrong);
 state=act(state,{type:'add',side:'blue',value:wrong}).state;
 state=act(state,{type:'submit',side:'blue'}).state;assert.equal(state.sides.blue.errors,1);
 assert.equal(act(state,{type:'submit',side:'blue'}).state,state);
 state=act(state,{type:'clear',side:'blue'}).state;state=act(state,{type:'add',side:'blue',value:otherWrong}).state;
 state=act(state,{type:'submit',side:'blue'}).state;assert.equal(state.sides.blue.errors,2);
 state=act(state,{type:'clear',side:'blue'}).state;
 for(let i=0;i<count;i++)state=act(state,{type:'add',side:'blue',value}).state;
 state=act(state,{type:'submit',side:'blue'}).state;
 assert(state.sides.blue.solved);assert.equal(scoreInput(state).acertosPrimeira,0);assert.equal(scoreInput(state).erros,2);
 assert.equal(act(state,{type:'submit',side:'blue'}).state,state);assert.equal(act(state,{type:'remove',side:'blue'}).state,state);
});
const scoreWindow={};vm.runInNewContext(readFileSync(new URL('../config/pontuacao.js',import.meta.url),'utf8'),{window:scoreWindow});
vm.runInNewContext(readFileSync(new URL('../assets/componentes/pontuacao.js',import.meta.url),'utf8'),{window:scoreWindow});
function finish(round=1) {
 let state=createState(config,round);
 for(const side of SIDES.slice(0,3)){const [count,value]=config.dialPuzzles[side].correct[0];
  for(let i=0;i<count;i++)state=act(state,{type:'add',side,value}).state;
  state=act(state,{type:'submit',side}).state;assert(!isComplete(state));
 }
 const purple=purpleSolutions(valuesForSide(config,'purple'))[0];
 for(const [pan,value,count]of [['left',purple.leftValue,purple.leftCount],['right',purple.rightValue,purple.rightCount]])for(let i=0;i<count;i++)state=act(state,{type:'add',side:'purple',pan,value}).state;
 return act(state,{type:'submit',side:'purple'}).state;
}
test('apenas 4 mecanismos resolvidos concluem a rodada, abrem recompensa e usam pontuação central',()=>{
 const state=finish();assert(state.complete);assert(isComplete(state));assert.equal(state.reward,'opening');assert.equal(state.events.length,4);
 const p=scoreWindow.BenaPontuacao;assert.equal(p.calcular(scoreInput(state)).pontos,1000);
 assert.equal(p.calcular(scoreInput(finish(2))).pontos,500);assert.equal(p.calcular(scoreInput(finish(6))).pontos,0);
 assert.equal(p.calcular(scoreInput(createState(config))).pontos,0);
 assert.equal(scoreInput(state).tempoAtivo,false);
});
test('tentativa errada roxa com mesmos tipos é registrada sem desbloquear',()=>{
 let state=createState(config);
 const value=valuesForSide(config,'purple')[0];
 for(const pan of ['left','right'])state=act(state,{type:'add',side:'purple',pan,value}).state;
 state=act(state,{type:'submit',side:'purple'}).state;assert.equal(state.sides.purple.errors,1);assert(!state.sides.purple.solved);
});
test('reinício zera mecanismos e tentativas, consome outra rodada da mesma chave',()=>{
 const a=scoreWindow.BenaPontuacao.iniciarRodada('3-serie/matematica/tabuada/003');
 const b=scoreWindow.BenaPontuacao.iniciarRodada('3-serie/matematica/tabuada/003');
 assert.equal(b,a+1);const next=createState(generatePuzzle(entries),b);assert.equal(next.events.length,0);assert(!isComplete(next));
});


import {MECHANISMS,TURN_TO_CHECK,angleDelta,hasTurned} from '../conteudo/3-serie/matematica/tabuada/003/mecanismos.mjs';
test('cada face tem o controle físico solicitado; clicar numa engrenagem não é girar',()=>{
 assert.equal(MECHANISMS.purple.kind,'button');assert.equal(MECHANISMS.yellow.kind,'button');
 assert.equal(MECHANISMS.blue.kind,'gear');assert.equal(MECHANISMS.red.kind,'gear');
 assert(!hasTurned(0));assert(!hasTurned(TURN_TO_CHECK-.01));assert(hasTurned(TURN_TO_CHECK));assert(hasTurned(-TURN_TO_CHECK));
 const center={x:0,y:0,radius:40};
 assert(Math.abs(angleDelta({x:40,y:0},{x:0,y:40},center)-Math.PI/2)<1e-8);
 assert(Math.abs(angleDelta({x:-40,y:.1},{x:-40,y:-.1},center))<.01);
 const forward=angleDelta({x:40,y:0},{x:0,y:40},center),backward=angleDelta({x:0,y:40},{x:40,y:0},center);
 assert(!hasTurned(forward+backward));
});
test('retirar o frasco exato e transferir entre pratos não altera tentativas nem soma total',()=>{
 let s=createState(config);
 const value=valuesForSide(config,'blue').find(v=>valuesForSide(config,'red').includes(v));
 for(let i=0;i<3;i++)s=act(s,{type:'add',side:'blue',value}).state;
 const r=act(s,{type:'remove',side:'blue',index:1}).state;assert.deepEqual(r.sides.blue.left,[value,value]);assert.equal(r.events.length,0);
 assert.equal(act(r,{type:'remove',side:'blue',index:8}).state,r);
 const moved=act(r,{type:'move',from:{side:'blue',pan:'left',index:0},side:'red',pan:'left'});
 assert.equal(moved.outcome,'changed');assert.deepEqual(moved.state.sides.blue.left,[value]);assert.deepEqual(moved.state.sides.red.left,[value]);
 assert.equal(moved.state.events.length,0);assert.equal(scoreInput(moved.state).erros,0);
 const unchanged=act(moved.state,{type:'move',from:{side:'red',pan:'left',index:0},side:'red',pan:'left'});
 assert.equal(unchanged.state,moved.state);
});
test('transferência inválida devolve o frasco à origem sem perda, mistura ou erro de pontuação',()=>{
 const value=valuesForSide(config,'blue').find(v=>valuesForSide(config,'red').includes(v)),other=valuesForSide(config,'red').find(v=>v!==value);
 let s=createState(config);s=act(s,{type:'add',side:'blue',value}).state;s=act(s,{type:'add',side:'red',value:other}).state;
 const move={type:'move',from:{side:'blue',pan:'left',index:0},side:'red',pan:'left'};
 assert.equal(act(s,move).state,s);
 s=act(s,{type:'clear',side:'red'}).state;for(let i=0;i<10;i++)s=act(s,{type:'add',side:'red',value}).state;
 assert.equal(act(s,move).state,s);
 assert.equal(act(s,{...move,from:{side:'blue',pan:'left',index:99}}).state,s);
 assert.equal(scoreInput(s).erros,0);
 const complete=finish();assert.equal(act(complete,{type:'remove',side:'blue',index:0}).state,complete);
 assert.equal(act(complete,move).state,complete);
});
test('dicas de operação: soma, subtração e divisão são distribuídas sem repetição entre azul, amarela e vermelha',()=>{
 const rng=seedRng(9281);
 for(let i=0;i<2000;i++){
  const c=generatePuzzle(entries,rng,[],contasEntries);
  assert(c.hints);
  const ops=Object.values(c.hints).map(h=>h.operation);
  assert.equal(ops.length,3);
  assert.deepEqual(new Set(ops),new Set(['soma','subtracao','divisao']));
  assert.equal(c.hints.purple,undefined);
  for(const side of ['blue','yellow','red']){
   const hint=c.hints[side], target=c.targets[side];
   assert(hint);
   const entry=contasEntries.find(e=>e.target===target);
   assert(entry);
   const pairs=entry[hint.operation];
   assert(pairs.some(([x,y])=>x===hint.x&&y===hint.y));
   if(hint.operation==='soma'){
    assert.equal(hint.title,'Essa é fácil...');
    assert.equal(hint.expression,`${hint.x} + ${hint.y} = ?`);
    assert.equal(hint.x+hint.y,target);
   }else if(hint.operation==='subtracao'){
    assert.equal(hint.title,'Vamos subtrair?');
    assert.equal(hint.expression,`${hint.x} - ${hint.y} = ?`);
    assert.equal(hint.x-hint.y,target);
   }else if(hint.operation==='divisao'){
    assert.equal(hint.title,'Você sabe dividir?');
    assert.equal(hint.expression,`${hint.x} ÷ ${hint.y} = ?`);
    assert.equal(hint.x/hint.y,target);
   }
  }
 }
 const withoutContas=generatePuzzle(entries,rng);
 assert.equal(withoutContas.hints,undefined);
});

