// Gzowo Bowling — TV game brain: state machine, full bowling scoring, commands, mulligan/undo, trick shots, sudden death, winner flow.
import { GAME, LANE, TIMING } from "../config.js";
import { t, getLang } from "../i18n.js";
import * as net from "../net.js";

const PIN_ADJ = [
  [1, 2], [0, 2, 3, 4], [0, 1, 4, 5], [1, 4, 6, 7], [1, 2, 3, 5, 7, 8],
  [2, 4, 8, 9], [3, 7], [3, 4, 6, 8], [4, 5, 7, 9], [5, 8],
];

let D = null;
let meta = { state: "lobby", settings: { language: "pl", frames: GAME.DEFAULT_FRAMES, narrowLaneOn: false } };
let players = {};
let orderIds = [];
let prevConnected = {};
let phase = "lobby";
let phaseT = 0;
let turnTimer = 0;
let N = GAME.DEFAULT_FRAMES;
let cur = { playerId: null, frameIndex: 0, throwIndex: 0, round: 1 };
let narrowRound = false;
let rackMask = 0x3FF;
let preMask = 0x3FF;
let framesT = {};
let trickBonus = {};
let consec = {};
let sd = null;
let sdThrows = {};
let sdScores = {};
let mulliganAvailable = false;
let lastResult = null;
let camMode = "auto";
let camSetBy = null;
let inputAll = {};
let lastAim = { x: 0, forward: 0 };
let baseThrowTs = 0;
let throwReleaseTs = 0;
let consumedMullTs = 0;
let throwCtx = null;
let snapshot = null;
let undoState = null;
let pendingReplay = false;
let crashPlayed = false;
let gutterPlayed = false;
let settleHold = 0;
let settleT = 0;
let rollT = 0;
let pausedFlag = false;
let musicWasPlaying = false;
let bestLoopTimer = 0;
let winnerShown = false;
let manualReplayReturn = null;
let gameStarted = false;

function playerArr() {
  return orderIds.map((id, i) => {
    const p = players[id] || {};
    return { id, nick: p.nick, playerColor: p.playerColor, order: i, connected: p.connected, bumperOn: p.bumperOn };
  });
}

function laneOf(pid) {
  return Math.max(0, orderIds.indexOf(pid));
}

function countBits(m) {
  let c = 0;
  for (let i = 0; i < GAME.PIN_COUNT; i++) if ((m >> i) & 1) c++;
  return c;
}

function isSplitMask(mask) {
  if (mask & 1) return false;
  const standing = [];
  for (let i = 0; i < GAME.PIN_COUNT; i++) if ((mask >> i) & 1) standing.push(i);
  if (standing.length < 2) return false;
  const visited = new Set([standing[0]]);
  const stack = [standing[0]];
  while (stack.length) {
    const n = stack.pop();
    for (const adj of PIN_ADJ[n]) {
      if ((mask >> adj) & 1 && !visited.has(adj)) {
        visited.add(adj);
        stack.push(adj);
      }
    }
  }
  return visited.size < standing.length;
}

function scoreFrames(throwsPerFrame, frameCount) {
  const balls = [];
  for (let f = 0; f < frameCount; f++) {
    const tf = throwsPerFrame[f] || [];
    for (const v of tf) balls.push(v);
  }
  const frames = [];
  let bi = 0;
  let cum = 0;
  let cumOk = true;
  let total = 0;
  for (let f = 0; f < frameCount; f++) {
    const tf = (throwsPerFrame[f] || []).slice();
    const last = f === frameCount - 1;
    let frameScore = 0;
    let complete = false;
    let bonusKnown = true;
    if (last) {
      frameScore = tf.reduce((a, b) => a + b, 0);
      const marked = tf.length >= 2 && (tf[0] === 10 || tf[0] + tf[1] === 10);
      const need = marked ? 3 : 2;
      complete = tf.length >= need;
    } else if (tf.length >= 1 && tf[0] === 10) {
      const b1 = balls[bi + 1];
      const b2 = balls[bi + 2];
      frameScore = 10 + (b1 || 0) + (b2 || 0);
      complete = true;
      bonusKnown = b1 !== undefined && b2 !== undefined;
    } else if (tf.length >= 2 && tf[0] + tf[1] === 10) {
      const b1 = balls[bi + 2];
      frameScore = 10 + (b1 || 0);
      complete = true;
      bonusKnown = b1 !== undefined;
    } else {
      frameScore = (tf[0] || 0) + (tf[1] || 0);
      complete = tf.length >= 2;
      bonusKnown = true;
    }
    total += frameScore;
    if (complete && bonusKnown && cumOk) {
      cum += frameScore;
      frames.push({ t: tf, cum });
    } else {
      cumOk = false;
      frames.push({ t: tf, cum: null });
    }
    bi += tf.length;
  }
  return { frames, total };
}

