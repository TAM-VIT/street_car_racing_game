# Product Requirements Document

## Project: Code Cortex 3.0 Racer (working title: Cortex Rush)

A browser based keyboard controlled racing game for the AI/ML club expo booth. The player races a car down a mostly straight, gently curving road against an AI opponent named TAM, dodging obstacles, while the game shows event branding on roadside billboards. The game is a booth demo and a promotional piece for the Code Cortex 3.0 hackathon. It must feel responsive, look decent, and never lag on a booth laptop.

Build this as a real, runnable project. Test it end to end before finishing. Details on required Git history are in section 15.

---

## 1. Goals and non goals

Goals:
- A polished single player race against one AI opponent (TAM) at medium difficulty.
- Instant, continuous keyboard control with no perceptible input lag.
- Decent, clean graphics running at a stable 60 frames per second.
- Clear on screen information: a mini map, live time and speed, and a race progress bar.
- Configurable event branding on billboards using a supplied poster image.
- A clean start to finish user flow suitable for a walk up booth: name entry, car and color selection, race, results, rematch.

Non goals:
- No multiplayer or networking.
- No account system, no backend, no database.
- No mobile or touch controls in version one. Desktop keyboard only.
- No monetisation, ads, or analytics.

---

## 2. Target platform and tech stack

- Runs fully in a modern desktop browser (target Chrome, since the booth laptop will use it). Should also work in Edge and Firefox.
- Runs offline once loaded. No external network calls at runtime.
- Recommended stack: plain HTML, CSS, and vanilla JavaScript with an HTML5 Canvas 2D renderer. No heavy game engine and no build step required, so it starts instantly and stays lightweight. A tiny bundler is acceptable if it helps organisation, but it is not required.
- Rendering approach: a pseudo 3D road racer using projected road segments (the classic OutRun style technique where the road is a list of segments projected to screen space). This gives a sense of speed and depth, supports curves and roadside objects, and runs at 60 frames per second on modest hardware. A top down 2D racer is an acceptable fallback only if the pseudo 3D renderer proves too complex, but pseudo 3D is strongly preferred because it looks more impressive.

---

## 3. Performance and responsiveness requirements

These are hard requirements, since a laggy booth game reflects badly on the club.

- Target a stable 60 frames per second on a mid range laptop. No stutter during normal play.
- Use requestAnimationFrame with a delta time or fixed timestep update loop so car speed and handling are identical regardless of the machine's frame rate.
- Input must be handled by tracking key state per frame, not by reacting to keydown or key repeat events. On keydown, set a flag true. On keyup, set it false. Each frame, read the flags and apply movement. This is what makes the controls feel instantaneous and continuous, with no initial repeat delay.
- Avoid per frame memory allocation in the hot loop. Reuse objects and pool roadside sprites and obstacles.
- Cap any particle or visual effects so a crash or effect never causes a frame drop.
- Keep static or rarely changing layers (for example, the sky or distant scenery) cheap to draw, using a separate cached layer if helpful.

---

## 4. User flow and screens

The flow, in order:

1. Title screen. Event branding for Code Cortex 3.0, the game title, and a prompt to begin. A single clear call to action to move to name entry.
2. Name entry. The player types a display name. Enforce a sensible maximum length (for example 12 characters). If left empty, use a default name such as PLAYER. See section 14 for input safety.
3. Car and color selection. The player picks one of at least three car models and one of at least five colors. Show a live preview of the chosen car in the chosen color. A confirm control moves to the start of the race.
4. Start race. A short countdown (3, 2, 1, go) then control unlocks. The race is against TAM.
5. Race screen. The core gameplay with the HUD described in section 9.
6. Results screen. Shown when the race ends. See below.

Results screen (this fills a requirement that was described only partially, so treat this as a proposed default and adjust as needed):
- Clear outcome heading: the player won or TAM won.
- The player's finish time.
- Final position (first or second).
- A short summary line, for example the gap to TAM and the number of obstacles hit.
- A prominent Rematch control that restarts a fresh race with the same car and name.
- A secondary control to return to the title or to change car and name.
- Optionally, a simple local best time display for the current session. This is in session memory only and resets when the page reloads, unless persistent storage is added later.

