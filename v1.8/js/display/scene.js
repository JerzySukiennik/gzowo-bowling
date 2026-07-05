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
let aimLineBg = null;
let rackGroup = null;
let hallGroup = null;
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

function makeBumper(colorHex) {
  const group = new THREE.Group();
  const LEN = 19.0, R = 0.085, RB = 0.106, SEGS = 8;
  const base = new THREE.Color(colorHex);
  const lighter = base.clone().lerp(new THREE.Color("#ffffff"), 0.22);
  const darker = base.clone().lerp(new THREE.Color("#1a2233"), 0.35);
  const mkMat = (col, rough) => new THREE.MeshStandardMaterial({ color: col, roughness: rough, metalness: 0.0, envMapIntensity: 1.15 });
  const tubeMat = mkMat(base, 0.34);
  const ringMat = mkMat(lighter, 0.28);
  const capMat = mkMat(base, 0.34);
  const baseMat = mkMat(darker, 0.55);
  const tubeLen = LEN - 2 * R;
  const tube = new THREE.Mesh(new THREE.CapsuleGeometry(R, tubeLen, 4, 16), tubeMat);
  tube.castShadow = true;
  group.add(tube);
  const capGeo = new THREE.SphereGeometry(RB * 0.92, 14, 10);
  const capTop = new THREE.Mesh(capGeo, capMat);
  capTop.position.y = LEN / 2 - R * 0.6;
  capTop.scale.set(1, 0.82, 1);
  const capBot = capTop.clone();
  capBot.position.y = -(LEN / 2 - R * 0.6);
  group.add(capTop, capBot);
  const ringGeo = new THREE.TorusGeometry(R * 0.96, RB - R * 0.96, 8, 18);
  const usable = LEN - 2.2 * RB;
  for (let i = 0; i < SEGS; i++) {
    const t = SEGS === 1 ? 0.5 : i / (SEGS - 1);
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.y = (t - 0.5) * usable;
    ring.rotation.x = Math.PI / 2;
    ring.scale.set(1, 1, 0.75);
    group.add(ring);
  }
  const seam = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.5, R * 0.5, LEN - 2 * R, 8), baseMat);
  seam.position.set(-R * 0.85, 0, R * 0.15);
  seam.scale.set(1.0, 1.0, 0.55);
  group.add(seam);
  group.userData.setColor = (hex) => {
    const b = new THREE.Color(hex);
    tubeMat.color.copy(b);
    capMat.color.copy(b);
    ringMat.color.copy(b.clone().lerp(new THREE.Color("#ffffff"), 0.22));
    baseMat.color.copy(b.clone().lerp(new THREE.Color("#1a2233"), 0.35));
  };
  return group;
}

