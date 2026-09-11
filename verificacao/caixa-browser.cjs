const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Felippe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const URL='http://localhost:8765/conteudo/3-serie/matematica/tabuada/003/index.html';
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],badRequests=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('favicon.ico'))badRequests.push(r.url());});
 await page.goto('http://localhost:8765/index.html#jogos-tabuada');
 await page.locator('[data-game]').filter({hasText:'A caixa dos produtos'}).click();await page.waitForURL(URL);
 await page.waitForFunction(()=>document.querySelector('#game').benaInspect);
 const snap=()=>page.evaluate(()=>document.querySelector('#game').benaInspect());
 const state=async()=> (await snap()).state;
 const selectSide=async side=>{
  await page.locator('[data-side-select="'+side+'"]').click();
  await page.waitForFunction(side=>{const scene=document.querySelector('#game').benaInspect().scene;return scene.activeSide===side&&!scene.cameraMoving;},side);
 };
 const choose=async value=>page.locator('[data-flask="'+value+'"]').click();
 const add=async(value,count=1,pan='left')=>{await choose(value);for(let i=0;i<count;i++)await page.locator('[data-drop="'+pan+'"]').click();};
 const clear=async(pan='left')=>{const b=page.locator('[data-action="clear"][data-pan="'+pan+'"]');if(await b.isEnabled())await b.click();};
 const drag=async(from,to,{cancel=false}={})=>{
  await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:8});
  if(cancel)await page.keyboard.press('Escape');await page.mouse.up();
 };
 async function activate(side,{angle=Math.PI/2,cancel=false,keyboard=false}={}){
  if(keyboard){
   const control=page.locator('[data-physical-control="'+side+'"]');await control.focus();
   if(side==='blue'||side==='red'){
    const count=(await state()).events.length;
    for(let i=0;i<4;i++){await page.keyboard.press('ArrowRight');if((await state()).events.length>count)break;}
   }else await page.keyboard.press('Enter');
   return;
  }
  const physicalScene=(await snap()).scene;const p=physicalScene.mechanisms[side];if(!p.visible)console.log('Controle fora de vista:',JSON.stringify({side,p,az:physicalScene.azimuth,active:physicalScene.activeSide,hits:physicalScene.controlHits}));assert(p.visible,side+' control visible');
  if(side==='yellow'||side==='purple'){await page.mouse.click(p.x,p.y);return;}
  const r=Math.max(8,p.radius*.70);
  await page.mouse.move(p.x+r,p.y);await page.mouse.down();
  assert.equal((await snap()).scene.turning,side,side+' gear grabbed');
  for(let i=1;i<=8;i++)await page.mouse.move(p.x+r*Math.cos(i*angle/8),p.y+r*Math.sin(i*angle/8));
  if(cancel)await page.keyboard.press('Escape');
  await page.mouse.up();
 }
 async function solve(side,keyboard=false){
  const s=await state();
  if(side!=='purple'){
   const [count,value]=s.config.dialPuzzles[side].correct[0];
   await clear();await add(value,count);
  }else{
   const values=s.config.valuesBySide.purple;await clear('left');await clear('right');let solutions=[];
   for(const a of values)for(const b of values)if(a!==b)for(let n=1;n<=10;n++)if(n*a%b===0&&n*a/b<=10)solutions.push({a,b,l:n,r:n*a/b});
   solutions.sort((a,b)=>(a.l+a.r)-(b.l+b.r));const pair=solutions[0];
   await add(pair.a,pair.l,'left');await add(pair.b,pair.r,'right');
   await page.waitForFunction(()=>Math.abs(document.querySelector('#game').benaInspect().scene.tilt)<.003);
  }
  await activate(side,{keyboard});assert((await state()).sides[side].solved,side+' solved through its own control');
 }
 assert.equal(await page.locator('[data-action="submit"]').count(),0);
 await page.locator('[data-action="audio"]').click();
 await page.locator('[data-action="help"]').click();assert.match(await page.locator('.box-help').innerText(),/botão verde/);await page.keyboard.press('Escape');
 const first=await snap(),positions=Object.fromEntries(Object.entries(first.scene.shelves).map(([side,s])=>[side,s.positions]));
 for(const [side,shelf] of Object.entries(first.scene.shelves))assert.deepEqual(shelf.screens.map(f=>f.value),first.state.config.valuesBySide[side]);
 await selectSide('purple');await selectSide('blue');
 assert.deepEqual(Object.fromEntries(Object.entries((await snap()).scene.shelves).map(([side,s])=>[side,s.positions])),positions);
 // Pick up directly from a permanent shelf, then drop onto the 3D pan.
 const values=first.state.config.valuesBySide.blue,value=values[0],shared=values.find(v=>first.state.config.valuesBySide.red.includes(v));
 await drag((await snap()).scene.shelves.blue.screens[0],(await snap()).scene.panScreens.left);
 assert.equal((await state()).sides.blue.left.length,1);
 const outside=await page.locator('.scene-host').boundingBox();
 let flask=(await snap()).scene.placedScreens.blue.left[0];
 await drag(flask,{x:outside.x+25,y:outside.y+100},{cancel:true});
 assert.equal((await state()).sides.blue.left.length,1);
 flask=(await snap()).scene.placedScreens.blue.left[0];
 await drag(flask,{x:outside.x+25,y:outside.y+100});
 assert.equal((await state()).sides.blue.left.length,0);assert.equal((await state()).events.length,0);
 // An invalid transfer returns the source; a valid transfer is atomic.
 await add(shared);await selectSide('red');await add(first.state.config.valuesBySide.red.find(v=>v!==shared));await selectSide('blue');
 await drag((await snap()).scene.placedScreens.blue.left[0],(await snap()).scene.allPanScreens.red.left);
 assert.equal((await state()).sides.blue.left.length,1);assert.equal((await state()).sides.red.left.length,1);
 await selectSide('red');await clear();await selectSide('blue');
 await drag((await snap()).scene.placedScreens.blue.left[0],(await snap()).scene.allPanScreens.red.left);
 assert.equal((await state()).sides.blue.left.length,0);assert.deepEqual((await state()).sides.red.left,[shared]);
 await selectSide('red');await clear();await selectSide('blue');
 assert.equal((await state()).events.length,0);
 console.log('OK: quatro prateleiras fixas, retirada, Escape e transferências sem penalidade.');
 // Clicking, a short turn and a cancelled turn cannot submit a gear answer.
 const center=(await snap()).scene.mechanisms.blue;await page.mouse.click(center.x,center.y);
 await activate('blue',{angle:Math.PI/9});await activate('blue',{cancel:true});
 assert.equal((await state()).events.length,0);
 for(const side of ['blue','yellow','red','purple']){
  await selectSide(side);
  if(side==='purple'){
   const purpleValue=(await state()).config.valuesBySide.purple[0];await add(purpleValue,1,'left');await add(purpleValue,1,'right');
  }else{const s=await state(),wrong=s.config.valuesBySide[side].find(v=>!s.config.dialPuzzles[side].correct.some(([count,accepted])=>count===1&&accepted===v));await add(wrong);}
  await activate(side);
  assert.equal((await state()).sides[side].errors,1,side+' incorrect attempt');
  assert(!(await state()).sides[side].solved);
  await page.waitForFunction(side=>document.querySelector('#game').benaInspect().scene.effects[side].jammed,side);
  const jam=(await snap()).scene.effects[side];assert(jam.lit<.02);assert.equal(jam.smoke,0);
  await activate(side);assert.equal((await state()).sides[side].errors,1,'duplicate attempt ignored');
  await solve(side);
  await page.waitForFunction(side=>document.querySelector('#game').benaInspect().scene.effects[side].smoke>0,side);
  if(side==='blue')await page.screenshot({path:'verificacao/caixa-abertura-azul.png',fullPage:true});
  await page.waitForFunction(side=>document.querySelector('#game').benaInspect().scene.effects[side].openAngle<-.16,side);
  assert((await snap()).scene.effects[side].lit>1);
  console.log('OK:',side,'controle, erro emperrado e abertura com fumaça e luz.');
 }
 await page.waitForFunction(()=>document.querySelector('#game').benaInspect().state.reward==='revealed',{timeout:20000});
 const completed=await snap();assert(completed.state.complete);assert.equal(completed.state.events.length,8);
 assert.equal(completed.scene.scrollUnfold,1);assert(completed.scene.lidAngle<-1.8);
 assert.equal(await page.locator('.reward-points strong').innerText(),'0');
 await page.screenshot({path:'verificacao/caixa-pergaminho.png',fullPage:true});
 await page.locator('.reward-summary [data-action="restart"]').click();
 assert.equal((await state()).round,2);assert.equal((await state()).events.length,0);
 assert(Object.values((await snap()).scene.effects).every(e=>e.openAngle===0&&e.smoke===0));
 await page.emulateMedia({reducedMotion:'reduce'});
 // All controls remain usable without mouse gestures, through their own projected focus targets.
 for(const side of ['purple','red','yellow','blue']){await selectSide(side);await solve(side,true);}
 await page.waitForFunction(()=>document.querySelector('#game').benaInspect().state.reward==='revealed');
 assert.equal(await page.locator('.reward-points strong').innerText(),'500');
 assert(Object.values((await snap()).scene.effects).every(e=>e.smoke===0&&e.openAngle===-.17));
 console.log('OK: recompensa, repetição, teclado nos quatro objetos e redução de movimento.');
 await page.locator('.reward-summary [data-action="restart"]').click();
 const baseline=(await snap()).scene.geometries,v=(await state()).config.valuesBySide.blue[0];
 for(let i=0;i<3;i++){await add(v,5);await clear();}
 await page.waitForTimeout(250);assert((await snap()).scene.geometries<baseline+20);
 for(const width of [1024,390]){
  await page.setViewportSize({width,height:width===1024?768:844});await page.waitForTimeout(300);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:'verificacao/caixa-'+width+'.png',fullPage:true});
 }
 // Maximum zoom follows an elevated, forward focus so the active front shelf stays framed.
 await page.setViewportSize({width:1440,height:1000});await page.waitForTimeout(300);
 await selectSide('blue');
 const beforeZoom=await snap();
 for(let i=0;i<8;i++)await page.locator('[data-action="zoom-in"]').click();
 await page.waitForTimeout(150);
 const zoomed=await snap();
 assert(zoomed.scene.cameraDistance<=8.41,'zoom reaches its safe minimum distance');
 const straightDollyY=beforeZoom.scene.cameraTarget[1]+(beforeZoom.scene.cameraPosition[1]-beforeZoom.scene.cameraTarget[1])*zoomed.scene.cameraDistance/beforeZoom.scene.cameraDistance;
 assert(zoomed.scene.cameraPosition[1]>straightDollyY+.2,'zoom raises the camera above a straight dolly path');
 assert(zoomed.scene.cameraTarget[2]>beforeZoom.scene.cameraTarget[2]+4,'zoom advances toward the active shelf');
 assert(zoomed.scene.shelves.blue.screens.every(flask=>flask.visible),'active shelf flasks remain in frame at maximum zoom');
 await page.screenshot({path:'verificacao/caixa-zoom.png',fullPage:true});
 await page.locator('[data-action="focus"]').click();await page.waitForFunction(()=>!document.querySelector('#game').benaInspect().scene.cameraMoving);
 const centered=await snap();assert(centered.scene.cameraDistance>15,'Centralizar restores the overview distance');
 await page.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
 assert.equal(await page.locator('.scene-host canvas,.physical-control,.mechanism-tip').count(),0);
 assert.deepEqual(errors,[]);assert.deepEqual(badRequests,[]);
 console.log('OK: duas partidas completas, telas 1440/1024/390, pontuação, limpeza de eventos e recursos; sem erros no navegador.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});



