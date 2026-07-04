// Gzowo Bowling — Rapier physics: active-lane-only bodies, throw execution with hook/jitter, pin-down + settle detection.
import RAPIER from "https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.12.0/rapier.es.js";
import { LANE, PHYSICS, ballWeightParams, GAME } from "../config.js";
import { PIN_SPOTS } from "./scene.js";

let world = null;
let accumulator = 0;
const STEP_MS = 1000 / 60;
const PIN_HH = LANE.PIN.HEIGHT / 2;

const active = {
  laneIndex: -1,
  narrow: false,
  bumpers: false,
  effWidth: LANE.WIDTH,
  statics: [],
  pins: new Array(GAME.PIN_COUNT).fill(null),
  pinVis: null,
  ball: null,
  ballWeight: ballWeightParams(),
  spin: 0,
  hasThrow: false,
  touchedBumper: false,
  inGutter: false,
  minX: 0,
  maxX: 0,
};

export async function initPhysics() {
  await Promise.race([
    RAPIER.init(),
    new Promise((_, rej) => setTimeout(() => rej(new Error("RAPIER.init timeout")), 10000)),
  ]);
  world = new RAPIER.World({ x: 0, y: PHYSICS.GRAVITY, z: 0 });
  world.timestep = 1 / 60;
}

function setColliderMass(desc, mass, volume) {
  try {
    if (typeof desc.setMass === "function") return desc.setMass(mass);
  } catch (e) {}
  try { return desc.setDensity(mass / Math.max(1e-6, volume)); } catch (e) {}
  return desc;
}

function addStatic(hx, hy, hz, x, y, z, restitution) {
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(x, y, z));
  const col = RAPIER.ColliderDesc.cuboid(hx, hy, hz).setFriction(0.35).setRestitution(restitution === undefined ? 0.2 : restitution);
  world.createCollider(col, body);
  active.statics.push(body);
}

function removeBody(b) {
  try { if (b) world.removeRigidBody(b); } catch (e) {}
}

function teardown() {
  for (const s of active.statics) removeBody(s);
  active.statics = [];
  for (let i = 0; i < GAME.PIN_COUNT; i++) {
    removeBody(active.pins[i]);
    active.pins[i] = null;
  }
  removeBody(active.ball);
  active.ball = null;
  active.hasThrow = false;
}

export function setupLane(laneIndex, opts) {
  if (!world) return;
  teardown();
  const o = opts || {};
  active.laneIndex = laneIndex;
  active.narrow = !!o.narrow;
  active.bumpers = !!o.bumpers;
  active.effWidth = LANE.WIDTH * (active.narrow ? LANE.NARROW_SCALE : 1);
  active.pinVis = null;
  const laneX = laneIndex * LANE.PITCH;
  const effW = active.effWidth;
  const gw = LANE.GUTTER_WIDTH;
  addStatic(effW / 2, 0.1, 10.2, laneX, -0.1, -7.75, 0.15);
  addStatic(gw / 2 + 0.02, 0.05, 10.2, laneX - (effW / 2 + gw / 2), -(LANE.GUTTER_DEPTH + 0.05), -7.75, 0.1);
  addStatic(gw / 2 + 0.02, 0.05, 10.2, laneX + (effW / 2 + gw / 2), -(LANE.GUTTER_DEPTH + 0.05), -7.75, 0.1);
  addStatic(0.04, 0.28, 11.0, laneX - (effW / 2 + gw + 0.04), 0.1, -8.4, 0.35);
  addStatic(0.04, 0.28, 11.0, laneX + (effW / 2 + gw + 0.04), 0.1, -8.4, 0.35);
  addStatic(LANE.PITCH / 2 - 0.05, 0.05, 1.1, laneX, -0.95, -18.6, 0.05);
  addStatic(LANE.PITCH / 2 - 0.05, 0.9, 0.06, laneX, -0.2, -19.55, 0.25);
  addStatic(0.06, 0.9, 1.1, laneX - (LANE.PITCH / 2 - 0.12), -0.2, -18.6, 0.2);
  addStatic(0.06, 0.9, 1.1, laneX + (LANE.PITCH / 2 - 0.12), -0.2, -18.6, 0.2);
  if (active.bumpers) {
    addStatic(gw / 2, 0.16, 7.7, laneX - (effW / 2 + gw / 2), 0.12, -7.2, 0.55);
    addStatic(gw / 2, 0.16, 7.7, laneX + (effW / 2 + gw / 2), 0.12, -7.2, 0.55);
  }
}

