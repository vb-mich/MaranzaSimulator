// The character on the main screen: class portrait plus the drip layers it owns (and the bandage
// when health is low), placed with the anchors of the art manifest.

import { C, type Classe } from '../../data/gameData';
import { ritratto, strati } from '../arte';
import { Immagine } from './Immagine';

/** Portrait aspect ratio when the art isn't there (the class portraits are 2:3). */
const PROPORZIONE = 2 / 3;

export function Personaggio({
  classe,
  items = [],
  salute = C.SALUTE_MAX,
  className = '',
}: {
  classe: Classe;
  items?: string[];
  salute?: number;
  className?: string;
}) {
  const r = ritratto(classe);
  const capi = salute < C.SALUTE_BASSA_SOGLIA ? [...items, 'fasciato'] : items;
  const layer = strati(classe, capi);
  return (
    <div
      className={`relative ${className}`}
      style={{ aspectRatio: r ? `${r.w} / ${r.h}` : String(PROPORZIONE) }}
      data-capi={layer.map((l) => l.id).join(' ')}
    >
      <Immagine src={r?.src ?? null} nome={classe} cover={false} className="absolute inset-0 size-full rounded-lg" alt={classe} />
      {layer.map((l) => (
        <img
          key={l.id}
          src={l.src}
          alt=""
          draggable={false}
          className="pointer-events-none absolute h-auto max-w-none"
          style={{
            width: `${l.ancora.larghezza * 100}%`,
            left: `${l.ancora.x * 100}%`,
            top: `${l.ancora.y * 100}%`,
            transform: `translate(-50%, -50%) rotate(${l.ancora.rot}deg)${l.ancora.specchio ? ' scaleX(-1)' : ''}`,
          }}
        />
      ))}
    </div>
  );
}
