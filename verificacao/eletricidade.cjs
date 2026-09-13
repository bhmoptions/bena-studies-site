const {chromium}=require('C:/Users/Felippe/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const baseUrl=process.env.BENA_TEST_URL||'http://localhost:8765';
(async()=>{const b=await chromium.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});try{
const p=await b.newPage({viewport:{width:1440,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>{Math.random=()=>0});
async function moveToLowerLeft(){await p.keyboard.down('ArrowRight');await p.waitForTimeout(500);await p.keyboard.up('ArrowRight');await p.keyboard.press('ArrowUp');await p.keyboard.down('ArrowLeft');await p.waitForTimeout(250);await p.keyboard.up('ArrowLeft');await p.waitForTimeout(550);await p.keyboard.down('ArrowLeft');await p.waitForTimeout(450);await p.keyboard.up('ArrowLeft');}
async function reachComputer(){await p.locator('.room-world').waitFor();if(await p.locator('.room-monitor').isVisible())return;await moveToLowerLeft();await p.locator('.room-monitor').waitFor({state:'visible'});}
await p.goto(`${baseUrl}/conteudo/3-serie/matematica/tabuada/002/index.html`);
if(await p.locator('.lab-ledge').count()!==7||await p.locator('.electric-arc').count()!==8)throw Error('Geometria');
const positions=await p.evaluate(()=>fetch('Config/monitor_position.json').then(r=>r.json()).then(c=>c.positions));
const questionLevelCount=await p.evaluate(()=>fetch('Config/q&a.json').then(r=>r.json()).then(c=>c.levels.length));
if(questionLevelCount!==5)throw Error('Configuração de fases');
if(positions.some(position=>!position.stand||!position.exitRoute))throw Error('Posição sem stand ou exitRoute');
if(await p.locator('.room-clue').count()||await p.locator('.room-monitor').isVisible())throw Error('Pergunta visível antes de chegar ao computador');
await p.locator('.room-console').click();
if(await p.locator('.room-monitor').isVisible())throw Error('Clique à distância abriu o monitor');
await reachComputer();
await p.locator('[data-choice="0"]').click();await p.locator('.room-puzzle h3').focus();
if(!await p.locator('.room-monitor').isVisible()||!await p.locator('.room-monitor .room-clue').count())throw Error('Monitor não abriu com a pergunta');
await p.keyboard.down('ArrowRight');await p.locator('.electrocuted').waitFor();await p.keyboard.up('ArrowRight');await p.locator('.electrocuted').waitFor({state:'detached'});
const position=await p.locator('.room-player').evaluate(e=>[parseFloat(e.style.left),parseFloat(e.style.top)]);
if(Math.abs(position[0]-75/8)>.1||Math.abs(position[1]-373/4.25)>.1)throw Error('Spawn');
if(!await p.locator('[data-choice="0"]').isDisabled())throw Error('Resposta perdida');
await moveToLowerLeft();
const landed=await p.locator('.room-player').evaluate(e=>parseFloat(e.style.top));
if(landed >= (405-32)/4.25)throw Error('Pulo não alcançou uma plataforma: '+landed);
if(await p.locator('.room-game-title').textContent()!=='De novo essa fase?')throw Error('Título do jogo');
if(await p.locator('.room-console small').count()||!await p.locator('.room-console img[src$="assets/images/TLA/Desktop.png"]').count())throw Error('Imagem do computador');
if(!(await p.locator('.electric-arc--hanging').count()))throw Error('Arco suspenso');
await p.locator('[data-choice="1"]').click();await p.locator('.room-next').click();
await p.getByRole('heading',{name:'Desta vez, falta uma peça'}).waitFor({timeout:7000});
await p.screenshot({path:'verificacao/sala-eletrica.png',animations:'disabled'});
await p.emulateMedia({reducedMotion:'reduce'});if(await p.locator('.arc-core').first().evaluate(e=>getComputedStyle(e).animationName)!=='none')throw Error('Movimento reduzido');
if(errors.length)throw Error(errors.join('\n'));console.log('OK: geometria, computador, arco suspenso, choque, reaparecimento, salto e saída automática.');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exit(1)});
