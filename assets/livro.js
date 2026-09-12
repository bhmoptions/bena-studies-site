/**
 * Bena Studies — Livro Mágico de Descobertas
 * Controlador de Animações 3D, Sequência de 3 Folhas (Sheets) & Navegação Interativa
 */

(function () {
  'use strict';

  // --- Elementos DOM ---
  const bookWrap = document.getElementById('bookWrap');
  const book = document.getElementById('magicBook');
  const instructionCallout = document.getElementById('instructionCallout');
  const openControls = document.getElementById('openControls');
  const btnReplay = document.getElementById('btnReplay');
  const btnClose = document.getElementById('btnClose');
  const soundToggle = document.getElementById('soundToggle');
  const soundIcon = document.getElementById('soundIcon');

  // Dialog & Modal
  const gameDialog = document.getElementById('game-dialog');
  const dialogClose = document.getElementById('dialogClose');
  const dialogContent = document.getElementById('dialogContent');

  // Caminho base dinâmico (raiz ou /paginas/)
  const base = location.pathname.includes('/paginas/') ? '../' : './';

  // Estado da Aplicação
  let isBookOpen = false;
  let isAnimating = false;
  let soundEnabled = true;
  let audioCtx = null;
  let pageFlipTimers = [];

  // --- Web Audio Efeitos Sintetizados ---
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // Efeito sonoro de folhear páginas (Ruído filtrado suave)
  function playRustleSound() {
    if (!soundEnabled) return;
    try {
      const actx = getAudioContext();
      if (!actx) return;

      const bufferSize = actx.sampleRate * 0.45;
      const buffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (actx.sampleRate * 0.12));
      }

      const noise = actx.createBufferSource();
      noise.buffer = buffer;

      const filter = actx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(750, actx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(280, actx.currentTime + 0.45);
      filter.Q.setValueAtTime(3, actx.currentTime);

      const gain = actx.createGain();
      gain.gain.setValueAtTime(0.22, actx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.45);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(actx.destination);
      noise.start();
    } catch (e) {}
  }

  // Efeito sonoro de carrilhão ascendente quando a última página se assenta
  function playChimeSequence() {
    if (!soundEnabled) return;
    try {
      const actx = getAudioContext();
      if (!actx) return;

      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
      notes.forEach((freq, idx) => {
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        const startTime = actx.currentTime + idx * 0.1;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.12, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.55);

        osc.connect(gain);
        gain.connect(actx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.65);
      });
    } catch (e) {}
  }

  // --- Sequência de Abertura do Livro ---
  function openBook() {
    if (isBookOpen || isAnimating) return;
    isAnimating = true;

    clearPageTimers();
    playRustleSound();

    // Oculta callout de instrução
    instructionCallout.style.opacity = '0';
    instructionCallout.style.transform = 'translateY(15px)';

    // Oculta destinos até a última folha assentar
    bookWrap.classList.remove('spread-revealed');

    // 1. Capa se abre (Leva 3s)
    bookWrap.classList.remove('is-closed');
    bookWrap.classList.add('is-open');

    const page1 = book.querySelector('.page-1');
    const page2 = book.querySelector('.page-2');
    const page3 = book.querySelector('.page-3');

    [page1, page2, page3].forEach(p => {
      if (p) {
        p.classList.remove('is-flipped', 'is-flipping');
        p.style.zIndex = '';
      }
    });

    // t=3.3s: Folha 1 vira (Sheet 1)
    // Mostra Página 2 virando e revelando Página 3 (Matemática) na esquerda e Página 4 (Ciências) na direita
    scheduleTimer(() => {
      playRustleSound();
      if (page1) {
        page1.classList.add('is-flipping');
        page1.classList.add('is-flipped');
        setTimeout(() => {
          page1.classList.remove('is-flipping');
        }, 1500);
      }
    }, 3300);

    // t=5.1s: Folha 2 vira (Sheet 2)
    // Revela Página 5 (História e Geografia) na esquerda e Página 6 (Inglês) na direita
    scheduleTimer(() => {
      playRustleSound();
      if (page2) {
        page2.classList.add('is-flipping');
        page2.classList.add('is-flipped');
        setTimeout(() => {
          page2.classList.remove('is-flipping');
        }, 1500);
      }
    }, 5100);

    // t=6.9s: Folha 3 vira (Sheet 3)
    // Revela no verso a metade esquerda do cenário final, encontrando a metade direita da base!
    scheduleTimer(() => {
      playRustleSound();
      if (page3) {
        page3.classList.add('is-flipping');
        page3.classList.add('is-flipped');
        setTimeout(() => {
          page3.classList.remove('is-flipping');
        }, 1500);
      }
    }, 6900);

    // t=8.5s: Cenário assentado -> ativa destinos e sinfonia
    scheduleTimer(() => {
      playChimeSequence();
      bookWrap.classList.add('spread-revealed');
      isBookOpen = true;
      isAnimating = false;
      openControls.classList.add('is-visible');
    }, 8500);
  }

  function scheduleTimer(fn, delay) {
    const id = setTimeout(fn, delay);
    pageFlipTimers.push(id);
  }

  function clearPageTimers() {
    pageFlipTimers.forEach(id => clearTimeout(id));
    pageFlipTimers = [];
  }

  // Fechar o livro de volta ao estado de repouso
  function closeBook() {
    if (!isBookOpen || isAnimating) return;
    isAnimating = true;

    clearPageTimers();
    playRustleSound();
    openControls.classList.remove('is-visible');

    // Oculta os destinos
    bookWrap.classList.remove('spread-revealed');

    const page1 = book.querySelector('.page-1');
    const page2 = book.querySelector('.page-2');
    const page3 = book.querySelector('.page-3');

    // Folha 3 vira de volta para a direita
    if (page3) {
      page3.classList.add('is-flipping');
      page3.classList.remove('is-flipped');
      setTimeout(() => {
        page3.classList.remove('is-flipping');
      }, 1500);
    }

    // Folha 2 vira de volta para a direita
    scheduleTimer(() => {
      playRustleSound();
      if (page2) {
        page2.classList.add('is-flipping');
        page2.classList.remove('is-flipped');
        setTimeout(() => {
          page2.classList.remove('is-flipping');
        }, 1500);
      }
    }, 380);

    // Folha 1 vira de volta para a direita
    scheduleTimer(() => {
      playRustleSound();
      if (page1) {
        page1.classList.add('is-flipping');
        page1.classList.remove('is-flipped');
        setTimeout(() => {
          page1.classList.remove('is-flipping');
        }, 1500);
      }
    }, 760);

    // Fecha a capa
    scheduleTimer(() => {
      playRustleSound();
      bookWrap.classList.remove('is-open');
      bookWrap.classList.add('is-closed');
    }, 1250);

    scheduleTimer(() => {
      isBookOpen = false;
      isAnimating = false;
      instructionCallout.style.opacity = '1';
      instructionCallout.style.transform = 'translateY(0)';
    }, 4300);
  }

  // Refolhear o livro (Replay da animação completa)
  function replayBookAnimation() {
    if (isAnimating) return;
    closeBook();
    scheduleTimer(openBook, 4500);
  }

  // --- Eventos de Abertura ---
  book.addEventListener('click', (e) => {
    if (isBookOpen) return;
    openBook();
  });

  instructionCallout.addEventListener('click', () => {
    if (!isBookOpen) openBook();
  });

  btnReplay.addEventListener('click', replayBookAnimation);
  btnClose.addEventListener('click', closeBook);

  // Alternador de Som
  soundToggle.addEventListener('click', () => {
    soundEnabled = !soundEnabled;
    soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
    soundToggle.setAttribute('aria-pressed', soundEnabled);
  });

  // --- Destinos Selecionáveis & Navegação Real ---
  const subjectDestinations = {
    matematica: {
      nome: 'Matemática',
      simbolo: '×',
      sub: 'Torre dos Números • 3ª série',
      desc: 'Desafios de cálculo rápido, labirintos lógicos e tabuada divertida.',
      isPlayable: true
    },
    portugues: {
      nome: 'Português',
      simbolo: 'Aa',
      sub: 'Vale das Letras',
      desc: 'Histórias fantásticas, aventuras de ortografia e charadas literárias sendo preparadas.',
      isPlayable: false
    },
    ciencias: {
      nome: 'Ciências',
      simbolo: '🔬',
      sub: 'Observatório Cósmico',
      desc: 'Descubra os planetas do sistema solar, o mistério dos átomos e o ciclo da natureza.',
      isPlayable: false
    },
    geografia: {
      nome: 'Geografia',
      simbolo: '🌍',
      sub: 'Ilha dos Exploradores',
      desc: 'Mapas interativos, biomas do Brasil e relevos do nosso planeta.',
      isPlayable: false
    },
    ingles: {
      nome: 'Inglês',
      simbolo: '🇬🇧',
      sub: 'Ponte dos Idiomas',
      desc: 'Jogos de vocabulário, pronúncia e diálogos divertidos.',
      isPlayable: false
    },
    historia: {
      nome: 'História',
      simbolo: '🏛️',
      sub: 'Templo do Tempo',
      desc: 'Viagens no tempo por civilizações antigas e invenções que mudaram a humanidade.',
      isPlayable: false
    }
  };

  // Clique nos Destinos Pop-Up
  document.querySelectorAll('.destination-card').forEach(card => {
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      const subjectKey = card.dataset.dest;
      openSubjectDestination(subjectKey);
    });
  });

  function openSubjectDestination(subjectKey) {
    const subj = subjectDestinations[subjectKey];
    if (!subj) return;

    if (subj.isPlayable && window.BENA_CONTEUDO && window.BENA_CONFIG) {
      // Matemática: Obtém os jogos reais da 3ª série cadastrados em conteudo/catalogo.js
      const serie = window.BENA_CONTEUDO[window.BENA_CONFIG.serieAtual];
      const mat = serie?.materias?.find(m => m.id === 'matematica');
      const tema = mat?.temas?.[0]; // Multiplicação e Divisão
      const jogos = tema?.jogos || [];

      let gamesListHtml = jogos.map((j) => `
        <a class="dialog-game-btn" href="${base}conteudo/${window.BENA_CONFIG.serieAtual}-serie/${j.pagina}">
          <div>
            <span class="dialog-game-name">${j.nome}</span>
            <span class="dialog-game-sub">${j.descricao}</span>
          </div>
          <span class="dialog-game-arrow">Jogar →</span>
        </a>
      `).join('');

      dialogContent.innerHTML = `
        <div class="dialog-symbol">${subj.simbolo}</div>
        <div class="dialog-eyebrow">3ª SÉRIE • DESTINO CONECTADO</div>
        <h2 class="dialog-title">${subj.nome}: ${tema?.nome || 'Jogos de Tabuada'}</h2>
        <p class="dialog-desc">${subj.desc}</p>
        <div class="game-card-list">
          ${gamesListHtml}
        </div>
      `;
    } else {
      // Outras matérias: Exibe um teaser educativo e inspirador em pt-BR
      dialogContent.innerHTML = `
        <div class="dialog-symbol">${subj.simbolo}</div>
        <div class="dialog-eyebrow">DESTINO EM CONSTRUÇÃO • BENA STUDIES</div>
        <h2 class="dialog-title">${subj.nome}: ${subj.sub}</h2>
        <p class="dialog-desc">${subj.desc}</p>
        <div style="background: var(--soft); border: 1px dashed var(--line); border-radius: 12px; padding: 18px; text-align: center; margin-top: 15px;">
          <p style="font-family: var(--hand); font-size: 16px; color: var(--gold); margin-bottom: 8px;">
            ✦ Novas missões e desafios para a 3ª série estão sendo preparados pelo clube!
          </p>
          <small style="color: var(--muted);">Enquanto isso, explore os desafios da Torre de Matemática!</small>
        </div>
        <div style="margin-top: 20px;">
          <button class="dialog-game-btn" onclick="document.querySelector('[data-dest=matematica]').click();">
            <div>
              <span class="dialog-game-name">Ir para os Jogos de Matemática</span>
              <span class="dialog-game-sub">Treinar tabuada na Torre Helix e Puzzle Box</span>
            </div>
            <span class="dialog-game-arrow">Abrir →</span>
          </button>
        </div>
      `;
    }

    gameDialog.showModal();
  }

  dialogClose.addEventListener('click', () => {
    gameDialog.close();
  });

  gameDialog.addEventListener('click', (e) => {
    if (e.target === gameDialog) {
      gameDialog.close();
    }
  });

})();
