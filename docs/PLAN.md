# Maranza Simulator — Piano dell'alpha

Riferimenti: `ALPHA-PROMPT.md` (brief), `docs/GDD.md` (specifica), `data/game-data.json` (numeri),
`sim/maranza_sim.py` (implementazione di riferimento). Le domande aperte sono in `docs/DOMANDE.md`.

## Principi

* **Motore puro** in `src/engine/`: nessun import di React/DOM, nessun `Math.random`, nessuna costante di
  bilanciamento. Tutti i numeri arrivano da `data/game-data.json`, importato e tipizzato in `src/data/`.
* **Un'unica porta d'ingresso**: `applica(stato, comando) → { stato, esiti[] }`, pura e deterministica.
  Lo stato e' JSON puro (niente `Set`/`Map`/classi) e contiene il seme dell'RNG (`mulberry32`), cosi' si
  salva, si esporta e un domani si rigioca lato server.
* **Port 1:1 del simulatore**: ogni funzione di `Gioco` ha la sua controparte TS con lo stesso nome
  (`rischi`, `estraiBottino`, `esegui`, `arresto`, `ricovero`, `dormi`, `nuovoGiorno`,
  `eventoPersonale`, `disponibile`…), con un commento che rimanda alla riga Python. L'RNG e' diverso
  da quello di Python, quindi il confronto con il simulatore e' **statistico** (fase 3), non partita per
  partita.
* **Differenza strutturale col simulatore**: nel Python le scelte (difesa, guai, cibo, acquisti) le fa la
  policy *dentro* il motore. Nel gioco diventano **richieste in sospeso** nello stato
  (`stato.attesa = {tipo:"TRIBUNALE"|"EVENTO"|..., ...}`) che il comando successivo risolve. Le policy
  della fase 3 sono "giocatori" che inviano comandi come la UI: la stessa interfaccia per entrambi.
* **Testi** solo in `src/data/testi.ts`; **UI** mostra parole/icone/colori, i numeri solo dietro il (?).

## Struttura

```
data/game-data.json        (generato, non si tocca)
src/data/   gameData.ts (import + tipi), testi.ts
src/engine/ rng.ts, stato.ts, comandi.ts, applica.ts, rischi.ts, bottino.ts, rep.ts, tempo.ts,
            tribunale.ts, ospedale.ts, eventi.ts, negozio.ts, classi.ts, punti.ts, index.ts
src/save/   SaveAdapter.ts, localStorageAdapter.ts, exportImport.ts
src/ui/     App.tsx, context/, schermate/, componenti/ (Tooltip(?), PallinoRischio, BarraRep…)
scripts/    autoplay.ts, policy/ (casuale, prudente, bilanciato, yolo)
tests/      *.test.ts (vitest)
public/     icone PWA; assets/art copiati/ottimizzati in build
```

## Fasi

### Fase 0 — Preparazione (fatta)
* Letti GDD, dati, simulatore. Skill `generate-image` installata in `.claude/skills/`. `.env` contiene
  `OPENAI_API_KEY`.
* `git init` + primo commit con lo stato attuale del repo (la cartella non era un repository).

