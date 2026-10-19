"""Pipeline entrypoint: collect -> extract -> market -> analyze -> growth_advisor.

Originally planned as a LangGraph StateGraph (see CLAUDE.md's stack list), but the actual
shape of this pipeline is a straight chain with no branching or fan-out -- each node's run()
already calls the node before it and relies on intel.cache for idempotent, free re-runs.
A graph framework would add indirection without adding capability here, so this is a plain
function chain instead. langgraph was dropped from requirements.txt accordingly.

Every run() below is disk-cached by content hash (intel.cache.cached) -- once data/cache/
is populated, re-running this does zero network or LLM calls; it just reads cache.
"""
from intel.nodes.analyze import AnalysisResult
from intel.nodes.analyze import OUT_PATH as ANALYSIS_PATH
from intel.nodes.growth_advisor import run as run_growth_advisor


def run_pipeline() -> dict:
    """growth_advisor.run() cascades through analyze -> market -> collect/extract itself
    (each step cached, so re-runs are free), writing data/cache/analysis_result.json along
    the way -- read that back instead of calling analyze.run() a second time just to get its
    return value, which would reprint every cache-hit log line twice for no benefit."""
    growth = run_growth_advisor()
    analysis = AnalysisResult.model_validate_json(ANALYSIS_PATH.read_text())
    return {"analysis": analysis, "growth": growth}


if __name__ == "__main__":
    result = run_pipeline()
    analysis = result["analysis"]
    growth = result["growth"]
    print(
        f"gap_matrix={len(analysis.gap_matrix)} "
        f"pricing_comparison={len(analysis.pricing_comparison)} "
        f"top_pain_points={len(analysis.top_pain_points)} "
        f"messaging_inconsistencies={len(analysis.messaging_inconsistencies)} "
        f"growth_recommendations={len(growth.recommendations)}"
    )
