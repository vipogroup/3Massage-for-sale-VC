#!/usr/bin/env python3
"""Verify image paths and extensions across the project."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
IMAGE_EXTS = {".webp", ".jpeg", ".jpg", ".png", ".gif", ".bmp"}
SCAN_EXTS = {".html", ".json", ".css", ".js"}


def collect_refs():
    refs = set()
    pat = re.compile(r"""['"]([^'"]+\.(?:webp|jpeg|jpg|png|gif|mp4|webm))['"]""", re.I)
    for p in ROOT.rglob("*"):
        if p.suffix.lower() not in SCAN_EXTS:
            continue
        try:
            text = p.read_text(encoding="utf-8", errors="ignore")
        except OSError:
            continue
        rel = p.relative_to(ROOT).as_posix()
        for m in pat.finditer(text):
            ref = m.group(1).replace("\\", "/")
            if ref.startswith("http") or ref.startswith("//"):
                continue
            refs.add((rel, ref))
    return refs


def main():
    refs = collect_refs()
    missing = []
    ok_webp = []
    non_webp_refs = []

    for source, ref in sorted(refs):
        path = ROOT / ref
        if not path.exists():
            missing.append((ref, source))
        elif path.suffix.lower() in {".jpg", ".jpeg", ".png", ".gif", ".bmp"}:
            non_webp_refs.append((ref, source))
        elif path.suffix.lower() == ".webp":
            ok_webp.append(ref)

    # Files on disk
    disk_images = []
    for p in ROOT.rglob("*"):
        if p.suffix.lower() in IMAGE_EXTS:
            disk_images.append(p.relative_to(ROOT).as_posix())

    # Shipment manifest vs disk
    manifest_path = ROOT / "shipment-images.json"
    manifest_issues = []
    if manifest_path.exists():
        data = json.loads(manifest_path.read_text(encoding="utf-8", errors="replace"))
        for stage in data.get("stages", []):
            for img in stage.get("images", []):
                if not (ROOT / img).exists():
                    manifest_issues.append(img)
                elif not img.endswith(".webp"):
                    manifest_issues.append(f"{img} (not .webp)")

    print("=== MISSING (referenced but file not found) ===")
    for ref, src in missing:
        print(f"  {ref}")
        print(f"    in: {src}")
    print(f"Count: {len(missing)}\n")

    print("=== REFERENCES NOT .webp ===")
    for ref, src in non_webp_refs:
        print(f"  {ref}  (in {src})")
    print(f"Count: {len(non_webp_refs)}\n")

    print("=== ORPHAN IMAGES (on disk, maybe unused) ===")
    ref_paths = {r for _, r in refs}
    for img in sorted(disk_images):
        if img not in ref_paths and "shipment/" in img:
            continue  # shipment loaded via JSON
        if img not in ref_paths and not any(img in m for m in manifest_issues):
            if "shipment/" in img:
                pass  # checked via manifest
            elif img not in ref_paths:
                # check if in shipment json
                in_manifest = False
                if manifest_path.exists():
                    text = manifest_path.read_text(encoding="utf-8")
                    if img in text:
                        in_manifest = True
                if not in_manifest:
                    print(f"  {img}")
    # simpler orphan list
    for img in sorted(disk_images):
        if "product-images" in img:
            print(f"  {img}  (unused folder)")

    print("\n=== SHIPMENT MANIFEST ISSUES ===")
    if manifest_issues:
        for x in manifest_issues:
            print(f"  {x}")
    else:
        print("  All manifest paths exist and are .webp")

    # Count shipment webp vs non-webp on disk
    shipment = ROOT / "assets" / "shipment"
    bad_shipment = []
    if shipment.is_dir():
        for f in shipment.rglob("*"):
            if f.suffix.lower() in {".jpg", ".jpeg", ".png"}:
                bad_shipment.append(f.relative_to(ROOT).as_posix())
    print("\n=== SHIPMENT FOLDER NON-WEBP ===")
    if bad_shipment:
        for x in bad_shipment:
            print(f"  {x}")
    else:
        print("  OK — all shipment images are .webp")

    print("\n=== SUMMARY ===")
    print(f"  WebP refs OK: {len(set(ok_webp))}")
    print(f"  Missing: {len(missing)}")
    print(f"  Non-webp refs: {len(non_webp_refs)}")


if __name__ == "__main__":
    main()
