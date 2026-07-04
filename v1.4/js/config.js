// Gzowo Bowling — all shared constants: Firebase config, colors, physics, timings, verified asset URLs.

export const FIREBASE_CONFIG = Object.freeze({
  apiKey: "AIzaSyDFfGva2KVHVOVFdDHOwlN_Z2jlJlg_C6M",
  authDomain: "gzowo-bowling.firebaseapp.com",
  databaseURL: "https://gzowo-bowling-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "gzowo-bowling",
  storageBucket: "gzowo-bowling.firebasestorage.app",
  messagingSenderId: "322038374810",
  appId: "1:322038374810:web:8b8dc8fb0403923d70da23",
});

export const ROOM_CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ";

export const PLAYER_COLORS = Object.freeze(["#FF5C7A", "#FF9F1C", "#FFD23F", "#3DD68C", "#4CC9F0", "#9B5DE5"]);

export const BALL_COLORS = Object.freeze(["#FF6B6B", "#FF9F1C", "#FFD23F", "#3DD68C", "#4CC9F0", "#9B5DE5", "#F15BB5", "#2B2A4A"]);

export const BALL_PATTERNS = Object.freeze(["solid", "stripes", "dots", "swirl", "stars", "split"]);

export const BALL_WEIGHT_RANGE = Object.freeze({ MIN: 5, MAX: 15, DEFAULT: 10 });

export function ballWeightParams(weight) {
  let w = Number(weight);
  if (!Number.isFinite(w)) w = BALL_WEIGHT_RANGE.DEFAULT;
  if (w === "light") w = 6; else if (w === "medium") w = 10; else if (w === "heavy") w = 14;
  w = Math.min(BALL_WEIGHT_RANGE.MAX, Math.max(BALL_WEIGHT_RANGE.MIN, Math.round(w)));
  const t = (w - BALL_WEIGHT_RANGE.MIN) / (BALL_WEIGHT_RANGE.MAX - BALL_WEIGHT_RANGE.MIN);
  const lerp = (a, b) => a + (b - a) * t;
  return {
    weight: w,
    mass: lerp(3.2, 7.4),
    restitution: lerp(0.28, 0.04),
    spinFactor: lerp(1.7, 0.45),
    powerFactor: lerp(0.85, 1.12),
  };
}

export const LANE_THEMES = Object.freeze(["classic", "space", "neon", "retro", "xmas"]);

export const THEME_CONFIG = Object.freeze({
  classic: Object.freeze({
    icon: "🎳", sky: "#BFE6FF", horizon: "#FFF2DC", lane: "#E7B778", laneEdge: "#B67C3E",
    gutter: "#F3E6CB", backdrop: "#F0C892", accent: "#FF7A6B", emissive: null,
    ambientColor: "#FFEFD6", ambientIntensity: 0.95, keyColor: "#FFF7E8", keyIntensity: 1.2,
    fillColor: "#CDEBFF", fillIntensity: 0.4, stars: false, snow: false, accentIntensity: 3.4,
  }),
  space: Object.freeze({
    icon: "🪐", sky: "#05061E", horizon: "#241B57", lane: "#3B3E9C", laneEdge: "#20235C",
    gutter: "#111233", backdrop: "#0A0B30", accent: "#A66BFF", emissive: "#42D6FF",
    ambientColor: "#9FB0FF", ambientIntensity: 0.5, keyColor: "#D6DBFF", keyIntensity: 0.95,
    fillColor: "#42D6FF", fillIntensity: 0.32, stars: true, snow: false, accentIntensity: 5.5,
  }),
  neon: Object.freeze({
    icon: "🌈", sky: "#05010F", horizon: "#3B0D63", lane: "#1A0B30", laneEdge: "#FF2E97",
    gutter: "#0E051F", backdrop: "#160530", accent: "#00F5D4", emissive: "#FF2E97",
    ambientColor: "#B85CFF", ambientIntensity: 0.5, keyColor: "#7CF9FF", keyIntensity: 1.0,
    fillColor: "#00F5D4", fillIntensity: 0.5, stars: false, snow: false, accentIntensity: 6.5,
  }),
  retro: Object.freeze({
    icon: "🕺", sky: "#F9D99A", horizon: "#C85A2B", lane: "#B86A34", laneEdge: "#5E3418",
    gutter: "#8A4A22", backdrop: "#A8481F", accent: "#F26B3A", emissive: null,
    ambientColor: "#FFE2B0", ambientIntensity: 0.82, keyColor: "#FFEBC4", keyIntensity: 1.05,
    fillColor: "#F26B3A", fillIntensity: 0.34, stars: false, snow: false, accentIntensity: 3.6,
  }),
  xmas: Object.freeze({
    icon: "🎄", sky: "#081B3A", horizon: "#1C4A5E", lane: "#A62F3C", laneEdge: "#F3F8FC",
    gutter: "#0C3A2C", backdrop: "#123A50", accent: "#37E0A0", emissive: "#FFCE4A",
    ambientColor: "#BFE0FF", ambientIntensity: 0.72, keyColor: "#FFF2CE", keyIntensity: 1.08,
    fillColor: "#5AE8C4", fillIntensity: 0.34, stars: true, snow: true, accentIntensity: 5.2,
  }),
});

