# HANDOFF — Gzowo Bowling

Ten plik ma dać Ci (kolejnemu Claude'owi) pełny kontekst do dalszej pracy nad grą **Gzowo Bowling**.
Working directory jest ten sam co u poprzednika: `/Users/jurek/Downloads/Claude/Projects`. Projekt siedzi w podfolderze **`Gzowo Bowling/`**.

Przeczytaj ten plik w całości ZANIM zaczniesz cokolwiek zmieniać. Potem, zależnie od zadania, zajrzyj do `Niepotrzebne/SPEC.md` i `Niepotrzebne/CONTRACT.md` (szczegóły specyfikacji i kontraktu modułów).

---

## 0. Kim jest Jurek i jak z nim gadać

- Jurek (ur. 2012) — vibecoder: nie pisze kodu ręcznie, projektuje architekturę/logikę/design, kod robi AI. Rozumie co robi, ale pisania nie robi sam.
- Wartości: **minimalizm**, budowanie realnych działających rzeczy. Lubi soczyste, dopracowane UI.
- Komunikacja: **po polsku**, adaptacyjna długość (prosto = krótko), bez lania wody, bez zbędnych disclaimerów, bez „czy na pewno chcesz". Jak coś mówi — tego chce. Przy wadzie w pomyśle: **mów wprost i kontruj**, proponuj lepsze. Przy niejednoznacznym poleceniu: **pytaj, nie zgaduj** (lubi interaktywne pytania).
- Kod i komentarze **po angielsku**. UI gry dwujęzyczne pl/en.
- Global router jego pamięci ładuje się automatycznie z `~/.claude/CLAUDE.md`; vault jest w `~/Downloads/Claude/ClaudeMemory/`. Plik `projects/gzowo-bowling.md` w vaultcie to skrót tego handoffa — jak coś istotnego się zmieni w projekcie, zaktualizuj też tamten plik.

---

## 1. TL;DR — co to jest

Imprezowa gra w kręgle w stylu **Jackbox**: **TV = ekran gry** (renderuje wszystko, jest JEDYNYM symulatorem fizyki i źródłem prawdy), **telefony = pady** (dołączają przez QR, wysyłają tylko wejście i komendy). 1–6 graczy, działa też solo. Interfejs pl/en, host wybiera język w lobby (dotyczy całego TV i wszystkich padów).

- **Live:** https://jerzysukiennik.github.io/gzowo-bowling/ → przekierowuje do aktualnej wersji **`v1.2/`**
- **Repo:** https://github.com/JerzySukiennik/gzowo-bowling (publiczne, GitHub Pages z `main`/root)
- **Stack:** czysty HTML/CSS/JS, ES modules z CDN, ZERO builda/frameworka. three.js 0.160, @dimforge/rapier3d-compat 0.12 (fizyka, wasm), Firebase 10.12.2 (modular), qrcodejs, font Fredoka.

---

## 2. Infrastruktura (FAKTY — nie zmieniaj bez powodu)

### Firebase
Projekt `gzowo-bowling`, konto **gzowotesla@gmail.com**. Realtime Database w regionie **europe-west1**. Firebase służy WYŁĄCZNIE jako backend realtime dla multiplayera (nie hosting). Config web jest z definicji publiczny — bezpieczeństwo daje reguła RTDB, nie ukrywanie klucza. To NIE jest sekret.

```js
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDFfGva2KVHVOVFdDHOwlN_Z2jlJlg_C6M",
  authDomain: "gzowo-bowling.firebaseapp.com",
  databaseURL: "https://gzowo-bowling-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "gzowo-bowling",
  storageBucket: "gzowo-bowling.firebasestorage.app",
  messagingSenderId: "322038374810",
  appId: "1:322038374810:web:8b8dc8fb0403923d70da23",
};
```

**Reguły RTDB** (wdrożone): odczyt/zapis tylko pod `rooms/*`, reszta zablokowana.
```json
{ "rules": { ".read": false, ".write": false,
    "rooms": { "$room": { ".read": true, ".write": true } } } }
```
Masz dostęp do Firebase przez MCP (`mcp__plugin_firebase_firebase__*`, ładowane przez ToolSearch: `query: "firebase"`). CLI `firebase` też działa (`/usr/local/bin/firebase`, zalogowany).

### GitHub
Konto **JerzySukiennik**, `gh` CLI zalogowany. Repo publiczne, Pages włączone z gałęzi `main`, katalog root. Pages daje HTTPS (potrzebne do aparatu/QR na telefonach).

---

## 3. Workflow: git + wersjonowanie + deploy (WAŻNE — trzymaj się tego)

**Zasada wersjonowania (twarda):**
- Gra żyje w katalogu wersji: `v1/` → `v1.1/` → `v1.2/` → … → `v1.9/` → `v2/` → `v2.1/` … (każda następna wersja = **+0.1**).
- **Każdy folder wersji jest IMMUTABLE po stworzeniu.** NIGDY nie edytuj plików w istniejącym `vX.Y/`.
- **Każda zmiana, nawet mała = NOWY folder wersji.** Robisz to tak: `cp -R v1.1 v1.2`, usuwasz `.DS_Store`, pracujesz w `v1.2/`.
- Po skopiowaniu zaktualizuj redirect w **root `index.html`** (`/Users/jurek/Downloads/Claude/Projects/Gzowo Bowling/index.html`) tak, żeby wskazywał na nowy folder (`./v1.2/`, z zachowaniem `location.search`).

**Deploy:** GitHub Pages auto-buduje z `main` przy każdym pushu. Czyli **push = deploy**. Po skończonej zmianie: `git add -A` → `git commit` → `git push origin main`, potem zweryfikuj że nowe URL-e zwracają 200 (patrz niżej). Commit message po angielsku, zakończony `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`.

**Uwaga o uprawnieniach:** w ogólnym workflow Jurka „deploy tylko na jego komendę", ALE ten projekt od początku ma deploy jako obowiązkowe zakończenie każdej zmiany (Pages auto-deploy z pushu) — to ustalony, autoryzowany tryb dla TEGO repo. Jak masz wątpliwość co do dużej/nieodwracalnej zmiany — dopytaj. Skanuj kod pod sekrety przed commitem (jedyny „klucz" to publiczny firebase config — to nie sekret).

