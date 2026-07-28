(() => {
  const makeAsset = (src) => {
    const image = new Image();
    image.decoding = 'async';
    image.src = src;
    return { src, image };
  };

  const loadedSlingshot = makeAsset('./assets/props/slingshots/slingshot-loaded.png');
  const brokenGlass = makeAsset('./assets/materials/glass/glass-panel-broken.png');
  const ready = (asset) => asset?.image.complete && asset.image.naturalWidth > 0;

  function drawContained(ctx, asset, x, y, width, height) {
    if (!ready(asset)) return false;
    const sw = asset.image.naturalWidth;
    const sh = asset.image.naturalHeight;
    const scale = Math.min(width / sw, height / sh);
    const dw = sw * scale;
    const dh = sh * scale;
    ctx.drawImage(asset.image, 0, 0, sw, sh, x + (width - dw) / 2, y + (height - dh) / 2, dw, dh);
    return true;
  }

  function installUiSkin() {
    document.getElementById('office-birds-png-ui-skin')?.remove();
    const style = document.createElement('style');
    style.id = 'office-birds-png-ui-skin';
    style.textContent = `
      .hud-main {
        width:min(520px,calc(100vw - 28px)) !important;
        min-height:0 !important;
        padding:2px 6px 5px !important;
        background:#071d36 !important;
        background-image:none !important;
        border-style:solid !important;
        border-width:32px 42px 30px !important;
        border-image-source:url('./assets/ui/panels/ui-hud-panel.png') !important;
        border-image-slice:82 120 76 120 fill !important;
        border-image-width:32px 42px 30px !important;
        border-image-repeat:stretch !important;
        border-radius:18px !important;
        box-shadow:0 18px 42px rgba(2,15,30,.3) !important;
        overflow:hidden !important;
      }
      .hud-main .eyebrow {
        font-size:10px !important;
        line-height:1 !important;
        margin:0 0 2px !important;
      }
      .hud-main h1 {
        font-size:22px !important;
        line-height:1.05 !important;
        margin:2px 0 3px !important;
      }
      .hud-main .hud-stars {
        font-size:19px !important;
        line-height:1 !important;
        margin:2px 0 5px !important;
      }
      .hud-main p {
        font-size:12px !important;
        line-height:1.25 !important;
        margin:0 !important;
      }
      .hud-main .shot-rack {
        min-height:18px !important;
        margin-top:6px !important;
        gap:6px !important;
      }
      .hud-main .shot-dot {
        width:18px !important;
        height:18px !important;
      }
      .hud-main .stats {
        gap:4px 14px !important;
        margin-top:7px !important;
        padding-top:7px !important;
        font-size:12px !important;
        line-height:1.15 !important;
      }
      .controls {
        background:transparent !important;
        background-image:none !important;
        border:0 !important;
        box-shadow:none !important;
        padding:0 !important;
      }
      button {
        display:inline-grid !important;
        place-items:center !important;
        min-height:48px !important;
        padding:1px 22px 0 !important;
        line-height:1 !important;
        background-color:transparent !important;
        background-image:url('./assets/ui/buttons/ui-action-button.png') !important;
        background-size:100% 100% !important;
        background-position:center !important;
        background-repeat:no-repeat !important;
        border:0 !important;
        box-shadow:none !important;
      }
      button:hover:not(:disabled) {
        background-image:url('./assets/ui/buttons/ui-action-button.png') !important;
        filter:brightness(1.12);
      }
      button:active:not(:disabled) {
        background-image:url('./assets/ui/buttons/ui-action-button.png') !important;
        filter:brightness(.92);
        transform:translateY(2px);
      }
      @media(max-width:760px) {
        .hud-main {
          width:calc(100vw - 16px) !important;
          border-width:24px 28px 22px !important;
          border-image-width:24px 28px 22px !important;
          padding:0 3px 3px !important;
        }
        .hud-main h1 { font-size:18px !important; }
        .hud-main .stats { font-size:11px !important; }
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