function computedScores() {
  const out = {};
  for (const pid of orderIds) {
    const s = scoreFrames(framesT[pid] || [], N);
    out[pid] = {
      frames: s.frames,
      total: s.total + (trickBonus[pid] || 0),
      trickBonus: trickBonus[pid] || 0,
      sd: sdScores[pid],
    };
  }
  return out;
}

function writeScores(pid) {
  const s = scoreFrames(framesT[pid] || [], N);
  const obj = {
    frames: s.frames,
    total: s.total + (trickBonus[pid] || 0),
    trickBonus: trickBonus[pid] || 0,
  };
  if (sdScores[pid] && sdScores[pid].length) obj.sd = sdScores[pid];
  net.write("scores/" + pid, obj);
}

function writeAllScores() {
  for (const pid of orderIds) writeScores(pid);
}

function writeGame() {
  net.update("game", {
    phase,
    currentPlayerId: cur.playerId,
    currentFrameIndex: cur.frameIndex,
    throwIndex: cur.throwIndex,
    round: cur.round,
    narrowRound,
    mulliganAvailable,
    rackMask: rackMask,
    cameraView: { mode: camMode, setBy: camSetBy, ts: Date.now() },
    suddenDeath: sd ? { active: true, round: sd.round, playerIds: sd.playerIds } : null,
    lastResult: lastResult || null,
  });
}

function setPhase(p) {
  phase = p;
  phaseT = 0;
  net.write("game/phase", p);
}

function refreshHud() {
  const scores = computedScores();
  D.hud.updateLeaderboard(playerArr(), scores, cur.playerId);
  D.hud.updatePlaques(playerArr(), scores, cur.playerId);
  let max = 0;
  for (const pid of orderIds) max = Math.max(max, scores[pid].total);
  const leaders = max > 0 ? orderIds.filter((pid) => scores[pid].total === max) : [];
  D.hud.setCrowns(leaders);
  D.hud.setFrameInfo(Math.min(cur.round, N), N);
}

export function initGame(deps) {
  D = deps;
}

export function isPaused() {
  return pausedFlag;
}

export function getPhase() {
  return phase;
}

export function getPlayerLane(pid) {
  return laneOf(pid);
}

export function getCameraCtx() {
  let laneIndex = cur.playerId ? laneOf(cur.playerId) : -1;
  if (phase === "gameOver") {
    const bestLane = D.replay.getBestLane();
    if (bestLane >= 0) laneIndex = bestLane;
  } else if (phase === "replay") {
    const rl = D.replay.getReplayLane();
    if (rl >= 0) laneIndex = rl;
  }
  return {
    phase,
    laneIndex,
    ballState: laneIndex >= 0 ? D.physics.getBallState(laneIndex) : null,
    aim: lastAim,
    laneCount: Math.max(1, orderIds.length),
  };
}

export function onMeta(m) {
  if (!m) return;
  meta = m;
  const wasPaused = pausedFlag;
  pausedFlag = m.state === "paused";
  if (m.settings) {
    N = GAME.FRAMES_OPTIONS.includes(m.settings.frames) ? m.settings.frames : GAME.DEFAULT_FRAMES;
  }
  if (!wasPaused && pausedFlag) {
    try {
      D.hud.setPauseOverlay(true, { players: playerArr(), scores: computedScores(), framesTotal: N });
    } catch (e) {}
  } else if (wasPaused && !pausedFlag) {
    D.hud.setPauseOverlay(false);
    restoreActiveLaneVisuals();
    if (musicWasPlaying) {
      musicWasPlaying = false;
      D.audio.music("play");
      net.update("meta/music", D.audio.getMusicState());
    }
  }
}

function restoreActiveLaneVisuals() {
  if (!gameStarted || !cur.playerId) return;
  try {
    const lane = laneOf(cur.playerId);
    if (phase === "aiming" || phase === "nextTurn" || phase === "scored") {
      D.scene.setPinTransforms(lane, D.physics.getPinTransforms(lane));
      if (phase === "aiming") D.scene.showAimGhost(lane, lastAimFor(cur.playerId), spinFor(cur.playerId));
    } else if (phase === "rolling" || phase === "settling") {
      syncActiveLaneVisuals();
    }
  } catch (e) {}
}

export function tickPaused() {}

