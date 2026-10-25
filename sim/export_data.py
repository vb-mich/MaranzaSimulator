#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Esporta tutti i dati di gioco del simulatore in data/game-data.json, pronti per essere
   caricati dal motore TypeScript. Eseguire da sim/: python3 export_data.py

   Il JSON e' la fonte di verita' dei numeri: il codice del gioco NON deve ridigitare costanti."""
import json, os
import maranza_sim as M

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "data", "game-data.json")

def azione(a):
    d = dict(a)
    d["tags"] = sorted(a["tags"])
    d["slots"] = sorted(a["slots"])
    d["spesa"] = list(a["spesa"]); d["gabbio"] = list(a["gabbio"]); d["bottino"] = list(a["bottino"])
    d["bottino_x"] = list(a["bottino_x"]) if a["bottino_x"] else None
    d["tier"] = {0: 1, 10: 2, 20: 3, 35: 4, 45: 4, 50: 4, 70: 5}[a["rep_min"]]
    return d

def condizione(c):
    d = dict(c)
    for k in ("blocca",):
        if k in d: d[k] = sorted(d[k])
    if "stagione" in d: d["stagione"] = sorted(d["stagione"])
    return d

data = {
    "_readme": "Generato da sim/export_data.py. Non modificare a mano: cambiare maranza_sim.py e rigenerare.",
    "costanti": {
        "GIORNI": M.GIORNI, "DATA_INIZIO": M.DATA_INIZIO.isoformat(), "SLOT_NOMI": M.SLOT_NOMI,
        "REP_DECAY": M.REP_DECAY, "REP_DIMINUENTE": M.REP_DIMINUENTE, "REP_LOOT_BONUS": M.REP_LOOT_BONUS,
        "REP_MIN": M.REP_MIN, "REP_MAX": M.REP_MAX, "REP_INIZIALE": 5.0,
        "SEQUESTRO_ARRESTO": M.SEQUESTRO_ARRESTO, "SEQUESTRO_MAX": M.SEQUESTRO_MAX,
        "FURTO_OSPEDALE": M.FURTO_OSPEDALE, "NOIA_PIAZZA": M.NOIA_PIAZZA, "ZONA_CALDA": M.ZONA_CALDA,
        "GAME_OVER_PENA": M.GAME_OVER_PENA, "GAME_OVER_GALERA_TOT": M.GAME_OVER_GALERA_TOT,
        "RECIDIVA_MAX": M.RECIDIVA_MAX, "RECIDIVA_PENA": M.RECIDIVA_PENA, "RECIDIVA_TIRO": M.RECIDIVA_TIRO,
        "SORVEGLIATO_MULT": M.SORVEGLIATO_MULT, "SORVEGLIATO_GIORNI": 30,
        "TUTORIAL_GIORNI": M.TUTORIAL_GIORNI, "TUTORIAL_BONUS": M.TUTORIAL_BONUS, "INCENSURATO_BONUS": M.INCENSURATO_BONUS,
        "LAVORI_AL_GIORNO": M.LAVORI_AL_GIORNO, "RICOVERO": list(M.RICOVERO),
        "SALUTE_MAX": M.SALUTE_MAX, "PRESTANOME": M.PRESTANOME, "P_GUAIO_BASE": M.P_GUAIO_BASE,
        "TIER_REP": [0, 10, 20, 35, 45, 50, 70],
        "GRADI_REP": [[0, "Sconosciuto"], [10, "Zanza"], [20, "Conosciuto"], [35, "Rispettato"], [50, "Boss di zona"], [70, "Leggenda"]],
        "RISCHIO_COLORI": [[0.08, "basso"], [0.15, "medio"], [0.30, "alto"], [1.0, "estremo"]],
        "PATRIMONIO_DRIP": 0.5, "GAME_OVER_PENALITA": 0.5,
        "MULTA_CONVERSIONE_EURO_GIORNO": M.MULTA_EURO_GIORNO,
        "SALUTE_BASSA_SOGLIA": M.SALUTE_BASSA, "SALUTE_BASSA_ENERGIA_MULT": M.SALUTE_BASSA_MULT,
        "UI_FULMINI": [[20, 1], [40, 2], [60, 3], [9999, 4]],
        "UI_BOTTINO_SIMBOLI": [[100, "€"], [500, "€€"], [999999, "€€€"]],
        "UI_SLIDER_TACCHE": [[0.0, "Alla buona"], [0.5, "Preparato"], [1.0, "Da professionista"]],
        "UI_RISCHIO_SU": "gabbio+ospedale, alla tacca selezionata, con i modificatori di oggi",
        "RISCHIO_MULTA_RIDOTTA_PROVA": 0.5, "MULTA_AGGRAVATA_MULT": 2.0,
        "TRIBUNALE_SOGLIE": {"assolto": 85, "messa_alla_prova": 65, "ridotta": 40, "piena": 10},
        "TRIBUNALE_MULT": {"assolto": 0, "messa_alla_prova": 0, "ridotta": 0.5, "piena": 1.0, "aggravata": 1.5, "patteggiamento": 0.6},
        "TIRO_CLASSE": {"Africano": 10, "Italiano": -10},
        "NOTO_IN_QUESTURA": {"da_rep": 60, "per_punti": 5, "max": 8},
        "REP_USCITA_GALERA": 3, "REP_ASSOLTO": 2, "SPAVALDO_REP": 5, "SPAVALDO_TIRO": -15,
        "VEICOLO_SEQUESTRO_ARRESTO": 0.5, "OSPEDALE_SALUTE_USCITA": 20, "SALUTE_GIORNO": 1,
        "DANNO_RICOVERO": {"default": 20, "FORZA": 30, "sfida_piazza": 15},
        "CORSA_BALCANICO_BONUS": 0.10, "SFIDA_BALCANICO_MULT": 1.3, "POKER_REP": {"vinci": 3, "perdi": -2},
        "RISCHIO_FUGA_VEICOLO_PT": 0.05, "RISCHIO_TOOL_PT": 0.05,
        "VIRALE_P": 0.08, "VIRALE_REP": 10, "CHILL_CAP": 60, "TIKTOK_CAP": 80, "CHILL_DRIP_DIV": 500,
        "MONOPATTINO_TIENI_P": 0.5,
    },
    "classi": M.CLASSI,
    "abilita_classi": {
        "Magrebino": ["trasferta_gratis", "trapper_di_quartiere(+10% rep se drip>200)", "no_azzardo", "ramadan(15feb-16mar: no azioni mattina/pomeriggio)"],
        "Pakistano": ["instancabile(energia<=15 -> 100, 1/mese)", "business(+10% incassi)", "ventiquattrosette(1 azione di notte a settimana)"],
        "Africano":  ["giudice(+10 al tiro)", "fuga(rischio x0.9)", "famiglia(-10% incassi)"],
        "Zingaro":   ["prestanome(40% perdite azzerate)", "cuggino(1 azione senza rischio al giorno in galera, energia x2)", "carovana(-10% guadagni rep)"],
        "Balcanico": ["forza_bruta(rischio x0.7 in FORZA)", "recupero(cibo sempre 100%)", "arroganza(+10% guai)"],
        "Italiano":  ["paghetta(50 ogni lunedi)", "paghetta_emergenza(<=5 -> 20, 1/mese)", "giudice(-10 al tiro)"],
    },
    "cibo": [dict(nome=n, costo=c, recupero=r, salute=s) for n, c, r, s in M.CIBO],
    "negozio": M.NEGOZIO,
    "avvocati": {k: dict(costo=v[0], bonus=v[1]) for k, v in M.AVVOCATI.items()},
    "azioni": [azione(a) for a in M.AZIONI],
    "condizioni": [condizione(c) for c in M.CONDIZIONI],
    "feste": [dict(mese=k[0], giorno=k[1], **condizione(v)) for k, v in M.FESTE.items()],
    "guai": M.GUAI,
}

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2, default=list)
print("scritto", os.path.normpath(OUT), os.path.getsize(OUT), "byte")
