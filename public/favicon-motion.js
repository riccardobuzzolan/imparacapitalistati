/* Continuous favicon motion in browser tabs, without network calls or extra libraries. */
(() => {
  const icon = document.querySelector("link[data-favicon-motion]");
  if (!icon || !window.matchMedia) return;

  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const original = icon.href;
  const point = (icon.dataset.faviconPoint || "32,32").split(",").map(Number);
  const hex = icon.dataset.faviconAccent || "#0bbbd2";
  if (
    point.length !== 2 ||
    point.some((value) => !Number.isFinite(value)) ||
    !/^#[0-9a-fA-F]{6}$/.test(hex)
  )
    return;

  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);
  const bitmap = new Image();
  let frames = [];
  let timer = null;
  let frameIndex = 0;

  function stop() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
    if (icon.href !== original) icon.href = original;
  }

  function step() {
    if (document.hidden || motion.matches || frames.length === 0) {
      stop();
      return;
    }
    icon.href = frames[frameIndex];
    frameIndex = (frameIndex + 1) % frames.length;
  }

  function sync() {
    if (document.hidden || motion.matches || frames.length === 0) {
      stop();
      return;
    }
    if (timer !== null) return;
    step();
    timer = setInterval(step, 160);
  }

  bitmap.onload = () => {
    const nextFrames = [];
    try {
      for (let index = 0; index < 18; index++) {
        const phase = (index * 2 * Math.PI) / 18;
        const pulse = (1 - Math.cos(phase)) / 2;

        ctx.clearRect(0, 0, 64, 64);
        ctx.drawImage(bitmap, 0, 0, 64, 64);

        ctx.beginPath();
        ctx.arc(point[0], point[1], 5 + pulse * 10, 0, Math.PI * 2);
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = `rgba(${red},${green},${blue},${(0.48 - pulse * 0.2).toFixed(2)})`;
        ctx.stroke();

        nextFrames.push(canvas.toDataURL("image/png"));
      }
    } catch {
      return; // The SVG remains available if rasterization is restricted.
    }
    frames = nextFrames;
    sync();
  };

  bitmap.src = original;
  document.addEventListener("visibilitychange", sync);
  motion.addEventListener?.("change", sync);
  window.addEventListener("pagehide", stop, { once: true });
})();
