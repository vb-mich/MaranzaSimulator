// A trouble/opportunity with a choice (GDD §Guai): 1–2 options, disabled when you can't afford one.

import { TESTI } from '../../data/testi';
import type { Stato } from '../../engine';
import { useGioco } from '../gioco/contesto';
import { Testata } from './principale/Testata';
import { Scena } from './principale/Scena';

export function Evento({ s }: { s: Stato }) {
  const { comando } = useGioco();
  const att = s.attesa;
  if (att?.tipo !== 'EVENTO') return null;
  const t = TESTI.guai[att.guaio];
  return (
    <main data-schermo="evento" className="mx-auto flex min-h-dvh max-w-md flex-col">
      <Testata s={s} />
      <Scena s={s} />
      <section className="anim-entra-su mx-3 mt-3 mb-8 flex flex-col items-center gap-3 rounded-3xl border-2 border-sole/60 bg-notte-800 p-5 text-center shadow-[0_0_40px_rgb(255_211_25/0.2)]">
        <div className="text-xs font-black tracking-[0.2em] text-sole uppercase">{TESTI.guaio.etichetta}</div>
        <div className="grid size-20 place-items-center rounded-full bg-white/10 text-5xl">{t?.icona ?? '❗'}</div>
        <h1 className="text-2xl leading-tight font-black">{t?.titolo ?? att.guaio}</h1>
        <p className="text-white/80">{t?.testo}</p>
        <div className="mt-1 flex w-full flex-col gap-2">
          {att.opzioni.map((o, i) => (
            <button
              key={o.id}
              type="button"
              disabled={!o.disponibile}
              onClick={() => comando({ type: 'SCELTA_EVENTO', opzione: o.id })}
              className={`${i === 0 ? 'bottone-primario' : 'bottone-secondario'} w-full text-lg`}
            >
              {t?.opzioni?.[o.id] ?? o.id}
              {!o.disponibile && <span className="block text-xs font-semibold">{TESTI.guaio.nonPuoi}</span>}
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
