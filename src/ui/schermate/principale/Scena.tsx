// The character in the piazza (location by time of day) with the HUD: money, rep, energy, health.

import { C, DATI, type Cibo } from '../../../data/gameData';
import { TESTI, nomeCibo, nomeOggetto } from '../../../data/testi';
import { energiaMaxOggi, gradoRep, patrimonio, prossimoGrado, type Stato } from '../../../engine';
import { arte } from '../../arte';
import { Barra } from '../../componenti/Barra';
import { Immagine } from '../../componenti/Immagine';
import { Info, Riga } from '../../componenti/Info';
import { Personaggio } from '../../componenti/Personaggio';
import { euro, numero, pct } from '../../formato';
import { prossimoTier, valoriOggetti } from '../../vista';

const LUOGO_PER_SLOT: Record<number, string> = { 1: 'piazza', 2: 'piazza', 3: 'piazza-sera', 4: 'piazza-notte' };

/** Items worn as layers on the portrait; the others are shown as icons next to it. */
const INDOSSATI = new Set(['cappello', 'tuta', 'catena', 'orologio']);

export function luogoDelGiorno(s: Stato): string {
  if (s.modo === 'galera') return 'galera';
  if (s.modo === 'ospedale') return 'ospedale';
  return LUOGO_PER_SLOT[Math.min(s.slot, 4)] ?? 'piazza';
}

export function Scena({ s }: { s: Stato }) {
  const icone = s.items.filter((i) => !INDOSSATI.has(i));
  return (
    <section className="relative overflow-hidden">
      <Immagine src={arte('luoghi', luogoDelGiorno(s))} nome={luogoDelGiorno(s)} className="absolute inset-0 size-full opacity-80" />
      <div className="absolute inset-0 bg-gradient-to-r from-notte-950/10 via-notte-950/30 to-notte-950/85" />
      <div className="relative flex items-end gap-2 px-3 pt-2">
        <div className="relative w-[38%] shrink-0">
          <Personaggio classe={s.classe} items={s.items} salute={s.salute} className="w-full drop-shadow-[0_6px_10px_rgb(0_0_0/0.6)]" />
          {icone.length > 0 && (
            <div className="absolute bottom-1 left-0 flex flex-wrap gap-1">
              {icone.map((i) => (
                <Immagine
                  key={i}
                  src={arte('oggetti', i)}
                  nome={i}
                  alt={nomeOggetto(i)}
                  cover={false}
                  className="size-9 rounded-lg bg-notte-900/70 p-0.5 ring-1 ring-white/20"
                />
              ))}
            </div>
          )}
        </div>
        <Hud s={s} />
      </div>
    </section>
  );
}

function Hud({ s }: { s: Stato }) {
  const grado = gradoRep(s.rep);
  const prossimo = prossimoGrado(s.rep);
  const tier = prossimoTier(s.rep);
  const emaxOggi = energiaMaxOggi(s);
  const oggetti = valoriOggetti(s);
  return (
    <div className="pannello mb-2 flex min-w-0 flex-1 flex-col gap-2.5 p-2.5">
      <div className="flex items-center gap-2">
        <span className="w-6 text-center text-base" aria-hidden>
          💶
        </span>
        <span className="min-w-0 flex-1 truncate text-xl font-black text-sole tabular-nums">{euro(s.soldi)}</span>
        <Info titolo={TESTI.hud.patrimonio}>
          <Riga etichetta={TESTI.hud.contanti} valore={euro(s.soldi)} />
          {oggetti.map((o) => (
            <Riga key={o.id} etichetta={nomeOggetto(o.id)} valore={euro(o.valore)} />
          ))}
          {oggetti.length === 0 && <p className="text-white/60">{TESTI.hud.nienteOggetti}</p>}
          <Riga etichetta={TESTI.hud.patrimonio} valore={euro(patrimonio(s))} forte />
          <p className="mt-1.5 text-xs text-white/60">{TESTI.hud.patrimonioFormula}</p>
        </Info>
      </div>
      <Barra
        nome={TESTI.hud.rep}
        icona="⭐"
        frazione={s.rep / C.REP_MAX}
        colore="var(--color-rosa)"
        etichetta={grado}
        info={
          <Info titolo={TESTI.hud.rep}>
            <p className="font-bold">{TESTI.hud.repValore(`${numero(s.rep, 1)}%`)}</p>
            <p>{prossimo ? TESTI.hud.repProssimo(prossimo.nome, prossimo.soglia) : TESTI.hud.repMassimo}</p>
            {tier && tier.azioni.length > 0 && (
              <p className="mt-1">
                <b>{tier.soglia}%</b> · {TESTI.hud.repTier(tier.azioni.join(', '))}
              </p>
            )}
            <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-white/75">
              <li>{TESTI.hud.repDecade}</li>
              <li>{TESTI.hud.repNoia}</li>
              <li>{TESTI.hud.repDiminuisce}</li>
            </ul>
          </Info>
        }
      />
      <Barra
        nome={TESTI.hud.energia}
        icona="⚡"
        frazione={s.energia / s.energia_max}
        colore="var(--color-ciano)"
        info={
          <Info titolo={TESTI.hud.energia}>
            <p className="font-bold">{TESTI.hud.energiaValore(Math.round(s.energia), Math.round(emaxOggi))}</p>
            {emaxOggi < s.energia_max && <p className="text-sole">{TESTI.hud.energiaMaxRidotta}</p>}
            <p className="mt-1.5">{s.classe === 'Balcanico' ? TESTI.hud.energiaBalcanico : TESTI.hud.energiaCibo}</p>
            {DATI.cibo.map((c: Cibo) => (
              <Riga key={c.nome} etichetta={nomeCibo(c.nome)} valore={`${pct(c.recupero, 0)} · ${euro(c.costo)}`} />
            ))}
          </Info>
        }
      />
      <Barra
        nome={TESTI.hud.salute}
        icona="💉"
        frazione={s.salute / s.salute_max}
        colore={s.salute < C.SALUTE_BASSA_SOGLIA ? 'var(--color-rischio-alto)' : 'var(--color-rischio-basso)'}
        info={
          <Info titolo={TESTI.hud.salute}>
            <ul className="list-disc space-y-0.5 pl-4">
              {TESTI.hud.saluteTesto.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
            {s.salute < C.SALUTE_BASSA_SOGLIA && <p className="mt-1 text-sole">{TESTI.hud.fasciato}</p>}
          </Info>
        }
      />
    </div>
  );
}
