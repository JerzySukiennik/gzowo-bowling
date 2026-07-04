// Gzowo Bowling — Firebase RTDB layer: room create/join/rejoin, watchers, write helpers, commands, presence.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase, ref, get, set, update as dbUpdate, remove as dbRemove,
  push as dbPush, onValue, onChildAdded, onDisconnect, runTransaction,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { FIREBASE_CONFIG, ROOM_CODE_CHARS, PLAYER_COLORS, GAME } from "./config.js";

let db = null;
let currentCode = null;
let currentPlayerId = null;
let presenceKey = null;
let netErrorHandler = null;

export function setNetErrorHandler(fn) {
  netErrorHandler = typeof fn === "function" ? fn : null;
}

function notifyNetError(err) {
  if (netErrorHandler) {
    try { netErrorHandler(err); } catch (e) {}
  }
}

function fail(codeStr) {
  const err = new Error(codeStr);
  err.code = codeStr;
  throw err;
}

function roomRef(subpath) {
  const base = "rooms/" + currentCode;
  return ref(db, subpath ? base + "/" + subpath : base);
}

function randomCode() {
  let out = "";
  for (let i = 0; i < 4; i++) {
    out += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)];
  }
  return out;
}

export async function initNet() {
  if (db) return;
  const app = initializeApp(FIREBASE_CONFIG);
  db = getDatabase(app);
}

export async function createRoom(settings) {
  if (!db) await initNet();
  const s = settings || {};
  for (let attempt = 0; attempt < 24; attempt++) {
    const candidate = randomCode();
    const metaRef = ref(db, "rooms/" + candidate + "/meta");
    let result = null;
    try {
      result = await runTransaction(metaRef, (current) => {
        if (current !== null) return;
        return {
          state: "lobby",
          createdAt: Date.now(),
          hostId: "",
          settings: {
            language: s.language === "en" ? "en" : "pl",
            frames: GAME.FRAMES_OPTIONS.includes(s.frames) ? s.frames : GAME.DEFAULT_FRAMES,
            narrowLaneOn: !!s.narrowLaneOn,
          },
        };
      });
    } catch (e) {
      console.warn("createRoom transaction failed", e);
      continue;
    }
    if (result && result.committed) {
      currentCode = candidate;
      currentPlayerId = null;
      return candidate;
    }
  }
  fail("generic");
}

export async function joinRoom(code, profile) {
  if (!db) await initNet();
  const c = String(code || "").trim().toUpperCase();
  if (c.length !== 4) fail("room_not_found");
  const metaSnap = await get(ref(db, "rooms/" + c + "/meta"));
  if (!metaSnap.exists()) fail("room_not_found");
  const meta = metaSnap.val() || {};
  if (meta.state !== "lobby") fail("game_in_progress");
  const p = profile || {};
  const id = "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  let becameHost = false;
  let result = null;
  try {
    result = await runTransaction(ref(db, "rooms/" + c + "/players"), (players) => {
      const entries = players ? Object.values(players) : [];
      const active = entries.filter((pp) => pp && pp.connected !== false);
      if (active.length >= GAME.MAX_PLAYERS) return;
      becameHost = active.length === 0;
      const usedIdx = new Set(active.map((pp) => (typeof pp.order === "number" ? pp.order : -1)));
      let slot = 0;
      while (usedIdx.has(slot)) slot++;
      const next = players || {};
      next[id] = {
        nick: String(p.nick || "").slice(0, 12) || "?",
        ballColor: p.ballColor || "#FF6B6B",
        ballPattern: p.ballPattern || "solid",
        ballPatternColor: p.ballPatternColor || null,
        ballWeight: Number.isFinite(Number(p.ballWeight)) ? Math.min(15, Math.max(5, Math.round(Number(p.ballWeight)))) : 10,
        balls: [{
          color: p.ballColor || "#FF6B6B",
          pattern: p.ballPattern || "solid",
          patternColor: p.ballPatternColor || null,
          weight: Number.isFinite(Number(p.ballWeight)) ? Math.min(15, Math.max(5, Math.round(Number(p.ballWeight)))) : 10,
        }],
        laneTheme: p.laneTheme || "classic",
        playerColor: PLAYER_COLORS[slot] || PLAYER_COLORS[0],
        isHost: becameHost,
        order: slot,
        bumperOn: false,
        mulliganUsed: false,
        connected: true,
        ready: p.ready !== false,
      };
      return next;
    });
  } catch (e) {
    console.warn("joinRoom transaction failed", e);
    fail("generic");
  }
  if (!result || !result.committed) fail("room_full");
  currentCode = c;
  currentPlayerId = id;
  if (becameHost) {
    try { await set(ref(db, "rooms/" + c + "/meta/hostId"), id); } catch (e) { console.warn("hostId write failed", e); }
  }
  try { sessionStorage.setItem("gzowo.session", JSON.stringify({ code: c, playerId: id })); } catch (e) {}
  setPresence();
  return { playerId: id, isHost: becameHost };
}

