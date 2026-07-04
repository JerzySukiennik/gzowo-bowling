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

export const BALL_WEIGHTS = Object.freeze({
  light: Object.freeze({ mass: 3.6, restitution: 0.25, spinFactor: 1.6, powerFactor: 0.85 }),
  medium: Object.freeze({ mass: 5.4, restitution: 0.12, spinFactor: 1.0, powerFactor: 1.0 }),
  heavy: Object.freeze({ mass: 7.2, restitution: 0.05, spinFactor: 0.5, powerFactor: 1.1 }),
});

export const LANE_THEMES = Object.freeze(["classic", "space", "neon", "retro", "xmas"]);

export const THEME_CONFIG = Object.freeze({
  classic: Object.freeze({
    icon: "🎳", sky: "#AEE1FF", horizon: "#FFF6E9", lane: "#E9BB80", laneEdge: "#C98F52",
    gutter: "#F1E3CA", backdrop: "#FFD9A8", accent: "#FF6B6B", emissive: null,
    ambientColor: "#FFF1DC", ambientIntensity: 0.9, keyColor: "#FFFFFF", keyIntensity: 1.1,
    fillColor: "#BDE3FF", fillIntensity: 0.35, stars: false, snow: false,
  }),
  space: Object.freeze({
    icon: "🪐", sky: "#070B2A", horizon: "#1B2260", lane: "#3A3F8F", laneEdge: "#23285F",
    gutter: "#14183F", backdrop: "#0B1035", accent: "#9B5DE5", emissive: "#4CC9F0",
    ambientColor: "#8FA0FF", ambientIntensity: 0.55, keyColor: "#CBD4FF", keyIntensity: 0.9,
    fillColor: "#4CC9F0", fillIntensity: 0.3, stars: true, snow: false,
  }),
  neon: Object.freeze({
    icon: "🌈", sky: "#0A0118", horizon: "#2A0B4A", lane: "#1D0F33", laneEdge: "#FF2E97",
    gutter: "#120826", backdrop: "#160530", accent: "#00F5D4", emissive: "#FF2E97",
    ambientColor: "#FF5CF0", ambientIntensity: 0.5, keyColor: "#7CF9FF", keyIntensity: 1.0,
    fillColor: "#00F5D4", fillIntensity: 0.45, stars: false, snow: false,
  }),
  retro: Object.freeze({
    icon: "🕺", sky: "#F7E1B5", horizon: "#E8A85C", lane: "#C97B3D", laneEdge: "#7A4A21",
    gutter: "#E7C795", backdrop: "#E0954C", accent: "#E76F51", emissive: null,
    ambientColor: "#FFDFAE", ambientIntensity: 0.85, keyColor: "#FFE9C7", keyIntensity: 1.0,
    fillColor: "#E76F51", fillIntensity: 0.3, stars: false, snow: false,
  }),
  xmas: Object.freeze({
    icon: "🎄", sky: "#0E2A4A", horizon: "#193D63", lane: "#B23A48", laneEdge: "#F4F7F9",
    gutter: "#0F3A2E", backdrop: "#12314F", accent: "#3DD68C", emissive: "#FFD23F",
    ambientColor: "#CFE8FF", ambientIntensity: 0.7, keyColor: "#FFF4D6", keyIntensity: 1.05,
    fillColor: "#3DD68C", fillIntensity: 0.3, stars: false, snow: true,
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
  PIN: Object.freeze({ HEIGHT: 0.38, RADIUS: 0.06, MASS: 1.0 }),
  PIN_SPACING: 0.30, PIN_ROW_DEPTH: 0.26, HEADPIN_Z: -16.5, RELEASE_MAX_FORWARD: 1.2,
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
    "https://assets.mixkit.co/music/25/25.mp3",
    "https://assets.mixkit.co/music/16/16.mp3",
    "https://assets.mixkit.co/music/1147/1147.mp3",
  ]),
});
