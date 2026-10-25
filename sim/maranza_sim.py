#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
MARANZA SIMULATOR — simulatore di bilanciamento
===========================================================

Simula partite complete (365 giorni x 4 slot) con policy automatiche di gioco,
per misurare: sopravvivenza, soldi, reputazione, giorni di galera/ospedale,
MARANZA POINTS, e l'equita' tra Classi.

Uso:
    python3 maranza_sim.py                      # batch standard, stampa tabelle
    python3 maranza_sim.py --runs 200 --charts  # piu' run + grafici PNG
    python3 maranza_sim.py --verbose --classe Italiano --policy bilanciato
                                                # una singola partita con log giornaliero

Tutte le costanti di gioco sono nella sezione DATI: il motore legge solo da li'.
"""
from __future__ import annotations
import random, math, statistics, datetime, argparse, collections, json, sys, os
from dataclasses import dataclass, field

# ======================================================================
#  DATI DI GIOCO
# ======================================================================

GIORNI = 365
DATA_INIZIO = datetime.date(2026, 5, 1)          # il 1 Maggio e' sempre il giorno 1
SLOT_NOMI = {1: "Mattina", 2: "Pomeriggio", 3: "Sera", 4: "Notte"}

REP_DECAY = 0.99        # ogni giorno la reputazione perde l'1% ("la piazza dimentica")
REP_DIMINUENTE = 100.0  # i guadagni di rep sono moltiplicati per (1 - rep/100)
REP_LOOT_BONUS = 0.30   # a rep 100 il bottino e' +30%
REP_MIN = 1.0
REP_MAX = 100.0
SEQUESTRO_ARRESTO = 0.10   # quota di contanti sequestrata all'arresto
SEQUESTRO_MAX = 500        # ... ma la madama trova solo quelli in tasca
NOIA_PIAZZA = 0.5          # rep x0.5 per ogni ripetizione della stessa azione negli ultimi 7 giorni
ZONA_CALDA = 0.85          # bottino x0.85 per ogni ripetizione dello stesso reato negli ultimi 7 giorni (min x0.5)
FURTO_OSPEDALE = 0.10      # quota di contanti "sparita" durante il ricovero
GAME_OVER_PENA = 90        # una singola condanna >= 90 giorni = "marcito in galera"
GAME_OVER_GALERA_TOT = 240 # oppure piu' di 240 giorni dell'anno dietro le sbarre (None = disattivato)
RECIDIVA_MAX = 5           # ogni condanna +RECIDIVA_PENA pena, fino a 5 volte
RECIDIVA_PENA = 0.10
RECIDIVA_TIRO = 3          # malus al tiro del giudice per condanna (max 5 volte)
SORVEGLIATO_MULT = 1.25
TUTORIAL_GIORNI = 7        # "il giudice e' buono": bonus al tiro nei primi giorni
TUTORIAL_BONUS = 15
INCENSURATO_BONUS = 10     # bonus al tiro se nessuna condanna precedente
LAVORI_AL_GIORNO = 1       # lavori legali (tag LEGALE con bottino) al giorno
RICOVERO = (1, 3)          # giorni di ospedale
MULTA_EURO_GIORNO = 25     # multa non pagata: 1 giorno di galera ogni 25€
SALUTE_BASSA = 30          # sotto questa salute l'energia massima e' ridotta
SALUTE_BASSA_MULT = 0.8
PENA_SCALA = 1.0           # moltiplicatore globale delle pene base (tuning)
SALUTE_MAX = 100
PRESTANOME = 0.40          # Zingaro: probabilita' che una perdita di soldi venga azzerata

# ---- Classi -------------------------------------------------------------
# soldi iniziali, energia massima. Le abilita' sono implementate nel motore.
CLASSI = {   # soldi iniziali, energia massima (le abilita' sono nel motore)
    "Magrebino": dict(soldi=60,  energia=135),
    "Pakistano": dict(soldi=70,  energia=150),
    "Africano":  dict(soldi=40,  energia=170),
    "Zingaro":   dict(soldi=120, energia=115),
    "Balcanico": dict(soldi=50,  energia=160),
    "Italiano":  dict(soldi=200, energia=120),
}

# ---- Cibo (costo giornaliero, recupero energia, effetto salute) -------
CIBO = [  # nome, costo, recupero (quota di energia max), salute/giorno
    ("Mensa",      15, 1.00, +3),
    ("Kebabbaro",  10, 0.80, +1),
    ("Lidl",        5, 0.50,  0),
    ("Caritas",     0, 0.20, -1),
]

# ---- Negozio -----------------------------------------------------------
# tipo: drip (estetica/rep), veicolo (livello), tool (bonus rischio)
NEGOZIO = {
    "passamontagna":  dict(nome="Passamontagna Naik", prezzo=15,  tipo="tool",   effetto="notte", valore=0),
    "tronchese":      dict(nome="Tronchese del cuggino", prezzo=30, tipo="tool", effetto="effrazione", valore=0),
    "cappello":       dict(nome="Cappello Nord Faccia",   prezzo=90,  tipo="drip", valore=90),
    "tuta":           dict(nome="Tuta Naik Tech",        prezzo=180, tipo="drip", valore=180),
    "catena":         dict(nome="Catena placcata 'oro'", prezzo=250, tipo="drip", valore=250),
    "monopattino":    dict(nome="Monopattino truccato",  prezzo=350, tipo="veicolo", valore=350, livello=1),
    "telefono":       dict(nome="aiFon ultimo modello", prezzo=1200, tipo="drip", valore=1200),
    "motorino":       dict(nome="Motorino elaborato",    prezzo=1500, tipo="veicolo", valore=1500, livello=2),
    "orologio":       dict(nome="Orologio 'svizzero' di Napoli", prezzo=2500, tipo="drip", valore=2500),
}

# ---- Avvocati (Tribunale) ---------------------------------------------
AVVOCATI = {   # nome: (costo, bonus al tiro del giudice)
    "ufficio":   (0,   0),
    "quartiere": (150, 10),
    "grido":     (600, 25),
}

# ---- Azioni ------------------------------------------------------------
# Campi:
#   tags      : FURTO, TRUFFA, FORZA, SPACCIO, AZZARDO, SOCIAL, LEGALE, VEICOLO(bonus fuga), EFFRAZIONE, NOTTE
#   slots     : slot in cui e' disponibile
#   trasferta : True -> costa 1 slot extra (salvo Magrebino / veicolo)
#   rep_min   : reputazione minima per sbloccarla
#   energia   : costo
#   spesa     : (min,max) investimento in soldi; t in [0,1] = quanto investi
#   gabbio    : (a_spesa_min, a_spesa_max) probabilita' di essere beccato
#   ospedale  : probabilita' di finire in ospedale (se non beccato)
#   bottino   : (min,max) in euro; oppure bottino_x=(a,b) moltiplicatore della spesa
#   rep       : punti reputazione (negativo = infamia)
#   pena      : giorni di galera base se condannato
#   multa     : euro
#   cooldown  : giorni prima di poterla rifare
#   veicolo_req: richiede un veicolo
#   solo_evento: disponibile solo se la condizione del giorno la abilita
A = {}
def _a(id, nome, **k):
    d = dict(id=id, nome=nome, tags=set(), slots={1,2,3,4}, trasferta=False, rep_min=0,
             energia=30, spesa=(0,0), gabbio=(0.0,0.0), ospedale=0.0, bottino=(0,0),
             bottino_x=None, rep=0, pena=1, multa=0, cooldown=0, veicolo_req=False,
             solo_evento=None, salute=0, speciale=None)
    d.update(k); d["tags"] = set(d["tags"]); A[id] = d

# --- Legali / sociali ---
_a("L01","Chillare in piazza", tags={"SOCIAL","LEGALE"}, energia=10, rep=0.5, speciale="chill")   # rep cap 60
_a("L02","TikTok brainrot in piazza", tags={"SOCIAL","LEGALE"}, energia=20, rep=1.5, speciale="tiktok", slots={1,2,3})  # rep cap 80
_a("L03","Turno al minimarket", tags={"LEGALE"}, energia=40, bottino=(20,30), rep=-1, slots={1,2,3})
_a("L04","Rider delle consegne", tags={"LEGALE","VEICOLO"}, energia=50, bottino=(20,30), rep=0, trasferta=True, slots={1,2,3})
_a("L05","Calisthenics al parco", tags={"LEGALE"}, energia=30, rep=1, salute=+8, slots={1,2,3})
# --- Azzardo ---
_a("G01","Slot al bar del cinese", tags={"AZZARDO"}, energia=10, spesa=(10,200), speciale="slot")
_a("G02","Scommessa clandestina", tags={"AZZARDO"}, energia=15, spesa=(20,500), speciale="scommessa", slots={1,2,3})
_a("G03","Poker nel retrobottega", tags={"AZZARDO"}, energia=30, spesa=(50,300), speciale="poker",
   gabbio=(0.05,0.05), pena=2, multa=200, slots={4})
_a("G04","Corsa clandestina in monopattino", tags={"AZZARDO","VEICOLO"}, energia=30, spesa=(20,100),
   speciale="corsa", gabbio=(0.10,0.10), ospedale=0.15, pena=1, multa=150, rep=4, veicolo_req=True, slots={3,4})
# --- Reati minori (tier 1: rep 0+) ---
_a("C01","Truffa dell'anello d'oro", tags={"TRUFFA"}, energia=20, spesa=(1,1), gabbio=(0.04,0.04), ospedale=0.04,
   bottino=(25,100), rep=2, pena=1, multa=100, slots={1,2,3})
_a("C02","Portoghese sul regionale", tags={"FURTO","VEICOLO"}, energia=15, gabbio=(0.05,0.05), bottino=(10,20),
   rep=1, pena=1, multa=100, slots={1,2,3})
_a("C03","Taccheggio al Lidl", tags={"FURTO"}, energia=20, gabbio=(0.06,0.06), ospedale=0.04, bottino=(15,50),
   rep=1, pena=1, multa=100, slots={1,2,3}, speciale="cibo_gratis")
_a("C04","Rubare alcool all'alimentari", tags={"FURTO"}, energia=25, gabbio=(0.08,0.08), ospedale=0.05,
   bottino=(20,60), rep=3, pena=2, multa=100, slots={1,2,3})
_a("C05","Borseggio al mercato", tags={"FURTO"}, energia=30, gabbio=(0.08,0.08), ospedale=0.10,
   bottino=(25,160), rep=-3, pena=3, multa=0, slots={1})
_a("C06","Tag sui muri del quartiere", tags={"SOCIAL"}, energia=25, spesa=(5,20), gabbio=(0.08,0.05),
   rep=4, pena=1, multa=150, slots={3,4}, speciale="tag")
_a("C07","Fumo nascosto nel parchetto", tags={"FURTO"}, energia=30, gabbio=(0.06,0.06), ospedale=0.15,
   bottino=(0,200), rep=5, pena=4, slots={3,4})
_a("C08","Truffa Vinted (sneakers fulle)", tags={"TRUFFA"}, energia=20, spesa=(15,60), gabbio=(0.06,0.06),
   bottino_x=(1.8,3.5), rep=2, pena=3, multa=300, cooldown=4)
_a("C09","Ruba monopattino elettrico", tags={"FURTO","EFFRAZIONE"}, energia=35, spesa=(0,30), gabbio=(0.15,0.08),
   ospedale=0.05, bottino=(50,260), rep=4, pena=4, speciale="monopattino")
_a("C10","Parkour sui tetti per TikTok", tags={"SOCIAL"}, energia=40, gabbio=(0.03,0.03), ospedale=0.15,
   rep=6, pena=1, multa=200, slots={1,2,3}, speciale="tiktok")
# --- Reati tier 2 (rep 10+) ---
_a("C11","Scippo in stazione (bici)", tags={"FURTO","VEICOLO"}, rep_min=10, energia=40, gabbio=(0.15,0.15),
   ospedale=0.10, bottino=(45,380), rep=4, pena=6)
_a("C12","Scippo al centro commerciale", tags={"FURTO"}, rep_min=10, energia=35, gabbio=(0.12,0.12),
   ospedale=0.05, bottino=(75,600), rep=4, pena=6, trasferta=True, slots={1,2})
_a("C13","Scassinare auto", tags={"FURTO","EFFRAZIONE","NOTTE"}, rep_min=10, energia=45, spesa=(0,20),
   gabbio=(0.15,0.08), ospedale=0.05, bottino=(15,450), rep=4, pena=6, slots={3,4})
_a("C14","Truffa dello specchietto", tags={"TRUFFA"}, rep_min=10, energia=40, gabbio=(0.12,0.12), ospedale=0.10,
   bottino=(75,300), rep=4, pena=5, multa=300, slots={1,2,3})
_a("C15","Parcheggiatore abusivo", tags={"TRUFFA"}, rep_min=10, energia=40, spesa=(0,10), gabbio=(0.12,0.08),
   ospedale=0.10, bottino=(30,180), rep=3, pena=1, multa=200, trasferta=True, slots={2,3}, solo_evento="evento")
_a("C16","Bagarinaggio allo stadio", tags={"TRUFFA"}, rep_min=10, energia=45, spesa=(90,300), gabbio=(0.08,0.08),
   ospedale=0.05, bottino_x=(1.5,3.0), rep=3, pena=2, multa=500, trasferta=True, slots={2,3}, solo_evento="evento")
_a("C17","Rissa per collana/cappello drip", tags={"FORZA"}, rep_min=10, energia=50, gabbio=(0.12,0.12),
   ospedale=0.20, bottino=(60,380), rep=6, pena=7, slots={2,3})
_a("C18","Rapina al rider", tags={"FORZA","VEICOLO"}, rep_min=10, energia=45, gabbio=(0.12,0.12), ospedale=0.15,
   bottino=(45,220), rep=-2, pena=9, slots={3,4}, speciale="veicolo_bonus")
# --- Reati tier 3 (rep 20+) ---
_a("C19","Rame al cantiere", tags={"FURTO","EFFRAZIONE","NOTTE"}, rep_min=20, energia=70, spesa=(0,50),
   gabbio=(0.15,0.08), ospedale=0.12, bottino=(120,600), rep=5, pena=9, trasferta=True, slots={4})
_a("C20","Rapina alla lucciola sulla statale", tags={"FORZA","NOTTE"}, rep_min=20, energia=50, gabbio=(0.12,0.12),
   ospedale=0.25, bottino=(150,750), rep=-6, pena=12, trasferta=True, slots={3,4})
_a("C21","Spaccio fuori dalla discoteca", tags={"SPACCIO","NOTTE"}, rep_min=20, energia=60, spesa=(50,300),
   gabbio=(0.22,0.22), ospedale=0.06, bottino_x=(2.0,4.0), rep=8, pena=15, trasferta=True, slots={3,4})
# --- Reati tier 4 (rep 35+) ---
_a("C22","Topino d'appartamento", tags={"FURTO","EFFRAZIONE"}, rep_min=35, energia=80, spesa=(0,100),
   gabbio=(0.25,0.12), ospedale=0.10, bottino=(200,2500), rep=7, pena=24, slots={1,2,4}, cooldown=3)
_a("C23","Corriere per il boss", tags={"SPACCIO"}, rep_min=35, energia=50, spesa=(0,30), gabbio=(0.25,0.15),
   ospedale=0.05, bottino=(150,800), rep=8, pena=21, trasferta=True, veicolo_req=True, cooldown=2)
_a("C24","Spedizione punitiva per il boss", tags={"FORZA"}, rep_min=45, energia=70, gabbio=(0.20,0.20),
   ospedale=0.20, bottino=(100,600), rep=12, pena=18, cooldown=7, slots={3,4})
_a("C25","Spaccata al Compro Oro", tags={"FURTO","EFFRAZIONE","NOTTE"}, rep_min=50, energia=60, spesa=(0,200),
   gabbio=(0.25,0.12), ospedale=0.10, bottino=(150,1200), rep=10, pena=30, cooldown=14, slots={4}, veicolo_req=True)
# --- Endgame (rep 70+) ---
_a("C26","Furto del BANCOMAT", tags={"FURTO","EFFRAZIONE","NOTTE"}, rep_min=70, energia=80, spesa=(300,5000),
   gabbio=(0.60,0.08), ospedale=0.15, bottino=(4000,30000), rep=5, pena=60, cooldown=30, slots={4})

for _x in A.values():
    if _x["pena"]: _x["pena"] = max(1, int(round(_x["pena"] * PENA_SCALA)))
AZIONI = list(A.values())

# ---- Condizioni del giorno (eventi globali) ---------------------------
# effetti letti dal motore: gabbio_add, energia_add (azioni all'aperto), loot_tag, risk_tag, abilita, blocca, rep_tag
CONDIZIONI = [
    dict(id="pioggia",   nome="Piove a dirotto",          p=0.12, energia_add=10, blocca={"L02","C10"}),
    dict(id="blitz",     nome="Operazione Alto Impatto",  p=0.06, gabbio_add=0.10),
    dict(id="derby",     nome="Derby in citta'",          p=0.05, abilita="evento", loot_tag={"TRUFFA":1.3}, risk_tag={"FORZA":1.2}),
    dict(id="concerto",  nome="Concerto al palazzetto",   p=0.05, abilita="evento"),
    dict(id="blackout",  nome="Blackout di quartiere",    p=0.04, risk_tag={"NOTTE":0.75}, loot_tag={"EFFRAZIONE":1.3}),
    dict(id="mercatone", nome="Mercato straordinario",    p=0.05, loot_tag={"FURTO":1.3}),
    dict(id="sciopero",  nome="Sciopero dei mezzi",       p=0.04, energia_add_trasferta=15),
    dict(id="polfer",    nome="Controlli Polfer",         p=0.04, risk_id={"C02":2.0}),
    dict(id="nebbia",    nome="Nebbia fitta",             p=0.05, risk_tag={"VEICOLO":0.85,"NOTTE":0.85}, stagione={11,12,1,2}),
    dict(id="caldo",     nome="Caldo bestiale",           p=0.08, energia_max_mult=0.85, stagione={6,7,8}),
    dict(id="viral",     nome="Il quartiere e' virale",   p=0.04, rep_tag={"SOCIAL":2.0}),
    dict(id="paga",      nome="Giorno di paga in citta'", p=1.0, loot_tag={"FURTO":1.3,"TRUFFA":1.2}, solo_giorno_mese=27),
]
FESTE = {   # (mese, giorno) -> condizione fissa
    (8,15): dict(id="ferragosto", nome="Ferragosto, citta' vuota", loot_id={"C22":2.0}, risk_id={"C22":0.7}, blocca={"C11","C12","C05"}),
    (10,31): dict(id="halloween", nome="Halloween", risk_tag={"NOTTE":0.85}, rep_tag={"SOCIAL":1.5}),
    (12,24): dict(id="natale", nome="Vigilia di Natale", loot_tag={"FURTO":1.5}, gabbio_add=0.05),
    (12,31): dict(id="capodanno", nome="Capodanno", rep_tag={"SOCIAL":2.0}, risk_tag={"FORZA":1.3}),
    (2,16): dict(id="carnevale", nome="Carnevale", gabbio_add=-0.10),
}

# ---- Guai & opportunita' (eventi personali con scelta) ----------------
P_GUAIO_BASE = 0.15
GUAI = [
    "cuggino_soldi", "sfida_piazza", "posto_blocco", "perquisizione", "portafoglio",
    "boss_nota", "influencer", "furto_veicolo", "mamma_spesa", "serata", "sbirro_occhio",
    "gratta_vinci", "febbre", "giornalista", "turno_kebab", "rissa_subita",
]

# ======================================================================
#  MOTORE
# ======================================================================

@dataclass
class Stato:
    classe: str
    soldi: float
    energia: float
    energia_max: int
    rep: float = 5.0
    salute: float = 100.0
    salute_max: int = 100
    giorno: int = 0            # 0..364
    slot: int = 1
    galera: int = 0            # giorni residui
    ospedale: int = 0
    condanne: int = 0
    sorvegliato: int = 0       # giorni residui "messa alla prova"
    attenzionato: int = 0      # giorni residui con +gabbio
    attenzionato_val: float = 0.0
    items: set = field(default_factory=set)
    veicolo: int = 0           # 0 nessuno / 1 monopattino / 2 motorino
    cooldown: dict = field(default_factory=dict)   # id -> giorno di sblocco
    recenti: list = field(default_factory=list)    # (giorno, id) delle ultime azioni
    ultimo_sonno: int = -10    # indice assoluto (giorno*4+slot) dell'ultimo riposo
    cibo_pagato: bool = False
    cibo_gratis: bool = False
    lavori_oggi: int = 0
    instancabile_mese: int = -1
    paghetta_em_mese: int = -1
    notte_pak_sett: int = -1
    cond: dict = field(default_factory=dict)
    # contatori
    azioni: int = 0
    arresti: int = 0
    g_galera: int = 0
    g_osp: int = 0
    guadagni: float = 0.0
    storico_guadagni: list = field(default_factory=list)   # guadagno per giorno
    vivo: bool = True
    fine: str = "365 giorni"
    azioni_usate: collections.Counter = field(default_factory=collections.Counter)
    log: list = field(default_factory=list)

    # --- helpers ---
    @property
    def data(self): return DATA_INIZIO + datetime.timedelta(days=self.giorno)
    @property
    def abs_slot(self): return self.giorno * 4 + self.slot
    def drip_max(self):
        return max([NEGOZIO[i]["valore"] for i in self.items if NEGOZIO[i]["tipo"] == "drip"] + [0])
    def drip_tot(self):
        return sum(NEGOZIO[i]["valore"] for i in self.items if NEGOZIO[i]["tipo"] in ("drip","veicolo"))
    def patrimonio(self): return self.soldi + 0.5 * self.drip_tot()
    def punti(self):
        p = self.patrimonio() * self.rep
        if not self.vivo:
            p *= 0.5 * (self.giorno / GIORNI)
        return p
    def zona_calda(self, aid):
        n = sum(1 for g, i in self.recenti if i == aid and self.giorno - g < 7)
        return max(0.5, ZONA_CALDA ** n)
    def noia(self, aid):
        """Moltiplicatore rep per ripetizione: 0.5^n, n = volte fatta negli ultimi 7 giorni."""
        n = sum(1 for g, i in self.recenti if i == aid and self.giorno - g < 7)
        return NOIA_PIAZZA ** n
    def reddito_giornaliero(self):
        h = self.storico_guadagni[-14:]
        return max(80.0, statistics.mean(h)) if h else 80.0


class Gioco:
    def __init__(self, classe, policy="bilanciato", seed=None, verbose=False):
        self.rng = random.Random(seed)
        self.verbose = verbose
        cl = CLASSI[classe]
        emax = cl["energia"]
        self.s = Stato(classe=classe, soldi=float(cl["soldi"]), energia=float(emax), energia_max=emax)
        self.policy = POLICIES[policy]

    # ------------------------------------------------------------------
    def log(self, msg):
        if self.verbose:
            s = self.s
            print(f"[G{s.giorno+1:3d} {s.data.strftime('%d/%m')} {SLOT_NOMI[s.slot][:3]}] "
                  f"€{s.soldi:8.0f} rep{s.rep:5.1f} en{s.energia:4.0f} sal{s.salute:4.0f} | {msg}")

    # ------------------------------------------------------------------
    #  Calendario / abilita' di classe
    # ------------------------------------------------------------------
    def ramadan(self):
        d = self.s.data
        return (d.month == 2 and d.day >= 15) or (d.month == 3 and d.day <= 16)

    def nuovo_giorno(self):
        s = self.s
        s.cibo_pagato = False; s.cibo_gratis = False; s.lavori_oggi = 0
        s.storico_guadagni.append(0.0)
        d = s.data
        # decadimento reputazione (congelato in galera)
        if s.galera == 0:
            s.rep = max(REP_MIN, s.rep * REP_DECAY)
        # salute si rigenera lentamente
        self.cambia_salute(+1)
        if s.sorvegliato > 0: s.sorvegliato -= 1
        if s.attenzionato > 0: s.attenzionato -= 1
        # Italiano: paghetta il lunedi'
        if s.classe == "Italiano" and d.weekday() == 0 and s.galera == 0:
            s.soldi += 50; self.log("Paghetta del papi +50")
        # condizione del giorno
        s.cond = {}
        if (d.month, d.day) in FESTE:
            s.cond = FESTE[(d.month, d.day)]
        else:
            fisse = [c for c in CONDIZIONI if c.get("solo_giorno_mese") == d.day]
            if fisse:
                s.cond = fisse[0]
            else:
                # una sola estrazione: P(condizione) = somma delle p ammesse oggi, scelta proporzionale
                cand = [c for c in CONDIZIONI if "solo_giorno_mese" not in c and ("stagione" not in c or d.month in c["stagione"])]
                tot = sum(c["p"] for c in cand)
                if self.rng.random() < tot:
                    s.cond = self.rng.choices(cand, weights=[c["p"] for c in cand])[0]
        if s.cond: self.log(f"Oggi: {s.cond['nome']}")
        # 24: il caldo abbassa anche l'energia che hai gia'; 1: salute bassa riduce il massimo
        s.energia = min(s.energia, self.energia_max_oggi())
        # guaio / opportunita'
        if s.galera == 0 and s.ospedale == 0:
            p = P_GUAIO_BASE + (0.10 if s.classe == "Balcanico" else 0)
            if self.rng.random() < p:
                self.evento_personale(self.rng.choice(GUAI))

    # ------------------------------------------------------------------
    #  Eventi personali
    # ------------------------------------------------------------------
    def evento_personale(self, ev):
        s, r = self.s, self.rng
        pol = self.policy
        if ev == "cuggino_soldi":
            if s.soldi >= 150 and pol["generoso"]:
                s.soldi -= 50; self.guadagna_rep(3); self.log("Il cuggino chiede 50€: paghi (+3 rep)")
            else:
                self.guadagna_rep(-3); self.log("Il cuggino chiede 50€: rifiuti (-3 rep)")
                if r.random() < 0.2: self.attenziona(7, 0.05)
        elif ev == "sfida_piazza":
            if pol["accetta_sfide"] or s.classe == "Balcanico":
                win = 0.5 * (1.3 if s.classe == "Balcanico" else 1)
                if r.random() < win: self.guadagna_rep(8); self.log("Sfida in piazza: vinci (+8 rep)")
                else:
                    self.guadagna_rep(-5); self.log("Sfida in piazza: perdi (-5 rep)"); self.ricovero(self.rng.randint(*RICOVERO), 15)
            else:
                self.guadagna_rep(-6); self.log("Sfida in piazza: rifiuti (-6 rep)")
        elif ev == "posto_blocco":
            if s.veicolo and r.random() < 0.3:
                multa = 80
                if r.random() < 0.2:
                    s.veicolo = 0; s.items.discard("monopattino"); s.items.discard("motorino")
                    self.log("Posto di blocco: veicolo sequestrato!")
                else:
                    self.paga(multa); self.log("Posto di blocco: multa 80€")
        elif ev == "perquisizione":
            if r.random() < 0.3:
                perdita = 0.10 * s.soldi; self.perdi_soldi(perdita); self.log(f"Perquisizione all'alba: -{perdita:.0f}€")
        elif ev == "portafoglio":
            v = r.uniform(20, 150)
            if pol["onesto"]: self.guadagna_rep(5); self.log("Trovi un portafoglio: lo restituisci in video (+5 rep)")
            else: self.incassa(v); self.log(f"Trovi un portafoglio: +{v:.0f}€")
        elif ev == "boss_nota":
            if s.rep >= 25:
                lt = dict(s.cond.get("loot_tag", {}))
                for k in ("SPACCIO", "FORZA"): lt[k] = lt.get(k, 1.0) * 1.5   # 13: si somma alla condizione del giorno
                s.cond = dict(s.cond, loot_tag=lt); self.log("Il boss ti ha notato: lavori per lui x1.5 oggi")
        elif ev == "influencer":
            self.guadagna_rep(5); s.energia = max(0, s.energia - 20); self.log("Un influencer ti mette nel video (+5 rep, -20 en)")
        elif ev == "furto_veicolo":
            if s.veicolo == 1 and r.random() < 0.5:
                s.veicolo = 0; s.items.discard("monopattino"); self.log("Ti hanno rubato il monopattino!")
        elif ev == "mamma_spesa":
            s.energia = max(0, s.energia - 20); self.cambia_salute(+5); self.guadagna_rep(-1)
            self.log("Tua madre ti manda a fare la spesa (-20 en, +5 salute, -1 rep)")
        elif ev == "serata":
            if s.soldi >= 100 and pol["festaiolo"]:
                s.soldi -= 40; self.guadagna_rep(4); s.energia = max(0, s.energia - 30); self.log("Serata in disco (-40€, +4 rep)")
        elif ev == "sbirro_occhio":
            self.attenziona(1, 0.10); self.log("Lo sbirro di quartiere ti tiene d'occhio (+10% gabbio oggi)")
        elif ev == "gratta_vinci":
            v = r.choice([0,0,0,5,10,20,50,100]); self.incassa(v); self.log(f"Gratta e vinci trovato per terra: +{v}€")
        elif ev == "febbre":
            s.energia = min(s.energia, s.energia_max * 0.5); self.cambia_salute(-5); self.log("Febbre: energia dimezzata, -5 salute")
        elif ev == "giornalista":
            if pol["accetta_tv"]:
                self.guadagna_rep(8); self.attenziona(7, 0.05); self.log("Intervista in TV (+8 rep, +5% gabbio per 7 giorni)")
        elif ev == "turno_kebab":
            self.incassa(30); self.log("Il kebabbaro ti offre un turno: +30€")
        elif ev == "rissa_subita":
            if r.random() < 0.3: self.log("Ti saltano addosso per un vecchio screzio"); self.ricovero(self.rng.randint(*RICOVERO), 20)

    # ------------------------------------------------------------------
    #  Economia
    # ------------------------------------------------------------------
    def paga(self, importo):
        """Paga un costo (al massimo quanto si ha). Zingaro: PRESTANOME di non pagare nulla."""
        s = self.s
        if importo <= 0: return
        if s.classe == "Zingaro" and self.rng.random() < PRESTANOME:
            self.log("Prestanome: la spesa viene azzerata"); return
        s.soldi = max(0.0, s.soldi - importo)

    def paga_multa(self, importo):
        """Multa: la parte non pagabile si converte in giorni di galera (1 ogni MULTA_EURO_GIORNO euro).
        Ritorna i giorni aggiuntivi."""
        s = self.s
        if importo <= 0: return 0
        if s.classe == "Zingaro" and self.rng.random() < PRESTANOME:
            self.log("Prestanome: la multa viene azzerata"); return 0
        pagabile = min(importo, s.soldi)
        s.soldi -= pagabile
        resto = importo - pagabile
        return int(math.ceil(resto / MULTA_EURO_GIORNO)) if resto > 0 else 0

    def attenziona(self, giorni, valore):
        """Attenzionato dagli sbirri: si tiene il valore e la durata piu' alti (26)."""
        s = self.s
        s.attenzionato = max(s.attenzionato, giorni)
        s.attenzionato_val = max(s.attenzionato_val if s.attenzionato > 0 else 0.0, valore)

    def cambia_salute(self, delta):
        """Ogni variazione di salute passa di qui: a 0 la run finisce, ovunque accada (14)."""
        s = self.s
        s.salute = max(0.0, min(s.salute_max, s.salute + delta))
        if s.salute <= 0 and s.vivo:
            s.vivo = False; s.fine = "piantato all'ospedale"

    def energia_max_oggi(self):
        """Massimo di energia di oggi: condizione del giorno (caldo) e salute bassa (1)."""
        s = self.s
        m = s.energia_max * s.cond.get("energia_max_mult", 1.0)
        if s.salute < SALUTE_BASSA: m *= SALUTE_BASSA_MULT
        return m

    def perdi_soldi(self, importo):
        self.paga(importo)

    def incassa(self, importo, fonte="ricompensa"):
        s = self.s
        if s.classe == "Pakistano": importo *= 1.10
        if s.classe == "Africano": importo *= 0.90
        s.soldi += importo; s.guadagni += importo
        if s.storico_guadagni: s.storico_guadagni[-1] += importo
        return importo

    def guadagna_rep(self, punti):
        s = self.s
        if punti > 0:
            if s.classe == "Magrebino" and s.drip_max() > 200: punti *= 1.10
            if s.classe == "Zingaro": punti *= 0.90
            punti *= max(0.0, 1.0 - s.rep / REP_DIMINUENTE)
        s.rep = max(REP_MIN, min(REP_MAX, s.rep + punti))

    def rep_chill(self):
        """Rep del 'chill in piazza': funziona solo fino a rep 60 (poi serve fare cose)."""
        s = self.s
        base = 0.5 + s.drip_tot() / 500.0
        return base * max(0.0, 1.0 - s.rep / 60.0)

    def rep_tiktok(self, a):
        s = self.s
        return a["rep"] * max(0.0, 1.0 - s.rep / 80.0)

    # ------------------------------------------------------------------
    #  Rischi
    # ------------------------------------------------------------------
    def rischi(self, a, t):
        """Ritorna (p_gabbio, p_ospedale) per l'azione a con investimento t."""
        s = self.s
        g = a["gabbio"][0] + t * (a["gabbio"][1] - a["gabbio"][0])
        o = a["ospedale"]
        if g == 0 and o == 0: return 0.0, 0.0
        mult = 1.0
        # classe
        if s.classe == "Africano": g *= 0.90            # "fuga istantanea": solo essere beccato (19)
        if s.classe == "Balcanico" and "FORZA" in a["tags"]: mult *= 0.70   # gabbio e ospedale
        # veicolo (azioni di fuga)
        if "VEICOLO" in a["tags"] and s.veicolo: g -= 0.05 * s.veicolo
        if a["veicolo_req"] and s.veicolo == 2: g -= 0.05
        # tools
        if "passamontagna" in s.items and "NOTTE" in a["tags"]: g -= 0.05
        if "tronchese" in s.items and "EFFRAZIONE" in a["tags"]: g -= 0.05
        # condizione del giorno
        c = s.cond
        g += c.get("gabbio_add", 0.0)
        for tag, m in c.get("risk_tag", {}).items():
            if tag in a["tags"]: mult *= m
        g *= c.get("risk_id", {}).get(a["id"], 1.0)
        # attenzionato
        if s.attenzionato > 0: g += s.attenzionato_val
        g = max(0.0, min(0.95, g * mult)); o = max(0.0, min(0.95, o * mult))
        return g, o

    def bottino_atteso(self, a, t, spesa):
        if a["bottino_x"]:
            lo, hi = a["bottino_x"]; base = spesa * (lo + hi) / 2
        else:
            lo, hi = a["bottino"]; base = (lo + 0.5 * t * (hi - lo) + hi) / 2
        return base * self.moltiplicatore_bottino(a)

    def moltiplicatore_bottino(self, a):
        s = self.s
        if "LEGALE" in a["tags"]: return 1.0
        m = 1.0 + REP_LOOT_BONUS * s.rep / 100.0   # la rep fa alzare il bottino
        m *= getattr(self, "_zc", None) or s.zona_calda(a["id"])
        for tag, x in s.cond.get("loot_tag", {}).items():
            if tag in a["tags"]: m *= x
        m *= s.cond.get("loot_id", {}).get(a["id"], 1.0)
        return m

    def estrai_bottino(self, a, t, spesa):
        r = self.rng
        if a["bottino_x"]:
            lo, hi = a["bottino_x"]; v = spesa * r.uniform(lo, hi)
        else:
            lo, hi = a["bottino"]; v = r.uniform(lo + 0.5 * t * (hi - lo), hi)
        return v * self.moltiplicatore_bottino(a)

    def costo_energia(self, a):
        s = self.s
        e = a["energia"]
        if "LEGALE" not in a["tags"] and "AZZARDO" not in a["tags"]:
            e += s.cond.get("energia_add", 0)
        if a["trasferta"]: e += s.cond.get("energia_add_trasferta", 0)
        if s.galera > 0: e *= 2   # Zingaro "chiamata al cuggino"
        return e

    def slot_necessari(self, a):
        s = self.s
        if not a["trasferta"]: return 1
        if s.classe == "Magrebino" or s.veicolo: return 1
        return 2

    def disponibile(self, a):
        s = self.s
        if s.slot not in a["slots"]: return False
        if s.rep < a["rep_min"]: return False
        if s.cooldown.get(a["id"], -1) > s.giorno: return False
        if a["id"] in s.cond.get("blocca", set()): return False
        if a["solo_evento"] and s.cond.get("abilita") != a["solo_evento"]: return False
        if a["veicolo_req"] and not s.veicolo: return False
        if "LEGALE" in a["tags"] and a["bottino"] != (0, 0) and s.lavori_oggi >= LAVORI_AL_GIORNO: return False
        if s.classe == "Magrebino":
            if "AZZARDO" in a["tags"]: return False
            if self.ramadan() and s.slot in (1, 2): return False
        if s.classe == "Pakistano" and s.slot == 4:
            if s.notte_pak_sett == s.data.isocalendar()[1]: return False
        if self.slot_necessari(a) == 2 and s.slot >= 3: return False   # 3: trasferta senza veicolo solo Mattina/Pomeriggio
        if self.costo_energia(a) > s.energia: return False
        if a["spesa"][0] > s.soldi: return False
        if s.galera > 0:
            # 5: in galera solo lo Zingaro, e solo azioni senza rischio
            if s.classe != "Zingaro": return False
            if a["gabbio"] != (0.0, 0.0) or a["ospedale"] > 0: return False
        return True

    # ------------------------------------------------------------------
    #  Azione
    # ------------------------------------------------------------------
    def esegui(self, a, t):
        s, r = self.s, self.rng
        spesa = a["spesa"][0] + t * (a["spesa"][1] - a["spesa"][0])
        s.soldi -= spesa
        s.energia -= self.costo_energia(a)
        s.azioni += 1; s.azioni_usate[a["id"]] += 1
        if "LEGALE" in a["tags"] and a["bottino"] != (0, 0): s.lavori_oggi += 1
        if a["cooldown"]: s.cooldown[a["id"]] = s.giorno + a["cooldown"]
        if s.classe == "Pakistano" and s.slot == 4: s.notte_pak_sett = s.data.isocalendar()[1]
        nslot = self.slot_necessari(a)
        if a["salute"]: self.cambia_salute(a["salute"])

        # moltiplicatori di rep: noia (solo sui guadagni, 16) e condizioni Social del giorno
        rep_tag_mult = s.noia(a["id"])
        zc = s.zona_calda(a["id"])
        s.recenti.append((s.giorno, a["id"]))
        if len(s.recenti) > 60: s.recenti = s.recenti[-60:]
        for tag, m in s.cond.get("rep_tag", {}).items():
            if tag in a["tags"]: rep_tag_mult *= m

        # --- azioni speciali senza rischio (azzardo, chill) ---
        sp = a["speciale"]
        if sp == "chill":
            self.guadagna_rep(self.rep_chill() * rep_tag_mult)   # 18: anche Virale/Halloween/Capodanno
        elif sp == "slot":
            if r.random() < 0.30: self.incassa(spesa * 2.5)
        elif sp == "scommessa":
            if r.random() < 0.45: self.incassa(spesa * 2.0); self.guadagna_rep(2)

        self._zc = zc
        g, o = self.rischi(a, t)
        esito = "ok"
        if g > 0 and r.random() < g:
            esito = "gabbio"
        elif o > 0 and r.random() < o:
            esito = "ospedale"

        if esito == "ok":
            if sp == "poker":
                if r.random() < 0.40 + s.rep / 500: self.incassa(spesa * 2.5); self.guadagna_rep(3)
                else: self.guadagna_rep(-2)
            elif sp == "corsa":
                if r.random() < 0.5 + (0.1 if s.classe == "Balcanico" else 0): self.incassa(spesa * 2.0); self.guadagna_rep(a["rep"])
            elif sp in ("tiktok", "tag"):
                rp = (self.rep_tiktok(a) if sp == "tiktok" else a["rep"]) * rep_tag_mult
                if r.random() < 0.08: rp += 10
                self.guadagna_rep(rp)
            elif sp == "chill":
                pass
            else:
                tieni = (sp == "monopattino" and s.veicolo == 0 and r.random() < 0.5)   # 17: o lo vendi o te lo tieni
                if tieni:
                    s.veicolo = 1; s.items.add("monopattino")
                elif a["bottino"] != (0, 0) or a["bottino_x"]:
                    v = self.estrai_bottino(a, t, spesa)
                    self.incassa(v)
                if sp == "cibo_gratis": s.cibo_gratis = True
                if sp == "veicolo_bonus" and s.veicolo == 0 and r.random() < 0.5:   # rapina al rider: bottino + mezzo
                    s.veicolo = 1; s.items.add("monopattino")
                self.guadagna_rep(a["rep"] * (rep_tag_mult if a["rep"] > 0 else 1.0))
            self.log(f"{a['nome']} (t={t:.1f}, spesa {spesa:.0f}) -> OK")
        elif esito == "ospedale":
            self.log(f"{a['nome']} -> finisce MALE: ospedale")
            self.ricovero(r.randint(*RICOVERO), 30 if "FORZA" in a["tags"] else 20)
        else:
            self.log(f"{a['nome']} -> BECCATO dagli sbirri")
            self.arresto(a)

        self._zc = None
        # avanzamento tempo
        s.slot += nslot

    # ------------------------------------------------------------------
    #  Ospedale
    # ------------------------------------------------------------------
    def ricovero(self, giorni, danno):
        s = self.s
        self.cambia_salute(-danno)
        s.ospedale = giorni; s.g_osp += giorni
        self.perdi_soldi(FURTO_OSPEDALE * s.soldi)

    # ------------------------------------------------------------------
    #  Tribunale
    # ------------------------------------------------------------------
    def arresto(self, a):
        s, r = self.s, self.rng
        s.arresti += 1
        self.perdi_soldi(min(SEQUESTRO_MAX, SEQUESTRO_ARRESTO * s.soldi))
        if a["veicolo_req"] and r.random() < 0.5 and s.veicolo:
            s.veicolo = 0; s.items.discard("monopattino"); s.items.discard("motorino")
        pena_base = a["pena"] * (1 + RECIDIVA_PENA * min(s.condanne, RECIDIVA_MAX))
        if s.sorvegliato > 0: pena_base *= SORVEGLIATO_MULT
        multa = a["multa"]
        # scelta della difesa
        scelta = self.policy["difesa"](self, pena_base)
        if scelta in AVVOCATI and s.soldi < AVVOCATI[scelta][0]:
            scelta = "ufficio"            # 4: una difesa che non puoi pagare non e' selezionabile
        giorni_multa = 0
        if scelta == "patteggia":
            pena = pena_base * 0.6; esito = "patteggiamento"
            giorni_multa = self.paga_multa(multa); s.condanne += 1
        else:
            costo, bonus = AVVOCATI[scelta if scelta in AVVOCATI else "ufficio"]
            if scelta == "spavaldo": costo, bonus = 0, -15; self.guadagna_rep(5)
            self.paga(costo)
            tiro = r.randint(1, 100) + bonus
            if s.classe == "Africano": tiro += 10
            if s.classe == "Italiano": tiro -= 10
            tiro -= RECIDIVA_TIRO * min(s.condanne, RECIDIVA_MAX)   # recidiva
            if s.giorno < TUTORIAL_GIORNI: tiro += TUTORIAL_BONUS     # "il giudice e' buono" (tutorial)
            if s.condanne == 0: tiro += INCENSURATO_BONUS
            if s.rep > 60: tiro -= min(8, (s.rep - 60) / 5)       # "noto in questura": max -8
            if tiro >= 85:
                pena = 0; esito = "assolto"; self.guadagna_rep(2)
            elif tiro >= 65:
                pena = 0; esito = "messa alla prova"; s.sorvegliato = 30; giorni_multa = self.paga_multa(multa * 0.5)
            elif tiro >= 40:
                pena = pena_base * 0.5; esito = "pena ridotta"; giorni_multa = self.paga_multa(multa); s.condanne += 1
            elif tiro >= 10:
                pena = pena_base; esito = "pena piena"; giorni_multa = self.paga_multa(multa); s.condanne += 1
            else:
                pena = pena_base * 1.5; esito = "aggravata"; giorni_multa = self.paga_multa(multa * 2); s.condanne += 1
        # 28: arrotondamento "scolastico" (0,5 → 1) e minimo 1 giorno per ogni condanna
        if pena > 0: pena = max(1, int(math.floor(pena + 0.5)))
        pena += giorni_multa   # 2: multa non pagata → giorni
        if giorni_multa: self.log(f"Multa non pagata: +{giorni_multa} giorni")
        self.log(f"TRIBUNALE ({scelta}): {esito}, {pena} giorni")
        if pena >= GAME_OVER_PENA or (GAME_OVER_GALERA_TOT and s.g_galera + pena > GAME_OVER_GALERA_TOT):
            s.vivo = False; s.fine = "marcito in galera"; s.galera = pena; return
        if pena > 0:
            s.galera = pena; s.g_galera += min(pena, GIORNI - s.giorno - 1)
            if pena > GIORNI - s.giorno - 1: s.fine = "365 giorni (finiti in cella)"

    # ------------------------------------------------------------------
    #  Riposo / cibo
    # ------------------------------------------------------------------
    def puo_dormire(self):
        return self.s.abs_slot - self.s.ultimo_sonno >= 2

    def dormi(self):
        s = self.s
        nome, costo, rec, sal = self.policy["cibo"](s)
        if not s.cibo_pagato:
            if s.cibo_gratis: costo = 0
            s.soldi -= costo; s.cibo_pagato = True
            self.cambia_salute(sal)
        if s.classe == "Balcanico": rec = 1.0
        emax = self.energia_max_oggi()
        s.energia = min(emax, s.energia + rec * s.energia_max)
        s.ultimo_sonno = s.abs_slot
        self.log(f"Dorme ({nome}, {costo}€) -> energia {s.energia:.0f}")
        s.slot += 1

    def paghetta_emergenza(self):
        s = self.s
        m = s.data.month
        if s.classe == "Italiano" and s.soldi <= 5 and s.paghetta_em_mese != m:
            s.soldi = 20; s.paghetta_em_mese = m; self.log("Paghetta d'emergenza: 20€")

    def negozio(self):
        """La policy decide gli acquisti (nessuno slot consumato)."""
        s = self.s
        for item_id in self.policy["acquisti"](s):
            it = NEGOZIO[item_id]
            if item_id in s.items or s.soldi < it["prezzo"]: continue
            if it["tipo"] == "veicolo" and it["livello"] <= s.veicolo: continue
            s.soldi -= it["prezzo"]; s.items.add(item_id)
            if it["tipo"] == "veicolo": s.veicolo = it["livello"]
            self.log(f"Compra {it['nome']} ({it['prezzo']}€)")

    # ------------------------------------------------------------------
    #  Loop
    # ------------------------------------------------------------------
    def gioca(self):
        s = self.s
        while s.giorno < GIORNI and s.vivo:
            s.slot = 1
            self.nuovo_giorno()
            if s.ospedale > 0:
                s.ospedale -= 1; s.giorno += 1
                if s.ospedale == 0: s.energia = s.energia_max; self.cambia_salute(+20)
                continue
            if s.galera > 0:
                s.galera -= 1
                if s.classe == "Zingaro":   # chiamata al cuggino: 1 azione/giorno (solo senza rischio: filtro in disponibile)
                    self.paghetta_emergenza()
                    self.negozio()
                    best = self.policy["scegli"](self)
                    if best: self.esegui(*best)
                s.giorno += 1
                if s.galera == 0:
                    s.energia = s.energia_max; self.guadagna_rep(3)
                continue
            m = s.data.month
            dormito = False
            while s.slot <= 4 and s.vivo and s.galera == 0 and s.ospedale == 0:
                self.paghetta_emergenza()   # 22: controllata a ogni slot
                # Pakistano: instancabile
                if s.classe == "Pakistano" and s.energia <= 15 and s.instancabile_mese != m:
                    s.energia = 100; s.instancabile_mese = m; self.log("Instancabile: energia a 100")
                self.negozio()
                deve_dormire = (s.slot == 4 and not dormito)
                scelta = None if deve_dormire else self.policy["scegli"](self)
                if scelta is None or (self.policy["dormi_se"](self, scelta) and self.puo_dormire() and not dormito):
                    if self.puo_dormire() and (not dormito or scelta is None):
                        self.dormi(); dormito = True; continue
                    if scelta is None:
                        # niente da fare: passa lo slot
                        self.log("Non fa niente"); s.slot += 1; continue
                self.esegui(*scelta)
            s.giorno += 1
        s.giorno = min(s.giorno, GIORNI)
        return s

