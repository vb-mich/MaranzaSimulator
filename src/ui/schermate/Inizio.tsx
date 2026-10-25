// Title screen: the splash (the title is inside the image), New game / Continue, import, leaderboard.

import { useState } from 'react';
import { TESTI } from '../../data/testi';
import { data } from '../../engine';
import { scegliFile } from '../../save/exportImport';
import { arte } from '../arte';
import { Immagine } from '../componenti/Immagine';
import { Classifica } from '../componenti/Classifica';
import { dataBreve } from '../formato';
import { useGioco } from '../gioco/contesto';

export function Inizio() {
  const { ui, invia, salvataggi } = useGioco();
  const [errore, setErrore] = useState<string | null>(null);
  const [classifica, setClassifica] = useState(false);
  const p = ui.partita;

  const nuova = () => {
    if (p && p.modo !== 'fine' && !window.confirm(TESTI.inizio.sovrascrivi)) return;
    invia({ tipo: 'VAI_A', schermo: 'crea' });
  };

  const importa = async () => {
    const s = await scegliFile();
    if (!s) return setErrore(TESTI.inizio.importaErrore);
    salvataggi.salva(s);
    invia({ tipo: 'CARICA', salvataggio: s });
  };

  return (
    <main data-schermo="inizio" className="mx-auto flex min-h-dvh max-w-md flex-col">
      <div className="relative">
        <Immagine src={arte('ui', 'splash')} nome="splash" alt={TESTI.titolo} className="aspect-[4/3] w-full" />
        {!arte('ui', 'splash') && (
          <h1 className="titolo-neon absolute inset-x-0 top-[18%] text-center text-5xl leading-none font-black tracking-tight uppercase italic">
            {TESTI.titolo}
          </h1>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-notte-950 to-transparent" />
      </div>

      <div className="flex flex-1 flex-col gap-3 px-5 pt-2 pb-6">
        <div className="flex-1" />
        {p && (
          <button type="button" className="bottone-primario anim-pulsa text-xl" onClick={() => invia({ tipo: 'VAI_A', schermo: 'gioco' })}>
            {TESTI.inizio.continua}
            <span className="block text-xs font-semibold opacity-85">{TESTI.inizio.continuaDi(p.nome, dataBreve(data(p)))}</span>
          </button>
        )}
        <button type="button" className={p ? 'bottone-secondario text-lg' : 'bottone-primario anim-pulsa text-xl'} onClick={nuova}>
          {TESTI.inizio.nuova}
        </button>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" className="bottone-secondario text-sm" onClick={() => setClassifica(true)}>
            🏆 {TESTI.inizio.classifica}
          </button>
          <button type="button" className="bottone-secondario text-sm" onClick={importa}>
            📂 {TESTI.inizio.importa}
          </button>
        </div>
        {errore && <p className="text-center text-sm text-rischio-alto">{errore}</p>}
        <div className="flex-1" />
        <p className="pt-4 text-center text-[11px] leading-snug text-white/45">
          {TESTI.inizio.disclaimer}
          <br />
          {TESTI.titolo} · {TESTI.inizio.versione}
        </p>
      </div>
      {classifica && <Classifica onChiudi={() => setClassifica(false)} />}
    </main>
  );
}
