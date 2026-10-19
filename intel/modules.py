"""Map each screenshot flow (folder name) to a parent module, one cached LLM call."""
import json
import re

from pydantic import BaseModel

from intel.cache import cached
from intel.config import MINI_MODEL, client

GUIDE_PATH = "data/builderflow_guide.md"


class FolderModule(BaseModel):
    folder: str
    module: str


class FolderModuleMap(BaseModel):
    mapping: list[FolderModule]  # one entry per folder


def _guide_headings() -> list[str]:
    text = open(GUIDE_PATH).read()
    return [
        line.lstrip("#").strip()
        for line in text.splitlines()
        if re.match(r"^#{1,2}\s", line)
    ]


def map_folders_to_modules(folders: list[str]) -> dict[str, str]:
    headings = _guide_headings()
    key = json.dumps({"folders": sorted(folders), "headings": headings}, sort_keys=True)

    def _call():
        prompt = (
            "These are the top-level and second-level section headings from Builderflow's "
            "user guide (its real module/feature structure):\n"
            + "\n".join(f"- {h}" for h in headings)
            + "\n\nThese are folder names of UI screenshots, each folder = one feature/flow:\n"
            + "\n".join(f"- {f}" for f in folders)
            + "\n\nFor each folder, assign the single guide module it most belongs to "
            "(use a short module name drawn from the guide headings, e.g. 'Claim Scope', "
            "'Estimation', 'Dispatch'). Every folder must get a module."
        )
        resp = client().responses.parse(
            model=MINI_MODEL,
            input=[{"role": "user", "content": prompt}],
            text_format=FolderModuleMap,
        )
        return resp.output_parsed.model_dump()

    result = cached("module_map", key, _call)
    return {entry["folder"]: entry["module"] for entry in result["mapping"]}
