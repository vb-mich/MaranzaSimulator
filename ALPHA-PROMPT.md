# Prompt di avvio — Maranza Simulator, alpha

Come usarlo: aprire Claude Code nella cartella del progetto (`B:\GAMES\MaranzaSimulator`) e incollare tutto il blocco sotto come primo messaggio. Il blocco e' autosufficiente: rimanda ai file del repo per i dettagli invece di ripeterli.

---

Sei lo sviluppatore principale di **Maranza Simulator**, un life-sim satirico 2D per browser (PWA, mobile-first). Il progetto e' nuovo: in questa cartella ci sono il game design document, i dati di gioco gia' bilanciati, un simulatore Python che fa da implementazione di riferimento e gli strumenti per generare la grafica. Il tuo compito e' costruire la **versione alpha giocabile** descritta sotto.

## Prima di scrivere codice

1. Leggi per intero `docs/GDD.md`. E' la specifica. Le note che iniziano con `$` sono note del designer: vanno rispettate, ma il loro contenuto non deve mai comparire nei testi di gioco.
2. Leggi `data/game-data.json`: contiene **tutti** i numeri del gioco (classi, azioni, cibo, negozio, avvocati, condizioni, feste, guai, costanti). Il codice del gioco deve caricare questo file e non ridigitare nessuna costante. Se un numero ti sembra sbagliato, segnalalo: non correggerlo nel codice.
3. Leggi `sim/maranza_sim.py`. E' l'implementazione di riferimento della logica (classe `Gioco`: `rischi`, `estrai_bottino`, `esegui`, `arresto` = tribunale, `ricovero`, `dormi`, `nuovo_giorno`, `evento_personale`, `disponibile`). Il motore TypeScript deve riprodurla 1:1; quando il GDD e il simulatore sembrano in disaccordo, chiedi.
4. Installa la skill per le immagini: copia `tools/_install-skill/generate-image/` in `.claude/skills/generate-image/` (il `CLAUDE.md` la cita gia' in quella posizione). Controlla che `.env` contenga `OPENAI_API_KEY`; se manca, usa placeholder colorati con il nome dell'asset e vai avanti, non bloccarti.
5. Scrivi un piano in `docs/PLAN.md` diviso in fasi (sotto) e fammelo vedere prima di iniziare la fase 1. Un commit per fase, messaggi in italiano.

## Stack e vincoli tecnici

* **Vite + React + TypeScript + Tailwind**, `vite-plugin-pwa` per l'installazione. Nessun framework di stato esterno: `useReducer` + context bastano.
* Struttura: `src/engine/` (logica pura, zero dipendenze da React e dal DOM), `src/ui/` (componenti), `src/data/` (loader e tipi di `game-data.json`), `src/save/` (persistenza dietro un'interfaccia `SaveAdapter` con implementazione `localStorage`; Supabase arrivera' dopo senza toccare il motore).
* Il motore e' **deterministico**: tutta la casualita' passa da un RNG seedable (`mulberry32` o simile) contenuto nello stato. Stesso seed + stesse scelte = stessa partita. Serve per i test e per il futuro server-side.
* Lo stato di gioco e' un oggetto serializzabile; ogni azione del giocatore e' un comando (`{type:"AZIONE", id, t}`, `{type:"DORMI", cibo}`, `{type:"DIFESA", scelta}`, `{type:"SCELTA_EVENTO", opzione}`, `{type:"COMPRA", item}`) applicato da una funzione pura `applica(stato, comando) → {stato, esiti[]}`. Gli `esiti` sono gli eventi da mostrare (card bottino, verdetto, messaggio del Boss…).
* Testi di gioco in **italiano**, in un unico file `src/data/testi.ts` (gergo e messaggi del Boss inclusi) cosi' si possono rivedere senza toccare i componenti.
* Mobile-first: tutto deve funzionare a 390px di larghezza con il pollice, poi scalare a desktop. Niente hover-only.
* Nessun brand reale, nessuna persona reale, nessun testo renderizzato dentro le immagini (vedi skill).

## Cosa deve contenere l'alpha (tutto giocabile dall'inizio alla fine dell'anno)

1. **Creazione personaggio**: nome + scelta di una delle 6 classi (card con ritratto, statistiche a parole, abilita' in due righe). Una sola scelta, niente altro (GDD §Classi).
2. **Schermata principale**: personaggio con il drip indossato; HUD con soldi, reputazione (barra + grado a parole), energia (fulmini), salute (barra con siringa, nessun numero); data, slot corrente e condizione del giorno; lista delle azioni disponibili *ora* (filtrate per slot, tier, cooldown, energia, soldi, veicolo, giorno-evento) con pallino del rischio a 4 colori calcolato con tutti i modificatori attivi, costo in fulmini, bottino in €/€€/€€€; slider investimento a tre tacche dove previsto; pulsanti Dormi (con scelta del cibo) e Negozio. Ogni elemento con matematica ha il pulsante **(?)** che apre un tooltip con i numeri: segui la tabella del GDD §Interfaccia alla lettera.
3. **Esiti** come card a schermo intero (una frase, il risultato, un tasto): successo, finisce male → ospedale, beccato → Tribunale.
4. **Tribunale**: pena richiesta, cinque difese con prezzo, animazione del d100, verdetto e conseguenze (GDD §Tribunale, con tutorial e incensurato).
5. **Galera e Ospedale**: schermata di passaggio con contatore dei giorni e diario di tre righe al giorno (testi da `testi.ts`), avanzamento automatico ma interrompibile dal tocco.
6. **Eventi**: condizione del giorno (con teaser alla Notte: "Domani: …"), feste del calendario, guai e opportunita' con 1–2 scelte (GDD §Eventi). Il Magrebino durante il Ramadan e il Pakistano di notte seguono le loro regole.
7. **Negozio** (senza consumare slot) e inventario; il drip cambia l'immagine del personaggio (sovrapposizione di layer PNG sul ritratto base).
8. **Chat del Boss**: un pannello scorrevole stile messaggistica; i messaggi della prima volta elencati in GDD §Tutorial; messaggi di sblocco tier.
9. **Fine partita**: schermata con MARANZA POINTS abbreviati ("4,6M"), riepilogo (giorni in cella, arresti, ricoveri, bottino totale, azione preferita), classifica locale (localStorage) e tasto "Nuova run".
10. **Salvataggio automatico** ad ogni comando; "Continua" nella schermata iniziale; export/import del salvataggio come JSON (serve per il playtest).
11. **PWA** installabile, icona, splash, funzionamento offline dopo il primo caricamento.

Fuori dall'alpha (non iniziare): login e Supabase, classifica online, condivisione delle card come immagine, audio, landing page Lovable, stagioni corte.

## Fasi suggerite

1. Scaffold + loader dei dati con tipi TypeScript generati da `game-data.json` + RNG + stato + `applica()` con le sole azioni base (eseguire azione, dormire, cambio giorno). Test unitari con vitest.
2. Motore completo: rischi e modificatori, bottino, rep (decadimento, rendimenti decrescenti, noia), zona calda, tribunale, galera, ospedale, salute, negozio, abilita' delle sei classi, condizioni/feste/guai, tutorial, fine partita.
3. **Harness di verifica**: `scripts/autoplay.ts` che gioca N partite complete con le policy `casuale`, `prudente`, `bilanciato` riprodotte dal simulatore (sezione `POLICY` di `sim/maranza_sim.py`) e stampa la stessa tabella di `sim/results/batch_finale.txt`. Criterio di accettazione del motore: sopravvivenza del casuale ≥ 85%, mediane di patrimonio/rep/galera entro ±25% di quelle del simulatore per ogni classe. Non passare alla UI finche' l'harness non e' verde: se i numeri divergono, il bug e' nel port, non nel bilanciamento.
4. UI mobile-first: schermate 1–2–3 con placeholder grafici.
5. UI: tribunale, galera/ospedale, eventi, negozio, chat del Boss, fine partita.
6. Grafica con la skill `generate-image`: parti da `tools/jobs/alpha-assets.json` (ritratti delle classi, oggetti, location, avatar del Boss e del giudice), guarda ogni PNG prodotto, correggi i prompt che non funzionano, scrivi i tuoi batch in `tools/jobs/`. Qualita' `medium`; `high` solo per i sei ritratti.
7. PWA, salvataggio/export, rifinitura, `README.md` con come avviare, come giocare, come rigenerare dati e grafica.

## Come lavorare

* Dopo ogni fase: `npm test`, l'harness se il motore e' cambiato, e una breve nota in `docs/PLAN.md` su cosa e' fatto e cosa manca.
* Quando una regola del GDD e' ambigua, implementa quello che fa il simulatore e segnalamelo in `docs/DOMANDE.md` con la riga del simulatore e la riga del GDD.
* Non aggiungere meccaniche, azioni o eventi oltre al GDD: la lista delle idee future va in `docs/DOMANDE.md`, non nel codice.
* Nessun numero di bilanciamento hardcoded nei componenti: se ti serve una soglia, e' in `game-data.json` o va aggiunta li' tramite `sim/export_data.py`.

Inizia dal punto 1 di "Prima di scrivere codice" e mostrami il piano.
