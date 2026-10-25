// Seedable RNG with the exact semantics of Python's `random.Random`.
//
// The generator is MT19937 seeded like CPython does for an integer seed, and the helpers
// (random, uniform, randint, choice, choices) consume the stream exactly like their Python
// counterparts. Same seed + same calls = the same numbers as sim/maranza_sim.py, which lets the
// harness reproduce the simulator's batch run by run.
//
// The whole generator state is plain JSON (624 words + index) and lives inside the game state.

const N = 624;
const M = 397;
const MATRIX_A = 0x9908b0df;
const UPPER_MASK = 0x80000000;
const LOWER_MASK = 0x7fffffff;

export interface RngStato {
  mt: number[];
  i: number;
}

function initGenrand(s: number): number[] {
  const mt = new Array<number>(N);
  mt[0] = s >>> 0;
  for (let i = 1; i < N; i++) {
    const prev = mt[i - 1]!;
    mt[i] = (Math.imul(1812433253, prev ^ (prev >>> 30)) + i) >>> 0;
  }
  return mt;
}

function initByArray(key: number[]): number[] {
  const mt = initGenrand(19650218);
  let i = 1;
  let j = 0;
  for (let k = Math.max(N, key.length); k > 0; k--) {
    const prev = mt[i - 1]!;
    mt[i] = ((mt[i]! ^ Math.imul(prev ^ (prev >>> 30), 1664525)) + key[j]! + j) >>> 0;
    i++;
    j++;
    if (i >= N) {
      mt[0] = mt[N - 1]!;
      i = 1;
    }
    if (j >= key.length) j = 0;
  }
  for (let k = N - 1; k > 0; k--) {
    const prev = mt[i - 1]!;
    mt[i] = ((mt[i]! ^ Math.imul(prev ^ (prev >>> 30), 1566083941)) - i) >>> 0;
    i++;
    if (i >= N) {
      mt[0] = mt[N - 1]!;
      i = 1;
    }
  }
  mt[0] = 0x80000000;
  return mt;
}

/** State of `random.Random(seme)` for a non-negative integer seed (up to 2^53). */
export function rngDaSeme(seme: number): RngStato {
  if (!Number.isSafeInteger(seme) || seme < 0) throw new Error(`seme non valido: ${seme}`);
  // CPython splits abs(seed) into 32-bit words, least significant first.
  const key: number[] = [];
  let n = seme;
  do {
    key.push(n % 0x100000000);
    n = Math.floor(n / 0x100000000);
  } while (n > 0);
  return { mt: initByArray(key), i: N };
}

function twist(mt: number[]): void {
  let kk = 0;
  for (; kk < N - M; kk++) {
    const y = (mt[kk]! & UPPER_MASK) | (mt[kk + 1]! & LOWER_MASK);
    mt[kk] = (mt[kk + M]! ^ (y >>> 1) ^ (y & 1 ? MATRIX_A : 0)) >>> 0;
  }
  for (; kk < N - 1; kk++) {
    const y = (mt[kk]! & UPPER_MASK) | (mt[kk + 1]! & LOWER_MASK);
    mt[kk] = (mt[kk + (M - N)]! ^ (y >>> 1) ^ (y & 1 ? MATRIX_A : 0)) >>> 0;
  }
  const y = (mt[N - 1]! & UPPER_MASK) | (mt[0]! & LOWER_MASK);
  mt[N - 1] = (mt[M - 1]! ^ (y >>> 1) ^ (y & 1 ? MATRIX_A : 0)) >>> 0;
}

function bitLength(n: number): number {
  return 32 - Math.clz32(n);
}

/**
 * Generator operating in place on a `RngStato`. Use it only on a state you own
 * (`applica` works on a copy of the game state).
 */
export class Rng {
  constructor(readonly stato: RngStato) {}

  private genrand(): number {
    const mt = this.stato.mt;
    if (this.stato.i >= N) {
      twist(mt);
      this.stato.i = 0;
    }
    let y = mt[this.stato.i++]!;
    y ^= y >>> 11;
    y ^= (y << 7) & 0x9d2c5680;
    y ^= (y << 15) & 0xefc60000;
    y ^= y >>> 18;
    return y >>> 0;
  }

  private getrandbits(k: number): number {
    return this.genrand() >>> (32 - k);
  }

  /** Python `_randbelow_with_getrandbits`: uniform int in [0, n), n < 2^32. */
  private randbelow(n: number): number {
    const k = bitLength(n);
    let r = this.getrandbits(k);
    while (r >= n) r = this.getrandbits(k);
    return r;
  }

  /** Python `random()`: float in [0, 1) with 53 random bits. */
  random(): number {
    const a = this.genrand() >>> 5;
    const b = this.genrand() >>> 6;
    return (a * 67108864.0 + b) * (1.0 / 9007199254740992.0);
  }

  /** Python `uniform(a, b)`. */
  uniform(a: number, b: number): number {
    return a + (b - a) * this.random();
  }

  /** Python `randint(a, b)`: int in [a, b], both ends included. */
  randint(a: number, b: number): number {
    return a + this.randbelow(b - a + 1);
  }

  /** Python `choice(seq)`. */
  choice<T>(seq: readonly T[]): T {
    if (seq.length === 0) throw new Error('choice su sequenza vuota');
    return seq[this.randbelow(seq.length)]!;
  }

  /** Python `choices(population, weights)[0]`. */
  choices<T>(population: readonly T[], weights: readonly number[]): T {
    const cum: number[] = [];
    let acc = 0;
    for (const w of weights) {
      acc += w;
      cum.push(acc);
    }
    const total = cum[cum.length - 1]!;
    if (!(total > 0)) throw new Error('choices: pesi a zero');
    const x = this.random() * total;
    // bisect_right(cum, x, 0, n - 1)
    let lo = 0;
    let hi = population.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (x < cum[mid]!) hi = mid;
      else lo = mid + 1;
    }
    return population[lo]!;
  }
}
