"""Thin HTTP wrapper over intel.rag.answer() for the Next.js chat page.

Run from the repo root (paths in intel/ are relative to it):
    uvicorn scripts.chat_api:app --port 8000

No pipeline logic lives here: it calls answer(), strips stray citation-id tokens from the
prose, and normalizes citations the same way scripts/export_frontend.py does (screenshot
paths -> public image URLs).
"""
import re

from fastapi import FastAPI
from pydantic import BaseModel

from intel.rag import answer
from scripts.export_frontend import norm_citation

app = FastAPI(title="Builderflow chat")

# rag.answer() strips "[C10]" but models also write "(C11, C12)"; remove both forms.
_ID_TOKENS = re.compile(r"\s*[\[(]\s*C\d+(?:\s*,\s*C\d+)*\s*[\])]")


class ChatRequest(BaseModel):
    question: str


@app.get("/health")
def health() -> dict:
    return {"ok": True}


@app.post("/chat")
def chat(req: ChatRequest) -> dict:
    result = answer(req.question.strip())
    return {
        "answer": _ID_TOKENS.sub("", result.answer).strip(),
        "citations": [norm_citation(c.model_dump()) for c in result.citations],
        "usedLiveSearch": result.used_live_search,
    }
