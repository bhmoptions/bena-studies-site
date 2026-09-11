const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Felippe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://localhost:8765/conteudo/3-serie/matematica/tabuada/003/index.html');
 await page.waitForFunction(()=>document.querySelector('#game').benaInspect);
 await page.screenshot({path:'verificacao/caixa-desktop.png',fullPage:true});
 const snapshot=()=>page.evaluate(()=>document.querySelector('#game').benaInspect().state);
 async function turnByKeyboard(){
  const before=(await snapshot()).events.length;
  await page.locator('[data-physical-control="blue"]').focus();
  for(let i=0;i<4;i++){await page.keyboard.press('ArrowRight');if((await snapshot()).events.length>before)return;}
  throw Error('O giro pelo teclado não enviou resposta');
 }
 const c=(await snapshot()).config;
 await page.locator('[data-action="audio"]').click();assert.equal(await page.locator('[data-action="submit"]').count(),0);
 const wrong=c.values.find(v=>v!==c.targets.blue);
 await page.locator('[data-flask="'+wrong+'"]').click();await page.locator('[data-drop="left"]').click();await turnByKeyboard();
 assert.equal(await page.evaluate(()=>document.activeElement.dataset.drop),'left');
 await page.locator('[data-action="clear"]').click();
 const v=[...c.values].reverse().find(v=>c.targets.blue%v===0&&c.targets.blue/v<=10);
 await page.locator('[data-flask="'+v+'"]').click();
 for(let i=0;i<c.targets.blue/v;i++)await page.locator('[data-drop="left"]').click();
 await turnByKeyboard();assert.equal(await page.evaluate(()=>document.activeElement.dataset.action),'next');
 await page.keyboard.press('Enter');assert(await page.evaluate(()=>document.activeElement.hasAttribute('data-flask')));
 await page.locator('.workshop-footer [data-action="restart"]').click();
 assert(await page.evaluate(()=>document.activeElement.hasAttribute('data-flask')));assert.equal((await snapshot()).round,2);
 assert.deepEqual(errors,[]);
 console.log('OK: sem botão de conferência; foco acessível nos objetos, erro/acerto, próximo lado e reinício.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});

