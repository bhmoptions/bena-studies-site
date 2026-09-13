const {chromium}=require('C:/Users/Felippe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
 const page=await browser.newPage();
 await page.goto('http://localhost:8765/conteudo/3-serie/matematica/tabuada/002/index.html');
 for(const [width,height] of [[1920,900],[1920,600],[1366,768],[1280,500],[1024,600],[390,844],[844,390]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(100);
  const r=await page.evaluate(()=>{const world=document.querySelector('.room-world').getBoundingClientRect(),header=document.querySelector('.shared-site-header').getBoundingClientRect();return {w:world.width,h:world.height,bottom:world.bottom,top:world.top,gap:world.top-header.bottom,overflow:document.documentElement.scrollWidth>innerWidth,pageScrollable:document.documentElement.scrollHeight>innerHeight+1};});
  if(Math.abs(r.w/r.h-750/425)>.003)throw Error('Proporção: '+JSON.stringify(r));
  if(r.bottom>height+1&&!r.pageScrollable)throw Error('Corte vertical: '+JSON.stringify(r));
  if(r.overflow)throw Error('Overflow horizontal');
  if(Math.abs(r.gap-Math.min(12,Math.max(5,width*.0075)))>1)throw Error('Espaço superior');
  console.log(`${width}x${height}: cenário ${r.w.toFixed(0)}x${r.h.toFixed(0)}, gap ${r.gap.toFixed(1)}, sem cortes${r.pageScrollable?' (rolagem da página)':''}`);
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
