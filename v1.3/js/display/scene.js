// Gzowo Bowling — three.js cartoon world: renderer, lanes, procedural pins (instanced), balls, aim ghost.
import * as THREE from "three";
import { LANE, GAME, TIMING, CDN } from "../config.js";
import { buildBall3D } from "../shared/ball3d.js";

let renderer = null;
let scene = null;
let containerRef = null;
let toonGradient = null;
let pinGeometry = null;
let pinMaterial = null;
let keyLight = null;
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
  return canvasTexture(512, 2048, (ctx, w, h) => {
    const planks = 9;
    const pw = w / planks;
    for (let i = 0; i < planks; i++) {
      const tone = 235 + ((i * 7) % 3) * 6 - (i % 2) * 10;
      ctx.fillStyle = `rgb(${tone},${Math.round(tone * 0.86)},${Math.round(tone * 0.62)})`;
      ctx.fillRect(i * pw, 0, pw + 1, h);
      ctx.strokeStyle = "rgba(96,62,22,.28)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(i * pw, 0);
      ctx.lineTo(i * pw, h);
      ctx.stroke();
      ctx.strokeStyle = "rgba(120,80,30,.10)";
      ctx.lineWidth = 2;
      for (let g = 0; g < 4; g++) {
        const gx = i * pw + pw * (0.2 + g * 0.2) + Math.sin(i * 3 + g) * 4;
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        for (let y = 0; y <= h; y += 64) ctx.lineTo(gx + Math.sin((y / h) * 6 + i + g) * 5, y);
        ctx.stroke();
      }
    }
    const sheen = ctx.createLinearGradient(0, 0, w, 0);
    sheen.addColorStop(0, "rgba(255,255,255,0)");
    sheen.addColorStop(0.5, "rgba(255,255,255,.14)");
    sheen.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(200,30,50,.85)";
    ctx.fillRect(0, h * 0.868, w, h * 0.008);
    const cx = w / 2;
    const arrowY = h * 0.42;
    const arrow = (ax, ay, s) => {
      ctx.beginPath();
      ctx.moveTo(ax, ay - 34 * s);
      ctx.lineTo(ax - 15 * s, ay + 14 * s);
      ctx.lineTo(ax, ay + 4 * s);
      ctx.lineTo(ax + 15 * s, ay + 14 * s);
      ctx.closePath();
      ctx.fill();
    };
    ctx.fillStyle = "rgba(178,58,72,.78)";
    arrow(cx, arrowY, 1.25);
    ctx.fillStyle = "rgba(60,90,150,.62)";
    arrow(cx - 92, arrowY + 66, 1);
    arrow(cx + 92, arrowY + 66, 1);
    arrow(cx - 184, arrowY + 132, 0.9);
    arrow(cx + 184, arrowY + 132, 0.9);
    ctx.fillStyle = "rgba(90,50,15,.5)";
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.arc(cx - 160 + i * 80, h * 0.72, 9, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function pinStripeTexture() {
  return canvasTexture(64, 256, (ctx, w, h) => {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, w, h);
    const band = (v, thick, color) => {
      ctx.fillStyle = color;
      ctx.fillRect(0, (1 - v) * h - (thick * h) / 2, w, thick * h);
    };
    band(0.685, 0.045, "#FF3B54");
    band(0.615, 0.028, "#FF3B54");
    const grad = ctx.createLinearGradient(0, 0, w, 0);
    grad.addColorStop(0, "rgba(0,0,0,.05)");
    grad.addColorStop(0.5, "rgba(255,255,255,.06)");
    grad.addColorStop(1, "rgba(0,0,0,.05)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  });
}

function buildPinGeometry() {
  const pts = [
    [0.0, 0.0], [0.030, 0.0], [0.042, 0.004], [0.050, 0.014], [0.054, 0.034], [0.056, 0.062],
    [0.0575, 0.095], [0.058, 0.13], [0.056, 0.165], [0.050, 0.20], [0.041, 0.232],
    [0.033, 0.258], [0.0285, 0.278], [0.027, 0.298], [0.0285, 0.316], [0.032, 0.332],
    [0.0345, 0.348], [0.033, 0.362], [0.027, 0.372], [0.016, 0.378], [0.0, 0.38],
  ].map((p) => new THREE.Vector2(p[0], p[1]));
  const g = new THREE.LatheGeometry(pts, 28);
  g.computeVertexNormals();
  return g;
}

export async function initScene(containerEl) {
  containerRef = containerEl;
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  containerEl.appendChild(renderer.domElement);
  scene = new THREE.Scene();
  scene.background = new THREE.Color("#FFE9C9");
  const hemi = new THREE.HemisphereLight("#FFF6E9", "#D9B98C", 0.72);
  scene.add(hemi);
  const key = new THREE.DirectionalLight("#FFFFFF", 1.15);
  key.position.set(4, 12, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 60;
  key.shadow.bias = -0.0004;
  key.shadow.normalBias = 0.02;
  scene.add(key);
  scene.add(key.target);
  keyLight = key;
  const fill = new THREE.DirectionalLight("#BDE3FF", 0.28);
  fill.position.set(-5, 6, -4);
  scene.add(fill);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(160, 90), toonMat("#E4CFA6"));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(8, -0.62, -8);
  floor.receiveShadow = true;
  scene.add(floor);
  await setupEnvironment();
  await loadPinAsset();
  const aimGeo = new THREE.BufferGeometry().setFromPoints(new Array(24).fill(0).map(() => new THREE.Vector3()));
  aimLine = new THREE.Line(aimGeo, new THREE.LineDashedMaterial({ color: "#FF6B6B", dashSize: 0.22, gapSize: 0.14, transparent: true, opacity: 0.9 }));
  aimLine.visible = false;
  scene.add(aimLine);
  window.addEventListener("resize", () => {
    try { renderer.setSize(window.innerWidth, window.innerHeight); } catch (e) {}
  });
  lastRenderTime = performance.now();
}

async function setupEnvironment() {
  try {
    const mod = await Promise.race([
      import(CDN.THREE_ADDONS + "environments/RoomEnvironment.js"),
      new Promise((_, rej) => setTimeout(() => rej(new Error("env timeout")), TIMING.ASSET_TIMEOUT_MS)),
    ]);
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new mod.RoomEnvironment(), 0.04).texture;
  } catch (e) {
    console.warn("environment load failed", e);
  }
}

async function loadPinAsset() {
  try {
    const mod = await Promise.race([
      import(CDN.THREE_ADDONS + "loaders/GLTFLoader.js"),
      new Promise((_, rej) => setTimeout(() => rej(new Error("gltf loader timeout")), TIMING.ASSET_TIMEOUT_MS)),
    ]);
    const loader = new mod.GLTFLoader();
    const url = new URL("assets/models/pin.glb", document.baseURI).href;
    const gltf = await Promise.race([
      loader.loadAsync(url),
      new Promise((_, rej) => setTimeout(() => rej(new Error("pin glb timeout")), TIMING.ASSET_TIMEOUT_MS)),
    ]);
    let src = null;
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse((o) => { if (o.isMesh && !src) src = o; });
    if (!src) throw new Error("no mesh in pin glb");
    const geo = src.geometry.clone();
    geo.applyMatrix4(src.matrixWorld);
    geo.computeBoundingBox();
    let bb = geo.boundingBox;
    const rawH = bb.max.y - bb.min.y;
    const sc = LANE.PIN.HEIGHT / Math.max(1e-4, rawH);
    geo.scale(sc, sc, sc);
    geo.computeBoundingBox();
    bb = geo.boundingBox;
    geo.translate(-(bb.max.x + bb.min.x) / 2, -bb.min.y, -(bb.max.z + bb.min.z) / 2);
    const mat = src.material;
    mat.envMapIntensity = 0.85;
    if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
    pinGeometry = geo;
    pinMaterial = mat;
  } catch (e) {
    console.warn("pin GLB load failed, using procedural pin", e);
    pinMaterial = toonMat("#FFFFFF", { map: pinStripeTexture() });
    pinGeometry = buildPinGeometry();
  }
}

function configureShadows(laneCount) {
  if (!keyLight) return;
  const n = Math.max(1, laneCount);
  const centerX = ((n - 1) * LANE.PITCH) / 2;
  keyLight.position.set(centerX + 5, 13, 7);
  keyLight.target.position.set(centerX, 0, -8);
  keyLight.target.updateMatrixWorld();
  const halfW = (n * LANE.PITCH) / 2 + 2.5;
  const cam = keyLight.shadow.camera;
  cam.left = -halfW;
  cam.right = halfW;
  cam.top = 17;
  cam.bottom = -17;
  cam.near = 1;
  cam.far = 60;
  cam.updateProjectionMatrix();
  const size = n <= 2 ? 2048 : n <= 4 ? 1024 : 512;
  if (keyLight.shadow.mapSize.x !== size) {
    keyLight.shadow.mapSize.set(size, size);
    if (keyLight.shadow.map) { keyLight.shadow.map.dispose(); keyLight.shadow.map = null; }
  }
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
  deckRun.receiveShadow = true;
  runGroup.add(deckRun);
  const gutterMat = toonMat("#F1E3CA");
  const gutterLen = runLen + 2.7;
  const gx = LANE.WIDTH / 2 + LANE.GUTTER_WIDTH / 2;
  const gutterGeo = new THREE.CylinderGeometry(
    LANE.GUTTER_WIDTH * 0.62, LANE.GUTTER_WIDTH * 0.62, gutterLen, 14, 1, true,
    Math.PI / 2, Math.PI
  );
  const gutterL = new THREE.Mesh(gutterGeo, gutterMat);
  gutterL.material.side = THREE.DoubleSide;
  gutterL.rotation.x = Math.PI / 2;
  gutterL.rotation.z = Math.PI;
  gutterL.position.set(-gx, 0.02, runCenterZ - 1.35);
  const gutterR = gutterL.clone();
  gutterR.position.x = gx;
  runGroup.add(gutterL, gutterR);
  const railMat = toonMat("#C98F52");
  const railGeo = new THREE.BoxGeometry(0.09, 0.22, gutterLen);
  const rx = LANE.WIDTH / 2 + LANE.GUTTER_WIDTH + 0.045;
  const railL = new THREE.Mesh(railGeo, railMat);
  railL.position.set(-rx, 0.02, runCenterZ - 1.35);
  const railR = railL.clone();
  railR.position.x = rx;
  const railTopGeo = new THREE.CylinderGeometry(0.05, 0.05, gutterLen, 10);
  const railTopL = new THREE.Mesh(railTopGeo, railMat);
  railTopL.rotation.x = Math.PI / 2;
  railTopL.position.set(-rx, 0.14, runCenterZ - 1.35);
  const railTopR = railTopL.clone();
  railTopR.position.x = rx;
  runGroup.add(railL, railR, railTopL, railTopR);
  const bumperMat = toonMat("#4CC9F0");
  const bumperGeo = new THREE.CapsuleGeometry(0.075, 15.0, 6, 12);
  const bumperL = new THREE.Mesh(bumperGeo, bumperMat);
  bumperL.rotation.x = Math.PI / 2;
  bumperL.position.set(-gx, 0.11, -7.0);
  const bumperR = bumperL.clone();
  bumperR.position.x = gx;
  bumperL.visible = false;
  bumperR.visible = false;
  runGroup.add(bumperL, bumperR);
  const approach = new THREE.Mesh(new THREE.BoxGeometry(LANE.PITCH - 0.2, 0.1, 2.4), toonMat("#D8B183"));
  approach.position.set(0, -0.07, 3.2);
  approach.receiveShadow = true;
  group.add(approach);
  const pinDeckMat = toonMat("#B98B54");
  const pinDeck = new THREE.Mesh(new THREE.BoxGeometry(LANE.WIDTH, 0.12, 2.7), pinDeckMat);
  pinDeck.position.set(0, -0.06, -16.6);
  pinDeck.receiveShadow = true;
  group.add(pinDeck);
  const pit = new THREE.Mesh(new THREE.BoxGeometry(LANE.WIDTH + LANE.GUTTER_WIDTH * 2, 0.9, 1.4), toonMat("#221E33"));
  pit.position.set(0, -0.45, -18.7);
  group.add(pit);
  const backWall = new THREE.Mesh(new THREE.BoxGeometry(LANE.PITCH - 0.15, 1.6, 0.12), toonMat("#2B2A4A"));
  backWall.position.set(0, 0.6, -19.5);
  group.add(backWall);
  const pins = new THREE.InstancedMesh(pinGeometry, pinMaterial, GAME.PIN_COUNT);
  pins.castShadow = true;
  pins.receiveShadow = true;
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
    const ball = createBallMesh(p.ballColor || "#FF6B6B", p.ballPattern || "solid", p.ballWeight);
    setBallVisual(i, ball);
  }
  configureShadows(arr.length);
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

export function createBallMesh(color, pattern, weight) {
  const api = buildBall3D(THREE, {
    radius: LANE.BALL_RADIUS,
    color: color,
    pattern: pattern,
    weight: weight,
    gradientMap: makeToonGradient(),
  });
  api.group.visible = false;
  return api.group;
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
