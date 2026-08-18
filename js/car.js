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
  }

  function worldX() {
    return state.x * CONFIG.ROAD.roadWidth;
  }

  return { state, reset, worldX };
})();
