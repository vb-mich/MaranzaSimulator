// Automatic players: a port of the POLICY section of sim/maranza_sim.py.
//
// These are bots for the harness, not game rules: their thresholds (when to buy, which lawyer,
// how much risk is acceptable) stay here as in the simulator. Everything the game decides comes
// from the engine's read-only queries. The random player draws from the game's own RNG, exactly
// like `g.rng` in Python, so the runs match the simulator's.

import { AZIONI, C, DATI, haBottino, haSpesa, type Azione, type Cibo } from '../src/data/gameData';
import {
  Rng,
  bottinoAtteso,
  disponibile,
  noia,
  patrimonio,
  repChill,
  repTiktok,
  rischi,
  spesa as spesaDi,
  type Difesa,
  type Stato,
} from '../src/engine';
import { mediaEsatta, potenza } from '../src/engine/pymath';

export type Scelta = [Azione, number] | null;

export interface Policy {
  scegli(s: Stato, maxRischio?: number): Scelta;
  dormiSe(s: Stato, scelta: [Azione, number]): boolean;
  cibo(s: Stato): Cibo;
  acquisti(s: Stato): string[];
  difesa(s: Stato, pena: number): Difesa;
  generoso: boolean;
  accettaSfide: boolean;
  onesto: boolean;
  festaiolo: boolean;
  accettaTv: boolean;
}

const CIBO = DATI.cibo;

/** Python `Stato.reddito_giornaliero`. */
function redditoGiornaliero(s: Stato): number {
  const h = s.storico_guadagni.slice(-14);
  return h.length ? Math.max(80.0, mediaEsatta(h)) : 80.0;
}

/** Python `_ev`; `reddito` is `s.reddito_giornaliero()`, computed once per choice (same value). */
function ev(
  s: Stato,
  a: Azione,
  t: number,
  pesoRischio: number,
  sogliaRischio: number,
  valoreRep: number,
  reddito: number,
): number | null {
  const spesa = spesaDi(a, t);
  if (spesa > s.soldi) return null;
  const [gb, os] = rischi(s, a, t);
  if (gb + os > sogliaRischio) return null;
  // avoid sentences that would end the run
  const recidiva = 1 + C.RECIDIVA_PENA * Math.min(s.condanne, C.RECIDIVA_MAX);
  const penaPeggiore = a.pena * recidiva * (s.sorvegliato ? C.SORVEGLIATO_MULT : 1) * 1.5;
  if (C.GAME_OVER_GALERA_TOT && s.g_galera + penaPeggiore > C.GAME_OVER_GALERA_TOT && pesoRischio >= 0.8) return null;
  if (penaPeggiore >= C.GAME_OVER_PENA && pesoRischio >= 0.8) return null;
  if (penaPeggiore >= C.GAME_OVER_PENA / 1.5 && pesoRischio >= 1.5) return null;
  const sp = a.speciale;
  let loot = 0.0;
  if (sp === 'slot') loot = spesa * C.SLOT_VINCITA_MULT * C.SLOT_VINCITA_P;
  else if (sp === 'scommessa') loot = spesa * C.SCOMMESSA_VINCITA_MULT * C.SCOMMESSA_VINCITA_P;
  else if (sp === 'poker') loot = spesa * C.POKER_VINCITA_MULT * (C.POKER_VINCITA_P + s.rep / C.POKER_VINCITA_REP_DIV);
  else if (sp === 'corsa') loot = spesa * C.CORSA_VINCITA_MULT * C.CORSA_VINCITA_P;
  else if (haBottino(a) || a.bottino_x) loot = bottinoAtteso(s, a, t);
  if (s.classe === 'Pakistano') loot *= C.INCASSO_PAKISTANO_MULT;
  if (s.classe === 'Africano') loot *= C.INCASSO_AFRICANO_MULT;
  const ps = (1 - gb) * (1 - os);
  const giorniPena = a.pena * recidiva * 0.6;
  const costoGabbio =
    gb * (giorniPena * reddito + Math.min(C.SEQUESTRO_MAX, C.SEQUESTRO_ARRESTO * s.soldi) + 100 + a.multa * 0.7);
  const costoOsp = os * (4 * reddito + C.FURTO_OSPEDALE * s.soldi + 60);
  let rep: number = a.rep;
  if (sp === 'chill') rep = repChill(s, a);
  else if (sp === 'tiktok') rep = repTiktok(s, a);
  if (rep > 0) rep *= Math.max(0.0, 1.0 - s.rep / C.REP_DIMINUENTE) * noia(s, a.id);
  const repEv = rep * valoreRep * (rep > 0 ? ps : 1.0);
  const saluteEv = s.salute < 60 ? a.salute * 3 : 0;
  return ps * loot - spesa + repEv + saluteEv - pesoRischio * (costoGabbio + costoOsp);
}

function scegliGenerico(
  s: Stato,
  pesoRischio = 1.0,
  sogliaRischio = 1.0,
  maxRischio: number | undefined = undefined,
  repFattore = 1.0,
): Scelta {
  const giorniLeft = C.GIORNI - s.giorno;
  // 1) rep as a bonus on future loot; 2) rep in the final points; 3) unlocking the next tier
  const reddito = redditoGiornaliero(s);
  const valLoot = (C.REP_LOOT_BONUS / 100.0) * reddito * 100.0 * (1 - potenza(0.99, giorniLeft));
  const valFine = (patrimonio(s) / Math.max(s.rep, 10.0)) * potenza(0.99, giorniLeft);
  const prossima = [10, 20, 35, 45, 50, 70].find((x) => x > s.rep);
  const valUnlock = prossima !== undefined && prossima - s.rep < 15 ? 15.0 : 4.0;
  const valoreRep = repFattore * (valLoot + valFine + valUnlock);
  let best: Scelta = null;
  let bestEv = -1e9;
  for (const a of AZIONI) {
    if (!disponibile(s, a)) continue;
    if (maxRischio !== undefined) {
      const [gb, os] = rischi(s, a, 0.0);
      if (gb + os > maxRischio) continue;
    }
    for (const t of [0.0, 0.5, 1.0]) {
      if (!haSpesa(a) && t > 0) break;
      const v = ev(s, a, t, pesoRischio, sogliaRischio, valoreRep, reddito);
      if (v !== null && v > bestEv) {
        best = [a, t];
        bestEv = v;
      }
    }
  }
  return best;
}