### Fase 1 — Scaffold e motore base
* Vite + React + TS + Tailwind + vitest + `vite-plugin-pwa` (installato ma configurato in fase 7).
* `src/data/gameData.ts`: import di `data/game-data.json` con tipi TS scritti a mano sulla forma del file
  (piu' leggibili dei tipi generati) e un test che verifica che il JSON li rispetti.
* `rng.ts` (`mulberry32` con stato a 32 bit nello stato di gioco; helper `random`, `uniform`, `randint`,
  `choice`, `choices` pesata).
* `nuovaPartita(nome, classe, seed)`, comandi `AZIONE {id, t}`, `DORMI {cibo}`, avanzamento slot/giorno,
  dormita d'ufficio alla Notte, mantenimento, energia. Niente rischi ancora.
* Test: determinismo (stesso seed + stessi comandi = stesso stato), serializzazione JSON andata/ritorno,
  slot/trasferta/sonno.
* **Commit**: "Fase 1: scaffold, dati tipizzati, RNG e motore base".

### Fase 2 — Motore completo
* `rischi` con tutti i modificatori (classe, veicolo, attrezzi, condizione, attenzionato), clamp 0,95.
* Bottino (intervallo alzato dalla spesa, `× spesa`, rep, zona calda, condizione), incassi di classe.
* Rep: decadimento, rendimenti decrescenti, noia, cap di Chill/TikTok, virale, infami.
* Arresto (sequestro, veicolo) → `attesa TRIBUNALE` → comando `DIFESA` → tiro d100 con tutti i
  modificatori → verdetto, multa, galera, sorvegliato, game over.
* Galera (giorni automatici, rep congelata, +3 all'uscita, Zingaro "chiamata al cuggino"), ospedale,
  salute, fine partita e MARANZA POINTS.
* Negozio (`COMPRA`), veicoli, sequestri.
* Abilita' delle sei classi, condizioni del giorno (con **teaser** della condizione di domani tirato
  in anticipo), feste, 16 guai con `SCELTA_EVENTO`.
* Tutorial: esiti `BOSS` alla prima volta di ogni cosa (lista GDD §Tutorial) + sblocco tier.
* Contatori per il riepilogo finale (bottino totale, azione preferita, ricoveri…).
* Test unitari per ogni regola con numeri presi da `game-data.json`.
* **Commit**: "Fase 2: motore completo".

### Fase 3 — Harness di verifica (cancello prima della UI)
* `scripts/autoplay.ts` (eseguito con `tsx`, in parallelo con worker threads): N partite per classe ×
  policy `casuale`, `prudente`, `bilanciato` (+ `yolo` per completezza), port delle funzioni `POLICY`
  del simulatore (`_ev`, `scegli_generico`, `_scegli_casuale`, difese, cibo, acquisti, flag dei guai).
* Stampa la stessa tabella di `sim/results/batch_finale.txt` e un confronto riga per riga con PASS/FAIL.
* Accettazione: casuale sopravvive ≥ 85%; mediane di patrimonio, rep e galera entro ±25% del
  simulatore per ogni classe. Se diverge, si corregge il port. Le mediane di galera piccole
  (prudente 14–46 giorni) sono rumorose con 60 run: lancero' 200 run per riga.
* `npm run autoplay` documentato; da rilanciare a ogni modifica del motore.
* **Commit**: "Fase 3: harness autoplay, motore verificato contro il simulatore".

### Fase 4 — UI base (390px prima di tutto)
* Schermata iniziale (Nuova partita / Continua), creazione personaggio (nome + 6 card classe),
  schermata principale (ritratto, HUD, data/slot/condizione, lista azioni disponibili con pallino,
  fulmini, €/€€/€€€, slider a tre tacche, Dormi con scelta cibo, Negozio), card esito a schermo intero.
* Componente `(?)` unico: tap su mobile, click/hover su desktop, chiusura toccando fuori; contenuti
  esattamente come la tabella GDD §Interfaccia.
* Grafica placeholder: rettangoli colorati con il nome dell'asset.
* Salvataggio automatico dopo ogni comando (`SaveAdapter` + `localStorage`).
* **Commit**: "Fase 4: UI mobile-first di base".

### Fase 5 — UI completa
* Tribunale (pena richiesta, cinque difese con prezzo, d100 che gira, verdetto), Galera/Ospedale
  (contatore, diario di tre righe al giorno, avanzamento automatico interrompibile), card dei guai con
  scelte, teaser "Domani: …", Negozio + inventario, chat del Boss scorrevole, Fine partita con punti
  abbreviati, riepilogo, classifica locale e "Nuova run".
* **Commit**: "Fase 5: tribunale, galera, eventi, negozio, chat del Boss, fine partita".

### Fase 6 — Grafica
* Batch `tools/jobs/alpha-assets.json` (6 ritratti `high`, resto `medium`/`low` come nel file), controllo
  visivo di ogni PNG, correzione dei prompt, nuovi batch in `tools/jobs/`.
* Drip sul personaggio: layer PNG trasparenti per ogni capo (vedi DOMANDE.md, punto sul drip) posizionati
  con ancore per classe.
* Script di ottimizzazione (ridimensionamento/WebP) verso `public/art/` per non pesare sulla PWA.
* **Commit**: "Fase 6: grafica dell'alpha".

### Fase 7 — PWA e rifinitura
* `vite-plugin-pwa`: manifest, icone, splash, cache offline di app + dati + grafica.
* Export/import del salvataggio in JSON, rifinitura a 390px e desktop, `README.md` (avvio, come si gioca,
  come rigenerare dati e grafica).
* **Commit**: "Fase 7: PWA, salvataggi e README".

## Dopo ogni fase
`npm test`, `npm run autoplay` se il motore e' cambiato, aggiornamento della sezione "Stato" qui sotto.

## Stato
| Fase | Stato | Note |
|---|---|---|
| 0 | fatta | skill installata, chiave OpenAI presente |
| 1–7 | da fare | in attesa del via di Mich sul piano |
