// Cortex Rush - race lifecycle: countdown, timing, finish detection.
const Race = (function () {
  const state = {
    elapsed: 0,
    countdown: 0,
    finished: false,
    playerFinishTime: 0,
    tamFinishTime: 0,
    winner: null,
  };

  function totalDistance() {
    return CONFIG.ROAD.totalSegments * CONFIG.ROAD.segmentLength;
  }

  function start(seed) {
    state.elapsed = 0;
    state.countdown = CONFIG.RACE.countdownSeconds;
    state.finished = false;
    state.playerFinishTime = 0;
    state.tamFinishTime = 0;
    state.winner = null;

    PlayerCar.reset();
    TamCar.reset(seed);
    World.resetObstacleHits();
  }

  function progress(z) {
    return Utils.clamp(z / totalDistance(), 0, 1);
  }

  function update(dt) {
    if (state.countdown > 0) {
      state.countdown -= dt;
      return;
    }
    if (state.finished) return;

    state.elapsed += dt;

    const finish = totalDistance();
    if (!state.playerFinishTime && PlayerCar.state.z >= finish) {
      state.playerFinishTime = state.elapsed;
    }
    if (!state.tamFinishTime && TamCar.state.z >= finish) {
      state.tamFinishTime = state.elapsed;
    }

    if (state.playerFinishTime || state.tamFinishTime) {
      state.finished = true;
      state.winner = state.playerFinishTime ? "player" : "tam";
      GameStateMachine.set(GameState.RESULTS);
    }
  }

  return { state, start, update, progress, totalDistance };
})();