/** Sleeps if the best action is poor and energy is low. */
function dormiSeGenerico(s: Stato, [a]: [Azione, number]): boolean {
  return s.energia < 0.35 * s.energia_max && a.energia <= 20 && s.slot !== 1;
}

function ciboGenerico(s: Stato): Cibo {
  for (const c of CIBO) if (s.soldi >= c.costo + 10) return c;
  return CIBO[CIBO.length - 1]!;
}

function ciboTirchio(s: Stato): Cibo {
  if (s.soldi >= 80) return CIBO[1]!;
  if (s.soldi >= 15) return CIBO[2]!;
  return CIBO[CIBO.length - 1]!;
}

function acquistiBilanciato(s: Stato): string[] {
  const out: string[] = [];
  if (s.soldi > 120) out.push('passamontagna', 'tronchese');
  if (s.soldi > 700) out.push('monopattino');
  if (s.soldi > 900) out.push('tuta');
  if (s.soldi > 1500) out.push('catena');
  if (s.soldi > 4000) out.push('motorino');
  if (s.soldi > 6000) out.push('telefono');
  if (s.soldi > 12000) out.push('orologio');
  return out;
}

function acquistiYolo(s: Stato): string[] {
  const out: string[] = [];
  if (s.soldi > 300) out.push('tuta');
  if (s.soldi > 500) out.push('monopattino');
  if (s.soldi > 800) out.push('catena', 'passamontagna');
  if (s.soldi > 2500) out.push('motorino');
  if (s.soldi > 3000) out.push('telefono');
  if (s.soldi > 8000) out.push('orologio');
  return out;
}

function difesaBilanciato(s: Stato, pena: number): Difesa {
  if (pena <= 3) return 'ufficio';
  if (s.soldi >= 1800) return 'grido';
  if (s.soldi >= 450) return 'quartiere';
  if (pena >= 30) return 'patteggia';
  return 'ufficio';
}

function difesaYolo(s: Stato, pena: number): Difesa {
  if (s.soldi >= 600 && pena >= 20) return 'grido';
  return 'spavaldo';
}

function difesaPrudente(s: Stato, pena: number): Difesa {
  if (s.soldi >= 600) return 'grido';
  if (s.soldi >= 150) return 'quartiere';
  return pena >= 10 ? 'patteggia' : 'ufficio';
}

/**
 * Random player: computes nothing, but reads the risk colour on the button. Picks with weight
 * 1/(risk + 0.05); 20% of the time out of pure curiosity (uniform).
 */
function scegliCasuale(s: Stato): Scelta {
  const disp = AZIONI.filter((a) => disponibile(s, a));
  if (!disp.length) return null;
  const rng = new Rng(s.rng);
  let a: Azione;
  if (rng.random() < 0.2) a = rng.choice(disp);
  else {
    const pesi = disp.map((x) => {
      const [gb, os] = rischi(s, x, 0.0);
      return 1.0 / (0 + gb + os + 0.05);
    });
    a = rng.choices(disp, pesi);
  }
  let t = haSpesa(a) ? rng.choice([0.0, 0.5, 1.0]) : 0.0;
  if (spesaDi(a, t) > s.soldi) t = 0.0;
  return [a, t];
}

export const POLICIES: Record<string, Policy> = {
  prudente: {
    scegli: (s, maxRischio) => scegliGenerico(s, 2.0, 0.3, maxRischio, 0.8),
    dormiSe: dormiSeGenerico,
    cibo: ciboGenerico,
    acquisti: acquistiBilanciato,
    difesa: difesaPrudente,
    generoso: true,
    accettaSfide: false,
    onesto: true,
    festaiolo: false,
    accettaTv: false,
  },
  bilanciato: {
    scegli: (s, maxRischio) => scegliGenerico(s, 1.0, 0.6, maxRischio),
    dormiSe: dormiSeGenerico,
    cibo: ciboGenerico,
    acquisti: acquistiBilanciato,
    difesa: difesaBilanciato,
    generoso: true,
    accettaSfide: true,
    onesto: false,
    festaiolo: true,
    accettaTv: true,
  },
  yolo: {
    scegli: (s, maxRischio) => scegliGenerico(s, 0.5, 1.0, maxRischio, 1.5),
    dormiSe: dormiSeGenerico,
    cibo: ciboTirchio,
    acquisti: acquistiYolo,
    difesa: difesaYolo,
    generoso: false,
    accettaSfide: true,
    onesto: false,
    festaiolo: true,
    accettaTv: true,
  },
  casuale: {
    scegli: (s) => scegliCasuale(s),
    dormiSe: (s) => s.energia < 0.3 * s.energia_max,
    cibo: ciboGenerico,
    acquisti: acquistiYolo,
    difesa: (s) => new Rng(s.rng).choice<Difesa>(['ufficio', 'quartiere', 'patteggia', 'spavaldo']),
    generoso: true,
    accettaSfide: true,
    onesto: false,
    festaiolo: true,
    accettaTv: true,
  },
};
