// Cortex Rush - heads up display drawn over the race scene.
const HUD = (function () {
  const PALETTE = {
    panel: "rgba(9, 14, 28, 0.72)",
    border: "rgba(122, 162, 247, 0.35)",
    text: "#e8f1ff",
    dim: "#9fb3d9",
    // TAM is always blue. The player is deliberately warm so the two are a
    // warm/cool pair: on a small mini map two similar blues would be the
    // one thing a booth player cannot afford to misread.
    player: "#ffd23f",
    tam: "#2f6bff",
    accent: "#ffd23f",
  };

  // HUD elements are laid out at a 1280x720 reference size and scaled from
  // whichever axis is tighter, so panels stay proportionate on a short
  // ultra-wide booth monitor as well as on a small laptop screen.
  function uiScale(width, height) {
    return Utils.clamp(Math.min(width / 1280, height / 720), 0.62, 1.25);
  }

  // Building the mini map path.
  //
  // The renderer fakes curves by sliding the road sideways in screen space,
  // so integrating that sideways slide as a position gives a shape drifting
  // 15x further sideways than the course is long: geometrically meaningless
  // as a map. What `curve` actually represents to the driver is how hard the
  // road is turning, so it is integrated here as a change in heading and the
  // path is walked in 2D from that. The result is a real track outline whose
  // left and right bends line up with the ones the player drives through.
  let trackShape = null;

  const HEADING_PER_CURVE = 0.0009; // radians of heading per unit of curve

  function buildTrackShape() {
    const segments = Road.segments;
    const points = [];
    const samples = 200;
    const step = Math.max(1, Math.floor(segments.length / samples));

    let heading = 0;
    let px = 0;
    let py = 0;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    for (let i = 0; i < segments.length; i++) {
      heading += segments[i].curve * HEADING_PER_CURVE;
      px += Math.sin(heading);
      py += Math.cos(heading);

      if (i % step === 0 || i === segments.length - 1) {
        points.push({ x: px, y: py, t: i / (segments.length - 1) });
        if (px < minX) minX = px;
        if (px > maxX) maxX = px;
        if (py < minY) minY = py;
        if (py > maxY) maxY = py;
      }
    }

    trackShape = { points, minX, maxX, minY, maxY };
  }

  // Maps a track point into the panel using one uniform scale for both axes.
  function fitPoint(p, shape, box) {
    const spanX = Math.max(0.001, shape.maxX - shape.minX);
    const spanY = Math.max(0.001, shape.maxY - shape.minY);
    const scale = Math.min(box.w / spanX, box.h / spanY);
    const drawW = spanX * scale;
    const drawH = spanY * scale;
    const offsetX = box.x + (box.w - drawW) / 2;
    const offsetY = box.y + (box.h - drawH) / 2;
    return {
      x: offsetX + (p.x - shape.minX) * scale,
      // Screen y grows downward, so the start of the course sits at the
      // bottom of the panel and the finish at the top.
      y: offsetY + drawH - (p.y - shape.minY) * scale,
    };
  }

  // Point on the traced path at a given race progress, so the car markers
  // sit exactly on the line rather than beside it.
  function pointAtProgress(shape, t) {
    const pts = shape.points;
    const idx = Utils.clamp(t * (pts.length - 1), 0, pts.length - 1);
    const i0 = Math.floor(idx);
    const i1 = Math.min(pts.length - 1, i0 + 1);
    const f = idx - i0;
    return {
      x: Utils.lerp(pts[i0].x, pts[i1].x, f),
      y: Utils.lerp(pts[i0].y, pts[i1].y, f),
    };
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

    const u = uiScale(width, height);
    const w = 190 * u;
    const h = 140 * u;
    const x = 18 * u;
    const y = 18 * u;
    drawPanel(ctx, x, y, w, h);

    const pad = 14 * u;
    const box = {
      x: x + pad,
      y: y + pad + 12 * u,
      w: w - pad * 2,
      h: h - pad * 2 - 12 * u,
    };

    ctx.fillStyle = PALETTE.dim;
    ctx.font = `600 ${10 * u}px sans-serif`;
    ctx.textAlign = "left";
    ctx.fillText("COURSE", box.x, y + 20 * u);

    // The course line itself.
    ctx.strokeStyle = "rgba(232, 241, 255, 0.45)";
    ctx.lineWidth = 3.5 * u;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    trackShape.points.forEach((p, i) => {
      const s = fitPoint(p, trackShape, box);
      if (i === 0) ctx.moveTo(s.x, s.y);
      else ctx.lineTo(s.x, s.y);
    });
    ctx.stroke();

    // Portion already covered, drawn over the base line.
    const playerT = Race.progress(PlayerCar.state.z);
    ctx.strokeStyle = PALETTE.player;
    ctx.lineWidth = 3.5 * u;
    ctx.beginPath();
    let started = false;
    trackShape.points.forEach((p) => {
      if (p.t > playerT) return;
      const s = fitPoint(p, trackShape, box);
      if (!started) { ctx.moveTo(s.x, s.y); started = true; }
      else ctx.lineTo(s.x, s.y);
    });
    if (started) ctx.stroke();

    // Start and finish pips.
    const startPt = fitPoint(trackShape.points[0], trackShape, box);
    const endPt = fitPoint(trackShape.points[trackShape.points.length - 1], trackShape, box);
    ctx.fillStyle = "rgba(232, 241, 255, 0.55)";
    ctx.fillRect(startPt.x - 3 * u, startPt.y - 1.5 * u, 6 * u, 3 * u);
    ctx.fillStyle = PALETTE.accent;
    ctx.fillRect(endPt.x - 3 * u, endPt.y - 1.5 * u, 6 * u, 3 * u);

    drawMarker(ctx, TamCar.state.z, PALETTE.tam, box, u);
    drawMarker(ctx, PlayerCar.state.z, PALETTE.player, box, u);
  }

  function drawMarker(ctx, z, color, box, u) {
    const p = pointAtProgress(trackShape, Race.progress(z));
    const s = fitPoint(p, trackShape, box);
    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(9, 14, 28, 0.9)";
    ctx.lineWidth = 1.5 * u;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 4.5 * u, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
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

  function drawTimeAndSpeed(ctx, width, height) {
    const u = uiScale(width, height);
    const w = 260 * u;
    const h = 76 * u;
    const x = width / 2 - w / 2;
    const y = 18 * u;
    drawPanel(ctx, x, y, w, h);

    ctx.textAlign = "center";
    ctx.fillStyle = PALETTE.dim;
    ctx.font = `600 ${10 * u}px sans-serif`;
    ctx.fillText("TIME", x + w * 0.28, y + 22 * u);
    ctx.fillText("SPEED", x + w * 0.72, y + 22 * u);

    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 ${24 * u}px ui-monospace, Consolas, monospace`;
    ctx.fillText(formatTime(Race.state.elapsed), x + w * 0.28, y + 50 * u);

    ctx.fillStyle = PALETTE.accent;
    ctx.font = `700 ${26 * u}px ui-monospace, Consolas, monospace`;
    ctx.fillText(String(toKph(PlayerCar.state.speed)), x + w * 0.72, y + 50 * u);

    ctx.fillStyle = PALETTE.dim;
    ctx.font = `600 ${10 * u}px sans-serif`;
    ctx.fillText("KM/H", x + w * 0.72, y + 65 * u);
  }

  // Linear race progress plus the gap to TAM. Complements the mini map,
  // which conveys course shape rather than relative standing.
  function drawProgressBar(ctx, width, height) {
    const u = uiScale(width, height);
    const w = Math.min(760 * u, width - 80 * u);
    const h = 54 * u;
    const x = width / 2 - w / 2;
    const y = height - h - 22 * u;
    drawPanel(ctx, x, y, w, h);

    const trackX = x + 20 * u;
    const trackW = w - 40 * u;
    const trackY = y + 32 * u;
    const barH = 8 * u;

    ctx.fillStyle = "rgba(232, 241, 255, 0.14)";
    ctx.beginPath();
    ctx.roundRect(trackX, trackY, trackW, barH, barH / 2);
    ctx.fill();

    const playerT = Race.progress(PlayerCar.state.z);
    const tamT = Race.progress(TamCar.state.z);

    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.roundRect(trackX, trackY, Math.max(barH / 2, trackW * playerT), barH, barH / 2);
    ctx.fill();

    drawProgressMarker(ctx, trackX + trackW * tamT, trackY + barH / 2, PALETTE.tam, u);
    drawProgressMarker(ctx, trackX + trackW * playerT, trackY + barH / 2, PALETTE.player, u);

    ctx.textAlign = "left";
    ctx.fillStyle = PALETTE.dim;
    ctx.font = `600 ${10 * u}px sans-serif`;
    ctx.fillText("START", trackX, y + 18 * u);

    ctx.textAlign = "right";
    ctx.fillText("FINISH", trackX + trackW, y + 18 * u);

    ctx.textAlign = "center";
    const lead = playerT - tamT;
    const tamHome = !!Race.state.tamFinishTime;
    const label = tamHome ? "TAM FINISHED - RACE TO THE LINE" : lead >= 0 ? "LEADING" : "BEHIND";
    ctx.fillStyle = tamHome ? PALETTE.accent : lead >= 0 ? PALETTE.player : PALETTE.tam;
    ctx.font = `700 ${11 * u}px sans-serif`;
    ctx.fillText(label, x + w / 2, y + 18 * u);
  }

  function drawProgressMarker(ctx, x, y, color, u) {
    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(9, 14, 28, 0.9)";
    ctx.lineWidth = 2 * u;
    ctx.beginPath();
    ctx.arc(x, y, 7 * u, 0, Math.PI * 2);
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
    ctx.font = `800 ${96 * uiScale(width, height)}px sans-serif`;
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 24;
    ctx.fillText(label, 0, 0);
    ctx.restore();
    ctx.textBaseline = "alphabetic";
  }

  function render(ctx, width, height) {
    drawMiniMap(ctx, width, height);
    drawTimeAndSpeed(ctx, width, height);
    drawProgressBar(ctx, width, height);
    drawCountdown(ctx, width, height);
  }

  function reset() {
    trackShape = null;
  }

  return { render, reset, PALETTE };
})();
