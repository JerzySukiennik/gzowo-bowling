# GZOWO BOWLING — SPECYFIKACJA (źródło prawdy)

Kompletna, działająca gra imprezowa "Gzowo Bowling" w kręgle typu Jackbox: jeden ekran "play" na TV (nikt na nim nie klika) plus telefony jako pady. Wszystkie poniższe funkcje są STAŁYMI elementami gry, nie opcjami.

JĘZYK: interfejs w dwóch językach — polski i angielski. Host wybiera jeden język w lobby; wybór dotyczy całego TV i WSZYSTKICH padów (tutorial, przyciski, komunikaty). Wszystkie teksty przez słownik i18n (pl/en). Teksty mają brzmieć naturalnie w każdym języku (nie jak z translatora — czasem inne słowa/idiomy po polsku i angielsku).

## ZASADA NADRZĘDNA
- Ekran play jest JEDYNYM symulatorem fizyki i źródłem prawdy. Kontrolery tylko wysyłają wejście i komendy oraz pokazują status. Zero rozjazdu fizyki między urządzeniami.
- ODPORNOŚĆ (twarda zasada): żaden nieudany ani martwy zasób (model, tekstura, HDRI, dźwięk, muzyka) nie może wywalić gry ani zostawić pustego ekranu. Zawsze timeout + fallback; fallback proceduralny ma wyglądać dobrze sam z siebie. Dźwięk/muzyka przy błędzie -> cisza, bez syntezy, bez crasha.
- WYDAJNOŚĆ: pełna fizyka tylko dla aktywnego toru (rzuca jeden gracz na raz); reszta torów statyczna. Instancing kręgli, usypianie ciał. Cel ok. 60 fps przy 6 torach.

## STACK I DEPLOY
- Czysty HTML/CSS/JS bez frameworka. ES modules z CDN: three, @dimforge/rapier3d-compat, Firebase v9+ (modular), biblioteka QR.
- BAZA: Firebase Realtime Database — TYLKO jako backend czasu rzeczywistego dla multiplayer.
- HOSTING: GitHub Pages (statyczne pliki), HTTPS.

## DESIGN SYSTEM (2D UI) — FRIENDLY / DZIECIĘCY
- Wesoło, przyjaźnie, dziecięco. Jasno, kolorowo.
- CZCIONKA: Fredoka (Google Fonts), jedna rodzina na wszystko. Nagłówki 600–700, treść 400–500. Duże i czytelne.
- PALETA: tło #FFF6E9 (ciepły krem); karty #FFFFFF, duże zaokrąglenia, miękki cień; tekst główny #2B2A4A; drugorzędny #6B6A85; primary #FF6B6B (koral), secondary #4CC9F0 (błękit), sukces #3DD68C, uwaga #FFD23F.
- KOLORY GRACZY (6): #FF5C7A, #FF9F1C, #FFD23F, #3DD68C, #4CC9F0, #9B5DE5. Kolor gracza -> tor, leaderboard, tabliczka (NIEZALEŻNY od koloru kuli).
- KSZTAŁTY: karty ~24px radius, przyciski ~18px, główne akcje pill ~999px, duże klikalne przyciski, miękkie cienie (0 10px 24px rgba(0,0,0,.12)) i/lub stackowy dolny cień (efekt 3D wciskania na tap).
- JUICE maksymalnie: każde tapnięcie i pojawienie elementu = DŹWIĘK + sprężynowy bounce (scale spring/overshoot). Liczby animowane licznikiem, słupki leaderboardu rosną sprężyście, elementy wskakują z przeskokiem, jiggle na hover/press.
- Ten sam styl na WSZYSTKICH ekranach: lobby, dołączanie, HUD, leaderboard, tabliczki, tutorial, menu hosta, ekran zwycięzcy, karta PNG.

