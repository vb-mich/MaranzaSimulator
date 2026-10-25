# Domande aperte e differenze GDD ↔ simulatore

Regola: dove i due documenti non coincidono, il motore fa quello che fa il simulatore (cosi' l'harness
resta identico al batch di riferimento) finche' Mich non decide. Ogni punto ha una proposta: se va
bene, basta un "ok".

## Chiusi

* **Punti 1–33** (25/10/2026): risposte in `docs/RISPOSTE.md`, gia' recepite nel simulatore, nei dati e
  nel GDD. Il testo originale delle domande e' nella storia git (commit "Fase 0").
* **Generatore delle condizioni** (25/10/2026, scheda in chat): le condizioni del giorno usano un secondo
  generatore, con seme = seme della partita + `COND_SEME_OFFSET`, nel simulatore e nel gioco, cosi' il
  teaser della Notte non cambia l'ordine degli altri numeri. `batch_finale.txt` rigenerato.
* **Refuso nel GDD** (37), §Condizioni del giorno: la frase del teaser ripetuta due volte, corretta in
  `sim/gdd_template.md` insieme alla nota sul generatore a parte.
* **UI in parallelo** (25/10/2026, scheda in chat): la UI parte in un thread separato appena la fase 1 e'
  su `main` e si unisce solo con l'harness verde.

## Aperti

34. **Seconda dormita della giornata e cibo.** In `dormi` il cibo si sceglie a ogni dormita, ma si paga
    solo alla prima: alla seconda si recupera la quota del cibo scelto *gratis* (es. Caritas alla prima,
    Mensa al 100% alla seconda). Il simulatore lo fa (la policy sceglie di nuovo con `cibo_generico`);
    lo stesso vale con il taccheggio al Lidl, che azzera il costo di qualunque cibo. Proposta: la seconda
    dormita usa il cibo della prima, senza nuova scelta. Per ora il motore fa come il simulatore.
35. **Zingaro, ultimo giorno di galera.** Nel loop del simulatore `s.galera -= 1` avviene *prima*
    dell'azione della chiamata al cuggino: l'ultimo giorno di pena `galera` vale gia' 0, quindi
    `disponibile` e `costo_energia` lo trattano come libero (qualunque azione, anche rischiosa, a costo
    normale). Proposta: le regole della galera valgono anche nell'ultimo giorno (nel simulatore basta
    un flag "in galera oggi" al posto di `galera > 0`). Per ora il motore fa come il simulatore.
36. **Soglie dei guai con scelta.** Il simulatore paga il cuggino solo con almeno 150€ e va alla serata
    solo con almeno 100€: le tratto come prudenza delle policy, non come regole. Nel gioco il bottone
    "Paga" e' attivo con almeno 50€ e "Vai" con almeno 40€ (si puo' spendere tutto, non sotto zero).
    Va bene?

38. **Ferragosto e ospedale.** `risk_id` della condizione moltiplica solo il gabbio: il "Topino rischio
    ×0,7" di Ferragosto non riduce il 10% di ospedale di C22, mentre il GDD (§Rischio) dice che i
    moltiplicatori valgono per gabbio e ospedale. Proposta: `risk_id` vale per entrambi, come `risk_tag`.
    Per ora il motore fa come il simulatore.
39. **Febbre.** Il GDD dice "energia dimezzata", il simulatore porta l'energia *al massimo* al 50% del
    massimo (se ne hai meno non cambia niente). Proposta: tenere la regola e correggere il testo in
    "energia al massimo a meta'".
40. **Balcanico e sfida in piazza.** Nel simulatore il Balcanico accetta sempre, qualunque policy: lo tratto
    come regola (arroganza), quindi nel gioco il bottone "Rifiuta" e' spento per lui. Va bene? Il GDD non
    lo dice: se si', lo aggiungo alle abilita' della classe.
41. **C19 e il furgone.** Il testo dice che il furgone da 50€ "raddoppia il carico", ma l'investimento
    massimo alza solo il minimo del bottino a meta' strada (atteso da 360 a 480). Proposta: cambiare il
    testo ("carico piu' sicuro") invece della regola.

## Idee future (fuori dall'alpha, non nel codice)
* Dal GDD: oggetti futuri (Casa del cuggino, Pitbull, Avvocato in abbonamento), feste future, badge,
  card condivisibili, classifica tra amici, stagioni corte.
