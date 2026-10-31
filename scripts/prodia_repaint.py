#!/usr/bin/env python3
"""
Optional: ask an image model to "repaint" gallery paintings as if made in
another year, so the site can compare its guess with the colour-science
result. Uses the CS 85 Prodia proxy (https://prodia-proxy.vercel.app).

The key is read from the PRODIA_PROXY_KEY environment variable and is never
printed or written anywhere. Run this on your own computer, not in a browser:

    export PRODIA_PROXY_KEY='you@college.harvard.edu|XXXXXXXXXXXXXXXX'
    python3 scripts/prodia_repaint.py --dry-run          # show prompts and cost, spend nothing
    python3 scripts/prodia_repaint.py --model klein      # cheap drafts (~$0.004 each)
    python3 scripts/prodia_repaint.py                    # Nano Banana (~$0.04 each, ~$0.24 total)

Results go to img/ai/ and img/ai/manifest.json; the Time Machine shows them
automatically under the painting. Existing outputs are skipped, so you never
pay twice for the same image. Requires: pip install requests pillow; Node 18+.
"""
import argparse, io, json, os, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "img" / "ai"
MANIFEST = OUT / "manifest.json"
ENDPOINT = "https://prodia-proxy.vercel.app/v2/job"

MODELS = {
    "klein": ("inference.flux-2.klein.4b.img2img.v1", 0.004, {}),
    "nano": ("inference.nano-banana.img2img.v2", 0.039, {}),
    "gemini": ("inference.gemini-3-pro.img2img.v1", 0.15, {"resolution": "1K"}),
}

# (painting id, year, region)
JOBS = [
    ("starry-night", 1300, "eu"),
    ("girl-pearl-earring", -15000, "eu"),
    ("woman-with-hat", 1800, "eu"),
    ("great-wave", 1700, "eu"),
    ("water-lilies", 1100, "eu"),
    ("the-scream", -1320, "world"),
]


def year_label(y):
    return f"{abs(y):,} BCE" if y <= 0 else (f"{y} CE" if y < 1000 else str(y))


def palette(year, region):
    out = subprocess.run(["node", str(ROOT / "scripts" / "list-palette.mjs"), str(year), region],
                         capture_output=True, text=True, check=True)
    return json.loads(out.stdout)


def prompt_for(year, region, names):
    where = "in Europe" if region == "eu" else "anywhere in the world"
    return (f"Repaint this painting as if it had been made {where} in {year_label(year)}, by a painter who "
            f"could only use these pigments: {', '.join(names)}. Keep the composition and subject. "
            f"Use only colours that could be mixed from those pigments, and keep it looking like a real "
            f"painting in materials of that time. No text, no frame.")


def load_input(pid):
    from PIL import Image
    im = Image.open(ROOT / "img" / "paintings" / f"{pid}.jpg").convert("RGB")
    im.thumbnail((1024, 1024))
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=90)
    return buf.getvalue()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--model", choices=MODELS, default="nano")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    job_type, price, extra = MODELS[args.model]

    manifest = json.loads(MANIFEST.read_text()) if MANIFEST.exists() else {"items": []}
    manifest["model"] = f"{args.model} ({job_type}) via the CS 85 Prodia proxy"
    todo = [(p, y, r) for (p, y, r) in JOBS if not (OUT / f"{p}_{y}.jpg").exists()]
    print(f"{len(todo)} image(s) to make with {job_type}; estimated cost ${len(todo) * price:.3f}")

    if args.dry_run:
        for p, y, r in todo:
            print(f"\n[{p} @ {year_label(y)}]\n{prompt_for(y, r, palette(y, r))}")
        return

    key = os.environ.get("PRODIA_PROXY_KEY")
    if not key:
        sys.exit("Set PRODIA_PROXY_KEY first (see the docstring at the top of this file).")
    import requests

    for p, y, r in todo:
        fname = f"{p}.jpg"
        job = {"type": job_type, "config": {"prompt": prompt_for(y, r, palette(y, r)), "images": [fname], **extra}}
        files = [
            ("job", ("job.json", json.dumps(job), "application/json")),
            ("input", (fname, load_input(p), "image/jpeg")),
        ]
        print(f"→ {p} @ {year_label(y)} …", flush=True)
        res = requests.post(ENDPOINT, headers={"Authorization": f"Bearer {key}", "Accept": "image/jpeg"},
                            files=files, timeout=300)
        if not res.ok:
            print(f"  failed: HTTP {res.status_code}: {res.text[:300]}")
            if res.status_code in (401, 402, 403):
                break
            continue
        OUT.mkdir(parents=True, exist_ok=True)
        (OUT / f"{p}_{y}.jpg").write_bytes(res.content)
        manifest["items"] = [i for i in manifest.get("items", []) if not (i["painting"] == p and i["year"] == y)]
        manifest["items"].append({"painting": p, "year": y, "region": r, "file": f"{p}_{y}.jpg"})
        MANIFEST.write_text(json.dumps(manifest, indent=2) + "\n")
        print(f"  saved; charged ${res.headers.get('x-proxy-charged-dollars', '?')}, "
              f"total spent ${res.headers.get('x-proxy-spent-dollars', '?')}")


if __name__ == "__main__":
    main()
