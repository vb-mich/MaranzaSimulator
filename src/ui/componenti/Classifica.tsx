// Local leaderboard (localStorage): points always abbreviated, the full number behind the (?).

import { TESTI } from '../../data/testi';
import type { Classe } from '../../data/gameData';
import type { VoceClassifica } from '../../save/SaveAdapter';
import { abbrevia, numero } from '../formato';
import { useGioco } from '../gioco/contesto';
import { Foglio } from './Foglio';
import { Info } from './Info';

/** `evidenzia` picks the run to highlight (the first entry it matches). */
export function ListaClassifica({ evidenzia }: { evidenzia?: (v: VoceClassifica) => boolean }) {
  const { salvataggi } = useGioco();
  const lista = salvataggi.classifica();
  const mia = evidenzia ? lista.findIndex(evidenzia) : -1;
  if (lista.length === 0) return <p className="py-6 text-center text-white/60">{TESTI.fine.classificaVuota}</p>;
  return (
    <ol className="flex flex-col gap-1.5">
      {lista.map((v, i) => (
        <li
          key={`${v.data}-${i}`}
          className={`flex items-center gap-3 rounded-xl px-3 py-2 ${i === mia ? 'bg-rosa/25 ring-1 ring-rosa' : 'bg-white/5'}`}
        >
          <span className="w-6 text-center font-black text-sole">{i + 1}</span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-bold">{v.nome}</span>
            <span className="block text-xs text-white/60">
              {TESTI.classi[v.classe as Classe]?.nome ?? v.classe} · {TESTI.fine.titoli[v.fine]?.titolo ?? v.fine}
            </span>
          </span>
          <span className="text-lg font-black text-ciano tabular-nums">{abbrevia(v.punti)}</span>
          <Info titolo={TESTI.fine.punti}>{numero(v.punti, 0)}</Info>
        </li>
      ))}
    </ol>
  );
}

export function Classifica({ onChiudi }: { onChiudi: () => void }) {
  return (
    <Foglio titolo={`🏆 ${TESTI.fine.classifica}`} onChiudi={onChiudi}>
      <ListaClassifica />
    </Foglio>
  );
}