export function onPlayersChanged(map) {
  players = map || {};
  orderIds = Object.keys(players).sort((a, b) => (players[a].order || 0) - (players[b].order || 0));
  const host = players[meta.hostId];
  if (orderIds.length && (!meta.hostId || !host || host.connected === false)) {
    const heir = orderIds.find((pid) => players[pid] && players[pid].connected !== false);
    if (heir && heir !== meta.hostId) {
      const old = meta.hostId;
      meta.hostId = heir;
      net.write("meta/hostId", heir);
      net.write("players/" + heir + "/isHost", true);
      if (old && players[old]) net.write("players/" + old + "/isHost", false);
    }
  }
  if (gameStarted) {
    let skipPid = null;
    for (const pid of orderIds) {
      const p = players[pid];
      D.scene.setBumperVisual(laneOf(pid), !!p.bumperOn);
      if (prevConnected[pid] === true && p.connected === false) {
        D.hud.toast(t("hud.disconnected", { name: p.nick || "?" }));
        if (pid === cur.playerId && (phase === "aiming" || phase === "nextTurn")) skipPid = pid;
      } else if (prevConnected[pid] === false && p.connected !== false) {
        D.hud.toast(t("hud.reconnected", { name: p.nick || "?" }));
      }
    }
    refreshHud();
    prevConnected = {};
    for (const pid of orderIds) prevConnected[pid] = players[pid].connected !== false;
    if (skipPid) autoSkip(skipPid);
    return;
  }
  prevConnected = {};
  for (const pid of orderIds) prevConnected[pid] = players[pid].connected !== false;
}

export function startGame() {
  if (!orderIds.length) return;
  gameStarted = true;
  winnerShown = false;
  sd = null;
  sdThrows = {};
  sdScores = {};
  framesT = {};
  trickBonus = {};
  consec = {};
  undoState = null;
  lastResult = null;
  mulliganAvailable = false;
  narrowRound = false;
  camMode = "auto";
  camSetBy = null;
  D.camera.setMode("auto");
  D.hud.setCameraChip("auto");
  N = GAME.FRAMES_OPTIONS.includes(meta.settings && meta.settings.frames) ? meta.settings.frames : GAME.DEFAULT_FRAMES;
  for (const pid of orderIds) {
    framesT[pid] = [];
    for (let f = 0; f < N; f++) framesT[pid].push([]);
    trickBonus[pid] = 0;
    consec[pid] = 0;
  }
  const arr = orderIds.map((id) => players[id]);
  D.scene.buildLanes(arr);
  arr.forEach((p, i) => {
    D.themes.applyTheme(i, p.laneTheme);
    D.scene.setBumperVisual(i, !!p.bumperOn);
    D.scene.setNarrowVisual(i, false);
  });
  cur = { playerId: orderIds[0], frameIndex: 0, throwIndex: 0, round: 1 };
  net.write("meta/state", "playing");
  D.audio.music("play");
  net.update("meta/music", D.audio.getMusicState());
  writeAllScores();
  D.hud.setLobbyVisible(false);
  D.hud.hideWinnerScreen();
  D.hud.setLeaderboardVisible(true);
  refreshHud();
  setPhase("intro");
  writeGame();
}

function decideNarrow(round) {
  return !!(meta.settings && meta.settings.narrowLaneOn) && round > 1 && Math.random() < GAME.NARROW_CHANCE;
}

function enterRoundBanner(round) {
  cur.round = round;
  cur.frameIndex = round - 1;
  cur.throwIndex = 0;
  narrowRound = decideNarrow(round);
  for (let i = 0; i < orderIds.length; i++) D.scene.setNarrowVisual(i, narrowRound);
  setPhase("roundBanner");
  writeGame();
  D.hud.showBanner("round", { n: round, total: N, final: round === N }, TIMING.ROUND_BANNER_MS - 400);
  if (narrowRound) D.hud.showBanner("narrow", {}, 1600);
  turnTimer = TIMING.ROUND_BANNER_MS + (narrowRound ? 1700 : 0);
  refreshHud();
}

function startTurn(pid, mask, continuation) {
  cur.playerId = pid;
  rackMask = mask;
  const p = players[pid];
  if (!p || p.connected === false) {
    autoSkip(pid);
    return;
  }
  if (!continuation) {
    camMode = "auto";
    camSetBy = null;
    D.camera.setMode("auto");
    D.hud.setCameraChip("auto");
    D.hud.showBanner("playerTurn", { name: p.nick || "?", color: p.playerColor }, 1500);
    D.camera.flyToLane(laneOf(pid));
    turnTimer = TIMING.NEXT_TURN_FLY_MS + 250;
  } else {
    turnTimer = 400;
  }
  setPhase("nextTurn");
  writeGame();
  refreshHud();
}

