#!/usr/bin/env python3
"""ottimizza-art.py — PNG sorgente in assets/art/ -> WebP leggeri in public/art/ + assets/art/manifest.json.

Uso (dalla radice del progetto, serve Pillow: pip install pillow):
    python3 tools/ottimizza-art.py            # converte tutto e riscrive il manifest
    python3 tools/ottimizza-art.py --anteprima generated/anteprima-drip.png
                                              # in piu' salva i ritratti con tutti i layer, per controllare le ancore

* ritratti delle classi e layer dedicati a una classe: 768x1152 con il 7% di aria in alto, senza ritagli (le ancore dipendono dall'inquadratura);
* icone (oggetti, azioni, ui) e avatar: ritagliati sul contenuto e rimessi al centro di un quadrato;
* layer del drip: ritagliati sul contenuto, cosi' l'ancora descrive l'oggetto e non il margine vuoto;
* luoghi: 1200x800, opachi; splash (ui/splash.png, 4:3): 1200x900.
Le ancore dei layer sono scritte a mano in tools/ancore-drip.json e copiate nel manifest.
I file in public/art/ e il manifest sono generati: non si modificano a mano.
"""

import argparse
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "art"
DST = ROOT / "public" / "art"
MANIFEST = SRC / "manifest.json"
ANCORE = ROOT / "tools" / "ancore-drip.json"
DATI = ROOT / "data" / "game-data.json"

LIMITE_BYTES = 300 * 1024
LIMITE_TOTALE = 6 * 1024 * 1024

# cartella -> (lato o dimensione, modo)
REGOLE = {
    "characters": None,  # decisa per file: ritratti o avatar
    "items": (256, "icona"),
    "actions": (192, "icona"),
    "ui": (256, "icona"),
    "drip": (512, "layer"),
    "locations": ((1200, 800), "scena"),
}
UI_GRANDI = {"esito-bottino", "esito-arresto", "esito-ospedale", "fine-vittoria", "fine-galera", "fine-ospedale", "icona-app"}
Z_DRIP = {"tuta": 1, "catena": 2, "orologio": 3, "cappello": 4, "fasciato": 5}


