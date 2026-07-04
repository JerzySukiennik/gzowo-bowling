# GZOWO BOWLING — TECHNICAL CONTRACT (v1)

AUTHORITATIVE. Coders implement EXACTLY this. No renaming, no "improvements" to shapes/signatures.
All code and comments in English. All user-facing strings ONLY via `t(key)` from js/i18n.js.
SPEC.md defines product behavior; this file defines every integration surface.

COORDINATE SYSTEM (3D, per lane, shared by scene/physics/camera):
Y up. Lane long axis = Z. Foul line at z=0, ball travels toward **negative Z**. Head pin at z=-16.5.
Lanes are laid side by side along X; lane i is a THREE.Group offset at `x = i * 4.0` (LANE.PITCH).
All physics happens in WORLD space (Rapier world is shared; lane offset applied to body positions).

--------------------------------------------------------------------------------
## 0. CODER OWNERSHIP (3 parallel coders — never touch another coder's files)

- **CODER A (shell):** `v1/index.html`, `v1/css/style.css`, `v1/js/config.js`, `v1/js/i18n.js`, `v1/js/net.js`
- **CODER B (pad):** everything under `v1/js/controller/`
- **CODER C (TV):** everything under `v1/js/display/`

Coders B and C import ONLY from `../config.js`, `../i18n.js`, `../net.js`, CDN modules, and their own folder.
Exception: `js/display/sharecard.js` is import-safe from controller (pure canvas + config + i18n, zero three/rapier/display imports); controller/hostmenu.js imports it as `../display/sharecard.js`.

--------------------------------------------------------------------------------
## 1. FILE MAP (every file under v1/)

```
v1/
  index.html                    CODER A. Single entry. <head>: Fredoka font link, css/style.css,
                                importmap {"imports":{"three": <CDN three>, "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}},
                                <script src=qrcode.min.js CDN> (UMD global QRCode).
                                <body>: <div id="app"></div> + inline <script type="module"> router:
                                  const p=new URLSearchParams(location.search);
                                  if (p.get("role")==="controller") (await import("./js/controller/main.js")).startController();
                                  else (await import("./js/display/main.js")).startDisplay();
  css/style.css                 CODER A. Full design system (section 9) + ALL 2D component classes
                                used by both pad and TV. Includes keyframe animations (spring-in,
                                jiggle, count-up helper class, banner slide, crown float, emote pop).
  js/config.js                  CODER A. All constants (section 3.1). No logic except frozen objects.
  js/i18n.js                    CODER A. Dictionary pl/en with EVERY key from section 8 + API 3.2.
  js/net.js                     CODER A. Firebase layer, API 3.3. The ONLY file importing Firebase.

  js/controller/main.js         CODER B. startController(): init net+i18n, join/rejoin, screen router
                                by meta.state + game.phase, wires all controller modules, presence.
  js/controller/join.js         CODER B. Nick -> ball customization (uses ballpreview) -> lane theme
                                -> ready. Returns profile object (section 3.4).
  js/controller/ballpreview.js  CODER B. Live 3D rotatable ball preview (three.js mini-scene).
  js/controller/tutorial.js     CODER B. Interactive 6-step tutorial overlay, skippable, localStorage.
  js/controller/throwpad.js     CODER B. Top-down mini lane: aim drag, spin dial, flick-to-throw zone,
                                haptics, writes input/* (section 7). Mulligan + skip buttons.
  js/controller/hostmenu.js     CODER B. Host-only: lobby settings + in-game hamburger menu
                                (pause/resume/skip/undo/replay/newGame/quit/bumpers/music) + share
                                button on finished (imports ../display/sharecard.js).
  js/controller/emotes.js       CODER B. 8-emote bar, 3 s cooldown, pushes to emotes queue.

  js/display/main.js            CODER C. startDisplay(): boot sequence (net -> room -> scene ->
                                physics -> audio), lobby screen (QR + code + player cards + settings
                                mirror), render loop (requestAnimationFrame: physics.step, camera.update,
                                replay tick, renderer.render), wires listeners -> game.js.
  js/display/scene.js           CODER C. three.js scene/renderer/lights, lane meshes (procedural,
                                chunky cartoon), GLB attempts w/ 6 s timeout -> procedural fallback,
                                pin InstancedMesh per lane, ball mesh factory (color+pattern+3 holes),
                                plaque anchors, aim-ghost arrow.
  js/display/themes.js          CODER C. 5 theme builders (classic/space/neon/retro/xmas): per-lane
                                skydome/backdrop, light rig tint, lane colorway, 2-3 detail props.
  js/display/physics.js         CODER C. Rapier world, lane colliders (floor, gutters, optional
                                bumpers, narrow variant), pins as dynamic bodies, ball throw from
                                ThrowData (section 7), settle detection, pin-down detection,
                                snapshot/restore standing pins (mulligan/undo).
  js/display/camera.js          CODER C. One camera. Auto beat sequence + manual modes (section 10).
  js/display/game.js            CODER C. State machine (section 5) + scoring (section 6) + command
                                consumer + trick-shot detection + sudden death. Owns ALL RTDB writes
                                of game/scores/meta during play.
  js/display/hud.js             CODER C. 2D overlays on TV: side leaderboard, lane plaques, live
                                crown(s), emote pop-ups, banners, pause overlay, winner screen DOM.
  js/display/effects.js         CODER C. Confetti, fireworks, camera shake hook, trick-shot callout,
                                strike/turkey celebration.
  js/display/replay.js          CODER C. Records ball+pin transforms 30 Hz during rolling/settling;
                                slow-mo playback; keeps best throw of the game for winner montage.
  js/display/audio.js           CODER C. SFX via new Audio(url) with silent failure; lo-fi music
                                playlist, play/pause/skip/volume, ducking during rolling.
  js/display/sharecard.js       CODER C. PURE module (canvas 2D only): generateCard(result, players)
                                -> PNG dataURL, 1080x1350. Also used by controller (see §0).
```

