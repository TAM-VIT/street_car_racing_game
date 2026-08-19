// Cortex Rush - TAM, the AI opponent. See PRD section 7a: TAM is a tuned
// heuristic rubber-band controller, not a reinforcement-learned policy.
// Kept modular so the driving logic can be swapped without touching the
// rest of the game.
const TamCar = (function () {
  const state = {
    z: 0,
    x: 0,
    speed: 0,
  };

  function reset() {
    state.z = 0;
    state.x = 0;
    state.speed = 0;
  }

  function worldX() {
    return state.x * CONFIG.ROAD.roadWidth;
  }

  function update(dt, playerZ) {
    const c = CONFIG.CAR;
    const t = CONFIG.TAM;
    const segment = Road.findSegment(state.z);

    // Follow a sensible racing line: ease toward the inside of the curve
    // ahead rather than hugging dead center.
    const targetX = Utils.clamp(-segment.curve * 0.12, -0.6, 0.6);
    state.x = Utils.lerp(state.x, targetX, Math.min(1, dt * 1.5));

    // Rubber banding: TAM eases off when well ahead of the player and
    // pushes harder when well behind, so races stay close without ever
    // looking obviously scripted.
    const gap = state.z - playerZ;
    const rubberBand = Utils.clamp(-gap * t.rubberBandStrength, -t.rubberBandMax, t.rubberBandMax);
    const targetSpeed = c.maxSpeed * (t.baseSpeedFactor + rubberBand);

    state.speed = Utils.lerp(state.speed, Utils.clamp(targetSpeed, 0, c.maxSpeed * 0.98), Math.min(1, dt * 0.8));
    state.z += state.speed * dt;
  }

  return { state, reset, worldX, update };
})();
