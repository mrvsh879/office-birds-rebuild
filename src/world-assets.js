(() => {
  const img = (src, threshold = 64) => {
    const asset = { src, image: new Image(), crop: null, threshold };
    asset.image.decoding = 'async';
    asset.image.src = src;
    const trim = () => {
      if (!asset.image.complete || !asset.image.naturalWidth || asset.crop) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = asset.image.naturalWidth;
        canvas.height = asset.image.naturalHeight;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(asset.image, 0, 0);
        const { data, width, height } = context.getImageData(0, 0, canvas.width, canvas.height);
        let left = width, top = height, right = -1, bottom = -1;
        for (let y = 0; y < height; y += 2) for (let x = 0; x < width; x += 2) {
          if (data[(y * width + x) * 4 + 3] <= threshold) continue;
          left = Math.min(left, x); top = Math.min(top, y);
          right = Math.max(right, x); bottom = Math.max(bottom, y);
        }
        if (right >= left && bottom >= top) {
          const pad = Math.max(4, Math.round(Math.min(width, height) * .008));
          asset.crop = [
            Math.max(0, left - pad), Math.max(0, top - pad),
            Math.min(width - 1, right + pad) - Math.max(0, left - pad) + 1,
            Math.min(height - 1, bottom + pad) - Math.max(0, top - pad) + 1,
          ];
        }
      } catch (_) {
        asset.crop = [0, 0, asset.image.naturalWidth, asset.image.naturalHeight];
      }
    };
    asset.image.addEventListener('load', trim, { once: true });
    trim();
    return asset;
  };

  const A = {
    woodBeam: img('./assets/materials/wood/wood-beam.png'),
    woodBeamCracked: img('./assets/materials/wood/wood-beam-cracked.png'),
    woodBeamCrackedAlt: img('./assets/materials/wood/wood-beam-cracked-alt.png'),
    woodBeamLeft: img('./assets/materials/wood/wood-beam-broken-left.png'),
    woodBeamRight: img('./assets/materials/wood/wood-beam-broken-right.png'),
    woodPillar: img('./assets/materials/wood/wood-pillar.png'),
    woodPillarCracked: img('./assets/materials/wood/wood-pillar-cracked.png'),
    glass: img('./assets/materials/glass/glass-panel-intact.png'),
    glassCracked: img('./assets/materials/glass/glass-panel-cracked.png'),
    shardSmall: img('./assets/materials/glass/glass-shard-small.png'),
    shardMedium: img('./assets/materials/glass/glass-shard-medium.png'),
    shardLarge: img('./assets/materials/glass/glass-shard-large.png'),
    metal: img('./assets/materials/metal/metal-beam.png'),
    metalBent: img('./assets/materials/metal/metal-beam-bent.png'),
    concrete: img('./assets/materials/concrete/concrete-block.png'),
    concreteCracked: img('./assets/materials/concrete/concrete-block-cracked.png'),
    concreteSmall: img('./assets/materials/concrete/concrete-chunk-small.png'),
    concreteMedium: img('./assets/materials/concrete/concrete-chunk-medium.png'),
    concreteLarge: img('./assets/materials/concrete/concrete-chunk-large.png'),
    cabinet: img('./assets/props/office/filing-cabinet.png'),
    monitor: img('./assets/props/office/office-monitor.png'),
    printer: img('./assets/props/office/office-printer.png'),
    woodSplinters: img('./assets/effects/wood-splinters.png', 36),
    concreteDust: img('./assets/effects/concrete-dust.png', 28),
    metalSparks: img('./assets/effects/metal-sparks.png', 24),
  };

  const ready = (a) => a?.image.complete && a.image.naturalWidth > 0;
  const crop = (a) => a.crop || [0, 0, a.image.naturalWidth, a.image.naturalHeight];

  function draw(ctx, asset, body, width, height, preserve = false, filter = '') {
    if (!ready(asset)) return false;
    const [sx, sy, sw, sh] = crop(asset);
    ctx.save();
    ctx.translate(body.position.x, body.position.y);
    ctx.rotate(body.angle || 0);
    if (filter) ctx.filter = filter;
    ctx.shadowColor = 'rgba(25,16,9,.24)';
    ctx.shadowBlur = 7;
    ctx.shadowOffsetY = 4;
    if (preserve) {
      const scale = Math.min(width / sw, height / sh);
      const dw = sw * scale, dh = sh * scale;
      ctx.drawImage(asset.image, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
    } else {
      ctx.drawImage(asset.image, sx, sy, sw, sh, -width / 2, -height / 2, width, height);
    }
    ctx.restore();
    return true;
  }

  function size(body) {
    return {
      w: body.woodWidth || body.glassWidth || body.metalWidth || body.concreteWidth || Math.max(1, body.bounds.max.x - body.bounds.min.x),
      h: body.woodHeight || body.glassHeight || body.metalHeight || body.concreteHeight || Math.max(1, body.bounds.max.y - body.bounds.min.y),
    };
  }

  const hide = (body) => { if (body?.render) body.render.visible = false; };
  const supported = (body) => ['structure', 'glass', 'glassShard', 'metal', 'concrete', 'concreteChunk', 'officeProp', 'debris'].includes(body?.gameType);
  const hideAll = () => Composite.allBodies(engine.world).forEach((body) => { if (supported(body)) hide(body); });
  const effects = [];
  const effect = (asset, x, y, s, life, angle = 0) => { if (ready(asset)) effects.push({ asset, x, y, s, life, max: life, angle }); };

  function updateAssetEffects() {
    effects.forEach((e) => { e.life -= 1; e.s *= 1.012; });
    for (let i = effects.length - 1; i >= 0; i -= 1) if (effects[i].life <= 0) effects.splice(i, 1);
  }

  function drawAssetEffects(ctx) {
    for (const e of effects) {
      if (!ready(e.asset)) continue;
      const [sx, sy, sw, sh] = crop(e.asset);
      const scale = Math.min(e.s / sw, e.s / sh);
      const dw = sw * scale, dh = sh * scale;
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.angle);
      ctx.globalAlpha = Math.min(1, e.life / Math.max(1, e.max * .42));
      ctx.drawImage(e.asset.image, sx, sy, sw, sh, -dw / 2, -dh / 2, dw, dh);
      ctx.restore();
    }
  }

  function drawWorld(ctx, fallback) {
    if (![A.woodBeam, A.woodPillar, A.glass, A.metal, A.concrete].every(ready)) return fallback(ctx);
    hideAll();
    const bodies = Composite.allBodies(engine.world);
    ctx.save();
    ctx.fillStyle = 'rgba(39,25,12,.14)';
    for (const b of bodies) if (['structure', 'glass', 'metal', 'concrete', 'officeProp'].includes(b.gameType)) {
      const { w } = size(b);
      ctx.beginPath(); ctx.ellipse(b.position.x, floorY - 6, Math.max(18, w * .4), 7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();

    for (const b of bodies) {
      if (b.gameType === 'structure') {
        const beam = b.woodKind === 'beam';
        const asset = beam
          ? (b.damageState > 1 ? A.woodBeamCrackedAlt : b.damageState ? A.woodBeamCracked : A.woodBeam)
          : (b.damageState ? A.woodPillarCracked : A.woodPillar);
        draw(ctx, asset, b, beam ? b.woodWidth * 1.04 : Math.max(50, b.woodWidth * 1.55), beam ? Math.max(50, b.woodHeight * 1.85) : b.woodHeight * 1.04, false, b.weakPoint ? 'saturate(1.3) brightness(1.08)' : '');
      } else if (b.gameType === 'glass') {
        draw(ctx, b.damageState ? A.glassCracked : A.glass, b, b.glassWidth * 1.03, b.glassHeight * 1.08);
      } else if (b.gameType === 'glassShard') {
        const d = Math.max(size(b).w, size(b).h, b.visualSize || 0);
        draw(ctx, d > 34 ? A.shardLarge : d > 23 ? A.shardMedium : A.shardSmall, b, Math.max(22, d * 1.9), Math.max(22, d * 1.9), true);
      } else if (b.gameType === 'metal') {
        draw(ctx, b.damageState ? A.metalBent : A.metal, b, b.metalWidth * 1.05, Math.max(50, b.metalHeight * 1.9));
      } else if (b.gameType === 'concrete') {
        draw(ctx, b.damageState ? A.concreteCracked : A.concrete, b, b.concreteWidth * 1.13, b.concreteHeight * 1.15);
      } else if (b.gameType === 'concreteChunk') {
        const { w, h } = size(b), d = Math.max(w, h);
        draw(ctx, d > 52 ? A.concreteLarge : d > 32 ? A.concreteMedium : A.concreteSmall, b, w * 1.3, h * 1.3, true);
      } else if (b.gameType === 'debris' && b.material === 'wood') {
        const { w, h } = size(b);
        if (b.woodKind === 'pillar') draw(ctx, A.woodPillarCracked, b, Math.max(46, w * 1.5), h * 1.04);
        else draw(ctx, b.fragmentSide === 'left' ? A.woodBeamLeft : A.woodBeamRight, b, w * 1.08, Math.max(46, h * 1.9));
      }
    }
  }

  function drawProps(ctx, fallback) {
    if (![A.cabinet, A.monitor, A.printer].every(ready)) return fallback(ctx);
    for (const b of Composite.allBodies(engine.world)) {
      if (b.gameType !== 'officeProp') continue;
      hide(b);
      const s = b.propScale || 1;
      if (b.propKind === 'cabinet') draw(ctx, A.cabinet, b, 104 * s, 174 * s);
      else if (b.propKind === 'printer') draw(ctx, A.printer, b, 108 * s, 82 * s);
      else draw(ctx, A.monitor, b, 98 * s, 78 * s);
    }
  }

  const api = {
    assets: A,
    installed: false,
    install() {
      if (this.installed) return;
      const oldWorld = drawWorldArt, oldProps = drawOfficePropsArt;
      const oldWoodDamage = drawWoodDamage, oldGlassDamage = drawGlassDamage, oldMetalDamage = drawMetalDamage, oldConcreteDamage = drawConcreteDamage;
      const oldUpdateEffects = updateEffects, oldDrawEffects = drawEffects;
      const oldWeakPillar = makeWeakPillar, oldWoodFragment = makeWoodFragment, oldGlassShard = makeGlassShard, oldConcreteChunk = makeConcreteChunk;
      const oldBreakWood = breakWood, oldBreakConcrete = breakConcrete, oldDamageMetal = damageMetal, oldLoadLevel = loadLevel;

      makeWeakPillar = (...args) => { const b = oldWeakPillar(...args); hide(b); return b; };
      makeWoodFragment = (source, x, y, w, h) => {
        const b = oldWoodFragment(source, x, y, w, h); hide(b);
        b.woodWidth = w; b.woodHeight = h; b.woodKind = source.woodKind; return b;
      };
      makeGlassShard = (source, x, y, s, angle) => {
        const b = oldGlassShard(source, x, y, s, angle); hide(b); b.visualSize = s * 2.5; return b;
      };
      makeConcreteChunk = (source, x, y, w, h) => {
        const b = oldConcreteChunk(source, x, y, w, h); hide(b); b.concreteWidth = w; b.concreteHeight = h; return b;
      };
      breakWood = (body, contact) => {
        if (body && !body.broken) { const p = contact || body.position; effect(A.woodSplinters, p.x, p.y, 126, 27, body.angle || 0); }
        const known = new Set(Composite.allBodies(engine.world).map((b) => b.id));
        const result = oldBreakWood(body, contact);
        Composite.allBodies(engine.world).filter((b) => !known.has(b.id) && b.gameType === 'debris' && b.material === 'wood').forEach((b, i) => {
          hide(b); b.fragmentSide = i ? 'right' : 'left'; b.woodKind ||= body?.woodKind || 'beam';
          b.woodWidth ||= Math.max(1, b.bounds.max.x - b.bounds.min.x); b.woodHeight ||= Math.max(1, b.bounds.max.y - b.bounds.min.y);
        });
        return result;
      };
      breakConcrete = (body, contact) => {
        if (body && !body.broken) { const p = contact || body.position; effect(A.concreteDust, p.x, p.y, 170, 31); }
        const result = oldBreakConcrete(body, contact);
        Composite.allBodies(engine.world).forEach((b) => { if (b.gameType === 'concreteChunk') hide(b); });
        return result;
      };
      damageMetal = (body, power, contact) => {
        if (body && power > 4.2) { const p = contact || body.position; effect(A.metalSparks, p.x, p.y, Math.min(138, 76 + power * 4), 17, Math.random() * Math.PI); }
        return oldDamageMetal(body, power, contact);
      };
      loadLevel = (...args) => { effects.length = 0; const result = oldLoadLevel(...args); hideAll(); return result; };

      drawWorldArt = (ctx) => drawWorld(ctx, oldWorld);
      drawOfficePropsArt = (ctx) => drawProps(ctx, oldProps);
      drawWoodDamage = (ctx) => { if (!ready(A.woodBeamCracked) || !ready(A.woodPillarCracked)) oldWoodDamage(ctx); };
      drawGlassDamage = (ctx) => { if (!ready(A.glassCracked)) oldGlassDamage(ctx); };
      drawMetalDamage = (ctx) => { if (!ready(A.metalBent)) oldMetalDamage(ctx); };
      drawConcreteDamage = (ctx) => { if (!ready(A.concreteCracked)) oldConcreteDamage(ctx); };
      updateEffects = () => { oldUpdateEffects(); updateAssetEffects(); };
      drawEffects = (ctx) => { oldDrawEffects(ctx); drawAssetEffects(ctx); };

      hideAll();
      this.installed = true;
    },
  };

  window.officeBirdsWorldAssets = api;
})();
