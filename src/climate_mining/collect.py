"""Step 1 — retrieve the top-N search snippets for a query and save them to data/raw/<run>.xlsx."""

import argparse
import logging
import re
import sys
from dataclasses import asdict
from datetime import UTC, datetime
from pathlib import Path

import pandas as pd
from dotenv import load_dotenv

from climate_mining.paths import RAW
from climate_mining.providers import PROVIDERS, ProviderError

QUERY = "climate change"
COUNT = 100


def main(argv: list[str] | None = None) -> None:
    load_dotenv()
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--query", "-q", default=QUERY)
    p.add_argument("--n", type=int, default=COUNT)
    p.add_argument("--provider", "-p", choices=PROVIDERS, default="serpapi")
    p.add_argument(
        "--engine",
        "-e",
        help="search engine (serpapi: google; ddgs: yahoo, duckduckgo, ...)",
    )
    p.add_argument(
        "--region",
        "-r",
        help="serpapi: country code 'us', 'gb'...; ddgs: locale 'us-en', 'uk-en'...",
    )
    p.add_argument("--location", "-l", default="", help="serpapi only, e.g. 'Germany'")
    p.add_argument("--max-pages", type=int, default=20)
    p.add_argument(
        "--delay", type=float, default=1.0, help="seconds between page requests"
    )
    p.add_argument(
        "--label", default="", help="free tag for the run, e.g. 'vpn-germany'"
    )
    p.add_argument("--out", "-o", type=Path)
    a = p.parse_args(argv)

    logging.basicConfig(level=logging.INFO, format="%(name)s: %(message)s")
    for noisy in ("httpx", "primp", "ddgs"):
        logging.getLogger(noisy).setLevel(logging.WARNING)

    started_time = datetime.now(UTC)
    timestamp = started_time.astimezone().strftime("%Y%m%d-%H%M%S")
    cls = PROVIDERS[a.provider]
    # SerpAPI keeps the raw JSON of every page it fetched
    extra = (
        {"temp_dir": RAW / a.provider / timestamp} if a.provider == "serpapi" else {}
    )

    try:
        provider = cls(a.engine, a.region, a.location, a.delay, **extra)
        results = provider.search(a.query, a.n, a.max_pages)
    except ProviderError as e:
        sys.exit(str(e))
    if not results:
        sys.exit("No results retrieved")

    meta = {
        "query": a.query,
        "provider": provider.name,
        "engine": provider.engine,
        "region": provider.region,
        "location": provider.location,
        "label": a.label,
        "count": len(results),
        "timestamp": started_time.isoformat(timespec="seconds"),
    }
    tag = "_".join(
        str(meta[k])
        for k in ("provider", "engine", "region", "location", "label")
        if meta[k]
    )
    out = a.out or RAW / f"{timestamp}_{re.sub(r'[^A-Za-z0-9_-]+', '-', tag)}.xlsx"
    out.parent.mkdir(parents=True, exist_ok=True)

    with pd.ExcelWriter(out) as xw:
        pd.DataFrame(map(asdict, results)).to_excel(
            xw, sheet_name="snippets", index=False
        )
        pd.DataFrame(meta.items(), columns=["key", "value"]).to_excel(
            xw, sheet_name="meta", index=False
        )

    print(f"Saved {len(results)}/{a.n} snippets to {out}")


if __name__ == "__main__":
    main()
