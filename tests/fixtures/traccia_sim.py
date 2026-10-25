#!/usr/bin/env python3
"""Gioca partite del simulatore registrando, a ogni punto in cui il motore TS aspetta un comando,
   lo stato e i comandi scelti dalla policy. tests/tracce.test.ts rigioca gli stessi comandi nel
   motore TS e confronta lo stato campo per campo.

   Uso: python3 tests/fixtures/traccia_sim.py OUT.json CLASSE:POLICY:SEME [...]

   Non riscrive il loop di gioca(): si aggancia ai metodi che il loop chiama.
   Punti di attesa (come nel motore TS):
   * inizio di ogni slot di un giorno normale e giorno di galera dello Zingaro: all'ingresso di
     negozio(), cioe' dopo paghetta d'emergenza e instancabile;
   * un guaio con scelta (dentro nuovo_giorno);
   * il tribunale (dentro arresto, prima della difesa);
   * ogni giorno di ospedale o di galera (dopo nuovo_giorno e il -1 al contatore).
   Un passo senza azione, sonno o scelta e' un PASSA. Le estrazioni casuali fatte dalla policy
   (giocatore casuale) diventano comandi ["RNG", ...] da ripetere sull'RNG della partita."""
import json, os, sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "sim"))
import maranza_sim as M  # noqa: E402

FINE = {"365 giorni": "anno", "365 giorni (finiti in cella)": "anno_in_cella",
        "piantato all'ospedale": "ospedale", "marcito in galera": "galera"}
TERMINALI = {"AZIONE", "DORMI", "PASSA", "DIFESA", "SCELTA_EVENTO"}


class RngRegistrato:
    """Inoltra a random.Random; registra le chiamate fatte mentre decide la policy."""
    def __init__(self, rng, gioco):
        self._r, self._g = rng, gioco

    def _reg(self, *c):
        if self._g.in_policy: self._g.comando("RNG", *c)

    def random(self):
        self._reg("random"); return self._r.random()

    def uniform(self, a, b):
        self._reg("uniform", a, b); return self._r.uniform(a, b)

    def randint(self, a, b):
        self._reg("randint", a, b); return self._r.randint(a, b)

    def choice(self, seq):
        self._reg("choice", len(seq)); return self._r.choice(seq)

    def choices(self, population, weights):
        self._reg("choices", list(weights)); return self._r.choices(population, weights=weights)


class Traccia(M.Gioco):
    def __init__(self, classe, policy, seed):
        super().__init__(classe, policy, seed=seed)
        self.in_policy = False
        self.passi = []
        self.rng = RngRegistrato(self.rng, self)
        pol = dict(self.policy)
        scegli, difesa = pol["scegli"], pol["difesa"]

        def scegli_reg(g, *a, **k):
            g.in_policy = True
            try: return scegli(g, *a, **k)
            finally: g.in_policy = False

        def difesa_reg(g, pena):
            g.punto()
            g.in_policy = True
            try: x = difesa(g, pena)
            finally: g.in_policy = False
            g.comando("DIFESA", x)
            return x
        pol["scegli"], pol["difesa"] = scegli_reg, difesa_reg
        self.policy = pol

    # --- registrazione -----------------------------------------------------------------------
    def snap(self):
        s = self.s
        return dict(
            soldi=s.soldi, energia=s.energia, energia_max=s.energia_max, rep=s.rep, salute=s.salute,
            giorno=s.giorno, slot=s.slot, galera=s.galera, ospedale=s.ospedale, condanne=s.condanne,
            sorvegliato=s.sorvegliato, attenzionato=s.attenzionato, attenzionato_val=s.attenzionato_val,
            items=sorted(s.items), veicolo=s.veicolo, cooldown=dict(s.cooldown),
            n_recenti=len(s.recenti), recenti=[list(x) for x in s.recenti[-1:]], ultimo_sonno=s.ultimo_sonno,
            cibo_pagato=s.cibo_pagato, cibo_gratis=s.cibo_gratis, lavori_oggi=s.lavori_oggi,
            instancabile_mese=s.instancabile_mese, paghetta_em_mese=s.paghetta_em_mese,
            notte_pak_sett=s.notte_pak_sett, cond=(s.cond.get("id") if s.cond else None),
            loot_tag=(dict(s.cond["loot_tag"]) if s.cond and "loot_tag" in s.cond else None),
            azioni=s.azioni, arresti=s.arresti, g_galera=s.g_galera, g_osp=s.g_osp,
            guadagni=s.guadagni, storico_guadagni=s.storico_guadagni[-1:], n_storico=len(s.storico_guadagni),
            vivo=s.vivo, fine=FINE[s.fine],
        )

    def chiudi_passo(self):
        if self.passi and not any(c[0] in TERMINALI for c in self.passi[-1]["c"]):
            self.comando("PASSA")

    def punto(self, **correzioni):
        self.chiudi_passo()
        snap = self.snap()
        for k, v in correzioni.items(): snap[k] += v
        self.passi.append({"s": snap, "c": []})

    def comando(self, *c):
        self.passi[-1]["c"].append(list(c))

    # --- agganci ai metodi chiamati dal loop ---------------------------------------------------
    def nuovo_giorno(self):
        super().nuovo_giorno()
        s = self.s
        # il loop fa subito ospedale -= 1 / galera -= 1: il motore TS aspetta dopo il -1
        if s.ospedale > 0: self.punto(ospedale=-1)
        elif s.galera > 0 and s.classe != "Zingaro": self.punto(galera=-1)

    def negozio(self):
        self.punto()
        prima = set(self.s.items)
        ordine = self.policy["acquisti"](self.s)
        super().negozio()
        for item_id in ordine:   # negozio() compra nell'ordine della lista
            if item_id in self.s.items and item_id not in prima:
                self.comando("COMPRA", item_id); prima.add(item_id)

    def evento_personale(self, ev):
        s, pol = self.s, self.policy
        scelta = None
        if ev == "cuggino_soldi": scelta = "paga" if (s.soldi >= 150 and pol["generoso"]) else "rifiuta"
        elif ev == "sfida_piazza": scelta = "accetta" if (pol["accetta_sfide"] or s.classe == "Balcanico") else "rifiuta"
        elif ev == "serata": scelta = "vai" if (s.soldi >= 100 and pol["festaiolo"]) else "resta"
        elif ev == "giornalista": scelta = "accetta" if pol["accetta_tv"] else "rifiuta"
        elif ev == "portafoglio": scelta = "restituisci" if pol["onesto"] else "tieni"
        if scelta is not None:
            self.punto()
            self.comando("SCELTA_EVENTO", scelta)
        return super().evento_personale(ev)

    def dormi(self):
        self.comando("DORMI", self.policy["cibo"](self.s)[0])
        return super().dormi()

    def esegui(self, a, t):
        self.comando("AZIONE", a["id"], t)
        return super().esegui(a, t)

    def gioca(self):
        s = super().gioca()
        self.chiudi_passo()
        fine = self.snap()
        fine["recenti"] = [list(x) for x in s.recenti]
        fine["azioni_usate"] = dict(s.azioni_usate)
        self.passi.append({"s": fine, "c": [], "punti": s.punti()})
        return s


def main():
    out, specs = sys.argv[1], sys.argv[2:]
    partite = []
    for spec in specs:
        classe, policy, seme = spec.split(":")
        g = Traccia(classe, policy, int(seme))
        g.gioca()
        partite.append({"classe": classe, "policy": policy, "seme": int(seme), "passi": g.passi})
    with open(out, "w") as f:
        json.dump(partite, f)


if __name__ == "__main__":
    main()
