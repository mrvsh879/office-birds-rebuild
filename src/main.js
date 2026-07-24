const {
  Engine,
  Render,
  Runner,
  World,
  Bodies,
  Body,
  Events,
  Composite,
  Vector,
} = Matter;

const canvas = document.getElementById("gameCanvas");
const shotsEl = document.getElementById("shots");
const speedEl = document.getElementById("speed");
const statusEl = document.getElementById("status");
const resetBtn = document.getElementById("resetBtn");
const debugBtn = document.getElementById("debugBtn");

const CONFIG = Object.freeze({
  floorHeight: 96,
  worldWidth: 3600,
  heroRadius: 34,
  maxPull: 300,
  launchPower: 0.145,
  maxSpeed: 40,
  respawnDelay: 5500,
  cameraZoom: 0.9,
});

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
engine.constraintIterations = 4;

const render = Render.create({
  canvas,
  engine,
  options: {
    width: window.innerWidth,
    height: window.innerHeight,
    pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
    wireframes: false,
    background: "transparent",
    hasBounds: true,
  },
});

const runner = Runner.create({ isFixed: true, delta: 1000 / 60 });

let floor = null;
let hero = null;
let towerBodies = [];
let anchor = { x: 220, y: 420 };
let camera = { x: 820, y: 380, tx: 820, ty: 380, shake: 0 };

function updateHud() {
  shotsEl.textContent = String(state.shots);
  if (!hero) {
    speedEl.textContent = "0";
    return;
  }
  speedEl.textContent = Vector.magnitude(hero.velocity).toFixed(1);
}

function setStatus(text) {
  statusEl.textContent = text;
}

function resizeCanvas() {
  render.options.width = window.innerWidth;
  render.options.height = window.innerHeight;
  render.options.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  render.canvas.width = Math.floor(window.innerWidth * render.options.pixelRatio);
  render.canvas.height = Math.floor(window.innerHeight * render.options.pixelRatio);
  resetWorld(false);
}

function createFloor() {
  floor = Bodies.rectangle(
    CONFIG.worldWidth / 2,
    window.innerHeight - CONFIG.floorHeight / 2,
    CONFIG.worldWidth,
    CONFIG.floorHeight,
    {
      isStatic: true,
      friction: 1,
      restitution: 0,
      render: {
        fillStyle: "#293845",
        strokeStyle: "#16232e",
        lineWidth: 2,
      },
    },
  );
  World.add(engine.world, floor);
}

function createTowerBlock(x, y, width, height, color, options = {}) {
  const body = Bodies.rectangle(x, y, width, height, {
    isStatic: options.isStatic ?? false,
    density: options.density ?? 0.0024,
    friction: options.friction ?? 0.72,
    frictionStatic: options.frictionStatic ?? 0.9,
    frictionAir: options.frictionAir ?? 0.009,
    restitution: options.restitution ?? 0.02,
    chamfer: { radius: Math.min(7, width / 8, height / 8) },
    render: {
      fillStyle: color,
      strokeStyle: "rgba(46,27,14,.55)",
      lineWidth: 2,
    },
  });
  body.gameType = options.gameType || "structure";
  return body;
}

function buildTestTower() {
  const baseY = window.innerHeight - CONFIG.floorHeight;
  const centerX = Math.max(1030, window.innerWidth * 0.68);
  const beamW = 360;
  const beamH = 34;
  const pillarW = 42;
  const pillarH = 138;

  const colorBeam = "#d79953";
  const colorPillar = "#b8753f";

  towerBodies = [
    createTowerBlock(centerX, baseY - 20, beamW, beamH, colorBeam),
    createTowerBlock(centerX - 135, baseY - 105, pillarW, pillarH, colorPillar),
    createTowerBlock(centerX + 135, baseY - 105, pillarW, pillarH, colorPillar),
    createTowerBlock(centerX, baseY - 190, beamW, beamH, colorBeam),
    createTowerBlock(centerX - 135, baseY - 275, pillarW, pillarH, colorPillar),
    createTowerBlock(centerX + 135, baseY - 275, pillarW, pillarH, colorPillar),
    createTowerBlock(centerX, baseY - 360, beamW, beamH, colorBeam),
  ];

  const target = Bodies.circle(centerX, baseY - 420, 28, {
    density: 0.0015,
    friction: 0.35,
    restitution: 0.08,
    render: {
      fillStyle: "#f1d7bf",
      strokeStyle: "#6f4330",
      lineWidth: 3,
    },
  });
  target.gameType = "target";
  towerBodies.push(target);

  World.add(engine.world, towerBodies);
}

