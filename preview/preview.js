/* Experiências independentes: a página inicial e seus componentes continuam intactos. */
(() => {
  'use strict';

  const concept = document.body.dataset.concept;
  const seriesNumber = window.BENA_CONFIG.serieAtual;
  const series = window.BENA_CONTEUDO[seriesNumber];
  const subjects = series?.materias || [];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
  const concepts = [
    { id: 'livro', name: 'O livro', title: 'Um livro, muitos mundos' },
    { id: 'sala', name: 'A sala', title: 'Sala de descobertas' },
    { id: 'constelacao', name: 'As estrelas', title: 'Constelação do conhecimento' }
  ];
  const discoveries = [
    { id: 'matematica', name: 'Matemática', symbol: '×', description: 'Cada problema é uma nova possibilidade.' },
    { id: 'ciencias', name: 'Ciências', symbol: '◎', description: 'O mundo está cheio de boas perguntas.' },
    { id: 'portugues', name: 'Português', symbol: 'Aa', description: 'Toda palavra pode começar uma aventura.' }
  ];
  for (const subject of subjects) {
    const discovery = discoveries.find(item => item.id === subject.id);
    if (discovery) discovery.name = subject.nome;
    else discoveries.push({ id: subject.id, name: subject.nome, symbol: subject.simbolo, description: subject.descricao });
  }
  const hasGames = id => subjects.find(subject => subject.id === id)?.temas.some(theme => theme.jogos?.length);
  const availableLabel = id => hasGames(id) ? 'Explorar →' : 'Em breve';
  const star = '<svg viewBox="0 0 100 100" fill="none" aria-hidden="true"><path d="M50 3 60 38 95 50 60 62 50 97 40 62 5 50 40 38Z" fill="currentColor"/><path d="M50 22 55 44 77 50 55 56 50 78 45 56 23 50 45 44Z" class="star-inner"/></svg>';
  const subjectButtons = className => discoveries.map((item, index) => `
    <button class="${className}" data-discovery="${escape(item.id)}" style="--order:${index}">
      <span class="discovery-symbol" aria-hidden="true">${escape(item.symbol)}</span>
      <span>${escape(item.name)}<small>${availableLabel(item.id)}</small></span>
    </button>`).join('');

  const bookMarkup = `
    <section class="experience book-experience" aria-labelledby="experience-title">
      <div class="experience-copy book-copy">
        <p class="experience-kicker">A CURIOSIDADE VIRA A PÁGINA</p>
        <h1 id="experience-title">Um livro.<br><em>Infinitos mundos.</em></h1>
        <p class="experience-description">Toda grande descoberta começa com um pequeno gesto. Abra o livro e encontre a sua.</p>
        <button class="experience-cta" data-book-toggle aria-expanded="false" aria-controls="book-discoveries"><span data-book-label>Abrir o livro</span><span aria-hidden="true">↗</span></button>
      </div>
      <div class="book-stage">
        <div class="book-aura" aria-hidden="true"></div>
        <div class="book-world" aria-hidden="true">
          <svg class="world-orbits" viewBox="0 0 520 370" fill="none">
            <ellipse cx="267" cy="163" rx="195" ry="97" transform="rotate(-24 267 163)"/>
            <ellipse cx="267" cy="163" rx="144" ry="151" transform="rotate(32 267 163)"/>
            <path d="m100 270 77-152 78 152M124 223h106"/>
            <circle cx="426" cy="103" r="5"/><circle cx="152" cy="65" r="3"/><circle cx="299" cy="21" r="4"/>
          </svg>
          <div class="world-planet"><i></i></div>
          <span class="world-letter">Aa</span>
          <span class="world-number">×</span>
          <span class="world-spark world-spark-one">✦</span>
          <span class="world-spark world-spark-two">✧</span>
          <svg class="world-plant" viewBox="0 0 120 160" fill="none"><path d="M59 155V58M59 110 29 78M59 85l31-39"/><path d="M59 91C27 94 12 63 19 48c30 0 42 16 40 43Z"/><path d="M60 67c-5-32 14-54 39-56 8 27-7 54-39 56Z"/></svg>
        </div>
        <div class="book-object">
          <div class="book-back" aria-hidden="true"></div>
          <div class="book-pages" aria-hidden="true"><span class="page-drawing">✧<br><small>Era uma vez<br>uma nova ideia.</small></span></div>
          <button class="book-cover" data-book-toggle aria-expanded="false" aria-controls="book-discoveries" aria-label="Abrir o livro de descobertas">
            <span class="book-face">
              <span class="cover-border"></span>
              <span class="cover-edition">BENA STUDIES</span>
              <span class="cover-compass">${star}<i></i><i></i></span>
              <span class="cover-title">O mundo<br>começa<br><b>aqui.</b></span>
              <span class="cover-bottom">PARA MENTES CURIOSAS</span>
            </span>
            <span class="book-inside" aria-hidden="true"><span>O melhor de aprender<br>é descobrir o que<br>vem depois.</span><b>✦</b></span>
          </button>
          <div class="book-ribbon" aria-hidden="true"></div>
        </div>
        <p class="book-invitation" data-book-hint aria-hidden="true">psiu… tem um mundo aqui dentro.</p>
        <div class="book-discoveries" id="book-discoveries" hidden role="group" aria-label="Mundos para descobrir">${subjectButtons('book-discovery')}</div>
      </div>
    </section>`;

  const classroomMarkup = `
    <section class="experience classroom-experience" aria-labelledby="experience-title">
      <div class="experience-copy classroom-copy">
        <p class="experience-kicker">UM LUGAR PARA QUEM ADORA DESCOBRIR</p>
        <h1 id="experience-title">Aprender é uma<br><em>aventura compartilhada.</em></h1>
        <p class="experience-description">Traga suas perguntas. A próxima descoberta começa aqui.</p>
      </div>
      <div class="classroom-scene">
        <div class="classroom-image-wrap"><img class="classroom-image" src="../assets/sala-descobertas.png" width="1536" height="1024" alt="Três crianças curiosas exploram um pequeno jardim, um planeta de papel e um livro ao redor de uma mesa, em uma sala acolhedora." fetchpriority="high"></div>
        <div class="classroom-light" aria-hidden="true"></div>
        <div class="classroom-motes" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
        <svg class="classroom-orbit" viewBox="0 0 140 100" fill="none" aria-hidden="true"><ellipse cx="70" cy="50" rx="65" ry="24" transform="rotate(-22 70 50)"/><circle cx="22" cy="73" r="4"/></svg>
      </div>
      <div class="classroom-action"><button class="experience-cta" data-explore>Vamos descobrir?<span aria-hidden="true">↗</span></button><p>Um pouquinho de curiosidade. Um montão de possibilidades.</p></div>
    </section>`;

  const constellationMarkup = `
    <section class="experience constellation-experience" aria-labelledby="experience-title">
      <div class="experience-copy constellation-copy">
        <p class="experience-kicker">SIGA A SUA CURIOSIDADE</p>
        <h1 id="experience-title">Seu próximo <em>“eu consegui!”</em><br>está nas estrelas.</h1>
        <p class="experience-description">Uma descoberta se conecta à outra. Veja até onde você pode chegar.</p>
      </div>
      <div class="constellation-stage">
        <div class="starfield" aria-hidden="true">${Array.from({ length: 24 }, (_, index) => `<i style="--x:${(index * 37 + 5) % 97}%;--y:${(index * 23 + 7) % 95}%;--delay:${-(index % 7)}s;--size:${index % 5 === 0 ? 3 : 2}px"></i>`).join('')}</div>
        <svg class="celestial-map" viewBox="0 0 900 420" fill="none" aria-hidden="true">
          <ellipse class="sky-orbit" cx="450" cy="205" rx="325" ry="151" transform="rotate(-12 450 205)"/>
          <ellipse class="sky-orbit inner-orbit" cx="450" cy="205" rx="225" ry="109" transform="rotate(18 450 205)"/>
          <g class="constellation-connections"><path pathLength="1" d="m450 174-111-46-129 63M450 174l111-72 141 46M450 174l-29 100 87 49"/><circle cx="339" cy="128" r="3"/><circle cx="561" cy="102" r="3"/><circle cx="421" cy="274" r="3"/></g>
          <g class="distant-stars"><path d="m95 81 30 25 34-50M731 313l34-34 48 14M85 327l47 13 13-32"/><circle cx="95" cy="81" r="2"/><circle cx="125" cy="106" r="3"/><circle cx="159" cy="56" r="2"/><circle cx="731" cy="313" r="2"/><circle cx="765" cy="279" r="3"/><circle cx="813" cy="293" r="2"/><circle cx="85" cy="327" r="2"/><circle cx="132" cy="340" r="3"/><circle cx="145" cy="308" r="2"/></g>
        </svg>
        <button class="star-trigger" data-star-toggle aria-expanded="false" aria-controls="star-discoveries"><span class="central-star">${star}</span><span data-star-label>Explorar meu universo <b aria-hidden="true">↗</b></span></button>
        <div class="star-discoveries" id="star-discoveries" hidden role="group" aria-label="Constelações para descobrir">${discoveries.slice(0, 3).map((item, index) => `
          <button class="constellation-node constellation-node-${index}" data-discovery="${escape(item.id)}">
            <span class="node-art" aria-hidden="true">${index === 0 ? '<svg viewBox="0 0 100 80" fill="none"><path d="m23 14 54 52M77 14 23 66"/><circle cx="23" cy="14" r="4"/><circle cx="77" cy="66" r="4"/><circle cx="77" cy="14" r="4"/><circle cx="23" cy="66" r="4"/><circle cx="50" cy="40" r="5"/></svg>' : index === 1 ? '<svg viewBox="0 0 100 80" fill="none"><circle cx="50" cy="40" r="23"/><ellipse cx="50" cy="40" rx="45" ry="13" transform="rotate(-25 50 40)"/><circle cx="9" cy="57" r="4"/><circle cx="85" cy="21" r="3"/></svg>' : '<svg viewBox="0 0 100 80" fill="none"><path d="M50 65V21L15 11v45l35 9 35-9V11L50 21"/><circle cx="15" cy="11" r="3"/><circle cx="85" cy="11" r="3"/><circle cx="50" cy="65" r="4"/></svg>'}</span>
            <span class="node-name">${escape(item.name)}</span><small>${availableLabel(item.id)}</small>
          </button>`).join('')}</div>
      </div>
      <p class="constellation-caption" data-star-hint aria-live="polite">Cada estrela, uma possibilidade.</p>
    </section>`;

  const main = { livro: bookMarkup, sala: classroomMarkup, constelacao: constellationMarkup }[concept];
  document.querySelector('#app').innerHTML = `
    <header class="site-header"><div class="header wrap"><a class="brand" href="../../index.html" aria-label="Bena Studies, início"><span class="brand-icon">b<span>✦</span></span><span>Bena<span class="brand-light">Studies</span></span></a><button class="login" data-login>Entrar <span>↗</span></button></div></header>
    <main class="preview-main" id="conteudo">${main}</main>
    <aside class="preview-tools" aria-label="Comparar propostas de página inicial">
      <span class="preview-tools-label">ESCOLHA SEU MUNDO</span>
      <nav aria-label="Propostas de página inicial">${concepts.map((item, index) => `<a href="../${item.id}/" ${concept === item.id ? 'aria-current="page"' : ''} title="${item.title}"><span class="concept-index">0${index + 1}</span>${item.name}</a>`).join('')}</nav>
      <button class="motion-toggle" aria-pressed="false" title="Pausar animações"><span aria-hidden="true">Ⅱ</span><span data-motion-label>Pausar animações</span></button>
    </aside>
    <dialog id="discovery-dialog" class="discovery-dialog" aria-labelledby="discovery-title"><button class="discovery-close" aria-label="Fechar descobertas">×</button><div id="discovery-content"></div></dialog>
    <dialog id="modal" aria-label="Sua conta Bena Studies"><button class="close" aria-label="Fechar">×</button><div id="modal-content"></div></dialog>`;

  const experience = document.querySelector('.experience');
  const discoveryDialog = document.querySelector('#discovery-dialog');
  const discoveryContent = document.querySelector('#discovery-content');
  const authDialog = document.querySelector('#modal');
  let returnFocus = null;

  for (const dialog of [discoveryDialog, authDialog]) {
    dialog.querySelector('button').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const rect = dialog.getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
  }
  discoveryDialog.addEventListener('close', () => {
    experience.classList.remove('has-selection');
    returnFocus?.focus({ preventScroll: true });
  });
  function openDiscovery() {
    if (!discoveryDialog.open) {
      returnFocus = document.activeElement;
      experience.classList.add('has-selection');
      discoveryDialog.showModal();
    }
    discoveryContent.querySelector('h2')?.focus({ preventScroll: true });
  }
  function panelHeading(kicker, title, description) {
    return `<p class="experience-kicker">${escape(kicker)}</p><h2 id="discovery-title" tabindex="-1">${escape(title)}</h2><p class="discovery-description">${escape(description)}</p>`;
  }
  function gameList(theme) {
    return (theme.jogos || []).map(game => {
      const destination = game.pagina
        ? `../../conteudo/${seriesNumber}-serie/${game.pagina}`
        : '../../index.html#materias';
      return `<a class="discovery-game" href="${escape(destination)}"><span><strong>${escape(game.nome)}</strong><small>${escape(game.descricao)}</small></span><span aria-hidden="true">↗</span></a>`;
    }).join('');
  }
  function showSubject(id) {
    const discovery = discoveries.find(item => item.id === id);
    const subject = subjects.find(item => item.id === id);
    const themes = subject?.temas.filter(theme => theme.jogos?.length) || [];
    if (!themes.length) {
      discoveryContent.innerHTML = panelHeading('AINDA TEM MUITO PARA DESCOBRIR', `${discovery.name}: em breve`, 'Novas aventuras estão por vir. Enquanto isso, que tal explorar os jogos que já estão por aqui?') + '<button class="experience-cta" data-all-discoveries>Ver descobertas disponíveis <span aria-hidden="true">→</span></button>';
    } else {
      discoveryContent.innerHTML = panelHeading(`${series?.nome || ''} · ${subject.nome}`, subject.chamada || subject.nome, 'Escolha um jogo e deixe a curiosidade fazer o resto.') + themes.map(theme => `<section class="discovery-theme"><h3>${escape(theme.nome)}</h3><div class="discovery-game-list">${gameList(theme)}</div></section>`).join('');
    }
    openDiscovery();
  }
  function showDiscoveries() {
    const available = discoveries.filter(item => hasGames(item.id));
    discoveryContent.innerHTML = panelHeading(series?.nome || 'Bena Studies', 'O que vamos descobrir hoje?', available.length ? 'Sua próxima aventura está logo aqui.' : 'As primeiras aventuras estão chegando. Volte em breve!') + `<div class="available-discoveries">${available.map(item => `<button class="discovery-game" data-discovery="${escape(item.id)}"><span><strong>${escape(item.name)}</strong><small>${escape(item.description)}</small></span><span aria-hidden="true">↗</span></button>`).join('')}</div>`;
    openDiscovery();
  }
  document.addEventListener('click', event => {
    const discoveryButton = event.target.closest('[data-discovery]');
    if (discoveryButton) showSubject(discoveryButton.dataset.discovery);
    if (event.target.closest('[data-explore], [data-all-discoveries]')) showDiscoveries();
  });

  if (concept === 'livro') {
    const region = document.querySelector('#book-discoveries');
    document.querySelectorAll('[data-book-toggle]').forEach(button => button.addEventListener('click', () => {
      const open = experience.classList.toggle('is-revealed');
      region.hidden = !open;
      document.querySelectorAll('[data-book-toggle]').forEach(trigger => trigger.setAttribute('aria-expanded', String(open)));
      document.querySelector('.book-cover').setAttribute('aria-label', open ? 'Fechar o livro de descobertas' : 'Abrir o livro de descobertas');
      document.querySelector('[data-book-label]').textContent = open ? 'Fechar o livro' : 'Abrir o livro';
      document.querySelector('[data-book-hint]').textContent = open ? 'Qual mundo vamos descobrir hoje?' : 'psiu… tem um mundo aqui dentro.';
    }));
  }
  if (concept === 'constelacao') {
    document.querySelector('[data-star-toggle]').addEventListener('click', event => {
      const open = experience.classList.toggle('is-revealed');
      document.querySelector('#star-discoveries').hidden = !open;
      event.currentTarget.setAttribute('aria-expanded', String(open));
      event.currentTarget.setAttribute('aria-label', open ? 'Recolher constelações' : 'Explorar meu universo');
      document.querySelector('[data-star-label]').innerHTML = open ? 'Sua curiosidade <b aria-hidden="true">✦</b>' : 'Explorar meu universo <b aria-hidden="true">↗</b>';
      document.querySelector('[data-star-hint]').textContent = open ? 'Escolha uma constelação e comece a explorar.' : 'Cada estrela, uma possibilidade.';
    });
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionButton = document.querySelector('.motion-toggle');
  let paused = false;
  try { paused = sessionStorage.getItem('bena-preview-motion') === 'paused'; } catch { /* A preferência é opcional. */ }
  function applyMotionPreference() {
    const stopped = paused || reducedMotion.matches;
    document.body.classList.toggle('preview-motion-paused', stopped);
    motionButton.setAttribute('aria-pressed', String(stopped));
    motionButton.disabled = reducedMotion.matches;
    motionButton.title = reducedMotion.matches ? 'Movimento reduzido ativado no seu dispositivo' : stopped ? 'Ativar animações' : 'Pausar animações';
    document.querySelector('[data-motion-label]').textContent = reducedMotion.matches ? 'Movimento reduzido' : stopped ? 'Ativar animações' : 'Pausar animações';
    motionButton.firstElementChild.textContent = stopped ? '▷' : 'Ⅱ';
  }
  motionButton.addEventListener('click', () => {
    paused = !paused;
    try { sessionStorage.setItem('bena-preview-motion', paused ? 'paused' : 'playing'); } catch { /* Sem armazenamento, a preferência vale nesta página. */ }
    applyMotionPreference();
  });
  reducedMotion.addEventListener('change', applyMotionPreference);
  applyMotionPreference();
  document.addEventListener('visibilitychange', () => document.body.classList.toggle('preview-inactive', document.hidden));

  // O componente de autenticação compartilhado assume o botão assim que estiver pronto.
  document.querySelector('[data-login]').onclick = () => {
    document.querySelector('#modal-content').innerHTML = '<h2>Sua conta Bena Studies</h2><p>A conexão está demorando um pouquinho. Tente entrar novamente em alguns instantes.</p>';
    authDialog.showModal();
  };
})();
