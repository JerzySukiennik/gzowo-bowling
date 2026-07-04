// Gzowo Bowling — throw recorder and slow-mo playback: last throw replays after strikes, best throw kept for the winner montage.
import { TIMING, GAME } from "../config.js";
import * as scene from "./scene.js";
import * as physics from "./physics.js";

let recording = null;
let last = null;
let best = null;
let bestScore = -1;
let playing = null;

export function startRecording(laneIndex, meta) {
  recording = {
    laneIndex,
    playerId: (meta && meta.playerId) || null,
    frames: [],
    start: performance.now(),
    lastT: -999,
  };
}

export function recordFrame() {
  if (!recording) return;
  const now = performance.now();
  if (now - recording.lastT < 32) return;
  recording.lastT = now;
  if (recording.frames.length > 420) return;
  try {
    const ball = physics.getBallState(recording.laneIndex);
    const pins = physics.getPinTransforms(recording.laneIndex);
    recording.frames.push({
      t: now - recording.start,
      ball: ball ? { p: ball.p.slice(), q: ball.q.slice() } : null,
      pins: pins.map((x) => ({ p: x.p.slice(), q: x.q.slice() })),
    });
  } catch (e) {}
}

export function stopRecording(resultMeta) {
  if (!recording) return;
  const rec = recording;
  recording = null;
  if (rec.frames.length < 3) return;
  rec.meta = resultMeta || {};
  last = rec;
  const m = rec.meta;
  const score = (m.pins || 0) * 10 + (m.trick ? 8 : 0) + (m.isStrike ? 4 : 0);
  if (score > bestScore) {
    bestScore = score;
    best = rec;
  }
}

function playRec(rec) {
  if (!rec || rec.frames.length < 2) return Promise.resolve();
  return new Promise((resolve) => {
    const recDur = rec.frames[rec.frames.length - 1].t;
    playing = {
      rec,
      t: 0,
      dur: Math.min(TIMING.REPLAY_MAX_MS, recDur / TIMING.REPLAY_SPEED),
      recDur,
      resolve,
    };
  });
}

export function playLast() {
  return playRec(last);
}

export function playBest() {
  return playRec(best);
}

export function getBestMeta() {
  if (!best) return null;
  return { playerId: best.playerId, pins: (best.meta && best.meta.pins) || 0, trick: (best.meta && best.meta.trick) || null };
}

export function getBestLane() {
  return best ? best.laneIndex : -1;
}

export function isReplaying() {
  return !!playing;
}

export function getReplayLane() {
  return playing ? playing.rec.laneIndex : -1;
}

function lerp(a, b, k) {
  return a + (b - a) * k;
}

function applyFrame(rec, srcT) {
  const frames = rec.frames;
  let i = 0;
  while (i < frames.length - 1 && frames[i + 1].t <= srcT) i++;
  const f0 = frames[i];
  const f1 = frames[Math.min(frames.length - 1, i + 1)];
  const span = Math.max(1, f1.t - f0.t);
  const k = Math.max(0, Math.min(1, (srcT - f0.t) / span));
  if (f0.ball && f1.ball) {
    const p = [lerp(f0.ball.p[0], f1.ball.p[0], k), lerp(f0.ball.p[1], f1.ball.p[1], k), lerp(f0.ball.p[2], f1.ball.p[2], k)];
    scene.setBallPose(rec.laneIndex, p, k < 0.5 ? f0.ball.q : f1.ball.q);
  } else if (f0.ball) {
    scene.setBallPose(rec.laneIndex, f0.ball.p, f0.ball.q);
  }
  const pins = [];
  for (let j = 0; j < GAME.PIN_COUNT; j++) {
    const a = f0.pins[j];
    const b = f1.pins[j] || a;
    pins.push({
      p: [lerp(a.p[0], b.p[0], k), lerp(a.p[1], b.p[1], k), lerp(a.p[2], b.p[2], k)],
      q: k < 0.5 ? a.q : b.q,
    });
  }
  scene.setPinTransforms(rec.laneIndex, pins);
}

export function tick(dtMs) {
  if (!playing) return;
  playing.t += dtMs;
  const prog = Math.min(1, playing.t / playing.dur);
  try {
    applyFrame(playing.rec, prog * playing.recDur);
  } catch (e) {}
  if (prog >= 1) {
    const done = playing.resolve;
    playing = null;
    if (done) done();
  }
}
