// Gzowo Bowling — shared ball appearance: equirect texture painters, 2D disc painter, and 3D ball builder with real finger holes + weight number decal.

function shade(hex, amt) {
  const n = parseInt(String(hex).replace("#", ""), 16);
  if (!Number.isFinite(n)) return hex;
  const r = Math.min(255, Math.max(0, (n >> 16) + amt));
  const g = Math.min(255, Math.max(0, ((n >> 8) & 255) + amt));
  const b = Math.min(255, Math.max(0, (n & 255) + amt));
  return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
}

export function makeBallTexture(color, pattern, size) {
  const w = size || 1024;
  const h = Math.round(w / 2);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  const alt = shade(color, -70);
  const lite = shade(color, 80);
  if (pattern === "stripes") {
    ctx.fillStyle = alt;
    const bands = 5;
    const bh = h / (bands * 2 + 1);
    for (let i = 0; i < bands; i++) ctx.fillRect(0, bh * (i * 2 + 1), w, bh);
  } else if (pattern === "split") {
    ctx.fillStyle = alt;
    ctx.fillRect(0, h / 2, w, h / 2);
    ctx.fillStyle = lite;
    ctx.fillRect(0, h / 2 - h * 0.012, w, h * 0.024);
  } else if (pattern === "dots" || pattern === "stars") {
    ctx.fillStyle = pattern === "stars" ? lite : alt;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const rows = 4;
    for (let r = 0; r < rows; r++) {
      const v = 0.2 + (0.6 * (r + 0.5)) / rows;
      const y = v * h;
      const stretch = 1 / Math.max(0.35, Math.sin(Math.PI * v));
      const cols = 8;
      for (let i = 0; i < cols; i++) {
        const x = ((i + (r % 2) * 0.5) / cols) * w;
        if (pattern === "stars") {
          ctx.save();
          ctx.translate(x, y);
          ctx.scale(stretch, 1);
          ctx.font = `${Math.round(h * 0.09)}px sans-serif`;
          ctx.fillText("★", 0, 0);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.ellipse(x, y, h * 0.045 * stretch, h * 0.045, 0, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  } else if (pattern === "swirl") {
    ctx.strokeStyle = alt;
    ctx.lineWidth = h * 0.05;
    ctx.lineCap = "round";
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      for (let x = -w * 0.05; x <= w * 1.05; x += w / 96) {
        const v = 0.5 + 0.3 * Math.sin((x / w) * Math.PI * 2 + (k * Math.PI * 2) / 3);
        if (x <= 0) ctx.moveTo(x, v * h);
        else ctx.lineTo(x, v * h);
      }
      ctx.stroke();
    }
  }
  return c;
}

export function paintBallDisc(canvas, size, color, pattern, weight) {
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const r = size / 2;
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, size, size);
  const alt = shade(color, -70);
  const lite = shade(color, 80);
  if (pattern === "stripes") {
    ctx.fillStyle = alt;
    const bands = 4;
    const bh = size / (bands * 2 + 1);
    for (let i = 0; i < bands; i++) ctx.fillRect(0, bh * (i * 2 + 1), size, bh);
  } else if (pattern === "split") {
    ctx.fillStyle = alt;
    ctx.fillRect(0, r, size, r);
    ctx.fillStyle = lite;
    ctx.fillRect(0, r - size * 0.012, size, size * 0.024);
  } else if (pattern === "dots") {
    ctx.fillStyle = alt;
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      const rr = i % 2 ? r * 0.55 : r * 0.3;
      ctx.beginPath();
      ctx.arc(r + Math.cos(a) * rr, r + Math.sin(a) * rr, size * 0.06, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (pattern === "stars") {
    ctx.fillStyle = lite;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${Math.round(size * 0.16)}px sans-serif`;
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.4;
      const rr = i % 2 ? r * 0.55 : r * 0.28;
      ctx.fillText("★", r + Math.cos(a) * rr, r + Math.sin(a) * rr);
    }
  } else if (pattern === "swirl") {
    ctx.strokeStyle = alt;
    ctx.lineWidth = size * 0.07;
    ctx.lineCap = "round";
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.arc(r, r, r * (0.25 + k * 0.24), k * 2.1, k * 2.1 + Math.PI * 1.3);
      ctx.stroke();
    }
  }
  const grad = ctx.createRadialGradient(r * 0.7, r * 0.65, r * 0.1, r, r, r * 1.25);
  grad.addColorStop(0, "rgba(255,255,255,.30)");
  grad.addColorStop(0.55, "rgba(255,255,255,0)");
  grad.addColorStop(1, "rgba(0,0,0,.18)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = "rgba(30,26,50,.92)";
  const holes = [[r, r * 0.5, size * 0.052], [r * 0.82, r * 0.72, size * 0.042], [r * 1.18, r * 0.72, size * 0.042]];
  for (const [hx, hy, hr] of holes) {
    ctx.beginPath();
    ctx.arc(hx, hy, hr, 0, Math.PI * 2);
    ctx.fill();
  }
  if (weight) {
    ctx.fillStyle = "rgba(255,255,255,.95)";
    ctx.beginPath();
    ctx.arc(r, r * 1.32, size * 0.115, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2B2A4A";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${Math.round(size * 0.14)}px Fredoka, sans-serif`;
    ctx.fillText(String(weight), r, r * 1.33);
  }
  ctx.restore();
  return canvas;
}

function makeNumberTexture(weight) {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "rgba(255,255,255,.95)";
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(43,42,74,.25)";
  ctx.lineWidth = 6;
  ctx.stroke();
  ctx.fillStyle = "#2B2A4A";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "700 62px Fredoka, sans-serif";
  ctx.fillText(String(weight), 64, 68);
  return c;
}

export function buildBall3D(THREE, opts) {
  const radius = opts.radius || 1;
  const gradientMap = opts.gradientMap || null;
  const group = new THREE.Group();
  const mat = new THREE.MeshToonMaterial({ gradientMap, vertexColors: true });

  const base = new THREE.Vector3(0, 0.62, 0.79).normalize();
  const mkDir = (yaw, pitch) => {
    const d = base.clone();
    d.applyAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
    d.applyAxisAngle(new THREE.Vector3(0, 0, 1), yaw);
    return d.normalize();
  };
  const holeDirs = [mkDir(0, 0.24), mkDir(0.3, -0.08), mkDir(-0.3, -0.08)];
  const holeAngles = [0.17, 0.14, 0.14];

  const geo = new THREE.SphereGeometry(radius, 96, 64);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  const smooth = (e0, e1, x) => {
    const k = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
    return k * k * (3 - 2 * k);
  };
  for (let i = 0; i < pos.count; i++) {
    v.set(pos.getX(i), pos.getY(i), pos.getZ(i)).normalize();
    let scale = 1;
    let dark = 0;
    for (let h = 0; h < 3; h++) {
      const ang = v.angleTo(holeDirs[h]);
      const ha = holeAngles[h];
      if (ang < ha) {
        const rim = smooth(0.82, 1, ang / ha);
        scale = Math.min(scale, 1 - 0.15 * (1 - rim));
        dark = Math.max(dark, 1 - rim);
      }
    }
    pos.setXYZ(i, v.x * radius * scale, v.y * radius * scale, v.z * radius * scale);
    const c = 1 - dark * 0.82;
    colors[i * 3] = c;
    colors[i * 3 + 1] = c;
    colors[i * 3 + 2] = c;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const sphere = new THREE.Mesh(geo, mat);
  group.add(sphere);

  const numMat = new THREE.MeshBasicMaterial({ transparent: true });
  const numDisc = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.22, 24), numMat);
  const numDir = mkDir(0, 0.85).normalize();
  numDisc.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), numDir);
  numDisc.position.copy(numDir).multiplyScalar(radius * 1.002);
  group.add(numDisc);

  let texture = null;
  let numTexture = null;
  function setAppearance(color, pattern, weight) {
    try {
      const canvas = makeBallTexture(color, pattern);
      if (texture) texture.dispose();
      texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      mat.map = texture;
      mat.needsUpdate = true;
      if (numTexture) numTexture.dispose();
      numTexture = new THREE.CanvasTexture(makeNumberTexture(weight || 10));
      numTexture.colorSpace = THREE.SRGBColorSpace;
      numMat.map = numTexture;
      numMat.needsUpdate = true;
    } catch (e) {}
  }
  setAppearance(opts.color || "#FF6B6B", opts.pattern || "solid", opts.weight);

  function dispose() {
    try {
      if (texture) texture.dispose();
      if (numTexture) numTexture.dispose();
      sphere.geometry.dispose();
      mat.dispose();
      numMat.dispose();
    } catch (e) {}
  }

  return { group, sphere, setAppearance, dispose };
}
