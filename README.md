# Maranza Simulator

Life-sim satirico 2D per browser, mobile-first e installabile come PWA, del collettivo **Casa Bombadil**.
Porti in piazza un maranza per un anno virtuale: bravate, drip, sbirri, tribunale, galera e ospedale,
con l'obiettivo di arrivare al 365° giorno con piu' patrimonio e reputazione possibile.

**Demo pubblica dell'alpha:** https://vb-mich.github.io/MaranzaSimulator/

> Opera di pura finzione, satira di costume e parodia dell'immaginario urbano italiano ed europeo. Nomi,
> personaggi, gergo e dinamiche sono caricature. Il gioco non intende promuovere, giustificare o istigare
> alcun comportamento illecito, discriminatorio o violento nella vita reale.

## Avvio

Serve Node 22.12 o piu' recente.

```
npm ci            # dipendenze esatte da package-lock.json
npm run dev       # gioco in locale su http://localhost:5173
npm test          # test del motore (le tracce vogliono python3 nel PATH, senza vengono saltate)
npm run build     # build di produzione in dist/
npm run preview   # serve la build, con service worker e funzionamento offline
```

Ogni push su `main` rifa' test e build e pubblica la demo su GitHub Pages
(`.github/workflows/pages.yml`, con `BASE_PATH=/MaranzaSimulator/`). Gli altri branch e le pull request
fanno solo test e build (`.github/workflows/test.yml`).

### Installare il gioco sul telefono

Apri la demo dal telefono e scegli "Aggiungi a schermata Home" (Safari) o "Installa app" (Chrome). Il
gioco parte a schermo intero e funziona anche offline: app, dati e grafica restano in cache e si
aggiornano da soli alla prossima apertura dopo un rilascio.

## Come si gioca

* **Scegli classe e nome**, nient'altro: in trenta secondi sei in piazza. Le sei classi partono con
  statistiche e abilita' diverse.
* **Ogni giorno ha quattro momenti** (Mattina, Pomeriggio, Sera, Notte). Ogni azione ne consuma uno,
  costa energia e a volte soldi. Almeno un momento va speso a dormire, e quando dormi scegli dove
  mangiare: piu' spendi, piu' energia recuperi.
* **Il pallino colorato** su ogni azione dice quanto rischi oggi: verde si fa, rosso si pensa. Lo slider
  (*Alla buona, Preparato, Da professionista*) decide quanto investire: piu' spendi, meno rischi e piu'
  incassi.
* **La reputazione** sblocca reati sempre piu' seri e alza i bottini, ma cala ogni giorno e ripetere
  sempre la stessa cosa annoia la piazza.
* **Se ti beccano** c'e' il Tribunale di quartiere: scegli la difesa e il giudice tira il dado. Puo'
  finire con l'assoluzione, la messa alla prova o qualche giorno di galera. Se invece l'azione va
  storta, finisci in ospedale.
* **Il Boss** ti scrive in chat la prima volta che succede qualcosa di nuovo. Ogni notte arriva il teaser
  della condizione di domani, e ci sono feste del calendario e guai con una scelta da fare.
* **A schermo solo parole, icone e colori**: i numeri veri stanno dietro ogni (?).
* **Fine partita**: al 365° giorno contano i MARANZA POINTS (patrimonio × reputazione). Marcire in galera
  o restare piantati all'ospedale chiude la run prima, e conta molto meno.

Tutte le regole sono in [`docs/GDD.md`](docs/GDD.md).

## Come e' fatto

```
data/game-data.json   tutti i numeri del gioco (generato dal simulatore, non si modifica a mano)
docs/GDD.md           game design document (generato da sim/gdd_template.md)
sim/                  simulatore Python di riferimento, giocatori automatici, export dei dati e del GDD
src/engine/           motore puro e deterministico: applica(stato, comando) -> { stato, esiti }
src/data/             dati tipizzati e testi di gioco (testi.ts)
src/ui/               interfaccia React + Tailwind
scripts/              harness autoplay e giocatori automatici in TypeScript
tests/                test vitest, fixture e tracce generate dal Python
assets/art/           PNG sorgente della grafica e manifest
public/               grafica WebP per il gioco e icone della PWA
tools/                generazione e ottimizzazione delle immagini, icone della PWA
```

Il motore TypeScript riproduce il simulatore **partita per partita**: stesso generatore casuale di
Python, stesso ordine di estrazioni, stessi arrotondamenti. Con lo stesso seme e le stesse scelte le due
implementazioni giocano la stessa partita.

## Rigenerare dati, GDD e verifiche

Il bilanciamento si cambia solo nel simulatore, mai nel codice del gioco:

```
cd sim
python3 maranza_sim.py --runs 200 --charts > results/batch_finale.txt   # batch di riferimento + grafico
python3 export_data.py                                                   # -> data/game-data.json
python3 build_gdd.py                                                     # -> docs/GDD.md
python3 export_pdf.py                                                    # -> docs/GDD.pdf (markdown, weasyprint)
cd ..
npm test
npm run autoplay      # 4800 partite in TypeScript: la tabella deve essere identica a batch_finale.txt
```

Il grafico vuole `matplotlib`. Altre opzioni utili:

```
python3 sim/maranza_sim.py --verbose --classe Italiano --policy yolo         # una partita col log
npm run autoplay -- --classe Zingaro --policy casuale --seme 3               # la stessa cosa in TS
TRACCE_SEMI=0,1,2 npm test                                                   # piu' tracce passo per passo
```

## Rigenerare la grafica

La grafica si genera con `tools/gen-image.mjs` (OpenAI gpt-image), con lo stile di `tools/image-style.md`
aggiunto in testa a ogni prompt. Serve `OPENAI_API_KEY` in `.env` (vedi `.env.example`; `.env` non va mai
in git).

```
node tools/gen-image.mjs --batch tools/jobs/alpha-assets.json --concurrency 8 --skip-existing
python3 tools/ottimizza-art.py      # PNG di assets/art/ -> WebP in public/art/ + assets/art/manifest.json
python3 tools/icone-pwa.py          # icone della PWA in public/icons/ dall'icona dell'app
```

I job sono in `tools/jobs/`; la skill `generate-image` per Claude Code e' in `tools/_install-skill/`.
Regole per le immagini: caricatura di comportamenti e outfit, mai di etnie o religioni; niente marchi,
persone o stemmi reali; nessun testo dentro le immagini.

## Licenza

[AGPL-3.0](LICENSE).