function enterAiming() {
  undoState = null;
  const pid = cur.playerId;
  const lane = laneOf(pid);
  const p = players[pid] || {};
  D.physics.setupLane(lane, { narrow: narrowRound && !sd, bumpers: !!p.bumperOn });
  D.physics.resetPins(lane, rackMask);
  D.physics.clearThrow(lane);
  net.write("input/" + pid + "/aim", { x: 0, forward: 0 });
  net.write("input/" + pid + "/spin", 0);
  if (inputAll[pid]) { inputAll[pid].aim = { x: 0, forward: 0 }; inputAll[pid].spin = 0; }
  D.scene.setPinTransforms(lane, D.scene.standingTransforms(lane, rackMask));
  D.scene.showAimGhost(lane, { x: 0, forward: 0 }, 0);
  snapshot = {
    playerId: pid,
    frameIndex: cur.frameIndex,
    throwIndex: cur.throwIndex,
    round: cur.round,
    mask: rackMask,
    framesT: JSON.parse(JSON.stringify(framesT)),
    trickBonus: Object.assign({}, trickBonus),
    consec: Object.assign({}, consec),
    sd: sd ? JSON.parse(JSON.stringify(sd)) : null,
    sdThrows: JSON.parse(JSON.stringify(sdThrows)),
    sdScores: JSON.parse(JSON.stringify(sdScores)),
    narrowRound,
  };
  const inp = inputAll[pid] || {};
  baseThrowTs = inp.throw && inp.throw.ts ? inp.throw.ts : 0;
  consumedMullTs = inp.mulligan && inp.mulligan.ts ? inp.mulligan.ts : 0;
  lastAim = { x: 0, forward: 0 };
  setPhase("aiming");
  writeGame();
}

function lastAimFor(pid) {
  const inp = inputAll[pid] || {};
  return inp.aim && typeof inp.aim === "object" ? { x: Number(inp.aim.x) || 0, forward: Number(inp.aim.forward) || 0 } : { x: 0, forward: 0 };
}

function spinFor(pid) {
  const inp = inputAll[pid] || {};
  return Math.max(-1, Math.min(1, Number(inp.spin) || 0));
}

function releaseThrow(inp) {
  const pid = cur.playerId;
  const p = players[pid] || {};
  const th = inp.throw;
  const spin = spinFor(pid);
  const aim = lastAimFor(pid);
  throwCtx = { pid, spin, weightKey: p.ballWeight || "medium" };
  preMask = rackMask;
  undoState = snapshot;
  throwReleaseTs = th.ts;
  crashPlayed = false;
  gutterPlayed = false;
  settleHold = 0;
  settleT = 0;
  rollT = 0;
  pendingReplay = false;
  D.scene.hideAimGhost();
  D.audio.duck(true);
  D.audio.rollLoop(true);
  D.replay.startRecording(laneOf(pid), { playerId: pid });
  D.physics.throwBall(laneOf(pid), {
    power: Math.max(0, Math.min(1, Number(th.power) || 0)),
    angle: Number(th.angle) || 0,
    aim,
    spin,
  }, throwCtx.weightKey);
  setPhase("rolling");
  writeGame();
}

function syncActiveLaneVisuals() {
  const lane = laneOf(cur.playerId);
  const ball = D.physics.getBallState(lane);
  if (ball) D.scene.setBallPose(lane, ball.p, ball.q);
  D.scene.setPinTransforms(lane, D.physics.getPinTransforms(lane));
  D.replay.recordFrame();
  if (!crashPlayed) {
    const mask = D.physics.getStandingMask(lane);
    if (mask !== preMask) {
      crashPlayed = true;
      const hit = countBits(preMask) - countBits(mask);
      D.audio.sfx("pinsCrash", Math.min(1, 0.35 + hit * 0.08));
    }
  }
  if (!gutterPlayed && D.physics.ballInGutter(lane)) {
    gutterPlayed = true;
    D.audio.sfx("gutter", 0.4);
  }
}

function currentThrowList() {
  if (sd) {
    if (!sdThrows[cur.playerId]) sdThrows[cur.playerId] = [];
    return sdThrows[cur.playerId];
  }
  return framesT[cur.playerId][cur.frameIndex];
}

