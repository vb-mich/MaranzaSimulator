import { describe, expect, it } from 'vitest';
import { AZIONI, C, CLASSI, DATI, haBottino } from '../src/data/gameData';
import {
  anteprimaSonno,
  applica,
  bottinoAtteso,
  bottinoIntervallo,
  difese,
  modificatoriRischio,
  moltiplicatoreIncasso,
  modificatoriTiro,
  nuovaPartita,
  penaRichiesta,
  prossimoGrado,
  rischi,
  type Comando,
  type Esito,
  type MessaggioBoss,
  type Stato,
} from '../src/engine';
import { giocaPartita } from '../scripts/autoplay';

const CARITAS = DATI.cibo[DATI.cibo.length - 1]!.nome;

function partitaTranquilla(classe: Parameters<typeof nuovaPartita>[1]): Stato {
  for (let seme = 1; seme < 500; seme++) {
    const { stato } = nuovaPartita('Test', classe, seme);
    if (!stato.attesa && stato.modo === 'slot' && stato.cond === null) return stato;
  }
  throw new Error('nessun seme tranquillo');
}

function invia(s: Stato, c: Comando): { stato: Stato; esiti: Esito[] } {
  const r = applica(s, c);
  const rif = r.esiti.find((e) => e.tipo === 'RIFIUTATO');
  if (rif) throw new Error(`${JSON.stringify(c)} rifiutato`);
  return r;
}

const bossDi = (esiti: Esito[]) => esiti.flatMap((e) => (e.tipo === 'BOSS' ? [e.id] : []));

describe('messaggi del Boss', () => {
  it('il primo giorno scrive una volta sola', () => {
    const { stato, esiti } = nuovaPartita('Fra', 'Africano', 3);
    expect(bossDi(esiti)).toEqual(['primo_giorno']);
    expect(stato.boss).toEqual(['primo_giorno']);
  });

  it('annuncia ogni soglia di rep raggiunta, in ordine, una volta sola', () => {
    const s = partitaTranquilla('Magrebino');
    s.rep = 36;
    const r = invia(s, { type: 'AZIONE', id: 'L01', t: 0 });
    expect(bossDi(r.esiti)).toEqual(['tier_10', 'tier_20', 'tier_35']);
    const r2 = invia(r.stato, { type: 'DORMI', cibo: CARITAS });
    expect(bossDi(r2.esiti)).toEqual([]);
  });

  it('scrive la prima volta che resti a 0€', () => {
    const s = partitaTranquilla('Balcanico');
    s.soldi = 0.3;
    const r = invia(s, { type: 'DORMI', cibo: CARITAS });
    expect(bossDi(r.esiti)).toEqual(['zero_euro']);
    expect(r.stato.boss).toEqual(['primo_giorno', 'zero_euro']);
  });

  it('in partite intere: ogni messaggio una volta, subito dopo il suo esito, e la chat nello stato', () => {
    for (const classe of CLASSI) {
      const esiti: Esito[] = [];
      let repMax = 0;
      const fine = giocaPartita(classe, 'yolo', 11, {
        esito: (e) => esiti.push(e),
        passo: (_prima, _c, r) => {
          if (r.stato.modo !== 'fine') repMax = Math.max(repMax, r.stato.rep);
        },
      });
      const ids = bossDi(esiti);
      expect(new Set(ids).size).toBe(ids.length);
      expect(fine.boss).toEqual(ids);
      const dopo = (tipo: Esito['tipo'], id: MessaggioBoss, filtro: (e: Esito) => boolean = () => true) => {
        const i = esiti.findIndex((e) => e.tipo === tipo && filtro(e));
        if (i < 0) expect(ids).not.toContain(id);
        else expect(esiti[i + 1]).toEqual({ tipo: 'BOSS', id });
      };
      dopo('ARRESTO', 'primo_arresto');
      dopo('RICOVERO', 'primo_ricovero');
      dopo('VERDETTO', 'prima_messa_alla_prova', (e) => e.tipo === 'VERDETTO' && e.esito === 'messa_alla_prova');
      for (const soglia of C.TIER_REP.filter((x) => x > 0)) {
        expect(ids.includes(`tier_${soglia}`)).toBe(repMax >= soglia);
      }
    }
  });
});

