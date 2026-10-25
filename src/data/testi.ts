// Every text of the game, in Italian. Components and engine use ids; the words live here.
// Numbers in the (?) texts are read from game-data.json, never retyped.
// No real brands: data names like "Lidl" or "Vinted" get a parody name here (the ids don't change).

import { C, DATI, type Classe } from './gameData';

const G = C.GUAI_EFFETTI;
const perc = (x: number) => `${Math.round(x * 100)}%`;

export interface TestoAzione {
  nome: string;
  desc: string;
  /** Lines for a success; one is picked. */
  ok: string[];
  /** Gambling: lines for a win and a loss. */
  vinto?: string[];
  perso?: string[];
}

export interface TestoGuaio {
  titolo: string;
  testo: string;
  icona: string;
  opzioni?: Record<string, string>;
  risultati: Record<string, string>;
}

export interface TestoClasse {
  nome: string;
  motto: string;
  /** The abilities in two lines (class card). */
  abilita: [string, string];
  /** The abilities with their numbers (behind the (?)). */
  dettaglio: string[];
}

const classi: Record<Classe, TestoClasse> = {
  Magrebino: {
    nome: 'Magrebino',
    motto: 'Taglio sfumato, profumo insetticida e un marsupio che vale più di quello che c\'è dentro.',
    abilita: ['Trasferte senza perdere tempo; col drip buono la piazza lo rispetta di più.', 'Niente azzardo, e nel mese di Ramadan di giorno sta fermo.'],
    dettaglio: [
      'Spostamento rapido: le trasferte non costano slot in più.',
      `Trapper di quartiere: +${perc(C.TRAPPER_REP_MULT - 1)} sui guadagni di rep con un capo drip da più di ${C.TRAPPER_DRIP_MIN} €.`,
      `Niente azzardo. Dal ${C.RAMADAN_INIZIO[1]}/${C.RAMADAN_INIZIO[0]} al ${C.RAMADAN_FINE[1]}/${C.RAMADAN_FINE[0]} niente azioni di Mattina e Pomeriggio (dormire si può).`,
    ],
  },
  Pakistano: {
    nome: 'Pakistano',
    motto: 'Sempre aperto, anche sotto le bombe. Nel suo minimarket trovi le birre calde alle 4 di notte e le SIM intestate al cugino.',
    abilita: ['Incassa di più su tutto; una volta al mese, a secco, si ricarica da solo.', 'Di Notte esce una sola volta a settimana.'],
    dettaglio: [
      `Instancabile: con energia a ${C.INSTANCABILE_SOGLIA} o meno torna a ${C.INSTANCABILE_ENERGIA}, una volta al mese.`,
      `Business is business: +${perc(C.INCASSO_PAKISTANO_MULT - 1)} su ogni incasso.`,
      'Ventiquattrosette: una sola azione di Notte a settimana (da lunedì a domenica).',
    ],
  },
  Africano: {
    nome: 'Africano',
    motto: 'Parla quattro lingue e cinque dialetti. Guardalo negli occhi due secondi e ti ritrovi tre braccialetti al polso e 10 € in meno.',
    abilita: ['Il giudice lo prende in simpatia e scappa più veloce degli sbirri.', 'Una parte di ogni incasso va a casa, alla famiglia.'],
    dettaglio: [
      `Rifugiato climatico: +${C.TIRO_CLASSE.Africano} al tiro del giudice.`,
      `Fuga istantanea: rischio di gabbio ×${String(C.FUGA_AFRICANO_MULT).replace('.', ',')}.`,
      `Soldi alla famiglia: −${perc(1 - C.INCASSO_AFRICANO_MULT)} su ogni incasso.`,
    ],
  },
  Zingaro: {
    nome: 'Zingaro',
    motto: 'Catene d\'oro spesse tre dita, cinque macchinoni in garage e ufficialmente nullatenente.',
    abilita: ['Le perdite di soldi spesso spariscono nel nulla; in galera chiama il cuggino.', 'La piazza gli concede un po\' meno rispetto.'],
    dettaglio: [
      `Prestanome: ogni perdita di soldi (multa, sequestro, furto, avvocato) ha il ${perc(C.PRESTANOME)} di probabilità di essere azzerata.`,
      `Chiamata al cuggino: anche in galera un'azione senza rischi al giorno, a energia ×${C.CUGGINO_ENERGIA_MULT}.`,
      `Vita di carovana: −${perc(1 - C.REP_ZINGARO_MULT)} sui guadagni di rep.`,
    ],
  },
  Balcanico: {
    nome: 'Balcanico',
    motto: 'Berlina tedesca del 2004 coi chilometri scalati, braccia come pilastri e una passione seria per il rame.',
    abilita: ['Nelle azioni di forza rischia meno e si ricarica sempre al massimo, qualunque cosa mangi.', 'I guai lo trovano più spesso.'],
    dettaglio: [
      `Forza bruta: nelle azioni di Forza gabbio e ospedale ×${String(C.FORZA_BRUTA_MULT).replace('.', ',')}.`,
      'Recupero sovraumano: dormendo recupera sempre il 100% dell\'energia.',
      `Arroganza balcanica: guai al ${perc(C.P_GUAIO_BASE + C.GUAIO_BALCANICO_BONUS)} al giorno invece del ${perc(C.P_GUAIO_BASE)}; le sfide in piazza non si rifiutano.`,
    ],
  },
  Italiano: {
    nome: 'Italiano',
    motto: 'Soldi dei genitori, tute da 400 € e "fra" ogni due parole. Posto già assegnato nella fabbrichetta del papi.',
    abilita: ['Paghetta del papi ogni lunedì, più una d\'emergenza quando è al verde.', 'Il giudice con lui non fa sconti.'],
    dettaglio: [
      `Paghetta: ${C.PAGHETTA_IMPORTO} € ogni lunedì (non in galera).`,
      `Paghetta d'emergenza: con ${C.PAGHETTA_EMERGENZA_SOGLIA} € o meno torni a ${C.PAGHETTA_EMERGENZA_IMPORTO} €, una volta al mese.`,
      `La legge è uguale per tutti: −${Math.abs(C.TIRO_CLASSE.Italiano)} al tiro del giudice.`,
    ],
  },
};