export async function rejoin(code, playerId) {
  try {
    if (!db) await initNet();
    const c = String(code || "").trim().toUpperCase();
    if (!c || !playerId) return null;
    const snap = await get(ref(db, "rooms/" + c + "/players/" + playerId));
    if (!snap.exists()) return null;
    currentCode = c;
    currentPlayerId = playerId;
    try { sessionStorage.setItem("gzowo.session", JSON.stringify({ code: c, playerId })); } catch (e) {}
    setPresence();
    return snap.val();
  } catch (e) {
    console.warn("rejoin failed", e);
    return null;
  }
}

export function roomCode() {
  return currentCode;
}

export function myPlayerId() {
  return currentPlayerId;
}

export function watch(subpath, cb) {
  if (!db || !currentCode || typeof cb !== "function") return () => {};
  try {
    return onValue(roomRef(subpath), (snap) => {
      let value = null;
      try { value = snap.val(); } catch (e) { value = null; }
      try { cb(value); } catch (e) { console.warn("watch callback failed:", subpath, e); }
    }, (err) => {
      console.warn("watch error:", subpath, err);
      notifyNetError(err);
    });
  } catch (e) {
    console.warn("watch setup failed:", subpath, e);
    notifyNetError(e);
    return () => {};
  }
}

export function watchAdded(subpath, cb) {
  if (!db || !currentCode || typeof cb !== "function") return () => {};
  try {
    return onChildAdded(roomRef(subpath), (snap) => {
      let value = null;
      try { value = snap.val(); } catch (e) { value = null; }
      try { cb(snap.key, value); } catch (e) { console.warn("watchAdded callback failed:", subpath, e); }
    }, (err) => {
      console.warn("watchAdded error:", subpath, err);
      notifyNetError(err);
    });
  } catch (e) {
    console.warn("watchAdded setup failed:", subpath, e);
    notifyNetError(e);
    return () => {};
  }
}

export function write(subpath, value) {
  if (!db || !currentCode) return Promise.resolve();
  return set(roomRef(subpath), value).catch((e) => console.warn("write failed:", subpath, e));
}

export function update(subpath, obj) {
  if (!db || !currentCode) return Promise.resolve();
  return dbUpdate(roomRef(subpath), obj).catch((e) => console.warn("update failed:", subpath, e));
}

export function remove(subpath) {
  if (!db || !currentCode) return Promise.resolve();
  return dbRemove(roomRef(subpath)).catch((e) => console.warn("remove failed:", subpath, e));
}

export async function push(subpath, value) {
  if (!db || !currentCode) return "";
  try {
    const r = dbPush(roomRef(subpath));
    await set(r, value);
    return r.key || "";
  } catch (e) {
    console.warn("push failed:", subpath, e);
    return "";
  }
}

export async function sendCommand(type, payload) {
  await push("commands", {
    type: String(type || ""),
    from: currentPlayerId || "",
    payload: payload === undefined ? null : payload,
    ts: Date.now(),
  });
}

export async function sendEmote(emoteId) {
  await push("emotes", {
    playerId: currentPlayerId || "",
    emote: String(emoteId || ""),
    ts: Date.now(),
  });
}

export function setPresence() {
  if (!db || !currentCode || !currentPlayerId) return;
  const key = currentCode + "/" + currentPlayerId;
  if (presenceKey === key) return;
  presenceKey = key;
  try {
    const connectedRef = ref(db, ".info/connected");
    const myConnRef = ref(db, "rooms/" + currentCode + "/players/" + currentPlayerId + "/connected");
    onValue(connectedRef, (snap) => {
      if (snap.val() !== true) return;
      onDisconnect(myConnRef).set(false)
        .then(() => set(myConnRef, true))
        .catch((e) => console.warn("presence arm failed", e));
    }, (err) => console.warn("presence watch error", err));
  } catch (e) {
    console.warn("setPresence failed", e);
  }
}

export function controllerUrl(code) {
  const c = code || currentCode || "";
  return location.origin + location.pathname + "?role=controller&room=" + encodeURIComponent(c);
}
