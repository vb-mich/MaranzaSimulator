// Game engine: a 1:1 port of class `Gioco` in sim/maranza_sim.py.
//
// Every method keeps the name, the order of operations and the order of random draws of its
// Python counterpart, so that the same seed and the same choices give the same run. The only
// structural difference: where the simulator asks its policy (defence, events, food, purchases,
// which action) the engine stops and waits for a command, keeping what it needs in `stato`.

import {
  AZIONI,
  C,
  CONDIZIONI,
  DATI,
  FESTE,
  GUAI,
  azione,
  haBottino,
  haRischio,
  haSpesa,
  oggetto,
  type Azione,
  type Classe,
  type Condizione,
  type Guaio,
} from '../data/gameData';
import { dataDelGiorno, type Data } from './calendario';
import { potenza } from './pymath';
import { Rng, rngDaSeme } from './rng';
import type {
  Attesa,
  Comando,
  Difesa,
  Esito,
  EsitoTribunale,
  MessaggioBoss,
  ModificatoriTiro,
  OpzioneEvento,
  Risultato,
  Stato,
} from './tipi';

const GIORNI = C.GIORNI;
const SLOT_PER_GIORNO = Object.keys(C.SLOT_NOMI).length;
/** The last slot of the day: at Night, if you haven't slept yet, you sleep. */
const NOTTE = SLOT_PER_GIORNO;
const LIVELLO_MONOPATTINO = DATI.negozio.monopattino.livello;
const LIVELLO_MOTORINO = DATI.negozio.motorino.livello;

// ---------------------------------------------------------------------------------------------
//  Creation
// ---------------------------------------------------------------------------------------------

export function nuovaPartita(nome: string, classe: Classe, seme: number): Risultato {
  const cl = DATI.classi[classe];
  const s: Stato = {
    versione: 1,
    seme,
    rng: rngDaSeme(seme),
    rng_cond: rngDaSeme(seme + C.COND_SEME_OFFSET),
    nome,
    classe,
    soldi: cl.soldi,
    energia: cl.energia,
    energia_max: cl.energia,
    rep: C.REP_INIZIALE,
    salute: C.SALUTE_MAX,
    salute_max: C.SALUTE_MAX,
    giorno: 0,
    slot: 1,
    galera: 0,
    ospedale: 0,
    condanne: 0,
    sorvegliato: 0,
    attenzionato: 0,
    attenzionato_val: 0,
    items: [],
    veicolo: 0,
    cooldown: {},
    recenti: [],
    ultimo_sonno: C.ULTIMO_SONNO_INIZIALE,
    cibo_pagato: false,
    cibo_gratis: false,
    lavori_oggi: 0,
    instancabile_mese: -1,
    paghetta_em_mese: -1,
    notte_pak_sett: -1,
    cond: null,
    cond_domani: null,
    azioni: 0,
    arresti: 0,
    ricoveri: 0,
    g_galera: 0,
    g_osp: 0,
    guadagni: 0,
    storico_guadagni: [],
    vivo: true,
    fine: 'anno',
    azioni_usate: {},
    modo: 'slot',
    dormito: false,
    attesa: null,
    boss: [],
  };
  const m = new Motore(s);
  s.cond_domani = m.estrai_condizione(0);
  m.iniziaGiorno();
  m.boss('primo_giorno');
  m.controlliBoss();
  return { stato: s, esiti: m.esiti };
}

// ---------------------------------------------------------------------------------------------
//  The only entry point that changes a game
// ---------------------------------------------------------------------------------------------

export function applica(stato: Stato, comando: Comando): Risultato {
  const motivo = rifiuto(stato, comando);
  if (motivo) return { stato, esiti: [{ tipo: 'RIFIUTATO', motivo }] };
  const s = clona(stato);
  const m = new Motore(s);
  m.esegui_comando(comando);
  m.controlliBoss();
  return { stato: s, esiti: m.esiti };
}

/** Deep copy of plain JSON data: the state has no class instances, dates or cycles. Much faster
 *  than structuredClone, which the harness would otherwise spend most of its time in. */
export function clona<T>(x: T): T {
  if (Array.isArray(x)) {
    const a: unknown[] = x.slice();
    for (let i = 0; i < a.length; i++) if (typeof a[i] === 'object' && a[i] !== null) a[i] = clona(a[i]);
    return a as T;
  }
  if (x !== null && typeof x === 'object') {
    const o: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(x)) o[k] = clona(v);
    return o as T;
  }
  return x;
}

/** Why a command can't be applied now, or null if it can. */
export function rifiuto(stato: Stato, cmd: Comando): string | null {
  const q = new Motore(stato);
  const s = stato;
  if (s.modo === 'fine') return 'partita finita';
  const att = s.attesa;
  if (att) {
    if (att.tipo === 'TRIBUNALE' && cmd.type !== 'DIFESA') return 'il tribunale aspetta la difesa';
    if (att.tipo === 'EVENTO' && cmd.type !== 'SCELTA_EVENTO') return "l'evento aspetta una scelta";
  }
  switch (cmd.type) {
    case 'DIFESA':
      if (att?.tipo !== 'TRIBUNALE') return 'nessun processo in corso';
      if (!['ufficio', 'quartiere', 'grido', 'patteggia', 'spavaldo'].includes(cmd.scelta)) return 'difesa sconosciuta';
      return null;
    case 'SCELTA_EVENTO': {
      if (att?.tipo !== 'EVENTO') return 'nessun evento in corso';
      const o = att.opzioni.find((x) => x.id === cmd.opzione);
      if (!o) return 'opzione sconosciuta';
      return o.disponibile ? null : 'opzione non disponibile';
    }
    case 'COMPRA': {
      if (!Object.hasOwn(DATI.negozio, cmd.item)) return 'oggetto sconosciuto';
      return q.puoComprare(cmd.item) ? null : 'non puoi comprarlo';
    }
    case 'AZIONE': {
      if (s.modo === 'ospedale') return "sei all'ospedale";
      if (s.modo === 'galera' && s.classe !== 'Zingaro') return 'sei in galera';
      if (s.modo === 'slot' && q.deveDormire()) return 'di notte si dorme';
      const a = AZIONI.find((x) => x.id === cmd.id);
      if (!a) return 'azione sconosciuta';
      if (!(cmd.t >= 0 && cmd.t <= 1)) return 'investimento fuori scala';
      if (!haSpesa(a) && cmd.t !== 0) return 'questa azione non prevede investimento';
      if (!q.disponibile(a)) return 'azione non disponibile ora';
      if (spesaDi(a, cmd.t) > s.soldi) return 'non hai abbastanza soldi';
      return null;
    }
    case 'DORMI': {
      if (s.modo !== 'slot') return 'non puoi dormire ora';
      const cibo = DATI.cibo.find((c) => c.nome === cmd.cibo);
      if (!cibo) return 'cibo sconosciuto';
      if (!q.puo_dormire()) return 'hai dormito da poco';
      if (!s.cibo_pagato && !s.cibo_gratis && cibo.costo > s.soldi) return 'non hai abbastanza soldi';
      return null;
    }
    case 'PASSA':
      if (s.modo === 'slot') {
        if (q.deveDormire()) return 'di notte si dorme';
        if (q.puo_dormire()) return 'puoi dormire';
      }
      return null;
  }
}