const azioni: Record<string, TestoAzione> = {
  L01: {
    nome: 'Chillare in piazza',
    desc: 'Muretto, cassa bluetooth, sguardo da duro. Serve solo a farsi conoscere.',
    ok: ['Hai chillato sul muretto. Qualcuno ti ha salutato.', 'Cassa a palla e sguardo fisso. La piazza prende nota.'],
  },
  L02: {
    nome: 'TikTak brainrot in piazza',
    desc: 'Balletto davanti al kebabbaro con sottofondo trap.',
    ok: ['Il balletto è venuto bene. Like a pioggia, più o meno.', 'Quaranta prove per un video da nove secondi. Postato.'],
  },
  L03: {
    nome: 'Turno al minimarket',
    desc: 'Otto ore a riempire il frigo delle birre. Paga poco e la piazza ti prende in giro.',
    ok: ['Turno finito. Le mani sanno di cartone.', 'Frigo pieno, schiena a pezzi, due spicci in tasca.'],
  },
  L04: {
    nome: 'Rider delle consegne',
    desc: 'Zaino termico e poke per i fighetti del centro. Onesto, stanco, triste.',
    ok: ['Consegne fatte. Mancia: un "grazie, capo".', 'Dodici poke, tre salite, zero stelle. Pagato.'],
  },
  L05: {
    nome: 'Calisthenics al parco',
    desc: 'Sbarre del parchetto, muscle-up a petto nudo. Il modo più veloce di rimettersi in sesto.',
    ok: ['Muscle-up a petto nudo. Il corpo ringrazia.', 'Sbarre, sudore e sguardi delle mamme al parco.'],
  },
  G01: {
    nome: 'Slot al bar del cinese',
    desc: 'La macchinetta sotto casa. Un pozzo senza fondo per chi non resiste.',
    ok: [],
    vinto: ['Tre limoni! La macchinetta sputa monete.', 'Jackpot (piccolo). Il barista ti guarda storto.'],
    perso: ['La macchinetta si è mangiata tutto. Come sempre.', 'Luci, musichetta, niente. Alla prossima.'],
  },
  G02: {
    nome: 'Scommessa clandestina',
    desc: 'Punti sulla partita col bookmaker abusivo del bar.',
    ok: [],
    vinto: ['Gol al novantesimo. Il bookmaker paga a denti stretti.', 'Schedina presa. Il bar ti offre il caffè.'],
    perso: ['Autogol. I soldi restano al bookmaker.', 'Pareggio all\'ultimo. Schedina stracciata.'],
  },
  G03: {
    nome: 'Poker nel retrobottega',
    desc: 'Texas hold\'em nel retro della sala scommesse. Più rispetto hai, più il tuo bluff regge.',
    ok: [],
    vinto: ['Bluff con niente in mano e tutti a casa. Piatto tuo.', 'Full servito. Il tavolo ti guarda con rispetto.'],
    perso: ['Hai bluffato col tipo sbagliato. Piatto perso.', 'Coppia di due contro tris. Serata da dimenticare.'],
  },
  G04: {
    nome: 'Corsa clandestina in monopattino',
    desc: 'Monopattini sbloccati a 60 all\'ora sulla tangenziale. Vinci la puntata o finisci sull\'asfalto.',
    ok: [],
    vinto: ['Primo al traguardo. La tangenziale è tua.', 'Sorpasso all\'ultima curva. Puntata raddoppiata.'],
    perso: ['Secondo per mezzo metro. Puntata persa.', 'Batteria a terra a metà corsa. Che figura.'],
  },
  C01: {
    nome: 'Truffa dell\'anello d\'oro',
    desc: 'Un anello di ottone raccolto da terra e un passante convinto che sia oro puro.',
    ok: ['"Oro 18 carati, fra, guarda come brilla." Ricompensa incassata.', 'Il signore ti ringrazia pure. Anello d\'ottone venduto.'],
  },
  C02: {
    nome: 'Portoghese sul regionale',
    desc: 'Sul treno senza biglietto. Vedi la divisa del controllore e ti chiudi in bagno.',
    ok: ['Bagno chiuso a chiave fino alla fermata dopo. Viaggio gratis.', 'Corsa lungo i vagoni e giù al volo. Il controllore è ancora lì.'],
  },
  C03: {
    nome: 'Taccheggio al discount',
    desc: 'Tuta larga, zaino aperto. Se va liscia, oggi la spesa non la paghi.',
    ok: ['Zaino pieno, cassa saltata. Stasera si mangia gratis.', 'Uscito con la spesa della settimana nella tuta.'],
  },
  C04: {
    nome: 'Rubare alcool all\'alimentari',
    desc: 'Due bottiglie di superalcolico dentro la tuta e fuori come niente.',
    ok: ['Due bottiglie, zero domande. Rivendute in piazza.', 'Il proprietario era al telefono. Bottiglie piazzate.'],
  },
  C05: {
    nome: 'Borseggio al mercato',
    desc: 'Ti infili tra i banchi e sfili la borsa della spesa alla signora. Mossa poco rispettata.',
    ok: ['Borsa sfilata tra pomodori e ciabatte. La piazza però storce il naso.', 'Colpo riuscito. "Ai vecchi non si ruba", mormora qualcuno.'],
  },
  C06: {
    nome: 'Tag sui muri del quartiere',
    desc: 'Bombolette e il tuo nome su ogni saracinesca. Pura rep.',
    ok: ['Il tuo nome su tre saracinesche. Domani lo vedono tutti.', 'Pezzo enorme sul muro della scuola. Rispetto.'],
  },
  C07: {
    nome: 'Fumo nascosto nel parchetto',
    desc: 'Setacci cespugli e lampioni del parco per trovare le stecche nascoste. Il rischio vero sono i proprietari.',
    ok: ['Trovata la scorta dentro il lampione. Grazie a chi l\'ha lasciata.', 'Cespuglio giusto al primo colpo.'],
  },
  C08: {
    nome: 'Truffa Vintid (sneakers fulle)',
    desc: 'Scarpe tarocche vendute come "edizione limitata intonsa", con scontrino finto. Dopo ogni colpo il profilo viene bannato per qualche giorno.',
    ok: ['Venduto tutto in un\'ora. Profilo bannato, come da tradizione.', 'Recensione a cinque stelle prima che aprano il pacco.'],
  },
  C09: {
    nome: 'Ruba monopattino elettrico',
    desc: 'Tranci il lucchetto di un monopattino in sharing. Se non hai un mezzo, magari te lo tieni.',
    ok: ['Lucchetto tranciato, monopattino rivenduto in mezz\'ora.', 'Via col monopattino. Il ricettatore paga in contanti.'],
  },
  C10: {
    nome: 'Parkour sui tetti per TikTak',
    desc: 'Salti tra i tetti dei capannoni col telefono in mano. Un piede in fallo è un mese di gesso.',
    ok: ['Salto tra due capannoni, atterraggio perfetto. Video epico.', 'Backflip sul tetto della palestra. Commenti in fiamme.'],
  },
  C11: {
    nome: 'Scippo in stazione (bici)',
    desc: 'Sfrecci in bici pieghevole e sfili il marsupio a un pendolare distratto.',
    ok: ['Marsupio preso al volo davanti al tabellone. Il treno era in ritardo, tu no.', 'Il pendolare guardava gli orari. Tu guardavi il marsupio.'],
  },
  C12: {
    nome: 'Scippo al centro commerciale',
    desc: 'Food court, borsa sullo schienale della sedia, e sparisci tra la folla.',
    ok: ['Borsa sfilata tra un sushi e un panino. Sparito tra la folla.', 'Scala mobile, uscita laterale, ciao.'],
  },
  C13: {
    nome: 'Scassinare auto',
    desc: 'Finestrino spaccato al buio e cassetto portaoggetti svuotato.',
    ok: ['Finestrino giù, cassetto vuoto, via di corsa.', 'Dentro c\'era più di quanto pensassi.'],
  },
  C14: {
    nome: 'Truffa dello specchietto',
    desc: 'Sassata sulla portiera in rotonda e "mi hai spaccato lo specchietto, fra". Contanti, subito.',
    ok: ['L\'automobilista ha pagato senza fiatare.', '"Facciamo senza assicurazione, dai." Contanti in mano.'],
  },
  C15: {
    nome: 'Parcheggiatore abusivo',
    desc: 'Gilet catarifrangente trovato nei cespugli e "un\'offerta per la custodia".',
    ok: ['Piazzale pieno, offerte generose. Nessuno ha fatto storie.', 'Gilet giallo e fischietto: sembravi quasi vero.'],
  },
  C16: {
    nome: 'Bagarinaggio allo stadio',
    desc: 'Biglietti presi col bot dell\'amico e rivenduti al triplo ai disperati rimasti fuori.',
    ok: ['Biglietti spariti in dieci minuti. Prezzo: triplo.', 'Fuori dai cancelli eri l\'uomo più amato della città.'],
  },
  C17: {
    nome: 'Rissa per il cappello drip',
    desc: 'Strappi il cappello introvabile a un ragazzetto in piazza. Se la sua compagnia reagisce, ospedale.',
    ok: ['Cappello strappato e rivenduto. La piazza ha visto tutto.', 'Parapiglia vinto. Il cappello era pure originale.'],
  },
  C18: {
    nome: 'Rapina al rider',
    desc: 'Gli blocchi la strada e gli prendi lo zaino. Mossa infame: il rider è un poveraccio come te.',
    ok: ['Zaino preso. Dentro, due poke e l\'incasso. La piazza disapprova.', 'Colpo riuscito, ma nessuno te ne parlerà bene.'],
  },
  C19: {
    nome: 'Rame al cantiere',
    desc: 'Di notte nel cantiere dell\'alta velocità a sfilare cavi di rame da rivendere al chilo.',
    ok: ['Furgone pieno di rame. Il rottamaio paga al chilo.', 'Cavi sfilati in silenzio. Il treno veloce aspetterà.'],
  },
  C20: {
    nome: 'Rapina alla lucciola sulla statale',
    desc: 'Le strappi la borsetta sulla statale. Se il protettore è nel furgone vicino, finisce malissimo. La piazza non rispetta chi lo fa.',
    ok: ['Borsetta presa. Hai i soldi, non il rispetto.', 'Colpo riuscito. In piazza ti guardano diverso.'],
  },
  C21: {
    nome: 'Spaccio fuori dalla discoteca',
    desc: 'Nel parcheggio all\'uscita dei locali con la "robina" tagliata male. Pattuglie in borghese ovunque.',
    ok: ['Merce finita prima della chiusura del locale.', 'Serata d\'oro nel parcheggio.'],
  },
  C22: {
    nome: 'Topino d\'appartamento',
    desc: 'Su per la grondaia ed entri dalla finestra lasciata aperta al primo piano.',
    ok: ['Finestra aperta, cassetto pieno. Uscito come un gatto.', 'Gioielli della nonna nel marsupio. Grondaia, giù, via.'],
  },
  C23: {
    nome: 'Corriere per il boss',
    desc: 'Consegne rapide per conto del capo. Posti di blocco con i cani ovunque.',
    ok: ['Consegna fatta. Il boss ti manda un pollice in su.', 'Tre pacchi, tre indirizzi, zero domande.'],
  },
  C24: {
    nome: 'Spedizione punitiva per il boss',
    desc: 'Il boss ti manda con la cricca a "chiarire un malinteso". Spranghe.',
    ok: ['Malinteso chiarito. Il boss è soddisfatto.', 'La banda rivale ha capito il messaggio.'],
  },
  C25: {
    nome: 'Spaccata al Compro Oro',
    desc: 'Uno scooter rubato lanciato contro la vetrina, e via con le catenine.',
    ok: ['Vetrina in mille pezzi, catenine nel sacco. La piazza ne parlerà per settimane.', 'Botto, allarme, fuga. Colpo da film.'],
  },
  C26: {
    nome: 'Furto del BANCOMAT',
    desc: 'Rimozione forzata con esplosione all\'acetilene. Riuscito vale un anno di scippi; beccato, rischi la run.',
    ok: ['BOOM. Il bancomat è nel furgone. Sei una leggenda.', 'Esplosione perfetta, banconote ovunque. Che colpo.'],
  },
};

