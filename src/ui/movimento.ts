// Browser-only display helpers (the UI tests run without a DOM, so these stay out of vista.ts).

/** The player asked the system for less motion: no tumbling dice, no timed reveals. */
export function movimentoRidotto(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}
