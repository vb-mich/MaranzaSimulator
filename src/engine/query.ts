// Read-only views of a game state, for the UI and the harness. None of these changes `stato`.

import { AZIONI, C, azione, haSpesa, type Azione } from '../data/gameData';
import { dataDelGiorno, type Data } from './calendario';
import { Motore, spesaDi } from './motore';
import type { Stato } from './tipi';

const leggi = (s: Stato) => new Motore(s);
const az = (a: Azione | string) => (typeof a === 'string' ? azione(a) : a);

export function data(s: Stato): Data {
  return dataDelGiorno(Math.min(s.giorno, C.GIORNI - 1));
}

/** Can the action be started now (slot, rep, cooldown, condition, vehicle, energy, money...)? */
export function disponibile(s: Stato, a: Azione | string): boolean {
  return leggi(s).disponibile(az(a));
}

/** Actions available now, in data order. */
export function azioniDisponibili(s: Stato): Azione[] {
  if (s.modo === 'ospedale' || s.modo === 'fine' || s.attesa) return [];
  if (s.modo === 'slot' && leggi(s).deveDormire()) return [];
  const m = leggi(s);
  return AZIONI.filter((a) => m.disponibile(a));
}

/** Investment in euro at slider position t (0 / 0.5 / 1). */
export function spesa(a: Azione | string, t: number): number {
  return spesaDi(az(a), t);
}

export function puoInvestire(a: Azione | string): boolean {
  return haSpesa(az(a));
}

/** [gabbio, ospedale] probabilities with every modifier active today. */
export function rischi(s: Stato, a: Azione | string, t: number): [number, number] {
  return leggi(s).rischi(az(a), t);
}

/** Expected loot at slider position t, with rep, hot zone and today's condition (no class bonus). */
export function bottinoAtteso(s: Stato, a: Azione | string, t: number): number {
  const x = az(a);
  return leggi(s).bottino_atteso(x, t, spesaDi(x, t));
}

export function moltiplicatoreBottino(s: Stato, a: Azione | string): number {
  return leggi(s).moltiplicatore_bottino(az(a));
}

export function costoEnergia(s: Stato, a: Azione | string): number {
  return leggi(s).costo_energia(az(a));
}

export function slotNecessari(s: Stato, a: Azione | string): number {
  return leggi(s).slot_necessari(az(a));
}

export function zonaCalda(s: Stato, id: string): number {
  return leggi(s).zona_calda(id);
}

export function noia(s: Stato, id: string): number {
  return leggi(s).noia(id);
}

export function repChill(s: Stato, a: Azione | string): number {
  return leggi(s).rep_chill(az(a));
}

export function repTiktok(s: Stato, a: Azione | string): number {
  return leggi(s).rep_tiktok(az(a));
}

export function energiaMaxOggi(s: Stato): number {
  return leggi(s).energia_max_oggi();
}

export function puoDormire(s: Stato): boolean {
  return s.modo === 'slot' && !s.attesa && leggi(s).puo_dormire();
}

/** Night without having slept: the only way forward is DORMI. */
export function deveDormire(s: Stato): boolean {
  return !s.attesa && leggi(s).deveDormire();
}

export function puoComprare(s: Stato, id: string): boolean {
  return s.modo !== 'fine' && !s.attesa && leggi(s).puoComprare(id);
}

export function dripTot(s: Stato): number {
  return leggi(s).drip_tot();
}

export function dripMax(s: Stato): number {
  return leggi(s).drip_max();
}

export function patrimonio(s: Stato): number {
  return leggi(s).patrimonio();
}

/** MARANZA POINTS (with the game-over penalty if the run ended early). */
export function punti(s: Stato): number {
  return leggi(s).punti();
}

// --- labels driven by thresholds in game-data.json (GDD §Interfaccia) -------------------------

/** Rep grade id: the first GRADI_REP entry whose threshold the rep has reached, from the top. */
export function gradoRep(rep: number): string {
  let g = C.GRADI_REP[0]![1] as string;
  for (const [soglia, nome] of C.GRADI_REP) if (rep >= (soglia as number)) g = nome as string;
  return g;
}

/**
 * Risk band of a probability (gabbio + ospedale) from RISCHIO_COLORI. GDD §Interfaccia: basso below the
 * first threshold, then each band up to and including its threshold (medio 8–15%, alto 16–30%).
 */
export function fasciaRischio(p: number): string {
  const [primo, ...altri] = C.RISCHIO_COLORI;
  if (p < (primo![0] as number)) return primo![1] as string;
  for (const [soglia, nome] of altri) if (p <= (soglia as number)) return nome as string;
  return C.RISCHIO_COLORI[C.RISCHIO_COLORI.length - 1]![1] as string;
}

/** Energy cost as 1-4 lightning bolts. */
export function fulmini(energia: number): number {
  for (const [soglia, n] of C.UI_FULMINI) if (energia <= soglia!) return n!;
  return C.UI_FULMINI[C.UI_FULMINI.length - 1]![1]!;
}

/** Expected loot as €, €€, €€€. */
export function simboliBottino(euro: number): string {
  for (const [soglia, simboli] of C.UI_BOTTINO_SIMBOLI) if (euro < (soglia as number)) return simboli as string;
  return C.UI_BOTTINO_SIMBOLI[C.UI_BOTTINO_SIMBOLI.length - 1]![1] as string;
}