export function resetPins(laneIndex, standingMask) {
  if (!world) return;
  const mask = standingMask === undefined ? 0x3FF : standingMask;
  const laneX = laneIndex * LANE.PITCH;
  for (let i = 0; i < GAME.PIN_COUNT; i++) {
    removeBody(active.pins[i]);
    active.pins[i] = null;
    if ((mask >> i) & 1) {
      const spot = PIN_SPOTS[i];
      const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(laneX + spot.x, 0, spot.z)
        .setLinearDamping(0.12)
        .setAngularDamping(0.25);
      const body = world.createRigidBody(bodyDesc);
      const baseDesc = RAPIER.ColliderDesc.cylinder(0.07, 0.052)
        .setTranslation(0, 0.07, 0).setFriction(0.45).setRestitution(0.35);
      setColliderMass(baseDesc, LANE.PIN.MASS * 0.5, Math.PI * 0.052 * 0.052 * 0.14);
      world.createCollider(baseDesc, body);
      const bellyDesc = RAPIER.ColliderDesc.ball(0.058)
        .setTranslation(0, 0.155, 0).setFriction(0.4).setRestitution(0.4);
      setColliderMass(bellyDesc, LANE.PIN.MASS * 0.3, (4 / 3) * Math.PI * Math.pow(0.058, 3));
      world.createCollider(bellyDesc, body);
      const neckDesc = RAPIER.ColliderDesc.capsule(0.055, 0.027)
        .setTranslation(0, 0.295, 0).setFriction(0.4).setRestitution(0.4);
      setColliderMass(neckDesc, LANE.PIN.MASS * 0.2, Math.PI * 0.027 * 0.027 * 0.16);
      world.createCollider(neckDesc, body);
      active.pins[i] = body;
    }
  }
}

export function throwBall(laneIndex, throwData, weightKey) {
  if (!world) return;
  const td = throwData || {};
  const W = ballWeightParams(weightKey);
  const aim = td.aim || {};
  const ax = Math.max(-1, Math.min(1, Number(aim.x) || 0));
  const fwd = Math.max(0, Math.min(1, Number(aim.forward) || 0));
  const spin = Math.max(-1, Math.min(1, Number(td.spin) || 0));
  const power = Math.max(0, Math.min(1, Number(td.power) || 0));
  const angle = Math.max(-PHYSICS.ANGLE_MAX, Math.min(PHYSICS.ANGLE_MAX, Number(td.angle) || 0));
  const laneX = laneIndex * LANE.PITCH;
  const effW = active.effWidth;
  const startX = laneX + ax * (effW / 2 - LANE.BALL_RADIUS - 0.02);
  const startZ = -fwd * LANE.RELEASE_MAX_FORWARD;
  const speed = (PHYSICS.SPEED_MIN + power * (PHYSICS.SPEED_MAX - PHYSICS.SPEED_MIN)) * W.powerFactor;
  const jitter = (Math.random() * 2 - 1) * PHYSICS.JITTER_FACTOR * speed;
  const vx = speed * angle + jitter;
  const vz = -speed;
  removeBody(active.ball);
  const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(startX, LANE.BALL_RADIUS, startZ)
    .setLinvel(vx, 0, vz)
    .setAngvel({ x: -speed / LANE.BALL_RADIUS, y: spin * PHYSICS.SPIN_OMEGA_MAX * W.spinFactor, z: 0 })
    .setCcdEnabled(true)
    .setLinearDamping(0.06)
    .setAngularDamping(0.1);
  const body = world.createRigidBody(bodyDesc);
  const colDesc = RAPIER.ColliderDesc.ball(LANE.BALL_RADIUS).setFriction(0.3).setRestitution(W.restitution);
  setColliderMass(colDesc, W.mass, (4 / 3) * Math.PI * Math.pow(LANE.BALL_RADIUS, 3));
  world.createCollider(colDesc, body);
  active.ball = body;
  active.ballWeight = W;
  active.spin = spin;
  active.hasThrow = true;
  active.touchedBumper = false;
  active.inGutter = false;
  active.minX = startX;
  active.maxX = startX;
}

function substep() {
  const b = active.ball;
  if (b && active.spin !== 0 && !active.inGutter) {
    const p = b.translation();
    if (p.y < LANE.BALL_RADIUS * 1.2 && p.z > LANE.HEADPIN_Z) {
      const lv = b.linvel();
      const ax = active.spin * active.ballWeight.spinFactor * PHYSICS.HOOK_ACCEL;
      b.setLinvel({ x: lv.x + ax / 60, y: lv.y, z: lv.z }, true);
    }
  }
  world.step();
  if (b) {
    const p = b.translation();
    const relX = p.x - active.laneIndex * LANE.PITCH;
    if (p.x < active.minX) active.minX = p.x;
    if (p.x > active.maxX) active.maxX = p.x;
    const edge = active.effWidth / 2;
    if (active.bumpers) {
      if (Math.abs(relX) + LANE.BALL_RADIUS >= edge + 0.004 && p.z > LANE.HEADPIN_Z + 0.5) active.touchedBumper = true;
    } else if (Math.abs(relX) > edge + LANE.BALL_RADIUS * 0.35 && p.y < 0.02 && p.z > -18) {
      active.inGutter = true;
    }
  }
}

