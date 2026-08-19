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

  // While a text field has focus the arrow keys belong to the field, so
  // driving input is ignored and the caret moves normally.
  function isTyping() {
    const el = document.activeElement;
    return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA");
  }

  function onKeyDown(e) {
    const key = CODE_MAP[e.code];
    if (!key || isTyping()) return;
    keys[key] = true;
    e.preventDefault();
  }

  function onKeyUp(e) {
    const key = CODE_MAP[e.code];
    if (!key) return;
    keys[key] = false;
    e.preventDefault();
  }

  function resetAll() {
    keys.left = false;
    keys.right = false;
    keys.up = false;
    keys.down = false;
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);

  // Losing focus mid-race swallows the matching keyup, which would leave a
  // key stuck in the pressed state. Clearing on blur and on tab hide keeps
  // the car from driving itself while the player is looking away.
  window.addEventListener("blur", resetAll);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) resetAll();
  });

  return {
    keys,
    resetAll,
  };
})();
