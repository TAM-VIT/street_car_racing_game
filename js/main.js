// Cortex Rush - entry point: canvas setup and resize handling.
(function () {
  const canvas = document.getElementById("race-canvas");
  const ctx = canvas.getContext("2d");

  function resizeCanvas() {
    const root = document.getElementById("game-root");
    const dpr = window.devicePixelRatio || 1;
    const width = root.clientWidth;
    const height = root.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener("resize", resizeCanvas);
  resizeCanvas();

  window.Game = window.Game || {};
  window.Game.canvas = canvas;
  window.Game.ctx = ctx;

  Road.build();
  PlayerCar.reset();
  const worldRng = Utils.createRng(Date.now() & 0xffffffff);
  World.placeObstacles(worldRng);
  World.placeBillboards(worldRng);
  window.Game.render = function (ctx, state) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    RoadRenderer.render(ctx, width, height, PlayerCar.state.z, PlayerCar.worldX());
  };

  // Fixed timestep update with an accumulator so gameplay speed is
  // identical regardless of the machine's actual frame rate.
  const STEP = 1 / 60;
  const MAX_FRAME = 0.25; // clamp huge gaps (tab switch, breakpoint) to avoid spiral of death
  let lastTime = performance.now();
  let accumulator = 0;

  function update(dt) {
    if (GameStateMachine.get() === GameState.RACE) {
      PlayerCar.update(dt, Input.keys);
    }
    if (window.Game.update) window.Game.update(dt);
  }

  function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (window.Game.render) {
      window.Game.render(ctx, GameStateMachine.get());
    }
  }

  function frame(now) {
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > MAX_FRAME) dt = MAX_FRAME;
    accumulator += dt;

    while (accumulator >= STEP) {
      update(STEP);
      accumulator -= STEP;
    }

    render();
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