--------------------------------------------------------------------------------
## 2. RTDB SCHEMA — `rooms/{CODE}`

CODE = 4 chars from `"ABCDEFGHJKLMNPQRSTUVWXYZ"` (no I/O). Writer column is EXCLUSIVE — nobody
else writes that path. D = display, P = pad (own id only), H = host pad.

```
rooms/{CODE}/
  meta/                                  writer: D (settings mirrored from H via commands? NO —
                                         host writes settings directly in lobby, see below)
    state        "lobby"|"playing"|"paused"|"finished"        W: D   listen: D,P
    createdAt    number (Date.now)                            W: D
    hostId       string (playerId of first pad)               W: D (on first join)
    settings/                                                 W: H (ONLY while state==="lobby",
                                                                   except bumpers via command later)
      language     "pl"|"en"           default "pl"           listen: D,P (drives i18n everywhere)
      frames       3|5|10              default 5
      narrowLaneOn boolean             default false
    music/                                                    W: D   listen: P (host UI mirrors it)
      playing    boolean
      volume     number 0..1
      track      int (index into ASSETS.MUSIC)
    result/                            written once at gameOver  W: D   listen: P
      winnerIds  string[] (>=1)
      ranking    [{playerId, nick, total, playerColor, ballColor, ballPattern}] sorted desc
      date       number (Date.now)
      bestThrow  {playerId, pins, trick: string|null} | null

  players/{playerId}/                                         W: P (own node) except noted
    nick         string 1..12 chars
    playerColor  string hex — assigned by D from PLAYER_COLORS[order]   W: D
    ballColor    string hex (from BALL_COLORS)
    ballPattern  "solid"|"stripes"|"dots"|"swirl"|"stars"|"split"
    ballWeight   "light"|"medium"|"heavy"
    laneTheme    "classic"|"space"|"neon"|"retro"|"xmas"
    isHost       boolean                                      W: D
    order        int 0..5 (join order = lane index)           W: D
    bumperOn     boolean (lobby: H via direct write; in-game: D via "bumper" command)
    mulliganUsed boolean                                      W: D
    connected    boolean (true on join; onDisconnect->false)  W: P + onDisconnect
    ready        boolean (finished join flow)                 W: P

  game/                                                       W: D ONLY   listen: P
    phase             see section 5 (string)
    currentPlayerId   string|null
    currentFrameIndex int (0-based)
    throwIndex        int 0|1|2
    round             int (== currentFrameIndex+1, for banners)
    narrowRound       boolean (this round is narrow)
    mulliganAvailable boolean (pad shows Mulligan button iff true && own turn && !mulliganUsed)
    cameraView        {mode:"auto"|"follow"|"side"|"top", setBy:string|null, ts:number}
    suddenDeath       {active:boolean, round:int, playerIds:string[]} | null
    lastResult        {playerId, frameIndex, throwIndex, pinsDown:int, pinsStanding:int,
                       isStrike:boolean, isSpare:boolean, isGutter:boolean,
                       trick:"split"|"hook"|"bank"|null, ts:number} | null

  input/{playerId}/                                           W: P (own) listen: D
    aim    {x:number -1..1, forward:number 0..1}   live while aiming, throttle 100 ms
    spin   number -1..1                            live, throttle 100 ms
    throw  {power:number 0..1, angle:number -0.15..0.15, ts:number}   ONE write per throw
    mulligan {ts:number}                           request; D consumes by ts comparison

  commands/{pushKey}/     push-queue. W: P (push only). D consumes via child_added then remove().
    {type:string, from:playerId, payload:object|null, ts:number}
    Allowed types (D validates `from` against meta.hostId for host-only):
      "pause" {}                    host   -> meta.state="paused"
      "resume" {}                   host   -> meta.state="playing"
      "skipTurn" {}                 host OR current player -> zero remaining throws of frame, advance
      "undo" {}                     host   -> revert last throw (section 5.4)
      "replay" {}                   host   -> replay last recorded throw
      "newGame" {}                  host   -> reset scores/game, same players+settings, phase "intro"
      "quit" {}                     host   -> finish immediately: compute result, phase "gameOver",
                                              meta.state="finished"
      "cameraCycle" {}              any    -> cycle mode auto->follow->side->top->auto
      "bumper" {playerId, on:bool}  host   -> write players/{playerId}/bumperOn, apply (section 5.5)
      "music" {action:"play"|"pause"|"skip"|"volume", value?:number}  host -> audio + meta/music

  emotes/{pushKey}/       push-queue. W: P. D consumes via child_added then remove().
    {playerId, emote: "clap"|"joy"|"wow"|"cry"|"fire"|"skull"|"clown"|"bowling", ts:number}

  scores/{playerId}/                                          W: D ONLY   listen: P
    frames      array length settings.frames of {t:int[] (pinfall per throw), cum:int|null}
                D always writes the WHOLE scores/{playerId} object (no index patching).
    total       int  (running total, section 6.4)
    trickBonus  int  (sum of +5 bonuses)
    sd          int[] (pinfall per sudden-death round; absent until sudden death)
```

