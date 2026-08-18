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

  function findSegment(z) {
    const total = segments.length * CONFIG.ROAD.segmentLength;
    let idx = Math.floor(z / CONFIG.ROAD.segmentLength) % segments.length;
    if (idx < 0) idx += segments.length;
    return segments[idx];
  }

  function reset() {
    segments.length = 0;
  }

  function build() {
    reset();
    addStraight(CONFIG.ROAD.totalSegments);
  }

  return {
    segments,
    build,
    findSegment,
    get length() {
      return segments.length * CONFIG.ROAD.segmentLength;
    },
  };
})();
