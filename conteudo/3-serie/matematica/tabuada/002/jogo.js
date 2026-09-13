// Protótipo de estilo: ainda não constitui padrão para outros jogos.
(() => {
  const css = new URL('estilo.css', document.currentScript.src).href;
  const monitorPositionUrl = new URL('Config/monitor_position.json', document.currentScript.src);
  const questionsUrl = new URL('Config/q&a.json', document.currentScript.src);
  const generalConfigUrl = new URL('Config/General.json', document.currentScript.src);
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
      let monitorPosition = {
        left: '46%', top: '41.647%', leftPercent: 46, topPercent: 41.647,
        stand: { x: 390, y: 183, toleranceX: 18, toleranceY: 12 }, exitRoute: 'center'
      };
      let monitorPositionConfig = { levels: [] };
      let generalConfig = { spped: {} };
      let levels = [], activeQuestion = null, questionConfigError = null;
      let x = 75, y = 373, vy = 0, grounded = true, target = null, last = 0;
      let exitPlan = null;
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
      // Cada rota percorre somente trechos livres entre plataformas e arcos.
      // As coordenadas são as do espaço lógico da sala (800 × 425).
      const doorFromFloor = [
        { type: 'walk', x: 470, y: 373 },
        { type: 'jump', x: 620, y: 373, apex: 96 },
        { type: 'walk', x: 730, y: 373 }
      ];
      const exitRoutes = {
        'upper-left': [
          { type: 'walk', x: 195, y: 113 },
          { type: 'drop', x: 250, y: 233 },
          { type: 'walk', x: 280, y: 233 },
          { type: 'drop', x: 300, y: 373 },
          ...doorFromFloor
        ],
        'lower-left': [
          { type: 'walk', x: 140, y: 283 },
          { type: 'jump', x: 250, y: 233, apex: 100 },
          { type: 'walk', x: 280, y: 233 },
          { type: 'drop', x: 300, y: 373 },
          ...doorFromFloor
        ],
        'top-center': [
          { type: 'walk', x: 440, y: 58 },
          { type: 'drop', x: 470, y: 183 },
          { type: 'walk', x: 490, y: 183 },
          { type: 'drop', x: 500, y: 373 },
          ...doorFromFloor
        ],
        'center': [
          { type: 'walk', x: 490, y: 183 },
          { type: 'drop', x: 500, y: 373 },
          ...doorFromFloor
        ],
        'upper-right': [
          { type: 'walk', x: 560, y: 108 },
          { type: 'drop', x: 470, y: 183 },
          { type: 'walk', x: 490, y: 183 },
          { type: 'drop', x: 500, y: 373 },
          ...doorFromFloor
        ],
        'lower-right': [
          { type: 'walk', x: 655, y: 243 },
          { type: 'drop', x: 680, y: 373 },
          { type: 'walk', x: 730, y: 373 }
        ]
      };
      let respawnDelay = 0;
      function roomGeometry() {
        const ledges = platforms.map(p => `<div class="room-platform lab-ledge" style="left:${p.left/8}%;top:${p.top/4.25}%;width:${(p.right-p.left)/8}%;height:${12/4.25}%"></div>`).join('');
        const arcs = hazards.map(h => `<div class="electric-arc${h.hanging ? ' electric-arc--hanging' : ''}" role="img" aria-label="Arco elétrico perigoso" style="left:${h.x/8}%;top:${h.y/4.25}%;width:${h.w/8}%;height:${h.h/4.25}%"><span class="arc-emitter arc-left"></span><svg viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true"><path class="arc-glow" d="M5 16 L20 7 L32 24 L46 8 L60 21 L76 6 L95 16"/><path class="arc-core" d="M5 16 L20 7 L32 24 L46 8 L60 21 L76 6 L95 16"/></svg><span class="arc-emitter arc-right"></span></div>`).join('');
        return ledges + arcs;
      }
      const key = '3-serie/matematica/tabuada/002';
      let round;
      const levelTitles = {
        1: 'A porta gosta de números',
        2: 'Desta vez, falta uma peça',
        3: 'Não é para somar os números',
        4: 'Duas chaves, uma saída',
        5: 'A regra virou do avesso'
      };
      function escapeHtml(value) {
        return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
      }
      function configurationError(message) { throw new Error(`q&a.json: ${message}`); }
      function numberFrom(value, context) {
        const number = Number(value);
        if (!Number.isFinite(number)) configurationError(`${context} precisa ser um número.`);
        return number;
      }
      function numericList(value, context) {
        if (!Array.isArray(value) || !value.length) configurationError(`${context} precisa ter pelo menos um valor.`);
        return value.map((item, index) => numberFrom(item, `${context} (${index + 1})`));
      }
      function questionText(value, context) {
        if (typeof value !== 'string' || !value.trim()) configurationError(`${context} precisa ter o texto da pergunta.`);
        return value.trim();
      }
      function normalizeQuestion(type, question, context) {
        if (!question || typeof question !== 'object') configurationError(`${context} é inválida.`);
        if (type === 'pair') {
          const target = numberFrom(question.target, `${context}: target`);
          const options = numericList(question.options, `${context}: options`);
          const answer = numericList(question.answer, `${context}: answer`);
          if (answer.length !== 2 || new Set(answer).size !== 2 || answer.some(value => !options.includes(value))) {
            configurationError(`${context}: answer precisa ter duas opções diferentes da lista.`);
          }
          return { target, options, answer };
        }
        const prompt = questionText(question.question, context);
        if (type === 'choice') {
          if (!Array.isArray(question.options) || !question.options.length || question.options.some(option => !['string', 'number'].includes(typeof option))) {
            configurationError(`${context}: options precisa ter pelo menos uma alternativa de texto ou número.`);
          }
          const options = question.options.map(String);
          const answer = String(question.answer);
          if (!options.includes(answer)) configurationError(`${context}: answer precisa estar em options.`);
          return { question: prompt, options, answer };
        }
        const options = numericList(question.options, `${context}: options`);
        const answer = numberFrom(question.answer, `${context}: answer`);
        if (!options.includes(answer)) configurationError(`${context}: answer precisa estar em options.`);
        return { question: prompt, options, answer };
      }
      function normalizeQuestionConfig(config) {
        if (!config || typeof config !== 'object' || !Array.isArray(config.levels) || !config.levels.length) {
          configurationError('levels precisa conter pelo menos uma fase.');
        }
        const seenIds = new Set();
        const supportedTypes = new Set(['choice', 'dial', 'groups', 'pair']);
        return config.levels.map((level, index) => {
          const id = numberFrom(level?.id, `Fase ${index + 1}: id`);
          if (seenIds.has(id)) configurationError(`A fase ${id} foi repetida.`);
          seenIds.add(id);
          const type = level?.type;
          if (!supportedTypes.has(type)) configurationError(`Fase ${id}: type inválido.`);
          if (!Array.isArray(level.questions) || !level.questions.length) configurationError(`Fase ${id}: questions precisa ter pelo menos uma pergunta.`);
          return {
            id,
            type,
            questions: level.questions.map((question, questionIndex) => normalizeQuestion(type, question, `Fase ${id}, pergunta ${questionIndex + 1}`))
          };
        }).sort((firstLevel, secondLevel) => firstLevel.id - secondLevel.id);
      }
      function chooseQuestion(level) {
        return level.questions[Math.floor(Math.random() * level.questions.length)];
      }
      function titleFor(level) { return levelTitles[level.id] || `Desafio ${level.id}`; }
      function isReverseChoice(question) { return /incorret|errad/i.test(question.question); }
      function equationWithAnswer(question, answer) {
        return String(question).replace(/\bX\b|\?/i, String(answer));
      }
      function equationHtml(question, answer) {
        return escapeHtml(question).replace(/\bX\b|\?/i, escapeHtml(answer));
      }
      function clueFor(level, question) {
        if (level.type === 'dial') return `Agora o resultado já está escrito: ${equationHtml(question.question, '?')}. Ajuste a engrenagem.`;
        if (level.type === 'groups') return `A máquina precisa resolver ${escapeHtml(question.question)}. Carregue os cristais e confirme.`;
        if (level.type === 'pair') return `A fechadura marca ${escapeHtml(question.target)}. Escolha duas chaves que, multiplicadas, abrem a porta.`;
        return isReverseChoice(question) ? escapeHtml(question.question) : `O painel pede ${escapeHtml(question.question)}. Encontre o resultado para ligar a porta.`;
      }
      function hintFor(level, question) {
        if (level.type === 'dial') return 'Conte de um fator em um fator até chegar ao resultado.';
        if (level.type === 'groups') return 'Pense em grupos iguais e conte os cristais com calma.';
        if (level.type === 'pair') return `Procure duas chaves que formem ${question.target}.`;
        return isReverseChoice(question) ? 'Confira cada conta usando a tabuada.' : 'Use a tabuada para conferir cada alternativa.';
      }
      function explanationFor(level, question) {
        if (level.type === 'dial') return `${equationWithAnswer(question.question, question.answer)}. A engrenagem encaixou!`;
        if (level.type === 'groups') return `${question.question} = ${question.answer} cristais. Energia completa!`;
        if (level.type === 'pair') return `${question.answer.join(' × ')} = ${question.target}. As duas chaves funcionaram!`;
        return isReverseChoice(question) ? `A conta incorreta é ${question.answer}.` : `${question.question} = ${question.answer}.`;
      }
      function dialEquation(question, amount, adjusted) {
        const displayValue = adjusted ? amount : '?';
        return escapeHtml(question).replace(/\bX\b|\?/i, `<span class="room-dial-value">${escapeHtml(displayValue)}</span>`);
      }
      function equalPair(firstPair, secondPair) {
        return firstPair.length === secondPair.length
          && [...firstPair].sort((first, second) => first - second).every((value, index) => value === [...secondPair].sort((first, second) => first - second)[index]);
      }
      function loadQuestions() {
        return fetch(questionsUrl)
          .then(response => {
            if (!response.ok) throw new Error(`q&a.json: ${response.status}`);
            return response.json();
          })
          .then(config => { levels = normalizeQuestionConfig(config); })
          .catch(error => {
            questionConfigError = error;
            console.error('[Jogo] Não foi possível carregar q&a.json.', error);
          });
      }
      function showConfigurationError() {
        container.innerHTML = `<section class="room-finish"><h2 tabindex="-1">Não foi possível carregar os desafios.</h2><p>Confira o arquivo <code>Config/q&amp;a.json</code> e atualize a página.</p></section>`;
        container.querySelector('h2').focus();
      }
      function percentValue(value, fallback) {
        const number = typeof value === 'number' ? value : Number.parseFloat(String(value).replace('%', ''));
        return Number.isFinite(number) ? Math.max(0, Math.min(100, number)) : fallback;
      }
      function coordinateValue(value, fallback, minimum, maximum) {
        const number = Number(value);
        return Number.isFinite(number) ? Math.max(minimum, Math.min(maximum, number)) : fallback;
      }
      function normalizeMonitorPosition(position) {
        const leftPercent = percentValue(position?.left, 46);
        const topPercent = percentValue(position?.top, 41.647);
        const derivedStand = { x: leftPercent * 8 + 22, y: topPercent * 4.25 + 6 };
        const stand = {
          x: coordinateValue(position?.stand?.x, derivedStand.x, 20, 748),
          y: coordinateValue(position?.stand?.y, derivedStand.y, 0, 373),
          toleranceX: coordinateValue(position?.stand?.toleranceX, 18, 4, 80),
          toleranceY: coordinateValue(position?.stand?.toleranceY, 12, 4, 80)
        };
        const exitRoute = typeof position?.exitRoute === 'string' && exitRoutes[position.exitRoute]
          ? position.exitRoute
          : null;
        return { left: `${leftPercent}%`, top: `${topPercent}%`, leftPercent, topPercent, stand, exitRoute };
      }
      function chooseMonitorPosition(levelNumber) {
        const levelConfig = monitorPositionConfig.levels?.find(item => Number(item.id) === levelNumber);
        const availablePositions = Array.isArray(monitorPositionConfig.positions) ? monitorPositionConfig.positions : [];
        const references = Array.isArray(levelConfig?.positions) ? levelConfig.positions : [];
        const positions = references
          .map(reference => typeof reference === 'object'
            ? reference
            : availablePositions.find(position => Number(position.id) === Number(reference)))
          .filter(Boolean);
        const selected = positions.length ? positions[Math.floor(Math.random() * positions.length)] : null;
        return normalizeMonitorPosition(selected || {
          left: 46, top: 41.647,
          stand: { x: 390, y: 183, toleranceX: 18, toleranceY: 12 }, exitRoute: 'center'
        });
      }
      function loadMonitorPositions() {
        return fetch(monitorPositionUrl)
          .then(response => {
            if (!response.ok) throw new Error(`monitor_position.json: ${response.status}`);
            return response.json();
          })
          .then(config => { monitorPositionConfig = config && typeof config === 'object' ? config : { levels: [] }; })
          .catch(error => {
            console.warn('[Jogo] Não foi possível carregar monitor_position.json. Usando a posição padrão.', error);
          });
      }
      function loadGeneralConfig() {
        return fetch(generalConfigUrl)
          .then(response => {
            if (!response.ok) throw new Error(`General.json: ${response.status}`);
            return response.json();
          })
          .then(config => {
            const speeds = config?.spped;
            if (!speeds || !Number.isFinite(Number(speeds.manual_normal))
              || !Number.isFinite(Number(speeds.auto_walk))
              || !Number.isFinite(Number(speeds.auto_jump))
              || !Number.isFinite(Number(speeds.auto_other))) {
              throw new Error('General.json: velocidades inválidas.');
            }
            generalConfig = { spped: {
              manual_normal: Number(speeds.manual_normal),
              auto_walk: Number(speeds.auto_walk),
              auto_jump: Number(speeds.auto_jump),
              auto_other: Number(speeds.auto_other)
            } };
          })
          .catch(error => {
            console.error('[Jogo] Não foi possível carregar General.json.', error);
            throw error;
          });
      }
      function cleanup() { stopped = true; cancelAnimationFrame(frame); controller.abort(); held.clear(); dialog.classList.remove('room-dialog'); }
      function start() { round = window.BenaPontuacao.iniciarRodada(key); phase = 0; errors = 0; first = 0; showRoom(); }
      function feedback(state, detail) {
        window.BenaFeedback.mostrar(container.querySelector('.room-puzzle .feedback'), state, detail, 'Ajuste o painel e tente novamente.');
      }
      function showRoom() {
        respawnDelay = 0; x = 75; y = 373; vy = 0; grounded = true; target = null; exitPlan = null; held.clear(); tried = false; solved = false; opened = false; exiting = false;
        monitorPosition = chooseMonitorPosition(phase + 1);
        const level = levels[phase];
        activeQuestion = chooseQuestion(level);
        container.innerHTML = `<div class="room-layout"><div><div class="room-world" role="group" aria-label="Sala explorável. Use as setas esquerda e direita para andar e a seta para cima para pular. Leve o personagem até a frente do computador para abrir o desafio."><div class="room-scene"><div class="room-grid"></div>${roomGeometry()}<button class="room-console" style="left:${monitorPosition.left};top:${monitorPosition.top}" aria-label="Computador: leve o personagem até ele para usar"><img class="room-computer" src="../../../../../assets/images/TLA/Desktop.png" alt=""></button><button class="room-door" aria-label="Ir até a porta"><span class="door-lamp"></span><b>SAÍDA</b><i></i></button><div class="room-player" aria-hidden="true"><span class="player-eyes">••</span><span class="player-book"></span></div><div class="room-floor"></div></div></div></div><aside class="room-puzzle game-template-side" aria-label="Desafio da fase"><p class="room-game-title">De novo essa fase?</p><h3 tabindex="-1">${titleFor(level)}</h3><div class="room-monitor" hidden></div><div class="feedback" role="status" aria-live="polite" aria-atomic="true"></div><button class="primary room-next" hidden>Atravessar a porta →</button><button class="room-instructions-button" aria-haspopup="dialog">ⓘ Instruções</button></aside></div><dialog class="room-instructions" aria-labelledby="instructions-title"><h2 id="instructions-title">Como jogar</h2><ul><li><strong>Sua missão:</strong> resolva os desafios de tabuada para abrir a porta e atravessar as cinco fases. A sala é a mesma, mas a regra muda!</li><li><strong>Ande e pule:</strong> use ← e → para andar e ↑ para pular.</li><li><strong>Use o computador:</strong> leve o personagem até a frente dele. O conteúdo aparece automaticamente, sem apertar outra tecla.</li><li><strong>Cuidado com a eletricidade:</strong> pule os arcos vermelhos. Se encostar, o personagem reaparece no início da sala. Suas respostas continuam guardadas e você não perde pontos.</li><li><strong>Explore a saída:</strong> depois de resolver o computador, clique ou toque na porta para atravessá-la.</li></ul><button class="primary instructions-close">Entendi! Vamos jogar →</button></dialog>`;
        container.querySelector('.room-puzzle h3').focus();
        container.querySelector('.room-console').onclick = () => { if (atComputer()) openPanel(); else status('Chegue à frente do computador para usá-lo.'); };
        container.querySelector('.room-door').onclick = () => { if (solved) beginExit(); else status('A porta ainda está trancada. Resolva o computador primeiro.'); };
        const instructions = container.querySelector('.room-instructions');
        container.querySelector('.room-instructions-button').onclick = () => { held.clear(); target = null; instructions.showModal(); };
        container.querySelector('.instructions-close').onclick = () => instructions.close();
        container.querySelector('.room-next').onclick = () => { if (solved) beginExit(); };

        draw();
      }
      function status(message) { const door = container.querySelector('.room-door'); if(door) door.setAttribute('aria-label', message); }
      // O painel só pode abrir quando o personagem está na zona segura configurada para este computador.
      function atComputer() {
        const stand = monitorPosition.stand;
        return grounded && Math.abs(x - stand.x) <= stand.toleranceX && Math.abs(y - stand.y) <= stand.toleranceY;
      }
      function jump() { if (!respawnDelay && grounded && container.querySelector('.room-world')) { vy = -527; grounded = false; } }
      function openPanel() {
        if (opened) return;
        opened = true; target = null;
        status('Painel ligado. Leia a regra desta sala e experimente!');
        const level = levels[phase], question = activeQuestion, monitor = container.querySelector('.room-monitor');
        monitor.hidden = false;
        monitor.innerHTML = `<section class="room-monitor-shell" aria-label="Monitor do computador"><div class="room-monitor-bezel"><div class="room-monitor-screen"><p class="room-clue" tabindex="-1">${clueFor(level, question)}</p><div class="room-mechanism"></div></div></div><div class="room-monitor-stem" aria-hidden="true"></div><div class="room-monitor-base" aria-hidden="true"></div></section>`;
        const panel = monitor.querySelector('.room-mechanism');
        if (level.type === 'choice') {
          panel.innerHTML = `<div class="room-options">${question.options.map((option, index) => `<button data-choice="${index}">${escapeHtml(option)}</button>`).join('')}</div>`;
          panel.querySelectorAll('[data-choice]').forEach(button=>button.onclick=()=>{
            if (solved || button.disabled) return;
            const option = question.options[Number(button.dataset.choice)];
            const correct = option === question.answer;
            button.disabled = true; button.classList.add(correct ? 'correct' : 'retry'); button.textContent = `${correct ? '✓' : '×'} ${option}`;
            judge(correct);
          });
        } else if (level.type === 'dial' || level.type === 'groups') {
          const values = question.options;
          const initialValue = level.type === 'dial' && values.includes(1) ? 1 : level.type === 'groups' && values.includes(0) ? 0 : values[0];
          let amountIndex = values.indexOf(initialValue), amount = values[amountIndex];
          let adjusted = false;
          panel.innerHTML = `<div class="room-adjust"><button data-minus aria-label="Diminuir">−</button><output aria-live="polite"></output><button data-plus aria-label="Aumentar">+</button></div><div class="room-crystals" aria-hidden="true"></div><button class="topic room-check">${level.type === 'dial' ? 'Testar engrenagem' : 'Carregar a máquina'} →</button>`;
          const render = () => {
            panel.querySelector('output').innerHTML = level.type === 'dial' ? dialEquation(question.question, amount, adjusted) : `${escapeHtml(amount)} cristais`;
            panel.querySelector('.room-crystals').textContent = level.type === 'groups' ? '◆ '.repeat(amount) : '';
            panel.querySelector('[data-minus]').disabled = amountIndex === 0;
            panel.querySelector('[data-plus]').disabled = amountIndex === values.length - 1;
          };
          let previousWrong = null;
          panel.querySelector('[data-minus]').onclick = () => {if(!solved) {adjusted = true; amountIndex = Math.max(0, amountIndex - 1); amount = values[amountIndex]; render(); panel.querySelector('.room-check').disabled = false;}};
          panel.querySelector('[data-plus]').onclick = () => {if(!solved) {adjusted = true; amountIndex = Math.min(values.length - 1, amountIndex + 1); amount = values[amountIndex]; render(); panel.querySelector('.room-check').disabled = false;}};
          panel.querySelector('.room-check').onclick = () => { if (solved || amount === previousWrong) return; const correct = amount === question.answer; if(!correct) {previousWrong=amount;panel.querySelector('.room-check').disabled=true;} judge(correct); };
          render();
        } else {
          const selected = new Set(), wrongPairs = new Set();
          panel.innerHTML = `<div class="room-options room-keys">${question.options.map(option=>`<button data-factor="${option}" aria-pressed="false">⚿ ${option}</button>`).join('')}</div><p class="pair-state" aria-live="polite">Escolha duas chaves.</p><button class="topic room-check" disabled>Testar as duas chaves →</button>`;
          panel.querySelectorAll('[data-factor]').forEach(button=>button.onclick=()=>{
            if(solved)return;
            const n=Number(button.dataset.factor);
            if(selected.has(n))selected.delete(n);else if(selected.size<2)selected.add(n);
            button.setAttribute('aria-pressed',String(selected.has(n)));
            const selectionKey = [...selected].sort((first, second) => first - second).join(',');
            panel.querySelector('.pair-state').textContent = selected.size===2 ? `${[...selected].join(' × ')} = ${question.target}?` : 'Escolha duas chaves.';
            panel.querySelector('.room-check').disabled=selected.size!==2 || wrongPairs.has(selectionKey);
          });
          panel.querySelector('.room-check').onclick=()=>{if(solved||selected.size!==2)return; const selection = [...selected]; const correct = equalPair(selection, question.answer); if(!correct){wrongPairs.add(selection.sort((first, second) => first - second).join(','));panel.querySelector('.room-check').disabled=true;}judge(correct);};
        }
      }
      function judge(correct) {
        if(solved)return;
        const level = levels[phase], question = activeQuestion;
        if(!correct){errors++;tried=true;feedback('error',hintFor(level, question));return;}
        solved=true;if(!tried)first++;
        container.querySelectorAll('.room-mechanism button').forEach(b=>b.disabled=true);
        feedback('success',explanationFor(level, question));
        container.querySelector('.room-door').classList.add('unlocked');
        container.querySelector('.room-world').classList.add('powered');
        const next=container.querySelector('.room-next'); next.hidden=false; next.focus();
        status('A porta abriu! Atravesse quando estiver pronto.');
      }
      function exitStepDuration(step, start) {
        const distance = Math.hypot(step.x - start.x, step.y - start.y);
        const speed = step.type === 'walk' ? generalConfig.spped.auto_walk
          : step.type === 'jump' ? generalConfig.spped.auto_jump
            : generalConfig.spped.auto_other;
        return Math.max(.18, distance / speed);
      }
      function exitStepPosition(step, start, progress) {
        const nextX = start.x + (step.x - start.x) * progress;
        const straightY = start.y + (step.y - start.y) * progress;
        if (step.type === 'jump') return { x: nextX, y: straightY - 4 * (step.apex || 90) * progress * (1 - progress) };
        if (step.type === 'drop') return { x: nextX, y: start.y + (step.y - start.y) * progress * progress };
        return { x: nextX, y: straightY };
      }
      function advanceExitPlan(dt) {
        const step = exitPlan?.steps[exitPlan.index];
        if (!step) {
          x = 730; y = 373; vy = 0; grounded = true; exitPlan = null;
          advancePhase();
          return 'finished';
        }
        const duration = exitStepDuration(step, exitPlan.start);
        const elapsed = Math.min(duration, exitPlan.elapsed + dt);
        const progress = elapsed / duration;
        const point = exitStepPosition(step, exitPlan.start, progress);
        x = point.x; y = point.y; vy = 0; grounded = progress === 1;
        exitPlan.elapsed = elapsed;
        if (progress === 1) {
          exitPlan.index++;
          exitPlan.elapsed = 0;
          exitPlan.start = { x, y };
        }
        return 'moving';
      }
      // A saída guiada usa uma rota da plataforma atual; não reutiliza o caminho do piso em todas as posições.
      function beginExit() {
        if (!solved || exiting) return;
        const route = exitRoutes[monitorPosition.exitRoute];
        if (!route) {
          console.error('[Jogo] A posição do computador não possui uma exitRoute válida.', monitorPosition);
          status('Esta posição do computador ainda não tem uma rota de saída configurada.');
          return;
        }
        exiting = true; target = null; held.clear();
        exitPlan = { steps: route, index: 0, elapsed: 0, start: { x, y } };
        const next = container.querySelector('.room-next'); next.disabled = true;
        status('Caminhando até a porta aberta.');
      }
      function advancePhase() {
        if (!exiting && !solved) return;
        exiting = false; exitPlan = null; target = null; held.clear(); phase++;
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
      function draw(walking=false){const player=container.querySelector('.room-player');if(player){player.style.left=`${x/8}%`;player.style.top=`${y/4.25}%`;player.classList.toggle('walking',walking&&!respawnDelay);player.classList.toggle('exiting',exiting&&!respawnDelay);}}
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
          if (exiting) {
            const exitState = advanceExitPlan(dt);
            if (exitState === 'finished') { frame = requestAnimationFrame(tick); return; }
            draw(true); frame = requestAnimationFrame(tick); return;
          }
          let direction=(held.has('right')?1:0)-(held.has('left')?1:0);
          if(target!==null)direction=Math.abs(target-x)<5?0:Math.sign(target-x);
          const oldX=x;
          const movementSpeed = generalConfig.spped.manual_normal;
          x=Math.max(20,Math.min(748,x+direction*movementSpeed*dt));
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
          if(!respawnDelay&&atComputer())openPanel();
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
      Promise.all([loadMonitorPositions(), loadQuestions(), loadGeneralConfig()]).then(() => {
        if (stopped) return;
        if (questionConfigError) { showConfigurationError(); return; }
        start();
        frame = requestAnimationFrame(tick);
      });
      return cleanup;
    }
  };
})();
