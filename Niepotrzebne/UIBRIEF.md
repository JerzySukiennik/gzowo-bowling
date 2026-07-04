# GZOWO BOWLING — UI BRIEF (visual bible, v1)

AUTHORITATIVE for all 2D UI. Coders A/B/C follow this exactly. Token names match CONTRACT §9 —
this file extends them; where CONTRACT defines a name, that name wins. Vibe: friendly, kid-style,
bubbly, JUICY. Everything springs, everything pops, every tap has a sound. Fredoka everywhere.
Cream background, white bubbly cards, chunky pill buttons with 3D pressed shadows.

--------------------------------------------------------------------------------
## 1. CSS DESIGN TOKENS (`css/style.css` — Coder A implements verbatim on `:root`)

### 1.1 Colors

```css
:root {
  /* base (CONTRACT §9 — do not rename) */
  --bg: #FFF6E9;            /* warm cream — page background, TV and pad */
  --card: #FFFFFF;          /* card surface */
  --text: #2B2A4A;          /* ink — headings, primary text */
  --text2: #6B6A85;         /* secondary text, labels, hints */
  --primary: #FF6B6B;       /* coral — main CTAs, active states */
  --secondary: #4CC9F0;     /* sky — secondary buttons, info */
  --success: #3DD68C;       /* green — ready states, spare */
  --warn: #FFD23F;          /* yellow — attention, crown gold base */

  /* 6 player colors (index = order 0..5) */
  --p1: #FF5C7A;  /* pink-red */
  --p2: #FF9F1C;  /* orange   */
  --p3: #FFD23F;  /* yellow   */
  --p4: #3DD68C;  /* green    */
  --p5: #4CC9F0;  /* sky      */
  --p6: #9B5DE5;  /* purple   */

  /* derived tints (backgrounds behind colored things) */
  --bg-soft: #FFEFD9;                     /* slightly deeper cream, section alt */
  --line: rgba(43,42,74,.08);             /* hairline dividers */
  --overlay: rgba(43,42,74,.55);          /* modal/pause scrim */
  --gold: #FFC24B;                        /* crown, trophy */
  --gold-glow: rgba(255,194,75,.55);      /* crown glow shadow color */
```

