// Gzowo Bowling — three.js cartoon world: renderer, lanes, pins (instanced, GLB w/ fallback), balls, aim ghost.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { LANE, TIMING, ASSETS, GAME } from "../config.js";

let renderer = null;
let scene = null;
let containerRef = null;
let toonGradient = null;
let pinGeometry = null;
let pinMaterial = null;
let lanes = [];
let aimLine = null;
let renderHooks = [];
let lastRenderTime = 0;

export const PIN_SPOTS = (() => {
  const s = [];
  for (let r = 0; r < 4; r++) {
    for (let i = 0; i <= r; i++) {
      s.push({ x: (i - r / 2) * LANE.PIN_SPACING, z: LANE.HEADPIN_Z - r * LANE.PIN_ROW_DEPTH });
    }
  }
  return s;
})();

function makeToonGradient() {
  if (toonGradient) return toonGradient;
  const data = new Uint8Array([110, 180, 255, 255]);
  toonGradient = new THREE.DataTexture(data, 4, 1, THREE.RedFormat);
  toonGradient.minFilter = THREE.NearestFilter;
  toonGradient.magFilter = THREE.NearestFilter;
  toonGradient.needsUpdate = true;
  return toonGradient;
}

function toonMat(color, opts) {
  const m = new THREE.MeshToonMaterial(Object.assign({ color: color, gradientMap: makeToonGradient() }, opts || {}));
  return m;
}

function canvasTexture(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 2;
  return tex;
}

