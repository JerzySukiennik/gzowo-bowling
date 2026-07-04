// Gzowo Bowling — controller entry: join/rejoin flow, lobby with host settings, screen router, game wiring, winner screen.
import { GAME, PLAYER_COLORS } from "../config.js";
import { t, setLang, getLang, onLangChange } from "../i18n.js";
import * as net from "../net.js";
import { el, clear, sfx, vib, popNode, shakeNode, countUp, ballDiscEl, ballDiscUrl, getShareCard, shareCard, downloadCard } from "./ui.js";
import { showJoin } from "./join.js";
import { isTutorialDone, startTutorial } from "./tutorial.js";
import { initThrowPad } from "./throwpad.js";
import { initHostMenu } from "./hostmenu.js";
import { initEmotes } from "./emotes.js";
import { showMyBalls, renderBallPicker } from "./myballs.js";

const THROW_PHASES = ["aiming", "rolling", "settling", "scored", "replay"];

function installGuards() {
  const guard = (err) => {
    console.warn("guarded error", err);
  };
  window.addEventListener("error", (ev) => guard(ev.error || ev.message));
  window.addEventListener("unhandledrejection", (ev) => {
    guard(ev.reason);
    try { ev.preventDefault(); } catch (e) {}
  });
}

let app = null;
let code = "";
let myId = null;
let isHost = false;
let meta = null;
let players = {};
let game = null;
let scores = {};
let currentView = "";
let winnerKey = "";
let gameView = null;
let hostMenu = null;
let tutorialOpen = false;
let retryTimer = null;
let prevTurnPlayer = null;
let prevTurnKey = "";
let prevResultTs = 0;
let prevRank = 0;
let watchersOn = false;
let pickerOverlay = null;

function openMyBalls() {
  const overlay = el("div", "myballs-overlay");
  document.body.append(overlay);
  const mine = me();
  showMyBalls(overlay, (mine && mine.balls) || [], {
    onSave(balls) {
      if (!myId || !Array.isArray(balls) || !balls.length) return;
      net.write("players/" + myId + "/balls", balls);
      const b0 = balls[0] || {};
      net.update("players/" + myId, {
        ballColor: b0.color || "#FF6B6B",
        ballPattern: b0.pattern || "solid",
        ballPatternColor: b0.patternColor || null,
        ballWeight: typeof b0.weight === "number" ? b0.weight : 10,
      });
    },
    onClose() { try { overlay.remove(); } catch (e) {} },
  });
}

function asArray(x) {
  if (Array.isArray(x)) return x;
  if (x && typeof x === "object") {
    return Object.keys(x).sort((a, b) => Number(a) - Number(b)).map((k) => x[k]);
  }
  return [];
}

function me() {
  return (players && myId && players[myId]) || null;
}

function setPadLang(v) {
  if (v !== "pl" && v !== "en") return;
  if (isHost) net.write("meta/settings/language", v);
  setLang(v);
}

function playerList() {
  return Object.entries(players || {})
    .map(([id, p]) => ({ id, ...p }))
    .sort((a, b) => (a.order || 0) - (b.order || 0));
}

function nickOf(pid) {
  const p = players && players[pid];
  return p ? p.nick || "?" : "?";
}

function framesTotal() {
  return (meta && meta.settings && meta.settings.frames) || GAME.DEFAULT_FRAMES;
}

function setView(name, node) {
  currentView = name;
  if (name !== "game") gameView = null;
  if (name !== "winner") winnerKey = "";
  clear(app);
  app.append(node);
}

function openTutorial() {
  if (tutorialOpen) return;
  tutorialOpen = true;
  startTutorial(document.body, () => {
    tutorialOpen = false;
  });
}

function tutorialBtn() {
  const b = el("button", "btn btn-ghost btn-icon", "❓");
  b.setAttribute("aria-label", t("pad.tutorialToggle"));
  b.addEventListener("click", () => {
    sfx("ui");
    vib(10);
    openTutorial();
  });
  return b;
}