def ritaglia(im, margine=0.06):
    """Ritaglia sul contenuto non trasparente e centra in un quadrato con un piccolo margine."""
    bbox = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    if bbox:
        im = im.crop(bbox)
    lato = int(max(im.size) * (1 + 2 * margine))
    quadro = Image.new("RGBA", (lato, lato), (0, 0, 0, 0))
    quadro.paste(im, ((lato - im.width) // 2, (lato - im.height) // 2))
    return quadro


def solo_contenuto(im):
    bbox = im.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    return im.crop(bbox) if bbox else im


def con_margine(im, aria=0.07):
    """Ritratto 1024x1536 -> 768x1152 con il 7% di spazio vuoto in alto, cosi' il cappello non esce dal quadro."""
    w, h = round(768 * (1 - aria)), round(1152 * (1 - aria))
    tela = Image.new("RGBA", (768, 1152), (0, 0, 0, 0))
    tela.paste(im.resize((w, h), Image.LANCZOS), ((768 - w) // 2, 1152 - h))
    return tela


def salva_webp(im, dest, opaco=False):
    dest.parent.mkdir(parents=True, exist_ok=True)
    for q in (82, 75, 68, 60, 50):
        if opaco:
            im.convert("RGB").save(dest, "WEBP", quality=q, method=6)
        else:
            im.save(dest, "WEBP", quality=q, alpha_quality=90, method=6)
        if dest.stat().st_size <= LIMITE_BYTES:
            break
    return dest.stat().st_size


def converti(png):
    cartella, slug = png.parent.name, png.stem
    im = Image.open(png)
    opaco = im.mode != "RGBA" or im.getchannel("A").getextrema()[0] == 255
    im = im.convert("RGB" if opaco else "RGBA")
    if cartella == "characters":
        if im.height > im.width:  # ritratto di classe
            im = con_margine(im)
        else:  # avatar del Boss, giudice
            im = ritaglia(im, 0.02).resize((512, 512), Image.LANCZOS)
    else:
        misura, modo = REGOLE[cartella]
        if modo == "scena":
            im = im.resize(misura, Image.LANCZOS)
        elif modo == "layer" and im.height > im.width:  # layer dedicato a una classe: stessa tela del ritratto
            im = con_margine(im)
        elif modo == "layer":
            im = solo_contenuto(im)
            im.thumbnail((misura, misura), Image.LANCZOS)
        else:
            if cartella == "ui" and slug in UI_GRANDI:
                misura = 512
            if opaco and im.width != im.height:  # splash: resta 4:3, largo 1200
                im.thumbnail((1200, 1200), Image.LANCZOS)
            else:
                if not opaco:
                    im = ritaglia(im)
                im = im.resize((misura, misura), Image.LANCZOS)
    dest = DST / cartella / f"{slug}.webp"
    peso = salva_webp(im, dest, opaco)
    return dest, im.size, peso


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--anteprima", help="salva un foglio con i ritratti vestiti di tutti i layer")
    args = ap.parse_args()

    dati = json.loads(DATI.read_text(encoding="utf-8"))
    classi = list(dati["classi"].keys())
    negozio = set(dati["negozio"].keys())
    azioni = {a["id"] for a in dati["azioni"]}
    ancore = json.loads(ANCORE.read_text(encoding="utf-8")) if ANCORE.exists() else {}

    pngs = sorted(p for p in SRC.glob("*/*.png") if p.parent.name in REGOLE)
    if not pngs:
        sys.exit("nessun PNG in assets/art/")

    man = {"versione": 1, "web": "art/", "personaggi": {}, "drip": {}, "fasciato": None,
           "oggetti": {}, "luoghi": {}, "azioni": {}, "ui": {}}
    totale = 0
    dedicati = {}  # layer fatti per una sola classe: drip/<capo>-<classe>.png
    for png in pngs:
        dest, (w, h), peso = converti(png)
        totale += peso
        rel = dest.relative_to(DST).as_posix()
        cartella, slug = png.parent.name, png.stem
        avviso = "  << oltre 300 KB" if peso > LIMITE_BYTES else ""
        print(f"{rel:40s} {w:5d}x{h:<5d} {peso / 1024:7.1f} KB{avviso}")
        if cartella == "characters":
            chiave = next((c for c in classi if c.lower() == slug), slug)
            man["personaggi"][chiave] = {"file": rel, "w": w, "h": h}
        elif cartella == "drip" and "-" in slug:
            capo, cl = slug.split("-", 1)
            classe = next(c for c in classi if c.lower() == cl)
            dedicati.setdefault(capo, {})[classe] = {"x": 0.5, "y": 0.5, "larghezza": 1, "rot": 0, "file": rel}
        elif cartella == "drip":
            voce = {"file": rel, "w": w, "h": h, "z": Z_DRIP.get(slug, 9), "ancore": ancore.get(slug, {})}
            if slug == "fasciato":
                man["fasciato"] = voce
            else:
                man["drip"][slug] = voce
        elif cartella == "items":
            man["oggetti"][slug] = rel
        elif cartella == "actions":
            man["azioni"][slug.upper()] = rel
        elif cartella == "locations":
            man["luoghi"][slug] = rel
        elif cartella == "ui":
            man["ui"][slug] = rel

    for capo, per_classe in dedicati.items():
        man["drip"][capo]["ancore"].update(per_classe)

    # controlli di coerenza con game-data.json
    mancano = [c for c in classi if c not in man["personaggi"]]
    mancano += [f"oggetto {i}" for i in sorted(negozio - set(man["oggetti"]))]
    mancano += [f"azione {a}" for a in sorted(azioni - set(man["azioni"]))]
    for capo, voce in list(man["drip"].items()) + [("fasciato", man["fasciato"] or {"ancore": {}})]:
        mancano += [f"ancora {capo}/{c}" for c in classi if c not in voce["ancore"]]
    estranei = sorted(set(man["oggetti"]) - negozio) + sorted(set(man["azioni"]) - azioni)

    MANIFEST.write_text(json.dumps(man, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"\n{len(pngs)} file, totale {totale / 1024 / 1024:.2f} MB" +
          ("  << oltre 6 MB" if totale > LIMITE_TOTALE else ""))
    if mancano:
        print("mancano: " + ", ".join(mancano))
    if estranei:
        print("id sconosciuti a game-data.json: " + ", ".join(estranei))

    if args.anteprima:
        anteprima(man, classi, ROOT / args.anteprima)


def vesti(man, classe, capi):
    """Compone il ritratto WebP di una classe con i layer indicati, come fara' la UI."""
    base = Image.open(DST / man["personaggi"][classe]["file"]).convert("RGBA")
    W, H = base.size
    voci = [man["drip"].get(c) or (man["fasciato"] if c == "fasciato" else None) for c in capi]
    for voce in sorted((v for v in voci if v), key=lambda v: v["z"]):
        a = voce["ancore"].get(classe)
        if not a:
            continue
        layer = Image.open(DST / a.get("file", voce["file"])).convert("RGBA")
        lw = max(1, round(a["larghezza"] * W))
        layer = layer.resize((lw, max(1, round(layer.height * lw / layer.width))), Image.LANCZOS)
        if a.get("specchio"):
            layer = layer.transpose(Image.FLIP_LEFT_RIGHT)
        if a.get("rot"):
            layer = layer.rotate(-a["rot"], expand=True, resample=Image.BICUBIC)
        base.alpha_composite(layer, (round(a["x"] * W - layer.width / 2), round(a["y"] * H - layer.height / 2)))
    return base


def anteprima(man, classi, dest):
    righe = [[], ["tuta", "catena", "orologio", "cappello"], ["fasciato"]]
    celle = [[vesti(man, c, capi) for c in classi] for capi in righe]
    w, h = 256, 384
    foglio = Image.new("RGB", (w * len(classi), h * len(righe)), (40, 30, 60))
    for r, riga in enumerate(celle):
        for c, im in enumerate(riga):
            foglio.paste(im.resize((w, h), Image.LANCZOS), (c * w, r * h), im.resize((w, h), Image.LANCZOS))
    dest.parent.mkdir(parents=True, exist_ok=True)
    foglio.save(dest)
    print(f"anteprima: {dest}")


if __name__ == "__main__":
    main()