function laneDeckTexture() {
  return canvasTexture(256, 1024, (ctx, w, h) => {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "rgba(90,60,20,.14)";
    ctx.lineWidth = 2;
    for (let i = 1; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo((w / 8) * i, 0);
      ctx.lineTo((w / 8) * i, h);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(90,50,15,.4)";
    const cx = w / 2;
    const arrows = [[cx, 330], [cx - 52, 366], [cx + 52, 366], [cx - 104, 402], [cx + 104, 402], [cx - 26, 348], [cx + 26, 348]];
    for (const [ax, ay] of arrows) {
      if (ax < 10 || ax > w - 10) continue;
      ctx.beginPath();
      ctx.moveTo(ax, ay - 22);
      ctx.lineTo(ax - 9, ay + 8);
      ctx.lineTo(ax + 9, ay + 8);
      ctx.closePath();
      ctx.fill();
    }
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(cx - 88 + i * 44, 560, 6, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function ballTextureCanvas(color, pattern, withHoles) {
  const size = 256;
  const c = document.createElement("canvas");
  c.width = size;
  c.height = size;
  const ctx = c.getContext("2d");
  const base = new THREE.Color(color);
  const lum = 0.299 * base.r + 0.587 * base.g + 0.114 * base.b;
  const overlay = lum > 0.62 ? "rgba(43,42,74,.3)" : "rgba(255,255,255,.85)";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = overlay;
  if (pattern === "stripes") {
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(-Math.PI / 6);
    for (let i = -2; i <= 2; i += 2) {
      ctx.fillRect(-size, i * 34 - 10, size * 2, 20);
    }
    ctx.restore();
  } else if (pattern === "dots") {
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        ctx.beginPath();
        ctx.arc(x * 64 + (y % 2 ? 32 : 0) + 16, y * 64 + 32, 15, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (pattern === "swirl") {
    ctx.strokeStyle = overlay;
    ctx.lineWidth = 13;
    ctx.lineCap = "round";
    for (let a = 0; a < 2; a++) {
      ctx.beginPath();
      for (let t = 0; t <= 1; t += 0.04) {
        const ang = a * Math.PI + t * Math.PI * 2.2;
        const r = 14 + t * 96;
        const px = size / 2 + Math.cos(ang) * r;
        const py = size / 2 + Math.sin(ang) * r;
        if (t === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  } else if (pattern === "stars") {
    const star = (sx, sy, r) => {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const rr = i % 2 ? r * 0.45 : r;
        const ang = -Math.PI / 2 + (i * Math.PI) / 5;
        const px = sx + Math.cos(ang) * rr;
        const py = sy + Math.sin(ang) * rr;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    };
    star(64, 60, 22);
    star(180, 96, 18);
    star(96, 180, 20);
    star(200, 196, 15);
  } else if (pattern === "split") {
    ctx.fillRect(size / 2, 0, size / 2, size);
    ctx.fillStyle = lum > 0.62 ? "rgba(43,42,74,.6)" : "rgba(255,255,255,.95)";
    ctx.fillRect(size / 2 - 3, 0, 6, size);
  }
  if (withHoles) {
    ctx.fillStyle = "rgba(20,16,34,.9)";
    const holes = [[128, 52], [110, 80], [146, 80]];
    for (const [hx, hy] of holes) {
      ctx.beginPath();
      ctx.arc(hx, hy, 9, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  return c;
}

function pinStripeTexture() {
  return canvasTexture(32, 128, (ctx, w, h) => {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#FF4B5C";
    ctx.fillRect(0, h * 0.30, w, h * 0.07);
    ctx.fillRect(0, h * 0.42, w, h * 0.05);
  });
}

function buildFallbackPinGeometry() {
  const pts = [
    [0.0, 0.0], [0.036, 0.0], [0.05, 0.012], [0.058, 0.05], [0.06, 0.1], [0.052, 0.16],
    [0.035, 0.215], [0.028, 0.25], [0.03, 0.285], [0.037, 0.315], [0.036, 0.345], [0.022, 0.372], [0.0, 0.38],
  ].map((p) => new THREE.Vector2(p[0], p[1]));
  const g = new THREE.LatheGeometry(pts, 20);
  g.computeVertexNormals();
  return g;
}

async function tryLoadPinGLB() {
  const url = ASSETS.GLB && ASSETS.GLB.pin;
  if (!url) return null;
  try {
    const loader = new GLTFLoader();
    const gltf = await Promise.race([
      loader.loadAsync(url),
      new Promise((_, rej) => setTimeout(() => rej(new Error("glb_timeout")), TIMING.ASSET_TIMEOUT_MS)),
    ]);
    let best = null;
    gltf.scene.traverse((o) => {
      if (o.isMesh && o.geometry) {
        if (!best || (o.geometry.attributes.position && o.geometry.attributes.position.count > best.geometry.attributes.position.count)) best = o;
      }
    });
    if (!best) return null;
    const g = best.geometry.clone();
    g.applyMatrix4(best.matrixWorld);
    g.computeBoundingBox();
    const bb = g.boundingBox;
    const height = bb.max.y - bb.min.y;
    if (!(height > 0)) return null;
    const s = LANE.PIN.HEIGHT / height;
    g.translate(-(bb.min.x + bb.max.x) / 2, -bb.min.y, -(bb.min.z + bb.max.z) / 2);
    g.scale(s, s, s);
    g.computeVertexNormals();
    return g;
  } catch (e) {
    console.warn("pin GLB failed, using procedural pin", e);
    return null;
  }
}

export async function initScene(containerEl) {
  containerRef = containerEl;
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  containerEl.appendChild(renderer.domElement);
  scene = new THREE.Scene();
  scene.background = new THREE.Color("#FFE9C9");
  const hemi = new THREE.HemisphereLight("#FFF6E9", "#D9B98C", 0.85);
  scene.add(hemi);
  const key = new THREE.DirectionalLight("#FFFFFF", 1.05);
  key.position.set(4, 9, 6);
  scene.add(key);
  const fill = new THREE.DirectionalLight("#BDE3FF", 0.3);
  fill.position.set(-5, 6, -4);
  scene.add(fill);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(160, 90), toonMat("#E4CFA6"));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(8, -0.62, -8);
  scene.add(floor);
  pinMaterial = toonMat("#FFFFFF", { map: pinStripeTexture() });
  pinGeometry = buildFallbackPinGeometry();
  tryLoadPinGLB().then((g) => {
    if (g) {
      pinGeometry = g;
      for (const l of lanes) {
        if (!l || !l.pins) continue;
        const old = l.pins;
        const im = new THREE.InstancedMesh(pinGeometry, pinMaterial, GAME.PIN_COUNT);
        im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        scene.add(im);
        im.instanceMatrix.copy(old.instanceMatrix);
        im.instanceMatrix.needsUpdate = true;
        scene.remove(old);
        l.pins = im;
      }
    }
  }).catch(() => {});
  const aimGeo = new THREE.BufferGeometry().setFromPoints(new Array(24).fill(0).map(() => new THREE.Vector3()));
  aimLine = new THREE.Line(aimGeo, new THREE.LineDashedMaterial({ color: "#FF6B6B", dashSize: 0.22, gapSize: 0.14, transparent: true, opacity: 0.9 }));
  aimLine.visible = false;
  scene.add(aimLine);
  window.addEventListener("resize", () => {
    try { renderer.setSize(window.innerWidth, window.innerHeight); } catch (e) {}
  });
  lastRenderTime = performance.now();
}

function makeLane(index) {
  const group = new THREE.Group();
  group.position.set(index * LANE.PITCH, 0, 0);
  const runGroup = new THREE.Group();
  group.add(runGroup);
  const runLen = 17.5;
  const runCenterZ = -6.5;
  const deckMat = toonMat("#E9BB80", { map: laneDeckTexture() });
  const deckRun = new THREE.Mesh(new THREE.BoxGeometry(LANE.WIDTH, 0.12, runLen), deckMat);
  deckRun.position.set(0, -0.06, runCenterZ);
  runGroup.add(deckRun);
  const gutterMat = toonMat("#F1E3CA");
  const gutterGeo = new THREE.BoxGeometry(LANE.GUTTER_WIDTH, 0.06, runLen + 2.7);
  const gx = LANE.WIDTH / 2 + LANE.GUTTER_WIDTH / 2;
  const gutterL = new THREE.Mesh(gutterGeo, gutterMat);
  gutterL.position.set(-gx, -LANE.GUTTER_DEPTH - 0.03, runCenterZ - 1.35);
  const gutterR = gutterL.clone();
  gutterR.position.x = gx;
  runGroup.add(gutterL, gutterR);
  const railMat = toonMat("#C98F52");
  const railGeo = new THREE.BoxGeometry(0.07, 0.2, runLen + 2.7);
  const rx = LANE.WIDTH / 2 + LANE.GUTTER_WIDTH + 0.035;
  const railL = new THREE.Mesh(railGeo, railMat);
  railL.position.set(-rx, 0.0, runCenterZ - 1.35);
  const railR = railL.clone();
  railR.position.x = rx;
  runGroup.add(railL, railR);
  const bumperMat = toonMat("#4CC9F0");
  const bumperGeo = new THREE.BoxGeometry(LANE.GUTTER_WIDTH * 0.8, 0.2, 15.2);
  const bumperL = new THREE.Mesh(bumperGeo, bumperMat);
  bumperL.position.set(-gx, 0.04, -7.0);
  const bumperR = bumperL.clone();
  bumperR.position.x = gx;
  bumperL.visible = false;
  bumperR.visible = false;
  runGroup.add(bumperL, bumperR);
  const pinDeckMat = toonMat("#B98B54");
  const pinDeck = new THREE.Mesh(new THREE.BoxGeometry(LANE.WIDTH, 0.12, 2.7), pinDeckMat);
  pinDeck.position.set(0, -0.06, -16.6);
  group.add(pinDeck);
  const pit = new THREE.Mesh(new THREE.BoxGeometry(LANE.WIDTH + LANE.GUTTER_WIDTH * 2, 0.9, 1.4), toonMat("#221E33"));
  pit.position.set(0, -0.45, -18.7);
  group.add(pit);
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(LANE.PITCH - 0.15, 1.6, 0.12), toonMat("#2B2A4A"));
  backWall.position.set(0, 0.6, -19.5);
  group.add(backWall);
  const pins = new THREE.InstancedMesh(pinGeometry, pinMaterial, GAME.PIN_COUNT);
  pins.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const plaqueAnchor = new THREE.Object3D();
  plaqueAnchor.position.set(0, 1.55, -16.9);
  group.add(plaqueAnchor);
  const backdropHolder = new THREE.Group();
  const propsHolder = new THREE.Group();
  const lightHolder = new THREE.Group();
  group.add(backdropHolder, propsHolder, lightHolder);
  return {
    group, runGroup, deckMat, deckRun, gutterMat, gutterL, gutterR, railMat, railL, railR,
    bumperL, bumperR, bumperMat, pinDeck, pinDeckMat, pit, backWall, pins, plaqueAnchor,
    backdropHolder, propsHolder, lightHolder, ball: null, narrowTarget: 1, narrowCurrent: 1,
  };
}

export function standingTransforms(laneIndex, mask) {
  const laneX = laneIndex * LANE.PITCH;
  const out = [];
  for (let i = 0; i < GAME.PIN_COUNT; i++) {
    const up = mask === undefined || (mask >> i) & 1;
    out.push({
      p: [laneX + PIN_SPOTS[i].x, up ? 0 : -5, PIN_SPOTS[i].z],
      q: [0, 0, 0, 1],
    });
  }
  return out;
}

export function buildLanes(playersArr) {
  for (const l of lanes) {
    if (!l) continue;
    scene.remove(l.group);
    scene.remove(l.pins);
  }
  lanes = [];
  renderHooks = [];
  const arr = Array.isArray(playersArr) ? playersArr : [];
  for (let i = 0; i < arr.length; i++) {
    const lane = makeLane(i);
    scene.add(lane.group);
    scene.add(lane.pins);
    lanes.push(lane);
    setPinTransforms(i, standingTransforms(i));
    const p = arr[i] || {};
    const ball = createBallMesh(p.ballColor || "#FF6B6B", p.ballPattern || "solid");
    setBallVisual(i, ball);
  }
}

export function getLaneGroup(laneIndex) {
  return lanes[laneIndex] ? lanes[laneIndex].group : null;
}

export function getLaneParts(laneIndex) {
  return lanes[laneIndex] || null;
}

export function getLaneCount() {
  return lanes.length;
}

export function createBallMesh(color, pattern) {
  const tex = new THREE.CanvasTexture(ballTextureCanvas(color, pattern, true));
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(LANE.BALL_RADIUS, 28, 20),
    toonMat("#FFFFFF", { map: tex })
  );
  mesh.visible = false;
  return mesh;
}

export function setBallVisual(laneIndex, mesh) {
  const l = lanes[laneIndex];
  if (!l) return;
  if (l.ball) scene.remove(l.ball);
  l.ball = mesh;
  scene.add(mesh);
}

export function setBallPose(laneIndex, p, q) {
  const l = lanes[laneIndex];
  if (!l || !l.ball) return;
  l.ball.position.set(p[0], p[1], p[2]);
  if (q) l.ball.quaternion.set(q[0], q[1], q[2], q[3]);
  l.ball.visible = true;
}

export function showBall(laneIndex, on) {
  const l = lanes[laneIndex];
  if (l && l.ball) l.ball.visible = !!on;
}

export function setPinTransforms(laneIndex, transforms) {
  const l = lanes[laneIndex];
  if (!l || !Array.isArray(transforms)) return;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const v = new THREE.Vector3();
  const s = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i < GAME.PIN_COUNT && i < transforms.length; i++) {
    const t = transforms[i];
    if (!t || !t.p) continue;
    v.set(t.p[0], t.p[1], t.p[2]);
    if (t.q) q.set(t.q[0], t.q[1], t.q[2], t.q[3]);
    else q.identity();
    m.compose(v, q, s);
    l.pins.setMatrixAt(i, m);
  }
  l.pins.instanceMatrix.needsUpdate = true;
}

export function showAimGhost(laneIndex, aim, spin) {
  const l = lanes[laneIndex];
  if (!l || !aimLine) return;
  const laneX = laneIndex * LANE.PITCH;
  const effW = LANE.WIDTH * (l.narrowTarget < 1 ? LANE.NARROW_SCALE : 1);
  const ax = Math.max(-1, Math.min(1, (aim && aim.x) || 0));
  const fwd = Math.max(0, Math.min(1, (aim && aim.forward) || 0));
  const sp = Math.max(-1, Math.min(1, spin || 0));
  const startX = laneX + ax * (effW / 2 - LANE.BALL_RADIUS - 0.02);
  const startZ = -fwd * LANE.RELEASE_MAX_FORWARD;
  if (l.ball) {
    l.ball.position.set(startX, LANE.BALL_RADIUS, startZ);
    l.ball.visible = true;
  }
  const pos = aimLine.geometry.attributes.position;
  const len = 13;
  for (let i = 0; i < 24; i++) {
    const t = i / 23;
    const z = startZ - t * len;
    const x = startX + sp * 1.15 * t * t;
    pos.setXYZ(i, x, 0.03, z);
  }
  pos.needsUpdate = true;
  aimLine.computeLineDistances();
  aimLine.visible = true;
}

export function hideAimGhost() {
  if (aimLine) aimLine.visible = false;
}

export function setNarrowVisual(laneIndex, narrow) {
  const l = lanes[laneIndex];
  if (!l) return;
  l.narrowTarget = narrow ? LANE.NARROW_SCALE : 1;
}

export function setBumperVisual(laneIndex, on) {
  const l = lanes[laneIndex];
  if (!l) return;
  l.bumperL.visible = !!on;
  l.bumperR.visible = !!on;
}

export function getPlaqueAnchor(laneIndex) {
  const l = lanes[laneIndex];
  if (!l) return null;
  const v = new THREE.Vector3();
  l.plaqueAnchor.getWorldPosition(v);
  return v;
}

export function onRenderHook(cb) {
  if (typeof cb === "function") renderHooks.push(cb);
  return () => {
    const i = renderHooks.indexOf(cb);
    if (i >= 0) renderHooks.splice(i, 1);
  };
}

export function getScene() {
  return scene;
}

export function getRenderer() {
  return renderer;
}

export function render(camera) {
  if (!renderer || !scene || !camera) return;
  const now = performance.now();
  const dt = Math.min(60, now - lastRenderTime);
  lastRenderTime = now;
  for (const l of lanes) {
    if (Math.abs(l.narrowCurrent - l.narrowTarget) > 0.002) {
      l.narrowCurrent += (l.narrowTarget - l.narrowCurrent) * Math.min(1, dt / 180);
      l.runGroup.scale.x = l.narrowCurrent;
    } else if (l.runGroup.scale.x !== l.narrowTarget) {
      l.narrowCurrent = l.narrowTarget;
      l.runGroup.scale.x = l.narrowTarget;
    }
  }
  for (const cb of renderHooks) {
    try { cb(dt); } catch (e) {}
  }
  try { renderer.render(scene, camera); } catch (e) { console.warn("render failed", e); }
}
