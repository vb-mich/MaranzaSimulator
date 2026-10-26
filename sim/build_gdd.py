#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Assembla docs/GDD.md: il template scritto a mano (sim/gdd_template.md) + le tabelle generate
   dai dati di maranza_sim.py + i risultati dell'ultimo batch (sim/results/batch_finale.txt).
   Cosi' GDD e simulatore non possono divergere. Eseguire da sim/: python3 build_gdd.py"""
import re, os
import maranza_sim as M

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "docs", "GDD.md")

def pct(x): return f"{round(x*100):d}%"
def eur(x): return f"{x:,.0f}€".replace(",", ".")

def slot_str(sl):
    if sl == {1,2,3,4}: return "tutti"
    return "/".join({1:"Mat",2:"Pom",3:"Ser",4:"Not"}[i] for i in sorted(sl))

def tabella_azioni(ids):
    out = ["| ID | Azione | Slot | Trasf. | Rep min | Energia | Spesa (min–max) | Gabbio (spesa min→max) | Ospedale | Bottino | Rep | Pena base | Multa | Cooldown |",
           "|---|---|---|---|---|---|---|---|---|---|---|---|---|---|"]
    for i in ids:
        a = M.A[i]
        spesa = "—" if a["spesa"] == (0,0) else (eur(a["spesa"][0]) if a["spesa"][0]==a["spesa"][1] else f"{eur(a['spesa'][0])}–{eur(a['spesa'][1])}")
        g = "—" if a["gabbio"] == (0,0) else (pct(a["gabbio"][0]) if a["gabbio"][0]==a["gabbio"][1] else f"{pct(a['gabbio'][0])}→{pct(a['gabbio'][1])}")
        o = "—" if a["ospedale"] == 0 else pct(a["ospedale"])
        if a["bottino_x"]: b = f"spesa × {a['bottino_x'][0]}–{a['bottino_x'][1]}"
        elif a["bottino"] != (0,0): b = f"{eur(a['bottino'][0])}–{eur(a['bottino'][1])}"
        else: b = "—"
        sp = a["speciale"]
        if sp == "slot": b = "30%: ×2,5 la puntata"
        if sp == "scommessa": b = "45%: ×2 la puntata"
        if sp == "poker": b = "40% (+rep/500): ×2,5 la puntata"
        if sp == "corsa": b = "50%: ×2 la puntata"
        rep = f"{a['rep']:+g}" if a["rep"] else "0"
        if sp == "poker": rep = "+3 vinci / −2 perdi"
        if sp == "chill": rep = f"+{a['rep']:g} (+drip/{M.CHILL_DRIP_DIV}) fino a rep {M.CHILL_CAP}".replace(".", ",")
        if sp == "tiktok": rep = f"+{a['rep']:g} fino a rep 80 (8%: +10)"
        if sp == "tag": rep = f"+{a['rep']:g} (8%: +10)"
        pena = f"{a['pena']} gg" if a["pena"] else "—"
        multa = eur(a["multa"]) if a["multa"] else "—"
        cd = f"{a['cooldown']} gg" if a["cooldown"] else "—"
        req = []
        if a["veicolo_req"]: req.append("veicolo")
        if a["solo_evento"]: req.append("solo giorni evento")
        nome = a["nome"] + (f" *({', '.join(req)})*" if req else "")
        out.append(f"| {i} | {nome} | {slot_str(a['slots'])} | {'sì' if a['trasferta'] else '—'} | {a['rep_min'] or '—'} | {a['energia']} | {spesa} | {g} | {o} | {b} | {rep} | {pena} | {multa} | {cd} |")
    return "\n".join(out)

def tabella_negozio():
    out = ["| Oggetto | Prezzo | Tipo | Effetto |", "|---|---|---|---|"]
    drip = lambda k: f"Drip {eur(M.NEGOZIO[k]['valore'])[:-1]}"
    eff = {"passamontagna": "−5 punti di rischio Gabbio nelle azioni di Notte",
           "tronchese": "−5 punti di rischio Gabbio nelle azioni con Effrazione",
           "cappello": f"{drip('cappello')} (conta per il Chill e per il Patrimonio)",
           "tuta": drip("tuta"),
           "catena": f"{drip('catena')} — sblocca 'Trapper di quartiere' (Magrebino)",
           "monopattino": "Veicolo liv. 1: trasferte senza slot extra; −5 pt Gabbio nelle azioni di Fuga; sblocca le azioni che richiedono un veicolo",
           "telefono": drip("telefono"),
           "motorino": "Veicolo liv. 2: come il monopattino ma −10 pt Gabbio nelle azioni di Fuga e −5 pt in quelle che richiedono veicolo",
           "orologio": drip("orologio")}
    for k, it in M.NEGOZIO.items():
        out.append(f"| {it['nome']} | {eur(it['prezzo'])} | {it['tipo']} | {eff[k]} |")
    return "\n".join(out)

def tabella_classi():
    out = ["| Classe | Soldi iniziali | Energia max |", "|---|---|---|"]
    for r, v in M.CLASSI.items():
        out.append(f"| {r} | {v['soldi']}€ | {v['energia']} |")
    return "\n".join(out)

def risultati():
    txt = open(os.path.join(HERE, "results", "batch_finale.txt"), encoding="utf-8").read()
    blocchi = re.split(r"\n(?==== )", txt)
    keep = [b for b in blocchi if b.startswith("===")]
    return "```\n" + "\n\n".join(b.strip() for b in keep) + "\n```"

def main():
    t = open(os.path.join(HERE, "gdd_template.md"), encoding="utf-8").read()
    legali = [i for i in M.A if i.startswith("L")]
    azzardo = [i for i in M.A if i.startswith("G")]
    t1 = [i for i in M.A if i.startswith("C") and M.A[i]["rep_min"] == 0]
    t2 = [i for i in M.A if i.startswith("C") and M.A[i]["rep_min"] == 10]
    t3 = [i for i in M.A if i.startswith("C") and M.A[i]["rep_min"] == 20]
    t4 = [i for i in M.A if i.startswith("C") and 35 <= M.A[i]["rep_min"] < 70]
    t5 = [i for i in M.A if i.startswith("C") and M.A[i]["rep_min"] >= 70]
    t = t.replace("{{TAB_LEGALI}}", tabella_azioni(legali))
    t = t.replace("{{TAB_AZZARDO}}", tabella_azioni(azzardo))
    t = t.replace("{{TAB_T1}}", tabella_azioni(t1)).replace("{{TAB_T2}}", tabella_azioni(t2))
    t = t.replace("{{TAB_T3}}", tabella_azioni(t3)).replace("{{TAB_T4}}", tabella_azioni(t4)).replace("{{TAB_T5}}", tabella_azioni(t5))
    t = t.replace("{{TAB_NEGOZIO}}", tabella_negozio()).replace("{{TAB_CLASSI}}", tabella_classi())
    t = t.replace("{{RISULTATI}}", risultati())
    assert "{{" not in t, "placeholder non sostituito"
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    open(OUT, "w", encoding="utf-8").write(t)
    print("scritto", os.path.normpath(OUT), len(t), "caratteri")

if __name__ == "__main__":
    main()
