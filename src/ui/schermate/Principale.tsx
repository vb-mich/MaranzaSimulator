// Main screen of a normal day: header, character with HUD, what you can do now, bottom bar.

import { AZIONI } from '../../data/gameData';
import { TESTI } from '../../data/testi';
import { azioniDisponibili, deveDormire, puoDormire, rifiuto, type Stato } from '../../engine';
import { useGioco } from '../gioco/contesto';
import { PannelloChat } from '../pannelli/Chat';
import { PannelloDormi, SceltaCibo } from '../pannelli/Dormi';
import { PannelloMenu } from '../pannelli/Menu';
import { PannelloNegozio } from '../pannelli/Negozio';
import { fermoPerRamadan } from '../vista';
import { ListaAzioni } from './principale/ListaAzioni';
import { Scena } from './principale/Scena';
import { Testata } from './principale/Testata';

export function Principale({ s }: { s: Stato }) {
  const { ui, invia } = useGioco();
  const apri = (p: NonNullable<typeof ui.pannello>) => invia({ tipo: 'PANNELLO', pannello: p });
  return (
    <main data-schermo="principale" className="mx-auto flex min-h-dvh max-w-md flex-col">
      <Testata s={s} onMenu={() => apri('menu')} />
      <Scena s={s} />
      <div className="flex-1 px-3 pt-3 pb-28">
        <Cosa s={s} />
      </div>
      <BarraFondo s={s} />
      {ui.pannello === 'dormi' && <PannelloDormi s={s} />}
      {ui.pannello === 'negozio' && <PannelloNegozio s={s} />}
      {ui.pannello === 'chat' && <PannelloChat s={s} />}
      {ui.pannello === 'menu' && <PannelloMenu s={s} />}
    </main>
  );
}

/** What the player can do in this slot: sleep at night, the list of actions, or let time pass. */
function Cosa({ s }: { s: Stato }) {
  const { comando, invia } = useGioco();
  const P = TESTI.principale;
  if (deveDormire(s))
    return (
      <section className="pannello anim-entra-su p-3">
        <h2 className="mb-2 text-lg font-black">🌙 {P.notte}</h2>
        <SceltaCibo s={s} />
      </section>
    );
  const azioni = azioniDisponibili(s);
  const bloccate = AZIONI.length - azioni.length;
  const sonno = puoDormire(s);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="text-lg font-black">{P.cosaFai}</h2>
        {bloccate > 0 && azioni.length > 0 && <span className="text-xs text-white/40">{P.bloccate(bloccate)}</span>}
      </div>
      {azioni.length === 0 && (
        <div className="pannello p-4 text-center">
          <p className="text-white/75">{fermoPerRamadan(s) ? P.ramadan : sonno ? P.nienteDaFareDormi : P.nienteDaFare}</p>
          {sonno && (
            <button type="button" className="bottone-primario mt-3 w-full" onClick={() => invia({ tipo: 'PANNELLO', pannello: 'dormi' })}>
              😴 {TESTI.dormi.titolo}
            </button>
          )}
        </div>
      )}
      {azioni.length > 0 && <ListaAzioni key={`${s.giorno}-${s.slot}`} s={s} azioni={azioni} />}
      {rifiuto(s, { type: 'PASSA' }) === null && (
        <button type="button" className="bottone-secondario w-full" onClick={() => comando({ type: 'PASSA' })}>
          ⏳ {P.aspetta}
        </button>
      )}
    </div>
  );
}

function BarraFondo({ s }: { s: Stato }) {
  const { ui, invia } = useGioco();
  const nonLetti = Math.max(0, s.boss.length - ui.meta.bossLetti);
  const apri = (p: NonNullable<typeof ui.pannello>) => invia({ tipo: 'PANNELLO', pannello: p });
  const sonno = puoDormire(s) && !deveDormire(s);
  const voce = 'relative flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-extrabold tracking-wide uppercase transition active:scale-95 disabled:opacity-35';
  return (
    <nav className="pb-sicuro fixed inset-x-0 bottom-0 z-40 mx-auto flex max-w-md gap-1 border-t border-white/10 bg-notte-950/95 px-2 pt-1.5 backdrop-blur">
      <button type="button" className={voce} disabled={!sonno} onClick={() => apri('dormi')}>
        <span className="text-2xl">😴</span>
        {TESTI.dormi.titolo}
      </button>
      <button type="button" className={voce} onClick={() => apri('negozio')}>
        <span className="text-2xl">🛍️</span>
        {TESTI.negozio.titolo}
      </button>
      <button type="button" className={voce} onClick={() => apri('chat')}>
        <span className="text-2xl">👑</span>
        {TESTI.chat.bottone}
        {nonLetti > 0 && (
          <span className="absolute top-0 right-[calc(50%-1.6rem)] grid size-5 place-items-center rounded-full bg-rosa text-[11px] text-white">{nonLetti}</span>
        )}
      </button>
    </nav>
  );
}
