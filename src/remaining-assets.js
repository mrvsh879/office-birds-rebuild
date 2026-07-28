(() => {
  const makeAsset = (src) => {
    const asset = { image: new Image(), crop: null };
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
          if (data[(y * width + x) * 4 + 3] < 24) continue;
          left = Math.min(left, x); top = Math.min(top, y);
          right = Math.max(right, x); bottom = Math.max(bottom, y);
        }
        if (right >= left && bottom >= top) {
          const pad = 5;
          left = Math.max(0, left - pad); top = Math.max(0, top - pad);
          right = Math.min(width - 1, right + pad); bottom = Math.min(height - 1, bottom + pad);
          asset.crop = [left, top, right - left + 1, bottom - top + 1];
        }
      } catch (_) {
        asset.crop = [0, 0, asset.image.naturalWidth, asset.image.naturalHeight];
      }
    };
    asset.image.addEventListener('load', trim, { once: true });
    trim();
    return asset;
  };

  const loadedSlingshot = makeAsset('./assets/props/slingshots/slingshot-loaded.png');
  const brokenGlass = makeAsset('./assets/materials/glass/glass-panel-broken.png');
  const ready = (asset) => asset.image.complete && asset.image.naturalWidth > 0;
  const crop = (asset) => asset.crop || [0, 0, asset.image.naturalWidth, asset.image.naturalHeight];

  function drawContained(ctx, asset, x, y, width, height) {
    if (!ready(asset)) return false;
    const [sx, sy, sw, sh] = crop(asset);
    const scale = Math.min(width / sw, height / sh);
    const dw = sw * scale, dh = sh * scale;
    ctx.drawImage(asset.image, sx, sy, sw, sh, x + (width - dw) / 2, y + (height - dh) / 2, dw, dh);
    return true;
  }

  function installUiSkin() {
    const style = document.createElement('style');
    style.id = 'office-birds-png-ui-skin';
    style.textContent = `
      .hud-card {
        background-image:
          linear-gradient(145deg,rgba(3,24,50,.9),rgba(5,43,79,.86)),
          url('./assets/ui/panels/ui-hud-panel.png');
        background-size:100% 100%,100% 100%;
        background-position:center;
        background-repeat:no-repeat;
      }
      button {
        background-image:
          linear-gradient(180deg,rgba(18,61,104,.78),rgba(8,41,77,.82)),
          url('./assets/ui/buttons/ui-action-button.png');
        background-size:100% 100%,100% 100%;
        background-position:center;
        background-repeat:no-repeat;
      }
      button:hover:not(:disabled) {
        background-image:
          linear-gradient(180deg,rgba(25,77,126,.7),rgba(11,51,93,.76)),
          url('./assets/ui/buttons/ui-action-button.png');
      }
    `;
    document.head.appendChild(style);
  }

  const glassEffects = [];
  function updateGlassEffects() {
    for (const effect of glassEffects) effect.life -= 1;
    for (let index = glassEffects.length - 1; index >= 0; index -= 1) {
      if (glassEffects[index].life <= 0) glassEffects.splice(index, 1);
    }
  }

  function drawGlassEffects(ctx) {
    if (!ready(brokenGlass)) return;
    for (const effect of glassEffects) {
      ctx.save();
      ctx.translate(effect.x, effect.y);
      ctx.rotate(effect.angle);
      ctx.globalAlpha = Math.min(1, effect.life / 4);
      drawContained(ctx, brokenGlass, -effect.width / 2, -effect.height / 2, effect.width, effect.height);
      ctx.restore();
    }
  }

  const api = {
    installed: false,
    assets: { loadedSlingshot, brokenGlass },
    install() {
      if (this.installed) return;
      installUiSkin();

      const previousDrawSlingshot = drawSlingshot;
      const previousDrawHero = drawHero;
      const previousBreakGlass = breakGlass;
      const previousUpdateEffects = updateEffects;
      const previousDrawEffects = drawEffects;
      let loadedCompositionVisible = false;

      drawSlingshot = function drawLoadedSlingshot(ctx) {
        loadedCompositionVisible = false;
        if (!anchor || !ball || detached || !ready(loadedSlingshot)) {
          previousDrawSlingshot(ctx);
          return;
        }
        const stretch = Vector.magnitude(Vector.sub(ball.position, anchor));
        const activelyAiming = mouseConstraint?.body === ball && stretch > 30;
        if (activelyAiming) {
          previousDrawSlingshot(ctx);
          return;
        }

        loadedCompositionVisible = true;
        ctx.save();
        ctx.shadowColor = 'rgba(27,17,9,.34)';
        ctx.shadowBlur = 14;
        ctx.shadowOffsetY = 8;
        drawContained(ctx, loadedSlingshot, anchor.x - 145, floorY - 292, 290, 300);
        ctx.restore();
      };

      drawHero = function drawHeroWithoutDuplicate(ctx) {
        if (loadedCompositionVisible) return;
        previousDrawHero(ctx);
      };

      breakGlass = function breakGlassWithTransition(body, contact) {
        if (body && !body.broken && ready(brokenGlass)) {
          glassEffects.push({
            x: body.position.x,
            y: body.position.y,
            angle: body.angle || 0,
            width: body.glassWidth * 1.08,
            height: body.glassHeight * 1.1,
            life: 10,
          });
        }
        return previousBreakGlass(body, contact);
      };

      updateEffects = function updateAllEffects() {
        previousUpdateEffects();
        updateGlassEffects();
      };

      drawEffects = function drawAllEffects(ctx) {
        previousDrawEffects(ctx);
        drawGlassEffects(ctx);
      };

      this.installed = true;
    },
  };

  window.officeBirdsRemainingAssets = api;
})();
