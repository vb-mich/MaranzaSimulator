// The Boss's chat, messaging-app style: one contact, one-way, first-time messages only.

import { useEffect, useRef } from 'react';
import { TESTI } from '../../data/testi';
import type { Stato } from '../../engine';
import { ritratto } from '../arte';
import { Foglio } from '../componenti/Foglio';
import { Immagine } from '../componenti/Immagine';
import { useGioco } from '../gioco/contesto';

export function AvatarBoss({ className = 'size-10' }: { className?: string }) {
  return <Immagine src={ritratto('boss')?.src ?? null} nome="boss" alt={TESTI.chat.nome} className={`shrink-0 rounded-full ring-2 ring-sole ${className}`} />;
}

export function Fumetto({ id, nuovo = false }: { id: string; nuovo?: boolean }) {
  return (
    <div className={`max-w-[85%] rounded-2xl rounded-tl-sm px-3 py-2 text-[15px] leading-snug shadow ${nuovo ? 'anim-entra-zoom bg-[#1f5c3d]' : 'bg-[#1d3b2a]'}`}>
      {TESTI.boss[id] ?? id}
    </div>
  );
}

export function PannelloChat({ s }: { s: Stato }) {
  const { ui, invia } = useGioco();
  const fondo = useRef<HTMLDivElement>(null);
  const letti = ui.meta.bossLetti;
  useEffect(() => {
    fondo.current?.scrollIntoView({ block: 'end' });
    invia({ tipo: 'CHAT_LETTA' });
  }, [invia, s.boss.length]);
  return (
    <Foglio
      alto
      onChiudi={() => invia({ tipo: 'PANNELLO', pannello: null })}
      titolo={
        <span className="flex items-center gap-2">
          <AvatarBoss className="size-9" />
          <span className="leading-tight">
            {TESTI.chat.nome}
            <span className="block text-xs font-semibold text-rischio-basso">{TESTI.chat.stato}</span>
          </span>
        </span>
      }
    >
      <div className="flex min-h-full flex-col gap-2 rounded-xl bg-[url('data:image/svg+xml,%3Csvg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2232%22%20height=%2232%22%3E%3Ccircle%20cx=%222%22%20cy=%222%22%20r=%221%22%20fill=%22%23ffffff10%22/%3E%3C/svg%3E')] p-2">
        {s.boss.length === 0 && <p className="py-8 text-center text-sm text-white/50">{TESTI.chat.vuoto}</p>}
        {s.boss.map((id, i) => (
          <Fumetto key={id} id={id} nuovo={i >= letti} />
        ))}
        <div ref={fondo} />
      </div>
      <p className="pt-2 text-center text-xs text-white/40">{TESTI.chat.scrivi}</p>
    </Foglio>
  );
}