## ROLE, ŁĄCZENIE, SYNC
- Role przez URL: ?role=display (lub domyślnie) = TV; ?role=controller&room=KOD = pad.
- Display tworzy pokój w RTDB (kod 4-literowy), renderuje QR (URL kontrolera z kodem) + duży kod. Telefon skanuje QR aparatem i wchodzi jako pad.
- RTDB rooms/{KOD}: meta (state lobby/playing/paused/finished, settings: language pl/en, frames, narrowLaneOn), players/{id} (nick, playerColor, ballColor, ballPattern, ballWeight, laneTheme, isHost, order, bumperOn, mulliganUsed, connected), game (currentPlayerId, currentFrameIndex, throwIndex, phase, cameraView, lastResult), input/{id} (aim x+forward, spin, throw power+angle+ts, mulligan flag), commands (pause/resume/skip/undo/newGame/quit/cameraCycle/emote/music), scores/{id} (frames + total).
- Display nasłuchuje input i commands, symuluje, zapisuje game/scores/meta. Aktywny gracz wysyła throw; display czyta ts, odpala JEDNĄ symulację, animuje, liczy przewrócone kręgle, aktualizuje wynik, przechodzi dalej. onDisconnect ustawia connected:false.

## DOŁĄCZANIE I LOBBY
- Gracze 1–6. Liczba padów = liczba torów. Dołączanie tylko w lobby (w trakcie gry zablokowane; spóźnialski czeka na następną grę).
- SOLO: działa od 1 gracza, pełna punktacja, normalna gra.
- Ekran dołączania na telefonie, po kolei: 1. Nick. 2. Personalizacja kuli z PODGLĄDEM 3D na żywo (obracalnym): kolor, wzór/tekstura, waga (rozmiaru NIE personalizujemy). 3. Wybór MOTYWU własnego toru: Klasyczny, Kosmos, Neon, Retro lata 70, Święta.
- Pierwszy telefon = HOST. Host w lobby ustawia: JĘZYK (pl/en — cały TV i wszystkie pady), liczbę rund (3/5/10, domyślnie 5), modyfikator "wąski tor", bumpery per gracz. Host klika Start.
- Kolor gracza przydzielany automatycznie z palety 6, NIEZALEŻNY od koloru kuli.

## STEROWANIE (pad)
- TUTORIAL: INTERAKTYWNY, krok po kroku, na każdym telefonie osobno, z możliwością skip. Automatycznie przy pierwszym dołączeniu: celowanie (przeciąganie), podkręcenie (suwak/dial), flick w górę = rzut, emotki, pomiń kolejkę, mulligan. TOGGLE w menu pada (włącz ponownie/zamknij w dowolnym momencie). W języku gry.
- RZUT: mini widok toru z góry. Przeciąganie krążka kuli lewo/prawo (x w szerokości linii) i lekko do przodu (forward, z limitem). Suwak/dial podkręcenia (-1..+1) ze strzałką podglądu. Flick w górę w strefie: długość/prędkość = moc, składowa pozioma = mikro-korekta kąta. Puszczenie wysyła throw.
- FIZYKA (Rapier), "do nauczenia, ale wybaczająca": bazowo prosto; spin = łuk; mały losowy impuls boczny; kręgle łatwo się przewracają — trudno spudłować przez przypadek, ale można. WAGA kuli WYRAŹNA i STRATEGICZNA: cięższa mocno zbija, mało odbija, trudniej podkręcić; lżejsza łatwo hookuje, słabiej zbija.
- HAPTICS: wibracja przy puszczeniu flicka, przy uderzeniu w kręgle, mocniej przy strike (navigator.vibrate).
- Każdy pad: przycisk CYKLU KAMERY [auto / za kulą / z boku / z góry] (wspólny widok TV), "Pomiń moją kolejkę" (aktywny tylko w swojej turze), EMOTKI.
- MULLIGAN: po nieudanym rzucie u aktywnego gracza przycisk "Mulligan" — raz na grę, powtarza rzut, potem znika.
- HOST: hamburger -> komendy z efektem NA TV: Pauza/Wznów, Pomiń kolejkę, Cofnij/Powtórz rzut (undo + ponowne ustawienie kręgli), Nowa gra, Zakończ grę. W trakcie: bumpery per gracz, sterowanie muzyką.

