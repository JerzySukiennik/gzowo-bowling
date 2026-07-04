# Gzowo Bowling — 20 pomysłów na nowości

Pomysły przefiltrowane pod **realne reużycie** (rzeczy, po które gracze sięgają CO PARTIĘ przez cały wieczór — nie gadżety na jeden raz). Wszystkie spełniają Twoje twarde ograniczenia:

- **Lokalne party, zero kont** — nic nie wymaga logowania ani zapisu między spotkaniami. Kosmetyki wybiera się w lobby, nie „odblokowuje" z czasem. Wszystko żyje w jednej sesji (RAM + obecny RTDB).
- **Minimalizm bazy** — czysta gra zostaje czysta. Chaos wchodzi jako **opt-in** (host włącza). Przy każdym pomyśle z chaosu masz **2 warianty**: `OPT-IN` (host włącza) i `RDZEŃ` (wplecione w każdą partię).
- **Ten stack** — three.js / Rapier / RTDB, bez builda, telefon = pad.

**Skala:** `reuse` = jak często realnie się tego używa (waga najwyższa), `fun` = sufit imprezowej beki, `effort` = ile roboty (**S** mała / **M** średnia / **L** duża).
**Kategorie:** 🌀 chaos · 🎨 kosmetyka · 🗣️ social · ⚙️ tryb/rdzeń.

---

## Moja rekomendacja (kolejność budowania)

Najpierw **fundament reużycia**, nie fajerwerki — bo bez niego wieczór to jedna partia, a nie pięć, i cała reszta nie ma kiedy zabłysnąć:

