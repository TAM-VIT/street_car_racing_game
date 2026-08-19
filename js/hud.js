// Cortex Rush - heads up display drawn over the race scene.
const HUD = (function () {
  const PALETTE = {
    panel: "rgba(9, 14, 28, 0.72)",
    border: "rgba(122, 162, 247, 0.35)",
    text: "#e8f1ff",
    dim: "#9fb3d9",
    player: "#3ad1ff",
    tam: "#ff3b5c",
    accent: "#ffd23f",
  };

  // The course is largely linear, so the mini map draws the track as a
  // folded line whose horizontal offset follows the accumulated curvature,
  // giving a schematic sense of the course shape.
  let trackShape = null;

  function buildTrackShape() {
    const segments = Road.segments;
    const points = [];
    const samples = 60;
    let x = 0;
    let dx = 0;
    let minX = 0;
    let maxX = 0;

    for (let i = 0; i < segments.length; i++) {
      dx += segments[i].curve;
      x += dx * 0.02;
      if (i % Math.floor(segments.length / samples) === 0) {
        points.push(x);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
      }
    }

    trackShape = { points, minX, maxX };
  }

  function drawPanel(ctx, x, y, w, h) {
    ctx.fillStyle = PALETTE.panel;
    ctx.strokeStyle = PALETTE.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 10);
    ctx.fill();
    ctx.stroke();
  }

  function drawMiniMap(ctx, width, height) {
    if (!trackShape) buildTrackShape();

    const w = 190;
    const h = 130;
    const x = 18;
    const y = 18;
    drawPanel(ctx, x, y, w, h);

    const pad = 16;
    const innerX = x + pad;
    const innerY = y + pad + 8;
    const innerW = w - pad * 2;
    const innerH = h - pad * 2 - 8;

    ctx.fillStyle = PALETTE.dim;
    ctx.font = "600 10px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("COURSE", innerX, y + 20);

    const { points, minX, maxX } = trackShape;
    const spanX = Math.max(0.001, maxX - minX);

    ctx.strokeStyle = "rgba(232, 241, 255, 0.5)";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      const t = i / (points.length - 1);
      const px = innerX + ((points[i] - minX) / spanX) * innerW;
      const py = innerY + innerH - t * innerH;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();

    drawMarker(ctx, TamCar.state.z, PALETTE.tam, innerX, innerY, innerW, innerH, spanX, minX, points);
    drawMarker(ctx, PlayerCar.state.z, PALETTE.player, innerX, innerY, innerW, innerH, spanX, minX, points);
  }

  function drawMarker(ctx, z, color, innerX, innerY, innerW, innerH, spanX, minX, points) {
    const t = Race.progress(z);
    const idx = Utils.clamp(Math.round(t * (points.length - 1)), 0, points.length - 1);
    const px = innerX + ((points[idx] - minX) / spanX) * innerW;
    const py = innerY + innerH - t * innerH;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(px, py, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const cs = Math.floor((seconds * 100) % 100);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
  }

  // Speed is shown in km/h derived from world units per second, purely for
  // readability: the raw world-unit figure means nothing to a player.
  function toKph(speed) {
    return Math.round((speed / CONFIG.CAR.maxSpeed) * CONFIG.HUD.displayTopSpeedKph);
  }

  function drawTimeAndSpeed(ctx, width) {
    const w = 260;
    const h = 76;
    const x = width / 2 - w / 2;
    const y = 18;
    drawPanel(ctx, x, y, w, h);

    ctx.textAlign = "center";
    ctx.fillStyle = PALETTE.dim;
    ctx.font = "600 10px sans-serif";
    ctx.fillText("TIME", x + w * 0.28, y + 22);
    ctx.fillText("SPEED", x + w * 0.72, y + 22);

    ctx.fillStyle = PALETTE.text;
    ctx.font = "700 24px ui-monospace, Consolas, monospace";
    ctx.fillText(formatTime(Race.state.elapsed), x + w * 0.28, y + 50);

    ctx.fillStyle = PALETTE.accent;
    ctx.font = "700 26px ui-monospace, Consolas, monospace";
    ctx.fillText(String(toKph(PlayerCar.state.speed)), x + w * 0.72, y + 50);

    ctx.fillStyle = PALETTE.dim;
    ctx.font = "600 10px sans-serif";
    ctx.fillText("KM/H", x + w * 0.72, y + 65);
  }

  // Linear race progress plus the gap to TAM. Complements the mini map,
  // which conveys course shape rather than relative standing.
  function drawProgressBar(ctx, width, height) {
    const w = Math.min(760, width - 80);
    const h = 54;
    const x = width / 2 - w / 2;
    const y = height - h - 22;
    drawPanel(ctx, x, y, w, h);

    const trackX = x + 20;
    const trackW = w - 40;
    const trackY = y + 32;

    ctx.fillStyle = "rgba(232, 241, 255, 0.14)";
    ctx.beginPath();
    ctx.roundRect(trackX, trackY, trackW, 8, 4);
    ctx.fill();

    const playerT = Race.progress(PlayerCar.state.z);
    const tamT = Race.progress(TamCar.state.z);

    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.roundRect(trackX, trackY, Math.max(4, trackW * playerT), 8, 4);
    ctx.fill();

    drawProgressMarker(ctx, trackX + trackW * tamT, trackY + 4, PALETTE.tam);
    drawProgressMarker(ctx, trackX + trackW * playerT, trackY + 4, PALETTE.player);

    ctx.textAlign = "left";
    ctx.fillStyle = PALETTE.dim;
    ctx.font = "600 10px sans-serif";
    ctx.fillText("START", trackX, y + 18);

    ctx.textAlign = "right";
    ctx.fillText("FINISH", trackX + trackW, y + 18);

    ctx.textAlign = "center";
    const lead = playerT - tamT;
    const label = lead >= 0 ? "LEADING" : "BEHIND";
    ctx.fillStyle = lead >= 0 ? PALETTE.player : PALETTE.tam;
    ctx.font = "700 11px sans-serif";
    ctx.fillText(label, x + w / 2, y + 18);
  }

  function drawProgressMarker(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(9, 14, 28, 0.9)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  function drawCountdown(ctx, width, height) {
    const remaining = Race.state.countdown;
    if (remaining <= 0) return;

    const number = Math.ceil(remaining - 0.6);
    const label = number > 0 ? String(number) : "GO";

    // Each digit scales down as its own beat elapses, so the countdown
    // reads as a pulse rather than a static number swap.
    const beat = number > 0 ? (remaining - 0.6) % 1 : remaining / 0.6;
    const scale = 1 + (1 - beat) * 0.35;

    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(scale, scale);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = label === "GO" ? PALETTE.accent : PALETTE.text;
    ctx.font = "800 96px sans-serif";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 24;
    ctx.fillText(label, 0, 0);
    ctx.restore();
    ctx.textBaseline = "alphabetic";
  }

  function render(ctx, width, height) {
    drawMiniMap(ctx, width, height);
    drawTimeAndSpeed(ctx, width);
    drawProgressBar(ctx, width, height);
    drawCountdown(ctx, width, height);
  }

  function reset() {
    trackShape = null;
  }

  return { render, reset, PALETTE };
})();