function centerScreen(cardContent) {
  const wrap = el("div", "error-wrap");
  const card = el("div", "card error-card spring-in");
  card.append(cardContent);
  wrap.append(card);
  return wrap;
}

function showErrorScreen(msgKey, onRetry) {
  const inner = el("div");
  inner.append(el("div", "error-emoji", "🎳💥"));
  inner.append(el("h1", null, t(msgKey)));
  const btn = el("button", "btn btn-3d btn-primary btn-pill btn-big", t("common.ok"));
  btn.addEventListener("click", () => {
    sfx("ui");
    vib(10);
    if (onRetry) onRetry();
    else location.reload();
  });
  inner.append(btn);
  setView("error", centerScreen(inner));
}

function showCodeEntry(onCode, errored) {
  const inner = el("div");
  inner.append(el("h1", null, t("join.title")));
  inner.append(el("div", "label label-upper", t("lobby.roomCode")));
  const input = el("input", "input");
  input.type = "text";
  input.maxLength = 4;
  input.autocapitalize = "characters";
  input.autocomplete = "off";
  input.style.letterSpacing = ".3em";
  input.style.textTransform = "uppercase";
  input.style.margin = "12px 0";
  const err = el("div", "nick-error", errored ? t("error.roomNotFound") : "");
  const btn = el("button", "btn btn-3d btn-primary btn-pill btn-big", t("common.next"));
  btn.addEventListener("click", () => {
    sfx("ui");
    vib(10);
    const v = input.value.trim().toUpperCase();
    if (v.length !== 4) {
      shakeNode(input);
      err.textContent = t("error.roomNotFound");
      vib([30, 30]);
      return;
    }
    onCode(v);
  });
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") btn.click();
  });
  inner.append(input, err, btn);
  setView("codeEntry", centerScreen(inner));
  setTimeout(() => { try { input.focus(); } catch (e) {} }, 350);
}

function showWaitNextGame(profile) {
  const inner = el("div");
  inner.append(el("div", "error-emoji", "🎳"));
  inner.append(el("h1", null, t("error.gameInProgress")));
  inner.append(el("p", "muted pulse-soft", t("common.loading")));
  setView("waitNext", centerScreen(inner));
  if (retryTimer) clearInterval(retryTimer);
  retryTimer = setInterval(() => {
    tryJoin(profile, true);
  }, 4000);
}

async function tryJoin(profile, silent) {
  try {
    const res = await net.joinRoom(code, profile);
    if (retryTimer) {
      clearInterval(retryTimer);
      retryTimer = null;
    }
    myId = res.playerId;
    isHost = res.isHost;
    afterJoin(true);
  } catch (err) {
    const ec = (err && err.code) || "generic";
    if (silent && ec === "game_in_progress") return;
    if (retryTimer) {
      clearInterval(retryTimer);
      retryTimer = null;
    }
    if (ec === "room_not_found") {
      showCodeEntry((v) => {
        code = v;
        tryJoin(profile);
      }, true);
    } else if (ec === "room_full") {
      showErrorScreen("error.roomFull", () => tryJoin(profile));
    } else if (ec === "game_in_progress") {
      showWaitNextGame(profile);
    } else {
      showErrorScreen("error.generic");
    }
  }
}

function attachWatchers() {
  if (watchersOn) return;
  watchersOn = true;
  net.watch("meta", (v) => {
    meta = v;
    if (!meta) {
      showErrorScreen("error.roomNotFound");
      return;
    }
    if (hostMenu) hostMenu.setState(meta, players, game);
    route();
  });
  net.watch("players", (v) => {
    players = v || {};
    const myNode = myId ? players[myId] : null;
    const nowHost = !!(myNode && myNode.isHost);
    if (nowHost !== isHost) {
      isHost = nowHost;
      hostMenu = null;
      if (currentView === "winner") { winnerKey = ""; renderWinner(); }
      else if (currentView === "lobby") renderLobby();
      else if (currentView === "game") { gameView = null; ensureGameView(); updateGame(); }
      return;
    }
    if (hostMenu) hostMenu.setState(meta, players, game);
    if (currentView === "lobby") renderLobby();
    else if (currentView === "game") updateGame();
  });
  net.watch("game", (v) => {
    game = v;
    if (hostMenu) hostMenu.setState(meta, players, game);
    if (currentView === "game") updateGame();
  });
  net.watch("scores", (v) => {
    scores = v || {};
    if (currentView === "game") updateWaitCard();
  });
}

