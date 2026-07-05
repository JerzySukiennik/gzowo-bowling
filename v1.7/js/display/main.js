// Gzowo Bowling — TV entry: boot sequence, room + lobby wiring, RTDB listeners, render loop and global error guard.
import { GAME, EMOTES } from "../config.js";
import { t, setLang, getLang, onLangChange } from "../i18n.js";
import * as net from "../net.js";
import * as scene from "./scene.js";
import * as themes from "./themes.js";
import * as physics from "./physics.js";
import * as cameraMod from "./camera.js";
import * as game from "./game.js";
import * as hud from "./hud.js";
import * as effects from "./effects.js";
import * as replay from "./replay.js";
import * as audio from "./audio.js";
import * as sharecard from "./sharecard.js";

let roomCode = "";
let latestPlayers = {};
let latestMeta = null;
let lastGuardToast = 0;
let lastNetErrorToast = 0;

function showFatal() {
  try {
    const app = document.getElementById("app");
    if (!app) return;
    app.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "error-wrap";
    const card = document.createElement("div");
    card.className = "card error-card spring-in";
    const emoji = document.createElement("div");
    emoji.className = "error-emoji";
    emoji.textContent = "🎳💥";
    const title = document.createElement("h1");
    title.textContent = t("error.generic");
    const button = document.createElement("button");
    button.className = "btn btn-3d btn-primary btn-pill btn-big";
    button.textContent = t("common.ok");
    button.addEventListener("click", () => location.reload());
    card.append(emoji, title, button);
    wrap.append(card);
    app.append(wrap);
  } catch (e) {}
}

function installNetErrorHandler() {
  net.setNetErrorHandler(() => {
    const now = Date.now();
    if (now - lastNetErrorToast < 30000) return;
    lastNetErrorToast = now;
    try { hud.toast(t("error.connection")); } catch (e) {}
  });
}

function installGuards() {
  const guard = (err) => {
    console.warn("guarded error", err);
    const now = Date.now();
    if (now - lastGuardToast > 30000) {
      lastGuardToast = now;
      try { hud.toast(t("error.generic")); } catch (e) {}
    }
  };
  window.addEventListener("error", (ev) => guard(ev.error || ev.message));
  window.addEventListener("unhandledrejection", (ev) => {
    guard(ev.reason);
    try { ev.preventDefault(); } catch (e) {}
  });
}

function renderLobbyIfNeeded() {
  if (!latestMeta || latestMeta.state !== "lobby") return;
  hud.setLobbyVisible(true, {
    code: roomCode,
    url: net.controllerUrl(roomCode),
    players: latestPlayers,
    settings: (latestMeta && latestMeta.settings) || {},
  });
}

function handleEmote(e) {
  if (!e || typeof e.emote !== "string") return;
  const def = EMOTES.find((x) => x.id === e.emote);
  if (!def) return;
  const lane = e.playerId ? game.getPlayerLane(e.playerId) : 0;
  hud.popEmote(lane, def.char);
  audio.sfx(def.sfx, 0.5);
}

function blitWinnerReplay() {
  const target = hud.getWinnerReplayCanvas();
  if (!target) return;
  try {
    const src = scene.getRenderer().domElement;
    const ctx = target.getContext("2d");
    let sw = src.width;
    let sh = Math.round((sw * 9) / 16);
    if (sh > src.height) {
      sh = src.height;
      sw = Math.round((sh * 16) / 9);
    }
    const sx = Math.round((src.width - sw) / 2);
    const sy = Math.round((src.height - sh) / 2);
    ctx.drawImage(src, sx, sy, sw, sh, 0, 0, target.width, target.height);
  } catch (e) {}
}

export async function startDisplay() {
  installGuards();
  installNetErrorHandler();
  const app = document.getElementById("app");
  const stage = document.createElement("div");
  stage.id = "stage";
  stage.style.cssText = "position:fixed;inset:0;z-index:0;";
  app.append(stage);
  try {
    await net.initNet();
    roomCode = await net.createRoom({ language: getLang(), frames: GAME.DEFAULT_FRAMES, narrowLaneOn: false });
    await scene.initScene(stage);
    cameraMod.initCamera();
    await physics.initPhysics();
    audio.initAudio();
    net.update("meta/music", audio.getMusicState());
    hud.initHud(app);
    effects.initEffects({ scene: scene.getScene(), shake: cameraMod.shake, sfx: audio.sfx });
    game.initGame({ scene, themes, physics, camera: cameraMod, hud, effects, replay, audio, sharecard, net });
  } catch (err) {
    console.error("display boot failed", err);
    showFatal();
    return;
  }

  net.watch("meta", (m) => {
    if (!m) return;
    latestMeta = m;
    if (m.settings && (m.settings.language === "pl" || m.settings.language === "en")) {
      setLang(m.settings.language);
    }
    game.onMeta(m);
    renderLobbyIfNeeded();
  });

  net.watch("players", (p) => {
    latestPlayers = p || {};
    game.onPlayersChanged(latestPlayers);
    renderLobbyIfNeeded();
  });

  net.watch("input", (map) => {
    try { game.onInput(map || {}); } catch (e) { console.warn("input handling failed", e); }
  });

  net.watchAdded("commands", (key, cmd) => {
    try { game.onCommand(key, cmd); } catch (e) { console.warn("command failed", cmd, e); }
    net.remove("commands/" + key);
  });

  net.watchAdded("emotes", (key, e) => {
    try { handleEmote(e); } catch (err) { console.warn("emote failed", err); }
    net.remove("emotes/" + key);
  });

  onLangChange(() => {
    hud.refreshTexts();
    renderLobbyIfNeeded();
  });

  hud.setLobbyVisible(true, {
    code: roomCode,
    url: net.controllerUrl(roomCode),
    players: {},
    settings: { language: getLang(), frames: GAME.DEFAULT_FRAMES, narrowLaneOn: false },
  });

  let last = performance.now();
  const loop = () => {
    requestAnimationFrame(loop);
    const now = performance.now();
    const dt = Math.min(100, now - last);
    last = now;
    try {
      if (!game.isPaused()) {
        physics.step(dt);
        replay.tick(dt);
        game.tick(dt);
        effects.update(dt);
      } else {
        replay.tick(dt);
        game.tickPaused(dt);
      }
      cameraMod.update(dt, game.getCameraCtx());
      hud.tick(cameraMod.getCamera());
      scene.render(cameraMod.getCamera());
      blitWinnerReplay();
    } catch (e) {
      console.warn("frame error", e);
    }
  };
  requestAnimationFrame(loop);
}