function spawnHero() {
  const baseY = window.innerHeight - CONFIG.floorHeight;
  anchor = { x: 220, y: baseY - 175 };

  hero = Bodies.circle(anchor.x, anchor.y, CONFIG.heroRadius, {
    density: 0.0048,
    restitution: 0.3,
    friction: 0.18,
    frictionStatic: 0.15,
    frictionAir: 0.006,
    render: {
      fillStyle: "#ffd36b",
      strokeStyle: "#5f3b14",
      lineWidth: 4,
    },
  });
  hero.gameType = "hero";
  World.add(engine.world, hero);

  state.dragging = false;
  state.launched = false;
  state.pointerId = null;
  state.dragBounds = null;
  setStatus("Готов");
  updateHud();
}

function resetWorld(resetStats = true) {
  if (state.respawnTimer) {
    clearTimeout(state.respawnTimer);
    state.respawnTimer = null;
  }

  Composite.clear(engine.world, false);
  if (resetStats) state.shots = 0;

  createFloor();
  buildTestTower();
  spawnHero();

  camera.x = camera.tx = Math.max(770, window.innerWidth * 0.44);
  camera.y = camera.ty = window.innerHeight / 2;
  camera.shake = 0;
  applyCamera(true);
  updateHud();
}

function pointerToWorld(event) {
  const rect = canvas.getBoundingClientRect();
  const sourceBounds = state.dragBounds || render.bounds;
  const sx = (event.clientX - rect.left) / rect.width;
  const sy = (event.clientY - rect.top) / rect.height;
  return {
    x: sourceBounds.min.x + sx * (sourceBounds.max.x - sourceBounds.min.x),
    y: sourceBounds.min.y + sy * (sourceBounds.max.y - sourceBounds.min.y),
  };
}

function onPointerDown(event) {
  if (!hero || state.launched || state.dragging) return;
  const point = pointerToWorld(event);
  const distance = Vector.magnitude(Vector.sub(point, hero.position));
  if (distance > CONFIG.heroRadius * 1.55) return;

  state.pointerId = event.pointerId;
  state.dragging = true;
  state.dragBounds = {
    min: { ...render.bounds.min },
    max: { ...render.bounds.max },
  };
  canvas.setPointerCapture?.(event.pointerId);
  Body.setStatic(hero, true);
  setStatus("Тяни назад");
}

function onPointerMove(event) {
  if (!state.dragging || event.pointerId !== state.pointerId || !hero) return;

  const point = pointerToWorld(event);
  const offset = Vector.sub(point, anchor);
  const distance = Math.max(1, Vector.magnitude(offset));
  const clamped = Vector.mult(offset, Math.min(1, CONFIG.maxPull / distance));

  Body.setPosition(hero, Vector.add(anchor, clamped));
  Body.setVelocity(hero, { x: 0, y: 0 });
  Body.setAngularVelocity(hero, 0);
}

function releasePointer(event) {
  if (!state.dragging || event.pointerId !== state.pointerId || !hero) return;

  state.dragging = false;
  state.pointerId = null;
  state.dragBounds = null;
  Body.setStatic(hero, false);

  const pull = Vector.sub(anchor, hero.position);
  const distance = Vector.magnitude(pull);

  if (distance < 12) {
    Body.setPosition(hero, anchor);
    Body.setVelocity(hero, { x: 0, y: 0 });
    setStatus("Готов");
    return;
  }

  const launchDistance = Math.min(distance, CONFIG.maxPull);
  const velocity = Vector.mult(Vector.normalise(pull), launchDistance * CONFIG.launchPower);
  Body.setVelocity(hero, velocity);

  state.launched = true;
  state.shots += 1;
  setStatus("В полёте");
  updateHud();

  state.respawnTimer = window.setTimeout(respawnHero, CONFIG.respawnDelay);
}

function respawnHero() {
  if (state.respawnTimer) {
    clearTimeout(state.respawnTimer);
    state.respawnTimer = null;
  }
  if (hero) World.remove(engine.world, hero);
  spawnHero();
}

function applyCamera(force = false) {
  camera.x = force ? camera.tx : camera.x + (camera.tx - camera.x) * 0.1;
  camera.y = force ? camera.ty : camera.y + (camera.ty - camera.y) * 0.1;
  camera.shake *= 0.82;

  const shakeX = (Math.random() * 2 - 1) * camera.shake;
  const shakeY = (Math.random() * 2 - 1) * camera.shake;
  const viewWidth = window.innerWidth / CONFIG.cameraZoom;
  const viewHeight = window.innerHeight / CONFIG.cameraZoom;

  render.bounds.min.x = camera.x + shakeX - viewWidth / 2;
  render.bounds.max.x = camera.x + shakeX + viewWidth / 2;
  render.bounds.min.y = camera.y + shakeY - viewHeight / 2;
  render.bounds.max.y = camera.y + shakeY + viewHeight / 2;
  Render.lookAt(render, render.bounds);
}

