// At most two short notes at the top of the screen; a Boss note opens the chat.

import { useGioco } from '../gioco/contesto';

export function Toasts() {
  const { ui, invia } = useGioco();
  // the open chat already shows the Boss's words: no toast on top of its header
  if (ui.toast.length === 0 || ui.pannello === 'chat') return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] mx-auto flex max-w-md flex-col gap-1.5 px-3 pt-[max(0.5rem,env(safe-area-inset-top))]" aria-live="polite">
      {ui.toast.map((t) => (
        <button
          key={t.id}
          type="button"
          className={`anim-entra-zoom pointer-events-auto flex items-start gap-2 rounded-xl border px-3 py-2 text-left text-sm font-semibold shadow-lg ${t.boss ? 'border-sole/60 bg-[#1d3b2a]/95 text-white' : 'border-white/15 bg-notte-800/95 text-white/95'}`}
          onClick={() => {
            invia({ tipo: 'TOGLI_TOAST', id: t.id });
            if (t.boss) invia({ tipo: 'PANNELLO', pannello: 'chat' });
          }}
        >
          <span aria-hidden>{t.icona}</span>
          <span className="min-w-0 flex-1">{t.testo}</span>
        </button>
      ))}
    </div>
  );
}
