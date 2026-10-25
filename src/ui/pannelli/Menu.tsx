// Menu: export/import the save (playtest), back to the title, abandon the run.

import { TESTI } from '../../data/testi';
import type { Stato } from '../../engine';
import { esporta, scegliFile } from '../../save/exportImport';
import { nuovoSalvataggio } from '../../save/SaveAdapter';
import { Foglio } from '../componenti/Foglio';
import { useGioco } from '../gioco/contesto';

export function PannelloMenu({ s }: { s: Stato }) {
  const { ui, invia, salvataggi } = useGioco();
  const M = TESTI.menu;
  const chiudi = () => invia({ tipo: 'PANNELLO', pannello: null });
  return (
    <Foglio titolo={M.titolo} onChiudi={chiudi}>
      <div className="flex flex-col gap-2.5 pb-2">
        <button type="button" className="bottone-secondario text-left" onClick={() => esporta(nuovoSalvataggio(s, ui.meta))}>
          💾 {M.esporta}
        </button>
        <button
          type="button"
          className="bottone-secondario text-left"
          onClick={async () => {
            const sv = await scegliFile();
            if (!sv) return window.alert(TESTI.inizio.importaErrore);
            salvataggi.salva(sv);
            invia({ tipo: 'CARICA', salvataggio: sv });
          }}
        >
          📂 {M.importa}
        </button>
        <button type="button" className="bottone-secondario text-left" onClick={() => invia({ tipo: 'VAI_A', schermo: 'inizio' })}>
          🏠 {M.esci}
        </button>
        <button
          type="button"
          className="bottone mt-2 border border-rischio-alto/60 text-left text-rischio-alto"
          onClick={() => {
            if (!window.confirm(M.abbandonaConferma)) return;
            salvataggi.cancella();
            invia({ tipo: 'CHIUDI_PARTITA' });
          }}
        >
          🏳️ {M.abbandona}
        </button>
      </div>
    </Foglio>
  );
}