# ======================================================================
#  POLICY (giocatori automatici)
# ======================================================================

def _ev(g: Gioco, a, t, peso_rischio, soglia_rischio, valore_rep):
    s = g.s
    spesa = a["spesa"][0] + t * (a["spesa"][1] - a["spesa"][0])
    if spesa > s.soldi: return None
    gb, os_ = g.rischi(a, t)
    if gb + os_ > soglia_rischio: return None
    # evita condanne che chiudono la run
    pena_peggiore = a["pena"] * (1 + RECIDIVA_PENA * min(s.condanne, RECIDIVA_MAX)) * (SORVEGLIATO_MULT if s.sorvegliato else 1) * 1.5
    if GAME_OVER_GALERA_TOT and s.g_galera + pena_peggiore > GAME_OVER_GALERA_TOT and peso_rischio >= 0.8: return None
    if pena_peggiore >= GAME_OVER_PENA and peso_rischio >= 0.8: return None
    if pena_peggiore >= GAME_OVER_PENA / 1.5 and peso_rischio >= 1.5: return None
    sp = a["speciale"]
    loot = 0.0
    if sp == "slot": loot = spesa * 2.5 * 0.30
    elif sp == "scommessa": loot = spesa * 2.0 * 0.45
    elif sp == "poker": loot = spesa * 2.5 * (0.40 + s.rep / 500)
    elif sp == "corsa": loot = spesa * 2.0 * 0.5
    elif a["bottino"] != (0, 0) or a["bottino_x"]: loot = g.bottino_atteso(a, t, spesa)
    if s.classe == "Pakistano": loot *= 1.1
    if s.classe == "Africano": loot *= 0.9
    ps = (1 - gb) * (1 - os_)
    reddito = s.reddito_giornaliero()
    giorni_pena = a["pena"] * (1 + RECIDIVA_PENA * min(s.condanne, RECIDIVA_MAX)) * 0.6
    costo_gabbio = gb * (giorni_pena * reddito + min(SEQUESTRO_MAX, SEQUESTRO_ARRESTO * s.soldi) + 100 + a["multa"] * 0.7)
    costo_osp = os_ * (4 * reddito + FURTO_OSPEDALE * s.soldi + 60)
    rep = a["rep"]
    if sp == "chill": rep = g.rep_chill()
    elif sp == "tiktok": rep = g.rep_tiktok(a)
    if rep > 0: rep *= max(0.0, 1.0 - s.rep / REP_DIMINUENTE) * s.noia(a["id"])
    rep_ev = rep * valore_rep * (ps if rep > 0 else 1.0)
    salute_ev = a["salute"] * 3 if s.salute < 60 else 0
    ev = ps * loot - spesa + rep_ev + salute_ev - peso_rischio * (costo_gabbio + costo_osp)
    # piccolo bonus per spendere slot in azioni redditizie piuttosto che chill
    return ev

