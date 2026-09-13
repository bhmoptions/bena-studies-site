/* Navegação da landing page; as páginas de jogo mantêm seu próprio menu. */
(() => {
  const toggle = document.querySelector('[data-landing-menu-toggle]');
  if (!toggle) return;

  const base = './';
  const menuId = 'landing-navigation-menu';
  const layer = document.createElement('div');
  layer.className = 'landing-menu-layer';
  layer.hidden = true;
  layer.innerHTML = `
    <button class="landing-menu-scrim" type="button" data-landing-menu-close aria-label="Fechar menu"></button>
    <aside class="landing-menu-panel" id="${menuId}" role="dialog" aria-modal="true" aria-label="Navegação dos jogos" tabindex="-1">
      <div class="landing-menu-panel-header">
        <span class="landing-menu-panel-label">Bena Studies <b>✦</b></span>
        <button class="landing-menu-close" type="button" data-landing-menu-close aria-label="Fechar menu">×</button>
      </div>
      <div class="landing-menu-content"></div>
    </aside>`;
  document.body.append(layer);

  const panel = layer.querySelector('.landing-menu-panel');
  const content = layer.querySelector('.landing-menu-content');
  const closeButtons = layer.querySelectorAll('[data-landing-menu-close]');
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

  function gameHref(seriesId, game) {
    if (game.pagina) return `${base}conteudo/${seriesId}-serie/${game.pagina}`;
    const themeFolder = String(game.arquivo || '').split('/')[1];
    return `${base}index.html${themeFolder ? `#jogos-${themeFolder}` : ''}`;
  }

  function renderSubjects() {
    const { data: series } = activeSeries();
    if (!series) {
      content.innerHTML = '<p class="landing-menu-kicker">EXPLORAR</p><h2>Jogos da sua série</h2><p class="landing-menu-empty">Ainda estamos preparando as matérias da sua série.</p>';
      return;
    }

    const subjects = series.materias || [];
    content.innerHTML = `
      <p class="landing-menu-kicker">EXPLORAR</p>
      <h2>Matérias da ${escapeHtml(series.nome)}</h2>
      <p class="landing-menu-intro">Escolha uma matéria para encontrar suas brincadeiras.</p>
      <nav class="landing-menu-subjects" aria-label="Matérias">
        ${subjects.map((subject, index) => `<button class="landing-menu-subject" type="button" data-landing-menu-subject="${index}">
          <span class="landing-menu-subject-symbol" aria-hidden="true">${escapeHtml(subject.simbolo || '✦')}</span>
          <span>${escapeHtml(subject.nome)}</span><b aria-hidden="true">→</b>
        </button>`).join('') || '<p class="landing-menu-empty">Novas matérias chegarão em breve.</p>'}
      </nav>`;

    content.querySelectorAll('[data-landing-menu-subject]').forEach(button => {
      button.addEventListener('click', () => renderSubject(subjects[Number(button.dataset.landingMenuSubject)]));
    });
  }

  function renderSubject(subject) {
    const { id: seriesId, data: series } = activeSeries();
    if (!series || !subject) return renderSubjects();
    const themes = subject.temas || [];
    content.innerHTML = `
      <button class="landing-menu-back" type="button" data-landing-menu-back>← Todas as matérias</button>
      <p class="landing-menu-kicker">${escapeHtml(series.nome)} · ${escapeHtml(subject.nome)}</p>
      <h2>${escapeHtml(subject.nome)}</h2>
      <div class="landing-menu-themes">
        ${themes.map(theme => `<section class="landing-menu-theme">
          <h3>${escapeHtml(theme.nome)}</h3>
          <div class="landing-menu-games">
            ${(theme.jogos || []).map(game => `<a class="landing-menu-game" href="${escapeHtml(gameHref(seriesId, game))}">
              <span><strong>${escapeHtml(game.nome)}</strong><small>${escapeHtml(game.descricao)}</small></span><b aria-hidden="true">↗</b>
            </a>`).join('') || '<p class="landing-menu-empty">Novos jogos chegarão em breve.</p>'}
          </div>
        </section>`).join('') || '<p class="landing-menu-empty">Novos temas chegarão em breve.</p>'}
      </div>`;
    content.querySelector('[data-landing-menu-back]')?.addEventListener('click', renderSubjects);
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
