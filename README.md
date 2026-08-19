# Cortex Rush

A browser-based, keyboard-controlled racing game built as a booth demo and
promotional piece for the **Code Cortex 3.0** hackathon.

You race a car down a curving road against an AI opponent named TAM, dodging
cones, oil drums and barriers while event branding passes by on roadside
billboards.

---

## Running the game

The game is plain HTML, CSS and vanilla JavaScript with an HTML5 Canvas 2D
renderer. There is no build step and no install.

Because the game loads the poster image, browsers block it from a `file://`
URL, so serve the folder over HTTP:

```bash
# from the project root, pick whichever you have
python -m http.server 8000
# or
npx serve .
```

Then open <http://localhost:8000> in Chrome.

Once loaded the game runs entirely offline. It makes no network calls at
runtime and has no backend, database or accounts.

**Browsers:** Chrome is the primary target. Edge and Firefox also work.
Desktop keyboard only; there are no touch controls.

---

## Controls

| Key | Action |
| --- | --- |
| Up arrow | Accelerate |
| Down arrow | Brake |
| Left / Right arrow | Steer |
| `M` | Mute or unmute sound |
| `Escape` | Return to the title screen from anywhere |

Steering sensitivity scales with speed, so the car turns tightly when slow and
takes a firmer hand at pace. Drifting onto the grass slows you down and adds a
rumble, so staying on the road is worth doing.

---

## Swapping the event poster

The poster shown on the roadside billboards lives in one place:

1. Drop your image into `assets/` (png, jpg or svg all work).
2. Point `CONFIG.POSTER.path` in [`js/config.js`](js/config.js) at it.

```js
POSTER: {
  path: "assets/poster.jpeg",
},
```

A wide landscape image reads best; the billboard renders at roughly a 15:8
aspect ratio. Nothing else needs editing, and the game falls back to a drawn
placeholder if the file is missing.

---

## Tuning the game

Every value worth adjusting is gathered in [`js/config.js`](js/config.js),
grouped and commented. Nothing in the game logic needs to be touched to
rebalance it.

| Group | Controls |
| --- | --- |
| `ROAD` | Race length (`totalSegments`), curve strength, draw distance |
| `CAR` | Max speed, acceleration, braking, steering, off-road and collision penalties |
| `TAM` | Difficulty: base speed, rubber banding, mistake rate, obstacle avoidance |
| `RACE` | Countdown length |
| `AUDIO` | Volumes and engine pitch range |
| `HUD` | Displayed top speed |
| `NAME` | Maximum name length and the default name |
| `POSTER` | Billboard artwork path |

**Race length** is a single value: `ROAD.totalSegments`. At the default max
speed the race runs about 68 seconds of flat-out driving, and 70 to 85 seconds
in practice once obstacles cost you time.

**TAM's difficulty** is centred on `TAM.baseSpeedFactor`. Raise it to make TAM
harder, lower it to make TAM easier. It is sensitive: 0.976 gives roughly a 35%
TAM win rate, while 0.98 pushes it past 40%.

Adding a car model or colour is a one-place change too: append an entry to
`MODELS` or `COLORS` in [`js/cars.js`](js/cars.js) and it appears in the
selection screen and the race automatically.

---

## How TAM works, honestly

**TAM is a hand-tuned heuristic controller, not a reinforcement-learned
policy.** Please describe it that way in any public material about the game.

TAM drives with:

- a target speed set relative to the player's maximum,
- **rubber banding** that eases TAM off when it is well ahead and pushes it
  harder when it falls behind, so races stay close,
- obstacle avoidance using a lookahead scan of the road ahead,
- small random pace variation and occasional brief mistakes, so no two races
  play out identically.

The rubber band deliberately **fades out over the final quarter of the race**.
Held at full strength to the line it decides the winner by itself, which makes
the finish feel scripted; fading it hands the endgame back to real pace and to
whatever mistakes each driver made.

Because rubber banding is what keeps the race close, TAM's speed is not fixed
to the player's. Its cruising speed sits slightly *below* the player's maximum,
and its ceiling sits above, reachable only while catching up. This is what the
rubber banding requirement means in practice.

The driving logic is isolated in [`js/tam.js`](js/tam.js) behind a small
interface, so a genuinely trained policy could be swapped in without touching
the rest of the game. If the club wants the RL claim to be truthful, that is
the file to replace, and the heuristic can stay as a safety fallback.

Measured over 420 simulated races across 14 track layouts and three player
skill levels, TAM currently wins **about 35%** of races.

---

## Project layout

```
index.html          markup for every screen and the script order
css/style.css       design tokens, screen styling, HUD chrome
assets/poster.jpeg  event artwork shown on the billboards
js/
  config.js         all tunable values, in one place
  utils.js          math helpers and a seedable RNG
  input.js          per-frame key state tracking
  state.js          game state machine
  road.js           road segment data and the track builder
  renderer.js       pseudo-3D projection, scenery, cars, obstacles
  cars.js           selectable car models and colours
  selection.js      chosen name, model and colour, plus name sanitising
  world.js          obstacles, billboards, scenery, collision detection
  tam.js            the AI opponent
  race.js           countdown, timing and finish detection
  hud.js            mini map, timer, speed, progress bar, countdown
  audio.js          synthesised engine and effect sounds
  screens.js        screen flow, car preview, results and leaderboard
  main.js           canvas setup and the fixed-timestep game loop
```

**Rendering** uses the classic pseudo-3D projected road technique: the road is
a list of segments projected from world space to screen space and drawn as
trapezoids, far to near. It gives depth and a strong sense of speed while
staying cheap enough to hold 60 frames per second on modest hardware.

**The game loop** in `main.js` runs a fixed timestep with an accumulator, so
handling and speed are identical regardless of the machine's frame rate.

**Input** is read as per-frame key state rather than from key events, so
controls are instantaneous and continuous with no key-repeat delay, and
holding several keys at once behaves predictably.

See [QA.md](QA.md) for the testing summary.

---

## Credits

Built for the AI/ML club's Code Cortex 3.0 hackathon booth.

Car models are original vector artwork, not renders of any real vehicle.
