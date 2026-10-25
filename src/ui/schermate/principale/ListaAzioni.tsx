// The actions available now: risk dot, energy bolts, €/€€/€€€, a three-notch investment slider
// where it applies, and every number behind the (?).

import { useState } from 'react';
import { C, type Azione } from '../../../data/gameData';
import { TESTI } from '../../../data/testi';
import {
  bottinoAtteso,
  bottinoIntervallo,
  modificatoriRischio,
  noia,
  penaRichiesta,
  puoInvestire,
  repChill,
  repTiktok,
  rifiuto,
  rischi,
  spesa,
  zonaCalda,
  type Stato,
} from '../../../engine';
import { arte } from '../../arte';
import { Immagine } from '../../componenti/Immagine';
import { Info, Riga } from '../../componenti/Info';
import { euro, giorni, giorniPena, numero, segno } from '../../formato';
import { useGioco } from '../../gioco/contesto';
import { gruppo, percentuale, quoteAzzardo, rigaModificatore, vistaAzione, type Gruppo } from '../../vista';

const TACCHE = C.UI_SLIDER_TACCHE as [number, string][];
const TACCA_DEFAULT = TACCHE[0]![0];
const ORDINE_GRUPPI: Gruppo[] = ['legale', 'azzardo', 'reati'];

export const COLORE_FASCIA: Record<string, string> = {
  basso: 'text-rischio-basso',
  medio: 'text-rischio-medio',
  alto: 'text-rischio-alto',
  estremo: 'text-rischio-estremo',
};

export function Pallino({ fascia, conNome = false }: { fascia: string; conNome?: boolean }) {
  const r = TESTI.rischio[fascia] ?? TESTI.rischio.basso!;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap" title={r.nome}>
      <span aria-hidden>{r.icona}</span>
      {conNome ? <span className={`font-bold ${COLORE_FASCIA[fascia] ?? ''}`}>{r.nome}</span> : <span className="sr-only">{r.nome}</span>}
    </span>
  );
}

export function Fulmini({ n }: { n: number }) {
  return (
    <span className="whitespace-nowrap text-ciano" aria-label={`${TESTI.principale.energiaCosto} ${n}`}>
      {'⚡'.repeat(n)}
    </span>
  );
}

