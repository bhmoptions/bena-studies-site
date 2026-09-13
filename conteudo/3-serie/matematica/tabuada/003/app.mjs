// Keep the data-driven modules on the same cache version. A stale scene paired
// with the new puzzle logic would otherwise fail while importing.
import { SIDES, generatePuzzle, signature, createState, act, scoreInput } from './logica.mjs?v=puzzles-json-6';
import { createScene } from './cena.mjs?v=puzzles-json-6';
import { LABELS, COLORS } from './modelos.mjs';
import { createAudio } from './audio.mjs';
import { connectInteraction } from './interacao.mjs';
const KEY='3-serie/matematica/tabuada/003';
const PUZZLE_SOURCE=new URL('../../../../../assets/files/3rd grade/math/003/Multiplication Box Puzzle.json',import.meta.url);
const CONTAS_SOURCE=new URL('../../../../../assets/files/3rd grade/math/003/Contas.json',import.meta.url);
async function loadData() {
  const [puzzleResponse, contasResponse] = await Promise.all([
    fetch(PUZZLE_SOURCE, { cache: 'no-store' }),
    fetch(CONTAS_SOURCE, { cache: 'no-store' })
  ]);
  if (!puzzleResponse.ok || !contasResponse.ok) throw new Error('Não foi possível carregar as configurações da caixa.');
  return Promise.all([puzzleResponse.json(), contasResponse.json()]);
}
export function start(container, voltar, partidaInicial) {
  const abort=new AbortController(), audio=createAudio(), motion=matchMedia('(prefers-reduced-motion: reduce)');
  let state,active='blue',scene=null,interaction=null,disposed=false,toastTimer=null,history=[],puzzleEntries=null,contasEntries=null,partidaAtual=partidaInicial;
  try { const saved=JSON.parse(sessionStorage.getItem('bena-caixa-puzzles')||'[]'); if(Array.isArray(saved))history=saved.filter(v=>typeof v==='string').slice(-8); } catch {}
  container.innerHTML=`
    <section class="workshop">
      <div class="workshop-layout">
        <section class="scene-panel" aria-label="Mesa da oficina">
          <div class="scene-top"><span class="scene-caption">Explore a caixa</span><span class="progress-label" aria-live="polite">0 de 4 mecanismos abertos</span></div>
          <div class="scene-host"></div>
          <div class="scene-bottom"><span>Arraste o fundo para girar · Shift + arraste ou botão direito + arraste para deslocar · role para aproximar</span>
          <div class="camera-buttons"><div class="camera-pan-buttons" aria-label="Deslocar visão"><button type="button" data-action="pan-up" aria-label="Deslocar visão para cima">↑</button><button type="button" data-action="pan-left" aria-label="Deslocar visão para a esquerda">←</button><button type="button" data-action="pan-down" aria-label="Deslocar visão para baixo">↓</button><button type="button" data-action="pan-right" aria-label="Deslocar visão para a direita">→</button></div><button type="button" data-action="orbit-left" aria-label="Girar câmera para a esquerda">↶</button><button type="button" data-action="orbit-right" aria-label="Girar câmera para a direita">↷</button><button type="button" data-action="zoom-in" aria-label="Aproximar câmera">+</button><button type="button" data-action="zoom-out" aria-label="Afastar câmera">−</button><button type="button" data-action="focus" aria-label="Voltar à vista da balança selecionada">Centralizar</button></div></div>
          <p class="toast" role="status" aria-live="polite"></p>
        </section>
        <aside class="puzzle-panel" aria-label="Mecanismos da caixa">
          <section class="game-instructions" aria-labelledby="game-instructions-title">
            <p class="panel-kicker">GUIA DA MISSÃO</p>
            <h2 id="game-instructions-title">Instruções</h2>
            <p>Para vencer o jogo, você precisa <strong>ativar os 4 lados da Caixa Misteriosa!</strong></p>
            <div class="instruction-block">
              <h3>Sua missão</h3>
              <ol>
                <li>Descubra qual desafio está escondido em cada lado da caixa.</li>
                <li>Encontre a solução para cada desafio.</li>
                <li>Depois de resolvê-lo, descubra <strong>como ativar aquele lado da caixa</strong>.</li>
                <li>Ative os 4 lados para completar a missão!</li>
              </ol>
            </div>
            <div class="instruction-block">
              <h3>Como explorar o cenário</h3>
              <ul>
                <li><strong>Arraste o fundo</strong> para girar o cenário.</li>
                <li><strong>Segure Shift e arraste, ou arraste com o botão direito</strong> para mover o cenário.</li>
                <li><strong>Role a rodinha do mouse</strong> para aproximar ou afastar a visão.</li>
              </ul>
            </div>
            <p class="instruction-good-luck">Boa sorte e divirta-se!</p>
          </section>
          <section class="reward-summary" hidden tabindex="-1" aria-label="Seu pergaminho"></section>
        </aside>
      </div>
    </section>`;
  const q=selector=>container.querySelector(selector), qa=selector=>[...container.querySelectorAll(selector)];
  function toast(message, invalid=false) {
    q('.toast').textContent=message;q('.toast').classList.toggle('invalid',invalid);q('.toast').classList.add('visible');
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>q('.toast')?.classList.remove('visible'),3200);
  }
  function render() {
    container.style.setProperty('--active-color',COLORS[active]);
    const count=SIDES.filter(side=>state.sides[side].solved).length;
    q('.progress-label').textContent=count+' de 4 mecanismos abertos';
    scene.sync(state);
  }
  function selectSide(side,moveCamera=true) {
    if(!SIDES.includes(side)||state.complete)return;
    active=side;scene.setActive(side);if(moveCamera)scene.focus(side);render();
  }
  function apply(action) {
    if(disposed)return;
    if(action.side!==active&&!state.complete)selectSide(action.side,false);
    const result=act(state,action);
    if(result.outcome==='invalid'||result.outcome==='locked'||result.outcome==='ignored'){
      toast(result.reason,true);audio.play('invalid');return;
    }
    if(result.state===state)return;
    state=result.state;
    if(['success','error'].includes(result.outcome)){
      render();audio.play(result.outcome);
      if(result.outcome==='success') toast('✓ Mecanismo '+LABELS[action.side]+' aberto!');
      if(state.complete) {
        const score=window.BenaPontuacao.calcular(scoreInput(state));scene.reveal(score);audio.play('open');
        q('.scene-caption').textContent='Os quatro segredos se encontraram';
      }
    }else{render();audio.play(action.type==='add'?'place':'move');}
  }
  function drop(value,destination){apply({type:'add',...destination,value});}
  async function newRound(novaPartida=false) {
    if(novaPartida){
      try { partidaAtual=await window.BenaPartida.iniciar(KEY); }
      catch(error){ console.warn('[Ranking] Não foi possível abrir nova partida:',error);window.alert(error.message);return; }
    }
    interaction?.dispose();scene?.dispose();
    active='blue';const config=generatePuzzle(puzzleEntries,Math.random,history,contasEntries);
    history.push(signature(config));history=history.slice(-8);
    try{sessionStorage.setItem('bena-caixa-puzzles',JSON.stringify(history));}catch{}
    // Consume the round only after a usable scene has been created.
    scene=createScene(q('.scene-host'),config,{
      selectSide,pan(){toast('Arraste um frasco até o prato para formar o grupo.');},
      dragSupply(value,event,side){interaction?.begin(value,event,null,side);},
      dragPlaced(f,event){interaction?.begin(f.value,event,{side:f.side,pan:f.pan,index:f.index},f.side);},
      activate(side){apply({type:'submit',side});},
      sound:audio.play,hint:message=>toast(message),
      unlocked(){audio.play('unlock');},
      rewardReady(){
        if(disposed)return;
        state.reward='revealed';audio.play('scroll');const score=window.BenaPontuacao.calcular(scoreInput(state));
        const inp = scoreInput(state);
        window.BenaPartida.concluir(partidaAtual, {
            jogo_id: KEY,
            total_questoes: inp.total,
            acertos_primeira: inp.acertosPrimeira,
            erros_validos: inp.erros
          }).then(r => console.log('[Ranking] Partida concluída:', r))
            .catch(e => console.warn('[Ranking] Erro ao salvar partida:', e));
        q('.game-instructions').hidden=true;
        q('.reward-summary').hidden=false;
        q('.reward-summary').innerHTML=`<p class="panel-kicker">SEU PERGAMINHO</p><h2>Caixa desvendada!</h2><p class="reward-points"><strong>${score.pontos}</strong> pontos</p>
        <dl><div><dt>De primeira</dt><dd>${score.acertosPrimeira} de 4</dd></div><div><dt>Respostas erradas</dt><dd>${score.erros}</dd></div><div><dt>Precisão</dt><dd>${score.percentualAcertos}%</dd></div><div><dt>Rodada</dt><dd>${score.rodada}</dd></div></dl>
        <p>${score.somenteTreino?'Treino livre: a partir da 6ª rodada, os desafios continuam sem pontos.':'Os quatro mecanismos guardam as suas descobertas.'}</p>
        <button type="button" data-action="restart" class="check-mechanism">Descobrir uma nova caixa →</button>
        <p class="score-disclaimer">A pontuação oficial é salva para alunos conectados. Recarregar ou sair antes do fim não devolve os pontos de participação.</p>`;
        q('.reward-summary').focus({preventScroll:true});
      },
      contextLost(){
        interaction?.dispose();
        q('.scene-host').insertAdjacentHTML('beforeend','<div class="context-error" role="alert"><h2>A imagem 3D foi interrompida</h2><p>Reabra a oficina para continuar.</p><button type="button" data-action="reload">Reabrir oficina</button></div>');
      }
    },motion.matches);
    const rodada = partidaAtual?.oficial && Number.isSafeInteger(partidaAtual.rodada)
      ? partidaAtual.rodada : window.BenaPontuacao.iniciarRodada(KEY);
    state=createState(config,rodada);
    q('.game-instructions').hidden=false;
    q('.reward-summary').hidden=true;
    q('.scene-caption').textContent='Explore a caixa';
    interaction=connectInteraction(container,()=>scene,{
      select(value,sourceSide){if(sourceSide&&sourceSide!==active)selectSide(sourceSide,false);},
      sound:audio.play,drop,
      remove(origin){apply({type:'remove',...origin});},
      move(origin,destination){apply({type:'move',...destination,from:origin});},
      invalid(message){toast(message,true);audio.play('invalid');}
    });
    render();
  }
  container.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button||button.disabled)return;
    switch(button.dataset.action){
      case 'restart':void newRound(true);break;
      case 'orbit-left':scene.orbit(-1);break;
      case 'orbit-right':scene.orbit(1);break;
      case 'pan-up':scene.pan('up');break;
      case 'pan-left':scene.pan('left');break;
      case 'pan-down':scene.pan('down');break;
      case 'pan-right':scene.pan('right');break;
      case 'zoom-in':scene.zoom(.9);break;
      case 'zoom-out':scene.zoom(1.1);break;
      case 'focus':scene.focus(active);break;
      case 'reload':window.BenaPartida.recarregar();break;
    }
  },{signal:abort.signal});
  motion.addEventListener('change',()=>scene?.setReducedMotion(motion.matches),{signal:abort.signal});
  function showLoadError(error, message) {
    console.error(error);
    if(!disposed)container.innerHTML='<div class="load-error" role="alert"><h1>A oficina não conseguiu abrir</h1><p>'+message+'</p><button type="button">Tentar novamente</button></div>';
    container.querySelector('.load-error button')?.addEventListener('click',()=>window.BenaPartida.recarregar(),{once:true});
  }
  loadData().then(([entries, contas])=>{
    if(disposed)return;
    puzzleEntries=entries;
    contasEntries=contas;
    try {
      void newRound();
      // Snapshot only; browser tests still perform all gameplay through the real controls.
      container.benaInspect=()=>({state:structuredClone(state),scene:scene.inspect()});
    } catch (error) {
      showLoadError(error,'Não foi possível iniciar a oficina 3D. Tente recarregar a página.');
    }
  }).catch(error=>{
    showLoadError(error,'Não foi possível carregar os desafios. Tente recarregar a página.');
  });
  return ()=>{if(disposed)return;disposed=true;clearTimeout(toastTimer);abort.abort();interaction?.dispose();scene?.dispose();audio.dispose();delete container.benaInspect;};
}




