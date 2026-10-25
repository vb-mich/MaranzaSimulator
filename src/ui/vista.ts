// What the screens show about an action, a condition or a modifier, computed from the engine's
// read-only queries. No rule lives here: only how to put the engine's numbers into words.

import { AZIONI, C, DATI, type Azione, type Condizione } from '../data/gameData';
import { TESTI, nomeAzione, nomeOggetto } from '../data/testi';
import {
  bottinoAtteso,
  costoEnergia,
  data,
  fasciaRischio,
  fulmini,
  rischi,
  simboliBottino,
  slotNecessari,
  spesa,
  type Stato,
  type VoceRischio,
} from '../engine';
import { numero, pct, segno } from './formato';

export interface VistaAzione {
  gabbio: number;
  ospedale: number;
  fascia: string;
  energia: number;
  fulmini: number;
  /** €, €€, €€€ or null for actions without loot. */
  simboli: string | null;
  azzardo: boolean;
  trasferta: boolean;
  spesa: number;
}

export function vistaAzione(s: Stato, a: Azione, t: number): VistaAzione {
  const [g, o] = rischi(s, a, t);
  const e = costoEnergia(s, a);
  const atteso = bottinoAtteso(s, a, t);
  return {
    gabbio: g,
    ospedale: o,
    fascia: fasciaRischio(g + o),
    energia: e,
    fulmini: fulmini(e),
    simboli: atteso > 0 ? simboliBottino(atteso) : null,
    azzardo: (a.tags as string[]).includes('AZZARDO'),
    trasferta: slotNecessari(s, a) > 1,
    spesa: spesa(a, t),
  };
}

export type Gruppo = keyof typeof TESTI.gruppi;

export function gruppo(a: Azione): Gruppo {
  const tags = a.tags as string[];
  if (tags.includes('LEGALE')) return 'legale';
  if (tags.includes('AZZARDO')) return 'azzardo';
  return 'reati';
}

/** Odds of a gambling action now: chance to win and payout multiplier of the stake. */
export function quoteAzzardo(s: Stato, a: Azione): { p: number; x: number } | null {
  switch (a.speciale) {
    case 'slot':
      return { p: C.SLOT_VINCITA_P, x: C.SLOT_VINCITA_MULT };
    case 'scommessa':
      return { p: C.SCOMMESSA_VINCITA_P, x: C.SCOMMESSA_VINCITA_MULT };
    case 'poker':
      return { p: C.POKER_VINCITA_P + s.rep / C.POKER_VINCITA_REP_DIV, x: C.POKER_VINCITA_MULT };
    case 'corsa':
      return { p: C.CORSA_VINCITA_P + (s.classe === 'Balcanico' ? C.CORSA_BALCANICO_BONUS : 0), x: C.CORSA_VINCITA_MULT };
    default:
      return null;
  }
}

const mult = (v: number) => numero(v, 2);

/** Display name of a condition: its text, the data name, or "the Boss" for one made by an event. */
export function nomeCondizione(c: Condizione | null): string {
  if (!c) return TESTI.principale.nessunaCondizione;
  if (!c.id) return TESTI.principale.bossTiNota;
  return TESTI.condizioni[c.id]?.oggi ?? c.nome;
}

export function teaserCondizione(c: Condizione): string {
  return TESTI.condizioni[c.id]?.domani ?? `${TESTI.principale.teaser}: ${c.nome}`;
}

const nomiTag = (tags: Record<string, number> | undefined) =>
  Object.entries(tags ?? {}).map(([k, v]) => [TESTI.tag[k] ?? k, v] as const);

const nomiId = (ids: Record<string, number> | undefined) => Object.entries(ids ?? {}).map(([k, v]) => [nomeAzione(k), v] as const);

/** The numeric effects of a condition, one line each (behind the (?) of the day). */
export function effettiCondizione(c: Condizione | null): string[] {
  if (!c) return [TESTI.condizioneEffetti.nessuno];
  const E = TESTI.condizioneEffetti;
  const righe: string[] = [];
  if (c.gabbio_add) righe.push(E.gabbio(segno(c.gabbio_add * 100, 0)));
  if (c.energia_add) righe.push(E.energia(c.energia_add));
  if (c.energia_add_trasferta) righe.push(E.energiaTrasferta(c.energia_add_trasferta));
  if (c.energia_max_mult) righe.push(E.energiaMax(mult(c.energia_max_mult)));
  if (c.abilita) righe.push(E.sblocca);
  if (c.blocca?.length) righe.push(E.blocca(c.blocca.map(nomeAzione).join(', ')));
  for (const [n, v] of [...nomiTag(c.loot_tag), ...nomiId(c.loot_id)]) righe.push(E.bottino(n, mult(v)));
  for (const [n, v] of [...nomiTag(c.risk_tag), ...nomiId(c.risk_id)]) righe.push(E.rischio(n, mult(v)));
  for (const [n, v] of nomiTag(c.rep_tag)) righe.push(E.rep(n, mult(v)));
  return righe.length ? righe : [E.nessuno];
}

