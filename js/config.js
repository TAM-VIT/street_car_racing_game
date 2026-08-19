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

  CAR: {
    maxSpeed: 22000, // world units / second at full throttle
    accel: 9000, // speed gained per second while accelerating
    brakeDecel: 16000, // speed lost per second while braking
    naturalDecel: 3500, // speed lost per second with no input (engine braking)
    offRoadDecel: 9000, // extra speed lost per second while off the road
    offRoadMaxSpeed: 9000, // speed cap while off the road
    steerRate: 2.2, // lateral units/sec at low speed
    steerHighSpeedFactor: 0.45, // multiplier applied to steerRate at max speed
    centrifugalStrength: 0.0009, // curve push per unit of curve * speed
    obstacleSpeedPenalty: 7000, // speed lost instantly on collision
    obstacleControlDisruption: 0.6, // seconds of reduced steering after a hit
  },

  // TAM's difficulty knobs. Target: TAM wins roughly 30-40% of races. Raise
  // baseSpeedFactor or rubberBandStrength to make TAM harder to shake;
  // raise mistakeFrequency or lower avoidanceSkill to make TAM easier.
  TAM: {
    baseSpeedFactor: 0.86, // TAM's speed relative to player max speed, before rubber banding
    rubberBandStrength: 0.0000045, // how strongly the gap (world units) shifts TAM's target speed
    rubberBandMax: 0.16, // cap on the rubber band adjustment
    avoidanceSkill: 0.9, // 0-1, how decisively TAM dodges a spotted obstacle
    avoidanceLookaheadSegments: 10, // how many segments ahead TAM scans for obstacles
    avoidanceTriggerMargin: 0.25, // extra clearance added to an obstacle's radius before TAM reacts
    steerLerpSpeed: 2.2, // how quickly TAM's lane position eases toward its target line
    mistakeFrequency: 0.35, // chance of a brief mistake each pace-check interval
    mistakeCheckIntervalMin: 3, // seconds
    mistakeCheckIntervalRange: 4, // seconds, added on top of the min
    mistakeDurationMin: 0.5, // seconds
    mistakeDurationRange: 0.6, // seconds, added on top of the min
    mistakeSlowdown: 0.72, // speed multiplier while a mistake is active
    paceCheckIntervalMin: 4, // seconds
    paceCheckIntervalRange: 3, // seconds, added on top of the min
    paceNoiseAmplitude: 0.08, // max fractional speed drift from pace variation
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
