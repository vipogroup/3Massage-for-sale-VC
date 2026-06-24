#!/usr/bin/env python3
"""Build buyers.json from setup/buyers.csv"""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CSV = Path(__file__).resolve().parent / "buyers.csv"
OUT = ROOT / "buyers.json"


def main():
    buyers = []
    with CSV.open(encoding="utf-8-sig", newline="") as f:
        for row in csv.DictReader(f):
            num = row.get("number", "").strip()
            name = row.get("name", "").strip()
            if not num or not name:
                continue
            buyers.append({
                "number": int(num),
                "name": name,
                "color": row.get("color", "").strip(),
                "date": row.get("date", "").strip(),
            })
    buyers.sort(key=lambda b: b["number"], reverse=True)
    OUT.write_text(
        json.dumps({"buyers": buyers}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUT} — {len(buyers)} buyers")


if __name__ == "__main__":
    main()
