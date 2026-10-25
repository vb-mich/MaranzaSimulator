// Number and date formatting for the UI (Italian conventions).

import { C } from '../data/gameData';
import { TESTI } from '../data/testi';
import type { Data } from '../engine';

const raggruppa = (intero: string) => intero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/** "1.240 €": whole euro, rounded down (you never have more than it says). */
export function euro(n: number): string {
  const v = Math.floor(n + 1e-9);
  return `${v < 0 ? '−' : ''}${raggruppa(String(Math.abs(v)))} €`;
}

/** "+340 €" / "−50 €" for a change; the cents are kept only below 10 €. */
export function euroDelta(n: number): string {
  const a = Math.abs(n);
  const s = a < 10 && a % 1 !== 0 ? a.toFixed(2).replace('.', ',') : raggruppa(String(Math.round(a)));
  return `${n < 0 ? '−' : '+'}${s} €`;
}

/** Decimal number with an Italian comma, up to `cifre` decimals, no trailing zeros. */
export function numero(n: number, cifre = 1): string {
  const f = 10 ** cifre;
  const r = Math.round(n * f) / f;
  const [i, d] = String(Math.abs(r)).split('.');
  return `${r < 0 ? '−' : ''}${raggruppa(i!)}${d ? ',' + d : ''}`;
}

/** 0.065 -> "6,5%". */
export function pct(p: number, cifre = 1): string {
  return `${numero(p * 100, cifre)}%`;
}

/** Signed number: "+2,5" / "−3". */
export function segno(n: number, cifre = 1): string {
  return `${n >= 0 ? '+' : ''}${numero(n, cifre)}`;
}

/** MARANZA POINTS always abbreviated (GDD §Obiettivo): "870K", "4,6M", "18,2M". */
export function abbrevia(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e9) return `${numero(n / 1e9, 1)}G`;
  if (a >= 1e6) return `${numero(n / 1e6, 1)}M`;
  if (a >= 1e3) return `${Math.round(n / 1e3)}K`;
  return String(Math.round(n));
}

/** "Ven 1 maggio". */
export function dataBreve(d: Data): string {
  return `${TESTI.giorniBrevi[d.settimana]} ${d.giorno} ${TESTI.mesi[d.mese - 1]}`;
}

/** "venerdì 1 maggio". */
export function dataLunga(d: Data): string {
  return `${TESTI.giorni[d.settimana]} ${d.giorno} ${TESTI.mesi[d.mese - 1]}`;
}

/** Days of a requested sentence, rounded like the court rounds them. */
export function giorniPena(n: number): number {
  return Math.max(C.PENA_MIN_GIORNI, Math.floor(n + C.PENA_ARROTONDAMENTO));
}

/** "1 giorno" / "6 giorni". */
export function giorni(n: number): string {
  return n === 1 ? TESTI.unGiorno : TESTI.nGiorni(n);
}
