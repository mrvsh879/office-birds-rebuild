(() => {
  const prototype = window.officeBirdsModernPrototype;
  if (!prototype || prototype.stabilityPatchInstalled) return;

  const { Body, Composite, Constraint, Vector, World } = Matter;
  const originalInstall = prototype.install.bind(prototype);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const joinable = (body) => ['structure', 'glass', 'metal', 'concrete'].includes(body?.gameType);

  function boundsGap(a, b) {
    const dx = Math.max(0, Math.max(a.bounds.min.x, b.bounds.min.x) - Math.min(a.bounds.max.x, b.bounds.max.x));
    const dy = Math.max(0, Math.max(a.bounds.min.y, b.bounds.min.y) - Math.min(a.bounds.max.y, b.bounds.max.y));
    return Math.hypot(dx, dy);
  }

  function overlap(minA, maxA, minB, maxB) {
    return Math.max(0, Math.min(maxA, maxB) - Math.max(minA, minB));
  }

  function closestPointBetween(a, b) {
    return {
      x: (clamp(b.position.x, a.bounds.min.x, a.bounds.max.x) + clamp(a.position.x, b.bounds.min.x, b.bounds.max.x)) / 2,
      y: (clamp(b.position.y, a.bounds.min.y, a.bounds.max.y) + clamp(a.position.y, b.bounds.min.y, b.bounds.max.y)) / 2,
    };
  }

  function contactPoints(a, b) {
    const center = closestPointBetween(a, b);
    const overlapX = overlap(a.bounds.min.x, a.bounds.max.x, b.bounds.min.x, b.bounds.max.x);
    const overlapY = overlap(a.bounds.min.y, a.bounds.max.y, b.bounds.min.y, b.bounds.max.y);

    if (overlapX >= overlapY && overlapX > 16) {
      const spread = clamp(overlapX * 0.32, 7, 34);
      return [
        { x: center.x - spread, y: center.y },
        { x: center.x + spread, y: center.y },
      ];
    }

    if (overlapY > 16) {
      const spread = clamp(overlapY * 0.32, 7, 34);
      return [
        { x: center.x, y: center.y - spread },
        { x: center.x, y: center.y + spread },
      ];
    }

    return [center];
  }

  function addRigidBreakableJoint(a, b, worldPoint) {
    const glass = a.material === 'glass' || b.material === 'glass';
    const weak = a.weakPoint || b.weakPoint || glass;
    const metal = a.material === 'metal' || b.material === 'metal';
    const joint = Constraint.create({
      bodyA: a,
      bodyB: b,
      pointA: Vector.sub(worldPoint, a.position),
      pointB: Vector.sub(worldPoint, b.position),
      length: 0,
      stiffness: glass ? 0.68 : weak ? 0.78 : 0.94,
      damping: glass ? 0.16 : weak ? 0.22 : 0.3,
      render: { visible: false },
    });

    joint.modernBreakable = true;
    joint.modernStrength = glass ? 23 : weak ? 31 : metal ? 66 : 48;
    joint.modernDamage = 0;
    prototype.state.joints.push(joint);
    stabilityJoints.push(joint);
    World.add(engine.world, joint);
  }

  function releaseImpactZone(body, radius) {
    const state = prototype.state;
    if (!body) return;

    const releasedBodies = new Set();
    for (const candidate of Composite.allBodies(engine.world)) {
      if (!isStructuralBody(candidate) || candidate.modernFoundation) continue;
      const distance = Vector.magnitude(Vector.sub(candidate.position, body.position));
      if (candidate !== body && distance > radius) continue;

      if (candidate.isStatic) {
        Body.setStatic(candidate, false);
        Body.setVelocity(candidate, { x: 0, y: 0 });
        Body.setAngularVelocity(candidate, 0);
      }
      candidate.structureFrozen = false;
      releasedBodies.add(candidate);
    }

    state.heldBodies = (state.heldBodies || []).filter((candidate) => !releasedBodies.has(candidate));
    state.structureHeld = state.heldBodies.length > 0;
  }

  function installStablePhysics() {
    const state = prototype.state;

    freezeStructure = function holdAndBraceStructure(bodies) {
      for (const oldJoint of state.joints || []) World.remove(engine.world, oldJoint);
      state.joints = [];
      stabilityJoints = [];
      state.structureHeld = true;
      state.heldBodies = [];

      for (const body of bodies) {
        if (!isStructuralBody(body)) continue;
        const foundation = body.material === 'concrete' && body.bounds.max.y >= floorY - 24;
        body.modernFoundation = foundation;
        body.structureFrozen = true;
        Body.setVelocity(body, { x: 0, y: 0 });
        Body.setAngularVelocity(body, 0);
        Body.setStatic(body, true);
        state.heldBodies.push(body);
      }

      const candidates = bodies.filter(joinable);
      for (let i = 0; i < candidates.length; i += 1) {
        for (let j = i + 1; j < candidates.length; j += 1) {
          const a = candidates[i];
          const b = candidates[j];
          if (boundsGap(a, b) > 14) continue;
          for (const point of contactPoints(a, b)) addRigidBreakableJoint(a, b, point);
        }
      }
    };

    activateStructure = function activateOnlyImpactZone(body, radius = 110) {
      if (!body) return;
      releaseImpactZone(body, radius);
    };

    releaseJointsFor = function releaseStableJoints(body, radius = 0) {
      if (!body) return;
      const effectiveRadius = radius || 90;
      for (let index = state.joints.length - 1; index >= 0; index -= 1) {
        const joint = state.joints[index];
        const connected = joint.bodyA === body || joint.bodyB === body;
        const nearA = Vector.magnitude(Vector.sub(joint.bodyA.position, body.position)) < effectiveRadius;
        const nearB = Vector.magnitude(Vector.sub(joint.bodyB.position, body.position)) < effectiveRadius;
        if (!connected && !nearA && !nearB) continue;
        World.remove(engine.world, joint);
        state.joints.splice(index, 1);
      }
    };
  }

  prototype.install = function installStableModernPrototype() {
    originalInstall();
    installStablePhysics();
    prototype.state.suppressIntro = true;
    loadLevel(levelIndex);
    prototype.state.suppressIntro = false;
    showMenu();
    prototype.state.introActive = false;
    canvas.style.transform = 'none';
  };

  prototype.stabilityPatchInstalled = true;
})();
