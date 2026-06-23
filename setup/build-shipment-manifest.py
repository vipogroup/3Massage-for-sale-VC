#!/usr/bin/env python3
"""Build shipment-images.json from assets/shipment/ folders."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SHIPMENT = ROOT / "assets" / "shipment"
OUT = ROOT / "shipment-images.json"

STAGES = [
    {"id": "production", "folder": "01-production", "label": "ייצור במפעל", "icon": "fa-industry"},
    {"id": "loading", "folder": "02-loading", "label": "העמסה למכולה", "icon": "fa-truck-loading"},
    {"id": "shipped", "folder": "03-shipped", "label": "נשלח מהמפעל", "icon": "fa-shipping-fast"},
    {"id": "israel-port", "folder": "04-israel-port", "label": "הגיע לנמל בישראל", "icon": "fa-anchor"},
]

IMAGE_EXTS = {".webp"}
VIDEO_EXTS = {".mp4", ".webm", ".mov"}


def natural_key(name):
    return [int(x) if x.isdigit() else x.lower() for x in re.split(r"(\d+)", name)]


def list_images(folder):
    path = SHIPMENT / folder
    if not path.is_dir():
        return []
    files = [
        f for f in path.iterdir()
        if f.is_file() and f.suffix.lower() in IMAGE_EXTS
    ]
    files.sort(key=lambda f: natural_key(f.name))
    return [f"assets/shipment/{folder}/{f.name}" for f in files]


def list_videos(folder):
    path = SHIPMENT / folder / "videos"
    if not path.is_dir():
        return []
    files = [
        f for f in path.iterdir()
        if f.is_file() and f.suffix.lower() in VIDEO_EXTS
    ]
    files.sort(key=lambda f: natural_key(f.name))
    return [f"assets/shipment/{folder}/videos/{f.name}" for f in files]


def main():
    manifest = {"stages": []}
    for stage in STAGES:
        images = list_images(stage["folder"])
        videos = list_videos(stage["folder"])
        manifest["stages"].append({
            **stage,
            "images": images,
            "videos": videos,
        })
    OUT.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    total_img = sum(len(s["images"]) for s in manifest["stages"])
    total_vid = sum(len(s["videos"]) for s in manifest["stages"])
    print(f"Wrote {OUT} — {total_img} images, {total_vid} videos across {len(STAGES)} stages")


if __name__ == "__main__":
    main()
