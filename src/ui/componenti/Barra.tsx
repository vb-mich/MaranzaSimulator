// HUD bar: icon, fill, a label (rep grade, or what the bar is) and the value in numbers on the right.

import type { ReactNode } from 'react';

export function Barra({
  icona,
  frazione,
  colore,
  etichetta,
  valore,
  info,
  nome,
}: {
  icona: ReactNode;
  frazione: number;
  colore: string;
  etichetta?: ReactNode;
  valore?: ReactNode;
  info?: ReactNode;
  nome: string;
}) {
  const f = Math.max(0, Math.min(1, frazione));
  return (
    <div className="flex items-center gap-2">
      <span className="w-6 shrink-0 text-center text-base" aria-hidden>
        {icona}
      </span>
      <div className="min-w-0 flex-1">
        {(etichetta || valore) && (
          <div className="mb-1 flex items-baseline gap-1.5 text-[11px] leading-none font-extrabold">
            <span className="min-w-0 flex-1 truncate tracking-wide text-white/85 uppercase">{etichetta}</span>
            {valore !== undefined && <span className="shrink-0 text-xs text-white tabular-nums">{valore}</span>}
          </div>
        )}
        <div
          className="h-2.5 overflow-hidden rounded-full bg-white/10 ring-1 ring-white/10"
          role="meter"
          aria-label={nome}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(f * 100)}
          aria-valuetext={typeof valore === 'string' ? valore : undefined}
        >
          <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${f * 100}%`, background: colore, boxShadow: `0 0 8px ${colore}` }} />
        </div>
      </div>
      {info}
    </div>
  );
}
