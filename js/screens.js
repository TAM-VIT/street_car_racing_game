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
    "toggle-mute": () => syncMuteButton(Audio.toggleMute()),
  };

  function syncMuteButton(muted) {
    const btn = document.getElementById("mute-toggle");
    btn.setAttribute("aria-pressed", String(muted));
    btn.textContent = muted ? "Sound off" : "Sound on";
    btn.title = muted ? "Unmute sound (M)" : "Mute sound (M)";
  }

  function startRace() {
    Race.start();
    Audio.startEngine();
    GameStateMachine.set(GameState.RACE);
  }

  let bestTime = null; // session only, resets on reload

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    const cs = Math.floor((seconds * 100) % 100);
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
  }

  function addStat(list, label, value) {
    const dt = document.createElement("dt");
    dt.textContent = label;
    const dd = document.createElement("dd");
    dd.textContent = value;
    const wrap = document.createElement("div");
    wrap.className = "stat";
    wrap.append(dt, dd);
    list.appendChild(wrap);
  }

  function renderResults() {
    const won = Race.state.winner === "player";
    const heading = document.getElementById("result-heading");
    const stats = document.getElementById("result-stats");
    const summary = document.getElementById("result-summary");

    // The player name is user input, so it is only ever set via textContent.
    heading.textContent = won
      ? `${Selection.state.name} wins`
      : "TAM wins";
    heading.className = `heading ${won ? "outcome-win" : "outcome-loss"}`;

    const time = Race.state.playerFinishTime || Race.state.elapsed;
    if (won && (bestTime === null || time < bestTime)) bestTime = time;

    stats.replaceChildren();
    addStat(stats, "Your time", formatTime(time));
    addStat(stats, "Position", won ? "1st" : "2nd");
    addStat(stats, "Obstacles hit", String(PlayerCar.state.hitCount));
    addStat(stats, "Session best", bestTime === null ? "--:--.--" : formatTime(bestTime));

    const gapSeconds = Math.abs(time - (Race.state.tamFinishTime || time));
    summary.textContent = won
      ? `You crossed the line ${gapSeconds.toFixed(2)}s ahead of TAM.`
      : `TAM took it by ${gapSeconds.toFixed(2)}s. Run it back.`;

    renderLeaderboard(time);
  }

  // Finishing order for this race, plus every result from the session so the
  // booth builds a running scoreboard across visitors.
  const sessionResults = [];

  function renderLeaderboard(playerTime) {
    const list = document.getElementById("result-leaderboard");
    list.replaceChildren();

    sessionResults.push({ name: Selection.state.name, time: playerTime });
    sessionResults.sort((a, b) => a.time - b.time);

    const race = [
      { name: Selection.state.name, time: playerTime, isPlayer: true },
      { name: "TAM", time: Race.state.tamFinishTime || playerTime, isPlayer: false },
    ].sort((a, b) => a.time - b.time);

    race.forEach((entry, i) => {
      const li = document.createElement("li");
      li.className = "lb-row" + (entry.isPlayer ? " lb-you" : "");

      const pos = document.createElement("span");
      pos.className = "lb-pos";
      pos.textContent = String(i + 1);

      const name = document.createElement("span");
      name.className = "lb-name";
      // User-supplied name: always textContent, never innerHTML.
      name.textContent = entry.name;

      const t = document.createElement("span");
      t.className = "lb-time";
      t.textContent = formatTime(entry.time);

      li.append(pos, name, t);
      list.appendChild(li);
    });

    if (sessionResults.length > 1) {
      const head = document.createElement("li");
      head.className = "lb-head";
      head.textContent = "Best times this session";
      list.appendChild(head);

      sessionResults.slice(0, 3).forEach((entry, i) => {
        const li = document.createElement("li");
        li.className = "lb-row lb-session";
        const pos = document.createElement("span");
        pos.className = "lb-pos";
        pos.textContent = String(i + 1);
        const name = document.createElement("span");
        name.className = "lb-name";
        name.textContent = entry.name;
        const t = document.createElement("span");
        t.className = "lb-time";
        t.textContent = formatTime(entry.time);
        li.append(pos, name, t);
        list.appendChild(li);
      });
    }
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

    // A booth player must never be able to get stuck. Escape always backs
    // out to the title screen, from any screen including mid-race.
    document.addEventListener("keydown", (e) => {
      if (e.target === nameInput) return;
      if (e.key === "Escape") {
        Input.resetAll();
        GameStateMachine.set(GameState.TITLE);
      } else if (e.key === "m" || e.key === "M") {
        syncMuteButton(Audio.toggleMute());
      }
    });

    GameStateMachine.onChange((next) => {
      if (next === GameState.RESULTS) renderResults();
      if (next !== GameState.RACE) Audio.stopEngine();
      showFor(next);
    });
    showFor(GameStateMachine.get());
  }

  return { init, showFor, renderPreview };
})();
