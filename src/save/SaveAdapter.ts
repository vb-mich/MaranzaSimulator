// Persistence behind an interface: localStorage today, a server (Supabase) later, same UI.

import type { Stato } from '../engine';

/** What the UI keeps besides the game state. */
export interface MetaUi {
  /** Boss messages already read (length of the chat the player has seen). */
  bossLetti: number;
  /** The run is already in the local leaderboard. */
  inClassifica: boolean;
}

export interface Salvataggio {
  formato: 'maranza-simulator';
  versione: 1;
  salvato: string;
  stato: Stato;
  ui: MetaUi;
}

export interface VoceClassifica {
  nome: string;
  classe: string;
  punti: number;
  fine: string;
  giorni: number;
  data: string;
}

export interface SaveAdapter {
  carica(): Salvataggio | null;
  salva(s: Salvataggio): void;
  cancella(): void;
  classifica(): VoceClassifica[];
  aggiungiAClassifica(v: VoceClassifica): void;
}

export function nuovoSalvataggio(stato: Stato, ui: MetaUi): Salvataggio {
  return { formato: 'maranza-simulator', versione: 1, salvato: new Date().toISOString(), stato, ui };
}

/** Checks a parsed object looks like a save of this game (import, old localStorage data). */
export function validaSalvataggio(x: unknown): Salvataggio | null {
  if (!x || typeof x !== 'object') return null;
  const s = x as Partial<Salvataggio>;
  if (s.formato !== 'maranza-simulator' || s.versione !== 1) return null;
  const st = s.stato as Partial<Stato> | undefined;
  if (!st || st.versione !== 1 || typeof st.giorno !== 'number' || !st.rng || !st.classe) return null;
  const ui: MetaUi = {
    bossLetti: typeof s.ui?.bossLetti === 'number' ? s.ui.bossLetti : 0,
    inClassifica: s.ui?.inClassifica === true,
  };
  // fields added to the state after a save was written get their starting value
  const stato = { ...(st as Stato), boss: Array.isArray(st.boss) ? st.boss : [] };
  return { ...(s as Salvataggio), stato, ui };
}

/** Parses an exported save file; null if it isn't one. */
export function leggiImport(testo: string): Salvataggio | null {
  try {
    return validaSalvataggio(JSON.parse(testo));
  } catch {
    return null;
  }
}
