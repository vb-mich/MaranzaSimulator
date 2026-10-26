// A day in jail or in hospital: the counter, a diary line per day, and the days going by on their
// own (a tap pauses them). The Zingaro in jail can still make his one riskless call to the cuggino,
// so for him the days wait for a tap.

import { useEffect, useState } from 'react';
import { TESTI, scegliRiga } from '../../data/testi';
import { azioniDisponibili, dataDelGiorno, type Stato } from '../../engine';
import { arte } from '../arte';
import { Immagine } from '../componenti/Immagine';
import { Personaggio } from '../componenti/Personaggio';
import { dataBreve, giorni } from '../formato';
import { useGioco } from '../gioco/contesto';
import { ListaAzioni } from './principale/ListaAzioni';
import { Testata } from './principale/Testata';

/** Time each day stays on screen while the days go by on their own. */
const DURATA_GIORNO = 1500;
/** Diary lines shown, newest first. */
const RIGHE_DIARIO = 4;
/** Step through the diary lines: coprime with their counts, so no line repeats on consecutive days. */
const PASSO_DIARIO = 5;

export function Cella({ s }: { s: Stato }) {
  const { ui, comando } = useGioco();
  const K = TESTI.cella;
  const galera = s.modo === 'galera';
  const restanti = (galera ? s.galera : s.ospedale) + 1;
  const azioni = galera ? azioniDisponibili(s) : [];
  // the diary starts the day this screen opens
  const [primo] = useState(s.giorno);
  const [pausa, setPausa] = useState(false);
  const automatico = azioni.length === 0;
  const scorre = automatico && !pausa && ui.pannello === null;

  useEffect(() => {
    if (!scorre) return;
    const t = setTimeout(() => comando({ type: 'PASSA' }), DURATA_GIORNO);
    return () => clearTimeout(t);
  }, [scorre, s, comando]);

  const righe = galera ? K.diarioGalera : K.diarioOspedale;
  const diario: { giorno: number; riga: string }[] = [];
  for (let g = s.giorno; g >= Math.max(primo, s.giorno - RIGHE_DIARIO + 1); g--) diario.push({ giorno: g, riga: scegliRiga(righe, g * PASSO_DIARIO + s.seme) });

  return (
    <main data-schermo="cella" className="mx-auto flex min-h-dvh max-w-md flex-col">
      <Testata s={s} />
      <section className="relative overflow-hidden">
        <Immagine src={arte('luoghi', galera ? 'galera' : 'ospedale')} nome={galera ? 'galera' : 'ospedale'} className="absolute inset-0 size-full opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-b from-notte-950/20 to-notte-950" />
        <div className="relative flex items-end gap-3 px-4 pt-4 pb-3">
          <Personaggio classe={s.classe} items={s.items} salute={s.salute} vivo className="w-28 shrink-0 grayscale-[35%]" />
          <div className="pannello mb-2 flex-1 p-3 text-center">
            <div className="text-xs font-black tracking-[0.2em] text-white/60 uppercase">{galera ? K.galera : K.ospedale}</div>
            <div className="text-3xl font-black text-sole">{restanti > 1 ? K.giorniRestanti(giorni(restanti)) : K.ultimoGiorno}</div>
          </div>
        </div>
      </section>

      <div className="flex flex-1 flex-col gap-3 px-3 pt-2 pb-8">
        {automatico && (
          <button
            type="button"
            aria-pressed={pausa}
            onClick={() => setPausa((p) => !p)}
            className="relative overflow-hidden rounded-2xl border border-white/15 bg-notte-800 px-4 py-2.5 text-sm font-extrabold"
          >
            {scorre && <span key={s.giorno} className="absolute inset-y-0 left-0 w-full origin-left bg-ciano/20" style={{ animation: `riempi ${DURATA_GIORNO}ms linear both` }} aria-hidden />}
            <span className="relative">{pausa ? `▶️ ${K.fermo}` : `⏸️ ${K.tocca}`}</span>
          </button>
        )}

        <section className="pannello p-3">
          <h2 className="mb-1.5 text-xs font-black tracking-wider text-ciano uppercase">📓 {K.diario}</h2>
          <ol className="flex flex-col gap-1.5">
            {diario.map((d, i) => (
              <li key={d.giorno} className={`flex gap-2 text-sm ${i === 0 ? 'anim-entra-su text-white' : 'text-white/55'}`}>
                <span className="w-[5.5rem] shrink-0 pt-0.5 text-xs font-bold whitespace-nowrap text-white/50">{dataBreve(dataDelGiorno(d.giorno))}</span>
                <span className="min-w-0 flex-1">{d.riga}</span>
              </li>
            ))}
          </ol>
        </section>

        {azioni.length > 0 && (
          <section>
            <h2 className="mb-1 px-1 text-lg font-black">📞 {K.cuggino}</h2>
            <p className="mb-2 px-1 text-sm text-white/60">{K.cugginoSpiega}</p>
            <ListaAzioni key={s.giorno} s={s} azioni={azioni} />
          </section>
        )}
        <button type="button" className="bottone-primario w-full text-lg" onClick={() => comando({ type: 'PASSA' })}>
          {K.avanti} →
        </button>
      </div>
    </main>
  );
}
