const { Engine, Render, Runner, World, Bodies, Body, Events, Composite, Vector } = Matter;

const canvas = document.getElementById("gameCanvas");
const shotsEl = document.getElementById("shots");
const speedEl = document.getElementById("speed");
const statusEl = document.getElementById("status");
const resetBtn = document.getElementById("resetBtn");
const debugBtn = document.getElementById("debugBtn");

const CONFIG = {
  floorHeight: 96,
  worldWidth: 3600,
  heroRadius: 34,
  maxPull: 300,
  launchPower: 0.145,
  maxSpeed: 40,
  respawnDelay: 5500,
  cameraZoom: 0.9,
};

const state = {
  dragging: false,
  launched: false,
  pointerId: null,
  dragBounds: null,
  shots: 0,
  debug: false,
  respawnTimer: null,
};

const engine = Engine.create({ enableSleeping: true });
engine.gravity.y = 1;
engine.positionIterations = 10;
engine.velocityIterations = 8;

const render = Render.create({
  canvas,
  engine,
  options: {
    width: innerWidth,
    height: innerHeight,
    pixelRatio: Math.min(devicePixelRatio || 1, 2),
    wireframes: false,
    background: "transparent",
    hasBounds: true,
  },
});

const runner = Runner.create({ isFixed: true, delta: 1000 / 60 });

let floor;
let hero;
let anchor = { x: 220, y: 420 };
let towerBodies = [];
let camera = { x: 760, y: 380, tx: 760, ty: 380, shake: 0 };

function setStatus(text) {
  statusEl.textContent = text;
}

function updateHud() {
  shotsEl.textContent = String(state.shots);
  speedEl.textContent = hero ? Vector.magnitude(hero.velocity).toFixed(1) : "0";
}

function createFloor() {
  floor = Bodies.rectangle(
    CONFIG.worldWidth / 2,
    innerHeight - CONFIG.floorHeight / 2,
    CONFIG.worldWidth,
    CONFIG.floorHeight,
    {
      isStatic: true,
      friction: 1,
      restitution: 0,
      render: { fillStyle: "#293845", strokeStyle: "#16232e", lineWidth: 2 },
    },
  );
  World.add(engine.world, floor);
}

function block(x, y, w, h, color) {
  return Bodies.rectangle(x, y, w, h, {
    density: 0.0024,
    friction: 0.72,
    frictionStatic: 0.9,
    frictionAir: 0.009,
    restitution: 0.02,
    chamfer: { radius: Math.min(7, w / 8, h / 8) },
    render: { fillStyle: color, strokeStyle: "rgba(46,27,14,.55)", lineWidth: 2 },
  });
}

function buildTower() {
  const baseY = innerHeight - CONFIG.floorHeight;
  const x = Math.max(1080, innerWidth * 0.72);
  const beamW = 360;
  const beamH = 34;
  const pillarW = 42;
  const pillarH = 138;

  towerBodies = [
    block(x, baseY - 20, beamW, beamH, "#d79953"),
    block(x - 135, baseY - 105, pillarW, pillarH, "#b8753f"),
    block(x + 135, baseY - 105, pillarW, pillarH, "#b8753f"),
    block(x, baseY - 190, beamW, beamH, "#d79953"),
    block(x - 135, baseY - 275, pillarW, pillarH, "#b8753f"),
    block(x + 135, baseY - 275, pillarW, pillarH, "#b8753f"),
    block(x, baseY - 360, beamW, beamH, "#d79953"),
  ];

  const target = Bodies.circle(x, baseY - 420, 28, {
    density: 0.0015,
    friction: 0.35,
    restitution: 0.08,
    render: { fillStyle: "#f1d7bf", strokeStyle: "#6f4330", lineWidth: 3 },
  });
  towerBodies.push(target);
  World.add(engine.world, towerBodies);
}

function spawnHero() {
  const baseY = innerHeight - CONFIG.floorHeight;
  anchor = { x: 220, y: baseY - 175 };
  hero = Bodies.circle(anchor.x, anchor.y, CONFIG.heroRadius, {
    density: 0.0048,
    restitution: 0.3,
    friction: 0.18,
    frictionStatic: 0.15,
    frictionAir: 0.006,
    render: { fillStyle: "#ffd36b", strokeStyle: "#5f3b14", lineWidth: 4 },
  });
  World.add(engine.world, hero);
  state.dragging = false;
  state.launched = false;
  state.pointerId = null;
  state.dragBounds = null;
  setStatus("Готов");
  updateHud();
}

