// Public types of the engine: game state, commands and outcomes.
// The state is plain JSON (no Set/Map/classes): it is saved, exported and replayed as is.
// Field names follow sim/maranza_sim.py (`Stato`) so the two can be compared field by field.

import type { Avvocato, Classe, Condizione, Guaio } from '../data/gameData';
import type { RngStato } from './rng';

/** Where the run is: playing the slots of a normal day, a day in jail or in hospital, over. */
export type Modo = 'slot' | 'galera' | 'ospedale' | 'fine';

/** How the run ended (the simulator's `fine` strings, as codes; texts are in testi.ts). */
export type Fine = 'anno' | 'anno_in_cella' | 'ospedale' | 'galera';

export type Difesa = Avvocato | 'patteggia' | 'spavaldo';

export type EsitoTribunale = 'assolto' | 'messa_alla_prova' | 'ridotta' | 'piena' | 'aggravata' | 'patteggiamento';

/** A choice the engine is waiting for; only the matching command is accepted. */
export type Attesa =
  | {
      tipo: 'TRIBUNALE';
      azione: string;
      /** Requested sentence before rounding (recidivism and probation included). */
      pena_base: number;
      multa: number;
      /** Slots the arrested action takes (applied after the verdict). */
      nslot: number;
    }
  | {
      tipo: 'EVENTO';
      guaio: Guaio;
      opzioni: OpzioneEvento[];
      /** Numbers already drawn when the event appeared (e.g. the wallet's content). */
      valore?: number;
    };

/**
 * The Boss's chat messages (GDD §Tutorial): each is sent once, the first time it applies.
 * `tier_<rep>` announces every rep threshold of TIER_REP that unlocks new actions.
 */
export type MessaggioBoss =
  | 'primo_giorno'
  | 'primo_arresto'
  | 'prima_messa_alla_prova'
  | 'primo_ricovero'
  | 'zero_euro'
  | `tier_${number}`;

/** Terms of the judge's roll other than the d100 and the defence (negative = against you). */
export interface ModificatoriTiro {
  classe: number;
  recidiva: number;
  tutorial: number;
  incensurato: number;
  noto_in_questura: number;
}

export interface OpzioneEvento {
  id: string;
  /** False when the option can't be afforded right now (shown disabled). */
  disponibile: boolean;
}

export interface Stato {
  versione: 1;
  seme: number;
  rng: RngStato;
  /** Separate stream for the conditions of the day, so tomorrow's is known in advance. */
  rng_cond: RngStato;
  nome: string;
  classe: Classe;

  soldi: number;
  energia: number;
  energia_max: number;
  rep: number;
  salute: number;
  salute_max: number;
  /** 0..364; 365 once the year is over. */
  giorno: number;
  /** 1 Mattina, 2 Pomeriggio, 3 Sera, 4 Notte; > 4 while the day is closing. */
  slot: number;
  /** Jail days still to serve after today (the counter drops at the start of each jail day). */
  galera: number;
  /** Hospital days still to spend after today (same convention as `galera`). */
  ospedale: number;
  condanne: number;
  sorvegliato: number;
  attenzionato: number;
  attenzionato_val: number;
  /** Owned shop items (ids), in purchase order. */
  items: string[];
  /** 0 none, 1 monopattino, 2 motorino. */
  veicolo: number;
  /** Action id -> day from which it is available again. */
  cooldown: Record<string, number>;
  /** [day, action id] of the latest actions, oldest first. */
  recenti: [number, string][];
  /** Absolute slot (giorno * 4 + slot) of the last sleep. */
  ultimo_sonno: number;
  cibo_pagato: boolean;
  cibo_gratis: boolean;
  lavori_oggi: number;
  instancabile_mese: number;
  paghetta_em_mese: number;
  notte_pak_sett: number;
  /** Today's condition (calendar, holiday, possibly modified by an event); null = none. */
  cond: Condizione | null;
  /** Tomorrow's condition, already drawn: the night teaser ("Domani: ..."). */
  cond_domani: Condizione | null;

  // Counters (end-of-run summary and the harness table).
  azioni: number;
  arresti: number;
  ricoveri: number;
  g_galera: number;
  g_osp: number;
  guadagni: number;
  /** Money earned per day (one entry per day started). */
  storico_guadagni: number[];
  vivo: boolean;
  fine: Fine;
  /** Action id -> times done, in order of first use. */
  azioni_usate: Record<string, number>;

  // Flow (the simulator keeps these in local variables of its game loop).
  modo: Modo;
  /** Slept at least once today. */
  dormito: boolean;
  attesa: Attesa | null;
  /** Boss messages already sent, in order: the chat history. */
  boss: MessaggioBoss[];
}

export type Comando =
  | { type: 'AZIONE'; id: string; t: number }
  | { type: 'DORMI'; cibo: string }
  | { type: 'DIFESA'; scelta: Difesa }
  | { type: 'SCELTA_EVENTO'; opzione: string }
  | { type: 'COMPRA'; item: string }
  | { type: 'PASSA' };

/** What happened, in order, for the UI to show. Amounts are actual changes. */
export type Esito =
  | { tipo: 'GIORNO'; giorno: number; modo: Modo; condizione: string | null }
  | { tipo: 'PAGHETTA'; soldi: number }
  | { tipo: 'PAGHETTA_EMERGENZA'; soldi: number }
  | { tipo: 'INSTANCABILE' }
  | { tipo: 'GUAIO'; guaio: Guaio; opzione: string | null; risultato: string; soldi: number; rep: number }
  | {
      tipo: 'AZIONE';
      id: string;
      t: number;
      spesa: number;
      risultato: 'ok' | 'gabbio' | 'ospedale';
      /** For gambling: whether the bet paid. */
      vinto: boolean | null;
      soldi: number;
      rep: number;
      virale: boolean;
      veicolo: boolean;
    }
  | { tipo: 'RICOVERO'; giorni: number; danno: number; furto: number }
  | { tipo: 'ARRESTO'; azione: string; sequestro: number; veicolo_sequestrato: boolean }
  | {
      tipo: 'VERDETTO';
      difesa: Difesa;
      /** d100 rolled, and the total with every modifier; null when plea-bargaining. */
      dado: number | null;
      tiro: number | null;
      esito: EsitoTribunale;
      pena: number;
      giorni_multa: number;
      soldi: number;
      rep: number;
    }
  | { tipo: 'SONNO'; cibo: string; costo: number; energia: number }
  | { tipo: 'PASSA' }
  | { tipo: 'COMPRA'; item: string; prezzo: number }
  | { tipo: 'USCITA'; da: 'galera' | 'ospedale' }
  | { tipo: 'FINE'; fine: Fine; punti: number }
  | { tipo: 'BOSS'; id: MessaggioBoss }
  | { tipo: 'RIFIUTATO'; motivo: string };

export interface Risultato {
  stato: Stato;
  esiti: Esito[];
}
