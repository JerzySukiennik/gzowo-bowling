// Gzowo Bowling — per-lane theme builders: backdrop gradient, lane colorway, accent light and simple cartoon props.
import * as THREE from "three";
import { THEME_CONFIG, LANE } from "../config.js";
import { getLaneParts } from "./scene.js";

const gradientCache = {};

function makeToonMat(color, opts) {
  return new THREE.MeshToonMaterial(Object.assign({ color }, opts || {}));
}

function backdropTexture(themeId, cfg) {
  if (gradientCache[themeId]) return gradientCache[themeId];
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 512;
  const ctx = c.getContext("2d");
  const g = ctx.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, cfg.sky);
  g.addColorStop(1, cfg.horizon);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 512);
  if (themeId === "space") {
    ctx.fillStyle = "rgba(255,255,255,.9)";
    for (let i = 0; i < 70; i++) {
      const r = Math.random() * 1.6 + 0.4;
      ctx.globalAlpha = 0.3 + Math.random() * 0.7;
      ctx.beginPath();
      ctx.arc(Math.random() * 256, Math.random() * 400, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (themeId === "neon") {
    ctx.strokeStyle = cfg.emissive || "#FF2E97";
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.55;
    for (let i = 0; i < 8; i++) {
      const y = 240 + i * i * 4.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(256, y);
      ctx.stroke();
    }
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath();
      ctx.moveTo(128 + (i - 4) * 18, 240);
      ctx.lineTo(128 + (i - 4) * 90, 512);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (themeId === "retro") {
    ctx.fillStyle = "#FFDD7A";
    ctx.beginPath();
    ctx.arc(128, 210, 70, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = cfg.horizon;
    for (let i = 0; i < 6; i++) ctx.fillRect(0, 190 + i * 14, 256, 5);
  } else if (themeId === "xmas") {
    ctx.fillStyle = "rgba(255,255,255,.85)";
    for (let i = 0; i < 60; i++) {
      ctx.globalAlpha = 0.35 + Math.random() * 0.6;
      ctx.beginPath();
      ctx.arc(Math.random() * 256, Math.random() * 460, Math.random() * 2.4 + 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else {
    ctx.fillStyle = "rgba(255,255,255,.75)";
    for (let i = 0; i < 5; i++) {
      const cx = 30 + Math.random() * 196;
      const cy = 60 + Math.random() * 160;
      for (let j = 0; j < 3; j++) {
        ctx.beginPath();
        ctx.arc(cx + j * 16 - 16, cy + (j % 2) * 6, 16 - j * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  gradientCache[themeId] = tex;
  return tex;
}

function clearHolder(holder) {
  while (holder.children.length) {
    const child = holder.children[0];
    holder.remove(child);
    try {
      if (child.geometry) child.geometry.dispose();
      if (child.material && !child.material.__shared) child.material.dispose();
    } catch (e) {}
  }
}

function stripedPost(accent) {
  const group = new THREE.Group();
  const mat1 = makeToonMat("#FFFFFF");
  const mat2 = makeToonMat(accent);
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.16, 10), i % 2 ? mat2 : mat1);
    seg.position.y = 0.08 + i * 0.16;
    group.add(seg);
  }
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), mat2);
  cap.position.y = 0.88;
  group.add(cap);
  return group;
}

function addProps(themeId, cfg, holder) {
  const sideX = LANE.WIDTH / 2 + LANE.GUTTER_WIDTH + 0.45;
  if (themeId === "space") {
    const planet = new THREE.Mesh(new THREE.SphereGeometry(0.5, 18, 14), makeToonMat("#FF9F1C"));
    planet.position.set(-sideX - 0.4, 2.6, -17.5);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.07, 8, 26), makeToonMat("#4CC9F0"));
    ring.position.copy(planet.position);
    ring.rotation.x = Math.PI / 2.6;
    const moon = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), makeToonMat("#E8E8F5"));
    moon.position.set(sideX + 0.3, 3.3, -16.5);
    holder.add(planet, ring, moon);
  } else if (themeId === "neon") {
    const glow = new THREE.MeshBasicMaterial({ color: cfg.emissive || "#FF2E97" });
    const glow2 = new THREE.MeshBasicMaterial({ color: cfg.accent });
    for (const s of [-1, 1]) {
      const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.4, 0.1), s < 0 ? glow : glow2);
      pillar.position.set(s * sideX, 1.2, -15.5);
      const pillar2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.6, 0.08), s < 0 ? glow2 : glow);
      pillar2.position.set(s * sideX, 0.8, -9);
      holder.add(pillar, pillar2);
    }
  } else if (themeId === "retro") {
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), new THREE.MeshStandardMaterial({ color: "#D9D9E8", metalness: 0.85, roughness: 0.25, flatShading: true }));
    ball.position.set(0, 3.1, -15.8);
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2, 6), makeToonMat("#7A4A21"));
    rod.position.set(0, 3.95, -15.8);
    const dot1 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.05, 16), makeToonMat("#E76F51"));
    dot1.rotation.x = Math.PI / 2;
    dot1.position.set(-sideX, 1.8, -16.8);
    const dot2 = dot1.clone();
    dot2.material = makeToonMat("#FFD23F");
    dot2.position.set(sideX, 2.3, -16.4);
    holder.add(ball, rod, dot1, dot2);
  } else if (themeId === "xmas") {
    const trunkMat = makeToonMat("#7A4A21");
    const leafMat = makeToonMat("#2E8F5B");
    for (const s of [-1, 1]) {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.3, 8), trunkMat);
      trunk.position.y = 0.15;
      tree.add(trunk);
      for (let i = 0; i < 3; i++) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.42 - i * 0.11, 0.45, 10), leafMat);
        cone.position.y = 0.45 + i * 0.3;
        tree.add(cone);
      }
      const star = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), makeToonMat("#FFD23F"));
      star.position.y = 1.5;
      tree.add(star);
      tree.position.set(s * sideX, 0, -15.8 + s * 0.7);
      holder.add(tree);
    }
  } else {
    const postL = stripedPost(cfg.accent);
    postL.position.set(-sideX, 0, -16.6);
    const postR = stripedPost(cfg.accent);
    postR.position.set(sideX, 0, -16.6);
    holder.add(postL, postR);
  }
  if (cfg.stars || cfg.snow) {
    const count = 90;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * LANE.PITCH * 0.95;
      positions[i * 3 + 1] = 0.6 + Math.random() * 5.4;
      positions[i * 3 + 2] = -3 - Math.random() * 16.5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: "#FFFFFF", size: cfg.snow ? 0.055 : 0.04, transparent: true, opacity: 0.85, sizeAttenuation: true }));
    holder.add(pts);
  }
}

