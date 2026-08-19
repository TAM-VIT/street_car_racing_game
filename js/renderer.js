// Cortex Rush - pseudo-3D road projection and rendering.
// Classic projected-road-segment technique: each segment is projected from
// world space to screen space and drawn as a trapezoid, far to near.
const RoadRenderer = (function () {
  const COLORS = {
    light: { road: "#5a5f6e", grass: "#2f8f4e", rumble: "#d94b4b", lane: null },
    dark: { road: "#52566a", grass: "#2a8047", rumble: "#e8e8e8", lane: null },
    lane: { road: "#52566a", grass: "#2a8047", rumble: "#e8e8e8", lane: "#e8e8e8" },
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

  function drawSegment(ctx, width, x1, y1, w1, x2, y2, w2, colorSet, laneLine) {
    const r1 = w1 / 6;
    const r2 = w2 / 6;

    ctx.fillStyle = colorSet.grass;
    ctx.fillRect(0, y2, width, Math.max(1, y1 - y2));

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
  }

  function render(ctx, width, height, playerZ, playerWorldX) {
    const segments = Road.segments;
    if (segments.length === 0) return;

    const segLen = CONFIG.ROAD.segmentLength;
    const baseIndex = Math.floor(playerZ / segLen) % segments.length;
    const basePercent = Utils.percentRemaining(playerZ, segLen);
    const cameraHeight = CONFIG.ROAD.cameraHeight;
    const cameraZ = playerZ;
    const cameraX = playerWorldX || 0;

    let maxY = height;
    let x = 0;
    let dx = -(segments[baseIndex].curve * basePercent);

    ctx.fillStyle = "#4d7fc9";
    ctx.fillRect(0, 0, width, height / 2);

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
        laneLine
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
    const type = obstacle.type;
    const size = Math.max(1, obstacle.radius * w * 2);

    if (type === "cone") {
      const h = size * 1.3;
      ctx.fillStyle = "#ff7a1a";
      ctx.beginPath();
      ctx.moveTo(x, y - h);
      ctx.lineTo(x + size / 2, y);
      ctx.lineTo(x - size / 2, y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#f2f2f2";
      ctx.fillRect(x - size / 2, y - h * 0.35, size, h * 0.12);
    } else if (type === "oil") {
      ctx.fillStyle = "rgba(15,15,20,0.85)";
      ctx.beginPath();
      ctx.ellipse(x, y - size * 0.05, size * 0.7, size * 0.28, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      const h = size * 0.55;
      ctx.fillStyle = "#d94b4b";
      ctx.fillRect(x - size / 2, y - h, size, h);
      ctx.fillStyle = "#f2f2f2";
      for (let i = 0; i < 4; i++) {
        ctx.fillRect(x - size / 2 + (i * size) / 4, y - h, size / 8, h);
      }
    }
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

  return { render, project, get cameraDepth() { return cameraDepth; } };
})();
