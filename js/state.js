// Cortex Rush - game state machine enum and simple dispatcher.
const GameState = Object.freeze({
  TITLE: "title",
  NAME_ENTRY: "name_entry",
  CAR_SELECT: "car_select",
  COUNTDOWN: "countdown",
  RACE: "race",
  RESULTS: "results",
});

const GameStateMachine = (function () {
  let current = GameState.TITLE;
  const listeners = [];

  function set(next) {
    if (next === current) return;
    const prev = current;
    current = next;
    listeners.forEach((fn) => fn(next, prev));
  }

  function get() {
    return current;
  }

  function onChange(fn) {
    listeners.push(fn);
  }

  return { set, get, onChange };
})();
