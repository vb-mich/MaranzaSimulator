import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { C } from '../../data/gameData';
import { punti, type Comando } from '../../engine';
import { localStorageAdapter } from '../../save/localStorageAdapter';
import { nuovoSalvataggio, type SaveAdapter } from '../../save/SaveAdapter';
import { riduttore, statoIniziale, type AzioneUi, type StatoUi } from './statoUi';

interface ValoreGioco {
  ui: StatoUi;
  invia: (a: AzioneUi) => void;
  comando: (c: Comando) => void;
  salvataggi: SaveAdapter;
}

const Contesto = createContext<ValoreGioco | null>(null);

const DURATA_TOAST = 3200;
const DURATA_TOAST_BOSS = 6000;

export function GiocoProvider({ children, salvataggi = localStorageAdapter }: { children: ReactNode; salvataggi?: SaveAdapter }) {
  const [ui, invia] = useReducer(riduttore, salvataggi, (s) => statoIniziale(s.carica()));

  // autosave after every command (and every UI change worth keeping)
  useEffect(() => {
    if (ui.partita) salvataggi.salva(nuovoSalvataggio(ui.partita, ui.meta));
  }, [ui.partita, ui.meta, salvataggi]);

  // a finished run goes into the local leaderboard once
  useEffect(() => {
    const p = ui.partita;
    if (!p || p.modo !== 'fine' || ui.meta.inClassifica) return;
    salvataggi.aggiungiAClassifica({
      nome: p.nome,
      classe: p.classe,
      punti: punti(p),
      fine: p.fine,
      giorni: Math.min(p.giorno, C.GIORNI),
      data: new Date().toISOString(),
    });
    invia({ tipo: 'IN_CLASSIFICA' });
  }, [ui.partita, ui.meta.inClassifica, salvataggi]);

  // toasts go away on their own
  useEffect(() => {
    const timer = ui.toast.map((t) =>
      setTimeout(() => invia({ tipo: 'TOGLI_TOAST', id: t.id }), t.boss ? DURATA_TOAST_BOSS : DURATA_TOAST),
    );
    return () => timer.forEach(clearTimeout);
  }, [ui.toast]);

  const comando = useCallback((c: Comando) => invia({ tipo: 'COMANDO', comando: c }), []);
  const valore = useMemo(() => ({ ui, invia, comando, salvataggi }), [ui, comando, salvataggi]);
  return <Contesto.Provider value={valore}>{children}</Contesto.Provider>;
}

export function useGioco(): ValoreGioco {
  const v = useContext(Contesto);
  if (!v) throw new Error('useGioco fuori da GiocoProvider');
  return v;
}

/** The game in progress (screens that only exist during a game). */
export function usePartita() {
  const v = useGioco();
  if (!v.ui.partita) throw new Error('nessuna partita in corso');
  return { ...v, s: v.ui.partita };
}
