const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/Felippe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const pages = [
  ['landing', 'http://localhost:8765/'],
  ['Tabuada 001', 'http://localhost:8765/conteudo/3-serie/matematica/tabuada/001/index.html'],
  ['Tabuada 002', 'http://localhost:8765/conteudo/3-serie/matematica/tabuada/002/index.html'],
  ['Tabuada 003', 'http://localhost:8765/conteudo/3-serie/matematica/tabuada/003/index.html'],
  ['template', 'http://localhost:8765/templates/jogo-duas-areas/index.html']
];

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.route('**/assets/componentes/auth.js*', route => route.abort());

    for (const [name, url] of pages) {
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.shared-site-header');

      const header = await page.evaluate(() => {
        const element = document.querySelector('.shared-site-header');
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const brand = element.querySelector('.brand').getBoundingClientRect();
        const login = element.querySelector('[data-login]').getBoundingClientRect();
        return {
          background: style.backgroundColor,
          height: Math.round(rect.height),
          borderBottom: style.borderBottomColor,
          brandText: element.querySelector('.brand > span:last-child').innerText,
          brandHref: element.querySelector('.brand').href,
          brandLeft: Math.round(brand.left),
          loginLeft: Math.round(login.left),
          menuHidden: element.querySelector('[data-shared-menu-toggle]').hidden
        };
      });

      console.log(`${name}:`, header);
      assert.equal(header.background, 'rgb(25, 29, 41)', `${name}: fundo do cabeçalho`);
      assert.equal(header.height, 62, `${name}: altura do cabeçalho`);
      assert.equal(header.borderBottom, 'rgb(48, 54, 70)', `${name}: borda inferior`);
      assert.equal(header.brandText, 'BenaStudies', `${name}: marca compartilhada`);
      assert(header.brandHref.endsWith('/index.html'), `${name}: logo deve levar ao início`);
      assert.equal(header.menuHidden, true, `${name}: visitantes não devem ver o menu`);
      assert(header.brandLeft < header.loginLeft, `${name}: ordem marca e login`);

      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('bena:auth-state', { detail: { loggedIn: true } }));
      });
      await page.locator('[data-shared-menu-toggle]').waitFor({ state: 'visible' });
      const signedInHeader = await page.evaluate(() => ({
        toggleLeft: Math.round(document.querySelector('[data-shared-menu-toggle]').getBoundingClientRect().left),
        brandLeft: Math.round(document.querySelector('.shared-site-header .brand').getBoundingClientRect().left)
      }));
      assert(signedInHeader.toggleLeft < signedInHeader.brandLeft, `${name}: menu deve ficar antes da marca após o login`);

      await page.locator('[data-shared-menu-toggle]').click();
      await page.waitForSelector('.shared-menu-layer.is-open');
      await page.waitForFunction(() => Math.abs(document.querySelector('.shared-menu-panel').getBoundingClientRect().left) < 1);
      const menu = await page.evaluate(() => {
        const panel = document.querySelector('.shared-menu-panel');
        const rect = panel.getBoundingClientRect();
        return {
          left: rect.left,
          logo: panel.querySelector('.brand > span:last-child')?.innerText,
          homeHref: panel.querySelector('.brand')?.href
        };
      });
      assert(Math.abs(menu.left) < 1, `${name}: menu deve abrir pela esquerda`);
      assert.equal(menu.logo, 'BenaStudies', `${name}: logo dentro do menu`);
      assert(menu.homeHref.endsWith('/index.html'), `${name}: logo do menu deve levar ao início`);
      await page.keyboard.press('Escape');
      await page.waitForSelector('.shared-menu-layer', { state: 'hidden' });

      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent('bena:auth-state', { detail: { loggedIn: false } }));
      });
      await page.locator('[data-shared-menu-toggle]').waitFor({ state: 'hidden' });
    }

    console.log('OK: cabeçalho e menu compartilhados em todas as páginas ativas.');
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exit(1);
});
