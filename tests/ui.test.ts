// UI logic without a DOM: formatting, outcome cards, the UI reducer, saves, and that every id of the
// data has its Italian text. A headless bot plays a week through the reducer for every class,
// choosing only among the commands the screens would offer.

import { describe, expect, it } from 'vitest';
import { AZIONI, C, CLASSI, CONDIZIONI, DATI, FESTE, GUAI, type Classe } from '../src/data/gameData';
import { TESTI } from '../src/data/testi';
import {
  applica,
  azioniDisponibili,
  deveDormire,
  difese,
  nuovaPartita,
  puoDormire,
  rifiuto,
  type Comando,
  type Esito,
  type Stato,
} from '../src/engine';
import { leggiImport, nuovoSalvataggio, validaSalvataggio } from '../src/save/SaveAdapter';
import { abbrevia, euro, euroDelta, euroIntervallo, numero, pct, suMassimo } from '../src/ui/formato';
import { smista } from '../src/ui/gioco/esiti';
import { riduttore, statoIniziale, type StatoUi } from '../src/ui/gioco/statoUi';
import { effettiCondizione, effettoOggetto, nomeCondizione, prossimoTier } from '../src/ui/vista';

describe('formato', () => {
  it('soldi con il punto delle migliaia, arrotondati per difetto', () => {
    expect(euro(1240)).toBe('1.240 €');
    expect(euro(12.99)).toBe('12 €');
    expect(euro(0)).toBe('0 €');
    expect(euro(1234567)).toBe('1.234.567 €');
  });
  it('variazioni con il segno; i centesimi solo sotto i 10 €', () => {
    expect(euroDelta(340)).toBe('+340 €');
    expect(euroDelta(-50)).toBe('−50 €');
    expect(euroDelta(2.5)).toBe('+2,50 €');
    expect(euroDelta(1520.4)).toBe('+1.520 €');
  });
  it('MARANZA POINTS abbreviati come nel GDD', () => {
    expect(abbrevia(870_000)).toBe('870K');
    expect(abbrevia(4_600_000)).toBe('4,6M');
    expect(abbrevia(18_240_000)).toBe('18,2M');
    expect(abbrevia(950)).toBe('950');
  });
  it('numeri e percentuali con la virgola', () => {
    expect(numero(4.25, 1)).toBe('4,3');
    expect(pct(0.065)).toBe('6,5%');
  });
  it('intervalli di spesa e valori sul massimo', () => {
    expect(euroIntervallo(10, 200)).toBe('10–200 €');
    expect(euroIntervallo(300, 5000)).toBe('300–5.000 €');
    expect(euroIntervallo(1, 1)).toBe('1 €');
    expect(euroIntervallo(0, 30)).toBe('0–30 €');
    expect(suMassimo(19.6, 100)).toBe('19/100');
    expect(suMassimo(100, 85.00000001)).toBe('100/85');
  });
});

describe('testi', () => {
  it('ogni azione, guaio, oggetto, cibo, classe e condizione ha il suo testo', () => {
    for (const a of AZIONI) expect(TESTI.azioni[a.id]?.nome, a.id).toBeTruthy();
    for (const g of GUAI) expect(TESTI.guai[g]?.titolo, g).toBeTruthy();
    for (const id of Object.keys(DATI.negozio)) expect(TESTI.oggetti[id]?.nome, id).toBeTruthy();
    for (const c of DATI.cibo) expect(TESTI.cibo[c.nome]?.nome, c.nome).toBeTruthy();
    for (const c of CLASSI) expect(TESTI.classi[c].abilita).toHaveLength(2);
    for (const c of [...CONDIZIONI, ...FESTE]) expect(TESTI.condizioni[c.id]?.domani, c.id).toBeTruthy();
    for (const id of Object.keys(DATI.avvocati)) expect(TESTI.difese[id], id).toBeTruthy();
  });
  it('ogni messaggio del Boss ha il suo testo', () => {
    const ids = ['primo_giorno', 'primo_arresto', 'prima_messa_alla_prova', 'primo_ricovero', 'zero_euro'];
    for (const t of C.TIER_REP as number[]) if (t > 0) ids.push(`tier_${t}`);
    for (const id of ids) expect(TESTI.boss[id], id).toBeTruthy();
  });
  it('niente marchi reali nei nomi mostrati', () => {
    // values only: the data ids (e.g. the food "Lidl") stay as they are
    const mostrati = JSON.stringify([TESTI.azioni, TESTI.oggetti, TESTI.classi, TESTI.guai].map(Object.values).concat(Object.values(TESTI.cibo)));
    for (const marchio of ['Lidl', 'Vinted', 'TikTok', 'Caritas', 'Nike', 'BMW', 'iPhone', 'North Face', 'Panda']) expect(mostrati).not.toContain(marchio);
  });
});