def scegli_generico(g: Gioco, peso_rischio=1.0, soglia_rischio=1.0, max_rischio=None, rep_fattore=1.0):
    s = g.s
    giorni_left = GIORNI - s.giorno
    # 1) valore della rep come bonus sui bottini futuri (+0.3%/punto, decade 1%/giorno)
    val_loot = REP_LOOT_BONUS / 100.0 * s.reddito_giornaliero() * 100.0 * (1 - 0.99 ** giorni_left)
    # 2) valore della rep nei MARANZA POINTS finali (sopravvive solo la quota non decaduta)
    val_fine = s.patrimonio() / max(s.rep, 10.0) * (0.99 ** giorni_left)
    # 3) valore di sblocco dei tier successivi
    soglie = [10, 20, 35, 45, 50, 70]
    prossima = next((x for x in soglie if x > s.rep), None)
    val_unlock = 15.0 if (prossima and prossima - s.rep < 15) else 4.0
    valore_rep = rep_fattore * (val_loot + val_fine + val_unlock)
    best, best_ev = None, -1e9
    for a in AZIONI:
        if not g.disponibile(a): continue
        if max_rischio is not None:
            gb, os_ = g.rischi(a, 0.0)
            if gb + os_ > max_rischio: continue
        for t in (0.0, 0.5, 1.0):
            if a["spesa"] == (0, 0) and t > 0: break
            ev = _ev(g, a, t, peso_rischio, soglia_rischio, valore_rep)
            if ev is not None and ev > best_ev:
                best, best_ev = (a, t), ev
    if best is None: return None
    return best

