// Full-screen outcome cards: one sentence, the result, one button (GDD §Interfaccia, "Esito").

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { C } from '../../data/gameData';
import { TESTI, nomeAzione, scegliRiga } from '../../data/testi';
import { fasciaRischio, type Stato } from '../../engine';
import { arte, ritratto } from '../arte';
import { Immagine } from '../componenti/Immagine';
import { Info, Riga } from '../componenti/Info';
import { euroDelta, giorni, numero, segno } from '../formato';
import type { Carta } from '../gioco/esiti';
import { useGioco } from '../gioco/contesto';
import { AvatarBoss, Fumetto } from '../pannelli/Chat';
import { movimentoRidotto } from '../movimento';
import { percentuale } from '../vista';

/** Rep changes smaller than this are noise (decay, rounding) and get no chip. */
const REP_VISIBILE = 0.05;

const hash = (x: string) => [...x].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

export function CartaEsito({ carta, s }: { carta: Carta; s: Stato }) {
  const { invia } = useGioco();
  const avanti = () => invia({ tipo: 'CHIUDI_CARTA' });
  switch (carta.tipo) {
    case 'azione':
      return <CartaAzione carta={carta} s={s} onAvanti={avanti} />;
    case 'verdetto':
      return <CartaVerdetto carta={carta} s={s} onAvanti={avanti} />;
    case 'guaio':
      return <CartaGuaio carta={carta} s={s} onAvanti={avanti} />;
    case 'ricovero':
      return (
        <Cornice s={s} onAvanti={avanti} immagine={<Img sezione="ui" id="esito-ospedale" />} tono="male">
          <Titolo>{TESTI.esito.maleTitolo}</Titolo>
          <Grande colore="text-rischio-alto">{TESTI.esito.ospedaleGiorni(giorni(carta.ricovero.giorni))}</Grande>
          {carta.ricovero.furto > 0 && <Chip>💸 {TESTI.esito.furto(euroDelta(-carta.ricovero.furto))}</Chip>}
        </Cornice>
      );
    case 'uscita':
      return (
        <Cornice s={s} onAvanti={avanti} immagine={<Img sezione="luoghi" id={carta.da === 'galera' ? 'piazza' : 'parchetto'} largo />} tono="bene">
          <Titolo>{carta.da === 'galera' ? TESTI.esito.uscitaGalera : TESTI.esito.uscitaOspedale}</Titolo>
          <p className="text-white/80">{carta.da === 'galera' ? TESTI.esito.uscitaGaleraTesto : TESTI.esito.uscitaOspedaleTesto}</p>
        </Cornice>
      );
    case 'boss':
      return (
        <Cornice s={s} onAvanti={avanti} immagine={<AvatarBoss className="size-28" />} tono="boss">
          <div className="text-sm font-black tracking-wider text-sole uppercase">{TESTI.chat.nuovo}</div>
          <div className="flex w-full justify-start text-left">
            <Fumetto id={carta.id} nuovo />
          </div>
        </Cornice>
      );
  }
}

/** How long the breath is held before the outcome, by risk band: a safe shift barely pauses. */
const DURATA_SUSPENSE: Record<string, number> = { basso: 700, medio: 1400, alto: 2000, estremo: 2500 };
const DURATA_SUSPENSE_AZZARDO = 1900;

/** Colour of the heartbeat glow while waiting, the same as the risk dots of the action list. */
const BAGLIORE_FASCIA: Record<string, string> = {
  basso: 'var(--color-rischio-basso)',
  medio: 'var(--color-rischio-medio)',
  alto: 'var(--color-rischio-alto)',
  estremo: 'var(--color-rischio-estremo)',
};

function CartaAzione({ carta, s, onAvanti }: { carta: Extract<Carta, { tipo: 'azione' }>; s: Stato; onAvanti: () => void }) {
  // with reduced motion the outcome shows at once
  const [fermo, setFermo] = useState(movimentoRidotto);
  const fine = useCallback(() => setFermo(true), []);
  if (!fermo) return <Suspense carta={carta} s={s} onFine={fine} />;
  return <EsitoAzione carta={carta} s={s} onAvanti={onAvanti} />;
}

