# Domande aperte e differenze GDD ↔ simulatore

Regola: dove i due documenti non coincidono, il motore fa quello che fa il simulatore (cosi' l'harness
della fase 3 resta confrontabile) finche' Mich non decide. Le righe si riferiscono a `docs/GDD.md` e
`sim/maranza_sim.py` al 25/10/2026.

## Da decidere (cambiano i numeri dell'harness)

1. **Salute sotto 30 → energia massima −20%.** GDD r.372 la prevede, `game-data.json` ha
   `SALUTE_BASSA_SOGLIA`/`SALUTE_BASSA_ENERGIA_MULT`, ma il simulatore non la applica da nessuna parte
   (`dormi`, r.682–694). Proposta: implementarla dopo che l'harness e' verde e rigenerare il batch.
2. **Multa non pagabile → 1 giorno di galera ogni 25€.** GDD r.361, costante
   `MULTA_CONVERSIONE_EURO_GIORNO`; il simulatore (`paga`, r.421–426) porta i soldi a zero e basta.
   Stessa proposta del punto 1.
3. **Trasferta iniziata di Sera senza veicolo.** Occupa Sera + Notte (`esegui` r.617), il ciclo del
   giorno finisce e il personaggio **non dorme**: niente recupero energia e niente mantenimento
   (r.735–748). Il GDD r.121/138 dice "la Notte e' dormita d'ufficio". Opzioni: (a) come il simulatore;
   (b) vietare le trasferte di Sera senza veicolo; (c) dormita d'ufficio comunque.
4. **Avvocato non pagabile.** `paga` (r.650) azzera i soldi senza impedire la scelta: con 0€ si prende
   l'avvocato di grido (+25) gratis, e la policy casuale (r.887) lo fa spesso con il cuggino avvocato.
   Nella UI disabilito le difese che non puoi permetterti; nell'harness riproduco il simulatore.
   Va bene, o va corretto anche il simulatore?

## Ambiguita' minori (implemento il simulatore, segnalo)

5. **Pakistano, "una azione di Notte a settimana"**: GDD r.94 dice settimana di calendario, il simulatore
   usa `giorno // 7` (r.540, r.558), cioe' blocchi di 7 giorni dal 1 Maggio (che nel 2026 e' venerdi').
6. **Sfida in piazza persa**: danno alla salute 15 (r.373), non 20 come gli altri ricoveri (GDD r.370);
   il bonus del Balcanico e' ×1,3 sulla vittoria (65%) e il Balcanico accetta sempre (r.369).
   Nel gioco la scelta resta al giocatore anche per il Balcanico.
7. **Corsa clandestina**: il Balcanico ha +10% di vittoria (r.592), non scritto nel GDD.
8. **"Il boss ti ha notato"** sostituisce il `loot_tag` della condizione del giorno invece di sommarlo
   (r.392): con "Giorno di paga" + boss si perde il ×1,3 sui furti. Probabile svista.
9. **Salute a zero fuori dall'ospedale**: la febbre (−5, r.409) puo' portare la salute a 0 o sotto senza
   game over, che scatta solo in `ricovero` (r.627). Nel gioco controllo la morte dopo ogni variazione
   di salute? (cambierebbe poco l'harness).
10. **Docstring di `paga`** (r.422) dice "Zingaro: 50%", il valore e' `PRESTANOME = 0.40` come nel GDD.
    Solo un commento da sistemare.
11. **Rep negativa e noia**: la noia (×0,5 per ripetizione) si applica anche alla rep *negativa* delle
    azioni infami (r.606), cioe' ripetere un borseggio fa perdere *meno* rep.

## Contenuti

12. **Brand reali nei nomi del negozio**: "Passamontagna Nike", "Cappello North Face", "Tuta Nike Tech",
    "iPhone ultimo modello" (GDD r.156–162, `NEGOZIO` r.78–87, quindi anche `game-data.json`).
    `CLAUDE.md` e le linee guida della grafica vietano brand reali. Propongo nomi parodia solo in
    `testi.ts` (es. "Passamontagna Swoosh", "Cappello North Faccia", "Tuta Naik Tech", "aiFon ultimo
    modello"), lasciando invariati gli id nei dati.
13. **Drip sul personaggio come layer PNG**: il batch `alpha-assets.json` genera gli oggetti come icone,
    non come layer allineati ai ritratti. Proposta: per i capi indossabili (cappello, tuta, catena,
    orologio) generare in fase 6 un layer trasparente per classe con `--ref` sul ritratto (4×6 = 24
    immagini `medium`), oppure, per spendere meno, un solo layer generico posizionato con ancore per
    classe. Telefono e veicoli restano icone accanto al personaggio.
14. **Teaser della condizione di domani**: il simulatore tira la condizione a inizio giornata; per mostrare
    "Domani: …" alla Notte il motore la tira con un giorno d'anticipo. Cambia l'ordine dei numeri
    casuali, non la distribuzione.

## Idee future (fuori dall'alpha, non nel codice)
* Dal GDD: oggetti futuri (Casa del cuggino, Pitbull, Avvocato in abbonamento), feste future, badge,
  card condivisibili, classifica tra amici, stagioni corte.
