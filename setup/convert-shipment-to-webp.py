#!/usr/bin/env python3
"""Convert all shipment images to WebP and rebuild shipment-images.json."""
import json
import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SHIPMENT = ROOT / "assets" / "shipment"
OUT = ROOT / "shipment-images.json"
QUALITY = 85
MAX_WIDTH = 1600

STAGES = [
    {"id": "production", "folder": "01-production", "label": "\u05d9\u05d9\u05e6\u05d5\u05e8 \u05d1\u05de\u05e4\u05e2\u05dc", "icon": "fa-industry"},
    {"id": "loading", "folder": "02-loading", "label": "\u05d4\u05e2\u05de\u05e1\u05d4 \u05dc\u05de\u05db\u05d5\u05dc\u05d4", "icon": "fa-truck-loading"},
    {"id": "shipped", "folder": "03-shipped", "label": "\u05e0\u05e9\u05dc\u05d7 \u05de\u05d4\u05de\u05e4\u05e2\u05dc", "icon": "fa-shipping-fast"},
    {"id": "israel-port", "folder": "04-israel-port", "label": "\u05d4\u05d2\u05d9\u05e2 \u05dc\u05e0\u05de\u05dc \u05d1\u05d9\u05e9\u05e8\u05d0\u05dc", "icon": "fa-anchor"},
]

SOURCE_EXTS = {".jpeg", ".jpg", ".png", ".gif", ".bmp", ".tiff", ".tif"}
OUTPUT_EXT = ".webp"


def natural_key(name):
    return [int(x) if x.isdigit() else x.lower() for x in re.split(r"(\d+)", name)]


def convert_file(src: Path) -> Path | None:
    dst = src.with_suffix(OUTPUT_EXT)
    if dst.exists() and dst != src:
        print(f"  skip (webp exists): {src.name}")
        return dst
    try:
        with Image.open(src) as im:
            if im.mode in ("RGBA", "P"):
                im = im.convert("RGBA")
            elif im.mode != "RGB":
                im = im.convert("RGB")
            w, h = im.size
            if w > MAX_WIDTH:
                ratio = MAX_WIDTH / w
                im = im.resize((MAX_WIDTH, int(h * ratio)), Image.Resampling.LANCZOS)
            save_kw = {"quality": QUALITY, "method": 6}
            if im.mode == "RGBA":
                save_kw["lossless"] = False
            im.save(dst, "WEBP", **save_kw)
        old_kb = src.stat().st_size / 1024
        new_kb = dst.stat().st_size / 1024
        saved = 100 * (1 - new_kb / old_kb) if old_kb else 0
        print(f"  {src.name} -> {dst.name}  ({old_kb:.0f}KB -> {new_kb:.0f}KB, -{saved:.0f}%)")
        if src != dst:
            src.unlink()
        return dst
    except Exception as e:
        print(f"  ERROR {src}: {e}", file=sys.stderr)
        return None


def list_webp(folder: str) -> list[str]:
    path = SHIPMENT / folder
    if not path.is_dir():
        return []
    files = [f for f in path.iterdir() if f.suffix.lower() == OUTPUT_EXT]
    files.sort(key=lambda f: natural_key(f.name))
    return [f"assets/shipment/{folder}/{f.name}" for f in files]


def rebuild_manifest():
    manifest = {"stages": []}
    for stage in STAGES:
        manifest["stages"].append({**stage, "images": list_webp(stage["folder"])})
    OUT.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    total = sum(len(s["images"]) for s in manifest["stages"])
    print(f"\nWrote {OUT.name} — {total} WebP images")


def main():
    if not SHIPMENT.is_dir():
        print(f"Missing folder: {SHIPMENT}", file=sys.stderr)
        sys.exit(1)
    sources = [
        f for f in SHIPMENT.rglob("*")
        if f.is_file() and f.suffix.lower() in SOURCE_EXTS
    ]
    if not sources:
        print("No images to convert.")
        rebuild_manifest()
        return
    print(f"Converting {len(sources)} images to WebP (quality={QUALITY}, max width={MAX_WIDTH}px)...")
    converted = 0
    for src in sorted(sources, key=lambda p: natural_key(p.name)):
        if convert_file(src):
            converted += 1
    rebuild_manifest()
    print(f"Done — {converted} files converted.")


if __name__ == "__main__":
    main()