def dormi_se_generico(g: Gioco, scelta):
    """Dorme se l'azione migliore e' misera e c'e' poca energia."""
    s = g.s
    a, t = scelta
    return s.energia < 0.35 * s.energia_max and a["energia"] <= 20 and s.slot != 1

def cibo_generico(s: Stato):
    for nome, costo, rec, sal in CIBO:
        if s.soldi >= costo + 10: return nome, costo, rec, sal
    return CIBO[-1]

def cibo_tirchio(s: Stato):
    if s.soldi >= 80: return CIBO[1]
    if s.soldi >= 15: return CIBO[2]
    return CIBO[-1]

def acquisti_bilanciato(s: Stato):
    out = []
    if s.soldi > 120: out += ["passamontagna", "tronchese"]
    if s.soldi > 700: out.append("monopattino")
    if s.soldi > 900: out.append("tuta")
    if s.soldi > 1500: out.append("catena")
    if s.soldi > 4000: out.append("motorino")
    if s.soldi > 6000: out.append("telefono")
    if s.soldi > 12000: out.append("orologio")
    return out

def acquisti_yolo(s: Stato):
    out = []
    if s.soldi > 300: out.append("tuta")
    if s.soldi > 500: out.append("monopattino")
    if s.soldi > 800: out += ["catena", "passamontagna"]
    if s.soldi > 2500: out.append("motorino")
    if s.soldi > 3000: out.append("telefono")
    if s.soldi > 8000: out.append("orologio")
    return out