function afterJoin(fresh) {
  hostMenu = null;
  attachWatchers();
  if (fresh && !isTutorialDone()) openTutorial();
  route();
}

function route() {
  if (!meta) return;
  const state = meta.state || "lobby";
  if (state === "lobby") {
    renderLobby();
  } else if (state === "finished") {
    renderWinner();
  } else {
    ensureGameView();
    updateGame();
  }
}

function segmented(options, selected, onPick) {
  const seg = el("div", "segmented");
  for (const opt of options) {
    const b = el("button", "seg" + (String(opt.value) === String(selected) ? " selected" : ""));
    b.textContent = opt.label;
    b.addEventListener("click", () => {
      sfx("ui");
      vib(10);
      popNode(b);
      for (const s of seg.children) s.classList.toggle("selected", s === b);
      onPick(opt.value);
    });
    seg.append(b);
  }
  return seg;
}

function toggleBtn(on, onFlip) {
  const tog = el("button", "toggle" + (on ? " on" : ""));
  tog.addEventListener("click", () => {
    sfx("ui");
    vib(10);
    const next = !tog.classList.contains("on");
    tog.classList.toggle("on", next);
    onFlip(next);
  });
  return tog;
}

function renderLobby() {
  const list = playerList();
  const my = me();
  const screen = el("div", "screen");
  const topbar = el("div", "topbar");
  topbar.append(el("div", "logo-small", "GZOWO BOWLING 🎳"));
  screen.append(topbar);

  const chipRow = el("div");
  chipRow.style.display = "flex";
  chipRow.style.justifyContent = "center";
  chipRow.style.gap = "8px";
  chipRow.style.flexWrap = "wrap";
  chipRow.append(el("span", "chip", t("lobby.roomCode") + ": " + (net.roomCode() || code)));
  chipRow.append(el("span", "chip chip-soft", t("lobby.playersCount", { n: list.length, total: GAME.MAX_PLAYERS })));
  screen.append(chipRow);

  if (my) {
    const youCard = el("div", "card you-card spring-in");
    youCard.style.setProperty("--pc", my.playerColor || PLAYER_COLORS[0]);
    youCard.append(ballDiscEl(my.ballColor, my.ballPattern, "ball-disc-72", my.ballPatternColor));
    const info = el("div");
    const nickLine = el("div", "player-nick", my.nick || "?");
    info.append(nickLine);
    const meta2 = el("div");
    meta2.style.display = "flex";
    meta2.style.gap = "8px";
    meta2.style.alignItems = "center";
    meta2.append(el("span", "chip chip-soft", t("common.you")));
    if (isHost) meta2.append(el("span", "badge", "⭐ " + t("join.youAreHost")));
    info.append(meta2);
    youCard.append(info);
    screen.append(youCard);
    const mbRow = el("div");
    mbRow.style.textAlign = "center";
    const myBallsBtn = el("button", "btn btn-ghost btn-myballs", t("myballs.button"));
    myBallsBtn.addEventListener("click", () => { sfx("ui"); vib(10); popNode(myBallsBtn); openMyBalls(); });
    mbRow.append(myBallsBtn);
    screen.append(mbRow);
  }

  const others = list.filter((p) => p.id !== myId);
  if (others.length) {
    const card = el("div", "card");
    for (const p of others) {
      const row = el("div", "player-row spring-in");
      row.append(ballDiscEl(p.ballColor, p.ballPattern, "ball-disc-32", p.ballPatternColor));
      row.append(el("span", "nick", p.nick || "?"));
      if (p.isHost) row.append(el("span", "badge", t("common.host")));
      const dot = el("span", "conn-dot" + (p.connected === false ? " off" : ""));
      row.append(dot);
      card.append(row);
    }
    screen.append(card);
  }

  if (isHost) {
    const settings = (meta && meta.settings) || {};
    const card = el("div", "card");
    card.append(el("h2", null, t("lobby.settings.title")));

    card.append(el("div", "sheet-section-title", t("lobby.settings.language")));
    card.append(segmented(
      [{ value: "pl", label: t("lang.pl") }, { value: "en", label: t("lang.en") }],
      getLang(),
      (v) => setPadLang(v)
    ));

    card.append(el("div", "sheet-section-title", t("lobby.settings.rounds")));
    card.append(segmented(
      GAME.FRAMES_OPTIONS.map((n) => ({ value: n, label: String(n) })),
      settings.frames || GAME.DEFAULT_FRAMES,
      (v) => net.write("meta/settings/frames", Number(v))
    ));

    const narrowRow = el("div", "setting-row");
    narrowRow.append(el("span", "setting-label", t("lobby.settings.narrowLane")));
    narrowRow.append(toggleBtn(!!settings.narrowLaneOn, (on) => net.write("meta/settings/narrowLaneOn", on)));
    card.append(narrowRow);

    card.append(el("div", "sheet-section-title", t("lobby.settings.bumpers")));
    for (const p of list) {
      const row = el("div", "player-toggle-row");
      row.append(el("span", "setting-label", t("host.bumperFor", { name: p.nick || "?" })));
      row.append(toggleBtn(!!p.bumperOn, (on) => net.write("players/" + p.id + "/bumperOn", on)));
      card.append(row);
    }
    screen.append(card);

    if (list.length === 1) {
      const solo = el("p", "muted");
      solo.style.textAlign = "center";
      solo.textContent = t("lobby.soloHint");
      screen.append(solo);
    }

    const dock = el("div", "cta-dock");
    const start = el("button", "btn btn-3d btn-primary btn-pill start-btn", t("common.start") + " 🎳");
    const anyReady = list.some((p) => p.ready);
    start.disabled = !anyReady;
    start.addEventListener("click", () => {
      sfx("strike");
      vib(20);
      popNode(start);
      start.disabled = true;
      net.sendCommand("newGame", null);
    });
    dock.append(start);
    screen.append(dock);
  } else {
    const waitCard = el("div", "card");
    const pins = el("div", "pins-illustration");
    for (const ch of ["🎳", "🎳", "🎳", "🎳"]) pins.append(el("span", null, ch));
    waitCard.append(pins);
    const line = el("p", "muted pulse-soft");
    line.style.textAlign = "center";
    line.textContent = t("join.waitingForHost");
    waitCard.append(line);
    const joined = el("p", "muted");
    joined.style.textAlign = "center";
    joined.textContent = t("join.joinedWait");
    waitCard.append(joined);
    screen.append(waitCard);
    const langCard = el("div", "card");
    langCard.append(el("div", "sheet-section-title", t("lobby.settings.language")));
    langCard.append(segmented(
      [{ value: "pl", label: t("lang.pl") }, { value: "en", label: t("lang.en") }],
      getLang(),
      (v) => setPadLang(v)
    ));
    screen.append(langCard);
  }

  const tutRow = el("div");
  tutRow.style.textAlign = "center";
  const tut = el("button", "btn btn-ghost", "❓ " + t("pad.tutorialToggle"));
  tut.addEventListener("click", () => {
    sfx("ui");
    vib(10);
    openTutorial();
  });
  tutRow.append(tut);
  screen.append(tutRow);

  setView("lobby", screen);
}

