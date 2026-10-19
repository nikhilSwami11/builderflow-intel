"""Convert data/builderflow_guide.docx -> data/builderflow_guide.md, preserving Word
heading styles (Heading 1-4) as markdown headings. Falls back to ~800-token chunking
with overlap only if the doc has few/no real headings -- this doc has 265 real headings,
so that path isn't exercised here but stays in for other docs.
"""
from dataclasses import dataclass
from pathlib import Path

import docx

DOCX_PATH = Path("data/builderflow_guide.docx")
MD_PATH = Path("data/builderflow_guide.md")

HEADING_LEVELS = {
    "Heading 1": 1,
    "Heading 2": 2,
    "Heading 3": 3,
    "Heading 4": 4,
}

MIN_REAL_HEADINGS = 5  # below this, fall back to token-window chunking


@dataclass
class Section:
    title: str
    level: int
    path: tuple[str, ...]  # titles of ancestor headings + this one, for metadata


def _iter_blocks(doc: docx.Document):
    for p in doc.paragraphs:
        yield p.style.name, p.text


def convert() -> list[Section]:
    doc = docx.Document(DOCX_PATH)
    blocks = list(_iter_blocks(doc))
    heading_count = sum(1 for style, text in blocks if style in HEADING_LEVELS and text.strip())

    lines: list[str] = []
    sections: list[Section] = []
    stack: list[str] = []  # current ancestor titles by level

    if heading_count >= MIN_REAL_HEADINGS:
        for style, text in blocks:
            text = text.strip()
            if not text:
                continue
            level = HEADING_LEVELS.get(style)
            if level is not None:
                stack = stack[: level - 1] + [text]
                lines.append(f"{'#' * level} {text}")
                sections.append(Section(title=text, level=level, path=tuple(stack)))
            else:
                lines.append(text)
    else:
        # fallback: ~800-token (approx. word-count) chunks with overlap
        words = []
        for _, text in blocks:
            if text.strip():
                words.extend(text.strip().split())
        chunk_size, overlap = 800, 100
        i = 0
        chunk_no = 1
        while i < len(words):
            chunk_words = words[i : i + chunk_size]
            title = f"Chunk {chunk_no}"
            lines.append(f"## {title}")
            lines.append(" ".join(chunk_words))
            sections.append(Section(title=title, level=2, path=(title,)))
            i += chunk_size - overlap
            chunk_no += 1

    MD_PATH.write_text("\n\n".join(lines))
    return sections


if __name__ == "__main__":
    sections = convert()
    print(f"Wrote {MD_PATH} ({len(sections)} sections detected)\n")
    for s in sections:
        indent = "  " * (s.level - 1)
        print(f"{indent}{'#' * s.level} {s.title}")