Join rules (net.js enforces): join allowed only when `meta.state==="lobby"` and players count < 6.
Errors thrown with `err.code`: `"room_not_found"`, `"room_full"`, `"game_in_progress"`.
Rejoin: pad stores `{code, playerId}` in sessionStorage key `"gzowo.session"`; on load, if room
exists and player node exists, resume as that player (set connected:true) regardless of state.

--------------------------------------------------------------------------------
## 3. MODULE APIs (exact exports)

### 3.1 js/config.js — named const exports only

```js
export const FIREBASE_CONFIG = { /* exact object from SPEC.md */ };
export const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
export const PLAYER_COLORS = ["#FF5C7A","#FF9F1C","#FFD23F","#3DD68C","#4CC9F0","#9B5DE5"];
export const BALL_COLORS   = ["#FF6B6B","#FF9F1C","#FFD23F","#3DD68C","#4CC9F0","#9B5DE5","#F15BB5","#2B2A4A"];
export const BALL_PATTERNS = ["solid","stripes","dots","swirl","stars","split"];
export const BALL_WEIGHTS = {
  light:  { mass: 3.6, restitution: 0.25, spinFactor: 1.6, powerFactor: 0.85 },
  medium: { mass: 5.4, restitution: 0.12, spinFactor: 1.0, powerFactor: 1.0  },
  heavy:  { mass: 7.2, restitution: 0.05, spinFactor: 0.5, powerFactor: 1.1  },
};
export const LANE_THEMES = ["classic","space","neon","retro","xmas"];
export const EMOTES = [                       // id -> emoji char + sfx key
  {id:"clap",char:"👏"},{id:"joy",char:"😂"},{id:"wow",char:"😮"},{id:"cry",char:"😭"},
  {id:"fire",char:"🔥"},{id:"skull",char:"💀"},{id:"clown",char:"🤡"},{id:"bowling",char:"🎳"},
];
export const GAME = { MAX_PLAYERS: 6, FRAMES_OPTIONS: [3,5,10], DEFAULT_FRAMES: 5,
  PIN_COUNT: 10, TRICK_BONUS: 5, NARROW_CHANCE: 0.4 };            // round 1 never narrow
export const LANE = { LENGTH: 18.0, WIDTH: 1.05, NARROW_SCALE: 0.72, PITCH: 4.0,
  GUTTER_WIDTH: 0.24, GUTTER_DEPTH: 0.09, BALL_RADIUS: 0.108,
  PIN: { HEIGHT: 0.38, RADIUS: 0.06, MASS: 1.0 },
  PIN_SPACING: 0.30, PIN_ROW_DEPTH: 0.26, HEADPIN_Z: -16.5, RELEASE_MAX_FORWARD: 1.2 };
export const PHYSICS = { GRAVITY: -9.81, SPEED_MIN: 8, SPEED_MAX: 17, ANGLE_MAX: 0.15,
  SPIN_OMEGA_MAX: 30, HOOK_ACCEL: 1.8, JITTER_FACTOR: 0.035,
  SETTLE_LINVEL: 0.08, SETTLE_ANGVEL: 0.2, SETTLE_HOLD_MS: 500, SETTLE_TIMEOUT_MS: 8000,
  PIN_DOWN_TILT_DEG: 50, PIN_DOWN_DISPLACEMENT: 0.25 };
export const TIMING = { INTRO_MS: 3000, ROUND_BANNER_MS: 2500, SCORED_MS: 4000,
  NEXT_TURN_FLY_MS: 1200, PIN_CAM_HOLD_MS: 1600, LEADERBOARD_BEAT_MS: 1200,
  REPLAY_SPEED: 0.35, REPLAY_MAX_MS: 5000, EMOTE_COOLDOWN_MS: 3000, AIM_THROTTLE_MS: 100,
  ASSET_TIMEOUT_MS: 6000 };
export const ASSETS = {
  GLB: { pin: "<url or null>", ball: null, lane: null },   // null = go straight to procedural
  SFX: { roll:"<url>", pinsCrash:"<url>", pinSingle:"<url>", gutter:"<url>", strike:"<url>",
         spare:"<url>", ui:"<url>", emote:"<url>" },       // CC0 direct URLs, coder A picks
  MUSIC: ["<url>","<url>","<url>"],                        // CC0 lo-fi loops
};
```

### 3.2 js/i18n.js

```js
export function setLang(lang /* "pl"|"en" */) : void
export function getLang() : "pl"|"en"
export function t(key, vars) : string      // vars: {name:"X"} replaces "{name}"; missing key -> key itself
export function onLangChange(cb) : () => void   // returns unsubscribe; cb(lang)
```

### 3.3 js/net.js  (the ONLY Firebase importer; keeps current code+playerId internally)

