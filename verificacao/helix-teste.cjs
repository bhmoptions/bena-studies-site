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
    const errors = [];
    const badRequests = [];

    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => {
      if (r.status() >= 400 && !r.url().endsWith('favicon.ico')) badRequests.push(r.url());
    });

    console.log('1. Acessando página inicial...');
    await page.goto('http://localhost:8765/index.html');
    await page.waitForTimeout(300);

    console.log('2. Abrindo matéria de Matemática...');
    await page.locator('[data-subject="0"]').click();
    await page.waitForSelector('[data-topic="0"]');

    console.log('3. Abrindo tema Multiplicação...');
    await page.locator('[data-topic="0"]').click();
    await page.waitForSelector('[data-game]');

    console.log('4. Clicando no jogo Tabuada Race2...');
    const race2Btn = page.locator('[data-game]').filter({ hasText: 'Tabuada Race2' });
    await race2Btn.click();

    console.log('5. Aguardando carregamento da página dedicada...');
    await page.waitForURL('**/conteudo/3-serie/matematica/tabuada/004/index.html');

    // Aguarda elementos essenciais
    await page.waitForSelector('.helix-canvas-container canvas', { timeout: 8000 });
    await page.waitForSelector('#hud-level');
    await page.waitForSelector('#current-question');
    await page.waitForSelector('.mascot-feedback');

    const levelText = await page.locator('#hud-level').textContent();
    const scoreText = await page.locator('#hud-score').textContent();
    const questionText = await page.locator('#current-question').textContent();

    console.log(`Dados na tela: Plataforma=${levelText}, Pontos=${scoreText}, Pergunta=${questionText}`);
    assert.equal(levelText.trim(), '1', 'Plataforma inicial deve ser 1');
    assert.equal(scoreText.trim(), '0', 'Pontos iniciais devem ser 0');
    assert.match(questionText.trim(), /^\d+\s*×\s*\d+\s*=\s*\?$/, 'Formato de pergunta válido');

    console.log('6. Testando controles de rotação e alinhando número...');
    await page.locator('#btn-rotate-left').click();
    await page.waitForTimeout(300);
    await page.locator('#btn-rotate-left').click();
    await page.waitForTimeout(600);

    console.log('7. Capturando screenshot desktop com número em foco...');
    await page.screenshot({ path: 'verificacao/helix-desktop.png', fullPage: false });

    console.log('8. Testando visualização mobile (390x844)...');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'verificacao/helix-mobile.png', fullPage: false });

    console.log('9. Testando exibição do resultado final no desktop...');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => {
      const stats = { gameScore: 28, firstHits: 9, totalErrors: 1, totalPlatforms: 10 };
      const activeSection = document.querySelector('#helix-active-section');
      const resultCard = document.querySelector('#helix-result-card');
      const resGameScore = document.querySelector('#res-game-score');
      const resScoreSummary = document.querySelector('#res-score-summary');
      const resultFeedback = document.querySelector('.result-feedback');
      activeSection.hidden = true;
      resultCard.hidden = false;
      resGameScore.textContent = String(stats.gameScore);
      const resOficial = window.BenaPontuacao.calcular({
        total: 10,
        acertosPrimeira: 9,
        erros: 1,
        rodada: 1,
        concluida: true,
        tempoAtivo: false
      });
      resScoreSummary.innerHTML = `
        <strong class="score-value">${resOficial.pontos} pontos (Ranking Bena)</strong>
        <p><strong>Pontuação da Torre:</strong> ${stats.gameScore} de 30 pontos acumulados</p>
        <p><strong>Acertos de 1ª tentativa:</strong> ${stats.firstHits} de 10 plataformas</p>
        <p><strong>Impactos em respostas erradas:</strong> ${stats.totalErrors} vez</p>
        <p>Precisão de primeira: ${resOficial.percentualAcertos}% · Rodada 1 nesta aba</p>
      `;
      window.BenaFeedback.mostrar(resultFeedback, 'success', 'Parabéns! Você completou toda a descida pela torre Helix!');
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: 'verificacao/helix-resultado.png', fullPage: false });

    if (errors.length > 0) {
      throw new Error('Erros no console do navegador:\n' + errors.join('\n'));
    }
    if (badRequests.length > 0) {
      throw new Error('Requisições falhas:\n' + badRequests.join('\n'));
    }

    console.log('TESTES CONCLUÍDOS COM SUCESSO! Helix Jump carregado e renderizado sem erros.');
  } finally {
    await browser.close();
  }
})().catch(err => {
  console.error('ERRO:', err);
  process.exit(1);
});