function makeEndWall(makeToonMat) {
  const g = new THREE.Group();
  const W = 4.0 - 0.15, H = 1.6, D = 0.14, Z = -18.25;
  const OW = 1.18, OH = 0.98;
  const side = (W - OW) / 2, header = H - OH;
  const wallMat = makeToonMat("#2B2A4A");
  const pillarGeo = new THREE.BoxGeometry(side, H, D);
  const pxL = -(OW / 2 + side / 2);
  const pL = new THREE.Mesh(pillarGeo, wallMat);
  pL.position.set(pxL, H / 2, Z);
  const pR = pL.clone();
  pR.position.x = -pxL;
  g.add(pL, pR);
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(OW, header, D), wallMat);
  lintel.position.set(0, OH + header / 2, Z);
  g.add(lintel);
  const backMat = makeToonMat("#0E0D18");
  const panelH = OH - 0.18;
  const back = new THREE.Mesh(new THREE.BoxGeometry(OW + 0.1, panelH, 0.06), backMat);
  back.position.set(0, 0.18 + panelH / 2, Z - 0.42);
  g.add(back);
  const frameMat = makeToonMat("#4A4770");
  const zf = Z + D / 2 + 0.005, ft = 0.06;
  const fTop = new THREE.Mesh(new THREE.BoxGeometry(OW + ft * 2, ft, 0.02), frameMat);
  fTop.position.set(0, OH + ft / 2, zf);
  const fSideGeo = new THREE.BoxGeometry(ft, OH, 0.02);
  const fSL = new THREE.Mesh(fSideGeo, frameMat);
  fSL.position.set(-(OW / 2 + ft / 2), OH / 2, zf);
  const fSR = fSL.clone();
  fSR.position.x = OW / 2 + ft / 2;
  g.add(fTop, fSL, fSR);
  g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
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
  // floor is now part of the decorative hall (buildHall) so nothing floats
  await setupEnvironment();
  await loadPinAsset();
  const aimBgGeo = new THREE.BufferGeometry().setFromPoints(new Array(24).fill(0).map(() => new THREE.Vector3()));
  aimLineBg = new THREE.Line(aimBgGeo, new THREE.LineBasicMaterial({ color: "#20122E", transparent: true, opacity: 0.85 }));
  aimLineBg.visible = false;
  scene.add(aimLineBg);
  const aimGeo = new THREE.BufferGeometry().setFromPoints(new Array(24).fill(0).map(() => new THREE.Vector3()));
  aimLine = new THREE.Line(aimGeo, new THREE.LineDashedMaterial({ color: "#FFF4C2", dashSize: 0.22, gapSize: 0.13, transparent: true, opacity: 1 }));
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

function makeRail(woodMat, capMat) {
  const group = new THREE.Group();
  const LEN = 20.2;
  const base = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.20, LEN), woodMat);
  base.position.set(0, -0.005, 0);
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);
  const shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.062, LEN, 10, 1), woodMat);
  shoulder.rotation.x = Math.PI / 2;
  shoulder.position.set(0, 0.105, 0);
  shoulder.castShadow = true;
  group.add(shoulder);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, LEN, 8, 1), capMat);
  cap.rotation.x = Math.PI / 2;
  cap.position.set(0, 0.17, 0);
  cap.castShadow = true;
  group.add(cap);
  return group;
}

