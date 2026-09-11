const { chromium } = require('C:/Users/Felippe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async () => {
 const browser = await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
 try {
  const page = await browser.newPage({viewport:{width:390,height:844}});
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:8765');
  if(await page.locator('[data-subject]').count() !== 1) throw Error('Catálogo não atualizado');
  await page.locator('[data-subject]').click();
  await page.locator('[data-topic]').click();
  await page.locator('[data-game]').first().click();

  if(await page.locator('#table-choice,.game-start').count()) throw Error('Etapa de escolha ainda presente');
  const factors = [];
  for(let i=0;i<10;i++) {
   const nums = (await page.locator('.multiplication').innerText()).match(/\d+/g).map(Number);
   if(nums[0] < 2 || nums[0] > 10) throw Error('Tabuada fora do intervalo'); factors.push(nums[1]);
   const answer = nums[0]*nums[1];
   const values = await page.locator('[data-value]').evaluateAll(items => items.map(x=>Number(x.dataset.value)));
   if(new Set(values).size!==3 || !values.includes(answer)) throw Error('Alternativas inválidas');
   if(await page.locator('.game-next').isVisible())throw Error('Avanço antes de responder');
   if(i===0) {
    await page.locator(`[data-value="${values.find(n=>n!==answer)}"]`).click();
    if(!(await page.locator('.feedback').innerText()).includes('somar'))throw Error('Dica ausente');
    if(await page.locator('.game-next').isVisible())throw Error('Avanço após erro');
   }
   await page.locator(`[data-value="${answer}"]`).click();
   if(i===0) await page.screenshot({path:'verificacao/tabuada-mobile.png',fullPage:true,animations:'disabled'});
   await page.locator('.game-next').click();
  }
  if(new Set(factors).size!==10) throw Error('Multiplicadores repetidos');
  if(!(await page.locator('#modal-content').innerText()).includes('9 de 10'))throw Error('Resultado incorreto');
  if(await page.locator('.score-value').innerText() !== '795 pontos') throw Error('Pontos da primeira rodada');
  await page.locator('.game-again').click();

  for(let i=0;i<10;i++) {
   const [a,b] = (await page.locator('.multiplication').innerText()).match(/\d+/g).map(Number);
   if(a<2||a>10||b<1||b>10)throw Error('Mistura inválida');
   await page.locator(`[data-value="${a*b}"]`).click();await page.locator('.game-next').click();
  }
  if(!(await page.locator('#modal-content').innerText()).includes('10 de 10'))throw Error('Reinício não zerou resultado');
  if(await page.locator('.score-value').innerText() !== '500 pontos') throw Error('Desconto da repetição');
  await page.locator('.game-back').click();
  await page.locator('[data-game]').first().click();
  await page.locator('.multiplication').waitFor();
  await page.keyboard.press('Escape');
  if(await page.evaluate(() => window.BenaPontuacao.iniciarRodada('3-serie/matematica/tabuada/001')) !== 4) throw Error('Reabertura não consumiu rodada');
  if(await page.locator('dialog').isVisible())throw Error('Fechamento');
  await page.setViewportSize({width:1440,height:1000});
  await page.goto('file:///D:/Felippe/OneDrive/Personal/Benjamin/Bena%20Studies%20Site/index.html');
  await page.locator('[data-subject]').click();await page.locator('[data-topic]').click();await page.locator('[data-game]').first().click();
  await page.screenshot({path:'verificacao/tabuada-desktop.png',fullPage:true,animations:'disabled'});
  if(errors.length) throw Error(errors.join('\n'));
  console.log('OK: catálogo, navegação, 20 contas, dicas, resultados, reinício, modo misto, teclado e abertura direta.');
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1)});
