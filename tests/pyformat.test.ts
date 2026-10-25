import { expect, it } from 'vitest';
import casi from './fixtures/pyformat-python.json';
import { destra, fixed, migliaia } from '../scripts/pyformat';

it('formattazione dei numeri come Python', () => {
  for (const [x, f0, f1, m0, f51] of casi as [number, string, string, string, string][]) {
    expect(fixed(x, 0), `${x} .0f`).toBe(f0);
    expect(fixed(x, 1), `${x} .1f`).toBe(f1);
    expect(migliaia(x, 0), `${x} ,.0f`).toBe(m0);
    expect(destra(fixed(x, 1), 5), `${x} 5.1f`).toBe(f51);
  }
});
