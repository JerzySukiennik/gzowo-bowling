// Gzowo Bowling — TV 2D chrome: connect/lobby screens, leaderboard, plaques + crowns, banner queue, emotes, pause and winner screens.
import { GAME, EMOTES, THEME_CONFIG } from "../config.js";
import { t } from "../i18n.js";
import * as scene from "./scene.js";
import * as audio from "./audio.js";
import { ballDiscDataUrl } from "./sharecard.js";

let rootEl = null;
let hudEl = null;
let lobbyEl = null;
let leaderboardEl = null;
let lbRowsEl = null;
let lbFrameChip = null;
let lbHeaderLabel = null;
let plaqueLayer = null;
let bannerSlot = null;
let cameraChipEl = null;
let letterTop = null;
let letterBottom = null;
let pauseEl = null;
let winnerEl = null;
let winnerReplayCanvas = null;
let toastEl = null;
let toastTimer = null;

const plaques = new Map();
const lbRows = new Map();
let leaderIds = [];
let lanePos = [];
let prevLobbyIds = new Set();
let qrCache = { url: "", size: 0, el: null };
let bannerQueue = [];
let bannerBusy = false;
const emoteState = new Map();

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined && text !== null) n.textContent = text;
  return n;
}

function clear(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function makeQr(url, size) {
  const box = el("div", "qr-box");
  try {
    if (!window.QRCode) throw new Error("no qr lib");
    new window.QRCode(box, {
      text: url,
      width: size,
      height: size,
      colorDark: "#2B2A4A",
      colorLight: "#FFFFFF",
      correctLevel: window.QRCode.CorrectLevel ? window.QRCode.CorrectLevel.M : 0,
    });
  } catch (e) {
    const fallback = el("div", "room-url", url);
    fallback.style.maxWidth = size + "px";
    box.append(fallback);
  }
  return box;
}

function animateNumber(node, to, dur) {
  const from = Number(node.dataset.v || 0);
  const target = Number(to) || 0;
  if (from === target) { node.textContent = String(target); return; }
  node.dataset.v = String(target);
  audio.sfx("ui", 0.18);
  const start = performance.now();
  const d = dur || 600;
  const step = (now) => {
    const k = Math.min(1, (now - start) / d);
    const eased = 1 - Math.pow(1 - k, 3);
    node.textContent = String(Math.round(from + (target - from) * eased));
    if (k < 1) requestAnimationFrame(step);
    else {
      node.classList.remove("count-up");
      void node.offsetWidth;
      node.classList.add("count-up");
    }
  };
  requestAnimationFrame(step);
}

export function initHud(containerEl) {
  rootEl = containerEl;
  hudEl = el("div", "hud");
  lobbyEl = el("div");
  leaderboardEl = el("aside", "leaderboard hidden");
  const header = el("div", "leaderboard-header");
  lbHeaderLabel = el("span", null, t("hud.leaderboard"));
  lbFrameChip = el("span", "chip chip-soft", "");
  header.append(lbHeaderLabel, lbFrameChip);
  lbRowsEl = el("div");
  leaderboardEl.append(header, lbRowsEl);
  plaqueLayer = el("div");
  plaqueLayer.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:15;";
  bannerSlot = el("div", "banner-slot");
  cameraChipEl = el("div", "camera-chip hidden");
  letterTop = el("div", "letterbox-top");
  letterBottom = el("div", "letterbox-bottom");
  hudEl.append(leaderboardEl, plaqueLayer, bannerSlot, cameraChipEl, letterTop, letterBottom);
  rootEl.append(lobbyEl, hudEl);
}

export function refreshTexts() {
  if (lbHeaderLabel) lbHeaderLabel.textContent = t("hud.leaderboard");
}

export function setFrameInfo(n, total) {
  if (lbFrameChip) lbFrameChip.textContent = t("hud.frameOf", { n, total });
}

function ballImg(color, pattern, sizeCls, px) {
  const img = document.createElement("img");
  img.className = "ball-disc " + sizeCls;
  img.alt = "";
  const url = ballDiscDataUrl(color, pattern, px);
  if (url) img.src = url;
  else img.style.background = color || "#FF6B6B";
  return img;
}

function codeTiles(code, small) {
  const wrap = el("div", "code-tiles" + (small ? " code-tiles-sm" : ""));
  const letters = String(code || "????").split("");
  letters.forEach((ch, i) => {
    const tile = el("span", "code-tile spring-in", ch);
    tile.style.animationDelay = i * 70 + "ms";
    wrap.append(tile);
  });
  return wrap;
}

function shortUrl(url) {
  try {
    return String(url).replace(/^https?:\/\//, "").replace(/\?.*$/, "");
  } catch (e) {
    return String(url || "");
  }
}

function renderConnect(data) {
  const screen = el("div", "connect-screen");
  const logo = el("div", "logo-hero");
  logo.append(el("span", "pin-glyph", "🎳"), el("span", null, t("app.title").toUpperCase()));
  const tagline = el("div", "tagline", t("lobby.title"));
  const card = el("div", "card connect-card spring-in");
  const left = el("div");
  const qrBox = makeQr(data.url, 420);
  qrBox.classList.add("qr-box-lg");
  left.append(qrBox, el("div", "qr-caption", t("lobby.scanToJoin")));
  const side = el("div", "code-side");
  side.append(
    el("div", "label label-upper", t("lobby.roomCode")),
    codeTiles(data.code, false),
    el("div", "room-url", shortUrl(data.url))
  );
  card.append(left, side);
  screen.append(logo, tagline, card, el("div", "waiting-line", t("lobby.waitingForPlayers")));
  return screen;
}

function settingsChips(settings, players) {
  const wrap = el("div", "settings-preview");
  const s = settings || {};
  wrap.append(el("span", "chip", (s.language === "en" ? t("lang.enShort") : t("lang.plShort"))));
  wrap.append(el("span", "chip", "⟳ " + (s.frames || GAME.DEFAULT_FRAMES) + " · " + t("lobby.settings.rounds")));
  if (s.narrowLaneOn) wrap.append(el("span", "chip chip-warn", "⚠️ " + t("lobby.settings.narrowLane")));
  const anyBumper = Object.values(players || {}).some((p) => p && p.bumperOn);
  if (anyBumper) wrap.append(el("span", "chip chip-soft", "🛟 " + t("lobby.settings.bumpers")));
  return wrap;
}

function renderLobby(data) {
  const frag = document.createDocumentFragment();
  const topbar = el("div", "lobby-topbar");
  topbar.append(el("div", "logo-small", "🎳 " + t("app.title").toUpperCase()));
  const entries = Object.entries(data.players || {}).sort((a, b) => (a[1].order || 0) - (b[1].order || 0));
  topbar.append(el("span", "chip", t("lobby.playersCount", { n: entries.length, total: GAME.MAX_PLAYERS })));
  frag.append(topbar);
  const dock = el("div", "qr-dock");
  dock.append(codeTiles(data.code, true));
  if (qrCache.url !== data.url || qrCache.size !== 200 || !qrCache.el) {
    qrCache = { url: data.url, size: 200, el: makeQr(data.url, 200) };
  }
  dock.append(qrCache.el);
  frag.append(dock);
  const grid = el("div", "player-grid");
  const newIds = new Set();
  entries.forEach(([pid, p], i) => {
    newIds.add(pid);
    const card = el("div", "card player-card");
    card.style.setProperty("--pc", p.playerColor || "#FF5C7A");
    if (!prevLobbyIds.has(pid)) {
      card.classList.add("spring-in");
      card.style.animationDelay = i * 70 + "ms";
      audio.sfx("ui", 0.5);
    }
    const ring = el("div", "ball-ring");
    if (p.ready) {
      ring.append(ballImg(p.ballColor, p.ballPattern, "ball-disc-96", 96));
    } else {
      const ghost = el("div", "ball-disc ball-disc-96 ball-ghost");
      ghost.style.background = p.ballColor || "#FFD9A8";
      ring.append(ghost);
    }
    const info = el("div", "player-card-info");
    info.append(el("div", "player-nick", p.nick || "…"));
    if (p.ready) {
      const theme = THEME_CONFIG[p.laneTheme] || THEME_CONFIG.classic;
      info.append(el("span", "chip chip-soft", theme.icon + " " + t("theme." + (THEME_CONFIG[p.laneTheme] ? p.laneTheme : "classic"))));
      const metaRow = el("div");
      metaRow.style.cssText = "display:flex;align-items:center;gap:8px;";
      const wNum = Number(p.ballWeight);
      const wLabel = Number.isFinite(wNum) ? t("join.weightValue", { n: wNum }) : t("join.weightValue", { n: 10 });
      metaRow.append(el("span", "weight-badge", wLabel));
      if (p.isHost) metaRow.append(el("span", "badge", t("common.host")));
      metaRow.append(el("span", "conn-dot" + (p.connected === false ? " off" : "")));
      info.append(metaRow);
    } else {
      info.append(el("span", "muted", t("common.loading")));
    }
    card.append(ring, info);
    grid.append(card);
  });
  for (let i = entries.length; i < GAME.MAX_PLAYERS; i++) {
    grid.append(el("div", "ghost-card", "+"));
  }
  prevLobbyIds = newIds;
  frag.append(grid);
  frag.append(settingsChips(data.settings, data.players));
  const hint = el("div", "start-hint");
  hint.append(el("span", "phone-icon", "📱"), el("span", null, t("lobby.startHint")));
  if (entries.length === 1) hint.append(el("span", "muted", " · " + t("lobby.soloHint")));
  frag.append(hint);
  return frag;
}

export function setLobbyVisible(on, lobbyData) {
  if (!lobbyEl) return;
  if (!on) {
    clear(lobbyEl);
    lobbyEl.classList.add("hidden");
    return;
  }
  lobbyEl.classList.remove("hidden");
  clear(lobbyEl);
  const data = lobbyData || {};
  const count = Object.keys(data.players || {}).length;
  if (count === 0) {
    prevLobbyIds = new Set();
    qrCache = { url: "", size: 0, el: null };
    lobbyEl.append(renderConnect(data));
  } else {
    lobbyEl.append(renderLobby(data));
  }
}

export function setLeaderboardVisible(on) {
  if (leaderboardEl) leaderboardEl.classList.toggle("hidden", !on);
}

export function updateLeaderboard(playersArr, scoresMap, currentPlayerId) {
  if (!lbRowsEl) return;
  const arr = (playersArr || []).slice();
  const totals = {};
  for (const p of arr) {
    const s = (scoresMap || {})[p.id] || {};
    totals[p.id] = Number(s.total) || 0;
  }
  arr.sort((a, b) => (totals[b.id] - totals[a.id]) || ((a.order || 0) - (b.order || 0)));
  const oldTops = new Map();
  for (const [pid, row] of lbRows) oldTops.set(pid, row.wrap.offsetTop);
  const seen = new Set();
  const maxTotal = Math.max(1, ...arr.map((p) => totals[p.id]));
  arr.forEach((p) => {
    seen.add(p.id);
    let row = lbRows.get(p.id);
    if (!row) {
      const wrap = el("div", "leaderboard-row spring-in");
      const crown = el("span", "lb-crown hidden", "👑");
      const pip = el("span", "lb-pip");
      const marker = el("span", "lb-marker hidden", "🎳");
      const nick = el("span", "lb-nick");
      const bonus = el("span", "lb-bonus hidden");
      const total = el("span", "lb-total", "0");
      const bar = el("span", "leaderboard-bar");
      wrap.append(crown, pip, marker, nick, bonus, total, bar);
      row = { wrap, crown, marker, nick, bonus, total, bar };
      lbRows.set(p.id, row);
    }
    row.wrap.style.setProperty("--pc", p.playerColor || "#4CC9F0");
    row.nick.textContent = p.nick || "?";
    row.wrap.classList.toggle("active", p.id === currentPlayerId);
    row.wrap.classList.toggle("disconnected", p.connected === false);
    row.marker.classList.toggle("hidden", p.id !== currentPlayerId);
    const s = (scoresMap || {})[p.id] || {};
    const bonusVal = Number(s.trickBonus) || 0;
    row.bonus.classList.toggle("hidden", bonusVal <= 0);
    if (bonusVal > 0) row.bonus.textContent = "+" + bonusVal;
    animateNumber(row.total, totals[p.id], 600);
    row.bar.style.width = Math.round((totals[p.id] / maxTotal) * 100) + "%";
    row.crown.classList.toggle("hidden", !leaderIds.includes(p.id));
    lbRowsEl.append(row.wrap);
  });
  for (const [pid, row] of lbRows) {
    if (!seen.has(pid)) {
      row.wrap.remove();
      lbRows.delete(pid);
    }
  }
  requestAnimationFrame(() => {
    for (const [pid, row] of lbRows) {
      const old = oldTops.get(pid);
      if (old === undefined) continue;
      const delta = old - row.wrap.offsetTop;
      if (Math.abs(delta) > 2) {
        row.wrap.style.transition = "none";
        row.wrap.style.transform = "translateY(" + delta + "px)";
        void row.wrap.offsetWidth;
        row.wrap.style.transition = "";
        row.wrap.style.transform = "";
      }
    }
  });
}

export function updatePlaques(playersArr, scoresMap, activePlayerId) {
  if (!plaqueLayer) return;
  const seen = new Set();
  (playersArr || []).forEach((p) => {
    seen.add(p.id);
    let pl = plaques.get(p.id);
    if (!pl) {
      const wrap = el("div", "plaque");
      const nick = el("span", null, "");
      const score = el("span", "plaque-score", "0");
      const crown = el("div", "crown hidden", "👑");
      wrap.append(nick, score, crown);
      plaqueLayer.append(wrap);
      pl = { wrap, nick, score, crown, laneIndex: p.order || 0 };
      plaques.set(p.id, pl);
    }
    pl.laneIndex = p.order || 0;
    pl.wrap.style.setProperty("--pc", p.playerColor || "#4CC9F0");
    pl.nick.textContent = p.nick || "?";
    const s = (scoresMap || {})[p.id] || {};
    animateNumber(pl.score, Number(s.total) || 0, 600);
    pl.wrap.classList.toggle("active", p.id === activePlayerId);
    const isLeader = leaderIds.includes(p.id);
    pl.wrap.classList.toggle("leader", isLeader);
    pl.crown.classList.toggle("hidden", !isLeader);
    if (isLeader && leaderIds.indexOf(p.id) % 2 === 1) pl.crown.classList.add("crown-alt");
  });
  for (const [pid, pl] of plaques) {
    if (!seen.has(pid)) {
      pl.wrap.remove();
      plaques.delete(pid);
    }
  }
}

export function clearPlaques() {
  for (const [, pl] of plaques) pl.wrap.remove();
  plaques.clear();
  for (const [, row] of lbRows) row.wrap.remove();
  lbRows.clear();
}

export function setCrowns(ids) {
  const prev = leaderIds;
  leaderIds = Array.isArray(ids) ? ids.slice() : [];
  const gained = leaderIds.some((id) => !prev.includes(id));
  if (gained) audio.sfx("ding", 0.5);
  for (const [pid, pl] of plaques) {
    const isLeader = leaderIds.includes(pid);
    pl.wrap.classList.toggle("leader", isLeader);
    pl.crown.classList.toggle("hidden", !isLeader);
  }
  for (const [pid, row] of lbRows) {
    row.crown.classList.toggle("hidden", !leaderIds.includes(pid));
  }
}

export function tick(camera) {
  if (!camera || !plaqueLayer) return;
  lanePos = [];
  for (const [, pl] of plaques) {
    const anchor = scene.getPlaqueAnchor(pl.laneIndex);
    if (!anchor) { pl.wrap.style.display = "none"; continue; }
    anchor.project(camera);
    if (anchor.z > 1 || anchor.z < -1) {
      pl.wrap.style.display = "none";
      continue;
    }
    const x = (anchor.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-anchor.y * 0.5 + 0.5) * window.innerHeight;
    pl.wrap.style.display = "";
    pl.wrap.style.left = x + "px";
    pl.wrap.style.top = y + "px";
    lanePos[pl.laneIndex] = { x, y };
  }
}

export function popEmote(laneIndex, emoteChar) {
  let st = emoteState.get(laneIndex);
  if (!st) {
    st = { active: 0, queue: [] };
    emoteState.set(laneIndex, st);
  }
  if (st.active >= 3) {
    if (st.queue.length < 8) st.queue.push(emoteChar);
    return;
  }
  st.active++;
  const pos = lanePos[laneIndex] || { x: window.innerWidth / 2, y: window.innerHeight * 0.75 };
  const outer = el("div", "emote-pop");
  outer.style.cssText =
    "position:fixed;z-index:40;pointer-events:none;font-size:64px;line-height:1;" +
    "left:" + (pos.x + (Math.random() - 0.5) * 48) + "px;top:" + (pos.y - 20) + "px;";
  outer.style.setProperty("--emote-tilt", ((Math.random() * 24 - 12) | 0) + "deg");
  const inner = el("span", "emote-sway", emoteChar);
  outer.append(inner);
  document.body.append(outer);
  setTimeout(() => {
    outer.remove();
    st.active--;
    if (st.queue.length) {
      const next = st.queue.shift();
      setTimeout(() => popEmote(laneIndex, next), 150);
    }
  }, 1700);
}

function bannerContent(node, kind, vars) {
  const v = vars || {};
  if (kind === "round") {
    node.append(el("span", null, t("banner.round", { n: v.n, total: v.total })));
    if (v.final) node.append(el("span", "banner-finalFrame-chip", t("banner.finalFrame")));
  } else if (kind === "narrow") {
    node.append(el("span", "banner-icon", "⚠️"), el("span", null, t("banner.narrowLane")));
    node.classList.add("jiggle");
  } else if (kind === "playerTurn") {
    node.style.setProperty("--pc", v.color || "#4CC9F0");
    node.append(el("span", null, t("banner.playerTurn", { name: v.name || "?" })), el("span", null, "🎳"));
  } else if (kind === "strike" || kind === "turkey") {
    const text = t("banner." + kind);
    text.split("").forEach((ch, i) => {
      const span = el("span", "banner-letter", ch === " " ? " " : ch);
      span.style.animationDelay = i * 60 + "ms";
      node.append(span);
    });
    if (kind === "turkey") node.append(el("span", null, "🦃"));
  } else if (kind === "spare") {
    node.append(el("span", null, t("banner.spare")));
  } else if (kind === "gutter") {
    node.append(el("span", null, "💧"), el("span", null, t("banner.gutter")));
  } else if (kind === "suddenDeath") {
    node.append(el("span", null, "⚡"), el("span", null, t("banner.suddenDeath")));
    const vig = el("div", "sd-vignette");
    document.body.append(vig);
    setTimeout(() => vig.remove(), 1300);
  } else if (kind === "mulligan") {
    node.append(el("span", "banner-icon", "🔁"), el("span", null, t("banner.mulligan", { name: v.name || "?" })));
  } else if (kind === "skipped") {
    node.append(el("span", "banner-icon", "⏭"), el("span", null, t("banner.skipped", { name: v.name || "?" })));
  } else if (kind === "undo") {
    node.append(el("span", "banner-icon", "↩"), el("span", null, t("banner.undo")));
  } else if (kind === "newGame") {
    node.append(el("span", "banner-icon", "🔄"), el("span", null, t("banner.newGame")));
  } else if (kind === "finalFrame") {
    node.append(el("span", null, t("banner.finalFrame")));
  } else if (kind === "trickshot") {
    node.append(el("span", null, t("banner.trickshot")));
  } else {
    node.append(el("span", null, t("banner." + kind)));
  }
}

export function showBanner(kind, vars, durationMs) {
  return new Promise((resolve) => {
    bannerQueue.push({ kind, vars, dur: durationMs || 1800, resolve });
    pumpBanners();
  });
}

async function pumpBanners() {
  if (bannerBusy || !bannerSlot) return;
  bannerBusy = true;
  while (bannerQueue.length) {
    const item = bannerQueue.shift();
    const node = el("div", "banner banner-" + item.kind + " banner-in");
    try { bannerContent(node, item.kind, item.vars); } catch (e) { node.textContent = ""; }
    clear(bannerSlot);
    bannerSlot.append(node);
    if (item.kind !== "strike" && item.kind !== "turkey" && item.kind !== "spare" && item.kind !== "gutter") {
      audio.sfx("ui", 0.4);
    }
    await new Promise((r) => setTimeout(r, item.dur));
    node.classList.remove("banner-in");
    node.classList.add("banner-out");
    await new Promise((r) => setTimeout(r, 300));
    node.remove();
    item.resolve();
  }
  bannerBusy = false;
}

export function setCameraChip(mode) {
  if (!cameraChipEl) return;
  if (!mode || mode === "auto") {
    cameraChipEl.classList.add("hidden");
    return;
  }
  cameraChipEl.classList.remove("hidden");
  clear(cameraChipEl);
  const chip = el("span", "chip pop", "📷 " + t("pad.camera." + mode));
  cameraChipEl.append(chip);
}

export function setLetterbox(on) {
  if (letterTop) letterTop.classList.toggle("show", !!on);
  if (letterBottom) letterBottom.classList.toggle("show", !!on);
}

function pauseScoreTable(data) {
  const d = data || {};
  const players = Array.isArray(d.players) ? d.players : [];
  const scores = d.scores || {};
  const framesTotal = Math.max(1, Number(d.framesTotal) || 1);
  const table = el("div", "pause-table card spring-in");
  const head = el("div", "pause-row pause-row-head");
  head.append(el("span", "pause-cell pause-cell-name", t("hud.leaderboard")));
  for (let f = 1; f <= framesTotal; f++) head.append(el("span", "pause-cell", String(f)));
  head.append(el("span", "pause-cell pause-cell-total", "Σ"));
  table.append(head);
  const sorted = players.slice().sort((a, b) => {
    const ta = Number((scores[a.id] || {}).total) || 0;
    const tb = Number((scores[b.id] || {}).total) || 0;
    return tb - ta;
  });
  sorted.forEach((p, i) => {
    const row = el("div", "pause-row spring-in");
    row.style.animationDelay = i * 90 + "ms";
    row.style.setProperty("--pc", p.playerColor || "#4CC9F0");
    const nameCell = el("span", "pause-cell pause-cell-name");
    nameCell.append(el("span", "lb-pip"), el("span", null, p.nick || "?"));
    row.append(nameCell);
    const s = scores[p.id] || {};
    const frames = Array.isArray(s.frames) ? s.frames : [];
    for (let f = 0; f < framesTotal; f++) {
      const fr = frames[f] || {};
      const throwsArr = Array.isArray(fr.t) ? fr.t : [];
      let label = "–";
      if (throwsArr.length) {
        const sum = throwsArr.reduce((acc, x) => acc + (Number(x) || 0), 0);
        if (throwsArr[0] === 10) label = "X";
        else if (throwsArr.length >= 2 && sum >= 10) label = throwsArr[0] + "/";
        else label = throwsArr.join("·");
      }
      const cell = el("span", "pause-cell", label);
      if (fr.cum !== undefined && fr.cum !== null) cell.title = String(fr.cum);
      row.append(cell);
    }
    row.append(el("span", "pause-cell pause-cell-total", String(Number(s.total) || 0)));
    table.append(row);
  });
  return table;
}

export function setPauseOverlay(on, data) {
  if (on) {
    if (pauseEl) pauseEl.remove();
    pauseEl = el("div", "pause-overlay pause-fullscreen");
    const header = el("div", "pause-header");
    header.append(
      el("span", "pause-icon jiggle", "⏸"),
      el("span", "pause-title", t("hud.paused"))
    );
    pauseEl.append(header);
    pauseEl.append(pauseScoreTable(data));
    const foot = el("div", "pause-footer");
    foot.append(el("span", "muted pulse-soft", t("pad.paused")));
    pauseEl.append(foot);
    document.body.append(pauseEl);
  } else if (!on && pauseEl) {
    pauseEl.remove();
    pauseEl = null;
  }
}

export function showCanceledScreen(hostNick) {
  hideWinnerScreen();
  winnerEl = el("div", "winner-screen canceled-screen");
  const box = el("div", "canceled-box");
  box.append(
    el("div", "canceled-icon spring-in", "🛑"),
    el("div", "winner-heading", t("canceled.title")),
    el("p", "canceled-sub", t("canceled.subtitle", { name: hostNick || "?" })),
    el("div", "chip chip-soft spring-in", "📱 " + t("canceled.newGameHint"))
  );
  winnerEl.append(box);
  document.body.append(winnerEl);
  audio.sfx("cry", 0.5);
}

export function toast(msg) {
  try {
    if (!toastEl) {
      toastEl = el("div", "chip spring-in");
      toastEl.style.cssText = "position:fixed;left:0;right:0;bottom:24px;margin:0 auto;width:fit-content;z-index:85;font-size:var(--fs-body);box-shadow:var(--shadow);";
      document.body.append(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.style.display = "";
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      if (toastEl) toastEl.style.display = "none";
    }, 3200);
  } catch (e) {}
}

function confettiRain() {
  const wrap = el("div", "confetti-rain");
  const colors = ["#FF5C7A", "#FF9F1C", "#FFD23F", "#3DD68C", "#4CC9F0", "#9B5DE5"];
  for (let i = 0; i < 60; i++) {
    const piece = el("div", "confetti-piece");
    piece.style.left = Math.random() * 100 + "%";
    piece.style.background = colors[i % colors.length];
    piece.style.animationDuration = 2.8 + Math.random() * 3.2 + "s";
    piece.style.animationDelay = Math.random() * 3 + "s";
    piece.style.transform = "rotate(" + Math.random() * 360 + "deg)";
    wrap.append(piece);
  }
  return wrap;
}

export function showWinnerScreen(result, players, cardDataUrl, qrUrl) {
  hideWinnerScreen();
  const r = result || {};
  const ranking = Array.isArray(r.ranking) ? r.ranking : [];
  const winnerIds = Array.isArray(r.winnerIds) ? r.winnerIds : [];
  const winners = ranking.filter((row) => winnerIds.includes(row.playerId));
  const top = winners[0] || ranking[0] || {};
  winnerEl = el("div", "winner-screen");
  const left = el("div", "winner-left");
  left.append(el("div", "winner-heading", t("winner.title")));
  const trophy = el("div", "trophy trophy-drop", "🏆");
  left.append(trophy);
  setTimeout(() => audio.sfx("bowling", 0.8), 500);
  const nameRow = el("div", "winner-name-row");
  (winners.length ? winners : [top]).forEach((wRow) => {
    const group = el("div", "winner-name-row");
    group.style.setProperty("--pc", wRow.playerColor || "#FF6B6B");
    const disc = ballImg(wRow.ballColor, wRow.ballPattern, "ball-disc-140 spin-slow", 140);
    const name = el("div", "winner-name", wRow.nick || "?");
    name.style.setProperty("--pc", wRow.playerColor || "#FF6B6B");
    group.append(disc, name);
    nameRow.append(group);
  });
  left.append(nameRow);
  left.append(el("div", "winner-wins-line", t("winner.wins", { name: (winners.length ? winners : [top]).map((x) => x.nick || "?").join(" + ") })));
  if (r.bestThrow && r.bestThrow.playerId) {
    const frame = el("div", "replay-frame spring-in");
    const label = el("div", "replay-frame-label");
    const bp = ranking.find((x) => x.playerId === r.bestThrow.playerId) || {};
    label.append(
      el("span", "chip", "🎬 " + t("winner.bestThrow")),
      el("span", "chip chip-soft", (bp.nick || "?") + " · " + (r.bestThrow.pins || 0))
    );
    winnerReplayCanvas = document.createElement("canvas");
    winnerReplayCanvas.width = 640;
    winnerReplayCanvas.height = 360;
    winnerReplayCanvas.style.cssText = "width:100%;height:100%;display:block;";
    frame.append(label, winnerReplayCanvas);
    left.append(frame);
  }
  const right = el("div", "winner-right card");
  right.append(el("h2", null, t("winner.ranking")));
  const list = el("div", "ranking-card");
  const rowNodes = [];
  ranking.forEach((row, i) => {
    const node = el("div", "ranking-row spring-in" + (i === 0 ? " winner-row" : ""));
    node.style.setProperty("--pc", row.playerColor || "#4CC9F0");
    node.style.animationDelay = i * 120 + "ms";
    node.append(el("span", "rank-place rank-" + (i + 1), (i + 1) + "."));
    node.append(ballImg(row.ballColor, row.ballPattern, "ball-disc-48", 48));
    node.append(el("span", "rank-nick", row.nick || "?"));
    const total = el("span", "rank-total", "0");
    node.append(total);
    list.append(node);
    rowNodes.push({ total, value: Number(row.total) || 0 });
  });
  right.append(list);
  const revealDelay = 400;
  rowNodes.slice().reverse().forEach((rn, i) => {
    setTimeout(() => animateNumber(rn.total, rn.value, 1200), revealDelay + i * 350);
  });
  const qrWrap = el("div", "winner-qr hidden");
  qrWrap.append(makeQr(qrUrl, 180));
  if (typeof cardDataUrl === "string" && cardDataUrl.indexOf("data:") === 0) {
    const cardImg = document.createElement("img");
    cardImg.className = "share-card-img winner-card-preview";
    cardImg.alt = t("card.title");
    cardImg.src = cardDataUrl;
    qrWrap.append(cardImg);
  }
  qrWrap.append(el("span", "qr-caption", t("winner.scanForCard")));
  right.append(qrWrap);
  setTimeout(() => {
    qrWrap.classList.remove("hidden");
    qrWrap.classList.add("spring-in");
    audio.sfx("ding", 0.6);
  }, revealDelay + rowNodes.length * 350 + 1200);
  winnerEl.append(left, right, el("div", "winner-footer", t("winner.thanks")));
  winnerEl.append(confettiRain());
  document.body.append(winnerEl);
  audio.sfx("clap", 0.9);
}

export function hideWinnerScreen() {
  if (winnerEl) {
    winnerEl.remove();
    winnerEl = null;
  }
  winnerReplayCanvas = null;
}

export function getWinnerReplayCanvas() {
  return winnerReplayCanvas;
}
