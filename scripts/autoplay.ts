// Harness: plays full games with the simulator's automatic players and prints the same table as
// sim/results/batch_finale.txt. With the same RNG as Python the output must be identical.
//
//   npm run autoplay                     # 200 runs per row, compares with batch_finale.txt
//   npm run autoplay -- --runs 20        # quicker, no comparison
//   npm run autoplay -- --classe Zingaro --policy casuale --seme 3   # one game, with a log

import { readFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { fileURLToPath } from 'node:url';
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { AZIONI, CLASSI, type Classe } from '../src/data/gameData';
import {
  applica,
  deveDormire,
  nuovaPartita,
  patrimonio,
  puoComprare,
  puoDormire,
  punti,
  type Comando,
  type Esito,
  type Risultato,
  type Fine,
  type Stato,
} from '../src/engine';
import { POLICIES, type Policy } from './policy';
import { destra, fixed, migliaia, sinistra } from './pyformat';

const ORDINE_POLICY = ['prudente', 'bilanciato', 'yolo', 'casuale'];
/** The simulator's `fine` strings, as printed in its table. */
const FINE_SIM: Record<Fine, string> = {
  anno: '365 giorni',
  anno_in_cella: '365 giorni (finiti in cella)',
  ospedale: "piantato all'ospedale",
  galera: 'marcito in galera',
};

export interface Riga {
  classe: string;
  policy: string;
  vivo: boolean;
  fine: string;
  giorno: number;
  soldi: number;
  patrimonio: number;
  rep: number;
  punti: number;
  azioni: number;
  arresti: number;
  galera: number;
  osp: number;
  condanne: number;
  azioni_usate: Record<string, number>;
}

/** Optional hooks to watch a game: every outcome, and every command with the state before it. */
export interface Spia {
  esito?: (e: Esito) => void;
  passo?: (prima: Stato, comando: Comando, dopo: Risultato) => void;
}

function invia(s: Stato, c: Comando, log?: Spia): Stato {
  const r = applica(s, c);
  const rif = r.esiti.find((e) => e.tipo === 'RIFIUTATO');
  if (rif) throw new Error(`comando rifiutato ${JSON.stringify(c)}: ${rif.tipo === 'RIFIUTATO' ? rif.motivo : ''}`);
  log?.passo?.(s, c, r);
  if (log?.esito) r.esiti.forEach(log.esito);
  return r.stato;
}

function compra(s: Stato, pol: Policy, log?: Spia): Stato {
  for (const item of pol.acquisti(s)) if (puoComprare(s, item)) s = invia(s, { type: 'COMPRA', item }, log);
  return s;
}

/** Python `Gioco.gioca`, driven through commands like the UI would. */
export function giocaPartita(classe: Classe, nomePolicy: string, seme: number, log?: Spia): Stato {
  const pol = POLICIES[nomePolicy]!;
  const inizio = nuovaPartita(nomePolicy, classe, seme);
  if (log?.esito) inizio.esiti.forEach(log.esito);
  let s = inizio.stato;
  while (s.modo !== 'fine') {
    const att = s.attesa;
    if (att?.tipo === 'EVENTO') {
      s = invia(s, { type: 'SCELTA_EVENTO', opzione: sceltaEvento(s, pol, att.guaio) }, log);
    } else if (att?.tipo === 'TRIBUNALE') {
      s = invia(s, { type: 'DIFESA', scelta: pol.difesa(s, att.pena_base) }, log);
    } else if (s.modo === 'ospedale') {
      s = invia(s, { type: 'PASSA' }, log);
    } else if (s.modo === 'galera') {
      if (s.classe === 'Zingaro') {
        // "chiamata al cuggino": one action without risk a day (the filter is in the engine)
        s = compra(s, pol, log);
        const best = pol.scegli(s);
        s = invia(s, best ? { type: 'AZIONE', id: best[0].id, t: best[1] } : { type: 'PASSA' }, log);
      } else s = invia(s, { type: 'PASSA' }, log);
    } else {
      s = compra(s, pol, log);
      const scelta = deveDormire(s) ? null : pol.scegli(s);
      if (scelta === null || (pol.dormiSe(s, scelta) && puoDormire(s) && !s.dormito)) {
        if (puoDormire(s) && (!s.dormito || scelta === null)) {
          s = invia(s, { type: 'DORMI', cibo: pol.cibo(s).nome }, log);
          continue;
        }
        if (scelta === null) {
          s = invia(s, { type: 'PASSA' }, log);
          continue;
        }
      }
      s = invia(s, { type: 'AZIONE', id: scelta[0].id, t: scelta[1] }, log);
    }
  }
  return s;
}

function sceltaEvento(s: Stato, pol: Policy, guaio: string): string {
  switch (guaio) {
    case 'cuggino_soldi':
      return s.soldi >= 150 && pol.generoso ? 'paga' : 'rifiuta';
    case 'sfida_piazza':
      return pol.accettaSfide || s.classe === 'Balcanico' ? 'accetta' : 'rifiuta';
    case 'serata':
      return s.soldi >= 100 && pol.festaiolo ? 'vai' : 'resta';
    case 'giornalista':
      return pol.accettaTv ? 'accetta' : 'rifiuta';
    case 'portafoglio':
      return pol.onesto ? 'restituisci' : 'tieni';
  }
  throw new Error(`guaio senza scelta: ${guaio}`);
}

function unaRun(classe: Classe, policy: string, seme: number): Riga {
  const s = giocaPartita(classe, policy, seme);
  return {
    classe,
    policy,
    vivo: s.vivo,
    fine: FINE_SIM[s.fine],
    giorno: s.giorno,
    soldi: s.soldi,
    patrimonio: patrimonio(s),
    rep: s.rep,
    punti: punti(s),
    azioni: s.azioni,
    arresti: s.arresti,
    galera: s.g_galera,
    osp: s.g_osp,
    condanne: s.condanne,
    azioni_usate: s.azioni_usate,
  };
}

// --- report (Python `riassunto` and `stampa_tabella`) -----------------------------------------

function mediana(xs: number[]): number {
  const v = [...xs].sort((a, b) => a - b);
  const n = v.length;
  return n % 2 ? v[(n - 1) / 2]! : (v[n / 2 - 1]! + v[n / 2]!) / 2;
}

/** Python `Counter.most_common`: by count, ties in order of first appearance. */
function piuComuni(conti: Map<string, number>, n = Infinity): [string, number][] {
  return [...conti.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
}

function riassunto(rows: Riga[]) {
  const med = (k: keyof Riga) => mediana(rows.map((r) => r[k] as number));
  const fini = new Map<string, number>();
  for (const r of rows) fini.set(r.fine, (fini.get(r.fine) ?? 0) + 1);
  return {
    sopravv: rows.filter((r) => r.vivo).length / rows.length,
    punti: med('punti'),
    patr: med('patrimonio'),
    rep: med('rep'),
    galera: med('galera'),
    osp: med('osp'),
    arresti: med('arresti'),
    azioni: med('azioni'),
    fini,
  };
}

function tabella(titolo: string, righe: Map<string, ReturnType<typeof riassunto>>): string[] {
  const out = ['', `=== ${titolo} ===`];
  out.push(
    `${sinistra('', 14)} ${destra('sopr.', 6)} ${destra('punti med', 12)} ${destra('patrim.', 9)} ${destra('rep', 5)} ` +
      `${destra('galera', 6)} ${destra('osp', 5)} ${destra('arr.', 5)} ${destra('azioni', 6)}  fine`,
  );
  for (const [k, rs] of righe) {
    const fini = piuComuni(rs.fini, 3)
      .map(([a, b]) => `${a}:${b}`)
      .join(', ');
    out.push(
      `${sinistra(k, 14)} ${destra(fixed(rs.sopravv * 100, 0), 5)}% ${destra(migliaia(rs.punti, 0), 12)} ` +
        `${destra(migliaia(rs.patr, 0), 9)} ${destra(fixed(rs.rep, 1), 5)} ${destra(fixed(rs.galera, 0), 6)} ` +
        `${destra(fixed(rs.osp, 0), 5)} ${destra(fixed(rs.arresti, 1), 5)} ${destra(fixed(rs.azioni, 0), 6)}  ${fini}`,
    );
  }
  return out;
}

export function report(tutti: Riga[], runs: number): string {
  const out: string[] = [];
  for (const pol of ORDINE_POLICY) {
    const righe = new Map<string, ReturnType<typeof riassunto>>();
    for (const cl of CLASSI) righe.set(cl, riassunto(tutti.filter((r) => r.classe === cl && r.policy === pol)));
    out.push(...tabella(`CLASSI — policy ${pol} (${runs} run)`, righe));
  }
  const uso = new Map<string, number>();
  for (const r of tutti) {
    if (r.policy !== 'bilanciato') continue;
    for (const [id, n] of Object.entries(r.azioni_usate)) uso.set(id, (uso.get(id) ?? 0) + n);
  }
  const tot = [...uso.values()].reduce((a, b) => a + b, 0) || 1;
  out.push('', '=== USO DELLE AZIONI (policy bilanciato, tutte le classi) ===');
  for (const [id, c] of piuComuni(uso)) {
    const a = AZIONI.find((x) => x.id === id)!;
    out.push(`  ${id} ${sinistra(a.nome, 38)} ${destra(fixed((c / tot) * 100, 1), 5)}%`);
  }
  const mai = AZIONI.filter((a) => !uso.get(a.id)).map((a) => a.id);
  if (mai.length) out.push(`  MAI usate: ${mai.join(', ')}`);
  return out.join('\n') + '\n';
}

// --- batch over worker threads ----------------------------------------------------------------

interface Lavoro {
  classe: Classe;
  policy: string;
  semi: number[];
}

async function batch(runs: number): Promise<Riga[]> {
  const lavori: Lavoro[] = [];
  for (const policy of ORDINE_POLICY)
    for (const classe of CLASSI) lavori.push({ classe, policy, semi: [...Array(runs).keys()] });
  const risultati = new Map<Lavoro, Riga[]>();
  const coda = [...lavori];
  const nWorker = Math.max(1, Math.min(availableParallelism(), lavori.length));
  await Promise.all(
    [...Array(nWorker)].map(async () => {
      const w = new Worker(fileURLToPath(new URL('./autoplay-worker.mjs', import.meta.url)), { workerData: true });
      try {
        for (let l = coda.shift(); l; l = coda.shift()) {
          const lavoro = l;
          const righe = await new Promise<Riga[]>((ok, ko) => {
            w.once('message', ok);
            w.once('error', ko);
            w.postMessage(lavoro);
          });
          risultati.set(lavoro, righe);
        }
      } finally {
        await w.terminate();
      }
    }),
  );
  return lavori.flatMap((l) => risultati.get(l)!);
}

function arg(nome: string): string | undefined {
  const i = process.argv.indexOf(`--${nome}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main(): Promise<void> {
  const classe = arg('classe') as Classe | undefined;
  if (classe) {
    const policy = arg('policy') ?? 'bilanciato';
    const s = giocaPartita(classe, policy, Number(arg('seme') ?? 42), {
      esito: (e) => console.log(JSON.stringify(e)),
    });
    console.log(`\nFINE: ${FINE_SIM[s.fine]} | giorno ${s.giorno} | patrimonio ${fixed(patrimonio(s), 0)} | ` +
      `rep ${fixed(s.rep, 1)} | MARANZA POINTS ${migliaia(punti(s), 0)}`);
    return;
  }
  const runs = Number(arg('runs') ?? 200);
  const t0 = performance.now();
  const testo = report(await batch(runs), runs);
  process.stdout.write(testo);
  console.error(`\n(${runs * 24} partite in ${fixed((performance.now() - t0) / 1000, 1)} s)`);
  if (runs === 200) {
    const rif = readFileSync(new URL('../sim/results/batch_finale.txt', import.meta.url), 'utf8');
    const rifTabella = rif.slice(0, testo.length);
    if (rifTabella === testo) console.error('IDENTICO a sim/results/batch_finale.txt');
    else {
      const a = testo.split('\n');
      const b = rifTabella.split('\n');
      const i = a.findIndex((x, k) => x !== b[k]);
      console.error(`DIVERSO da sim/results/batch_finale.txt alla riga ${i + 1}:\n  ts:  ${a[i]}\n  sim: ${b[i]}`);
      process.exitCode = 1;
    }
  }
}

if (isMainThread) {
  if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
} else if (workerData) {
  parentPort!.on('message', (l: Lavoro) => parentPort!.postMessage(l.semi.map((seme) => unaRun(l.classe, l.policy, seme))));
}
