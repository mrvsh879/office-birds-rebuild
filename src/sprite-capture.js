(() => {
  const NativeImage = window.Image;

  function CapturedImage(width, height) {
    const image = new NativeImage(width, height);
    const descriptor = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'src');

    if (descriptor?.set) {
      Object.defineProperty(image, 'src', {
        configurable: true,
        get() {
          return descriptor.get ? descriptor.get.call(image) : image.getAttribute('src') || '';
        },
        set(value) {
          if (typeof value === 'string' && value.startsWith('data:image/')) {
            window.officeBirdAtlas = image;
          }
          descriptor.set.call(image, value);
        },
      });
    }

    return image;
  }

  CapturedImage.prototype = NativeImage.prototype;
  window.Image = CapturedImage;
})();