describe('vista', () => {
  it('effetti delle condizioni in parole e numeri', () => {
    const blitz = CONDIZIONI.find((c) => c.id === 'blitz')!;
    expect(effettiCondizione(blitz)[0]).toContain('+10');
    expect(effettiCondizione(null)).toEqual([TESTI.condizioneEffetti.nessuno]);
    expect(nomeCondizione({ id: '', nome: '' })).toBe(TESTI.principale.bossTiNota);
  });
  it('effetti degli oggetti dal negozio', () => {
    for (const id of Object.keys(DATI.negozio)) expect(effettoOggetto(id).length, id).toBeGreaterThan(0);
  });
  it('prossimo tier e azioni che sblocca', () => {
    const t = prossimoTier(5)!;
    expect(t.soglia).toBe(10);
    expect(t.azioni.length).toBeGreaterThan(0);
    expect(prossimoTier(100)).toBeNull();
  });
});

describe('esiti → carte e toast', () => {
  const s = nuovaPartita('Fra', 'Italiano', 1).stato;
  it('azione beccata e arresto sono una carta sola', () => {
    const esiti: Esito[] = [
      { tipo: 'AZIONE', id: 'C02', t: 0, spesa: 0, risultato: 'gabbio', vinto: null, soldi: 0, rep: 0, virale: false, veicolo: false },
      { tipo: 'ARRESTO', azione: 'C02', sequestro: 20, veicolo_sequestrato: false },
      { tipo: 'BOSS', id: 'primo_arresto' },
    ];
    const { carte } = smista(esiti, s, { type: 'AZIONE', id: 'C02', t: 0 }, s);
    expect(carte).toHaveLength(2);
    expect(carte[0]).toMatchObject({ tipo: 'azione', arresto: { sequestro: 20 } });
    expect(carte[1]).toMatchObject({ tipo: 'boss', id: 'primo_arresto' });
  });
  it('la carta dell\'azione porta energia spesa e salute', () => {
    // the park: health goes up, but never past the maximum
    const parco = AZIONI.find((a) => a.salute > 0 && (a.tags as string[]).includes('LEGALE'))!;
    const esiti: Esito[] = [
      { tipo: 'AZIONE', id: parco.id, t: 0, spesa: 0, risultato: 'ok', vinto: null, soldi: 0, rep: 1, virale: false, veicolo: false },
    ];
    const prima: Stato = { ...s, salute: s.salute_max - 1 };
    const { carte } = smista(esiti, prima, { type: 'AZIONE', id: parco.id, t: 0 }, prima);
    expect(carte[0]).toMatchObject({ tipo: 'azione', energia: parco.energia, salute: 1 });
  });
  it('il ricovero si attacca alla sua azione', () => {
    const esiti: Esito[] = [
      { tipo: 'AZIONE', id: 'C10', t: 0, spesa: 0, risultato: 'ospedale', vinto: null, soldi: 0, rep: 0, virale: false, veicolo: false },
      { tipo: 'RICOVERO', giorni: 2, danno: 20, furto: 5 },
    ];
    const { carte } = smista(esiti, s, { type: 'AZIONE', id: 'C10', t: 0 }, s);
    expect(carte).toHaveLength(1);
    expect(carte[0]).toMatchObject({ tipo: 'azione', ricovero: { giorni: 2 } });
  });
  it('dopo la prima settimana il Boss scrive senza bloccare', () => {
    const dopo: Stato = { ...s, giorno: C.TUTORIAL_GIORNI };
    const { carte, toast } = smista([{ tipo: 'BOSS', id: 'tier_10' }], s, { type: 'PASSA' }, dopo);
    expect(carte).toHaveLength(0);
    expect(toast[0]).toMatchObject({ boss: true, testo: TESTI.boss.tier_10 });
  });
});