---

## 5. Controls and driving model

Controls:
- Left arrow: steer left.
- Right arrow: steer right.
- Up arrow: accelerate.
- Down arrow: brake, and if already stopped, a slow reverse is acceptable but optional.

Driving model requirements:
- Acceleration should ramp up to a maximum speed rather than being instant, so there is a sense of building pace.
- Braking should feel noticeably stronger than natural deceleration.
- Steering sensitivity should scale with speed. At high speed the car should feel a little harder to place, at low speed it should turn tightly. This makes obstacle dodging feel skilful.
- Going off the road (onto the grass or shoulder) should slow the car and optionally add a rumble effect, giving a reason to stay on the track.
- Hitting an obstacle should cost speed and briefly disrupt control, but should not feel unfair or cause a full stop unless the design calls for it. Keep it recoverable so the booth player is not frustrated.
- On gentle curves, the road should push the car outward slightly at speed, encouraging the player to steer into the curve. Keep this subtle since the brief calls for only a little curviness.

Expose the key handling values (max speed, acceleration rate, braking rate, steering rate, off road penalty, obstacle penalty) as named constants in one place so they are easy to tune.

---

## 6. Track and world design

- The course is a mostly straight, flat road with occasional gentle curves. Not a technical, twisty track.
- Fixed race length. Use a defined distance for the race, for example a set number of road segments that equates to a race lasting roughly 60 to 90 seconds at full speed. Make the total length a single configurable value.
- A visible start line at the beginning and a finish line at the end.
- Obstacles placed along the road at intervals, for example cones, oil slicks, or barriers. They should be spaced so the race is challenging but fair. Do not place obstacles so densely that a clean run is impossible. Vary their lane position so the player must actually steer.
- Roadside billboards at intervals that display the event poster image (see section 12). At least a few billboards across the course. These are the primary branding surface, so they should be clearly visible as the player passes.
- Optional roadside scenery (trees, signs, simple shapes) to add depth and a sense of speed, kept cheap to render.

---

## 7. AI opponent: TAM

TAM is the single AI car the player races against. Required behaviour:

- Medium difficulty. TAM should be beatable most of the time but should genuinely win a meaningful share of races, so the outcome feels uncertain and players want a rematch. A reasonable target is TAM winning roughly 30 to 40 percent of races, tunable.
- TAM must stay competitive throughout using rubber banding: if the player falls well behind, TAM eases off slightly, and if the player pulls well ahead, TAM speeds up slightly, keeping races close and exciting. Keep the effect subtle so it does not look obviously scripted.
- TAM should follow the road through curves, keep to sensible racing lines, and avoid or react to obstacles rather than driving through them blindly.
- Add small natural variation: a little randomness in TAM's pace and the occasional minor mistake (a brief slowdown or a wider line) so no two races feel identical and so the player can sometimes capitalise.
- Expose TAM's tuning values (base speed relative to the player, rubber band strength, mistake frequency, obstacle avoidance skill) as named constants for easy balancing.

### 7a. Important note on the reinforcement learning claim

The brief describes TAM as trained using reinforcement learning. Please note this honestly, because the club's credibility depends on it:

- A well tuned rubber band heuristic controller (the behaviour described above) will feel to booth players exactly like a smart AI, and it is far more reliable to build and ship. However, it is not reinforcement learning, and it should not be described publicly as RL trained.
- If it matters that the RL description is truthful (for example, because visitors may ask how TAM works, or because the club wants the learning credibility), then implement a genuinely trained policy for TAM. A lightweight and realistic approach for a simple racer:
  - Define a small state (for example: the car's lane offset from center, the curvature of the road ahead, the distance and lane of the nearest obstacle, and TAM's speed).
  - Define a small action set (steer left, steer straight, steer right, combined with throttle or brake).
  - Define a reward that rewards forward progress and staying on road, and penalises collisions and going off road.
  - Train a compact policy offline (for example with tabular Q learning or a very small policy network), export the learned parameters to a small file, and run only inference in the game. Keep a heuristic safety fallback so TAM never behaves erratically at the booth.
