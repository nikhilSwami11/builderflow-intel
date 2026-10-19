"""Shared citation-by-id mechanism.

Asking a model to retype a Citation's exact `ref` verbatim (e.g. a screenshot path with
spaces, or a long URL) is unreliable -- growth_advisor.py originally did this and ~40% of
screenshot refs came back paraphrased instead of real paths. Every node that needs a model
to "point at" citations instead of re-deriving them should: assign ids with this class, have
the model reference only ids, then resolve ids back to real Citation objects in Python.
"""
from intel.schemas import Citation


class CitationIndex:
    """Dedupe Citations by (source, ref) and assign short, stable ids."""

    def __init__(self):
        self._by_key: dict[tuple, str] = {}
        self._by_id: dict[str, Citation] = {}

    def add(self, citation: Citation) -> str:
        key = (citation.source, citation.ref)
        if key in self._by_key:
            return self._by_key[key]
        cid = f"C{len(self._by_id) + 1}"
        self._by_key[key] = cid
        self._by_id[cid] = citation
        return cid

    def tag(self, citations: list[Citation]) -> str:
        return " ".join(f"[{self.add(c)}]" for c in citations)

    def resolve(self, ids: list[str]) -> list[Citation]:
        return [self._by_id[i] for i in ids if i in self._by_id]
