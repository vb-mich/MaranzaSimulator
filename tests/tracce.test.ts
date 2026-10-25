// Replays games recorded from the Python simulator (tests/fixtures/traccia_sim.py) in the TS
// engine and compares the state at every point where the engine waits for a command.
// Needs python3 on PATH; skipped otherwise. TRACCE_SEMI=0,1,2 replays more seeds.

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CLASSI } from '../src/data/gameData';
import { Rng, applica, nuovaPartita, punti, type Comando, type Stato } from '../src/engine';

interface Passo {
  s: Record<string, unknown>;
  c: unknown[][];
  punti?: number;
}
interface Partita {
  classe: string;
  policy: string;
  seme: number;
  passi: Passo[];
}

const POLICY = ['prudente', 'bilanciato', 'yolo', 'casuale'];
const SEMI = (process.env.TRACCE_SEMI ?? '0').split(',').map(Number);
const python = ['python3', 'python'].find((p) => spawnSync(p, ['--version']).status === 0);

function registra(): Partita[] {
  const out = join(mkdtempSync(join(tmpdir(), 'tracce-')), 'tracce.json');
  const spec = CLASSI.flatMap((c) => POLICY.flatMap((p) => SEMI.map((s) => `${c}:${p}:${s}`)));
  const r = spawnSync(python!, ['tests/fixtures/traccia_sim.py', out, ...spec], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(r.stderr);
  return JSON.parse(readFileSync(out, 'utf8')) as Partita[];
}

function fotografia(s: Stato, finale: boolean): Record<string, unknown> {
  const f: Record<string, unknown> = {
    soldi: s.soldi,
    energia: s.energia,
    energia_max: s.energia_max,
    rep: s.rep,
    salute: s.salute,
    giorno: s.giorno,
    slot: s.slot,
    galera: s.galera,
    ospedale: s.ospedale,
    condanne: s.condanne,
    sorvegliato: s.sorvegliato,
    attenzionato: s.attenzionato,
    attenzionato_val: s.attenzionato_val,
    items: [...s.items].sort(),
    veicolo: s.veicolo,
    cooldown: s.cooldown,
    n_recenti: s.recenti.length,
    recenti: finale ? s.recenti : s.recenti.slice(-1),
    ultimo_sonno: s.ultimo_sonno,
    cibo_pagato: s.cibo_pagato,
    cibo_gratis: s.cibo_gratis,
    lavori_oggi: s.lavori_oggi,
    instancabile_mese: s.instancabile_mese,
    paghetta_em_mese: s.paghetta_em_mese,
    notte_pak_sett: s.notte_pak_sett,
    cond: s.cond?.id || null,
    loot_tag: s.cond?.loot_tag ?? null,
    azioni: s.azioni,
    arresti: s.arresti,
    g_galera: s.g_galera,
    g_osp: s.g_osp,
    guadagni: s.guadagni,
    storico_guadagni: s.storico_guadagni.slice(-1),
    n_storico: s.storico_guadagni.length,
    vivo: s.vivo,
    fine: s.fine,
  };
  if (finale) f.azioni_usate = s.azioni_usate;
  return f;
}

function differenze(ts: Record<string, unknown>, py: Record<string, unknown>): string[] {
  const d: string[] = [];
  for (const k of new Set([...Object.keys(py), ...Object.keys(ts)])) {
    if (JSON.stringify(ts[k]) !== JSON.stringify(py[k])) d.push(`${k}: ts=${JSON.stringify(ts[k])} py=${JSON.stringify(py[k])}`);
  }
  return d;
}

/** Repeats on the game's RNG a draw the Python policy made. */
function estrai(s: Stato, c: unknown[]): void {
  const r = new Rng(s.rng);
  const [, f, ...arg] = c as [string, string, ...unknown[]];
  if (f === 'random') r.random();
  else if (f === 'uniform') r.uniform(arg[0] as number, arg[1] as number);
  else if (f === 'randint') r.randint(arg[0] as number, arg[1] as number);
  else if (f === 'choice') r.choice([...Array(arg[0] as number).keys()]);
  else if (f === 'choices') r.choices([...(arg[0] as number[]).keys()], arg[0] as number[]);
  else throw new Error(`estrazione sconosciuta ${f}`);
}

function comando(c: unknown[]): Comando {
  const [tipo, a, b] = c as [string, unknown, unknown];
  switch (tipo) {
    case 'AZIONE':
      return { type: 'AZIONE', id: a as string, t: b as number };
    case 'DORMI':
      return { type: 'DORMI', cibo: a as string };
    case 'DIFESA':
      return { type: 'DIFESA', scelta: a as never };
    case 'SCELTA_EVENTO':
      return { type: 'SCELTA_EVENTO', opzione: a as string };
    case 'COMPRA':
      return { type: 'COMPRA', item: a as string };
    case 'PASSA':
      return { type: 'PASSA' };
  }
  throw new Error(`comando sconosciuto ${tipo}`);
}

describe.skipIf(!python)('partite del simulatore rigiocate nel motore TS', () => {
  const partite = python ? registra() : [];
  for (const p of partite) {
    it(`${p.classe} ${p.policy} seme ${p.seme}`, () => {
      let s = nuovaPartita('Traccia', p.classe as never, p.seme).stato;
      p.passi.forEach((passo, i) => {
        const finale = i === p.passi.length - 1;
        const d = differenze(fotografia(s, finale), passo.s);
        if (d.length) {
          const prima = p.passi[i - 1];
          throw new Error(
            `passo ${i} (giorno ${String(passo.s.giorno)}, slot ${String(passo.s.slot)}), dopo ${JSON.stringify(prima?.c)}:\n  ${d.join('\n  ')}`,
          );
        }
        if (finale) expect(punti(s)).toBe(passo.punti);
        for (const c of passo.c) {
          if (c[0] === 'RNG') {
            estrai(s, c);
            continue;
          }
          const r = applica(s, comando(c));
          const rif = r.esiti.find((e) => e.tipo === 'RIFIUTATO');
          if (rif) throw new Error(`passo ${i}: ${JSON.stringify(c)} rifiutato (${rif.tipo === 'RIFIUTATO' ? rif.motivo : ''})`);
          s = r.stato;
        }
      });
    });
  }
});