function resetWorld(resetStats = true) {
  if (state.respawnTimer) clearTimeout(state.respawnTimer);
  state.respawnTimer = null;
  Composite.clear(engine.world, false);
  if (resetStats) state.shots = 0;
  createFloor();
  buildTower();
  spawnHero();
  camera.x = camera.tx = Math.max(700, innerWidth * 0.39);
  camera.y = camera.ty = innerHeight / 2;
  camera.shake = 0;
  applyCamera(true);
}

function pointerToWorld(event) {
  const rect = canvas.getBoundingClientRect();
  const bounds = state.dragBounds || render.bounds;
  const sx = (event.clientX - rect.left) / rect.width;
  const sy = (event.clientY - rect.top) / rect.height;
  return {
    x: bounds.min.x + sx * (bounds.max.x - bounds.min.x),
    y: bounds.min.y + sy * (bounds.max.y - bounds.min.y),
  };
}

function pointerDown(event) {
  if (!hero || state.launched || state.dragging) return;
  const point = pointerToWorld(event);
  if (Vector.magnitude(Vector.sub(point, hero.position)) > CONFIG.heroRadius * 1.55) return;
  state.dragging = true;
  state.pointerId = event.pointerId;
  state.dragBounds = { min: { ...render.bounds.min }, max: { ...render.bounds.max } };
  canvas.setPointerCapture?.(event.pointerId);
  Body.setStatic(hero, true);
  setStatus("Тяни назад");
}

function pointerMove(event) {
  if (!state.dragging || event.pointerId !== state.pointerId || !hero) return;
  const point = pointerToWorld(event);
  const offset = Vector.sub(point, anchor);
  const distance = Math.max(1, Vector.magnitude(offset));
  const clamped = Vector.mult(offset, Math.min(1, CONFIG.maxPull / distance));
  Body.setPosition(hero, Vector.add(anchor, clamped));
  Body.setVelocity(hero, { x: 0, y: 0 });
  Body.setAngularVelocity(hero, 0);
}

function pointerUp(event) {
  if (!state.dragging || event.pointerId !== state.pointerId || !hero) return;

  const pull = Vector.sub(anchor, hero.position);
  const distance = Vector.magnitude(pull);

  state.dragging = false;
  state.pointerId = null;
  state.dragBounds = null;
  Body.setStatic(hero, false);
  Body.setSleeping(hero, false);

  if (distance < 12) {
    Body.setPosition(hero, anchor);
    Body.setVelocity(hero, { x: 0, y: 0 });
    setStatus("Готов");
    return;
  }

  const launchDistance = Math.min(distance, CONFIG.maxPull);
  const velocity = Vector.mult(Vector.normalise(pull), launchDistance * CONFIG.launchPower);
  Body.setVelocity(hero, velocity);
  Body.setAngularVelocity(hero, -0.08);

  state.launched = true;
  state.shots += 1;
  setStatus("В полёте");
  updateHud();
  state.respawnTimer = setTimeout(respawnHero, CONFIG.respawnDelay);
}

function respawnHero() {
  if (state.respawnTimer) clearTimeout(state.respawnTimer);
  state.respawnTimer = null;
  if (hero) World.remove(engine.world, hero);
  spawnHero();
}

function applyCamera(force = false) {
  camera.x = force ? camera.tx : camera.x + (camera.tx - camera.x) * 0.055;
  camera.y = force ? camera.ty : camera.y + (camera.ty - camera.y) * 0.055;
  camera.shake *= 0.82;
  const viewW = innerWidth / CONFIG.cameraZoom;
  const viewH = innerHeight / CONFIG.cameraZoom;
  const sx = (Math.random() * 2 - 1) * camera.shake;
  const sy = (Math.random() * 2 - 1) * camera.shake;
  render.bounds.min.x = camera.x + sx - viewW / 2;
  render.bounds.max.x = camera.x + sx + viewW / 2;
  render.bounds.min.y = camera.y + sy - viewH / 2;
  render.bounds.max.y = camera.y + sy + viewH / 2;
  Render.lookAt(render, render.bounds);
}

