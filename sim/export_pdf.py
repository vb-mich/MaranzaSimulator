#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Esporta docs/GDD.md in docs/GDD.pdf (versione decorata, senza appendici).
   Dipendenze: pip install markdown weasyprint. Eseguire da sim/: python3 export_pdf.py"""
import re, os, datetime
import markdown
from weasyprint import HTML, CSS

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "..", "docs", "GDD.md")
OUT = os.path.join(HERE, "..", "docs", "GDD.pdf")

md = open(SRC, encoding="utf-8").read()

# --- 1. taglia le appendici (e la riga --- che le precede)
md = re.split(r"\n-{3,}\n\s*# Appendice A", md)[0].rstrip()

# --- 2. titolo e intro: il primo H1 diventa la copertina
md = md.replace("# MARANZA SIMULATOR — Game Design Document\n", "", 1)

# --- 3. note del designer: righe che iniziano con "$ " (anche indentate) → paragrafi autonomi
righe, out = md.split("\n"), []
for r in righe:
    if r.strip().startswith("$ "):
        out += ["", "%%NOTA%% " + r.strip()[2:], ""]
    else:
        out.append(r)
md = "\n".join(out)
# liste annidate: il markdown del GDD usa 2 spazi, python-markdown ne vuole 4
md = re.sub(r"^  (\* |\d+\. )", r"    \1", md, flags=re.M)

# --- 4. markdown → html
html = markdown.markdown(md, extensions=["tables", "sane_lists", "smarty"], output_format="html5")
html = re.sub(r"<p>%%NOTA%% (.*?)</p>", r'<div class="nota"><span class="nota-label">Nota del designer</span>\1</div>', html, flags=re.S)

# --- 5. sezione "Le azioni": pagine orizzontali (tabelle da 14 colonne)
a = html.index("<h2>Le azioni</h2>"); b = html.index("<h2>Sbirri, arresto e Tribunale</h2>")
html = html[:a] + '<div class="wide">' + html[a:b] + "</div>" + html[b:]

# --- 6. copertina + indice
h2 = re.findall(r"<h2>(.*?)</h2>", html)
indice = "".join(f"<li>{t}</li>" for t in h2)
MESI = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"]
_d = datetime.date.today(); oggi = f"{_d.day} {MESI[_d.month-1]} {_d.year}"
cover = f"""
<section class="cover">
  <div class="cover-band"></div>
  <div class="cover-kicker">Casa Bombadil</div>
  <h1 class="cover-title">MARANZA<br>SIMULATOR</h1>
  <div class="cover-sub">Game Design Document</div>
  <div class="cover-meta">Life-sim satirico 2D per browser · {oggi}</div>
  <div class="cover-grid"></div>
</section>
<section class="toc">
  <h2 class="toc-title">Indice</h2>
  <ol>{indice}</ol>
