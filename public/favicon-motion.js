/* A low-duty-cycle live favicon for Chromium, with the SVG as native/static fallback. */
(() => {
  const icon = document.querySelector("link[data-favicon-motion]");
  if (
    !icon ||
    !window.matchMedia ||
    !document.createElement("canvas").getContext
  )
    return;

  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const original = icon.href;
  const point = (icon.dataset.faviconPoint || "32,32").split(",").map(Number);
  const hex = icon.dataset.faviconAccent || "#0bbbd2";
  if (
    point.length !== 2 ||
    point.some((x) => !Number.isFinite(x)) ||
    !/^#[0-9a-fA-F]{6}$/.test(hex)
  )
    return;
  const red = parseInt(hex.slice(1, 3), 16);
  const green = parseInt(hex.slice(3, 5), 16);
  const blue = parseInt(hex.slice(5, 7), 16);
  const bitmap = new Image();
  const delays = [];
  let interval;

  function restore() {
    while (delays.length) clearTimeout(delays.pop());
    if (icon.href !== original) icon.href = original;
  }

  bitmap.onload = () => {
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const frames = [];
    try {
      for (const size of [0, 0.3, 0.65, 1, 0.65, 0.3]) {
        ctx.clearRect(0, 0, 64, 64);
        ctx.drawImage(bitmap, 0, 0, 64, 64);
        if (size) {
          ctx.beginPath();
          ctx.arc(point[0], point[1], 5 + size * 11, 0, Math.PI * 2);
          ctx.lineWidth = 1.3 + (1 - size) * 1.2;
          ctx.strokeStyle = `rgba(${red},${green},${blue},${(0.55 * (1 - size * 0.65)).toFixed(2)})`;
          ctx.stroke();
        }
        frames.push(canvas.toDataURL("image/png"));
      }
    } catch {
      return; // Browsers that disallow canvas rasterization still use the SVG.
    }

    function pulse() {
      if (document.hidden || motion.matches) return;
      for (let index = 0; index < frames.length; index++) {
        delays.push(
          setTimeout(() => {
            if (!document.hidden && !motion.matches) icon.href = frames[index];
          }, index * 180),
        );
      }
      delays.push(setTimeout(restore, frames.length * 180 + 120));
    }

    if (!motion.matches) delays.push(setTimeout(pulse, 1600));
    interval = setInterval(pulse, 8200);
    document.addEventListener("visibilitychange", () => {
      if (document.hidden) restore();
    });
    motion.addEventListener?.("change", () => {
      if (motion.matches) restore();
    });
    window.addEventListener(
      "pagehide",
      () => {
        clearInterval(interval);
        restore();
      },
      { once: true },
    );
  };
  bitmap.src = original;
})();
