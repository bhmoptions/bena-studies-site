const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { chromium } = require(process.env.BENA_PLAYWRIGHT || 'C:/Users/Felippe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const base = process.env.BENA_TEST_URL || 'http://localhost:8765';
const output = path.join(os.tmpdir(), 'bena-previas-landing');
fs.mkdirSync(output, { recursive: true });

async function headerSnapshot(page) {
  return page.locator('.site-header').evaluate(header => {
    const elements = [header, ...header.querySelectorAll('*')];
    return elements.map(element => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return {
        tag: element.tagName, className: element.className,
        text: element.children.length ? '' : element.textContent,
        x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height),
        color: style.color, background: style.backgroundColor, font: style.font, border: style.border,
      };
    });
  });
}

(async () => {
  const browser = await chromium.launch({
    executablePath: process.env.BENA_BROWSER || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
  });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    const missing = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.url().startsWith(base) && response.status() >= 400) missing.push(`${response.status()} ${response.url()}`);
    });
    const viewports = [
      { width: 1440, height: 900 },
      { width: 768, height: 1024 },
      { width: 390, height: 844 },
      { width: 320, height: 740 },
    ];
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      await page.goto(base, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      const originalHeader = await headerSnapshot(page);
      for (const concept of ['livro', 'sala', 'constelacao']) {
        await page.goto(`${base}/preview/${concept}/`, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        assert.deepEqual(await headerSnapshot(page), originalHeader, `${concept}: cabeçalho original em ${viewport.width}px`);
        assert.equal(await page.locator('html').getAttribute('lang'), 'pt-BR');
        assert.equal(await page.locator('h1').count(), 1);
        if (process.env.BENA_REQUIRE_NETWORK === '1') {
          assert.equal(await page.evaluate(() => !!window.BENA_AUTH), true, 'Autenticação compartilhada carregada');
          assert.equal(await page.evaluate(() => ['Kalam', 'DM Sans', 'Fredoka'].every(name => [...document.fonts].some(font => font.family === name && font.status === 'loaded'))), true, 'Fontes originais carregadas');
          await page.locator('[data-login]').click();
          assert.equal(await page.locator('#auth-form').count(), 1, 'Botão Entrar abre o formulário original');
          await page.keyboard.press('Escape');
        }
        const overflows = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
        assert.equal(overflows, false, `${concept}: sem rolagem horizontal em ${viewport.width}px`);
        if (concept === 'sala') {
          assert.equal(await page.locator('.classroom-image').evaluate(image => image.complete && image.naturalWidth > 0), true);
        }
        await page.screenshot({ path: path.join(output, `${concept}-${viewport.width}.png`), fullPage: true, animations: 'disabled' });
        if (concept === 'livro') await page.locator('[data-book-toggle]').first().click();
        if (concept === 'constelacao') await page.locator('[data-star-toggle]').click();
        if (concept === 'sala') {
          await page.getByRole('button', { name: 'Vamos descobrir?' }).click();
          assert.match(await page.locator('#discovery-content').innerText(), /Matemática/);
          await page.keyboard.press('Escape');
        } else {
          const trigger = page.locator(concept === 'livro' ? '[data-book-toggle]' : '[data-star-toggle]').first();
          assert.equal(await trigger.getAttribute('aria-expanded'), 'true');
          await page.locator('[data-discovery="matematica"]').first().waitFor({ state: 'visible' });
          await page.screenshot({ path: path.join(output, `${concept}-aberto-${viewport.width}.png`), fullPage: true, animations: 'disabled' });
          await page.locator('[data-discovery="matematica"]').first().click();
          assert.equal(await page.locator('.discovery-game').count(), 3);
          const destinations = await page.locator('a.discovery-game').evaluateAll(links => links.map(link => link.href));
          for (const destination of destinations) {
            const response = await context.request.get(destination);
            assert.equal(response.status(), 200, `${concept}: jogo acessível em ${destination}`);
          }
          await page.keyboard.press('Escape');
          assert.equal(await page.locator('#discovery-dialog').evaluate(dialog => dialog.open), false);
          assert.equal(await page.locator('[data-discovery="matematica"]').first().evaluate(button => button === document.activeElement), true);
          await page.locator('[data-discovery="ciencias"]').first().click();
          assert.match(await page.locator('#discovery-title').innerText(), /em breve/);
          await page.getByRole('button', { name: 'Ver descobertas disponíveis' }).click();
          await page.locator('#discovery-content [data-discovery="matematica"]').click();
          assert.equal(await page.locator('.discovery-game').count(), 3);
          await page.keyboard.press('Escape');
          await trigger.click();
          assert.equal(await trigger.getAttribute('aria-expanded'), 'false');
        }
        console.log(`OK ${concept}: ${viewport.width}px, cabeçalho, conteúdo, imagem e navegação.`);
      }
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${base}/preview/livro/`, { waitUntil: 'networkidle' });
    await page.locator('[data-book-toggle]').first().focus();
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('#book-discoveries').isVisible(), true, 'Abertura por teclado');
    await page.getByRole('button', { name: 'Pausar animações' }).click();
    assert.equal(await page.locator('.motion-toggle').getAttribute('aria-pressed'), 'true');
    await page.goto(`${base}/preview/constelacao/`, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('.motion-toggle').getAttribute('aria-pressed'), 'true', 'Preferência de movimento entre páginas');
    await page.locator('[data-star-toggle]').focus();
    await page.keyboard.press('Space');
    assert.equal(await page.locator('#star-discoveries').isVisible(), true);
    assert.equal(await page.locator('[data-discovery="matematica"]').first().evaluate(element => getComputedStyle(element).opacity), '1', 'Descobertas visíveis mesmo com animação pausada');

    await page.emulateMedia({ reducedMotion: 'reduce' });
    for (const concept of ['livro', 'sala', 'constelacao']) {
      await page.goto(`${base}/preview/${concept}/`, { waitUntil: 'networkidle' });
      assert.equal(await page.locator('.motion-toggle').isDisabled(), true);
      if (concept === 'livro') await page.locator('[data-book-toggle]').first().click();
      if (concept === 'constelacao') await page.locator('[data-star-toggle]').click();
      const animations = await page.locator('.preview-main').evaluate(element => element.getAnimations({ subtree: true }).filter(animation => animation.playState === 'running').length);
      assert.equal(animations, 0, `${concept}: respeita redução de movimento`);
    }
    assert.deepEqual(errors, [], 'Sem exceções de JavaScript');
    assert.deepEqual(missing, [], 'Sem arquivos locais ausentes');
    console.log(`OK: teclado, foco, preferências de movimento, catálogo e arquivos. Capturas: ${output}`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exit(1); });
