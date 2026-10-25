# Maranza Simulator — Piano dell'alpha

Riferimenti: `ALPHA-PROMPT.md` (brief), `docs/GDD.md` (specifica), `data/game-data.json` (numeri),
`sim/maranza_sim.py` (implementazione di riferimento). Domande e decisioni: `docs/DOMANDE.md` e
`docs/RISPOSTE.md`.

## Principi

* **Motore puro** in `src/engine/`: nessun import di React/DOM, nessun `Math.random`, nessuna costante di
  bilanciamento. Tutti i numeri arrivano da `data/game-data.json`, importato e tipizzato in `src/data/`.
* **Un'unica porta d'ingresso**: `applica(stato, comando) → { stato, esiti[] }`, pura e deterministica.
  Lo stato e' JSON puro (niente `Set`/`Map`/classi) e contiene i generatori casuali, cosi' si salva, si
  esporta e un domani si rigioca lato server.
* **Comandi**: `AZIONE {id, t}`, `DORMI {cibo}`, `DIFESA {scelta}`, `SCELTA_EVENTO {opzione}`,
  `COMPRA {item}` come da brief, piu' `PASSA` (slot senza niente da fare, giorni di galera e ospedale).
  La partita nasce da `nuovaPartita(nome, classe, seme)`.
* **Port 1:1 del simulatore, partita per partita.** L'RNG del motore e' lo stesso di Python (Mersenne
  Twister seminato come CPython, con `random`, `uniform`, `randint`, `choice`, `choices` che consumano i
  numeri nello stesso modo; potenze e medie arrotondate come CPython). Ogni metodo di `Gioco` ha la sua
  controparte TS con lo stesso nome e lo stesso ordine di operazioni e di estrazioni. Con lo stesso seme
  e le stesse scelte il motore TS gioca **la stessa partita** del simulatore: l'harness della fase 3 deve
  stampare un batch identico a `sim/results/batch_finale.txt`, non solo mediane vicine.
* **Condizioni del giorno su un secondo generatore** (scelta di Mich, 25/10): seme della partita +
  `COND_SEME_OFFSET`, sia nel simulatore sia nel motore. Cosi' la condizione di domani e' gia' nota la
  sera (teaser) senza cambiare l'ordine degli altri numeri.
* **Differenza strutturale col simulatore**: nel Python le scelte (difesa, guai, cibo, acquisti, azione)
  le fa la policy *dentro* il motore. Nel gioco diventano **richieste in sospeso** nello stato
  (`stato.attesa = {tipo: "TRIBUNALE" | "EVENTO", ...}`) che il comando successivo risolve. Le policy
  della fase 3 sono "giocatori" che inviano comandi come la UI.
* **Testi** solo in `src/data/testi.ts`; **UI** mostra parole/icone/colori, i numeri solo dietro il (?).

## Come lavoro sulla cartella e sul repo

* Repo pubblico `vb-mich/MaranzaSimulator` (AGPL); la cartella `B:\GAMES\MaranzaSimulator` ha `origin`
  su GitHub. `.env` non va mai in git.
* La sandbox che vede la cartella non raggiunge npm: `npm ci`, test e harness girano nel mio spazio in
  cloud, dove faccio i commit (autore Mich, co-autore Claude, messaggi in italiano) e il push su `main`.
  Poi copio i file nella cartella e allineo il suo git (fetch da un bundle + `reset --mixed`), cosi'
  `git status` sul tuo PC resta pulito.
* `package-lock.json` e' nel repo e contiene i binari Windows (rolldown, lightningcss, Tailwind oxide,
  TypeScript nativo): sul tuo PC bastano `npm ci` e `npm run dev`.
* **Demo pubblica su GitHub Pages**: `.github/workflows/pages.yml` a ogni push su `main` fa `npm ci`,
  `npm test`, `npm run build` con `BASE_PATH=/MaranzaSimulator/` e pubblica `dist/`. Va attivato una
  volta in Settings → Pages → Source: *GitHub Actions*. La PWA (fase 7) usa la stessa base e lo stesso
  scope. `.github/workflows/test.yml` fa test e build sugli altri branch e sulle pull request.
