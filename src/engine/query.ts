// Read-only views of a game state, for the UI and the harness. None of these changes `stato`.

import { AZIONI, C, DATI, azione, haBottino, haSpesa, type Azione } from '../data/gameData';
import { dataDelGiorno, type Data } from './calendario';
import { Motore, clona, spesaDi } from './motore';
import type { Difesa, ModificatoriTiro, Stato } from './tipi';

const leggi = (s: Stato) => new Motore(s);
const az = (a: Azione | string) => (typeof a === 'string' ? azione(a) : a);

export function data(s: Stato): Data {
  return dataDelGiorno(Math.min(s.giorno, C.GIORNI - 1));
}

/** Can the action be started now (slot, rep, cooldown, condition, vehicle, energy, money...)? */
export function disponibile(s: Stato, a: Azione | string): boolean {
  return leggi(s).disponibile(az(a));
}

/** Actions available now, in data order. */
export function azioniDisponibili(s: Stato): Azione[] {
  if (s.modo === 'ospedale' || s.modo === 'fine' || s.attesa) return [];
  if (s.modo === 'slot' && leggi(s).deveDormire()) return [];
  const m = leggi(s);
  return AZIONI.filter((a) => m.disponibile(a));
}

/** Investment in euro at slider position t (0 / 0.5 / 1). */
export function spesa(a: Azione | string, t: number): number {
  return spesaDi(az(a), t);
}

export function puoInvestire(a: Azione | string): boolean {
  return haSpesa(az(a));
}

/** [gabbio, ospedale] probabilities with every modifier active today. */
export function rischi(s: Stato, a: Azione | string, t: number): [number, number] {
  return leggi(s).rischi(az(a), t);
}

/** Expected loot at slider position t, with rep, hot zone and today's condition (no class bonus). */
export function bottinoAtteso(s: Stato, a: Azione | string, t: number): number {
  const x = az(a);
  return leggi(s).bottino_atteso(x, t, spesaDi(x, t));
}

export function moltiplicatoreBottino(s: Stato, a: Azione | string): number {
  return leggi(s).moltiplicatore_bottino(az(a));
}

export function costoEnergia(s: Stato, a: Azione | string): number {
  return leggi(s).costo_energia(az(a));
}

export function slotNecessari(s: Stato, a: Azione | string): number {
  return leggi(s).slot_necessari(az(a));
}

export function zonaCalda(s: Stato, id: string): number {
  return leggi(s).zona_calda(id);
}

export function noia(s: Stato, id: string): number {
  return leggi(s).noia(id);
}

export function repChill(s: Stato, a: Azione | string): number {
  return leggi(s).rep_chill(az(a));
}

export function repTiktok(s: Stato, a: Azione | string): number {
  return leggi(s).rep_tiktok(az(a));
}

export function energiaMaxOggi(s: Stato): number {
  return leggi(s).energia_max_oggi();
}

export function puoDormire(s: Stato): boolean {
  return s.modo === 'slot' && !s.attesa && leggi(s).puo_dormire();
}

/** Night without having slept: the only way forward is DORMI. */
export function deveDormire(s: Stato): boolean {
  return !s.attesa && leggi(s).deveDormire();
}

export function puoComprare(s: Stato, id: string): boolean {
  return s.modo !== 'fine' && !s.attesa && leggi(s).puoComprare(id);
}

export function dripTot(s: Stato): number {
  return leggi(s).drip_tot();
}

export function dripMax(s: Stato): number {
  return leggi(s).drip_max();
}

export function patrimonio(s: Stato): number {
  return leggi(s).patrimonio();
}

/** MARANZA POINTS (with the game-over penalty if the run ended early). */
export function punti(s: Stato): number {
  return leggi(s).punti();
}

// --- labels driven by thresholds in game-data.json (GDD §Interfaccia) -------------------------

/** Rep grade id: the first GRADI_REP entry whose threshold the rep has reached, from the top. */
export function gradoRep(rep: number): string {
  let g = C.GRADI_REP[0]![1] as string;
  for (const [soglia, nome] of C.GRADI_REP) if (rep >= (soglia as number)) g = nome as string;
  return g;
}

