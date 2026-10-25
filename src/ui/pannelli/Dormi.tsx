// Sleep with a choice of food: price, how much energy it brings back, whether it's good for you.

import { C, DATI } from '../../data/gameData';
import { TESTI, nomeCibo } from '../../data/testi';
import { anteprimaSonno, rifiuto, type Stato } from '../../engine';
import { Foglio } from '../componenti/Foglio';
import { Info, Riga } from '../componenti/Info';
import { euro, numero, pct } from '../formato';
import { useGioco } from '../gioco/contesto';

export function SceltaCibo({ s }: { s: Stato }) {
  const { comando } = useGioco();
  const D = TESTI.dormi;
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <p className="flex-1 text-sm font-bold text-white/80">{D.scegli}</p>
        <Info titolo={D.titolo}>
          {DATI.cibo.map((c) => (
            <Riga
              key={c.nome}
              etichetta={nomeCibo(c.nome)}
              valore={`${pct(s.classe === 'Balcanico' ? C.RECUPERO_BALCANICO : c.recupero, 0)} · ${TESTI.hud.salute.toLowerCase()} ${c.salute > 0 ? '+' : ''}${numero(c.salute, 0)}`}
            />
          ))}
          <p className="mt-1.5 text-xs text-white/60">{s.classe === 'Balcanico' ? TESTI.hud.energiaBalcanico : TESTI.hud.energiaCibo}</p>
        </Info>
      </div>
      {s.cibo_pagato && <p className="mb-2 text-xs text-ciano">{D.giaPagato}</p>}
      {!s.cibo_pagato && s.cibo_gratis && <p className="mb-2 text-xs text-ciano">{D.ciboGratis}</p>}
      <div className="grid grid-cols-2 gap-2">
        {DATI.cibo.map((c) => {
          const cmd = { type: 'DORMI', cibo: c.nome } as const;
          const no = rifiuto(s, cmd);
          const dopo = no ? null : anteprimaSonno(s, c.nome);
          const costo = dopo?.costo ?? c.costo;
          const pieno = dopo ? dopo.energia / s.energia_max : 0;
          return (
            <button
              key={c.nome}
              type="button"
              disabled={no !== null}
              onClick={() => comando(cmd)}
              className="flex flex-col items-start gap-1 rounded-2xl border border-white/15 bg-notte-800 p-3 text-left transition active:scale-95 disabled:opacity-40"
            >
              <span className="text-2xl" aria-hidden>
                {TESTI.cibo[c.nome]?.icona}
              </span>
              <span className="leading-tight font-extrabold">{nomeCibo(c.nome)}</span>
              <span className="text-sm font-black text-sole">{costo > 0 ? euro(costo) : D.gratis}</span>
              <span className="flex w-full items-center gap-1.5 text-xs">
                <span aria-hidden>⚡</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                  <span className="block h-full rounded-full bg-ciano" style={{ width: `${Math.min(1, pieno) * 100}%` }} />
                </span>
              </span>
              {!s.cibo_pagato && c.salute !== 0 && (
                <span className={`text-xs font-bold ${c.salute > 0 ? 'text-rischio-basso' : 'text-rischio-alto'}`}>
                  💉 {c.salute > 0 ? D.saluteSu : D.saluteGiu}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function PannelloDormi({ s }: { s: Stato }) {
  const { invia } = useGioco();
  return (
    <Foglio titolo={`😴 ${TESTI.dormi.titolo}`} onChiudi={() => invia({ tipo: 'PANNELLO', pannello: null })}>
      <SceltaCibo s={s} />
    </Foglio>
  );
}