export function spesaDi(a: Azione, t: number): number {
  return a.spesa[0] + t * (a.spesa[1] - a.spesa[0]);
}

// ---------------------------------------------------------------------------------------------
//  Engine
// ---------------------------------------------------------------------------------------------

export class Motore {
  readonly r: Rng;
  /** Stream of the conditions of the day (Python `self.rng_cond`). */
  readonly rc: Rng;
  readonly esiti: Esito[] = [];
  /** Hot-zone multiplier frozen for the action being resolved (Python `self._zc`). */
  private zc: number | null = null;

  constructor(readonly s: Stato) {
    this.r = new Rng(s.rng);
    this.rc = new Rng(s.rng_cond);
  }

  // --- helpers of `Stato` ------------------------------------------------------------------

  get data(): Data {
    return dataDelGiorno(this.s.giorno);
  }

  get abs_slot(): number {
    return this.s.giorno * SLOT_PER_GIORNO + this.s.slot;
  }

  drip_max(): number {
    let m = 0;
    for (const i of this.s.items) {
      const o = oggetto(i);
      if (o.tipo === 'drip' && o.valore > m) m = o.valore;
    }
    return m;
  }

  drip_tot(): number {
    let t = 0;
    for (const i of this.s.items) {
      const o = oggetto(i);
      if (o.tipo === 'drip' || o.tipo === 'veicolo') t += o.valore;
    }
    return t;
  }

  patrimonio(): number {
    return this.s.soldi + C.PATRIMONIO_DRIP * this.drip_tot();
  }

  punti(): number {
    let p = this.patrimonio() * this.s.rep;
    if (!this.s.vivo) p *= C.GAME_OVER_PENALITA * (this.s.giorno / GIORNI);
    return p;
  }

  /** Times `aid` was done in the last `giorni` days. */
  private ripetizioni(aid: string, giorni: number): number {
    let n = 0;
    for (const [g, i] of this.s.recenti) if (i === aid && this.s.giorno - g < giorni) n++;
    return n;
  }

  zona_calda(aid: string): number {
    return Math.max(C.ZONA_CALDA_MIN, potenza(C.ZONA_CALDA, this.ripetizioni(aid, C.ZONA_CALDA_GIORNI)));
  }

  noia(aid: string): number {
    return potenza(C.NOIA_PIAZZA, this.ripetizioni(aid, C.NOIA_GIORNI));
  }

  private cond<K extends keyof Condizione>(k: K): Condizione[K] | undefined {
    return this.s.cond ? this.s.cond[k] : undefined;
  }

  // --- calendar / class abilities ----------------------------------------------------------

  ramadan(): boolean {
    const d = this.data;
    const [mi, gi] = C.RAMADAN_INIZIO;
    const [mf, gf] = C.RAMADAN_FINE;
    return (d.mese === mi && d.giorno >= gi) || (d.mese === mf && d.giorno <= gf);
  }

  nuovo_giorno(): void {
    const s = this.s;
    s.cibo_pagato = false;
    s.cibo_gratis = false;
    s.lavori_oggi = 0;
    s.storico_guadagni.push(0);
    const d = this.data;
    if (s.galera === 0) s.rep = Math.max(C.REP_MIN, s.rep * C.REP_DECAY);
    this.cambia_salute(C.SALUTE_GIORNO);
    if (s.sorvegliato > 0) s.sorvegliato -= 1;
    if (s.attenzionato > 0) s.attenzionato -= 1;
    if (s.classe === 'Italiano' && d.settimana === C.PAGHETTA_GIORNO_SETTIMANA && s.galera === 0) {
      s.soldi += C.PAGHETTA_IMPORTO;
      this.esiti.push({ tipo: 'PAGHETTA', soldi: C.PAGHETTA_IMPORTO });
    }
    // condition of the day, drawn one day ahead from its own stream
    s.cond = s.cond_domani;
    s.cond_domani = s.giorno + 1 < GIORNI ? this.estrai_condizione(s.giorno + 1) : null;
    // the heat lowers the energy you already have; low health lowers the maximum
    s.energia = Math.min(s.energia, this.energia_max_oggi());
    // trouble / opportunity
    if (s.galera === 0 && s.ospedale === 0) {
      const p = C.P_GUAIO_BASE + (s.classe === 'Balcanico' ? C.GUAIO_BALCANICO_BONUS : 0);
      if (this.r.random() < p) this.evento_personale(this.r.choice(GUAI));
    }
  }

  /** Condition of a given day: fixed dates first, otherwise one draw from `rng_cond`. */
  estrai_condizione(giorno: number): Condizione | null {
    const d = dataDelGiorno(giorno);
    const festa = FESTE.find((f) => f.mese === d.mese && f.giorno === d.giorno);
    if (festa) return clona(festa);
    const fissa = CONDIZIONI.find((c) => c.solo_giorno_mese === d.giorno);
    if (fissa) return clona(fissa);
    // one draw: P(condition) = sum of the allowed p, then a proportional choice
    const cand = CONDIZIONI.filter(
      (c) => c.solo_giorno_mese === undefined && (c.stagione === undefined || c.stagione.includes(d.mese)),
    );
    let tot = 0;
    for (const c of cand) tot += c.p!;
    if (this.rc.random() < tot) return clona(this.rc.choices(cand, cand.map((c) => c.p!)));
    return null;
  }