/**
 * The held breath after "Fallo": the action art trembles, a heartbeat glows in the colour of the
 * risk and a bar fills; riskier actions make you wait longer. A tap skips it.
 */
function Suspense({ carta, s, onFine }: { carta: Extract<Carta, { tipo: 'azione' }>; s: Stato; onFine: () => void }) {
  const e = carta.azione;
  const azzardo = e.vinto !== null;
  const fascia = fasciaRischio(carta.rischi[0] + carta.rischi[1]);
  const durata = azzardo ? DURATA_SUSPENSE_AZZARDO : (DURATA_SUSPENSE[fascia] ?? DURATA_SUSPENSE.basso!);
  const righe = TESTI.suspense.righe[azzardo ? 'azzardo' : fascia] ?? TESTI.suspense.righe.basso!;
  useEffect(() => {
    const t = setTimeout(onFine, durata);
    return () => clearTimeout(t);
  }, [durata, onFine]);
  const colore = azzardo ? 'var(--color-sole)' : (BAGLIORE_FASCIA[fascia] ?? BAGLIORE_FASCIA.basso!);
  // the heart beats faster the riskier it gets
  const battito = `${Math.max(0.45, 1.1 - durata / 5000)}s`;
  return (
    <Cornice
      s={s}
      onAvanti={onFine}
      bottone={TESTI.suspense.subito}
      tono="boss"
      sotto={nomeAzione(e.id)}
      immagine={
        <div className="relative grid place-items-center py-2">
          <div className="anim-battito absolute size-48 rounded-full" style={{ background: `radial-gradient(circle, ${colore} 0%, transparent 68%)`, animationDuration: battito }} aria-hidden />
          <div className={azzardo ? 'anim-gira' : 'anim-trema'} style={{ animationDuration: azzardo ? '0.5s' : battito }}>
            <Img sezione="azioni" id={e.id} />
          </div>
        </div>
      }
    >
      <Titolo>
        <span className="anim-entra-su inline-block">{scegliRiga(righe, carta.giorno * 7 + hash(e.id))}</span>
      </Titolo>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/10" role="progressbar" aria-label={TESTI.suspense.subito}>
        <div className="anim-riempi h-full origin-left rounded-full" style={{ background: colore, animationDuration: `${durata}ms` }} />
      </div>
    </Cornice>
  );
}

