/* Animate the actual logo in browser tabs: no halo, network requests, or dependencies. */
(() => {
  const icon = document.querySelector("link[data-favicon-motion]");
  if (!icon || !window.matchMedia) return;

  const original = icon.href;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const mode = icon.dataset.faviconMode || "float";
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const context = canvas.getContext("2d");
  if (!context) return;

  const image = new Image();
  const frames = [];
  let interval = null;
  let current = 0;

  function stop() {
    if (interval !== null) {
      clearInterval(interval);
      interval = null;
    }
    if (icon.href !== original) icon.href = original;
  }

  function update() {
    if (document.hidden || reduceMotion.matches || frames.length === 0) {
      stop();
      return;
    }
    icon.href = frames[current];
    current = (current + 1) % frames.length;
  }

  function sync() {
    if (document.hidden || reduceMotion.matches || frames.length === 0) {
      stop();
      return;
    }
    if (interval !== null) return;
    update();
    interval = setInterval(update, 125);
  }

  image.onload = () => {
    try {
      for (let index = 0; index < 24; index++) {
        const phase = (index * 2 * Math.PI) / 24;
        const wave = Math.sin(phase);
        let rotation = 0;
        let scale = 0.96;
        let offsetX = 0;
        let offsetY = 0;

        if (mode === "float") {
          rotation = wave * 0.085;
          offsetY = -1.4 * Math.cos(phase);
        } else if (mode === "sway") {
          rotation = wave * 0.15;
          offsetY = -0.7 * Math.cos(phase);
        } else if (mode === "breathe") {
          scale = 0.91 + (wave + 1) * 0.035;
          rotation = wave * 0.05;
        } else if (mode === "orbit") {
          scale = 0.88;
          rotation = phase;
        } else if (mode === "tick") {
          scale = 0.94 + (wave + 1) * 0.025;
          rotation = wave * 0.09;
          offsetX = wave * 0.8;
        }

        context.clearRect(0, 0, 64, 64);
        context.save();
        context.translate(32 + offsetX, 32 + offsetY);
        context.rotate(rotation);
        context.scale(scale, scale);
        context.drawImage(image, -32, -32, 64, 64);
        context.restore();
        frames.push(canvas.toDataURL("image/png"));
      }
    } catch {
      return; // Browsers restricting SVG rasterization retain the animated SVG.
    }
    sync();
  };

  image.src = original;
  document.addEventListener("visibilitychange", sync);
  reduceMotion.addEventListener?.("change", sync);
  window.addEventListener("pagehide", stop, { once: true });
})();
