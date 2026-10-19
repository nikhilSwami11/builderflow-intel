"""Builderflow ingestion entrypoint: guide conversion -> vision pass -> app_summary.

Each step is a thin call into its own module (guide.py, vision.py, summary.py), which already
have their own CLI entrypoints and write their own output files. This just chains them in
order so `python -m intel.ingest` reproduces the whole ingestion from a fresh clone, instead
of needing to know to run three separate modules by hand.
"""
from pathlib import Path

from intel import guide, summary, vision

SCREEN_ANALYSES_PATH = Path("data/cache/screen_analyses.json")


def main():
    print("1/3 converting guide...")
    sections = guide.convert()
    print(f"   {len(sections)} sections -> {guide.MD_PATH}")

    print("2/3 running vision pass over screenshots (cached by image hash)...")
    analyses = vision.run()
    SCREEN_ANALYSES_PATH.parent.mkdir(exist_ok=True)
    SCREEN_ANALYSES_PATH.write_text("[" + ",\n".join(a.model_dump_json() for a in analyses) + "]")
    print(f"   {len(analyses)} screens -> {SCREEN_ANALYSES_PATH}")

    print("3/3 building app_summary...")
    app_summary = summary.build()
    summary.OUT_PATH.write_text(app_summary)
    print(f"   -> {summary.OUT_PATH}")


if __name__ == "__main__":
    main()