def difesa_bilanciato(g: Gioco, pena):
    s = g.s
    if pena <= 3: return "ufficio"
    if s.soldi >= 1800: return "grido"
    if s.soldi >= 450: return "quartiere"
    if pena >= 30: return "patteggia"
    return "ufficio"

def difesa_yolo(g: Gioco, pena):
    s = g.s
    if s.soldi >= 600 and pena >= 20: return "grido"
    return "spavaldo"

def difesa_prudente(g: Gioco, pena):
    s = g.s
    if s.soldi >= 600: return "grido"
    if s.soldi >= 150: return "quartiere"
    return "patteggia" if pena >= 10 else "ufficio"

POLICIES = {
    "prudente": dict(
        scegli=lambda g, max_rischio=None: scegli_generico(g, peso_rischio=2.0, soglia_rischio=0.30, max_rischio=max_rischio, rep_fattore=0.8),
        dormi_se=dormi_se_generico, cibo=cibo_generico, acquisti=acquisti_bilanciato, difesa=difesa_prudente,
        generoso=True, accetta_sfide=False, onesto=True, festaiolo=False, accetta_tv=False),
    "bilanciato": dict(
        scegli=lambda g, max_rischio=None: scegli_generico(g, peso_rischio=1.0, soglia_rischio=0.60, max_rischio=max_rischio),
        dormi_se=dormi_se_generico, cibo=cibo_generico, acquisti=acquisti_bilanciato, difesa=difesa_bilanciato,
        generoso=True, accetta_sfide=True, onesto=False, festaiolo=True, accetta_tv=True),
    "yolo": dict(
        scegli=lambda g, max_rischio=None: scegli_generico(g, peso_rischio=0.5, soglia_rischio=1.0, max_rischio=max_rischio, rep_fattore=1.5),
        dormi_se=dormi_se_generico, cibo=cibo_tirchio, acquisti=acquisti_yolo, difesa=difesa_yolo,
        generoso=False, accetta_sfide=True, onesto=False, festaiolo=True, accetta_tv=True),
    "casuale": dict(
        scegli=lambda g, max_rischio=None: _scegli_casuale(g),
        dormi_se=lambda g, sc: g.s.energia < 0.3 * g.s.energia_max, cibo=cibo_generico, acquisti=acquisti_yolo,
        difesa=lambda g, p: g.rng.choice(["ufficio", "quartiere", "patteggia", "spavaldo"]),
        generoso=True, accetta_sfide=True, onesto=False, festaiolo=True, accetta_tv=True),
}

