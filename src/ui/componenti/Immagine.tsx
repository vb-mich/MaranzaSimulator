// An image from the art manifest, or a coloured placeholder with the asset name until the art exists.

import { useState, type CSSProperties } from 'react';

const TINTE = ['#482a7a', '#5b1f5e', '#1f4a6e', '#5e3a1f', '#2f5e3a', '#5e1f33'];

function tinta(nome: string): string {
  let h = 0;
  for (const c of nome) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TINTE[h % TINTE.length]!;
}

export function Immagine({
  src,
  nome,
  className = '',
  style,
  alt = '',
  cover = true,
}: {
  src: string | null;
  nome: string;
  className?: string;
  style?: CSSProperties;
  alt?: string;
  cover?: boolean;
}) {
  const [rotta, setRotta] = useState<string | null>(null);
  if (!src || rotta === src)
    return (
      <div
        className={`grid place-items-center overflow-hidden border border-dashed border-white/25 p-1 text-center text-[10px] leading-tight font-bold break-all text-white/60 ${className}`}
        style={{ background: tinta(nome), ...style }}
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
      >
        {nome}
      </div>
    );
  return (
    <img
      src={src}
      alt={alt}
      draggable={false}
      loading="lazy"
      decoding="async"
      className={`${cover ? 'object-cover' : 'object-contain'} ${className}`}
      style={style}
      onError={() => setRotta(src)}
    />
  );
}