  // --- personal events -----------------------------------------------------------------------

  /** Starts an event: resolves it now, or waits for SCELTA_EVENTO if it has options. */
  evento_personale(ev: Guaio): void {
    const s = this.s;
    const r = this.r;
    const G = C.GUAI_EFFETTI;
    const opz = (id: string, disponibile = true): OpzioneEvento => ({ id, disponibile });
    switch (ev) {
      case 'cuggino_soldi':
        return this.attendi(ev, [opz('paga', s.soldi >= G.cuggino_soldi.costo), opz('rifiuta')]);
      case 'sfida_piazza':
        // the Balcanico never turns a challenge down (in the simulator, whatever the policy)
        return this.attendi(ev, [opz('accetta'), opz('rifiuta', s.classe !== 'Balcanico')]);
      case 'portafoglio':
        // the simulator draws the content before the choice
        return this.attendi(ev, [opz('tieni'), opz('restituisci')], r.uniform(G.portafoglio.valore[0]!, G.portafoglio.valore[1]!));
      case 'serata':
        return this.attendi(ev, [opz('vai', s.soldi >= G.serata.costo), opz('resta')]);
      case 'giornalista':
        return this.attendi(ev, [opz('accetta'), opz('rifiuta')]);
    }
    this.traccia(ev, null, () => {
      switch (ev) {
        case 'posto_blocco':
          if (s.veicolo && r.random() < G.posto_blocco.p) {
            if (r.random() < G.posto_blocco.sequestro_p) {
              this.perdiVeicolo();
              return 'sequestro';
            }
            this.paga(G.posto_blocco.multa);
            return 'multa';
          }
          return 'niente';
        case 'perquisizione':
          if (r.random() < G.perquisizione.p) {
            this.perdi_soldi(G.perquisizione.quota * s.soldi);
            return 'trovati';
          }
          return 'niente';
        case 'boss_nota':
          if (s.rep >= G.boss_nota.rep_min) {
            const lt: Record<string, number> = { ...(this.cond('loot_tag') ?? {}) };
            for (const k of G.boss_nota.tag) lt[k] = (lt[k] ?? 1.0) * G.boss_nota.bottino_mult;
            s.cond = { ...(s.cond ?? { id: '', nome: '' }), loot_tag: lt };
            return 'notato';
          }
          return 'niente';
        case 'influencer':
          this.guadagna_rep(G.influencer.rep);
          s.energia = Math.max(0, s.energia - G.influencer.energia);
          return 'video';
        case 'furto_veicolo':
          if (s.veicolo === LIVELLO_MONOPATTINO && r.random() < G.furto_veicolo.p) {
            s.veicolo = 0;
            this.togliItem('monopattino');
            return 'rubato';
          }
          return 'niente';
        case 'mamma_spesa':
          s.energia = Math.max(0, s.energia - G.mamma_spesa.energia);
          this.cambia_salute(G.mamma_spesa.salute);
          this.guadagna_rep(G.mamma_spesa.rep);
          return 'spesa';
        case 'sbirro_occhio':
          this.attenziona(G.sbirro_occhio.attenzionato_giorni, G.sbirro_occhio.attenzionato_val);
          return 'occhio';
        case 'gratta_vinci': {
          const v = r.choice(G.gratta_vinci.premi);
          this.incassa(v);
          return v > 0 ? 'vinto' : 'niente';
        }
        case 'febbre':
          s.energia = Math.min(s.energia, s.energia_max * G.febbre.energia_max_quota);
          this.cambia_salute(G.febbre.salute);
          return 'febbre';
        case 'turno_kebab':
          this.incassa(G.turno_kebab.soldi);
          return 'turno';
        case 'rissa_subita':
          if (r.random() < G.rissa_subita.p) {
            this.ricovero(r.randint(C.RICOVERO[0], C.RICOVERO[1]), C.DANNO_RICOVERO.default);
            return 'ricovero';
          }
          return 'niente';
        default:
          throw new Error(`guaio sconosciuto: ${ev}`);
      }
    });
  }

  private attendi(guaio: Guaio, opzioni: OpzioneEvento[], valore?: number): void {
    const att: Attesa = { tipo: 'EVENTO', guaio, opzioni };
    if (valore !== undefined) att.valore = valore;
    this.s.attesa = att;
  }

  /** Resolves an event that was waiting for the player's choice. */
  scelta_evento(opzione: string): void {
    const s = this.s;
    const r = this.r;
    const att = s.attesa;
    if (att?.tipo !== 'EVENTO') throw new Error('nessun evento in corso');
    s.attesa = null;
    const G = C.GUAI_EFFETTI;
    this.traccia(att.guaio, opzione, () => {
      switch (att.guaio) {
        case 'cuggino_soldi':
          if (opzione === 'paga') {
            s.soldi -= G.cuggino_soldi.costo;
            this.guadagna_rep(G.cuggino_soldi.rep_paga);
            return 'pagato';
          }
          this.guadagna_rep(G.cuggino_soldi.rep_rifiuta);
          if (r.random() < G.cuggino_soldi.attenzionato_p) {
            this.attenziona(G.cuggino_soldi.attenzionato_giorni, G.cuggino_soldi.attenzionato_val);
            return 'spiffera';
          }
          return 'rifiutato';
        case 'sfida_piazza':
          if (opzione === 'accetta') {
            const win = G.sfida_piazza.vittoria_p * (s.classe === 'Balcanico' ? C.SFIDA_BALCANICO_MULT : 1);
            if (r.random() < win) {
              this.guadagna_rep(G.sfida_piazza.rep_vinci);
              return 'vinta';
            }
            this.guadagna_rep(G.sfida_piazza.rep_perdi);
            this.ricovero(r.randint(C.RICOVERO[0], C.RICOVERO[1]), C.DANNO_RICOVERO.sfida_piazza);
            return 'persa';
          }
          this.guadagna_rep(G.sfida_piazza.rep_rifiuta);
          return 'rifiutata';
        case 'portafoglio':
          if (opzione === 'restituisci') {
            this.guadagna_rep(G.portafoglio.rep_restituisci);
            return 'restituito';
          }
          this.incassa(att.valore!);
          return 'tenuto';
        case 'serata':
          if (opzione === 'vai') {
            s.soldi -= G.serata.costo;
            this.guadagna_rep(G.serata.rep);
            s.energia = Math.max(0, s.energia - G.serata.energia);
            return 'andato';
          }
          return 'a_casa';
        case 'giornalista':
          if (opzione === 'accetta') {
            this.guadagna_rep(G.giornalista.rep);
            this.attenziona(G.giornalista.attenzionato_giorni, G.giornalista.attenzionato_val);
            return 'intervista';
          }
          return 'rifiutata';
        default:
          throw new Error(`il guaio ${att.guaio} non ha scelte`);
      }
    });
    this.dopoInizioGiorno();
  }