function buildHall(THREE, makeToonMat, laneCount) {
  const hall = new THREE.Group();
  hall.name = "hall";
  const PITCH = 4.0;
  const N = Math.max(1, laneCount | 0);
  const FLOOR_Y = -0.12;
  const bankMinX = -PITCH * 0.5;
  const bankMaxX = (N - 1) * PITCH + PITCH * 0.5;
  const bankW = bankMaxX - bankMinX;
  const centerX = (bankMinX + bankMaxX) / 2;
  const FRONT_Z = 8.6;
  const BACK_Z = -20.2;
  const CEIL_Y = 6.9;
  const WALL_PAD = 2.2;
  const wallLX = bankMinX - WALL_PAD;
  const wallRX = bankMaxX + WALL_PAD;
  const hallDepthZ = FRONT_Z - BACK_Z;
  const hallCenterZ = (FRONT_Z + BACK_Z) / 2;
  const COL = {
    floorApproach: "#C9A063", floorTileA: "#3A6B8C", floorTileB: "#4E85A6",
    wall: "#F2D9AE", wainscot: "#B4622F", ceiling: "#33506B", beam: "#274056",
    baseboard: "#7A4A2B", lampShade: "#FFF3D6", lampRim: "#E0A94A",
    counter: "#B33A4A", counterTop: "#E9C98A", signBg: "#20122E", signGlow: "#FFCE4A",
    bench: "#E8873C", benchLeg: "#3A2A22", step: "#7C5230",
    poster: "#2E5A86", arcade: "#5A3E8C", shoerack: "#6B4A2E",
  };
  const meshes = [];
  const add = (m) => { meshes.push(m); hall.add(m); return m; };
  const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  const mWall = makeToonMat(COL.wall);
  const mWainscot = makeToonMat(COL.wainscot);
  const mCeil = makeToonMat(COL.ceiling);
  const mBeam = makeToonMat(COL.beam);
  const mBase = makeToonMat(COL.baseboard);
  const _m = new THREE.Matrix4();
  const _q = new THREE.Quaternion();
  const _s = new THREE.Vector3(1, 1, 1);
  const _v = new THREE.Vector3();
  const roundRect = (ctx, x, y, w, h, r) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  };
  const makeSignTexture = () => {
    const c = document.createElement("canvas");
    c.width = 1024; c.height = 288;
    const ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = "#20122E";
    roundRect(ctx, 8, 8, c.width - 16, c.height - 16, 40); ctx.fill();
    ctx.lineWidth = 8; ctx.strokeStyle = "#FFCE4A"; ctx.stroke();
    ctx.save();
    ctx.translate(92, 130);
    ctx.fillStyle = "#FFF3D6";
    ctx.beginPath(); ctx.ellipse(0, 0, 20, 48, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#FF3B54"; ctx.fillRect(-20, -18, 40, 11);
    ctx.fillStyle = "#4CC9F0";
    ctx.beginPath(); ctx.arc(52, 26, 30, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "700 92px Fredoka, Arial, sans-serif";
    ctx.fillStyle = "#FFCE4A";
    ctx.shadowColor = "#FF7A6B"; ctx.shadowBlur = 16;
    ctx.fillText("GZOWO BOWLING", c.width / 2 + 60, c.height / 2 + 4);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 2;
    return tex;
  };
  const baseFloor = box(bankW + WALL_PAD * 2 + 0.4, 0.24, hallDepthZ, makeToonMat("#2A2438"));
  baseFloor.position.set(centerX, FLOOR_Y - 0.12, hallCenterZ);
  baseFloor.receiveShadow = true;
  add(baseFloor);
  const frontZoneBackZ = 4.6;
  const frontZoneD = FRONT_Z - frontZoneBackZ;
  const tileSize = 1.1;
  const cols = Math.max(1, Math.round((bankW + WALL_PAD * 2) / tileSize));
  const rows = Math.max(1, Math.round(frontZoneD / tileSize));
  const tileGeo = new THREE.BoxGeometry(tileSize * 0.98, 0.05, tileSize * 0.98);
  const capacity = Math.ceil((cols * rows) / 2) + rows + 2;
  const tilesA = new THREE.InstancedMesh(tileGeo, makeToonMat(COL.floorTileA), capacity);
  const tilesB = new THREE.InstancedMesh(tileGeo, makeToonMat(COL.floorTileB), capacity);
  tilesA.receiveShadow = true; tilesB.receiveShadow = true;
  const tileStartX = centerX - (cols * tileSize) / 2 + tileSize / 2;
  const tileStartZ = frontZoneBackZ + tileSize / 2;
  let ia = 0, ib = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = tileStartX + c * tileSize;
      const z = tileStartZ + r * tileSize;
      _m.makeTranslation(x, FLOOR_Y + 0.001, z);
      if ((r + c) % 2 === 0) tilesA.setMatrixAt(ia++, _m);
      else tilesB.setMatrixAt(ib++, _m);
    }
  }
  tilesA.count = ia; tilesB.count = ib;
  tilesA.instanceMatrix.needsUpdate = true; tilesB.instanceMatrix.needsUpdate = true;
  hall.add(tilesA, tilesB);
  const approachBand = box(bankW + WALL_PAD * 1.4, 0.06, frontZoneBackZ - 1.9, makeToonMat(COL.floorApproach));
  approachBand.position.set(centerX, FLOOR_Y + 0.002, (4.6 + 1.9) / 2);
  approachBand.receiveShadow = true;
  add(approachBand);
  const wallH = CEIL_Y - FLOOR_Y;
  const wallD = hallDepthZ;
  const makeSideWall = (xPos) => {
    const g = new THREE.Group();
    const wall = box(0.3, wallH, wallD, mWall);
    wall.position.set(0, FLOOR_Y + wallH / 2, 0);
    g.add(wall);
    const inward = xPos < centerX ? 0.16 : -0.16;
    const wains = box(0.06, 1.5, wallD, mWainscot);
    wains.position.set(inward, FLOOR_Y + 0.75, 0);
    g.add(wains);
    const bb = box(0.1, 0.22, wallD, mBase);
    bb.position.set(inward, FLOOR_Y + 0.11, 0);
    g.add(bb);
    g.position.set(xPos, 0, hallCenterZ);
    g.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
    return g;
  };
  add(makeSideWall(wallLX));
  add(makeSideWall(wallRX));
  const backWall = box(wallRX - wallLX + 0.6, wallH, 0.3, makeToonMat("#241E33"));
  backWall.position.set(centerX, FLOOR_Y + wallH / 2, BACK_Z);
  backWall.receiveShadow = true;
  add(backWall);
  const valance = box(wallRX - wallLX + 0.6, 0.5, 0.14, makeToonMat(COL.signGlow, { emissive: COL.signGlow, emissiveIntensity: 0.4 }));
  valance.position.set(centerX, 6.75, BACK_Z + 0.16);
  add(valance);
  const frontWall = box(wallRX - wallLX + 0.6, wallH, 0.3, mWall);
  frontWall.position.set(centerX, FLOOR_Y + wallH / 2, FRONT_Z);
  frontWall.receiveShadow = true;
  add(frontWall);
  const frontWains = box(wallRX - wallLX + 0.6, 1.5, 0.06, mWainscot);
  frontWains.position.set(centerX, FLOOR_Y + 0.75, FRONT_Z - 0.16);
  add(frontWains);
  const ceiling = box(wallRX - wallLX + 0.6, 0.3, wallD, mCeil);
  ceiling.position.set(centerX, CEIL_Y, hallCenterZ);
  ceiling.receiveShadow = true;
  add(ceiling);
  const beamGeo = new THREE.BoxGeometry(wallRX - wallLX + 0.4, 0.16, 0.24);
  const nBeams = Math.max(3, Math.round(hallDepthZ / 4));
  const beams = new THREE.InstancedMesh(beamGeo, mBeam, nBeams);
  for (let i = 0; i < nBeams; i++) {
    const z = BACK_Z + 1.5 + (i / (nBeams - 1)) * (hallDepthZ - 3.0);
    _m.makeTranslation(centerX, CEIL_Y - 0.22, z);
    beams.setMatrixAt(i, _m);
  }
  beams.instanceMatrix.needsUpdate = true;
  hall.add(beams);
  const lampZs = [-2, 2, 6];
  const lampXs = [];
  for (let i = 0; i < N; i++) lampXs.push(i * PITCH);
  const lampCount = lampXs.length * lampZs.length;
  const cords = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.02, 0.02, 0.8, 6), makeToonMat("#2A2A33"), lampCount);
  const shades = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.16, 0.34, 0.34, 14, 1, true), makeToonMat(COL.lampShade, { side: THREE.DoubleSide }), lampCount);
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.14, 12, 8), makeToonMat(COL.lampShade, { emissive: "#FFE7A8", emissiveIntensity: 0.9 }), lampCount);
  const rims = new THREE.InstancedMesh(new THREE.TorusGeometry(0.34, 0.03, 8, 18), makeToonMat(COL.lampRim), lampCount);
  const lampY = CEIL_Y - 0.9;
  let li = 0;
  for (const lx of lampXs) {
    for (const lz of lampZs) {
      _v.set(lx, CEIL_Y - 0.4, lz); _m.compose(_v, _q, _s); cords.setMatrixAt(li, _m);
      _v.set(lx, lampY, lz); _m.compose(_v, _q, _s); shades.setMatrixAt(li, _m);
      _v.set(lx, lampY - 0.05, lz); _m.compose(_v, _q, _s); bulbs.setMatrixAt(li, _m);
      _q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
      _v.set(lx, lampY - 0.14, lz); _m.compose(_v, _q, _s); rims.setMatrixAt(li, _m);
      _q.identity();
      li++;
    }
  }
  [cords, shades, bulbs, rims].forEach((im) => { im.instanceMatrix.needsUpdate = true; hall.add(im); });
  const stepZ = 6.2;
  const step = box(bankW + WALL_PAD * 1.2, 0.18, 1.4, makeToonMat(COL.step));
  step.position.set(centerX, FLOOR_Y + 0.09, stepZ);
  step.castShadow = true; step.receiveShadow = true;
  add(step);
  const stepFace = box(bankW + WALL_PAD * 1.2, 0.2, 0.06, makeToonMat("#5E3E22"));
  stepFace.position.set(centerX, FLOOR_Y + 0.09, stepZ - 0.7);
  add(stepFace);
  const benchCount = Math.max(2, N);
  const benchSpacing = bankW / benchCount;
  const benchSeats = new THREE.InstancedMesh(new THREE.BoxGeometry(benchSpacing * 0.62, 0.12, 0.5), makeToonMat(COL.bench), benchCount);
  const benchBacks = new THREE.InstancedMesh(new THREE.BoxGeometry(benchSpacing * 0.62, 0.42, 0.1), makeToonMat(COL.bench), benchCount);
  const benchLegs = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 0.42, 0.42), makeToonMat(COL.benchLeg), benchCount * 2);
  const benchY = FLOOR_Y + 0.18;
  const benchZ = stepZ + 0.05;
  let bi = 0, legi = 0;
  for (let i = 0; i < benchCount; i++) {
    const bx = centerX - (benchCount * benchSpacing) / 2 + benchSpacing / 2 + i * benchSpacing;
    _v.set(bx, benchY + 0.42, benchZ); _m.compose(_v, _q, _s); benchSeats.setMatrixAt(bi, _m);
    _v.set(bx, benchY + 0.6, benchZ + 0.2); _m.compose(_v, _q, _s); benchBacks.setMatrixAt(bi, _m);
    _v.set(bx - benchSpacing * 0.24, benchY + 0.21, benchZ); _m.compose(_v, _q, _s); benchLegs.setMatrixAt(legi++, _m);
    _v.set(bx + benchSpacing * 0.24, benchY + 0.21, benchZ); _m.compose(_v, _q, _s); benchLegs.setMatrixAt(legi++, _m);
    bi++;
  }
  [benchSeats, benchBacks, benchLegs].forEach((im) => { im.instanceMatrix.needsUpdate = true; im.castShadow = true; im.receiveShadow = true; hall.add(im); });
  const deskW = Math.min(4.2, bankW * 0.55);
  const deskX = wallLX + 1.4 + deskW / 2;
  const deskZ = FRONT_Z - 1.1;
  const counter = box(deskW, 1.05, 0.7, makeToonMat(COL.counter));
  counter.position.set(deskX, FLOOR_Y + 0.525, deskZ);
  counter.castShadow = true; counter.receiveShadow = true;
  add(counter);
  const counterTop = box(deskW + 0.12, 0.08, 0.82, makeToonMat(COL.counterTop));
  counterTop.position.set(deskX, FLOOR_Y + 1.09, deskZ);
  counterTop.castShadow = true;
  add(counterTop);
  const signW = Math.min(6.0, bankW * 0.7);
  const signBoard = box(signW + 0.3, signW * 0.28 + 0.2, 0.08, makeToonMat(COL.signBg));
  signBoard.position.set(centerX, 3.4, FRONT_Z - 0.24);
  add(signBoard);
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(signW, signW * 0.28),
    new THREE.MeshBasicMaterial({ map: makeSignTexture(), transparent: true, side: THREE.DoubleSide })
  );
  sign.position.set(centerX, 3.4, FRONT_Z - 0.30);
  sign.rotation.y = Math.PI;
  hall.add(sign);
  const poster = (x, y, z) => {
    // Push decals off the wall along its interior normal so nothing is coplanar.
    // nx = +1 for the left wall (interior toward +X), -1 for the right wall (interior toward -X).
    const nx = x < centerX ? 1 : -1;
    const frameMat = makeToonMat("#E9C98A");
    frameMat.polygonOffset = true;
    frameMat.polygonOffsetFactor = -1;
    frameMat.polygonOffsetUnits = -1;
    const posterMat = makeToonMat(COL.poster);
    posterMat.polygonOffset = true;
    posterMat.polygonOffsetFactor = -1;
    posterMat.polygonOffsetUnits = -1;
    // Frame sits just off the wall face (~0.08 standoff); poster panel is raised in front of the frame.
    const frame = box(0.04, 1.2, 0.9, frameMat);
    frame.position.set(x + nx * 0.05, y, z); add(frame);
    const p = box(0.06, 1.1, 0.8, posterMat);
    p.position.set(x + nx * 0.11, y, z); add(p);
  };
  poster(wallLX + 0.2, 2.6, -6);
  poster(wallLX + 0.2, 2.6, 0);
  poster(wallRX - 0.2, 2.6, -6);
  poster(wallRX - 0.2, 2.6, 0);
  const arcade = (x, z) => {
    const g = new THREE.Group();
    const body = box(0.7, 1.6, 0.6, makeToonMat(COL.arcade));
    body.position.y = FLOOR_Y + 0.8; g.add(body);
    const screen = box(0.5, 0.5, 0.05, makeToonMat("#0A0A18", { emissive: "#42D6FF", emissiveIntensity: 0.6 }));
    screen.position.set(0, FLOOR_Y + 1.15, 0.3); g.add(screen);
    const marquee = box(0.72, 0.22, 0.62, makeToonMat(COL.signGlow, { emissive: COL.signGlow, emissiveIntensity: 0.5 }));
    marquee.position.y = FLOOR_Y + 1.55; g.add(marquee);
    g.position.set(x, 0, z);
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    add(g);
  };
  arcade(wallLX + 0.9, FRONT_Z - 2.6);
  arcade(wallRX - 0.9, FRONT_Z - 2.6);
  const shoeRack = new THREE.Group();
  const rackBack = box(2.2, 1.8, 0.14, makeToonMat(COL.shoerack));
  rackBack.position.set(0, FLOOR_Y + 0.9, 0); shoeRack.add(rackBack);
  const shelves = new THREE.InstancedMesh(new THREE.BoxGeometry(2.2, 0.06, 0.34), makeToonMat("#8A5A2B"), 5);
  for (let i = 0; i < 5; i++) { _v.set(0, FLOOR_Y + 0.25 + i * 0.34, 0.18); _m.compose(_v, _q, _s); shelves.setMatrixAt(i, _m); }
  shelves.instanceMatrix.needsUpdate = true; shoeRack.add(shelves);
  shoeRack.position.set(wallRX - 1.5, 0, FRONT_Z - 0.3);
  shoeRack.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  add(shoeRack);
  meshes.forEach((m) => { if (m.isMesh) m.receiveShadow = true; });
  return hall;
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
  const railCapMat = new THREE.MeshStandardMaterial({ color: 0xF2D9A6, roughness: 0.28, metalness: 0.65, envMapIntensity: 1.35 });
  const rx = LANE.WIDTH / 2 + LANE.GUTTER_WIDTH + 0.045;
  const railL = makeRail(railMat, railCapMat);
  railL.position.set(-rx, 0.02, runCenterZ - 1.35);
  const railR = makeRail(railMat, railCapMat);
  railR.position.set(rx, 0.02, runCenterZ - 1.35);
  runGroup.add(railL, railR);
  const bumperL = makeBumper("#4CC9F0");
  bumperL.rotation.x = Math.PI / 2;
  bumperL.position.set(-gx, 0.11, -6.5);
  const bumperR = makeBumper("#4CC9F0");
  bumperR.rotation.x = Math.PI / 2;
  bumperR.position.set(gx, 0.11, -6.5);
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
  const endWall = makeEndWall(toonMat);
  group.add(endWall);
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
    bumperL, bumperR, pinDeck, pinDeckMat, pit, pins, plaqueAnchor,
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
    const ball = createBallMesh(p.ballColor || "#FF6B6B", p.ballPattern || "solid", p.ballWeight, p.ballPatternColor);
    setBallVisual(i, ball);
  }
  configureShadows(arr.length);
  if (hallGroup) { scene.remove(hallGroup); hallGroup = null; }
  hallGroup = buildHall(THREE, toonMat, arr.length);
  scene.add(hallGroup);
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

