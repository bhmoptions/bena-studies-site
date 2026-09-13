/* Cabeçalho, navegação e marca compartilhados por todas as páginas ativas. */
(() => {
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);

  function ensureAuthModal() {
    if (document.querySelector('#modal')) return;

    const modal = document.createElement('dialog');
    modal.id = 'modal';
    modal.innerHTML = '<button class="close" aria-label="Fechar">×</button><div id="modal-content"></div>';
    document.body.append(modal);

    modal.querySelector('.close').addEventListener('click', () => modal.close());
    modal.addEventListener('click', event => {
      if (event.target !== modal) return;
      const bounds = modal.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) modal.close();
    });
  }

  function createHeader(mount, index) {
    const base = mount.dataset.base || './';
    const menuId = `site-navigation-menu-${index + 1}`;
    ensureAuthModal();

    mount.innerHTML = `
      <header class="site-header shared-site-header">
        <div class="header shared-header-row">
          <div class="shared-brand-area">
            <button class="shared-menu-toggle" type="button" data-shared-menu-toggle aria-label="Abrir menu dos jogos" hidden><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></button>
            <a class="brand" href="${base}index.html" aria-label="Bena Studies, início"><span class="brand-icon">b<span>✦</span></span><span>Bena<span class="brand-light">Studies</span></span></a>
          </div>
          <button class="login" data-login>Entrar <span>↗</span></button>
        </div>
      </header>`;

    const header = mount.querySelector('.shared-site-header');
    const toggle = header.querySelector('[data-shared-menu-toggle]');
    const layer = document.createElement('div');
    layer.className = 'shared-menu-layer';
    layer.hidden = true;
    layer.innerHTML = `
      <button class="shared-menu-scrim" type="button" data-shared-menu-close aria-label="Fechar menu"></button>
      <aside class="shared-menu-panel" id="${menuId}" role="dialog" aria-modal="true" aria-label="Navegação dos jogos" tabindex="-1">
        <div class="shared-menu-panel-header">
          <a class="brand" href="${base}index.html" aria-label="Bena Studies, início"><span class="brand-icon">b<span>✦</span></span><span>Bena<span class="brand-light">Studies</span></span></a>
          <button class="shared-menu-close" type="button" data-shared-menu-close aria-label="Fechar menu">×</button>
        </div>
        <div class="shared-menu-content"></div>
      </aside>`;
    document.body.append(layer);

    const panel = layer.querySelector('.shared-menu-panel');
    const content = layer.querySelector('.shared-menu-content');
    const closeButtons = layer.querySelectorAll('[data-shared-menu-close]');
    let lastFocus = null;

    toggle.setAttribute('aria-controls', menuId);
    toggle.setAttribute('aria-expanded', 'false');

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
        content.innerHTML = '<p class="shared-menu-kicker">EXPLORAR</p><h2>Jogos da sua série</h2><p class="shared-menu-empty">Ainda estamos preparando as matérias da sua série.</p>';
        return;
      }

      const subjects = series.materias || [];
      content.innerHTML = `
        <p class="shared-menu-kicker">EXPLORAR</p>
        <h2>Matérias da ${escapeHtml(series.nome)}</h2>
        <p class="shared-menu-intro">Escolha uma matéria para encontrar suas brincadeiras.</p>
        <nav class="shared-menu-subjects" aria-label="Matérias">
          ${subjects.map((subject, subjectIndex) => `<button class="shared-menu-subject" type="button" data-shared-menu-subject="${subjectIndex}">
            <span class="shared-menu-subject-symbol" aria-hidden="true">${escapeHtml(subject.simbolo || '✦')}</span>
            <span>${escapeHtml(subject.nome)}</span><b aria-hidden="true">→</b>
          </button>`).join('') || '<p class="shared-menu-empty">Novas matérias chegarão em breve.</p>'}
        </nav>`;

      content.querySelectorAll('[data-shared-menu-subject]').forEach(button => {
        button.addEventListener('click', () => renderSubject(subjects[Number(button.dataset.sharedMenuSubject)]));
      });
    }

    function renderSubject(subject) {
      const { id: seriesId, data: series } = activeSeries();
      if (!series || !subject) return renderSubjects();
      const themes = subject.temas || [];
      content.innerHTML = `
        <button class="shared-menu-back" type="button" data-shared-menu-back>← Todas as matérias</button>
        <p class="shared-menu-kicker">${escapeHtml(series.nome)} · ${escapeHtml(subject.nome)}</p>
        <h2>${escapeHtml(subject.nome)}</h2>
        <div class="shared-menu-themes">
          ${themes.map(theme => `<section class="shared-menu-theme">
            <h3>${escapeHtml(theme.nome)}</h3>
            <div class="shared-menu-games">
              ${(theme.jogos || []).map(game => `<a class="shared-menu-game" href="${escapeHtml(gameHref(seriesId, game))}">
                <span><strong>${escapeHtml(game.nome)}</strong><small>${escapeHtml(game.descricao)}</small></span><b aria-hidden="true">↗</b>
              </a>`).join('') || '<p class="shared-menu-empty">Novos jogos chegarão em breve.</p>'}
            </div>
          </section>`).join('') || '<p class="shared-menu-empty">Novos temas chegarão em breve.</p>'}
        </div>`;
      content.querySelector('[data-shared-menu-back]')?.addEventListener('click', renderSubjects);
    }

    function openMenu() {
      if (toggle.hidden) return;
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

    function setMenuAccess(loggedIn) {
      if (!loggedIn) closeMenu();
      toggle.hidden = !loggedIn;
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
    window.addEventListener('bena:auth-state', event => setMenuAccess(Boolean(event.detail?.loggedIn)));

    if (window.BENA_AUTH?.isAuthReady?.()) {
      setMenuAccess(window.BENA_AUTH.isLoggedIn());
    } else {
      window.BENA_AUTH?.onAuthReady?.(user => setMenuAccess(Boolean(user)));
    }
  }

  document.querySelectorAll('[data-shared-header]').forEach(createHeader);
})();