function updateCamera() {
  const startX = Math.max(700, innerWidth * 0.39);
  if (hero && state.launched) {
    const followThreshold = 580;
    if (hero.position.x > followThreshold) {
      camera.tx = Math.max(startX, hero.position.x + 80);
    } else {
      camera.tx = startX;
    }
    camera.ty = innerHeight / 2 + Math.max(-90, Math.min(70, (hero.position.y - innerHeight / 2) * 0.25));
  } else {
    camera.tx = startX;
    camera.ty = innerHeight / 2;
  }
  applyCamera(false);
}

function drawBackground() {
  const ctx = render.context;
  const w = render.canvas.width;
  const h = render.canvas.height;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "destination-over";
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#72bdf6");
  sky.addColorStop(0.58, "#dff5ff");
  sky.addColorStop(1, "#c7d8df");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  ctx.globalAlpha = 0.28;
  for (let i = 0; i < 11; i += 1) {
    const bw = w * (0.06 + (i % 3) * 0.012);
    const bh = h * (0.28 + (i % 5) * 0.06);
    const x = i * w * 0.095 - w * 0.03;
    const y = h * 0.58 - bh;
    ctx.fillStyle = i % 2 ? "#547fa2" : "#416b8e";
    ctx.fillRect(x, y, bw, bh);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function worldToScreen(point) {
  const b = render.bounds;
  return {
    x: (point.x - b.min.x) / (b.max.x - b.min.x) * render.canvas.width,
    y: (point.y - b.min.y) / (b.max.y - b.min.y) * render.canvas.height,
  };
}

function drawAim() {
  if (!state.dragging || !hero) return;
  const pull = Vector.sub(anchor, hero.position);
  const distance = Math.min(Vector.magnitude(pull), CONFIG.maxPull);
  if (distance < 8) return;
  const ctx = render.context;
  let point = { ...hero.position };
  let velocity = Vector.mult(Vector.normalise(pull), distance * CONFIG.launchPower);
  const gravity = engine.gravity.y * engine.gravity.scale * (1000 / 60) ** 2;
  ctx.save();
  for (let i = 0; i < 34; i += 1) {
    point.x += velocity.x;
    point.y += velocity.y;
    velocity.y += gravity;
    if (i % 2) continue;
    const p = worldToScreen(point);
    ctx.beginPath();
    ctx.fillStyle = `rgba(255,221,120,${0.9 - i / 45})`;
    ctx.arc(p.x, p.y, 4.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

Events.on(engine, "collisionStart", (event) => {
  for (const pair of event.pairs) {
    if (pair.bodyA !== hero && pair.bodyB !== hero) continue;
    const rv = Vector.sub(pair.bodyA.velocity, pair.bodyB.velocity);
    const normal = pair.collision?.normal || { x: 0, y: 1 };
    const impact = Math.abs(Vector.dot(rv, normal));
    if (impact > 7) camera.shake = Math.min(16, camera.shake + impact * 0.6);
  }
});

Events.on(engine, "beforeUpdate", () => {
  if (hero && state.launched) {
    const speed = Vector.magnitude(hero.velocity);
    if (speed > CONFIG.maxSpeed) Body.setVelocity(hero, Vector.mult(hero.velocity, CONFIG.maxSpeed / speed));
    if (hero.position.y > innerHeight + 700 || hero.position.x > CONFIG.worldWidth + 500 || hero.position.x < -500) respawnHero();
  }
  updateCamera();
  updateHud();
});

Events.on(render, "afterRender", () => {
  drawBackground();
  drawAim();
});

canvas.addEventListener("pointerdown", pointerDown);
canvas.addEventListener("pointermove", pointerMove);
canvas.addEventListener("pointerup", pointerUp);
canvas.addEventListener("pointercancel", pointerUp);
resetBtn.addEventListener("click", () => resetWorld(true));
debugBtn.addEventListener("click", () => {
  state.debug = !state.debug;
  render.options.wireframes = state.debug;
  debugBtn.textContent = state.debug ? "Debug ON" : "Debug";
});
window.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "r") resetWorld(true);
  if (event.key.toLowerCase() === "d") debugBtn.click();
});
window.addEventListener("resize", () => {
  render.options.width = innerWidth;
  render.options.height = innerHeight;
  render.options.pixelRatio = Math.min(devicePixelRatio || 1, 2);
  render.canvas.width = Math.floor(innerWidth * render.options.pixelRatio);
  render.canvas.height = Math.floor(innerHeight * render.options.pixelRatio);
  resetWorld(false);
});

Render.run(render);
Runner.run(runner, engine);
resetWorld(true);
