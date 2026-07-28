(() => {
  const createImage = (src) => {
    const image = new Image();
    image.decoding = 'async';
    image.src = src;
    return image;
  };

  const background = createImage('./assets/backgrounds/office-room-v2.svg');

  const spriteDefinitions = [
    { key: 'heroIdle', src: './assets/characters/heroes/hero-idle.png', crop: [474, 132, 586, 736] },
    // The tension cell deliberately stays bird-only. The complete loaded
    // slingshot is rendered as one asset by installGameplayOverrides().
    { key: 'heroTension', src: './assets/characters/heroes/hero-idle.png', crop: [474, 132, 586, 736] },
    { key: 'heroFlying', src: './assets/characters/heroes/hero-flying.png', crop: [363, 239, 810, 402] },
    { key: 'heroStunned', src: './assets/characters/heroes/hero-stunned.png', crop: [541, 170, 538, 587] },
    { key: 'bossIdle', src: './assets/characters/managers/manager-alert.png', crop: [491, 158, 565, 627] },
    { key: 'bossSmug', src: './assets/characters/managers/manager-smug.png', crop: [540, 169, 458, 594] },
    { key: 'bossPanic', src: './assets/characters/managers/manager-panic.png', crop: [528, 161, 503, 632] },
    { key: 'bossDefeated', src: './assets/characters/managers/manager-defeated.png', crop: [406, 315, 878, 406] },
  ];

  const spriteImages = spriteDefinitions.map((definition) => ({
    ...definition,
    image: createImage(definition.src),
  }));

  const slingshotEmpty = createImage('./assets/props/slingshots/slingshot-empty.png');
  const heroAiming = createImage('./assets/characters/heroes/hero-aiming-in-slingshot.png');

  const CROPS = Object.freeze({
    slingshotEmpty: [546, 246, 443, 513],
    heroAiming: [344, 121, 701, 770],
  });

  let fallbackAtlas = null;
  let pngAtlas = null;

  Object.defineProperty(window, 'officeBirdAtlas', {
    configurable: true,
    get: () => pngAtlas || fallbackAtlas,
    set: (value) => {
      fallbackAtlas = value;
    },
  });

  const imageReady = (image) => image?.complete && image.naturalWidth > 0;

  function drawContained(ctx, image, crop, x, y, width, height, padding = 10) {
    if (!imageReady(image)) return false;

    const [sx, sy, sw, sh] = crop;
    const availableWidth = Math.max(1, width - padding * 2);
    const availableHeight = Math.max(1, height - padding * 2);
    const scale = Math.min(availableWidth / sw, availableHeight / sh);
    const drawWidth = sw * scale;
    const drawHeight = sh * scale;
    const dx = x + (width - drawWidth) / 2;
    const dy = y + (height - drawHeight) / 2;

    ctx.drawImage(image, sx, sy, sw, sh, dx, dy, drawWidth, drawHeight);
    return true;
  }

  function drawCentered(ctx, image, crop, centerX, centerY, width, height) {
    return drawContained(
      ctx,
      image,
      crop,
      centerX - width / 2,
      centerY - height / 2,
      width,
      height,
      0,
    );
  }

  function buildPngAtlas() {
    if (!spriteImages.every(({ image }) => imageReady(image))) return;

    const cellWidth = 256;
    const cellHeight = 256;
    const atlasCanvas = document.createElement('canvas');
    atlasCanvas.width = cellWidth * 4;
    atlasCanvas.height = cellHeight * 2;
    const atlasContext = atlasCanvas.getContext('2d');

    spriteImages.forEach(({ image, crop }, index) => {
      const column = index % 4;
      const row = Math.floor(index / 4);
      drawContained(
        atlasContext,
        image,
        crop,
        column * cellWidth,
        row * cellHeight,
        cellWidth,
        cellHeight,
        8,
      );
    });

    const atlasImage = new Image();
    atlasImage.onload = () => {
      pngAtlas = atlasImage;
      artState.pngAtlasReady = true;
    };
    atlasImage.src = atlasCanvas.toDataURL('image/png');
  }

  spriteImages.forEach(({ image }) => {
    image.addEventListener('load', buildPngAtlas, { once: true });
  });
  buildPngAtlas();

  function drawOfficeBackground(render, fallbackDraw) {
    const ctx = render.context;
    const pixelRatio = render.options?.pixelRatio || 1;
    const width = render.canvas.width / pixelRatio;
    const height = render.canvas.height / pixelRatio;

    if (!imageReady(background)) {
      fallbackDraw();
      return;
    }

    ctx.save();
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.clearRect(0, 0, width, height);

    const imageRatio = background.naturalWidth / background.naturalHeight;
    const viewportRatio = width / height;
    let sourceX = 0;
    let sourceY = 0;
    let sourceWidth = background.naturalWidth;
    let sourceHeight = background.naturalHeight;

    if (viewportRatio > imageRatio) {
      sourceHeight = background.naturalWidth / viewportRatio;
      sourceY = (background.naturalHeight - sourceHeight) / 2;
    } else {
      sourceWidth = background.naturalHeight * viewportRatio;
      sourceX = (background.naturalWidth - sourceWidth) / 2;
    }

    ctx.drawImage(
      background,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      width,
      height,
    );
    ctx.restore();
  }

  const artState = {
    background,
    spriteImages,
    slingshotEmpty,
    heroAiming,
    crops: CROPS,
    pngAtlasReady: false,
    overridesInstalled: false,
    drawContained,
    drawCentered,
    installGameplayOverrides() {
      if (this.overridesInstalled) return;

      const fallbackDrawSlingshot = drawSlingshot;
      const fallbackDrawHero = drawHero;

      drawSlingshot = function drawPngSlingshot(ctx) {
        if (!anchor) return;

        const stretch = ball && !detached
          ? Vector.magnitude(Vector.sub(ball.position, anchor))
          : 0;
        const isAiming = Boolean(
          ball
          && !detached
          && mouseConstraint?.body === ball
          && stretch > 30,
        );

        const image = isAiming ? heroAiming : slingshotEmpty;

        if (!imageReady(image)) {
          fallbackDrawSlingshot(ctx);
          return;
        }

        ctx.save();
        ctx.shadowColor = 'rgba(27, 17, 9, .34)';
        ctx.shadowBlur = 14;
        ctx.shadowOffsetY = 8;

        if (isAiming) {
          // This PNG already contains both the bird and the slingshot.
          // It replaces the empty slingshot instead of overlaying it.
          const pull = Vector.sub(ball.position, anchor);
          const centerX = anchor.x + Math.max(-36, Math.min(18, pull.x * 0.08));
          const centerY = floorY - 145 + Math.max(-12, Math.min(12, pull.y * 0.04));
          drawCentered(ctx, heroAiming, CROPS.heroAiming, centerX, centerY, 326, 326);
        } else {
          drawCentered(
            ctx,
            slingshotEmpty,
            CROPS.slingshotEmpty,
            anchor.x,
            floorY - 126,
            238,
            276,
          );
        }

        ctx.restore();
      };

      drawHero = function drawPngHero(ctx) {
        if (!ball) return;

        const stretch = !detached
          ? Vector.magnitude(Vector.sub(ball.position, anchor))
          : 0;
        const isAiming = Boolean(
          !detached
          && mouseConstraint?.body === ball
          && stretch > 30,
        );

        // The aiming asset is a complete bird + slingshot composition and is
        // already drawn by drawSlingshot(), so do not draw a second bird here.
        if (isAiming && imageReady(heroAiming)) return;

        fallbackDrawHero(ctx);
      };

      this.overridesInstalled = true;
    },
  };

  window.officeBirdsArt = artState;

  const originalOn = Matter.Events.on;
  Matter.Events.on = function patchedOn(object, eventNames, callback) {
    if (eventNames === 'beforeRender' && object?.canvas && object?.context) {
      return originalOn.call(this, object, eventNames, () => drawOfficeBackground(object, callback));
    }

    return originalOn.call(this, object, eventNames, callback);
  };
})();
