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

    const CURVE = 2.2; // gentle - the brief calls for only a little curviness
    const pattern = [
      { straight: 200 },
      { curve: { enter: 60, hold: 50, leave: 60, curve: CURVE } },
      { straight: 220 },
      { curve: { enter: 70, hold: 40, leave: 70, curve: -CURVE } },
      { straight: 180 },
      { curve: { enter: 50, hold: 60, leave: 50, curve: CURVE * 0.7 } },
      { straight: 240 },
    ];

    let p = 0;
    while (segments.length < CONFIG.ROAD.totalSegments - 100) {
      const step = pattern[p % pattern.length];
      if (step.straight) addStraight(step.straight);
      else addCurve(step.curve.enter, step.curve.hold, step.curve.leave, step.curve.curve);
      p++;
    }

    addStraight(CONFIG.ROAD.totalSegments - segments.length); // finish straight
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