* **Lavoro in parallelo** (richiesta di Mich, 25/10): la grafica (fase 6) va avanti subito in un thread
  separato sul suo branch, generando dal PC di Mich; la UI (fasi 4–5) parte in un altro thread appena la
  fase 1 e' su `main` e si unisce solo dopo l'harness verde. Dentro questo thread uso piu' agenti per le
  parti indipendenti (costanti del simulatore, testi, policy dell'harness).

## Struttura

```
data/game-data.json        (generato, non si tocca)
src/data/   gameData.ts (import + tipi), testi.ts
src/engine/ rng.ts, pymath.ts, calendario.ts, tipi.ts, motore.ts, query.ts, index.ts
src/save/   SaveAdapter.ts, localStorageAdapter.ts, exportImport.ts
src/ui/     App.tsx, context/, schermate/, componenti/ (Tooltip(?), PallinoRischio, BarraRep…)
scripts/    autoplay.ts (+ autoplay-worker.mjs), policy.ts (prudente, bilanciato, yolo, casuale), pyformat.ts
tests/      *.test.ts (vitest), fixtures/ (numeri e tracce generati da Python)
public/     icone PWA, art/ (WebP ottimizzati dal thread grafica)
assets/art/ PNG sorgente + manifest.json (thread grafica)
```

## Fasi

### Fase 0 — Preparazione (fatta)
* Letti GDD, dati, simulatore; skill `generate-image` installata; `git init`, primo commit.
* Domande in `DOMANDE.md`, risposte di Mich in `RISPOSTE.md` (simulatore corretto, dati e GDD rigenerati).

### Fase 1 — Scaffold e motore base
* Vite + React + TS + Tailwind + vitest + `vite-plugin-pwa` (installato, configurato in fase 7);
  `package-lock.json`; workflow GitHub Pages e test.
* Costanti ancora scritte nel codice del simulatore portate in `game-data.json` via `export_data.py`,
  con il batch identico byte per byte (cosi' il motore TS non ha numeri propri).
* Secondo generatore per le condizioni nel simulatore; `batch_finale.txt` rigenerato.
* `src/data/gameData.ts`: tipi ricavati direttamente da `game-data.json` (seguono il file quando lo si
  rigenera).
* `rng.ts` + `pymath.ts` con test sui numeri prodotti da CPython.
* Stato, comandi, esiti; `nuovaPartita`, `applica`, azioni, sonno (con dormita d'ufficio), cambio giorno,
  mantenimento, energia, galera/ospedale come giorni da far passare.
* Test: RNG e matematica identici a Python, determinismo, JSON andata/ritorno, slot/trasferta/sonno.
* **Verifica su Windows**: `npm ci && npm run dev` nella cartella.
* **Commit**: "Fase 1: scaffold, dati tipizzati, RNG e motore base". Poi parte il thread UI.

### Fase 2 — Motore completo
* Rischi con tutti i modificatori, bottino, rep (decadimento, rendimenti decrescenti, noia), zona calda,
  tribunale con le cinque difese, galera, ospedale, salute, negozio, abilita' delle sei classi,
  condizioni/feste con teaser, 16 guai (5 con scelta), fine partita e MARANZA POINTS.
* Tutorial: esiti `BOSS` alla prima volta di ogni cosa (GDD §Tutorial) e agli sblocchi di tier.
* Funzioni di sola lettura per UI e harness (`disponibile`, `rischi`, bottino atteso, patrimonio…).
* **Confronto passo per passo col simulatore**: una versione strumentata del Python scrive lo stato dopo
  ogni comando; il test rigioca le stesse scelte nel motore TS e confronta campo per campo.
* **Commit**: "Fase 2: motore completo".

### Fase 3 — Harness di verifica (cancello prima di unire la UI)
* `scripts/autoplay.ts`: 200 partite per classe × policy `prudente`, `bilanciato`, `yolo`, `casuale`,
  port della sezione `POLICY` del simulatore; stampa la stessa tabella di `batch_finale.txt`.
* Accettazione: **output identico** a `batch_finale.txt`. Il criterio del brief (casuale ≥ 85%, mediane
  di patrimonio/rep/galera entro ±25%, ±10 giorni per la galera sotto 40, anche per `yolo`) resta come
  controllo, ma con lo stesso RNG ogni differenza e' un bug del port.
* **Commit**: "Fase 3: harness autoplay, motore verificato contro il simulatore".

### Fase 4 — UI base (390px prima di tutto) — thread UI
* Schermata iniziale (Nuova partita / Continua), creazione personaggio (nome + 6 card classe),
  schermata principale (ritratto, HUD, data/slot/condizione, azioni disponibili con pallino, fulmini,
  €/€€/€€€, slider a tre tacche, Dormi con scelta cibo, Negozio), card esito a schermo intero.
* Componente `(?)` unico (tap su mobile, click/hover su desktop) con i contenuti della tabella GDD
  §Interfaccia; grafica placeholder; salvataggio automatico.
* Fine fase: **una settimana intera giocabile da telefono a 390px** (primo playtest di Mich).
* **Commit**: "Fase 4: UI mobile-first di base".

### Fase 5 — UI completa — thread UI
* Tribunale (d100 che gira), Galera/Ospedale (contatore, diario, avanzamento automatico interrompibile),
  guai con scelte, teaser "Domani: …", Negozio + inventario, chat del Boss, Fine partita (punti
  abbreviati, riepilogo, classifica locale, "Nuova run").
* **Commit**: "Fase 5: tribunale, galera, eventi, negozio, chat del Boss, fine partita".

### Fase 6 — Grafica — thread grafica, in corso in parallelo
* Batch `tools/jobs/alpha-assets.json` (6 ritratti `high`, resto `medium`), un layer per capo
  (cappello, tuta, catena, orologio) con ancore per classe in `assets/art/manifest.json`, WebP in
  `public/art/`. Merge e aggancio alla UI da parte mia.
* **Commit**: "Fase 6: grafica dell'alpha".

### Fase 7 — PWA e rifinitura
* `vite-plugin-pwa` (base `/MaranzaSimulator/`), manifest, icone, splash, cache offline di app + dati +
  grafica; export/import del salvataggio; rifinitura; `README.md`.
* **Commit**: "Fase 7: PWA, salvataggi e README".

## Dopo ogni fase
`npm test`, l'harness se il motore e' cambiato, aggiornamento della sezione "Stato" qui sotto.

## Stato
| Fase | Stato | Note |
|---|---|---|
| 0 | fatta | domande chiuse in `RISPOSTE.md` |
| 1 | fatta | il port del motore e' gia' completo: 312 partite del simulatore (6 classi × 4 policy × 13 semi) rigiocate nel motore TS identiche passo per passo (`tests/tracce.test.ts`, seme 0 in `npm test`, altri con `TRACCE_SEMI`). Le policy e l'harness sono gia' scritti. |
| 2 | da fare | resta il tutorial del Boss (esiti `BOSS`, sblocchi di tier) e le query mancanti per la UI |
| 3 | da fare | |
| 4–5, 7 | da fare | |
| 6 | in corso | grafica pronta sul branch `claude/project-thread-3yj1pf` (92 immagini, WebP, manifest), stile B in attesa di conferma; la unisco io in fase 6 |