export function applyTheme(laneIndex, themeId) {
  try {
    const parts = getLaneParts(laneIndex);
    if (!parts) return;
    const id = THEME_CONFIG[themeId] ? themeId : "classic";
    const cfg = THEME_CONFIG[id];
    parts.deckMat.color.set(cfg.lane);
    parts.gutterMat.color.set(cfg.gutter);
    parts.railMat.color.set(cfg.laneEdge);
    parts.pinDeckMat.color.set(cfg.laneEdge);
    parts.bumperMat.color.set(cfg.accent);
    if (cfg.emissive) {
      parts.railMat.emissive = new THREE.Color(cfg.emissive);
      parts.railMat.emissiveIntensity = 0.55;
    } else {
      parts.railMat.emissive = new THREE.Color("#000000");
      parts.railMat.emissiveIntensity = 0;
    }
    clearHolder(parts.backdropHolder);
    clearHolder(parts.propsHolder);
    clearHolder(parts.lightHolder);
    const backdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(LANE.PITCH - 0.05, 7.2),
      new THREE.MeshBasicMaterial({ map: backdropTexture(id, cfg) })
    );
    backdrop.position.set(0, 2.9, -19.42);
    parts.backdropHolder.add(backdrop);
    addProps(id, cfg, parts.propsHolder);
    const accent = new THREE.PointLight(cfg.accent, cfg.emissive ? 6 : 3, 9, 1.6);
    accent.position.set(0, 2.4, -14.5);
    parts.lightHolder.add(accent);
  } catch (e) {
    console.warn("applyTheme failed", e);
  }
}
