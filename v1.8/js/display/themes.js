// Gzowo Bowling — per-lane theme builders: premium backdrops, colorways, accent light and polished cartoon props.
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
  try {
    if (themeId === "space") {
      const W = 256, H = 512;
      const deep = ctx.createLinearGradient(0, 0, 0, H);
      deep.addColorStop(0, "rgba(3,4,20,0.55)");
      deep.addColorStop(0.55, "rgba(6,8,34,0.0)");
      deep.addColorStop(1, "rgba(20,14,52,0.35)");
      ctx.fillStyle = deep;
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      const nebulas = [
        { x: 70, y: 150, r: 130, c: "rgba(122, 70, 220, 0.30)" },
        { x: 200, y: 110, r: 150, c: "rgba(40, 150, 220, 0.24)" },
        { x: 150, y: 260, r: 120, c: "rgba(200, 60, 180, 0.18)" },
        { x: 40, y: 300, r: 100, c: "rgba(70, 200, 230, 0.16)" },
      ];
      for (const n of nebulas) {
        const rg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
        rg.addColorStop(0, n.c);
        rg.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = rg;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
      ctx.translate(128, 200);
      ctx.rotate(-0.5);
      const band = ctx.createLinearGradient(0, -60, 0, 60);
      band.addColorStop(0, "rgba(0,0,0,0)");
      band.addColorStop(0.5, "rgba(150,160,255,0.10)");
      band.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = band;
      ctx.fillRect(-220, -60, 440, 120);
      ctx.restore();
      const starTint = ["255,255,255", "210,225,255", "255,240,220", "200,255,250"];
      for (let i = 0; i < 120; i++) {
        const x = Math.random() * W;
        const y = Math.random() * 360;
        const size = Math.pow(Math.random(), 2.4) * 2.6 + 0.35;
        const a = 0.35 + Math.random() * 0.65;
        const tint = starTint[(Math.random() * starTint.length) | 0];
        ctx.fillStyle = "rgba(" + tint + "," + a.toFixed(2) + ")";
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
        if (size > 1.9) {
          const gg = ctx.createRadialGradient(x, y, 0, x, y, size * 4);
          gg.addColorStop(0, "rgba(" + tint + ",0.5)");
          gg.addColorStop(1, "rgba(" + tint + ",0)");
          ctx.fillStyle = gg;
          ctx.beginPath();
          ctx.arc(x, y, size * 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = "rgba(" + tint + ",0.45)";
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.moveTo(x - size * 3.5, y); ctx.lineTo(x + size * 3.5, y);
          ctx.moveTo(x, y - size * 3.5); ctx.lineTo(x, y + size * 3.5);
          ctx.stroke();
        }
      }
      (function distantPlanet() {
        const px = 196, py = 92, pr = 26;
        ctx.save();
        ctx.translate(px, py); ctx.scale(1, 0.32); ctx.rotate(-0.25);
        ctx.strokeStyle = "rgba(120,200,255,0.35)"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, pr * 1.7, Math.PI, Math.PI * 2); ctx.stroke();
        ctx.restore();
        const pg = ctx.createRadialGradient(px - pr * 0.4, py - pr * 0.4, pr * 0.2, px, py, pr);
        pg.addColorStop(0, "#8FA6FF"); pg.addColorStop(0.6, "#4A54C8"); pg.addColorStop(1, "#1E2166");
        ctx.fillStyle = pg;
        ctx.beginPath(); ctx.arc(px, py, pr, 0, Math.PI * 2); ctx.fill();
        ctx.save();
        ctx.translate(px, py); ctx.scale(1, 0.32); ctx.rotate(-0.25);
        ctx.strokeStyle = "rgba(150,220,255,0.55)"; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(0, 0, pr * 1.7, 0, Math.PI); ctx.stroke();
        ctx.restore();
      })();
      (function shootingStar() {
        const sx = 30, sy = 60, len = 60, ang = 0.5;
        const ex = sx + Math.cos(ang) * len, ey = sy + Math.sin(ang) * len;
        const tg = ctx.createLinearGradient(sx, sy, ex, ey);
        tg.addColorStop(0, "rgba(255,255,255,0)"); tg.addColorStop(1, "rgba(200,235,255,0.9)");
        ctx.strokeStyle = tg; ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
        const hg = ctx.createRadialGradient(ex, ey, 0, ex, ey, 5);
        hg.addColorStop(0, "rgba(255,255,255,0.95)"); hg.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = hg;
        ctx.beginPath(); ctx.arc(ex, ey, 5, 0, Math.PI * 2); ctx.fill();
      })();
      const floor = ctx.createLinearGradient(0, 360, 0, H);
      floor.addColorStop(0, "rgba(0,0,0,0)");
      floor.addColorStop(0.7, "rgba(80,60,180,0.20)");
      floor.addColorStop(1, "rgba(120,90,230,0.30)");
      ctx.fillStyle = floor;
      ctx.fillRect(0, 360, W, H - 360);
    } else if (themeId === "neon") {
      const W = 256, H = 512, sunCx = 128, sunCy = 214, sunR = 74;
      const horizonY = sunCy + sunR - 8;
      const sg = ctx.createLinearGradient(0, 0, 0, horizonY);
      sg.addColorStop(0, "#05010F"); sg.addColorStop(0.55, "#2A0A55"); sg.addColorStop(1, "#7A1E8F");
      ctx.fillStyle = sg; ctx.globalAlpha = 0.85; ctx.fillRect(0, 0, W, horizonY); ctx.globalAlpha = 1;
      ctx.fillStyle = "rgba(255,255,255,0.9)";
      for (let i = 0; i < 40; i++) {
        const x = Math.random() * W, y = Math.random() * (sunCy - 40);
        ctx.globalAlpha = 0.25 + Math.random() * 0.6;
        ctx.beginPath(); ctx.arc(x, y, Math.random() * 1.1 + 0.3, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.beginPath(); ctx.arc(sunCx, sunCy, sunR, 0, Math.PI * 2); ctx.clip();
      const sun = ctx.createLinearGradient(0, sunCy - sunR, 0, sunCy + sunR);
      sun.addColorStop(0, "#FF57C8"); sun.addColorStop(0.45, "#FF4D8D"); sun.addColorStop(0.72, "#FFB25E"); sun.addColorStop(1, "#FFE9A8");
      ctx.fillStyle = sun; ctx.fillRect(sunCx - sunR, sunCy - sunR, sunR * 2, sunR * 2);
      ctx.fillStyle = "#05010F";
      for (let i = 0; i < 9; i++) {
        const y = sunCy - 6 + i * 6.5, h = 1.6 + i * 0.7;
        ctx.globalAlpha = 0.9; ctx.fillRect(sunCx - sunR, y, sunR * 2, h);
      }
      ctx.globalAlpha = 1; ctx.restore();
      ctx.strokeStyle = "#FF9BE0"; ctx.globalAlpha = 0.6; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(sunCx, sunCy, sunR + 1.2, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
      const hb = ctx.createLinearGradient(0, horizonY - 26, 0, horizonY + 14);
      hb.addColorStop(0, "rgba(255,46,151,0)"); hb.addColorStop(0.7, "rgba(255,46,151,0.55)"); hb.addColorStop(1, "rgba(0,245,212,0.5)");
      ctx.fillStyle = hb; ctx.fillRect(0, horizonY - 26, W, 40);
      ctx.fillStyle = "#00F5D4"; ctx.globalAlpha = 0.85; ctx.fillRect(0, horizonY, W, 2); ctx.globalAlpha = 1;
      const vpX = 128;
      for (let i = 0; i < 12; i++) {
        const t = i / 11, y = horizonY + Math.pow(t, 1.9) * (H - horizonY);
        ctx.strokeStyle = i % 2 ? "#00F5D4" : "#FF2E97";
        ctx.globalAlpha = 0.35 + t * 0.5; ctx.lineWidth = 1 + t * 1.6;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      for (let i = -7; i <= 7; i++) {
        ctx.strokeStyle = "#C61FE0"; ctx.globalAlpha = 0.4; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(vpX + i * 8, horizonY); ctx.lineTo(vpX + i * 78, H); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (themeId === "retro") {
      const CX = 128, HORIZON = 300;
      const wash = ctx.createLinearGradient(0, 120, 0, HORIZON);
      wash.addColorStop(0, "rgba(255,208,120,0.0)"); wash.addColorStop(1, "rgba(200,74,30,0.45)");
      ctx.fillStyle = wash; ctx.fillRect(0, 120, 256, HORIZON - 120);
      ctx.save(); ctx.globalAlpha = 0.16;
      const wpTones = ["#E88A3C", "#D9662C", "#F2B24A"];
      for (let row = 0; row < 4; row++) {
        const ry = 40 + row * 46, off = (row % 2) * 26;
        ctx.strokeStyle = wpTones[row % wpTones.length]; ctx.lineWidth = 5;
        for (let cxk = -1; cxk < 6; cxk++) {
          const px = off + cxk * 52;
          ctx.beginPath(); ctx.arc(px, ry, 26, Math.PI, 0); ctx.stroke();
        }
      }
      ctx.restore();
      const sunY = 232, sunR = 150;
      ctx.save(); ctx.translate(CX, sunY);
      const rays = 20;
      for (let i = 0; i < rays; i++) {
        const a0 = (i / rays) * Math.PI * 2, a1 = ((i + 0.5) / rays) * Math.PI * 2;
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(a0) * sunR, Math.sin(a0) * sunR);
        ctx.lineTo(Math.cos(a1) * sunR, Math.sin(a1) * sunR);
        ctx.closePath();
        ctx.fillStyle = i % 2 ? "rgba(255,220,140,0.55)" : "rgba(255,180,80,0.30)";
        ctx.fill();
      }
      ctx.restore();
      const halo = ctx.createRadialGradient(CX, sunY, 10, CX, sunY, 96);
      halo.addColorStop(0, "rgba(255,236,170,0.95)"); halo.addColorStop(0.55, "rgba(255,196,96,0.55)"); halo.addColorStop(1, "rgba(255,196,96,0.0)");
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(CX, sunY, 96, 0, Math.PI * 2); ctx.fill();
      const disc = ctx.createRadialGradient(CX - 18, sunY - 20, 8, CX, sunY, 62);
      disc.addColorStop(0, "#FFF3C8"); disc.addColorStop(0.5, "#FFD672"); disc.addColorStop(1, "#F4A63C");
      ctx.fillStyle = disc; ctx.beginPath(); ctx.arc(CX, sunY, 60, 0, Math.PI * 2); ctx.fill();
      ctx.save(); ctx.globalAlpha = 0.35; ctx.strokeStyle = "#E8862E";
      for (let r = 46; r > 12; r -= 12) {
        ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(CX, sunY, r, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.restore();
      ctx.fillStyle = "#7A3A18"; ctx.fillRect(0, HORIZON - 8, 256, 8);
      ctx.fillStyle = "rgba(255,220,150,0.5)"; ctx.fillRect(0, HORIZON - 10, 256, 2);
      const carpTop = HORIZON;
      const carp = ctx.createLinearGradient(0, carpTop, 0, 512);
      carp.addColorStop(0, "#8F3A18"); carp.addColorStop(1, "#5E2410");
      ctx.fillStyle = carp; ctx.fillRect(0, carpTop, 256, 512 - carpTop);
      ctx.save(); ctx.globalAlpha = 0.22;
      const dcol = ["#F2B24A", "#E8642B"], ds = 24;
      for (let yy = carpTop; yy < 512; yy += ds) {
        for (let xx = -ds; xx < 256 + ds; xx += ds) {
          const ox = ((Math.floor((yy - carpTop) / ds)) % 2) * (ds / 2);
          ctx.fillStyle = dcol[(Math.floor(xx / ds) + Math.floor(yy / ds)) % 2];
          ctx.beginPath();
          ctx.moveTo(xx + ox, yy + ds / 2); ctx.lineTo(xx + ox + ds / 2, yy);
          ctx.lineTo(xx + ox + ds, yy + ds / 2); ctx.lineTo(xx + ox + ds / 2, yy + ds);
          ctx.closePath(); ctx.fill();
        }
      }
      ctx.restore();
      ctx.fillStyle = "rgba(255,248,220,0.9)";
      for (let i = 0; i < 5; i++) {
        const sx = 24 + Math.random() * 208, sy = 30 + Math.random() * 150, s = 1.5 + Math.random() * 2;
        ctx.beginPath();
        ctx.moveTo(sx, sy - s * 2); ctx.lineTo(sx + s, sy); ctx.lineTo(sx, sy + s * 2); ctx.lineTo(sx - s, sy);
        ctx.closePath(); ctx.fill();
      }
    } else if (themeId === "xmas") {
      const W = 256, H = 512;
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0.00, "#04122B"); sky.addColorStop(0.30, "#081B3A"); sky.addColorStop(0.52, "#123A50");
      sky.addColorStop(0.68, "#1C4A5E"); sky.addColorStop(0.82, "#2E5E63"); sky.addColorStop(1.00, "#E9F3FB");
      ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const auroras = [
        { y: 150, hue: "#37E0A0", amp: 26, a: 0.16 },
        { y: 118, hue: "#59C6FF", amp: 34, a: 0.12 },
        { y: 182, hue: "#B98CFF", amp: 22, a: 0.11 },
      ];
      for (const rib of auroras) {
        for (let pass = 0; pass < 3; pass++) {
          ctx.beginPath(); ctx.moveTo(0, rib.y);
          for (let x = 0; x <= W; x += 8) {
            const yy = rib.y + Math.sin(x * 0.018 + pass * 1.7) * rib.amp + Math.sin(x * 0.045 + pass) * (rib.amp * 0.4);
            ctx.lineTo(x, yy);
          }
          const grd = ctx.createLinearGradient(0, rib.y - 60, 0, rib.y + 70);
          grd.addColorStop(0, "rgba(0,0,0,0)"); grd.addColorStop(0.5, rib.hue); grd.addColorStop(1, "rgba(0,0,0,0)");
          ctx.strokeStyle = grd; ctx.globalAlpha = rib.a; ctx.lineWidth = 34 - pass * 8; ctx.stroke();
        }
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; ctx.restore();
      const moonX = 196, moonY = 96, moonR = 26;
      const mhalo = ctx.createRadialGradient(moonX, moonY, 4, moonX, moonY, 70);
      mhalo.addColorStop(0, "rgba(255,248,224,0.55)"); mhalo.addColorStop(0.35, "rgba(255,244,206,0.18)"); mhalo.addColorStop(1, "rgba(255,244,206,0)");
      ctx.fillStyle = mhalo; ctx.fillRect(moonX - 70, moonY - 70, 140, 140);
      ctx.fillStyle = "#FFF6DC"; ctx.beginPath(); ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "rgba(210,224,240,0.35)";
      ctx.beginPath(); ctx.arc(moonX + 8, moonY - 6, 5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(moonX - 6, moonY + 7, 3.5, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 120; i++) {
        const x = Math.random() * W, y = Math.random() * 240, r = Math.random() * 1.4 + 0.3;
        ctx.globalAlpha = 0.25 + Math.random() * 0.7;
        ctx.fillStyle = Math.random() < 0.15 ? "#CFEBFF" : "#FFFFFF";
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        if (Math.random() < 0.06) {
          ctx.globalAlpha = 0.6; ctx.strokeStyle = "#FFFFFF"; ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(x - r * 3, y); ctx.lineTo(x + r * 3, y);
          ctx.moveTo(x, y - r * 3); ctx.lineTo(x, y + r * 3);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;
      const pineRidge = (baseY, scale, fill, cap) => {
        const step = 26 * scale;
        for (let x = -10; x < W + 20; x += step) {
          const h = (30 + Math.random() * 22) * scale, w = h * 0.62, cx = x + (Math.random() - 0.5) * 8;
          ctx.fillStyle = fill;
          for (let t = 0; t < 3; t++) {
            const ty = baseY - t * h * 0.34, tw = w * (1 - t * 0.22);
            ctx.beginPath(); ctx.moveTo(cx, ty - h * 0.5); ctx.lineTo(cx + tw, ty); ctx.lineTo(cx - tw, ty); ctx.closePath(); ctx.fill();
          }
          ctx.fillStyle = cap;
          for (let t = 0; t < 3; t++) {
            const ty = baseY - t * h * 0.34, tw = w * (1 - t * 0.22);
            ctx.beginPath(); ctx.moveTo(cx, ty - h * 0.5); ctx.lineTo(cx + tw * 0.5, ty - h * 0.16);
            ctx.quadraticCurveTo(cx, ty - h * 0.05, cx - tw * 0.5, ty - h * 0.16); ctx.closePath(); ctx.fill();
          }
        }
      };
      pineRidge(360, 0.85, "#17303A", "rgba(226,240,250,0.55)");
      pineRidge(392, 1.05, "#0E252E", "rgba(230,243,252,0.75)");
      const gnd = ctx.createLinearGradient(0, 400, 0, H);
      gnd.addColorStop(0, "rgba(233,243,251,0)"); gnd.addColorStop(1, "rgba(233,243,251,0.9)");
      ctx.fillStyle = gnd; ctx.fillRect(0, 400, W, H - 400);
      ctx.save(); ctx.globalCompositeOperation = "lighter";
      const palette = ["#FFCE4A", "#FF6B6B", "#37E0A0", "#59C6FF", "#FFF2CE"];
      for (let i = 0; i <= 14; i++) {
        const x = (i / 14) * W, y = 214 + Math.sin(i * 0.9) * 10, col = palette[i % palette.length];
        const g2 = ctx.createRadialGradient(x, y, 0, x, y, 9);
        g2.addColorStop(0, col); g2.addColorStop(0.4, col); g2.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = 0.85; ctx.fillStyle = g2;
        ctx.beginPath(); ctx.arc(x, y, 9, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore(); ctx.globalAlpha = 1;
      for (let i = 0; i < 70; i++) {
        const r = Math.random() * 2.2 + 0.6;
        ctx.globalAlpha = 0.35 + Math.random() * 0.55; ctx.fillStyle = "#FFFFFF";
        ctx.beginPath(); ctx.arc(Math.random() * W, Math.random() * 470, r, 0, Math.PI * 2); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else {
      const rr = (x, y, w, h, r) => {
        const k = Array.isArray(r) ? r : [r, r, r, r];
        ctx.beginPath();
        ctx.moveTo(x + k[0], y);
        ctx.arcTo(x + w, y, x + w, y + k[1], k[1]);
        ctx.arcTo(x + w, y + h, x + w - k[2], y + h, k[2]);
        ctx.arcTo(x, y + h, x, y + h - k[3], k[3]);
        ctx.arcTo(x, y, x + k[0], y, k[0]);
        ctx.closePath();
      };
      const glow = ctx.createRadialGradient(128, 150, 20, 128, 150, 265);
      glow.addColorStop(0, "rgba(255,245,218,0.95)"); glow.addColorStop(0.5, "rgba(255,233,192,0.32)"); glow.addColorStop(1, "rgba(255,233,192,0)");
      ctx.fillStyle = glow; ctx.fillRect(0, 0, 256, 340);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      const puff = (cx, cy, s) => {
        for (let j = 0; j < 4; j++) {
          ctx.beginPath();
          ctx.arc(cx + j * 15 * s - 22 * s, cy + (j % 2) * 6 * s, (17 - j * 2.5) * s, 0, Math.PI * 2);
          ctx.fill();
        }
      };
      puff(58, 82, 1.0); puff(198, 56, 0.8); puff(150, 112, 0.62);
      ctx.save(); ctx.globalAlpha = 0.13; ctx.fillStyle = "#FFF7DE";
      ctx.beginPath(); ctx.moveTo(150, 0); ctx.lineTo(212, 0); ctx.lineTo(122, 300); ctx.lineTo(86, 300); ctx.closePath(); ctx.fill();
      ctx.restore();
      const wallTop = 330;
      const wg = ctx.createLinearGradient(0, wallTop, 0, 512);
      wg.addColorStop(0, "#EABB80"); wg.addColorStop(1, "#C58A4D");
      ctx.fillStyle = wg; ctx.fillRect(0, wallTop, 256, 512 - wallTop);
      ctx.strokeStyle = "rgba(120,74,33,0.32)"; ctx.lineWidth = 2;
      for (let x = 24; x < 256; x += 42) {
        ctx.beginPath(); ctx.moveTo(x, wallTop + 8); ctx.lineTo(x, 512); ctx.stroke();
      }
      ctx.fillStyle = "rgba(255,246,224,0.55)"; ctx.fillRect(0, wallTop, 256, 5);
      const winY = 156, winH = 132, winW = 44, gap = 22;
      const totalW = winW * 3 + gap * 2, wx = (256 - totalW) / 2;
      for (let i = 0; i < 3; i++) {
        const x = wx + i * (winW + gap);
        const lg = ctx.createLinearGradient(0, winY, 0, winY + winH);
        lg.addColorStop(0, "#DDF1FF"); lg.addColorStop(0.55, "#FFF6E4"); lg.addColorStop(1, "#FFE4B8");
        ctx.fillStyle = lg; rr(x, winY, winW, winH, [winW / 2, winW / 2, 6, 6]); ctx.fill();
        ctx.strokeStyle = "#FBF3E4"; ctx.lineWidth = 5; rr(x, winY, winW, winH, [winW / 2, winW / 2, 6, 6]); ctx.stroke();
        ctx.strokeStyle = "rgba(251,243,228,0.9)"; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(x + winW / 2, winY + 6); ctx.lineTo(x + winW / 2, winY + winH - 4); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + 3, winY + winH * 0.55); ctx.lineTo(x + winW - 3, winY + winH * 0.55); ctx.stroke();
      }
      const by = 126;
      ctx.strokeStyle = "rgba(120,74,33,0.5)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(0, by - 6); ctx.quadraticCurveTo(128, by + 18, 256, by - 6); ctx.stroke();
      const flagCols = ["#FF7A6B", "#FFD26B", "#7FD1C4", "#F6F1E7"];
      const n = 9;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1), fx = t * 256, fy = by - 6 + Math.sin(t * Math.PI) * 24;
        ctx.fillStyle = flagCols[i % flagCols.length];
        ctx.beginPath(); ctx.moveTo(fx - 9, fy); ctx.lineTo(fx + 9, fy); ctx.lineTo(fx, fy + 20); ctx.closePath(); ctx.fill();
      }
      const vg = ctx.createLinearGradient(0, 0, 0, 512);
      vg.addColorStop(0, "rgba(0,0,0,0.06)"); vg.addColorStop(0.25, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(60,30,0,0.10)");
      ctx.fillStyle = vg; ctx.fillRect(0, 0, 256, 512);
    }
  } catch (e) { console.warn("backdrop draw failed", themeId, e); }
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

function addProps(themeId, cfg, holder) {
  const sideX = LANE.WIDTH / 2 + LANE.GUTTER_WIDTH + 0.45;
  try {
    if (themeId === "space") {
      const planet = new THREE.Mesh(
        new THREE.SphereGeometry(0.62, 24, 18),
        new THREE.MeshStandardMaterial({ color: "#7A5CE0", roughness: 0.55, metalness: 0.15, emissive: new THREE.Color(cfg.emissive || "#42D6FF"), emissiveIntensity: 0.12, flatShading: false })
      );
      planet.position.set(-sideX - 0.55, 2.8, -18.2);
      holder.add(planet);
      const ringMatA = makeToonMat(cfg.accent);
      const ringMatB = makeToonMat(cfg.emissive || "#42D6FF");
      const ringA = new THREE.Mesh(new THREE.TorusGeometry(0.98, 0.045, 8, 40), ringMatA);
      const ringB = new THREE.Mesh(new THREE.TorusGeometry(1.14, 0.03, 8, 40), ringMatB);
      ringA.position.copy(planet.position); ringB.position.copy(planet.position);
      ringA.rotation.set(Math.PI / 2.4, 0, 0.35); ringB.rotation.set(Math.PI / 2.4, 0, 0.35);
      holder.add(ringA, ringB);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(0.72, 16, 12), new THREE.MeshBasicMaterial({ color: cfg.emissive || "#42D6FF", transparent: true, opacity: 0.10, depthWrite: false }));
      halo.position.copy(planet.position); holder.add(halo);
      const moon = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), makeToonMat("#DDE2FF"));
      moon.position.set(sideX + 0.35, 3.4, -16.8); holder.add(moon);
      for (const cr of [[-0.09, 0.06, 0.11], [0.08, -0.05, 0.09]]) {
        const crater = new THREE.Mesh(new THREE.CircleGeometry(cr[2] * 0.5, 10), makeToonMat("#AEB4E0"));
        crater.position.set(moon.position.x + cr[0], moon.position.y + cr[1], moon.position.z + 0.29);
        holder.add(crater);
      }
      const moon2 = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), makeToonMat("#9FB0FF"));
      moon2.position.set(sideX + 0.5, 1.9, -15.6); holder.add(moon2);
      const asteroid = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 0), makeToonMat("#6E74B8"));
      asteroid.position.set(-sideX - 0.15, 1.6, -14.2); asteroid.rotation.set(0.5, 0.8, 0.2); holder.add(asteroid);
    } else if (themeId === "neon") {
      const magenta = new THREE.MeshBasicMaterial({ color: cfg.emissive || "#FF2E97" });
      const cyan = new THREE.MeshBasicMaterial({ color: cfg.accent });
      const pylonMat = new THREE.MeshStandardMaterial({ color: "#160530", metalness: 0.9, roughness: 0.25, flatShading: true, emissive: new THREE.Color(cfg.emissive || "#FF2E97"), emissiveIntensity: 0.15 });
      for (const s of [-1, 1]) {
        const pylon = new THREE.Group();
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.13, 3.2, 6), pylonMat);
        shaft.position.y = 1.6; pylon.add(shaft);
        for (let i = 0; i < 6; i++) {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.09, 0.2), i % 2 ? cyan : magenta);
          bar.position.y = 0.55 + i * 0.5; pylon.add(bar);
        }
        const orb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), s < 0 ? magenta : cyan);
        orb.position.y = 3.3; pylon.add(orb);
        pylon.position.set(s * sideX, 0, -15.6); holder.add(pylon);
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 4.4, 5), s < 0 ? cyan : magenta);
        beam.position.set(s * (sideX - 0.15), 2.6, -13.5); beam.rotation.z = s * 0.32; beam.rotation.x = 0.22; holder.add(beam);
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.04, 6.5), s < 0 ? magenta : cyan);
        strip.position.set(s * (sideX - 0.32), 0.03, -12); holder.add(strip);
      }
      const archTop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.08, 0.08), cyan);
      archTop.position.set(0, 4.4, -18.9);
      const archL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.2, 0.08), magenta);
      archL.position.set(-1.06, 2.85, -18.9);
      const archR = archL.clone(); archR.position.set(1.06, 2.85, -18.9);
      holder.add(archTop, archL, archR);
    } else if (themeId === "retro") {
      const discoMat = new THREE.MeshStandardMaterial({ color: 0xEFEFF6, metalness: 1.0, roughness: 0.18, flatShading: true, emissive: 0x2a2a3a, emissiveIntensity: 0.25 });
      const disco = new THREE.Mesh(new THREE.IcosahedronGeometry(0.42, 2), discoMat);
      disco.position.set(0, 3.55, -17.6); holder.add(disco);
      const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.9, 6), new THREE.MeshStandardMaterial({ color: 0xB8B8C4, metalness: 0.9, roughness: 0.3 }));
      rod.position.set(0, 4.35, -17.6); holder.add(rod);
      const bead = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), makeToonMat(cfg.accent, { emissive: new THREE.Color(cfg.accent), emissiveIntensity: 0.6 }));
      bead.position.set(0, 3.1, -17.6); holder.add(bead);
      const lampBody = makeToonMat("#F2B24A");
      const lampGlow = makeToonMat("#FFE9A8", { emissive: new THREE.Color("#FFD27A"), emissiveIntensity: 0.7 });
      const bracketMat = makeToonMat("#5E3418");
      for (const s of [-1, 1]) {
        const sconce = new THREE.Group();
        const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.5, 0.06), bracketMat);
        bracket.position.y = 0.25;
        const shade = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.28, 12, 1, true), lampBody);
        shade.position.y = 0.62;
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), lampGlow);
        bulb.position.y = 0.5;
        sconce.add(bracket, bulb, shade);
        sconce.position.set(s * (sideX + 0.15), 1.7, -15.6); holder.add(sconce);
      }
      const dotColors = ["#F26B3A", "#FFD23F", "#E8642B"];
      for (let i = 0; i < 3; i++) {
        const s = i % 2 ? 1 : -1;
        const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 18), makeToonMat(dotColors[i]));
        dot.position.set(s * (sideX + 0.05), 0.02, -13.5 - i * 1.4); holder.add(dot);
      }
    } else if (themeId === "xmas") {
      const snowMat = makeToonMat("#EAF4FC");
      const trunkMat = makeToonMat("#6E4526");
      const leafMat = makeToonMat("#1F7A4D");
      const baubleCols = ["#FF5A5A", "#FFCE4A", "#59C6FF", "#B98CFF"];
      const goldStar = new THREE.MeshStandardMaterial({ color: "#FFCE4A", emissive: "#FFB300", emissiveIntensity: 0.9, metalness: 0.7, roughness: 0.25 });
      const baubleMats = baubleCols.map((c) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.55, roughness: 0.28 }));
      const makeTree = (scale) => {
        const tree = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * scale, 0.1 * scale, 0.34 * scale, 8), trunkMat);
        trunk.position.y = 0.17 * scale; tree.add(trunk);
        const tiers = 3, baseR = 0.5 * scale, tierH = 0.5 * scale;
        for (let i = 0; i < tiers; i++) {
          const r = baseR - i * 0.12 * scale, y = 0.5 * scale + i * 0.34 * scale;
          const cone = new THREE.Mesh(new THREE.ConeGeometry(r, tierH, 12), leafMat);
          cone.position.y = y; tree.add(cone);
          const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.96, tierH * 0.42, 12), snowMat);
          cap.position.y = y + tierH * 0.28; tree.add(cap);
          const nb = 3;
          for (let b = 0; b < nb; b++) {
            const a = (b / nb) * Math.PI * 2 + i * 1.1;
            const bb = new THREE.Mesh(new THREE.SphereGeometry(0.05 * scale, 8, 6), baubleMats[(i + b) % baubleMats.length]);
            bb.position.set(Math.cos(a) * r * 0.8, y - tierH * 0.15, Math.sin(a) * r * 0.8);
            tree.add(bb);
          }
        }
        const star = new THREE.Mesh(new THREE.SphereGeometry(0.09 * scale, 10, 8), goldStar);
        star.position.y = 0.5 * scale + tiers * 0.34 * scale + 0.05; star.scale.set(1, 1.4, 1); tree.add(star);
        return tree;
      };
      const treeL = makeTree(1.1); treeL.position.set(-sideX - 0.05, 0, -16.2);
      const treeR = makeTree(0.82); treeR.position.set(sideX + 0.1, 0, -15.2);
      holder.add(treeL, treeR);
      for (const m of [[-sideX - 0.05, -16.2, 0.42], [sideX + 0.1, -15.2, 0.34]]) {
        const mound = new THREE.Mesh(new THREE.SphereGeometry(m[2], 12, 8), snowMat);
        mound.scale.y = 0.4; mound.position.set(m[0], 0.02, m[1]); holder.add(mound);
      }
      const lightCols = ["#FFCE4A", "#FF5A5A", "#37E0A0", "#59C6FF", "#FFF2CE"];
      const gN = 11, gz = -18.6, gy0 = 3.4, gSpan = sideX * 1.55, sag = 0.9;
      for (let i = 0; i < gN; i++) {
        const t = i / (gN - 1), x = -gSpan + t * gSpan * 2, y = gy0 - Math.sin(t * Math.PI) * sag;
        const col = lightCols[i % lightCols.length];
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: col }));
        bulb.position.set(x, y, gz); holder.add(bulb);
      }
      const wreath = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.1, 10, 22), leafMat);
      wreath.position.set(0, 3.7, -19.3); holder.add(wreath);
      const bow = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), makeToonMat("#FF5A5A"));
      bow.scale.set(1.6, 0.9, 0.6); bow.position.set(0, 3.4, -19.25); holder.add(bow);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const berry = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), makeToonMat(i % 2 ? "#FF5A5A" : "#EAF4FC"));
        berry.position.set(Math.cos(a) * 0.34, 3.7 + Math.sin(a) * 0.34, -19.24); holder.add(berry);
      }
    } else {
      const woodMat = makeToonMat("#A9713C");
      const woodDark = makeToonMat("#7E5227");
      const cushionMat = makeToonMat(cfg.accent);
      const bench = new THREE.Group();
      const seat = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 0.5), woodMat); seat.position.set(0, 0.5, 0);
      const cushion = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.12, 0.44), cushionMat); cushion.position.set(0, 0.6, 0);
      const backr = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 0.1), woodMat); backr.position.set(0, 0.82, -0.22);
      bench.add(seat, cushion, backr);
      for (const lx of [-0.75, 0.75]) {
        for (const lz of [-0.18, 0.18]) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), woodDark);
          leg.position.set(lx, 0.25, lz); bench.add(leg);
        }
      }
      bench.position.set(-sideX - 0.55, 0, -13.5); bench.rotation.y = Math.PI / 2;
      bench.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      holder.add(bench);
      const plant = new THREE.Group();
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.34, 12), makeToonMat("#D98C5F")); pot.position.set(0, 0.17, 0);
      const potRim = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.07, 12), makeToonMat("#C2764B")); potRim.position.set(0, 0.32, 0);
      plant.add(pot, potRim);
      const leafA = makeToonMat("#4FA36B"), leafB = makeToonMat("#66BE81");
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), i % 2 ? leafA : leafB);
        leaf.scale.set(1, 1.9, 0.6);
        leaf.position.set(Math.cos(a) * 0.14, 0.62 + (i % 3) * 0.12, Math.sin(a) * 0.14);
        leaf.rotation.z = a; plant.add(leaf);
      }
      plant.position.set(sideX + 0.45, 0, -14.6);
      plant.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      holder.add(plant);
      const rack = new THREE.Group();
      const tray = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.1, 0.46), woodDark); tray.position.set(0, 0.44, 0);
      const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8), woodMat); rail.rotation.z = Math.PI / 2; rail.position.set(0, 0.54, 0.17);
      rack.add(tray, rail);
      for (const lx of [-0.3, 0.3]) {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.44, 0.08), woodDark);
        leg.position.set(lx, 0.22, 0); rack.add(leg);
      }
      const heroBall = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 16), new THREE.MeshStandardMaterial({ color: cfg.accent, metalness: 0.15, roughness: 0.12 }));
      heroBall.position.set(0, 0.64, 0); heroBall.castShadow = true; rack.add(heroBall);
      rack.position.set(sideX + 0.5, 0, -11.0); rack.rotation.y = -Math.PI / 2;
      rack.traverse((o) => { if (o.isMesh) o.receiveShadow = true; });
      holder.add(rack);
    }
  } catch (e) { console.warn("addProps failed", themeId, e); }
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
    if (parts.bumperL && parts.bumperL.userData.setColor) parts.bumperL.userData.setColor(cfg.accent);
    if (parts.bumperR && parts.bumperR.userData.setColor) parts.bumperR.userData.setColor(cfg.accent);
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
    const accent = new THREE.PointLight(cfg.accent, cfg.accentIntensity || (cfg.emissive ? 6 : 3), 9, 1.6);
    accent.position.set(0, 2.4, -14.5);
    parts.lightHolder.add(accent);
  } catch (e) {
    console.warn("applyTheme failed", e);
  }
}