- Be aware that on a simple, gently curving track, a trained policy and a good heuristic will look very similar to onlookers. So the main reasons to do real RL here are truthfulness and the club's own learning value, not a visible difference in gameplay.

Recommended default for the build: implement the heuristic rubber band controller so a great game reliably ships, and treat the trained RL policy as an option the club can enable if it wants the RL claim to be accurate. Make the controller modular so the driving logic can be swapped without touching the rest of the game. Whichever is shipped, describe TAM accurately in any public materials.

---

## 8. Visual design and branding

- Clean, readable, arcade style visuals. Decent quality, not photorealistic. Prioritise clarity and a sense of speed.
- Incorporate Code Cortex 3.0 branding tastefully on the title screen, the results screen, and the roadside billboards.
- The player's car must render in the selected color. Car models should be visually distinct from each other.
- TAM's car should be clearly distinguishable from the player's car at a glance (for example a fixed contrasting color or a marker), so the player always knows which car is theirs.
- Provide a coherent color palette and consistent UI styling across all screens. Keep the HUD legible against the moving background.
- Respect a reduced motion preference where reasonable for accessibility, and ensure interactive controls have visible keyboard focus.

---

## 9. HUD (heads up display) during the race

Three required elements, positioned as specified:

- Top left: a mini map. A small schematic overview of the course showing the shape of the track and two position markers, one for the player and one for TAM, updating live as the race progresses. Since the course is largely linear, the mini map can be a simplified representation of the course line or shape with the two markers moving along it.
- Top center: live time and speed. A running race timer and the player's current speed, both clearly readable.
- Bottom: a race progress bar. A horizontal track representing the full race from start to finish, showing how much distance the player has covered and how much remains, plus a marker showing TAM's position relative to the player so the gap is obvious at a glance.

The mini map and the bottom progress bar carry related but distinct information: the mini map conveys the spatial shape of the course and where each car is on it, while the bottom bar conveys linear race progress and the gap between the player and TAM. Include both.

Keep all HUD elements lightweight to render and always legible over the moving scene.

---

## 10. Audio (optional but adds polish)

Optional, include if time allows. If included, keep files small and preload them:
- A looping engine sound whose pitch rises with speed.
- A short collision sound.
- A countdown and a race finish sound.
Provide a simple mute control. Never autoplay loud audio without a clear way to silence it, since this runs at a public booth.

---

## 11. Assets and configuration

- Provide a single, clearly documented place to drop in the event poster image used on billboards, so the club can swap it without editing game logic. Ship with a placeholder poster so the game runs before the real asset is added.
- Car sprites or shapes and their color variants should be organised and easy to extend.
- Gather all tunable values (race length, difficulty and TAM parameters, driving model constants, poster path) into a clearly labelled configuration area so the club can adjust the game without hunting through the code.

---

## 12. Architecture and file structure

- Keep the code organised and readable, since this is a portfolio piece for the club. Separate concerns clearly, for example: the game loop and state management, the road and world rendering, the player car and controls, the TAM controller, the HUD, and the screen or menu flow.
- Prefer a small number of well named files over one giant file. A vanilla structure such as an index HTML entry, a stylesheet, and a set of JavaScript modules is fine.
- No secrets, no API keys, nothing sensitive committed to the repository.
- Include a short README describing how to run the game, how to swap the poster, and where the tunable values live.

---

## 13. Hardening and quality assurance (the "pen testing" requirement)

This is a client side browser game with no server, so classic server penetration testing does not apply. The meaningful hardening and QA work is:

Input and safety:
- Sanitise the player name before it is ever inserted into the page. Escape or strip HTML so a name like a script tag cannot inject or run anything. This is the one genuine injection vector in the game and it must be handled.
- Handle edge cases for the name field: empty input, very long input, whitespace only, emoji, and special characters. None should break the layout or the game.
- Do not use eval or execute any user provided string as code.

