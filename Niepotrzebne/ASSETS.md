# Gzowo Bowling — Verified Asset URLs

All URLs curl-verified 2026-07-03: HTTP 200, correct content-type, size checked.

## Sounds + Music (Mixkit — free license, no attribution required, OK for games/apps)

```js
const SOUND_URLS = {
  roll:     "https://assets.mixkit.co/active_storage/sfx/2094/2094-preview.mp3", // Skateboard indoors (rolling rumble) 76KB
  crash:    "https://assets.mixkit.co/active_storage/sfx/3136/3136-preview.mp3", // Wood plank dominoes fall (big pin crash) 59KB
  pinFall:  "https://assets.mixkit.co/active_storage/sfx/2182/2182-preview.mp3", // Wood hard hit (single pin) 12KB
  gutter:   "https://assets.mixkit.co/active_storage/sfx/1296/1296-preview.mp3", // Thunder deep rumble (gutter fail) 567KB
  strike:   "https://assets.mixkit.co/active_storage/sfx/226/226-preview.mp3",   // Medieval show fanfare announcement 260KB
  spare:    "https://assets.mixkit.co/active_storage/sfx/2015/2015-preview.mp3", // Winning chimes 84KB
  uiTap:    "https://assets.mixkit.co/active_storage/sfx/2364/2364-preview.mp3", // Hard pop click 39KB
  ding:     "https://assets.mixkit.co/active_storage/sfx/600/600-preview.mp3",   // Achievement bell 62KB
  applause: "https://assets.mixkit.co/active_storage/sfx/478/478-preview.mp3",   // Ending show audience clapping 802KB
  laugh:    "https://assets.mixkit.co/active_storage/sfx/424/424-preview.mp3",   // Crowd laugh 127KB
  wow:      "https://assets.mixkit.co/active_storage/sfx/967/967-preview.mp3",   // Cartoon surprise gasp 37KB
  cry:      "https://assets.mixkit.co/active_storage/sfx/744/744-preview.mp3",   // Trombone disappoint (sad trombone) 87KB
  fire:     "https://assets.mixkit.co/active_storage/sfx/1345/1345-preview.mp3", // Short fire whoosh 95KB
  skull:    "https://assets.mixkit.co/active_storage/sfx/2630/2630-preview.mp3", // Terror sweep of darkness (spooky) 212KB
  clown:    "https://assets.mixkit.co/active_storage/sfx/715/715-preview.mp3",   // Clown horn at circus 31KB
  drum:     "https://assets.mixkit.co/active_storage/sfx/563/563-preview.mp3",   // Drum deep impact 139KB
  music: [
    "https://assets.mixkit.co/music/25/25.mp3",     // "Recline and Chill" (chill) 4.8MB
    "https://assets.mixkit.co/music/16/16.mp3",     // "Just Chill" (chill/lo-fi) 4.0MB
    "https://assets.mixkit.co/music/1147/1147.mp3", // "Midnight Funk" (funky) 3.4MB
  ],
};
```

Extra verified alternates (also 200 audio/mpeg):
- big crash alt: `https://assets.mixkit.co/active_storage/sfx/2958/2958-preview.mp3` (Collapsing structure, 186KB)
- strike cheer alt: `https://assets.mixkit.co/active_storage/sfx/462/462-preview.mp3` (Huge crowd cheering victory, 311KB)
- roll alt: `https://assets.mixkit.co/active_storage/sfx/2071/2071-preview.mp3` (Casino roulette ball rolling, 330KB)
- music alts: `https://assets.mixkit.co/music/494/494.mp3` (Chill Bro, 3.2MB), `https://assets.mixkit.co/music/1140/1140.mp3` (Funkee Monkeee, 3.1MB)

## 3D Models (.glb, CORS via jsDelivr)

```js
const MODEL_URLS = {
  pin:  "https://cdn.jsdelivr.net/gh/mgiuca/two-hands@main/meshes/bowling-pin.glb",  // 70KB, model/gltf-binary
  ball: "https://cdn.jsdelivr.net/gh/mgiuca/two-hands@main/meshes/bowling-ball.glb", // 397KB, model/gltf-binary
};
```

raw.githubusercontent mirrors (also verified 200):
- `https://raw.githubusercontent.com/mgiuca/two-hands/main/meshes/bowling-pin.glb`
- `https://raw.githubusercontent.com/mgiuca/two-hands/main/meshes/bowling-ball.glb`

## Licenses
- **Mixkit** (all SFX + music): Mixkit Free License — free for commercial/non-commercial use in apps and games, no attribution required. Not CC0 but royalty-free with broad game-use grant.
- **Models**: repo `mgiuca/two-hands` is MIT-licensed (whole repo incl. meshes). If strict CC0 is required, use the game's procedural fallbacks instead.

## Verification method
`curl -s -o /dev/null -w "%{http_code} %{content_type} %{size_download}" -L --max-time 12 URL` — every URL above returned HTTP 200 with `audio/mpeg` or `model/gltf-binary`/`application/octet-stream` and passed size thresholds (>10KB sfx, >300KB music... note: pinFall is 12KB, crash 59KB — short clips, fine).
