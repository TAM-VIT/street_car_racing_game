// Cortex Rush - pseudo-3D road: segment data structure and track builder.
const Road = (function () {
  const segments = [];

  function lastY() {
    return segments.length === 0 ? 0 : segments[segments.length - 1].p2.world.y;
  }

  function addSegment(curve, y) {
    const n = segments.length;
    segments.push({
      index: n,
      curve: curve,
      p1: { world: { z: n * CONFIG.ROAD.segmentLength, y: lastY() } },
      p2: { world: { z: (n + 1) * CONFIG.ROAD.segmentLength, y: y } },
      sprites: [],
      obstacles: [],
      color:
        Math.floor(n / CONFIG.ROAD.rumbleLength) % 2 === 0 ? "light" : "dark",
    });
  }

  function addStraight(numSegments) {
    for (let i = 0; i < numSegments; i++) addSegment(0, 0);
  }

  // A gentle curve section: eased entry, a hold at full curvature, eased exit.
  function addCurve(enter, hold, leave, curve) {
    for (let i = 0; i < enter; i++) addSegment(Utils.easeIn(0, curve, i / enter), 0);
    for (let i = 0; i < hold; i++) addSegment(curve, 0);
    for (let i = 0; i < leave; i++) addSegment(Utils.easeInOut(curve, 0, i / leave), 0);
  }

  function findSegment(z) {
    const total = segments.length * CONFIG.ROAD.segmentLength;
    let idx = Math.floor(z / CONFIG.ROAD.segmentLength) % segments.length;
    if (idx < 0) idx += segments.length;
    return segments[idx];
  }

  function reset() {
    segments.length = 0;
  }

  // Mostly straight track with occasional gentle curves, built from a
  // repeating pattern until the configured total length is reached.
  function build() {
    reset();

    addStraight(120); // start straight, gives the player time to build speed

    const C = CONFIG.ROAD.curveStrength;

    // Corner lengths are set in seconds of driving, not raw segment counts.
    // At max speed the car covers ~110 segments per second, so the short
    // corners this track originally used were over in about a second and a
    // half: too brief for the curve to push the car anywhere before the next
    // bend cancelled it out. These are long enough to have to be driven.
    const pattern = [
      { straight: 150 },
      { curve: { enter: 120, hold: 260, leave: 120, curve: C } },
      { straight: 120 },
      { curve: { enter: 140, hold: 320, leave: 140, curve: -C * 1.25 } },
      { straight: 90 },
      { curve: { enter: 110, hold: 220, leave: 110, curve: C * 0.7 } },
      { straight: 170 },
      { curve: { enter: 130, hold: 300, leave: 130, curve: -C * 0.85 } },
      { straight: 110 },
      { curve: { enter: 120, hold: 280, leave: 120, curve: C * 1.4 } },
      { straight: 140 },
      { curve: { enter: 140, hold: 240, leave: 140, curve: -C } },
      { straight: 160 },
    ];

    let p = 0;
    while (segments.length < CONFIG.ROAD.totalSegments - 100) {
      const step = pattern[p % pattern.length];
      if (step.straight) addStraight(step.straight);
      else addCurve(step.curve.enter, step.curve.hold, step.curve.leave, step.curve.curve);
      p++;
    }

    addStraight(CONFIG.ROAD.totalSegments - segments.length); // finish straight

    // Visible start and finish lines.
    segments[1].line = "start";
    segments[2].line = "start";
    segments[segments.length - 2].line = "finish";
    segments[segments.length - 1].line = "finish";
  }

  return {
    segments,
    build,
    findSegment,
    addStraight,
    addCurve,
    get length() {
      return segments.length * CONFIG.ROAD.segmentLength;
    },
  };
})();