```js
export async function initNet() : Promise<void>
export async function createRoom(settings) : Promise<string>            // returns CODE; writes meta
export async function joinRoom(code, profile) : Promise<{playerId, isHost}>
       // profile: section 3.4. Transaction: assigns order+playerColor+isHost via player count;
       // first joiner => isHost true + meta.hostId. Throws err.code per section 2.
export async function rejoin(code, playerId) : Promise<object|null>     // player node or null
export function roomCode() : string|null
export function myPlayerId() : string|null
export function watch(subpath, cb) : () => void
       // subpath relative to rooms/{code}, "" = whole room. cb(valueOrNull) on every change.
export function watchAdded(subpath, cb) : () => void    // child_added: cb(key, value)
export function write(subpath, value) : Promise<void>
export function update(subpath, obj) : Promise<void>
export function remove(subpath) : Promise<void>
export function push(subpath, value) : Promise<string>
export function sendCommand(type, payload) : Promise<void>   // pushes {type,from,payload,ts}
export function sendEmote(emoteId) : Promise<void>
export function setPresence() : void        // connected:true + onDisconnect connected:false
export function controllerUrl(code) : string
       // location.origin + location.pathname + "?role=controller&room=" + code  (NEVER hardcode domain)
```

### 3.4 Profile object (join.js output, players/{id} payload)

```js
{ nick, ballColor, ballPattern, ballWeight, laneTheme, ready: true }
```

### 3.5 Controller modules

```js
// main.js
export async function startController() : Promise<void>
// join.js
export function showJoin(rootEl, onComplete /* (profile)=>void */) : void
// ballpreview.js
export function initBallPreview(canvasEl) : { setBall(color, pattern, weight):void, dispose():void }
// tutorial.js
export function isTutorialDone() : boolean            // localStorage "gzowo.tutorialDone"
export function startTutorial(rootEl, onDone) : void  // steps: aim, spin, flick, emotes, skip, mulligan
// throwpad.js
export function initThrowPad(rootEl) : {
  setActive(isMyTurn:boolean):void,        // enables drag/dial/flick; writes input live
  setMulligan(available:boolean):void,     // shows/hides Mulligan button
  setPaused(paused:boolean):void,
  reset():void,                            // clears local aim/spin to defaults (x:0,forward:0,spin:0)
}
// hostmenu.js
export function initHostMenu(rootEl, ctx) : { setState(meta, players, game):void }
   // ctx = { isHost:boolean }. Renders nothing when !isHost.
// emotes.js
export function initEmotes(rootEl) : void
```

### 3.6 Display modules

```js
// main.js
export async function startDisplay() : Promise<void>
// scene.js
export async function initScene(containerEl) : Promise<void>   // creates canvas, renderer, lights
export function buildLanes(playersArr) : void   // playersArr sorted by order; one lane per player
export function getLaneGroup(laneIndex) : THREE.Group
export function createBallMesh(color, pattern) : THREE.Mesh
export function setBallVisual(laneIndex, mesh) : void
export function setPinTransforms(laneIndex, transforms /* [{p:[x,y,z], q:[x,y,z,w]}] x10 */) : void
export function showAimGhost(laneIndex, aim, spin) : void       // arrow preview on active lane
export function hideAimGhost() : void
export function setNarrowVisual(laneIndex, narrow:boolean) : void
export function setBumperVisual(laneIndex, on:boolean) : void
export function getScene() : THREE.Scene
export function getRenderer() : THREE.WebGLRenderer
export function render(camera) : void
// themes.js
export function applyTheme(laneIndex, themeId) : void   // call after buildLanes
// physics.js
export async function initPhysics() : Promise<void>              // await RAPIER.init()
export function setupLane(laneIndex, opts /* {narrow:boolean, bumpers:boolean} */) : void
export function resetPins(laneIndex, standingMask /* int bitmask, bit i = pin i standing; 0x3FF = all */) : void
export function throwBall(laneIndex, throwData /* section 7 */, weightKey) : void
export function step(dtMs) : void                                 // fixed 60 Hz substeps internally
export function getBallState(laneIndex) : {p:[x,y,z], q:[x,y,z,w], vel:[x,y,z]}|null
export function getPinTransforms(laneIndex) : [{p, q}] x10
export function getStandingMask(laneIndex) : int                  // tilt/displacement rule (config)
export function isSettled(laneIndex) : boolean
export function ballInGutter(laneIndex) : boolean
export function ballTouchedBumper(laneIndex) : boolean            // sticky flag per throw
export function ballLateralTravel(laneIndex) : number             // |max x - min x| this throw
export function clearThrow(laneIndex) : void                      // remove ball body, reset flags
// camera.js
export function initCamera() : THREE.PerspectiveCamera
export function setMode(mode /* "auto"|"follow"|"side"|"top" */) : void
export function getMode() : string
export function update(dtMs, ctx /* {phase, laneIndex, ballState} */) : void
export function flyToLane(laneIndex) : Promise<void>              // TIMING.NEXT_TURN_FLY_MS tween
export function shake(intensity /* 0..1 */) : void
// game.js
export function initGame(deps) : void   // deps = every module object; main.js wires it
export function onPlayersChanged(players) : void
export function startGame() : void                                 // host pressed Start
export function onThrowReceived(playerId, throwObj) : void
export function onMulliganReceived(playerId, ts) : void
export function onCommand(key, cmd) : void
export function tick(dtMs) : void                                  // phase timers; called from loop
// hud.js
export function initHud(rootEl) : void
export function setLobbyVisible(on, lobbyData) : void   // lobbyData={code, url, players, settings}
export function updateLeaderboard(players, scores, currentPlayerId) : void
export function updatePlaques(players, scores) : void
export function setCrowns(leaderIds /* string[] */) : void
export function popEmote(laneIndex, emoteChar) : void
export function showBanner(kind, vars, durationMs) : Promise<void>
   // kind: "round"|"narrow"|"strike"|"spare"|"turkey"|"gutter"|"trickshot"|"suddenDeath"|
   //       "playerTurn"|"mulligan"|"skipped"|"undo"|"newGame"|"finalFrame"
export function setPauseOverlay(on) : void
export function showWinnerScreen(result, players, cardDataUrl, qrUrl) : void
export function hideWinnerScreen() : void
// effects.js
export function initEffects(sceneRefs) : void
export function strikeCelebration(level /* 1 strike, 2 turkey */) : void  // confetti+fireworks+shake
export function trickShotCallout(type /* "split"|"hook"|"bank" */) : void
export function confettiBurst(laneIndex) : void
export function update(dtMs) : void
// replay.js
export function startRecording(laneIndex, meta /* {playerId} */) : void
export function recordFrame() : void            // called each render tick while recording
export function stopRecording(resultMeta /* {pins, isStrike, trick} */) : void
export function playLast() : Promise<void>      // slow-mo via scene.setPinTransforms/ball visual
export function playBest() : Promise<void>
export function getBestMeta() : {playerId, pins, trick}|null
export function isReplaying() : boolean
// audio.js
export function initAudio() : void              // lazy; unlock on first user gesture not needed on TV,
                                                // but wrap every play() in try/catch — silence on error
export function sfx(name /* key of ASSETS.SFX */) : void
export function music(action /* "play"|"pause"|"skip"|"volume" */, value) : void
export function duck(on:boolean) : void
export function getMusicState() : {playing, volume, track}
// sharecard.js  (PURE: no three, no rapier, no DOM outside its canvas)
export async function generateCard(result /* meta.result */, lang /* "pl"|"en" */) : Promise<string>
   // returns PNG dataURL 1080x1350: title+date, winner big, full ranking rows with ball
   // thumbnails (flat canvas circles: color + pattern), design system colors/Fredoka.
```