## ROZGRYWKA
- Do 2 rzutów na frame (strike kończy). Pełna punktacja bowlingowa: strike, spare, bonusy; OSTATNIA runda wg reguł 10. frame'a (strike/spare -> rzut bonusowy) niezależnie od liczby rund.
- Tura: gracz 1/tor 1, kamera na torze 1 -> po frame tween na kolejny tor -> po rundzie wszystkich następna runda, powrót na tor 1 -> po ostatniej rundzie ekran zwycięzcy.
- REMIS: sudden-death — dodatkowy frame, powtarzany aż ktoś wygra.
- KAMERA AUTO: aiming nisko za kulą -> jazda za kulą -> cut na pin-cam (rozrzut, ile spadło) -> beat na leaderboard -> przelot na kolejny tor. Wybór ręczny trzyma widok do zmiany lub następnej tury.
- LEADERBOARD zawsze na TV (panel boczny): sumy + bieżący frame, kolor gracza, podświetlenie aktywnego.
- TABLICZKA nad każdym torem: nick + kolor gracza + wynik.
- KORONA LIDERA: nad torem i tabliczką lidera korona + złoty blask, NA ŻYWO; przy remisie kilka koron. Czysto wizualne.
- TRICK SHOTS: auto-wykrywanie (rozbity trudny split, mocny hook -> strike, odbicie od bandy/bumpera) -> callout "TRICK SHOT!" + błysk + drobne punkty bonusowe.
- "WĄSKI TOR": jeśli włączony, NIEKTÓRE rundy losowo węższe (zapowiedziane na TV przed rundą).
- BUMPERY per gracz: fizyczne bandy w rynnach (lobby + w trakcie przez menu hosta).

## EKRAN ZWYCIĘZCY (KARTA PNG)
- Po ostatniej rundzie: trofeum + celebracja + pełny ranking + montaż najlepszego rzutu gry.
- KARTA: klientowo canvas -> PNG, styl design systemu. Zawiera: zwycięzcę, PEŁNY RANKING z wynikami, DATĘ + tytuł/branding, MINIATURKI KUL graczy (kolor + wzór) przy nazwiskach.
- Dystrybucja: QR na TV -> telefon pobiera obrazek; host ma przycisk "Udostępnij" (Web Share API / pobranie PNG). Bez serwera.

## STRIKE, REPLAY, EMOTKI, MUZYKA
- STRIKE: konfetti + fajerwerki + trzęsienie kamery. TURKEY (3 z rzędu) = większy wybuch. Bez świecących kręgli.
- REPLAY: auto po KAŻDYM strike — slow-mo z dramatycznej kamery. Na ekranie wyników montaż najlepszego rzutu. Host ma przycisk replay.
- EMOTKI: 8 sztuk (👏 😂 😮 😭 🔥 💀 🤡 🎳), każda z krótkim dźwiękiem, cooldown na spam, wyskakuje znad toru gracza na TV.
- MUZYKA: lo-fi/chill z darmowych pętli (CC0/royalty-free). Host: play/pauza/skip/głośność. DUCKING w trakcie rzutu. Błąd ładowania -> cisza.

## STYL 3D (CARTOONOWY) I ASSETY
- TOON, spójny z dziecięcym UI — jasne, nasycone kolory. HDRI może dawać miękkie światło.
- Modele: próbuj GLB z CC0 przez GLTFLoader z timeoutem ~6 s -> fallback proceduralny, też cartoonowy i ładny:
  kręgiel: LatheGeometry, biały + czerwone paski; kula: 3 otwory na palce, cukierkowy materiał wg koloru+wzoru gracza; tor: chunky, jasny, strzałki/kropki, rynny, pin deck, pit.