**Weryfikacja deployu** (podmień wersję):
```bash
until [ "$(curl -s -o /dev/null -w %{http_code} https://jerzysukiennik.github.io/gzowo-bowling/v1.2/index.html)" = "200" ]; do sleep 5; done
curl -s https://jerzysukiennik.github.io/gzowo-bowling/ | grep -o 'v1[.0-9]*/'   # redirect target
```

---

## 4. Architektura plików (`v1.2/` — aktualna)

```
v1.2/
  index.html            # jeden entry point; importmap three; router po ?role=display|controller&room=KOD; splash + karta błędu.
                         #   Font: Fredoka STATYCZNE wagi + latin-ext (poprawne polskie znaki), preconnect gstatic crossorigin
  css/style.css         # cały design system + wszystkie ekrany (TV i telefon). Bloki "v1.1 —"/"v1.2 —" dopisane na końcu.
                         #   Fonty telefonu = clamp()/vmin (skalują się do ekranu); fallback --font ma ui-rounded (SF Rounded, ma PL)
  js/
    config.js           # FIREBASE_CONFIG, PLAYER_COLORS, BALL_COLORS, BALL_PATTERNS, LANE_THEMES/THEME_CONFIG,
                         # ballWeightParams(w), BALL_WEIGHT_RANGE, EMOTES, GAME, LANE, PHYSICS, TIMING, CDN, ASSETS(SFX/MUSIC/GLB)
    i18n.js             # słownik pl/en (~164 klucze, SYMETRYCZNE) + t(key,vars), setLang, getLang, onLangChange, applyI18n
    net.js              # warstwa Firebase RTDB: initNet, createRoom, joinRoom, rejoin, watch, watchAdded, write, update, remove,
                         # sendCommand, sendEmote, setPresence/onDisconnect, controllerUrl, roomCode, myPlayerId, setNetErrorHandler
    shared/
      ball3d.js          # WSPÓLNY wygląd kuli — jedno źródło prawdy:
                         #   makeBallTexture(color,pattern) → equirect canvas na sferę
                         #   paintBallDisc(canvas,size,color,pattern,weight) → płaski dysk 2D (miniatury, puck, karta)
                         #   buildBall3D(THREE,{radius,color,pattern,weight,gradientMap}) → kula 3D z PRAWDZIWYMI wgłębieniami
                         #     na palce (wgnieciona+ściemniona geometria) + tabliczka numeru wagi
    controller/          # PAD (telefon): main.js (entry, routing widoków, join/rejoin, lobby, winner/canceled),
                         #   join.js (nick→kula→motyw), ballpreview.js (obracalny podgląd 3D), tutorial.js (interaktywny, live-i18n),
                         #   throwpad.js (mini tor z góry: drag aim, dial spin, flick), emotes.js, hostmenu.js, ui.js (helpery+sfx+sharecard wrapper)
    display/             # TV: main.js (boot, pokój, QR, listenery RTDB, pętla renderu, error-guard),
                         #   scene.js (three.js świat: tory, kręgle instanced, kula, aim ghost), themes.js (5 motywów torów),
                         #   physics.js (Rapier: fizyka TYLKO aktywnego toru, rzut+hook+jitter, detekcja przewróconych),
                         #   camera.js (auto sekwencja + tryby follow/side/top + shake), game.js (state machine + PEŁNA punktacja bowlingowa
                         #     + komendy + mulligan/undo + trick shoty + dogrywka + winner/cancel), hud.js (leaderboard, tabliczki+korony,
                         #     bannery, emotki, pauza (jednolite tło + tabela per-runda), ekran zwycięzcy/anulowania), effects.js (konfetti/fajerwerki/shake),
                         #     replay.js (nagrywanie+slow-mo powtórki), audio.js (SFX+muzyka+ducking), sharecard.js (PNG 1080x1350)
index.html (root)       # redirect do aktualnego vX.Y/ (teraz v1.1/), zachowuje ?query
README.md               # publiczne README gry
HANDOFF.md              # ten plik
Niepotrzebne/           # dokumentacja wewnętrzna (NIE serwowana): SPEC.md, CONTRACT.md, UIBRIEF.md, ASSETS.md, database.rules.json
```