export function step(dtMs) {
  if (!world) return;
  accumulator += Math.min(120, Math.max(0, dtMs));
  let n = 0;
  while (accumulator >= STEP_MS && n < 5) {
    substep();
    accumulator -= STEP_MS;
    n++;
  }
  if (n >= 5) accumulator = 0;
}

export function getBallState(laneIndex) {
  if (laneIndex !== active.laneIndex || !active.ball) return null;
  try {
    const p = active.ball.translation();
    const q = active.ball.rotation();
    const v = active.ball.linvel();
    return { p: [p.x, p.y, p.z], q: [q.x, q.y, q.z, q.w], vel: [v.x, v.y, v.z] };
  } catch (e) {
    return null;
  }
}

export function getPinTransforms(laneIndex) {
  const laneX = laneIndex * LANE.PITCH;
  const out = [];
  for (let i = 0; i < GAME.PIN_COUNT; i++) {
    const body = laneIndex === active.laneIndex ? active.pins[i] : null;
    if (!body) {
      out.push({ p: [laneX + PIN_SPOTS[i].x, -5, PIN_SPOTS[i].z], q: [0, 0, 0, 1] });
      continue;
    }
    try {
      const p = body.translation();
      const q = body.rotation();
      out.push({
        p: [p.x, p.y, p.z],
        q: [q.x, q.y, q.z, q.w],
      });
    } catch (e) {
      out.push({ p: [laneX + PIN_SPOTS[i].x, -5, PIN_SPOTS[i].z], q: [0, 0, 0, 1] });
    }
  }
  return out;
}

export function getStandingMask(laneIndex) {
  if (laneIndex !== active.laneIndex) return 0;
  const laneX = laneIndex * LANE.PITCH;
  const cosTilt = Math.cos((PHYSICS.PIN_DOWN_TILT_DEG * Math.PI) / 180);
  let mask = 0;
  for (let i = 0; i < GAME.PIN_COUNT; i++) {
    const body = active.pins[i];
    if (!body) continue;
    try {
      const p = body.translation();
      const q = body.rotation();
      const upY = 1 - 2 * (q.x * q.x + q.z * q.z);
      const dx = p.x - (laneX + PIN_SPOTS[i].x);
      const dz = p.z - PIN_SPOTS[i].z;
      const disp = Math.sqrt(dx * dx + dz * dz);
      if (upY >= cosTilt && disp <= PHYSICS.PIN_DOWN_DISPLACEMENT && p.y > -0.05) mask |= 1 << i;
    } catch (e) {}
  }
  return mask;
}

function bodyCalm(body) {
  try {
    if (body.isSleeping()) return true;
    const lv = body.linvel();
    const av = body.angvel();
    const lmag = Math.sqrt(lv.x * lv.x + lv.y * lv.y + lv.z * lv.z);
    const amag = Math.sqrt(av.x * av.x + av.y * av.y + av.z * av.z);
    return lmag < PHYSICS.SETTLE_LINVEL && amag < PHYSICS.SETTLE_ANGVEL;
  } catch (e) {
    return true;
  }
}

export function isSettled(laneIndex) {
  if (laneIndex !== active.laneIndex) return true;
  if (active.ball) {
    const p = active.ball.translation();
    const gone = p.z < -18.2 || p.y < -0.5;
    if (!gone && !bodyCalm(active.ball)) return false;
  }
  for (let i = 0; i < GAME.PIN_COUNT; i++) {
    const body = active.pins[i];
    if (body && !bodyCalm(body)) return false;
  }
  return true;
}

export function ballInGutter(laneIndex) {
  return laneIndex === active.laneIndex && active.inGutter;
}

export function ballTouchedBumper(laneIndex) {
  return laneIndex === active.laneIndex && active.touchedBumper;
}

export function ballLateralTravel(laneIndex) {
  if (laneIndex !== active.laneIndex || !active.hasThrow) return 0;
  return Math.abs(active.maxX - active.minX);
}

export function clearThrow(laneIndex) {
  if (laneIndex !== active.laneIndex) return;
  removeBody(active.ball);
  active.ball = null;
  active.hasThrow = false;
  active.touchedBumper = false;
  active.inGutter = false;
}
