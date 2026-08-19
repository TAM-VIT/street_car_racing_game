# Cortex Rush - QA summary

Testing was done in Chrome (Playwright-driven) against the game served over
local HTTP, using a mix of real browser interaction, scripted play with real
DOM key events, and headless simulation for balance work.

---

## 1. Full user flow

Walked end to end with real clicks and typing: title, name entry, car and
colour selection, countdown, race, results, rematch, and return to menu.

| Check | Result |
| --- | --- |
| Title to name entry to car select to race | Pass |
| Name field focused automatically on entry | Pass |
| Model and colour selection update the live preview | Pass |
| Selected model and colour appear on the car in the race | Pass |
| Countdown runs 3, 2, 1, GO and locks controls until GO | Pass |
| Race finishes and shows results with leaderboard | Pass |
| Rematch restarts with the same name and car | Pass |
| Escape returns to the title from any screen, mid-race included | Pass |

A complete 81-second race was driven to the finish using real `keydown` and
`keyup` events, exercising the actual input layer, game loop and renderer
rather than calling internals.

---

## 2. Performance

Measured over 420 consecutive frames at full speed with obstacles, billboards
and scenery on screen:

| Metric | Result |
| --- | --- |
| Average | **60.1 fps** (16.65 ms) |
| 95th percentile frame | 17.1 ms |
| Worst frame | 17.8 ms |

No stutter, and no frame budget overrun near billboards or during collisions.

**Memory** across 12 consecutive races: heap held flat at 4.08 MB, and sprite
counts stayed constant at 938 rather than accumulating. Over 15 seconds of
sustained play the heap went from 4.38 MB to 3.76 MB after collection, so
there is no leak that would degrade a long booth session.

The hot loop allocates nothing per frame: projected screen objects are
allocated once per road point and mutated in place, and obstacles, billboards
and scenery are created once at track build and reused.

---

## 3. Input and injection safety

The player name is the only place user input reaches the page. It is
normalised in `Selection.setName` and inserted **only** via `textContent`,
never `innerHTML`.

| Input | Stored as | Rendered as |
| --- | --- | --- |
| `<img src=x onerror=alert(1)>` | `<img src=x o` (truncated) | Literal text, escaped |
| `<script>alert(1)</script>` | `<script>aler` (truncated) | Literal text, escaped |
| Empty | `PLAYER` | `PLAYER` |
| Whitespace only | `PLAYER` | `PLAYER` |
| 24 characters | Truncated to 12 | Fits the layout |
| Control characters + text | Control characters stripped | Clean text |
| Emoji | Counted as one code point | Never split mid-surrogate |

Verified after rendering a hostile name on the results screen: the heading's
`innerHTML` read `&lt;img src=x o wins`, **zero** `<img>` elements were
created, and the script count was unchanged. No `eval` and no execution of any
user-provided string appears anywhere in the codebase.

---

## 4. Robustness for a public booth

| Check | Result |
| --- | --- |
| All four arrow keys held at once | No crash; values stay finite; brake correctly wins over throttle |
| Rapid and simultaneous key presses | Movement stays stable |
| Focus lost mid-race (`blur`) | Key state cleared, so no key sticks down |
| Tab hidden mid-race | Key state cleared |
| Arrow keys while typing a name | Move the caret; driving input ignored |
| Page refreshed mid-race | Returns cleanly to the title screen |
| Window resized mid-race | Canvas and HUD re-layout correctly |
| Player unable to get stuck | Escape always returns to the title |

**Resize** was verified at 1280x720, 900x600 and 1800x600. The HUD scales from
whichever viewport axis is tighter, so panels stay proportionate on a short
ultra-wide monitor as well as a small laptop screen, and the player's car is
sized the same way so it never overruns the bottom bar.

---

## 5. Balance

TAM's win rate was measured by simulating races headlessly with a modelled
player that reacts to obstacles imperfectly, across multiple track layouts and
skill levels.

