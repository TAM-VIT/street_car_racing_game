// Cortex Rush - screen flow: shows one screen at a time and wires the
// controls that move between them.
const Screens = (function () {
  const SCREEN_BY_STATE = {
    [GameState.TITLE]: "screen-title",
    [GameState.NAME_ENTRY]: "screen-name",
    [GameState.CAR_SELECT]: "screen-car",
    [GameState.RESULTS]: "screen-results",
  };

  const nameInput = document.getElementById("name-input");
  const previewCanvas = document.getElementById("car-preview");
  const previewCtx = previewCanvas.getContext("2d");

  function showFor(state) {
    Object.keys(SCREEN_BY_STATE).forEach((key) => {
      document.getElementById(SCREEN_BY_STATE[key]).hidden = key !== state;
    });

    // Focus the first meaningful control so the flow is keyboard-navigable
    // and a booth visitor can type their name without reaching for a mouse.
    const visible = SCREEN_BY_STATE[state];
    if (!visible) return;
    const target = document.getElementById(visible).querySelector("input, button");
    if (target) target.focus();
  }

  function renderPreview() {
    const w = previewCanvas.width;
    const h = previewCanvas.height;
    previewCtx.clearRect(0, 0, w, h);
    RoadRenderer.drawCarSprite(
      previewCtx,
      w / 2,
      h * 0.78,
      w * 0.52,
      Selection.colorHex(),
      null,
      Selection.model()
    );
  }

  function buildChips() {
    const modelChips = document.getElementById("model-chips");
    const colorChips = document.getElementById("color-chips");

    CarCatalog.MODELS.forEach((model) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip";
      btn.textContent = model.name;
      btn.setAttribute("aria-pressed", String(model.id === Selection.state.modelId));
      btn.addEventListener("click", () => {
        Selection.state.modelId = model.id;
        syncChips();
        renderPreview();
      });
      modelChips.appendChild(btn);
    });

    CarCatalog.COLORS.forEach((color) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip chip-color";
      btn.style.background = color.hex;
      btn.title = color.name;
      btn.setAttribute("aria-label", color.name);
      btn.setAttribute("aria-pressed", String(color.id === Selection.state.colorId));
      btn.addEventListener("click", () => {
        Selection.state.colorId = color.id;
        syncChips();
        renderPreview();
      });
      colorChips.appendChild(btn);
    });
  }

  function syncChips() {
    const modelBtns = document.getElementById("model-chips").children;
    for (let i = 0; i < modelBtns.length; i++) {
      const pressed = CarCatalog.MODELS[i].id === Selection.state.modelId;
      modelBtns[i].setAttribute("aria-pressed", String(pressed));
    }
    const colorBtns = document.getElementById("color-chips").children;
    for (let i = 0; i < colorBtns.length; i++) {
      const pressed = CarCatalog.COLORS[i].id === Selection.state.colorId;
      colorBtns[i].setAttribute("aria-pressed", String(pressed));
    }
  }

  const ACTIONS = {
    "to-title": () => GameStateMachine.set(GameState.TITLE),
    "to-name": () => GameStateMachine.set(GameState.NAME_ENTRY),
    "to-car": () => {
      Selection.setName(nameInput.value);
      GameStateMachine.set(GameState.CAR_SELECT);
    },
    "start-race": () => startRace(),
    rematch: () => startRace(),
  };

  function startRace() {
    Race.start();
    GameStateMachine.set(GameState.RACE);
  }

  function init() {
    buildChips();
    renderPreview();

    document.addEventListener("click", (e) => {
      const action = e.target.closest("[data-action]");
      if (!action) return;
      const handler = ACTIONS[action.dataset.action];
      if (handler) handler();
    });

    // Enter submits the name field, matching the on-screen Continue button.
    nameInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") ACTIONS["to-car"]();
      e.stopPropagation();
    });

    GameStateMachine.onChange((next) => showFor(next));
    showFor(GameStateMachine.get());
  }

  return { init, showFor, renderPreview };
})();