function resolveThrow() {
  const pid = cur.playerId;
  const lane = laneOf(pid);
  const mask = D.physics.getStandingMask(lane);
  const pinsDown = countBits(preMask & ~mask);
  const pinsStanding = countBits(mask);
  const wasFullRack = preMask === 0x3FF;
  const list = currentThrowList();
  const isFirstBall = list.length === 0;
  const lastFrame = !sd && cur.frameIndex === N - 1;
  const earnedBonus = lastFrame && ((list.length === 1 && list[0] === 10) || (list.length === 2 && (list[0] === 10 || list[0] + list[1] === 10)));
  const isStrike = wasFullRack && pinsDown === GAME.PIN_COUNT && (isFirstBall || earnedBonus);
  const isSpare = !isStrike && pinsStanding === 0 && pinsDown > 0 && !isFirstBall;
  const isGutter = pinsDown === 0 && D.physics.ballInGutter(lane);
  let trick = null;
  if (!sd) {
    const leftSplitBefore = !wasFullRack && isSplitMask(preMask);
    if (leftSplitBefore && pinsStanding === 0) trick = "split";
    else if (isStrike && Math.abs(throwCtx.spin) >= 0.6 && D.physics.ballLateralTravel(lane) >= 0.5) trick = "hook";
    else if (D.physics.ballTouchedBumper(lane) && pinsDown >= 6) trick = "bank";
  }
  list.push(pinsDown);
  if (trick) trickBonus[pid] = (trickBonus[pid] || 0) + GAME.TRICK_BONUS;
  if (!sd) {
    if (isStrike) consec[pid] = (consec[pid] || 0) + 1;
    else consec[pid] = 0;
  }
  const isTurkey = !sd && isStrike && consec[pid] >= 3;
  rackMask = mask;
  const p = players[pid] || {};
  mulliganAvailable = !p.mulliganUsed && !isStrike && !isSpare;
  lastResult = {
    playerId: pid,
    frameIndex: cur.frameIndex,
    throwIndex: cur.throwIndex,
    pinsDown,
    pinsStanding,
    isStrike,
    isSpare,
    isGutter,
    trick,
    ts: Date.now(),
  };
  D.replay.stopRecording({ pins: pinsDown, isStrike, trick });
  D.audio.duck(false);
  D.audio.rollLoop(false);
  D.effects.setCelebrationLane(lane);
  if (isTurkey) {
    D.audio.sfx("strike", 1);
    D.effects.strikeCelebration(2);
    D.hud.showBanner("turkey", {}, 2200);
  } else if (isStrike) {
    D.audio.sfx("strike", 0.9);
    D.effects.strikeCelebration(1);
    D.hud.showBanner("strike", {}, 1700);
  } else if (isSpare) {
    D.audio.sfx("spare", 0.9);
    D.effects.confettiBurst(lane);
    D.hud.showBanner("spare", {}, 1500);
  } else if (isGutter) {
    D.hud.showBanner("gutter", {}, 1400);
  }
  if (trick) D.effects.trickShotCallout(trick);
  pendingReplay = isStrike;
  writeScores(pid);
  setPhase("scored");
  writeGame();
  refreshHud();
}

function restoreState(s, isMulligan) {
  framesT = JSON.parse(JSON.stringify(s.framesT));
  trickBonus = Object.assign({}, s.trickBonus);
  consec = Object.assign({}, s.consec);
  sd = s.sd ? JSON.parse(JSON.stringify(s.sd)) : null;
  sdThrows = JSON.parse(JSON.stringify(s.sdThrows));
  sdScores = JSON.parse(JSON.stringify(s.sdScores));
  cur.playerId = s.playerId;
  cur.frameIndex = s.frameIndex;
  cur.throwIndex = s.throwIndex;
  cur.round = s.round;
  narrowRound = s.narrowRound;
  rackMask = s.mask;
  lastResult = null;
  pendingReplay = false;
  mulliganAvailable = false;
  undoState = null;
  writeScores(s.playerId);
  refreshHud();
  D.hud.showBanner(isMulligan ? "mulligan" : "undo", { name: (players[s.playerId] || {}).nick || "?" }, 1600);
  D.camera.flyToLane(laneOf(s.playerId));
  turnTimer = TIMING.NEXT_TURN_FLY_MS;
  setPhase("nextTurn");
  writeGame();
}

function fillFrameWithZeros(pid) {
  const list = currentThrowList();
  if (sd) {
    while (list.length < 2) list.push(0);
    return;
  }
  const last = cur.frameIndex === N - 1;
  if (last) {
    while (list.length < 2) list.push(0);
    if (list.length === 2 && (list[0] === 10 || list[0] + list[1] === 10) && list.length < 3) list.push(0);
  } else {
    if (list.length === 0) list.push(0);
    if (list.length === 1 && list[0] !== 10) list.push(0);
  }
}

function autoSkip(pid) {
  cur.playerId = pid;
  if (sd && !sdThrows[pid]) sdThrows[pid] = [];
  fillFrameWithZeros(pid);
  writeScores(pid);
  D.hud.showBanner("skipped", { name: (players[pid] || {}).nick || "?" }, 1400);
  refreshHud();
  advanceTurn(true);
}