function ensureGameView() {
  if (currentView === "game" && gameView) return;
  const root = el("div", "throwpad");

  const statusBar = el("div", "status-bar");
  const strip = el("div", "color-strip");
  const title = el("div", "status-title");
  const frameChip = el("span", "chip chip-soft frame-chip");
  const pausedChip = el("span", "chip chip-warn paused-chip hidden", "⏸ " + t("pad.paused"));
  const tut = tutorialBtn();
  const cameraBtn = el("button", "chip");
  cameraBtn.setAttribute("aria-label", t("pad.cameraCycle"));
  cameraBtn.addEventListener("click", () => {
    if (meta && meta.state === "paused") return;
    sfx("ui");
    vib(10);
    popNode(cameraBtn);
    net.sendCommand("cameraCycle", null);
  });
  const burgerSlot = el("span");
  statusBar.append(strip, title, frameChip, pausedChip, cameraBtn, tut, burgerSlot);

  const throwRoot = el("div");
  const pad = initThrowPad(throwRoot);

  const waitRoot = el("div");
  waitRoot.style.display = "flex";
  waitRoot.style.flexDirection = "column";
  waitRoot.style.gap = "16px";
  waitRoot.style.flex = "1";
  waitRoot.style.minHeight = "0";
  waitRoot.style.overflowY = "auto";
  const turnChip = el("div", "turn-chip");
  const turnDisc = el("span");
  const turnNick = el("span", "nick");
  turnChip.append(turnDisc, turnNick);
  const scoreCard = el("div", "card score-card");
  scoreCard.append(el("div", "label label-upper", t("hud.total")));
  const bigTotal = el("div", "big-total tabular", "0");
  const frameStrip = el("div", "frame-strip");
  const rankChip = el("span", "chip chip-soft rank-chip", "");
  scoreCard.append(bigTotal, frameStrip, rankChip);
  const ticker = el("div", "ticker", "");
  waitRoot.append(turnChip, scoreCard, ticker);

  const bottomBar = el("div");
  bottomBar.style.display = "flex";
  bottomBar.style.alignItems = "center";
  const emoteWrap = el("div");
  emoteWrap.style.flex = "1";
  emoteWrap.style.minWidth = "0";
  initEmotes(emoteWrap);
  bottomBar.append(emoteWrap);

  root.append(statusBar, throwRoot, waitRoot, bottomBar);
  setView("game", root);

  if (!hostMenu) hostMenu = initHostMenu(burgerSlot, { isHost });
  hostMenu.setState(meta, players, game);

  const my = me();
  if (my) {
    strip.style.setProperty("--pc", my.playerColor || PLAYER_COLORS[0]);
    pad.setBall(my.ballColor, my.ballPattern, my.ballPatternColor);
    pad.setPlayerColor(my.playerColor);
    pad.setMulliganSpent(!!my.mulliganUsed);
  }

  gameView = { root, title, frameChip, pausedChip, cameraBtn, throwRoot, waitRoot, pad, turnChip, turnDisc, turnNick, bigTotal, frameStrip, rankChip, ticker, emoteWrap, strip };
  prevTurnKey = "";
  prevTurnPlayer = null;
  prevRank = 0;
}