function updateCamera() {
  if (hero && state.launched) {
    camera.tx = hero.position.x + 220;
    camera.ty = hero.position.y - 70;
  } else {
    camera.tx = Math.max(770, window.innerWidth * 0.44);
    camera.ty = window.innerHeight / 2;
  }
  applyCamera(false);
}

function drawWorldBackground() {
  const ctx = render.context;
  const width = render.canvas.width;
  const height = render.canvas.height;

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = "destination-over";

  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#72bdf6");
  sky.addColorStop(0.58, "#dff5ff");
  sky.addColorStop(1, "#c7d8df");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.globalAlpha = 0.32;
  for (let i = 0; i < 11; i += 1) {
    const buildingWidth = width * (0.06 + (i % 3) * 0.012);
    const buildingHeight = height * (0.28 + (i % 5) * 0.06);
    const x = i * width * 0.095 - width * 0.03;
    const y = height * 0.58 - buildingHeight;
    ctx.fillStyle = i % 2 ? "#547fa2" : "#416b8e";
    ctx.fillRect(x, y, buildingWidth, buildingHeight);

    ctx.fillStyle = "rgba(255,233,154,.48)";
    const cols = 4;
    const rows = 8;
    for (let cx = 0; cx < cols; cx += 1) {
      for (let cy = 0; cy < rows; cy += 1) {
        ctx.fillRect(
          x + 9 + cx * (buildingWidth - 18) / cols,
          y + 12 + cy * (buildingHeight - 24) / rows,
          Math.max(3, buildingWidth / 14),
          Math.max(3, buildingHeight / 32),
        );
      }
    }
  }

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}

function worldToScreen(point) {
  const bounds = render.bounds;
  return {
    x: (point.x - bounds.min.x) / (bounds.max.x - bounds.min.x) * render.canvas.width,
    y: (point.y - bounds.min.y) / (bounds.max.y - bounds.min.y) * render.canvas.height,
  };
}

function drawAimGuide() {
  if (!state.dragging || !hero) return;

  const pull = Vector.sub(anchor, hero.position);
  const distance = Math.min(Vector.magnitude(pull), CONFIG.maxPull);
  if (distance < 8) return;

  const ctx = render.context;
  const initialVelocity = Vector.mult(Vector.normalise(pull), distance * CONFIG.launchPower);
  const gravityPerTick = engine.gravity.y * engine.gravity.scale * (1000 / 60) ** 2;
  let point = { ...hero.position };
  let velocity = { ...initialVelocity };

  ctx.save();
  for (let i = 0; i < 34; i += 1) {
    point.x += velocity.x;
    point.y += velocity.y;
    velocity.y += gravityPerTick;

    if (i % 2 !== 0) continue;
    const screen = worldToScreen(point);
    ctx.beginPath();
    ctx.fillStyle = `rgba(255,221,120,${0.9 - i / 45})`;
    ctx.arc(screen.x, screen.y, 4.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

Events.on(engine, "collisionStart", (event) => {
  for (const pair of event.pairs) {
    if (pair.bodyA !== hero && pair.bodyB !== hero) continue;
    const relativeVelocity = Vector.sub(pair.bodyA.velocity, pair.bodyB.velocity);
    const normal = pair.collision?.normal || { x: 0, y: 1 };
    const impactSpeed = Math.abs(Vector.dot(relativeVelocity, normal));
    if (impactSpeed > 7) camera.shake = Math.min(16, camera.shake + impactSpeed * 0.6);
  }
});

Events.on(engine, "beforeUpdate", () => {
  if (hero && state.launched) {
    const speed = Vector.magnitude(hero.velocity);
    if (speed > CONFIG.maxSpeed) {
      Body.setVelocity(hero, Vector.mult(hero.velocity, CONFIG.maxSpeed / speed));
    }

    if (
      hero.position.y > window.innerHeight + 700 ||
      hero.position.x > CONFIG.worldWidth + 500 ||
      hero.position.x < -500
    ) {
      respawnHero();
    }
  }

  updateCamera();
  updateHud();
});

Events.on(render, "afterRender", () => {
  drawWorldBackground();
  drawAimGuide();
});

canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerup", releasePointer);
canvas.addEventListener("pointercancel", releasePointer);

resetBtn.addEventListener("click", () => resetWorld(true));
debugBtn.addEventListener("click", () => {
  state.debug = !state.debug;
  render.options.wireframes = state.debug;
  debugBtn.textContent = state.debug ? "Debug ON" : "Debug";
});

window.addEventListener("keydown", (event) => {
  if (event.key === "r" || event.key === "R") resetWorld(true);
  if (event.key === "d" || event.key === "D") debugBtn.click();
});
window.addEventListener("resize", resizeCanvas);

Render.run(render);
Runner.run(runner, engine);
resetWorld(true);
