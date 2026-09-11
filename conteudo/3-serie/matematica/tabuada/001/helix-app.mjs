import * as THREE from 'three';

// Configurações do jogo e dimensões da torre 3D
const NUM_PLATFORMS = 10;
const SECTORS_PER_PLATFORM = 8;
const SECTOR_SPAN = (Math.PI * 2) / SECTORS_PER_PLATFORM; // 45 graus por seção
const PLATFORM_SPACING = 5.0;
const POLE_RADIUS = 0.95;
const PLATFORM_INNER_R = 1.05;
const PLATFORM_OUTER_R = 3.45;
const PLATFORM_THICKNESS = 0.38;
const BALL_RADIUS = 0.32;
const BALL_Z = 2.25; // Raio onde a bolinha quica na frente da câmera
const GRAVITY = 26;
const BOUNCE_HEIGHT = 1.85;
const BOUNCE_VELOCITY = Math.sqrt(2 * GRAVITY * BOUNCE_HEIGHT); // ~9.8

export function createHelixGame(container, callbacks) {
  let disposed = false;

  // 1. Áudio Sintetizado (Web Audio API)
  let audioCtx = null;
  function playSound(type) {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
      const now = audioCtx.currentTime;

      if (type === 'bounce') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(280, now);
        osc.frequency.exponentialRampToValueAtTime(120, now + 0.08);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.08);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(now); osc.stop(now + 0.08);
      } else if (type === 'error') {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(80, now + 0.22);
        gain.gain.setValueAtTime(0.14, now);
        gain.gain.linearRampToValueAtTime(0.001, now + 0.22);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(now); osc.stop(now + 0.22);
      } else if (type === 'shatter') {
        [440, 554, 659].forEach((freq, i) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          const t = now + i * 0.04;
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.1, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
          osc.connect(gain); gain.connect(audioCtx.destination);
          osc.start(t); osc.stop(t + 0.25);
        });
      }
    } catch {}
  }

  // 2. Geração das Perguntas da Tabuada
  function generateProblems() {
    const tabuadas = [2, 3, 4, 5, 6, 7, 8, 9, 10];
    const pairs = [];
    while (pairs.length < NUM_PLATFORMS) {
      const a = tabuadas[Math.floor(Math.random() * tabuadas.length)];
      const b = Math.floor(Math.random() * 10) + 1;
      if (!pairs.some(p => p.a === a && p.b === b)) pairs.push({ a, b });
    }

    let lastLandingSector = 0; // Na plataforma inicial (índice 0), a bolinha começa alinhada no setor frontal 0

    return pairs.map(({ a, b }, platformIndex) => {
      const correct = a * b;
      const wrongPool = new Set();
      if (b > 1) wrongPool.add(a * (b - 1));
      if (b < 10) wrongPool.add(a * (b + 1));
      if (a > 2) wrongPool.add((a - 1) * b);
      if (a < 10) wrongPool.add((a + 1) * b);
      wrongPool.add(correct + 2);
      if (correct > 2) wrongPool.add(correct - 2);
      wrongPool.add(correct + 10);
      if (correct > 10) wrongPool.add(correct - 10);
      wrongPool.add(correct + 4);
      if (correct > 4) wrongPool.add(correct - 4);
      wrongPool.add(correct + 1);
      if (correct > 1) wrongPool.add(correct - 1);
      wrongPool.delete(correct);

      const wrongArr = Array.from(wrongPool).filter(v => v > 0);
      for (let i = wrongArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [wrongArr[i], wrongArr[j]] = [wrongArr[j], wrongArr[i]];
      }
      const wrong1 = wrongArr[0] || (correct + 2);
      const wrong2 = wrongArr[1] || (correct - 2 > 0 ? correct - 2 : correct + 4);
      const wrong3 = wrongArr[2] || (correct + 10);

      // Alternância obrigatória de 8 seções (4 vazias e 4 respostas intercaladas):
      // Plataforma par (0, 2, 4...): vazias em [0, 2, 4, 6], respostas em [1, 3, 5, 7].
      // Plataforma ímpar (1, 3, 5...): vazias em [1, 3, 5, 7], respostas em [0, 2, 4, 6].
      // Desta forma, a seção logo abaixo da resposta certa da plataforma anterior é 100% garantida como VAZIA!
      const isEvenPlat = platformIndex % 2 === 0;
      const answerIndices = isEvenPlat ? [1, 3, 5, 7] : [0, 2, 4, 6];

      // Seção onde a bolinha aterrissa nesta plataforma:
      // Na plataforma 0, ela inicia sobre o setor 0. Nas seguintes, cai no setor onde a plataforma anterior quebrou.
      const landingSector = lastLandingSector;
      const adjacentIndices = [
        (landingSector - 1 + SECTORS_PER_PLATFORM) % SECTORS_PER_PLATFORM,
        (landingSector + 1) % SECTORS_PER_PLATFORM
      ];
      const distantIndices = answerIndices.filter(i => !adjacentIndices.includes(i));

      // Sorteio enviesado: ~33.33% (1/3) de chance de estar adjacente (lado direito ou esquerdo)
      // e ~66.67% (2/3) de estar em posições distantes (exigindo maior rotação da torre).
      let correctIndex;
      if (Math.random() < 1 / 3) {
        correctIndex = adjacentIndices[Math.floor(Math.random() * adjacentIndices.length)];
      } else {
        correctIndex = distantIndices[Math.floor(Math.random() * distantIndices.length)];
      }
      lastLandingSector = correctIndex;

      const remainingIndices = answerIndices.filter(i => i !== correctIndex);

      const sectors = Array(SECTORS_PER_PLATFORM).fill(null).map((_, idx) => {
        const isEmpty = isEvenPlat ? (idx % 2 === 0) : (idx % 2 === 1);
        const isCorrect = idx === correctIndex;
        let value = null;
        if (!isEmpty) {
          if (idx === correctIndex) value = correct;
          else if (idx === remainingIndices[0]) value = wrong1;
          else if (idx === remainingIndices[1]) value = wrong2;
          else if (idx === remainingIndices[2]) value = wrong3;
        }
        return {
          index: idx,
          isEmpty,
          isCorrect,
          value
        };
      });

      return {
        a, b, correct,
        hint: `${a} × ${b} é o mesmo que somar ${Array(b).fill(a).join(' + ')}.`,
        sectors
      };
    });
  }

  // 3. Textura dos Números em Alta Resolução (Letra Branca Nítida)
  function createNumberTexture(number) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.clearRect(0, 0, 512, 512);

    // Contorno escuro espesso para contraste impecável sobre o azul
    ctx.font = '900 175px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.strokeStyle = 'rgba(0, 15, 45, 0.95)';
    ctx.lineWidth = 20;
    ctx.strokeText(String(number), 256, 256);

    // Texto em branco puro
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(number), 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = true;
    return texture;
  }

  // 4. Inicialização do Three.js
  const canvasHolder = container.querySelector('.helix-canvas-container');
  const width = canvasHolder.clientWidth || 500;
  const height = canvasHolder.clientHeight || 600;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0e121a');
  scene.fog = new THREE.FogExp2('#0e121a', 0.018);

  const camera = new THREE.PerspectiveCamera(46, width / height, 0.1, 100);
  let camTargetY = 0;
  let camCurrentY = 0;
  camera.position.set(0, 2.7, 8.4);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  canvasHolder.appendChild(renderer.domElement);

  // Iluminação calibrada para preservar a cor azul rica e viva
  const ambientLight = new THREE.AmbientLight('#d8e6ff', 0.75);
  scene.add(ambientLight);

  const keyLight = new THREE.DirectionalLight('#ffffff', 1.2);
  keyLight.position.set(4, 12, 7);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight('#2575fc', 0.5);
  rimLight.position.set(-5, 4, -4);
  scene.add(rimLight);

  // Materiais das Plataformas
  // Seções com Resposta (Fundo Azul)
  const matTopBlue = new THREE.MeshStandardMaterial({
    color: '#1a6cd4',
    roughness: 0.32,
    metalness: 0.1
  });
  const matSideBlue = new THREE.MeshStandardMaterial({
    color: '#124c96',
    roughness: 0.45,
    metalness: 0.2
  });

  // Seções Vazias (Fundo Branco)
  const matTopWhite = new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: 0.22,
    metalness: 0.05
  });
  const matSideWhite = new THREE.MeshStandardMaterial({
    color: '#d4dde8',
    roughness: 0.4,
    metalness: 0.1
  });

  const matErrorTop = new THREE.MeshStandardMaterial({
    color: '#d93829',
    roughness: 0.32,
    metalness: 0.1
  });

  // Grupo mestre da Torre
  const tower = new THREE.Group();
  scene.add(tower);

  // Pilar Central
  const totalHeight = NUM_PLATFORMS * PLATFORM_SPACING + 14;
  const poleGeom = new THREE.CylinderGeometry(POLE_RADIUS, POLE_RADIUS, totalHeight, 32);
  const poleMat = new THREE.MeshStandardMaterial({
    color: '#1a202c',
    roughness: 0.6,
    metalness: 0.35
  });
  const pole = new THREE.Mesh(poleGeom, poleMat);
  pole.position.y = - (NUM_PLATFORMS * PLATFORM_SPACING) / 2;
  tower.add(pole);

  // Geometria de um Setor (fatia de 45° centralizada no eixo +Z frontal)
  function createSectorMesh(sectorData, sectorIndex) {
    const shape = new THREE.Shape();
    const halfSpan = SECTOR_SPAN * 0.478; // folga sutil entre seções de 45°
    const midAngle = -Math.PI / 2; // centralizado no eixo -Y do plano 2D (que vira +Z em 3D)
    shape.absarc(0, 0, PLATFORM_OUTER_R, midAngle - halfSpan, midAngle + halfSpan, false);
    shape.absarc(0, 0, PLATFORM_INNER_R, midAngle + halfSpan, midAngle - halfSpan, true);

    const extrudeSettings = {
      depth: PLATFORM_THICKNESS,
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: 0.035,
      bevelThickness: 0.035
    };

    const geom = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geom.rotateX(-Math.PI / 2); // agora a fatia fica horizontal no plano XZ, centrada no eixo +Z

    const group = new THREE.Group();

    // Seção vazia: branca | Seção com resposta: azul
    const sectorMats = sectorData.isEmpty
      ? [matTopWhite, matSideWhite]
      : [matTopBlue, matSideBlue];
    const mesh = new THREE.Mesh(geom, sectorMats);
    group.add(mesh);

    // Se tiver número, adiciona o rótulo de texto nítido na superfície superior (plano e sem afundar)
    let labelMesh = null;
    if (sectorData.value !== null && sectorData.value !== undefined) {
      const labelGeom = new THREE.PlaneGeometry(1.5, 1.5);
      labelGeom.rotateX(-Math.PI / 2); // plano sobre o topo, com topo do número apontando para o centro (leitura natural de frente)
      const labelMat = new THREE.MeshBasicMaterial({
        map: createNumberTexture(sectorData.value),
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide, // visível sem culling
        polygonOffset: true,
        polygonOffsetFactor: -4,
        polygonOffsetUnits: -4
      });
      labelMesh = new THREE.Mesh(labelGeom, labelMat);
      labelMesh.renderOrder = 10;
      labelMesh.position.set(0, PLATFORM_THICKNESS + 0.045, 2.25);
      group.add(labelMesh);
    }

    group.rotation.y = sectorIndex * SECTOR_SPAN;
    group.userData = { ...sectorData, sectorIndex, baseMesh: mesh, labelMesh };
    return group;
  }

  // Construção das 10 Plataformas
  const problems = generateProblems();
  const platforms = [];

  for (let p = 0; p < NUM_PLATFORMS; p++) {
    const platGroup = new THREE.Group();
    const platY = - p * PLATFORM_SPACING;
    platGroup.position.y = platY;

    const prob = problems[p];
    const sectorGroups = [];

    prob.sectors.forEach((sec, idx) => {
      const secGroup = createSectorMesh(sec, idx);
      platGroup.add(secGroup);
      sectorGroups.push(secGroup);
    });

    tower.add(platGroup);
    platforms.push({
      index: p,
      y: platY,
      problem: prob,
      group: platGroup,
      sectors: sectorGroups,
      broken: false,
      hasError: false
    });
  }

  // Base final de vitória
  const baseGeom = new THREE.CylinderGeometry(PLATFORM_OUTER_R * 1.15, PLATFORM_OUTER_R * 1.25, 0.8, 32);
  const baseMat = new THREE.MeshStandardMaterial({
    color: '#d4af37',
    roughness: 0.3,
    metalness: 0.65
  });
  const baseMesh = new THREE.Mesh(baseGeom, baseMat);
  baseMesh.position.y = - NUM_PLATFORMS * PLATFORM_SPACING;
  tower.add(baseMesh);

  // A Bolinha
  const ballGeom = new THREE.SphereGeometry(BALL_RADIUS, 32, 24);
  const ballMat = new THREE.MeshStandardMaterial({
    color: '#f5b700',
    roughness: 0.22,
    metalness: 0.35,
    emissive: '#c68a00',
    emissiveIntensity: 0.28
  });
  const ball = new THREE.Mesh(ballGeom, ballMat);
  ball.position.set(0, BOUNCE_HEIGHT + 0.3, BALL_Z);
  scene.add(ball);

  // Sombra da Bolinha
  const shadowGeom = new THREE.CircleGeometry(BALL_RADIUS * 1.15, 24);
  shadowGeom.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: '#000000',
    transparent: true,
    opacity: 0.4,
    depthWrite: false
  });
  const ballShadow = new THREE.Mesh(shadowGeom, shadowMat);
  scene.add(ballShadow);

  // Fragmentos de Quebra da seção correta
  const debrisList = [];
  function breakSector(sectorGroup, platY) {
    sectorGroup.visible = false;
    for (let i = 0; i < 7; i++) {
      const dGeom = new THREE.BoxGeometry(0.5, 0.25, 0.5);
      const dMat = new THREE.MeshStandardMaterial({ color: '#1a6cd4', roughness: 0.4 });
      const dMesh = new THREE.Mesh(dGeom, dMat);

      const angle = sectorGroup.rotation.y + (Math.random() - 0.5) * 0.45;
      const radius = PLATFORM_INNER_R + Math.random() * (PLATFORM_OUTER_R - PLATFORM_INNER_R);
      dMesh.position.set(
        Math.sin(angle + towerRotation) * radius,
        platY + (Math.random() - 0.5) * 0.2,
        Math.cos(angle + towerRotation) * radius
      );
      dMesh.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        Math.random() * 2.5 + 1.2,
        (Math.random() - 0.5) * 4
      );
      dMesh.rotVelocity = new THREE.Vector3(
        Math.random() * 12 - 6,
        Math.random() * 12 - 6,
        Math.random() * 12 - 6
      );
      dMesh.life = 1.0;
      scene.add(dMesh);
      debrisList.push(dMesh);
    }
  }

  // Piscar / Alerta na Seção Errada
  function flashWrongSector(sectorGroup) {
    const baseMesh = sectorGroup.userData.baseMesh;
    if (!baseMesh) return;
    baseMesh.material = [matErrorTop, matSideBlue];
    setTimeout(() => {
      if (!disposed && baseMesh) {
        baseMesh.material = [matTopBlue, matSideBlue];
      }
    }, 450);
  }

  // 5. Estado do Jogo e Pontuação
  let activePlatform = 0;
  let gameScore = 0;
  let firstHits = 0;
  let totalErrors = 0;
  let ballVy = 0;
  let ballState = 'bouncing'; // 'bouncing' | 'falling' | 'gameover'
  let squish = 1.0;

  // Rotação da Torre
  let towerRotation = 0;
  let targetRotation = 0;
  let isDragging = false;
  let previousX = 0;

  // Pergunta inicial
  callbacks.onQuestionChange?.(0, problems[0]);

  // Identifica qual setor da plataforma atual está sob a bolinha
  function getActiveSectorGroup() {
    let angle = (-towerRotation) % (Math.PI * 2);
    if (angle < 0) angle += Math.PI * 2;

    const shifted = (angle + SECTOR_SPAN / 2) % (Math.PI * 2);
    const sectorIndex = Math.floor(shifted / SECTOR_SPAN) % SECTORS_PER_PLATFORM;
    const plat = platforms[activePlatform];
    return plat.sectors[sectorIndex];
  }

  function rotateBy(delta) {
    targetRotation += delta;
  }

  // Interação por Arraste (Mouse e Touch)
  function onPointerDown(e) {
    isDragging = true;
    previousX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
  }

  function onPointerMove(e) {
    if (!isDragging) return;
    const currentX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    const deltaX = currentX - previousX;
    previousX = currentX;
    targetRotation += deltaX * 0.0085;
  }

  function onPointerUp() {
    isDragging = false;
  }

  canvasHolder.addEventListener('mousedown', onPointerDown);
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);

  canvasHolder.addEventListener('touchstart', onPointerDown, { passive: true });
  window.addEventListener('touchmove', onPointerMove, { passive: true });
  window.addEventListener('touchend', onPointerUp);

  function onKeyDown(e) {
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      targetRotation -= 0.16;
    } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      targetRotation += 0.16;
    }
  }
  window.addEventListener('keydown', onKeyDown);

  function onResize() {
    if (!canvasHolder) return;
    const w = canvasHolder.clientWidth;
    const h = canvasHolder.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }
  window.addEventListener('resize', onResize);

  // 6. Loop de Animação e Física
  let lastTime = performance.now();

  function animate(now) {
    if (disposed) return;
    requestAnimationFrame(animate);

    const dt = Math.min((now - lastTime) / 1000, 0.06);
    lastTime = now;

    // Rotação suave da torre
    towerRotation += (targetRotation - towerRotation) * 14 * dt;
    tower.rotation.y = towerRotation;

    // Atualização dos fragmentos de quebra
    for (let i = debrisList.length - 1; i >= 0; i--) {
      const d = debrisList[i];
      d.position.addScaledVector(d.velocity, dt);
      d.velocity.y -= GRAVITY * dt;
      d.rotation.x += d.rotVelocity.x * dt;
      d.rotation.y += d.rotVelocity.y * dt;
      d.life -= dt * 1.6;
      d.material.opacity = Math.max(0, d.life);
      d.material.transparent = true;
      if (d.life <= 0) {
        scene.remove(d);
        d.geometry.dispose();
        d.material.dispose();
        debrisList.splice(i, 1);
      }
    }

    // Física da Bolinha
    if (ballState === 'bouncing') {
      const currentPlat = platforms[activePlatform];
      const targetPlatY = currentPlat.y + BALL_RADIUS + PLATFORM_THICKNESS;

      ballVy -= GRAVITY * dt;
      ball.position.y += ballVy * dt;

      // Colisão com a plataforma
      if (ball.position.y <= targetPlatY && ballVy <= 0) {
        const sectorGroup = getActiveSectorGroup();
        const sec = sectorGroup.userData;

        if (sec.isEmpty) {
          // SEÇÃO VAZIA: Apenas quica
          ball.position.y = targetPlatY;
          ballVy = BOUNCE_VELOCITY;
          squish = 0.72;
          playSound('bounce');
        } else if (!sec.isCorrect) {
          // RESPOSTA ERRADA: Quica, perde 1 ponto, registra erro
          ball.position.y = targetPlatY;
          ballVy = BOUNCE_VELOCITY;
          squish = 0.72;
          playSound('error');
          flashWrongSector(sectorGroup);

          gameScore = Math.max(0, gameScore - 1);
          totalErrors++;
          currentPlat.hasError = true;

          callbacks.onScoreChange?.(gameScore);
          callbacks.onFloatingScore?.('−1 pt', 'score-loss-1');
          callbacks.onErrorHit?.(currentPlat.problem, sec.value);
        } else {
          // RESPOSTA CERTA: Quebra a seção e cai para a próxima plataforma!
          playSound('shatter');
          breakSector(sectorGroup, currentPlat.y);

          let pointsGained = 3;
          if (!currentPlat.hasError) {
            firstHits++;
            pointsGained = 3;
            callbacks.onFloatingScore?.('+3 pts', 'score-gain-3');
          } else {
            pointsGained = 2;
            callbacks.onFloatingScore?.('+2 pts', 'score-gain-2');
          }

          gameScore += pointsGained;
          callbacks.onScoreChange?.(gameScore);
          callbacks.onSuccessHit?.(currentPlat.problem);

          // Transição para queda livre
          currentPlat.broken = true;
          ballState = 'falling';
          ballVy = -2.8;
        }
      }
    } else if (ballState === 'falling') {
      ballVy -= GRAVITY * dt;
      ball.position.y += ballVy * dt;

      const nextIndex = activePlatform + 1;
      const nextTargetY = nextIndex < NUM_PLATFORMS
        ? platforms[nextIndex].y + BALL_RADIUS + PLATFORM_THICKNESS
        : baseMesh.position.y + BALL_RADIUS + 0.4;

      if (ball.position.y <= nextTargetY && ballVy <= 0) {
        ball.position.y = nextTargetY;
        ballVy = BOUNCE_VELOCITY;
        squish = 0.72;

        if (nextIndex < NUM_PLATFORMS) {
          activePlatform = nextIndex;
          ballState = 'bouncing';
          playSound('bounce');
          callbacks.onQuestionChange?.(activePlatform, platforms[activePlatform].problem);
        } else {
          // Concluiu todas as 10 plataformas
          ballState = 'gameover';
          ballVy = 0;
          callbacks.onGameComplete?.({
            gameScore,
            firstHits,
            totalErrors,
            totalPlatforms: NUM_PLATFORMS
          });
        }
      }
    }

    // Squash & Stretch
    squish += (1.0 - squish) * 14 * dt;
    ball.scale.set(1.0 / Math.sqrt(squish), squish, 1.0 / Math.sqrt(squish));

    // Sombra na plataforma ativa
    const currentPlatY = activePlatform < NUM_PLATFORMS
      ? platforms[activePlatform].y + PLATFORM_THICKNESS + 0.02
      : baseMesh.position.y + 0.42;
    ballShadow.position.set(0, currentPlatY, BALL_Z);
    const distToGround = Math.max(0.1, ball.position.y - currentPlatY);
    ballShadow.scale.setScalar(Math.max(0.35, 1.15 - distToGround * 0.25));
    ballShadow.material.opacity = Math.max(0.1, 0.42 - distToGround * 0.12);

    // Câmera acompanha suavemente
    camTargetY = - activePlatform * PLATFORM_SPACING;
    camCurrentY += (camTargetY - camCurrentY) * 6.5 * dt;
    camera.position.y = camCurrentY + 2.7;
    camera.lookAt(0, camCurrentY + 0.5, 0);

    renderer.render(scene, camera);
  }

  requestAnimationFrame(animate);

  return {
    rotateLeft: () => rotateBy(-0.25),
    rotateRight: () => rotateBy(0.25),
    dispose: () => {
      disposed = true;
      canvasHolder.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      canvasHolder.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      audioCtx?.close().catch(() => {});
    }
  };
}