Player-color tints for card backgrounds: use `color-mix(in srgb, var(--pN) 14%, white)`.
Text on player colors: always `--text` (#2B2A4A) — never white on --p3 yellow.

### 1.2 Radii, shadows, borders

```css
  /* radii (CONTRACT names) */
  --r-card: 24px;           /* cards, modals, panels, plaques */
  --r-btn: 18px;            /* standard buttons, inputs, chips */
  --r-pill: 999px;          /* main actions (Start, Ready, Throw), badges, cooldown ring */

  /* shadows */
  --shadow: 0 10px 24px rgba(0,0,0,.12);            /* soft card float */
  --shadow-sm: 0 4px 12px rgba(0,0,0,.10);          /* chips, small elements */
  --shadow-lift: 0 16px 40px rgba(0,0,0,.16);       /* modals, hovering cards */
  /* 3D press stack — .btn-3d: a SOLID bottom edge + soft drop. Edge color = darker of bg */
  --press-edge: 6px;                                 /* height of the solid bottom edge */
  --shadow-press: 0 var(--press-edge) 0 0 var(--press-edge-color, #E05555),
                  0 10px 20px rgba(0,0,0,.14);
  /* pressed state: translateY(var(--press-edge)) + shadow collapses to 0 2px 0 */
  --shadow-pressed: 0 2px 0 0 var(--press-edge-color, #E05555),
                    0 4px 8px rgba(0,0,0,.10);
```

`.btn-3d` recipe (the signature button): background `--primary` (or variant), border-radius
`--r-btn` (pill variants use `--r-pill`), box-shadow `--shadow-press`, transition transform 90ms +
box-shadow 90ms. `:active` => `transform: translateY(var(--press-edge))` + `--shadow-pressed`.
Edge colors per variant: primary #E05555, secondary #35A8CC, success #2FB574, warn #E0B32F,
white card buttons #E8DECB. Every `.btn-3d` press ALSO fires the `pop` animation on release
and a `ui` sfx (pad plays locally; TV plays for its own virtual events).

### 1.3 Spacing scale

```css
  --s1: 4px;  --s2: 8px;  --s3: 12px;  --s4: 16px;  --s5: 24px;
  --s6: 32px; --s7: 48px; --s8: 64px;  --s9: 96px;
```

Rules: card padding `--s5` (phone) / `--s6` (TV). Gap between cards `--s4` (phone) / `--s5` (TV).
Screen edge padding: `--s4` phone, `--s7` TV (TV needs safe margins — keep 48px min from edges).

### 1.4 Typography (Fredoka only)

```css
  --font: "Fredoka", sans-serif;

  /* PHONE sizes */
  --fs-hero: 32px;    /* screen titles (join steps, "Your turn!") w700 */
  --fs-h1: 24px;      /* card headings w600 */
  --fs-h2: 19px;      /* sub-headings w600 */
  --fs-body: 16px;    /* body w400..500 */
  --fs-label: 13px;   /* labels/meta w500, letter-spacing .04em, uppercase optional */
  --fs-btn: 18px;     /* button text w600 */

  /* TV sizes (display role sets class .tv on <body>; .tv overrides the same vars) */
  /* --fs-hero: 88px; --fs-h1: 48px; --fs-h2: 32px; --fs-body: 24px;
     --fs-label: 18px; --fs-btn: 28px;
     plus TV-only: --fs-giant: 160px (room code, STRIKE banner, winner name)  */
}
```

TV is watched from a couch: nothing interactive, so no size is ever below `--fs-label` 18px.
Numbers everywhere use `font-variant-numeric: tabular-nums` (steady count-ups).

### 1.5 Animation set (keyframes + springs — Coder A ships these classes)

Master curves:

```css
  --ease-spring: cubic-bezier(.34, 1.56, .64, 1);    /* standard overshoot */
  --ease-spring-big: cubic-bezier(.22, 1.9, .4, 1);  /* dramatic overshoot (banners, trophy) */
  --ease-out: cubic-bezier(.22, .61, .36, 1);        /* settles, bars */
  --ease-in-out: cubic-bezier(.65, 0, .35, 1);       /* camera-ish UI slides */
```

```css
/* .spring-in — element appears: scale 0 -> overshoot -> 1. Cards, chips, players joining. */
@keyframes spring-in {
  0%   { transform: scale(.3);  opacity: 0; }
  60%  { transform: scale(1.08); opacity: 1; }
  80%  { transform: scale(.96); }
  100% { transform: scale(1); }
}
.spring-in { animation: spring-in .45s var(--ease-spring) both; }

/* .pop — quick tap feedback / value change: 1 -> 1.15 -> 1. */
@keyframes pop {
  0% { transform: scale(1); } 40% { transform: scale(1.15); } 100% { transform: scale(1); }
}
.pop { animation: pop .28s var(--ease-spring); }

/* .jiggle — playful wiggle on hover / attention: rotate ±3deg. */
@keyframes jiggle {
  0%,100% { transform: rotate(0); } 25% { transform: rotate(3deg); }
  50% { transform: rotate(-3deg); } 75% { transform: rotate(1.5deg); }
}
.jiggle { animation: jiggle .4s ease-in-out; }
.jiggle-loop { animation: jiggle 1.2s ease-in-out infinite; }  /* hand hints in tutorial */

/* .banner-in / .banner-out — TV banners: slide+scale from top center. */
@keyframes banner-in {
  0% { transform: translateY(-60px) scale(.6); opacity: 0; }
  100% { transform: translateY(0) scale(1); opacity: 1; }
}
@keyframes banner-out {
  0% { transform: translateY(0) scale(1); opacity: 1; }
  100% { transform: translateY(-30px) scale(.85); opacity: 0; }
}
.banner-in  { animation: banner-in .5s var(--ease-spring-big) both; }
.banner-out { animation: banner-out .3s var(--ease-out) both; }

/* .crown-float — leader crown: gentle bob + tilt, infinite. */
@keyframes crown-float {
  0%,100% { transform: translateY(0) rotate(-6deg); }
  50%     { transform: translateY(-8px) rotate(4deg); }
}
.crown-float { animation: crown-float 2.2s ease-in-out infinite; }

/* .emote-pop — TV emote fly-up (see §3.6 for path); this is the base keyframe. */
@keyframes emote-pop {
  0%   { transform: translateY(0) scale(.4);      opacity: 0; }
  15%  { transform: translateY(-30px) scale(1.25); opacity: 1; }
  30%  { transform: translateY(-60px) scale(1); }
  100% { transform: translateY(-220px) scale(1) rotate(var(--emote-tilt, 8deg)); opacity: 0; }
}
.emote-pop { animation: emote-pop 1.6s var(--ease-out) both; }

/* .bar-grow — leaderboard bars: width scales with spring (JS sets --bar-w %). */
.leaderboard-bar { transition: width .7s var(--ease-spring); }

/* .count-up — number tickers. NOT a keyframe: JS pattern (below) + this pulse class. */
@keyframes count-pulse { 0%{transform:scale(1)} 50%{transform:scale(1.12)} 100%{transform:scale(1)} }
.count-up { animation: count-pulse .3s var(--ease-spring); }

/* .shake — small error shake (bad nick, room not found). */
@keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)}
  40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
.shake { animation: shake .35s ease-in-out; }
```

COUNT-UP PATTERN (JS helper, hud.js + pad both use): animate number over 600ms with
easeOutCubic (`1-(1-t)^3`), rendering `Math.round(lerp(from,to,eased))` each rAF; when done, add
`.count-up` class for the pulse and play a soft tick sfx at start. Never jump-cut a score.

STAGGER RULE: when N siblings spring in together (player cards, ranking rows, swatches), delay
each by `index * 70ms` (`animation-delay`). Lists feel alive, never simultaneous.

REDUCED MOTION: `@media (prefers-reduced-motion: reduce)` — all animations `animation: none`,
transitions <= 150ms linear. Sounds stay.

--------------------------------------------------------------------------------
## 2. SCREENS — CONCRETE LAYOUTS

All screens sit on `--bg` cream. TV = 1920x1080 reference, `.tv` class. Phone = portrait,
360–430px wide reference; everything single-column, thumb-reach bottom zone for actions.

### 2.1 TV — CONNECT SCREEN (state lobby, 0 players)

Full-screen centered, 3D scene NOT yet visible (or blurred idle lane behind at 20% — optional,
must not distract).

- Top center, `--s7` from top: game logo "GZOWO BOWLING" — `--fs-hero` w700, `--text`, with a 🎳
  that does `.jiggle-loop` slowly. Below it `--fs-body` `--text2` tagline (i18n lobby.title).
- Center: one big white `.card` (radius `--r-card`, `--shadow-lift`, padding `--s7`), springs in.
  Inside, two columns, gap `--s7`:
  - LEFT: QR code, 420x420px, on white with `--s4` quiet-zone padding, thin `--line` border,
    radius `--r-btn`. Under it `--fs-label` `--text2`: i18n lobby.scanToJoin.
  - RIGHT (vertically centered): label `--fs-label` `--text2` "ROOM CODE" (lobby.roomCode), then
    the 4-letter code at `--fs-giant` (160px) w700, letter-spacing .12em, `--text`. Each letter
    is its own span in a rounded `--bg-soft` tile (radius `--r-btn`, padding `--s3 --s4`) —
    tiles spring in staggered on room create. Below: `--fs-body` `--text2` short URL of the game
    (readable fallback for people who can't scan).
- Bottom center `--s6` from bottom: `--fs-body` `--text2` pulsing (opacity .5↔1, 2s)
  lobby.waitingForPlayers.

### 2.2 TV — LOBBY (>=1 player joined)

The connect card shrinks and docks: QR + code move to a compact card TOP-RIGHT (QR 200px, code
`--fs-h1` per-letter tiles) — animate the transition with a 500ms `--ease-spring` scale/position
tween (FLIP or simple re-render with spring-in; must not blink).

- TOP-LEFT: logo small (`--fs-h1`) + players count chip `.chip` (lobby.playersCount "3/6").
- CENTER: player card grid — 3 columns x 2 rows max, gap `--s5`, cards 380x200px. Each player
  card `.card` springs in (`.spring-in`, sound "pop") the moment the player node appears:
  - Left: ball preview disc 96px — flat 2D circle rendered with the player's ballColor +
    pattern (same flat-canvas painter as sharecard §4.3) inside a ring of the PLAYER color
    (4px). Weight shown as a small badge under it ("L"/"M"/"H" chip in `--bg-soft`).
  - Right: nick `--fs-h1` w600 `--text`; under it lane theme chip (icon + name, `--fs-label`);
    HOST badge (`.badge`, `--warn` bg, `--text`) if isHost; connection dot (`--success` /
    `--text2` when connected false).
  - Card top border: 6px strip of player color, rounded into the card radius.
  - While a phone is mid-join-flow (node exists, ready false): card shows nick (or "…") with a
    ghost pulsing ball disc and label common.loading.
  - Empty slots: dashed-border ghost cards (border 3px dashed `--line`, no shadow) with a big
    "+" `--text2` — communicates capacity, no interaction.
- BOTTOM-LEFT: settings preview card (mirror of host settings, read-only): row of chips —
  language flag chip ("PL"/"EN"), rounds chip ("5 ⟳"), narrow-lane chip (on = `--warn` bg + "!"),
  bumpers chip per player only when any ON. Each chip `.pop`s + tick sfx when the host changes a
  value.
- BOTTOM-CENTER: `--fs-body` `--text2` lobby.startHint ("Host presses Start on their phone") —
  with a small phone icon jiggling. Solo: also lobby.soloHint.
- On Start: whole UI cards do banner-out, TV dives into intro flythrough.

### 2.3 TV — GAME HUD (chrome over the 3D canvas; hud.js DOM layer)

The 3D scene fills the screen. HUD zones (nothing overlaps the active lane center):

- LEFT EDGE: LEADERBOARD panel, fixed, width 340px, top `--s7`, bottom auto. `.card` at 92%
  opacity, radius `--r-card`, `--shadow`. Header `--fs-label` hud.leaderboard + frame chip
  hud.frameOf "3/5". Rows (`.leaderboard-row`, height 56px, gap `--s2`), sorted by total desc
  with 400ms `--ease-spring` reorder (FLIP translateY):
  - left: 10px tall color pip (player color, radius `--r-pill`) + nick `--fs-body` w600
    (truncate 10ch);
  - right: total `--fs-h2` w700 tabular, count-up on change; tiny "+X" `--warn` bonus chip when
    trickBonus > 0 (`.pop` when it grows);
  - under the row content: the BAR — 6px height, radius `--r-pill`, player color, width % of
    current max total, `.leaderboard-bar` spring transition;
  - ACTIVE player row: scales to 1.04, bg tint of their color (14% mix), 2px solid player-color
    border; a small 🎳 marker jiggles at row start.
  - Leader row(s): mini crown 👑 16px before the nick, `.crown-float`.
  - Disconnected: row at 40% opacity + broken-plug glyph.
- LANE PLAQUES (3D-anchored via plaque anchors, DOM projected): floating pill above each lane's
  pin deck area: player-color bg (full saturation), `--text` ink, radius `--r-pill`, padding
  `--s2 --s4`: nick w600 + total w700 tabular (count-up). Active player's plaque scales 1.15 and
  gets `--shadow-lift`. LEADER plaque: gold crown (emoji or inline SVG, 40px) floating ABOVE it,
  `.crown-float`, plus `box-shadow: 0 0 24px var(--gold-glow)` golden halo. Multiple leaders =
  multiple crowns (each its own float phase offset).
- TOP CENTER: BANNER slot (one at a time, queued). `.banner`: big pill card, radius `--r-pill`,
  padding `--s4 --s7`, `--shadow-lift`, `banner-in`/`banner-out`. Content `--fs-h1` w700.
  Kinds & looks:
  - round: white bg, "ROUND 3/5"; if finalFrame append `--primary` "FINAL!" chip.
  - narrow: `--warn` bg, ⚠️ + banner.narrowLane, plus the whole banner does one `.jiggle` —
    this IS the narrow-round intro; shows immediately after the round banner (queued), and the
    affected lanes visually squeeze in 3D at the same moment.
  - playerTurn: player-color bg, "{name}" + 🎳.
  - strike: `--primary` bg, `--fs-giant` "STRIKE!" (TV-only size), letters stagger-spring in
    individually (60ms), stays 1.6s. turkey: same at 1.15 scale, "TURKEY!!" + 🦃, longer confetti.
  - spare: `--success` bg. gutter: `--text2` bg white text, small sad drop 💧.
  - trickshot: see below. suddenDeath: `--text` dark bg, white text, ⚡, screen edge vignette
    pulses red once. mulligan/skipped/undo/newGame: white bg, `--secondary` icon.
- TRICK-SHOT CALLOUT (effects + hud): a diagonal slam — "TRICK SHOT!" `--fs-hero` w700 on a
  `--warn` starburst-shaped card (CSS rotated squares stack), slams in at -8deg with
  `--ease-spring-big` scale from 3 -> 1 (stamp effect) + white flash overlay 120ms + freeze-frame
  feel (physics already settled). Subtitle line: which trick (banner.trickshot.split/hook/bank)
  + "+5". Sound: distinct sting.
- EMOTE FLY-UPS: spawn at the emitting player's lane plaque, fly up ~220px along a slight
  S-curve (§3.6), 64px emoji, 1.6s life. Max 3 concurrent per lane (queue the rest).
- BOTTOM RIGHT: camera mode chip (only when mode != auto): small `.chip` "📷 SIDE" — reminds why
  the camera is parked; `.pop` on change.
- PAUSE OVERLAY: full-screen `--overlay` scrim (backdrop-blur 6px), centered white `.card` with
  ⏸ 96px, hud.paused `--fs-hero`, `--fs-body` `--text2` "Host can resume from their phone".
  Music note: a small equalizer bar icon frozen. Springs in; scrim fades 250ms.
- ROUND/NARROW INTRO already covered by banner queue: round banner (2.5s) -> narrow banner if
  narrowRound (overlaps last .5s) -> playerTurn banner.

### 2.4 TV — WINNER SCREEN

Full-screen takeover on `--bg` (3D dimmed to 25% behind, confetti loop over everything).

Layout — 3 zones, left to right:

- LEFT (55%): the CELEBRATION.
  - winner.title ("WE HAVE A WINNER!" / "MAMY ZWYCIĘZCĘ!") `--fs-h1` `--text2` top.
  - TROPHY 🏆 180px, drops in from top with `--ease-spring-big` (falls, squashes 1.1x/0.9y on
    landing, rebounds) + thud sfx + confetti burst on landing.
  - Winner nick `--fs-giant` w700 in their player color; winner's ball disc 140px next to it,
    slowly rotating (CSS 8s linear infinite). winner.wins line `--fs-h1`.
  - Ties (shared sudden-death impossible, but co-winners in ranking): winners stacked.
  - BELOW: BEST-THROW REPLAY SLOT — a 640x360 rounded panel (radius `--r-card`, 4px `--warn`
    border, label winner.bestThrow + player chip + pin count). The 3D replay renders through
    this letterboxed window (hud provides the frame; replay.playBest plays inside; loops with
    2s pause). If no best throw: panel hidden.
- RIGHT (45%): white `.card` full-height, padding `--s6`:
  - winner.ranking header `--fs-h2`.
  - Ranking rows (all players), stagger spring-in 120ms apart, height 72px: place number
    `--fs-h1` w700 (1st gold, 2nd silver #C7C9D3, 3rd bronze #D9985F, rest `--text2`), ball
    disc 48px, nick `--fs-h2`, total `--fs-h1` w700 count-up from 0 (staggered — sounds like a
    slot machine finishing player by player, bottom rank first, winner last).
  - BOTTOM of card: SHARE QR — 180px QR (controllerUrl; pads already show share UI) + label
    winner.scanForCard `--fs-label`. QR springs in LAST, after count-ups.
- Bottom center: `--fs-body` `--text2` winner.thanks + "Host: Play again from the menu".

### 2.5 PHONE — JOIN FLOW (join.js) — 3 steps, one card per step

Shell: `--bg` page, top logo strip (small "GZOWO BOWLING" `--fs-h2` w700 centered, `--s4`
padding), progress dots under it (3 dots, active = pill-stretched `--primary`). Each step is a
full-width `.card` that springs in; step change = old card banner-out left, new spring-in.

STEP 1 — NICK:
- join.enterNick `--fs-h1`. `.input`: 56px tall, radius `--r-btn`, `--bg-soft` bg, `--fs-h2`
  centered text, maxlength 12, autofocus. Live char counter `--fs-label`.
- Validation: <1 char -> `.shake` + join.nickTooShort in `--primary`.
- CTA bottom: `.btn-3d.btn-pill` primary full-width 60px common.next.

STEP 2 — BALL CUSTOMIZER (the star):
- TOP: LIVE 3D PREVIEW — square canvas, full card width minus padding (~300px), the three.js
  ball (ballpreview.js) on transparent bg over a soft radial cream vignette; slow auto-rotate,
  drag to rotate (join.rotateHint `--fs-label` `--text2` with a 👆 that jiggles once).
- COLOR: label join.ballColor. 8 swatches (BALL_COLORS) in one row, 40px circles, gap `--s3`;
  selected = 3px `--text` ring + scale 1.15 spring + pop sfx; ball repaints instantly.
- PATTERN: label join.ballPattern. 6 chips in 3x2 grid: each chip 96x64 shows a mini flat
  preview of the pattern in current color + name `--fs-label`. Selected = `--text` 2px border +
  tint bg + `.pop`.
- WEIGHT: label join.ballWeight. Segmented control, 3 segments (radius `--r-btn` outer):
  join.weight.light/medium/heavy with icons (🪶 / ⚖️ / 🏋️). Below, one line `--fs-label`
  `--text2` hint swaps per selection (join.weightHint.*) — the strategy tooltip. Selecting
  heavy makes the 3D ball do a tiny drop-bounce; light makes it bob up. (Pure preview flair.)
- CTA: common.next. Back: `.btn-ghost` top-left arrow.

STEP 3 — LANE THEME:
- join.laneTheme `--fs-h1`. 5 theme cards, vertical list, 76px tall each: emoji icon 40px
  (🎳 classic / 🪐 space / 🌈 neon / 🕺 retro / 🎄 xmas), theme name `--fs-h2`, right-side
  radio dot. Selected: theme-flavored gradient border (2px) + `.pop`. Cards stagger in.
- CTA: join.ready `.btn-3d.btn-pill` success color. On tap: big `.pop`, confetti micro-burst on
  the button, sfx, -> tutorial or lobby wait.

### 2.6 PHONE — LOBBY WAIT

- Header: room code chip + "you" card: my ball disc 72px + nick + my player-color strip +
  (join.youAreHost badge if host).
- Other players list: compact rows (ball disc 32px + nick + host badge), spring in as they join.
- NON-HOST: big friendly illustration area (bouncing pins CSS animation) + join.waitingForHost
  pulsing.
- HOST: SETTINGS card:
  - lobby.settings.language: 2 segments "Polski" / "English" (flag emoji + name).
  - lobby.settings.rounds: 3 segments "3 / 5 / 10", default 5.
  - lobby.settings.narrowLane: `.toggle` switch (44x26, knob springs side to side, `--warn`
    when on) + one-line description.
  - lobby.settings.bumpers: per-player rows (nick + `.toggle`).
  - Every change: pop + tick sfx locally, chip pops on TV.
  - BOTTOM, sticky: **START** — full-width 68px `.btn-3d.btn-pill` `--primary`, `--fs-btn`
    w700 + 🎳. Disabled (40% opacity, no 3D edge) until >= 1 ready player. THE juiciest button:
    idle subtle scale breathe (1↔1.02, 3s); on tap: press, burst, sound.

### 2.7 PHONE — INTERACTIVE TUTORIAL OVERLAY (tutorial.js)

Full-screen `--overlay` scrim over a live (disabled) throw screen mock. 6 steps: aim, spin,
flick, emotes, skipTurn, mulligan.

- STEP CARD: bottom-docked `.card`, radius `--r-card` top corners only, padding `--s5`: step
  chip "1/6" `--fs-label`, tutorial.X.title `--fs-h1`, tutorial.X.body `--fs-body` `--text2`,
  buttons row: common.skip `.btn-ghost` left, common.next `.btn-3d` right (last step:
  tutorial.done, success color).
- SPOTLIGHT: the relevant control is un-dimmed (scrim has a rounded cutout via 4-panel scrim or
  outline+brighten) and does `.jiggle-loop`.
- HAND HINT: 👆 48px animated along the target gesture path: aim = horizontal drag loop; spin =
  arc along the dial; flick = fast upward swipe with a motion-line trail (CSS ::after streak),
  repeating every 1.8s.
- INTERACTIVE: steps 1–3 complete by DOING it (drag the puck / move dial / flick) — on success:
  ✓ pop + success sfx + auto-advance after 500ms. Steps 4–6 are look-and-next.
- Reopen: pad menu toggle (pad.tutorialToggle); closable any time (X top-right).

### 2.8 PHONE — THROW SCREEN (throwpad.js) — MY TURN

Vertical layout, top to bottom:

- STATUS BAR (56px): my color strip + pad.yourTurn `--fs-h2` w700 + frame chip "F3 · T1".
  Camera cycle button right: `.chip` 44px 📷, label pad.camera.X, pops per cycle.
- MINI LANE (top-down, ~45% of height): rounded vertical lane graphic — cream gutters, lane in
  soft wood tint (or theme tint), arrow/dot markings, 10 pin dots at top, narrow rounds render
  visibly narrower (animated squeeze + ⚠️ chip). THE PUCK: 56px circle styled as MY ball
  (color+pattern), draggable horizontally (full lane width) + up to a forward limit line
  (dashed). Drag: puck scales 1.1, soft shadow grows; light haptic tick every 10% of travel.
  PREVIEW ARROW from puck toward pins, curved by spin (quadratic curve, curvature = spin),
  player-color, animated dash-march.
- SPIN DIAL (~15%): horizontal arc dial (-1..+1), 64px thumb knob with ↺/↻ glyph; snaps to 0
  with spring when near center; value updates the preview arrow live. Label pad.spinLabel +
  live value chip ("+0.6").
- FLICK ZONE (~25%): rounded `--bg-soft` area, big upward chevrons animating upward (marching,
  1.2s loop), pad.throwHint `--fs-body` `--text2`. Flick: trail streak follows the finger;
  release = vibrate(30) + whoosh sfx + puck launches up the mini lane visually and screen
  transitions to rolling state (pad.rolling + a spinning ball loader). Power meter: right-edge
  vertical bar fills live with flick speed, color lerps `--success`->`--warn`->`--primary`.
- ACTION ROW (bottom, 64px): pad.skipTurn `.btn-ghost` (only my turn); MULLIGAN `.btn-3d`
  `--warn` (only when mulliganAvailable — springs in with sfx, label pad.mulligan; disappears
  forever after use, replaced once by pad.mulliganGone toast); host hamburger (see §2.11) far
  right ☰ 48px.
- EMOTE BAR: see §2.10 — docked above action row, collapsible.

### 2.9 PHONE — WAITING / SPECTATE (not my turn)

- Top: pad.waitTurn with {name} — current player's nick in a big chip of THEIR color + their
  ball disc 48px, `.pop` on each turn change + soft sfx.
- Center: MY SCORE card: hud.total label + big total `--fs-hero` count-up; small frame strip:
  N mini-squares (one per frame), each shows t values ("9/", "X", "7 2"), current frame
  outlined in my color. Below: my rank chip ("#2 of 4") — pops on change.
- Live ticker line: last event as text ("Ola: STRIKE! 🎳") — slides in, `--fs-label`.
- Bottom: emote bar (always usable) + camera cycle + host hamburger. Paused state: overlay
  chip pad.paused; all inputs disabled at 40% opacity.

### 2.10 PHONE — EMOTE BAR

Horizontal row of 8 buttons (👏 😂 😮 😭 🔥 💀 🤡 🎳), 44px each, radius `--r-pill`, `--card` bg,
`--shadow-sm`, horizontally scrollable if tight. Tap: emoji `.pop`s + flies up off the button
(mini local emote-pop) + click sfx + sends. COOLDOWN: 3s — a conic-gradient ring sweeps around
EVERY button (the bar is cooling, not the single emoji), buttons 50% opacity; ring completes ->
tiny pop-back + tick sfx. Attempt during cooldown: bar does `.shake` (no sound spam).

### 2.11 PHONE — HOST HAMBURGER (hostmenu.js; host only)

☰ button opens a bottom sheet `.modal` (radius `--r-card` top, slides up with spring, scrim):

- Grid of big `.btn` tiles (2 columns, 88px): Pause/Resume (⏸/▶ swaps by state), host.skipTurn
  ⏭, host.undo ↩, host.replay 🎬, host.newGame 🔄, host.quitGame 🚪 (this one `--primary` tinted;
  the ONLY destructive-looking tile).
- host.bumpers section: per-player toggle rows (live mid-game).
- host.music section: play/pause + skip buttons + volume `.slider` (thumb pops on drag end).
- Every command tap: press anim + sfx + sheet stays open (except quit/newGame which close it).
- When state==="finished": sheet gains a top SHARE block — see §2.12.

### 2.12 PHONE — WINNER SCREEN (state finished)

- Confetti CSS rain over cream bg. 🏆 emoji 96px spring-drop.
- Winner line: winner ball disc + nick in player color `--fs-hero` + winner.wins.
- My placement card: "#3" big + my total (count-up) + friendly line (pad.nice tone).
- Full ranking list (same row style as TV right card, phone-sized 56px rows, staggered).
- THE CARD: rendered share-card PNG preview (from sharecard.js generateCard) as an image,
  radius `--r-btn`, `--shadow`, ~70% width, slight -2deg tilt like a printed photo, springs in.
- HOST ONLY under it: winner.share `.btn-3d.btn-pill` primary (navigator.share of the PNG file;
  fallback -> download) + winner.download `.btn-ghost`. NON-HOST: winner.download only.
- Bottom (host): winner.playAgain `.btn-3d` success -> newGame command.

--------------------------------------------------------------------------------
## 3. MICROINTERACTIONS (exact behavior map)

SOUND LAW: every tap = `ui` sfx (short, soft "pk"); every element APPEARING with spring-in =
soft "pop" sfx (only for singular events — staggered lists play ONE pop, not N; banners have
their own stings). All Audio wrapped try/catch — silence on failure, never block the animation.

| Trigger | Visual | Sound | Haptic (pad) |
|---|---|---|---|
| Any `.btn` press | `.btn-3d` translateY press -> release `.pop` | ui | vibrate(10) |
| Card/chip appears | `.spring-in` (+stagger in lists) | pop (once) | — |
| Player joins (TV) | player card spring-in + count chip `.pop` | pop | — |
| Setting changed | chip `.pop` on TV, control `.pop` on pad | tick | 10 |
| Start pressed | button burst + TV cards banner-out | big ui sting | 20 |
| Swatch/pattern/weight/theme select | scale-up spring, ball repaint <100ms | tick | 10 |
| Aim drag | puck 1.1x, arrow live | roll-tick every 10% | 10/step |
| Spin dial | arrow curvature live, snap-to-0 spring | tick on snap | 10 on snap |
| Flick release | trail streak, puck launch, power bar freeze-pop | whoosh | 30 |
| Own pins hit (lastResult) | pad flashes result chip | (TV plays crash) | 60 |
| STRIKE own | pad "STRIKE!" card spring | (TV) | [80,40,120] |
| TV strike | giant banner letters stagger, confetti+fireworks+shake | strike sting | — |
| TV spare/gutter | banner spring / sad banner | spare / gutter | — |
| Score change | count-up 600ms + `.count-up` pulse | soft tick at start | — |
| Leaderboard reorder | rows FLIP translateY 400ms spring | whoosh-soft | — |
| Leaderboard bar | width spring .7s `--ease-spring` (overshoots past, settles back) | — | — |
| Crown gained/lost | crown scale 0->1 spring + glow fade-in; loser's crown pops out (scale->0, .25s) | tiny fanfare | — |
| Crown idle | `.crown-float` bob 2.2s infinite + gold glow | — | — |
| Emote sent (pad) | button pop + mini fly-up + cooldown ring sweep | emote sfx | 10 |
| Emote on TV | fly-up path §3.6 | emote sfx (per emote, quiet) | — |
| Turn change | plaque active-scale swap, playerTurn banner, camera fly | — | 20 (new player's pad) |
| Mulligan appears | button spring-in `--warn` | hopeful ding | 20 |
| Mulligan used | banner mulligan, pins visually restore, button vanishes | rewind swoosh | 30 |
| Trick shot | stamp slam §2.3 + flash + "+5" chip flies to leaderboard row | sting | — |
| Pause | scrim fade + card spring; TV music pauses | pause blip | — |
| Narrow round | banner jiggle + lanes squeeze anim in 3D + pad mini-lane squeezes | warn sting | 20 |
| Winner reveal | trophy drop-squash, rank count-ups bottom-up, QR last | fanfare + slot ticks | [40,40,40] |
| Error (bad code/nick) | `.shake` + red hint text | error buzz | [30,30] |

### 3.6 Emote fly-up path (TV, hud.popEmote)

Spawn at the player's plaque top-center. 64px emoji element. Path: translateY 0 -> -220px over
1.6s `--ease-out`, with lateral sway `translateX = sin(t * 2π) * 14px` (CSS: outer element does
the Y keyframe `emote-pop`, inner element runs a 0.8s x-sway keyframe twice) and end tilt
`--emote-tilt` randomized ±12deg per spawn. Scale: .4 -> 1.25 (pop at 15%) -> 1. Opacity: fades
last 30%. Max 3 concurrent per lane; extra emotes queue at 150ms intervals. Same emote spammed
by 2+ players simultaneously: spawn slightly offset x (±24px), never stacked exactly.

### 3.7 Count-up pattern (canonical)

600ms, easeOutCubic, rAF, tabular-nums, `.count-up` pulse on completion, tick sfx at start.
Winner-screen totals: 1200ms each, staggered bottom-rank-first, winner last (drama).

--------------------------------------------------------------------------------
## 4. SHARE CARD PNG — 1080 x 1350 (sharecard.js, canvas 2D, pure)

Design-system styling in flat canvas. Fredoka via document fonts (await document.fonts.ready;
fallback: sans-serif — must still look fine). All colors from tokens above. Rounded rects via
path helper, radius values scaled: card 48, chip 24, pill = h/2.

ZONE MAP (x, y, w, h on the 1080x1350 canvas):

```
BG: full 1080x1350 fill --bg #FFF6E9. Confetti dots: ~40 random 8–16px circles in the 6 player
colors at 18% alpha, scattered ONLY in top 300px and bottom 100px bands (never behind text).

1. HEADER (0, 0, 1080, 200):
   - "GZOWO BOWLING" centered, Fredoka w700 72px, #2B2A4A, baseline y=110.
   - 🎳 glyph 56px left of the text (or drawn pin+ball icon if emoji rendering unreliable —
     draw simple flat pin: white rounded shape + 2 red stripes).
   - Date centered below: card.date locale-formatted (pl: "3 lipca 2026", en: "July 3, 2026"),
     Fredoka w500 34px, #6B6A85, baseline y=168.
   - Divider: 3px rounded line #2B2A4A @ 8% alpha, x 120..960, y=200.

2. WINNER BLOCK (90, 240, 900, 340): white rounded card (radius 48), soft shadow (shadowBlur 30,
   rgba(0,0,0,.10), offsetY 12).
   - Trophy: draw flat 🏆 (emoji 120px) OR flat vector cup in --gold with #2B2A4A outline,
     centered x=270, y block-center.
   - Winner ball: 140px circle at x=270 under/next to trophy? NO — layout: LEFT 40% = trophy
     (top) stacked over winner ball disc 120px (bottom), RIGHT 60%:
     - card.winner label, Fredoka w500 30px uppercase letterspaced, #6B6A85, y=310.
     - Winner nick, Fredoka w700 88px, in WINNER'S playerColor, y=400 (shrink-to-fit if >9ch).
     - Total score: "187" Fredoka w700 96px #2B2A4A + small "pts"/"pkt" w500 34px #6B6A85, y=520.
   - Card top edge: 10px strip of winner playerColor rounded into radius.
   - Co-winners (winnerIds >1): nicks stacked at 64px each, shared trophy.

3. RANKING (90, 620, 900, ~560): card.ranking label w600 36px #2B2A4A at y=650, then rows.
   - Row height 84px, gap 12px, max 6 rows (fits: 650+6*96=1226 < footer). Row = rounded rect
     (radius 24) filled: rank1 = playerColor @14% mix on white; others plain white; all with
     hairline stroke rgba(43,42,74,.08).
   - Row content, left to right (padding 28):
     a. Place: "1." Fredoka w700 44px — #FFC24B gold for 1, #C7C9D3 for 2, #D9985F for 3,
        #6B6A85 rest. Width slot 70px.
     b. BALL MINIATURE 56px circle: fill ballColor, then pattern overlay (see 4.3), then 2px
        rgba(0,0,0,.08) rim. Centered in 70px slot.
     c. Player color pip: 12x36px rounded bar of playerColor.
     d. Nick: Fredoka w600 40px #2B2A4A, truncate with "…" at ~330px width.
     e. Right-aligned total: Fredoka w700 48px #2B2A4A, tabular feel (right edge x=962).
     f. Rank 1 row only: small crown drawn/emoji 32px above-left of the ball miniature.

4. FOOTER (0, 1230, 1080, 120):
   - Divider line as header's at y=1240.
   - Centered: "gzowo bowling · jerzysukiennik.github.io/gzowo-bowling" Fredoka w500 28px
     #6B6A85, y=1300. (Build from location at runtime? NO — sharecard is pure: hardcode the
     display string "Gzowo Bowling" + t('card.title') branding; the URL line uses a constant
     passed in or just the branding text. Keep it to branding + 🎳 to stay deploy-agnostic.)
   - Small 🎳 16px each side of the footer text.
```

### 4.3 Ball pattern painters (canvas, also reused conceptually by TV player cards)

Flat 2D, drawn inside the circle clip, base = ballColor, overlay = white @ .85 alpha
(or #2B2A4A @ .25 on light balls — pick by luminance):
- solid: base only + top-left white highlight ellipse @ .25.
- stripes: 3 diagonal 10px-wide stripes at -30deg.
- dots: 7 dots (12% of diameter) in offset grid.
- swirl: 2 spiral arcs (arc segments of decreasing radius from center).
- stars: 4 small 5-point stars scattered.
- split: half/half — left base color, right overlay color, 4px divider line.
Always finish: highlight ellipse top-left + darker rim (rgba(0,0,0,.08), 2px inset) + 3 finger
holes ONLY on the big 3D ball — canvas miniatures get NO holes (too small, reads as dirt).

--------------------------------------------------------------------------------
## 5. HARD RULES (checklist for Reviewer)

1. Fredoka is the ONLY font. Tabular numerals on every score.
2. Nothing appears without spring-in; nothing changes numerically without count-up.
3. Every tap: sound + press animation + (pad) haptic tick. Silent failure on audio, always.
4. Player color != ball color, ever conflated. Player color = lane/leaderboard/plaque/ranking
   identity; ball color = ball + miniatures only.
5. TV text >= 18px; phone touch targets >= 44px; Start/Throw actions >= 60px tall.
6. Contrast: never white text on --warn/--p3 yellow; use --text ink on all player colors.
7. prefers-reduced-motion honored (animations off, sounds stay).
8. All strings via t(key) — this brief's English strings are illustrative only.
9. Banner queue: one banner at a time, never overlapping the trick-shot stamp (trick stamp
   delays queued banners by its duration).
10. Share card must render correctly with 1–6 players and 12-char nicks.