def _scegli_casuale(g: Gioco):
    """Giocatore casuale: non calcola nulla, ma legge il colore del rischio sul bottone.
    Sceglie a caso con peso 1/(rischio+0,05); il 20% delle volte e' pura curiosita' (uniforme)."""
    disp = [a for a in AZIONI if g.disponibile(a)]
    if not disp: return None
    if g.rng.random() < 0.20:
        a = g.rng.choice(disp)
    else:
        pesi = [1.0 / (sum(g.rischi(a, 0.0)) + 0.05) for a in disp]
        a = g.rng.choices(disp, weights=pesi)[0]
    t = g.rng.choice([0.0, 0.5, 1.0]) if a["spesa"] != (0, 0) else 0.0
    if a["spesa"][0] + t * (a["spesa"][1] - a["spesa"][0]) > g.s.soldi: t = 0.0
    return a, t

# ======================================================================
#  BATCH & REPORT
# ======================================================================

def _una_run(args):
    classe, policy, seed = args
    g = Gioco(classe, policy, seed=seed)
    s = g.gioca()
    return dict(classe=classe, policy=policy, vivo=s.vivo, fine=s.fine, giorno=s.giorno,
                soldi=s.soldi, patrimonio=s.patrimonio(), rep=s.rep, punti=s.punti(), azioni=s.azioni,
                arresti=s.arresti, galera=s.g_galera, osp=s.g_osp, condanne=s.condanne,
                azioni_usate=dict(s.azioni_usate))

