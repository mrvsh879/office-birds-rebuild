(() => {
  const NativeImage = window.Image;

  function OfficeBirdImage(...args) {
    const image = new NativeImage(...args);
    window.officeBirdAtlas = image;
    return image;
  }

  OfficeBirdImage.prototype = NativeImage.prototype;
  window.Image = OfficeBirdImage;
})();