export function createBallMesh(color, pattern, weight, patternColor) {
  const api = buildBall3D(THREE, {
    radius: LANE.BALL_RADIUS,
    color: color,
    pattern: pattern,
    weight: weight,
    patternColor: patternColor,
    gradientMap: makeToonGradient(),
  });
  api.group.visible = false;
  return api.group;
}

export function showBallRack(laneIndex, balls, chosenIdx) {
  hideBallRack();
  if (!scene) return;
  const laneX = laneIndex * LANE.PITCH;
  rackGroup = new THREE.Group();
  const arr = Array.isArray(balls) && balls.length ? balls : [{}];
  const n = Math.max(1, Math.min(3, arr.length));
  const spacing = 0.34;
  // rack sits to the LEFT of the lane run, near the approach end, facing +z (toward the player)
  const rackX = laneX - 1.9;
  const shelfZ = 3.0, shelfY = 0.42;
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(n * spacing + 0.3, 0.08, 0.42), toonMat("#8A5A2B"));
  shelf.position.set(rackX, shelfY - 0.06, shelfZ);
  shelf.receiveShadow = true;
  rackGroup.add(shelf);
  for (let i = 0; i < n; i++) {
    const b = arr[i] || {};
    const api = buildBall3D(THREE, {
      radius: LANE.BALL_RADIUS,
      color: b.color || "#FF6B6B",
      pattern: b.pattern || "solid",
      weight: b.weight,
      patternColor: b.patternColor,
      gradientMap: makeToonGradient(),
    });
    const g = api.group;
    g.position.set(rackX + (i - (n - 1) / 2) * spacing, shelfY + LANE.BALL_RADIUS, shelfZ);
    g.scale.setScalar(i === (chosenIdx | 0) ? 1.25 : 1.0);
    g.visible = true;
    rackGroup.add(g);
  }
  scene.add(rackGroup);
}

