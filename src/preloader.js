(() => {
  const collectImages = () => {
    const images = new Set();
    const add = (value) => {
      if (!value) return;
      if (value instanceof HTMLImageElement) images.add(value);
      else if (Array.isArray(value)) value.forEach(add);
      else if (typeof value === 'object') Object.values(value).forEach(add);
    };
    add(window.officeBirdsArt);
    add(window.officeBirdsWorldAssets?.assets);
    add(window.officeBirdsRemainingAssets?.assets);
    return [...images];
  };

  const waitForImage = (image) => {
    if (image.complete && image.naturalWidth > 0) return Promise.resolve(true);
    return new Promise((resolve) => {
      const done = (ok) => resolve(ok);
      image.addEventListener('load', () => done(true), { once: true });
      image.addEventListener('error', () => done(false), { once: true });
    });
  };

  async function waitForAssets() {
    const screen = document.getElementById('loadingScreen');
    const progress = document.getElementById('loadingProgress');
    const label = document.getElementById('loadingLabel');
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const images = collectImages();
    let loaded = 0;
    const update = () => {
      const percent = images.length ? Math.round((loaded / images.length) * 100) : 100;
      if (progress) progress.style.width = `${percent}%`;
      if (label) label.textContent = `Загрузка графики ${loaded}/${images.length}`;
    };
    update();
    await Promise.all(images.map(async (image) => {
      await waitForImage(image);
      loaded += 1;
      update();
    }));
    document.body.classList.remove('is-loading');
    document.body.classList.add('is-ready');
    if (screen) {
      screen.classList.add('is-hidden');
      setTimeout(() => screen.remove(), 320);
    }
  }

  window.officeBirdsPreloader = { waitForAssets, collectImages };
})();