describe('query dietro i (?)', () => {
  // states along a few full games, with the command that followed each one
  const passi: { prima: Stato; c: Comando; dopo: Stato }[] = [];
  for (const classe of CLASSI)
    giocaPartita(classe, 'bilanciato', 5, { passo: (prima, c, r) => passi.push({ prima, c, dopo: r.stato }) });
  const campione = passi.filter((_, i) => i % 37 === 0).map((p) => p.prima);

  it('i modificatori del rischio ricompongono esattamente il rischio del motore', () => {
    let conVoci = 0;
    for (const s of campione)
      for (const a of AZIONI)
        for (const t of [0, 0.5, 1]) {
          const { base, voci, finale } = modificatoriRischio(s, a, t);
          expect(finale).toEqual(rischi(s, a, t));
          if (base[0] === 0 && base[1] === 0) continue;
          let [g, o] = base;
          let mult = 1;
          for (const v of voci) {
            if (v.su === 'gabbio_ospedale') mult *= v.valore;
            else if (v.effetto === 'piu') g += v.valore;
            else g *= v.valore;
          }
          const tetto = (x: number) => Math.max(0, Math.min(C.RISCHIO_MAX, x));
          expect([tetto(g * mult), tetto(o * mult)]).toEqual(finale);
          if (voci.length) conVoci++;
        }
    expect(conVoci).toBeGreaterThan(0);
  });

  it("l'intervallo del bottino contiene l'atteso e ogni incasso reale", () => {
    for (const s of campione)
      for (const a of AZIONI.filter((x) => haBottino(x) || x.bottino_x))
        for (const t of [0, 0.5, 1]) {
          const [lo, hi] = bottinoIntervallo(s, a, t)!;
          const atteso = bottinoAtteso(s, a, t) * moltiplicatoreIncasso(s);
          expect(atteso).toBeGreaterThanOrEqual(lo - 1e-9);
          expect(atteso).toBeLessThanOrEqual(hi + 1e-9);
        }
    // actual loot of plain actions (no gambling, no scooter kept) stays inside the interval
    for (const { prima, c, dopo } of passi) {
      if (c.type !== 'AZIONE') continue;
      const a = AZIONI.find((x) => x.id === c.id)!;
      if (a.speciale || !(haBottino(a) || a.bottino_x) || dopo.storico_guadagni.length !== prima.storico_guadagni.length)
        continue;
      const incasso = dopo.guadagni - prima.guadagni;
      if (incasso === 0) continue; // caught or hurt
      const [lo, hi] = bottinoIntervallo(prima, a, c.t)!;
      expect(incasso).toBeGreaterThanOrEqual(lo * (1 - 1e-12));
      expect(incasso).toBeLessThanOrEqual(hi * (1 + 1e-12));
    }
  });

  it('la pena richiesta e la difesa coincidono con il tribunale', () => {
    let arresti = 0;
    for (const { prima, c, dopo } of passi) {
      if (c.type !== 'AZIONE' || dopo.attesa?.tipo !== 'TRIBUNALE') continue;
      arresti++;
      expect(penaRichiesta(prima, c.id)).toEqual({ giorni: dopo.attesa.pena_base, multa: dopo.attesa.multa });
      const d = difese(dopo);
      expect(d.map((x) => x.id)).toEqual(['ufficio', 'quartiere', 'grido', 'patteggia', 'spavaldo']);
      for (const x of d.filter((y) => y.id in DATI.avvocati)) expect(x.disponibile).toBe(dopo.soldi >= x.costo);
    }
    expect(arresti).toBeGreaterThan(0);
  });

  it('i modificatori del tiro spiegano il tiro del verdetto', () => {
    let verdetti = 0;
    for (const { prima, c } of passi) {
      if (c.type !== 'DIFESA' || c.scelta === 'patteggia' || c.scelta === 'spavaldo') continue;
      if (prima.soldi < (DATI.avvocati as Record<string, { costo: number }>)[c.scelta]!.costo) continue;
      const r = applica(prima, c);
      const v = r.esiti.find((e) => e.tipo === 'VERDETTO');
      if (v?.tipo !== 'VERDETTO' || v.dado === null) continue;
      const m = modificatoriTiro(prima);
      const bonus = (DATI.avvocati as Record<string, { bonus: number }>)[c.scelta]!.bonus;
      expect(v.tiro).toBe(v.dado + bonus + m.classe + m.recidiva + m.tutorial + m.incensurato + m.noto_in_questura);
      verdetti++;
    }
    expect(verdetti).toBeGreaterThan(0);
  });

  it("l'anteprima del sonno e' quello che succede dormendo", () => {
    let sonni = 0;
    for (const { prima, c, dopo } of passi) {
      if (c.type !== 'DORMI' || dopo.giorno !== prima.giorno) continue; // at Night the next day starts too
      expect(anteprimaSonno(prima, c.cibo)).toEqual({ energia: dopo.energia, costo: prima.soldi - dopo.soldi, salute: dopo.salute });
      sonni++;
    }
    expect(sonni).toBeGreaterThan(0);
  });

  it('prossimo grado', () => {
    expect(prossimoGrado(0)).toEqual({ soglia: 10, nome: 'Zanza' });
    expect(prossimoGrado(49.9)).toEqual({ soglia: 50, nome: 'Boss di zona' });
    expect(prossimoGrado(70)).toBeNull();
  });
});
