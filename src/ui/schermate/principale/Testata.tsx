// Date, slot and condition of the day; at Night, the teaser of tomorrow. Money and energy sit under the
// slot icons, so they stay in sight while the player scrolls down to the actions.

import { C } from '../../../data/gameData';
import { TESTI } from '../../../data/testi';
import { data, type Stato } from '../../../engine';
import { Info } from '../../componenti/Info';
import { dataBreve, numero } from '../../formato';
import { effettiCondizione, nomeCondizione, teaserCondizione } from '../../vista';

const NOTTE = Object.keys(C.SLOT_NOMI).length;

export function Testata({ s, onMenu }: { s: Stato; onMenu?: () => void }) {
  const slot = TESTI.slot[Math.min(s.slot, NOTTE)]!;
  const c = s.cond;
  const domani = s.slot >= NOTTE && s.modo === 'slot' ? s.cond_domani : null;
  return (
    <header className="pt-sicuro sticky top-0 z-30 border-b border-white/10 bg-notte-950/90 px-3 pb-2 backdrop-blur">
      <div className="flex items-center gap-2">
        <span className="text-2xl" aria-hidden>
          {slot.icona}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <div className="text-base font-black">{dataBreve(data(s))}</div>
          <div className="text-xs font-bold tracking-wider text-ciano uppercase">{slot.nome}</div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {s.modo === 'slot' && (
            <ol className="flex gap-1" aria-label={slot.nome}>
              {Object.keys(C.SLOT_NOMI).map((k) => {
                const n = Number(k);
                const stato = n < s.slot ? 'opacity-25 grayscale' : n === s.slot ? 'bg-white/15 ring-1 ring-ciano' : 'opacity-60';
                return (
                  <li key={k} className={`grid size-7 place-items-center rounded-lg text-sm ${stato}`} title={TESTI.slot[n]!.nome}>
                    {TESTI.slot[n]!.icona}
                  </li>
                );
              })}
            </ol>
          )}
          {/* icons and bare numbers only, no wider than the slot icons, so the date never wraps */}
          <div data-testata-valori className="flex items-center gap-2.5 text-xs leading-none font-black whitespace-nowrap tabular-nums">
            <span className="text-sole">
              <span aria-hidden>💶</span>
              <span className="sr-only">{TESTI.hud.soldi}</span> {numero(Math.floor(s.soldi + 1e-9), 0)}
            </span>
            <span className="text-ciano">
              <span aria-hidden>⚡</span>
              <span className="sr-only">{TESTI.hud.energia}</span> {Math.floor(s.energia + 1e-9)}
            </span>
          </div>
        </div>
        {onMenu && (
          <button type="button" onClick={onMenu} aria-label={TESTI.menu.titolo} className="grid size-10 place-items-center rounded-full bg-white/10 text-xl">
            ☰
          </button>
        )}
      </div>
      <div className="mt-1.5 flex items-center gap-2 text-sm">
        <span className={`min-w-0 flex-1 truncate font-semibold ${c ? 'text-sole' : 'text-white/55'}`}>{nomeCondizione(c)}</span>
        {c && (
          <Info titolo={TESTI.condizioneEffetti.titolo}>
            <ul className="list-disc space-y-0.5 pl-4">
              {effettiCondizione(c).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </Info>
        )}
      </div>
      {domani && (
        <div className="anim-entra-zoom mt-1.5 flex items-center gap-2 rounded-lg border border-rosa/40 bg-rosa/15 px-2 py-1.5 text-sm">
          <span aria-hidden>🔮</span>
          <span className="min-w-0 flex-1 font-bold">{teaserCondizione(domani)}</span>
          <Info titolo={TESTI.condizioneEffetti.domaniTitolo}>
            <ul className="list-disc space-y-0.5 pl-4">
              {effettiCondizione(domani).map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </Info>
        </div>
      )}
    </header>
  );
}
