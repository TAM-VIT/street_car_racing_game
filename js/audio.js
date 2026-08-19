// Cortex Rush - synthesised audio via the Web Audio API.
// Tones are generated at runtime rather than loaded from files, so the game
// stays a single self-contained folder with no binary audio assets and
// nothing to preload.
const Audio = (function () {
  let ctx = null;
  let engineOsc = null;
  let engineGain = null;
  let masterGain = null;
  let muted = false;
  let started = false;

  // Browsers block audio until a user gesture, so the context is created on
  // the first interaction rather than at load.
  function ensureContext() {
    if (ctx) return ctx;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    ctx = new AudioCtx();
    masterGain = ctx.createGain();
    masterGain.gain.value = muted ? 0 : CONFIG.AUDIO.masterVolume;
    masterGain.connect(ctx.destination);
    return ctx;
  }

  function startEngine() {
    if (!ensureContext() || started) return;
    engineOsc = ctx.createOscillator();
    engineGain = ctx.createGain();
    engineOsc.type = "sawtooth";
    engineOsc.frequency.value = CONFIG.AUDIO.engineBaseHz;
    engineGain.gain.value = 0;
    engineOsc.connect(engineGain);
    engineGain.connect(masterGain);
    engineOsc.start();
    started = true;
  }

  function stopEngine() {
    if (!started) return;
    engineOsc.stop();
    engineOsc.disconnect();
    engineGain.disconnect();
    engineOsc = null;
    engineGain = null;
    started = false;
  }

  // Engine pitch and volume track speed, giving an audible sense of pace.
  function updateEngine(speedRatio) {
    if (!started) return;
    const a = CONFIG.AUDIO;
    engineOsc.frequency.value = a.engineBaseHz + speedRatio * a.engineSweepHz;
    engineGain.gain.value = a.engineVolume * (0.35 + speedRatio * 0.65);
  }

  function beep(freq, duration, type, volume) {
    if (!ensureContext()) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || "square";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(masterGain);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  }

  function playCountdownTick() {
    beep(660, 0.12, "square", CONFIG.AUDIO.uiVolume);
  }

  function playCountdownGo() {
    beep(990, 0.35, "square", CONFIG.AUDIO.uiVolume);
  }

  function playCollision() {
    beep(90, 0.22, "sawtooth", CONFIG.AUDIO.collisionVolume);
  }

  function playFinish() {
    beep(880, 0.18, "triangle", CONFIG.AUDIO.uiVolume);
    setTimeout(() => beep(1320, 0.32, "triangle", CONFIG.AUDIO.uiVolume), 160);
  }

  function setMuted(next) {
    muted = next;
    if (masterGain) masterGain.gain.value = muted ? 0 : CONFIG.AUDIO.masterVolume;
    return muted;
  }

  function toggleMute() {
    return setMuted(!muted);
  }

  function isMuted() {
    return muted;
  }

  return {
    startEngine,
    stopEngine,
    updateEngine,
    playCountdownTick,
    playCountdownGo,
    playCollision,
    playFinish,
    toggleMute,
    setMuted,
    isMuted,
  };
})();