function EsitoAzione({ carta, s, onAvanti }: { carta: Extract<Carta, { tipo: 'azione' }>; s: Stato; onAvanti: () => void }) {
  const e = carta.azione;
  const t = TESTI.azioni[e.id];
  const E = TESTI.esito;
  const seme = carta.giorno * 13 + hash(e.id);
  const numeri = (
    <Info titolo={E.rischiCorsi}>
      <Riga etichetta={TESTI.principale.gabbio} valore={percentuale(carta.rischi[0])} />
      <Riga etichetta={TESTI.principale.ospedale} valore={percentuale(carta.rischi[1])} />
      {e.risultato !== 'ok' && <p className="mt-1 text-xs text-white/60">{E.tiroRischio}</p>}
      {e.soldi !== 0 && <Riga etichetta={TESTI.hud.soldi} valore={euroDelta(e.soldi)} />}
      {Math.abs(e.rep) >= 0.005 && <Riga etichetta={TESTI.principale.rep} valore={segno(e.rep, 2)} />}
    </Info>
  );
  if (e.risultato === 'gabbio')
    return (
      <Cornice s={s} onAvanti={onAvanti} immagine={<Img sezione="ui" id="esito-arresto" />} tono="male" numeri={numeri} sotto={nomeAzione(e.id)}>
        <Titolo>{E.beccato}</Titolo>
        <p className="text-white/80">{E.beccatoTesto}</p>
        <div className="flex flex-wrap justify-center gap-1.5">
          {carta.arresto && carta.arresto.sequestro > 0 && <Chip>👮 {E.sequestro(euroDelta(-carta.arresto.sequestro))}</Chip>}
          {carta.arresto?.veicolo_sequestrato && <Chip>🛴 {E.veicoloSequestrato}</Chip>}
        </div>
      </Cornice>
    );
  if (e.risultato === 'ospedale')
    return (
      <Cornice s={s} onAvanti={onAvanti} immagine={<Img sezione="ui" id="esito-ospedale" />} tono="male" numeri={numeri} sotto={nomeAzione(e.id)}>
        <Titolo>{E.maleTitolo}</Titolo>
        {carta.ricovero && <Grande colore="text-rischio-alto">{E.ospedaleGiorni(giorni(carta.ricovero.giorni))}</Grande>}
        {carta.ricovero && carta.ricovero.furto > 0 && <Chip>💸 {E.furto(euroDelta(-carta.ricovero.furto))}</Chip>}
      </Cornice>
    );
  const righe = e.vinto === true ? t?.vinto : e.vinto === false ? t?.perso : t?.ok;
  const bene = e.vinto !== false;
  return (
    <Cornice s={s} onAvanti={onAvanti} immagine={<div className="anim-atterra"><Img sezione="azioni" id={e.id} /></div>} tono={bene ? 'bene' : 'male'} numeri={numeri} sotto={nomeAzione(e.id)}>
      {e.virale && <div className="anim-pulsa text-3xl font-black text-rosa italic">{E.virale}</div>}
      <Titolo>{scegliRiga(righe ?? [], seme)}</Titolo>
      {e.soldi !== 0 && <Grande colore={e.soldi > 0 ? 'text-sole' : 'text-rischio-alto'}>{euroDelta(e.soldi)}</Grande>}
      <div className="flex flex-wrap justify-center gap-1.5">
        <ChipRep rep={e.rep} />
        {e.veicolo && <Chip>🛴 {E.veicolo}</Chip>}
      </div>
    </Cornice>
  );
}

/** How long the judge's die tumbles before the verdict shows. */
const DURATA_DADO = 1300;

/** Die colour once it lands: the verdict in a glance, the roll itself stays behind the (?). */
const COLORE_DADO: Record<string, string> = {
  assolto: 'bg-rischio-basso',
  messa_alla_prova: 'bg-ciano',
  ridotta: 'bg-sole',
  piena: 'bg-rischio-alto',
  aggravata: 'bg-rischio-estremo',
};