function fmtFrame(tArr, isLast) {
  const arr = asArray(tArr);
  if (!arr.length) return "";
  const parts = [];
  for (let i = 0; i < arr.length; i++) {
    const v = Number(arr[i]) || 0;
    const prev = Number(arr[i - 1]) || 0;
    if (v === 10 && (i === 0 || (isLast && (prev === 10 || i === 2)))) parts.push("X");
    else if (i > 0 && prev !== 10 && prev + v === 10) parts.push("/");
    else parts.push(v === 0 ? "–" : String(v));
  }
  return parts.join(" ");
}

function myRank() {
  const list = playerList();
  const totals = list.map((p) => ({ id: p.id, total: (scores[p.id] && scores[p.id].total) || 0 }));
  totals.sort((a, b) => b.total - a.total);
  const idx = totals.findIndex((x) => x.id === myId);
  return { rank: idx < 0 ? 0 : idx + 1, count: totals.length };
}

function updateWaitCard() {
  if (!gameView) return;
  const sc = scores[myId] || {};
  countUp(gameView.bigTotal, sc.total || 0);
  clear(gameView.frameStrip);
  const total = framesTotal();
  const frames = asArray(sc.frames);
  for (let i = 0; i < total; i++) {
    const cell = el("div", "frame-cell", fmtFrame(frames[i] && frames[i].t, i === total - 1));
    if (game && i === (game.currentFrameIndex || 0)) {
      cell.classList.add("current");
      const my = me();
      if (my) cell.style.setProperty("--pc", my.playerColor || "");
    }
    gameView.frameStrip.append(cell);
  }
  const r = myRank();
  gameView.rankChip.textContent = r.rank ? "#" + r.rank + " / " + r.count : "";
  if (r.rank && r.rank !== prevRank) {
    if (prevRank) popNode(gameView.rankChip);
    prevRank = r.rank;
  }
}

