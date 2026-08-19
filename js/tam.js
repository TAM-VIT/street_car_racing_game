// Cortex Rush - TAM, the AI opponent. See PRD section 7a: TAM is a tuned
// heuristic rubber-band controller, not a reinforcement-learned policy.
// Kept modular so the driving logic can be swapped without touching the
// rest of the game.
const TamCar = (function () {
  const state = {
    z: 0,
    x: 0,
    speed: 0,
    mistakeActive: 0,
    nextMistakeCheck: 3,
    paceNoise: 0,
    nextPaceCheck: 2,
  };

  let rng = Utils.createRng(1);

  function reset(seed) {
    rng = Utils.createRng(seed || (Date.now() & 0xffffffff));
    state.z = 0;
    state.x = 0;
    state.speed = 0;
    state.mistakeActive = 0;
    state.nextMistakeCheck = 3 + rng() * 3;
    state.paceNoise = 0;
    state.nextPaceCheck = 2 + rng() * 2;
  }

  function worldX() {
    return state.x * CONFIG.ROAD.roadWidth;
  }

  // Looks a short distance ahead on TAM's current segment lane for an
  // obstacle and returns a lateral nudge away from it, or 0 if clear.
  function obstacleAvoidance(t) {
    const segments = Road.segments;
    const segLen = CONFIG.ROAD.segmentLength;
    const baseIndex = Math.floor(state.z / segLen) % segments.length;

    for (let n = 1; n <= t.avoidanceLookaheadSegments; n++) {
      const segment = segments[(baseIndex + n) % segments.length];
      for (let i = 0; i < segment.obstacles.length; i++) {
        const obstacle = segment.obstacles[i];
        if (obstacle.hit) continue;
        if (Math.abs(obstacle.x - state.x) < obstacle.radius + t.avoidanceTriggerMargin) {
          const dodge = obstacle.x <= state.x ? 0.55 : -0.55;
          return dodge * t.avoidanceSkill;
        }
      }
    }
    return 0;
  }

  function update(dt, playerZ) {
    const c = CONFIG.CAR;
    const t = CONFIG.TAM;
    const segment = Road.findSegment(state.z);

    // Follow a sensible racing line: ease toward the inside of the curve
    // ahead rather than hugging dead center, but swerve around obstacles
    // spotted a short distance ahead.
    const avoidance = obstacleAvoidance(t);
    const targetX = Utils.clamp(-segment.curve * 0.12 + avoidance, -0.85, 0.85);
    state.x = Utils.lerp(state.x, targetX, Math.min(1, dt * t.steerLerpSpeed));

    // Small natural variation: an occasional brief slowdown so no two
    // races play out identically and the player can sometimes capitalise.
    let mistakeFactor = 1;
    if (state.mistakeActive > 0) {
      state.mistakeActive -= dt;
      mistakeFactor = t.mistakeSlowdown;
    } else {
      state.nextMistakeCheck -= dt;
      if (state.nextMistakeCheck <= 0) {
        state.nextMistakeCheck = t.mistakeCheckIntervalMin + rng() * t.mistakeCheckIntervalRange;
        if (rng() < t.mistakeFrequency) {
          state.mistakeActive = t.mistakeDurationMin + rng() * t.mistakeDurationRange;
        }
      }
    }

    // Gentle pace variation so TAM's speed drifts a little from lap to
    // lap instead of holding an obviously constant, robotic pace.
    state.nextPaceCheck -= dt;
    if (state.nextPaceCheck <= 0) {
      state.nextPaceCheck = t.paceCheckIntervalMin + rng() * t.paceCheckIntervalRange;
      state.paceNoise = (rng() - 0.5) * t.paceNoiseAmplitude;
    }

    // Rubber banding: TAM eases off when well ahead of the player and
    // pushes harder when well behind, so races stay close without ever
    // looking obviously scripted.
    const gap = state.z - playerZ;
    const rubberBand = Utils.clamp(-gap * t.rubberBandStrength, -t.rubberBandMax, t.rubberBandMax);
    const targetSpeed = c.maxSpeed * (t.baseSpeedFactor + rubberBand + state.paceNoise) * mistakeFactor;

    state.speed = Utils.lerp(state.speed, Utils.clamp(targetSpeed, 0, c.maxSpeed * 0.98), Math.min(1, dt * 0.8));
    state.z += state.speed * dt;
  }

  return { state, reset, worldX, update };
})();
