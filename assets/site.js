const design = document.body.dataset.design;
const base = location.pathname.includes('/paginas/') ? '../' : './';
const serie = window.BENA_CONTEUDO[window.BENA_CONFIG.serieAtual];
const materias = serie?.materias || [];
const texts = {
 clube: { label: 'APRENDER É MELHOR EM TURMA', title: 'Pequenas descobertas.<br><em>Grandes aventuras.</em>', desc: 'Um lugar para explorar, jogar e descobrir que estudar pode ser a melhor parte do dia.', cta: 'Bora aprender?', tag: 'Seu próximo “eu consegui!” começa aqui.', section: 'Qual vai ser a descoberta de hoje?' },
 espaco: { label: 'CENTRAL DE EXPLORAÇÃO • ' + (serie?.nome || ''), title: 'Seu conhecimento<br>vai <em>mais longe.</em>', desc: 'Prepare a curiosidade. Cada jogo é uma nova missão no seu universo de descobertas.', cta: 'Iniciar missão', tag: 'Uma pequena missão. Uma grande descoberta.', section: 'Escolha seu próximo planeta' },
 caderno: { label: 'O CLUBE DOS CURIOSOS', title: 'Ideias na cabeça.<br><em>Aventura no papel.</em>', desc: 'Abra seu caderno de descobertas: tem jogos, desafios e um montão de coisas legais para aprender.', cta: 'Abrir meu caderno', tag: 'Pode entrar. A curiosidade é sua melhor companhia.', section: 'Vamos virar a próxima página?' }
};
const contentDesign = design === 'caderno-dark' ? 'caderno' : design;
const t = texts[contentDesign];
const art = {
 clube: `<div class="toy-scene" aria-hidden="true"><span class="orbit-label">curiosidade em ação ↗</span><div class="spark s1">✳</div><div class="tile tile-a">A<span>palavras que abrem mundos</span></div><div class="tile tile-num">2<span>+ 2 = ?</span></div><div class="tile tile-face"><i></i><i></i><b></b></div><div class="tile tile-star">✦</div><span class="scene-note">feito para aprender brincando</span></div>`,
 espaco: `<div class="space-scene" aria-hidden="true"><span class="star st1">✧</span><span class="star st2">✦</span><span class="star st3">+</span><div class="orbital o1"></div><div class="orbital o2"></div><div class="planet"><span>?</span></div><div class="moon">＋</div><div class="satellite">Aa</div><div class="space-tag"><span class="signal"></span> CURIOSIDADE: SEM LIMITES</div><span class="coordinate">23° S / UNIVERSO BENA</span></div>`,
 caderno: `<div class="notebook-scene" aria-hidden="true"><div class="paper"><span class="tape"></span><span class="paper-date">meu diário de descobertas</span><h2>Hoje é dia<br>de aprender<br><em>algo incrível!</em></h2><div class="doodle-flower">✳</div><div class="scribble">errando, tentando,<br>e tentando de novo.</div><span class="paper-star">☆</span></div><div class="sticker">100%<br><small>curiosidade</small></div><div class="pencil"></div></div>`
};
document.querySelector('#app').innerHTML = `
<header class="site-header"><div class="header wrap"><a class="brand" href="${base}index.html" aria-label="Bena Studies, início"><span class="brand-icon">b<span>✦</span></span><span>Bena<span class="brand-light">Studies</span></span></a><button class="login" data-login>Entrar <span>↗</span></button></div></header>
<main><section class="hero wrap"><div class="hero-copy"><div class="eyebrow"><span></span>${t.label}</div><h1>${t.title}</h1><p>${t.desc}</p><a class="primary" href="#materias">${t.cta}<span>→</span></a><div class="hero-foot"><span class="mini-faces">☺ ☻ ☺</span><span>${t.tag}</span></div></div>${art[contentDesign]}</section>
<section id="materias" class="subjects wrap"><div class="section-heading"><div><div class="eyebrow">SEU MAPA DE DESCOBERTAS</div><h2>${t.section}</h2></div><span class="grade">${serie?.nome || 'Série ainda sem conteúdo'}</span></div><div class="subject-grid">${materias.map((m,i)=>`<button class="subject subject-${i}" data-subject="${i}"><span class="subject-top"><span class="subject-icon">${m.simbolo}</span><span class="subject-number">0${i+1} / ${design==='espaco'?'PLANETA':'EXPLORAR'}</span></span><h3>${m.nome}</h3><p>${m.descricao}</p><span class="subject-bottom">${m.temas.map(x=>x.nome).join(' • ')}<span class="arrow">↗</span></span></button>`).join('') || '<p>Os conteúdos desta série chegarão em breve.</p>'}</div></section>
</main>
<dialog id="modal"><button class="close" aria-label="Fechar">×</button><div id="modal-content"></div></dialog>`;
const modal = document.querySelector('#modal');
const content = document.querySelector('#modal-content');
modal.querySelector('.close').onclick = () => modal.close();
modal.addEventListener('click', e => {if(e.target===modal) { const r=modal.getBoundingClientRect(); if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom) modal.close(); }});
document.querySelector('[data-login]').onclick = () => {}; // Firebase Auth — ver assets/componentes/auth.js
document.querySelectorAll('[data-subject]').forEach(button => button.onclick = () => {
  showTopics(materias[Number(button.dataset.subject)]);
  modal.showModal();
});
function showTopics(materia) {
  content.innerHTML = `<div class="modal-symbol">${materia.simbolo}</div><div class="eyebrow">${serie.nome} • ${materia.nome}</div><h2>${materia.chamada}</h2><p>Escolha um tema para explorar.</p><div class="topic-list">${materia.temas.map((tema, i) => `<button class="topic" data-topic="${i}">${tema.nome}<span>Ver jogos →</span></button>`).join('')}</div>`;
  content.querySelectorAll('[data-topic]').forEach(button => button.onclick = () => showGames(materia, materia.temas[Number(button.dataset.topic)]));
}
function showGames(materia, tema) {
  content.innerHTML = `<div class="eyebrow">${serie.nome} • ${materia.nome}</div><h2>${tema.nome}</h2><p>Escolha sua próxima brincadeira.</p><div class="topic-list">${tema.jogos.map((jogo, i) => `<button class="topic game-choice" data-game="${i}"><span>${jogo.nome}<small>${jogo.descricao}</small></span><span>Jogar →</span></button>`).join('') || '<p>Novos jogos chegarão em breve.</p>'}</div><button class="topic" id="topics-back">← Voltar aos temas</button>`;
  content.querySelectorAll('[data-game]').forEach(button => button.onclick = () => {
    const jogo = tema.jogos[Number(button.dataset.game)];
    if (jogo.pagina) {
      location.href = `${base}conteudo/${window.BENA_CONFIG.serieAtual}-serie/${jogo.pagina}`;
    } else {
      loadGame(jogo.arquivo, () => showGames(materia, tema));
    }
  });
  content.querySelector('#topics-back').onclick = () => showTopics(materia);
}
let gameLoadId = 0; let disposeGame = null;
modal.addEventListener('close', () => { gameLoadId++; disposeGame?.(); disposeGame = null; });
function loadGame(file, onBack) {
  disposeGame?.(); disposeGame = null; const requestId = ++gameLoadId;
  content.innerHTML = '<p role="status">Preparando sua aventura…</p>';
  const script = document.createElement('script');
  script.src = `${base}conteudo/${window.BENA_CONFIG.serieAtual}-serie/${file}`;
  script.onload = () => {
    script.remove();
    if (requestId !== gameLoadId || !modal.open) return;
    if (typeof window.BENA_JOGO?.iniciar !== 'function') return showError();
    disposeGame = window.BENA_JOGO.iniciar(content, () => { disposeGame?.(); disposeGame = null; onBack(); });
  };
  function showError() {
    content.innerHTML = '<h2>Não conseguimos abrir o jogo.</h2><p>Tente novamente daqui a pouco.</p><button class="topic" id="games-back">← Voltar aos jogos</button>';
    content.querySelector('#games-back').onclick = onBack;
  }
  script.onerror = () => {
    script.remove();
    if (requestId === gameLoadId && modal.open) showError();
  };
  document.body.append(script);
}

if (location.hash === '#jogos-tabuada') {
  const matematica = materias.find(m => m.id === 'matematica');
  const tabuada = matematica?.temas.find(t => t.nome === 'Tabuada');
  if (tabuada) { showGames(matematica, tabuada); modal.showModal(); }
}
