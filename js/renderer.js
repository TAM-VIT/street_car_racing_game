// Cortex Rush - pseudo-3D road projection and rendering.
// Classic projected-road-segment technique: each segment is projected from
// world space to screen space and drawn as a trapezoid, far to near.
const RoadRenderer = (function () {
  // Grass tones sit close together so the alternating bands read as texture
  // rather than stripes; the base tone below is what fills the ground.
  const GRASS_BASE = "#2c8a4b";
  const COLORS = {
    light: { road: "#5a5f6e", grass: "#2f8f4e", rumble: "#d94b4b" },
    dark: { road: "#565a6d", grass: null, rumble: "#e8e8e8" },
  };

  let cameraDepth = 1 / Math.tan(((CONFIG.ROAD.fieldOfView / 2) * Math.PI) / 180);

  const posterImage = new Image();
  posterImage.src = CONFIG.POSTER.path;

  // Projects a road point to screen space, mutating its .screen object in
  // place (each point's .screen is allocated once, not per frame) so the
  // hot render loop does no per-frame allocation.
  function project(p, cameraX, cameraY, cameraZ, worldZ, width, height, roadWidth) {
    const transZ = worldZ - cameraZ;
    const camZ = transZ <= 0 ? 0.1 : transZ;
    const camX = -cameraX;
    const camY = (p.world.y || 0) - cameraY;
    const scale = cameraDepth / camZ;
    if (!p.screen) p.screen = { scale: 0, x: 0, y: 0, w: 0 };
    p.screen.scale = scale;
    p.screen.x = Math.round(width / 2 + (scale * camX * width) / 2);
    p.screen.y = Math.round(height / 2 - (scale * camY * height) / 2);
    p.screen.w = Math.round((scale * roadWidth * width) / 2);
  }

  function polygon(ctx, x1, y1, x2, y2, x3, y3, x4, y4, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.fill();
  }

  function drawFinishBand(ctx, x1, y1, w1, x2, y2, w2) {
    const cols = 10;
    for (let i = 0; i < cols; i++) {
      const t1a = -1 + (i / cols) * 2;
      const t1b = -1 + ((i + 1) / cols) * 2;
      const dark = i % 2 === 0;
      polygon(
        ctx,
        x1 + t1a * w1, y1,
        x1 + t1b * w1, y1,
        x2 + t1b * w2, y2,
        x2 + t1a * w2, y2,
        dark ? "#0f1115" : "#f2f2f2"
      );
    }
  }

  function drawSegment(ctx, width, x1, y1, w1, x2, y2, w2, colorSet, laneLine, line) {
    const r1 = w1 / 6;
    const r2 = w2 / 6;

    // The ground is painted once before this loop. Only segments tall enough
    // to own real pixels add a grass band; forcing a minimum height here is
    // what used to make the distance shimmer into stripes.
    const bandHeight = y1 - y2;
    if (bandHeight >= 2 && colorSet.grass) {
      ctx.fillStyle = colorSet.grass;
      ctx.fillRect(0, y2, width, bandHeight);
    }

    polygon(ctx, x1 - w1 - r1, y1, x1 - w1, y1, x2 - w2, y2, x2 - w2 - r2, y2, colorSet.rumble);
    polygon(ctx, x1 + w1 + r1, y1, x1 + w1, y1, x2 + w2, y2, x2 + w2 + r2, y2, colorSet.rumble);
    polygon(ctx, x1 - w1, y1, x1 + w1, y1, x2 + w2, y2, x2 - w2, y2, colorSet.road);

    if (laneLine) {
      const lanes = CONFIG.ROAD.lanes;
      const lineW1 = Math.max(1, w1 / 40);
      const lineW2 = Math.max(1, w2 / 40);
      for (let i = 1; i < lanes; i++) {
        const t = (i / lanes) * 2 - 1; // -1..1 across road width
        const lx1 = x1 + t * w1;
        const lx2 = x2 + t * w2;
        polygon(
          ctx,
          lx1 - lineW1, y1,
          lx1 + lineW1, y1,
          lx2 + lineW2, y2,
          lx2 - lineW2, y2,
          "#f2f2f2"
        );
      }
    }

    if (line) {
      drawFinishBand(ctx, x1, y1, w1, x2, y2, w2);
    }
  }

  let shakeTime = 0;
  let skyGradient = null;
  let skyGradientHeight = 0;

  function render(ctx, width, height, playerZ, playerWorldX) {
    const segments = Road.segments;
    if (segments.length === 0) return;

    // Off-road rumble: a small vertical shake that scales with speed, so
    // leaving the road is felt as well as seen. Skipped when the viewer
    // has asked for reduced motion.
    let shakeY = 0;
    if (PlayerCar.state.offRoad && !REDUCED_MOTION.matches) {
      shakeTime += 0.35;
      const intensity = (PlayerCar.state.speed / CONFIG.CAR.maxSpeed) * 5;
      shakeY = Math.sin(shakeTime) * intensity;
    }

    ctx.save();
    if (shakeY !== 0) ctx.translate(0, shakeY);

    const segLen = CONFIG.ROAD.segmentLength;
    const baseIndex = Math.floor(playerZ / segLen) % segments.length;
    const basePercent = Utils.percentRemaining(playerZ, segLen);
    const cameraHeight = CONFIG.ROAD.cameraHeight;
    const cameraZ = playerZ;
    const cameraX = playerWorldX || 0;

    let maxY = height;
    let x = 0;
    let dx = -(segments[baseIndex].curve * basePercent);

    // Sky and ground are each painted once, overdrawn vertically so the
    // rumble shake never exposes a bare edge. Painting the ground as one
    // fill (rather than per segment) is what keeps the distance clean.
    const horizon = height / 2;
    if (!skyGradient || skyGradientHeight !== height) {
      skyGradient = ctx.createLinearGradient(0, 0, 0, horizon);
      skyGradient.addColorStop(0, "#2f63b5");
      skyGradient.addColorStop(1, "#7fb0e8");
      skyGradientHeight = height;
    }
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, -12, width, horizon + 12);

    ctx.fillStyle = GRASS_BASE;
    ctx.fillRect(0, horizon, width, height - horizon + 12);

    for (let n = 0; n < CONFIG.ROAD.drawDistance; n++) {
      const segment = segments[(baseIndex + n) % segments.length];
      const looped = baseIndex + n >= segments.length;
      const loopOffsetZ = looped ? segments.length * segLen : 0;

      const p1 = segment.p1;
      const p2 = segment.p2;

      project(p1, cameraX - x, cameraHeight, cameraZ, p1.world.z + loopOffsetZ, width, height, CONFIG.ROAD.roadWidth);
      project(p2, cameraX - x - dx, cameraHeight, cameraZ, p2.world.z + loopOffsetZ, width, height, CONFIG.ROAD.roadWidth);

      x += dx;
      dx += segment.curve;

      segment.visible = false;
      if (p2.screen.y >= p1.screen.y || p2.screen.y >= maxY) continue;

      const colorSet = segment.color === "light" ? COLORS.light : COLORS.dark;
      const laneLine = segment.index % (CONFIG.ROAD.rumbleLength * 2) < CONFIG.ROAD.rumbleLength;

      drawSegment(
        ctx,
        width,
        p1.screen.x,
        p1.screen.y,
        p1.screen.w,
        p2.screen.x,
        p2.screen.y,
        p2.screen.w,
        colorSet,
        laneLine,
        segment.line
      );

      segment.visible = true;
      maxY = p2.screen.y;
    }

    // Sprites are drawn in a second pass, far to near, so nearer objects
    // naturally overdraw farther ones without extra sorting per sprite.
    // Sprites are projected independently of the road-strip visibility cull
    // above: a segment's ground strip can collapse to sub-pixel near the
    // horizon while the sprite standing on it should still fade in early.
    for (let n = CONFIG.ROAD.drawDistance - 1; n >= 0; n--) {
      const segment = segments[(baseIndex + n) % segments.length];
      const sprites = segment.sprites;
      if (sprites.length === 0) continue;
      const p1 = segment.p1;
      if (p1.screen.scale <= 0) continue;
      for (let i = 0; i < sprites.length; i++) {
        drawSprite(ctx, p1.screen.x, p1.screen.y, p1.screen.scale, p1.screen.w, sprites[i]);
      }
    }

    ctx.restore();
    renderCars(ctx, width, height, cameraZ, cameraHeight, PlayerCar.state.x);
  }

  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)");

  const tamPoint = { world: { y: 0 }, screen: null };

  function renderCars(ctx, width, height, cameraZ, cameraHeight, playerXFrac) {
    const tam = TamCar.state;
    const drawDist = CONFIG.ROAD.drawDistance * CONFIG.ROAD.segmentLength;
    const dz = tam.z - cameraZ;
    if (dz > 10 && dz < drawDist) {
      project(tamPoint, 0, cameraHeight, cameraZ, tam.z, width, height, CONFIG.ROAD.roadWidth);
      const carX = tamPoint.screen.x + tam.x * tamPoint.screen.w;

      // Running right behind TAM would otherwise hide the obstacles the
      // player needs to dodge. Fading TAM as it fills the view keeps the
      // road ahead readable while still showing exactly where TAM is.
      const fade = Utils.clamp(dz / CONFIG.ROAD.tamFadeDistance, CONFIG.ROAD.tamMinOpacity, 1);
      ctx.save();
      ctx.globalAlpha = fade;
      drawCarSprite(ctx, carX, tamPoint.screen.y, tamPoint.screen.w * 0.55, TAM_COLOR, null, TAM_MODEL);
      ctx.restore();
      // The name tag stays fully opaque so TAM is never ambiguous.
      drawCarLabel(ctx, carX, tamPoint.screen.y, tamPoint.screen.w * 0.55, "TAM", TAM_MODEL);
    }

    // Sized from whichever dimension is tighter, so the car does not balloon
    // on an ultra-wide booth monitor or overrun the HUD on a short one, and
    // parked above the bottom bar so the two never overlap.
    const pw = Math.min(width * 0.15, height * 0.26);
    const py = height - Math.max(height * 0.15, 96);
    const px = width / 2 + playerXFrac * Math.min(width * 0.13, height * 0.22);
    drawCarSprite(ctx, px, py, pw, Selection.colorHex(), null, Selection.model());
  }

  // TAM is always the same contrasting red with a name tag, so the player
  // can tell at a glance which car is theirs.
  const TAM_COLOR = "#ff3b5c";
  const TAM_MODEL = CarCatalog.modelById("vortex");

  // Draws a race car seen from behind, layered back to front: rear wing,
  // tyres, body shell, glass, light bar, then the diffuser and exhausts.
  // Shared by the race view and the selection preview so the preview always
  // matches exactly what races.
  function drawCarSprite(ctx, x, y, w, color, label, model) {
    const m = model || CarCatalog.MODELS[0];
    const h = w * 0.5; // low and wide
    const dark = shade(color, -0.42);
    const mid = shade(color, -0.18);
    const light = shade(color, 0.22);

    ctx.save();

    // Contact shadow
    ctx.fillStyle = "rgba(0,0,0,0.32)";
    ctx.beginPath();
    ctx.ellipse(x, y + h * 0.04, w * 0.55, h * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();

    // Rear wing sits behind the body so the endplates read as depth.
    if (m.wing.width > 0) {
      const wy = y - h * m.wing.height;
      const ww = w * m.wing.width;
      const wt = h * m.wing.thickness;
      ctx.fillStyle = "#171c28";
      ctx.fillRect(x - ww / 2, wy, ww, wt); // main plane
      ctx.fillRect(x - ww / 2, wy, wt * 0.55, h * 0.2); // left endplate
      ctx.fillRect(x + ww / 2 - wt * 0.55, wy, wt * 0.55, h * 0.2); // right endplate
      ctx.fillStyle = mid;
      ctx.fillRect(x - ww / 2, wy, ww, wt * 0.32); // colour flash along the plane
    }

    // Tyres
    const tyreW = w * (m.openWheel ? 0.15 : 0.12);
    const tyreH = h * (m.openWheel ? 0.42 : 0.30);
    const tyreX = w * (m.openWheel ? 0.42 : m.bodyWidth - 0.03);
    drawTyre(ctx, x - tyreX, y, tyreW, tyreH);
    drawTyre(ctx, x + tyreX, y, tyreW, tyreH);

    // Body shell: wide at the arches, tapering to the roof.
    const bw = w * m.bodyWidth;
    const sw = w * m.shoulderWidth;
    const rw = w * m.roofWidth;
    const bh = h * m.bodyHeight;
    const rh = h * m.roofHeight;

    const grad = ctx.createLinearGradient(0, y - rh, 0, y);
    grad.addColorStop(0, light);
    grad.addColorStop(0.55, color);
    grad.addColorStop(1, mid);
    ctx.fillStyle = grad;

    // Body shell drawn as three shaded faces rather than one flat polygon:
    // a lit upper deck, the vertical rear panel, and darker side haunches.
    // The tonal split between them is what gives the flat canvas shape a
    // solid, three-dimensional read at speed.
    ctx.beginPath();
    ctx.moveTo(x - bw, y);
    ctx.lineTo(x - bw, y - bh * 0.42);
    ctx.lineTo(x - sw, y - bh);
    ctx.lineTo(x - rw, y - rh);
    ctx.lineTo(x + rw, y - rh);
    ctx.lineTo(x + sw, y - bh);
    ctx.lineTo(x + bw, y - bh * 0.42);
    ctx.lineTo(x + bw, y);
    ctx.closePath();
    ctx.fill();

    // Upper deck catching the sky: brighter, and angled inward.
    const deck = ctx.createLinearGradient(0, y - rh, 0, y - bh);
    deck.addColorStop(0, shade(color, 0.5));
    deck.addColorStop(1, light);
    ctx.fillStyle = deck;
    ctx.beginPath();
    ctx.moveTo(x - sw, y - bh);
    ctx.lineTo(x - rw, y - rh);
    ctx.lineTo(x + rw, y - rh);
    ctx.lineTo(x + sw, y - bh);
    ctx.closePath();
    ctx.fill();

    // Side haunches fall away from the light, darkening toward the arches.
    const hipL = ctx.createLinearGradient(x - bw, 0, x - sw * 0.55, 0);
    hipL.addColorStop(0, shade(color, -0.5));
    hipL.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = hipL;
    ctx.beginPath();
    ctx.moveTo(x - bw, y);
    ctx.lineTo(x - bw, y - bh * 0.42);
    ctx.lineTo(x - sw, y - bh);
    ctx.lineTo(x - sw * 0.55, y - bh);
    ctx.lineTo(x - sw * 0.55, y);
    ctx.closePath();
    ctx.fill();

    const hipR = ctx.createLinearGradient(x + bw, 0, x + sw * 0.55, 0);
    hipR.addColorStop(0, shade(color, -0.5));
    hipR.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = hipR;
    ctx.beginPath();
    ctx.moveTo(x + bw, y);
    ctx.lineTo(x + bw, y - bh * 0.42);
    ctx.lineTo(x + sw, y - bh);
    ctx.lineTo(x + sw * 0.55, y - bh);
    ctx.lineTo(x + sw * 0.55, y);
    ctx.closePath();
    ctx.fill();

    // Specular highlight running along the shoulder crease.
    ctx.strokeStyle = shade(color, 0.62);
    ctx.lineWidth = Math.max(1, h * 0.022);
    ctx.beginPath();
    ctx.moveTo(x - sw * 0.98, y - bh);
    ctx.lineTo(x + sw * 0.98, y - bh);
    ctx.stroke();

    // Ambient occlusion where the body meets the road.
    const ao = ctx.createLinearGradient(0, y - bh * 0.3, 0, y);
    ao.addColorStop(0, "rgba(0,0,0,0)");
    ao.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = ao;
    ctx.fillRect(x - bw, y - bh * 0.3, bw * 2, bh * 0.3);

    // Glass
    const gw = w * m.glass.width;
    const glassGrad = ctx.createLinearGradient(0, y - h * m.glass.top, 0, y - h * m.glass.bottom);
    glassGrad.addColorStop(0, "#38506e");
    glassGrad.addColorStop(0.45, "#16203180");
    glassGrad.addColorStop(1, "#0b111c");
    ctx.fillStyle = glassGrad;
    ctx.beginPath();
    ctx.moveTo(x - gw, y - h * m.glass.bottom);
    ctx.lineTo(x - gw * 0.82, y - h * m.glass.top);
    ctx.lineTo(x + gw * 0.82, y - h * m.glass.top);
    ctx.lineTo(x + gw, y - h * m.glass.bottom);
    ctx.closePath();
    ctx.fill();

    // Sky reflection streak across the upper glass.
    ctx.fillStyle = "rgba(190, 220, 255, 0.22)";
    ctx.beginPath();
    ctx.moveTo(x - gw * 0.78, y - h * (m.glass.top - 0.015));
    ctx.lineTo(x + gw * 0.78, y - h * (m.glass.top - 0.015));
    ctx.lineTo(x + gw * 0.55, y - h * (m.glass.top - 0.055));
    ctx.lineTo(x - gw * 0.55, y - h * (m.glass.top - 0.055));
    ctx.closePath();
    ctx.fill();

    // Tail light bar
    const lw = w * m.lightWidth;
    const ly = y - h * m.lightY;
    ctx.save();
    ctx.shadowColor = "rgba(255, 47, 77, 0.9)";
    ctx.shadowBlur = Math.max(2, h * 0.14);
    ctx.fillStyle = "#ff2f4d";
    roundRect(ctx, x - bw * 0.92, ly, lw, h * 0.06, h * 0.02);
    roundRect(ctx, x + bw * 0.92 - lw, ly, lw, h * 0.06, h * 0.02);
    ctx.restore();
    ctx.fillStyle = "rgba(255, 190, 200, 0.85)";
    roundRect(ctx, x - bw * 0.92, ly, lw, h * 0.02, h * 0.01);
    roundRect(ctx, x + bw * 0.92 - lw, ly, lw, h * 0.02, h * 0.01);

    // Diffuser and exhausts
    const dh = h * m.diffuser;
    ctx.fillStyle = "#12151d";
    ctx.fillRect(x - bw * 0.9, y - dh, bw * 1.8, dh);
    ctx.fillStyle = "#3c4354";
    for (let i = 0; i < 5; i++) {
      const fx = x - bw * 0.72 + (i * bw * 1.44) / 4;
      ctx.fillRect(fx, y - dh, Math.max(1, w * 0.008), dh);
    }
    ctx.fillStyle = "#8d95a8";
    const pipeR = Math.max(1, w * 0.018);
    for (let i = 0; i < m.exhausts; i++) {
      const offset = m.exhausts === 1 ? 0 : (i === 0 ? -1 : 1) * w * m.exhaustSpread;
      ctx.beginPath();
      ctx.arc(x + offset, y - dh - pipeR, pipeR, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    if (label) drawCarLabel(ctx, x, y, w, label, m);
  }

  // Drawn separately from the body so it can stay fully opaque even when the
  // car itself is faded out.
  function drawCarLabel(ctx, x, y, w, label, model) {
    const m = model || CarCatalog.MODELS[0];
    const h = w * 0.5;
    // Capped so the tag stays a readable marker instead of ballooning
    // across the screen when TAM is right in front of the player.
    const size = Utils.clamp(h * 0.3, 9, 20);
    const top = y - h * Math.max(m.roofHeight, m.wing.height) - size * 0.6;
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.font = `bold ${size}px sans-serif`;
    ctx.textAlign = "center";
    ctx.shadowColor = "rgba(0,0,0,0.75)";
    ctx.shadowBlur = 4;
    ctx.fillText(label, x, top);
    ctx.restore();
  }

  function drawTyre(ctx, cx, y, w, h) {
    const grad = ctx.createLinearGradient(cx - w / 2, 0, cx + w / 2, 0);
    grad.addColorStop(0, "#05070b");
    grad.addColorStop(0.45, "#22262f");
    grad.addColorStop(1, "#0a0d13");
    ctx.fillStyle = grad;
    roundRect(ctx, cx - w / 2, y - h, w, h, w * 0.3);
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    roundRect(ctx, cx - w * 0.22, y - h * 0.86, w * 0.2, h * 0.5, w * 0.1);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  }

  // Lightens (amount > 0) or darkens (amount < 0) a #rrggbb colour, used to
  // build the body gradient from the single colour the player picked.
  function shade(hex, amount) {
    const n = parseInt(hex.slice(1), 16);
    const t = amount < 0 ? 0 : 255;
    const p = Math.abs(amount);
    const r = Math.round(((n >> 16) & 255) * (1 - p) + t * p);
    const g = Math.round(((n >> 8) & 255) * (1 - p) + t * p);
    const b = Math.round((n & 255) * (1 - p) + t * p);
    return `rgb(${r},${g},${b})`;
  }

  // Sprite sizes are expressed as fractions of the projected road half-width
  // (w, in pixels) rather than raw projection scale, so they grow and
  // shrink in step with the road itself as the player approaches.
  function drawSprite(ctx, x, y, scale, w, sprite) {
    if (sprite.kind === "billboard") {
      drawBillboard(ctx, x, y, w, sprite.x);
    } else if (sprite.kind === "tree") {
      drawTree(ctx, x, y, w, sprite.side);
    } else if (sprite.kind === "sign") {
      drawSign(ctx, x, y, w, sprite.side);
    } else {
      const sx = x + sprite.x * w;
      drawObstacleShape(ctx, sx, y, w, sprite);
    }
  }

  function drawTree(ctx, x, y, w, side) {
    const cx = x + side * 1.15 * w;
    const trunkH = w * 0.05;
    const crownR = w * 0.045;
    ctx.fillStyle = "#5b3a20";
    ctx.fillRect(cx - w * 0.006, y - trunkH, w * 0.012, trunkH);
    ctx.fillStyle = "#1f7a3d";
    ctx.beginPath();
    ctx.arc(cx, y - trunkH - crownR * 0.6, crownR, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawSign(ctx, x, y, w, side) {
    const cx = x + side * 0.95 * w;
    const postH = w * 0.06;
    ctx.fillStyle = "#8a8f9c";
    ctx.fillRect(cx - w * 0.004, y - postH, w * 0.008, postH);
    ctx.fillStyle = "#ffd23f";
    ctx.fillRect(cx - w * 0.04, y - postH - w * 0.02, w * 0.08, w * 0.02);
  }

  function drawObstacleShape(ctx, x, y, w, obstacle) {
    const size = Math.max(2, obstacle.radius * w * 2);
    if (obstacle.type === "cone") drawCone(ctx, x, y, size);
    else if (obstacle.type === "oil") drawOilDrum(ctx, x, y, size);
    else drawBarrier(ctx, x, y, size);
  }

  function drawCone(ctx, x, y, size) {
    const h = size * 1.35;
    // Base pad
    ctx.fillStyle = "#1d2029";
    ctx.beginPath();
    ctx.ellipse(x, y, size * 0.55, size * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    // Cone body
    ctx.fillStyle = "#ff7a1a";
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.lineTo(x + size * 0.42, y - size * 0.06);
    ctx.lineTo(x - size * 0.42, y - size * 0.06);
    ctx.closePath();
    ctx.fill();
    // Reflective bands
    ctx.fillStyle = "#f7f7f7";
    band(ctx, x, y, h, size, 0.40, 0.11);
    band(ctx, x, y, h, size, 0.62, 0.09);
    // Lit edge
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.beginPath();
    ctx.moveTo(x, y - h);
    ctx.lineTo(x - size * 0.12, y - size * 0.06);
    ctx.lineTo(x - size * 0.42, y - size * 0.06);
    ctx.closePath();
    ctx.fill();
  }

  // A horizontal stripe clipped to the cone's taper at a given height.
  function band(ctx, x, y, h, size, t, thickness) {
    const wTop = size * 0.42 * (1 - t - thickness);
    const wBot = size * 0.42 * (1 - t);
    const yTop = y - h * (t + thickness);
    const yBot = y - h * t;
    ctx.beginPath();
    ctx.moveTo(x - wTop, yTop);
    ctx.lineTo(x + wTop, yTop);
    ctx.lineTo(x + wBot, yBot);
    ctx.lineTo(x - wBot, yBot);
    ctx.closePath();
    ctx.fill();
  }

  // An upright hazard drum reads far better at speed than a flat dark
  // puddle, which was indistinguishable from a shadow on the road.
  function drawOilDrum(ctx, x, y, size) {
    const w = size * 0.8;
    const h = size * 1.25;
    const rx = w / 2;
    const ry = Math.max(1, h * 0.1);
    const top = y - h;

    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(x, y, rx * 1.15, ry * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();

    const body = ctx.createLinearGradient(x - rx, 0, x + rx, 0);
    body.addColorStop(0, "#8c2f12");
    body.addColorStop(0.42, "#e0641f");
    body.addColorStop(1, "#7a2810");
    ctx.fillStyle = body;
    ctx.fillRect(x - rx, top, w, h);

    ctx.fillStyle = "#20242e";
    ctx.fillRect(x - rx, top + h * 0.26, w, h * 0.1);
    ctx.fillRect(x - rx, top + h * 0.62, w, h * 0.1);

    ctx.fillStyle = "#f0a33c";
    ctx.beginPath();
    ctx.ellipse(x, top, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c07826";
    ctx.beginPath();
    ctx.ellipse(x, top, rx * 0.62, ry * 0.62, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawBarrier(ctx, x, y, size) {
    const w = size * 2.1;
    const h = size * 0.62;
    const top = y - h;
    const legH = h * 0.32;

    ctx.fillStyle = "#2a2f3b";
    ctx.fillRect(x - w * 0.42, y - legH, w * 0.06, legH);
    ctx.fillRect(x + w * 0.36, y - legH, w * 0.06, legH);

    ctx.fillStyle = "#f2f2f2";
    ctx.fillRect(x - w / 2, top, w, h * 0.72);

    // Diagonal hazard chevrons
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - w / 2, top, w, h * 0.72);
    ctx.clip();
    ctx.fillStyle = "#d93a3a";
    const step = w / 5;
    for (let i = -1; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(x - w / 2 + i * step, top + h * 0.72);
      ctx.lineTo(x - w / 2 + i * step + step * 0.5, top + h * 0.72);
      ctx.lineTo(x - w / 2 + i * step + step * 0.5 + h * 0.72, top);
      ctx.lineTo(x - w / 2 + i * step + h * 0.72, top);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    ctx.strokeStyle = "#20242e";
    ctx.lineWidth = Math.max(1, size * 0.03);
    ctx.strokeRect(x - w / 2, top, w, h * 0.72);
  }

  function drawBillboard(ctx, x, y, w, spriteX) {
    const posterW = w * 0.55;
    const posterH = w * 0.3;
    const cx = x + spriteX * w;
    const left = cx - posterW / 2;
    const top = y - posterH - w * 0.04;

    ctx.fillStyle = "#1c1f27";
    ctx.fillRect(cx - w * 0.01, top + posterH, w * 0.02, w * 0.07);

    if (posterImage.complete && posterImage.naturalWidth > 0) {
      ctx.drawImage(posterImage, left, top, posterW, posterH);
    } else {
      ctx.fillStyle = "#0e1830";
      ctx.fillRect(left, top, posterW, posterH);
      ctx.strokeStyle = "#4d7fc9";
      ctx.lineWidth = Math.max(1, w * 0.006);
      ctx.strokeRect(left, top, posterW, posterH);
      ctx.fillStyle = "#e8f1ff";
      ctx.font = `${Math.max(8, w * 0.045)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("CODE CORTEX 3.0", cx, top + posterH / 2);
    }
  }

  return { render, project, drawCarSprite };
})();
