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

  // ==========================================================================
  // 1. Configurações de Tempos & Painel de Testes
  // ==========================================================================
  const defaultTimings = {
    coverDuration: 1.5,
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
    currentPairIsA = Math.random() < 0.5;
    const page1File = currentPairIsA ? 'Book Page 1A.png' : 'Book Page 1.png';
    const page2File = currentPairIsA ? 'Book Page 2A.png' : 'Book Page 2.png';

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
    frag.appendChild(duoDiv);

    // 2. Criação de MUITAS Palavras em Português (34 palavras)
    const wordsSource = isVariantA ? boatWordsList : starWordsList;
    const wordColors = isVariantA
      ? ['#56ccf2', '#ffffff', '#e0f7fa', '#f3ac8e', '#ffd166', '#80deea', '#06d6a0']
      : ['#f4cd65', '#ffffff', '#ffd166', '#dcabc3', '#f3ac8e', '#a9e6b6', '#fff9e6'];

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
      const dur = (2.2 + Math.random() * 1.0).toFixed(2);
      const delay = (0.05 + Math.random() * 0.75).toFixed(2);

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
      const starColors = ['#fff', '#f4cd65', '#ffd700', '#f3ac8e', '#dcabc3'];
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
        const dur = (2.0 + Math.random() * 1.2).toFixed(2);
        const delay = (Math.random() * 0.7).toFixed(2);

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
        { hull: '#ffffff', sail: '#e3f2fd', flag: '#ff7eb3' },
        { hull: '#fff9c4', sail: '#fffde7', flag: '#06d6a0' },
        { hull: '#e0f7fa', sail: '#ffffff', flag: '#f3ac8e' },
        { hull: '#ffe0b2', sail: '#fff3e0', flag: '#29b6f6' }
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
        const dur = (2.4 + Math.random() * 1.0).toFixed(2);
        const delay = (Math.random() * 0.75).toFixed(2);

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
            <polygon points="1,8 31,8 25,18 7,18" fill="${palette.hull}" stroke="#90caf9" stroke-width="1.2"/>
            <polygon points="16,8 16,-1 27,8" fill="${palette.sail}" stroke="#90caf9" stroke-width="0.8"/>
            <polygon points="16,8 16,-4 5,8" fill="#ffffff" stroke="#90caf9" stroke-width="0.8"/>
            <polygon points="16,-1 16,-4 21,-2.5" fill="${palette.flag}"/>
          </svg>
        `;
        frag.appendChild(boat);
      }
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
    }, Math.min(500, timings.coverDuration * 350));

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

  function testAnimation() {
    if (isAnimating) return;
    clearFlowingElements();
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