  /** Runs `fn` and records a GUAIO outcome with the money and rep it changed. */
  private traccia(guaio: Guaio, opzione: string | null, fn: () => string): void {
    const soldi0 = this.s.soldi;
    const rep0 = this.s.rep;
    const risultato = fn();
    this.esiti.push({ tipo: 'GUAIO', guaio, opzione, risultato, soldi: this.s.soldi - soldi0, rep: this.s.rep - rep0 });
  }

  // --- economy ---------------------------------------------------------------------------------

  /** Pays a cost (at most what you have). Zingaro: PRESTANOME chance of paying nothing. */
  paga(importo: number): void {
    const s = this.s;
    if (importo <= 0) return;
    if (s.classe === 'Zingaro' && this.r.random() < C.PRESTANOME) return;
    s.soldi = Math.max(0, s.soldi - importo);
  }

  /** Fine: what can't be paid becomes jail days (one every MULTA_CONVERSIONE_EURO_GIORNO). */
  paga_multa(importo: number): number {
    const s = this.s;
    if (importo <= 0) return 0;
    if (s.classe === 'Zingaro' && this.r.random() < C.PRESTANOME) return 0;
    const pagabile = Math.min(importo, s.soldi);
    s.soldi -= pagabile;
    const resto = importo - pagabile;
    return resto > 0 ? Math.ceil(resto / C.MULTA_CONVERSIONE_EURO_GIORNO) : 0;
  }

  /** Watched by the cops: keeps the highest value and the longest duration. */
  attenziona(giorni: number, valore: number): void {
    const s = this.s;
    s.attenzionato = Math.max(s.attenzionato, giorni);
    s.attenzionato_val = Math.max(s.attenzionato > 0 ? s.attenzionato_val : 0, valore);
  }

  /** Every health change goes through here: at 0 the run ends, wherever it happens. */
  cambia_salute(delta: number): void {
    const s = this.s;
    s.salute = Math.max(0, Math.min(s.salute_max, s.salute + delta));
    if (s.salute <= 0 && s.vivo) {
      s.vivo = false;
      s.fine = 'ospedale';
    }
  }

  /** Today's energy maximum: condition of the day (heat) and low health. */
  energia_max_oggi(): number {
    const s = this.s;
    let m = s.energia_max * (this.cond('energia_max_mult') ?? 1.0);
    if (s.salute < C.SALUTE_BASSA_SOGLIA) m *= C.SALUTE_BASSA_ENERGIA_MULT;
    return m;
  }

  perdi_soldi(importo: number): void {
    this.paga(importo);
  }

  /** Class factor on every income: Pakistano "business", Africano "famiglia". */
  moltiplicatore_incasso(): number {
    if (this.s.classe === 'Pakistano') return C.INCASSO_PAKISTANO_MULT;
    if (this.s.classe === 'Africano') return C.INCASSO_AFRICANO_MULT;
    return 1;
  }

  incassa(importo: number): number {
    const s = this.s;
    importo *= this.moltiplicatore_incasso();
    s.soldi += importo;
    s.guadagni += importo;
    if (s.storico_guadagni.length) s.storico_guadagni[s.storico_guadagni.length - 1]! += importo;
    return importo;
  }

  guadagna_rep(punti: number): void {
    const s = this.s;
    if (punti > 0) {
      if (s.classe === 'Magrebino' && this.drip_max() > C.TRAPPER_DRIP_MIN) punti *= C.TRAPPER_REP_MULT;
      if (s.classe === 'Zingaro') punti *= C.REP_ZINGARO_MULT;
      punti *= Math.max(0, 1.0 - s.rep / C.REP_DIMINUENTE);
    }
    s.rep = Math.max(C.REP_MIN, Math.min(C.REP_MAX, s.rep + punti));
  }

  /** Rep of "Chillare in piazza": only works up to CHILL_CAP. */
  rep_chill(a: Azione): number {
    const base = a.rep + this.drip_tot() / C.CHILL_DRIP_DIV;
    return base * Math.max(0, 1.0 - this.s.rep / C.CHILL_CAP);
  }

  rep_tiktok(a: Azione): number {
    return a.rep * Math.max(0, 1.0 - this.s.rep / C.TIKTOK_CAP);
  }

  // --- risks -----------------------------------------------------------------------------------

  /** [p_gabbio, p_ospedale] for action `a` with investment `t`. */
  rischi(a: Azione, t: number): [number, number] {
    const s = this.s;
    let g = a.gabbio[0] + t * (a.gabbio[1] - a.gabbio[0]);
    let o = a.ospedale;
    if (g === 0 && o === 0) return [0, 0];
    let mult = 1.0;
    const tags = a.tags as string[];
    // class
    if (s.classe === 'Africano') g *= C.FUGA_AFRICANO_MULT; // instant escape: only on getting caught
    if (s.classe === 'Balcanico' && tags.includes('FORZA')) mult *= C.FORZA_BRUTA_MULT;
    // vehicle (escape actions)
    if (tags.includes('VEICOLO') && s.veicolo) g -= C.RISCHIO_FUGA_VEICOLO_PT * s.veicolo;
    if (a.veicolo_req && s.veicolo === LIVELLO_MOTORINO) g -= C.RISCHIO_VEICOLO_REQ_PT;
    // tools
    if (s.items.includes('passamontagna') && tags.includes('NOTTE')) g -= C.RISCHIO_TOOL_PT;
    if (s.items.includes('tronchese') && tags.includes('EFFRAZIONE')) g -= C.RISCHIO_TOOL_PT;
    // condition of the day
    g += this.cond('gabbio_add') ?? 0;
    for (const [tag, m] of Object.entries(this.cond('risk_tag') ?? {})) if (tags.includes(tag)) mult *= m;
    g *= this.cond('risk_id')?.[a.id] ?? 1.0;
    // watched
    if (s.attenzionato > 0) g += s.attenzionato_val;
    g = Math.max(0, Math.min(C.RISCHIO_MAX, g * mult));
    o = Math.max(0, Math.min(C.RISCHIO_MAX, o * mult));
    return [g, o];
  }

