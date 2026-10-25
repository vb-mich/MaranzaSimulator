// Calendar of the run: day 0 is DATA_INIZIO (1 May), like `Stato.data` in the simulator.

import { C } from '../data/gameData';

export interface Data {
  anno: number;
  mese: number; // 1..12
  giorno: number; // 1..31
  /** Python `date.weekday()`: Monday = 0 ... Sunday = 6. */
  settimana: number;
  /** Python `date.isocalendar()[1]`. */
  settimanaIso: number;
}

const [A0, M0, G0] = C.DATA_INIZIO.split('-').map(Number) as [number, number, number];
const INIZIO = Date.UTC(A0, M0 - 1, G0);
const GIORNO_MS = 86_400_000;

function settimanaIso(t: number): number {
  // The ISO week belongs to the year of its Thursday.
  const d = new Date(t);
  const dow = (d.getUTCDay() + 6) % 7;
  const giovedi = t + (3 - dow) * GIORNO_MS;
  const annoGiovedi = new Date(giovedi).getUTCFullYear();
  const primoGennaio = Date.UTC(annoGiovedi, 0, 1);
  return Math.floor((giovedi - primoGennaio) / GIORNO_MS / 7) + 1;
}

export function dataDelGiorno(giorno: number): Data {
  const t = INIZIO + giorno * GIORNO_MS;
  const d = new Date(t);
  return {
    anno: d.getUTCFullYear(),
    mese: d.getUTCMonth() + 1,
    giorno: d.getUTCDate(),
    settimana: (d.getUTCDay() + 6) % 7,
    settimanaIso: settimanaIso(t),
  };
}
