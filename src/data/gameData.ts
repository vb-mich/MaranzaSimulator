// Loader and types of data/game-data.json, the single source of every balancing number.
// The types are inferred from the JSON itself, so they follow the file when
// sim/export_data.py regenerates it; the aliases below only give names to its parts.

import raw from '../../data/game-data.json';

export type GameData = typeof raw;
export type Costanti = GameData['costanti'];
export type Classe = keyof GameData['classi'];
export type Azione = GameData['azioni'][number];
export type Cibo = GameData['cibo'][number];
export type IdOggetto = keyof GameData['negozio'];
export type Oggetto = GameData['negozio'][IdOggetto];
export type Avvocato = keyof GameData['avvocati'];
export type Guaio = GameData['guai'][number];

/** Effects a day can carry: a calendar condition, a holiday, or one modified by an event. */
export interface Condizione {
  id: string;
  nome: string;
  p?: number;
  gabbio_add?: number;
  energia_add?: number;
  energia_add_trasferta?: number;
  energia_max_mult?: number;
  abilita?: string;
  blocca?: string[];
  loot_tag?: Record<string, number>;
  loot_id?: Record<string, number>;
  risk_tag?: Record<string, number>;
  risk_id?: Record<string, number>;
  rep_tag?: Record<string, number>;
  stagione?: number[];
  solo_giorno_mese?: number;
  mese?: number;
  giorno?: number;
}

export const DATI: GameData = raw;
export const C: Costanti = raw.costanti;

export const CLASSI = Object.keys(raw.classi) as Classe[];
export const AZIONI: readonly Azione[] = raw.azioni;
// The inferred JSON types mark missing keys of each record as `undefined`: read them as Condizione.
export const CONDIZIONI = raw.condizioni as unknown as readonly Condizione[];
export const FESTE = raw.feste as unknown as readonly Condizione[];
export const GUAI: readonly Guaio[] = raw.guai;
export const NEGOZIO: Readonly<Record<string, Oggetto>> = raw.negozio;

const perId = new Map(AZIONI.map((a) => [a.id, a]));

export function azione(id: string): Azione {
  const a = perId.get(id);
  if (!a) throw new Error(`azione sconosciuta: ${id}`);
  return a;
}

export function oggetto(id: string): Oggetto {
  const o = NEGOZIO[id];
  if (!o) throw new Error(`oggetto sconosciuto: ${id}`);
  return o;
}

export function isClasse(x: string): x is Classe {
  return Object.hasOwn(raw.classi, x);
}

/** Python `a["bottino"] != (0, 0)`. */
export function haBottino(a: Azione): boolean {
  return a.bottino[0] !== 0 || a.bottino[1] !== 0;
}

/** Python `a["spesa"] != (0, 0)`. */
export function haSpesa(a: Azione): boolean {
  return a.spesa[0] !== 0 || a.spesa[1] !== 0;
}

/** Python `a["gabbio"] != (0.0, 0.0) or a["ospedale"] > 0`. */
export function haRischio(a: Azione): boolean {
  return a.gabbio[0] !== 0 || a.gabbio[1] !== 0 || a.ospedale > 0;
}