  bottino_atteso(a: Azione, t: number, spesa: number): number {
    let base: number;
    if (a.bottino_x) {
      const [lo, hi] = a.bottino_x as [number, number];
      base = (spesa * (lo + hi)) / 2;
    } else {
      const [lo, hi] = a.bottino as [number, number];
      base = (lo + C.INVESTIMENTO_BOTTINO_MIN * t * (hi - lo) + hi) / 2;
    }
    return base * this.moltiplicatore_bottino(a);
  }

  moltiplicatore_bottino(a: Azione): number {
    const s = this.s;
    const tags = a.tags as string[];
    if (tags.includes('LEGALE')) return 1.0;
    let m = 1.0 + (C.REP_LOOT_BONUS * s.rep) / C.REP_MAX;
    m *= this.zc || this.zona_calda(a.id);
    for (const [tag, x] of Object.entries(this.cond('loot_tag') ?? {})) if (tags.includes(tag)) m *= x;
    m *= this.cond('loot_id')?.[a.id] ?? 1.0;
    return m;
  }

  estrai_bottino(a: Azione, t: number, spesa: number): number {
    let v: number;
    if (a.bottino_x) {
      const [lo, hi] = a.bottino_x as [number, number];
      v = spesa * this.r.uniform(lo, hi);
    } else {
      const [lo, hi] = a.bottino as [number, number];
      v = this.r.uniform(lo + C.INVESTIMENTO_BOTTINO_MIN * t * (hi - lo), hi);
    }
    return v * this.moltiplicatore_bottino(a);
  }

  costo_energia(a: Azione): number {
    const s = this.s;
    const tags = a.tags as string[];
    let e = a.energia;
    if (!tags.includes('LEGALE') && !tags.includes('AZZARDO')) e += this.cond('energia_add') ?? 0;
    if (a.trasferta) e += this.cond('energia_add_trasferta') ?? 0;
    if (s.galera > 0) e *= C.CUGGINO_ENERGIA_MULT; // Zingaro "chiamata al cuggino"
    return e;
  }

  slot_necessari(a: Azione): number {
    if (!a.trasferta) return 1;
    if (this.s.classe === 'Magrebino' || this.s.veicolo) return 1;
    return C.TRASFERTA_SLOT;
  }

  disponibile(a: Azione): boolean {
    const s = this.s;
    const tags = a.tags as string[];
    if (!(a.slots as number[]).includes(s.slot)) return false;
    if (s.rep < a.rep_min) return false;
    if ((s.cooldown[a.id] ?? -1) > s.giorno) return false;
    if (this.cond('blocca')?.includes(a.id)) return false;
    if (a.solo_evento && this.cond('abilita') !== a.solo_evento) return false;
    if (a.veicolo_req && !s.veicolo) return false;
    if (tags.includes('LEGALE') && haBottino(a) && s.lavori_oggi >= C.LAVORI_AL_GIORNO) return false;
    if (s.classe === 'Magrebino') {
      if (tags.includes('AZZARDO')) return false;
      if (this.ramadan() && C.RAMADAN_SLOT_VIETATI.includes(s.slot)) return false;
    }
    if (s.classe === 'Pakistano' && s.slot === C.VENTIQUATTROSETTE_SLOT) {
      if (s.notte_pak_sett === this.data.settimanaIso) return false;
    }
    if (this.slot_necessari(a) === C.TRASFERTA_SLOT && s.slot >= C.TRASFERTA_SLOT_LIMITE) return false;
    if (this.costo_energia(a) > s.energia) return false;
    if (a.spesa[0] > s.soldi) return false;
    if (s.galera > 0) {
      // in jail only the Zingaro, and only actions without risk
      if (s.classe !== 'Zingaro') return false;
      if (haRischio(a)) return false;
    }
    return true;
  }

  // --- action ----------------------------------------------------------------------------------