- MOTYWY TORÓW: Klasyczny / Kosmos / Neon / Retro 70s / Święta — per tor wg wyboru gracza: skybox/tło, oświetlenie, kolorystyka, detale. Różne motywy obok siebie OK.
- DŹWIĘKI: sample CC0 z bezpośrednich URL, odtwarzane przez new Audio(url), preload .load(). Zdarzenia: toczenie, rozbicie kręgli, pojedyncze upadki, rynna, strike, spare, UI, emotki. Błąd -> pomiń dźwięk.

## KRYTERIA KOŃCA
- QR działa na iOS i Android, także w różnych sieciach. Host = pierwszy pad, jego menu steruje TV.
- Nazwa gry: "Gzowo Bowling".
- Język pl/en zmienia cały interfejs TV i padów, łącznie z tutorialem.
- Solo (1 gracz) do 6 graczy.
- UI friendly/dziecięce; scena 3D cartoonowa.
- Korona lidera na żywo. Ekran zwycięzcy generuje kartę PNG (QR + Udostępnij hosta).
- Fizyka: lekko losowy rozrzut; waga wyraźna; trudno spudłować przypadkiem, ale można.
- Zero crasha przy martwym zasobie. ~60 fps przy 6 torach.

---

# INFRASTRUKTURA (FAKTY — NIE ZMIENIAĆ)

## Firebase (projekt gotowy, RTDB działa, reguły wdrożone: rooms/* read/write true)
```js
const firebaseConfig = {
  apiKey: "AIzaSyDFfGva2KVHVOVFdDHOwlN_Z2jlJlg_C6M",
  authDomain: "gzowo-bowling.firebaseapp.com",
  databaseURL: "https://gzowo-bowling-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "gzowo-bowling",
  storageBucket: "gzowo-bowling.firebasestorage.app",
  messagingSenderId: "322038374810",
  appId: "1:322038374810:web:8b8dc8fb0403923d70da23"
};
```
(Konfig web Firebase jest z definicji publiczny — bezpieczeństwo przez reguły RTDB. To nie secret.)

## CDN (zweryfikowane HTTP 200 — używać DOKŁADNIE tych)
- three: https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js
- GLTFLoader: https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/loaders/GLTFLoader.js (wymaga importmap "three")
- Rapier: https://cdn.jsdelivr.net/npm/@dimforge/rapier3d-compat@0.12.0/rapier.es.js (`import RAPIER from ...; await RAPIER.init()`)
- Firebase: https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js + firebase-database.js
- QR (global QRCode, UMD): https://cdn.jsdelivr.net/gh/davidshimjs/qrcodejs@master/qrcode.min.js
- Font: https://fonts.googleapis.com/css2?family=Fredoka:wght@400..700&display=swap

## Deploy
- Repo: https://github.com/JerzySukiennik/gzowo-bowling (main, Pages z root)
- Gra żyje w katalogu v1/ -> URL produkcyjny: https://jerzysukiennik.github.io/gzowo-bowling/v1/
- QR/URL-e budować z location.origin + location.pathname (względnie!), nigdy hardcode domeny.

## Struktura plików (v1/)
- index.html — jeden entry point, router po ?role= (display domyślnie / controller)
- css/style.css — design system + wszystkie style 2D
- js/config.js — firebaseConfig, stałe (kolory, motywy, wagi kul, wzory), URL-e assetów/dźwięków
- js/i18n.js — słownik pl/en + t(key), setLang
- js/net.js — warstwa Firebase (init, createRoom, joinRoom, listeners, write helpers, onDisconnect)
- js/controller/*.js — pad (join flow, ball preview 3D, tutorial, ekran rzutu, host menu, emotki)
- js/display/*.js — TV (scene, physics, themes, camera, game state machine, scoring, hud/leaderboard, effects, replay, audio, sharecard, main)
