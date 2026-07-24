const { Engine, Render, Runner, World, Bodies, Events, Composite, Constraint, Mouse, MouseConstraint, Vector } = Matter;

const $ = id => document.getElementById(id);
const canvas = $('gameCanvas');
const shotsEl = $('shots');
const speedEl = $('speed');
const statusEl = $('status');
const levelEl = $('level');
const targetsEl = $('targets');
const scoreEl = $('score');
const starsEl = $('stars');
const resetBtn = $('resetBtn');
const debugBtn = $('debugBtn');
const menuBtn = $('menuBtn');
const result = $('result');
const resultTitle = $('resultTitle');
const resultText = $('resultText');
const resultStars = $('resultStars');
const nextBtn = $('nextBtn');
const retryBtn = $('retryBtn');
const levelMenu = $('levelMenu');
const levelGrid = $('levelGrid');
const totalStarsEl = $('totalStars');

const STORAGE_KEY = 'officeBirdsProgressV1';
const engine = Engine.create({ enableSleeping: false });
engine.gravity.y = 1;
engine.positionIterations = 12;
engine.velocityIterations = 10;
engine.constraintIterations = 6;

const render = Render.create({
  canvas,
  engine,
  options: { width: innerWidth, height: innerHeight, pixelRatio: Math.min(devicePixelRatio || 1, 2), wireframes: false, background: '#bfe8ff' },
});
const runner = Runner.create({ isFixed: true, delta: 1000 / 60 });

const LEVELS = [
  { name: 'Разминка', shots: 3, build({x,y,beam,pillar,target}) { return [beam(x,y-15,260),pillar(x-92,y-90,120),pillar(x+92,y-90,120),beam(x,y-165,260),target(x,y-215)]; } },
  { name: 'Две цели', shots: 4, build({x,y,beam,pillar,target}) { return [beam(x,y-15,300),pillar(x-108,y-90,120),pillar(x+108,y-90,120),beam(x,y-165,300),pillar(x-108,y-240,120),pillar(x+108,y-240,120),beam(x,y-315,300),target(x-72,y-365),target(x+72,y-365)]; } },
  { name: 'Двойная башня', shots: 5, build({x,y,beam,pillar,target}) { const l=x-150,r=x+150; return [beam(l,y-15,220),pillar(l-72,y-90,120),pillar(l+72,y-90,120),beam(l,y-165,220),target(l,y-215),beam(r,y-15,220),pillar(r-72,y-90,120),pillar(r+72,y-90,120),beam(r,y-165,220),target(r,y-215),beam(x,y-285,520),target(x,y-335)]; } },
];

let progress = loadProgress();
let levelIndex = 0;
let ball, sling, mouseConstraint, anchor;
let shotsUsed = 0;
let released = false;
let detached = false;
let respawnQueued = false;
let targets = [];
let levelFinished = false;
let floorY = 0;
let levelStartTime = 0;
let score = 0;

function loadProgress() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.levels?.length === LEVELS.length) return saved;
  } catch (_) {}
  return { unlocked: 1, levels: LEVELS.map(() => ({ stars: 0, bestScore: 0 })) };
}
function saveProgress() { localStorage.setItem(STORAGE_KEY, JSON.stringify(progress)); }
function remainingShots() { return Math.max(0, LEVELS[levelIndex].shots - shotsUsed); }
function aliveTargets() { return targets.filter(t => !t.defeated).length; }
function currentStars() { const r=remainingShots(); return r >= 2 ? 3 : r === 1 ? 2 : 1; }
function updateHud() {
  levelEl.textContent = `${levelIndex + 1}/${LEVELS.length} — ${LEVELS[levelIndex].name}`;
  shotsEl.textContent = remainingShots();
  targetsEl.textContent = aliveTargets();
  speedEl.textContent = ball ? Vector.magnitude(ball.velocity).toFixed(1) : '0.0';
  scoreEl.textContent = score;
  starsEl.textContent = '★'.repeat(progress.levels[levelIndex].stars) + '☆'.repeat(3-progress.levels[levelIndex].stars);
}
function setStatus(text) { statusEl.textContent = text; }

function makeBeam(x,y,w) { const b=Bodies.rectangle(x,y,w,30,{density:.0024,friction:.72,frictionStatic:.9,frictionAir:.008,restitution:.03,chamfer:{radius:5},render:{fillStyle:'#d79a55',strokeStyle:'rgba(75,45,20,.75)',lineWidth:2}}); b.gameType='structure'; return b; }
function makePillar(x,y,h) { const b=Bodies.rectangle(x,y,34,h,{density:.0027,friction:.75,frictionStatic:.95,frictionAir:.008,restitution:.02,chamfer:{radius:4},render:{fillStyle:'#b9773e',strokeStyle:'rgba(75,45,20,.75)',lineWidth:2}}); b.gameType='structure'; return b; }
function makeTarget(x,y) { const t=Bodies.circle(x,y,27,{density:.0014,friction:.28,restitution:.08,render:{fillStyle:'#f0d4bd',strokeStyle:'#71462f',lineWidth:3}}); t.gameType='target'; t.defeated=false; t.start={x,y}; targets.push(t); return t; }