function CartaVerdetto({ carta, s, onAvanti }: { carta: Extract<Carta, { tipo: 'verdetto' }>; s: Stato; onAvanti: () => void }) {
  const v = carta.verdetto;
  const V = TESTI.verdetto;
  const testo = TESTI.verdetti[v.esito]!;
  const buono = v.esito === 'assolto' || v.esito === 'messa_alla_prova';
  const S = C.TRIBUNALE_SOGLIE;
  // plea-bargaining has no roll; with reduced motion the die lands at once
  const [fermo, setFermo] = useState(() => v.dado === null || movimentoRidotto());
  useEffect(() => {
    if (fermo) return;
    const t = setTimeout(() => setFermo(true), DURATA_DADO);
    return () => clearTimeout(t);
  }, [fermo]);

  if (!fermo)
    return (
      <Cornice
        s={s}
        onAvanti={() => setFermo(true)}
        bottone={V.subito}
        tono="boss"
        sotto={TESTI.tribunale.imputato(nomeAzione(carta.azione))}
        immagine={<Immagine src={ritratto('giudice')?.src ?? null} nome="giudice" className="aspect-square w-40 rounded-2xl" />}
      >
        <div className="grid size-24 place-items-center rounded-3xl bg-white/10 text-6xl">
          <span className="anim-rotola inline-block" aria-hidden>
            🎲
          </span>
        </div>
        <Titolo>{V.tira}</Titolo>
      </Cornice>
    );

  return (
    <Cornice
      s={s}
      onAvanti={onAvanti}
      tono={buono ? 'bene' : 'male'}
      sotto={TESTI.tribunale.imputato(nomeAzione(carta.azione))}
      immagine={
        <div className="relative">
          <Immagine src={ritratto(buono ? 'giudice-assolto' : 'giudice-condanna')?.src ?? null} nome="giudice" className="aspect-square w-40 rounded-2xl" />
          {v.dado !== null && (
            <span className={`anim-atterra absolute -right-4 -bottom-3 grid size-14 place-items-center rounded-2xl text-3xl shadow-lg ring-2 ring-white/40 ${COLORE_DADO[v.esito] ?? 'bg-white/20'}`} aria-hidden>
              🎲
            </span>
          )}
        </div>
      }
      numeri={
        <Info titolo={TESTI.tribunale.tiro}>
          <Riga etichetta={TESTI.difese[v.difesa]} valore="" />
          {v.dado !== null && <Riga etichetta={V.dado} valore={v.dado} />}
          {v.tiro !== null && <Riga etichetta={V.tiro} valore={numero(v.tiro, 1)} forte />}
          <div className="mt-1.5 border-t border-white/10 pt-1.5 text-xs">
            <Riga etichetta={TESTI.verdetti.assolto!.titolo} valore={`≥ ${S.assolto}`} />
            <Riga etichetta={TESTI.verdetti.messa_alla_prova!.titolo} valore={`${S.messa_alla_prova}–${S.assolto - 1}`} />
            <Riga etichetta={TESTI.verdetti.ridotta!.titolo} valore={`${S.ridotta}–${S.messa_alla_prova - 1}`} />
            <Riga etichetta={TESTI.verdetti.piena!.titolo} valore={`${S.piena}–${S.ridotta - 1}`} />
            <Riga etichetta={TESTI.verdetti.aggravata!.titolo} valore={`< ${S.piena}`} />
          </div>
        </Info>
      }
    >
      <Titolo>{testo.titolo}</Titolo>
      <p className="text-white/80">{testo.testo}</p>
      <Grande colore={v.pena > 0 ? 'text-rischio-alto' : 'text-rischio-basso'}>{v.pena > 0 ? V.galera(giorni(v.pena)) : V.libero}</Grande>
      <div className="flex flex-wrap justify-center gap-1.5">
        {v.soldi !== 0 && <Chip>💸 {euroDelta(v.soldi)}</Chip>}
        {v.giorni_multa > 0 && <Chip>⛓️ {V.giorniMulta(giorni(v.giorni_multa))}</Chip>}
        <ChipRep rep={v.rep} />
      </div>
    </Cornice>
  );
}

function CartaGuaio({ carta, s, onAvanti }: { carta: Extract<Carta, { tipo: 'guaio' }>; s: Stato; onAvanti: () => void }) {
  const g = carta.guaio;
  const t = TESTI.guai[g.guaio];
  return (
    <Cornice
      s={s}
      onAvanti={onAvanti}
      tono={g.soldi < 0 || g.rep < -REP_VISIBILE || carta.ricovero ? 'male' : 'bene'}
      sotto={TESTI.guaio.etichetta}
      immagine={<div className="grid size-28 place-items-center rounded-full bg-white/10 text-6xl">{t?.icona ?? '❗'}</div>}
      numeri={
        g.soldi !== 0 || Math.abs(g.rep) >= 0.005 ? (
          <Info titolo={t?.titolo}>
            {g.soldi !== 0 && <Riga etichetta={TESTI.hud.soldi} valore={euroDelta(g.soldi)} />}
            {Math.abs(g.rep) >= 0.005 && <Riga etichetta={TESTI.principale.rep} valore={segno(g.rep, 2)} />}
          </Info>
        ) : undefined
      }
    >
      <div className="text-sm font-black tracking-wider text-sole uppercase">{t?.titolo ?? g.guaio}</div>
      <Titolo>{t?.risultati[g.risultato] ?? g.risultato}</Titolo>
      {g.soldi !== 0 && <Grande colore={g.soldi > 0 ? 'text-sole' : 'text-rischio-alto'}>{euroDelta(g.soldi)}</Grande>}
      {carta.ricovero && <Grande colore="text-rischio-alto">{TESTI.esito.ospedaleGiorni(giorni(carta.ricovero.giorni))}</Grande>}
      <div className="flex flex-wrap justify-center gap-1.5">
        <ChipRep rep={g.rep} />
      </div>
    </Cornice>
  );
}

