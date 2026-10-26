// End of the run: MARANZA POINTS (abbreviated, the formula behind the (?)), summary, new run.

import { C } from '../../data/gameData';
import { TESTI, nomeAzione } from '../../data/testi';
import { patrimonio, punti, type Stato } from '../../engine';
import { arte } from '../arte';
import { ListaClassifica } from '../componenti/Classifica';
import { Immagine } from '../componenti/Immagine';
import { Info, Riga } from '../componenti/Info';
import { abbrevia, euro, numero } from '../formato';
import { useGioco } from '../gioco/contesto';

const IMMAGINE_FINE: Record<string, string> = {
  anno: 'fine-vittoria',
  anno_in_cella: 'fine-galera',
  galera: 'fine-galera',
  ospedale: 'fine-ospedale',
};

export function Fine({ s }: { s: Stato }) {
  const { invia, salvataggi } = useGioco();
  const F = TESTI.fine;
  const t = F.titoli[s.fine]!;
  const p = punti(s);
  const preferita = Object.entries(s.azioni_usate).sort((a, b) => b[1] - a[1])[0];
  const finita = s.giorno < C.GIORNI || s.fine === 'galera' || s.fine === 'ospedale';
  return (
    <main data-schermo="fine" className="mx-auto flex min-h-dvh max-w-md flex-col gap-4 px-4 pt-6 pb-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <Immagine src={arte('ui', IMMAGINE_FINE[s.fine] ?? 'fine-vittoria')} nome={s.fine} className="anim-galleggia aspect-square w-48 rounded-3xl" cover={false} />
        <h1 className="titolo-neon text-3xl font-black uppercase italic">{t.titolo}</h1>
        <p className="text-white/75">{t.testo}</p>
        <div className="pannello w-full p-4">
          <div className="flex items-center justify-center gap-2 text-xs font-black tracking-[0.2em] text-ciano uppercase">
            {F.punti}
            <Info titolo={F.punti}>
              <p>{F.puntiFormula}</p>
              <Riga etichetta={TESTI.hud.patrimonio} valore={euro(patrimonio(s))} />
              <Riga etichetta={TESTI.hud.rep} valore={`${numero(s.rep, 1)}%`} />
              {finita && s.fine !== 'anno' && s.fine !== 'anno_in_cella' && <p className="mt-1 text-xs text-white/70">{F.puntiPenalita(Math.min(s.giorno, C.GIORNI))}</p>}
              <Riga etichetta={F.punti} valore={numero(p, 0)} forte />
            </Info>
          </div>
          <div className="text-6xl font-black text-sole tabular-nums">{abbrevia(p)}</div>
        </div>
      </div>
      <section className="pannello p-3">
        <h2 className="mb-1 text-sm font-black tracking-wider text-white/60 uppercase">{F.riepilogo}</h2>
        <Riga etichetta={F.giorniCella} valore={s.g_galera} />
        <Riga etichetta={F.giorniOspedale} valore={s.g_osp} />
        <Riga etichetta={F.arresti} valore={s.arresti} />
        <Riga etichetta={F.ricoveri} valore={s.ricoveri} />
        <Riga etichetta={F.bottino} valore={euro(s.guadagni)} />
        <Riga etichetta={F.preferita} valore={preferita ? nomeAzione(preferita[0]) : F.nessuna} />
      </section>
      <section className="pannello p-3">
        <h2 className="mb-2 text-sm font-black tracking-wider text-white/60 uppercase">🏆 {F.classifica}</h2>
        <ListaClassifica evidenzia={(v) => v.nome === s.nome && v.classe === s.classe && v.punti === p && v.fine === s.fine} />
      </section>
      <button
        type="button"
        className="bottone-primario anim-pulsa w-full text-xl"
        onClick={() => {
          salvataggi.cancella();
          invia({ tipo: 'CHIUDI_PARTITA' });
          invia({ tipo: 'VAI_A', schermo: 'crea' });
        }}
      >
        {F.nuovaRun}
      </button>
    </main>
  );
}
