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

  // ==========================================================================
  // 1. Configurações de Tempos & Painel de Testes
  // ==========================================================================
  const defaultTimings = {
    coverDuration: 3.0,
    pauseCover: 0.3,
    flipDuration: 1.5,
    sheetInterval: 0.3,
    endPause: 0.1
  };

  let timings = { ...defaultTimings };

  // Carrega preferências salvas do localStorage
  try {
    const saved = localStorage.getItem('bena_book_timings');
    if (saved) {
      timings = Object.assign({}, defaultTimings, JSON.parse(saved));
    }
  } catch (e) {}

  function applyTimingsToCSS() {
    document.documentElement.style.setProperty('--cover-duration', `${timings.coverDuration}s`);
    document.documentElement.style.setProperty('--flip-duration', `${timings.flipDuration}s`);
  }

  function saveTimings() {
    try {
      localStorage.setItem('bena_book_timings', JSON.stringify(timings));
    } catch (e) {}
  }

  // Elementos do Painel de Tempos
  const timingPanel = document.getElementById('timingPanel');
  const timingHeader = document.getElementById('timingHeader');
  const timingToggle = document.getElementById('timingToggle');
  const sliderCoverDur = document.getElementById('sliderCoverDur');
  const valCoverDur = document.getElementById('valCoverDur');
  const sliderPauseCover = document.getElementById('sliderPauseCover');
  const valPauseCover = document.getElementById('valPauseCover');
  const sliderFlipDur = document.getElementById('sliderFlipDur');
  const valFlipDur = document.getElementById('valFlipDur');
  const sliderSheetInterval = document.getElementById('sliderSheetInterval');
  const valSheetInterval = document.getElementById('valSheetInterval');
  const sliderEndPause = document.getElementById('sliderEndPause');
  const valEndPause = document.getElementById('valEndPause');
  const btnTestAnimation = document.getElementById('btnTestAnimation');
  const btnResetTimings = document.getElementById('btnResetTimings');

  function updateTimingUI() {
    if (sliderCoverDur) sliderCoverDur.value = timings.coverDuration;
    if (valCoverDur) valCoverDur.textContent = `${Number(timings.coverDuration).toFixed(1)}s`;

    if (sliderPauseCover) sliderPauseCover.value = timings.pauseCover;
    if (valPauseCover) valPauseCover.textContent = `${Number(timings.pauseCover).toFixed(1)}s`;

    if (sliderFlipDur) sliderFlipDur.value = timings.flipDuration;
    if (valFlipDur) valFlipDur.textContent = `${Number(timings.flipDuration).toFixed(1)}s`;

    if (sliderSheetInterval) sliderSheetInterval.value = timings.sheetInterval;
    if (valSheetInterval) valSheetInterval.textContent = `${Number(timings.sheetInterval).toFixed(1)}s`;

    if (sliderEndPause) sliderEndPause.value = timings.endPause;
    if (valEndPause) valEndPause.textContent = `${Number(timings.endPause).toFixed(1)}s`;

    applyTimingsToCSS();
  }

  if (sliderCoverDur) {
    sliderCoverDur.addEventListener('input', (e) => {
      timings.coverDuration = parseFloat(e.target.value);
      if (valCoverDur) valCoverDur.textContent = `${timings.coverDuration.toFixed(1)}s`;
      applyTimingsToCSS();
      saveTimings();
    });
  }

  if (sliderPauseCover) {
    sliderPauseCover.addEventListener('input', (e) => {
      timings.pauseCover = parseFloat(e.target.value);
      if (valPauseCover) valPauseCover.textContent = `${timings.pauseCover.toFixed(1)}s`;
      saveTimings();
    });
  }

  if (sliderFlipDur) {
    sliderFlipDur.addEventListener('input', (e) => {
      timings.flipDuration = parseFloat(e.target.value);
      if (valFlipDur) valFlipDur.textContent = `${timings.flipDuration.toFixed(1)}s`;
      applyTimingsToCSS();
      saveTimings();
    });
  }

  if (sliderSheetInterval) {
    sliderSheetInterval.addEventListener('input', (e) => {
      timings.sheetInterval = parseFloat(e.target.value);
      if (valSheetInterval) valSheetInterval.textContent = `${timings.sheetInterval.toFixed(1)}s`;
      saveTimings();
    });
  }

  if (sliderEndPause) {
    sliderEndPause.addEventListener('input', (e) => {
      timings.endPause = parseFloat(e.target.value);
      if (valEndPause) valEndPause.textContent = `${timings.endPause.toFixed(1)}s`;
      saveTimings();
    });
  }

  if (timingHeader) {
    timingHeader.addEventListener('click', () => {
      if (timingPanel) {
        timingPanel.classList.toggle('is-collapsed');
        if (timingToggle) {
          timingToggle.textContent = timingPanel.classList.contains('is-collapsed') ? '▲' : '▼';
        }
      }
    });
  }

  if (btnResetTimings) {
    btnResetTimings.addEventListener('click', () => {
      timings = { ...defaultTimings };
      updateTimingUI();
      saveTimings();
    });
  }

  if (btnTestAnimation) {
    btnTestAnimation.addEventListener('click', () => {
      testAnimation();
    });
  }

  // ==========================================================================
  // 2. Seleção Aleatória de Imagens das Páginas e Capa
  // ==========================================================================
  function randomizeBookImages() {
    const imgDir = `${base}assets/images/Landing Page/`;

    // Par 1 e 2: Ambos padrão ou ambos variante 'A'
    const usePairA = Math.random() < 0.5;
    const page1File = usePairA ? 'Book Page 1A.png' : 'Book Page 1.png';
    const page2File = usePairA ? 'Book Page 2A.png' : 'Book Page 2.png';

    // Demais páginas e capa: Escolha individual 50/50
    const coverFile = Math.random() < 0.5 ? 'CoverA.png' : 'Cover.jpg';
    const page3File = Math.random() < 0.5 ? 'Book Page 3A.png' : 'Book Page 3.png';
    const page4File = Math.random() < 0.5 ? 'Book Page 4A.png' : 'Book Page 4.png';
    const page5File = Math.random() < 0.5 ? 'Book Page 5A.png' : 'Book Page 5.png';
    const page6File = Math.random() < 0.5 ? 'Book Page 6A.png' : 'Book Page 6.png';

    // Aplicação aos elementos correspondentes
    const coverFront = book ? book.querySelector('.book-cover-front') : null;
    const coverBack = book ? book.querySelector('.book-cover-back') : null;
    const page1Front = book ? book.querySelector('.page-1 .page-front') : null;
    const page1Back = book ? book.querySelector('.page-1 .page-back') : null;
    const page2Front = book ? book.querySelector('.page-2 .page-front') : null;
    const page2Back = book ? book.querySelector('.page-2 .page-back') : null;
    const page3Front = book ? book.querySelector('.page-3 .page-front') : null;

    if (coverFront) coverFront.style.backgroundImage = `url("${encodeURI(imgDir + coverFile)}")`;
    if (coverBack) coverBack.style.backgroundImage = `url("${encodeURI(imgDir + page1File)}")`;
    if (page1Front) page1Front.style.backgroundImage = `url("${encodeURI(imgDir + page2File)}")`;
    if (page1Back) page1Back.style.backgroundImage = `url("${encodeURI(imgDir + page3File)}")`;
    if (page2Front) page2Front.style.backgroundImage = `url("${encodeURI(imgDir + page4File)}")`;
    if (page2Back) page2Back.style.backgroundImage = `url("${encodeURI(imgDir + page5File)}")`;
    if (page3Front) page3Front.style.backgroundImage = `url("${encodeURI(imgDir + page6File)}")`;
  }

  // ==========================================================================
  // 3. Web Audio Sintetizado
  // ==========================================================================
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

  function playChimeSequence() {
    if (!soundEnabled) return;
    try {
      const actx = getAudioContext();
      if (!actx) return;

      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
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

  // ==========================================================================
  // 4. Sequência Dinâmica de Abertura e Fechamento
  // ==========================================================================
  function scheduleTimer(fn, delay) {
    const id = setTimeout(fn, delay);
    pageFlipTimers.push(id);
  }

  function clearPageTimers() {
    pageFlipTimers.forEach(id => clearTimeout(id));
    pageFlipTimers = [];
  }

  function openBook() {
    if (isBookOpen || isAnimating) return;
    isAnimating = true;

    clearPageTimers();
    playRustleSound();

    instructionCallout.style.opacity = '0';
    instructionCallout.style.transform = 'translateY(15px)';

    bookWrap.classList.remove('spread-revealed');

    // 1. Capa se abre (duração controlada via CSS e slider)
    bookWrap.classList.remove('is-closed');
    bookWrap.classList.add('is-open');

    const page1 = book ? book.querySelector('.page-1') : null;
    const page2 = book ? book.querySelector('.page-2') : null;
    const page3 = book ? book.querySelector('.page-3') : null;

    [page1, page2, page3].forEach(p => {
      if (p) {
        p.classList.remove('is-flipped', 'is-flipping');
        p.style.zIndex = '';
      }
    });

    const flipMs = timings.flipDuration * 1000;
    const tPage1 = (timings.coverDuration + timings.pauseCover) * 1000;
    const tPage2 = tPage1 + flipMs + (timings.sheetInterval * 1000);
    const tPage3 = tPage2 + flipMs + (timings.sheetInterval * 1000);
    const tEnd = tPage3 + flipMs + (timings.endPause * 1000);

    // Folha 1 vira
    scheduleTimer(() => {
      playRustleSound();
      if (page1) {
        page1.classList.add('is-flipping');
        page1.classList.add('is-flipped');
        setTimeout(() => {
          page1.classList.remove('is-flipping');
        }, flipMs);
      }
    }, tPage1);

    // Folha 2 vira
    scheduleTimer(() => {
      playRustleSound();
      if (page2) {
        page2.classList.add('is-flipping');
        page2.classList.add('is-flipped');
        setTimeout(() => {
          page2.classList.remove('is-flipping');
        }, flipMs);
      }
    }, tPage2);

    // Folha 3 vira
    scheduleTimer(() => {
      playRustleSound();
      if (page3) {
        page3.classList.add('is-flipping');
        page3.classList.add('is-flipped');
        setTimeout(() => {
          page3.classList.remove('is-flipping');
        }, flipMs);
      }
    }, tPage3);

    // Cenário assentado -> ativa destinos e sinfonia
    scheduleTimer(() => {
      playChimeSequence();
      bookWrap.classList.add('spread-revealed');
      isBookOpen = true;
      isAnimating = false;
      openControls.classList.add('is-visible');
    }, tEnd);
  }

  function closeBook() {
    if (!isBookOpen || isAnimating) return;
    isAnimating = true;

    clearPageTimers();
    playRustleSound();
    openControls.classList.remove('is-visible');

    bookWrap.classList.remove('spread-revealed');

    const page1 = book ? book.querySelector('.page-1') : null;
    const page2 = book ? book.querySelector('.page-2') : null;
    const page3 = book ? book.querySelector('.page-3') : null;

    const flipMs = Math.min(1500, timings.flipDuration * 1000);

    // Folha 3 volta para a direita
    if (page3) {
      page3.classList.add('is-flipping');
      page3.classList.remove('is-flipped');
      setTimeout(() => {
        page3.classList.remove('is-flipping');
      }, flipMs);
    }

    // Folha 2 volta para a direita
    scheduleTimer(() => {
      playRustleSound();
      if (page2) {
        page2.classList.add('is-flipping');
        page2.classList.remove('is-flipped');
        setTimeout(() => {
          page2.classList.remove('is-flipping');
        }, flipMs);
      }
    }, 380);

    // Folha 1 volta para a direita
    scheduleTimer(() => {
      playRustleSound();
      if (page1) {
        page1.classList.add('is-flipping');
        page1.classList.remove('is-flipped');
        setTimeout(() => {
          page1.classList.remove('is-flipping');
        }, flipMs);
      }
    }, 760);

    // Fecha a capa
    const coverCloseDelay = 1250;
    scheduleTimer(() => {
      playRustleSound();
      bookWrap.classList.remove('is-open');
      bookWrap.classList.add('is-closed');
    }, coverCloseDelay);

    const closeTotalTime = coverCloseDelay + (timings.coverDuration * 1000) + 300;
    scheduleTimer(() => {
      isBookOpen = false;
      isAnimating = false;
      instructionCallout.style.opacity = '1';
      instructionCallout.style.transform = 'translateY(0)';
    }, closeTotalTime);
  }

  function testAnimation() {
    if (isAnimating) return;
    if (isBookOpen) {
      closeBook();
      const closeWait = (1.25 + timings.coverDuration + 0.35) * 1000;
      setTimeout(() => {
        randomizeBookImages();
        openBook();
      }, closeWait);
    } else {
      randomizeBookImages();
      openBook();
    }
  }

  // ==========================================================================
  // 5. Eventos do Livro & Controles
  // ==========================================================================
  if (book) {
    book.addEventListener('click', () => {
      if (isBookOpen) return;
      openBook();
    });
  }

  if (instructionCallout) {
    instructionCallout.addEventListener('click', () => {
      if (!isBookOpen) openBook();
    });
  }

  if (btnReplay) btnReplay.addEventListener('click', testAnimation);
  if (btnClose) btnClose.addEventListener('click', closeBook);

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

  if (dialogClose) {
    dialogClose.addEventListener('click', () => {
      if (gameDialog) gameDialog.close();
    });
  }

  if (gameDialog) {
    gameDialog.addEventListener('click', (e) => {
      if (e.target === gameDialog) {
        gameDialog.close();
      }
    });
  }

  // ==========================================================================
  // 6. Badges Automáticos Conforme Conteúdo Disponível
  // ==========================================================================
  function updateSubjectBadges() {
    const serieKey = window.BENA_CONFIG?.serieAtual || '3';
    const serie = window.BENA_CONTEUDO?.[serieKey];
    const activeMaterias = new Set(
      (serie?.materias || [])
        .filter(m => m.temas?.some(t => (t.jogos || []).length > 0))
        .map(m => m.id)
    );

    document.querySelectorAll('.destination-card').forEach(card => {
      const dest = card.dataset.dest;
      const isAvailable = activeMaterias.has(dest);

      if (subjectDestinations[dest]) {
        subjectDestinations[dest].isPlayable = isAvailable;
      }

      let badge = card.querySelector('.destination-badge');
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'destination-badge';
        const info = card.querySelector('.destination-info');
        if (info) info.appendChild(badge);
      }

      if (isAvailable) {
        badge.className = 'destination-badge badge-active';
        badge.textContent = 'DISPONÍVEL';
      } else {
        badge.className = 'destination-badge badge-soon';
        badge.textContent = 'EM BREVE';
      }
    });
  }

  // ==========================================================================
  // 7. Inicialização
  // ==========================================================================
  updateTimingUI();
  randomizeBookImages();
  updateSubjectBadges();

})();