function skipCurrent() {
  const pid = cur.playerId;
  fillFrameWithZeros(pid);
  writeScores(pid);
  undoState = null;
  D.hud.showBanner("skipped", { name: (players[pid] || {}).nick || "?" }, 1400);
  refreshHud();
  advanceTurn(true);
}

function advanceTurn(forceFrameDone) {
  const pid = cur.playerId;
  D.physics.clearThrow(laneOf(pid));
  D.scene.showBall(laneOf(pid), false);
  if (sd) {
    const list = sdThrows[pid] || [];
    const frameDone = forceFrameDone || list.length >= 2 || (list.length >= 1 && list[0] === 10);
    if (!frameDone) {
      cur.throwIndex = 1;
      if (rackMask === 0) rackMask = 0x3FF;
      startTurn(pid, rackMask, true);
      return;
    }
    if (!sdScores[pid]) sdScores[pid] = [];
    sdScores[pid][sd.round - 1] = list.reduce((a, b) => a + b, 0);
    sdThrows[pid] = [];
    writeScores(pid);
    const idx = sd.playerIds.indexOf(pid);
    if (idx + 1 < sd.playerIds.length) {
      cur.throwIndex = 0;
      startTurn(sd.playerIds[idx + 1], 0x3FF, false);
      return;
    }
    evaluateSuddenDeath();
    return;
  }
  const list = framesT[pid][cur.frameIndex];
  const last = cur.frameIndex === N - 1;
  let frameDone;
  if (last) {
    const marked = list.length >= 2 && (list[0] === 10 || list[0] + list[1] === 10);
    frameDone = forceFrameDone || (marked ? list.length >= 3 : list.length >= 2);
  } else {
    frameDone = forceFrameDone || list.length >= 2 || (list.length >= 1 && list[0] === 10);
  }
  if (!frameDone) {
    cur.throwIndex = list.length;
    if (rackMask === 0) rackMask = 0x3FF;
    startTurn(pid, rackMask, true);
    return;
  }
  const idx = orderIds.indexOf(pid);
  cur.throwIndex = 0;
  if (idx + 1 < orderIds.length) {
    startTurn(orderIds[idx + 1], 0x3FF, false);
    return;
  }
  if (cur.frameIndex + 1 >= N) {
    endOfGameCheck();
    return;
  }
  enterRoundBanner(cur.round + 1);
}

function endOfGameCheck() {
  const scores = computedScores();
  let max = -1;
  for (const pid of orderIds) max = Math.max(max, scores[pid].total);
  const top = orderIds.filter((pid) => scores[pid].total === max);
  if (top.length >= 2) {
    startSuddenDeath(top, 1);
    return;
  }
  finishGame(top, null);
}

function startSuddenDeath(playerIds, round) {
  sd = { round, playerIds: playerIds.slice() };
  narrowRound = false;
  for (let i = 0; i < orderIds.length; i++) D.scene.setNarrowVisual(i, false);
  for (const pid of playerIds) sdThrows[pid] = [];
  cur.throwIndex = 0;
  setPhase("suddenDeathBanner");
  writeGame();
  D.hud.showBanner("suddenDeath", {}, TIMING.ROUND_BANNER_MS - 300);
  turnTimer = TIMING.ROUND_BANNER_MS;
}

function evaluateSuddenDeath() {
  let max = -1;
  for (const pid of sd.playerIds) {
    const v = (sdScores[pid] && sdScores[pid][sd.round - 1]) || 0;
    max = Math.max(max, v);
  }
  const winners = sd.playerIds.filter((pid) => ((sdScores[pid] && sdScores[pid][sd.round - 1]) || 0) === max);
  if (winners.length === 1) {
    finishGame(winners, winners[0]);
    return;
  }
  const allGone = winners.every((pid) => { const p = players[pid]; return !p || p.connected === false; });
  if (allGone || sd.round >= 20) {
    finishGame(winners, winners[0]);
    return;
  }
  startSuddenDeath(winners, sd.round + 1);
}

