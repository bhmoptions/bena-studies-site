// Protótipo de estilo: ainda não constitui padrão para outros jogos.
(() => {
  const css = new URL('estilo.css', document.currentScript.src).href;
  if (!document.querySelector(`link[href="${css}"]`)) {
    const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = css; document.head.append(link);
  }
  window.BENA_JOGO = {
    iniciar(container, voltar) {
      const dialog = container.closest('dialog') || container;
      dialog.classList.add('room-dialog');
      const controller = new AbortController();
      const signal = controller.signal;
      let frame, stopped = false, phase = 0, errors = 0, first = 0, tried = false, solved = false, opened = false, exiting = false;
      let x = 75, y = 373, vy = 0, grounded = true, target = null, last = 0;
      const held = new Set();
      // Uma única geometria alimenta desenho e colisões, no espaço de 800 × 425.
      const platforms = [
        {left:0,right:145,top:315}, {left:180,right:270,top:265},
        {left:315,right:485,top:215}, {left:555,right:650,top:275},
        {left:65,right:190,top:145},
        {left:590,right:710,top:140}, {left:345,right:435,top:90}
      ];
      const hazards = [
        {x:225,y:382,w:60,h:23},                // 1. Chão (esquerda)
        {x:525,y:382,w:66,h:23},                // 2. Chão (direita)
        {x:350,y:227,w:100,h:22,hanging:true},  // 3. Suspenso sob o computador (o verde)
        {x:646,y:116,w:58,h:24},                // 4. Em cima da plataforma direita
        {x:120,y:0,w:90,h:22,hanging:true},      // 5. Suspenso no teto (superior esquerdo)
        {x:65,y:157,w:80,h:22,hanging:true},    // 6. Suspenso sob a plataforma esquerda
        {x:370,y:102,w:40,h:22,hanging:true},   // 7. Suspenso sob a plataforma do topo
        {x:615,y:152,w:90,h:22,hanging:true}    // 8. Suspenso sob a plataforma direita
      ];
      let respawnDelay = 0;
      function roomGeometry() {
        const ledges = platforms.map(p => `<div class="room-platform lab-ledge" style="left:${p.left/8}%;top:${p.top/4.25}%;width:${(p.right-p.left)/8}%;height:${12/4.25}%"></div>`).join('');
        const arcs = hazards.map(h => `<div class="electric-arc${h.hanging ? ' electric-arc--hanging' : ''}" role="img" aria-label="Arco elétrico perigoso" style="left:${h.x/8}%;top:${h.y/4.25}%;width:${h.w/8}%;height:${h.h/4.25}%"><span class="arc-emitter arc-left"></span><svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><path class="arc-glow" d="M5 16 L20 7 L32 24 L46 8 L60 21 L76 6 L95 16"/><path class="arc-core" d="M5 16 L20 7 L32 24 L46 8 L60 21 L76 6 L95 16"/></svg><span class="arc-emitter arc-right"></span></div>`).join('');
        return ledges + arcs;
      }
      const key = '3-serie/matematica/tabuada/002';
      let round;
      const levels = [
        { title: 'A porta gosta de números', clue: 'O painel pede 3 × 4. Encontre o resultado para ligar a porta.', type: 'choice', choices: ['7', '12', '16'], right: 1, hint: '3 grupos de 4: 4 + 4 + 4.', explanation: '3 × 4 = 12. A porta recebeu energia!' },
        { title: 'Desta vez, falta uma peça', clue: 'Agora o resultado já está escrito: 4 × ? = 20. Ajuste a engrenagem.', type: 'dial', right: 5, hint: 'Conte de 4 em 4: 4, 8, 12, 16, 20. Quantos grupos?', explanation: '4 × 5 = 20. A engrenagem encaixou!' },
        { title: 'Não é para somar os números', clue: 'A máquina precisa de 3 grupos com 2 cristais cada. Carregue os cristais e confirme.', type: 'groups', right: 6, hint: 'São 2 + 2 + 2 cristais. O botão + coloca um cristal.', explanation: '3 × 2 = 6 cristais. Energia completa!' },
        { title: 'Duas chaves, uma saída', clue: 'A fechadura marca 24. Escolha duas chaves que, multiplicadas, abrem a porta.', type: 'pair', choices: [2, 3, 4, 6], hint: 'Experimente pensar na tabuada do 4: qual número multiplicado por 4 dá 24?', explanation: '4 × 6 = 24. As duas chaves funcionaram!' },
        { title: 'A regra virou do avesso', clue: 'O painel está ao contrário! Desta vez, aperte a conta ERRADA para desligar o bloqueio.', type: 'choice', choices: ['2 × 6 = 12', '3 × 5 = 18', '4 × 4 = 16'], right: 1, hint: 'Confira cada conta. 3 grupos de 5 são 5 + 5 + 5.', explanation: 'Você encontrou a intrusa! 3 × 5 = 15, não 18.' }
      ];
      function cleanup() { stopped = true; cancelAnimationFrame(frame); controller.abort(); held.clear(); dialog.classList.remove('room-dialog'); }
      function start() { round = window.BenaPontuacao.iniciarRodada(key); phase = 0; errors = 0; first = 0; showRoom(); }
      function feedback(state, detail) {
        window.BenaFeedback.mostrar(container.querySelector('.room-puzzle .feedback'), state, detail, 'Ajuste o painel e tente novamente.');
      }
      function showRoom() {
        respawnDelay = 0; x = 75; y = 373; vy = 0; grounded = true; target = null; held.clear(); tried = false; solved = false; opened = false; exiting = false;
        const level = levels[phase];
        container.innerHTML = `<div class="room-layout"><div><div class="room-world" role="group" aria-label="Sala explorável. Use as setas esquerda e direita para andar e a seta para cima para pular. Clique no painel ou chegue à sua frente para abrir seu conteúdo."><div class="room-scene"><div class="room-grid"></div>${roomGeometry()}<button class="room-console" aria-label="Usar o computador"><img class="room-computer" src="../../../../../assets/images/TLA/Desktop.png" alt=""></button><button class="room-door" aria-label="Ir até a porta"><span class="door-lamp"></span><b>SAÍDA</b><i></i></button><div class="room-player" aria-hidden="true"><span class="player-eyes">••</span><span class="player-book"></span></div><div class="room-floor"></div></div></div></div><section class="room-puzzle"><p class="room-game-title">De novo essa fase?</p><h3 tabindex="-1">${level.title}</h3><p class="room-clue">${level.clue}</p><div class="feedback" role="status" aria-live="polite" aria-atomic="true"></div><div class="room-mechanism"></div><button class="primary room-next" hidden>Atravessar a porta →</button><button class="room-instructions-button" aria-haspopup="dialog">ⓘ Instruções</button></section></div><dialog class="room-instructions" aria-labelledby="instructions-title"><h2 id="instructions-title">Como jogar</h2><ul><li><strong>Sua missão:</strong> resolva os desafios de tabuada para abrir a porta e atravessar as cinco fases. A sala é a mesma, mas a regra muda!</li><li><strong>Ande e pule:</strong> use ← e → para andar e ↑ para pular.</li><li><strong>Explore com um clique:</strong> clique ou toque no painel e na porta para interagir com eles.</li><li><strong>Cuidado com a eletricidade:</strong> pule os arcos vermelhos. Se encostar, o personagem reaparece no início da sala. Suas respostas continuam guardadas e você não perde pontos.</li><li><strong>O painel abre sozinho:</strong> clique nele ou leve o personagem até a sua frente. O conteúdo aparece automaticamente, sem apertar outra tecla.</li></ul><button class="primary instructions-close">Entendi! Vamos jogar →</button></dialog>`;
        container.querySelector('.room-puzzle h3').focus();
        container.querySelector('.room-console').onclick = () => { openPanel(); target = null; };
        container.querySelector('.room-door').onclick = () => { if (solved) beginExit(); else status('A porta ainda está trancada. Resolva o computador primeiro.'); };
        const instructions = container.querySelector('.room-instructions');
        container.querySelector('.room-instructions-button').onclick = () => { held.clear(); target = null; instructions.showModal(); };
        container.querySelector('.instructions-close').onclick = () => instructions.close();
        container.querySelector('.room-next').onclick = () => { if (solved) beginExit(); };

        draw();
      }
      function status(message) { const door = container.querySelector('.room-door'); if(door) door.setAttribute('aria-label', message); }
      function jump() { if (!respawnDelay && grounded && container.querySelector('.room-world')) { vy = -527; grounded = false; } }
      function openPanel() {
        if (opened) return;
        opened = true; target = null;
        status('Painel ligado. Leia a regra desta sala e experimente!');
        const level = levels[phase], panel = container.querySelector('.room-mechanism');
        if (level.type === 'choice') {
          panel.innerHTML = `<div class="room-options">${level.choices.map((v,i)=>`<button data-choice="${i}">${v}</button>`).join('')}</div>`;
          panel.querySelectorAll('[data-choice]').forEach(button=>button.onclick=()=>{
            if (solved || button.disabled) return;
            const correct = Number(button.dataset.choice) === level.right;
            button.disabled = true; button.classList.add(correct ? 'correct' : 'retry'); button.textContent = `${correct ? '✓' : '×'} ${level.choices[Number(button.dataset.choice)]}`;
            judge(correct);
          });
        } else if (level.type === 'dial' || level.type === 'groups') {
          let amount = level.type === 'dial' ? 1 : 0;
          const max = level.type === 'dial' ? 10 : 12;
          panel.innerHTML = `<div class="room-adjust"><button data-minus aria-label="Diminuir">−</button><output aria-live="polite"></output><button data-plus aria-label="Aumentar">+</button></div><div class="room-crystals" aria-hidden="true"></div><button class="topic room-check">${level.type === 'dial' ? 'Testar engrenagem' : 'Carregar a máquina'} →</button>`;
          const render = () => {panel.querySelector('output').textContent = level.type === 'dial' ? `4 × ${amount} = 20` : `${amount} cristais`; panel.querySelector('.room-crystals').textContent = level.type === 'groups' ? '◆ '.repeat(amount) : ''; panel.querySelector('[data-minus]').disabled = amount === 0; panel.querySelector('[data-plus]').disabled = amount === max;};
          let previousWrong = null;
          panel.querySelector('[data-minus]').onclick = () => {if(!solved) {amount = Math.max(0,amount-1);render();panel.querySelector('.room-check').disabled=false;}};
          panel.querySelector('[data-plus]').onclick = () => {if(!solved) {amount = Math.min(max,amount+1);render();panel.querySelector('.room-check').disabled=false;}};
          panel.querySelector('.room-check').onclick = () => { if (solved || amount === previousWrong) return; const correct = amount === level.right; if(!correct) {previousWrong=amount;panel.querySelector('.room-check').disabled=true;} judge(correct); };
          render();
        } else {
          const selected = new Set(), wrongPairs = new Set();
          panel.innerHTML = `<div class="room-options room-keys">${level.choices.map(v=>`<button data-factor="${v}" aria-pressed="false">⚿ ${v}</button>`).join('')}</div><p class="pair-state" aria-live="polite">Escolha duas chaves.</p><button class="topic room-check" disabled>Testar as duas chaves →</button>`;
          panel.querySelectorAll('[data-factor]').forEach(button=>button.onclick=()=>{
            if(solved)return;
            const n=Number(button.dataset.factor);
            if(selected.has(n))selected.delete(n);else if(selected.size<2)selected.add(n);
            button.setAttribute('aria-pressed',String(selected.has(n)));
            panel.querySelector('.pair-state').textContent = selected.size===2 ? `${[...selected].join(' × ')} = 24?` : 'Escolha duas chaves.';
            panel.querySelector('.room-check').disabled=selected.size!==2 || wrongPairs.has([...selected].sort().join(','));
          });
          panel.querySelector('.room-check').onclick=()=>{if(solved||selected.size!==2)return; const correct=[...selected].reduce((a,b)=>a*b,1)===24; if(!correct){wrongPairs.add([...selected].sort().join(','));panel.querySelector('.room-check').disabled=true;}judge(correct);};
        }
      }
      function judge(correct) {
        if(solved)return;
        const level=levels[phase];
        if(!correct){errors++;tried=true;feedback('error',level.hint);return;}
        solved=true;if(!tried)first++;
        container.querySelectorAll('.room-mechanism button').forEach(b=>b.disabled=true);
        feedback('success',level.explanation);
        container.querySelector('.room-door').classList.add('unlocked');
        container.querySelector('.room-world').classList.add('powered');
        const next=container.querySelector('.room-next'); next.hidden=false; next.focus();
        status('A porta abriu! Atravesse quando estiver pronto.');
      }
      // Saída guiada: usa a física normal e salta antes dos arcos do piso.
      // Preserve esta rota segura ao alterar plataformas, arcos ou a posição da porta.
      function beginExit() {
        if (!solved || exiting) return;
        exiting = true; target = null; held.clear();
        const next = container.querySelector('.room-next'); next.disabled = true;
        status('Caminhando até a porta aberta.');
      }
      function advancePhase() {
        if (!exiting && !solved) return;
        exiting = false; target = null; held.clear(); phase++;
        if (phase === levels.length) finish(); else showRoom();
      }
      function finish(){
        target=null;held.clear();
        const result=window.BenaPontuacao.calcular({total:levels.length,acertosPrimeira:first,erros:errors,rodada:round,concluida:true,tempoAtivo:false});
        if (window.BENA_AUTH && typeof window.BENA_AUTH.salvarPartida === 'function') {
          window.BENA_AUTH.salvarPartida({
            jogo_id: key,
            total_questoes: levels.length,
            acertos_primeira: first,
            erros_validos: errors,
            pontuacao: result.pontos
          }).then(r => console.log('[Ranking] Partida salva:', r))
            .catch(e => console.warn('[Ranking] Erro ao salvar partida:', e));
        }
        container.innerHTML=`<div class="room-finish"><div class="eyebrow">CINCO REGRAS. UMA GRANDE DESCOBERTA.</div><h2 tabindex="-1">Você escapou da mesma sala!</h2><p>A sala era igual. Seu jeito de pensar mudou a cada porta.</p><div class="score-summary"><strong class="score-value">${result.pontos} pontos</strong><p>${first} de ${levels.length} fases resolvidas de primeira · ${result.percentualAcertos}%</p><p>${errors} erros · Rodada ${round}${result.somenteTreino?' · somente treino':''}</p><p>Sem tempo valendo pontos.</p></div><p class="notice">Pontuação de demonstração nesta aba. Não é salva por aluno; atualizar a página reinicia as repetições.</p><button class="primary room-replay">Voltar à mesma sala →</button><button class="topic room-back">← Voltar aos jogos</button></div>`;
        container.querySelector('.room-finish h2').focus();container.querySelector('.room-replay').onclick=start;container.querySelector('.room-back').onclick=()=>{cleanup();voltar();};
      }
      function draw(walking=false){const player=container.querySelector('.room-player');if(player){player.style.left=`${x/8}%`;player.style.top=`${y/4.25}%`;player.classList.toggle('walking',walking&&!respawnDelay);}}
      function tick(time){
        if(stopped)return;
        const dt=Math.min((time-last)/1000 || 0,0.035);last=time;
        if(container.querySelector('.room-world') && !container.querySelector('.room-instructions')?.open){
          if (respawnDelay > 0) {
            respawnDelay = Math.max(0, respawnDelay-dt);
            if (!respawnDelay) {
              x=75; y=373; vy=0; grounded=true;
              container.querySelector('.room-player').classList.remove('electrocuted');
            }
            draw();frame=requestAnimationFrame(tick);return;
          }
          let direction=(held.has('right')?1:0)-(held.has('left')?1:0);
          if(target!==null)direction=Math.abs(target-x)<5?0:Math.sign(target-x);
          if(exiting) {
            direction=1;
            if(grounded && ((x>180&&x<225)||(x>485&&x<525))) jump();
          }
          const oldX=x;
          x=Math.max(20,Math.min(748,x+direction*235*dt));
          // As laterais bloqueiam a passagem, mas deixam o personagem saltar por cima da plataforma.
          for(const p of platforms) {
            const reachesSide = y+32>p.top+1 && y<p.top+12-1;
            if(!reachesSide)continue;
            if(direction>0&&oldX+28<=p.left&&x+28>p.left)x=p.left-28;
            else if(direction<0&&oldX>=p.right&&x<p.right)x=p.right;
          }
          const oldTop=y, oldBottom=y+32;vy+=1100*dt;y+=vy*dt;grounded=false;
          const landingSurfaces=[...platforms].sort((a,b)=>a.top-b.top).concat({left:0,right:800,top:405});
          for(const p of landingSurfaces)if(vy>=0&&oldBottom<=p.top+1&&y+32>=p.top&&x+28>p.left&&x<p.right){y=p.top-32;vy=0;grounded=true;break;}
          // Plataformas são sólidas também por baixo: não é possível atravessá-las no salto.
          if(vy<0)for(const p of platforms)if(oldTop>=p.top+12-1&&y<=p.top+12&&x+28>p.left&&x<p.right){y=p.top+12;vy=0;break;}
          // Pequena margem interna evita choque só por tocar a borda decorativa.
          if(hazards.some(h=>x+25>h.x+4&&x+3<h.x+h.w-4&&y+30>h.y+3&&y+2<h.y+h.h-2)) {
            respawnDelay=.65;target=null;held.clear();vy=0;
            container.querySelector('.room-player').classList.add('electrocuted');
          }
          if(!respawnDelay&&Math.abs(x-390)<50&&Math.abs(y+32-215)<8)openPanel();
          if(solved&&x+28>=728&&y+32>=404)advancePhase();
          draw(direction!==0);
        }
        frame=requestAnimationFrame(tick);
      }
      window.addEventListener('keydown', e=>{
        if(container.querySelector('.room-instructions')?.open)return;
        if(e.target.matches('button,input,select') && [' ','Enter'].includes(e.key))return;
        if(['ArrowLeft','ArrowRight',' ','ArrowUp'].includes(e.key))e.preventDefault();
        if(e.key==='ArrowLeft'){target=null;held.add('left');}if(e.key==='ArrowRight'){target=null;held.add('right');}
        if((e.key===' '||e.key==='ArrowUp')&&!e.repeat)jump();
      },{signal});
      window.addEventListener('keyup',e=>{if(e.key==='ArrowLeft')held.delete('left');if(e.key==='ArrowRight')held.delete('right');},{signal});
      window.addEventListener('blur',()=>held.clear(),{signal});
      document.addEventListener('visibilitychange',()=>{held.clear();last=0;},{signal});
      start();frame=requestAnimationFrame(tick);return cleanup;
    }
  };
})();