  esegui(a: Azione, t: number): void {
    const s = this.s;
    const r = this.r;
    const tags = a.tags as string[];
    const soldi0 = s.soldi;
    const rep0 = s.rep;
    const spesa = spesaDi(a, t);
    s.soldi -= spesa;
    s.energia -= this.costo_energia(a);
    s.azioni += 1;
    s.azioni_usate[a.id] = (s.azioni_usate[a.id] ?? 0) + 1;
    if (tags.includes('LEGALE') && haBottino(a)) s.lavori_oggi += 1;
    if (a.cooldown) s.cooldown[a.id] = s.giorno + a.cooldown;
    if (s.classe === 'Pakistano' && s.slot === C.VENTIQUATTROSETTE_SLOT) s.notte_pak_sett = this.data.settimanaIso;
    const nslot = this.slot_necessari(a);
    if (a.salute) this.cambia_salute(a.salute);

    // rep multipliers: boredom (gains only) and today's Social conditions
    let rep_tag_mult = this.noia(a.id);
    const zc = this.zona_calda(a.id);
    s.recenti.push([s.giorno, a.id]);
    if (s.recenti.length > C.RECENTI_MAX) s.recenti = s.recenti.slice(-C.RECENTI_MAX);
    for (const [tag, m] of Object.entries(this.cond('rep_tag') ?? {})) if (tags.includes(tag)) rep_tag_mult *= m;

    // special actions without risk (gambling, chill)
    const sp = a.speciale;
    let vinto: boolean | null = null;
    if (sp === 'chill') this.guadagna_rep(this.rep_chill(a) * rep_tag_mult);
    else if (sp === 'slot') {
      vinto = r.random() < C.SLOT_VINCITA_P;
      if (vinto) this.incassa(spesa * C.SLOT_VINCITA_MULT);
    } else if (sp === 'scommessa') {
      vinto = r.random() < C.SCOMMESSA_VINCITA_P;
      if (vinto) {
        this.incassa(spesa * C.SCOMMESSA_VINCITA_MULT);
        this.guadagna_rep(C.SCOMMESSA_REP);
      }
    }

    this.zc = zc;
    const [g, o] = this.rischi(a, t);
    let esito: 'ok' | 'gabbio' | 'ospedale' = 'ok';
    if (g > 0 && r.random() < g) esito = 'gabbio';
    else if (o > 0 && r.random() < o) esito = 'ospedale';

    let virale = false;
    let veicolo = false;
    if (esito === 'ok') {
      if (sp === 'poker') {
        vinto = r.random() < C.POKER_VINCITA_P + s.rep / C.POKER_VINCITA_REP_DIV;
        if (vinto) {
          this.incassa(spesa * C.POKER_VINCITA_MULT);
          this.guadagna_rep(C.POKER_REP.vinci);
        } else this.guadagna_rep(C.POKER_REP.perdi);
      } else if (sp === 'corsa') {
        vinto = r.random() < C.CORSA_VINCITA_P + (s.classe === 'Balcanico' ? C.CORSA_BALCANICO_BONUS : 0);
        if (vinto) {
          this.incassa(spesa * C.CORSA_VINCITA_MULT);
          this.guadagna_rep(a.rep);
        }
      } else if (sp === 'tiktok' || sp === 'tag') {
        let rp = (sp === 'tiktok' ? this.rep_tiktok(a) : a.rep) * rep_tag_mult;
        if (r.random() < C.VIRALE_P) {
          rp += C.VIRALE_REP;
          virale = true;
        }
        this.guadagna_rep(rp);
      } else if (sp === 'chill') {
        // rep already given above
      } else {
        // C09: without a vehicle, half the time you keep the scooter instead of selling it
        const tieni = sp === 'monopattino' && s.veicolo === 0 && r.random() < C.MONOPATTINO_TIENI_P;
        if (tieni) {
          this.prendiMonopattino();
          veicolo = true;
        } else if (haBottino(a) || a.bottino_x) {
          this.incassa(this.estrai_bottino(a, t, spesa));
        }
        if (sp === 'cibo_gratis') s.cibo_gratis = true;
        // C18: loot, plus a chance of the rider's scooter
        if (sp === 'veicolo_bonus' && s.veicolo === 0 && r.random() < C.VEICOLO_BONUS_P) {
          this.prendiMonopattino();
          veicolo = true;
        }
        this.guadagna_rep(a.rep * (a.rep > 0 ? rep_tag_mult : 1.0));
      }
    }
    this.esiti.push({
      tipo: 'AZIONE',
      id: a.id,
      t,
      spesa,
      risultato: esito,
      vinto,
      soldi: s.soldi - soldi0,
      rep: s.rep - rep0,
      virale,
      veicolo,
    });

    if (esito === 'ospedale') {
      this.ricovero(
        r.randint(C.RICOVERO[0], C.RICOVERO[1]),
        tags.includes('FORZA') ? C.DANNO_RICOVERO.FORZA : C.DANNO_RICOVERO.default,
      );
    } else if (esito === 'gabbio') {
      this.zc = null;
      this.arresto(a, nslot);
      return; // continues in `difesa` once the player chooses
    }
    this.zc = null;
    s.slot += nslot;
  }

  private prendiMonopattino(): void {
    this.s.veicolo = LIVELLO_MONOPATTINO;
    if (!this.s.items.includes('monopattino')) this.s.items.push('monopattino');
  }

  private togliItem(id: string): void {
    this.s.items = this.s.items.filter((i) => i !== id);
  }

  private perdiVeicolo(): void {
    this.s.veicolo = 0;
    this.togliItem('monopattino');
    this.togliItem('motorino');
  }

  // --- hospital --------------------------------------------------------------------------------

  ricovero(giorni: number, danno: number): void {
    const s = this.s;
    this.cambia_salute(-danno);
    s.ospedale = giorni;
    s.g_osp += giorni;
    s.ricoveri += 1;
    const soldi0 = s.soldi;
    this.perdi_soldi(C.FURTO_OSPEDALE * s.soldi);
    this.esiti.push({ tipo: 'RICOVERO', giorni, danno, furto: soldi0 - s.soldi });
    this.boss('primo_ricovero');
  }

  // --- court -----------------------------------------------------------------------------------

  /** Arrest: seizure and requested sentence, then wait for the defence. */
  arresto(a: Azione, nslot: number): void {
    const s = this.s;
    s.arresti += 1;
    const soldi0 = s.soldi;
    this.perdi_soldi(Math.min(C.SEQUESTRO_MAX, C.SEQUESTRO_ARRESTO * s.soldi));
    let veicolo_sequestrato = false;
    if (a.veicolo_req) {
      // Python: `a["veicolo_req"] and r.random() < 0.5 and s.veicolo` draws even without a vehicle
      if (this.r.random() < C.VEICOLO_SEQUESTRO_ARRESTO && s.veicolo) {
        this.perdiVeicolo();
        veicolo_sequestrato = true;
      }
    }
    const pena_base = this.pena_base(a);
    this.esiti.push({ tipo: 'ARRESTO', azione: a.id, sequestro: soldi0 - s.soldi, veicolo_sequestrato });
    this.boss('primo_arresto');
    s.attesa = { tipo: 'TRIBUNALE', azione: a.id, pena_base, multa: a.multa, nslot };
  }

  /** Requested sentence before rounding: recidivism, and probation if under it. */
  pena_base(a: Azione): number {
    const s = this.s;
    let pena = a.pena * (1 + C.RECIDIVA_PENA * Math.min(s.condanne, C.RECIDIVA_MAX));
    if (s.sorvegliato > 0) pena *= C.SORVEGLIATO_MULT;
    return pena;
  }