const guai: Record<string, TestoGuaio> = {
  cuggino_soldi: {
    icona: '📞',
    titolo: 'Il cuggino ha bisogno di soldi',
    testo: `Il cuggino ti chiama: "Fra, mi servono ${G.cuggino_soldi.costo} €, te li ridò lunedì. Giuro."`,
    opzioni: { paga: `Paga ${G.cuggino_soldi.costo} €`, rifiuta: 'Rifiuta' },
    risultati: {
      pagato: 'Il cuggino ti abbraccia. La piazza approva.',
      rifiutato: 'Il cuggino se l\'è legata al dito.',
      spiffera: 'Il cuggino offeso ha spifferato in giro: gli sbirri ti tengono d\'occhio.',
    },
  },
  sfida_piazza: {
    icona: '🥊',
    titolo: 'Un rivale ti sfida in piazza',
    testo: '"Tu. Uno contro uno, adesso." Mezza piazza vi guarda.',
    opzioni: { accetta: 'Accetta', rifiuta: 'Lascia stare' },
    risultati: {
      vinta: 'L\'hai steso. La piazza urla il tuo nome.',
      persa: 'Hai perso, e pure male. Si va in ospedale.',
      rifiutata: 'Hai fatto finta di niente. La piazza ride.',
    },
  },
  posto_blocco: {
    icona: '🚓',
    titolo: 'Posto di blocco a sorpresa',
    testo: 'Paletta alzata a fine via.',
    risultati: {
      niente: 'Ti hanno guardato e fatto passare.',
      multa: 'Niente casco: multa.',
      sequestro: 'Mezzo sequestrato. Torni a piedi.',
    },
  },
  perquisizione: {
    icona: '🔦',
    titolo: 'Perquisizione all\'alba',
    testo: 'Bussano alle sei. Non è il cuggino.',
    risultati: {
      niente: 'Hanno rovistato dappertutto. Niente.',
      trovati: 'Hanno trovato i contanti nel calzino.',
    },
  },
  portafoglio: {
    icona: '👛',
    titolo: 'Trovi un portafoglio',
    testo: 'Per terra, gonfio. Nessuno guarda.',
    opzioni: { tieni: 'Tienilo', restituisci: 'Restituiscilo in video' },
    risultati: {
      tenuto: 'Contanti in tasca, documenti nella cassetta delle lettere.',
      restituito: 'Video della restituzione: la piazza ti adora.',
    },
  },
  boss_nota: {
    icona: '👑',
    titolo: 'Il boss ti ha notato',
    testo: 'Una macchina scura rallenta davanti al muretto.',
    risultati: {
      notato: 'Il boss ti ha notato: oggi spaccio e risse rendono di più.',
      niente: 'Il boss ti ha guardato e ha tirato dritto. Serve più rispetto.',
    },
  },
  influencer: {
    icona: '🤳',
    titolo: 'Un influencer ti mette nel video',
    testo: '"Fra, fammi una faccia da duro, dai."',
    risultati: { video: 'Sei nelle storie di un influencer. Faticoso, ma ne vale la pena.' },
  },
  furto_veicolo: {
    icona: '🛴',
    titolo: 'Il monopattino non è dove l\'avevi lasciato?',
    testo: 'Esci di casa e guardi il palo.',
    risultati: {
      rubato: 'Ti hanno fregato il monopattino. Il karma.',
      niente: 'Il monopattino è ancora lì. Per ora.',
    },
  },
  mamma_spesa: {
    icona: '🛒',
    titolo: 'Tua madre ti manda a fare la spesa',
    testo: '"E prendi anche il latte, che quello di ieri l\'hai finito tu."',
    risultati: { spesa: 'Due borse pesanti e un "bravo" da tua madre. La piazza ti ha visto.' },
  },
  serata: {
    icona: '🪩',
    titolo: 'Serata in disco',
    testo: 'Stasera c\'è la serata buona. Ingresso, drink e sguardi.',
    opzioni: { vai: `Vai (${G.serata.costo} €)`, resta: 'Resta a casa' },
    risultati: {
      andato: 'Serata leggendaria. Domani si paga.',
      a_casa: 'Serie TV e divano. Nessuno lo saprà.',
    },
  },
  sbirro_occhio: {
    icona: '👮',
    titolo: 'Lo sbirro di quartiere ti tiene d\'occhio',
    testo: 'Lo vedi all\'angolo. Ti vede anche lui.',
    risultati: { occhio: 'Oggi lo sbirro di quartiere non ti molla un attimo.' },
  },
  gratta_vinci: {
    icona: '🎟️',
    titolo: 'Gratta e vinci trovato per terra',
    testo: 'Mezzo calpestato, ancora da grattare.',
    risultati: { vinto: 'Hai grattato e hai vinto!', niente: 'Hai grattato. Niente. Come al solito.' },
  },
  febbre: {
    icona: '🤒',
    titolo: 'Febbre',
    testo: 'Ti svegli con le ossa rotte.',
    risultati: { febbre: 'Febbre a 38 e mezzo. Oggi si va piano.' },
  },
  giornalista: {
    icona: '🎤',
    titolo: 'Un giornalista vuole intervistarti',
    testo: 'Vuole parlare "del fenomeno". Telecamera già accesa.',
    opzioni: { accetta: 'Accetta', rifiuta: 'Rifiuta' },
    risultati: {
      intervista: 'Sei in TV! La piazza ti rispetta, gli sbirri ti riconoscono.',
      rifiutata: 'Niente TV. Meglio così.',
    },
  },
  turno_kebab: {
    icona: '🥙',
    titolo: 'Il kebabbaro ti offre un turno',
    testo: '"Mi manca uno al girarrosto, vieni?"',
    risultati: { turno: 'Un turno al girarrosto. Pochi soldi, tanto odore.' },
  },
  rissa_subita: {
    icona: '💥',
    titolo: 'Ti saltano addosso per un vecchio screzio',
    testo: 'Quelli dell\'altra piazza ti hanno riconosciuto.',
    risultati: {
      ricovero: 'Ti hanno aspettato sotto casa. Ospedale.',
      niente: 'Hai visto la banda in tempo e sei sparito.',
    },
  },
};

