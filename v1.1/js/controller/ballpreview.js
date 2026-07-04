// Gzowo Bowling — live rotatable 3D ball preview (three.js toon mini-scene with 2D canvas fallback).
import { TIMING, BALL_WEIGHT_RANGE } from "../config.js";
import { buildBall3D, paintBallDisc } from "../shared/ball3d.js";

export function initBallPreview(canvasEl) {
  let disposed = false;
  let mode = "loading";
  let THREE = null;
  let renderer = null;
  let scene = null;
  let camera = null;
  let ballApi = null;
  let raf = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let velX = 0.008;
  let rotX = 0.25;
  let bounceStart = 0;
  let bounceAmp = 0;
  let fallbackAngle = 0;
  const state = { color: "#FF6B6B", pattern: "solid", weight: BALL_WEIGHT_RANGE.DEFAULT };

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
      paintBallDisc(tmp, Math.round(size), state.color, state.pattern, state.weight);
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

  function applyAppearance() {
    if (mode === "3d" && ballApi) ballApi.setAppearance(state.color, state.pattern, state.weight);
  }

  function triggerBounce() {
    bounceStart = performance.now();
    const t = (state.weight - BALL_WEIGHT_RANGE.MIN) / (BALL_WEIGHT_RANGE.MAX - BALL_WEIGHT_RANGE.MIN);
    bounceAmp = 0.24 - t * 0.5;
  }

  function threeLoop() {
    if (disposed || mode !== "3d") return;
    if (!dragging) {
      ballApi.group.rotation.y += velX;
      velX += (0.008 - velX) * 0.02;
    }
    let y = 0;
    if (bounceStart) {
      const tt = (performance.now() - bounceStart) / 1000;
      if (tt < 1.4) y = bounceAmp * Math.exp(-3.2 * tt) * Math.sin(9 * tt);
      else bounceStart = 0;
    }
    ballApi.group.position.y = y;
    renderer.render(scene, camera);
    raf = requestAnimationFrame(threeLoop);
  }

  function resize3d() {
    if (mode !== "3d" || !renderer) return;
    const w = canvasEl.clientWidth || 300;
    const h = canvasEl.clientHeight || 300;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const vHalf = ((camera.fov / 2) * Math.PI) / 180;
    const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
    const dist = 1.32 / Math.sin(Math.min(vHalf, hHalf));
    camera.position.set(0, 0.3, dist);
    camera.lookAt(0, 0, 0);
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
      ballApi = buildBall3D(THREE, { radius: 1, color: state.color, pattern: state.pattern, weight: state.weight, gradientMap: gradient });
      ballApi.group.rotation.x = rotX;
      scene.add(ballApi.group);
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
      applyAppearance();
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
    if (mode === "3d" && ballApi) {
      ballApi.group.rotation.y += dx * 0.012;
      rotX = Math.max(-1.1, Math.min(1.1, rotX + dy * 0.008));
      ballApi.group.rotation.x = rotX;
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
      const w = Number(weight);
      const weightChanged = Number.isFinite(w) && w !== state.weight;
      if (color) state.color = color;
      if (pattern) state.pattern = pattern;
      if (Number.isFinite(w)) {
        state.weight = Math.min(BALL_WEIGHT_RANGE.MAX, Math.max(BALL_WEIGHT_RANGE.MIN, Math.round(w)));
      }
      applyAppearance();
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
        if (ballApi) ballApi.dispose();
        if (renderer) renderer.dispose();
      } catch (e) {}
    },
  };
}
