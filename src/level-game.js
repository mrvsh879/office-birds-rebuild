const {
  Engine, Render, Runner, World, Bodies, Body, Events, Composite,
  Constraint, Mouse, MouseConstraint, Vector,
} = Matter;

const canvas = document.getElementById('gameCanvas');
const shotsEl = document.getElementById('shots');
const speedEl = document.getElementById('speed');
const statusEl = document.getElementById('status');
const levelEl = document.getElementById('level');
const targetsEl = document.getElementById('targets');
const resetBtn = document.getElementById('resetBtn');
const debugBtn = document.getElementById('debugBtn');
const result = document.getElementById('result');
const resultTitle = document.getElementById('resultTitle');
const resultText = document.getElementById('resultText');
const nextBtn = document.getElementById('nextBtn');
const retryBtn = document.getElementById('retryBtn');

const engine = Engine.create({ enableSleeping: false });
engine.gravity.y = 1;
engine.positionIterations = 12;
engine.velocityIterations = 10;
engine.constraintIterations = 6;

const render = Render.create({
  canvas,
  engine,
  options: {
    width: innerWidth,
    height: innerHeight,
    pixelRatio: Math.min(devicePixelRatio || 1, 2),
    wireframes: false,
    background: '#bfe8ff',
  },
});
const runner = Runner.create({ isFixed: true, delta: 1000 / 60 });

const LEVELS = [
  {
    name: 'Разминка',
    shots: 3,
    build(ctx) {
      const { x, floorY, beam, pillar, target } = ctx;
      return [
        beam(x, floorY - 15, 260),
        pillar(x - 92, floorY - 90, 120),
        pillar(x + 92, floorY - 90, 120),
        beam(x, floorY - 165, 260),
        target(x, floorY - 215),
      ];
    },
  },
  {
    name: 'Две цели',
    shots: 4,
    build(ctx) {
      const { x, floorY, beam, pillar, target } = ctx;
      return [
        beam(x, floorY - 15, 300),
        pillar(x - 108, floorY - 90, 120),
        pillar(x + 108, floorY - 90, 120),
        beam(x, floorY - 165, 300),
        pillar(x - 108, floorY - 240, 120),
        pillar(x + 108, floorY - 240, 120),
        beam(x, floorY - 315, 300),
        target(x - 72, floorY - 365),
        target(x + 72, floorY - 365),
      ];
    },
  },
  {
    name: 'Двойная башня',
    shots: 5,
    build(ctx) {
      const { x, floorY, beam, pillar, target } = ctx;
      const left = x - 150;
      const right = x + 150;
      return [
        beam(left, floorY - 15, 220),
        pillar(left - 72, floorY - 90, 120),
        pillar(left + 72, floorY - 90, 120),
        beam(left, floorY - 165, 220),
        target(left, floorY - 215),
        beam(right, floorY - 15, 220),
        pillar(right - 72, floorY - 90, 120),
        pillar(right + 72, floorY - 90, 120),
        beam(right, floorY - 165, 220),
        target(right, floorY - 215),
        beam(x, floorY - 285, 520),
        target(x, floorY - 335),
      ];
    },
  },
];

let levelIndex = 0;
let ball;
let sling;
let mouseConstraint;
let anchor;
let shotsUsed = 0;
let released = false;
let detached = false;
let respawnQueued = false;
let targets = [];
let levelFinished = false;
let floorY = 0;

function setStatus(text) { statusEl.textContent = text; }
function remainingShots() { return Math.max(0, LEVELS[levelIndex].shots - shotsUsed); }
function aliveTargets() { return targets.filter(t => !t.defeated).length; }
function updateHud() {
  levelEl.textContent = `${levelIndex + 1}/${LEVELS.length} — ${LEVELS[levelIndex].name}`;
  shotsEl.textContent = String(remainingShots());
  targetsEl.textContent = String(aliveTargets());
  speedEl.textContent = ball ? Vector.magnitude(ball.velocity).toFixed(1) : '0.0';
}

