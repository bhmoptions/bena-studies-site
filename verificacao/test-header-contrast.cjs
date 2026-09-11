const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/Felippe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']
  });

  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

    // 1. Validar 004 (Tabuada Race 2)
    await page.goto('http://localhost:8765/conteudo/3-serie/matematica/tabuada/004/index.html');
    await page.waitForSelector('.game-template-header');

    const h004 = await page.evaluate(() => {
      const h = document.querySelector('.game-template-header');
      const cs = window.getComputedStyle(h);
      const a = h.querySelector('a').getBoundingClientRect();
      const span = h.querySelector('span').getBoundingClientRect();
      const hr = h.getBoundingClientRect();
      return {
        bg: cs.backgroundColor,
        childrenCount: h.children.length,
        aLeft: Math.round(a.left - hr.left),
        spanRight: Math.round(hr.right - span.right),
        spanText: h.querySelector('span').innerText
      };
    });
    console.log('004 Header:', h004);
    assert.equal(h004.bg, 'rgb(25, 29, 41)', '004 Header must have solid background rgb(25, 29, 41)');
    assert.equal(h004.childrenCount, 2, '004 Header must have exactly 2 elements (no game title)');
    assert(h004.spanRight < 40, 'Bena Studies must be aligned to the right');

    // Testar contraste do texto em erro
    await page.evaluate(() => {
      const feedback = document.querySelector('.feedback');
      feedback.className = 'feedback mascot-feedback error';
      feedback.innerHTML = '<div class="mascot-message"><div class="mascot-copy"><strong class="mascot-title">✖ AINDA NÃO!</strong><span class="mascot-caption">Vamos pensar juntos?</span></div></div>';
    });
    const captionColor = await page.evaluate(() => {
      const cap = document.querySelector('.mascot-caption');
      return window.getComputedStyle(cap).color;
    });
    console.log('004 Mascot caption color in error:', captionColor);
    assert.equal(captionColor, 'rgb(255, 246, 233)', 'Caption text must be #fff6e9 for clear contrast in error state');

    await page.screenshot({ path: 'verificacao/test-004-updated.png' });

    // 2. Validar 002 Header
    await page.goto('http://localhost:8765/conteudo/3-serie/matematica/tabuada/002/index.html');
    const h002 = await page.evaluate(() => {
      const h = document.querySelector('.game-template-header');
      const cs = window.getComputedStyle(h);
      return { bg: cs.backgroundColor, children: h.children.length, text: h.innerText };
    });
    console.log('002 Header:', h002);
    assert.equal(h002.bg, 'rgb(25, 29, 41)');
    assert.equal(h002.children, 2);

    // 3. Validar 003 Header
    await page.goto('http://localhost:8765/conteudo/3-serie/matematica/tabuada/003/index.html');
    const h003 = await page.evaluate(() => {
      const h = document.querySelector('.game-template-header');
      const cs = window.getComputedStyle(h);
      return { bg: cs.backgroundColor, children: h.children.length, text: h.innerText };
    });
    console.log('003 Header:', h003);
    assert.equal(h003.bg, 'rgb(25, 29, 41)');
    assert.equal(h003.children, 2);

    // 4. Validar Template Header
    await page.goto('http://localhost:8765/templates/jogo-duas-areas/index.html');
    const hTpl = await page.evaluate(() => {
      const h = document.querySelector('.game-template-header');
      const cs = window.getComputedStyle(h);
      return { bg: cs.backgroundColor, children: h.children.length, text: h.innerText };
    });
    console.log('Template Header:', hTpl);
    assert.equal(hTpl.bg, 'rgb(25, 29, 41)');
    assert.equal(hTpl.children, 2);

    console.log('ALL HEADER AND CONTRAST TESTS PASSED_SUCCESSFULLY!');
  } finally {
    await browser.close();
  }
})();
