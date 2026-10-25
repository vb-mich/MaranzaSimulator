// Art lookup. The art (public/art/**.webp + assets/art/manifest.json) lives on its own branch until
// phase 6: the manifest is loaded with a glob, so without it every lookup returns null and the
// components draw placeholders. Once the art is merged, everything lights up with no code change.

import type { Classe } from '../data/gameData';

export interface Ancora {
  x: number;
  y: number;
  larghezza: number;
  rot: number;
  specchio?: boolean;
  file?: string;
}

export interface VoceStrato {
  file: string;
  w: number;
  h: number;
  z: number;
  ancore: Partial<Record<Classe, Ancora>> | null;
}

interface Manifesto {
  web: string;
  personaggi: Record<string, { file: string; w: number; h: number }>;
  drip: Record<string, VoceStrato>;
  fasciato?: VoceStrato;
  oggetti: Record<string, string>;
  luoghi: Record<string, string>;
  azioni: Record<string, string>;
  ui: Record<string, string>;
}

const trovati = import.meta.glob<Manifesto>('../../assets/art/manifest.json', { eager: true, import: 'default' });
const manifesto: Manifesto | null = Object.values(trovati)[0] ?? null;

export const arteDisponibile = manifesto !== null;

const url = (file: string | undefined) =>
  file && manifesto ? `${import.meta.env.BASE_URL}${manifesto.web}${file}` : null;

export type Sezione = 'oggetti' | 'luoghi' | 'azioni' | 'ui';

/** URL of a flat asset (item, location, action, UI icon), or null when the art isn't there. */
export function arte(sezione: Sezione, id: string): string | null {
  return url(manifesto?.[sezione][id]);
}

export function ritratto(id: string): { src: string; w: number; h: number } | null {
  const p = manifesto?.personaggi[id];
  const src = url(p?.file);
  return p && src ? { src, w: p.w, h: p.h } : null;
}

export interface Strato {
  id: string;
  src: string;
  z: number;
  ancora: Ancora;
}

/**
 * Clothing layers for a class, in drawing order (`z` ascending). Each layer is placed with its
 * centre at (x·W, y·H), width `larghezza`·W, rotated `rot` degrees clockwise, like tools/ottimizza-art.py.
 */
export function strati(classe: Classe, capi: string[]): Strato[] {
  if (!manifesto) return [];
  const out: Strato[] = [];
  for (const id of capi) {
    const voce = id === 'fasciato' ? manifesto.fasciato : manifesto.drip[id];
    const ancora = voce?.ancore?.[classe];
    const src = url(ancora?.file ?? voce?.file);
    if (voce && ancora && src) out.push({ id, src, z: voce.z, ancora });
  }
  return out.sort((a, b) => a.z - b.z);
}