/** "Blitz: +10%", "Passamontagna Naik: −5%", "Nebbia fitta: ×0,85". */
export function rigaModificatore(v: VoceRischio, s: Stato): { fonte: string; effetto: string } {
  let fonte: string;
  switch (v.fonte) {
    case 'classe':
      fonte = TESTI.classi[s.classe].nome;
      break;
    case 'veicolo':
    case 'attrezzo':
      fonte = nomeOggetto(v.id);
      break;
    case 'condizione':
      fonte = v.id ? nomeCondizione(s.cond) : TESTI.principale.bossTiNota;
      break;
    case 'attenzionato':
      fonte = TESTI.principale.attenzionato;
      break;
  }
  const effetto = v.effetto === 'piu' ? `${segno(v.valore * 100, 0)}%` : `×${mult(v.valore)}`;
  const su = v.su === 'gabbio' ? TESTI.principale.gabbio : `${TESTI.principale.gabbio} + ${TESTI.principale.ospedale}`;
  return { fonte, effetto: `${effetto} ${su.toLowerCase()}` };
}

/** The Magrebino in Ramadan can't act in the morning and afternoon (an empty list needs a reason). */
export function fermoPerRamadan(s: Stato): boolean {
  if (s.classe !== 'Magrebino') return false;
  const d = data(s);
  const [mi, gi] = C.RAMADAN_INIZIO;
  const [mf, gf] = C.RAMADAN_FINE;
  const dentro = (d.mese === mi && d.giorno >= gi) || (d.mese === mf && d.giorno <= gf);
  return dentro && (C.RAMADAN_SLOT_VIETATI as number[]).includes(s.slot);
}

/** Next rep threshold that unlocks actions, and which ones. */
export function prossimoTier(rep: number): { soglia: number; azioni: string[] } | null {
  const soglia = (C.TIER_REP as number[]).find((t) => t > rep);
  if (soglia === undefined) return null;
  return { soglia, azioni: AZIONI.filter((a) => a.rep_min === soglia).map((a) => nomeAzione(a.id)) };
}

export function percentuale(p: number): string {
  return pct(p, p > 0 && p < 0.1 ? 1 : 0);
}

/** Owned items with the value they add to the patrimonio. */
export function valoriOggetti(s: Stato): { id: string; valore: number }[] {
  const neg = DATI.negozio as Record<string, { valore: number }>;
  return s.items.map((id) => ({ id, valore: (neg[id]?.valore ?? 0) * C.PATRIMONIO_DRIP })).filter((x) => x.valore > 0);
}

/** The numeric effects of a shop item, for its (?). */
export function effettoOggetto(id: string): string[] {
  const N = TESTI.negozio;
  const o = (DATI.negozio as Record<string, { tipo: string; valore: number; effetto?: string; livello?: number }>)[id];
  if (!o) return [];
  const pt = (x: number) => Math.round(x * 100);
  switch (o.tipo) {
    case 'tool':
      return [o.effetto === 'notte' ? N.toolNotte(pt(C.RISCHIO_TOOL_PT)) : N.toolEffrazione(pt(C.RISCHIO_TOOL_PT)), N.attrezzo];
    case 'drip':
      return [N.drip(o.valore, C.CHILL_DRIP_DIV), ...(o.valore > C.TRAPPER_DRIP_MIN ? [N.trapper(C.TRAPPER_DRIP_MIN)] : [])];
    case 'veicolo': {
      const l = o.livello ?? 1;
      const righe = [N.veicolo(pt(C.RISCHIO_FUGA_VEICOLO_PT * l))];
      if (l === DATI.negozio.motorino.livello) righe.push(N.veicoloReq(pt(C.RISCHIO_VEICOLO_REQ_PT)));
      return [...righe, N.sequestro];
    }
    default:
      return [];
  }
}
