// Gzowo Bowling — one TV camera: auto beat sequence (aim, chase, pin-cam, leaderboard, fly) plus manual modes and shake.
import * as THREE from "three";
import { LANE, TIMING } from "../config.js";

let camera = null;
let mode = "auto";
let shakeAmp = 0;
let fly = null;
let phasePrev = "";
let phaseT = 0;
let beat = "chase";
const look = new THREE.Vector3(0, 0.4, -8);
const posTarget = new THREE.Vector3(0, 3, 8);
const lookTarget = new THREE.Vector3(0, 0.4, -8);
const tmp = new THREE.Vector3();

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function initCamera() {
  camera = new THREE.PerspectiveCamera(52, window.innerWidth / Math.max(1, window.innerHeight), 0.05, 220);
  camera.position.set(0, 3.2, 9);
  camera.lookAt(look);
  window.addEventListener("resize", () => {
    try {
      camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
      camera.updateProjectionMatrix();
    } catch (e) {}
  });
  return camera;
}

export function getCamera() {
  return camera;
}

export function setMode(m) {
  if (m === "auto" || m === "follow" || m === "side" || m === "top") mode = m;
}

export function getMode() {
  return mode;
}

export function shake(intensity) {
  shakeAmp = Math.max(shakeAmp, Math.max(0, Math.min(1, intensity)) * 0.32);
}

export function flyToLane(laneIndex) {
  return new Promise((resolve) => {
    if (!camera) { resolve(); return; }
    const laneX = laneIndex * LANE.PITCH;
    fly = {
      from: camera.position.clone(),
      fromLook: look.clone(),
      to: new THREE.Vector3(laneX, 0.62, 2.4),
      toLook: new THREE.Vector3(laneX, 0.3, -8),
      t: 0,
      dur: TIMING.NEXT_TURN_FLY_MS,
      resolve,
    };
  });
}

export function flyToRack(laneIndex) {
  return new Promise((resolve) => {
    if (!camera) { resolve(); return; }
    const laneX = laneIndex * LANE.PITCH;
    fly = {
      from: camera.position.clone(),
      fromLook: look.clone(),
      to: new THREE.Vector3(laneX - 1.4, 0.95, 4.7),
      toLook: new THREE.Vector3(laneX, 0.52, 3.2),
      t: 0,
      dur: TIMING.NEXT_TURN_FLY_MS,
      resolve,
    };
  });
}

function applyShake(dtMs) {
  if (shakeAmp > 0.0015) {
    camera.position.x += (Math.random() - 0.5) * shakeAmp;
    camera.position.y += (Math.random() - 0.5) * shakeAmp * 0.7;
    camera.position.z += (Math.random() - 0.5) * shakeAmp * 0.4;
    shakeAmp *= Math.exp(-dtMs / 160);
  } else {
    shakeAmp = 0;
  }
}

function chaseTargets(laneX, ball) {
  if (ball && ball.p) {
    posTarget.set(ball.p[0], ball.p[1] + 0.9, ball.p[2] + 2.6);
    lookTarget.set(ball.p[0], ball.p[1], ball.p[2]);
  } else {
    posTarget.set(laneX, 0.62, 2.4);
    lookTarget.set(laneX, 0.3, -8);
  }
}

function pinCamTargets(laneX) {
  posTarget.set(laneX + 1.6, 1.2, LANE.HEADPIN_Z + 2.8);
  lookTarget.set(laneX, 0.22, LANE.HEADPIN_Z - 0.3);
}

