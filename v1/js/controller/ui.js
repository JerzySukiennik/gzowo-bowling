// Gzowo Bowling — controller shared helpers: DOM builders, safe sfx/haptics, ball pattern painters, count-up, share card.
import { ASSETS, TIMING } from "../config.js";
import { t, getLang } from "../i18n.js";

const audioCache = new Map();

export function sfx(name) {
  try {
    const url = ASSETS.SFX[name] || ASSETS.SFX.ui;
    if (!url) return;
    let base = audioCache.get(url);
    if (!base) {
      base = new Audio(url);
      base.preload = "auto";
      audioCache.set(url, base);
    }
    const a = base.cloneNode();
    a.volume = 0.45;
    const p = a.play();
    if (p && typeof p.catch === "function") p.catch(() => {});
  } catch (e) {}
}

export function vib(pattern) {
  try {
    if (navigator.vibrate) navigator.vibrate(pattern);
  } catch (e) {}
}

export function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined && text !== null) n.textContent = String(text);
  return n;
}

export function clear(node) {
  while (node && node.firstChild) node.removeChild(node.firstChild);
}

export function popNode(node) {
  if (!node) return;
  node.classList.remove("pop");
  void node.offsetWidth;
  node.classList.add("pop");
}

export function shakeNode(node) {
  if (!node) return;
  node.classList.remove("shake");
  void node.offsetWidth;
  node.classList.add("shake");
}

export function tapFeedback(node) {
  popNode(node);
  sfx("ui");
  vib(10);
}

export function countUp(node, to, ms) {
  if (!node) return;
  const target = Math.round(Number(to) || 0);
  const from = Math.round(Number(node.dataset.v || 0));
  if (node._cuRaf) cancelAnimationFrame(node._cuRaf);
  if (from === target) {
    node.textContent = String(target);
    node.dataset.v = String(target);
    return;
  }
  node.dataset.v = String(target);
  const dur = ms || 600;
  const start = performance.now();
  const step = (now) => {
    const tt = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - tt, 3);
    node.textContent = String(Math.round(from + (target - from) * eased));
    if (tt < 1) {
      node._cuRaf = requestAnimationFrame(step);
    } else {
      node._cuRaf = null;
      node.classList.remove("count-up");
      void node.offsetWidth;
      node.classList.add("count-up");
    }
  };
  node._cuRaf = requestAnimationFrame(step);
}

export function luminance(hex) {
  try {
    const n = parseInt(String(hex || "#888888").replace("#", ""), 16);
    const r = (n >> 16) & 255;
    const g = (n >> 8) & 255;
    const b = n & 255;
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  } catch (e) {
    return 0.5;
  }
}

export function overlayColorFor(base) {
  return luminance(base) > 0.62 ? "rgba(43,42,74,.28)" : "rgba(255,255,255,.85)";
}

function drawStar(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

export function drawPattern(ctx, w, h, color, pattern) {
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, w, h);
  const oc = overlayColorFor(color);
  ctx.fillStyle = oc;
  ctx.strokeStyle = oc;
  const u = Math.min(w, h);
  if (pattern === "stripes") {
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.rotate(-Math.PI / 6);
    const sw = u * 0.12;
    for (let i = -3; i <= 3; i++) {
      if (Math.abs(i) % 2 === 1) ctx.fillRect(i * sw * 2.2 - sw / 2, -h, sw, h * 2);
    }
    ctx.restore();
  } else if (pattern === "dots") {
    const r = u * 0.065;
    const gap = u * 0.26;
    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 5; col++) {
        const x = w / 2 + (col - 2) * gap + (row % 2 === 0 ? 0 : gap / 2);
        const y = h / 2 + (row - 2) * gap;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  } else if (pattern === "swirl") {
    ctx.lineWidth = u * 0.055;
    ctx.lineCap = "round";
    for (let s = 0; s < 2; s++) {
      ctx.beginPath();
      const off = s * Math.PI;
      for (let a = 0; a < Math.PI * 3.4; a += 0.14) {
        const r = u * 0.03 + a * u * 0.052;
        const x = w / 2 + Math.cos(a + off) * r;
        const y = h / 2 + Math.sin(a + off) * r;
        if (a === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  } else if (pattern === "stars") {
    const spots = [[0.3, 0.28], [0.72, 0.36], [0.4, 0.68], [0.75, 0.75], [0.2, 0.55]];
    for (const [sx, sy] of spots) drawStar(ctx, w * sx, h * sy, u * 0.08);
  } else if (pattern === "split") {
    ctx.fillRect(w / 2, 0, w / 2, h);
    ctx.fillStyle = "rgba(43,42,74,.35)";
    ctx.fillRect(w / 2 - u * 0.008, 0, u * 0.016, h);
  }
}

export function paintBallDisc(canvas, size, color, pattern) {
  try {
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();
    drawPattern(ctx, size, size, color, pattern);
    const hg = ctx.createRadialGradient(size * 0.34, size * 0.28, 0, size * 0.34, size * 0.28, size * 0.4);
    hg.addColorStop(0, "rgba(255,255,255,.45)");
    hg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = hg;
    ctx.fillRect(0, 0, size, size);
    ctx.restore();
    ctx.strokeStyle = "rgba(0,0,0,.08)";
    ctx.lineWidth = Math.max(2, size * 0.02);
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.stroke();
  } catch (e) {}
}

const discCache = new Map();

export function ballDiscUrl(color, pattern, size) {
  const s = size || 96;
  const key = color + "|" + pattern + "|" + s;
  if (discCache.has(key)) return discCache.get(key);
  let url = "";
  try {
    const c = document.createElement("canvas");
    paintBallDisc(c, s * 2, color, pattern);
    url = c.toDataURL("image/png");
  } catch (e) {}
  discCache.set(key, url);
  return url;
}

export function ballDiscEl(color, pattern, sizeClass) {
  const d = el("div", "ball-disc " + (sizeClass || "ball-disc-48"));
  const url = ballDiscUrl(color, pattern, 96);
  if (url) {
    d.style.backgroundImage = "url(" + url + ")";
    d.style.backgroundSize = "cover";
  } else {
    d.style.background = color;
  }
  return d;
}

let cardPromise = null;
let cardKey = "";

export function getShareCard(result) {
  const key = JSON.stringify([result && result.date, result && result.winnerIds, getLang()]);
  if (cardPromise && cardKey === key) return cardPromise;
  cardKey = key;
  cardPromise = (async () => {
    try {
      const mod = await Promise.race([
        import("../display/sharecard.js"),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), 4000)),
      ]);
      const url = await Promise.race([
        mod.generateCard(result, getLang()),
        new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), TIMING.ASSET_TIMEOUT_MS)),
      ]);
      if (typeof url === "string" && url.indexOf("data:") === 0) return url;
      throw new Error("bad card");
    } catch (e) {
      return "";
    }
  })();
  return cardPromise;
}

function dataUrlToBlob(dataUrl) {
  const parts = dataUrl.split(",");
  const mime = (parts[0].match(/:(.*?);/) || [])[1] || "image/png";
  const bin = atob(parts[1]);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

export function downloadCard(dataUrl) {
  try {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = "gzowo-bowling.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (e) {}
}

export async function shareCard(dataUrl) {
  try {
    const blob = dataUrlToBlob(dataUrl);
    const file = new File([blob], "gzowo-bowling.png", { type: "image/png" });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: t("app.title") });
      return true;
    }
  } catch (e) {}
  downloadCard(dataUrl);
  return false;
}
