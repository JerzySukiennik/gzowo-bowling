// Gzowo Bowling — TV audio: pooled SFX, roll loop, lo-fi music playlist with ducking; every call fails silently.
import { ASSETS } from "../config.js";

const pools = {};
let inited = false;
let rollAudio = null;
let rollOn = false;
let musicEl = null;
let ducked = false;
let wantMusic = false;
const musicState = { playing: false, volume: 0.6, track: 0 };

function makeAudio(url) {
  try {
    if (!url) return null;
    const a = new Audio(url);
    a.preload = "auto";
    a.load();
    return a;
  } catch (e) {
    return null;
  }
}

function safePlay(a) {
  try {
    const p = a.play();
    if (p && p.catch) p.catch(() => {});
  } catch (e) {}
}

function applyMusicVolume() {
  try {
    if (musicEl) musicEl.volume = Math.max(0, Math.min(1, musicState.volume * (ducked ? 0.28 : 1)));
  } catch (e) {}
}

function hookMusicEnd(el) {
  try {
    el.addEventListener("ended", () => {
      try { music("skip"); } catch (e) {}
    });
  } catch (e) {}
}

export function initAudio() {
  if (inited) return;
  inited = true;
  try {
    for (const key of Object.keys(ASSETS.SFX)) {
      pools[key] = { url: ASSETS.SFX[key], items: [] };
      const a = makeAudio(ASSETS.SFX[key]);
      if (a) pools[key].items.push(a);
    }
    rollAudio = makeAudio(ASSETS.SFX.roll);
    if (rollAudio) {
      rollAudio.loop = true;
      rollAudio.volume = 0.45;
    }
    musicEl = makeAudio(ASSETS.MUSIC[0]);
    if (musicEl) hookMusicEnd(musicEl);
    const unlock = () => {
      try {
        if (wantMusic && musicEl && musicEl.paused) safePlay(musicEl);
        if (rollOn && rollAudio && rollAudio.paused) safePlay(rollAudio);
      } catch (e) {}
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
  } catch (e) {}
}

export function sfx(name, volume) {
  try {
    const pool = pools[name];
    if (!pool || !pool.url) return;
    let a = null;
    for (const item of pool.items) {
      if (item.paused || item.ended) { a = item; break; }
    }
    if (!a) {
      if (pool.items.length >= 5) a = pool.items[0];
      else {
        a = makeAudio(pool.url);
        if (!a) return;
        pool.items.push(a);
      }
    }
    try { a.currentTime = 0; } catch (e) {}
    a.volume = Math.max(0, Math.min(1, volume === undefined ? 0.9 : volume));
    safePlay(a);
  } catch (e) {}
}

export function rollLoop(on) {
  try {
    rollOn = !!on;
    if (!rollAudio) return;
    if (on) {
      try { rollAudio.currentTime = 0; } catch (e) {}
      safePlay(rollAudio);
    } else {
      rollAudio.pause();
    }
  } catch (e) {}
}

export function music(action, value) {
  try {
    if (action === "play") {
      wantMusic = true;
      musicState.playing = true;
      if (!musicEl) musicEl = makeAudio(ASSETS.MUSIC[musicState.track]);
      if (musicEl) {
        applyMusicVolume();
        safePlay(musicEl);
      }
    } else if (action === "pause") {
      wantMusic = false;
      musicState.playing = false;
      if (musicEl) musicEl.pause();
    } else if (action === "skip") {
      musicState.track = (musicState.track + 1) % Math.max(1, ASSETS.MUSIC.length);
      const wasPlaying = musicState.playing;
      if (musicEl) { try { musicEl.pause(); } catch (e) {} }
      const next = makeAudio(ASSETS.MUSIC[musicState.track]);
      if (next) {
        musicEl = next;
        hookMusicEnd(musicEl);
      }
      applyMusicVolume();
      if (wasPlaying && musicEl) safePlay(musicEl);
    } else if (action === "volume") {
      const v = Number(value);
      if (isFinite(v)) musicState.volume = Math.max(0, Math.min(1, v));
      applyMusicVolume();
    }
  } catch (e) {}
}

export function duck(on) {
  ducked = !!on;
  applyMusicVolume();
}

export function getMusicState() {
  return { playing: musicState.playing, volume: musicState.volume, track: musicState.track };
}
