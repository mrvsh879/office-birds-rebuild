const {
  Engine,
  Render,
  Runner,
  World,
  Bodies,
  Events,
  Composite,
  Constraint,
  Mouse,
  MouseConstraint,
  Vector,
} = Matter;

const canvas = document.getElementById("gameCanvas");
const shotsEl = document.getElementById("shots");
const speedEl = document.getElementById("speed");
const statusEl = document.getElementById("status");
const resetBtn = document.getElementById("resetBtn");
const debugBtn = document.getElementById("debugBtn");

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
    background: "#bfe8ff",
  },
});

const runner = Runner.create({ isFixed: true, delta: 1000 / 60 });

let ball;
let sling;
let mouseConstraint;
let anchor;
let shots = 0;
let released = false;
let detached = false;
let respawnQueued = false;

function updateHud() {
  shotsEl.textContent = String(shots);
  speedEl.textContent = ball ? Vector.magnitude(ball.velocity).toFixed(1) : "0.0";
}

function setStatus(text) {
  statusEl.textContent = text;
}

function createBallAndSling() {
  ball = Bodies.circle(anchor.x, anchor.y, 34, {
    density: 0.004,
    restitution: 0.35,
    friction: 0.12,
    frictionAir: 0.004,
    render: {
      fillStyle: "#ffd36b",
      strokeStyle: "#5f3b14",
      lineWidth: 4,
    },
  });

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
  setStatus("Потяни шар назад");
}

function createScene(resetShots = true) {
  Composite.clear(engine.world, false);

  const floorY = innerHeight - 110;
  anchor = { x: Math.max(320, innerWidth * 0.24), y: floorY - 210 };

  const floor = Bodies.rectangle(innerWidth / 2, floorY + 45, innerWidth + 400, 90, {
    isStatic: true,
    friction: 1,
    render: { fillStyle: "#435462" },
  });

  World.add(engine.world, floor);
  createBallAndSling();

  const mouse = Mouse.create(canvas);
  mouse.pixelRatio = render.options.pixelRatio;
  mouseConstraint = MouseConstraint.create(engine, {
    mouse,
    constraint: {
      stiffness: 0.18,
      damping: 0.12,
      render: { visible: false },
    },
  });

  Events.on(mouseConstraint, "startdrag", (event) => {
    if (event.body !== ball || detached) return;
    released = false;
    setStatus("Натяжение");
  });

  Events.on(mouseConstraint, "enddrag", (event) => {
    if (event.body !== ball || detached) return;
    const stretch = Vector.magnitude(Vector.sub(ball.position, anchor));
    if (stretch < 45) {
      setStatus("Потяни сильнее");
      return;
    }
    released = true;
    shots += 1;
    setStatus("Резинка отпущена");
  });

  World.add(engine.world, mouseConstraint);
  render.mouse = mouse;

  if (resetShots) shots = 0;
  updateHud();
}

function resetBallOnly() {
  if (ball) World.remove(engine.world, ball);
  if (sling) World.remove(engine.world, sling);
  createBallAndSling();
}

Events.on(engine, "beforeUpdate", () => {
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
      setStatus("Полёт");
    }
  }

  if (
    detached &&
    !respawnQueued &&
    (ball.position.x > innerWidth + 250 || ball.position.y > innerHeight + 300 || ball.position.x < -250)
  ) {
    respawnQueued = true;
    setTimeout(resetBallOnly, 350);
  }

  updateHud();
});

Events.on(render, "afterRender", () => {
  if (!anchor) return;
  const ctx = render.context;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#75421f";
  ctx.lineWidth = 22;
  ctx.beginPath();
  ctx.moveTo(anchor.x, anchor.y + 115);
  ctx.lineTo(anchor.x, anchor.y + 10);
  ctx.moveTo(anchor.x, anchor.y + 20);
  ctx.lineTo(anchor.x - 45, anchor.y - 45);
  ctx.moveTo(anchor.x, anchor.y + 20);
  ctx.lineTo(anchor.x + 45, anchor.y - 45);
  ctx.stroke();

  if (!detached && ball) {
    ctx.strokeStyle = "#3b2417";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(anchor.x - 45, anchor.y - 45);
    ctx.lineTo(ball.position.x, ball.position.y);
    ctx.lineTo(anchor.x + 45, anchor.y - 45);
    ctx.stroke();
  }

  ctx.restore();
});

resetBtn.addEventListener("click", () => createScene(true));
debugBtn.addEventListener("click", () => {
  render.options.wireframes = !render.options.wireframes;
  debugBtn.textContent = render.options.wireframes ? "Debug ON" : "Debug";
});

window.addEventListener("keydown", (event) => {
  if (event.key.toLowerCase() === "r") createScene(true);
  if (event.key.toLowerCase() === "d") debugBtn.click();
});

window.addEventListener("resize", () => {
  render.options.width = innerWidth;
  render.options.height = innerHeight;
  render.canvas.width = Math.floor(innerWidth * render.options.pixelRatio);
  render.canvas.height = Math.floor(innerHeight * render.options.pixelRatio);
  createScene(false);
});

Render.run(render);
Runner.run(runner, engine);
createScene(true);
