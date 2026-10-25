import { describe, expect, it } from 'vitest';
import dati from './fixtures/pymath-python.json';
import { mediaEsatta, potenza } from '../src/engine/pymath';

describe('pymath: stessi risultati di CPython', () => {
  it('potenza(x, n) come x ** n', () => {
    for (const [base, valori] of Object.entries(dati.potenze)) {
      valori.forEach((atteso, n) => expect(potenza(Number(base), n)).toBe(atteso));
    }
  });

  it('mediaEsatta come statistics.mean', () => {
    for (const [xs, atteso] of dati.medie as [number[], number][]) expect(mediaEsatta(xs)).toBe(atteso);
    expect(mediaEsatta([0.1, 0.2, 0.3])).toBe(0.2);
  });
});