function createProjectile() {
  ball=Bodies.circle(anchor.x,anchor.y,34,{density:.004,restitution:.35,friction:.12,frictionAir:.004,render:{fillStyle:'#ffd36b',strokeStyle:'#5f3b14',lineWidth:4}});
  ball.gameType='projectile';
  sling=Constraint.create({pointA:anchor,bodyB:ball,stiffness:.018,damping:.035,length:0,render:{visible:false}});
  World.add(engine.world,[ball,sling]);
  released=false; detached=false; respawnQueued=false;
  if(!levelFinished) setStatus('Потяни шар назад');
}

function setupMouse() {
  const mouse=Mouse.create(canvas); mouse.pixelRatio=render.options.pixelRatio;
  mouseConstraint=MouseConstraint.create(engine,{mouse,constraint:{stiffness:.18,damping:.12,render:{visible:false}}});
  Events.on(mouseConstraint,'startdrag',e=>{ if(levelFinished||e.body!==ball||detached)return; released=false; setStatus('Натяжение'); });
  Events.on(mouseConstraint,'enddrag',e=>{ if(levelFinished||e.body!==ball||detached)return; const stretch=Vector.magnitude(Vector.sub(ball.position,anchor)); if(stretch<45){setStatus('Потяни сильнее');return;} released=true; shotsUsed++; setStatus('Резинка отпущена'); updateHud(); });
  World.add(engine.world,mouseConstraint); render.mouse=mouse;
}

function loadLevel(index) {
  engine.timing.timeScale=1;
  levelIndex=Math.max(0,Math.min(index,LEVELS.length-1));
  Composite.clear(engine.world,false); targets=[]; shotsUsed=0; score=0; levelFinished=false; result.classList.remove('show'); levelMenu.classList.remove('show');
  floorY=innerHeight-110; anchor={x:Math.max(320,innerWidth*.21),y:floorY-210}; const towerX=Math.max(innerWidth*.72,anchor.x+650);
  World.add(engine.world,Bodies.rectangle(innerWidth/2,floorY+45,innerWidth+500,90,{isStatic:true,friction:1,render:{fillStyle:'#435462'}}));
  createProjectile();
  World.add(engine.world,LEVELS[levelIndex].build({x:towerX,y:floorY,beam:makeBeam,pillar:makePillar,target:makeTarget}));
  setupMouse(); levelStartTime=performance.now(); updateHud();
}

function queueProjectile() {
  if(respawnQueued||levelFinished)return; respawnQueued=true;
  setTimeout(()=>{ if(levelFinished)return; if(ball)World.remove(engine.world,ball); if(sling)World.remove(engine.world,sling); remainingShots()>0?createProjectile():finishLevel(false); },550);
}

function defeatTarget(t) {
  if(!t||t.defeated)return; t.defeated=true; t.render.fillStyle='#7f8c8d'; t.render.strokeStyle='#34495e'; score+=100; updateHud(); if(aliveTargets()===0)finishLevel(true);
}

function finishLevel(won) {
  if(levelFinished)return; levelFinished=true;
  if(won) {
    const stars=currentStars(); const timeBonus=Math.max(0,Math.round(300-(performance.now()-levelStartTime)/100)); const finalScore=score+remainingShots()*250+timeBonus;
    score=finalScore;
    const rec=progress.levels[levelIndex]; rec.stars=Math.max(rec.stars,stars); rec.bestScore=Math.max(rec.bestScore,finalScore); progress.unlocked=Math.max(progress.unlocked,Math.min(LEVELS.length,levelIndex+2)); saveProgress();
    resultTitle.textContent='Уровень пройден!'; resultStars.textContent='★'.repeat(stars)+'☆'.repeat(3-stars); resultText.textContent=`Счёт: ${finalScore}. Осталось выстрелов: ${remainingShots()}.`;
    nextBtn.hidden=false; nextBtn.textContent=levelIndex===LEVELS.length-1?'К уровням':'Следующий уровень'; setStatus('Уровень пройден');
  } else {
    resultTitle.textContent='Попробуй ещё раз'; resultStars.textContent='☆☆☆'; resultText.textContent=`Осталось целей: ${aliveTargets()}.`; nextBtn.hidden=true; setStatus('Выстрелы закончились');
  }
  updateHud(); result.classList.add('show');
}

