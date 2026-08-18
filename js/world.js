// Cortex Rush - roadside world objects: obstacles, billboards, scenery.
const World = (function () {
  const OBSTACLE_TYPES = {
    cone: { radius: 0.14 },
    oil: { radius: 0.18 },
    barrier: { radius: 0.22 },
  };

  const obstacles = [];

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
        type,
        radius: OBSTACLE_TYPES[type].radius,
        x: lane + jitter,
        z: segments[n].p1.world.z,
        hit: false,
      };
      obstacles.push(obstacle);
      segments[n].obstacles.push(obstacle);
      nextAt = n + minGap + Math.floor(rng() * 14);
    }
  }

  return { obstacles, OBSTACLE_TYPES, placeObstacles };
})();