function resultText(lr) {
  if (!lr) return "";
  let what;
  if (lr.isStrike) what = t("banner.strike");
  else if (lr.isSpare) what = t("banner.spare");
  else if (lr.isGutter) what = t("banner.gutter");
  else what = (lr.pinsDown || 0) + " 🎳";
  return nickOf(lr.playerId) + ": " + what;
}

function updateGame() {
  if (!gameView || !meta) return;
  const g = game || {};
  const my = me();
  const paused = meta.state === "paused";
  const myTurn = g.currentPlayerId === myId;
  const showThrow = myTurn && THROW_PHASES.includes(g.phase);

  const myChoose = g.phase === "chooseBall" && g.chooseFor === myId;
  if (myChoose) {
    if (!pickerOverlay) {
      pickerOverlay = el("div", "picker-overlay");
      renderBallPicker(pickerOverlay, (my && my.balls) || [], {
        onPick(idx) {
          if (myId) net.write("input/" + myId + "/ballChoice", { index: idx, ts: Date.now() });
        },
      });
      document.body.append(pickerOverlay);
    }
  } else if (pickerOverlay) {
    try { pickerOverlay.remove(); } catch (e) {}
    pickerOverlay = null;
  }

  gameView.throwRoot.classList.toggle("hidden", !showThrow);
  gameView.waitRoot.classList.toggle("hidden", showThrow);
  gameView.pausedChip.classList.toggle("hidden", !paused);
  gameView.emoteWrap.classList.toggle("inputs-disabled", paused);
  gameView.cameraBtn.classList.toggle("inputs-disabled", paused);

  if (my) {
    gameView.strip.style.setProperty("--pc", my.playerColor || PLAYER_COLORS[0]);
    gameView.pad.setBall(my.ballColor, my.ballPattern, my.ballPatternColor);
    gameView.pad.setPlayerColor(my.playerColor);
    gameView.pad.setMulliganSpent(!!my.mulliganUsed);
  }

  gameView.title.textContent = myTurn ? t("pad.yourTurn") : t("pad.waitTurn", { name: nickOf(g.currentPlayerId) });
  gameView.frameChip.textContent = ((g.currentFrameIndex || 0) + 1) + "/" + framesTotal() + " · " + ((g.throwIndex || 0) + 1);
  const camMode = (g.cameraView && g.cameraView.mode) || "auto";
  gameView.cameraBtn.textContent = "📷 " + t("pad.camera." + camMode);

  const turnKey = [g.currentPlayerId, g.currentFrameIndex, g.throwIndex].join("|");
  if (turnKey !== prevTurnKey) {
    prevTurnKey = turnKey;
    if (myTurn) gameView.pad.reset();
    if (g.currentPlayerId !== prevTurnPlayer) {
      if (myTurn && prevTurnPlayer !== null) {
        vib(20);
        sfx("ding");
      }
      prevTurnPlayer = g.currentPlayerId;
      popNode(gameView.turnChip);
    }
  }

  if (myTurn) gameView.pad.setPins(typeof g.rackMask === "number" ? g.rackMask : 0x3FF);
  gameView.pad.setActive(myTurn && g.phase === "aiming" && meta.state === "playing");
  gameView.pad.setPaused(paused);
  gameView.pad.setNarrow(!!g.narrowRound);
  gameView.pad.setMulligan(!!g.mulliganAvailable && myTurn && !(my && my.mulliganUsed));

  const cur = players[g.currentPlayerId];
  gameView.turnChip.style.setProperty("--pc", (cur && cur.playerColor) || "var(--bg-soft)");
  clear(gameView.turnDisc);
  if (cur) gameView.turnDisc.append(ballDiscEl(cur.ballColor, cur.ballPattern, "ball-disc-48", cur.ballPatternColor));
  gameView.turnNick.textContent = myTurn ? t("pad.yourTurn") : t("pad.waitTurn", { name: nickOf(g.currentPlayerId) });

  const lr = g.lastResult;
  if (lr && lr.ts && lr.ts !== prevResultTs) {
    prevResultTs = lr.ts;
    gameView.ticker.textContent = resultText(lr);
    popNode(gameView.ticker);
    if (lr.playerId === myId) {
      if (lr.isStrike) vib([80, 40, 120]);
      else vib(60);
    }
  }

  updateWaitCard();
}