function finishGame(winnerIds, sdWinner) {
  const scores = computedScores();
  let ranked = orderIds.slice().sort((a, b) => (scores[b].total - scores[a].total) || (orderIds.indexOf(a) - orderIds.indexOf(b)));
  if (sdWinner) ranked = [sdWinner].concat(ranked.filter((x) => x !== sdWinner));
  const ranking = ranked.map((pid) => {
    const p = players[pid] || {};
    return {
      playerId: pid,
      nick: p.nick || "?",
      total: scores[pid] ? scores[pid].total : 0,
      playerColor: p.playerColor || "#FF6B6B",
      ballColor: p.ballColor || "#FF6B6B",
      ballPattern: p.ballPattern || "solid",
    };
  });
  const result = {
    winnerIds: winnerIds && winnerIds.length ? winnerIds : [ranked[0]],
    ranking,
    date: Date.now(),
    bestThrow: D.replay.getBestMeta(),
  };
  sd = null;
  net.write("meta/result", result);
  net.write("meta/state", "finished");
  setPhase("gameOver");
  writeGame();
  D.hud.setLeaderboardVisible(false);
  winnerShown = true;
  bestLoopTimer = 1200;
  const qrUrl = net.controllerUrl(net.roomCode());
  (async () => {
    let card = "";
    try {
      card = await D.sharecard.generateCard(result, getLang());
      card = await D.sharecard.compressCard(card, 750000);
    } catch (e) {
      console.warn("share card failed", e);
    }
    try { D.hud.showWinnerScreen(result, players, card, qrUrl); } catch (e) { console.warn("winner screen failed", e); }
  })();
  D.audio.sfx("clap", 0.8);
}

function resetForNewGame() {
  net.remove("meta/result");
  for (const pid of orderIds) net.write("players/" + pid + "/mulliganUsed", false);
  for (const pid of orderIds) {
    const p = players[pid];
    if (p) p.mulliganUsed = false;
  }
  D.hud.hideWinnerScreen();
  D.hud.showBanner("newGame", {}, 1400);
  startGame();
}

export function onThrowReceived(playerId, throwObj) {
  if (phase !== "aiming" || playerId !== cur.playerId || pausedFlag) return;
  if (!throwObj || typeof throwObj.ts !== "number") return;
  if (throwObj.ts <= baseThrowTs) return;
  baseThrowTs = throwObj.ts;
  releaseThrow({ throw: throwObj });
}

export function onMulliganReceived(playerId, ts) {
  if (phase !== "scored" || playerId !== cur.playerId || pausedFlag) return;
  if (!mulliganAvailable || !undoState) return;
  if (typeof ts !== "number" || ts <= consumedMullTs || ts <= throwReleaseTs) return;
  consumedMullTs = ts;
  const p = players[playerId];
  if (p && p.mulliganUsed) return;
  net.write("players/" + playerId + "/mulliganUsed", true);
  if (p) p.mulliganUsed = true;
  D.audio.sfx("ding", 0.7);
  restoreState(undoState, true);
}

export function onInput(map) {
  inputAll = map || {};
  if (pausedFlag) return;
  if (phase === "aiming" && cur.playerId) {
    const inp = inputAll[cur.playerId];
    if (!inp) return;
    lastAim = lastAimFor(cur.playerId);
    D.scene.showAimGhost(laneOf(cur.playerId), lastAim, spinFor(cur.playerId));
    if (inp.throw) onThrowReceived(cur.playerId, inp.throw);
  } else if (phase === "scored" && cur.playerId) {
    const inp = inputAll[cur.playerId];
    if (inp && inp.mulligan && inp.mulligan.ts) onMulliganReceived(cur.playerId, inp.mulligan.ts);
  }
}

export function onCommand(key, cmd) {
  if (!cmd || typeof cmd.type !== "string") return;
  const from = cmd.from || "";
  const isHost = from && meta.hostId && from === meta.hostId;
  const type = cmd.type;
  if (type === "newGame") {
    if (!isHost) return;
    if (meta.state === "lobby" && !gameStarted) startGame();
    else if (gameStarted) resetForNewGame();
    return;
  }
  if (!gameStarted) {
    if (type === "music" && isHost) {
      const pl = cmd.payload || {};
      D.audio.music(pl.action, pl.value);
      net.update("meta/music", D.audio.getMusicState());
    }
    return;
  }
  if (type === "pause") {
    if (!isHost || meta.state !== "playing") return;
    musicWasPlaying = D.audio.getMusicState().playing;
    D.audio.music("pause");
    net.update("meta/music", D.audio.getMusicState());
    net.write("meta/state", "paused");
  } else if (type === "resume") {
    if (!isHost || meta.state !== "paused") return;
    net.write("meta/state", "playing");
  } else if (type === "skipTurn") {
    if (!isHost && from !== cur.playerId) return;
    if (phase !== "aiming" && phase !== "nextTurn") return;
    skipCurrent();
  } else if (type === "undo") {
    if (!isHost || !undoState) return;
    if (phase !== "scored" && phase !== "nextTurn" && phase !== "aiming" && phase !== "replay") return;
    D.hud.setLetterbox(false);
    restoreState(undoState, false);
  } else if (type === "replay") {
    if (!isHost) return;
    if (phase !== "scored" && phase !== "nextTurn" && phase !== "aiming") return;
    manualReplayReturn = phase;
    enterReplayPhase();
  } else if (type === "quit") {
    if (!isHost || phase === "gameOver") return;
    cancelGame();
  } else if (type === "cameraCycle") {
    const modes = ["auto", "follow", "side", "top"];
    camMode = modes[(modes.indexOf(camMode) + 1) % modes.length];
    camSetBy = from;
    D.camera.setMode(camMode);
    D.hud.setCameraChip(camMode);
    net.update("game/cameraView", { mode: camMode, setBy: camSetBy, ts: Date.now() });
  } else if (type === "bumper") {
    if (!isHost) return;
    const pl = cmd.payload || {};
    const pid = pl.playerId;
    if (!pid || !players[pid]) return;
    const on = !!pl.on;
    net.write("players/" + pid + "/bumperOn", on);
    players[pid].bumperOn = on;
    D.scene.setBumperVisual(laneOf(pid), on);
    if (pid === cur.playerId && phase === "aiming") {
      D.physics.setupLane(laneOf(pid), { narrow: narrowRound && !sd, bumpers: on });
      D.physics.resetPins(laneOf(pid), rackMask);
    }
  } else if (type === "music") {
    if (!isHost) return;
    const pl = cmd.payload || {};
    D.audio.music(pl.action, pl.value);
    net.update("meta/music", D.audio.getMusicState());
  }
}

