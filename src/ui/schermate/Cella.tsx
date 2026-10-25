// A day in jail or in hospital: the counter, and one tap per day. The Zingaro in jail can still
// make his one riskless call to the cuggino.

import { TESTI } from '../../data/testi';
import { azioniDisponibili, type Stato } from '../../engine';
import { arte } from '../arte';
import { Immagine } from '../componenti/Immagine';
import { Personaggio } from '../componenti/Personaggio';
import { giorni } from '../formato';
import { useGioco } from '../gioco/contesto';
import { ListaAzioni } from './principale/ListaAzioni';
import { Testata } from './principale/Testata';

export function Cella({ s }: { s: Stato }) {
  const { comando } = useGioco();
  const K = TESTI.cella;
  const galera = s.modo === 'galera';
  const restanti = (galera ? s.galera : s.ospedale) + 1;
  const azioni = galera ? azioniDisponibili(s) : [];
  return (
    <main data-schermo="cella" className="mx-auto flex min-h-dvh max-w-md flex-col">
      <Testata s={s} />
      <section className="relative overflow-hidden">
        <Immagine src={arte('luoghi', galera ? 'galera' : 'ospedale')} nome={galera ? 'galera' : 'ospedale'} className="absolute inset-0 size-full opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-b from-notte-950/20 to-notte-950" />
        <div className="relative flex items-end gap-3 px-4 pt-4 pb-3">
          <Personaggio classe={s.classe} items={s.items} salute={s.salute} className="w-28 shrink-0 grayscale-[35%]" />
          <div className="pannello mb-2 flex-1 p-3 text-center">
            <div className="text-xs font-black tracking-[0.2em] text-white/60 uppercase">{galera ? K.galera : K.ospedale}</div>
            <div className="text-3xl font-black text-sole">{restanti > 1 ? K.giorniRestanti(giorni(restanti)) : K.ultimoGiorno}</div>
          </div>
        </div>
      </section>
      <div className="flex flex-1 flex-col gap-3 px-3 pt-2 pb-8">
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
