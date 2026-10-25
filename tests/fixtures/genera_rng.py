#!/usr/bin/env python3
"""Genera tests/fixtures/rng-python.json: sequenze di chiamate a random.Random con i risultati attesi.
   Serve a verificare che src/engine/rng.ts riproduca Python numero per numero.
   Eseguire dalla radice: python3 tests/fixtures/genera_rng.py"""
import json, os, random

casi = []
for seme in (0, 1, 42, 199, 123456789, 2**32 + 5, 2**53 - 1):
    r = random.Random(seme)
    chiamate = []
    for i in range(400):
        k = i % 7
        if k == 0: chiamate.append(["random", [], r.random()])
        elif k == 1: chiamate.append(["uniform", [20, 150], r.uniform(20, 150)])
        elif k == 2: chiamate.append(["randint", [1, 100], r.randint(1, 100)])
        elif k == 3: chiamate.append(["randint", [1, 3], r.randint(1, 3)])
        elif k == 4: chiamate.append(["choice", [16], r.choice(range(16))])
        elif k == 5: chiamate.append(["choice", [1], r.choice(range(1))])
        else:
            pesi = [0.12, 0.06, 0.05, 0.05, 0.04, 0.05, 0.04, 0.04, 0.05, 0.08, 0.04]
            chiamate.append(["choices", [pesi], r.choices(range(len(pesi)), weights=pesi)[0]])
    casi.append({"seme": seme, "chiamate": chiamate})
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "rng-python.json")
with open(out, "w") as f: json.dump(casi, f)
print(out)