</section>
"""
html = cover + html

CSS_TEXT = """
@page { size: A4; margin: 20mm 17mm 20mm 17mm;
  @top-left { content: "Maranza Simulator — Game Design Document"; font: 8pt 'Inter'; color: #8a7fb0; }
  @top-right { content: "Casa Bombadil"; font: 8pt 'Inter'; color: #8a7fb0; }
  @bottom-center { content: counter(page) " / " counter(pages); font: 8pt 'Inter'; color: #8a7fb0; } }
@page wide { size: A4 landscape; margin: 16mm 15mm 18mm 15mm; }
@page cover { margin: 0; @top-left { content: none } @top-right { content: none } @bottom-center { content: none } }
.cover { page: cover; height: 297mm; position: relative; background: #1b1238; color: #fff; font-family: 'Inter'; }
.cover-band { position: absolute; left: 0; top: 0; width: 100%; height: 118mm;
  background: linear-gradient(135deg, #ff4fa3 0%, #8e4bff 55%, #35d0c6 100%); }
.cover-kicker { position: absolute; left: 22mm; top: 128mm; font-size: 12pt; letter-spacing: 4px; text-transform: uppercase; color: #35d0c6; font-weight: 600; }
.cover-title { position: absolute; left: 22mm; top: 136mm; font-family: 'Inter Display', 'Inter'; font-size: 54pt; font-weight: 900; line-height: 1; margin: 0; letter-spacing: -1px; color: #fff; border: none; padding: 0; page-break-before: avoid; }
.cover-sub { position: absolute; left: 22mm; top: 190mm; font-size: 20pt; font-weight: 300; color: #e9e3ff; }
.cover-meta { position: absolute; left: 22mm; top: 205mm; font-size: 10pt; color: #8a7fb0; }
.cover-grid { position: absolute; left: 0; bottom: 0; width: 100%; height: 55mm;
  background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='34' height='34'><path d='M0 0H34V34' fill='none' stroke='%23ff4fa3' stroke-opacity='.45' stroke-width='1'/></svg>");
  background-size: 9mm 9mm; }
.toc { page-break-after: always; }
.toc-title { border: none !important; }
.toc ol { columns: 2; column-gap: 12mm; font-size: 10pt; line-height: 1.6; padding-left: 5mm; }
.wide { page: wide; }
.wide h2 { page-break-before: auto; }
body { font-family: 'Inter', 'DejaVu Sans'; font-size: 9.6pt; line-height: 1.42; color: #231c3d; }
h1 { font-size: 22pt; color: #1b1238; margin: 0 0 4mm 0; page-break-before: always; border-bottom: 3px solid #ff4fa3; padding-bottom: 2mm; }
h2 { font-size: 15pt; color: #1b1238; margin: 7mm 0 3mm 0; padding-left: 3mm; border-left: 4px solid #8e4bff; page-break-after: avoid; }
h3 { font-size: 11.5pt; color: #8e4bff; margin: 5mm 0 2mm 0; page-break-after: avoid; }
p { margin: 0 0 2.2mm 0; }
ul, ol { margin: 0 0 2.5mm 0; padding-left: 5mm; }
li { margin-bottom: 1mm; }
code { font-family: 'DejaVu Sans Mono'; font-size: 8.3pt; background: #f1edfb; padding: 0 2px; border-radius: 2px; }
pre { background: #f1edfb; padding: 3mm; font-size: 7.5pt; border-radius: 3px; white-space: pre-wrap; }
table { border-collapse: collapse; width: 100%; margin: 2mm 0 4mm 0; font-size: 7.9pt; page-break-inside: auto; }
thead { display: table-header-group; }
th { background: #1b1238; color: #fff; text-align: left; padding: 1.6mm 1.8mm; font-weight: 600; }
td { padding: 1.4mm 1.8mm; border-bottom: 1px solid #e3ddf5; vertical-align: top; }
tr:nth-child(even) td { background: #f8f6fe; }
tr { page-break-inside: avoid; }
.wide table { font-size: 7.3pt; }
.nota { background: #fff3fa; border-left: 4px solid #ff4fa3; padding: 2.2mm 3mm; margin: 2.5mm 0 3.5mm 0; font-size: 8.6pt; color: #4a3a5e; page-break-inside: avoid; }
.nota-label { display: block; font-size: 7pt; letter-spacing: 2px; text-transform: uppercase; color: #ff4fa3; font-weight: 700; margin-bottom: 1mm; }
strong { color: #1b1238; }
hr { border: none; border-top: 1px solid #e3ddf5; margin: 5mm 0; }
"""

doc = f"<!doctype html><html lang='it'><head><meta charset='utf-8'><title>Maranza Simulator — GDD</title></head><body>{html}</body></html>"
HTML(string=doc, base_url=HERE).write_pdf(OUT, stylesheets=[CSS(string=CSS_TEXT)])
print("scritto", os.path.normpath(OUT), os.path.getsize(OUT) // 1024, "KB")
