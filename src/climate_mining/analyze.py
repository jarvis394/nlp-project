"""Step 5 — LLM analysis of each result page: takeaway, actions, stance, awareness, references.

    uv run analyze                      # newest SerpAPI run, all 100 pages
    uv run analyze --ranks 1,10,50,100  # a sample
    uv run analyze --limit 5            # first 5 (quick test)

Needs GEMINI_API_KEY in .env (free key: aistudio.google.com). Optional: GEMINI_MODEL.
Every answer is cached in data/analysis/<run>/cache.jsonl, so re-running costs nothing.
"""

import argparse
import json
import os
import time
from pathlib import Path

import httpx
import pandas as pd
import trafilatura
from dotenv import load_dotenv

from climate_mining.paths import RAW

MODEL = "gemini-flash-latest"  # alias; override with GEMINI_MODEL if needed
API = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"
MAX_CHARS = 6_000  # page text sent to the LLM (~3k tokens)
DELAY = 4.5  # seconds between calls (free tier: ~15 requests/min)

SYSTEM = """You analyse web pages that a search engine returned for "climate change".
Judge ONLY what the page text says; do not use outside knowledge about the site.
Return JSON that follows the schema exactly.

- takeaway: exactly three sentences: the page's key message.
- actions: what the page asks the reader to do (short imperative phrases). [] if none.
- stance: climate-change perspective, from -1.0 (very negative: alarmist, doom, threat only)
  through 0 (neutral, factual) to +1.0 (very positive: hope, solutions, achievable progress).
- stance_label: alarmist | neutral-informative | solution-oriented | sceptic
- awareness: how much the page raises the reader's awareness of causes, impacts and what
  can be done, 0 (none) to 5 (comprehensive and clear).
- references: the sources the page itself cites (names only, max 5). [] if none.
- reference_quality: 1 to 5. 5 = peer-reviewed papers / IPCC / national agencies, cited
  precisely; 3 = NGO or reputable news cited vaguely; 1 = no sources, or opinion only.
- reference_rationale: one sentence justifying the score.
If the text is only a short search snippet (flagged in the input), still answer, but cap
reference_quality at 2 and mention that the full page was not available."""

SCHEMA = {
    "type": "OBJECT",
    "properties": {
        "takeaway": {"type": "STRING"},
        "actions": {"type": "ARRAY", "items": {"type": "STRING"}},
        "stance": {"type": "NUMBER"},
        "stance_label": {
            "type": "STRING",
            "enum": ["alarmist", "neutral-informative", "solution-oriented", "sceptic"],
        },
        "awareness": {"type": "INTEGER"},
        "references": {"type": "ARRAY", "items": {"type": "STRING"}},
        "reference_quality": {"type": "INTEGER"},
        "reference_rationale": {"type": "STRING"},
    },
    "required": [
        "takeaway", "actions", "stance", "stance_label", "awareness",
        "references", "reference_quality", "reference_rationale",
    ],
}  # fmt: skip


def fetch_text(url: str) -> str | None:
    """Main text of a page, or None if unreachable / empty (paywall, bot block...)."""
    try:
        r = httpx.get(
            url,
            timeout=20,
            follow_redirects=True,
            headers={
                "User-Agent": "climate-mining/0.1 (student NLP project; https://github.com/jarvis394/nlp-project)"
            },
        )
        r.raise_for_status()
    except httpx.HTTPError:
        return None
    text = trafilatura.extract(r.text, include_comments=False, include_tables=False)
    return text if text and len(text) > 300 else None


def call_llm(client: httpx.Client, key: str, model: str, content: str) -> dict:
    body = {
        "system_instruction": {"parts": [{"text": SYSTEM}]},
        "contents": [{"parts": [{"text": content}]}],
        "generationConfig": {
            "temperature": 0.1,
            "thinkingConfig": {"thinkingBudget": 0},
            "responseMimeType": "application/json",
            "responseSchema": SCHEMA,
        },
    }
    for attempt in range(5):
        r = client.post(
            API.format(model=model), json=body, headers={"x-goog-api-key": key}
        )
        if r.status_code in (429, 500, 503):  # rate limit / busy: wait and retry
            time.sleep(10 * (attempt + 1))
            continue
        r.raise_for_status()
        return json.loads(r.json()["candidates"][0]["content"]["parts"][0]["text"])
    raise RuntimeError("LLM kept refusing (rate limit?)")


def load_cache(path: Path) -> dict[str, dict]:
    if not path.exists():
        return {}
    rows = (json.loads(line) for line in path.read_text().splitlines() if line)
    return {r["url"]: r for r in rows}


def main(argv: list[str] | None = None) -> None:
    load_dotenv()
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "--run", type=Path, help="xlsx in data/raw (default: newest serpapi)"
    )
    p.add_argument("--ranks", help="comma-separated ranks, e.g. 1,10,50,100")
    p.add_argument("--limit", type=int, help="only the first N results")
    a = p.parse_args(argv)

    key = os.environ.get("GEMINI_API_KEY")
    if not key:
        raise SystemExit("GEMINI_API_KEY missing: add it to .env")
    model = os.environ.get("GEMINI_MODEL", MODEL)

    run = a.run or next(
        r for r in sorted(RAW.glob("*.xlsx"), reverse=True) if "_serpapi_" in r.name
    )
    df = pd.read_excel(run, sheet_name="snippets").sort_values("rank")
    if a.ranks:
        df = df[df["rank"].isin({int(x) for x in a.ranks.split(",")})]
    if a.limit:
        df = df.head(a.limit)

    out_dir = RAW.parent / "analysis" / run.stem
    out_dir.mkdir(parents=True, exist_ok=True)
    cache_path = out_dir / "cache.jsonl"
    cache = load_cache(cache_path)

    with httpx.Client(timeout=90) as client, cache_path.open("a") as cache_file:
        for row in df.itertuples():
            if row.url in cache:
                continue
            text = fetch_text(str(row.url))
            source = "page" if text else "snippet"
            body = text[:MAX_CHARS] if text else str(row.snippet)
            content = f"Source: {source}\nTitle: {row.title}\nURL: {row.url}\n\n{body}"
            try:
                res = call_llm(client, key, model, content)
            except Exception as e:  # keep going; failed rows can be re-run
                print(f"#{row.rank} FAILED: {e}")
                continue
            rec = {"rank": int(row.rank), "url": row.url, "title": row.title, # type: ignore
                   "source": source, "model": model, **res}  # fmt: skip
            cache[row.url] = rec # type: ignore
            cache_file.write(json.dumps(rec, ensure_ascii=False) + "\n")
            cache_file.flush()
            print(
                f"#{row.rank} [{source}] stance={res['stance']:+.2f} refs={res['reference_quality']}"
            )
            time.sleep(DELAY)

    out = pd.DataFrame(sorted(cache.values(), key=lambda r: r["rank"])) # type: ignore
    out.to_excel(out_dir / "analysis.xlsx", index=False)
    print(f"{len(out)} pages analysed -> {out_dir / 'analysis.xlsx'}")


if __name__ == "__main__":
    main()
