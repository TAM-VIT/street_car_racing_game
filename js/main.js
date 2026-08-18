// Cortex Rush - entry point: canvas setup and resize handling.
(function () {
  const canvas = document.getElementById("race-canvas");
  const ctx = canvas.getContext("2d");

  function resizeCanvas() {
    const root = document.getElementById("game-root");
    const dpr = window.devicePixelRatio || 1;
    const width = root.clientWidth;
    const height = root.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  window.Game = window.Game || {};
  window.Game.canvas = canvas;
  window.Game.ctx = ctx;
})();
