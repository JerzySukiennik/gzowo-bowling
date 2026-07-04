// Gzowo Bowling — cheap juice: pooled 3D confetti/fireworks particles, strike flash, trick-shot stamp, camera shake hook.
import * as THREE from "three";
import { LANE, PLAYER_COLORS } from "../config.js";
import { t } from "../i18n.js";

const MAX = 420;
let sceneRef = null;
let shakeFn = null;
let sfxFn = null;
let points = null;
let posAttr = null;
let colAttr = null;
const vel = new Float32Array(MAX * 3);
const life = new Float32Array(MAX);
let cursor = 0;
let pendingBursts = [];

const PALETTE = PLAYER_COLORS.map((c) => new THREE.Color(c));

export function initEffects(refs) {
  try {
    sceneRef = refs && refs.scene;
    shakeFn = refs && refs.shake;
    sfxFn = refs && refs.sfx;
    if (!sceneRef) return;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX * 3);
    const colors = new Float32Array(MAX * 3);
    for (let i = 0; i < MAX; i++) {
      positions[i * 3 + 1] = -999;
      life[i] = 0;
    }
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    points = new THREE.Points(geo, new THREE.PointsMaterial({ size: 0.085, vertexColors: true, transparent: true, opacity: 0.95, sizeAttenuation: true }));
    points.frustumCulled = false;
    sceneRef.add(points);
    posAttr = geo.getAttribute("position");
    colAttr = geo.getAttribute("color");
  } catch (e) {
    console.warn("initEffects failed", e);
  }
}

function spawnBurst(x, y, z, count, speed, up) {
  if (!posAttr) return;
  for (let i = 0; i < count; i++) {
    const idx = cursor;
    cursor = (cursor + 1) % MAX;
    posAttr.setXYZ(idx, x + (Math.random() - 0.5) * 0.3, y, z + (Math.random() - 0.5) * 0.3);
    const a = Math.random() * Math.PI * 2;
    const r = Math.random() * speed;
    vel[idx * 3] = Math.cos(a) * r;
    vel[idx * 3 + 1] = (up || 2.2) + Math.random() * speed;
    vel[idx * 3 + 2] = Math.sin(a) * r * 0.6;
    life[idx] = 1.4 + Math.random() * 1.1;
    const c = PALETTE[(Math.random() * PALETTE.length) | 0];
    colAttr.setXYZ(idx, c.r, c.g, c.b);
  }
  posAttr.needsUpdate = true;
  colAttr.needsUpdate = true;
}

function flash() {
  try {
    const el = document.createElement("div");
    el.className = "flash-overlay";
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 200);
  } catch (e) {}
}

export function confettiBurst(laneIndex) {
  const x = laneIndex * LANE.PITCH;
  spawnBurst(x, 0.6, LANE.HEADPIN_Z, 50, 2.4, 2.6);
}

export function strikeCelebration(level) {
  const lvl = level === 2 ? 2 : 1;
  flash();
  if (shakeFn) { try { shakeFn(lvl === 2 ? 1 : 0.65); } catch (e) {} }
  pendingBursts.push({ delay: 0, count: lvl === 2 ? 90 : 60, speed: 3.2, y: 0.5 });
  pendingBursts.push({ delay: 260, count: 40, speed: 2.4, y: 2.2 });
  if (lvl === 2) {
    pendingBursts.push({ delay: 520, count: 70, speed: 3.6, y: 2.8 });
    pendingBursts.push({ delay: 800, count: 70, speed: 4.0, y: 3.2 });
  }
}

let celebrationLane = 0;
export function setCelebrationLane(laneIndex) {
  celebrationLane = laneIndex || 0;
}

export function trickShotCallout(type) {
  try {
    const stamp = document.createElement("div");
    stamp.className = "trick-stamp";
    const burst = document.createElement("div");
    burst.className = "trick-stamp-burst";
    const title = document.createElement("div");
    title.className = "trick-title";
    title.textContent = t("banner.trickshot");
    const sub = document.createElement("div");
    sub.className = "trick-sub";
    sub.textContent = t("banner.trickshot." + type);
    burst.append(title, sub);
    stamp.append(burst);
    document.body.appendChild(stamp);
    flash();
    if (sfxFn) { try { sfxFn("ding", 1); } catch (e) {} }
    setTimeout(() => stamp.remove(), 1900);
  } catch (e) {}
}

export function update(dtMs) {
  if (!posAttr) return;
  const dt = Math.min(0.1, dtMs / 1000);
  if (pendingBursts.length) {
    const next = [];
    for (const b of pendingBursts) {
      b.delay -= dtMs;
      if (b.delay <= 0) spawnBurst(celebrationLane * LANE.PITCH, b.y, LANE.HEADPIN_Z + 0.4, b.count, b.speed, 2.4);
      else next.push(b);
    }
    pendingBursts = next;
  }
  let any = false;
  for (let i = 0; i < MAX; i++) {
    if (life[i] <= 0) continue;
    any = true;
    life[i] -= dt;
    vel[i * 3 + 1] -= 6.5 * dt;
    const x = posAttr.getX(i) + vel[i * 3] * dt;
    const y = posAttr.getY(i) + vel[i * 3 + 1] * dt;
    const z = posAttr.getZ(i) + vel[i * 3 + 2] * dt;
    if (life[i] <= 0 || y < -1.4) {
      life[i] = 0;
      posAttr.setXYZ(i, 0, -999, 0);
    } else {
      posAttr.setXYZ(i, x, y, z);
    }
  }
  if (any) posAttr.needsUpdate = true;
}