_POOL = None
def run_batch(classe, policy, n, seed=0):
    jobs = [(classe, policy, seed * 100003 + i) for i in range(n)]
    if _POOL is not None: return _POOL.map(_una_run, jobs)
    return [_una_run(j) for j in jobs]

def riassunto(rows):
    n = len(rows)
    vivi = sum(r["vivo"] for r in rows)
    med = lambda k: statistics.median(r[k] for r in rows)
    fini = collections.Counter(r["fine"] for r in rows)
    return dict(n=n, sopravv=vivi / n, punti_med=med("punti"), patr_med=med("patrimonio"), rep_med=med("rep"),
                galera_med=med("galera"), osp_med=med("osp"), arresti_med=med("arresti"), azioni_med=med("azioni"),
                fini=fini)

def stampa_tabella(titolo, righe, chiave):
    print(f"\n=== {titolo} ===")
    print(f"{'':14s} {'sopr.':>6s} {'punti med':>12s} {'patrim.':>9s} {'rep':>5s} {'galera':>6s} {'osp':>5s} {'arr.':>5s} {'azioni':>6s}  fine")
    for k, rs in righe.items():
        fini = ", ".join(f"{a}:{b}" for a, b in rs["fini"].most_common(3))
        print(f"{k:14s} {rs['sopravv']*100:5.0f}% {rs['punti_med']:12,.0f} {rs['patr_med']:9,.0f} {rs['rep_med']:5.1f} "
              f"{rs['galera_med']:6.0f} {rs['osp_med']:5.0f} {rs['arresti_med']:5.1f} {rs['azioni_med']:6.0f}  {fini}")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--runs", type=int, default=60)
    ap.add_argument("--charts", action="store_true")
    ap.add_argument("--verbose", action="store_true")
    ap.add_argument("--classe", default="Magrebino")
    ap.add_argument("--policy", default="bilanciato")
    ap.add_argument("--json", default=None, help="salva i risultati grezzi in JSON")
    args = ap.parse_args()
    classi = CLASSI

    if args.verbose:
        g = Gioco(args.classe, args.policy, seed=42, verbose=True)
        s = g.gioca()
        print(f"\nFINE: {s.fine} | giorno {s.giorno} | patrimonio {s.patrimonio():.0f} | rep {s.rep:.1f} | MARANZA POINTS {s.punti():,.0f}")
        print("Azioni piu' usate:", s.azioni_usate.most_common(8))
        return

    global _POOL
    import multiprocessing as mp
    _POOL = mp.Pool(max(1, mp.cpu_count()))
    tutti = []
    # 1) Classi x policy
    for pol in ("prudente", "bilanciato", "yolo", "casuale"):
        righe = {}
        for cl in classi:
            rows = run_batch(cl, pol, args.runs); tutti += rows
            righe[cl] = riassunto(rows)
        stampa_tabella(f"CLASSI — policy {pol} ({args.runs} run)", righe, "classe")
    _POOL.close()
    # 3) uso delle azioni (bilanciato, tutte le classi)
    uso = collections.Counter()
    for r in tutti:
        if r["policy"] == "bilanciato":
            uso.update(r["azioni_usate"])
    tot = sum(uso.values()) or 1
    print("\n=== USO DELLE AZIONI (policy bilanciato, tutte le classi) ===")
    for aid, c in uso.most_common():
        print(f"  {aid} {A[aid]['nome']:38s} {c/tot*100:5.1f}%")
    mai = [aid for aid in A if uso[aid] == 0]
    if mai: print("  MAI usate:", ", ".join(mai))

    if args.json:
        with open(args.json, "w") as f: json.dump(tutti, f, default=str)
    if args.charts:
        grafici(tutti)

