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

  // Camada de elementos mágicos que fluem para fora das páginas
  const flowingElementsLayer = document.getElementById('flowingElementsLayer');

  // Caminho base dinâmico (raiz ou /paginas/)
  const base = location.pathname.includes('/paginas/') ? '../' : './';

  // Estado da Aplicação
  let isBookOpen = false;
  let isAnimating = false;
  let soundEnabled = true;
  let audioCtx = null;
  let pageFlipTimers = [];
  let currentPairIsA = false;
  let coverFilesCache = null;

  // ==========================================================================
  // 1. Configurações de Tempos & Painel de Testes
  // ==========================================================================
  const defaultTimings = {
    coverDuration: 1.5,
    pauseCover: 0.3,
    flipDuration: 1.5,
    sheetInterval: 0.3,
    endPause: 0,
    animStart0: 0.2,
    animDuration0: 1.85,
    animStart: 0.50,
    animDuration: 1.8
  };

  let timings = { ...defaultTimings };

  // Carrega preferências salvas do localStorage
  try {
    const saved = localStorage.getItem('bena_book_timings');
    if (saved) {
      timings = Object.assign({}, defaultTimings, JSON.parse(saved));
      // Se estava com o padrão anterior de 3s, atualiza para o novo padrão de 1.5s
      if (timings.coverDuration === 3.0) {
        timings.coverDuration = 1.5;
        saveTimings();
      }
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
  const sliderAnimStart0 = document.getElementById('sliderAnimStart0');
  const valAnimStart0 = document.getElementById('valAnimStart0');
  const sliderAnimDuration0 = document.getElementById('sliderAnimDuration0');
  const valAnimDuration0 = document.getElementById('valAnimDuration0');
  const sliderAnimStart = document.getElementById('sliderAnimStart');
  const valAnimStart = document.getElementById('valAnimStart');
  const sliderAnimDuration = document.getElementById('sliderAnimDuration');
  const valAnimDuration = document.getElementById('valAnimDuration');
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

    if (sliderAnimStart0) sliderAnimStart0.value = timings.animStart0;
    if (valAnimStart0) valAnimStart0.textContent = `${Number(timings.animStart0).toFixed(2)}s`;

    if (sliderAnimDuration0) sliderAnimDuration0.value = timings.animDuration0;
    if (valAnimDuration0) valAnimDuration0.textContent = `${Number(timings.animDuration0).toFixed(2)}s`;

    if (sliderAnimStart) sliderAnimStart.value = timings.animStart;
    if (valAnimStart) valAnimStart.textContent = `${Number(timings.animStart).toFixed(2)}s`;

    if (sliderAnimDuration) sliderAnimDuration.value = timings.animDuration;
    if (valAnimDuration) valAnimDuration.textContent = `${Number(timings.animDuration).toFixed(2)}s`;

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

  if (sliderAnimStart0) {
    sliderAnimStart0.addEventListener('input', (e) => {
      timings.animStart0 = parseFloat(e.target.value);
      if (valAnimStart0) valAnimStart0.textContent = `${timings.animStart0.toFixed(2)}s`;
      saveTimings();
    });
  }

  if (sliderAnimDuration0) {
    sliderAnimDuration0.addEventListener('input', (e) => {
      timings.animDuration0 = parseFloat(e.target.value);
      if (valAnimDuration0) valAnimDuration0.textContent = `${timings.animDuration0.toFixed(2)}s`;
      saveTimings();
    });
  }

  if (sliderAnimStart) {
    sliderAnimStart.addEventListener('input', (e) => {
      timings.animStart = parseFloat(e.target.value);
      if (valAnimStart) valAnimStart.textContent = `${timings.animStart.toFixed(2)}s`;
      saveTimings();
    });
  }

  if (sliderAnimDuration) {
    sliderAnimDuration.addEventListener('input', (e) => {
      timings.animDuration = parseFloat(e.target.value);
      if (valAnimDuration) valAnimDuration.textContent = `${timings.animDuration.toFixed(2)}s`;
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
  // Lista estática de capas disponíveis na pasta 'assets/images/Landing Page/'
  const staticCoverOptions = [
    'Cover.jpg',
    'CoverA.png',
    'CoverB.png',
    'CoverC.png',
    'CoverD.png',
    'CoverE.png',
    'CoverF.png',
    'CoverG.png'
  ];

  function randomizeBookImages() {
    const imgDir = `${base}assets/images/Landing Page/`;

    // Par 1 e 2: Ambos padrão ou ambos variante 'A'
    currentPairIsA = Math.random() < 0.5;
    const page1File = currentPairIsA ? 'Book Page 1A.png' : 'Book Page 1.png';
    const page2File = currentPairIsA ? 'Book Page 2A.png' : 'Book Page 2.png';

    // Demais páginas e capa: Escolha individual 50/50
    const coverFile = staticCoverOptions[Math.floor(Math.random() * staticCoverOptions.length)];
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

    // Par final (cenário): escolhe aleatoriamente entre os pares "End Image"
    const endImageCount = 7;
    const endImageIndex = Math.floor(Math.random() * endImageCount) + 1;
    const endLeftFile = `End Image${endImageIndex} - Left.png`;
    const endRightFile = `End Image${endImageIndex} - Right.png`;

    if (coverFront) coverFront.style.backgroundImage = `url("${encodeURI(imgDir + coverFile)}")`;
    if (coverBack) coverBack.style.backgroundImage = `url("${encodeURI(imgDir + page1File)}")`;
    if (page1Front) page1Front.style.backgroundImage = `url("${encodeURI(imgDir + page2File)}")`;
    if (page1Back) page1Back.style.backgroundImage = `url("${encodeURI(imgDir + page3File)}")`;
    if (page2Front) page2Front.style.backgroundImage = `url("${encodeURI(imgDir + page4File)}")`;
    if (page2Back) page2Back.style.backgroundImage = `url("${encodeURI(imgDir + page5File)}")`;
    if (page3Front) page3Front.style.backgroundImage = `url("${encodeURI(imgDir + page6File)}")`;

    const finalLeft = document.querySelector('.final-spread-left');
    const finalRight = document.querySelector('.final-spread-right');
    if (finalLeft) finalLeft.style.backgroundImage = `url("${encodeURI(imgDir + endLeftFile)}")`;
    if (finalRight) finalRight.style.backgroundImage = `url("${encodeURI(imgDir + endRightFile)}")`;
  }

  // ==========================================================================
  // Erupção Mágica: Elementos que Fluem para Fora das Páginas 1 e 2
  // ==========================================================================
  function clearFlowingElements() {
    if (flowingElementsLayer) {
      flowingElementsLayer.innerHTML = '';
    }
  }

  const starWordsList = [
    'estrelas', 'constelação', 'amizade', 'sonho', 'brilho', 'infinito', 
    'universo', 'magia', 'aventura', 'curiosidade', 'luz', 'segredo', 
    'galáxia', 'noite mágica', 'voar', 'sorriso', 'abraço', 'alegria', 
    'história', 'fantasia', 'cometa', 'brincar', 'céu', 'esperança', 
    'viagem', 'coragem', 'mistério', 'poesia', 'imaginação', 'descoberta',
    'astros', 'brilhante', 'caminho', 'lua', 'encanto'
  ];

  const boatWordsList = [
    'barquinho', 'correnteza', 'navegar', 'rio', 'mar', 'ondas', 
    'vento', 'brisa', 'horizonte', 'amigos', 'aventura', 'liberdade', 
    'viagem', 'porto', 'alegria', 'maré', 'farol', 'coragem', 
    'sonhos', 'brincar', 'água viva', 'faz de conta', 'mapa', 'tesouro', 
    'sol', 'pescador', 'sorriso', 'peixinhos', 'imaginação', 'marinheiros',
    'descoberta', 'viagem', 'espuma', 'velejar', 'destino'
  ];

  const fontChoices = [
    "'Fredoka', sans-serif",
    "'Kalam', cursive",
    "'DM Sans', sans-serif",
    "'Space Grotesk', sans-serif",
    "Georgia, serif"
  ];

  const sizeChoices = ['13px', '15px', '17px', '20px', '23px', '27px'];

  function triggerPage1And2Flow(isVariantA) {
    if (!flowingElementsLayer) return;
    clearFlowingElements();

    const frag = document.createDocumentFragment();

    // 1. O Par de Crianças Animadas Brincando (Boy & Girl)
    const duoDiv = document.createElement('div');
    if (!isVariantA) {
      duoDiv.className = 'flow-character-duo duo-stars';
      duoDiv.innerHTML = `
        <svg class="duo-svg" viewBox="0 0 320 180" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="skinGrad1" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#ffdfc4"/>
              <stop offset="100%" stop-color="#f0be9b"/>
            </linearGradient>
            <linearGradient id="girlDress1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#ff8da1"/>
              <stop offset="100%" stop-color="#e04882"/>
            </linearGradient>
            <linearGradient id="boyShirt1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#56ccf2"/>
              <stop offset="100%" stop-color="#2f80ed"/>
            </linearGradient>
            <filter id="glowGold1" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          <!-- Rastro mágico de poeira estelar entre os dois -->
          <path d="M100 80 Q160 25 220 80" stroke="#f4cd65" stroke-width="2.5" stroke-dasharray="5 5" opacity="0.75" fill="none"/>

          <!-- Estrela brilhante lançada e apanhada de um para o outro -->
          <g class="tossed-star">
            <path d="M0 -15 L4.5 -4.5 L15 0 L4.5 4.5 L0 15 L-4.5 4.5 L-15 0 L-4.5 -4.5 Z" fill="#ffffff" stroke="#f4cd65" stroke-width="2" filter="url(#glowGold1)"/>
            <circle cx="0" cy="0" r="4.5" fill="#ffd700"/>
          </g>

          <!-- Menina pulando, com tranças balançando e estendendo a mão -->
          <g class="anim-girl">
            <path class="girl-pigtail-left" d="M54 62 Q32 52 26 74 Q42 84 56 74 Z" fill="#3d2314"/>
            <path class="girl-pigtail-right" d="M86 62 Q108 52 114 74 Q98 84 84 74 Z" fill="#3d2314"/>
            <path d="M62 120 Q54 146 44 156" stroke="#f0be9b" stroke-width="7" stroke-linecap="round"/>
            <circle cx="42" cy="158" r="5" fill="#e04882"/>
            <path d="M78 120 Q86 142 98 150" stroke="#f0be9b" stroke-width="7" stroke-linecap="round"/>
            <circle cx="100" cy="151" r="5" fill="#e04882"/>
            <path d="M58 88 L82 88 L94 124 L46 124 Z" fill="url(#girlDress1)" rx="4"/>
            <path d="M70 102 L72 106 L76 106 L73 109 L74 113 L70 110 L66 113 L67 109 L64 106 L68 106 Z" fill="#fff" opacity="0.9"/>
            <path d="M58 92 Q38 82 42 66" stroke="#f0be9b" stroke-width="6" stroke-linecap="round"/>
            <path d="M82 92 Q104 80 120 68" stroke="#f0be9b" stroke-width="6" stroke-linecap="round"/>
            <circle cx="70" cy="62" r="18" fill="url(#skinGrad1)"/>
            <path d="M52 60 Q70 40 88 60 Q74 50 52 60 Z" fill="#3d2314"/>
            <ellipse cx="64" cy="63" rx="2.5" ry="3" fill="#2d1b10"/>
            <ellipse cx="76" cy="63" rx="2.5" ry="3" fill="#2d1b10"/>
            <path d="M66 70 Q70 76 74 70" stroke="#c0392b" stroke-width="2" fill="none" stroke-linecap="round"/>
            <circle cx="60" cy="68" r="3.5" fill="#ff7eb3" opacity="0.65"/>
            <circle cx="80" cy="68" r="3.5" fill="#ff7eb3" opacity="0.65"/>
          </g>

          <!-- Menino correndo alegremente, pulando e estendendo os braços -->
          <g class="anim-boy">
            <path d="M225 120 Q215 142 205 154" stroke="#f0be9b" stroke-width="7" stroke-linecap="round"/>
            <circle cx="203" cy="156" r="5" fill="#2f80ed"/>
            <path d="M245 120 Q256 142 270 148" stroke="#f0be9b" stroke-width="7" stroke-linecap="round"/>
            <circle cx="272" cy="149" r="5" fill="#2f80ed"/>
            <path d="M220 108 L250 108 L254 125 L216 125 Z" fill="#264653"/>
            <path d="M218 85 L252 85 L250 110 L220 110 Z" fill="url(#boyShirt1)" rx="3"/>
            <path d="M220 90 Q196 78 180 70" stroke="#f0be9b" stroke-width="6" stroke-linecap="round"/>
            <path d="M250 90 Q272 80 280 66" stroke="#f0be9b" stroke-width="6" stroke-linecap="round"/>
            <circle cx="235" cy="58" r="18" fill="url(#skinGrad1)"/>
            <path d="M216 55 Q218 34 235 36 Q254 34 254 52 Q246 44 235 46 Q224 43 216 55 Z" fill="#6d3b14"/>
            <ellipse cx="229" cy="59" rx="2.5" ry="3" fill="#2d1b10"/>
            <ellipse cx="241" cy="59" rx="2.5" ry="3" fill="#2d1b10"/>
            <path d="M231 66 Q235 72 239 66" stroke="#c0392b" stroke-width="2" fill="none" stroke-linecap="round"/>
            <circle cx="225" cy="64" r="3.5" fill="#ff7eb3" opacity="0.65"/>
            <circle cx="245" cy="64" r="3.5" fill="#ff7eb3" opacity="0.65"/>
          </g>
        </svg>
      `;
    } else {
      duoDiv.className = 'flow-character-duo duo-boats';
      duoDiv.innerHTML = `
        <svg class="duo-svg" viewBox="0 0 320 180" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="skinGrad2" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#ffdfc4"/>
              <stop offset="100%" stop-color="#f0be9b"/>
            </linearGradient>
            <linearGradient id="girlBoatDress" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#ffd166"/>
              <stop offset="100%" stop-color="#f3ac8e"/>
            </linearGradient>
            <linearGradient id="boyBoatShirt" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stop-color="#06d6a0"/>
              <stop offset="100%" stop-color="#118ab2"/>
            </linearGradient>
          </defs>

          <!-- Ondas e reflexo d'água fluindo entre eles -->
          <g class="water-ripples">
            <path d="M100 135 Q160 118 220 135" stroke="#56ccf2" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.75"/>
            <path d="M120 145 Q160 132 200 145" stroke="#80deea" stroke-width="2" stroke-linecap="round" fill="none" opacity="0.55"/>
            <circle cx="130" cy="128" r="2.5" fill="#b2ebf2" opacity="0.8"/>
            <circle cx="185" cy="126" r="3" fill="#b2ebf2" opacity="0.8"/>
          </g>

          <!-- Barquinho de papel origami navegando entre os dois -->
          <g class="sailing-boat-between">
            <polygon points="0,8 32,8 26,18 6,18" fill="#ffffff" stroke="#90caf9" stroke-width="1.5"/>
            <polygon points="16,8 16,-15 28,8" fill="#e3f2fd" stroke="#90caf9" stroke-width="1"/>
            <polygon points="16,8 16,-11 4,8" fill="#ffffff" stroke="#90caf9" stroke-width="1"/>
            <polygon points="16,-15 16,-19 22,-17" fill="#ff7eb3"/>
          </g>

          <!-- Menina abaixada empurrando o barquinho com alegria -->
          <g class="anim-girl-boat">
            <path d="M56 122 Q48 144 38 152" stroke="#f0be9b" stroke-width="7" stroke-linecap="round"/>
            <circle cx="36" cy="154" r="5" fill="#06d6a0"/>
            <path d="M74 122 Q82 140 94 146" stroke="#f0be9b" stroke-width="7" stroke-linecap="round"/>
            <circle cx="96" cy="147" r="5" fill="#06d6a0"/>
            <path d="M54 90 L80 90 L90 125 L44 125 Z" fill="url(#girlBoatDress)" rx="4"/>
            <path d="M54 94 Q36 100 40 115" stroke="#f0be9b" stroke-width="6" stroke-linecap="round"/>
            <path d="M80 94 Q98 106 112 116" stroke="#f0be9b" stroke-width="6" stroke-linecap="round"/>
            <circle cx="68" cy="65" r="18" fill="url(#skinGrad2)"/>
            <path d="M50 62 Q68 44 86 62 Q72 52 50 62 Z" fill="#2d1b10"/>
            <path d="M50 56 Q68 48 86 56" stroke="#ff7eb3" stroke-width="3" fill="none"/>
            <ellipse cx="62" cy="66" rx="2.5" ry="3" fill="#2d1b10"/>
            <ellipse cx="74" cy="66" rx="2.5" ry="3" fill="#2d1b10"/>
            <path d="M64 73 Q68 78 72 73" stroke="#c0392b" stroke-width="2" fill="none" stroke-linecap="round"/>
            <circle cx="58" cy="70" r="3.5" fill="#ff7eb3" opacity="0.65"/>
            <circle cx="78" cy="70" r="3.5" fill="#ff7eb3" opacity="0.65"/>
          </g>

          <!-- Menino recebendo o barquinho com as duas mãos -->
          <g class="anim-boy-boat">
            <path d="M228 120 Q218 140 210 152" stroke="#f0be9b" stroke-width="7" stroke-linecap="round"/>
            <circle cx="208" cy="154" r="5" fill="#ff7eb3"/>
            <path d="M246 120 Q258 140 270 146" stroke="#f0be9b" stroke-width="7" stroke-linecap="round"/>
            <circle cx="272" cy="147" r="5" fill="#ff7eb3"/>
            <path d="M222 108 L252 108 L256 124 L218 124 Z" fill="#118ab2"/>
            <path d="M220 86 L254 86 L252 110 L222 110 Z" fill="url(#boyBoatShirt)" rx="3"/>
            <path d="M222 92 Q204 104 196 116" stroke="#f0be9b" stroke-width="6" stroke-linecap="round"/>
            <path d="M252 92 Q270 98 274 112" stroke="#f0be9b" stroke-width="6" stroke-linecap="round"/>
            <circle cx="236" cy="60" r="18" fill="url(#skinGrad2)"/>
            <path d="M218 56 Q220 36 236 38 Q254 36 256 52 Q246 44 236 46 Q226 43 218 56 Z" fill="#4a2e1b"/>
            <ellipse cx="230" cy="61" rx="2.5" ry="3" fill="#2d1b10"/>
            <ellipse cx="242" cy="61" rx="2.5" ry="3" fill="#2d1b10"/>
            <path d="M232 68 Q236 74 240 68" stroke="#c0392b" stroke-width="2" fill="none" stroke-linecap="round"/>
            <circle cx="226" cy="66" r="3.5" fill="#ff7eb3" opacity="0.65"/>
            <circle cx="246" cy="66" r="3.5" fill="#ff7eb3" opacity="0.65"/>
          </g>
        </svg>
      `;
    }
    duoDiv.style.setProperty('--anim-duration', `${timings.animDuration0}s`);
    frag.appendChild(duoDiv);

    // 2. Criação de MUITAS Palavras em Português (34 palavras)
    const wordsSource = isVariantA ? boatWordsList : starWordsList;
    const wordColors = isVariantA
      ? ['#1b6ca8', '#2c7744', '#7b3f00', '#8e3a59', '#2d6a4f', '#4a4e69', '#0d6986']
      : ['#8a5a1e', '#7b241c', '#1b4f72', '#5b2c6f', '#196f3d', '#283747', '#78281f'];

    const wordCount = 34;
    for (let i = 0; i < wordCount; i++) {
      const wordText = wordsSource[i % wordsSource.length];
      const span = document.createElement('span');
      span.className = 'flow-word';
      span.textContent = wordText;

      // 50% na página da esquerda (Página 1), 50% na página da direita (Página 2)
      const onLeftPage = (i % 2 === 0);
      const posX = onLeftPage
        ? (8 + Math.random() * 34)
        : (58 + Math.random() * 34);
      const posY = 18 + Math.random() * 64;

      const font = fontChoices[Math.floor(Math.random() * fontChoices.length)];
      const size = sizeChoices[Math.floor(Math.random() * sizeChoices.length)];
      const color = wordColors[Math.floor(Math.random() * wordColors.length)];

      const dx = (Math.random() * 90 - 45).toFixed(0);
      const dy = (-(90 + Math.random() * 130)).toFixed(0);
      const dz = (70 + Math.random() * 140).toFixed(0);
      const rotStart = (Math.random() * 16 - 8).toFixed(1);
      const rotEnd = (Math.random() * 32 - 16).toFixed(1);
      const maxDelay = timings.animDuration0 * 0.35;
      const delay = (Math.random() * maxDelay).toFixed(2);
      const dur = (timings.animDuration0 - parseFloat(delay)).toFixed(2);

      span.style.left = `${posX.toFixed(1)}%`;
      span.style.top = `${posY.toFixed(1)}%`;
      span.style.fontFamily = font;
      span.style.fontSize = size;
      span.style.color = color;
      span.style.setProperty('--dx', `${dx}px`);
      span.style.setProperty('--dy', `${dy}px`);
      span.style.setProperty('--dz', `${dz}px`);
      span.style.setProperty('--rot-start', `${rotStart}deg`);
      span.style.setProperty('--rot-end', `${rotEnd}deg`);
      span.style.setProperty('--dur', `${dur}s`);
      span.style.setProperty('--delay', `${delay}s`);

      frag.appendChild(span);
    }

    // 3. Criação de Elementos Temáticos (Estrelas ou Barquinhos)
    if (!isVariantA) {
      const starColors = ['#b7950b', '#9a7d0a', '#7d6608', '#8b4513', '#7b241c'];
      for (let s = 0; s < 22; s++) {
        const star = document.createElement('div');
        star.className = 'flow-star';

        const onLeft = (s % 2 === 0);
        const posX = onLeft ? (6 + Math.random() * 38) : (56 + Math.random() * 38);
        const posY = 15 + Math.random() * 70;
        const size = (12 + Math.random() * 18).toFixed(0);
        const color = starColors[Math.floor(Math.random() * starColors.length)];

        const dx = (Math.random() * 80 - 40).toFixed(0);
        const dy = (-(80 + Math.random() * 140)).toFixed(0);
        const dz = (80 + Math.random() * 160).toFixed(0);
        const rot = (Math.random() * 360).toFixed(0);
        const maxDelay = timings.animDuration0 * 0.35;
        const delay = (Math.random() * maxDelay).toFixed(2);
        const dur = (timings.animDuration0 - parseFloat(delay)).toFixed(2);

        star.style.left = `${posX.toFixed(1)}%`;
        star.style.top = `${posY.toFixed(1)}%`;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.color = color;
        star.style.setProperty('--dx', `${dx}px`);
        star.style.setProperty('--dy', `${dy}px`);
        star.style.setProperty('--dz', `${dz}px`);
        star.style.setProperty('--rot', `${rot}deg`);
        star.style.setProperty('--dur', `${dur}s`);
        star.style.setProperty('--delay', `${delay}s`);

        star.innerHTML = `
          <svg viewBox="0 0 24 24" fill="${color}">
            <path d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z"/>
          </svg>
        `;
        frag.appendChild(star);
      }
    } else {
      const boatColors = [
        { hull: '#7b5e3a', sail: '#a0855b', flag: '#8e3a59' },
        { hull: '#4a6741', sail: '#6b9e60', flag: '#2d4a8a' },
        { hull: '#2c4f7c', sail: '#3a6fa8', flag: '#7b3f00' },
        { hull: '#5c3d2e', sail: '#8b6347', flag: '#2d5a27' }
      ];

      for (let b = 0; b < 16; b++) {
        const boat = document.createElement('div');
        boat.className = 'flow-boat';

        const onLeft = (b % 2 === 0);
        const posX = onLeft ? (8 + Math.random() * 36) : (58 + Math.random() * 36);
        const posY = 20 + Math.random() * 65;
        const width = (26 + Math.random() * 18).toFixed(0);
        const height = (width * 0.65).toFixed(0);
        const palette = boatColors[Math.floor(Math.random() * boatColors.length)];

        const dx = (Math.random() * 80 - 40).toFixed(0);
        const dy = (-(70 + Math.random() * 120)).toFixed(0);
        const dz = (60 + Math.random() * 150).toFixed(0);
        const rotStart = (Math.random() * 16 - 8).toFixed(1);
        const rotEnd = (Math.random() * 24 - 12).toFixed(1);
        const maxDelay = timings.animDuration0 * 0.35;
        const delay = (Math.random() * maxDelay).toFixed(2);
        const dur = (timings.animDuration0 - parseFloat(delay)).toFixed(2);

        boat.style.left = `${posX.toFixed(1)}%`;
        boat.style.top = `${posY.toFixed(1)}%`;
        boat.style.width = `${width}px`;
        boat.style.height = `${height}px`;
        boat.style.setProperty('--dx', `${dx}px`);
        boat.style.setProperty('--dy', `${dy}px`);
        boat.style.setProperty('--dz', `${dz}px`);
        boat.style.setProperty('--rot-start', `${rotStart}deg`);
        boat.style.setProperty('--rot-end', `${rotEnd}deg`);
        boat.style.setProperty('--dur', `${dur}s`);
        boat.style.setProperty('--delay', `${delay}s`);

        boat.innerHTML = `
          <svg viewBox="0 0 32 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="1,8 31,8 25,18 7,18" fill="${palette.hull}" stroke="#4a4a5a" stroke-width="1.2"/>
            <polygon points="16,8 16,-1 27,8" fill="${palette.sail}" stroke="#4a4a5a" stroke-width="0.8"/>
            <polygon points="16,8 16,-4 5,8" fill="${palette.hull}" stroke="#4a4a5a" stroke-width="0.8"/>
            <polygon points="16,-1 16,-4 21,-2.5" fill="${palette.flag}"/>
          </svg>
        `;
        frag.appendChild(boat);
      }
    }

    flowingElementsLayer.appendChild(frag);
  }

  // ==========================================================================
  // Erupção Mágica — Elementos das Páginas 3 e 4 (Matemática + Universo + Animais)
  // ==========================================================================
  function triggerPage3And4Flow() {
    if (!flowingElementsLayer) return;
    clearFlowingElements();

    const frag = document.createDocumentFragment();

    // Helper: compute dur/delay scaled to animDuration budget
    function rdd() {
      const delay = parseFloat((Math.random() * timings.animDuration * 0.32).toFixed(2));
      const dur   = parseFloat((timings.animDuration - delay).toFixed(2));
      return { dur, delay };
    }

    // Helper: random position on left or right page
    function rpos(onLeft) {
      const x = onLeft ? (7 + Math.random() * 36) : (57 + Math.random() * 36);
      const y = 16 + Math.random() * 66;
      return { x, y };
    }

    // Helper: build a flow-space or flow-animal div
    function makeEl(cls, svg, w, h, onLeft, rot) {
      const { x, y } = rpos(onLeft);
      const { dur, delay } = rdd();
      const el = document.createElement('div');
      el.className = cls;
      el.style.left  = `${x.toFixed(1)}%`;
      el.style.top   = `${y.toFixed(1)}%`;
      el.style.width  = `${w}px`;
      el.style.height = `${h}px`;
      el.innerHTML = svg;
      const dx = (Math.random() * 80 - 40).toFixed(0);
      const dy = (-(80 + Math.random() * 130)).toFixed(0);
      const dz = (80 + Math.random() * 150).toFixed(0);
      const r  = rot !== undefined ? rot : (Math.random() * 120 - 60).toFixed(0);
      el.style.setProperty('--dx', `${dx}px`);
      el.style.setProperty('--dy', `${dy}px`);
      el.style.setProperty('--dz', `${dz}px`);
      el.style.setProperty('--rot', `${r}deg`);
      el.style.setProperty('--dur', `${dur}s`);
      el.style.setProperty('--delay', `${delay}s`);
      return el;
    }

    // ── 1. Dancing Boy & Girl Duo ─────────────────────────────────────────────
    const duoDiv = document.createElement('div');
    duoDiv.className = 'flow-character-duo duo-dance';
    duoDiv.style.setProperty('--anim-duration', `${timings.animDuration}s`);
    duoDiv.innerHTML = `
      <svg class="duo-svg" viewBox="0 0 320 180" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="skinGrad3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#fddab9"/>
            <stop offset="100%" stop-color="#e8a870"/>
          </linearGradient>
          <linearGradient id="danceDress" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#7b1d82"/>
            <stop offset="100%" stop-color="#4a0e52"/>
          </linearGradient>
          <linearGradient id="danceShirt" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#1a4b8c"/>
            <stop offset="100%" stop-color="#0d3060"/>
          </linearGradient>
        </defs>

        <!-- Musical notes floating between them -->
        <text x="148" y="48" font-size="22" fill="#7d6608" opacity="0.85" font-family="serif">♪</text>
        <text x="168" y="34" font-size="15" fill="#5b2c6f" opacity="0.80" font-family="serif">♫</text>
        <text x="136" y="66" font-size="13" fill="#196f3d" opacity="0.75" font-family="serif">♩</text>

        <!-- ── Girl: twirling dance pose ── -->
        <g class="anim-girl-dance">
          <!-- Wide spinning skirt -->
          <path d="M24 106 Q18 148 22 168 Q42 162 62 160 Q82 162 102 168 Q106 148 100 106 Z" fill="url(#danceDress)"/>
          <ellipse cx="62" cy="140" rx="42" ry="13" fill="#9b2ba0" opacity="0.55"/>
          <!-- Hem highlight -->
          <path d="M22 168 Q42 174 62 172 Q82 174 102 168" stroke="#c060ca" stroke-width="2" fill="none" opacity="0.7"/>
          <!-- Bodice -->
          <path d="M46 84 L78 84 L84 108 L40 108 Z" fill="url(#danceDress)"/>
          <!-- Left arm raised elegantly -->
          <path d="M48 88 Q28 70 16 52" stroke="#e8a870" stroke-width="6" stroke-linecap="round"/>
          <circle cx="14" cy="50" r="4.5" fill="#e8a870"/>
          <!-- Right arm gracefully out -->
          <path d="M76 88 Q98 80 114 76" stroke="#e8a870" stroke-width="6" stroke-linecap="round"/>
          <circle cx="116" cy="75" r="4.5" fill="#e8a870"/>
          <!-- Head -->
          <circle cx="62" cy="62" r="18" fill="url(#skinGrad3)"/>
          <!-- Hair -->
          <path d="M44 58 Q62 38 80 58 Q70 48 62 46 Q54 48 44 58 Z" fill="#2d1b10"/>
          <!-- Hair side flow -->
          <path d="M44 58 Q30 54 26 70" stroke="#2d1b10" stroke-width="4" stroke-linecap="round" fill="none"/>
          <path d="M80 58 Q94 54 98 68" stroke="#2d1b10" stroke-width="4" stroke-linecap="round" fill="none"/>
          <!-- Eyes -->
          <ellipse cx="55" cy="63" rx="2.5" ry="3" fill="#2d1b10"/>
          <ellipse cx="69" cy="63" rx="2.5" ry="3" fill="#2d1b10"/>
          <!-- Smile -->
          <path d="M57 70 Q62 76 67 70" stroke="#c0392b" stroke-width="2" fill="none" stroke-linecap="round"/>
          <!-- Cheeks -->
          <circle cx="49" cy="67" r="3.5" fill="#ff7eb3" opacity="0.6"/>
          <circle cx="75" cy="67" r="3.5" fill="#ff7eb3" opacity="0.6"/>
        </g>

        <!-- ── Boy: dance pose with one arm raised ── -->
        <g class="anim-boy-dance">
          <!-- Left leg front step -->
          <path d="M222 120 Q210 145 202 162" stroke="#e8a870" stroke-width="7" stroke-linecap="round"/>
          <circle cx="200" cy="164" r="5.5" fill="#1a4b8c"/>
          <!-- Right leg back -->
          <path d="M248 120 Q262 144 274 152" stroke="#e8a870" stroke-width="7" stroke-linecap="round"/>
          <circle cx="276" cy="153" r="5.5" fill="#1a4b8c"/>
          <!-- Trousers -->
          <path d="M216 108 L256 108 L260 124 L212 124 Z" fill="#0d1b2e"/>
          <!-- Shirt -->
          <path d="M214 84 L258 84 L256 110 L216 110 Z" fill="url(#danceShirt)"/>
          <!-- Left arm raised HIGH -->
          <path d="M216 88 Q194 64 178 42" stroke="#e8a870" stroke-width="6" stroke-linecap="round"/>
          <circle cx="176" cy="40" r="5" fill="#e8a870"/>
          <!-- Right arm out to side -->
          <path d="M256 88 Q282 96 298 102" stroke="#e8a870" stroke-width="6" stroke-linecap="round"/>
          <circle cx="300" cy="103" r="5" fill="#e8a870"/>
          <!-- Head -->
          <circle cx="237" cy="58" r="18" fill="url(#skinGrad3)"/>
          <!-- Hair -->
          <path d="M218 54 Q220 34 237 36 Q256 34 256 50 Q246 42 237 44 Q228 42 218 54 Z" fill="#4a2e1b"/>
          <!-- Eyes -->
          <ellipse cx="231" cy="58" rx="2.5" ry="3" fill="#2d1b10"/>
          <ellipse cx="243" cy="58" rx="2.5" ry="3" fill="#2d1b10"/>
          <!-- Big smile -->
          <path d="M232 66 Q237 73 242 66" stroke="#c0392b" stroke-width="2.5" fill="none" stroke-linecap="round"/>
          <!-- Cheeks -->
          <circle cx="225" cy="62" r="3.5" fill="#ff7eb3" opacity="0.6"/>
          <circle cx="249" cy="62" r="3.5" fill="#ff7eb3" opacity="0.6"/>
        </g>
      </svg>
    `;
    frag.appendChild(duoDiv);

    // ── 2. Math Symbols (+, −, ×, ÷) — 4 each ───────────────────────────────
    const mathSigns = [
      { char: '+', colors: ['#196f3d', '#0e6655', '#154360', '#7d6608'] },
      { char: '−', colors: ['#78281f', '#641e16', '#4a235a', '#7b241c'] },
      { char: '×', colors: ['#154360', '#1f3a5f', '#283747', '#1a252f'] },
      { char: '÷', colors: ['#7d6608', '#8a5a1e', '#5c2a0e', '#6e4e1e'] }
    ];
    const mathSizes = ['30px', '38px', '46px', '54px'];
    const mathFonts = ["'Space Grotesk', sans-serif", "Georgia, serif", "'DM Sans', sans-serif", "'Fredoka', sans-serif"];

    mathSigns.forEach(({ char, colors }, signIdx) => {
      for (let i = 0; i < 4; i++) {
        const span = document.createElement('span');
        span.className = 'flow-math';
        span.textContent = char;
        const onLeft = ((signIdx * 4 + i) % 2 === 0);
        const { x, y } = rpos(onLeft);
        const { dur, delay } = rdd();
        const dx = (Math.random() * 90 - 45).toFixed(0);
        const dy = (-(85 + Math.random() * 130)).toFixed(0);
        const dz = (70 + Math.random() * 140).toFixed(0);
        const rotStart = (Math.random() * 20 - 10).toFixed(1);
        const rotEnd   = (Math.random() * 40 - 20).toFixed(1);
        span.style.left       = `${x.toFixed(1)}%`;
        span.style.top        = `${y.toFixed(1)}%`;
        span.style.fontSize   = mathSizes[i];
        span.style.fontFamily = mathFonts[i];
        span.style.color      = colors[i];
        span.style.setProperty('--dx', `${dx}px`);
        span.style.setProperty('--dy', `${dy}px`);
        span.style.setProperty('--dz', `${dz}px`);
        span.style.setProperty('--rot-start', `${rotStart}deg`);
        span.style.setProperty('--rot-end',   `${rotEnd}deg`);
        span.style.setProperty('--dur',   `${dur}s`);
        span.style.setProperty('--delay', `${delay}s`);
        frag.appendChild(span);
      }
    });

    // ── 3. Stars (10) ─────────────────────────────────────────────────────────
    const starColors3 = ['#b7950b', '#9a7d0a', '#7d6608', '#8b4513', '#7b241c'];
    for (let s = 0; s < 10; s++) {
      const onLeft = s % 2 === 0;
      const size = (10 + Math.random() * 18).toFixed(0);
      const color = starColors3[s % starColors3.length];
      const el = makeEl('flow-star', `
        <svg viewBox="0 0 24 24" fill="${color}">
          <path d="M12 0 L14.5 9.5 L24 12 L14.5 14.5 L12 24 L9.5 14.5 L0 12 L9.5 9.5 Z"/>
        </svg>`, parseInt(size), parseInt(size), onLeft);
      el.style.color = color;
      frag.appendChild(el);
    }

    // ── 4. Astronomical Objects ───────────────────────────────────────────────

    // The Sun
    frag.appendChild(makeEl('flow-space', `
      <svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <g stroke="#b7790a" stroke-width="3" stroke-linecap="round">
          <line x1="30" y1="4" x2="30" y2="13"/>
          <line x1="30" y1="47" x2="30" y2="56"/>
          <line x1="4" y1="30" x2="13" y2="30"/>
          <line x1="47" y1="30" x2="56" y2="30"/>
          <line x1="11" y1="11" x2="17" y2="17"/>
          <line x1="43" y1="43" x2="49" y2="49"/>
          <line x1="49" y1="11" x2="43" y2="17"/>
          <line x1="17" y1="43" x2="11" y2="49"/>
        </g>
        <circle cx="30" cy="30" r="16" fill="#c8860a"/>
        <circle cx="30" cy="30" r="12" fill="#e8b820"/>
        <circle cx="26" cy="27" r="3" fill="#f4cd65" opacity="0.7"/>
      </svg>`, 52, 52, true, 20));

    // The Moon
    frag.appendChild(makeEl('flow-space', `
      <svg viewBox="0 0 50 60" xmlns="http://www.w3.org/2000/svg">
        <path d="M40 5 Q14 12 14 30 Q14 48 40 55 Q16 52 10 30 Q10 8 40 5 Z" fill="#a8b8c8"/>
        <circle cx="36" cy="18" r="3" fill="#8a9aaa" opacity="0.6"/>
        <circle cx="28" cy="36" r="2" fill="#8a9aaa" opacity="0.6"/>
        <circle cx="38" cy="46" r="2.5" fill="#8a9aaa" opacity="0.6"/>
      </svg>`, 40, 48, false, -15));

    // The Earth
    frag.appendChild(makeEl('flow-space', `
      <svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <circle cx="30" cy="30" r="26" fill="#1a5276"/>
        <path d="M10 20 Q16 15 22 19 Q26 25 22 33 Q18 38 12 36 Q6 30 10 20 Z" fill="#2d7a3a" opacity="0.9"/>
        <path d="M18 38 Q24 36 26 45 Q24 55 18 57 Q12 53 14 44 Z" fill="#2d7a3a" opacity="0.9"/>
        <path d="M32 17 Q38 14 40 20 Q42 27 38 29 Q33 31 31 26 Q29 21 32 17 Z" fill="#2d7a3a" opacity="0.9"/>
        <path d="M34 31 Q42 29 44 39 Q44 51 38 53 Q30 52 30 44 Q28 37 34 31 Z" fill="#2d7a3a" opacity="0.9"/>
        <path d="M18 10 Q30 5 42 10 Q36 16 24 16 Z" fill="#cce8fc" opacity="0.65"/>
      </svg>`, 50, 50, true, 30));

    // A Galaxy
    frag.appendChild(makeEl('flow-space', `
      <svg viewBox="0 0 70 70" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="35" cy="35" rx="30" ry="11" fill="#2d1b6e" opacity="0.35" transform="rotate(-25 35 35)"/>
        <path d="M35 35 Q52 20 62 22 Q56 32 46 38 Q60 40 64 51 Q51 48 43 42 Q48 56 46 63 Q37 54 35 44 Q28 57 20 61 Q22 49 30 42 Q17 44 12 35 Q22 30 32 34 Q20 24 22 14 Q32 18 35 28 Q40 18 49 12 Q47 24 39 30 Z" fill="#4a2d9e" opacity="0.65"/>
        <ellipse cx="35" cy="35" rx="8" ry="8" fill="#6a4dc0"/>
        <circle cx="35" cy="35" r="4" fill="#b898f0"/>
        <circle cx="56" cy="24" r="1.5" fill="#fff" opacity="0.8"/>
        <circle cx="18" cy="46" r="1.5" fill="#fff" opacity="0.8"/>
        <circle cx="52" cy="52" r="1"   fill="#fff" opacity="0.8"/>
        <circle cx="22" cy="20" r="1"   fill="#fff" opacity="0.8"/>
        <circle cx="44" cy="16" r="1"   fill="#fff" opacity="0.7"/>
      </svg>`, 56, 56, false, 45));

    // A Shooting Star
    frag.appendChild(makeEl('flow-space', `
      <svg viewBox="0 0 80 36" xmlns="http://www.w3.org/2000/svg">
        <path d="M0 18 Q40 20 62 18" stroke="#9a7d0a" stroke-width="3" stroke-linecap="round" opacity="0.65" fill="none"/>
        <path d="M12 18 Q42 19 62 18" stroke="#e8d060" stroke-width="1.5" opacity="0.45" fill="none"/>
        <path d="M70 8 L73 16 L80 18 L73 20 L70 28 L67 20 L60 18 L67 16 Z" fill="#c8960c"/>
        <circle cx="70" cy="18" r="3" fill="#f0e860" opacity="0.85"/>
      </svg>`, 66, 30, true, 0));

    // ── 5. Animals ────────────────────────────────────────────────────────────

    // Fish
    frag.appendChild(makeEl('flow-animal', `
      <svg viewBox="0 0 64 40" xmlns="http://www.w3.org/2000/svg">
        <path d="M48 20 L64 10 L64 30 Z" fill="#0e4f68"/>
        <ellipse cx="28" cy="20" rx="22" ry="14" fill="#1a6b8a"/>
        <path d="M22 10 Q30 4 38 10" fill="#1e8bc3" opacity="0.8"/>
        <circle cx="13" cy="16" r="4.5" fill="#fff"/>
        <circle cx="13" cy="16" r="2.5" fill="#0a2030"/>
        <circle cx="14" cy="15" r="1" fill="#fff" opacity="0.7"/>
      </svg>`, 56, 35, false, 10));

    // Lion
    frag.appendChild(makeEl('flow-animal', `
      <svg viewBox="0 0 80 78" xmlns="http://www.w3.org/2000/svg">
        <circle cx="40" cy="34" r="30" fill="#7a5108"/>
        <circle cx="40" cy="34" r="22" fill="#b88010"/>
        <circle cx="40" cy="34" r="15" fill="#e0a830"/>
        <ellipse cx="36" cy="31" rx="3" ry="3.5" fill="#2d1b10"/>
        <ellipse cx="44" cy="31" rx="3" ry="3.5" fill="#2d1b10"/>
        <circle cx="36" cy="30" r="1.2" fill="#fff" opacity="0.6"/>
        <circle cx="44" cy="30" r="1.2" fill="#fff" opacity="0.6"/>
        <ellipse cx="40" cy="37" rx="4" ry="2.5" fill="#b03020"/>
        <path d="M36 40 Q40 45 44 40" stroke="#5d0000" stroke-width="1.5" fill="none"/>
        <circle cx="18" cy="12" r="8" fill="#7a5108"/>
        <circle cx="62" cy="12" r="8" fill="#7a5108"/>
        <ellipse cx="40" cy="66" rx="18" ry="10" fill="#b88010"/>
        <path d="M57 62 Q74 53 72 40" stroke="#7a5108" stroke-width="4" stroke-linecap="round" fill="none"/>
        <circle cx="72" cy="40" r="5" fill="#7a5108"/>
      </svg>`, 60, 60, true, -20));

    // Bird 1
    frag.appendChild(makeEl('flow-animal', `
      <svg viewBox="0 0 40 28" xmlns="http://www.w3.org/2000/svg">
        <path d="M20 18 Q8 10 0 6 Q10 6 16 12 Q12 3 20 0 Q28 3 24 12 Q30 6 40 6 Q32 10 20 18 Z" fill="#3d5a27"/>
        <circle cx="20" cy="18" r="4" fill="#4a6b32"/>
        <circle cx="18" cy="17" r="1.5" fill="#1a2510"/>
      </svg>`, 34, 24, false, 0));

    // Bird 2
    frag.appendChild(makeEl('flow-animal', `
      <svg viewBox="0 0 36 26" xmlns="http://www.w3.org/2000/svg">
        <path d="M18 16 Q7 9 0 5 Q9 5 14 11 Q11 3 18 0 Q25 3 22 11 Q27 5 36 5 Q29 9 18 16 Z" fill="#2d4a8a"/>
        <circle cx="18" cy="16" r="3.5" fill="#3a5fa8"/>
        <circle cx="16" cy="15" r="1.2" fill="#101830"/>
      </svg>`, 30, 22, true, 10));

    // Bird 3
    frag.appendChild(makeEl('flow-animal', `
      <svg viewBox="0 0 38 27" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 17 Q8 10 0 6 Q10 6 15 12 Q12 3 19 0 Q26 3 23 12 Q28 6 38 6 Q30 10 19 17 Z" fill="#7b3f00"/>
        <circle cx="19" cy="17" r="3.8" fill="#964e10"/>
        <circle cx="17" cy="16" r="1.3" fill="#2d1500"/>
      </svg>`, 32, 23, false, -8));

    // Elephant
    frag.appendChild(makeEl('flow-animal', `
      <svg viewBox="0 0 90 80" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="52" cy="52" rx="30" ry="22" fill="#5d6d7e"/>
        <circle cx="24" cy="36" r="18" fill="#6d7d8e"/>
        <ellipse cx="7" cy="36" rx="10" ry="16" fill="#4a5a6a"/>
        <path d="M14 46 Q6 58 10 70 Q18 74 18 62 Q20 72 26 68 Q28 57 20 46 Z" fill="#6d7d8e"/>
        <circle cx="19" cy="30" r="3.5" fill="#1a252f"/>
        <circle cx="19" cy="30" r="1.8" fill="#fff"/>
        <path d="M10 50 Q2 57 6 64" stroke="#dedad0" stroke-width="3.5" stroke-linecap="round" fill="none"/>
        <rect x="34" y="68" width="10" height="14" rx="4" fill="#4a5a6a"/>
        <rect x="48" y="68" width="10" height="14" rx="4" fill="#4a5a6a"/>
        <rect x="62" y="68" width="10" height="14" rx="4" fill="#4a5a6a"/>
        <path d="M82 50 Q94 46 92 58" stroke="#4a5a6a" stroke-width="3.5" stroke-linecap="round" fill="none"/>
      </svg>`, 70, 62, true, 0));

    // Whale
    frag.appendChild(makeEl('flow-animal', `
      <svg viewBox="0 0 90 58" xmlns="http://www.w3.org/2000/svg">
        <path d="M10 28 Q14 10 50 14 Q80 14 85 28 Q80 44 50 44 Q14 46 10 28 Z" fill="#1a3a5c"/>
        <path d="M80 28 L96 16 L90 28 L96 40 Z" fill="#122d4a"/>
        <path d="M20 28 Q50 42 75 30" stroke="#3a6ea8" stroke-width="4.5" fill="none" opacity="0.65"/>
        <circle cx="20" cy="22" r="4.5" fill="#fff"/>
        <circle cx="20" cy="22" r="2.8" fill="#0a1a2c"/>
        <circle cx="21" cy="21" r="1" fill="#fff" opacity="0.7"/>
        <path d="M40 13 Q43 3 45 0 Q47 4 49 8 Q47 11 44 13 Z" fill="#5a9ecc" opacity="0.75"/>
        <path d="M55 44 Q60 56 50 56 Q44 56 55 44 Z" fill="#122d4a"/>
      </svg>`, 70, 46, false, 0));

    flowingElementsLayer.appendChild(frag);
  }

  // ==========================================================================
  // Erupção Mágica — Elementos das Páginas 5 e 6 (Esportes + Veículos + Palavras EN)
  // ==========================================================================
  function triggerPage5And6Flow() {
    if (!flowingElementsLayer) return;
    clearFlowingElements();

    const frag = document.createDocumentFragment();

    function rdd() {
      const delay = parseFloat((Math.random() * timings.animDuration * 0.32).toFixed(2));
      const dur   = parseFloat((timings.animDuration - delay).toFixed(2));
      return { dur, delay };
    }

    function rpos(onLeft) {
      const x = onLeft ? (7 + Math.random() * 36) : (57 + Math.random() * 36);
      const y = 16 + Math.random() * 66;
      return { x, y };
    }

    function makeEl(cls, svg, w, h, onLeft, rot) {
      const { x, y } = rpos(onLeft);
      const { dur, delay } = rdd();
      const el = document.createElement('div');
      el.className = cls;
      el.style.left   = `${x.toFixed(1)}%`;
      el.style.top    = `${y.toFixed(1)}%`;
      el.style.width  = `${w}px`;
      el.style.height = `${h}px`;
      el.innerHTML = svg;
      const dx = (Math.random() * 80 - 40).toFixed(0);
      const dy = (-(80 + Math.random() * 130)).toFixed(0);
      const dz = (80 + Math.random() * 150).toFixed(0);
      const r  = rot !== undefined ? rot : (Math.random() * 120 - 60).toFixed(0);
      el.style.setProperty('--dx', `${dx}px`);
      el.style.setProperty('--dy', `${dy}px`);
      el.style.setProperty('--dz', `${dz}px`);
      el.style.setProperty('--rot', `${r}deg`);
      el.style.setProperty('--dur', `${dur}s`);
      el.style.setProperty('--delay', `${delay}s`);
      return el;
    }

    // ── 1. Running Boy & Girl Duo ─────────────────────────────────────────────
    const duoDiv = document.createElement('div');
    duoDiv.className = 'flow-character-duo duo-run';
    duoDiv.style.setProperty('--anim-duration', `${timings.animDuration}s`);
    duoDiv.innerHTML = `
      <svg class="duo-svg" viewBox="0 0 320 180" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="skinGrad5" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#fddab9"/>
            <stop offset="100%" stop-color="#e8a870"/>
          </linearGradient>
          <linearGradient id="runShirt" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#c0392b"/>
            <stop offset="100%" stop-color="#922b21"/>
          </linearGradient>
          <linearGradient id="runDress" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#2471a3"/>
            <stop offset="100%" stop-color="#154360"/>
          </linearGradient>
        </defs>

        <!-- Speed lines -->
        <line x1="130" y1="80" x2="175" y2="80" stroke="#7d6608" stroke-width="2" stroke-dasharray="4 4" opacity="0.6"/>
        <line x1="135" y1="90" x2="178" y2="90" stroke="#7d6608" stroke-width="1.5" stroke-dasharray="3 5" opacity="0.45"/>

        <!-- ── Girl running (left) ── -->
        <g class="anim-girl-run">
          <!-- Back leg (extended behind) -->
          <path d="M62 118 Q50 138 38 152" stroke="#e8a870" stroke-width="7" stroke-linecap="round"/>
          <circle cx="36" cy="154" r="5" fill="#154360"/>
          <!-- Front leg (extended forward) -->
          <path d="M72 118 Q84 134 98 140" stroke="#e8a870" stroke-width="7" stroke-linecap="round"/>
          <circle cx="100" cy="141" r="5" fill="#154360"/>
          <!-- Shorts/skirt -->
          <path d="M50 102 L84 102 L88 120 L46 120 Z" fill="#1a5276"/>
          <!-- Shirt -->
          <path d="M48 78 L82 78 L80 104 L50 104 Z" fill="url(#runDress)"/>
          <!-- Back arm (pumping back) -->
          <path d="M82 82 Q102 68 114 58" stroke="#e8a870" stroke-width="6" stroke-linecap="round"/>
          <circle cx="116" cy="57" r="4.5" fill="#e8a870"/>
          <!-- Front arm (pumping forward) -->
          <path d="M50 82 Q32 66 22 54" stroke="#e8a870" stroke-width="6" stroke-linecap="round"/>
          <circle cx="20" cy="52" r="4.5" fill="#e8a870"/>
          <!-- Head (slightly forward lean) -->
          <circle cx="64" cy="57" r="17" fill="url(#skinGrad5)"/>
          <!-- Ponytail streaming back -->
          <path d="M80 52 Q100 46 112 50" stroke="#2d1b10" stroke-width="5" stroke-linecap="round" fill="none"/>
          <!-- Hair -->
          <path d="M47 54 Q64 36 81 54 Q70 44 64 43 Q56 44 47 54 Z" fill="#2d1b10"/>
          <!-- Eyes -->
          <ellipse cx="58" cy="57" rx="2.5" ry="3" fill="#2d1b10"/>
          <ellipse cx="70" cy="57" rx="2.5" ry="3" fill="#2d1b10"/>
          <!-- Determined smile -->
          <path d="M60 65 Q64 69 68 65" stroke="#c0392b" stroke-width="2" fill="none" stroke-linecap="round"/>
          <!-- Cheeks -->
          <circle cx="52" cy="61" r="3" fill="#ff7eb3" opacity="0.55"/>
          <circle cx="76" cy="61" r="3" fill="#ff7eb3" opacity="0.55"/>
        </g>

        <!-- ── Boy running (right) ── -->
        <g class="anim-boy-run">
          <!-- Back leg (extended back and up) -->
          <path d="M228 118 Q214 136 200 148" stroke="#e8a870" stroke-width="7" stroke-linecap="round"/>
          <circle cx="198" cy="150" r="5" fill="#922b21"/>
          <!-- Front leg (striding forward) -->
          <path d="M248 118 Q264 132 278 136" stroke="#e8a870" stroke-width="7" stroke-linecap="round"/>
          <circle cx="280" cy="137" r="5" fill="#922b21"/>
          <!-- Shorts -->
          <path d="M218 106 L256 106 L260 122 L214 122 Z" fill="#0d1b2e"/>
          <!-- Shirt -->
          <path d="M216 82 L258 82 L256 108 L218 108 Z" fill="url(#runShirt)"/>
          <!-- Back arm (pumping back) -->
          <path d="M218 86 Q238 70 252 56" stroke="#e8a870" stroke-width="6" stroke-linecap="round"/>
          <circle cx="253" cy="54" r="4.5" fill="#e8a870"/>
          <!-- Front arm (pumping forward) -->
          <path d="M256 86 Q272 68 284 54" stroke="#e8a870" stroke-width="6" stroke-linecap="round"/>
          <circle cx="286" cy="52" r="4.5" fill="#e8a870"/>
          <!-- Head (forward lean) -->
          <circle cx="236" cy="56" r="17" fill="url(#skinGrad5)"/>
          <!-- Hair -->
          <path d="M218 52 Q220 33 236 35 Q254 33 254 49 Q244 41 236 43 Q228 41 218 52 Z" fill="#4a2e1b"/>
          <!-- Eyes (focused forward) -->
          <ellipse cx="230" cy="56" rx="2.5" ry="3" fill="#2d1b10"/>
          <ellipse cx="242" cy="56" rx="2.5" ry="3" fill="#2d1b10"/>
          <!-- Determined mouth -->
          <path d="M232 64 Q236 68 240 64" stroke="#c0392b" stroke-width="2" fill="none" stroke-linecap="round"/>
          <!-- Cheeks -->
          <circle cx="224" cy="60" r="3" fill="#ff7eb3" opacity="0.5"/>
          <circle cx="248" cy="60" r="3" fill="#ff7eb3" opacity="0.5"/>
        </g>
      </svg>
    `;
    frag.appendChild(duoDiv);

    // ── 2. Sports Balls ───────────────────────────────────────────────────────

    // Basketball (×2)
    for (let i = 0; i < 2; i++) {
      frag.appendChild(makeEl('flow-space', `
        <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
          <circle cx="25" cy="25" r="23" fill="#c45e00"/>
          <circle cx="25" cy="25" r="23" fill="none" stroke="#6b3200" stroke-width="1.5"/>
          <path d="M2 25 Q25 10 48 25" stroke="#6b3200" stroke-width="1.5" fill="none"/>
          <path d="M2 25 Q25 40 48 25" stroke="#6b3200" stroke-width="1.5" fill="none"/>
          <line x1="25" y1="2" x2="25" y2="48" stroke="#6b3200" stroke-width="1.5"/>
        </svg>`, 44, 44, i % 2 === 0));
    }

    // Football/American Football (×2)
    for (let i = 0; i < 2; i++) {
      frag.appendChild(makeEl('flow-space', `
        <svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="30" cy="20" rx="28" ry="17" fill="#7b4010"/>
          <ellipse cx="30" cy="20" rx="28" ry="17" fill="none" stroke="#4a2808" stroke-width="1.5"/>
          <line x1="10" y1="20" x2="50" y2="20" stroke="#e8e0d0" stroke-width="2"/>
          <line x1="20" y1="14" x2="20" y2="26" stroke="#e8e0d0" stroke-width="1.5"/>
          <line x1="30" y1="12" x2="30" y2="28" stroke="#e8e0d0" stroke-width="1.5"/>
          <line x1="40" y1="14" x2="40" y2="26" stroke="#e8e0d0" stroke-width="1.5"/>
        </svg>`, 52, 35, i % 2 === 0, 20));
    }

    // Soccer Ball (×2)
    for (let i = 0; i < 2; i++) {
      frag.appendChild(makeEl('flow-space', `
        <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
          <circle cx="25" cy="25" r="23" fill="#f0f0f0"/>
          <polygon points="25,6 30,14 20,14" fill="#1a1a1a"/>
          <polygon points="25,44 30,36 20,36" fill="#1a1a1a"/>
          <polygon points="6,25 14,20 14,30" fill="#1a1a1a"/>
          <polygon points="44,25 36,20 36,30" fill="#1a1a1a"/>
          <polygon points="10,10 18,14 14,20" fill="#1a1a1a"/>
          <polygon points="40,10 32,14 36,20" fill="#1a1a1a"/>
          <polygon points="10,40 18,36 14,30" fill="#1a1a1a"/>
          <polygon points="40,40 32,36 36,30" fill="#1a1a1a"/>
        </svg>`, 44, 44, i % 2 === 0));
    }

    // Volleyball (×2)
    for (let i = 0; i < 2; i++) {
      frag.appendChild(makeEl('flow-space', `
        <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
          <circle cx="25" cy="25" r="23" fill="#f5f0e8"/>
          <path d="M5 18 Q25 12 45 18" stroke="#1a4b8c" stroke-width="2" fill="none"/>
          <path d="M5 32 Q25 38 45 32" stroke="#1a4b8c" stroke-width="2" fill="none"/>
          <path d="M14 5 Q20 25 14 45" stroke="#c0392b" stroke-width="2" fill="none"/>
          <path d="M36 5 Q30 25 36 45" stroke="#196f3d" stroke-width="2" fill="none"/>
        </svg>`, 44, 44, i % 2 === 0));
    }

    // Tennis Ball (×2)
    for (let i = 0; i < 2; i++) {
      frag.appendChild(makeEl('flow-space', `
        <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
          <circle cx="25" cy="25" r="23" fill="#8bc34a"/>
          <path d="M6 16 Q18 25 6 34" stroke="#f0f0f0" stroke-width="3" fill="none"/>
          <path d="M44 16 Q32 25 44 34" stroke="#f0f0f0" stroke-width="3" fill="none"/>
        </svg>`, 40, 40, i % 2 === 0));
    }

    // ── 3. Vehicles ───────────────────────────────────────────────────────────

    // Cars (×3)
    const carColors = ['#c0392b', '#1a4b8c', '#196f3d'];
    for (let i = 0; i < 3; i++) {
      frag.appendChild(makeEl('flow-animal', `
        <svg viewBox="0 0 80 44" xmlns="http://www.w3.org/2000/svg">
          <!-- Body -->
          <rect x="4" y="18" width="72" height="20" rx="4" fill="${carColors[i]}"/>
          <!-- Cabin -->
          <path d="M18 18 Q22 6 38 6 L52 6 Q68 6 62 18 Z" fill="${carColors[i]}"/>
          <!-- Windows -->
          <path d="M22 16 Q24 8 36 8 L50 8 Q60 8 58 16 Z" fill="#b8d4e8" opacity="0.85"/>
          <line x1="40" y1="8" x2="40" y2="16" stroke="#7a9eb8" stroke-width="1.5"/>
          <!-- Wheels -->
          <circle cx="18" cy="38" r="7" fill="#1a1a2e"/>
          <circle cx="18" cy="38" r="4" fill="#5a5a6e"/>
          <circle cx="62" cy="38" r="7" fill="#1a1a2e"/>
          <circle cx="62" cy="38" r="4" fill="#5a5a6e"/>
          <!-- Headlight -->
          <rect x="70" y="22" width="6" height="4" rx="2" fill="#f4cd65"/>
          <!-- Taillight -->
          <rect x="4" y="22" width="5" height="4" rx="2" fill="#c0392b"/>
        </svg>`, 72, 40, i % 2 === 0, 0));
    }

    // Buses (×3)
    const busColors = ['#e8b820', '#2471a3', '#196f3d'];
    for (let i = 0; i < 3; i++) {
      frag.appendChild(makeEl('flow-animal', `
        <svg viewBox="0 0 90 50" xmlns="http://www.w3.org/2000/svg">
          <!-- Body -->
          <rect x="2" y="8" width="86" height="34" rx="5" fill="${busColors[i]}"/>
          <!-- Roof -->
          <rect x="4" y="6" width="82" height="6" rx="3" fill="${busColors[i]}"/>
          <!-- Windows row -->
          <rect x="10" y="12" width="12" height="10" rx="2" fill="#b8d4e8" opacity="0.85"/>
          <rect x="26" y="12" width="12" height="10" rx="2" fill="#b8d4e8" opacity="0.85"/>
          <rect x="42" y="12" width="12" height="10" rx="2" fill="#b8d4e8" opacity="0.85"/>
          <rect x="58" y="12" width="12" height="10" rx="2" fill="#b8d4e8" opacity="0.85"/>
          <!-- Door -->
          <rect x="72" y="14" width="10" height="16" rx="2" fill="${busColors[i]}"/>
          <line x1="77" y1="14" x2="77" y2="30" stroke="#0d1b2e" stroke-width="1.2"/>
          <!-- Stripe -->
          <rect x="2" y="24" width="86" height="4" rx="0" fill="#0d1b2e" opacity="0.25"/>
          <!-- Wheels -->
          <circle cx="18" cy="44" r="7" fill="#1a1a2e"/>
          <circle cx="18" cy="44" r="4" fill="#5a5a6e"/>
          <circle cx="72" cy="44" r="7" fill="#1a1a2e"/>
          <circle cx="72" cy="44" r="4" fill="#5a5a6e"/>
        </svg>`, 80, 46, i % 2 === 0, 0));
    }

    // Bikes (×4)
    const bikeColors = ['#c0392b', '#1a4b8c', '#196f3d', '#7d6608'];
    for (let i = 0; i < 4; i++) {
      frag.appendChild(makeEl('flow-animal', `
        <svg viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg">
          <!-- Rear wheel -->
          <circle cx="12" cy="28" r="11" fill="none" stroke="#1a1a2e" stroke-width="3"/>
          <circle cx="12" cy="28" r="5" fill="none" stroke="#5a5a6e" stroke-width="2"/>
          <!-- Spokes rear -->
          <line x1="12" y1="17" x2="12" y2="39" stroke="#5a5a6e" stroke-width="1.2"/>
          <line x1="1" y1="28" x2="23" y2="28" stroke="#5a5a6e" stroke-width="1.2"/>
          <!-- Front wheel -->
          <circle cx="48" cy="28" r="11" fill="none" stroke="#1a1a2e" stroke-width="3"/>
          <circle cx="48" cy="28" r="5" fill="none" stroke="#5a5a6e" stroke-width="2"/>
          <!-- Spokes front -->
          <line x1="48" y1="17" x2="48" y2="39" stroke="#5a5a6e" stroke-width="1.2"/>
          <line x1="37" y1="28" x2="59" y2="28" stroke="#5a5a6e" stroke-width="1.2"/>
          <!-- Frame -->
          <path d="M12 28 L26 12 L38 28 L12 28 Z" fill="none" stroke="${bikeColors[i]}" stroke-width="2.5"/>
          <path d="M38 28 L48 28" fill="none" stroke="${bikeColors[i]}" stroke-width="2.5"/>
          <path d="M26 12 L48 22" fill="none" stroke="${bikeColors[i]}" stroke-width="2.5"/>
          <!-- Seat -->
          <path d="M22 8 L30 8" stroke="#1a1a2e" stroke-width="3" stroke-linecap="round"/>
          <line x1="26" y1="8" x2="26" y2="12" stroke="${bikeColors[i]}" stroke-width="2"/>
          <!-- Handlebar -->
          <line x1="48" y1="22" x2="48" y2="16" stroke="${bikeColors[i]}" stroke-width="2"/>
          <path d="M44 14 L52 14" stroke="#1a1a2e" stroke-width="2.5" stroke-linecap="round"/>
          <!-- Pedal -->
          <circle cx="30" cy="26" r="3" fill="${bikeColors[i]}"/>
        </svg>`, 52, 36, i % 2 === 0, 0));
    }

    // ── 4. Whiteboards (×2) ───────────────────────────────────────────────────
    for (let i = 0; i < 2; i++) {
      const eq = i === 0
        ? `<text x="8" y="28" font-size="9" fill="#1a4b8c" font-family="monospace">2 + 3 = 5</text>
           <text x="8" y="40" font-size="8" fill="#196f3d" font-family="monospace">A B C D</text>`
        : `<text x="8" y="28" font-size="9" fill="#c0392b" font-family="monospace">5 × 4 = 20</text>
           <text x="8" y="40" font-size="8" fill="#7d6608" font-family="monospace">Hello!</text>`;
      frag.appendChild(makeEl('flow-animal', `
        <svg viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg">
          <!-- Board -->
          <rect x="2" y="4" width="76" height="50" rx="3" fill="#f5f5f0" stroke="#2d2d2d" stroke-width="2.5"/>
          <!-- Frame top -->
          <rect x="2" y="4" width="76" height="6" rx="3" fill="#4a3520"/>
          <!-- Equations -->
          ${eq}
          <!-- Tray at bottom -->
          <rect x="2" y="50" width="76" height="5" rx="2" fill="#4a3520"/>
          <!-- Legs -->
          <line x1="15" y1="54" x2="12" y2="60" stroke="#4a3520" stroke-width="3" stroke-linecap="round"/>
          <line x1="65" y1="54" x2="68" y2="60" stroke="#4a3520" stroke-width="3" stroke-linecap="round"/>
        </svg>`, 68, 52, i % 2 === 0, 5));
    }

    // ── 5. LOTS of English Words ──────────────────────────────────────────────
    const englishWords = [
      'run', 'jump', 'play', 'learn', 'read', 'write', 'math', 'science',
      'music', 'art', 'sport', 'team', 'game', 'win', 'goal', 'fast',
      'strong', 'smart', 'brave', 'fun', 'school', 'friends', 'books',
      'class', 'teach', 'think', 'dream', 'grow', 'laugh', 'sing',
      'explore', 'create', 'imagine', 'build', 'share', 'shine', 'star',
      'sky', 'world', 'nature', 'wonder', 'magic', 'happy', 'bright',
      'color', 'rainbow', 'treasure', 'adventure', 'discover', 'believe'
    ];
    const wordColors5 = [
      '#8a5a1e', '#7b241c', '#1b4f72', '#5b2c6f', '#196f3d',
      '#283747', '#78281f', '#0e6655', '#1a4b8c', '#7d6608'
    ];
    const fontChoices5 = [
      "'Fredoka', sans-serif",
      "'Kalam', cursive",
      "'DM Sans', sans-serif",
      "'Space Grotesk', sans-serif",
      "Georgia, serif"
    ];
    const sizeChoices5 = ['12px', '14px', '17px', '20px', '24px', '28px'];

    for (let i = 0; i < 42; i++) {
      const span = document.createElement('span');
      span.className = 'flow-word';
      span.textContent = englishWords[i % englishWords.length];
      const onLeft = i % 2 === 0;
      const posX = onLeft ? (7 + Math.random() * 36) : (57 + Math.random() * 36);
      const posY = 16 + Math.random() * 66;
      const { dur, delay } = rdd();
      const dx = (Math.random() * 90 - 45).toFixed(0);
      const dy = (-(85 + Math.random() * 130)).toFixed(0);
      const dz = (70 + Math.random() * 140).toFixed(0);
      const rotStart = (Math.random() * 16 - 8).toFixed(1);
      const rotEnd   = (Math.random() * 32 - 16).toFixed(1);
      span.style.left       = `${posX.toFixed(1)}%`;
      span.style.top        = `${posY.toFixed(1)}%`;
      span.style.fontFamily = fontChoices5[Math.floor(Math.random() * fontChoices5.length)];
      span.style.fontSize   = sizeChoices5[Math.floor(Math.random() * sizeChoices5.length)];
      span.style.color      = wordColors5[Math.floor(Math.random() * wordColors5.length)];
      span.style.setProperty('--dx', `${dx}px`);
      span.style.setProperty('--dy', `${dy}px`);
      span.style.setProperty('--dz', `${dz}px`);
      span.style.setProperty('--rot-start', `${rotStart}deg`);
      span.style.setProperty('--rot-end',   `${rotEnd}deg`);
      span.style.setProperty('--dur',   `${dur}s`);
      span.style.setProperty('--delay', `${delay}s`);
      frag.appendChild(span);
    }

    flowingElementsLayer.appendChild(frag);
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

    // Erupção de elementos mágicos que fluem para fora das páginas 1 e 2
    scheduleTimer(() => {
      triggerPage1And2Flow(currentPairIsA);
    }, timings.animStart0 * 1000);

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

    // Erupção de elementos mágicos das páginas 3 e 4
    scheduleTimer(() => {
      triggerPage3And4Flow();
    }, tPage1 + timings.animStart * 1000);

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

    // Erupção de elementos mágicos das páginas 5 e 6
    scheduleTimer(() => {
      triggerPage5And6Flow();
    }, tPage2 + timings.animStart * 1000);

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
    clearFlowingElements();
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

  async function testAnimation() {
    if (isAnimating) return;
    clearFlowingElements();
    if (isBookOpen) {
      closeBook();
      const closeWait = (1.25 + timings.coverDuration + 0.35) * 1000;
      setTimeout(async () => {
        await randomizeBookImages();
        openBook();
      }, closeWait);
    } else {
      await randomizeBookImages();
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
