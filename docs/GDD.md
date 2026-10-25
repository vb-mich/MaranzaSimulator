# MARANZA SIMULATOR — Game Design Document

Maranza simulator e' un 2D browser game "life sim" satirico, goliardico, irriverente e che punta alla ridicolizzazione via iperboli sia del politicamente scorretto che del politicamente corretto. Il giocatore impersonera' un personaggio maranza che deve sopravvivere alla giornata compiendo attivita' rischiose e bravate senza finire in galera o in ospedale.
Recentemente, il termine "maranza" e' stato associato in Italia ai partecipanti di sommosse ed atti di vandalismo. I cosiddetti Maranza sono per lo piu' giovani immigrati o figli di immigrati extracomunitari.
Questo gioco è un'opera di pura finzione, satira di costume e parodia dell'immaginario urbano Italiano ed Europeo. I nomi, i personaggi, il gergo e le dinamiche di gioco sono utilizzati esclusivamente a scopo caricaturale, satirico ed intellettualmente provocatorio. Il gioco non intende promuovere, giustificare o istigare alcun comportamento illecito, discriminatorio o violento nella vita reale.

Chi sono gli sviluppatori del gioco? Collettivamente il gruppo si chiama "Casa Bombadil", siamo un gruppo apolitico di Italiani ed immigrati che vogliono sensibilizzare la tematica del fenomeno "maranza" tramite questo gioco satirico ed irriverente.

Simboli nel documento.
Alcuni paragrafi iniziano con il simbolo $:
$ Questo paragrafo e' una nota del designer, sono informazioni o decisioni interne e riservate che non vanno rese pubbliche. Nulla contenuto nel paragrafo deve trasparire nei contenuti di gioco.

---

# Specifiche tecniche di gioco
* Piattaforma target: Browser web, full responsive per mobile, tablet e PC, installabile come PWA. In futuro possibile porting PWA su in-store mobile app via container.
* Gioco accedibile tramite una landing page (www.maranzasimulator.it) che verra' sviluppata con Lovable.app. La landing page e' una semplice hero section con una grande CTA per aprire il gioco.
* Il gioco richiede registrazione, via email o con login service provider (inizialmente solo Google e Facebook).
* Hosting backend e database su Supabase, inizialmente free tier eventualmente espandibile nel caso in cui il traffico fosse considerevole.
* Tutta la logica di gioco (tiri di dado, tribunale, eventi) deve girare **server-side** (Supabase Edge Functions / RPC Postgres) e il client deve ricevere solo gli esiti: la leaderboard e' pubblica e il gioco e' facile da manomettere da browser.
* Il seed casuale giornaliero e' per-giocatore e per-giorno, cosi' due streamer non vedono mai la stessa sequenza di eventi.

$ Nota di rischio di prodotto (da discutere prima della pubblicazione): le sei classi sono etichette etniche con descrizioni stereotipate. Indipendentemente dall'intento satirico, questo espone il progetto a tre rischi concreti: (1) legale, in Italia l'art. 604-bis c.p. (ex legge Mancino) punisce la propaganda di idee fondate sull'odio etnico e la satira non e' un'esimente automatica; (2) di piattaforma, Google e Facebook (login), TikTok/Twitch (acquisizione) e gli store (futuro container) hanno policy sull'hate speech applicate da moderatori che non leggono i disclaimer; (3) di fornitore, Supabase e Lovable hanno Acceptable Use Policy analoghe. Il cambio di nome riduce poco l'esposizione: a contare sono i contenuti (nomi delle classi, testi, immagini). La mitigazione che mantiene tutta la satira e' spostare il bersaglio dall'etnia al **comportamento** ("Il Trapper", "Il Metallaro del rame", "Il Figlio di papa'", "Il Re del minimarket"…), archetipi gia' riconoscibilissimi per il pubblico target. Le meccaniche funzionano identiche: la simulazione bilancia numeri, non etichette.

# Specifiche stilistiche

$ Questo progetto e' ispirato ad un vecchio gioco chiamato Tabboz simulator (https://github.com/andreax79/tabboz), un retro game sviluppato negli anni novanta che ha la stessa connotazione satirica. L'allora "tabbozzo" e' l'attuale "maranza". Maranza simulator vuole ispirarsi a quello stile.

* Il look & feel della grafica e UI e' in stile vaporwave e brainrot.
* Mood & Vibe: Satira di costume pungente, gergo giovanile, estetica pimpata/cringe, ironia sulla cultura del "drip", del parkour urbano, bravate di piazza e micro criminalita'.
* Target & Distribuzione: Nicchia brainrot/meme/pop-culture italiana, ragazzi 15-30 anni. Il driver principale di acquisizione utenti sara' la viralita' su TikTok/Reels e le dirette Twitch.
* Nella schermata principale e' sempre visibile l'immagine del personaggio creato, che andra' a variare graficamente con oggetti e abbigliamento acquistati.
* Ogni esito (bottino, arresto, verdetto del giudice, evento) e' una **card condivisibile** (immagine 9:16 generata lato client) con il nome del personaggio e la frase dell'esito: e' il veicolo virale principale.

---

# Game design e meccaniche di gioco

**Obiettivo del Giocatore:** far sopravvivere il proprio personaggio per 365 giorni virtuali in citta', accumulando il massimo di Reputazione e Patrimonio senza finire marcito in galera o piantato all'ospedale.

**MARANZA POINTS** = `Patrimonio × Reputazione`, calcolati all'ultimo giorno.
* *Patrimonio* = contanti + 50% del valore degli oggetti posseduti (drip e veicoli).
* Se la run finisce prima del giorno 365 (game over), i punti sono `Patrimonio × Reputazione × 0,5 × (giorni sopravvissuti / 365)`. Una run finita male conta, ma poco: il modo per andare in classifica e' arrivare in fondo.
* **Si mostrano sempre abbreviati**: "870K", "4,6M", "18,2M" (una cifra decimale). Il numero intero compare solo nel dettaglio della classifica.
* Ordine di grandezza atteso (dalla simulazione): giocatore casuale ~1M, prudente ~5–7M, bilanciato ~7–9M, spericolato ~10–14M quando sopravvive (guadagna di piu' ma perde mezzo anno in cella e rischia la run sul bancomat).

Il gioco inizia con **una sola scelta**: la Classe del personaggio, piu' il nome. Niente altro da configurare: il giocatore deve essere in piazza entro 30 secondi.

## Statistiche di base

* **Soldi** — in Euro con decimali. Servono per il mantenimento giornaliero, gli acquisti, l'avvocato, le multe e per *investire* nelle azioni (vedi §Azioni). Non possono scendere sotto zero: una spesa che porterebbe sotto zero non e' consentita.
* **Reputazione** — da 1% a 100%. Parte da 5%. Quanto la piazza ti rispetta. Effetti:
  * **Sblocca i tier di azioni** (10 / 20 / 35 / 45 / 50 / 70): e' la progressione principale del gioco.
  * **Alza i bottini**: +0,3% di bottino per ogni punto (a rep 100 tutti i bottini valgono +30%).
  * **Entra nei MARANZA POINTS** come moltiplicatore.
  * **Decade dell'1% ogni giorno** ("la piazza dimentica"). Chi smette di fare bravate scende; chi va in galera la congela.
  * **Rendimenti decrescenti**: ogni guadagno positivo e' moltiplicato per `(1 − rep/100)`. A rep 80 un +10 diventa +2. In pratica la rep si stabilizza tra 75 e 90 solo per chi resta attivo; arrivare a 100 e restarci e' quasi impossibile.
  * **Noia della piazza**: ripetere la *stessa* azione entro 7 giorni dimezza la rep che rende, ogni volta (×0,5, ×0,25, ×0,125…). Per essere rispettati bisogna variare. Vale solo sui guadagni: la rep persa con le azioni infami si perde per intero ogni volta.
  * Le azioni "infami" (borseggio alle vecchiette, rapina alle lucciole, rapina al rider) **tolgono** rep anche se riescono.
  $ Perche' decadimento, rendimenti decrescenti e noia: senza di essi la simulazione porta la rep a 100 nella seconda settimana e da li' in poi non conta piu' nulla. Con tutti e tre, la rep si stabilizza tra 75 e 90 solo per chi resta attivo e vario, e un giocatore fermo la perde.
* **Energia** — da 0 al massimo della classe. Ogni azione ne consuma una quota; si recupera dormendo. E' il collo di bottiglia delle azioni giornaliere: 2–3 azioni al giorno per tutti gli archetipi.
* **Salute** — da 0 a 100. Scende ad ogni ricovero (−20, −30 per le risse), risale di +1 al giorno, piu' il bonus del cibo (Mensa +3, Kebab +1, Lidl 0, Caritas −1) e con l'allenamento al parco (+8). A salute 0 la run finisce: "piantato all'ospedale". Mostrata come barra con una siringa, mai come numero preciso, cosi' il giocatore la sente senza farci i conti.

## Classi

Selezionabile dal giocatore al momento della creazione del personaggio, assieme al nome. Graficamente, ogni classe ha una immagine differente.

$ La definizione viene dalle classiche meccaniche di creazione di personaggio dei giochi di ruolo. Vedi anche la nota di rischio in §Specifiche tecniche.

### Statistiche iniziali

| Classe | Soldi iniziali | Energia max |
|---|---|---|
| Magrebino | 60€ | 135 |
| Pakistano | 70€ | 150 |
| Africano | 40€ | 170 |
| Zingaro | 120€ | 115 |
| Balcanico | 50€ | 160 |
| Italiano | 200€ | 120 |

$ Perche' questi numeri: l'energia massima e' la leva piu' forte del gioco (decide quante azioni al giorno si fanno), per cui la forbice tra classi e' tenuta stretta (115–170); i soldi iniziali e la paghetta contano solo nella prima settimana, perche' in un anno si guadagnano decine di migliaia di euro. Con questi valori le sei classi stanno in una forbice di circa ±15% di punti per tutti gli stili di gioco, con ordine diverso a seconda dello stile (vedi Appendice A).

### Abilita' di classe

Tra parentesi quadre, dove serve, l'interpretazione precisa da implementare (e' quella usata dal simulatore).

