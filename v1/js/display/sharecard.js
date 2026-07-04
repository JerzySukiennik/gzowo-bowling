// Gzowo Bowling — pure canvas share card (1080x1350 PNG dataURL) plus flat ball-disc painters reused by TV UI.
import { t } from "../i18n.js";

const INK = "#2B2A4A";
const INK2 = "#6B6A85";
const BG = "#FFF6E9";
const GOLD = "#FFC24B";
const PLAYER_TINTS = ["#FF5C7A", "#FF9F1C", "#FFD23F", "#3DD68C", "#4CC9F0", "#9B5DE5"];

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function luminance(hex) {
  try {
    const n = parseInt(String(hex).replace("#", ""), 16);
    const r = ((n >> 16) & 255) / 255;
    const g = ((n >> 8) & 255) / 255;
    const b = (n & 255) / 255;
    return 0.299 * r + 0.587 * g + 0.114 * b;
  } catch (e) {
    return 0.5;
  }
}

function drawStar(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 ? r * 0.45 : r;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = cx + Math.cos(a) * rr;
    const py = cy + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

export function paintBall(ctx, cx, cy, r, color, pattern) {
  const c = color || "#FF6B6B";
  const overlay = luminance(c) > 0.62 ? "rgba(43,42,74,.28)" : "rgba(255,255,255,.85)";
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = c;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.fillStyle = overlay;
  if (pattern === "stripes") {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(-Math.PI / 6);
    const sw = r * 0.32;
    for (let i = -1; i <= 1; i++) ctx.fillRect(-r * 1.6, i * r * 0.75 - sw / 2, r * 3.2, sw);
    ctx.restore();
  } else if (pattern === "dots") {
    const dr = r * 0.16;
    const spots = [[0, 0], [0.55, 0.2], [-0.55, 0.2], [0.28, -0.5], [-0.28, -0.5], [0.28, 0.62], [-0.28, 0.62]];
    for (const [sx, sy] of spots) {
      ctx.beginPath();
      ctx.arc(cx + sx * r, cy + sy * r, dr, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (pattern === "swirl") {
    ctx.strokeStyle = overlay;
    ctx.lineWidth = Math.max(2, r * 0.16);
    ctx.lineCap = "round";
    for (let a = 0; a < 2; a++) {
      ctx.beginPath();
      for (let s = 0; s <= 1; s += 0.05) {
        const ang = a * Math.PI + s * Math.PI * 2.1;
        const rr = r * 0.12 + s * r * 0.75;
        const px = cx + Math.cos(ang) * rr;
        const py = cy + Math.sin(ang) * rr;
        if (s === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  } else if (pattern === "stars") {
    drawStar(ctx, cx - r * 0.35, cy - r * 0.35, r * 0.28);
    drawStar(ctx, cx + r * 0.4, cy - r * 0.05, r * 0.22);
    drawStar(ctx, cx - r * 0.15, cy + 0.45 * r, r * 0.25);
    drawStar(ctx, cx + r * 0.45, cy + 0.55 * r, r * 0.17);
  } else if (pattern === "split") {
    ctx.fillRect(cx, cy - r, r, r * 2);
    ctx.fillStyle = luminance(c) > 0.62 ? "rgba(43,42,74,.55)" : "rgba(255,255,255,.95)";
    ctx.fillRect(cx - Math.max(1, r * 0.05), cy - r, Math.max(2, r * 0.1), r * 2);
  }
  ctx.fillStyle = "rgba(255,255,255,.25)";
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.35, cy - r * 0.4, r * 0.34, r * 0.22, -0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = "rgba(0,0,0,.08)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, r - 1, 0, Math.PI * 2);
  ctx.stroke();
}

export function ballDiscDataUrl(color, pattern, size) {
  try {
    const s = size || 96;
    const c = document.createElement("canvas");
    c.width = s;
    c.height = s;
    const ctx = c.getContext("2d");
    paintBall(ctx, s / 2, s / 2, s / 2 - 1, color, pattern);
    return c.toDataURL("image/png");
  } catch (e) {
    return "";
  }
}

function fitText(ctx, text, maxWidth, baseSize, weight) {
  let size = baseSize;
  ctx.font = weight + " " + size + "px Fredoka, sans-serif";
  while (size > 24 && ctx.measureText(text).width > maxWidth) {
    size -= 4;
    ctx.font = weight + " " + size + "px Fredoka, sans-serif";
  }
  return size;
}

export async function generateCard(result, lang) {
  const r = result || {};
  const ranking = Array.isArray(r.ranking) ? r.ranking.slice(0, 6) : [];
  const winnerIds = Array.isArray(r.winnerIds) ? r.winnerIds : [];
  const winners = ranking.filter((row) => row && winnerIds.includes(row.playerId));
  const topRow = winners[0] || ranking[0] || { nick: "?", total: 0, playerColor: "#FF6B6B", ballColor: "#FF6B6B", ballPattern: "solid" };
  try {
    await Promise.race([
      document.fonts.ready,
      new Promise((res) => setTimeout(res, 1500)),
    ]);
  } catch (e) {}
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = 0.18;
  for (let i = 0; i < 40; i++) {
    const inTop = Math.random() < 0.75;
    const y = inTop ? Math.random() * 290 : 1250 + Math.random() * 90;
    ctx.fillStyle = PLAYER_TINTS[(Math.random() * PLAYER_TINTS.length) | 0];
    ctx.beginPath();
    ctx.arc(Math.random() * W, y, 4 + Math.random() * 8, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = "center";
  ctx.fillStyle = INK;
  ctx.font = "700 72px Fredoka, sans-serif";
  ctx.fillText("🎳 " + t("card.title").toUpperCase(), W / 2, 110);
  const locale = lang === "pl" ? "pl-PL" : "en-US";
  let dateStr = "";
  try {
    dateStr = new Date(r.date || Date.now()).toLocaleDateString(locale, { year: "numeric", month: "long", day: "numeric" });
  } catch (e) {
    dateStr = new Date(r.date || Date.now()).toDateString();
  }
  ctx.fillStyle = INK2;
  ctx.font = "500 34px Fredoka, sans-serif";
  ctx.fillText(t("card.date") + ": " + dateStr, W / 2, 168);
  ctx.fillStyle = "rgba(43,42,74,.08)";
  roundRect(ctx, 120, 198, 840, 3, 1.5);
  ctx.fill();

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,.10)";
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = "#FFFFFF";
  roundRect(ctx, 90, 240, 900, 340, 48);
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundRect(ctx, 90, 240, 900, 340, 48);
  ctx.clip();
  ctx.fillStyle = topRow.playerColor || "#FF6B6B";
  ctx.fillRect(90, 240, 900, 10);
  ctx.restore();
  ctx.font = "120px serif";
  ctx.fillText("🏆", 270, 400);
  paintBall(ctx, 270, 490, 60, topRow.ballColor, topRow.ballPattern);
  ctx.textAlign = "left";
  ctx.fillStyle = INK2;
  ctx.font = "500 30px Fredoka, sans-serif";
  ctx.fillText(t("card.winner").toUpperCase(), 430, 315);
  ctx.fillStyle = topRow.playerColor || "#FF6B6B";
  if (winners.length > 1) {
    let wy = 385;
    for (const wRow of winners.slice(0, 3)) {
      ctx.fillStyle = wRow.playerColor || "#FF6B6B";
      const sz = fitText(ctx, wRow.nick || "?", 500, 60, "700");
      ctx.font = "700 " + sz + "px Fredoka, sans-serif";
      ctx.fillText(String(wRow.nick || "?"), 430, wy);
      wy += 70;
    }
  } else {
    const size = fitText(ctx, topRow.nick || "?", 500, 88, "700");
    ctx.font = "700 " + size + "px Fredoka, sans-serif";
    ctx.fillText(String(topRow.nick || "?"), 430, 405);
  }
  ctx.fillStyle = INK;
  ctx.font = "700 96px Fredoka, sans-serif";
  const totalStr = String(topRow.total || 0);
  const totalW = ctx.measureText(totalStr).width;
  ctx.fillText(totalStr, 430, 522);
  ctx.fillStyle = INK2;
  ctx.font = "500 34px Fredoka, sans-serif";
  ctx.fillText(lang === "pl" ? "pkt" : "pts", 448 + totalW, 522);

  ctx.fillStyle = INK;
  ctx.font = "600 36px Fredoka, sans-serif";
  ctx.fillText(t("card.ranking"), 90, 662);
  let y = 690;
  for (let i = 0; i < ranking.length; i++) {
    const row = ranking[i] || {};
    const isFirst = i === 0;
    ctx.save();
    ctx.fillStyle = "#FFFFFF";
    roundRect(ctx, 90, y, 900, 84, 24);
    ctx.fill();
    if (isFirst) {
      ctx.save();
      roundRect(ctx, 90, y, 900, 84, 24);
      ctx.clip();
      ctx.globalAlpha = 0.14;
      ctx.fillStyle = row.playerColor || GOLD;
      ctx.fillRect(90, y, 900, 84);
      ctx.restore();
    }
    ctx.strokeStyle = "rgba(43,42,74,.08)";
    ctx.lineWidth = 1.5;
    roundRect(ctx, 90, y, 900, 84, 24);
    ctx.stroke();
    ctx.textAlign = "left";
    ctx.fillStyle = i === 0 ? GOLD : i === 1 ? "#C7C9D3" : i === 2 ? "#D9985F" : INK2;
    ctx.font = "700 44px Fredoka, sans-serif";
    ctx.fillText((i + 1) + ".", 118, y + 58);
    paintBall(ctx, 235, y + 42, 28, row.ballColor, row.ballPattern);
    if (isFirst) {
      ctx.font = "32px serif";
      ctx.fillText("👑", 195, y + 22);
    }
    ctx.fillStyle = row.playerColor || INK2;
    roundRect(ctx, 285, y + 24, 12, 36, 6);
    ctx.fill();
    ctx.fillStyle = INK;
    let nick = String(row.nick || "?");
    ctx.font = "600 40px Fredoka, sans-serif";
    while (nick.length > 1 && ctx.measureText(nick + "…").width > 330) nick = nick.slice(0, -1);
    ctx.fillText(nick === String(row.nick || "?") ? nick : nick + "…", 320, y + 56);
    ctx.textAlign = "right";
    ctx.font = "700 48px Fredoka, sans-serif";
    ctx.fillText(String(row.total || 0), 962, y + 58);
    ctx.restore();
    y += 96;
  }

  ctx.fillStyle = "rgba(43,42,74,.08)";
  roundRect(ctx, 120, 1240, 840, 3, 1.5);
  ctx.fill();
  ctx.textAlign = "center";
  ctx.fillStyle = INK2;
  ctx.font = "500 28px Fredoka, sans-serif";
  ctx.fillText("🎳  " + t("card.title") + "  🎳", W / 2, 1300);
  return canvas.toDataURL("image/png");
}

const QUALITY_STEPS = [0.85, 0.6, 0.4, 0.25];
const SCALE_STEPS = [1, 0.75, 0.5];

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image load failed"));
    img.src = src;
  });
}

function drawToCanvas(img, scale) {
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  return c;
}

export async function compressCard(pngDataUrl, maxChars) {
  try {
    const limit = maxChars || 750000;
    if (!pngDataUrl || pngDataUrl.length <= limit) return pngDataUrl;
    let img;
    try {
      img = await loadImage(pngDataUrl);
    } catch (e) {
      return pngDataUrl;
    }
    let best = pngDataUrl;
    for (const scale of SCALE_STEPS) {
      let canvas;
      try {
        canvas = drawToCanvas(img, scale);
      } catch (e) {
        continue;
      }
      for (const q of QUALITY_STEPS) {
        try {
          const url = canvas.toDataURL("image/jpeg", q);
          best = url;
          if (url.length <= limit) return url;
        } catch (e) {}
      }
    }
    return best;
  } catch (e) {
    return pngDataUrl;
  }
}
