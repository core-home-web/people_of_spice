#!/usr/bin/env python3
"""
Turn cut-out product photos into the web image set that lives in R2.

Input:  a folder of transparent PNGs named <sku>_<nn>.png, produced by
        scripts/cutout.swift from the studio photos (<sku>_01 = English front,
        _02 = back with Nutrition Facts, _03 = French front).
Output: <out>/products/<slug>/<angle>.png               lossless master
        <out>/products/<slug>/<angle>-<h>.webp          480 / 960 / 1600 px tall
        <out>/manifest.json                             what the page builder reads
        <out>/upload-webp.json, upload-png.json         `wrangler r2 bulk put` lists

Usage:
  swiftc -O scripts/cutout.swift -o /tmp/pos-cutout
  /tmp/pos-cutout "<photo folder>" /tmp/pos-cut
  python3 scripts/process-product-photos.py /tmp/pos-cut /tmp/pos-media
  npx wrangler r2 bulk put people-of-spice-media --remote -f /tmp/pos-media/upload-webp.json \
      --ct image/webp --cc "public, max-age=31536000, immutable"
"""
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
ANGLES = {"01": "front", "02": "back", "03": "front-fr"}
HEIGHTS = (480, 960, 1600)
PAD = 0.03  # breathing room around the trimmed bottle, as a fraction of its height


def main(cut_dir: Path, out_dir: Path) -> None:
    products = json.loads((ROOT / "content/products.json").read_text())
    slug_for = {p["sku"]: p["id"] for p in products}
    manifest, uploads = {}, {"webp": [], "png": []}

    for src in sorted(cut_dir.glob("*.png")):
        sku, _, n = src.stem.partition("_")
        angle, slug = ANGLES.get(n), slug_for.get(sku)
        if not angle or not slug:
            print(f"skip {src.name}")
            continue
        im = Image.open(src).convert("RGBA")
        l, t, r, b = im.getbbox()
        pad = round((b - t) * PAD)
        im = im.crop((max(0, l - pad), max(0, t - pad), min(im.width, r + pad), min(im.height, b + pad)))
        folder = out_dir / "products" / slug
        folder.mkdir(parents=True, exist_ok=True)

        key = f"products/{slug}/{angle}.png"
        im.save(out_dir / key, optimize=True)
        uploads["png"].append({"key": key, "file": str(out_dir / key)})

        sizes = {}
        for h in HEIGHTS:
            h = min(h, im.height)
            w = round(im.width * h / im.height)
            key = f"products/{slug}/{angle}-{h}.webp"
            im.resize((w, h), Image.LANCZOS).save(out_dir / key, quality=86, method=6)
            uploads["webp"].append({"key": key, "file": str(out_dir / key)})
            sizes[h] = {"key": key, "w": w}
        manifest.setdefault(slug, {"sku": sku})[angle] = {"aspect": round(im.width / im.height, 4), "sizes": sizes}
        print(f"ok {slug} {angle} {im.width}x{im.height}")

    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    for kind, items in uploads.items():
        (out_dir / f"upload-{kind}.json").write_text(json.dumps(items, indent=1))
    print(f"{len(manifest)} products, {len(uploads['webp'])} webp, {len(uploads['png'])} png")


if __name__ == "__main__":
    main(Path(sys.argv[1]), Path(sys.argv[2]))
