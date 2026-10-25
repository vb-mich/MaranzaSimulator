// Character creation: a name and one of the six classes. Nothing else: in the piazza within 30 seconds.

import { useMemo, useState } from 'react';
import { CLASSI, DATI, type Classe } from '../../data/gameData';
import { TESTI } from '../../data/testi';
import { ritratto } from '../arte';
import { Immagine } from '../componenti/Immagine';
import { Info } from '../componenti/Info';
import { useGioco } from '../gioco/contesto';

const MAX_NOME = 16;

const casuale = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)]!;

/** Stat in words: the class's third among the six (lowest, middle, highest), so no threshold is retyped. */
function parola(valore: number, tutti: number[], parole: readonly string[]): string {
  const ordinati = [...tutti].sort((a, b) => a - b);
  const rango = ordinati.indexOf(valore) / (ordinati.length - 1);
  return parole[Math.min(parole.length - 1, Math.floor(rango * parole.length))]!;
}

export function Crea() {
  const { invia } = useGioco();
  const [nome, setNome] = useState<string>(() => casuale(TESTI.crea.nomiCasuali));
  const [classe, setClasse] = useState<Classe | null>(null);
  const soldi = useMemo(() => CLASSI.map((c) => DATI.classi[c].soldi), []);
  const energia = useMemo(() => CLASSI.map((c) => DATI.classi[c].energia), []);
  const pronto = classe !== null && nome.trim().length > 0;

  const via = () => {
    if (!pronto) return;
    const seme = crypto.getRandomValues(new Uint32Array(1))[0]!;
    invia({ tipo: 'NUOVA', nome: nome.trim(), classe, seme });
  };

  const t = classe ? TESTI.classi[classe] : null;
  const dati = classe ? DATI.classi[classe] : null;

  return (
    <main data-schermo="crea" className="mx-auto flex min-h-dvh max-w-md flex-col">
      <header className="pt-sicuro flex items-center gap-2 px-4 pb-2">
        <button type="button" className="grid size-10 place-items-center rounded-full bg-white/10 text-lg" aria-label={TESTI.crea.indietro} onClick={() => invia({ tipo: 'VAI_A', schermo: 'inizio' })}>
          ←
        </button>
        <h1 className="titolo-neon text-2xl font-black italic">{TESTI.crea.titolo}</h1>
      </header>

      <div className="flex flex-1 flex-col gap-4 px-4 pb-28">
        <label className="block">
          <span className="mb-1 block text-xs font-extrabold tracking-wider text-ciano uppercase">{TESTI.crea.nome}</span>
          <div className="flex gap-2">
            <input
              value={nome}
              maxLength={MAX_NOME}
              onChange={(e) => setNome(e.target.value)}
              placeholder={TESTI.crea.nomeSegnaposto}
              className="min-w-0 flex-1 rounded-xl border border-white/15 bg-notte-800 px-3 py-2.5 text-lg font-bold outline-none focus:border-rosa"
              autoComplete="off"
              enterKeyHint="done"
            />
            <button type="button" className="rounded-xl border border-white/15 bg-notte-800 px-3 text-xl" aria-label={TESTI.crea.dado} onClick={() => setNome(casuale(TESTI.crea.nomiCasuali))}>
              🎲
            </button>
          </div>
        </label>

        <div>
          <span className="mb-1 block text-xs font-extrabold tracking-wider text-ciano uppercase">{TESTI.crea.scegli}</span>
          <div className="grid grid-cols-3 gap-2">
            {CLASSI.map((c) => {
              const r = ritratto(c);
              const scelto = c === classe;
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={scelto}
                  onClick={() => setClasse(c)}
                  className={`overflow-hidden rounded-xl border-2 bg-gradient-to-b from-notte-700 to-notte-900 transition active:scale-95 ${scelto ? 'border-rosa shadow-[0_0_16px_rgb(255_62_165/0.6)]' : 'border-white/10'}`}
                >
                  <Immagine src={r?.src ?? null} nome={c} className="aspect-square w-full object-[50%_6%]" />
                  <span className={`block py-1 text-xs font-black ${scelto ? 'bg-rosa text-white' : 'text-white/85'}`}>{TESTI.classi[c].nome}</span>
                </button>
              );
            })}
          </div>
        </div>

        {t && dati && classe && (
          <section key={classe} className="pannello anim-entra-su p-3">
            <div className="flex items-center gap-2">
              <h2 className="flex-1 text-xl font-black text-sole">{t.nome}</h2>
              <Info titolo={t.nome}>
                <p className="mb-1.5">{TESTI.crea.numeri(dati.soldi, dati.energia)}</p>
                <ul className="list-disc space-y-1 pl-4">
                  {t.dettaglio.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </Info>
            </div>
            <p className="mt-1 text-sm text-white/75 italic">{t.motto}</p>
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-bold">
              <span className="rounded-full bg-white/10 px-2 py-1">
                💶 {TESTI.crea.soldi}: {parola(dati.soldi, soldi, TESTI.crea.paroleSoldi)}
              </span>
              <span className="rounded-full bg-white/10 px-2 py-1">
                ⚡ {TESTI.crea.energia}: {parola(dati.energia, energia, TESTI.crea.paroleEnergia)}
              </span>
            </div>
            <ul className="mt-2 space-y-1 text-sm">
              <li>✅ {t.abilita[0]}</li>
              <li>⚠️ {t.abilita[1]}</li>
            </ul>
          </section>
        )}
      </div>

      <div className="pb-sicuro fixed inset-x-0 bottom-0 mx-auto max-w-md bg-gradient-to-t from-notte-950 via-notte-950/95 to-transparent px-4 pt-6">
        <button type="button" className="bottone-primario w-full text-xl" disabled={!pronto} onClick={via}>
          {TESTI.crea.via}
        </button>
      </div>
    </main>
  );
}
