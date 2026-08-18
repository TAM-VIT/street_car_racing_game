// Cortex Rush - player car: world position and lane offset.
// x is expressed as a fraction of the road half-width (0 = center line,
// +-1 = road edge, beyond that is off-road grass/shoulder).
const PlayerCar = (function () {
  const state = {
    z: 0, // distance traveled along the track
    x: 0, // lateral offset, fraction of road half-width
    speed: 0,
  };

  function reset() {
    state.z = 0;
    state.x = 0;
    state.speed = 0;
    state.offRoad = false;
    state.controlDisruption = 0;
  }

  function worldX() {
    return state.x * CONFIG.ROAD.roadWidth;
  }

  function update(dt, keys) {
    const c = CONFIG.CAR;

    if (keys.up) {
      state.speed += c.accel * dt;
    } else if (keys.down) {
      state.speed -= c.brakeDecel * dt;
    } else {
      state.speed -= c.naturalDecel * dt;
    }

    state.speed = Utils.clamp(state.speed, 0, c.maxSpeed);
    state.z += state.speed * dt;

    // Steering scales with speed: tight and responsive when slow, a little
    // harder to place at high speed, so dodging obstacles takes skill.
    const speedRatio = state.speed / c.maxSpeed;
    const steer = Utils.lerp(c.steerRate, c.steerRate * c.steerHighSpeedFactor, speedRatio);
    if (keys.left) state.x -= steer * dt;
    if (keys.right) state.x += steer * dt;

    // On curves the road pushes the car outward slightly at speed,
    // encouraging the player to steer into the curve. Kept subtle.
    const segment = Road.findSegment(state.z);
    state.x += segment.curve * speedRatio * speedRatio * c.centrifugalStrength * dt * 1000;

    // Off-road (past the road edge, onto grass/shoulder) slows the car and
    // caps how fast it can go until the player steers back on.
    state.offRoad = Math.abs(state.x) > 1;
    if (state.offRoad) {
      state.speed -= c.offRoadDecel * dt;
      state.speed = Utils.clamp(state.speed, 0, c.offRoadMaxSpeed);
    }

    state.x = Utils.clamp(state.x, -2, 2);
  }

  return { state, reset, worldX, update };
})();
