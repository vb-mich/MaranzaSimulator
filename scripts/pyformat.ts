// Python-style number formatting for the harness table, so its output can be compared byte by
// byte with sim/results/batch_finale.txt. Python rounds the exact binary value half to even;
// Number.prototype.toFixed rounds ties up.

/** Python `format(x, f".{cifre}f")`. */
export function fixed(x: number, cifre: number): string {
  if (!Number.isFinite(x)) return String(x);
  const neg = x < 0 || Object.is(x, -0);
  const esatto = Math.abs(x).toFixed(100); // exact decimal expansion for the magnitudes we print
  const [intero, frazione] = esatto.split('.') as [string, string];
  let cifreTenute = intero + frazione.slice(0, cifre);
  const resto = frazione.slice(cifre);
  const primo = resto.charCodeAt(0) - 48;
  const dopo = resto.slice(1);
  const pari = (Number(cifreTenute.at(-1)) & 1) === 0;
  const suTie = primo === 5 && /^0*$/.test(dopo);
  if (primo > 5 || (primo === 5 && !suTie) || (suTie && !pari)) {
    // add one unit in the last kept digit
    const d = cifreTenute.split('').map(Number);
    let i = d.length - 1;
    while (i >= 0) {
      if (d[i]! < 9) {
        d[i]! += 1;
        break;
      }
      d[i] = 0;
      i--;
    }
    cifreTenute = (i < 0 ? '1' : '') + d.join('');
  }
  const ni = cifreTenute.length - cifre;
  let out = cifre > 0 ? `${cifreTenute.slice(0, ni)}.${cifreTenute.slice(ni)}` : cifreTenute;
  out = out.replace(/^0+(?=\d)/, '');
  return neg ? `-${out}` : out; // Python keeps the sign: format(-0.4, '.0f') == '-0'
}

/** Python `format(x, f",.{cifre}f")`: thousands separated by commas. */
export function migliaia(x: number, cifre: number): string {
  const s = fixed(x, cifre);
  const neg = s.startsWith('-');
  const [intero, frazione] = (neg ? s.slice(1) : s).split('.') as [string, string | undefined];
  const gruppi = intero.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${neg ? '-' : ''}${gruppi}${frazione !== undefined ? `.${frazione}` : ''}`;
}

/** Right-align to `n` characters (Python `>n` / numbers default). */
export function destra(s: string, n: number): string {
  return s.padStart(n);
}

/** Left-align to `n` characters (Python `:ns` for strings). */
export function sinistra(s: string, n: number): string {
  return s.padEnd(n);
}