function cancelGame() {
  sd = null;
  pendingReplay = false;
  const host = players[meta.hostId] || {};
  net.write("meta/result", { canceled: true, hostNick: host.nick || "?", date: Date.now() });
  net.write("meta/state", "finished");
  setPhase("gameOver");
  writeGame();
  winnerShown = false;
  D.hud.setLeaderboardVisible(false);
  D.hud.setPauseOverlay(false);
  pausedFlag = false;
  try { D.hud.showCanceledScreen(host.nick || "?"); } catch (e) {}
}

function enterReplayPhase() {
  setPhase("replay");
  writeGame();
  D.hud.setLetterbox(true);
  const ret = manualReplayReturn;
  manualReplayReturn = null;
  D.replay.playLast().then(() => {
    D.hud.setLetterbox(false);
    if (phase !== "replay") return;
    if (ret === "aiming" || ret === "nextTurn") {
      const lane = laneOf(cur.playerId);
      D.scene.setPinTransforms(lane, D.scene.standingTransforms(lane, rackMask));
      enterAiming();
    } else {
      advanceTurn(false);
    }
  });
}

export function tick(dtMs) {
  if (!D || pausedFlag) return;
  phaseT += dtMs;
  if (phase === "intro") {
    if (phaseT >= TIMING.INTRO_MS) enterRoundBanner(1);
  } else if (phase === "roundBanner") {
    turnTimer -= dtMs;
    if (turnTimer <= 0) {
      const first = sd ? sd.playerIds[0] : orderIds[0];
      startTurn(first, 0x3FF, false);
    }
  } else if (phase === "suddenDeathBanner") {
    turnTimer -= dtMs;
    if (turnTimer <= 0) startTurn(sd.playerIds[0], 0x3FF, false);
  } else if (phase === "nextTurn") {
    turnTimer -= dtMs;
    if (turnTimer <= 0) enterAiming();
  } else if (phase === "rolling") {
    rollT += dtMs;
    syncActiveLaneVisuals();
    const lane = laneOf(cur.playerId);
    const ball = D.physics.getBallState(lane);
    const passed = ball && ball.p[2] < LANE.HEADPIN_Z - 1.6;
    const stopped = ball && Math.hypot(ball.vel[0], ball.vel[1], ball.vel[2]) < 0.35 && rollT > 1200;
    const inGutter = D.physics.ballInGutter(lane);
    if (!ball || passed || stopped || (inGutter && rollT > 800) || rollT > 6500) {
      settleT = 0;
      settleHold = 0;
      setPhase("settling");
      writeGame();
    }
  } else if (phase === "settling") {
    settleT += dtMs;
    syncActiveLaneVisuals();
    if (D.physics.isSettled(laneOf(cur.playerId))) settleHold += dtMs;
    else settleHold = 0;
    if (settleHold >= 500 || settleT >= 8000) resolveThrow();
  } else if (phase === "scored") {
    if (phaseT >= TIMING.SCORED_MS) {
      if (pendingReplay) {
        pendingReplay = false;
        manualReplayReturn = "auto";
        enterReplayPhase();
      } else {
        advanceTurn(false);
      }
    }
  } else if (phase === "gameOver") {
    if (winnerShown) {
      bestLoopTimer -= dtMs;
      if (bestLoopTimer <= 0 && !D.replay.isReplaying() && D.replay.getBestMeta()) {
        bestLoopTimer = 999999;
        D.replay.playBest().then(() => {
          bestLoopTimer = 2000;
        });
      }
    }
  }
}