export function highlightRackBall(chosenIdx) {
  if (!rackGroup) return;
  let bi = 0;
  for (const g of rackGroup.children) {
    if (g.type === "Group") {
      g.scale.setScalar(bi === (chosenIdx | 0) ? 1.25 : 1.0);
      bi++;
    }
  }
}

export function hideBallRack() {
  if (rackGroup && scene) scene.remove(rackGroup);
  rackGroup = null;
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
  const startZ = LANE.RELEASE_MIN + (LANE.RELEASE_BACK - LANE.RELEASE_MIN) * (1 - fwd);
  if (l.ball) {
    l.ball.position.set(startX, LANE.BALL_RADIUS, startZ);
    l.ball.visible = true;
  }
  const pos = aimLine.geometry.attributes.position;
  const posBg = aimLineBg.geometry.attributes.position;
  const len = 13;
  for (let i = 0; i < 24; i++) {
    const t = i / 23;
    const z = startZ - t * len;
    const x = startX + sp * 1.15 * t * t;
    pos.setXYZ(i, x, 0.034, z);
    posBg.setXYZ(i, x, 0.02, z);
  }
  pos.needsUpdate = true;
  posBg.needsUpdate = true;
  aimLine.computeLineDistances();
  aimLine.visible = true;
  aimLineBg.visible = true;
}

export function hideAimGhost() {
  if (aimLine) aimLine.visible = false;
  if (aimLineBg) aimLineBg.visible = false;
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