/**
 * Risk band of a probability (gabbio + ospedale) from RISCHIO_COLORI. GDD §Interfaccia: basso below the
 * first threshold, then each band up to and including its threshold (medio 8–15%, alto 16–30%).
 */
export function fasciaRischio(p: number): string {
  const [primo, ...altri] = C.RISCHIO_COLORI;
  if (p < (primo![0] as number)) return primo![1] as string;
  for (const [soglia, nome] of altri) if (p <= (soglia as number)) return nome as string;
  return C.RISCHIO_COLORI[C.RISCHIO_COLORI.length - 1]![1] as string;
}

/** Energy cost as 1-4 lightning bolts. */
export function fulmini(energia: number): number {
  for (const [soglia, n] of C.UI_FULMINI) if (energia <= soglia!) return n!;
  return C.UI_FULMINI[C.UI_FULMINI.length - 1]![1]!;
}

/** Expected loot as €, €€, €€€. */
export function simboliBottino(euro: number): string {
  for (const [soglia, simboli] of C.UI_BOTTINO_SIMBOLI) if (euro < (soglia as number)) return simboli as string;
  return C.UI_BOTTINO_SIMBOLI[C.UI_BOTTINO_SIMBOLI.length - 1]![1] as string;
}

// --- details behind the (?) (GDD §Interfaccia) ---------------------------------------------------

/** Class factor applied to every income (Pakistano, Africano), already in `bottinoIntervallo`. */
export function moltiplicatoreIncasso(s: Stato): number {
  return leggi(s).moltiplicatore_incasso();
}

/**
 * What the action can put in your pocket at slider position t: [min, max] with every multiplier
 * of today (rep, hot zone, condition) and the class factor; null for actions without loot.
 */
export function bottinoIntervallo(s: Stato, a: Azione | string, t: number): [number, number] | null {
  const m = leggi(s);
  const A = az(a);
  const molt = m.moltiplicatore_bottino(A) * m.moltiplicatore_incasso();
  if (A.bottino_x) {
    const [lo, hi] = A.bottino_x as [number, number];
    const sp = spesaDi(A, t);
    return [sp * lo * molt, sp * hi * molt];
  }
  if (!haBottino(A)) return null;
  const [lo, hi] = A.bottino as [number, number];
  return [(lo + C.INVESTIMENTO_BOTTINO_MIN * t * (hi - lo)) * molt, hi * molt];
}

/** Sentence the judge would ask if caught now (days before rounding, recidivism included) and the fine. */
export function penaRichiesta(s: Stato, a: Azione | string): { giorni: number; multa: number } {
  const A = az(a);
  return { giorni: leggi(s).pena_base(A), multa: A.multa };
}

/** One modifier of today on an action's risk, for lines like "Blitz: +10%" or "Passamontagna: −5%". */
export interface VoceRischio {
  fonte: 'classe' | 'veicolo' | 'attrezzo' | 'condizione' | 'attenzionato';
  /** Class, shop item, condition id, or 'attenzionato'. */
  id: string;
  /** 'piu': adds `valore` to the probability; 'per': multiplies it by `valore`. */
  effetto: 'piu' | 'per';
  valore: number;
  su: 'gabbio' | 'gabbio_ospedale';
}

/**
 * The modifiers `rischi` applies today, in its order, with the base values and the final ones.
 * An action without risk has none.
 */
