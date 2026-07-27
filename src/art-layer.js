(() => {
  const background = new Image();
  background.src = './assets/backgrounds/office-room-v2.svg';
  window.officeBirdsArt = { background };

  const originalOn = Matter.Events.on;
  Matter.Events.on = function patchedOn(object, eventNames, callback) {
    if (eventNames === 'beforeRender' && object?.canvas && object?.context) {
      return originalOn.call(this, object, eventNames, () => {
        const ctx = object.context;
        const pixelRatio = object.options?.pixelRatio || 1;
        const width = object.canvas.width / pixelRatio;
        const height = object.canvas.height / pixelRatio;

        if (!background.complete || !background.naturalWidth) {
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
        ctx.restore();
      });
    }

    return originalOn.call(this, object, eventNames, callback);
  };
})();
