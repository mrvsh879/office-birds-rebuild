(() => {
  const { Body, Composite, Constraint, Events, Vector, World } = Matter;

  const state = {
    installed: false,
    joints: [],
    introActive: false,
    introStartedAt: 0,
    introDuration: 2350,
    introFromX: 0,
    introToX: 0,
    shake: 0,
    slowUntil: 0,
    slowRestore: 1,
    finishing: false,
    cameraFrame: 0,
    lastHud: {},
    suppressIntro: false,
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const easeInOut = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const joinable = (body) => ['structure', 'glass', 'metal', 'concrete'].includes(body?.gameType);
  const damageable = (body) => ['structure', 'glass', 'metal', 'concrete'].includes(body?.gameType);

  function installStyles() {
    document.getElementById('office-birds-modern-prototype-style')?.remove();
    const style = document.createElement('style');
    style.id = 'office-birds-modern-prototype-style';
    style.textContent = `
      #gameCanvas {
        transform-origin:50% 52%;
        will-change:transform,filter;
      }
      #debugBtn { display:none !important; }
      .modern-level-intro {
        position:fixed; z-index:28; left:50%; top:42%;
        width:min(620px,calc(100vw - 36px));
        transform:translate(-50%,-50%) scale(.88);
        opacity:0; pointer-events:none; text-align:center; color:#fff;
        transition:opacity .32s ease,transform .55s cubic-bezier(.2,.85,.2,1);
        text-shadow:0 4px 20px rgba(0,0,0,.75);
      }
      .modern-level-intro.show { opacity:1; transform:translate(-50%,-50%) scale(1); }
      .modern-level-intro strong {
        display:block; font-size:clamp(34px,6vw,72px); line-height:.95;
        letter-spacing:-.04em; font-weight:1000;
      }
      .modern-level-intro span {
        display:inline-block; margin-top:14px; padding:8px 16px;
        border-radius:999px; background:rgba(4,25,51,.78);
        border:2px solid rgba(255,190,42,.8); font-weight:900;
      }
      .result-card.modern-result-show { animation:modernResultIn .62s cubic-bezier(.16,.9,.2,1); }
      .result-card.modern-result-show .result-stars { animation:modernStars .85s .18s both; }
      @keyframes modernResultIn {
        0% { transform:translate(-50%,-42%) scale(.78); filter:blur(5px); }
        70% { transform:translate(-50%,-52%) scale(1.035); filter:blur(0); }
        100% { transform:translate(-50%,-50%) scale(1); }
      }
      @keyframes modernStars {
        0% { opacity:0; transform:scale(.35) rotate(-8deg); letter-spacing:.5em; }
        70% { opacity:1; transform:scale(1.16) rotate(2deg); }
        100% { transform:scale(1); }
      }
    `;
    document.head.appendChild(style);

    let intro = document.getElementById('modernLevelIntro');
    if (!intro) {
      intro = document.createElement('div');
      intro.id = 'modernLevelIntro';
      intro.className = 'modern-level-intro';
      intro.innerHTML = '<strong></strong><span></span>';
      document.body.appendChild(intro);
    }
  }

  function setModernLevel() {
    LEVELS[0] = {
      name: 'Open Space — цепная реакция',
      shots: 3,
      build({ x, y, beam, pillar, weakPillar, glass, metal, concrete, cabinet, monitor, printer, target }) {
        return [
          concrete(x - 235, y - 48, 82, 64),
          concrete(x + 235, y - 48, 82, 64),

          beam(x - 210, y - 22, 250),
          pillar(x - 300, y - 98, 120),
          weakPillar(x - 120, y - 98, 120),
          monitor(x - 245, y - 70),
          target(x - 185, y - 91),

          glass(x, y - 135, 42, 245),
          metal(x, y - 275, 360, 28),
          target(x, y - 326),

          beam(x + 210, y - 22, 250),
          weakPillar(x + 120, y - 98, 120),
          pillar(x + 300, y - 98, 120),
          printer(x + 175, y - 70),
          cabinet(x + 275, y - 108),
          target(x + 210, y - 91),

          beam(x, y - 214, 250),
          pillar(x - 82, y - 172, 92),
          weakPillar(x + 82, y - 172, 92),
        ];
      },
    };
  }

  function boundsGap(a, b) {
    const dx = Math.max(0, Math.max(a.bounds.min.x, b.bounds.min.x) - Math.min(a.bounds.max.x, b.bounds.max.x));
    const dy = Math.max(0, Math.max(a.bounds.min.y, b.bounds.min.y) - Math.min(a.bounds.max.y, b.bounds.max.y));
    return Math.hypot(dx, dy);
  }

  function closestPointBetween(a, b) {
    return {
      x: (clamp(b.position.x, a.bounds.min.x, a.bounds.max.x) + clamp(a.position.x, b.bounds.min.x, b.bounds.max.x)) / 2,
      y: (clamp(b.position.y, a.bounds.min.y, a.bounds.max.y) + clamp(a.position.y, b.bounds.min.y, b.bounds.max.y)) / 2,
    };
  }

  function addBreakableJoint(a, b) {
    const worldPoint = closestPointBetween(a, b);
    const weak = a.weakPoint || b.weakPoint || a.material === 'glass' || b.material === 'glass';
    const joint = Constraint.create({
      bodyA: a,
      bodyB: b,
      pointA: Vector.sub(worldPoint, a.position),
      pointB: Vector.sub(worldPoint, b.position),
      length: 0,
      stiffness: weak ? 0.34 : 0.58,
      damping: weak ? 0.08 : 0.16,
      render: { visible: false },
    });
    joint.modernBreakable = true;
    joint.modernStrength = weak ? 15 : (a.material === 'metal' || b.material === 'metal' ? 34 : 24);
    joint.modernDamage = 0;
    state.joints.push(joint);
    stabilityJoints.push(joint);
    World.add(engine.world, joint);
  }

  function installModernPhysics() {
    freezeStructure = function modernizeStructure(bodies) {
      state.joints.length = 0;
      stabilityJoints = [];

      for (const body of bodies) {
        if (!isStructuralBody(body)) continue;
        const bottom = body.bounds.max.y;
        const foundation = body.material === 'concrete' && bottom >= floorY - 24;
        Body.setStatic(body, foundation);
        body.structureFrozen = foundation;
        body.modernFoundation = foundation;
      }

      const candidates = bodies.filter(joinable);
      for (let i = 0; i < candidates.length; i += 1) {
        for (let j = i + 1; j < candidates.length; j += 1) {
          const a = candidates[i], b = candidates[j];
          if (a.isStatic && b.isStatic) continue;
          if (boundsGap(a, b) <= 13) addBreakableJoint(a, b);
        }
      }
    };

    activateStructure = function wakeModernStructure(body, radius = 110) {
      if (!body) return;
      for (const candidate of Composite.allBodies(engine.world)) {
        if (!isStructuralBody(candidate) || candidate.modernFoundation) continue;
        if (candidate === body || Vector.magnitude(Vector.sub(candidate.position, body.position)) <= radius) {
          if (candidate.isStatic) Body.setStatic(candidate, false);
        }
      }
    };

    releaseJointsFor = function releaseModernJoints(body, radius = 0) {
      if (!body) return;
      const effectiveRadius = radius || 90;
      for (let i = state.joints.length - 1; i >= 0; i -= 1) {
        const joint = state.joints[i];
        const connected = joint.bodyA === body || joint.bodyB === body;
        const near = !connected && Vector.magnitude(Vector.sub(joint.bodyA.position, body.position)) < effectiveRadius;
        if (!connected && !near) continue;
        World.remove(engine.world, joint);
        state.joints.splice(i, 1);
      }
    };
  }

  function damageFromCascade(body, power, contact) {
    if (!body || body.broken) return;
    if (body.material === 'wood') damageWood(body, power * 0.72, contact);
    else if (body.material === 'glass') damageGlass(body, power * 0.82, contact);
    else if (body.material === 'metal') damageMetal(body, power * 0.68, contact);
    else if (body.material === 'concrete') damageConcrete(body, power * 0.62, contact);
  }

  function damageNearbyJoints(a, b, power) {
    for (const joint of state.joints) {
      if (joint.bodyA === a || joint.bodyB === a || joint.bodyA === b || joint.bodyB === b) {
        joint.modernDamage += power;
      }
    }
  }

  function worldAnchor(body, point) {
    const angle = body.angle || 0;
    const cosine = Math.cos(angle), sine = Math.sin(angle);
    return {
      x: body.position.x + point.x * cosine - point.y * sine,
      y: body.position.y + point.x * sine + point.y * cosine,
    };
  }

  function updateBreakableJoints() {
    for (let i = state.joints.length - 1; i >= 0; i -= 1) {
      const joint = state.joints[i];
      const a = worldAnchor(joint.bodyA, joint.pointA);
      const b = worldAnchor(joint.bodyB, joint.pointB);
      const stretch = Vector.magnitude(Vector.sub(a, b));
      if (stretch <= 12 && joint.modernDamage < joint.modernStrength) continue;
      const midpoint = Vector.mult(Vector.add(a, b), 0.5);
      World.remove(engine.world, joint);
      state.joints.splice(i, 1);
      burst(midpoint.x, midpoint.y, 7, '#e7bd78');
      state.shake = Math.max(state.shake, 4);
    }
  }

  function installCascadeCollisions() {
    Events.on(engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        const a = pair.bodyA, b = pair.bodyB;
        if (a === ball || b === ball) continue;
        const aCanHit = damageable(a) || a.gameType === 'officeProp' || a.gameType === 'debris' || a.gameType === 'concreteChunk';
        const bCanHit = damageable(b) || b.gameType === 'officeProp' || b.gameType === 'debris' || b.gameType === 'concreteChunk';
        if (!aCanHit || !bCanHit) continue;
        const relative = Vector.sub(a.velocity, b.velocity);
        const normal = pair.collision?.normal || { x: 1, y: 0 };
        const power = Math.abs(Vector.dot(relative, normal));
        if (power < 3.1) continue;
        const contact = pair.collision?.supports?.[0] || Vector.mult(Vector.add(a.position, b.position), 0.5);
        damageFromCascade(a, power, contact);
        damageFromCascade(b, power, contact);
        damageNearbyJoints(a, b, power * 1.15);
        if (power > 8.5) triggerImpactDirection(power);
      }
    });

    Events.on(engine, 'beforeUpdate', updateBreakableJoints);
  }

  function triggerImpactDirection(power) {
    state.shake = Math.max(state.shake, Math.min(13, power * 0.8));
    if (power < 10 || performance.now() < state.slowUntil) return;
    state.slowRestore = paused ? 0 : 1;
    state.slowUntil = performance.now() + 190;
    engine.timing.timeScale = 0.28;
  }

  function installImpactCinematics() {
    Events.on(engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        if (pair.bodyA !== ball && pair.bodyB !== ball) continue;
        const relative = Vector.sub(pair.bodyA.velocity, pair.bodyB.velocity);
        const normal = pair.collision?.normal || { x: 1, y: 0 };
        triggerImpactDirection(Math.abs(Vector.dot(relative, normal)));
      }
    });
  }

  function cameraTransform(focusX, scale, extraX = 0, extraY = 0) {
    const baseX = clamp((innerWidth * 0.46 - focusX) * 0.34, -210, 210);
    const shakeX = state.shake ? (Math.random() - 0.5) * state.shake * 2 : 0;
    const shakeY = state.shake ? (Math.random() - 0.5) * state.shake * 1.25 : 0;
    canvas.style.transform = `translate(${baseX + extraX + shakeX}px,${extraY + shakeY}px) scale(${scale})`;
    canvas.style.filter = state.slowUntil > performance.now() ? 'saturate(1.12) contrast(1.04)' : 'none';
  }

  function startLevelIntro() {
    if (levelMenu.classList.contains('show')) return;
    const intro = document.getElementById('modernLevelIntro');
    const targetXs = targets.map((target) => target.position.x);
    state.introFromX = targetXs.length ? targetXs.reduce((sum, value) => sum + value, 0) / targetXs.length : innerWidth * 0.72;
    state.introToX = innerWidth * 0.46;
    state.introStartedAt = performance.now();
    state.introActive = true;
    engine.timing.timeScale = 0;
    if (intro) {
      intro.querySelector('strong').textContent = LEVELS[levelIndex].name;
      intro.querySelector('span').textContent = levelIndex === 0 ? 'Найди цепную реакцию' : 'Разруши офисную конструкцию';
      intro.classList.add('show');
      setTimeout(() => intro.classList.remove('show'), 1450);
    }
  }

  function cameraLoop(now) {
    if (state.slowUntil && now >= state.slowUntil) {
      state.slowUntil = 0;
      if (!paused && !state.introActive) engine.timing.timeScale = state.slowRestore || 1;
    }

    if (state.introActive) {
      const raw = clamp((now - state.introStartedAt) / state.introDuration, 0, 1);
      const t = easeInOut(raw);
      const focus = state.introFromX + (state.introToX - state.introFromX) * t;
      const scale = 1.13 - 0.08 * t;
      cameraTransform(focus, scale, 0, -8 * Math.sin(t * Math.PI));
      if (raw >= 1) {
        state.introActive = false;
        if (!paused && !levelMenu.classList.contains('show')) engine.timing.timeScale = 1;
      }
    } else if (ball && detached && !levelFinished) {
      cameraTransform(ball.position.x, 1.07, 0, -5);
    } else {
      cameraTransform(innerWidth * 0.46, 1);
    }

    state.shake *= 0.82;
    state.cameraFrame = requestAnimationFrame(cameraLoop);
  }

  function installCharacterMotion() {
    const previousDrawHero = drawHero;
    drawHero = function drawAnimatedHero(ctx) {
      if (!ball) return;
      const now = performance.now();
      const speed = Vector.magnitude(ball.velocity);
      const aiming = !detached && mouseConstraint?.body === ball;
      const stretch = aiming ? Vector.magnitude(Vector.sub(ball.position, anchor)) : 0;
      const squash = detached ? clamp(speed / 28, 0, 0.18) : clamp(stretch / 1200, 0, 0.08);
      const breathe = !detached ? Math.sin(now * 0.006) * 0.018 : 0;
      ctx.save();
      ctx.translate(ball.position.x, ball.position.y);
      ctx.scale(1 + squash + breathe, 1 - squash * 0.72 - breathe * 0.4);
      ctx.translate(-ball.position.x, -ball.position.y);
      previousDrawHero(ctx);
      ctx.restore();
    };

    drawTargets = function drawLivingManagers(ctx) {
      const now = performance.now();
      for (const target of targets) {
        const moved = Vector.magnitude(Vector.sub(target.position, target.start));
        const distanceToHero = ball ? Vector.magnitude(Vector.sub(target.position, ball.position)) : Infinity;
        const alarmed = !target.defeated && detached && distanceToHero < 440;
        let sprite = target.variant ? SPRITES.bossSmug : SPRITES.bossIdle;
        if (target.defeated) sprite = SPRITES.bossDefeated;
        else if (alarmed || moved > 20 || Math.abs(target.angle) > 0.22) sprite = SPRITES.bossPanic;

        const phase = now * 0.0045 + target.id * 0.71;
        const bob = target.defeated ? 0 : Math.sin(phase) * (alarmed ? 3.5 : 1.8);
        const sway = target.defeated ? 0 : Math.sin(phase * 0.72) * (alarmed ? 0.055 : 0.018);
        const pulse = target.defeated ? 1 : 1 + Math.sin(phase * 1.13) * 0.018;
        const width = (target.defeated ? 132 : 122) * pulse;
        const height = (target.defeated ? 106 : 138) / pulse;
        if (!drawSprite(ctx, sprite, target.position.x, target.position.y + bob, width, height, target.angle + sway)) {
          drawFallbackBoss(ctx, target);
        }
      }
    };
  }

  function installHudOptimization() {
    currentStars = function modernStarRating() {
      if (shotsUsed <= 1) return 3;
      if (shotsUsed < LEVELS[levelIndex].shots) return 2;
      return 1;
    };

    updateHud = function optimizedHud() {
      const values = {
        level: `${levelIndex + 1}/${LEVELS.length} — ${LEVELS[levelIndex].name}`,
        shots: `${remainingShots()} (${reserveHeroes()} в запасе)`,
        targets: String(aliveTargets()),
        speed: ball ? Vector.magnitude(ball.velocity).toFixed(1) : '0.0',
        score: String(score),
        stars: '★'.repeat(progress.levels[levelIndex].stars) + '☆'.repeat(3 - progress.levels[levelIndex].stars),
        rack: `${levelIndex}:${shotsUsed}:${LEVELS[levelIndex].shots}`,
      };
      if (state.lastHud.level !== values.level) levelEl.textContent = values.level;
      if (state.lastHud.shots !== values.shots) shotsEl.textContent = values.shots;
      if (state.lastHud.targets !== values.targets) targetsEl.textContent = values.targets;
      if (state.lastHud.speed !== values.speed) speedEl.textContent = values.speed;
      if (state.lastHud.score !== values.score) scoreEl.textContent = values.score;
      if (state.lastHud.stars !== values.stars) starsEl.textContent = values.stars;
      if (state.lastHud.rack !== values.rack) renderShotRack();
      state.lastHud = values;
    };
  }

  function installTransitions() {
    const previousLoadLevel = loadLevel;
    loadLevel = function loadModernLevel(index) {
      state.finishing = false;
      state.lastHud = {};
      result.classList.remove('modern-result-show');
      const output = previousLoadLevel(index);
      if (!state.suppressIntro) requestAnimationFrame(() => startLevelIntro());
      return output;
    };

    const previousFinishLevel = finishLevel;
    finishLevel = function finishModernLevel(won) {
      if (levelFinished || state.finishing) return;
      state.finishing = true;
      const delay = won ? 620 : 260;
      engine.timing.timeScale = won ? 0.38 : 0.7;
      state.shake = won ? 6 : 2;
      setTimeout(() => {
        engine.timing.timeScale = 1;
        previousFinishLevel(won);
        result.classList.remove('modern-result-show');
        void result.offsetWidth;
        result.classList.add('modern-result-show');
        state.finishing = false;
      }, delay);
    };
  }

  const api = {
    state,
    install() {
      if (state.installed) return;
      installStyles();
      setModernLevel();
      installModernPhysics();
      installHudOptimization();
      installCharacterMotion();
      installTransitions();
      installCascadeCollisions();
      installImpactCinematics();
      state.installed = true;
      state.cameraFrame = requestAnimationFrame(cameraLoop);
      state.suppressIntro = true;
      loadLevel(levelIndex);
      state.suppressIntro = false;
      showMenu();
      state.introActive = false;
      canvas.style.transform = 'none';
    },
  };

  window.officeBirdsModernPrototype = api;
})();
