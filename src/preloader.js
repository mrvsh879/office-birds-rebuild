(() => {
  const collectImages = () => {
    const images = new Set();
    const visited = new Set();
    const add = (value) => {
      if (!value) return;
      if (value instanceof HTMLImageElement) {
        images.add(value);
        return;
      }
      if (typeof value !== 'object' || visited.has(value)) return;
      visited.add(value);
      if (Array.isArray(value)) value.forEach(add);
      else Object.values(value).forEach(add);
    };
    add(window.officeBirdsArt);
    add(window.officeBirdsWorldAssets?.assets);
    add(window.officeBirdsRemainingAssets?.assets);
    return [...images];
  };

  const waitForImage = (image) => {
    if (image.complete) return Promise.resolve(image.naturalWidth > 0);
    return new Promise((resolve) => {
      let settled = false;
      const finish = (ok) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        image.removeEventListener('load', onLoad);
        image.removeEventListener('error', onError);
        resolve(ok);
      };
      const onLoad = () => finish(true);
      const onError = () => finish(false);
      image.addEventListener('load', onLoad, { once: true });
      image.addEventListener('error', onError, { once: true });
      const timeoutId = setTimeout(() => finish(image.complete && image.naturalWidth > 0), 15000);
      if (image.complete) queueMicrotask(() => finish(image.naturalWidth > 0));
    });
  };

  async function waitForAssets() {
    const screen = document.getElementById('loadingScreen');
    const progress = document.getElementById('loadingProgress');
    const label = document.getElementById('loadingLabel');
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const images = collectImages();
    let loaded = 0;
    let failed = 0;
    const update = () => {
      const percent = images.length ? Math.round((loaded / images.length) * 100) : 100;
      if (progress) progress.style.width = `${percent}%`;
      if (label) label.textContent = `Загрузка графики ${loaded}/${images.length}`;
    };
    update();
    await Promise.all(images.map(async (image) => {
      const ok = await waitForImage(image);
      if (!ok) failed += 1;
      loaded += 1;
      update();
    }));
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-ready');
    document.body.dataset.assetLoadFailures = String(failed);
    if (screen) {
      screen.classList.add('is-hidden');
      setTimeout(() => screen.remove(), 320);
    }
  }

  window.officeBirdsPreloader = { waitForAssets, collectImages };
})();
