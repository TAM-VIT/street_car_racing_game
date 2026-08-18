// Cortex Rush - per-frame key state tracker.
// Keys are read as flags each update tick rather than reacted to on
// keydown/keyup directly, so there is no OS key-repeat delay and holding
// several keys at once behaves predictably.
const Input = (function () {
  const keys = {
    left: false,
    right: false,
    up: false,
    down: false,
  };

  const CODE_MAP = {
    ArrowLeft: "left",
    ArrowRight: "right",
    ArrowUp: "up",
    ArrowDown: "down",
  };

  function onKeyDown(e) {
    const key = CODE_MAP[e.code];
    if (key) {
      keys[key] = true;
      e.preventDefault();
    }
  }

  function onKeyUp(e) {
    const key = CODE_MAP[e.code];
    if (key) {
      keys[key] = false;
      e.preventDefault();
    }
  }

  function resetAll() {
    keys.left = false;
    keys.right = false;
    keys.up = false;
    keys.down = false;
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  return {
    keys,
    resetAll,
  };
})();
