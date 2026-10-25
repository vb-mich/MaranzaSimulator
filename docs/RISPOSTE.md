# Risposte alle domande di `DOMANDE.md`

Regola generale, confermata: **il simulatore e' l'implementazione di riferimento, ma dove aveva torto e' stato corretto**. Tutte le differenze qui sotto sono gia' risolte in `sim/maranza_sim.py`; `data/game-data.json`, `docs/GDD.md` e `sim/results/batch_finale.txt` (200 run per riga, difesa casuale seminata) sono rigenerati. Il port deve seguire **il simulatore attuale**, non le righe citate in DOMANDE.md. Dove la risposta dice "come il simulatore", e' il comportamento nuovo.

## Piano (`PLAN.md`)

Approvato, con tre aggiunte:
* **`package-lock.json` nel repo** e verifica, a fine fase 1, che `npm ci && npm run dev` funzioni da Windows nella cartella (e' la mia macchina, non la tua sandbox).
* **Fase 3**: anche `yolo` entra nei criteri di accettazione (stessa tolleranza), perche' e' l'unica policy che tocca il bancomat e il game over.
* **Fase 4**: a fine fase voglio poter giocare una settimana intera da telefono (390px) con la grafica placeholder; e' il primo playtest.

Il comando `PASSA` (punto 33) e le "richieste in sospeso" nello stato vanno bene.

## Da decidere

1. **Salute < 30 → energia massima −20%.** Ok. Corretto nel simulatore: `energia_max_oggi()` (caldo × salute bassa) usato da `dormi` e come tetto dell'energia corrente a inizio giornata.
2. **Multa non pagabile → giorni.** Ok. `paga_multa()` nel simulatore: si paga quanto si puo', il resto diventa `ceil(resto/25)` giorni sommati alla pena (anche con messa alla prova e patteggiamento). Il Prestanome dello Zingaro azzera la multa intera, giorni compresi.
3. **Trasferta di Sera senza veicolo.** Opzione (b): vietata. `disponibile` rifiuta le trasferte a 2 slot da Sera in poi. GDD aggiornato.
4. **Avvocato non pagabile.** Corretto anche il simulatore: una difesa che non ci si puo' permettere non e' selezionabile (fallback ad avvocato d'ufficio in `arresto`, e nella UI il bottone e' disabilitato con il prezzo barrato).
5. **Zingaro in galera.** La regola sta in `disponibile`, come proponi: in galera solo lo Zingaro, e solo azioni con Gabbio e Ospedale a zero (chill, TikTok, calisthenics, lavori, slot, scommessa). Nessuna pena puo' quindi sommarsi o sostituirsi a quella residua.
6. **Riferimento dell'harness.** Ok a tutto: 200 run per riga, difesa casuale seminata con l'RNG della partita (la firma delle difese e' ora `difesa(g, pena)`), ±10 giorni per le mediane di galera sotto 40. Il batch nuovo e' in `sim/results/batch_finale.txt`.

## Numeri

7. **Condizioni del giorno.** Avevi ragione: il tiro in sequenza era sbagliato. Nuovo metodo nel simulatore: condizioni a data fissa prima (Feste, Giorno di paga), altrimenti **una sola estrazione** con P = somma delle p ammesse oggi (≈ 45%, 50–58% nei mesi con nebbia/caldo) e scelta proporzionale alle p. Cosi' le percentuali della tabella valgono davvero. GDD aggiornato ("circa il 50%").

## Interfaccia

8. **Pallino del rischio.** Confermato: Gabbio + Ospedale, alla tacca selezionata (default *Alla buona*), con tutti i modificatori di oggi; fasce come `RISCHIO_COLORI`.
9. **Soglie.** Confermate e gia' in `game-data.json`: `UI_FULMINI`, `UI_BOTTINO_SIMBOLI` (bottino atteso alla tacca scelta, senza bonus), `UI_SLIDER_TACCHE` (t = 0 / 0,5 / 1), `UI_RISCHIO_SU`.

## Ambiguita' minori

10. **Pakistano, settimana.** Settimana di calendario da lunedi' a domenica (ISO). Simulatore corretto.
11. **Sfida in piazza.** Resta cosi' (−15 salute, Balcanico ×1,3 → 65%): GDD aggiornato con i numeri. Nel gioco la scelta e' sempre del giocatore, anche per il Balcanico.
12. **Corsa clandestina, Balcanico +10%.** Resta; aggiunto al GDD e a `game-data.json` (`CORSA_BALCANICO_BONUS`).
13. **Il boss ti ha notato.** Svista: ora i moltiplicatori si moltiplicano con quelli della condizione del giorno. Simulatore corretto.
14. **Salute a zero fuori dall'ospedale.** Ok: nel simulatore ogni variazione di salute passa da `cambia_salute()`, che chiude la run a zero.
15. **Docstring.** Sistemata.
16. **Rep negativa e noia.** La noia si applica solo ai guadagni; la rep persa si perde per intero. Simulatore e GDD corretti.
17. **Ruba monopattino (C09).** Vale il GDD: se non hai un veicolo, il 50% delle volte te lo tieni *al posto* del bottino. La **rapina al rider (C18)** e' diversa: bottino sempre, piu' 50% di veicolo. Nei dati C18 ha ora `speciale: "veicolo_bonus"`.
18. **Chill.** Ora riceve anche i moltiplicatori Social del giorno (ordine corretto nel simulatore). Il bonus drip conta anche i veicoli ed e' continuo; il tetto a 60 e' una discesa lineare: tutto voluto, scritto nel GDD.
19. **Moltiplicatori sull'ospedale.** La Fuga istantanea dell'Africano vale **solo sul Gabbio** (corretto). I moltiplicatori (×) delle condizioni e la Forza bruta del Balcanico valgono su Gabbio e Ospedale; i punti (+/−) solo sul Gabbio. Tabella dei modificatori del GDD aggiornata.
20. **Poker.** +3 vinci / −2 perdi e' voluto: la tabella del GDD ora lo mostra, e c'e' `POKER_REP` nei dati.
21. **Ti saltano addosso.** 1–3 giorni, come tutti i ricoveri. GDD corretto.
22. **Paghetta d'emergenza.** Controllata a ogni slot (e nei giorni di galera dello Zingaro). Simulatore corretto; nel gioco: dopo ogni comando.
23. **Guai, rep e soldi.** Corretto: la rep dei guai passa da `guadagna_rep` (rendimenti decrescenti, bonus di classe, limiti 1–100 subito) e i soldi da `incassa`/`paga` (bonus Pakistano/Africano, Prestanome).
24. **Caldo bestiale.** Abbassa anche l'energia che hai gia' (tetto applicato a inizio giornata). Simulatore corretto.
25. **Pioggia.** Resta come il simulatore (tutti i reati; legali e azzardo esclusi). GDD riscritto in quei termini.
26. **Sbirro di quartiere.** Corretto: `attenziona()` tiene il valore e la durata maggiori.
27. **Noto in questura.** Continuo, −(rep−60)/5 fino a −8. GDD corretto.
28. **Arrotondamento delle pene.** Cambiato: arrotondamento scolastico (0,5 → 1) e **minimo 1 giorno** per ogni condanna (ridotta, piena, aggravata, patteggiamento). Il motore TS usa `Math.floor(x + 0.5)`, non il "round half to even".

## Contenuti

29. **Brand reali.** Nomi parodia **anche nei dati** (sono testo di gioco, non id): *Passamontagna Naik*, *Cappello Nord Faccia*, *Tuta Naik Tech*, *aiFon ultimo modello*. Gli id (`passamontagna`, `cappello`, `tuta`, `telefono`) non cambiano. Se in `testi.ts` vuoi migliorarli, liberi.
30. **Drip come layer.** Per l'alpha la versione economica: **un layer generico per capo** (cappello, tuta, catena, orologio) con ancore per classe; se su un ritratto non funziona, si rigenera quel singolo layer con `--ref`. Telefono e veicoli restano icone accanto al personaggio. Nel batch dei ritratti aggiungi alla fine di ogni prompt "same pose and framing as the other class portraits" cosi' le ancore reggono.
31. **Nomi delle classi.** Ok: solo in `testi.ts`.

## Note tecniche

32. **Teaser.** Ok.
33. **`PASSA`.** Ok.

## Cosa e' cambiato nei file di riferimento (per il diff)

* `sim/maranza_sim.py`: `paga_multa`, `attenziona`, `cambia_salute`, `energia_max_oggi`, `paghetta_emergenza`; estrazione delle condizioni; `disponibile` (trasferte, galera); `esegui` (ordine chill/noia, C09/C18); `arresto` (avvocato, multa→giorni, arrotondamento); `rischi` (Africano); eventi personali con i helper; difese con `g`; settimana ISO per il Pakistano; nomi del negozio.
* `data/game-data.json`: nuove chiavi `UI_*`, `CORSA_BALCANICO_BONUS`, `SFIDA_BALCANICO_MULT`, `POKER_REP`, `DANNO_RICOVERO.sfida_piazza`; nomi del negozio; `C18.speciale = "veicolo_bonus"`.
* `docs/GDD.md`: punti 3, 7, 8, 9, 11, 12, 16–19, 20, 21, 24–28 recepiti nel testo.