* **Magrebino** — Taglio sfumato, profumo insetticida e marsupio più costoso del contenuto. Il suo monopattino ha più cavalli di una Panda.
  * *Spostamento rapido*: le azioni che richiedono una trasferta non consumano slot temporali addizionali.
  * *Trapper di quartiere*: +10% Reputazione [sui guadagni di rep] quando indossa un capo Drip di valore superiore a 200€.
  * *Ramadan mubarak*: non puo' compiere azioni di tipo Azzardo. Dal 15 Febbraio al 16 Marzo non puo' compiere alcuna azione durante la Mattina e il Pomeriggio [puo' dormire].
* **Pakistano** — Sempre aperto 24/7 anche sotto le bombe. Nel suo minimarket abusivo ti vende di tutto: dalle birre calde alle 4 di mattina fino alle SIM intestate a suo cugino.
  * *Instancabile*: quando l'energia e' pari o inferiore a 15, viene riportata a 100. Max 1 volta al mese, reset il primo del mese.
  * *Business is business*: +10% su ogni somma di denaro incassata.
  * *Ventiquattrosette*: puo' compiere una sola azione di Notte alla settimana [settimana di calendario, da lunedi' a domenica].
  $ Nel simulatore questa e' la classe piu' penalizzata dal malus notturno (scassinare auto, rame, spaccio sono azioni di Notte); l'energia a 150 e il +10% lo compensano. Se il playtest mostra frustrazione, trasformare il malus in "le azioni di Notte costano +20 energia".
* **Africano** — Parla 4 lingue e 5 dialetti per trattare su qualsiasi cosa. Se lo guardi negli occhi per più di due secondi ti ha già infilato 3 braccialetti della fortuna al polso e pretende 10€.
  * *Rifugiato climatico*: +10 al tiro del giudice.
  * *Fuga istantanea*: −10% probabilita' di essere beccato [moltiplicativo: 20% diventa 18%; solo sul Gabbio, non sull'Ospedale].
  * *Soldi alla famiglia*: −10% su ogni somma di denaro incassata.
* **Zingaro** — Catene d'oro spesse tre dita, 5 auto di lusso in garage, 8 figli, nullatenente.
  * *Prestanome*: qualunque perdita di soldi (multa, sequestro, furto in ospedale, avvocato) ha il **40%** di probabilita' di essere azzerata.
  * *Chiamata al cuggino*: anche in Galera puo' compiere una singola azione al giorno [solo tra quelle senza alcun rischio di Gabbio o Ospedale], al doppio del costo in Energia.
  * *Vita di carovana*: −10% sui guadagni di reputazione.
* **Balcanico** — BMW del 2004 con i chilometri scalati, braccia come pilastri e forte passione per il rame ed i metalli pesanti.
  * *Forza bruta*: nelle azioni di Forza il rischio (gabbio e ospedale) e' ×0,7.
  * *Recupero sovraumano*: recupera sempre il 100% dell'energia a prescindere da cosa mangia.
  * *Arroganza balcanica*: +10% di probabilita' giornaliera di un evento "Guaio" (25% invece di 15%).
* **Italiano** — Soldi dei genitori, tute da 400€ e dice 'fra' ogni due parole. Posto gia' assegnato nella fabbrichetta del papi.
  * *Paghetta*: ogni Lunedi' riceve 50€ dal papi (non in galera).
  * *Paghetta d'emergenza*: quando i soldi sono ≤ 5€ vengono riportati a 20€ [controllato a ogni slot]. Max 1 volta al mese.
  * *La legge e' uguale per tutti*: −10 al tiro del giudice.
  $ "Paghetta d'emergenza" non consente comunque di effettuare spese che porterebbero il totale sotto zero.

## Il Ciclo dei Giorni & Scorrimento Tempo

La partita dura un intero Anno Virtuale (365 giorni). Il gioco segue il calendario solare; il primo giorno di gioco e' sempre il 1 Maggio.

Ogni giorno e' diviso in 4 slot temporali: **1. Mattina, 2. Pomeriggio, 3. Sera, 4. Notte.** Un nuovo giorno parte dalla Mattina.