function createProjectile() {
  ball = Bodies.circle(anchor.x, anchor.y, 34, {
    density: 0.004,
    restitution: 0.35,
    friction: 0.12,
    frictionAir: 0.004,
    render: { fillStyle: '#ffd36b', strokeStyle: '#5f3b14', lineWidth: 4 },
  });
  ball.gameType = 'projectile';
  sling = Constraint.create({
    pointA: anchor,
    bodyB: ball,
    stiffness: 0.018,
    damping: 0.035,
    length: 0,
    render: { visible: false },
  });
  World.add(engine.world, [ball, sling]);
  released = false;
  detached = false;
  respawnQueued = false;
  if (!levelFinished) setStatus('Потяни шар назад');
}

function makeBeam(x, y, width) {
  const b = Bodies.rectangle(x, y, width, 30, {
    density: 0.0024, friction: 0.72, frictionStatic: 0.9,
    frictionAir: 0.008, restitution: 0.03, chamfer: { radius: 5 },
    render: { fillStyle: '#d79a55', strokeStyle: 'rgba(75,45,20,.75)', lineWidth: 2 },
  });
  b.gameType = 'structure';
  return b;
}
function makePillar(x, y, height) {
  const b = Bodies.rectangle(x, y, 34, height, {
    density: 0.0027, friction: 0.75, frictionStatic: 0.95,
    frictionAir: 0.008, restitution: 0.02, chamfer: { radius: 4 },
    render: { fillStyle: '#b9773e', strokeStyle: 'rgba(75,45,20,.75)', lineWidth: 2 },
  });
  b.gameType = 'structure';
  return b;
}
function makeTarget(x, y) {
  const t = Bodies.circle(x, y, 27, {
    density: 0.0014, friction: 0.28, restitution: 0.08,
    render: { fillStyle: '#f0d4bd', strokeStyle: '#71462f', lineWidth: 3 },
  });
  t.gameType = 'target';
  t.defeated = false;
  t.start = { x, y };
  targets.push(t);
  return t;
}

function setupMouse() {
  const mouse = Mouse.create(canvas);
  mouse.pixelRatio = render.options.pixelRatio;
  mouseConstraint = MouseConstraint.create(engine, {
    mouse,
    constraint: { stiffness: 0.18, damping: 0.12, render: { visible: false } },
  });
  Events.on(mouseConstraint, 'startdrag', e => {
    if (levelFinished || e.body !== ball || detached) return;
    released = false;
    setStatus('Натяжение');
  });
  Events.on(mouseConstraint, 'enddrag', e => {
    if (levelFinished || e.body !== ball || detached) return;
    const stretch = Vector.magnitude(Vector.sub(ball.position, anchor));
    if (stretch < 45) {
      setStatus('Потяни сильнее');
      return;
    }
    released = true;
    shotsUsed += 1;
    setStatus('Резинка отпущена');
    updateHud();
  });
  World.add(engine.world, mouseConstraint);
  render.mouse = mouse;
}

function loadLevel(index = levelIndex) {
  levelIndex = Math.max(0, Math.min(index, LEVELS.length - 1));
  Composite.clear(engine.world, false);
  targets = [];
  shotsUsed = 0;
  levelFinished = false;
  result.classList.remove('show');

  floorY = innerHeight - 110;
  anchor = { x: Math.max(320, innerWidth * 0.21), y: floorY - 210 };
  const towerX = Math.max(innerWidth * 0.72, anchor.x + 650);
  const floor = Bodies.rectangle(innerWidth / 2, floorY + 45, innerWidth + 500, 90, {
    isStatic: true, friction: 1, render: { fillStyle: '#435462' },
  });
  World.add(engine.world, floor);
  createProjectile();

  const bodies = LEVELS[levelIndex].build({
    x: towerX,
    floorY,
    beam: makeBeam,
    pillar: makePillar,
    target: makeTarget,
  });
  World.add(engine.world, bodies);
  setupMouse();
  updateHud();
}

function queueProjectile() {
  if (respawnQueued || levelFinished) return;
  respawnQueued = true;
  setTimeout(() => {
    if (levelFinished) return;
    if (ball) World.remove(engine.world, ball);
    if (sling) World.remove(engine.world, sling);
    if (remainingShots() > 0) createProjectile();
    else checkEndState(true);
  }, 550);
}

function defeatTarget(t) {
  if (!t || t.defeated) return;
  t.defeated = true;
  t.render.fillStyle = '#7f8c8d';
  t.render.strokeStyle = '#34495e';
  updateHud();
  if (aliveTargets() === 0) finishLevel(true);
}

