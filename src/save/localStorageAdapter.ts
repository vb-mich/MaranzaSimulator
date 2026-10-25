import { validaSalvataggio, type Salvataggio, type SaveAdapter, type VoceClassifica } from './SaveAdapter';

const CHIAVE = 'maranza-simulator:partita';
const CHIAVE_CLASSIFICA = 'maranza-simulator:classifica';
const MAX_CLASSIFICA = 20;

/** localStorage can throw (private mode, quota, blocked storage): the game keeps going without it. */
function leggi(chiave: string): unknown {
  try {
    const raw = localStorage.getItem(chiave);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function scrivi(chiave: string, valore: unknown): void {
  try {
    localStorage.setItem(chiave, JSON.stringify(valore));
  } catch {
    // nothing to do: the next command saves again
  }
}

export const localStorageAdapter: SaveAdapter = {
  carica: () => validaSalvataggio(leggi(CHIAVE)),
  salva: (s: Salvataggio) => scrivi(CHIAVE, s),
  cancella: () => {
    try {
      localStorage.removeItem(CHIAVE);
    } catch {
      // ignore
    }
  },
  classifica: () => {
    const v = leggi(CHIAVE_CLASSIFICA);
    return Array.isArray(v) ? (v as VoceClassifica[]) : [];
  },
  aggiungiAClassifica: (voce: VoceClassifica) => {
    const lista = [...localStorageAdapter.classifica(), voce].sort((a, b) => b.punti - a.punti).slice(0, MAX_CLASSIFICA);
    scrivi(CHIAVE_CLASSIFICA, lista);
  },
};
