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

  function project(p, cameraX, cameraY, cameraZ, width, height, roadWidth) {
    const transZ = p.world.z - cameraZ;
    const camZ = transZ <= 0 ? 0.1 : transZ;
    const camX = (p.world.x || 0) - cameraX;
    const camY = (p.world.y || 0) - cameraY;
    const scale = cameraDepth / camZ;
    p.screen = {
      scale: scale,
      x: Math.round(width / 2 + (scale * camX * width) / 2),
      y: Math.round(height / 2 - (scale * camY * height) / 2),
      w: Math.round((scale * roadWidth * width) / 2),
    };
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

      const p1 = {
        world: { x: 0, y: segment.p1.world.y, z: segment.p1.world.z + loopOffsetZ },
      };
      const p2 = {
        world: { x: 0, y: segment.p2.world.y, z: segment.p2.world.z + loopOffsetZ },
      };

      project(p1, cameraX - x, cameraHeight, cameraZ, width, height, CONFIG.ROAD.roadWidth);
      project(p2, cameraX - x - dx, cameraHeight, cameraZ, width, height, CONFIG.ROAD.roadWidth);

      x += dx;
      dx += segment.curve;

      segment.spriteP1 = null;
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

      segment.spriteP1 = p1;
      maxY = p2.screen.y;
    }

    // Sprites are drawn in a second pass, far to near, so nearer objects
    // naturally overdraw farther ones without extra sorting per sprite.
    for (let n = CONFIG.ROAD.drawDistance - 1; n >= 0; n--) {
      const segment = segments[(baseIndex + n) % segments.length];
      if (!segment.spriteP1) continue;
      const p1 = segment.spriteP1;
      if (segment.sprites.length) {
        for (let i = 0; i < segment.sprites.length; i++) {
          drawBillboard(ctx, p1.screen.x, p1.screen.y, p1.screen.scale, segment.sprites[i].side);
        }
      }
    }
  }

  function drawBillboard(ctx, x, y, scale, side) {
    const posterW = 900 * scale;
    const posterH = 480 * scale;
    const offset = side * (620 * scale) + side * posterW * 0.55;
    const left = x + offset - posterW / 2;
    const top = y - posterH - 40 * scale;

    // pole
    ctx.fillStyle = "#1c1f27";
    ctx.fillRect(x + offset - 6 * scale, top + posterH, 12 * scale, 60 * scale);

    if (posterImage.complete && posterImage.naturalWidth > 0) {
      ctx.drawImage(posterImage, left, top, posterW, posterH);
    } else {
      ctx.fillStyle = "#0e1830";
      ctx.fillRect(left, top, posterW, posterH);
      ctx.strokeStyle = "#4d7fc9";
      ctx.lineWidth = Math.max(1, 4 * scale);
      ctx.strokeRect(left, top, posterW, posterH);
      ctx.fillStyle = "#e8f1ff";
      ctx.font = `${Math.max(8, 40 * scale)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("CODE CORTEX 3.0", x + offset, top + posterH / 2);
    }
  }

  return { render, project, get cameraDepth() { return cameraDepth; } };
})();