// --- building blocks ---------------------------------------------------------------------------

type Tono = 'bene' | 'male' | 'boss';

const BORDO: Record<Tono, string> = {
  bene: 'border-ciano/60 shadow-[0_0_40px_rgb(45_226_230/0.25)]',
  male: 'border-rischio-alto/60 shadow-[0_0_40px_rgb(255_77_77/0.25)]',
  boss: 'border-sole/60 shadow-[0_0_40px_rgb(255_211_25/0.25)]',
};

function Cornice({
  s,
  immagine,
  children,
  onAvanti,
  tono,
  numeri,
  sotto,
  bottone = TESTI.esito.avanti,
}: {
  s: Stato;
  immagine: ReactNode;
  children: ReactNode;
  onAvanti: () => void;
  tono: Tono;
  numeri?: ReactNode;
  sotto?: string;
  bottone?: string;
}) {
  return (
    <div data-schermo="carta" className="fixed inset-0 z-[70] overflow-y-auto bg-notte-950/96 backdrop-blur-sm" role="dialog" aria-modal="true">
      <div className="pt-sicuro pb-sicuro mx-auto flex min-h-full w-full max-w-md flex-col px-4">
        <div className={`anim-entra-zoom my-auto flex flex-col items-center gap-3 rounded-3xl border-2 bg-gradient-to-b from-notte-800 to-notte-900 px-5 pt-4 pb-5 text-center ${BORDO[tono]}`}>
          <div className="flex w-full items-center gap-2 text-left">
            <span className="min-w-0 flex-1 truncate text-xs font-extrabold tracking-wider text-white/60 uppercase">
              {s.nome} · {TESTI.classi[s.classe].nome}
              {sotto && <span className="block truncate text-white/40 normal-case">{sotto}</span>}
            </span>
            {numeri}
          </div>
          {immagine}
          {children}
        </div>
        <button type="button" className="bottone-primario mt-4 mb-2 w-full text-xl" onClick={onAvanti} autoFocus>
          {bottone}
        </button>
      </div>
    </div>
  );
}

function Img({ sezione, id, largo = false }: { sezione: 'ui' | 'azioni' | 'luoghi'; id: string; largo?: boolean }) {
  return (
    <Immagine
      src={arte(sezione, id)}
      nome={id}
      cover={largo}
      className={largo ? 'aspect-[3/2] w-full rounded-2xl' : 'aspect-square w-44 rounded-2xl'}
    />
  );
}

function Titolo({ children }: { children: ReactNode }) {
  return <h2 className="text-2xl leading-tight font-black text-balance">{children}</h2>;
}

function Grande({ children, colore }: { children: ReactNode; colore: string }) {
  return <div className={`text-4xl font-black tabular-nums ${colore}`}>{children}</div>;
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-white/10 px-3 py-1 text-sm font-bold">{children}</span>;
}

function ChipRep({ rep }: { rep: number }) {
  if (Math.abs(rep) < REP_VISIBILE) return null;
  return rep > 0 ? <Chip>⭐ {TESTI.esito.repSu}</Chip> : <Chip>💢 {TESTI.esito.repGiu}</Chip>;
}
