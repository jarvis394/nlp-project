from pathlib import Path

import pandas as pd

from climate_mining.ranking.config import ANALYSIS


def load_results(run: Path) -> pd.DataFrame:
    """Snippet columns + step 5 LLM columns"""
    snippets = pd.read_excel(run, sheet_name="snippets")
    llm = pd.read_json(ANALYSIS / run.stem / "cache.jsonl", lines=True)
    llm = llm.drop(columns=["rank", "title"]).rename(columns={"source": "text_source"})
    df = snippets.merge(llm, on="url", how="inner").sort_values("rank")
    return df.reset_index(drop=True)
