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
    d["tier"] = M.TIER_AZIONE[a["rep_min"]]
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
        "REP_MIN": M.REP_MIN, "REP_MAX": M.REP_MAX, "REP_INIZIALE": M.REP_INIZIALE,
        "SEQUESTRO_ARRESTO": M.SEQUESTRO_ARRESTO, "SEQUESTRO_MAX": M.SEQUESTRO_MAX,
        "FURTO_OSPEDALE": M.FURTO_OSPEDALE, "NOIA_PIAZZA": M.NOIA_PIAZZA, "ZONA_CALDA": M.ZONA_CALDA,
        "GAME_OVER_PENA": M.GAME_OVER_PENA, "GAME_OVER_GALERA_TOT": M.GAME_OVER_GALERA_TOT,
        "RECIDIVA_MAX": M.RECIDIVA_MAX, "RECIDIVA_PENA": M.RECIDIVA_PENA, "RECIDIVA_TIRO": M.RECIDIVA_TIRO,
        "SORVEGLIATO_MULT": M.SORVEGLIATO_MULT, "SORVEGLIATO_GIORNI": M.SORVEGLIATO_GIORNI,
        "TUTORIAL_GIORNI": M.TUTORIAL_GIORNI, "TUTORIAL_BONUS": M.TUTORIAL_BONUS, "INCENSURATO_BONUS": M.INCENSURATO_BONUS,
        "LAVORI_AL_GIORNO": M.LAVORI_AL_GIORNO, "RICOVERO": list(M.RICOVERO),
        "SALUTE_MAX": M.SALUTE_MAX, "PRESTANOME": M.PRESTANOME, "P_GUAIO_BASE": M.P_GUAIO_BASE,
        "TIER_REP": M.TIER_REP,
        "GRADI_REP": M.GRADI_REP,
        "RISCHIO_COLORI": M.RISCHIO_COLORI,
        "PATRIMONIO_DRIP": M.PATRIMONIO_DRIP, "GAME_OVER_PENALITA": M.GAME_OVER_PENALITA,
        "MULTA_CONVERSIONE_EURO_GIORNO": M.MULTA_EURO_GIORNO,
        "SALUTE_BASSA_SOGLIA": M.SALUTE_BASSA, "SALUTE_BASSA_ENERGIA_MULT": M.SALUTE_BASSA_MULT,
        "UI_FULMINI": M.UI_FULMINI,
        "UI_BOTTINO_SIMBOLI": M.UI_BOTTINO_SIMBOLI,
        "UI_SLIDER_TACCHE": M.UI_SLIDER_TACCHE,
        "UI_RISCHIO_SU": M.UI_RISCHIO_SU,
        "RISCHIO_MULTA_RIDOTTA_PROVA": M.RISCHIO_MULTA_RIDOTTA_PROVA, "MULTA_AGGRAVATA_MULT": M.MULTA_AGGRAVATA_MULT,
        "TRIBUNALE_SOGLIE": M.TRIBUNALE_SOGLIE,
        "TRIBUNALE_MULT": M.TRIBUNALE_MULT,
        "TIRO_CLASSE": M.TIRO_CLASSE,
        "NOTO_IN_QUESTURA": M.NOTO_IN_QUESTURA,
        "REP_USCITA_GALERA": M.REP_USCITA_GALERA, "REP_ASSOLTO": M.REP_ASSOLTO, "SPAVALDO_REP": M.SPAVALDO_REP, "SPAVALDO_TIRO": M.SPAVALDO_TIRO,
        "VEICOLO_SEQUESTRO_ARRESTO": M.VEICOLO_SEQUESTRO_ARRESTO, "OSPEDALE_SALUTE_USCITA": M.OSPEDALE_SALUTE_USCITA, "SALUTE_GIORNO": M.SALUTE_GIORNO,
        "DANNO_RICOVERO": M.DANNO_RICOVERO,
        "CORSA_BALCANICO_BONUS": M.CORSA_BALCANICO_BONUS, "SFIDA_BALCANICO_MULT": M.SFIDA_BALCANICO_MULT, "POKER_REP": M.POKER_REP,
        "RISCHIO_FUGA_VEICOLO_PT": M.RISCHIO_FUGA_VEICOLO_PT, "RISCHIO_TOOL_PT": M.RISCHIO_TOOL_PT,
        "VIRALE_P": M.VIRALE_P, "VIRALE_REP": M.VIRALE_REP, "CHILL_CAP": M.CHILL_CAP, "TIKTOK_CAP": M.TIKTOK_CAP, "CHILL_DRIP_DIV": M.CHILL_DRIP_DIV,
        "MONOPATTINO_TIENI_P": M.MONOPATTINO_TIENI_P,
        # --- regole del motore (prima scritte in linea nel simulatore) ---
        "NOIA_GIORNI": M.NOIA_GIORNI, "ZONA_CALDA_GIORNI": M.ZONA_CALDA_GIORNI, "ZONA_CALDA_MIN": M.ZONA_CALDA_MIN,
        "RECENTI_MAX": M.RECENTI_MAX, "INVESTIMENTO_BOTTINO_MIN": M.INVESTIMENTO_BOTTINO_MIN,
        "SONNO_INTERVALLO": M.SONNO_INTERVALLO, "TRASFERTA_SLOT": M.TRASFERTA_SLOT, "TRASFERTA_SLOT_LIMITE": M.TRASFERTA_SLOT_LIMITE,
        "ULTIMO_SONNO_INIZIALE": M.ULTIMO_SONNO_INIZIALE, "COND_SEME_OFFSET": M.COND_SEME_OFFSET,
        "RISCHIO_MAX": M.RISCHIO_MAX, "RISCHIO_VEICOLO_REQ_PT": M.RISCHIO_VEICOLO_REQ_PT,
        "SLOT_VINCITA_P": M.SLOT_VINCITA_P, "SLOT_VINCITA_MULT": M.SLOT_VINCITA_MULT,
        "SCOMMESSA_VINCITA_P": M.SCOMMESSA_VINCITA_P, "SCOMMESSA_VINCITA_MULT": M.SCOMMESSA_VINCITA_MULT, "SCOMMESSA_REP": M.SCOMMESSA_REP,
        "POKER_VINCITA_P": M.POKER_VINCITA_P, "POKER_VINCITA_REP_DIV": M.POKER_VINCITA_REP_DIV, "POKER_VINCITA_MULT": M.POKER_VINCITA_MULT,
        "CORSA_VINCITA_P": M.CORSA_VINCITA_P, "CORSA_VINCITA_MULT": M.CORSA_VINCITA_MULT,
        "VEICOLO_BONUS_P": M.VEICOLO_BONUS_P,
        "TIRO_DADO": M.TIRO_DADO, "PENA_ARROTONDAMENTO": M.PENA_ARROTONDAMENTO, "PENA_MIN_GIORNI": M.PENA_MIN_GIORNI,
        # --- abilita' di classe ---
        "TRAPPER_DRIP_MIN": M.TRAPPER_DRIP_MIN, "TRAPPER_REP_MULT": M.TRAPPER_REP_MULT,
        "RAMADAN_INIZIO": M.RAMADAN_INIZIO, "RAMADAN_FINE": M.RAMADAN_FINE, "RAMADAN_SLOT_VIETATI": M.RAMADAN_SLOT_VIETATI,
        "INSTANCABILE_SOGLIA": M.INSTANCABILE_SOGLIA, "INSTANCABILE_ENERGIA": M.INSTANCABILE_ENERGIA,
        "INCASSO_PAKISTANO_MULT": M.INCASSO_PAKISTANO_MULT, "VENTIQUATTROSETTE_SLOT": M.VENTIQUATTROSETTE_SLOT,
        "FUGA_AFRICANO_MULT": M.FUGA_AFRICANO_MULT, "INCASSO_AFRICANO_MULT": M.INCASSO_AFRICANO_MULT,
        "REP_ZINGARO_MULT": M.REP_ZINGARO_MULT, "CUGGINO_ENERGIA_MULT": M.CUGGINO_ENERGIA_MULT,
        "FORZA_BRUTA_MULT": M.FORZA_BRUTA_MULT, "RECUPERO_BALCANICO": M.RECUPERO_BALCANICO,
        "GUAIO_BALCANICO_BONUS": M.GUAIO_BALCANICO_BONUS,
        "PAGHETTA_IMPORTO": M.PAGHETTA_IMPORTO, "PAGHETTA_GIORNO_SETTIMANA": M.PAGHETTA_GIORNO_SETTIMANA,
        "PAGHETTA_EMERGENZA_SOGLIA": M.PAGHETTA_EMERGENZA_SOGLIA, "PAGHETTA_EMERGENZA_IMPORTO": M.PAGHETTA_EMERGENZA_IMPORTO,
        # --- guai ---
        "GUAI_EFFETTI": M.GUAI_EFFETTI,
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