/** Conditions of the day and holidays: the header line, the night teaser and the (?) title. */
const condizioni: Record<string, { oggi: string; domani: string }> = {
  pioggia: { oggi: 'Oggi piove a dirotto', domani: 'Domani piove a dirotto. Niente balletti.' },
  blitz: { oggi: 'Operazione Alto Impatto in corso', domani: 'Domani: Operazione Alto Impatto. Occhio.' },
  derby: { oggi: 'Oggi c\'è il derby in città', domani: 'Domani c\'è il derby. Stadio pieno, tasche piene.' },
  concerto: { oggi: 'Oggi concerto al palazzetto', domani: 'Domani concerto al palazzetto. Biglietti da piazzare.' },
  blackout: { oggi: 'Blackout di quartiere', domani: 'Domani salta la luce in tutto il quartiere.' },
  mercatone: { oggi: 'Mercato straordinario', domani: 'Domani mercato straordinario: borse ovunque.' },
  sciopero: { oggi: 'Sciopero dei mezzi', domani: 'Domani sciopero dei mezzi. Gambe in spalla.' },
  polfer: { oggi: 'Controlli Polfer sui treni', domani: 'Domani controlli Polfer sui treni.' },
  nebbia: { oggi: 'Nebbia fitta', domani: 'Domani nebbia fitta. Non si vede a un metro.' },
  caldo: { oggi: 'Caldo bestiale', domani: 'Domani caldo bestiale. Si boccheggia.' },
  viral: { oggi: 'Il quartiere è virale', domani: 'Domani il quartiere è virale. Telefoni carichi.' },
  paga: { oggi: 'Giorno di paga in città', domani: 'Domani è giorno di paga. Portafogli gonfi.' },
  ferragosto: { oggi: 'Ferragosto, città vuota', domani: 'Domani è Ferragosto: città vuota, case vuote.' },
  halloween: { oggi: 'Halloween', domani: 'Domani è Halloween. Maschere ovunque.' },
  natale: { oggi: 'Vigilia di Natale', domani: 'Domani è la Vigilia. Regali da "trovare".' },
  capodanno: { oggi: 'Capodanno', domani: 'Domani è Capodanno. Botti e risse.' },
  carnevale: { oggi: 'Carnevale: tutti mascherati', domani: 'Domani è Carnevale. Tutti mascherati.' },
};

