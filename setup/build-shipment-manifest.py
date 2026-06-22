#!/usr/bin/env python3
"""Build shipment-images.json from assets/shipment/ folders."""
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SHIPMENT = ROOT / "assets" / "shipment"
OUT = ROOT / "shipment-images.json"

STAGES = [
    {"id": "production", "folder": "01-production", "label": "\u05d9\u05d9\u05e6\u05d5\u05e8 \u05d1\u05de\u05e4\u05e2\u05dc", "icon": "fa-industry"},
    {"id": "loading", "folder": "02-loading", "label": "\u05d4\u05e2\u05de\u05e1\u05d4 \u05dc\u05de\u05db\u05d5\u05dc\u05d4", "icon": "fa-truck-loading"},
    {"id": "shipped", "folder": "03-shipped", "label": "\u05e0\u05e9\u05dc\u05d7 \u05de\u05d4\u05de\u05e4\u05e2\u05dc", "icon": "fa-shipping-fast"},
    {"id": "israel-port", "folder": "04-israel-port", "label": "\u05d4\u05d2\u05d9\u05e2 \u05dc\u05e0\u05de\u05dc \u05d1\u05d9\u05e9\u05e8\u05d0\u05dc", "icon": "fa-anchor"},
]

EXTS = {".webp"}


def natural_key(name):
    import re
    return [int(x) if x.isdigit() else x.lower() for x in re.split(r"(\d+)", name)]


def list_images(folder):
    path = SHIPMENT / folder
    if not path.is_dir():
        return []
    files = [f for f in path.iterdir() if f.suffix.lower() in EXTS]
    files.sort(key=lambda f: natural_key(f.name))
    return [f"assets/shipment/{folder}/{f.name}" for f in files]


def main():
    manifest = {"stages": []}
    for stage in STAGES:
        manifest["stages"].append({
            **stage,
            "images": list_images(stage["folder"]),
        })
    OUT.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    total = sum(len(s["images"]) for s in manifest["stages"])
    print(f"Wrote {OUT} — {total} images across {len(STAGES)} stages")


if __name__ == "__main__":
    main()
