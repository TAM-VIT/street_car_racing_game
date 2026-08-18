// Cortex Rush - central tunable configuration.
// Change values here to rebalance the game without touching game logic.
const CONFIG = {
  CANVAS: {
    baseWidth: 1280,
    baseHeight: 720,
  },

  ROAD: {
    segmentLength: 200, // world units per road segment
    roadWidth: 2000, // half-width of the road in world units
    rumbleLength: 3, // segments per rumble strip stripe
    lanes: 3,
    totalSegments: 1400, // ~60-90s race length at full speed, single config value
    fieldOfView: 100,
    cameraHeight: 1000,
    drawDistance: 300, // segments drawn ahead
  },

  NAME: {
    maxLength: 12,
    defaultName: "PLAYER",
  },

  POSTER: {
    // Drop the event poster image here (png/jpg/svg). Documented in README.
    path: "assets/poster.svg",
  },
};
