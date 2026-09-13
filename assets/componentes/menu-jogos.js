/* Navegação compartilhada das páginas próprias de jogos. */
(() => {
  const script = document.currentScript;
  const base = script?.dataset.base || './';
  const header = document.querySelector('.game-template-header');
  const toggle = header?.querySelector('[data-game-menu-toggle]');
  if (!header || !toggle) return;

  const menuId = 'game-navigation-menu';
  const layer = document.createElement('div');
  layer.className = 'game-menu-layer';
  layer.hidden = true;
  layer.innerHTML = `
    <button class="game-menu-scrim" type="button" data-game-menu-close aria-label="Fechar menu"></button>
    <aside class="game-menu-panel" id="${menuId}" role="dialog" aria-modal="true" aria-label="Navegação dos jogos" tabindex="-1">
      <div class="game-menu-panel-header">
        <span class="game-menu-panel-label">Bena Studies <b>✦</b></span>
        <button class="game-menu-close" type="button" data-game-menu-close aria-label="Fechar menu">×</button>
      </div>
      <div class="game-menu-content"></div>
    </aside>`;
  document.body.append(layer);

  const panel = layer.querySelector('.game-menu-panel');
  const content = layer.querySelector('.game-menu-content');
  const closeButtons = layer.querySelectorAll('[data-game-menu-close]');
  let lastFocus = null;

  toggle.setAttribute('aria-controls', menuId);
  toggle.setAttribute('aria-expanded', 'false');

  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);

  function activeSeries() {
    const seriesId = Number(window.BENA_CONFIG?.serieAtual);
    return { id: seriesId, data: window.BENA_CONTEUDO?.[seriesId] || null };
  }

  function gameHref(seriesId, theme, game) {
    if (game.pagina) return `${base}conteudo/${seriesId}-serie/${game.pagina}`;
    const themeFolder = String(game.arquivo || '').split('/')[1];
    return `${base}index.html${themeFolder ? `#jogos-${themeFolder}` : ''}`;
  }

  function renderSubjects() {
    const { data: series } = activeSeries();
    if (!series) {
      content.innerHTML = '<p class="game-menu-kicker">EXPLORAR</p><h2>Jogos da sua série</h2><p class="game-menu-empty">Ainda estamos preparando as matérias da sua série.</p>';
      return;
    }

    const subjects = series.materias || [];
    content.innerHTML = `
      <p class="game-menu-kicker">EXPLORAR</p>
      <h2>Matérias da ${escapeHtml(series.nome)}</h2>
      <p class="game-menu-intro">Escolha uma matéria para encontrar suas brincadeiras.</p>
      <nav class="game-menu-subjects" aria-label="Matérias">
        ${subjects.map((subject, index) => `<button class="game-menu-subject" type="button" data-game-subject="${index}">
          <span class="game-menu-subject-symbol" aria-hidden="true">${escapeHtml(subject.simbolo || '✦')}</span>
          <span>${escapeHtml(subject.nome)}</span><b aria-hidden="true">→</b>
        </button>`).join('') || '<p class="game-menu-empty">Novas matérias chegarão em breve.</p>'}
      </nav>`;

    content.querySelectorAll('[data-game-subject]').forEach(button => {
      button.addEventListener('click', () => renderSubject(subjects[Number(button.dataset.gameSubject)]));
    });
  }

  function renderSubject(subject) {
    const { id: seriesId, data: series } = activeSeries();
    if (!series || !subject) return renderSubjects();
    const themes = subject.temas || [];
    content.innerHTML = `
      <button class="game-menu-back" type="button" data-game-menu-back>← Todas as matérias</button>
      <p class="game-menu-kicker">${escapeHtml(series.nome)} · ${escapeHtml(subject.nome)}</p>
      <h2>${escapeHtml(subject.nome)}</h2>
      <div class="game-menu-themes">
        ${themes.map(theme => `<section class="game-menu-theme">
          <h3>${escapeHtml(theme.nome)}</h3>
          <div class="game-menu-games">
            ${(theme.jogos || []).map(game => `<a class="game-menu-game" href="${escapeHtml(gameHref(seriesId, theme, game))}">
              <span><strong>${escapeHtml(game.nome)}</strong><small>${escapeHtml(game.descricao)}</small></span><b aria-hidden="true">↗</b>
            </a>`).join('') || '<p class="game-menu-empty">Novos jogos chegarão em breve.</p>'}
          </div>
        </section>`).join('') || '<p class="game-menu-empty">Novos temas chegarão em breve.</p>'}
      </div>`;
    content.querySelector('[data-game-menu-back]')?.addEventListener('click', renderSubjects);
  }

  function openMenu() {
    lastFocus = document.activeElement;
    renderSubjects();
    layer.hidden = false;
    requestAnimationFrame(() => layer.classList.add('is-open'));
    toggle.setAttribute('aria-expanded', 'true');
    panel.focus();
  }

  function closeMenu() {
    if (layer.hidden) return;
    layer.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    window.setTimeout(() => { layer.hidden = true; }, 220);
    lastFocus?.focus?.();
  }

  function trapFocus(event) {
    if (event.key !== 'Tab' || layer.hidden) return;
    const focusable = [...panel.querySelectorAll('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }

  toggle.addEventListener('click', () => layer.hidden ? openMenu() : closeMenu());
  closeButtons.forEach(button => button.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
    trapFocus(event);
  });
  window.addEventListener('bena:serie-alterada', () => { if (!layer.hidden) renderSubjects(); });
})();
