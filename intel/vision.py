"""One-time vision pass over every Builderflow screenshot.

Resize to 1280px max, detail=high, temperature 0, 8 concurrent, cached by image hash
so each image is only ever sent to the model once. Per screen: screen, purpose,
navigation, components, actions, data_fields, status, ux_notes -- split observed vs
inferred. Unreadable text = "unclear". Screenshot-only features = "unverified" unless
the guide confirms them.
"""
import base64
import re
from concurrent.futures import ThreadPoolExecutor
from io import BytesIO
from pathlib import Path

from PIL import Image

from intel.cache import cached, hash_bytes
from intel.config import MINI_MODEL, client
from intel.modules import map_folders_to_modules
from intel.schemas import ScreenAnalysis, ScreenVisionOutput

SCREENS_DIR = Path("data/builderflow_screens")
MAX_DIM = 1280
CONCURRENCY = 8

VISION_PROMPT = """You are analyzing one screenshot of Builderflow, a lead management and
CRM web app for remodelers/contractors. Describe only what is visible in this image.

- Quote UI text verbatim where you reference it.
- If text is too small/blurry to read, say "unclear" for that field rather than guessing.
- status: "observed" if you can describe it directly from the pixels, "inferred" if you're
  reasoning about something not directly visible (e.g. implied navigation), "unverified"
  if this looks like a feature/capability that isn't actually confirmed by what's on screen.
- navigation: what nav/menu/tab context surrounds this screen, if visible.
- components: distinct UI elements present (tables, forms, modals, buttons, charts, etc).
- actions: user actions this screen appears to support.
- data_fields: field/column labels visible on screen.
"""


def _find_images() -> list[Path]:
    return sorted(
        p
        for p in SCREENS_DIR.rglob("*")
        if p.is_file() and p.suffix.lower() in {".png", ".jpg", ".jpeg"}
    )


def _resized_data_url(path: Path) -> str:
    img = Image.open(path).convert("RGB")
    if max(img.size) > MAX_DIM:
        img.thumbnail((MAX_DIM, MAX_DIM))
    buf = BytesIO()
    img.save(buf, format="JPEG", quality=90)
    b64 = base64.b64encode(buf.getvalue()).decode()
    return f"data:image/jpeg;base64,{b64}"


def _step_from_filename(name: str) -> int | None:
    m = re.match(r"^0*(\d+)[_\-\s]", name)
    return int(m.group(1)) if m else None


def analyze_one(path: Path, module: str) -> ScreenAnalysis:
    img_bytes = path.read_bytes()
    key = hash_bytes(img_bytes)

    def _call():
        data_url = _resized_data_url(path)
        resp = client().responses.parse(
            model=MINI_MODEL,
            input=[
                {
                    "role": "user",
                    "content": [
                        {"type": "input_text", "text": VISION_PROMPT},
                        {"type": "input_image", "image_url": data_url, "detail": "high"},
                    ],
                }
            ],
            text_format=ScreenVisionOutput,
        )
        return resp.output_parsed.model_dump()

    vision_out = cached("vision", key, _call)
    return ScreenAnalysis(
        image_path=str(path),
        flow=path.parent.name,
        module=module,
        step=_step_from_filename(path.name),
        **vision_out,
    )


def run() -> list[ScreenAnalysis]:
    images = _find_images()
    folders = sorted({p.parent.name for p in images})
    folder_module = map_folders_to_modules(folders)

    results: list[ScreenAnalysis] = []
    with ThreadPoolExecutor(max_workers=CONCURRENCY) as pool:
        futures = [
            pool.submit(analyze_one, path, folder_module.get(path.parent.name, "Unknown"))
            for path in images
        ]
        for i, fut in enumerate(futures, 1):
            results.append(fut.result())
            if i % 10 == 0 or i == len(futures):
                print(f"  {i}/{len(futures)} screens analyzed")
    return results


if __name__ == "__main__":
    analyses = run()
    out_path = Path("data/cache/screen_analyses.json")
    out_path.write_text(
        "[" + ",\n".join(a.model_dump_json() for a in analyses) + "]"
    )
    print(f"\nWrote {len(analyses)} screen analyses -> {out_path}")
