// Bottom sheet: panels (sleep, shop, chat, menu) slide up over the main screen.

import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

export function Foglio({
  titolo,
  onChiudi,
  children,
  testata,
  alto = false,
}: {
  titolo: ReactNode;
  onChiudi: () => void;
  children: ReactNode;
  testata?: ReactNode;
  alto?: boolean;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onChiudi();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onChiudi]);
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true">
      <button type="button" aria-label="Chiudi" className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" onClick={onChiudi} />
      <div
        className={`anim-entra-su pb-sicuro relative flex w-full max-w-md flex-col rounded-t-3xl border-t border-rosa/40 bg-notte-900 shadow-[0_-8px_40px_rgb(255_62_165/0.25)] ${alto ? 'h-[88dvh]' : 'max-h-[88dvh]'}`}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-4 pt-3 pb-2.5">
          <div className="min-w-0 flex-1 text-lg font-black">{titolo}</div>
          {testata}
          <button type="button" onClick={onChiudi} aria-label="Chiudi" className="grid size-9 place-items-center rounded-full bg-white/10 text-xl leading-none">
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-3 pb-2">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
