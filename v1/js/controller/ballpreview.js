// Gzowo Bowling — live rotatable 3D ball preview (three.js toon mini-scene with 2D canvas fallback).
import { TIMING, BALL_WEIGHTS } from "../config.js";
import { drawPattern, paintBallDisc } from "./ui.js";

function makeBallTextureCanvas(color, pattern) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext("2d");
  drawPattern(ctx, 512, 512, color, pattern);
  ctx.fillStyle = "rgba(30,26,50,.9)";
  const holes = [[256, 118, 20], [216, 168, 16], [296, 168, 16]];
  for (const [hx, hy, hr] of holes) {
    ctx.beginPath();
    ctx.arc(hx, hy, hr, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,.25)";
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  return c;
}

export function initBallPreview(canvasEl) {
  let disposed = false;
  let mode = "loading";
  let THREE = null;
  let renderer = null;
  let scene = null;
  let camera = null;
  let ball = null;
  let texture = null;
  let raf = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let velX = 0.008;
  let rotX = 0.25;
  let bounceStart = 0;
  let bounceAmp = 0;
  let fallbackAngle = 0;
  const state = { color: "#FF6B6B", pattern: "solid", weight: "medium" };

  function fallbackDraw() {
    try {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = canvasEl.clientWidth || 300;
      const h = canvasEl.clientHeight || 300;
      canvasEl.width = w * dpr;
      canvasEl.height = h * dpr;
      const ctx = canvasEl.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const size = Math.min(w, h) * 0.62;
      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate(fallbackAngle);
      const tmp = document.createElement("canvas");
      paintBallDisc(tmp, Math.round(size), state.color, state.pattern);
      ctx.drawImage(tmp, -size / 2, -size / 2, size, size);
      ctx.restore();
      ctx.fillStyle = "rgba(43,42,74,.10)";
      ctx.beginPath();
      ctx.ellipse(w / 2, h / 2 + size * 0.58, size * 0.42, size * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
    } catch (e) {}
  }

  function fallbackLoop() {
    if (disposed) return;
    if (!dragging) fallbackAngle += 0.006;
    fallbackDraw();
    raf = requestAnimationFrame(fallbackLoop);
  }

  function applyTexture() {
    if (mode === "3d" && ball && THREE) {
      const canvas = makeBallTextureCanvas(state.color, state.pattern);
      if (texture) texture.dispose();
      texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      ball.material.map = texture;
      ball.material.needsUpdate = true;
    }
  }

  function triggerBounce() {
    bounceStart = performance.now();
    const w = state.weight;
    bounceAmp = w === "heavy" ? -0.26 : w === "light" ? 0.24 : 0.1;
  }

  function threeLoop() {
    if (disposed || mode !== "3d") return;
    if (!dragging) {
      ball.rotation.y += velX;
      velX += (0.008 - velX) * 0.02;
    }
    let y = 0;
    if (bounceStart) {
      const tt = (performance.now() - bounceStart) / 1000;
      if (tt < 1.4) y = bounceAmp * Math.exp(-3.2 * tt) * Math.sin(9 * tt);
      else bounceStart = 0;
    }
    ball.position.y = y;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(threeLoop);
  }

  function resize3d() {
    if (mode !== "3d" || !renderer) return;
    const w = canvasEl.clientWidth || 300;
    const h = canvasEl.clientHeight || 300;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  async function boot() {
    try {
      const mod = await Promise.race([
        import("three"),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), TIMING.ASSET_TIMEOUT_MS)),
      ]);
      if (disposed) return;
      THREE = mod;
      renderer = new THREE.WebGLRenderer({ canvas: canvasEl, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(38, 1, 0.1, 20);
      camera.position.set(0, 0.35, 3.1);
      camera.lookAt(0, 0, 0);
      scene.add(new THREE.AmbientLight(0xfff1dc, 1.15));
      const key = new THREE.DirectionalLight(0xffffff, 1.6);
      key.position.set(2, 3, 2.5);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xbde3ff, 0.5);
      fill.position.set(-2.5, 1, 1.5);
      scene.add(fill);
      const gradData = new Uint8Array([90, 90, 90, 255, 160, 160, 160, 255, 220, 220, 220, 255, 255, 255, 255, 255]);
      const gradient = new THREE.DataTexture(gradData, 4, 1, THREE.RGBAFormat);
      gradient.minFilter = THREE.NearestFilter;
      gradient.magFilter = THREE.NearestFilter;
      gradient.needsUpdate = true;
      const mat = new THREE.MeshToonMaterial({ gradientMap: gradient });
      ball = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), mat);
      ball.rotation.x = rotX;
      scene.add(ball);
      const shadowCanvas = document.createElement("canvas");
      shadowCanvas.width = 128;
      shadowCanvas.height = 128;
      const sctx = shadowCanvas.getContext("2d");
      const sg = sctx.createRadialGradient(64, 64, 4, 64, 64, 60);
      sg.addColorStop(0, "rgba(43,42,74,.28)");
      sg.addColorStop(1, "rgba(43,42,74,0)");
      sctx.fillStyle = sg;
      sctx.fillRect(0, 0, 128, 128);
      const shadowTex = new THREE.CanvasTexture(shadowCanvas);
      const shadow = new THREE.Mesh(
        new THREE.PlaneGeometry(2.4, 2.4),
        new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
      );
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = -1.18;
      scene.add(shadow);
      mode = "3d";
      applyTexture();
      resize3d();
      window.addEventListener("resize", resize3d);
      raf = requestAnimationFrame(threeLoop);
    } catch (e) {
      if (disposed) return;
      mode = "2d";
      raf = requestAnimationFrame(fallbackLoop);
    }
  }

  function onDown(ev) {
    dragging = true;
    lastX = ev.clientX;
    lastY = ev.clientY;
    try { canvasEl.setPointerCapture(ev.pointerId); } catch (e) {}
  }

  function onMove(ev) {
    if (!dragging) return;
    const dx = ev.clientX - lastX;
    const dy = ev.clientY - lastY;
    lastX = ev.clientX;
    lastY = ev.clientY;
    if (mode === "3d" && ball) {
      ball.rotation.y += dx * 0.012;
      rotX = Math.max(-1.1, Math.min(1.1, rotX + dy * 0.008));
      ball.rotation.x = rotX;
      velX = dx * 0.012;
    } else {
      fallbackAngle += dx * 0.012;
    }
  }

  function onUp() {
    dragging = false;
  }

  canvasEl.addEventListener("pointerdown", onDown);
  canvasEl.addEventListener("pointermove", onMove);
  canvasEl.addEventListener("pointerup", onUp);
  canvasEl.addEventListener("pointercancel", onUp);
  boot();

  return {
    setBall(color, pattern, weight) {
      const weightChanged = weight && weight !== state.weight;
      if (color) state.color = color;
      if (pattern) state.pattern = pattern;
      if (weight) state.weight = weight;
      if (!BALL_WEIGHTS[state.weight]) state.weight = "medium";
      applyTexture();
      if (weightChanged) triggerBounce();
      if (mode === "2d") fallbackDraw();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      canvasEl.removeEventListener("pointerdown", onDown);
      canvasEl.removeEventListener("pointermove", onMove);
      canvasEl.removeEventListener("pointerup", onUp);
      canvasEl.removeEventListener("pointercancel", onUp);
      window.removeEventListener("resize", resize3d);
      try {
        if (texture) texture.dispose();
        if (ball) ball.geometry.dispose();
        if (renderer) renderer.dispose();
      } catch (e) {}
    },
  };
}