export function ListaAzioni({ s, azioni }: { s: Stato; azioni: Azione[] }) {
  const [aperta, setAperta] = useState<string | null>(null);
  const [tacche, setTacche] = useState<Record<string, number>>({});
  const gruppi = ORDINE_GRUPPI.map((g) => [g, azioni.filter((a) => gruppo(a) === g)] as const).filter(([, l]) => l.length);
  return (
    <div className="flex flex-col gap-4">
      {gruppi.map(([g, lista]) => (
        <section key={g}>
          <h3 className="mb-1.5 px-1 text-xs font-extrabold tracking-[0.15em] text-white/50 uppercase">{TESTI.gruppi[g]}</h3>
          <ul className="flex flex-col gap-2">
            {lista.map((a) => (
              <RigaAzione
                key={a.id}
                s={s}
                a={a}
                aperta={aperta === a.id}
                onApri={() => setAperta(aperta === a.id ? null : a.id)}
                t={tacche[a.id] ?? TACCA_DEFAULT}
                setT={(t) => setTacche({ ...tacche, [a.id]: t })}
              />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function RigaAzione({
  s,
  a,
  aperta,
  onApri,
  t,
  setT,
}: {
  s: Stato;
  a: Azione;
  aperta: boolean;
  onApri: () => void;
  t: number;
  setT: (t: number) => void;
}) {
  const { comando } = useGioco();
  const v = vistaAzione(s, a, t);
  const testo = TESTI.azioni[a.id];
  const cmd = { type: 'AZIONE', id: a.id, t } as const;
  const no = rifiuto(s, cmd);
  return (
    <li data-azione={a.id} className={`overflow-hidden rounded-2xl border transition ${aperta ? 'border-rosa/70 bg-notte-800' : 'border-white/10 bg-notte-900/80'}`}>
      <div className="flex items-center gap-3 p-2 pr-3">
        <button type="button" className="flex min-w-0 flex-1 items-center gap-3 text-left" onClick={onApri} aria-expanded={aperta}>
          <Immagine src={arte('azioni', a.id)} nome={a.id} cover={false} className="size-12 shrink-0 rounded-xl bg-notte-700/60" />
          <span className="min-w-0 flex-1">
            <span className="block leading-tight font-extrabold">{testo?.nome ?? a.nome}</span>
            <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-sm">
              <Pallino fascia={v.fascia} conNome />
              <Fulmini n={v.fulmini} />
              {v.simboli && <span className="font-black text-sole">{v.simboli}</span>}
              {v.azzardo && <span aria-hidden>🎲</span>}
              {v.trasferta && <span className="text-xs text-white/60">🚶 {TESTI.principale.trasferta}</span>}
            </span>
          </span>
        </button>
        <Info titolo={testo?.nome ?? a.nome}>
          <NumeriAzione s={s} a={a} t={t} />
        </Info>
      </div>
      {aperta && (
        <div className="anim-entra-su border-t border-white/10 px-3 pt-2 pb-3">
          <p className="text-sm text-white/75">{testo?.desc}</p>
          {v.trasferta && <p className="mt-1 text-xs text-white/55">{TESTI.principale.trasfertaSpiega}</p>}
          {puoInvestire(a) && <Tacche s={s} a={a} t={t} setT={setT} />}
          <button type="button" className="bottone-primario mt-3 w-full text-lg" disabled={no !== null} onClick={() => comando(cmd)}>
            {TESTI.principale.vai}
            {v.spesa > 0 && <span className="ml-2 text-sm font-bold opacity-85">· {euro(v.spesa)}</span>}
          </button>
          {no && <p className="mt-1 text-center text-xs text-rischio-alto">{no}</p>}
        </div>
      )}
    </li>
  );
}

function Tacche({ s, a, t, setT }: { s: Stato; a: Azione; t: number; setT: (t: number) => void }) {
  return (
    <div className="mt-2">
      <div className="mb-1 flex items-center gap-2">
        <span className="flex-1 text-xs font-extrabold tracking-wider text-ciano uppercase">{TESTI.principale.tacche}</span>
        <Info titolo={TESTI.principale.tacche}>
          <p className="mb-1.5 text-white/75">{TESTI.principale.tacchaSpiega}</p>
          <table className="w-full text-xs tabular-nums">
            <thead className="text-white/60">
              <tr>
                <th className="text-left font-semibold" />
                <th className="text-right font-semibold">€</th>
                <th className="text-right font-semibold">{TESTI.principale.gabbio}</th>
                <th className="text-right font-semibold">{TESTI.principale.ospedale}</th>
                <th className="text-right font-semibold">{TESTI.principale.bottino}</th>
              </tr>
            </thead>
            <tbody>
              {TACCHE.map(([tt, nome]) => {
                const [g, o] = rischi(s, a, tt);
                const b = bottinoAtteso(s, a, tt);
                return (
                  <tr key={tt} className={tt === t ? 'font-bold text-white' : ''}>
                    <td>{nome}</td>
                    <td className="text-right">{euro(spesa(a, tt))}</td>
                    <td className="text-right">{percentuale(g)}</td>
                    <td className="text-right">{percentuale(o)}</td>
                    <td className="text-right">{b > 0 ? euro(b) : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Info>
      </div>
      <div className="grid grid-cols-3 gap-1.5" role="radiogroup" aria-label={TESTI.principale.tacche}>
        {TACCHE.map(([tt, nome]) => {
          const costo = spesa(a, tt);
          const ok = costo <= s.soldi;
          const v = vistaAzione(s, a, tt);
          return (
            <button
              key={tt}
              type="button"
              role="radio"
              aria-checked={tt === t}
              disabled={!ok}
              onClick={() => setT(tt)}
              className={`rounded-xl border px-1 py-2 text-center text-xs leading-tight font-bold transition disabled:opacity-35 ${tt === t ? 'border-rosa bg-rosa/25 text-white' : 'border-white/15 bg-notte-900 text-white/80'}`}
            >
              <span className="block">{nome}</span>
              <span className={`block text-sm font-black ${ok ? 'text-sole' : 'line-through'}`}>{euro(costo)}</span>
              <span className="mt-0.5 block">
                <Pallino fascia={v.fascia} /> {v.simboli ?? ''}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/** Everything behind the (?) of an action (GDD §Interfaccia, "Bottone azione"). */
export function NumeriAzione({ s, a, t }: { s: Stato; a: Azione; t: number }) {
  const P = TESTI.principale;
  const v = vistaAzione(s, a, t);
  const intervallo = bottinoIntervallo(s, a, t);
  const quote = quoteAzzardo(s, a);
  const { voci } = modificatoriRischio(s, a, t);
  const pena = penaRichiesta(s, a);
  const rischiosa = v.gabbio > 0 || v.ospedale > 0;
  const rep = a.speciale === 'chill' ? repChill(s, a) : a.speciale === 'tiktok' ? repTiktok(s, a) : a.rep;
  const annoia = noia(s, a.id);
  const zc = zonaCalda(s, a.id);
  return (
    <div>
      <Riga etichetta={P.gabbio} valore={percentuale(v.gabbio)} forte />
      <Riga etichetta={P.ospedale} valore={percentuale(v.ospedale)} forte />
      {intervallo && (
        <Riga etichetta={P.bottino} valore={intervallo[0] === intervallo[1] ? euro(intervallo[0]) : `${euro(intervallo[0])} – ${euro(intervallo[1])}`} />
      )}
      {quote && (
        <Riga etichetta={P.vincita} valore={P.quota(percentuale(quote.p), numero(quote.x, 1))} />
      )}
      {rep !== 0 && <Riga etichetta={P.rep} valore={segno(rep, 1)} />}
      {annoia < 1 && rep > 0 && <Riga etichetta={P.noia} valore={`×${numero(annoia, 3)}`} />}
      {zc < 1 && <Riga etichetta={P.zonaCalda} valore={`×${numero(zc, 2)}`} />}
      <Riga etichetta={P.energiaCosto} valore={Math.round(v.energia)} />
      {rischiosa && (
        <>
          <Riga etichetta={P.pena} valore={giorni(giorniPena(pena.giorni))} />
          {pena.multa > 0 && <Riga etichetta={P.multa} valore={euro(pena.multa)} />}
        </>
      )}
      {voci.length > 0 && (
        <div className="mt-1.5 border-t border-white/10 pt-1.5">
          <div className="mb-0.5 text-xs font-bold text-white/60">{P.modificatori}</div>
          {voci.map((x, i) => {
            const r = rigaModificatore(x, s);
            return <Riga key={i} etichetta={r.fonte} valore={r.effetto} />;
          })}
        </div>
      )}
    </div>
  );
}
