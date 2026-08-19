// Cortex Rush - roadside world objects: obstacles, billboards, scenery.
const World = (function () {
  const OBSTACLE_TYPES = {
    cone: { radius: 0.14 },
    oil: { radius: 0.18 },
    barrier: { radius: 0.22 },
  };

  const obstacles = [];
  const billboards = [];

  // The primary branding surface: the event poster placed on roadside
  // billboards at intervals so it is clearly visible as the player passes.
  function placeBillboards(rng) {
    billboards.length = 0;
    const segments = Road.segments;
    const start = 90;
    const gap = 230;
    let side = 1;

    for (let n = start; n < segments.length - 80; n += gap + Math.floor(rng() * 60)) {
      const billboard = {
        kind: "billboard",
        x: side * 2.6,
        z: segments[n].p1.world.z,
        side,
      };
      billboards.push(billboard);
      segments[n].sprites.push(billboard);
      side *= -1;
    }
  }

  function placeObstacles(rng) {
    obstacles.length = 0;
    const segments = Road.segments;
    const types = Object.keys(OBSTACLE_TYPES);

    // Skip the opening straight so the player has a clean start, and stop
    // well before the finish line. Space obstacles so a clean run is
    // possible but the player has to actually steer.
    const start = 140;
    const end = segments.length - 60;
    const minGap = 18;
    let nextAt = start + minGap;

    for (let n = start; n < end; n++) {
      if (n < nextAt) continue;
      if (rng() > 0.35) {
        nextAt = n + minGap + Math.floor(rng() * 10);
        continue;
      }

      const type = types[Math.floor(rng() * types.length)];
      const lane = Math.floor(rng() * 3) - 1; // -1, 0, 1
      const jitter = (rng() - 0.5) * 0.3;
      const obstacle = {
        kind: "obstacle",
        type,
        radius: OBSTACLE_TYPES[type].radius,
        x: lane + jitter,
        z: segments[n].p1.world.z,
        hit: false,
      };
      obstacles.push(obstacle);
      segments[n].obstacles.push(obstacle);
      segments[n].sprites.push(obstacle);
      nextAt = n + minGap + Math.floor(rng() * 14);
    }
  }

  const SCENERY_GAP = 6;

  // Cheap roadside scenery (trees and signs) for a sense of depth and speed.
  // Objects are created once at placement and reused every frame, never
  // allocated inside the render loop.
  function placeScenery(rng) {
    const segments = Road.segments;
    for (let n = 20; n < segments.length - 20; n += SCENERY_GAP) {
      if (rng() > 0.6) continue;
      const side = rng() > 0.5 ? 1 : -1;
      const kind = rng() > 0.75 ? "sign" : "tree";
      segments[n].sprites.push({ kind, side, z: segments[n].p1.world.z });
    }
  }

  // Checks the player's current road segment (and the one just ahead, since
  // fast movement can skip a segment between fixed-timestep ticks) for an
  // obstacle overlap. Returns the obstacle hit, or null.
  function checkCollision(carState) {
    const segLen = CONFIG.ROAD.segmentLength;
    const base = Road.findSegment(carState.z);
    const candidates = base.obstacles;

    for (let i = 0; i < candidates.length; i++) {
      const obstacle = candidates[i];
      if (obstacle.hit) continue;
      const dz = Math.abs(obstacle.z - carState.z);
      if (dz > segLen) continue;
      const dx = Math.abs(obstacle.x - carState.x);
      if (dx < obstacle.radius + 0.09) {
        obstacle.hit = true;
        return obstacle;
      }
    }
    return null;
  }

  function resetObstacleHits() {
    for (let i = 0; i < obstacles.length; i++) obstacles[i].hit = false;
  }

  return {
    obstacles,
    billboards,
    resetObstacleHits,
    OBSTACLE_TYPES,
    placeObstacles,
    placeBillboards,
    placeScenery,
    checkCollision,
  };
})();