/** Shop: names stay parodies; `desc` in words, numbers behind the (?). */
const negozio: Record<string, { nome: string; desc: string; icona: string }> = {
  passamontagna: { nome: 'Passamontagna Naik', desc: 'Di notte ti riconoscono meno.', icona: '🥷' },
  tronchese: { nome: 'Tronchese del cuggino', desc: 'Lucchetti e finestrini si aprono prima.', icona: '✂️' },
  cappello: { nome: 'Cappello Nord Faccia', desc: 'Drip. In piazza si nota.', icona: '🧢' },
  tuta: { nome: 'Tuta Naik Tech', desc: 'Drip. La divisa ufficiale.', icona: '🧥' },
  catena: { nome: 'Catena placcata "oro"', desc: 'Drip pesante. Al Magrebino vale rispetto extra.', icona: '📿' },
  monopattino: { nome: 'Monopattino truccato', desc: 'Trasferte senza perdere tempo, fughe più facili, sblocca le azioni col mezzo.', icona: '🛴' },
  telefono: { nome: 'aiFon ultimo modello', desc: 'Drip da tasca. Schermo crepato incluso.', icona: '📱' },
  motorino: { nome: 'Motorino elaborato', desc: 'Come il monopattino, ma meglio: fughe e consegne più sicure.', icona: '🛵' },
  orologio: { nome: 'Orologio "svizzero" di Napoli', desc: 'Drip di lusso. Svizzero, giura.', icona: '⌚' },
};

const cibo: Record<string, { nome: string; icona: string }> = {
  Mensa: { nome: 'In mensa', icona: '🍝' },
  Kebabbaro: { nome: 'Dal kebabbaro', icona: '🥙' },
  Lidl: { nome: 'Cibo del discount', icona: '🥫' },
  Caritas: { nome: 'Alla Carità', icona: '🥣' },
};

const tipiOggetto: Record<string, string> = { tool: 'Attrezzo', drip: 'Drip', veicolo: 'Veicolo' };