  /** Modifiers of the judge's roll besides the dice and the defence (all but the last are integers). */
  modificatori_tiro(): ModificatoriTiro {
    const s = this.s;
    const NQ = C.NOTO_IN_QUESTURA;
    return {
      classe: C.TIRO_CLASSE[s.classe as keyof typeof C.TIRO_CLASSE] ?? 0,
      recidiva: -C.RECIDIVA_TIRO * Math.min(s.condanne, C.RECIDIVA_MAX),
      tutorial: s.giorno < C.TUTORIAL_GIORNI ? C.TUTORIAL_BONUS : 0,
      incensurato: s.condanne === 0 ? C.INCENSURATO_BONUS : 0,
      noto_in_questura: s.rep > NQ.da_rep ? -Math.min(NQ.max, (s.rep - NQ.da_rep) / NQ.per_punti) : 0,
    };
  }

  /** The rest of `arresto` once the defence is chosen. */
  difesa(sceltaRichiesta: Difesa): void {
    const s = this.s;
    const r = this.r;
    const att = s.attesa;
    if (att?.tipo !== 'TRIBUNALE') throw new Error('nessun processo in corso');
    s.attesa = null;
    const soldi0 = s.soldi;
    const rep0 = s.rep;
    const { pena_base, multa } = att;
    const avv = DATI.avvocati as Record<string, { costo: number; bonus: number }>;
    let scelta: Difesa = sceltaRichiesta;
    // a defence you can't pay for can't be chosen
    if (Object.hasOwn(avv, scelta) && s.soldi < avv[scelta]!.costo) scelta = 'ufficio';
    let giorni_multa = 0;
    let pena: number;
    let esito: EsitoTribunale;
    let dado: number | null = null;
    let tiro: number | null = null;
    const M = C.TRIBUNALE_MULT;
    if (scelta === 'patteggia') {
      pena = pena_base * M.patteggiamento;
      esito = 'patteggiamento';
      giorni_multa = this.paga_multa(multa);
      s.condanne += 1;
    } else {
      let { costo, bonus } = avv[Object.hasOwn(avv, scelta) ? scelta : 'ufficio']!;
      if (scelta === 'spavaldo') {
        costo = 0;
        bonus = C.SPAVALDO_TIRO;
        this.guadagna_rep(C.SPAVALDO_REP);
      }
      this.paga(costo);
      dado = r.randint(C.TIRO_DADO[0]!, C.TIRO_DADO[1]!);
      // same order as the simulator; the integer terms are exact, "noto in questura" comes last
      const mt = this.modificatori_tiro();
      let t = dado + bonus;
      t += mt.classe;
      t += mt.recidiva;
      t += mt.tutorial;
      t += mt.incensurato;
      t += mt.noto_in_questura;
      tiro = t;
      const S = C.TRIBUNALE_SOGLIE;
      if (t >= S.assolto) {
        pena = 0;
        esito = 'assolto';
        this.guadagna_rep(C.REP_ASSOLTO);
      } else if (t >= S.messa_alla_prova) {
        pena = 0;
        esito = 'messa_alla_prova';
        s.sorvegliato = C.SORVEGLIATO_GIORNI;
        giorni_multa = this.paga_multa(multa * C.RISCHIO_MULTA_RIDOTTA_PROVA);
      } else if (t >= S.ridotta) {
        pena = pena_base * M.ridotta;
        esito = 'ridotta';
        giorni_multa = this.paga_multa(multa);
        s.condanne += 1;
      } else if (t >= S.piena) {
        pena = pena_base * M.piena;
        esito = 'piena';
        giorni_multa = this.paga_multa(multa);
        s.condanne += 1;
      } else {
        pena = pena_base * M.aggravata;
        esito = 'aggravata';
        giorni_multa = this.paga_multa(multa * C.MULTA_AGGRAVATA_MULT);
        s.condanne += 1;
      }
    }
    // school rounding (0.5 -> 1) and at least one day for every conviction
    if (pena > 0) pena = Math.max(C.PENA_MIN_GIORNI, Math.floor(pena + C.PENA_ARROTONDAMENTO));
    pena += giorni_multa;
    this.esiti.push({
      tipo: 'VERDETTO',
      difesa: scelta,
      dado,
      tiro,
      esito,
      pena,
      giorni_multa,
      soldi: s.soldi - soldi0,
      rep: s.rep - rep0,
    });
    if (esito === 'messa_alla_prova') this.boss('prima_messa_alla_prova');
    if (pena >= C.GAME_OVER_PENA || (C.GAME_OVER_GALERA_TOT && s.g_galera + pena > C.GAME_OVER_GALERA_TOT)) {
      s.vivo = false;
      s.fine = 'galera';
      s.galera = pena;
    } else if (pena > 0) {
      s.galera = pena;
      s.g_galera += Math.min(pena, GIORNI - s.giorno - 1);
      if (pena > GIORNI - s.giorno - 1) s.fine = 'anno_in_cella';
    }
    // back in `esegui`
    s.slot += att.nslot;
    this.dopoAzione();
  }

  // --- rest / food -----------------------------------------------------------------------------

  puo_dormire(): boolean {
    return this.abs_slot - this.s.ultimo_sonno >= C.SONNO_INTERVALLO;
  }

  /** At Night, if you haven't slept today, the night is slept. */
  deveDormire(): boolean {
    return this.s.modo === 'slot' && this.s.slot === NOTTE && !this.s.dormito;
  }

  dormi(nomeCibo: string): void {
    const s = this.s;
    const cibo = DATI.cibo.find((c) => c.nome === nomeCibo);
    if (!cibo) throw new Error(`cibo sconosciuto: ${nomeCibo}`);
    let { costo, recupero: rec } = cibo;
    if (!s.cibo_pagato) {
      if (s.cibo_gratis) costo = 0;
      s.soldi -= costo;
      s.cibo_pagato = true;
      this.cambia_salute(cibo.salute);
    } else costo = 0;
    if (s.classe === 'Balcanico') rec = C.RECUPERO_BALCANICO;
    const emax = this.energia_max_oggi();
    s.energia = Math.min(emax, s.energia + rec * s.energia_max);
    s.ultimo_sonno = this.abs_slot;
    s.slot += 1;
    s.dormito = true;
    this.esiti.push({ tipo: 'SONNO', cibo: cibo.nome, costo, energia: s.energia });
  }