1. **Szybki Rewanż + Ostatnie Ustawienia** (#1, #4) — jedyny sposób, żeby druga i trzecia gra startowały w 2 sekundy bez klikania lobby od nowa. To one zamieniają „zagraliśmy raz" w „graliśmy do północy".
2. **Zakłady na żywo + Auto-MVP** (#2, #3) — angażują 5 osób czekających na swoją kolej i dają każdemu powód do gadania po grze. Największy zwrot z „social" przy małym koszcie.
3. **Kosmetyka codzienna: Smugi Kuli + Pakiety Dźwięków** (#8, #9) — widać/słychać je przy KAŻDYM rzucie, więc stają się podpisem gracza, a nie gadżetem.
4. **Chaos jako opt-in: Koło Fortuny + Va Banque** (#5, #6) — jeden silnik (Koło) = nieskończona różnorodność; Va Banque robi wydarzenie z jednego rzutu. Oba wyłącznie na przełącznik hosta, żeby minimalistyczna baza została nietknięta.

⭐ = mój top do zbudowania w pierwszej kolejności.

---

## Skrót (ranking 1–20)

| # | Pomysł | Kat | reuse | fun | effort | ⭐ |
|---|--------|-----|:---:|:---:|:---:|:---:|
| 1 | Szybki Rewanż | ⚙️ | 10 | 6 | S | ⭐ |
| 2 | Kto pierwszy? — Zakłady na żywo | 🗣️ | 10 | 8 | M | ⭐ |
| 3 | Auto-MVP i Odznaki Wieczoru | 🗣️ | 9 | 8 | M | ⭐ |
| 4 | Ostatnie Ustawienia (Sticky Lobby) | ⚙️ | 10 | 4 | S | ⭐ |
| 5 | Koło Fortuny | 🌀 | 9 | 9 | L | ⭐ |
| 6 | Podwójna Stawka — Va Banque | 🌀 | 8 | 9 | S | ⭐ |
| 7 | Karty Zaczepki (Trash-Talk) | 🗣️ | 9 | 8 | S | |
| 8 | Smugi Kuli (Ball Trails) | 🎨 | 9 | 7 | M | ⭐ |
| 9 | Pakiety Dźwięków (Sound Packs) | 🎨 | 8 | 8 | S | ⭐ |
| 10 | Kula-bomba | 🌀 | 7 | 9 | M | |
| 11 | Hype-metr Kanapy | 🗣️ | 8 | 8 | M | |
| 12 | Fory dla Malucha (Handicap) | ⚙️ | 8 | 5 | S | |
| 13 | Sabotaż: krzywy tor | 🌀 | 8 | 8 | M | |
| 14 | Klątwa Kanapy — Głosowanie na Ofiarę | 🌀 | 8 | 8 | M | |
| 15 | Skórki Pinów (Pin Skins) | 🎨 | 7 | 7 | M | |
| 16 | Seria! — Callouty na Fali | 🗣️ | 8 | 7 | S | |
| 17 | Kula-armata (potrójna) | 🌀 | 6 | 9 | M | |
| 18 | Bilans Wieczoru — Sesyjny H2H | 🗣️ | 8 | 6 | S | |
| 19 | Powtórka Kanapy — Oceń Rzut | 🗣️ | 7 | 7 | S | |
| 20 | Prognoza Pogromu — Typuj Zwycięzcę | 🗣️ | 6 | 6 | S | |

---

## Szczegóły

### ⭐ 1. Szybki Rewanż · ⚙️ tryb · reuse 10 · fun 6 · effort S
Po ostatniej klatce jeden wielki przycisk na TV i na telefonie hosta: **„Rewanż"** — te same osoby, kule, kolory i ustawienia, nowa gra w 2 sekundy. Kule jeszcze się turlają, a ktoś już wrzeszczy „jeszcze raz, odegram się!".
**Czemu się tego używa:** to DEFINICJA reużycia — zero przechodzenia przez lobby od nowa. Bez tego każda kolejna gra to mozolny setup i ekipa odpuszcza po jednej rundzie. Naciska się go co partię, całą noc.
**Robota:** trzymasz stan lobby w RAM sesji i resetujesz `scores`/`frames` w RTDB — jeden przycisk, zero nowego silnika UI.

### ⭐ 2. Kto pierwszy? — Zakłady na żywo · 🗣️ social · reuse 10 · fun 8 · effort M
Przed rzutem aktywnego gracza pozostałe pady dostają szybkie pytanko („Strike czy pudło?", „Ile pinów: 0–3, 4–7, 8–10?"). Tapasz, kula leci, TV od razu pokazuje kto zgadł — brawa albo jęk zawodu.
**Czemu się tego używa:** zamienia CUDZE rzuty w twoją grę — nikt nie odkłada telefonu czekając na kolej. Nowe pytanie przy KAŻDYM rzucie = setki mikro-momentów na partię. Lek na nudę widowni przy 5–6 graczach.
**Robota:** nowy stan turowy w RTDB (`bets/{playerId}`) + okno 3 s na padzie i rozliczenie po wyniku klatki — głównie sync i UI.

### ⭐ 3. Auto-MVP i Odznaki Wieczoru · 🗣️ social · reuse 9 · fun 8 · effort M
Ekran końcowy rozdaje śmieszne tytuły z REALNYCH statów tej gry: „Król Rynny" (najwięcej gutterów), „Rzeźnik" (najwięcej strike'ów), „Nerwus" (najdłużej celował), „Comeback Roku". Każdy dostaje jakiś medal, nawet ostatni.
**Czemu się tego używa:** nawet przegrany wychodzi z tytułem i powodem do rewanżu („nie chcę znowu być Królem Rynny"). Liczone z danych, które już masz (`scores`/`lastResult`), więc za każdym razem inne osoby i żarty — zero persystencji.
**Robota:** dokładasz zliczanie statów per gracz w trakcie gry (guttery, strike'i, czas celowania) i wyłonienie superlatywów na ekranie końcowym.

### ⭐ 4. Ostatnie Ustawienia (Sticky Lobby) · ⚙️ tryb · reuse 10 · fun 4 · effort S
Gra pamięta w tej sesji ostatnie lobby: nicki, kolory kul, wzory, motyw, długość, handicapy. „Nowa gra" domyślnie ładuje to samo, wystarczy potwierdzić.
**Czemu się tego używa:** powtarzanie setupu co grę to śmierć przez tysiąc kliknięć. Sticky settings w obrębie jednej sesji (bez kont) sprawia, że gra 2., 3., 4. są frictionless. Filar reużycia obok Rewanżu.
**Robota:** trzymasz obiekt lobby w RAM/RTDB sesji i wstrzykujesz jako domyślny stan przy „Nowa gra".

### ⭐ 5. Koło Fortuny · 🌀 chaos · reuse 9 · fun 9 · effort L
Raz na rundę host odpala na TV wielkie koło, które losuje efekt na następny rzut wszystkich — gigantyczne kręgle, kula-piórko, odwrócone sterowanie, wiatr. Nikt nie wie co wypadnie, pokój buczy jak w teleturnieju.
**Czemu się tego używa:** jeden przycisk = świeża niespodzianka co rundę, praktycznie nieskończona różnorodność z małej puli efektów. To SILNIK chaosu, który hostuje wszystkie inne twisty.
**Robota:** sam splash koła jest prosty, ale każdy efekt (grawitacja piórka, skala kręgli, wiatr w Rapierze) to osobna modyfikacja fizyki/inputu — budujesz je stopniowo.
- `OPT-IN` → Host włącza „Koło Fortuny"; pojawia się przycisk odpalenia koła raz na rundę, poza tym gra klasyczna i czysta.
- `RDZEŃ` → Koło kręci się automatycznie na starcie każdej rundy dla wszystkich — gra staje się z natury zwariowanym teleturniejem, gdzie klasyczny bowling to jeden z wylosowanych trybów.

### ⭐ 6. Podwójna Stawka — Va Banque · 🌀 chaos · reuse 8 · fun 9 · effort S
Raz na grę każdy gracz może przed WŁASNYM rzutem tapnąć „Va banque": strike liczy się podwójnie, ale gutter/pudło odejmuje punkty. TV krzyczy „BARTEK GRA VA BANQUE!" i cała kanapa wstrzymuje oddech.
**Czemu się tego używa:** robi z jednego zwykłego rzutu wydarzenie wieczoru. Limit raz-na-grę sprawia, że decyzja „kiedy" jest zawsze świeża — zawsze jest gracz z tyłu, który MUSI zaryzykować.
**Robota:** czysta warstwa punktacji + przycisk na padzie i baner na TV — zero zmian w fizyce, tylko mnożnik i flaga „użyte w tej grze".
- `OPT-IN` → Host włącza opcję; graczom pojawia się jednorazowy przycisk „Va banque" na turę, reszta punktacji klasyczna.
- `RDZEŃ` → Każdy strike domyślnie daje bonus, każdy gutter karę — całe punktowanie robi się bardziej hazardowe dla wszystkich, bez przycisku.

### 7. Karty Zaczepki (Trash-Talk) · 🗣️ social · reuse 9 · fun 8 · effort S
Rozszerzenie emotek: gdy NIE jest twoja kolej, pad daje gotowe tekściory-zaczepki („Za lekko!", „Modlę się za twoją rynnę", „Oglądam mistrza… nie ciebie"), które lecą jako dymek nad tabliczką celującego. Ofiara może odbić jedną kontrą.
**Czemu się tego używa:** kanalizuje naturalny couch trash-talk W grę i podkręca go. Gotowe teksty = zero pisania na telefonie, więc sięga się non-stop. Zestaw wybierany w lobby, więc co ekipa to inne beki.
**Robota:** bazuje na istniejącym systemie emotek — dokładasz pulę tekstów, targetowanie na gracza i dymek na TV.

### ⭐ 8. Smugi Kuli (Ball Trails) · 🎨 kosmetyka · reuse 9 · fun 7 · effort M
Wybierasz w lobby smugę, którą kula zostawia na torze: neonowa wstęga, ognisty ogon, tęcza, bąbelki, pixelowa smuga, gwiezdny pył.
**Czemu się tego używa:** smuga jest widoczna przy KAŻDYM rzucie, więc to nie jednorazowy gag tylko stała część tożsamości na torze. Ludzie dobierają ją pod kolor kuli i zmieniają co grę. Opcjonalna, więc czysta baza zostaje czysta.
**Robota:** trail w three.js (TrailRenderer albo particles wzdłuż toru kuli) + wybór w lobby i sync koloru.

### ⭐ 9. Pakiety Dźwięków (Sound Packs) · 🎨 kosmetyka · reuse 8 · fun 8 · effort S
Wybierasz w lobby zestaw dźwięków przy TWOICH rzutach: retro 8-bit, kreskówkowe „boing", odgłosy zwierząt, epicki chór na strike'a, bąki (klasyk dla dzieciaków).
**Czemu się tego używa:** dźwięk przypisany do gracza — pokój słyszy kto rzuca nie patrząc. Bąki i chór to gwarant śmiechu, a że każdy ma swój, nie nudzi się przez całą grę. Podpina się pod istniejący system audio z duckingiem.
**Robota:** masz już audio z duckingiem — dokładasz zestawy sampli i mapę gracz→pakiet, odtwarzasz per event (throw/hit/strike).

### 10. Kula-bomba · 🌀 chaos · reuse 7 · fun 9 · effort M
Kula „uzbrojona": po pierwszym uderzeniu w kręgiel eksploduje falą uderzeniową, która rozrzuca sąsiednie kręgle jak petarda. Nawet fatalny rzut w róg może zmieść pół zestawu.
**Czemu się tego używa:** zamienia beznadziejny rzut w loterię z szansą na spektakl — gracze CELUJĄ w brzegi, żeby wywołać wybuch. Odwraca normalną logikę bowlingu, układ leci inaczej za każdym razem.
**Robota:** impuls radialny w Rapierze na kręgle w promieniu przy kolizji + animacja fali.
- `OPT-IN` → Host włącza „Kule-bomby" jako losowy power-up wypadający graczom co kilka rzutów.
- `RDZEŃ` → Każda kula ma domyślnie lekki impuls wybuchu przy kontakcie — bowling z natury bardziej efekciarski i wysokopunktowy.

### 11. Hype-metr Kanapy · 🗣️ social · reuse 8 · fun 8 · effort M
Wspólny pasek na dole TV. Gdy ktoś celuje, wszyscy masują ekran pada (spam-tap), żeby nabić hype; przy pełnym pasku TV odpala głośniejsze „GZOWO! GZOWO!", mocniejsze konfetti i shake kamery na strike'u.
**Czemu się tego używa:** daje widzom fizyczne coś-do-roboty w cudzej turze i nagradza wspólny wrzask. Nabija się od zera co rzut — to rytuał, nie ficzer do kliknięcia raz.
**Robota:** agregujesz tapy z padów w RTDB (licznik z decayem) i mapujesz na pasek + wzmocnienie istniejących FX.

### 12. Fory dla Malucha (Handicap) · ⚙️ tryb · reuse 8 · fun 5 · effort S
Opcjonalny suwak handicapu per gracz w lobby: +X pkt startowe albo auto-bumpery tylko dla wybranych. Tata gra normalnie, 6-latek ma bandy i lekką premię.
**Czemu się tego używa:** bez wyrównania dla mieszanego wieku dziecko przegrywa 200:40 i drugi raz nie siada. Handicap sprawia, że rodzina gra RAZEM wielokrotnie. Bumpery już masz.
**Robota:** masz już per-player bumpery — dokładasz suwak w lobby i offset punktów startowych.

### 13. Sabotaż: krzywy tor · 🌀 chaos · reuse 8 · fun 8 · effort M
Karta sabotażu na telefonie, zagrywana na WROGA: jego tor przechyla się na bok jak pokład statku i kula sama zjeżdża w stronę rynny. Widać wyraźne pochylenie na TV.
**Czemu się tego używa:** bezpośrednia broń przeciw liderowi napędza couch-drama i zemsty. Sabotaż innych to najczęściej używany typ karty w grach imprezowych — zawsze jest kogo dorwać.
**Robota:** modyfikacja wektora grawitacji/nachylenia toru dla jednej tury ofiary w Rapierze + system kart na padzie i targetowanie gracza.
- `OPT-IN` → Host włącza talię sabotaży; graczom co jakiś czas wpadają karty do zagrania na wybraną ofiarę.
- `RDZEŃ` → Tor domyślnie ma losowe lekkie przechyły co rzut dla każdego — chaos wbudowany w każdą turę bez kart.

### 14. Klątwa Kanapy — Głosowanie na Ofiarę · 🌀 chaos · reuse 8 · fun 8 · effort M
Raz na rundę TV otwiera 10-sekundowe głosowanie: kanapa wybiera jednego gracza, na którego spada łagodna klątwa na następny rzut (odwrócone sterowanie, węższy widok, kula „na bani").
**Czemu się tego używa:** daje słabszym narzędzie, żeby zbić lidera, i wywołuje spisek „wszyscy na jednego". Wraca co rundę z inną ofiarą — powtarzalny rytuał, a jako opcja nie brudzi bazy.
**Robota:** system głosowania w RTDB (tally z padów) + zestaw łagodnych debuffów na jedną turę.
- `OPT-IN` → Host włącza „Klątwę Kanapy"; przed wyznaczonymi rundami pojawia się głosowanie na ofiarę.
- `RDZEŃ` → Po każdej rundzie automatycznie lider dostaje losowy debuff — gra sama trzyma balans, bez głosowania.

### 15. Skórki Pinów (Pin Skins) · 🎨 kosmetyka · reuse 7 · fun 7 · effort M
Piny zmieniają wygląd na całą planszę (wybór hosta lub głosowanie w lobby): pingwiny, puszki, duszki, bałwanki, mini-rakiety GSP, zęby. Padają i turlają się z własną osobowością.
**Czemu się tego używa:** piny widać przez całą grę i przy każdym zbiciu, więc skórka nadaje ton całej rozgrywce. Ekipa wybiera motyw pod okazję (Halloween = duszki, urodziny = tort).
**Robota:** podmiana meshy pinów w three.js (collidery zostają) + wybór w lobby; kilka modeli do przygotowania, fizyka bez zmian. *(Uwaga: w v1.3 kręgiel przechodzi na model GLB — ta mechanika ładnie się na to nakłada.)*

### 16. Seria! — Callouty na Fali · 🗣️ social · reuse 8 · fun 7 · effort S
TV śledzi serie w czasie rzeczywistym i głośno je ogłasza: „DUBEL!", „TRZY Z RZĘDU — W OGNIU!", a przy pudle po serii bezlitosne „…i seria pęka". Baner + dźwięk + płomienna korona nad tabliczką.
**Czemu się tego używa:** podbija napięcie akurat gdy komuś idzie — cała kanapa patrzy czy dowiezie. Buduje się na istniejącej detekcji strike'ów, odpala się naturalnie.
**Robota:** masz już detekcję strike'ów i koronę lidera — dokładasz licznik serii per gracz i banery/dźwięki na progach.

### 17. Kula-armata (potrójna) · 🌀 chaos · reuse 6 · fun 9 · effort M
Power-up: zamiast jednej kuli wystrzeliwujesz trzy naraz, wachlarzem. Na TV grad kul walących w kręgle jednocześnie — eksplozja punktów albo trzy rynny na raz.
**Czemu się tego używa:** maksymalny „loud moment" na sesję — gracze zachowują ją na komeback albo na czysty efekt. Zawsze robi wrażenie, bo układ trzech torów lotu za każdym razem inny.
**Robota:** spawnujesz trzy rigidbody kul z rozbieżnymi wektorami w Rapierze i sumujesz zbite piny.
- `OPT-IN` → Host włącza power-upy; „kula-armata" wpada jako rzadka karta na wielki moment.
- `RDZEŃ` → Każdy drugi rzut w klatce jest domyślnie potrójny — bowling staje się kanonadą, punktacja przeskalowana.

### 18. Bilans Wieczoru — Sesyjny H2H · 🗣️ social · reuse 8 · fun 6 · effort S
Między partiami TV trzyma tabelkę „kto ile partii wygrał dziś" i bilans starć par (Ola 2 – Piotrek 1). Przy starcie kolejnej gry przypomina: „Rewanż! Piotrek chce wyrównać".
**Czemu się tego używa:** skleja pojedyncze partie w wojnę na cały wieczór i daje powód do „jeszcze jednej". Wszystko w RAM jednej sesji (zero kont), a dokładnie to napędza serię gier. Świetnie działa z Rewanżem (#1).
**Robota:** prosty licznik wygranych i par H2H w stanie sesji — tabelka na ekranie międzygrowym.

### 19. Powtórka Kanapy — Oceń Rzut · 🗣️ social · reuse 7 · fun 7 · effort S
Zaraz po istniejącej slow-mo powtórce pady dostają 3 sekundy na wrzucenie oceny 1–10 albo emotki-werdyktu; TV pokazuje uśredniony „wynik sędziów" jak na skoczni: „6.2 — publiczność bezlitosna". Zgodne 10/10 = dodatkowy fajerwerk.
**Czemu się tego używa:** zamienia bierne oglądanie powtórki we wspólny osąd — każdy strike i każde żałosne pudło dostaje wyrok kanapy. Podpina się pod istniejący moment powtórki, wchodzi kilka razy na partię za darmo.
**Robota:** masz już slow-mo replay — dokładasz okno głosowania na padzie i uśrednienie ocen na TV.

### 20. Prognoza Pogromu — Typuj Zwycięzcę · 🗣️ social · reuse 6 · fun 6 · effort S
Po lobby, przed pierwszym rzutem, każdy pad typuje kto wygra CAŁĄ grę (może siebie = pewny siebie). Na ekranie końcowym TV odsłania kto miał nosa, a pewniacy typujący siebie i przegrani dostają osobny cringe-baner.
**Czemu się tego używa:** jeden typ na grę, ale wisi nad całą rozgrywką i puentuje finał drugą warstwą przechwałek. Tanie (jeden zapis na pada), generuje gadanie od startu do końca.
**Robota:** jeden zapis `prediction/{playerId}` na starcie i porównanie ze zwycięzcą na końcu.

---

*Wygenerowane w v1.3. Kod: nie ruszony — to lista do wyboru. Powiedz które wchodzą, a robię je w kolejnej wersji (`v1.4/` …).*
