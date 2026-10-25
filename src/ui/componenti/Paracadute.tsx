// Error boundary: a crash shows a way out (export the save, reload) instead of a blank page.

import { Component, type ReactNode } from 'react';
import { TESTI } from '../../data/testi';
import { localStorageAdapter } from '../../save/localStorageAdapter';
import { esporta } from '../../save/exportImport';

export class Paracadute extends Component<{ children: ReactNode }, { errore: Error | null }> {
  state = { errore: null as Error | null };

  static getDerivedStateFromError(errore: Error) {
    return { errore };
  }

  render() {
    const e = this.state.errore;
    if (!e) return this.props.children;
    const salvataggio = localStorageAdapter.carica();
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="text-6xl">🫠</div>
        <h1 className="text-2xl font-black">{TESTI.errore.titolo}</h1>
        <p className="text-white/70">{TESTI.errore.testo}</p>
        <pre className="max-h-32 w-full overflow-auto rounded-lg bg-black/40 p-2 text-left text-[11px] text-white/50">{e.message}</pre>
        {salvataggio && (
          <button type="button" className="bottone-secondario w-full" onClick={() => esporta(salvataggio)}>
            💾 {TESTI.menu.esporta}
          </button>
        )}
        <button type="button" className="bottone-primario w-full" onClick={() => location.reload()}>
          {TESTI.errore.ricarica}
        </button>
      </main>
    );
  }
}