export function update(dtMs, ctx) {
  if (!camera) return;
  const c = ctx || {};
  if (c.phase !== phasePrev) {
    phasePrev = c.phase;
    phaseT = 0;
    if (c.phase === "rolling") beat = "chase";
  }
  phaseT += dtMs;
  if (fly) {
    fly.t += dtMs;
    const k = easeInOut(Math.min(1, fly.t / fly.dur));
    camera.position.lerpVectors(fly.from, fly.to, k);
    look.lerpVectors(fly.fromLook, fly.toLook, k);
    camera.lookAt(look);
    applyShake(dtMs);
    if (fly.t >= fly.dur) {
      const done = fly.resolve;
      fly = null;
      if (done) done();
    }
    return;
  }
  const laneCount = Math.max(1, c.laneCount || 1);
  const laneX = (c.laneIndex >= 0 ? c.laneIndex : (laneCount - 1) / 2) * LANE.PITCH;
  let snap = false;
  let lerpK = 1 - Math.pow(0.92, dtMs / 16.7);
  const phase = c.phase || "lobby";
  const inGame = phase !== "lobby" && phase !== "intro";
  if (mode !== "auto" && inGame) {
    if (mode === "side") {
      const aspect = Math.max(0.5, camera.aspect || 1.6);
      const hHalf = Math.atan(Math.tan(((camera.fov / 2) * Math.PI) / 180) * aspect);
      const dist = 11.5 / Math.tan(hHalf);
      posTarget.set(laneX + Math.max(8, dist), 3.6, -7.6);
      lookTarget.set(laneX, 0.3, -7.6);
    } else if (mode === "top") {
      const dist = 11.5 / Math.tan(((camera.fov / 2) * Math.PI) / 180);
      posTarget.set(laneX, Math.max(14, dist), -7.7);
      lookTarget.set(laneX, 0, -7.9);
    } else {
      if (phase === "rolling" || phase === "settling") chaseTargets(laneX, c.ballState);
      else chaseTargets(laneX, null);
    }
  } else if (phase === "intro" || phase === "lobby") {
    const span = (laneCount - 1) * LANE.PITCH;
    const t = phase === "intro" ? Math.min(1, phaseT / TIMING.INTRO_MS) : 0.5 + 0.5 * Math.sin(phaseT * 0.00028);
    const x = -2 + easeInOut(t) * (span + 4);
    posTarget.set(x, 1.9, -10.5);
    lookTarget.set(x + 0.5, 0.35, LANE.HEADPIN_Z);
  } else if (phase === "chooseBall") {
    posTarget.set(laneX - 1.4, 0.95, 4.7);
    lookTarget.set(laneX, 0.52, 3.2);
  } else if (phase === "aiming") {
    const aim = c.aim || {};
    const ax = Math.max(-1, Math.min(1, aim.x || 0));
    const startZ = -Math.max(0, Math.min(1, aim.forward || 0)) * LANE.RELEASE_MAX_FORWARD;
    posTarget.set(laneX + ax * 0.3, 0.55, startZ + 2.2);
    lookTarget.set(laneX, 0.3, -8);
    lerpK = 1 - Math.pow(0.92, dtMs / 16.7) * 1;
  } else if (phase === "rolling") {
    const ball = c.ballState;
    if (beat === "chase" && ball && ball.p && ball.p[2] < LANE.HEADPIN_Z + 4) {
      beat = "pincam";
      snap = true;
    }
    if (beat === "pincam") pinCamTargets(laneX);
    else chaseTargets(laneX, ball);
  } else if (phase === "settling") {
    pinCamTargets(laneX);
  } else if (phase === "scored") {
    if (phaseT < TIMING.PIN_CAM_HOLD_MS) pinCamTargets(laneX);
    else {
      posTarget.set(laneX, 3.2, 6);
      lookTarget.set(laneX, 0.5, -10);
    }
  } else if (phase === "replay") {
    const a = 0.85 + phaseT * 0.00022;
    posTarget.set(laneX + Math.cos(a) * 2.5, 0.5, LANE.HEADPIN_Z + 1.1 + Math.sin(a) * 1.9);
    lookTarget.set(laneX, 0.25, LANE.HEADPIN_Z - 0.25);
  } else if (phase === "gameOver") {
    const a = phaseT * 0.00015;
    posTarget.set(laneX + Math.cos(a) * 3.0, 0.9 + Math.sin(a * 0.7) * 0.25, LANE.HEADPIN_Z + 1.6 + Math.sin(a) * 2.2);
    lookTarget.set(laneX, 0.3, LANE.HEADPIN_Z - 0.2);
  }
  if (snap) {
    camera.position.copy(posTarget);
    look.copy(lookTarget);
  } else {
    camera.position.lerp(posTarget, Math.min(1, lerpK));
    look.lerp(lookTarget, Math.min(1, lerpK * 1.15));
  }
  tmp.copy(look);
  camera.lookAt(tmp);
  applyShake(dtMs);
}