function confettiRain() {
  const rain = el("div", "confetti-rain");
  for (let i = 0; i < 26; i++) {
    const piece = el("div", "confetti-piece");
    piece.style.left = Math.random() * 100 + "%";
    piece.style.background = PLAYER_COLORS[i % PLAYER_COLORS.length];
    piece.style.animationDuration = (2.6 + Math.random() * 2.4) + "s";
    piece.style.animationDelay = Math.random() * 2.4 + "s";
    rain.append(piece);
  }
  return rain;
}

function renderCanceled(result) {
  const screen = el("div", "screen canceled-pad");
  screen.style.alignItems = "center";
  screen.style.textAlign = "center";
  screen.style.justifyContent = "center";
  screen.append(el("div", "canceled-icon spring-in", "🛑"));
  screen.append(el("div", "winner-heading spring-in", t("canceled.title")));
  screen.append(el("p", "muted", t("canceled.subtitle", { name: (result && result.hostNick) || "?" })));
  if (isHost) {
    const again = el("button", "btn btn-3d btn-success btn-pill btn-big", "🔄 " + t("winner.playAgain"));
    again.addEventListener("click", () => {
      sfx("ui");
      vib(20);
      popNode(again);
      net.sendCommand("newGame", null);
    });
    screen.append(again);
  } else {
    screen.append(el("p", "muted pulse-soft", t("canceled.newGameHint")));
  }
  setView("winner", screen);
}