export const EMOTES = Object.freeze([
  Object.freeze({ id: "clap", char: "👏", sfx: "clap" }),
  Object.freeze({ id: "joy", char: "😂", sfx: "joy" }),
  Object.freeze({ id: "wow", char: "😮", sfx: "wow" }),
  Object.freeze({ id: "cry", char: "😭", sfx: "cry" }),
  Object.freeze({ id: "fire", char: "🔥", sfx: "fire" }),
  Object.freeze({ id: "skull", char: "💀", sfx: "skull" }),
  Object.freeze({ id: "clown", char: "🤡", sfx: "clown" }),
  Object.freeze({ id: "bowling", char: "🎳", sfx: "bowling" }),
]);

export const GAME = Object.freeze({
  MAX_PLAYERS: 6, FRAMES_OPTIONS: Object.freeze([3, 5, 10]), DEFAULT_FRAMES: 5,
  PIN_COUNT: 10, TRICK_BONUS: 5, NARROW_CHANCE: 0.4,
});

export const LANE = Object.freeze({
  LENGTH: 18.0, WIDTH: 1.05, NARROW_SCALE: 0.72, PITCH: 4.0,
  GUTTER_WIDTH: 0.24, GUTTER_DEPTH: 0.09, BALL_RADIUS: 0.108,
  PIN: Object.freeze({ HEIGHT: 0.38, RADIUS: 0.06, MASS: 1.4 }),
  PIN_SPACING: 0.30, PIN_ROW_DEPTH: 0.26, HEADPIN_Z: -16.5, RELEASE_MAX_FORWARD: 1.2,
  RELEASE_BACK: 1.15, RELEASE_MIN: 0.06,
});

export const PHYSICS = Object.freeze({
  GRAVITY: -9.81, SPEED_MIN: 8, SPEED_MAX: 17, ANGLE_MAX: 0.15,
  SPIN_OMEGA_MAX: 30, HOOK_ACCEL: 1.8, JITTER_FACTOR: 0.035,
  SETTLE_LINVEL: 0.08, SETTLE_ANGVEL: 0.2, SETTLE_HOLD_MS: 500, SETTLE_TIMEOUT_MS: 8000,
  PIN_DOWN_TILT_DEG: 50, PIN_DOWN_DISPLACEMENT: 0.25,
});

export const TIMING = Object.freeze({
  INTRO_MS: 3000, ROUND_BANNER_MS: 2500, SCORED_MS: 4000,
  NEXT_TURN_FLY_MS: 1200, PIN_CAM_HOLD_MS: 1600, LEADERBOARD_BEAT_MS: 1200,
  REPLAY_SPEED: 0.35, REPLAY_MAX_MS: 5000, EMOTE_COOLDOWN_MS: 3000, AIM_THROTTLE_MS: 100,
  ASSET_TIMEOUT_MS: 6000,
});

export const CDN = Object.freeze({
  THREE: "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
  THREE_ADDONS: "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/",
  RAPIER: "https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.12.0/rapier.es.js",
  QRCODE: "https://cdn.jsdelivr.net/gh/davidshimjs/qrcodejs@master/qrcode.min.js",
  FONT: "https://fonts.googleapis.com/css2?family=Fredoka:wght@400..700&display=swap",
});

export const ASSETS = Object.freeze({
  GLB: Object.freeze({
    pin: "https://cdn.jsdelivr.net/gh/mgiuca/two-hands@main/meshes/bowling-pin.glb",
    ball: "https://cdn.jsdelivr.net/gh/mgiuca/two-hands@main/meshes/bowling-ball.glb",
    lane: null,
  }),
  SFX: Object.freeze({
    roll: "https://assets.mixkit.co/active_storage/sfx/2094/2094-preview.mp3",
    pinsCrash: "https://assets.mixkit.co/active_storage/sfx/3136/3136-preview.mp3",
    pinSingle: "https://assets.mixkit.co/active_storage/sfx/2182/2182-preview.mp3",
    gutter: "https://assets.mixkit.co/active_storage/sfx/1296/1296-preview.mp3",
    strike: "https://assets.mixkit.co/active_storage/sfx/226/226-preview.mp3",
    spare: "https://assets.mixkit.co/active_storage/sfx/2015/2015-preview.mp3",
    ui: "https://assets.mixkit.co/active_storage/sfx/2364/2364-preview.mp3",
    emote: "https://assets.mixkit.co/active_storage/sfx/600/600-preview.mp3",
    ding: "https://assets.mixkit.co/active_storage/sfx/600/600-preview.mp3",
    clap: "https://assets.mixkit.co/active_storage/sfx/478/478-preview.mp3",
    joy: "https://assets.mixkit.co/active_storage/sfx/424/424-preview.mp3",
    wow: "https://assets.mixkit.co/active_storage/sfx/967/967-preview.mp3",
    cry: "https://assets.mixkit.co/active_storage/sfx/744/744-preview.mp3",
    fire: "https://assets.mixkit.co/active_storage/sfx/1345/1345-preview.mp3",
    skull: "https://assets.mixkit.co/active_storage/sfx/2630/2630-preview.mp3",
    clown: "https://assets.mixkit.co/active_storage/sfx/715/715-preview.mp3",
    bowling: "https://assets.mixkit.co/active_storage/sfx/563/563-preview.mp3",
  }),
  MUSIC: Object.freeze([
    "assets/music/additionalmusic.mp3",
    "https://assets.mixkit.co/music/25/25.mp3",
    "https://assets.mixkit.co/music/16/16.mp3",
    "https://assets.mixkit.co/music/1147/1147.mp3",
  ]),
});
