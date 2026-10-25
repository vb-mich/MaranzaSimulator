// Floating-point helpers that give the same results as CPython where JavaScript differs.

const potenze = new Map<string, number>();

/** Decompose a finite positive double into odd mantissa * 2^exp. */
function scomponi(x: number): [bigint, number] {
  const buf = new DataView(new ArrayBuffer(8));
  buf.setFloat64(0, x);
  const hi = buf.getUint32(0);
  const lo = buf.getUint32(4);
  const expBits = (hi >>> 20) & 0x7ff;
  let mant = (BigInt(hi & 0xfffff) << 32n) | BigInt(lo);
  let exp: number;
  if (expBits === 0) exp = -1074;
  else {
    mant |= 1n << 52n;
    exp = expBits - 1075;
  }
  while (mant > 0n && (mant & 1n) === 0n) {
    mant >>= 1n;
    exp++;
  }
  return [mant, exp];
}

/** Round mant * 2^exp (mant > 0) to the nearest double, ties to even. Normal range only. */
function componi(mant: bigint, exp: number): number {
  const bits = mant.toString(2).length;
  if (bits > 53) {
    const shift = BigInt(bits - 53);
    const resto = mant & ((1n << shift) - 1n);
    const meta = 1n << (shift - 1n);
    mant >>= shift;
    exp += bits - 53;
    if (resto > meta || (resto === meta && (mant & 1n) === 1n)) mant += 1n;
  }
  return Number(mant) * 2 ** exp;
}

/**
 * `x ** n` for a positive double and a non-negative integer exponent, correctly rounded like
 * CPython on glibc (V8's Math.pow is off by one ulp for some exponents, e.g. 0.99 ** 6).
 */
export function potenza(x: number, n: number): number {
  if (n === 0) return 1;
  if (n === 1) return x;
  const chiave = `${x}^${n}`;
  const noto = potenze.get(chiave);
  if (noto !== undefined) return noto;
  const [m, e] = scomponi(x);
  const v = componi(m ** BigInt(n), e * n);
  potenze.set(chiave, v);
  return v;
}

/**
 * Python `statistics.mean` on floats: exact sum, then a single rounding (a plain JS sum
 * can differ in the last bit).
 */
export function mediaEsatta(valori: readonly number[]): number {
  if (valori.length === 0) throw new Error('media di una lista vuota');
  // Bring every value to a common power of two and sum exactly as BigInt.
  const parti = valori.map((v) => {
    if (v === 0) return [0n, 0] as [bigint, number];
    const [m, e] = scomponi(Math.abs(v));
    return [v < 0 ? -m : m, e] as [bigint, number];
  });
  const emin = Math.min(...parti.filter(([m]) => m !== 0n).map(([, e]) => e), 0);
  let somma = 0n;
  for (const [m, e] of parti) somma += m << BigInt(e - emin);
  if (somma === 0n) return 0;
  const neg = somma < 0n;
  if (neg) somma = -somma;
  // somma * 2^emin / n, rounded once: scale up so the quotient has > 53 significant bits.
  const n = BigInt(valori.length);
  const extra = 64 + n.toString(2).length;
  const q = (somma << BigInt(extra)) / n;
  const r = (somma << BigInt(extra)) % n;
  // A non-zero remainder only matters as a sticky bit below the rounding position.
  const v = componi((q << 1n) | (r === 0n ? 0n : 1n), emin - extra - 1);
  return neg ? -v : v;
}