function renderWinner() {
  const result = meta && meta.result;
  const key = result ? String(result.date) + "|" + t("winner.title") + "|" + (result.canceled ? "c" : "w") : "none";
  if (currentView === "winner" && winnerKey === key) return;
  if (result && result.canceled) {
    renderCanceled(result);
    winnerKey = key;
    return;
  }
  const screen = el("div", "screen");
  screen.style.alignItems = "center";
  screen.style.textAlign = "center";
  screen.append(confettiRain());

  if (!result) {
    screen.append(el("h1", null, t("pad.gameOverShort")));
    setView("winner", screen);
    winnerKey = key;
    return;
  }

  const ranking = asArray(result.ranking);
  const winner = ranking[0] || {};

  screen.append(el("div", "winner-heading spring-in", t("winner.title")));
  screen.append(el("div", "trophy trophy-drop", "🏆"));

  const nameRow = el("div", "winner-name-row spring-in");
  nameRow.append(ballDiscEl(winner.ballColor || "#FF6B6B", winner.ballPattern || "solid", "ball-disc-48", winner.ballPatternColor));
  const winLine = el("span", "winner-wins-line", t("winner.wins", { name: winner.nick || "?" }));
  winLine.style.color = winner.playerColor || "var(--text)";
  nameRow.append(winLine);
  screen.append(nameRow);

  const myRow = ranking.find((r) => r && r.playerId === myId);
  if (myRow) {
    const place = ranking.indexOf(myRow) + 1;
    const card = el("div", "card placement-card spring-in");
    card.style.width = "100%";
    card.append(el("div", "placement-big", "#" + place));
    const totalEl = el("div", "big-total tabular", "0");
    card.append(totalEl);
    card.append(el("div", "muted", t("pad.nice")));
    screen.append(card);
    setTimeout(() => countUp(totalEl, myRow.total || 0, 1200), 400);
  }

  const rankCard = el("div", "card");
  rankCard.style.width = "100%";
  rankCard.append(el("h2", null, t("winner.ranking")));
  ranking.forEach((row, i) => {
    if (!row) return;
    const r = el("div", "ranking-row spring-in" + (i === 0 ? " winner-row" : ""));
    r.style.animationDelay = (i * 90) + "ms";
    if (i === 0) r.style.setProperty("--pc", row.playerColor || "");
    r.append(el("span", "rank-place rank-" + (i + 1), (i + 1) + "."));
    r.append(ballDiscEl(row.ballColor || "#FF6B6B", row.ballPattern || "solid", "ball-disc-32", row.ballPatternColor));
    r.append(el("span", "rank-nick", row.nick || "?"));
    r.append(el("span", "rank-total tabular", String(row.total || 0)));
    rankCard.append(r);
  });
  screen.append(rankCard);

  const img = el("img", "share-card-img spring-in");
  img.alt = t("card.title");
  img.classList.add("hidden");
  screen.append(img);
  getShareCard(result).then((url) => {
    if (url) {
      img.src = url;
      img.classList.remove("hidden");
    }
  }).catch(() => {});

  const btnCol = el("div");
  btnCol.style.display = "flex";
  btnCol.style.flexDirection = "column";
  btnCol.style.gap = "12px";
  btnCol.style.width = "100%";
  if (isHost) {
    const share = el("button", "btn btn-3d btn-primary btn-pill btn-big", "📤 " + t("winner.share"));
    share.addEventListener("click", async () => {
      sfx("ui");
      vib(10);
      share.disabled = true;
      const url = await getShareCard(result);
      if (url) await shareCard(url);
      share.disabled = false;
    });
    btnCol.append(share);
  }
  const dl = el("button", "btn btn-ghost", "⬇️ " + t("winner.download"));
  dl.addEventListener("click", async () => {
    sfx("ui");
    vib(10);
    const url = await getShareCard(result);
    if (url) downloadCard(url);
  });
  btnCol.append(dl);
  if (isHost) {
    const again = el("button", "btn btn-3d btn-success btn-pill btn-big", "🔄 " + t("winner.playAgain"));
    again.addEventListener("click", () => {
      sfx("ui");
      vib(20);
      popNode(again);
      net.sendCommand("newGame", null);
    });
    btnCol.append(again);
  }
  screen.append(btnCol);
  screen.append(el("p", "muted", t("winner.thanks")));

  setView("winner", screen);
  winnerKey = key;
  sfx("strike");
  vib([40, 40, 40]);
}

export async function startController() {
  installGuards();
  app = document.getElementById("app");

  onLangChange(() => {
    if (currentView === "lobby") renderLobby();
    else if (currentView === "game") {
      gameView = null;
      ensureGameView();
      updateGame();
    } else if (currentView === "winner") {
      winnerKey = "";
      renderWinner();
    }
  });

  try {
    await net.initNet();
  } catch (e) {
    showErrorScreen("error.generic");
    return;
  }

  const params = new URLSearchParams(location.search);
  code = String(params.get("room") || "").trim().toUpperCase();

  let session = null;
  try {
    session = JSON.parse(sessionStorage.getItem("gzowo.session") || "null");
  } catch (e) {}

  if (session && session.code && session.playerId && (!code || session.code === code)) {
    const node = await net.rejoin(session.code, session.playerId);
    if (node) {
      code = session.code;
      myId = session.playerId;
      isHost = !!node.isHost;
      afterJoin(false);
      return;
    }
  }

  const beginJoinFlow = () => {
    showJoin(app, (profile) => {
      tryJoin(profile);
    });
  };

  if (!code || code.length !== 4) {
    showCodeEntry((v) => {
      code = v;
      beginJoinFlow();
    }, false);
  } else {
    beginJoinFlow();
  }
}