### Avanzamento
Qualsiasi azione consuma 1 slot temporale (2 se richiede una *trasferta* e il personaggio non ha un veicolo e non e' Magrebino), una quota di energia ed eventualmente soldi. Senza veicolo (e senza essere Magrebino) le azioni con trasferta si possono iniziare solo di Mattina e Pomeriggio: di Sera finirebbero nella Notte, che e' riservata al sonno.

Il negozio, l'inventario e la scelta del cibo non consumano slot.

### Mantenimento e cibo
Ogni giorno ha un costo di mantenimento, pagato alla prima dormita del giorno. Il cibo decide il recupero energia **e** la salute:

| Dove mangi | Costo | Recupero energia al riposo | Salute al giorno |
|---|---|---|---|
| In mensa | 15€ | 100% | +3 |
| Dal kebabbaro | 10€ | 80% | +1 |
| Cibo del Lidl | 5€ | 50% | 0 |
| Alla Caritas | 0€ | 20% | −1 |

In Galera e in Ospedale il mantenimento e' zero; all'uscita l'energia e' al 100%. Un taccheggio riuscito al Lidl azzera il mantenimento del giorno.

### Riposo
Il personaggio deve spendere almeno uno slot al giorno per dormire. Se arriva alla Notte senza aver dormito, la Notte e' dormita d'ufficio. Due riposi devono essere ad almeno 2 slot di distanza (dorme in Mattina → puo' ridormire da Sera). Ogni riposo recupera la percentuale del cibo scelto, fino al massimo. Si puo' quindi scegliere tra **3 azioni e 1 sonno** (giornata lunga, energia limitata dal massimo) o **2 azioni e 2 sonni** (giornata corta, piu' energia per azione): e' la decisione tattica quotidiana.

## Tutorial: la prima settimana

Nessuna schermata di istruzioni. Il gioco si spiega con tre meccanismi:

1. **Il giudice e' buono nei primi 7 giorni** (+15 al tiro del Tribunale, vedi §Tribunale) e chi e' **incensurato** ha sempre +10. Il primo arresto finisce quasi sempre in assoluzione o messa alla prova: il giocatore vede la scena del Tribunale senza pagarla.
2. **I messaggi del Boss**: una chat in stile WhatsApp con un solo contatto ("Boss 👑"). Il Boss scrive alla *prima volta* di ogni cosa: primo giorno ("Oggi fai cose piccole, fra'. Guarda le faccine sui bottoni: verde si fa, rosso si pensa."), primo arresto ("Zitto in aula. L'avvocato del cuggino costa 150 ma vale."), prima messa alla prova ("Sei sorvegliato: per un mese se ti ribeccano e' peggio"), primo ricovero ("Mangia in mensa e vai al parco, che sei mezzo morto"), primo sblocco di tier ("Ora ti faccio fare cose serie"), prima volta a 0€ ("Fai il rider, nessuno ti giudica. Un turno al giorno pero'."). Dopo la prima volta il Boss tace: niente tutorial ripetuti.
3. **I colori sui bottoni**: ogni azione ha un'etichetta di rischio (vedi §Interfaccia). Il giocatore casuale impara "verde/giallo/rosso" senza mai vedere una percentuale.

$ Nella simulazione il giocatore casuale e' modellato proprio cosi': sceglie a caso, ma con probabilita' inversamente proporzionale al rischio mostrato (il 20% delle volte ignora anche quello, per curiosita'). Con questo modello sopravvive nel 90–100% delle partite.

## Negozio

Accessibile in qualsiasi momento senza consumare slot. Gli oggetti sono visibili sul personaggio nella schermata principale.

| Oggetto | Prezzo | Tipo | Effetto |
|---|---|---|---|
| Passamontagna Naik | 15€ | tool | −5 punti di rischio Gabbio nelle azioni di Notte |
| Tronchese del cuggino | 30€ | tool | −5 punti di rischio Gabbio nelle azioni con Effrazione |
| Cappello Nord Faccia | 90€ | drip | Drip 90 (conta per il Chill e per il Patrimonio) |
| Tuta Naik Tech | 180€ | drip | Drip 180 |
| Catena placcata 'oro' | 250€ | drip | Drip 250 — sblocca 'Trapper di quartiere' (Magrebino) |
| Monopattino truccato | 350€ | veicolo | Veicolo liv. 1: trasferte senza slot extra; −5 pt Gabbio nelle azioni di Fuga; sblocca le azioni che richiedono un veicolo |
| aiFon ultimo modello | 1.200€ | drip | Drip 1.200 |
| Motorino elaborato | 1.500€ | veicolo | Veicolo liv. 2: come il monopattino ma −10 pt Gabbio nelle azioni di Fuga e −5 pt in quelle che richiedono veicolo |
| Orologio 'svizzero' di Napoli | 2.500€ | drip | Drip 2.500 |

Regole:
* Il **Drip** conta per il Patrimonio (al 50%) e aumenta la rep del "Chillare in piazza" (+1 ogni 500€ di drip).
* I **veicoli** possono essere sequestrati (50% se arrestato durante un'azione che richiede veicolo; 20% a un posto di blocco senza casco) o rubati (il monopattino, evento "Guaio").
* Gli **attrezzi** non si perdono mai.

$ Oggetti futuri da valutare: "Casa del cuggino" (affitto settimanale, sblocca un quinto slot "Siesta"), "Cane Pitbull" (−rischio ospedale, +mantenimento), "Avvocato in abbonamento".

## Le azioni

### Regole generali

Ogni azione e' definita da questi campi:

* **Slot** in cui e' disponibile; **Trasferta** (costa 1 slot extra senza veicolo/Magrebino); **Rep minima** per sbloccarla.
* **Energia** consumata.
* **Spesa (min–max)**: l'*investimento*. Il giocatore sceglie con uno slider quanto spendere tra il minimo e il massimo. Spendere di piu' **abbassa la probabilita' di gabbio** (da "spesa min" a "spesa max" nella tabella, lineare) e **alza il bottino** (il minimo del bottino sale fino alla meta' dell'intervallo). Nelle azioni "× spesa" il bottino e' direttamente un multiplo di quanto investito. La spesa e' persa comunque, anche se l'azione fallisce.
* **Gabbio**: probabilita' di essere beccati dagli sbirri → Arresto → Tribunale.
* **Ospedale**: probabilita', *se non beccati*, che l'azione finisca male → ricovero.
* **Bottino**: estratto a caso nell'intervallo, poi moltiplicato per i bonus (rep, classe, condizione del giorno) e per la **zona calda**.
* **Rep**: punti guadagnati (o persi) se l'azione riesce, prima dei moltiplicatori.
* **Pena base** in giorni di galera e **Multa** in euro, usate dal Tribunale.
* **Cooldown**: giorni prima di poter rifare l'azione.

Ordine di risoluzione: si paga spesa ed energia → tiro Gabbio → se no, tiro Ospedale → se no, successo (bottino + rep).

**Zona calda**: rifare lo *stesso* reato entro 7 giorni riduce il bottino ×0,85 per ogni ripetizione (minimo ×0,5). Insieme alla noia della piazza spinge a ruotare le azioni.

**Modificatori del rischio Gabbio** (si sommano/moltiplicano):

| Fonte | Effetto |
|---|---|
| Africano | ×0,9 |
| Balcanico in azioni di Forza | ×0,7 (anche sull'ospedale) |
| Veicolo liv. 1 / 2 in azioni di **Fuga** | −5 / −10 punti |
| Motorino in azioni che richiedono veicolo | −5 punti |
| Passamontagna (Notte) / Tronchese (Effrazione) | −5 punti |
| Condizione del giorno | vedi §Eventi (es. Blitz +10 punti, Nebbia ×0,85 di notte). I moltiplicatori (×) valgono su Gabbio e Ospedale, i punti (+/−) solo sul Gabbio |
| "Attenzionato" (sbirro di quartiere, TV, cuggino offeso) | +5/+10 punti per N giorni |

Tag usati nelle tabelle: Furto, Truffa, Forza, Spaccio, Azzardo, Social, Legale, Fuga (bonus veicolo), Effrazione, Notte.

$ Scala dei rischi: il giocatore medio fa ~700 azioni l'anno. A 5% di rischio sono 35 arresti se facesse solo quello; per questo i reati "di routine" stanno sotto il 10% e la varieta' e' forzata da cooldown e zona calda. La simulazione del giocatore bilanciato da' 14–17 arresti l'anno e 60–90 giorni di galera; il casuale 18–20 arresti e ~150 giorni. Il Tribunale e' quindi una scena ricorrente (ogni 2–4 settimane) e deve durare meno di 20 secondi reali.

### Azioni legali e sociali (sempre disponibili)

| ID | Azione | Slot | Trasf. | Rep min | Energia | Spesa (min–max) | Gabbio (spesa min→max) | Ospedale | Bottino | Rep | Pena base | Multa | Cooldown |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| L01 | Chillare in piazza | tutti | — | — | 10 | — | — | — | — | +0,5 (+drip/500) fino a rep 60 | 1 gg | — | — |
| L02 | TikTok brainrot in piazza | Mat/Pom/Ser | — | — | 20 | — | — | — | — | +1.5 fino a rep 80 (8%: +10) | 1 gg | — | — |
| L03 | Turno al minimarket | Mat/Pom/Ser | — | — | 40 | — | — | — | 20€–30€ | -1 | 1 gg | — | — |
| L04 | Rider delle consegne | Mat/Pom/Ser | sì | — | 50 | — | — | — | 20€–30€ | 0 | 1 gg | — | — |
| L05 | Calisthenics al parco | Mat/Pom/Ser | — | — | 30 | — | — | — | — | +1 | 1 gg | — | — |

* **L01 Chillare in piazza** — Muretto, cassa bluetooth, sguardo da duro. Serve solo a farsi conoscere: la rep che rende scende linearmente fino a zero a rep 60. Il bonus drip (+1 ogni 500€) conta anche i veicoli: il motorino in piazza si vede. Le condizioni Social del giorno (Virale, Halloween, Capodanno) valgono anche qui.
* **L02 TikTok brainrot in piazza** — Balletto davanti al kebabbaro con sottofondo trap. 8% di diventare virale (+10 rep). Non si gira sotto la pioggia.
* **L03 Turno al minimarket** — Otto ore a riempire il frigo delle birre. Paga poco e la piazza ti prende in giro.
* **L04 Rider delle consegne** — Zaino termico e poke per i fighetti del centro. Onesto, stanco, triste. E' la rete di sicurezza di chi e' al verde.
* **Un solo lavoro al giorno** (minimarket *o* rider): nessuno ti da' due turni. Serve a evitare che la paga onesta diventi la strategia di default.
* **L05 Calisthenics al parco** — Sbarre del parchetto, muscle-up a petto nudo. L'unico modo di recuperare Salute in fretta.

### Azzardo

| ID | Azione | Slot | Trasf. | Rep min | Energia | Spesa (min–max) | Gabbio (spesa min→max) | Ospedale | Bottino | Rep | Pena base | Multa | Cooldown |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| G01 | Slot al bar del cinese | tutti | — | — | 10 | 10€–200€ | — | — | 30%: ×2,5 la puntata | 0 | 1 gg | — | — |
| G02 | Scommessa clandestina | Mat/Pom/Ser | — | — | 15 | 20€–500€ | — | — | 45%: ×2 la puntata | 0 | 1 gg | — | — |
| G03 | Poker nel retrobottega | Not | — | — | 30 | 50€–300€ | 5% | — | 40% (+rep/500): ×2,5 la puntata | +3 vinci / −2 perdi | 2 gg | 200€ | — |
| G04 | Corsa clandestina in monopattino *(veicolo)* | Ser/Not | — | — | 30 | 20€–100€ | 10% | 15% | 50%: ×2 la puntata | +4 | 1 gg | 150€ | — |

* **G01 Slot al bar del cinese** — La macchinetta sotto casa. Valore atteso 75%: un pozzo di soldi per chi non resiste.
* **G02 Scommessa clandestina** — Punti sulla partita con il bookmaker abusivo del bar. Vincere da' anche +2 rep.
* **G03 Poker nel retrobottega** — Texas hold'em nel retro della sala scommesse. Piu' hai rep, piu' il tuo bluff regge (+rep/500 alla probabilita' di vincere). Vincere da' +3 rep, perdere −2. La bisca puo' essere chiusa dagli sbirri (5%).
* **G04 Corsa clandestina in monopattino** *(richiede veicolo)* — Monopattini sbloccati a 60 km/h sulla tangenziale. Vinci la puntata (50%, 60% per il Balcanico) e +4 rep, o finisci sull'asfalto.

### Reati — Tier 1 (rep 0+): la gavetta

| ID | Azione | Slot | Trasf. | Rep min | Energia | Spesa (min–max) | Gabbio (spesa min→max) | Ospedale | Bottino | Rep | Pena base | Multa | Cooldown |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| C01 | Truffa dell'anello d'oro | Mat/Pom/Ser | — | — | 20 | 1€ | 4% | 4% | 25€–100€ | +2 | 1 gg | 100€ | — |
| C02 | Portoghese sul regionale | Mat/Pom/Ser | — | — | 15 | — | 5% | — | 10€–20€ | +1 | 1 gg | 100€ | — |
| C03 | Taccheggio al Lidl | Mat/Pom/Ser | — | — | 20 | — | 6% | 4% | 15€–50€ | +1 | 1 gg | 100€ | — |
| C04 | Rubare alcool all'alimentari | Mat/Pom/Ser | — | — | 25 | — | 8% | 5% | 20€–60€ | +3 | 2 gg | 100€ | — |
| C05 | Borseggio al mercato | Mat | — | — | 30 | — | 8% | 10% | 25€–160€ | -3 | 3 gg | — | — |
| C06 | Tag sui muri del quartiere | Ser/Not | — | — | 25 | 5€–20€ | 8%→5% | — | — | +4 (8%: +10) | 1 gg | 150€ | — |
| C07 | Fumo nascosto nel parchetto | Ser/Not | — | — | 30 | — | 6% | 15% | 0€–200€ | +5 | 4 gg | — | — |
| C08 | Truffa Vinted (sneakers fulle) | tutti | — | — | 20 | 15€–60€ | 6% | — | spesa × 1.8–3.5 | +2 | 3 gg | 300€ | 4 gg |
| C09 | Ruba monopattino elettrico | tutti | — | — | 35 | 0€–30€ | 15%→8% | 5% | 50€–260€ | +4 | 4 gg | — | — |
| C10 | Parkour sui tetti per TikTok | Mat/Pom/Ser | — | — | 40 | — | 3% | 15% | — | +6 fino a rep 80 (8%: +10) | 1 gg | 200€ | — |

* **C01 Truffa dell'anello d'oro** — Raccogli da terra un anello di ottone dorato da 1€ e convinci un passante credulone che e' oro puro, chiedendogli una ricompensa.
* **C02 Portoghese sul regionale** — Sali sul regionale senza biglietto. Appena vedi spuntare la divisa del controllore, ti chiudi in bagno o corri lungo i vagoni per scendere alla fermata dopo. Se ti bloccano: multa.
* **C03 Taccheggio al Lidl** — Tuta larga, zaino aperto. Se riesce, oggi non paghi il mantenimento.
* **C04 Rubare alcool all'alimentari** — Entri nell'alimentari, ti infili due bottiglie di superalcolici dentro la tuta larga e esci facendo finta di niente. Se il proprietario ti sgama, ti rincorre col mocio.
* **C05 Borseggio al mercato** — Nel casino del mercato ti infili tra i banchi e con la mano lesta sfili la borsa della spesa della signora. Mossa poco rispettata: "ai vecchi non si ruba" (−3 rep). Solo di Mattina; il Venerdi' il mercato e' piu' pieno (condizione "Mercato straordinario").
* **C06 Tag sui muri del quartiere** — Bombolette e il tuo nome su ogni saracinesca. Pura rep. Piu' bombolette compri, piu' grande e' il pezzo e meno tempo stai esposto.
* **C07 Fumo nascosto nel parchetto** — Setacci cespugli e tubi della luce del parco per scovare le "stecche" nascoste dagli spacciatori di zona. Il rischio vero non e' la madama, sono i proprietari.
* **C08 Truffa Vinted (sneakers fulle)** — Metti in vendita scarpe tarocche prese dai cinesi spacciandole per "Edizione Limitata intonsa" con scontrino finto. Piu' paia compri, piu' incassi. Il profilo viene bannato per 4 giorni dopo ogni colpo (cooldown).
* **C09 Ruba monopattino elettrico** — Tranci il lucchetto di un monopattino in sharing e te lo porti via. Con un tronchese vero (30€) e' tutto piu' veloce. Se non hai un veicolo, il 50% delle volte te lo tieni *invece* di venderlo (niente bottino, ma hai un mezzo).
* **C10 Parkour sui tetti per TikTok** — Salti tra i tetti dei capannoni con il telefono in mano. Rep alta, rischio di gabbio quasi nullo, ma un piede in fallo e' un mese di gesso.

### Reati — Tier 2 (rep 10+): il quartiere ti conosce

| ID | Azione | Slot | Trasf. | Rep min | Energia | Spesa (min–max) | Gabbio (spesa min→max) | Ospedale | Bottino | Rep | Pena base | Multa | Cooldown |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| C11 | Scippo in stazione (bici) | tutti | — | 10 | 40 | — | 15% | 10% | 45€–380€ | +4 | 6 gg | — | — |
| C12 | Scippo al centro commerciale | Mat/Pom | sì | 10 | 35 | — | 12% | 5% | 75€–600€ | +4 | 6 gg | — | — |
| C13 | Scassinare auto | Ser/Not | — | 10 | 45 | 0€–20€ | 15%→8% | 5% | 15€–450€ | +4 | 6 gg | — | — |
| C14 | Truffa dello specchietto | Mat/Pom/Ser | — | 10 | 40 | — | 12% | 10% | 75€–300€ | +4 | 5 gg | 300€ | — |
| C15 | Parcheggiatore abusivo *(solo giorni evento)* | Pom/Ser | sì | 10 | 40 | 0€–10€ | 12%→8% | 10% | 30€–180€ | +3 | 1 gg | 200€ | — |
| C16 | Bagarinaggio allo stadio *(solo giorni evento)* | Pom/Ser | sì | 10 | 45 | 90€–300€ | 8% | 5% | spesa × 1.5–3.0 | +3 | 2 gg | 500€ | — |
| C17 | Rissa per collana/cappello drip | Pom/Ser | — | 10 | 50 | — | 12% | 20% | 60€–380€ | +6 | 7 gg | — | — |
| C18 | Rapina al rider | Ser/Not | — | 10 | 45 | — | 12% | 15% | 45€–220€ | -2 | 9 gg | — | — |

* **C11 Scippo in stazione (bici)** — Sfrecci sulla bici pieghevole e sfili il marsupio a un pendolare distratto mentre guarda gli orari dei treni. Azione di Fuga: con un veicolo il rischio scende.
* **C12 Scippo al centro commerciale** — Nella food court adocchi una borsa appoggiata sullo schienale della sedia, la sfili e scompari tra la folla. Trasferta.
* **C13 Scassinare auto** — Spacchi il finestrino di un'auto parcheggiata al buio con una candela d'auto per svuotare il cassetto portaoggetti. Guanti e cappuccio (20€) abbassano il rischio.
* **C14 Truffa dello specchietto** — Lanci una sassata contro la portiera di una macchina in rotonda e sostieni che ti ha spaccato lo specchietto, pretendendo contanti sul posto. Se l'automobilista insiste per il CID, chiama i vigili.
* **C15 Parcheggiatore abusivo** *(solo giorni evento)* — Gilet catarifrangente trovato nei cespugli e "un'offerta per la custodia" nel piazzale dello stadio o della discoteca.
* **C16 Bagarinaggio allo stadio** *(solo giorni evento)* — Compri biglietti col bot dell'amico e li rivendi al triplo ai disperati rimasti fuori. L'investimento decide il guadagno.
* **C17 Rissa per collana/cappello drip** — Punti un ragazzetto in piazza con il cappello introvabile e glielo strappi, scatenando un parapiglia. Se la sua compagnia reagisce in blocco, ospedale.
* **C18 Rapina al rider** — Gli blocchi la strada e gli prendi lo zaino e, se va bene, il motorino (bottino sempre, piu' il 50% di ottenere un veicolo se non ne hai). Mossa infame: il rider e' un poveraccio come te (−2 rep).

### Reati — Tier 3 (rep 20+): lavori seri

| ID | Azione | Slot | Trasf. | Rep min | Energia | Spesa (min–max) | Gabbio (spesa min→max) | Ospedale | Bottino | Rep | Pena base | Multa | Cooldown |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| C19 | Rame al cantiere | Not | sì | 20 | 70 | 0€–50€ | 15%→8% | 12% | 120€–600€ | +5 | 9 gg | — | — |
| C20 | Rapina alla lucciola sulla statale | Ser/Not | sì | 20 | 50 | — | 12% | 25% | 150€–750€ | -6 | 12 gg | — | — |
| C21 | Spaccio fuori dalla discoteca | Ser/Not | sì | 20 | 60 | 50€–300€ | 22% | 6% | spesa × 2.0–4.0 | +8 | 15 gg | — | — |

* **C19 Rame al cantiere** — Ti intrufoli di Notte nel cantiere dell'alta velocita' per sfilare i cavi di rame e rivenderli al chilo. Il furgone del cuggino (50€) raddoppia il carico.
* **C20 Rapina alla lucciola sulla statale** — Ti apposti di Sera/Notte, individui una ragazza isolata e le strappi la borsetta. Se il protettore e' appostato nel furgone vicino, finisce malissimo. La piazza non rispetta chi se la prende con le lucciole (−6 rep).
* **C21 Spaccio fuori dalla discoteca** — Ti piazzi nel parcheggio all'uscita dei locali a vendere "robina" tagliata male. L'investimento e' la merce: incassi 2–4 volte quello che compri. La zona e' piena di pattuglie in borghese.

### Reati — Tier 4 (rep 35+): la fiducia del boss

| ID | Azione | Slot | Trasf. | Rep min | Energia | Spesa (min–max) | Gabbio (spesa min→max) | Ospedale | Bottino | Rep | Pena base | Multa | Cooldown |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| C22 | Topino d'appartamento | Mat/Pom/Not | — | 35 | 80 | 0€–100€ | 25%→12% | 10% | 200€–2.500€ | +7 | 24 gg | — | 3 gg |
| C23 | Corriere per il boss *(veicolo)* | tutti | sì | 35 | 50 | 0€–30€ | 25%→15% | 5% | 150€–800€ | +8 | 21 gg | — | 2 gg |
| C24 | Spedizione punitiva per il boss | Ser/Not | — | 45 | 70 | — | 20% | 20% | 100€–600€ | +12 | 18 gg | — | 7 gg |
| C25 | Spaccata al Compro Oro *(veicolo)* | Not | — | 50 | 60 | 0€–200€ | 25%→12% | 10% | 150€–1.200€ | +10 | 30 gg | — | 14 gg |

* **C22 Topino d'appartamento** — Ti arrampichi sulla grondaia ed entri dalla finestra lasciata aperta al primo piano. Un palo e una scala (100€) dimezzano il rischio. Il colpo piu' redditizio prima del bancomat; a Ferragosto la citta' e' vuota (bottino ×2).
* **C23 Corriere per il boss** *(richiede veicolo)* — Fai da spedizioniere rapido per consegnare panetti e bustine in giro per la citta' per conto del capo. Posti di blocco con i cani ovunque.
* **C24 Spedizione punitiva per il boss** — Il boss ti manda con la cricca a "chiarire un malinteso" con una banda rivale. Spranghe. E' l'azione che da' piu' rep di tutto il gioco.
* **C25 Spaccata al Compro Oro** *(richiede veicolo)* — Lanci uno scooter rubato contro la vetrina per fare razzia di catenine. Colpo rumoroso: la piazza ne parla per settimane (cooldown 14 giorni).

### Endgame (rep 70+)

| ID | Azione | Slot | Trasf. | Rep min | Energia | Spesa (min–max) | Gabbio (spesa min→max) | Ospedale | Bottino | Rep | Pena base | Multa | Cooldown |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| C26 | Furto del BANCOMAT | Not | — | 70 | 80 | 300€–5.000€ | 60%→8% | 15% | 4.000€–30.000€ | +5 | 60 gg | — | 30 gg |

* **C26 Furto del BANCOMAT** — Classica rimozione forzata del bancomat con spettacolare esplosione all'acetilene. Da 300€ (una bombola e una Panda) a 5.000€ (squadra, furgone, basista): l'investimento decide quasi tutto. Riuscito, vale un anno di scippi. Beccato con precedenti, e' la fine della run.

$ Il bancomat e' progettato come *tentazione*: a investimento massimo ha valore atteso di circa +15.000€, ma e' l'unica azione con una pena base (60 giorni) che con la recidiva (fino a ×1,5) e l'aggravante (×1,5) supera i 90 giorni → game over. Un incensurato puo' permetterselo una volta; un recidivo se lo gioca la run. E' esattamente la curva che vogliamo: il colpo grosso deve far litigare la chat di Twitch.

## Sbirri, arresto e Tribunale

### Arresto
Quando il tiro Gabbio fallisce:
1. L'azione e' persa (spesa inclusa).
2. **Sequestro**: la madama trova il 10% dei contanti, massimo 500€ ("quelli in tasca").
3. Se l'azione richiedeva un veicolo, 50% che venga sequestrato.
4. Si apre la schermata del **Tribunale di quartiere**.

### Tribunale
Il giocatore vede la **pena richiesta** (pena base dell'azione, aumentata del 10% per ogni condanna precedente fino a +50%, ×1,25 se e' in "messa alla prova") e la multa, e sceglie la difesa:

| Difesa | Costo | Effetto |
|---|---|---|
| Avvocato d'ufficio | 0€ | Tiro normale |
| Avvocato di quartiere (il cuggino avvocato) | 150€ | +10 al tiro |
| Avvocato di grido | 600€ | +25 al tiro |
| Patteggiamento | 0€ | Niente tiro: pena ×0,6 garantita, multa piena, conta come condanna |
| Fare lo spavaldo in aula | 0€ | +5 rep subito, −15 al tiro |

**Tiro del giudice**: d100 + bonus difesa + modificatori:
* Africano +10, Italiano −10.
* **Tutorial**: +15 nei primi 7 giorni di gioco.
* **Incensurato**: +10 se non ci sono condanne precedenti.
* Recidiva: −3 per ogni condanna precedente (max −15).
* "Noto in questura": −(rep − 60)/5, continuo, fino a −8.

| Risultato | Esito | Pena | Multa | Altro |
|---|---|---|---|---|
| ≥ 85 | **Assolto** ("intoccabile") | 0 | 0 | +2 rep |
| 65–84 | **Messa alla prova** | 0 | 50% | 30 giorni "sorvegliato": la prossima pena richiesta e' ×1,25 |
| 40–64 | **Pena ridotta** | ×0,5 | piena | condanna |
| 10–39 | **Pena piena** | ×1 | piena | condanna |
| < 10 | **Aggravata** | ×1,5 | doppia | condanna |

Con avvocato d'ufficio: **primo arresto in tutorial** (+25): 41% assolto, 20% messa alla prova, 25% ridotta, 14% piena, 0% aggravata (pena media ≈ 0,27 × richiesta). **Primo arresto dopo il tutorial** (+10): 26% / 20% / 25% / 29% / 0% (≈ 0,42). **Alla quinta condanna** (−15): 1% / 20% / 25% / 30% / 24% (≈ 0,79). La curva e' voluta: i primi guai si perdonano, i recidivi pagano tutto.

Multa non pagabile per intero: il resto si converte in 1 giorno di galera ogni 25€ (arrotondato per eccesso), sommato alla pena. Una difesa che non ci si puo' permettere non e' selezionabile. Le pene si arrotondano al giorno intero (0,5 → 1) e ogni condanna vale almeno 1 giorno.

### Galera
* I giorni passano automaticamente (schermata "cella" con un contatore e un diario di bordo di tre righe al giorno: e' un momento di respiro, non di noia; dura al massimo un paio di minuti reali).
* Mantenimento zero, reputazione **congelata** (ne' sale ne' decade), energia al 100% all'uscita, +3 rep all'uscita ("sei tornato piu' duro").
* Lo Zingaro puo' fare un'azione senza rischio al giorno (Chiamata al cuggino).
* Una pena che supera la fine dell'anno chiude la partita regolarmente al giorno 365 ("finisci l'anno al gabbio"): non e' game over, ma il patrimonio resta fermo.

### Ospedale
* Ricovero di **1–3 giorni**; Salute −20 (−30 per le risse); il 10% dei contanti "sparisce" dal comodino.
* All'uscita: energia 100%, Salute +20.
* Sotto Salute 30 il massimo di energia e' ridotto del 20% (mostrato come personaggio fasciato). La Salute puo' arrivare a zero anche fuori dall'ospedale (febbre, Caritas): la run finisce comunque.

## Fine partita

| Condizione | Esito | Punteggio |
|---|---|---|
| Giorno 365 raggiunto | **Vittoria**: card finale e leaderboard | Patrimonio × Rep |
| Una singola condanna ≥ 90 giorni | **"Marcito in galera"** | Patrimonio × Rep × 0,5 × giorni/365 |
| Piu' di 240 giorni di galera cumulati nell'anno | **"Marcito in galera"** | idem |
| Salute a 0 | **"Piantato all'ospedale"** | idem |

Non esiste la "rovina" economica: a 0€ si mangia alla Caritas e si fa il rider. E' voluto: la poverta' e' un rallentamento, non una fine; il gioco deve sempre permettere di tornare in piedi (e di avere la rivincita).

$ Con le pene attuali l'unica azione che puo' produrre da sola una condanna ≥ 90 giorni e' il bancomat (60 × recidiva × aggravante). Il game over per galera e' quindi riservato a chi tenta il colpo grosso da recidivo o a chi colleziona 240 giorni: nella simulazione nessun giocatore prudente o bilanciato ci arriva, il casuale nel 0–5% dei casi.

## Eventi

### Condizioni del giorno
All'inizio di ogni giorno si fa **una sola estrazione**: la probabilita' che il giorno abbia una condizione e' la somma delle probabilita' della tabella (circa il 50%, di piu' d'estate e d'inverno) e la condizione e' scelta in proporzione. Le condizioni a data fissa (Giorno di paga, Feste) hanno la precedenza. La condizione e' annunciata la Notte prima come **teaser** annunciata la Notte prima come **teaser** ("Domani: Operazione Alto Impatto. Occhio."). E' la ragione per cui il giocatore vuole vedere il giorno dopo.

| Condizione | Prob./giorno | Effetto |
|---|---|---|
| Piove a dirotto | 12% | +10 energia su tutti i reati (le azioni legali e l'azzardo sono al coperto); niente TikTok ne' parkour |
| Operazione Alto Impatto | 6% | +10 punti di rischio Gabbio su tutto |
| Derby in citta' | 5% | Sblocca bagarinaggio e parcheggiatore; Truffe ×1,3 bottino; Forza ×1,2 rischio |
| Concerto al palazzetto | 5% | Sblocca bagarinaggio e parcheggiatore |
| Blackout di quartiere | 4% | Azioni di Notte: rischio ×0,75; Effrazione ×1,3 bottino |
| Mercato straordinario | 5% | Furti ×1,3 bottino |
| Sciopero dei mezzi | 4% | Trasferte: +15 energia |
| Controlli Polfer | 4% | Portoghese: rischio ×2 |
| Nebbia fitta (Nov–Feb) | 5% | Fuga e Notte: rischio ×0,85 |
| Caldo bestiale (Giu–Ago) | 8% | Energia massima −15% per oggi (anche quella che hai gia') |
| Il quartiere e' virale | 4% | Azioni Social: rep ×2 |
| Giorno di paga in citta' | il 27 di ogni mese | Furti ×1,3, Truffe ×1,2 bottino |

### Feste del calendario (fisse)

| Data | Festa | Effetto |
|---|---|---|
| 15 Agosto | Ferragosto, citta' vuota | Topino ×2 bottino e rischio ×0,7; niente scippi (non c'e' nessuno) |
| 31 Ottobre | Halloween | Notte: rischio ×0,85; Social ×1,5 rep |
| 24 Dicembre | Vigilia di Natale | Furti ×1,5 bottino; +5 punti di rischio ovunque |
| 31 Dicembre | Capodanno | Social ×2 rep; Forza ×1,3 rischio |
| 16 Febbraio | Carnevale | −10 punti di rischio Gabbio (tutti mascherati) |
| 15 Feb – 16 Mar | Ramadan | Solo Magrebino: vedi abilita' |

$ Da aggiungere in seguito: Black Friday (centro commerciale), Pasqua (gite fuori porta → appartamenti vuoti), fine scuola (9 giugno, piazze piene), maturita', Sanremo (Social ×2 per una settimana).

### Guai & Opportunita' (eventi personali con scelta)
Ogni giorno c'e' il 15% di probabilita' (25% per il Balcanico) che succeda qualcosa **al personaggio**. Si apre una card con 1–2 scelte; alcune non lasciano scelta. Nessuno di questi eventi consuma uno slot. La rep dei guai segue le stesse regole delle azioni (rendimenti decrescenti, bonus di classe) e i soldi incassati seguono i bonus di classe (+10% Pakistano, −10% Africano). Un "attenzionato" nuovo non accorcia uno gia' attivo: si tiene il valore e la durata maggiori.

| Evento | Scelte / Esito |
|---|---|
| Il cuggino ha bisogno di 50€ | **Paga** (−50€, +3 rep) / **Rifiuta** (−3 rep; 20%: il cuggino spiffera → +5 punti di rischio per 7 giorni) |
| Un rivale ti sfida in piazza | **Accetta** (50% vinci, 65% per il Balcanico: +8 rep; perdi: −5 rep, −15 salute e 1–3 giorni di ospedale) / **Rifiuta** (−6 rep) |
| Posto di blocco a sorpresa | Se hai un veicolo: 30% ti fermano → multa 80€, o 20% sequestro del veicolo |
| Perquisizione all'alba | 30%: trovano il 10% dei contanti |
| Trovi un portafoglio | **Tienilo** (+20–150€) / **Restituiscilo in video** (+5 rep) |
| Il boss ti ha notato (rep ≥ 25) | Oggi Spaccio e Forza ×1,5 bottino |
| Un influencer ti mette nel video | +5 rep, −20 energia |
| Ti rubano il monopattino | 50% se ne hai uno di livello 1 |
| Tua madre ti manda a fare la spesa | −20 energia, +5 salute, −1 rep |
| Serata in disco | **Vai** (−40€, +4 rep, −30 energia) / **Resta a casa** |
| Lo sbirro di quartiere ti tiene d'occhio | +10 punti di rischio per oggi |
| Gratta e vinci trovato per terra | 0–100€ |
| Febbre | Energia dimezzata, −5 salute |
| Un giornalista vuole intervistarti sui maranza | **Accetta** (+8 rep, +5 punti di rischio per 7 giorni: sei in TV) / **Rifiuta** |
| Il kebabbaro ti offre un turno | +30€ |
| Ti saltano addosso per un vecchio screzio | 30%: 1–3 giorni di ospedale (−20 salute) |

$ Il sistema eventi e' una tabella dati (vedi `GUAI` e `CONDIZIONI` nel simulatore): aggiungere eventi e' un lavoro da content designer, non da programmatore. Obiettivo v1.0: 40 guai e 25 condizioni, con almeno 10 eventi a catena (es. il rivale sconfitto torna con la banda due settimane dopo).

## Interfaccia: semplice davanti, complessa dietro

Regola unica: **a schermo solo parole, icone e colori; i numeri stanno dietro il pulsante (?)**. Il (?) e' presente su ogni elemento che nasconde matematica; si apre al touch su mobile e al click/mouse-over su PC, come un tooltip, e si chiude toccando fuori.

| Elemento | Cosa si vede sempre | Cosa c'e' dietro il (?) |
|---|---|---|
| Soldi | "1.240 €" | Patrimonio = contanti + 50% drip; lista oggetti con valore |
| Reputazione | Barra + etichetta: *Sconosciuto* (0–9), *Zanza* (10–19), *Conosciuto* (20–34), *Rispettato* (35–49), *Boss di zona* (50–69), *Leggenda* (70+) | Valore %, cosa sblocca il prossimo grado, "−1%/giorno se non fai niente", "ripetere la stessa cosa annoia la piazza" |
| Energia | Barra con fulmine | Valore / massimo di oggi (caldo e salute bassa lo abbassano), cosa recupera ogni cibo |
| Salute | Barra con siringa, nessun numero | "Ogni ricovero la abbassa; parco e mensa la alzano; a zero finisce la run" |
| Bottone azione | Nome, icona, **pallino rischio** (🟢 basso < 8%, 🟡 medio 8–15%, 🔴 alto 16–30%, 💀 estremo > 30%), costo energia come fulmini (1: fino a 20, 2: fino a 40, 3: fino a 60, 4: oltre), bottino atteso alla tacca scelta come "€" (< 100€), "€€" (< 500€), "€€€" (da 500€). Il pallino usa **Gabbio + Ospedale** alla tacca selezionata (di default *Alla buona*) con tutti i modificatori di oggi | Percentuali esatte di gabbio e ospedale, intervallo del bottino, pena base e multa, rep, modificatori attivi oggi (es. "Blitz: +10%", "Passamontagna: −5%") |
| Slider investimento | Tre tacche: *Alla buona / Preparato / Da professionista* (t = 0 / 0,5 / 1) con il costo in € | Come cambia il rischio e il bottino tacca per tacca |
| Giorno | Data, slot con icona (☀️🌤️🌆🌙), riga della condizione ("Oggi piove") | Effetto numerico della condizione |
| Tribunale | Pena richiesta in giorni, 5 bottoni di difesa con il prezzo | Bonus al tiro di ogni difesa, modificatori attivi (incensurato, recidiva, classe), tabella degli esiti |
| Esito | Card con una frase e il risultato ("+340 €", "Assolto!", "3 giorni di ospedale") | Il tiro effettuato e la soglia |
| MARANZA POINTS | "4,6M" | Formula, patrimonio, rep, penalita' |

Linee guida:
* Mai mostrare due numeri dove ne basta uno; mai una percentuale senza (?).
* Il pallino del rischio tiene conto dei modificatori del giorno e dell'equipaggiamento: e' la verita' del momento, non il valore base.
* I nomi dei gradi di reputazione e le etichette dello slider sono testo di gioco (gergo), i valori nel (?) sono asciutti.
* Il messaggio del Boss spiega la *prima* volta; il (?) e' per chi vuole capire; nessun popup bloccante dopo il giorno 7.

## Loop di engagement ("voglio vedere domani")

1. **Teaser serale**: alla Notte compare la condizione del giorno dopo e, se c'e', il giorno-evento (derby, concerto). Il giocatore pianifica prima di chiudere l'app.
2. **Tier della rep come "promozioni"**: ogni soglia (10/20/35/45/50/70) e' annunciata da un messaggio in chat dal Boss che sblocca le nuove azioni con una frase sua. La rep che decade fa perdere l'accesso ai tier: mantenere il grado e' un motivo per tornare.
3. **Tribunale come scena**: il verdetto e' una card animata con il giudice, la difesa scelta e il tiro visibile (d100 che gira). E' il momento piu' condivisibile del gioco.
4. **Card degli esiti** (9:16, con nome e archetipo) per ogni bottino grosso, arresto, verdetto, evento e per il riepilogo settimanale ("Settimana 12: 1.840€, 1 gabbio, 0 ospedale, rep 41").
5. **Classifica tra amici** (link di invito) oltre a quella globale: Patrimonio × Rep a parita' di giorno di gioco, cosi' si puo' competere anche a meta' anno.
6. **Badge** sbloccabili mostrati nel profilo: "Primo gabbio", "Assolto per tre volte", "Re del rame", "Il bancomat", "Mai in galera", "Settimana da rider" (ironico).
7. **Ritmo**: una giornata di gioco deve durare 60–90 secondi reali. L'anno intero e' 6–9 ore: va bene per una season, ma vanno previste **stagioni corte** (90 giorni, 1 Giugno–31 Agosto) per gli streamer e per gli eventi social.

---

# Appendice A — Risultati della simulazione

Simulatore: `sim/maranza_sim.py` (Python 3, nessuna dipendenza oltre matplotlib per i grafici). Ogni riga = 200 partite complete con i valori di questo documento. Colonne: sopravvivenza al giorno 365, mediana di MARANZA POINTS, patrimonio, rep finale, giorni di galera, giorni di ospedale, arresti, azioni totali, e come sono finite le partite.

Le quattro policy automatiche:
* **prudente**: non tocca azioni con rischio combinato > 30%, pesa i costi della galera il doppio, avvocato migliore sempre.
* **bilanciato**: massimizza il valore atteso contando il costo-opportunita' dei giorni di galera; evita azioni la cui pena peggiore chiuderebbe la run.
* **yolo**: pesa i rischi la meta', compra drip appena puo', in aula fa lo spavaldo.
* **casuale**: non calcola nulla; sceglie a caso tra le azioni disponibili con probabilita' inversamente proporzionale al rischio mostrato dal pallino colorato, e il 20% delle volte in modo del tutto uniforme. E' il modello del giocatore tipico e **il riferimento principale del bilanciamento**.

```
=== CLASSI — policy prudente (200 run) ===
                sopr.    punti med   patrim.   rep galera   osp  arr. azioni  fine
Magrebino        100%    6,153,050    79,764  77.0     29    16   9.5    913  365 giorni:172, 365 giorni (finiti in cella):28
Pakistano        100%    6,516,898    86,928  75.2     34    17  11.0    906  365 giorni:150, 365 giorni (finiti in cella):50
Africano         100%    5,635,084    74,314  75.7     15    20  10.0    966  365 giorni:174, 365 giorni (finiti in cella):26
Zingaro          100%    6,908,410    91,665  74.8     28    18  10.0    948  365 giorni:152, 365 giorni (finiti in cella):48
Balcanico        100%    5,415,635    71,117  76.1     33    22  10.0    910  365 giorni:165, 365 giorni (finiti in cella):35
Italiano         100%    5,811,713    77,453  75.5     44    18  10.0    888  365 giorni:151, 365 giorni (finiti in cella):49

=== CLASSI — policy bilanciato (200 run) ===
                sopr.    punti med   patrim.   rep galera   osp  arr. azioni  fine
Magrebino        100%    6,867,987    82,711  83.7     84    33  15.0    695  365 giorni:139, 365 giorni (finiti in cella):61
Pakistano        100%    7,768,543    94,939  82.3     84    30  16.0    702  365 giorni:133, 365 giorni (finiti in cella):67
Africano         100%    6,495,766    77,994  82.6     60    33  16.0    776  365 giorni:139, 365 giorni (finiti in cella):61
Zingaro          100%    8,636,298   106,728  81.9     84    33  16.5    734  365 giorni:119, 365 giorni (finiti in cella):81
Balcanico        100%    6,576,326    79,927  82.0     90    31  15.0    696  365 giorni:123, 365 giorni (finiti in cella):77
Italiano         100%    6,595,807    80,273  82.1    106    31  15.0    653  365 giorni:110, 365 giorni (finiti in cella):90

=== CLASSI — policy yolo (200 run) ===
                sopr.    punti med   patrim.   rep galera   osp  arr. azioni  fine
Magrebino         86%   13,446,985   156,109  88.5    178    25  20.0    424  365 giorni:90, 365 giorni (finiti in cella):83, marcito in galera:27
Pakistano         80%   12,971,043   158,404  86.9    187    24  21.0    402  365 giorni (finiti in cella):89, 365 giorni:70, marcito in galera:41
Africano          96%    9,115,477   106,389  86.9    168    31  23.0    460  365 giorni (finiti in cella):108, 365 giorni:83, marcito in galera:9
Zingaro           83%   14,108,968   168,397  86.4    185    27  22.0    427  365 giorni (finiti in cella):102, 365 giorni:64, marcito in galera:34
Balcanico         78%    9,970,294   119,268  87.5    189    25  21.0    400  365 giorni (finiti in cella):93, 365 giorni:64, marcito in galera:43
Italiano          76%   11,233,673   136,639  87.0    202    24  19.0    370  365 giorni (finiti in cella):93, 365 giorni:59, marcito in galera:48

=== CLASSI — policy casuale (200 run) ===
                sopr.    punti med   patrim.   rep galera   osp  arr. azioni  fine
Magrebino         90%    1,047,459    15,197  73.4    168    28  19.0    466  365 giorni:97, 365 giorni (finiti in cella):84, marcito in galera:19
Pakistano         99%    1,012,278    14,764  69.3    148    28  18.0    534  365 giorni:100, 365 giorni (finiti in cella):98, marcito in galera:2
Africano         100%      746,551    10,847  70.1    123    32  18.0    600  365 giorni:123, 365 giorni (finiti in cella):77
Zingaro           96%    1,112,530    16,679  68.1    134    30  18.0    598  365 giorni:109, 365 giorni (finiti in cella):84, marcito in galera:7
Balcanico         96%      854,035    12,212  72.0    144    28  18.0    549  365 giorni:116, 365 giorni (finiti in cella):76, marcito in galera:8
Italiano          96%      817,320    12,063  69.9    153    28  17.0    522  365 giorni:101, 365 giorni (finiti in cella):90, marcito in galera:9

=== USO DELLE AZIONI (policy bilanciato, tutte le classi) ===
  C02 Portoghese sul regionale                16.7%
  L04 Rider delle consegne                    16.6%
  L05 Calisthenics al parco                   14.0%
  C06 Tag sui muri del quartiere              10.0%
  C13 Scassinare auto                          9.8%
  C22 Topino d'appartamento                    9.2%
  C08 Truffa Vinted (sneakers fulle)           7.0%
  L01 Chillare in piazza                       3.8%
  C09 Ruba monopattino elettrico               3.4%
  C25 Spaccata al Compro Oro                   2.2%
  C16 Bagarinaggio allo stadio                 1.9%
  G03 Poker nel retrobottega                   1.4%
  C23 Corriere per il boss                     1.3%
  C19 Rame al cantiere                         0.8%
  L02 TikTok brainrot in piazza                0.7%
  C12 Scippo al centro commerciale             0.6%
  C01 Truffa dell'anello d'oro                 0.3%
  C11 Scippo in stazione (bici)                0.2%
  C21 Spaccio fuori dalla discoteca            0.1%
  C04 Rubare alcool all'alimentari             0.1%
  C17 Rissa per collana/cappello drip          0.0%
  C07 Fumo nascosto nel parchetto              0.0%
  C14 Truffa dello specchietto                 0.0%
  C10 Parkour sui tetti per TikTok             0.0%
  C15 Parcheggiatore abusivo                   0.0%
  MAI usate: L03, G01, G02, G04, C03, C05, C18, C20, C24, C26

Grafico salvato: results/bilanciamento.png
```

### Lettura dei risultati
* **Il giocatore casuale** (il riferimento): sopravvive nel 90–100% delle partite, finisce l'anno con 13–19 mila euro e circa 1M di punti. Fa 16–19 arresti e passa 120–170 giorni in cella: tanti, ma in brevi tratti (mediana 7 giorni) e senza game over. Il 40% delle sue partite finisce l'anno in cella per una condanna tardiva: va mostrato come un finale ("hai finito l'anno al gabbio: 1,1M"), non come una sconfitta.
* **Equita' tra classi**: con la policy bilanciata le sei classi stanno in una forbice di ±14% (6,5M–8,6M) e con la prudente di ±12% (5,4M–6,9M), tutte al 100% di sopravvivenza. Lo Zingaro e' il piu' forte in entrambe (Prestanome), l'Italiano e il Balcanico i piu' deboli. Nessuna classe domina in tutti gli stili: con lo yolo vincono Pakistano e Magrebino.
* **Curva di difficolta'**: prudente ≈ 6M, bilanciato ≈ 7M, yolo ≈ 9–14M con sopravvivenza 76–96%. Lo yolo vince la classifica quando sopravvive, ma passa 180 giorni in cella e perde la run nel 3–23% dei casi (bancomat da recidivo, tetto dei 240 giorni). E' la forma voluta: il rischio paga, ma costa tempo e puo' costare tutto.
* **Galera**: bilanciato 14–17 arresti, 60–90 giorni; il Tribunale e' una scena ogni 3 settimane. Circa un terzo delle partite bilanciate finisce l'anno in cella: la policy automatica accetta rischi piu' alti negli ultimi mesi perche' "ha meno da perdere"; un giocatore umano fara' lo stesso, ed e' una dinamica da sfruttare (badge "Finale col botto").
* **Azioni usate** (bilanciato): rider e portoghese sono i riempitivi (18% ciascuno), poi calisthenics (per curare la Salute), scassinare auto, tag, topino, Vinted. Compro Oro e bancomat compaiono solo nelle policy aggressive. Le azioni mai scelte dalle policy (borseggio alle vecchiette, rapina al rider, lucciola, spedizione punitiva) hanno rep negativa o rischio-ospedale alto: esistono per il sapore e per il giocatore umano, non per l'ottimizzatore.

### Cose da verificare nel playtest
1. **Giorni di cella del casuale (120–170)**: le pene piu' corte non li riducono (il giocatore fa semplicemente piu' azioni e piu' arresti: ~18/anno e' un equilibrio). Se nel playtest risultano frustranti, la leva giusta e' il **rischio dei reati di tier 3–4** (ridurli del 20%), non le pene. Alternativa: rendere la cella un momento piacevole (diario, visite del cuggino, mini-eventi) piu' che corto.
2. **Lo yolo batte il bilanciato** (12M vs 8M) grazie al bancomat. E' accettabile per una leaderboard, ma se si vuole premiare la costanza: cooldown del bancomat 45 giorni o bottino 4–20K.
3. **Riempitivi**: rider (limitato a 1/giorno) e "Portoghese sul regionale" (rischio 5%, 15 energia) sono le azioni di riempimento. Valutare un cooldown di 1 giorno sul Portoghese.
4. **Fine anno in cella** (20–40% delle partite): aggiungere la schermata finale dedicata e la card "finito l'anno al gabbio".
5. **Soglie dei tier**: 35 e 45 sono vicine; valutare 10/20/30/45/60/75 con i nomi dei gradi della §Interfaccia.
6. **Azzardo**: valore atteso negativo, le policy non lo toccano; il giocatore umano si'. Va tenuto d'occhio che non diventi il modo principale di perdere la partita.

# Appendice B — Come usare il simulatore

```
cd sim
python3 maranza_sim.py                      # batch standard, stampa le tabelle dell'Appendice A
python3 maranza_sim.py --runs 200 --charts  # piu' run + grafico PNG
python3 maranza_sim.py --verbose --classe Italiano --policy yolo
                                            # una partita sola con il log giorno per giorno
python3 export_data.py                      # esporta tutti i dati di gioco in data/game-data.json
python3 build_gdd.py                        # rigenera docs/GDD.md dalle tabelle dati del simulatore
```

Tutte le costanti stanno nella sezione `DATI` del file: classi, cibo, negozio, avvocati, azioni (`_a(...)`), condizioni, feste, guai. Il motore non contiene numeri di gioco. Per provare un'idea (una nuova azione, una pena diversa) si modifica la riga dati e si rilancia: 200 run per combinazione richiedono circa 35 minuti su 2 core (60 run: 10 minuti).

$ Il simulatore e' anche la specifica di riferimento per il motore di gioco: le funzioni `rischi()`, `estrai_bottino()`, `esegui()`, `arresto()` (tribunale), `ricovero()`, `dormi()`, `nuovo_giorno()` ed `evento_personale()` sono da portare 1:1 in TypeScript (`data/game-data.json` contiene tutti i dati gia' esportati), e i test del motore devono confrontare le distribuzioni degli esiti con quelle del simulatore (stesse policy automatiche, stessi ordini di grandezza).
