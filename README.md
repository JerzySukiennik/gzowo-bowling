# Gzowo Bowling 🎳

Imprezowa gra w kręgle w stylu Jackbox: **telewizor to ekran gry, telefony to pady**. Nikt nie klika na TV — telefon skanuje kod QR i steruje wszystkim.

**Graj teraz:** https://jerzysukiennik.github.io/gzowo-bowling/

## Jak grać

1. Otwórz link na TV (lub laptopie podpiętym do TV) — pojawi się kod QR i 4-literowy kod pokoju.
2. Każdy gracz skanuje QR telefonem (1–6 osób, działa też solo).
3. Pierwszy telefon zostaje **hostem** — wybiera język (PL/EN), liczbę rund (3/5/10), wąski tor i bumpery.
4. Celujesz przeciągnięciem, podkręcasz pokrętłem, rzucasz flickiem w górę. Reszta dzieje się na TV.

## Funkcje

- Pełna punktacja bowlingowa (strike/spare/bonusy, reguły 10. frame'a, dogrywka sudden-death)
- Fizyka 3D (Rapier) — waga kuli ma znaczenie, spin robi łuk
- Personalizacja kuli (kolor, wzór, waga) z podglądem 3D + 5 motywów toru (Klasyczny, Kosmos, Neon, Retro '70s, Święta)
- Interaktywny tutorial na każdym padzie, emotki, mulligan, korona lidera na żywo
- Powtórki slow-mo po strike'ach, trick shoty, konfetti i fajerwerki
- Muzyka lo-fi sterowana przez hosta, karta wyniku PNG do udostępnienia po grze
- Dwa języki: polski i angielski

## Stack

Czysty HTML/CSS/JS (ES modules, bez frameworka i bez builda): [three.js](https://threejs.org), [Rapier](https://rapier.rs), Firebase Realtime Database (sync w czasie rzeczywistym), GitHub Pages (hosting).

Aktualna wersja: [v1/](v1/)

## Assety

Dźwięki i muzyka: [Mixkit](https://mixkit.co) (Mixkit Free License). Modele 3D: fallbacki proceduralne + opcjonalne GLB (MIT). Font: [Fredoka](https://fonts.google.com/specimen/Fredoka) (OFL).
