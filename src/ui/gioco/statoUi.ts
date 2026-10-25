// UI state: which screen, the game in progress, the cards and toasts still to show.
// The reducer stays pure: `applica` is pure, and saving happens in an effect of the provider.

import type { Classe } from '../../data/gameData';
import { applica, nuovaPartita, type Comando, type Stato } from '../../engine';
import type { MetaUi, Salvataggio } from '../../save/SaveAdapter';
import { smista, type Carta, type Toast } from './esiti';

export type Schermo = 'inizio' | 'crea' | 'gioco';
export type Pannello = 'dormi' | 'negozio' | 'chat' | 'menu';

export interface StatoUi {
  schermo: Schermo;
  partita: Stato | null;
  meta: MetaUi;
  carte: Carta[];
  toast: Toast[];
  prossimoToast: number;
  pannello: Pannello | null;
}

export type AzioneUi =
  | { tipo: 'VAI_A'; schermo: Schermo }
  | { tipo: 'NUOVA'; nome: string; classe: Classe; seme: number }
  | { tipo: 'CARICA'; salvataggio: Salvataggio }
  | { tipo: 'COMANDO'; comando: Comando }
  | { tipo: 'CHIUDI_CARTA' }
  | { tipo: 'TOGLI_TOAST'; id: number }
  | { tipo: 'PANNELLO'; pannello: Pannello | null }
  | { tipo: 'CHAT_LETTA' }
  | { tipo: 'IN_CLASSIFICA' }
  | { tipo: 'CHIUDI_PARTITA' };

const META_NUOVA: MetaUi = { bossLetti: 0, inClassifica: false };

export function statoIniziale(salvataggio: Salvataggio | null): StatoUi {
  return {
    schermo: 'inizio',
    partita: salvataggio?.stato ?? null,
    meta: salvataggio?.ui ?? META_NUOVA,
    carte: [],
    toast: [],
    prossimoToast: 1,
    pannello: null,
  };
}

function conToast(st: StatoUi, nuovi: Omit<Toast, 'id'>[]): Pick<StatoUi, 'toast' | 'prossimoToast'> {
  let id = st.prossimoToast;
  const toast = [...st.toast, ...nuovi.map((t) => ({ ...t, id: id++ }))].slice(-2);
  return { toast, prossimoToast: id };
}

export function riduttore(st: StatoUi, a: AzioneUi): StatoUi {
  switch (a.tipo) {
    case 'VAI_A':
      return { ...st, schermo: a.schermo, pannello: null };
    case 'NUOVA': {
      const r = nuovaPartita(a.nome, a.classe, a.seme);
      const { carte, toast } = smista(r.esiti, null, null, r.stato);
      return {
        ...st,
        ...conToast({ ...st, toast: [] }, toast),
        schermo: 'gioco',
        partita: r.stato,
        meta: META_NUOVA,
        carte,
        pannello: null,
      };
    }
    case 'CARICA':
      return { ...statoIniziale(a.salvataggio), schermo: 'gioco' };
    case 'COMANDO': {
      if (!st.partita) return st;
      const prima = st.partita;
      const r = applica(prima, a.comando);
      const { carte, toast } = smista(r.esiti, prima, a.comando, r.stato);
      // a command closes the panel it came from, except buying (you may buy more)
      const pannello = a.comando.type === 'COMPRA' ? st.pannello : null;
      return { ...st, ...conToast(st, toast), partita: r.stato, carte: [...st.carte, ...carte], pannello };
    }
    case 'CHIUDI_CARTA':
      return { ...st, carte: st.carte.slice(1) };
    case 'TOGLI_TOAST':
      return { ...st, toast: st.toast.filter((t) => t.id !== a.id) };
    case 'PANNELLO':
      return { ...st, pannello: a.pannello };
    case 'CHAT_LETTA':
      return st.partita ? { ...st, meta: { ...st.meta, bossLetti: st.partita.boss.length } } : st;
    case 'IN_CLASSIFICA':
      return { ...st, meta: { ...st.meta, inClassifica: true } };
    case 'CHIUDI_PARTITA':
      return { ...st, partita: null, meta: META_NUOVA, carte: [], toast: [], pannello: null, schermo: 'inizio' };
  }
}
