#!/usr/bin/env python3
"""Genera tests/fixtures/pymath-python.json: potenze e medie calcolate da CPython, per verificare
   src/engine/pymath.ts. Eseguire dalla radice: python3 tests/fixtures/genera_pymath.py"""
import json, os, random, statistics

r = random.Random(3)
medie = []
for n in range(1, 30):
    xs = [r.uniform(-50, 3000) * r.choice([1, 1.1, 0.9]) for _ in range(n)]
    medie.append([xs, statistics.mean(xs)])
out = {
    "potenze": {str(b): [b ** n for n in range(400)] for b in (0.85, 0.99, 0.5)},
    "medie": medie,
}
path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pymath-python.json")
with open(path, "w") as f: json.dump(out, f)
print(path)
