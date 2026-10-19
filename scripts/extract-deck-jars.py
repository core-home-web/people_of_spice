#!/usr/bin/env python3
"""
Turn the line-review deck (PEOPLE OF SPICE - SPICES - ON PO - *.pptx) into web-ready
product images.

For every SKU label on a collection slide this composites the label art onto the
empty jar exactly where the deck places it, trims, and writes
images/products/<slug>.webp. Where the deck carries a filled "hero" jar photo for a
SKU, that photo is used instead. It also samples each label's cartouche colour and
writes content/label-colors.json, which the page builder uses as the per-spice
accent colour.

Usage:
  python3 scripts/extract-deck-jars.py "path/to/deck.pptx"

Re-run whenever a new deck arrives; swap in studio photography later by dropping
images/products/<slug>.webp files over these.
"""
import json
import re
import sys
import zipfile
from collections import Counter
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT_IMG = ROOT / "images" / "products"
OUT_COLORS = ROOT / "content" / "label-colors.json"

SLUGS = {
    "69723": "himalayan-pink-salt", "69724": "smoked-salt", "69725": "spicy-chili-salt",
    "69726": "herb-salt", "69727": "turkey-brine-blend", "69728": "sweet-spicy-holiday-rub",
    "69729": "gingerbread-spice", "69730": "harvest-herb-rub", "69731": "poultry-seasoning",
    "69732": "texas-bbq", "69733": "shawarma", "69734": "asado-rub", "69735": "zaatar",
    "69736": "sunday-roast-pork-rub", "69737": "citrus-herb-blend", "69738": "citrus-chili-lime",
    "69739": "chai-sugar", "69740": "cinnamon-sugar", "69741": "arrabbiata",
    "69742": "lemon-herb-pasta", "69743": "chili-garlic-pizza", "69744": "pizzeria-herb",
    "69745": "sicilian-sprinkle", "69746": "caesar-style", "69747": "greek-style",
    "69748": "green-goddess", "69749": "paprika", "69750": "smoked-paprika",
    "69751": "herb-chive-potatoes", "69752": "turmeric", "69753": "herbes-de-provence",
    "69754": "cinnamon-sticks", "69755": "whole-dill", "69756": "whole-fennel",
    "69757": "ground-cinnamon", "69758": "ground-ginger", "69759": "parsley",
    "69760": "basil", "69761": "whole-star-anise",
}

# Filled-jar hero photos in the 5.6.2026 deck (media name -> SKU).
FILLED = {
    "image11.png": "69723", "image18.png": "69730", "image27.png": "69738",
    "image30.png": "69739", "image33.png": "69741", "image34.png": "69745",
    "image41.png": "69746", "image44.png": "69752",
}
JARS = ("image6.png", "image12.png")  # grinder jar, flip-top jar
BOX = re.compile(r'<a:off x="(-?\d+)" y="(-?\d+)"/><a:ext cx="(\d+)" cy="(\d+)"')


def shapes(z, n):
    xml = z.read(f"ppt/slides/slide{n}.xml").decode()
    rels = {}
    for r in re.findall(r"<Relationship [^>]*/>", z.read(f"ppt/slides/_rels/slide{n}.xml.rels").decode()):
        rels[re.search(r'Id="([^"]+)"', r).group(1)] = re.search(r'Target="([^"]+)"', r).group(1).split("/")[-1]
    pics, texts = [], []
    for m in re.finditer(r"<p:pic>.*?</p:pic>|<p:sp>.*?</p:sp>", xml, re.S):
        s = m.group(0)
        b = BOX.search(s)
        if not b:
            continue
        box = tuple(int(v) for v in b.groups())
        if s.startswith("<p:pic>"):
            crop = re.search(r"<a:srcRect([^/]*)/>", s)
            pics.append((rels[re.search(r'r:embed="([^"]+)"', s).group(1)], box, crop.group(1) if crop else ""))
        else:
            t = " ".join(re.findall(r"<a:t>([^<]*)</a:t>", s)).strip()
            if re.match(r"\d{5}", t):
                texts.append((t[:5], box))
    return pics, texts


def centre(b):
    return b[0] + b[2] / 2, b[1] + b[3] / 2


def label_colour(img):
    """Most common opaque colour in the middle of the label = the cartouche fill."""
    w, h = img.size
    region = img.crop((int(w * .3), int(h * .42), int(w * .7), int(h * .58))).convert("RGBA")
    c = Counter()
    for r, g, b, a in region.getdata():
        if a > 200 and not (r > 235 and g > 235 and b > 235) and max(r, g, b) > 40:
            c[(r // 12 * 12, g // 12 * 12, b // 12 * 12)] += 1
    r, g, b = c.most_common(1)[0][0]
    return f"#{r:02x}{g:02x}{b:02x}"


def save(img, slug):
    img = img.crop(img.getbbox())
    img.thumbnail((640, 640), Image.LANCZOS)
    img.save(OUT_IMG / f"{slug}.webp", quality=84, method=6)


def main(deck):
    OUT_IMG.mkdir(parents=True, exist_ok=True)
    z = zipfile.ZipFile(deck)
    slides = sorted(int(re.findall(r"\d+", n)[0]) for n in z.namelist() if re.match(r"ppt/slides/slide\d+\.xml$", n))
    colours = {}
    for n in slides:
        pics, texts = shapes(z, n)
        jars = [p for p in pics if p[0] in JARS]
        if not jars or not texts:
            continue
        labels = [p for p in pics if p[0] not in JARS and p[1][2] < 91440 * 12 and p[0] != "image5.png"]
        for name, (lx, ly, lw, lh), _ in labels:
            jar = min(jars, key=lambda j: sum(abs(a - b) for a, b in zip(centre(j[1]), centre((lx, ly, lw, lh)))))
            sku = min(texts, key=lambda t: abs(centre(t[1])[0] - (lx + lw / 2)) + abs(t[1][1] - (ly + lh)))[0]
            slug = SLUGS.get(sku)
            if not slug:
                continue
            label = Image.open(z.open("ppt/media/" + name)).convert("RGBA")
            colours[slug] = label_colour(label)
            jx, jy, jw, jh = jar[1]
            jimg = Image.open(z.open("ppt/media/" + jar[0])).convert("RGBA")
            crop = {k: int(v) for k, v in re.findall(r'(\w)="(\d+)"', jar[2])}
            iw, ih = jimg.size
            jimg = jimg.crop((round(iw * crop.get("l", 0) / 1e5), round(ih * crop.get("t", 0) / 1e5),
                              round(iw * (1 - crop.get("r", 0) / 1e5)), round(ih * (1 - crop.get("b", 0) / 1e5))))
            scale = 1100 / jh
            canvas = jimg.resize((round(jw * scale), 1100), Image.LANCZOS)
            canvas.alpha_composite(label.resize((round(lw * scale), round(lh * scale)), Image.LANCZOS),
                                   (round((lx - jx) * scale), round((ly - jy) * scale)))
            save(canvas, slug)
    for media, sku in FILLED.items():
        save(Image.open(z.open("ppt/media/" + media)).convert("RGBA"), SLUGS[sku])
    OUT_COLORS.write_text(json.dumps(dict(sorted(colours.items())), indent=2) + "\n")
    print(f"{len(colours)} SKUs -> {OUT_IMG.relative_to(ROOT)}, colours -> {OUT_COLORS.relative_to(ROOT)}")


if __name__ == "__main__":
    main(sys.argv[1])