Robustness for a public booth:
- The player must never be able to get the game stuck. There should always be a clear way to restart or return to the menu.
- Rapid or simultaneous key presses, and holding several keys at once, must not break movement or crash the game.
- Refreshing the page mid race must cleanly return to a sane starting state.
- Handle window resizing without breaking the rendering or the HUD layout.
- Guard against losing and regaining browser focus mid race (for example, keys should not get stuck in the pressed state if focus is lost). Clear key state on focus loss.

Performance QA:
- Verify a stable 60 frames per second during sustained play, including near billboards and during collisions.
- Check for memory growth over several consecutive races. There should be no leak that degrades performance over a long booth session.
- Test in Chrome as the primary target, and confirm it also runs in Edge and Firefox.

Deliver a short written QA summary of what was tested and the results, and confirm the game runs smoothly start to finish with a good user experience.

---

## 14. Git commit history requirements

Build the project under Git and produce a commit history with specific dates and times. Requirements:

- 20 commits dated 18 September 2026, all falling between 10:00 PM and 11:30 PM, with irregular (uneven) gaps between them rather than evenly spaced.
- 30 commits dated 19 September 2026. Times for the 19th were not specified, so spread them across that day with irregular gaps (for example across daytime and evening). Treat the exact spread as adjustable and confirm the intended window if it matters.
- The commit messages should tell a coherent, incremental development story that matches the build order in section 16 (scaffolding first, then the road renderer, the car and controls, TAM, the HUD, branding and assets, polish, and QA). A history that reads like real progressive development is what protects the club's credibility, so avoid vague or repetitive messages.

Technique for setting commit dates: set both the author date and the committer date on each commit so the timestamps are consistent. In Git this means setting the author date (for example with the date option on commit) and the committer date (for example via the committer date environment variable) to the same value for each commit. The dates can be assigned as the commits are made, or the logical commits can be created and then stamped with a small script that walks the two windows and assigns irregular timestamps within them. Generate the irregular gaps programmatically rather than hand picking evenly spaced times.

One practical heads up: 18 and 19 September 2026 are about a month after the time of writing, so these will be future dated commits until those dates arrive. Before then, anyone viewing the repository will see timestamps in the future, which can look odd. Make sure the dates and the machine clock are what is actually intended.

---

## 15. Acceptance criteria (definition of done)

The project is complete when all of the following are true:

- The full flow works: title, name entry, car and color selection, countdown, race, and results, with rematch and return to menu.
- Controls are instantaneous and continuous via per frame key state, with no input lag.
- The race runs at a stable 60 frames per second with no stutter on a mid range laptop.
- The road is mostly straight with gentle curves, has obstacles that affect the car fairly, and shows event billboards with the poster image.
- TAM races at medium difficulty, stays competitive via rubber banding, and genuinely wins a share of races. TAM's true nature (heuristic or RL trained) is described accurately, per section 7a.
- The HUD shows a live mini map top left, live time and speed top center, and a race progress bar with the player and TAM positions at the bottom.
- The player name is sanitised, and all the robustness and edge cases in section 13 are handled.
- The Git history matches section 14: 20 commits on 18 September 2026 between 10:00 PM and 11:30 PM with irregular gaps, and 30 commits on 19 September 2026 with irregular gaps, with a coherent progression of messages.
- A short QA summary confirms testing and smooth operation, and a README explains how to run the game and swap the poster.

---

## 16. Suggested build sequence

This order also maps naturally onto the commit history in section 14, so the commits tell a real development story:

1. Project scaffolding: files, the canvas, the main loop with delta time, and a blank render.
2. Road rendering: the pseudo 3D projected road, straight first, then gentle curves.
3. Player car and controls: per frame key state, the driving model, and off road behaviour.
4. World objects: obstacles and collision handling, then roadside billboards and scenery.
5. TAM: the opponent controller, rubber banding, and difficulty tuning (and the optional RL policy if chosen).
6. HUD: the mini map, the time and speed readout, and the bottom progress bar.
7. Screen flow: title, name entry, car and color selection, countdown, and the results screen.
8. Branding and assets: the poster billboards, palette, and UI styling.
9. Audio, if included.
10. Hardening and QA: input sanitisation, edge cases, focus and resize handling, performance profiling, and the written QA summary.
11. Configuration and README cleanup, and final tuning.
