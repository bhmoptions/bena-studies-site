const {chromium}=require('C:/Users/Felippe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 const page=await browser.newPage({viewport:{width:1360,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:8765');await page.locator('[data-subject]').click();await page.locator('[data-topic]').click();await page.locator('[data-game]').nth(1).click();await page.locator('.room-world').waitFor();
 if(await page.locator('.room-controls,.room-help,.room-status,.room-layout + .room-back').count())throw Error('Elementos antigos');
 await page.locator('.room-instructions-button').click();
 if(!await page.locator('.room-instructions').isVisible())throw Error('Instruções');
 if(!(await page.locator('.room-instructions').innerText()).includes('O painel abre sozinho'))throw Error('Texto');
 await page.keyboard.press('Escape');
 await page.locator('.room-puzzle h3').focus();
 await page.keyboard.press('ArrowUp');await page.waitForTimeout(100);
 if(await page.locator('.room-player').evaluate(e=>parseFloat(e.style.top))>=78)throw Error('Pulo');
 await page.waitForTimeout(900);
 await page.locator('.room-console').click();await page.locator('.panel-sleep').waitFor({state:'detached'});
 const before=await page.locator('.room-player').evaluate(e=>e.style.left);await page.keyboard.down('ArrowRight');await page.waitForTimeout(200);await page.keyboard.up('ArrowRight');if(before===await page.locator('.room-player').evaluate(e=>e.style.left))throw Error('Movimento');
 for(let phase=0;phase<5;phase++){
  if(await page.locator('.room-next').isVisible())throw Error('Porta aberta antes da solução');
  await page.locator('.room-console').click();await page.locator('.panel-sleep').waitFor({state:'detached'});
  if(phase===0){await page.locator('[data-choice="0"]').click();if(!(await page.locator('.room-puzzle .feedback').innerText()).includes('AINDA NÃO'))throw Error('Erro');await page.locator('[data-choice="1"]').click();}
  if(phase===1){for(let i=0;i<4;i++)await page.locator('[data-plus]').click();await page.locator('.room-check').click();}
  if(phase===2){for(let i=0;i<6;i++)await page.locator('[data-plus]').click();await page.locator('.room-check').click();}
  if(phase===3){await page.locator('[data-factor="4"]').click();await page.locator('[data-factor="6"]').click();await page.locator('.room-check').click();}
  if(phase===4)await page.locator('[data-choice="1"]').click();
  if(!(await page.locator('.room-puzzle .feedback').innerText()).includes('ACERTOU'))throw Error('Acerto');
  if(!await page.locator('.room-door.unlocked').count())throw Error('Porta');
  if(phase===0)await page.screenshot({path:'verificacao/sala-desktop.png',animations:'disabled'});
  await page.locator('.room-next').click();
 }
 if(await page.locator('.score-value').innerText()!=='610 pontos')throw Error('Pontos');
 await page.locator('.room-replay').click();await page.setViewportSize({width:390,height:844});await page.locator('.room-console').click();await page.locator('.panel-sleep').waitFor({state:'detached'});
 await page.screenshot({path:'verificacao/sala-mobile.png',animations:'disabled'});
 if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('Overflow');
 if(await page.locator('dialog[open]').count())throw Error('Jogo ainda em popup');
 await page.locator('.game-page-header a').click();await page.locator('[data-game]').first().waitFor();
 await page.locator('[data-game]').first().click();await page.locator('.multiplication').waitFor();
 if(errors.length)throw Error(errors.join('\n'));console.log('OK: movimento, 5 mecanismos, erro/acerto, portas, 610 pontos, reinício, celular e limpeza.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