export function modificatoriRischio(
  s: Stato,
  a: Azione | string,
  t: number,
): { base: [number, number]; voci: VoceRischio[]; finale: [number, number] } {
  const A = az(a);
  const tags = A.tags as string[];
  const base: [number, number] = [A.gabbio[0] + t * (A.gabbio[1] - A.gabbio[0]), A.ospedale];
  const voci: VoceRischio[] = [];
  const finale = rischi(s, A, t);
  if (base[0] === 0 && base[1] === 0) return { base, voci, finale };
  const v = (fonte: VoceRischio['fonte'], id: string, effetto: VoceRischio['effetto'], valore: number, su: VoceRischio['su']) =>
    voci.push({ fonte, id, effetto, valore, su });
  if (s.classe === 'Africano') v('classe', s.classe, 'per', C.FUGA_AFRICANO_MULT, 'gabbio');
  if (s.classe === 'Balcanico' && tags.includes('FORZA')) v('classe', s.classe, 'per', C.FORZA_BRUTA_MULT, 'gabbio_ospedale');
  const mezzo = s.items.find((i) => {
    const o = DATI.negozio[i as keyof typeof DATI.negozio];
    return o.tipo === 'veicolo' && 'livello' in o && o.livello === s.veicolo;
  });
  if (tags.includes('VEICOLO') && s.veicolo)
    v('veicolo', mezzo ?? '', 'piu', -C.RISCHIO_FUGA_VEICOLO_PT * s.veicolo, 'gabbio');
  if (A.veicolo_req && s.veicolo === DATI.negozio.motorino.livello)
    v('veicolo', 'motorino', 'piu', -C.RISCHIO_VEICOLO_REQ_PT, 'gabbio');
  if (s.items.includes('passamontagna') && tags.includes('NOTTE')) v('attrezzo', 'passamontagna', 'piu', -C.RISCHIO_TOOL_PT, 'gabbio');
  if (s.items.includes('tronchese') && tags.includes('EFFRAZIONE')) v('attrezzo', 'tronchese', 'piu', -C.RISCHIO_TOOL_PT, 'gabbio');
  const c = s.cond;
  if (c) {
    if (c.gabbio_add) v('condizione', c.id, 'piu', c.gabbio_add, 'gabbio');
    for (const [tag, m] of Object.entries(c.risk_tag ?? {})) if (tags.includes(tag)) v('condizione', c.id, 'per', m, 'gabbio_ospedale');
    const rid = c.risk_id?.[A.id];
    if (rid !== undefined) v('condizione', c.id, 'per', rid, 'gabbio');
  }
  if (s.attenzionato > 0) v('attenzionato', 'attenzionato', 'piu', s.attenzionato_val, 'gabbio');
  return { base, voci, finale };
}

/** The five defences with their price and roll bonus; `disponibile` is false for a lawyer you can't pay. */
export function difese(s: Stato): { id: Difesa; costo: number; bonus: number | null; disponibile: boolean }[] {
  const avv = DATI.avvocati as Record<string, { costo: number; bonus: number }>;
  return [
    ...Object.entries(avv).map(([id, { costo, bonus }]) => ({
      id: id as Difesa,
      costo,
      bonus,
      disponibile: s.soldi >= costo,
    })),
    { id: 'patteggia', costo: 0, bonus: null, disponibile: true },
    { id: 'spavaldo', costo: 0, bonus: C.SPAVALDO_TIRO, disponibile: true },
  ];
}

/**
 * Terms of the judge's roll today besides the d100 and the defence. With the defence "spavaldo"
 * the rep it gives is counted before the roll, so "noto in questura" can grow by a little.
 */
export function modificatoriTiro(s: Stato): ModificatoriTiro {
  return leggi(s).modificatori_tiro();
}

/** The next reputation grade above `rep`, or null at the top. */
export function prossimoGrado(rep: number): { soglia: number; nome: string } | null {
  for (const [soglia, nome] of C.GRADI_REP) if ((soglia as number) > rep) return { soglia: soglia as number, nome: nome as string };
  return null;
}

/** What a sleep with this food would do now: energy afterwards, price paid, health afterwards. */
export function anteprimaSonno(s: Stato, cibo: string): { energia: number; costo: number; salute: number } {
  const m = new Motore(clona(s));
  m.dormi(cibo);
  return { energia: m.s.energia, costo: s.soldi - m.s.soldi, salute: m.s.salute };
}

/** Energy after sleeping with this food (Balcanico, heat and low health included). */
export function recuperoSonno(s: Stato, cibo: string): number {
  return anteprimaSonno(s, cibo).energia;
}

/** What the food costs now: 0 if today's food is already paid or free (Lidl shoplifting). */
export function costoCibo(s: Stato, cibo: string): number {
  return anteprimaSonno(s, cibo).costo;
}
