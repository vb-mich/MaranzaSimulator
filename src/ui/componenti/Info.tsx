// The one (?) of the game (GDD §Interfaccia): tap on mobile, click or mouse-over on desktop,
// closed by tapping outside. Everything with numbers behind it uses this.

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { TESTI } from '../../data/testi';

let chiudiAperto: (() => void) | null = null;

const MARGINE = 8;

export function Info({ titolo, children, className = '' }: { titolo?: string; children: ReactNode; className?: string }) {
  const [aperto, setAperto] = useState(false);
  const [fissato, setFissato] = useState(false);
  const bottone = useRef<HTMLButtonElement>(null);
  const fumetto = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; sopra: boolean } | null>(null);
  const id = useId();

  const chiudi = useCallback(() => {
    setAperto(false);
    setFissato(false);
  }, []);

  const apri = useCallback(
    (fissa: boolean) => {
      if (chiudiAperto && chiudiAperto !== chiudi) chiudiAperto();
      chiudiAperto = chiudi;
      setAperto(true);
      if (fissa) setFissato(true);
    },
    [chiudi],
  );

  // place the bubble under the button (or above, if there's no room), inside the viewport
  useLayoutEffect(() => {
    if (!aperto || !bottone.current || !fumetto.current) return;
    const b = bottone.current.getBoundingClientRect();
    // layout size, not getBoundingClientRect: the entry animation scales the bubble
    const f = { width: fumetto.current.offsetWidth, height: fumetto.current.offsetHeight };
    const vw = document.documentElement.clientWidth;
    const vh = window.innerHeight;
    const sopra = b.bottom + f.height + MARGINE > vh && b.top - f.height - MARGINE > 0;
    const top = sopra ? b.top - f.height - 6 : b.bottom + 6;
    const left = Math.min(Math.max(MARGINE, b.left + b.width / 2 - f.width / 2), vw - f.width - MARGINE);
    setPos({ top, left, sopra });
  }, [aperto]);

  useEffect(() => {
    if (!aperto) return;
    const fuori = (e: PointerEvent) => {
      const t = e.target as Node;
      if (bottone.current?.contains(t) || fumetto.current?.contains(t)) return;
      chiudi();
    };
    const via = () => chiudi();
    document.addEventListener('pointerdown', fuori, true);
    window.addEventListener('resize', via);
    window.addEventListener('scroll', via, true);
    return () => {
      document.removeEventListener('pointerdown', fuori, true);
      window.removeEventListener('resize', via);
      window.removeEventListener('scroll', via, true);
      if (chiudiAperto === chiudi) chiudiAperto = null;
    };
  }, [aperto, chiudi]);

  return (
    <>
      <button
        ref={bottone}
        type="button"
        aria-label={titolo ? `${TESTI.info.apri}: ${titolo}` : TESTI.info.apri}
        aria-expanded={aperto}
        aria-describedby={aperto ? id : undefined}
        className={`inline-grid size-6 shrink-0 place-items-center rounded-full border border-ciano/70 bg-notte-800/80 text-xs font-black text-ciano shadow-[0_0_8px_rgb(45_226_230/0.35)] transition active:scale-90 ${aperto ? 'bg-ciano text-notte-950' : ''} ${className}`}
        onClick={(e) => {
          e.stopPropagation();
          if (aperto && fissato) chiudi();
          else apri(true);
        }}
        onPointerEnter={(e) => e.pointerType === 'mouse' && !aperto && apri(false)}
        onPointerLeave={(e) => e.pointerType === 'mouse' && aperto && !fissato && chiudi()}
      >
        ?
      </button>
      {aperto &&
        createPortal(
          <div
            ref={fumetto}
            id={id}
            role="tooltip"
            className="anim-entra-zoom fixed z-[100] w-[min(20rem,calc(100vw-1rem))] rounded-xl border border-ciano/50 bg-notte-900/97 p-3 text-left text-sm leading-snug text-white/90 shadow-[0_8px_32px_rgb(0_0_0/0.6),0_0_14px_rgb(45_226_230/0.25)]"
            style={pos ? { top: pos.top, left: pos.left } : { top: -9999, left: -9999 }}
            onClick={(e) => e.stopPropagation()}
          >
            {titolo && <div className="mb-1.5 text-xs font-black tracking-wider text-ciano uppercase">{titolo}</div>}
            {children}
          </div>,
          document.body,
        )}
    </>
  );
}

/** A label/value line inside a (?). */
export function Riga({ etichetta, valore, forte = false }: { etichetta: ReactNode; valore: ReactNode; forte?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3 py-0.5 ${forte ? 'font-bold text-white' : ''}`}>
      <span className="text-white/70">{etichetta}</span>
      <span className="text-right tabular-nums">{valore}</span>
    </div>
  );
}
