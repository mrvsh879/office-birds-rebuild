(() => {
  const createImage = (src) => {
    const image = new Image();
    image.decoding = 'async';
    image.src = src;
    return image;
  };

  const background = createImage('./assets/backgrounds/office-room-v2.svg');

  const spriteDefinitions = [
    { key: 'heroIdle', src: './assets/characters/heroes/hero-idle.png', crop: [474, 132, 586, 739] },
    { key: 'heroTension', src: './assets/props/slingshots/slingshot-loaded.png', crop: [439, 137, 756, 754] },
    { key: 'heroFlying', src: './assets/characters/heroes/hero-flying.png', crop: [360, 239, 813, 402] },
    { key: 'heroStunned', src: './assets/characters/heroes/hero-stunned.png', crop: [541, 169, 539, 595] },
    { key: 'bossIdle', src: './assets/characters/managers/manager-alert.png', crop: [491, 158, 565, 627] },
    { key: 'bossSmug', src: './assets/characters/managers/manager-smug.png', crop: [539, 169, 459, 600] },
    { key: 'bossPanic', src: './assets/characters/managers/manager-panic.png', crop: [528, 160, 503, 634] },
    { key: 'bossDefeated', src: './assets/characters/managers/manager-defeated.png', crop: [386, 312, 903, 409] },
  ];

  const spriteImages = spriteDefinitions.map((definition) => ({
    ...definition,
    image: createImage(definition.src),
  }));
  const slingshotEmpty = createImage('./assets/props/slingshots/slingshot-empty.png');
  const slingshotLoaded = spriteImages[1].image;
  const heroAiming = createImage('./assets/characters/heroes/hero-aiming-in-slingshot.png');

  let fallbackAtlas = null;
  let pngAtlas = null;

  Object.defineProperty(window, 'officeBirdAtlas', {
    configurable: true,
    get: () => pngAtlas || fallbackAtlas,
    set: (value) => {
      fallbackAtlas = value;
    },
  });

  const artState = {
    background,
    spriteImages,
    slingshotEmpty,
    slingshotLoaded,
    heroAiming,
    pngAtlasReady: false,
  };
  window.officeBirdsArt = artState;

  const imageReady = (image) => image.complete && image.naturalWidth > 0;

  function drawContained(ctx, image, crop, x, y, width, height, padding = 10) {
    const [sx, sy, sw, sh] = crop;
    const availableWidth = Math.max(1, width - padding * 2);
    const availableHeight = Math.max(1, height - padding * 2);
    const scale = Math.min(availableWidth / sw, availableHeight / sh);
    const drawWidth = sw * scale;
    const drawHeight = sh * scale;
    const dx = x + (width - drawWidth) / 2;
    const dy = y + (height - drawHeight) / 2;
    ctx.drawImage(image, sx, sy, sw, sh, dx, dy, drawWidth, drawHeight);
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

  function drawOfficeBackground(render, callback) {
    const ctx = render.context;
    const pixelRatio = render.options?.pixelRatio || 1;
    const width = render.canvas.width / pixelRatio;
    const height = render.canvas.height / pixelRatio;

    if (!imageReady(background)) {
      callback();
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

    if (imageReady(slingshotEmpty)) {
      const floorY = height - 110;
      const anchorX = Math.max(320, width * 0.21);
      drawContained(
        ctx,
        slingshotEmpty,
        [546, 245, 444, 515],
        anchorX - 116,
        floorY - 242,
        232,
        268,
        0,
      );
    }

    ctx.restore();
  }

  const originalOn = Matter.Events.on;
  Matter.Events.on = function patchedOn(object, eventNames, callback) {
    if (eventNames === 'beforeRender' && object?.canvas && object?.context) {
      return originalOn.call(this, object, eventNames, () => drawOfficeBackground(object, callback));
    }

    return originalOn.call(this, object, eventNames, callback);
  };
})();