function renderLevelMenu() {
  const total=progress.levels.reduce((s,l)=>s+l.stars,0); totalStarsEl.textContent=`${total}/${LEVELS.length*3}`;
  levelGrid.innerHTML='';
  LEVELS.forEach((l,i)=>{
    const unlocked=i<progress.unlocked; const rec=progress.levels[i]; const btn=document.createElement('button');
    btn.className='level-tile'; btn.disabled=!unlocked;
    btn.innerHTML=`<span class="level-number">${i+1}</span><strong>${l.name}</strong><span class="level-stars">${unlocked?'★'.repeat(rec.stars)+'☆'.repeat(3-rec.stars):'🔒'}</span><small>${rec.bestScore?`Рекорд: ${rec.bestScore}`:'Не пройден'}</small>`;
    btn.addEventListener('click',()=>loadLevel(i)); levelGrid.appendChild(btn);
  });
}
function showMenu() { engine.timing.timeScale=0; renderLevelMenu(); levelMenu.classList.add('show'); result.classList.remove('show'); }
function hideMenuAndResume(){ levelMenu.classList.remove('show'); engine.timing.timeScale=1; }

Events.on(engine,'collisionStart',event=>{ for(const pair of event.pairs){ if(pair.bodyA!==ball&&pair.bodyB!==ball)continue; const other=pair.bodyA===ball?pair.bodyB:pair.bodyA; const rv=Vector.sub(pair.bodyA.velocity,pair.bodyB.velocity); const normal=pair.collision?.normal||{x:1,y:0}; const impact=Math.abs(Vector.dot(rv,normal)); if(other.gameType==='target'&&impact>2.2){defeatTarget(other);setStatus('Цель сбита');} else if(other.gameType==='structure'&&impact>2.5){score+=Math.min(25,Math.round(impact));setStatus('Попадание в конструкцию');updateHud();} } });

Events.on(engine,'beforeUpdate',()=>{
  if(!ball)return;
  if(released&&!detached&&sling){ const offset=Vector.sub(ball.position,anchor); const distance=Vector.magnitude(offset); const toward=Vector.dot(ball.velocity,Vector.normalise(Vector.mult(offset,-1))); if(distance<48&&toward>1.2){World.remove(engine.world,sling);sling=null;detached=true;released=false;setStatus('Полёт');} }
  for(const t of targets){ if(t.defeated)continue; const moved=Vector.magnitude(Vector.sub(t.position,t.start)); if(t.position.y>floorY-36||moved>115||Math.abs(t.angle)>1.1)defeatTarget(t); }
  if(detached&&!respawnQueued){ const speed=Vector.magnitude(ball.velocity); const outside=ball.position.x>innerWidth+220||ball.position.x<-220||ball.position.y>innerHeight+260; if(outside||speed<.35)queueProjectile(); }
  updateHud();
});

Events.on(render,'afterRender',()=>{ if(!anchor)return; const ctx=render.context; ctx.save(); ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle='#75421f';ctx.lineWidth=22;ctx.beginPath();ctx.moveTo(anchor.x,floorY-5);ctx.lineTo(anchor.x,anchor.y+10);ctx.moveTo(anchor.x,anchor.y+20);ctx.lineTo(anchor.x-45,anchor.y-45);ctx.moveTo(anchor.x,anchor.y+20);ctx.lineTo(anchor.x+45,anchor.y-45);ctx.stroke(); if(!detached&&ball){ctx.strokeStyle='#3b2417';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(anchor.x-45,anchor.y-45);ctx.lineTo(ball.position.x,ball.position.y);ctx.lineTo(anchor.x+45,anchor.y-45);ctx.stroke();} ctx.restore(); });

resetBtn.onclick=()=>loadLevel(levelIndex);
debugBtn.onclick=()=>{render.options.wireframes=!render.options.wireframes;debugBtn.textContent=render.options.wireframes?'Debug ON':'Debug';};
menuBtn.onclick=showMenu; retryBtn.onclick=()=>loadLevel(levelIndex);
nextBtn.onclick=()=>{ if(levelIndex===LEVELS.length-1)showMenu(); else loadLevel(levelIndex+1); };
$('closeMenuBtn').onclick=()=>{hideMenuAndResume();};
window.addEventListener('keydown',e=>{ if(e.key.toLowerCase()==='r')loadLevel(levelIndex); if(e.key==='Escape')showMenu(); });
window.addEventListener('resize',()=>loadLevel(levelIndex));

Render.run(render); Runner.run(runner,engine); loadLevel(0); renderLevelMenu(); showMenu();
