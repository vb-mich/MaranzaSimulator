// Shop and wardrobe: no time spent; drip shows on the character.

import { DATI } from '../../data/gameData';
import { TESTI, nomeOggetto } from '../../data/testi';
import { puoComprare, type Stato } from '../../engine';
import { arte } from '../arte';
import { Foglio } from '../componenti/Foglio';
import { Immagine } from '../componenti/Immagine';
import { Info, Riga } from '../componenti/Info';
import { Personaggio } from '../componenti/Personaggio';
import { euro } from '../formato';
import { useGioco } from '../gioco/contesto';
import { effettoOggetto } from '../vista';

export function PannelloNegozio({ s }: { s: Stato }) {
  const { invia, comando } = useGioco();
  const N = TESTI.negozio;
  const oggetti = Object.entries(DATI.negozio);
  return (
    <Foglio titolo={`🛍️ ${N.titolo}`} onChiudi={() => invia({ tipo: 'PANNELLO', pannello: null })} alto>
      <p className="mb-3 text-sm text-white/65">{N.sottotitolo}</p>
      <section className="mb-4 flex items-center gap-3 rounded-2xl bg-white/5 p-2">
        <Personaggio classe={s.classe} items={s.items} salute={s.salute} className="w-20 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-xs font-extrabold tracking-wider text-ciano uppercase">{N.inventario}</div>
          {s.items.length === 0 ? (
            <p className="text-sm text-white/60">{N.vuoto}</p>
          ) : (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {s.items.map((i) => (
                <span key={i} className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold">
                  {TESTI.oggetti[i]?.icona} {nomeOggetto(i)}
                </span>
              ))}
            </div>
          )}
          <div className="mt-1 text-lg font-black text-sole">{euro(s.soldi)}</div>
        </div>
      </section>
      <ul className="flex flex-col gap-2">
        {oggetti.map(([id, o]) => {
          const tuo = s.items.includes(id);
          const superato = !tuo && o.tipo === 'veicolo' && 'livello' in o && o.livello <= s.veicolo;
          const ok = puoComprare(s, id);
          const t = TESTI.oggetti[id];
          return (
            <li key={id} className={`flex items-center gap-3 rounded-2xl border p-2 pr-3 ${tuo ? 'border-ciano/40 bg-ciano/10' : 'border-white/10 bg-notte-800'}`}>
              <Immagine src={arte('oggetti', id)} nome={id} cover={false} className="size-14 shrink-0 rounded-xl bg-notte-700/60 p-1" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="truncate leading-tight font-extrabold">{nomeOggetto(id)}</span>
                </div>
                <div className="text-[11px] font-bold tracking-wider text-white/45 uppercase">{TESTI.tipiOggetto[o.tipo]}</div>
                <p className="text-xs leading-snug text-white/70">{t?.desc}</p>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Info titolo={nomeOggetto(id)}>
                  {effettoOggetto(id).map((r) => (
                    <p key={r}>{r}</p>
                  ))}
                  {o.valore > 0 && <Riga etichetta={N.valore} valore={euro(o.valore * DATI.costanti.PATRIMONIO_DRIP)} />}
                </Info>
                {tuo ? (
                  <span className="text-xs font-bold text-ciano">{N.tuo}</span>
                ) : superato ? (
                  <span className="text-xs font-bold text-white/50">{N.meglio}</span>
                ) : (
                  <button type="button" disabled={!ok} onClick={() => comando({ type: 'COMPRA', item: id })} className="bottone-primario px-3 py-1.5 text-sm">
                    {euro(o.prezzo)}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Foglio>
  );
}