---

## 5. Schemat RTDB — `rooms/{KOD}` (KOD = 4 wielkie litery)

Display tworzy pokój i jest JEDYNYM pisarzem `game`, `scores`, `meta.state/music/result`. Pady piszą tylko swoje `players/{id}`, `input/{id}`, oraz do kolejek `commands` i `emotes`.

```
meta:
  state: "lobby" | "playing" | "paused" | "finished"
  createdAt: <ts>
  hostId: <playerId pierwszego pada>
  settings: { language: "pl"|"en", frames: 3|5|10 (domyślnie 5), narrowLaneOn: bool }
  music:   { playing: bool, volume: 0..1, track: int }        # pisze display
  result:  <obiekt zwycięzcy> | { canceled: true, hostNick, date }   # pisze display na koniec

players/{id}:
  nick, playerColor (auto z palety 6, NIEZALEŻNY od koloru kuli),
  ballColor, ballPattern, ballWeight (NUMBER 5..15 — od v1.1; stare "light/medium/heavy" mapowane wstecznie),
  laneTheme ("classic"|"space"|"neon"|"retro"|"xmas"), isHost, order, bumperOn, mulliganUsed, connected, ready

game:                          # pisze display
  phase, currentPlayerId, currentFrameIndex, throwIndex, round, narrowRound, mulliganAvailable,
  rackMask,                    # (od v1.2) bitmaska stojących pinów aktywnego toru; pad renderuje DOKŁADNIE te piny (bit i = pin stoi)
  cameraView: { mode: "auto"|"follow"|"side"|"top", setBy, ts },
  suddenDeath: { active, round, playerIds } | null,
  lastResult: { playerId, frameIndex, throwIndex, pinsDown, pinsStanding, isStrike, isSpare, isGutter, trick, ts }

input/{id}:                    # pisze pad aktywnego gracza
  aim: { x: -1..1, forward: 0..1 }, spin: -1..1,
  throw: { power: 0..1, angle, ts },      # display czyta gdy ts > moment wejścia w fazę "aiming"
  mulligan: { ts }

commands/{pushId}:  { type, from, payload, ts }   # KOLEJKA push; display konsumuje (child_added) i od razu remove()
  # type ∈ newGame, pause, resume, skipTurn, undo, replay, quit, cameraCycle, bumper{playerId,on}, music{action,value}
  # display waliduje hosta po meta.hostId (poza skipTurn/cameraCycle które gracz może na sobie)

emotes/{pushId}:    { playerId, emote, ts }        # KOLEJKA push; display konsumuje i remove()

scores/{id}:                   # pisze display
  frames: [ { t: [pinfall,...], cum: int|null }, ... ],   # cum=null dopóki bonus nieznany
  total: int (z trickBonus), trickBonus: int, sd: [suma_dogrywki_per_runda]
```

---

## 6. Pętla rozgrywki (state machine w `display/game.js`)