export const TESTI = {
  titolo: 'Maranza Simulator',
  giorni: ['lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato', 'domenica'],
  giorniBrevi: ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'],
  mesi: ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'],
  unGiorno: '1 giorno',
  nGiorni: (n: number) => `${n} giorni`,
  slot: {
    1: { nome: 'Mattina', icona: '☀️' },
    2: { nome: 'Pomeriggio', icona: '🌤️' },
    3: { nome: 'Sera', icona: '🌆' },
    4: { nome: 'Notte', icona: '🌙' },
  } as Record<number, { nome: string; icona: string }>,

  inizio: {
    nuova: 'Nuova partita',
    continua: 'Continua',
    continuaDi: (nome: string, quando: string) => `${nome} · ${quando}`,
    classifica: 'Classifica',
    importa: 'Importa salvataggio',
    importaErrore: 'Questo file non è un salvataggio di Maranza Simulator.',
    sovrascrivi: 'C\'è una partita in corso: ricominciando la perdi. Vai lo stesso?',
    disclaimer: 'Opera di pura finzione e satira di costume. Niente di quello che vedi qui va fatto davvero, fra.',
    versione: 'alpha',
  },

  crea: {
    titolo: 'Chi sei, fra?',
    nome: 'Nome',
    nomeSegnaposto: 'Il tuo nome in piazza',
    nomiCasuali: ['Kevin', 'Brayan', 'Momo', 'Jayden', 'Samu', 'Rayan', 'Ivan', 'Thomas', 'Nico', 'Diego', 'Ilyas', 'Denis'],
    dado: 'Nome a caso',
    scegli: 'Scegli la classe',
    soldi: 'Soldi',
    energia: 'Energia',
    via: 'In piazza!',
    indietro: 'Indietro',
    /** Words for the class stats, from the lowest third to the highest. */
    paroleSoldi: ['Al verde', 'Qualche spiccio', 'Gonfio di soldi'],
    paroleEnergia: ['Si stanca presto', 'Nella media', 'Una molla'],
    numeri: (soldi: number, energia: number) => `Soldi iniziali ${soldi} €, energia massima ${energia}.`,
  },
  classi,

  hud: {
    soldi: 'Soldi',
    rep: 'Reputazione',
    energia: 'Energia',
    salute: 'Salute',
    patrimonio: 'Patrimonio',
    contanti: 'Contanti',
    patrimonioFormula: `Patrimonio = contanti + ${perc(C.PATRIMONIO_DRIP)} del valore di drip e veicoli.`,
    nienteOggetti: 'Niente oggetti, per ora.',
    repValore: (v: string) => `Reputazione: ${v}`,
    repProssimo: (grado: string, soglia: number) => `Prossimo grado: ${grado} a ${soglia}%.`,
    repMassimo: 'Sei al grado più alto.',
    repTier: (azioni: string) => `Sblocca: ${azioni}.`,
    repDecade: `Scende dell'${perc(1 - C.REP_DECAY)} al giorno se non fai niente (in galera è congelata).`,
    repNoia: 'Ripetere la stessa cosa annoia la piazza: rende metà rep ogni volta.',
    repDiminuisce: 'Più ne hai, più è difficile guadagnarne.',
    energiaValore: (v: number, max: number) => `Energia ${v} su ${max} oggi.`,
    energiaMaxRidotta: 'Oggi il massimo è più basso (caldo o salute bassa).',
    energiaCibo: 'Dormendo recuperi, in base a cosa mangi:',
    energiaBalcanico: 'Tu recuperi sempre il 100%, qualunque cosa mangi.',
    saluteTesto: [
      'Ogni ricovero la abbassa.',
      'Il parco e la mensa la alzano; un po\' risale ogni giorno.',
      'Bassa, ti stanchi prima. A zero finisce la run.',
    ],
    fasciato: 'Sei fasciato: energia massima ridotta.',
  },

  rischio: {
    basso: { icona: '🟢', nome: 'Tranquillo' },
    medio: { icona: '🟡', nome: 'Occhio' },
    alto: { icona: '🔴', nome: 'Rischioso' },
    estremo: { icona: '💀', nome: 'Follia' },
  } as Record<string, { icona: string; nome: string }>,

  azioni,
  gruppi: { legale: 'Roba legale', azzardo: 'Azzardo', reati: 'Bravate' },

  principale: {
    cosaFai: 'Cosa fai?',
    trasferta: 'Trasferta',
    trasfertaSpiega: 'Senza mezzo questa azione costa due slot.',
    vai: 'Fallo',
    costo: (e: string) => `Costa ${e}`,
    gratis: 'Gratis',
    nienteDaFare: 'Adesso non c\'è niente da fare.',
    nienteDaFareDormi: 'Niente da fare adesso: puoi dormire.',
    aspetta: 'Lascia passare il tempo',
    notte: 'È notte fonda. Si dorme.',
    ramadan: 'Ramadan: di giorno si sta fermi. Ci si rivede stasera.',
    teaser: 'Domani',
    nessunaCondizione: 'Giornata normale',
    bossTiNota: 'Il boss ti tiene d\'occhio',
    attenzionato: 'Gli sbirri ti tengono d\'occhio',
    soldiNonBastano: 'Non hai abbastanza soldi',
    energiaNonBasta: 'Sei troppo stanco',
    rischioTitolo: 'Rischio',
    gabbio: 'Gabbio',
    ospedale: 'Ospedale',
    bottino: 'Bottino',
    bottinoX: (min: number, max: number) => `${String(min).replace('.', ',')}–${String(max).replace('.', ',')} volte la spesa`,
    bottinoAtteso: 'Bottino atteso',
    vincita: 'Vincita',
    quota: (p: string, x: string) => `${p} di vincere ${x} volte la puntata`,
    noia: 'Piazza annoiata (rep)',
    zonaCalda: 'Zona calda (bottino)',
    rep: 'Rep',
    pena: 'Pena base',
    multa: 'Multa',
    energiaCosto: 'Energia',
    tacche: 'Investimento',
    tacchaSpiega: 'Spendere di più abbassa il rischio di gabbio e alza il bottino. La spesa è persa comunque.',
    modificatori: 'Oggi conta anche',
    bloccate: (n: number) => (n === 1 ? '1 azione bloccata' : `${n} azioni bloccate`),
  },

  dormi: {
    titolo: 'Dormi',
    scegli: 'Cosa mangi prima di dormire?',
    giaPagato: 'Oggi hai già mangiato: questa dormita è gratis.',
    ciboGratis: 'Il taccheggio di oggi ti ha riempito il frigo: si mangia gratis.',
    nonPuoi: 'Hai dormito da poco.',
    chiudi: 'Non ancora',
    gratis: 'Gratis',
    recupero: 'Recupero',
    saluteSu: 'Fa bene',
    saluteGiu: 'Fa male',
  },
  cibo,

  negozio: {
    titolo: 'Negozio',
    sottotitolo: 'Non consuma tempo. Il drip si vede addosso.',
    compra: 'Compra',
    tuo: 'Già tuo',
    meglio: 'Hai già di meglio',
    inventario: 'Il tuo armadio',
    vuoto: 'Ancora niente. Il drip non si compra da solo.',
    effetto: 'Effetto',
    valore: 'Valore nel patrimonio',
    toolNotte: (pt: number) => `−${pt} punti di rischio gabbio nelle azioni di Notte.`,
    toolEffrazione: (pt: number) => `−${pt} punti di rischio gabbio nelle azioni con Effrazione.`,
    drip: (valore: number, div: number) => `Drip ${valore}: conta per il patrimonio e per il Chill (+1 rep ogni ${div} € di drip e mezzi).`,
    trapper: (min: number) => `Più di ${min} €: al Magrebino sblocca "Trapper di quartiere".`,
    veicolo: (pt: number) => `Trasferte senza slot in più; −${pt} punti di rischio gabbio nelle azioni di Fuga; sblocca le azioni col mezzo.`,
    veicoloReq: (pt: number) => `−${pt} punti di rischio gabbio nelle azioni che richiedono un mezzo.`,
    sequestro: 'Può essere sequestrato (o rubato, se è un monopattino).',
    attrezzo: 'Gli attrezzi non si perdono mai.',
    chiudi: 'Chiudi',
  },
  oggetti: negozio,
  tipiOggetto,

  esito: {
    avanti: 'Avanti',
    beccato: 'Beccato!',
    beccatoTesto: 'Gli sbirri ti hanno preso. Si va davanti al giudice.',
    sequestro: (e: string) => `Sequestrati ${e}`,
    veicoloSequestrato: 'E ti hanno sequestrato il mezzo.',
    maleTitolo: 'Finita male',
    ospedaleGiorni: (g: string) => `${g} di ospedale`,
    furto: (e: string) => `Dal comodino spariscono ${e}`,
    virale: 'VIRALE!',
    veicolo: 'Ti sei tenuto il mezzo!',
    repSu: 'Rispetto in su',
    repGiu: 'Rispetto in giù',
    rischiCorsi: 'Rischi che correvi',
    tiroRischio: 'Il tiro è sotto la soglia: è successo.',
    repEsatta: (v: string) => `Rep ${v}`,
    soldiEsatti: (v: string) => `Soldi ${v}`,
    uscitaGalera: 'Sei fuori!',
    uscitaGaleraTesto: 'Aria fresca. Energia al massimo e un po\' di rep in più: sei tornato più duro.',
    uscitaOspedale: 'Dimesso!',
    uscitaOspedaleTesto: 'Gesso firmato, energia piena. Torna in piazza.',
    ricoveroGuaio: (g: string) => `${g} di ospedale`,
  },

  toast: {
    giorno: (data: string) => `Nuovo giorno: ${data}`,
    paghetta: (e: string) => `Il papi ti ha mandato la paghetta: ${e}`,
    paghettaEmergenza: (e: string) => `Paghetta d'emergenza: torni a ${e}`,
    instancabile: 'Instancabile! Energia ricaricata.',
    sonno: (cibo: string) => `Dormito. ${cibo}, energia su.`,
    compra: (nome: string) => `Comprato: ${nome}`,
    rifiutato: (motivo: string) => `Non si può: ${motivo}`,
  },

  guai,
  guaio: {
    etichetta: 'Guaio',
    scegli: 'Che fai?',
    nonPuoi: 'Non puoi',
  },

  condizioni,
  condizioneEffetti: {
    titolo: 'Effetti di oggi',
    domaniTitolo: 'Effetti di domani',
    nessuno: 'Nessun effetto particolare.',
    gabbio: (v: string) => `Rischio gabbio ${v} punti su tutto`,
    energia: (v: number) => `+${v} energia sui reati`,
    energiaTrasferta: (v: number) => `+${v} energia sulle trasferte`,
    energiaMax: (v: string) => `Energia massima ×${v}`,
    sblocca: 'Sblocca bagarinaggio e parcheggiatore',
    blocca: (azioni: string) => `Niente ${azioni}`,
    bottino: (cosa: string, v: string) => `${cosa}: bottino ×${v}`,
    rischio: (cosa: string, v: string) => `${cosa}: rischio ×${v}`,
    rep: (cosa: string, v: string) => `${cosa}: rep ×${v}`,
  },
  tag: {
    FURTO: 'Furti',
    TRUFFA: 'Truffe',
    FORZA: 'Forza',
    SPACCIO: 'Spaccio',
    AZZARDO: 'Azzardo',
    SOCIAL: 'Social',
    LEGALE: 'Legali',
    VEICOLO: 'Fuga',
    EFFRAZIONE: 'Effrazione',
    NOTTE: 'Notte',
  } as Record<string, string>,

  tribunale: {
    titolo: 'Tribunale di quartiere',
    imputato: (azione: string) => `Accusa: ${azione}`,
    pena: 'Pena richiesta',
    multa: 'Multa',
    nessunaMulta: 'nessuna',
    scegli: 'Come ti difendi?',
    tiro: 'Tiro del giudice',
    bonus: 'Bonus al tiro',
    esiti: 'Esiti del tiro',
    modificatori: 'Oggi conta anche',
    nonPuoi: 'Non te lo puoi permettere',
    gratis: 'Gratis',
    garantito: 'Niente tiro: pena ridotta garantita',
    spavaldo: 'Un po\' di rep subito, ma il giudice si irrita',
    spavaldoRep: (rep: number) => `+${rep} rep subito`,
  },
  modificatoriTiro: {
    classe: 'Classe',
    recidiva: 'Recidiva',
    tutorial: 'Prima settimana',
    incensurato: 'Incensurato',
    noto_in_questura: 'Noto in questura',
  } as Record<string, string>,
  difese: {
    ufficio: 'Avvocato d\'ufficio',
    quartiere: 'Il cuggino avvocato',
    grido: 'Avvocato di grido',
    patteggia: 'Patteggia',
    spavaldo: 'Fai lo spavaldo',
  } as Record<string, string>,
  verdetti: {
    assolto: { titolo: 'Assolto!', testo: 'Intoccabile. Il giudice ti lascia andare.' },
    messa_alla_prova: { titolo: 'Messa alla prova', testo: 'Libero, ma sorvegliato: se ti ribeccano è peggio.' },
    ridotta: { titolo: 'Pena ridotta', testo: 'Il giudice ha avuto un briciolo di pietà.' },
    piena: { titolo: 'Condannato', testo: 'Pena piena. Si va dentro.' },
    aggravata: { titolo: 'Pena aggravata', testo: 'Il giudice era di pessimo umore.' },
    patteggiamento: { titolo: 'Patteggiato', testo: 'Niente sorprese: pena scontata, multa piena.' },
  } as Record<string, { titolo: string; testo: string }>,
  verdetto: {
    galera: (g: string) => `${g} di galera`,
    multa: (e: string) => `Multa ${e}`,
    giorniMulta: (g: string) => `La multa che non potevi pagare diventa ${g} in più`,
    libero: 'Libero',
    dado: 'Dado',
    tiro: 'Tiro finale',
    tira: 'Il giudice tira il dado…',
    subito: 'Vedi subito',
  },

  cella: {
    galera: 'Galera',
    ospedale: 'Ospedale',
    giorniRestanti: (g: string) => `Ancora ${g}`,
    ultimoGiorno: 'Ultimo giorno',
    diario: 'Diario di bordo',
    tocca: 'Tocca per fermare',
    fermo: 'In pausa: tocca per riprendere',
    avanti: 'Giorno dopo',
    cuggino: 'Chiamata al cuggino',
    cugginoSpiega: 'Un\'azione senza rischi, al doppio dell\'energia.',
    diarioGalera: [
      'Il compagno di cella russa come un motorino truccato.',
      'Flessioni contro il muro: duecento.',
      'Il secondino ha riso a una tua battuta. Forse.',
      'Pasta scotta, di nuovo.',
      'Hai imparato a fare il caffè col fornelletto.',
      'Lettera della mamma: "Mangia".',
      'Il cuggino manda a dire che fuori ti aspettano.',
      'Tatuaggio a penna sul braccio: venuto storto.',
      'Hai vinto tre merendine a carte.',
      'Ora d\'aria: il cortile sembra la piazza, ma senza muretto.',
      'Hai contato le crepe del soffitto: quarantasette.',
      'Il vicino di cella giura di essere innocente. Anche tu.',
      'Hai scritto una barra trap sul muro.',
      'Doccia fredda. Fuori dicono che piove.',
      'Hai sognato il kebab con tutto.',
      'Partita a calcetto in cortile: hai segnato di tacco.',
      'Ti sei fatto prestare un libro. Ha le figure.',
      'Hai fatto pace con quello che ti ha rubato il cuscino.',
    ],
    diarioOspedale: [
      'Il vicino di letto ronza come un frigorifero.',
      'Brodino. Ancora brodino.',
      'L\'infermiera ti ha chiamato "campione". Forse ironica.',
      'Gesso firmato da mezzo reparto.',
      'Il telecomando ce l\'ha il signore del letto tre.',
      'Flebo nel braccio e il wifi non va.',
      'Tua madre ha portato le lasagne di nascosto.',
      'Storia dal letto con la didascalia "guerriero".',
      'Il dottore dice che sei fortunato. Non ti senti fortunato.',
      'Hai imparato a camminare con le stampelle. Più o meno.',
      'Il cuggino è passato con le patatine. Le hai finite in due minuti.',
      'Termometro, pillola, sonno. Ripeti.',
    ],
  },

  chat: {
    nome: 'Boss 👑',
    stato: 'online',
    vuoto: 'Il Boss non ti ha ancora scritto.',
    nuovo: 'Nuovo messaggio dal Boss',
    chiudi: 'Chiudi',
    scrivi: 'Solo il Boss scrive qui.',
    bottone: 'Boss',
  },
  /** The Boss's messages, by the ids of the engine's BOSS outcomes (GDD §Tutorial). */
  boss: {
    primo_giorno: 'Oggi fai cose piccole, fra\'. Guarda le faccine sui bottoni: verde si fa, rosso si pensa.',
    primo_arresto: `Zitto in aula. L'avvocato del cuggino costa ${DATI.avvocati.quartiere.costo} ma vale.`,
    prima_messa_alla_prova: 'Sei sorvegliato: per un mese se ti ribeccano è peggio.',
    primo_ricovero: 'Mangia in mensa e vai al parco, che sei mezzo morto.',
    zero_euro: 'Fai il rider, nessuno ti giudica. Un turno al giorno però.',
    tier_10: 'Ora ti faccio fare cose serie. Stazione, centro commerciale, macchine parcheggiate: vai.',
    tier_20: 'In quartiere ormai ti conoscono. Ci sono lavori seri: rame, roba, discoteca. Occhio a chi parla.',
    tier_35: 'Mi fido di te, fra\'. Da oggi fai le consegne per me. Niente domande.',
    tier_45: 'Quelli dell\'altra piazza hanno bisogno di una lezione. Prendi la cricca e chiarisci il malinteso.',
    tier_50: 'Boss di zona, eh? C\'è un Compro Oro che ha troppe vetrine. Fammi sapere.',
    tier_70: 'Leggenda. Adesso puoi pensare in grande: il bancomat. Poi non chiamarmi per un po\'.',
  } as Record<string, string>,

  fine: {
    titoli: {
      anno: { titolo: 'Anno chiuso!', testo: 'Trecentosessantacinque giorni in piazza e sei ancora in piedi.' },
      anno_in_cella: { titolo: 'Anno finito al gabbio', testo: 'L\'anno è finito mentre eri dentro. Conta lo stesso.' },
      ospedale: { titolo: 'Piantato all\'ospedale', testo: 'La salute è finita prima dell\'anno.' },
      galera: { titolo: 'Marcito in galera', testo: 'Troppa galera per un anno solo.' },
    } as Record<string, { titolo: string; testo: string }>,
    punti: 'MARANZA POINTS',
    puntiFormula: 'Punti = patrimonio × reputazione.',
    puntiPenalita: (giorni: number) =>
      `Run finita prima del tempo: ×${String(C.GAME_OVER_PENALITA).replace('.', ',')} × ${giorni}/${C.GIORNI} giorni sopravvissuti.`,
    riepilogo: 'Com\'è andata',
    giorniCella: 'Giorni in cella',
    giorniOspedale: 'Giorni in ospedale',
    arresti: 'Arresti',
    ricoveri: 'Ricoveri',
    bottino: 'Bottino totale',
    preferita: 'Azione preferita',
    nessuna: 'nessuna',
    classifica: 'Classifica locale',
    classificaVuota: 'Ancora nessuna run.',
    nuovaRun: 'Nuova run',
    tu: 'tu',
  },

  menu: {
    titolo: 'Menu',
    esporta: 'Esporta salvataggio',
    importa: 'Importa salvataggio',
    esci: 'Torna al titolo',
    abbandona: 'Abbandona la run',
    abbandonaConferma: 'Sicuro? La run in corso si perde.',
    chiudi: 'Chiudi',
    importato: 'Salvataggio importato.',
  },

  errore: {
    titolo: 'Qualcosa si è rotto, fra.',
    testo: 'La partita è salvata fino all\'ultima mossa. Ricarica, e se si ripete esporta il salvataggio e mandalo a chi sviluppa.',
    ricarica: 'Ricarica',
  },

  info: {
    apri: 'Spiegami i numeri',
    chiudi: 'Chiudi',
  },
} as const;

/** Name of an action: the parody text, or the data name if a new action has no text yet. */
export function nomeAzione(id: string): string {
  return azioni[id]?.nome ?? DATI.azioni.find((a) => a.id === id)?.nome ?? id;
}

export function nomeOggetto(id: string): string {
  return negozio[id]?.nome ?? (DATI.negozio as Record<string, { nome: string }>)[id]?.nome ?? id;
}

export function nomeCibo(id: string): string {
  return cibo[id]?.nome ?? id;
}

/** Picks a line deterministically from a seed (same day, same line). */
export function scegliRiga(righe: readonly string[], seme: number): string {
  if (righe.length === 0) return '';
  return righe[Math.abs(Math.floor(seme)) % righe.length]!;
}