  paghetta_emergenza(): void {
    const s = this.s;
    const m = this.data.mese;
    if (s.classe === 'Italiano' && s.soldi <= C.PAGHETTA_EMERGENZA_SOGLIA && s.paghetta_em_mese !== m) {
      s.soldi = C.PAGHETTA_EMERGENZA_IMPORTO;
      s.paghetta_em_mese = m;
      this.esiti.push({ tipo: 'PAGHETTA_EMERGENZA', soldi: C.PAGHETTA_EMERGENZA_IMPORTO });
    }
  }

  puoComprare(id: string): boolean {
    const s = this.s;
    const it = oggetto(id);
    if (s.items.includes(id) || s.soldi < it.prezzo) return false;
    if (it.tipo === 'veicolo' && 'livello' in it && it.livello <= s.veicolo) return false;
    return true;
  }

  compra(id: string): void {
    const s = this.s;
    const it = oggetto(id);
    s.soldi -= it.prezzo;
    s.items.push(id);
    if (it.tipo === 'veicolo' && 'livello' in it) s.veicolo = it.livello;
    this.esiti.push({ tipo: 'COMPRA', item: id, prezzo: it.prezzo });
  }

  // --- the Boss's chat (GDD §Tutorial; not in the simulator, no random draws) --------------------

  /** Sends a Boss message, only the first time. */
  boss(id: MessaggioBoss): void {
    if (this.s.boss.includes(id)) return;
    this.s.boss.push(id);
    this.esiti.push({ tipo: 'BOSS', id });
  }

  /** After every command: rep thresholds reached and the first time at 0€. */
  controlliBoss(): void {
    const s = this.s;
    if (s.modo === 'fine') return;
    for (const soglia of C.TIER_REP) if (soglia > 0 && s.rep >= soglia) this.boss(`tier_${soglia}`);
    if (Math.round(s.soldi) <= 0) this.boss('zero_euro');
  }

  // --- game loop (Python `gioca`, unrolled into commands) ----------------------------------------

  esegui_comando(cmd: Comando): void {
    const s = this.s;
    switch (cmd.type) {
      case 'COMPRA':
        this.compra(cmd.item);
        return;
      case 'SCELTA_EVENTO':
        this.scelta_evento(cmd.opzione);
        return;
      case 'DIFESA':
        this.difesa(cmd.scelta);
        return;
      case 'DORMI':
        this.dormi(cmd.cibo);
        this.dopoAzione();
        return;
      case 'AZIONE':
        this.esegui(azione(cmd.id), cmd.t);
        if (!s.attesa) this.dopoAzione();
        return;
      case 'PASSA':
        if (s.modo === 'slot') {
          s.slot += 1;
          this.esiti.push({ tipo: 'PASSA' });
          this.dopoAzione();
        } else this.fineGiornoSpeciale();
        return;
    }
  }

  /** Top of the day loop: `s.slot = 1; nuovo_giorno()` and what follows it. */
  iniziaGiorno(): void {
    const s = this.s;
    s.slot = 1;
    s.dormito = false;
    this.nuovo_giorno();
    this.esiti.push({ tipo: 'GIORNO', giorno: s.giorno, modo: s.modo, condizione: s.cond?.id || null });
    if (s.attesa) return; // an event waits for a choice
    this.dopoInizioGiorno();
  }

  /** After `nuovo_giorno`: a hospital day, a jail day, or the slots of a normal day. */
  private dopoInizioGiorno(): void {
    const s = this.s;
    if (s.ospedale > 0) {
      s.modo = 'ospedale';
      s.ospedale -= 1;
      if (!s.vivo) this.fineGiornoSpeciale();
      return;
    }
    if (s.galera > 0) {
      s.modo = 'galera';
      s.galera -= 1;
      if (!s.vivo) this.fineGiornoSpeciale();
      return;
    }
    s.modo = 'slot';
    this.dopoAzione();
  }

  /** End of a hospital or jail day (Zingaro's action, if any, already done). */
  private fineGiornoSpeciale(): void {
    const s = this.s;
    const da = s.modo;
    s.giorno += 1;
    if (da === 'ospedale' && s.ospedale === 0) {
      s.energia = s.energia_max;
      this.cambia_salute(C.OSPEDALE_SALUTE_USCITA);
      this.esiti.push({ tipo: 'USCITA', da: 'ospedale' });
    } else if (da === 'galera' && s.galera === 0) {
      s.energia = s.energia_max;
      this.guadagna_rep(C.REP_USCITA_GALERA);
      this.esiti.push({ tipo: 'USCITA', da: 'galera' });
    }
    this.prossimoGiorno();
  }

  /** After an action, a sleep or a pass: next slot, or the day is over. */
  private dopoAzione(): void {
    const s = this.s;
    if (s.modo === 'galera') {
      // the Zingaro's one action of the day is done
      this.fineGiornoSpeciale();
      return;
    }
    if (s.slot <= NOTTE && s.vivo && s.galera === 0 && s.ospedale === 0) {
      this.preparaSlot();
      return;
    }
    s.giorno += 1;
    this.prossimoGiorno();
  }

  /** What the simulator does at the top of every slot, before the player chooses. */
  private preparaSlot(): void {
    const s = this.s;
    this.paghetta_emergenza();
    if (
      s.classe === 'Pakistano' &&
      s.energia <= C.INSTANCABILE_SOGLIA &&
      s.instancabile_mese !== this.data.mese
    ) {
      s.energia = C.INSTANCABILE_ENERGIA;
      s.instancabile_mese = this.data.mese;
      this.esiti.push({ tipo: 'INSTANCABILE' });
    }
  }

  private prossimoGiorno(): void {
    const s = this.s;
    if (s.giorno < GIORNI && s.vivo) {
      this.iniziaGiorno();
      return;
    }
    s.giorno = Math.min(s.giorno, GIORNI);
    s.modo = 'fine';
    this.esiti.push({ tipo: 'FINE', fine: s.fine, punti: this.punti() });
  }
}
