// Neighbourhood court: requested sentence and fine, five defences with their price.
// Behind the (?): the bonus of each defence, today's modifiers and the table of outcomes.

import { C } from '../../data/gameData';
import { TESTI, nomeAzione } from '../../data/testi';
import { difese, modificatoriTiro, rifiuto, type Stato } from '../../engine';
import { arte, ritratto } from '../arte';
import { Immagine } from '../componenti/Immagine';
import { Info, Riga } from '../componenti/Info';
import { euro, giorni, giorniPena, numero, segno } from '../formato';
import { useGioco } from '../gioco/contesto';
import { Testata } from './principale/Testata';

export function Tribunale({ s }: { s: Stato }) {
  const { comando } = useGioco();
  const att = s.attesa;
  if (att?.tipo !== 'TRIBUNALE') return null;
  const T = TESTI.tribunale;
  const mod = modificatoriTiro(s);
  const voci = Object.entries(mod).filter(([, v]) => v !== 0);
  const S = C.TRIBUNALE_SOGLIE;
  return (
    <main data-schermo="tribunale" className="mx-auto flex min-h-dvh max-w-md flex-col">
      <Testata s={s} />
      <section className="relative overflow-hidden">
        <Immagine src={arte('luoghi', 'tribunale')} nome="tribunale" className="absolute inset-0 size-full opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-notte-950/30 to-notte-950" />
        <div className="relative flex flex-col items-center gap-2 px-4 pt-4 pb-3 text-center">
          <h1 className="titolo-neon text-3xl font-black uppercase italic">{T.titolo}</h1>
          <Immagine src={ritratto('giudice')?.src ?? null} nome="giudice" className="aspect-square w-36 rounded-2xl ring-2 ring-white/20" />
          <p className="text-sm font-bold text-white/80">{T.imputato(nomeAzione(att.azione))}</p>
          <div className="flex gap-3">
            <div className="pannello px-4 py-2">
              <div className="text-xs font-extrabold tracking-wider text-white/60 uppercase">{T.pena}</div>
              <div className="text-2xl font-black text-rischio-alto">{giorni(giorniPena(att.pena_base))}</div>
            </div>
            <div className="pannello px-4 py-2">
              <div className="text-xs font-extrabold tracking-wider text-white/60 uppercase">{T.multa}</div>
              <div className="text-2xl font-black text-sole">{att.multa > 0 ? euro(att.multa) : T.nessunaMulta}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-8">
        <div className="mb-2 flex items-center gap-2">
          <h2 className="flex-1 text-lg font-black">{T.scegli}</h2>
          <Info titolo={T.tiro}>
            <p className="mb-1 text-white/75">d100 + {T.bonus.toLowerCase()}</p>
            {difese(s).map((d) => (
              <Riga key={d.id} etichetta={TESTI.difese[d.id]} valore={d.bonus === null ? T.garantito : segno(d.bonus, 0)} />
            ))}
            <p className="mt-0.5 text-xs text-white/60">{TESTI.difese.spavaldo}: {T.spavaldoRep(C.SPAVALDO_REP)}</p>
            {voci.length > 0 && (
              <div className="mt-1.5 border-t border-white/10 pt-1.5">
                <div className="mb-0.5 text-xs font-bold text-white/60">{T.modificatori}</div>
                {voci.map(([k, v]) => (
                  <Riga key={k} etichetta={TESTI.modificatoriTiro[k] ?? k} valore={segno(v, 1)} />
                ))}
              </div>
            )}
            <div className="mt-1.5 border-t border-white/10 pt-1.5 text-xs">
              <div className="mb-0.5 font-bold text-white/60">{T.esiti}</div>
              <Riga etichetta={TESTI.verdetti.assolto!.titolo} valore={`≥ ${S.assolto}`} />
              <Riga etichetta={TESTI.verdetti.messa_alla_prova!.titolo} valore={`${S.messa_alla_prova}–${S.assolto - 1}`} />
              <Riga etichetta={`${TESTI.verdetti.ridotta!.titolo} (×${numero(C.TRIBUNALE_MULT.ridotta, 2)})`} valore={`${S.ridotta}–${S.messa_alla_prova - 1}`} />
              <Riga etichetta={`${TESTI.verdetti.piena!.titolo} (×${numero(C.TRIBUNALE_MULT.piena, 2)})`} valore={`${S.piena}–${S.ridotta - 1}`} />
              <Riga etichetta={`${TESTI.verdetti.aggravata!.titolo} (×${numero(C.TRIBUNALE_MULT.aggravata, 2)})`} valore={`< ${S.piena}`} />
              <Riga etichetta={`${TESTI.difese.patteggia} (×${numero(C.TRIBUNALE_MULT.patteggiamento, 2)})`} valore="—" />
            </div>
          </Info>
        </div>
        <div className="flex flex-col gap-2">
          {difese(s).map((d) => {
            const cmd = { type: 'DIFESA', scelta: d.id } as const;
            const ok = d.disponibile && rifiuto(s, cmd) === null;
            const nota = d.id === 'patteggia' ? T.garantito : d.id === 'spavaldo' ? T.spavaldo : null;
            return (
              <button
                key={d.id}
                type="button"
                disabled={!ok}
                onClick={() => comando(cmd)}
                className="flex items-center gap-3 rounded-2xl border border-white/15 bg-notte-800 px-4 py-3 text-left transition active:scale-[0.98] disabled:opacity-40"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold">{TESTI.difese[d.id]}</span>
                  {nota && <span className="block text-xs text-white/60">{nota}</span>}
                  {!d.disponibile && <span className="block text-xs text-rischio-alto">{T.nonPuoi}</span>}
                </span>
                <span className={`text-lg font-black ${d.disponibile ? 'text-sole' : 'text-white/50 line-through'}`}>{d.costo > 0 ? euro(d.costo) : T.gratis}</span>
              </button>
            );
          })}
        </div>
      </section>
    </main>
  );
}