describe('salvataggi', () => {
  it('andata e ritorno in JSON', () => {
    const s = nuovaPartita('Fra', 'Zingaro', 3).stato;
    const sv = nuovoSalvataggio(s, { bossLetti: 1, inClassifica: false });
    const letto = leggiImport(JSON.stringify(sv))!;
    expect(letto.stato).toEqual(s);
    expect(letto.ui.bossLetti).toBe(1);
  });
  it('rifiuta file che non sono salvataggi', () => {
    expect(leggiImport('non json')).toBeNull();
    expect(validaSalvataggio({ formato: 'altro' })).toBeNull();
    expect(validaSalvataggio(null)).toBeNull();
  });
  it('un salvataggio senza chat del Boss parte con la chat vuota', () => {
    const s = nuovaPartita('Fra', 'Zingaro', 3).stato as Partial<Stato>;
    delete s.boss;
    const v = validaSalvataggio({ formato: 'maranza-simulator', versione: 1, salvato: '', stato: s, ui: {} });
    expect(v?.stato.boss).toEqual([]);
  });
});

/** The command a cautious player would tap, among those the screens offer for this state. */
function mossa(s: Stato, scegli: (n: number) => number): Comando {
  const att = s.attesa;
  if (att?.tipo === 'TRIBUNALE') {
    const d = difese(s).filter((x) => x.disponibile);
    return { type: 'DIFESA', scelta: d[scegli(d.length)]!.id };
  }
  if (att?.tipo === 'EVENTO') {
    const o = att.opzioni.filter((x) => x.disponibile);
    return { type: 'SCELTA_EVENTO', opzione: o[scegli(o.length)]!.id };
  }
  const cibo = DATI.cibo.find((c) => rifiuto(s, { type: 'DORMI', cibo: c.nome }) === null);
  if (s.modo === 'slot' && deveDormire(s)) return { type: 'DORMI', cibo: cibo!.nome };
  const azioni = azioniDisponibili(s).filter((a) => rifiuto(s, { type: 'AZIONE', id: a.id, t: 0 }) === null);
  if (s.modo === 'slot' && puoDormire(s) && (azioni.length === 0 || s.energia < s.energia_max / 4) && cibo)
    return { type: 'DORMI', cibo: cibo.nome };
  if (azioni.length && scegli(4) > 0) return { type: 'AZIONE', id: azioni[scegli(azioni.length)]!.id, t: 0 };
  if (rifiuto(s, { type: 'PASSA' }) === null) return { type: 'PASSA' };
  if (cibo && puoDormire(s)) return { type: 'DORMI', cibo: cibo.nome };
  return { type: 'AZIONE', id: azioni[0]!.id, t: 0 };
}

describe('una settimana dalla UI, per ogni classe', () => {
  it.each(CLASSI)('%s: sempre almeno una mossa valida, mai un comando rifiutato', (classe: Classe) => {
    for (let seme = 1; seme <= 8; seme++) {
      let r = seme * 7919;
      const scegli = (n: number) => ((r = (r * 1103515245 + 12345) >>> 0) >>> 8) % n;
      let ui: StatoUi = riduttore(statoIniziale(null), { tipo: 'NUOVA', nome: 'Bot', classe, seme });
      for (let passi = 0; passi < 400 && ui.partita!.modo !== 'fine' && ui.partita!.giorno < 7; passi++) {
        while (ui.carte.length) ui = riduttore(ui, { tipo: 'CHIUDI_CARTA' });
        const s = ui.partita!;
        const cmd = mossa(s, scegli);
        expect(rifiuto(s, cmd), `${classe} seme ${seme} giorno ${s.giorno}: ${JSON.stringify(cmd)}`).toBeNull();
        ui = riduttore(ui, { tipo: 'COMANDO', comando: cmd });
        expect(ui.partita).not.toBe(s);
      }
      expect(ui.partita!.giorno >= 7 || ui.partita!.modo === 'fine').toBe(true);
    }
  });

  it('il riduttore non tocca lo stato che riceve', () => {
    const ui = riduttore(statoIniziale(null), { tipo: 'NUOVA', nome: 'Bot', classe: 'Africano', seme: 5 });
    const copia = structuredClone(ui);
    riduttore(ui, { tipo: 'COMANDO', comando: { type: 'PASSA' } });
    expect(ui).toEqual(copia);
    expect(applica).toBeDefined();
  });
});
