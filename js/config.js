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
    // Single value controlling race length. At CAR.maxSpeed this works out
    // to roughly 68 seconds: totalSegments * segmentLength / maxSpeed.
    totalSegments: 7500,
    curveStrength: 5.5, // base curvature; raise for a twistier course
    fieldOfView: 100,
    cameraHeight: 1000,
    drawDistance: 300, // segments drawn ahead
    tamFadeDistance: 9000, // world units within which TAM fades so obstacles stay visible
    tamMinOpacity: 0.35,
    tamFadeLateral: 0.55, // lateral gap (road half-widths) beyond which TAM never fades
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
    // Curve push per unit of curve * speed. Must stay well under steerRate:
    // the pull should be a drift the player leans against, never a force
    // that outruns steering and drags the car off the road on its own.
    centrifugalStrength: 0.00004,
    obstacleSpeedPenalty: 7000, // speed lost instantly on collision
    obstacleControlDisruption: 0.6, // seconds of reduced steering after a hit
  },

  // TAM's difficulty knobs. Target: TAM wins roughly 30-40% of races. Raise
  // baseSpeedFactor or rubberBandStrength to make TAM harder to shake;
  // raise mistakeFrequency or lower avoidanceSkill to make TAM easier.
  //
  // On why TAM's speed is not simply equal to the player's: both factors
  // below are expressed relative to CAR.maxSpeed. TAM *cruises* at 0.976 of
  // it, so a clean flat-out lap by the player is genuinely faster than TAM.
  // The 1.12 ceiling is only ever reached while rubber banding is pulling
  // TAM back into contention from behind. Matching the two exactly would
  // make catching up impossible and TAM would win 0% of races, which is
  // what happened before this was tuned. See QA.md.
  TAM: {
    baseSpeedFactor: 0.976, // TAM's speed relative to player max speed, before rubber banding
    maxSpeedFactor: 1.12, // TAM's hard speed ceiling, relative to player max speed
    speedResponse: 0.8, // how quickly TAM's speed eases toward its target
    rubberBandStrength: 0.0000045, // how strongly the gap (world units) shifts TAM's target speed
    rubberBandMax: 0.13, // cap on the rubber band adjustment
    rubberBandFadeStart: 0.75, // race progress at which rubber banding starts fading out
    avoidanceSkill: 0.9, // 0-1, how decisively TAM dodges a spotted obstacle
    // Must be far enough ahead that TAM can actually complete the dodge:
    // at max speed 90 segments is ~0.8s of warning, and steering covers
    // roughly one lane in that time.
    avoidanceLookaheadSegments: 90,
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

  RACE: {
    countdownSeconds: 3.6, // 3, 2, 1, GO
  },

  AUDIO: {
    masterVolume: 0.35, // deliberately modest: this runs at a public booth
    engineBaseHz: 55,
    engineSweepHz: 210, // added to the base pitch at full speed
    engineVolume: 0.06,
    collisionVolume: 0.22,
    uiVolume: 0.12,
  },

  HUD: {
    displayTopSpeedKph: 320, // speed shown on the HUD when at max speed
    metresPerWorldUnit: 90, // converts world units to the metre figures shown to the player
  },

  NAME: {
    maxLength: 12,
    defaultName: "PLAYER",
  },

  // To swap the billboard artwork, drop a new image into assets/ and point
  // `path` at it. Any format the browser can render works (png, jpg, svg).
  // A wide, landscape image reads best at the billboard's 15:8 aspect.
  POSTER: {
    path: "assets/poster.jpeg",
  },
};
