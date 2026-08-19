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
    //
    // The effect fades out over the closing stretch. Held at full strength
    // to the line it decides the winner by itself, which makes the finish
    // feel scripted and pins the win rate to whichever car is marginally
    // faster. Fading it hands the endgame back to actual pace and the
    // mistakes both drivers made along the way.
    const gap = state.z - playerZ;
    const lead = Math.max(Race.progress(state.z), Race.progress(playerZ));
    const fade = 1 - Utils.clamp((lead - t.rubberBandFadeStart) / (1 - t.rubberBandFadeStart), 0, 1);
    const rubberBand =
      Utils.clamp(-gap * t.rubberBandStrength, -t.rubberBandMax, t.rubberBandMax) * fade;
    const targetSpeed = c.maxSpeed * (t.baseSpeedFactor + rubberBand + state.paceNoise) * mistakeFactor;

    // The ceiling sits above the player's max speed on purpose: without it
    // rubber banding could never claw back a deficit, and TAM would be
    // mathematically unable to win against a player who holds the throttle.
    const ceiling = c.maxSpeed * t.maxSpeedFactor;
    state.speed = Utils.lerp(state.speed, Utils.clamp(targetSpeed, 0, ceiling), Math.min(1, dt * t.speedResponse));
    state.z += state.speed * dt;
  }

  return { state, reset, worldX, update };
})();
