import { describe, expect, it } from 'vitest';
import { C, DATI } from '../src/data/gameData';
import { applica, deveDormire, nuovaPartita, puoDormire, type Comando, type Stato } from '../src/engine';

const MENSA = DATI.cibo[0]!.nome;

function gioca(stato: Stato, comandi: Comando[]): Stato {
  for (const c of comandi) {
    const r = applica(stato, c);
    const rif = r.esiti.find((e) => e.tipo === 'RIFIUTATO');
    if (rif) throw new Error(`${JSON.stringify(c)} rifiutato: ${rif.tipo === 'RIFIUTATO' ? rif.motivo : ''}`);
    stato = r.stato;
  }
  return stato;
}

/** A seed whose first days have no personal event waiting for a choice. */
function partitaTranquilla(classe: Parameters<typeof nuovaPartita>[1] = 'Italiano'): Stato {
  for (let seme = 1; seme < 500; seme++) {
    const { stato } = nuovaPartita('Test', classe, seme);
    if (!stato.attesa && stato.modo === 'slot' && stato.cond === null) return stato;
  }
  throw new Error('nessun seme tranquillo');
}

describe('nuova partita', () => {
  it('parte il 1 maggio, Mattina, con i valori della classe', () => {
    const { stato, esiti } = nuovaPartita('Fra', 'Pakistano', 7);
    expect(stato.giorno).toBe(0);
    expect(stato.slot).toBe(1);
    expect(stato.energia).toBe(DATI.classi.Pakistano.energia);
    expect(stato.rep).toBeCloseTo(C.REP_INIZIALE * C.REP_DECAY);
    expect(esiti[0]).toMatchObject({ tipo: 'GIORNO', giorno: 0 });
  });

  it('stesso seme e stessi comandi danno la stessa partita', () => {
    const cmd: Comando[] = [
      { type: 'AZIONE', id: 'L01', t: 0 },
      { type: 'DORMI', cibo: MENSA },
    ];
    const a = gioca(partitaTranquilla(), cmd);
    const b = gioca(partitaTranquilla(), cmd);
    expect(a).toEqual(b);
  });

  it('lo stato e\' JSON: salvato e ricaricato continua uguale', () => {
    const s = partitaTranquilla();
    const copia = JSON.parse(JSON.stringify(s)) as Stato;
    expect(copia).toEqual(s);
    const cmd: Comando[] = [
      { type: 'AZIONE', id: 'L03', t: 0 },
      { type: 'DORMI', cibo: MENSA },
      { type: 'AZIONE', id: 'L01', t: 0 },
    ];
    expect(gioca(copia, cmd)).toEqual(gioca(s, cmd));
  });

  it('applica non modifica lo stato che riceve', () => {
    const s = partitaTranquilla();
    const prima = structuredClone(s);
    applica(s, { type: 'AZIONE', id: 'L01', t: 0 });
    expect(s).toEqual(prima);
  });
});

describe('slot, trasferte e sonno', () => {
  it('un\'azione consuma uno slot, energia ed eventualmente soldi', () => {
    const s = partitaTranquilla();
    const dopo = gioca(s, [{ type: 'AZIONE', id: 'L03', t: 0 }]);
    expect(dopo.slot).toBe(2);
    expect(dopo.energia).toBe(s.energia - 40);
    expect(dopo.soldi).toBeGreaterThan(s.soldi);
    expect(dopo.lavori_oggi).toBe(1);
  });

  it('un solo lavoro legale al giorno', () => {
    const s = gioca(partitaTranquilla(), [{ type: 'AZIONE', id: 'L03', t: 0 }]);
    const r = applica(s, { type: 'AZIONE', id: 'L03', t: 0 });
    expect(r.esiti[0]).toMatchObject({ tipo: 'RIFIUTATO' });
    expect(r.stato).toBe(s);
  });

  it('una trasferta senza veicolo costa due slot e non si inizia di Sera', () => {
    const s = partitaTranquilla('Italiano');
    expect(gioca(s, [{ type: 'AZIONE', id: 'L04', t: 0 }]).slot).toBe(3);
    const sera = gioca(s, [
      { type: 'AZIONE', id: 'L01', t: 0 },
      { type: 'DORMI', cibo: MENSA },
    ]);
    expect(sera.slot).toBe(3);
    expect(applica(sera, { type: 'AZIONE', id: 'L04', t: 0 }).esiti[0]).toMatchObject({ tipo: 'RIFIUTATO' });
  });

  it('il Magrebino fa le trasferte in uno slot', () => {
    const s = partitaTranquilla('Magrebino');
    expect(gioca(s, [{ type: 'AZIONE', id: 'L04', t: 0 }]).slot).toBe(2);
  });

  it('due riposi ad almeno due slot di distanza; il mantenimento si paga una volta', () => {
    const s = partitaTranquilla();
    const dormito = gioca(s, [{ type: 'DORMI', cibo: MENSA }]);
    expect(dormito.slot).toBe(2);
    expect(dormito.soldi).toBe(s.soldi - DATI.cibo[0]!.costo);
    expect(puoDormire(dormito)).toBe(false);
    expect(applica(dormito, { type: 'DORMI', cibo: MENSA }).esiti[0]).toMatchObject({ tipo: 'RIFIUTATO' });
    const sera = gioca(dormito, [{ type: 'AZIONE', id: 'L01', t: 0 }]);
    expect(puoDormire(sera)).toBe(true);
    const ancora = gioca(sera, [{ type: 'DORMI', cibo: MENSA }]);
    expect(ancora.soldi).toBe(sera.soldi);
  });

  it('di Notte, senza aver dormito, si puo\' solo dormire; poi inizia il giorno dopo', () => {
    let s = partitaTranquilla();
    s = gioca(s, [
      { type: 'AZIONE', id: 'L01', t: 0 },
      { type: 'AZIONE', id: 'L05', t: 0 },
      { type: 'AZIONE', id: 'L01', t: 0 },
    ]);
    expect(s.slot).toBe(4);
    expect(deveDormire(s)).toBe(true);
    expect(applica(s, { type: 'AZIONE', id: 'L01', t: 0 }).esiti[0]).toMatchObject({ tipo: 'RIFIUTATO' });
    expect(applica(s, { type: 'PASSA' }).esiti[0]).toMatchObject({ tipo: 'RIFIUTATO' });
    const r = applica(s, { type: 'DORMI', cibo: MENSA });
    expect(r.stato.giorno).toBe(1);
    expect(r.esiti.map((e) => e.tipo)).toContain('GIORNO');
  });

  it('PASSA solo quando non si puo\' dormire', () => {
    const s = partitaTranquilla();
    expect(applica(s, { type: 'PASSA' }).esiti[0]).toMatchObject({ tipo: 'RIFIUTATO' });
    const dormito = gioca(s, [{ type: 'DORMI', cibo: MENSA }]);
    expect(gioca(dormito, [{ type: 'PASSA' }]).slot).toBe(3);
  });
});
