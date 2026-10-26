// Turns the engine's outcomes into what the UI shows: full-screen cards (one tap each) and toasts.

import { C, azione } from '../../data/gameData';
import { TESTI, nomeCibo, nomeOggetto } from '../../data/testi';
import { costoEnergia, data, rischi, type Comando, type Esito, type MessaggioBoss, type Stato } from '../../engine';
import { dataBreve, euro } from '../formato';

type Di<T extends Esito['tipo']> = Extract<Esito, { tipo: T }>;
export type EsitoAzione = Di<'AZIONE'>;
export type EsitoArresto = Di<'ARRESTO'>;
export type EsitoRicovero = Di<'RICOVERO'>;
export type EsitoVerdetto = Di<'VERDETTO'>;
export type EsitoGuaio = Di<'GUAIO'>;

export type Carta =
  | {
      tipo: 'azione';
      azione: EsitoAzione;
      arresto?: EsitoArresto;
      ricovero?: EsitoRicovero;
      /** [gabbio, ospedale] the action carried, for the (?). */
      rischi: [number, number];
      /** Energy the action took, and the health it gave or took by itself (not the hospital's). */
      energia: number;
      salute: number;
      giorno: number;
    }
  | { tipo: 'verdetto'; verdetto: EsitoVerdetto; azione: string; pena_base: number; multa: number }
  | { tipo: 'guaio'; guaio: EsitoGuaio; ricovero?: EsitoRicovero; giorno: number }
  | { tipo: 'ricovero'; ricovero: EsitoRicovero }
  | { tipo: 'uscita'; da: 'galera' | 'ospedale' }
  | { tipo: 'boss'; id: MessaggioBoss };

export interface Toast {
  id: number;
  icona: string;
  testo: string;
  boss?: boolean;
}

export type NuovoToast = Omit<Toast, 'id'>;

/** Health an action changes by itself (the park), as the engine applies it: within 0..max. */
function saluteAzione(s: Stato, id: string): number {
  const d = azione(id).salute;
  return d ? Math.max(0, Math.min(s.salute_max, s.salute + d)) - s.salute : 0;
}

/**
 * Groups the outcomes of one command. `prima` is the state the command was applied to (the risks
 * and the pending trial come from there), `dopo` the resulting one.
 */
export function smista(esiti: Esito[], prima: Stato | null, comando: Comando | null, dopo: Stato) {
  const carte: Carta[] = [];
  const toast: NuovoToast[] = [];
  const ultimaCarta = () => carte[carte.length - 1];
  const ultimoGiorno = esiti.map((e) => e.tipo).lastIndexOf('GIORNO');

  esiti.forEach((e, i) => {
    switch (e.tipo) {
      case 'AZIONE':
        carte.push({
          tipo: 'azione',
          azione: e,
          rischi: prima ? rischi(prima, e.id, e.t) : [0, 0],
          energia: prima ? costoEnergia(prima, e.id) : 0,
          salute: prima ? saluteAzione(prima, e.id) : 0,
          giorno: prima?.giorno ?? dopo.giorno,
        });
        break;
      case 'ARRESTO': {
        const c = ultimaCarta();
        if (c?.tipo === 'azione') c.arresto = e;
        break;
      }
      case 'RICOVERO': {
        const c = ultimaCarta();
        if ((c?.tipo === 'azione' || c?.tipo === 'guaio') && !c.ricovero) c.ricovero = e;
        else carte.push({ tipo: 'ricovero', ricovero: e });
        break;
      }
      case 'VERDETTO': {
        const att = prima?.attesa;
        carte.push({
          tipo: 'verdetto',
          verdetto: e,
          azione: att?.tipo === 'TRIBUNALE' ? att.azione : '',
          pena_base: att?.tipo === 'TRIBUNALE' ? att.pena_base : 0,
          multa: att?.tipo === 'TRIBUNALE' ? att.multa : 0,
        });
        break;
      }
      case 'GUAIO':
        carte.push({ tipo: 'guaio', guaio: e, giorno: dopo.giorno });
        break;
      case 'USCITA':
        carte.push({ tipo: 'uscita', da: e.da });
        break;
      case 'BOSS':
        // first week: the Boss explains with a card; later only a toast and the chat badge
        if (dopo.giorno < C.TUTORIAL_GIORNI) carte.push({ tipo: 'boss', id: e.id });
        else toast.push({ icona: '👑', testo: TESTI.boss[e.id] ?? '', boss: true });
        break;
      case 'GIORNO':
        // one toast for the last day started, and only for a normal day (the cell has its own screen)
        if (i === ultimoGiorno && prima && dopo.modo === 'slot' && comando?.type !== 'PASSA')
          toast.push({ icona: TESTI.slot[1]!.icona, testo: TESTI.toast.giorno(dataBreve(data(dopo))) });
        break;
      case 'PAGHETTA':
        toast.push({ icona: '💸', testo: TESTI.toast.paghetta(euro(e.soldi)) });
        break;
      case 'PAGHETTA_EMERGENZA':
        toast.push({ icona: '🆘', testo: TESTI.toast.paghettaEmergenza(euro(e.soldi)) });
        break;
      case 'INSTANCABILE':
        toast.push({ icona: '⚡', testo: TESTI.toast.instancabile });
        break;
      case 'SONNO':
        toast.push({ icona: '😴', testo: TESTI.toast.sonno(nomeCibo(e.cibo)) });
        break;
      case 'COMPRA':
        toast.push({ icona: '🛍️', testo: TESTI.toast.compra(nomeOggetto(e.item)) });
        break;
      case 'RIFIUTATO':
        toast.push({ icona: '🚫', testo: TESTI.toast.rifiutato(e.motivo) });
        break;
      case 'PASSA':
      case 'FINE':
        break;
    }
  });
  return { carte, toast };
}