--------------------------------------------------------------------------------
## 4. BOOT & LOBBY FLOW

Display: `initNet -> createRoom({language:"pl",frames:5,narrowLaneOn:false}) -> initScene ->
initPhysics -> lobby screen` (big code, QR of `controllerUrl(code)`, player cards appear with
spring-in as players/* changes, settings mirror). Host writes `meta/settings` directly (lobby only);
display re-renders lobby texts live on language change via `onLangChange`.
Start: host writes NOTHING special — host pad sends... **Start = host writes `meta/state` directly?
NO.** Start is the one lobby command: host pad pushes command `{type:"newGame"}` while state==="lobby";
display treats `newGame` in lobby as Start: locks joins, builds lanes+themes+physics from players,
sets `meta.state="playing"`, `game.phase="intro"`.

Pad: `initNet -> rejoin? -> joinRoom -> tutorial (auto if !isTutorialDone(), skippable) -> waiting/
lobby screen (host sees settings) -> game screens by game.phase`.

--------------------------------------------------------------------------------
## 5. DISPLAY STATE MACHINE (game.js owns; writes game/phase on every transition)

Phases: `"lobby" -> "intro" -> "roundBanner" -> "aiming" -> "rolling" -> "settling" -> "scored"
-> ["replay"] -> "nextTurn" -> (loop) ... -> "suddenDeathBanner" -> ... -> "gameOver"`
`meta.state==="paused"` is an OVERLAY, not a phase: physics stepping, phase timers, and input
consumption freeze; camera keeps rendering; resume unfreezes exactly where it was.

- **intro** (TIMING.INTRO_MS): camera flythrough over all lanes. Writes: phase, resets game node
  {currentPlayerId: order-0 player, currentFrameIndex:0, throwIndex:0, round:1, narrowRound:false,
  mulliganAvailable:false, cameraView:{mode:"auto"}, suddenDeath:null, lastResult:null}; writes
  initial scores/* (empty frames arrays, total 0, trickBonus 0). -> roundBanner.
- **roundBanner** (ROUND_BANNER_MS): at round start (before order-0 player of each frame index).
  Decides narrowRound: `settings.narrowLaneOn && round>1 && Math.random()<GAME.NARROW_CHANCE`.
  Applies `setupLane` narrow to ALL lanes for this round + setNarrowVisual. Banner "round" (+
  "narrow" if narrow). Writes: phase, round, narrowRound. -> aiming.
- **aiming**: camera behind ball low. Displays aim ghost from live input/{current}/aim+spin.
  Snapshot for undo taken HERE (standing mask + deep copy of player scores + game pointers).
  Consumes input/{current}/throw when `throw.ts > lastProcessedTs[playerId]`. On throw:
  audio.duck(true), replay.startRecording, physics.throwBall, sfx "roll", -> rolling.
  Also accepts skipTurn command (fills remaining throws with 0 -> scored path with pinsDown 0,
  banner "skipped", no mulligan).
- **rolling**: physics steps; camera follows ball; when ball z < HEADPIN_Z + 4 -> pin-cam cut;
  first pin contact -> sfx "pinsCrash" (+ haptic is pad-side on lastResult). -> settling when ball
  passed pin deck or in gutter or stopped.
- **settling**: wait until `isSettled` held SETTLE_HOLD_MS or SETTLE_TIMEOUT_MS. Then: compute
  standingMask, pinsDown (vs pre-throw mask), gutter/bumper/lateral flags, trick detection (§6.5),
  scoring applyThrow, replay.stopRecording, audio.duck(false). Writes: scores/{player} (whole
  object), game.lastResult, game.mulliganAvailable (§5.3). -> scored.
- **scored** (SCORED_MS, also the mulligan window): banners: strike/turkey/spare/gutter/trickshot
  (celebrations via effects). Leaderboard beat (camera). Listens for mulligan (§5.3) and undo.
  -> replay if isStrike (and not already mulliganed), else -> nextTurn.
- **replay** (<= REPLAY_MAX_MS): auto slow-mo of the recorded throw at REPLAY_SPEED, letterbox
  bars via hud. Host "replay" command triggers this phase manually from scored/nextTurn too.
  -> nextTurn.
- **nextTurn** (NEXT_TURN_FLY_MS): decide next pointers:
  * same player throw 2 if frame not done (no strike, non-last frame rules);
  * last frame: up to 3 throws per 10th-frame rules (§6.2), pins reset to full when deck cleared;
  * else next player by order (skipping nobody — disconnected players: if `connected===false` at
    their turn start, auto-skip with zeros + banner "skipped");
  * after last player of frame: frameIndex+1 -> roundBanner, or if frames exhausted -> §6.6 tie
    check -> suddenDeathBanner or gameOver.
  Resets pins: full rack if new frame, standing mask preserved for throw 2/3-in-frame.
  clearThrow, camera flyToLane (manual camera mode RESETS to "auto" here), writes game pointers,
  banner "playerTurn". -> aiming.
- **suddenDeathBanner** (ROUND_BANNER_MS): banner "suddenDeath"; game.suddenDeath =
  {active:true, round:n, playerIds:tied}. Then tied players each play ONE standard frame (max 2
  throws, strike ends it; NO bonuses) using the normal aiming/rolling/settling/scored/nextTurn
  loop with sd bookkeeping (scores/{id}/sd[round-1] = frame pinfall). Highest pinfall wins; if
  still tied among a subset, repeat with only those players (round+1). -> gameOver.
- **gameOver**: compute meta.result, write it, meta.state="finished". Winner screen: trophy +
  animated ranking + best-throw montage (replay.playBest) + confetti loop. QR = controllerUrl(code)
  (pads on this room already show share UI when state==="finished"). Await newGame/quit commands.
  newGame -> full reset (mulliganUsed:false, scores wiped, meta.result removed, state="playing",
  phase "intro"). quit in gameOver -> ignore (already finished).

### 5.3 Mulligan
`mulliganAvailable = !player.mulliganUsed && !lastResult.isStrike && !lastResult.isSpare` (evaluated
at settling, written with lastResult). During **scored** only, if `input/{current}/mulligan.ts` >
throw.ts: revert via the aiming snapshot (restore scores object, resetPins(standingMaskBeforeThrow)),
set players/{id}/mulliganUsed=true, mulliganAvailable=false, banner "mulligan", -> aiming (same
frame/throwIndex). Mulligan cancels the pending replay.

### 5.4 Undo (host)
Valid while the aiming snapshot describes the LAST completed throw (i.e., from scored until the
next throw is released). Revert exactly like mulligan but does NOT touch mulliganUsed; banner
"undo"; -> aiming at the reverted player/frame/throwIndex (camera flies back if needed).
If no valid snapshot: ignore command.

### 5.5 Bumper toggle mid-game
Command "bumper": write players/{id}/bumperOn, setBumperVisual immediately; physics colliders
rebuild at that lane's next aiming phase if it is the active lane mid-throw, otherwise immediately.

--------------------------------------------------------------------------------
## 6. SCORING SPEC (game.js)

### 6.1 Data shape
`frames`: array of length N=settings.frames. Frame = `{t:int[], cum:int|null}`.
`t` holds pinfall per throw: normal frame t.length 1 (strike) or 2; LAST frame t.length 2 or 3.

### 6.2 Rules
- Strike: t[0]===10 (frame over except last frame). Spare: t[0]+t[1]===10 && t[0]!==10.
- Bonus: strike adds next 2 thrown balls' pinfall; spare adds next 1. Balls counted across frames
  in throw order, including last-frame extra balls.
- LAST frame (index N-1) follows 10th-frame rules regardless of N: strike on ball 1 -> full rack
  reset, 2 more balls (rack resets again after a 2nd strike); spare after 2 -> rack reset, 1 more
  ball; open after 2 -> done. Frame score = plain sum of its t (max 30). No bonuses propagate
  beyond the last frame.
- Max total = N==10 ? 300 : (N-1 strikes chaining + 30)… computed by the same algorithm; do not
  special-case.

### 6.3 cum
`cum` for frame i = cum(i-1) + frame pinfall + bonuses, but ONLY when all needed bonus balls have
been thrown; otherwise `cum:null` (HUD shows blank).

### 6.4 total (running, always shown)
`total = partialScore + trickBonus` where partialScore = same algorithm but unknown bonus balls
count as 0 (i.e., score-so-far with incomplete bonuses treated as 0). Monotonic non-decreasing.

### 6.5 Trick shots (detected at settling, max ONE per throw, priority order)
1. `"split"` — SPLIT CONVERTED: previous throw in this frame left a split (headpin down AND >=2
   standing pins with a gap: exists standing pair with no standing pin between them, using the
   standard 10-pin adjacency of the rack) AND this throw cleared all remaining -> spare.
2. `"hook"` — HOOK STRIKE: isStrike && |spin at release| >= 0.6 && ballLateralTravel >= 0.5.
3. `"bank"` — BANK SHOT: ballTouchedBumper && pinsDown >= 6.
Award: `trickBonus += GAME.TRICK_BONUS` (5), lastResult.trick set, callout + banner "trickshot".
Trick bonus lives OUTSIDE frames math; leaderboard shows total (incl. bonus) and a small "+X".

### 6.6 Winner & sudden death
After final frame resolves for all: rank by `total` desc. If top total shared by >=2 players ->
sudden death (§5 suddenDeathBanner) among exactly those players; sd pinfall decides; repeat on tie.
Final ranking for meta.result: total desc, sudden-death winner forced to rank 1; among others,
ties share placement order by `order` asc.

### 6.7 Turkey
3 consecutive strikes by the same player across their own consecutive throws (frames) -> banner
"turkey" + strikeCelebration(2). Track per-player consecutive-strike counter in game.js memory.

--------------------------------------------------------------------------------
## 7. THROW INPUT -> PHYSICS (exact conversion)

Pad writes (throttled 100 ms while aiming): `input/{id}/aim = {x, forward}`, `input/{id}/spin`.
On flick release, ONE write: `input/{id}/throw = {power, angle, ts: Date.now()}`.
- `aim.x` -1..1: lateral start position across lane width. `aim.forward` 0..1: release advance.
- `spin` -1..1 (dial). `power` 0..1 from flick length+velocity (pad clamps). `angle` -0.15..0.15
  from flick horizontal component (pad clamps to PHYSICS.ANGLE_MAX).

Display (physics.throwBall) with W = BALL_WEIGHTS[weightKey], effWidth = LANE.WIDTH *
(narrowRound ? LANE.NARROW_SCALE : 1):
```
startX  = laneOffsetX + aim.x * (effWidth/2 - BALL_RADIUS - 0.02)
startY  = BALL_RADIUS
startZ  = -aim.forward * LANE.RELEASE_MAX_FORWARD
speed   = (SPEED_MIN + power * (SPEED_MAX - SPEED_MIN)) * W.powerFactor
jitter  = (Math.random()*2 - 1) * PHYSICS.JITTER_FACTOR * speed      // small random lateral
vz      = -speed
vx      = speed * angle + jitter
body: ball, mass W.mass (density set to match), restitution W.restitution, friction 0.3,
      linvel (vx, 0, vz), angvel (about X for rolling: -speed/BALL_RADIUS; about Y: spin *
      SPIN_OMEGA_MAX * W.spinFactor  — visual + minor contact effect)
HOOK (deterministic curve): every physics step while ball is on lane surface (y < BALL_RADIUS*1.2,
      z > HEADPIN_Z) apply lateral acceleration ax = spin * W.spinFactor * PHYSICS.HOOK_ACCEL
      (m/s^2, sign: positive spin curves toward +X).
```
Pins: mass LANE.PIN.MASS, friction 0.4, restitution 0.4, capsule-ish (cylinder collider r=PIN.RADIUS
h=PIN.HEIGHT) — light and tippy = forgiving. Pin is DOWN when tilt from vertical >
PIN_DOWN_TILT_DEG OR horizontal displacement > PIN_DOWN_DISPLACEMENT OR fell into pit/gutter.
Bumpers: static cuboids filling gutters full lane length (only when player.bumperOn).
Narrow round: floor + gutters + bumpers rebuilt at effWidth; visuals via setNarrowVisual.
Haptics (pad, in throwpad.js): release flick -> vibrate(30); on game.lastResult for own throw ->
vibrate(60), strike -> vibrate([80,40,120]).

--------------------------------------------------------------------------------
## 8. I18N KEY LIST (complete; both languages must cover every key)

app.title
common.ok common.cancel common.close common.back common.next common.skip common.start
common.loading common.player common.you common.host
lobby.title lobby.scanToJoin lobby.roomCode lobby.waitingForPlayers lobby.playersCount
lobby.startHint lobby.settings.title lobby.settings.language lobby.settings.rounds
lobby.settings.narrowLane lobby.settings.bumpers lobby.soloHint
join.title join.enterNick join.nickPlaceholder join.nickTooShort join.customizeBall
join.ballColor join.ballPattern join.ballWeight join.rotateHint join.laneTheme join.ready
join.youAreHost join.waitingForHost join.joinedWait
join.weight.light join.weight.medium join.weight.heavy
join.weightHint.light join.weightHint.medium join.weightHint.heavy
join.pattern.solid join.pattern.stripes join.pattern.dots join.pattern.swirl join.pattern.stars
join.pattern.split
theme.classic theme.space theme.neon theme.retro theme.xmas
tutorial.title tutorial.skip tutorial.done tutorial.reopenHint
tutorial.aim.title tutorial.aim.body tutorial.spin.title tutorial.spin.body
tutorial.flick.title tutorial.flick.body tutorial.emotes.title tutorial.emotes.body
tutorial.skipTurn.title tutorial.skipTurn.body tutorial.mulligan.title tutorial.mulligan.body
pad.yourTurn pad.waitTurn pad.throwHint pad.spinLabel pad.mulligan pad.mulliganGone
pad.skipTurn pad.cameraCycle pad.camera.auto pad.camera.follow pad.camera.side pad.camera.top
pad.menu pad.tutorialToggle pad.paused pad.rolling pad.nice pad.gameOverShort
host.menu host.pause host.resume host.skipTurn host.undo host.replay host.newGame host.quitGame
host.bumpers host.bumperFor host.music host.musicPlay host.musicPause host.musicSkip host.musicVolume
banner.round banner.narrowLane banner.suddenDeath banner.playerTurn banner.finalFrame
banner.strike banner.spare banner.turkey banner.gutter banner.mulligan banner.skipped banner.undo
banner.newGame banner.trickshot banner.trickshot.split banner.trickshot.hook banner.trickshot.bank
hud.leaderboard hud.frameOf hud.total hud.bonus hud.leader hud.paused
hud.disconnected hud.reconnected
winner.title winner.wins winner.ranking winner.bestThrow winner.scanForCard winner.share
winner.download winner.playAgain winner.thanks
card.title card.winner card.date card.ranking
error.roomNotFound error.roomFull error.gameInProgress error.disconnected error.reconnecting
error.generic
```
Interpolation vars used: `{name}` (banner.playerTurn, banner.mulligan, banner.skipped, pad.waitTurn,
winner.wins, host.bumperFor, hud.disconnected, hud.reconnected), `{n}`/`{total}` (banner.round,
hud.frameOf, lobby.playersCount).

--------------------------------------------------------------------------------
## 9. DESIGN SYSTEM CONTRACT (style.css — classes both coders rely on)

CSS custom properties on :root — EXACT names:
`--bg:#FFF6E9; --card:#FFFFFF; --text:#2B2A4A; --text2:#6B6A85; --primary:#FF6B6B;
--secondary:#4CC9F0; --success:#3DD68C; --warn:#FFD23F; --p1:#FF5C7A; --p2:#FF9F1C; --p3:#FFD23F;
--p4:#3DD68C; --p5:#4CC9F0; --p6:#9B5DE5; --r-card:24px; --r-btn:18px; --r-pill:999px;
--shadow:0 10px 24px rgba(0,0,0,.12);`
Font: Fredoka everywhere (`font-family:"Fredoka",sans-serif`); headings 600–700, body 400–500.
Required component classes (Coder A implements, B/C consume):
`.card .btn .btn-primary .btn-secondary .btn-pill .btn-ghost .btn-3d` (stacked bottom shadow,
pressed = translateY), `.chip .badge .input .slider .toggle .modal .overlay .banner .spring-in`
(scale spring/overshoot keyframes), `.jiggle .pop .count-up .emote-pop .crown .plaque .leaderboard
.leaderboard-row .hidden`. Every tap: `.btn` plays press animation; pad plays UI sfx locally
(short Audio, silent on failure).

--------------------------------------------------------------------------------
## 10. CAMERA FLOW (camera.js)

Auto beats (mode==="auto"), driven by phase in update(ctx):
1. nextTurn: `flyToLane(i)` smooth tween (ease in-out) — NEXT_TURN_FLY_MS.
2. aiming: low behind ball: pos (laneX + aimX*0.3, 0.55, startZ + 2.2), lookAt down-lane point
   (laneX, 0.3, -8); gently laggy (lerp 0.08/frame).
3. rolling: chase cam pos = ball + (0, 0.9, 2.6), lookAt ball; when ball z < HEADPIN_Z + 4:
   hard CUT to pin-cam: pos (laneX + 1.6, 1.2, HEADPIN_Z + 2.8) lookAt pin deck.
4. settled/scored: hold pin-cam PIN_CAM_HOLD_MS, then leaderboard beat: dolly back+up toward
   (laneX, 3.2, 6) for LEADERBOARD_BEAT_MS while hud highlights leaderboard.
5. replay: dramatic low side cam at pin deck, slow orbit, letterbox.
Manual modes (set via cameraCycle command; display writes game.cameraView): fixed framings of the
ACTIVE lane — "follow" = beat 2/3 chase logic, "side" = (laneX + 3.5, 1.4, -8) lookAt lane center,
"top" = (laneX, 12, -8) looking straight down. Manual mode persists until another cameraCycle or
the next nextTurn phase, which force-resets to "auto" (writes cameraView.mode="auto").
shake(intensity): additive decaying noise on camera position, used by effects on strike.

--------------------------------------------------------------------------------
## 11. RESILIENCE RULES (all coders)

- Every remote asset (GLB/HDRI/SFX/music): Promise.race with ASSET_TIMEOUT_MS -> procedural/silent
  fallback. try/catch around every Audio play(). NEVER let a rejection escape to console-crash.
- physics: fixed timestep 1/60 accumulator; skip physics for non-active lanes (bodies sleep,
  pins of idle lanes are static visuals via setPinTransforms of their last state).
- net watch callbacks: always null-check value.
- Pads disable all inputs when meta.state==="paused" or not own turn; buttons never trust local
  state alone — display re-validates everything (turn, host, phase) before acting.
```
