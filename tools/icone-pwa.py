#!/usr/bin/env python3
"""icone-pwa.py — icone della PWA in public/icons/ dall'icona dell'app (assets/art/ui/icona-app.png).

Uso (dalla radice del progetto, serve Pillow): python3 tools/icone-pwa.py
L'icona e' un'illustrazione a tutta tela, quindi la 512 vale anche come "maskable" (vite.config.ts):
il soggetto sta nel cerchio centrale che Android tiene. I PNG in public/icons/ sono generati.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "art" / "ui" / "icona-app.png"
DST = ROOT / "public" / "icons"

USCITE = {
    "icona-192.png": 192,
    "icona-512.png": 512,
    "apple-touch-icon.png": 180,
}


def main():
    DST.mkdir(parents=True, exist_ok=True)
    im = Image.open(SRC).convert("RGB")
    for nome, lato in USCITE.items():
        out = DST / nome
        im.resize((lato, lato), Image.LANCZOS).save(out, optimize=True)
        print(f"{out.relative_to(ROOT)}  {lato}x{lato}  {out.stat().st_size // 1024} KB")


if __name__ == "__main__":
    main()
