import { describe, expect, it } from 'vitest';
import casi from './fixtures/rng-python.json';
import { Rng, rngDaSeme } from '../src/engine/rng';

type Chiamata = [string, unknown[], number];

describe('rng: stessa sequenza di random.Random di Python', () => {
  for (const caso of casi as { seme: number; chiamate: Chiamata[] }[]) {
    it(`seme ${caso.seme}`, () => {
      const rng = new Rng(rngDaSeme(caso.seme));
      for (const [nome, arg, atteso] of caso.chiamate) {
        let v: number;
        if (nome === 'random') v = rng.random();
        else if (nome === 'uniform') v = rng.uniform(arg[0] as number, arg[1] as number);
        else if (nome === 'randint') v = rng.randint(arg[0] as number, arg[1] as number);
        else if (nome === 'choice') v = rng.choice([...Array(arg[0] as number).keys()]);
        else {
          const pesi = arg[0] as number[];
          v = rng.choices([...pesi.keys()], pesi);
        }
        expect(v).toBe(atteso);
      }
    });
  }

  it('lo stato e\' JSON e riprende da dove era', () => {
    const a = new Rng(rngDaSeme(7));
    a.random();
    const copia = new Rng(JSON.parse(JSON.stringify(a.stato)));
    expect(copia.random()).toBe(a.random());
  });
});