def grafici(tutti):
    import matplotlib; matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    classi = list(CLASSI.keys())
    pols = ["prudente", "bilanciato", "yolo", "casuale"]
    fig, axes = plt.subplots(1, 3, figsize=(15, 4.5))
    for ax, (k, titolo) in zip(axes, [("punti", "MARANZA POINTS (mediana)"), ("sopravv", "Sopravvivenza a 365 giorni"), ("galera", "Giorni di galera (mediana)")]):
        w = 0.2
        for i, pol in enumerate(pols):
            vals = []
            for cl in classi:
                rows = [r for r in tutti if r["classe"] == cl and r["policy"] == pol]
                if k == "sopravv": vals.append(100 * sum(r["vivo"] for r in rows) / len(rows))
                else: vals.append(statistics.median(r[k] for r in rows))
            ax.bar([x + i * w for x in range(len(classi))], vals, w, label=pol)
        ax.set_xticks([x + 1.5 * w for x in range(len(classi))]); ax.set_xticklabels(classi, rotation=20, fontsize=8)
        ax.set_title(titolo, fontsize=10); ax.grid(axis="y", alpha=0.3)
    axes[0].legend(fontsize=8)
    fig.suptitle("Maranza Simulator — bilanciamento")
    fig.tight_layout(); fig.savefig("results/bilanciamento.png", dpi=130)
    print("\nGrafico salvato: results/bilanciamento.png")

if __name__ == "__main__":
    main()