Fazy: `lobby → intro → roundBanner → nextTurn → aiming → rolling → settling → scored → [replay] → nextTurn → … → (koniec rundy) roundBanner → … → gameOver`. Remis na końcu → `suddenDeathBanner` + dogrywka sudden-death (dodatkowe frame'y aż ktoś wygra). `paused` to nakładka na `meta.state`, nie faza.

- Do 2 rzutów na frame (strike kończy). Pełna punktacja bowlingowa: strike/spare/bonusy; OSTATNIA runda wg reguł 10. frame'a (strike/spare → rzut bonusowy) niezależnie od liczby rund. **Scoring już przetestowany na papierze przez reviewera — jest poprawny; nie ruszaj bez potrzeby.**
- Fizyka „do nauczenia, ale wybaczająca": trochę losowego rozrzutu, spin robi łuk, waga kuli ma WYRAŹNY wpływ (`ballWeightParams(w)` interpoluje masę/restitution/spinFactor/powerFactor po zakresie 5–15 lb). Trudno spudłować przypadkiem, ale można.
- Trick shoty auto-wykrywane (split, mocny hook→strike, odbicie od bandy) → callout + `trickBonus` +5.
- Kamera AUTO: aiming za kulą → jazda za kulą → cut na pin-cam → beat na leaderboard → przelot na kolejny tor. Ręczne tryby (side/top/follow) z pada trzymają widok; liczą dystans z FOV+aspect żeby cały tor był w kadrze.

---

## 7. Konwencje kodu (trzymaj się ich — spójność > sprytność)

- **Czysty HTML/CSS/JS, ES modules, bez frameworka, bez builda.** Identyfikatory i (jedyny) komentarz-nagłówek pliku po angielsku.
- **Bez komentarzy w kodzie** poza jednym krótkim nagłówkiem opisującym plik. Nigdy partial code — zawsze cały plik.
- **KAŻDY tekst widoczny dla użytkownika przez `t(key)`** z `i18n.js`. Zero hardcodowanych stringów UI (pl ani en). Teksty mają brzmieć naturalnie i figlarnie w obu językach — pisz je NIEZALEŻNIE, nie tłumacz słowo w słowo (część idiomów nie ma odpowiednika 1:1). Słownik trzymaj **symetryczny** (te same klucze w pl i en).
- **ODPORNOŚĆ (twarda zasada):** każdy zewnętrzny zasób (GLB, tekstura, HDRI, dźwięk, muzyka, font) ładowany za `Promise.race` z timeoutem + `try/catch` i proceduralnym fallbackiem, który sam z siebie wygląda dobrze. Błąd dźwięku/muzyki → **cisza** (nigdy synteza, nigdy crash). **Pusty ekran = bug.**
- **Wydajność:** pełna fizyka TYLKO aktywnego toru; instancing kręgli; usypianie ciał; cel ~60 fps przy 6 torach.
- **Względne URL-e:** QR i linki buduj z `location.origin + location.pathname`, nigdy nie hardkoduj domeny.
- **Design:** friendly/dziecięcy — Fredoka, tło `#FFF6E9`, żywe kolory, babelkowe kształty (radius 24/18/999), miękkie cienie, SOCZYSTE animacje sprężynowe + dźwięk na każdym tapnięciu. Kolory graczy (6): `#FF5C7A #FF9F1C #FFD23F #3DD68C #4CC9F0 #9B5DE5`. 3D w stylu cartoon/toon (jasne, nasycone). Szczegóły w `Niepotrzebne/UIBRIEF.md`.

---

## 8. Jak testować w tym harnessie (WAŻNE pułapki)

Testuj narzędziami `preview_*` (dev server + przeglądarka). Nigdy nie proś Jurka o ręczne sprawdzenie — weryfikuj sam i pokaż dowód (screenshot).

- **Odpal serwer:** jest config w `Projects/.claude/launch.json` o nazwie `gzowo-bowling` serwujący katalog `Gzowo Bowling` na porcie 8517. `preview_start` z tą nazwą. Potem nawiguj przez `preview_eval` na `http://localhost:8517/v1.2/?role=display` (TV) lub `...&role=controller&room=KOD` (pad).
- **Testuj małe telefony:** `preview_resize` na 320×640 (najostrzejszy przypadek na wystający tekst) i 375×812. Po zmianie CSS **przeładuj stronę** (`window.location.reload()`) — serwer statyczny nie ma hot-reload, `preview_eval` mierzy stary arkusz dopóki nie przeładujesz.
- **PUŁAPKA #1 — usypianie karty w tle:** gdy karta TV nie jest na wierzchu, przeglądarka throttluje `requestAnimationFrame`, więc **pętla gry przestaje tykać** (gra „zawiesza się" na `intro`). To artefakt harnessu, NIE bug (na prawdziwym TV ekran jest zawsze widoczny). `preview_screenshot` na moment budzi kartę. Żeby testować logikę TV nie walcząc z tym: albo szybko naprzemiennie screenshot→akcja, albo **wywołuj ścieżki renderujące bezpośrednio** przez `preview_eval`, np.:
  ```js
  const hud = await import('./js/display/hud.js');
  hud.setPauseOverlay(true, { players:[...], scores:{...}, framesTotal:5 });   // test wygaszacza pauzy
  hud.setLobbyVisible(true, { code:'ABCD', url:'...', players:{...}, settings:{...} }); // test lobby
  ```
- **PUŁAPKA #2 — cross-origin:** `preview_*` jest przypięty do lokalnego serwera; nawigacja `window.location.href` na `https://jerzysukiennik.github.io/...` bywa blokowana. Produkcję weryfikuj przez `curl` (kod HTTP + redirect), nie przez przeglądarkę podglądu. Lokalny `vX.Y/` to bajt-w-bajt te same pliki co na Pages.
- **Wstrzykiwanie fałszywych graczy/rzutów** (RTDB REST — pokój tworzy TV, kod odczytaj z DOM: `[...document.querySelectorAll('[class*=tile]')].map(e=>e.textContent.trim()).filter(t=>t.length===1).join('')`):
  ```bash
  DB=https://gzowo-bowling-default-rtdb.europe-west1.firebasedatabase.app/rooms/KOD
  curl -s -X PUT  "$DB/players/bot1.json" -d '{"nick":"Bot","playerColor":"#FF5C7A","ballColor":"#4CC9F0","ballPattern":"stripes","ballWeight":13,"laneTheme":"neon","isHost":true,"order":0,"bumperOn":false,"mulliganUsed":false,"connected":true,"ready":true}'
  curl -s -X PATCH "$DB/meta.json" -d '{"hostId":"bot1"}'
  curl -s -X POST  "$DB/commands.json" -d '{"type":"newGame","from":"bot1","payload":null,"ts":1700000000000}'
  # gdy game/phase == "aiming":
  curl -s -X PUT  "$DB/input/bot1/throw.json" -d '{"power":0.85,"angle":0,"ts":1700000000001}'
  ```
  **Sprzątaj pokoje testowe po sobie:** `curl -s -X DELETE "$DB/rooms/KOD.json"`.
- **Sprawdzenia statyczne przed commitem:**
  ```bash
  for f in $(find v1.X/js -name '*.js'); do node --check --input-type=module < "$f" || echo "FAIL $f"; done
  # + cross-check importów/exportów i symetrii i18n (poprzednik miał gotowe skrypty node -e, patrz historia)
  ```

---

## 9. Stan prac — co zrobione

**v1** (commit `7113766`) — pełna działająca gra: sieć+lobby+rozgrywka+punktacja, personalizacja kuli, 5 motywów torów, tutorial, emotki, mulligan, menu hosta, korona lidera, trick shoty, wąski tor, bumpery, powtórki po strike'ach, konfetti/fajerwerki, muzyka z duckingiem, karta PNG do udostępnienia, i18n pl/en. Backend Firebase + deploy na Pages.

**v1.1** (commit `83980bf`) — poprawki po feedbacku Jurka:
1. Prawdziwe 3D dziury na palce w kuli (wgnieciona+ściemniona geometria) + numer wagi; wspólny `shared/ball3d.js`.
2. Waga kuli 5–15 lb (suwak, prawdziwe funty) zamiast 3 poziomów; fizyka interpolowana.
3. QR w lobby zadokowany w osobnej kolumnie — nie nachodzi na karty graczy.
4. Kręgle proceduralne 3D (LatheGeometry + 3 collidery) na deku, nie sprite'y/przenikanie; usunięto GLB.
5. Ładniejszy tor: deski z usłojeniem, zaokrąglone rynny, szyny, rozbieg, strzałki.
6. Tabliczka + korona wyśrodkowane nad torem.
7. Wszystkie widoki kamery kadrują cały tor (dystans z FOV+aspect).
8. Host „Zakończ grę" → potwierdzenie → ekran „Gra anulowana" (TV + pady).
9. Pauza = pełnoekranowy wygaszacz (w v1.2 zmienione na jednolite tło — patrz niżej).
10. Bumpery jako zaokrąglone kapsuły, uniesione.
11. Tekstury kuli poprawione (mapowanie equirect: proste paski, czyste half & half).
12. Kontroler landscape-first (w v1.2 COFNIĘTE do pionu — patrz niżej).
13. Wyśrodkowane intro/join UI, dół ekranu zagospodarowany.

**v1.2** (commit `c701db6`, AKTUALNA) — kolejny feedback Jurka:
1. **Muzyka w tle gra ciągle** (chill lo-fi): auto-start uzbrojony w `initAudio` (wantMusic=true) + ponownie w `startGame`; realnie rusza przy pierwszym geście (autoplay policy). Host dalej pause/skip/volume. URL-e Mixkit zweryfikowane (200).
2. **UI telefonu skaluje się do ekranu:** tokeny fontu `--fs-*` przez `clamp()`/`vmin`; przyciski/chipy/segmenty nie przelewają tekstu na małych ekranach (test 320px). `.tv` nadal ma sztywne px.
3. **Emotki responsywne** (`flex:1 1 0`, `aspect-ratio:1`, `max-width`), glif wyśrodkowany (flex center + line-height:1). Tutorial + hamburger przeniesione do górnego paska, żeby pasek emotek miał całą szerokość.
4. **Font Fredoka pokazuje polskie znaki:** statyczne wagi `wght@400;500;600;700` + latin-ext + fallback `ui-rounded` (koniec z Arialem dla ą/ę/ł…).
5. **Kontroler znów pionowy** — strefa flicka „Machnij w górę" nie jest zasłonięta przyciskiem „Pomiń kolejkę". Usunięto `throw-grid`/`rotate-gate`/media landscape.
6. **Ekran pauzy: jednolite (nieprzezroczyste) tło** (`--bg`), wyśrodkowany nagłówek/tabela/stopka; powtórki w tle wyłączone (i tak niewidoczne). `tickPaused()` to no-op.
7. **Piny na padzie zgadzają się z 3D:** display pisze `game.rackMask`, pad renderuje dokładnie te piny (`setPins(mask)`), zamiast gasić pierwsze N.

---

## 10. Znane ograniczenia / pomysły na dalej (nie zlecone, do rozważenia)

- **Weryfikacja pełnej partii na żywo:** przez usypianie karty w harnessie (pkt 8) nie dało się przeklikać całej partii w jednym ciągu w podglądzie. Rdzeń (frame'y, punktacja, fizyka) potwierdzony osobno, ale warto zagrać realnie na TV+telefonach i wyłapać ewentualne zgrzyty przejść faz / kamery.
- **Muzyka i część SFX** to linki Mixkit — jak któryś padnie, kod degraduje do ciszy (zgodnie z zasadą), ale wygląd/dźwięk można podmienić na inne zweryfikowane CC0.
- **`meta.result` z kartą PNG:** karta generowana klientowo na padach i TV (pure canvas w `sharecard.js`), bez serwera. QR na ekranie zwycięzcy prowadzi do widoku share na padzie.
- Ewentualne kolejne życzenia Jurka → nowy folder wersji (`v1.2/` …) wg pkt 3.

---

## 11. Pliki referencyjne

- `Niepotrzebne/SPEC.md` — pełna specyfikacja gry (wszystkie funkcje jako STAŁE elementy).
- `Niepotrzebne/CONTRACT.md` — kontrakt techniczny: dokładny schemat RTDB, API modułów, state machine, zasady scoringu, lista kluczy i18n, kształt danych rzutu. **Najważniejszy dokument techniczny.**
- `Niepotrzebne/UIBRIEF.md` — biblia wizualna (tokeny CSS, animacje, layouty ekranów, layout karty PNG).
- `Niepotrzebne/ASSETS.md` — zweryfikowane URL-e dźwięków/muzyki/modeli + noty licencyjne.
- Vault Jurka: `~/Downloads/Claude/ClaudeMemory/projects/gzowo-bowling.md` (skrót tego handoffa; aktualizuj przy istotnych zmianach), oraz `core/` (identity, communication, stack) i `workflow/` (permissions, github-versioning) — ładowane automatycznie / na żądanie przez router `~/.claude/CLAUDE.md`.

Powodzenia. Trzymaj się wersjonowania (immutable foldery), i18n przez `t()`, odporności (timeout+fallback, cisza przy błędzie audio) i soczystego dziecięcego designu — to DNA tego projektu.