| Sample | Result |
| --- | --- |
| Races simulated | 420 |
| Track layouts | 14 |
| Player skill levels | 3 |
| **TAM win rate** | **35%** |
| Average race duration | 71 to 74 seconds |
| Average obstacles hit | 4.3 |

This sits inside the 30 to 40 percent target, and race duration is inside the
60 to 90 second target.

Sensitivity, on the same harness: `baseSpeedFactor` 0.965 gives 10%, 0.97 gives
17%, 0.976 gives 35%, and 0.98 gives 41%.

---

## 6. Bugs found and fixed during testing

These were all caught by testing rather than by reading the code, and are
worth recording:

1. **Collisions did not register at speed.** At maximum speed the car covers
   about 367 world units per tick against a 200 unit segment, so it skipped
   roughly 1.8 segments per frame. Collision detection only checked the
   segment the car landed on, so obstacles were tunnelled straight through.
   Fixed by sweeping every segment crossed during the tick. Verified: all 38
   obstacles on the centre line now register, versus a handful before.

2. **Curves steered the car for you.** The centrifugal pull was computed at 5.0
   to 7.4 lateral units per second while maximum steering was only 0.99, so the
   curve physically overpowered player input and dragged the car off the road.
   Fixed by reducing the coefficient so the pull is a drift the player leans
   against, not a force that outruns steering.

3. **The race was four times too short.** The original track length gave a
   15 second race against the 60 to 90 second requirement. Fixed by sizing
   `totalSegments` from max speed.

4. **TAM could never win.** TAM's speed ceiling sat below the player's maximum,
   so a player holding the throttle could not be caught: TAM won 0% of
   simulated races. Fixed by raising the ceiling above the player's maximum so
   rubber banding can actually close a gap.

5. **The finish was decided by the rubber band, not by driving.** With rubber
   banding at full strength to the line, a 0.015 change in TAM's base speed
   flipped the win rate from 26% to 98%: effectively a coin flip with a fixed
   bias, and the outcome felt scripted. Fixed by fading the rubber band over
   the closing quarter of the race, which both removed the cliff and made the
   win rate respond smoothly to tuning.

6. **Losing ended your race early.** TAM crossing the line ended the race
   immediately, cutting the player's run short mid-corner. Now only the player
   finishing ends the race; TAM parks at the line and the HUD switches to
   "TAM FINISHED - RACE TO THE LINE".

7. **TAM hid the obstacles behind it.** Running directly behind TAM occluded
   the road ahead. TAM now fades as it fills the view, while its name tag
   stays fully opaque so it is never ambiguous.

8. **Distant grass shimmered into stripes.** Grass was filled per segment with
   a one-pixel minimum height, so sub-pixel segments near the horizon
   overlapped into hard banding. Fixed by painting sky and ground once per
   frame and only adding a grass band for segments that own real pixels.

9. **Billboards slid off screen before they were readable.** They were placed
   2.6 road half-widths out, so at close range the poster was pushed past the
   screen edge. Moved to 1.4.

---

## 7. Accessibility

- Every interactive control is a real `<button>` or `<input>`, reachable and
  operable by keyboard, with a visible focus ring.
- Colour swatches carry `aria-label`s naming the colour, and selection state
  is exposed with `aria-pressed`.
- The mute control is always reachable, including mid-race, and is also bound
  to `M`.
- `prefers-reduced-motion` is respected: the off-road rumble shake is skipped
  and UI transitions are reduced to near zero.
- HUD text is drawn on translucent panels so it stays legible against the
  moving scene.

---

## 8. Known limitations

- Desktop keyboard only. There are no touch or gamepad controls.
- Session best times and the leaderboard are in memory only and reset on page
  reload, as specified.
- TAM does not collide with obstacles; it steers to avoid them and is not
  penalised if its avoidance fails.
- Firefox and Edge were not exercised in this automated pass. Chrome was the
  primary target and the code uses no Chrome-only APIs, but a manual smoke
  test in both is worth doing before the booth opens.