function finishLevel(won) {
  if (levelFinished) return;
  levelFinished = true;
  setStatus(won ? 'Уровень пройден' : 'Выстрелы закончились');
  resultTitle.textContent = won ? 'Уровень пройден!' : 'Попробуй ещё раз';
  resultText.textContent = won
    ? `Цели сбиты. Осталось выстрелов: ${remainingShots()}.`
    : `Осталось целей: ${aliveTargets()}.`;
  nextBtn.hidden = !won;
  nextBtn.textContent = levelIndex === LEVELS.length - 1 ? 'Сначала' : 'Следующий уровень';
  result.classList.add('show');
}

function checkEndState(force = false) {
  if (aliveTargets() === 0) finishLevel(true);
  else if (force && remainingShots() === 0) finishLevel(false);
}

Events.on(engine, 'collisionStart', event => {
  for (const pair of event.pairs) {
    if (pair.bodyA !== ball && pair.bodyB !== ball) continue;
    const other = pair.bodyA === ball ? pair.bodyB : pair.bodyA;
    const rv = Vector.sub(pair.bodyA.velocity, pair.bodyB.velocity);
    const normal = pair.collision?.normal || { x: 1, y: 0 };
    const impact = Math.abs(Vector.dot(rv, normal));
    if (other.gameType === 'target' && impact > 2.2) {
      defeatTarget(other);
      setStatus('Цель сбита');
    } else if (other.gameType === 'structure' && impact > 2.5) {
      setStatus('Попадание в конструкцию');
    }
  }
});

Events.on(engine, 'beforeUpdate', () => {
  if (!ball) return;
  if (released && !detached && sling) {
    const offset = Vector.sub(ball.position, anchor);
    const distance = Vector.magnitude(offset);
    const towardAnchor = Vector.dot(ball.velocity, Vector.normalise(Vector.mult(offset, -1)));
    if (distance < 48 && towardAnchor > 1.2) {
      World.remove(engine.world, sling);
      sling = null;
      detached = true;
      released = false;
      setStatus('Полёт');
    }
  }

  for (const t of targets) {
    if (t.defeated) continue;
    const moved = Vector.magnitude(Vector.sub(t.position, t.start));
    if (t.position.y > floorY - 36 || moved > 115 || Math.abs(t.angle) > 1.1) defeatTarget(t);
  }

  if (detached && !respawnQueued) {
    const speed = Vector.magnitude(ball.velocity);
    const outside = ball.position.x > innerWidth + 220 || ball.position.x < -220 || ball.position.y > innerHeight + 260;
    const stopped = speed < 0.35 && engine.timing.timestamp > 1200;
    if (outside || stopped) queueProjectile();
  }
  updateHud();
});

Events.on(render, 'afterRender', () => {
  if (!anchor) return;
  const ctx = render.context;
  const baseY = floorY;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#75421f';
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.moveTo(anchor.x, baseY - 5);
  ctx.lineTo(anchor.x, anchor.y + 10);
  ctx.moveTo(anchor.x, anchor.y + 20);
  ctx.lineTo(anchor.x - 45, anchor.y - 45);
  ctx.moveTo(anchor.x, anchor.y + 20);
  ctx.lineTo(anchor.x + 45, anchor.y - 45);
  ctx.stroke();
  if (!detached && ball) {
    ctx.strokeStyle = '#3b2417';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(anchor.x - 45, anchor.y - 45);
    ctx.lineTo(ball.position.x, ball.position.y);
    ctx.lineTo(anchor.x + 45, anchor.y - 45);
    ctx.stroke();
  }
  ctx.restore();
});

resetBtn.addEventListener('click', () => loadLevel(levelIndex));
debugBtn.addEventListener('click', () => {
  render.options.wireframes = !render.options.wireframes;
  debugBtn.textContent = render.options.wireframes ? 'Debug ON' : 'Debug';
});
retryBtn.addEventListener('click', () => loadLevel(levelIndex));
nextBtn.addEventListener('click', () => loadLevel(levelIndex === LEVELS.length - 1 ? 0 : levelIndex + 1));
window.addEventListener('keydown', e => {
  if (e.key.toLowerCase() === 'r') loadLevel(levelIndex);
  if (e.key.toLowerCase() === 'd') debugBtn.click();
});
window.addEventListener('resize', () => loadLevel(levelIndex));

Render.run(render);
Runner.run(runner, engine);
loadLevel(0);
