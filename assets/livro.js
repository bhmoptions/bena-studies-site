/**
 * Bena Studies — Livro Mágico de Descobertas
 * Controlador de Animações 3D, Vórtice de Partículas & Navegação Interativa
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
  const canvas = document.getElementById('particles-canvas');
  const ctx = canvas.getContext('2d');

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

      const bufferSize = actx.sampleRate * 0.4;
      const buffer = actx.createBuffer(1, bufferSize, actx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (actx.sampleRate * 0.1));
      }

      const noise = actx.createBufferSource();
      noise.buffer = buffer;

      const filter = actx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, actx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(300, actx.currentTime + 0.4);
      filter.Q.setValueAtTime(3, actx.currentTime);

      const gain = actx.createGain();
      gain.gain.setValueAtTime(0.2, actx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, actx.currentTime + 0.4);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(actx.destination);
      noise.start();
    } catch (e) {
      // Audio não suportado ou bloqueado pelo navegador
    }
  }

  // Efeito sonoro de magia / carrilhão ascendente (Pentatônica mágica)
  function playChimeSequence() {
    if (!soundEnabled) return;
    try {
      const actx = getAudioContext();
      if (!actx) return;

      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6
      notes.forEach((freq, idx) => {
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        const startTime = actx.currentTime + idx * 0.09;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.001, startTime);
        gain.gain.linearRampToValueAtTime(0.12, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.5);

        osc.connect(gain);
        gain.connect(actx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.6);
      });
    } catch (e) {}
  }

  // --- Motor de Partículas (Canvas) ---
  let width = 0;
  let height = 0;
  const particles = [];
  const ambientStars = [];

  function resizeCanvas() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  // Inicializa estrelas ambientes suaves de fundo
  for (let i = 0; i < 40; i++) {
    ambientStars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 2 + 1,
      alpha: Math.random() * 0.7 + 0.3,
      speed: Math.random() * 0.02 + 0.01,
      phase: Math.random() * Math.PI * 2
    });
  }

  // Símbolos temáticos para o vórtice que escapa do livro
  const mathSymbols = ['√x', 'π', '∑', '7×8=56', '∞', '12÷4', 'x²', 'Δ', '+', '×', '÷', '%', '≠', '≈'];
  const scienceSymbols = ['H₂O', 'CO₂', 'atom', 'dna', '⚗️', '🧪'];
  const spaceSymbols = ['planet', 'moon', '✦', '✧', '🚀', '⭐'];
  const languageSymbols = ['A', 'B', 'Z', 'Aa', '🪶', '📜', '♪', '♫', 'Palavra'];
  const geographySymbols = ['🧭', '🌍', '⛰️'];

  const allSymbolTypes = [
    ...mathSymbols.map(s => ({ text: s, type: 'math', color: '#f4cd65' })),
    ...scienceSymbols.map(s => ({ text: s, type: s === 'atom' || s === 'dna' ? s : 'text', color: '#9ebfd3' })),
    ...spaceSymbols.map(s => ({ text: s, type: s === 'planet' ? 'planet' : 'text', color: '#f3ac8e' })),
    ...languageSymbols.map(s => ({ text: s, type: 'text', color: '#dcabc3' })),
    ...geographySymbols.map(s => ({ text: s, type: 'text', color: '#a9e6b6' }))
  ];

  // Disparo do vórtice ao abrir o livro
  function spawnKnowledgeVortex() {
    const rect = book.getBoundingClientRect();
    const originX = rect.left + rect.width * 0.45;
    const originY = rect.top + rect.height * 0.4;

    const count = 130; // Grande erupção de conhecimento
    for (let i = 0; i < count; i++) {
      const symDef = allSymbolTypes[Math.floor(Math.random() * allSymbolTypes.length)];
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.5; // Apontado para cima em leque
      const speed = Math.random() * 11 + 3;

      particles.push({
        x: originX + (Math.random() - 0.5) * 40,
        y: originY + (Math.random() - 0.5) * 30,
        vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1) * 0.9,
        vy: Math.sin(angle) * speed,
        gravity: 0.04,
        drag: 0.985,
        curlSpeed: (Math.random() - 0.5) * 0.06,
        size: Math.random() * 14 + 14,
        rot: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.08,
        alpha: 1,
        life: 1,
        decay: Math.random() * 0.008 + 0.007,
        data: symDef,
        age: 0,
        orbitAngle: Math.random() * Math.PI * 2
      });
    }
  }

  // Renderização das partículas no Canvas
  function drawPlanet(ctx, p) {
    const r = p.size * 0.5;
    // Corpo do planeta
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = p.data.color;
    ctx.fill();

    // Anel orbital de Saturno
    ctx.save();
    ctx.rotate(0.4);
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.9, r * 0.5, 0, 0, Math.PI * 2);
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = 'rgba(233, 198, 117, 0.85)';
    ctx.stroke();
    ctx.restore();
  }

  function drawAtom(ctx, p) {
    const r = p.size * 0.45;
    // Núcleo
    ctx.beginPath();
    ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#f4cd65';
    ctx.fill();

    // Órbitas de elétrons
    ctx.strokeStyle = 'rgba(158, 191, 211, 0.7)';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.38, Math.PI / 4, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.38, -Math.PI / 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  function renderParticles() {
    ctx.clearRect(0, 0, width, height);

    // 1. Estrelas ambientes
    for (let s of ambientStars) {
      s.phase += s.speed;
      const curAlpha = s.alpha * (0.6 + 0.4 * Math.sin(s.phase));
      ctx.fillStyle = `rgba(215, 179, 106, ${curAlpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }

    // 2. Partículas do Vórtice
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.age++;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.rot += p.rotSpeed;
      p.vx += Math.sin(p.age * 0.05) * 0.35; // Efeito de brisa/espiral mágica
      p.life -= p.decay;

      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = Math.max(0, p.life);

      // Brilho neon sutil
      ctx.shadowColor = p.data.color;
      ctx.shadowBlur = 12;

      if (p.data.type === 'planet') {
        drawPlanet(ctx, p);
      } else if (p.data.type === 'atom') {
        drawAtom(ctx, p);
      } else {
        // Texto / Símbolo matemático / Letra
        ctx.font = `bold ${Math.round(p.size)}px 'Fredoka', 'DM Sans', sans-serif`;
        ctx.fillStyle = p.data.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.data.text, 0, 0);
      }

      ctx.restore();
    }

    requestAnimationFrame(renderParticles);
  }
  requestAnimationFrame(renderParticles);

  // --- Sequência de Abertura do Livro ---
  function openBook() {
    if (isBookOpen || isAnimating) return;
    isAnimating = true;

    // Inicia áudio
    playRustleSound();
    setTimeout(playChimeSequence, 300);

    // Oculta callout de instrução
    instructionCallout.style.opacity = '0';
    instructionCallout.style.transform = 'translateY(15px)';

    // 1. Capa se abre
    bookWrap.classList.remove('is-closed');
    bookWrap.classList.add('is-open');

    // 2. Páginas folheiam em cascata
    const pages = book.querySelectorAll('.turning-page');
    pages.forEach((p, idx) => {
      p.classList.add(`leafing-1`, `leafing-${idx + 1}`);
      setTimeout(playRustleSound, 200 * idx);
    });

    // 3. Erupção do Vórtice de Símbolos Mágicos
    setTimeout(() => {
      spawnKnowledgeVortex();
    }, 280);

    // 4. Cenário Pop-up se ergue e se estabiliza
    setTimeout(() => {
      isBookOpen = true;
      isAnimating = false;
      openControls.classList.add('is-visible');
    }, 1500);
  }

  // Fechar o livro de volta ao estado de repouso
  function closeBook() {
    if (!isBookOpen || isAnimating) return;
    isAnimating = true;

    playRustleSound();
    openControls.classList.remove('is-visible');

    // Remove classes de folheamento
    const pages = book.querySelectorAll('.turning-page');
    pages.forEach(p => {
      p.className = 'turning-page';
    });

    bookWrap.classList.remove('is-open');
    bookWrap.classList.add('is-closed');

    setTimeout(() => {
      isBookOpen = false;
      isAnimating = false;
      instructionCallout.style.opacity = '1';
      instructionCallout.style.transform = 'translateY(0)';
    }, 1200);
  }

  // Refolhear o livro (Replay da animação completa)
  function replayBookAnimation() {
    if (isAnimating) return;
    closeBook();
    setTimeout(openBook, 1300);
  }

  // --- Eventos de Abertura ---
  book.addEventListener('click', (e) => {
    // Se o livro já estiver aberto e o clique não for nos destinos, não faz nada
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
