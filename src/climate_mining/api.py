import io
import json
import subprocess
import sys
import uuid
from functools import lru_cache
from pathlib import Path
from typing import Annotated

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from climate_mining import ranking as rk
from climate_mining import snippets as sn
from climate_mining.paths import DIST, LOGS, RAW, ROOT
from climate_mining.ranking.config import ANALYSIS
from climate_mining.ranking.plots import RANK_GROUPS, RANK_METRICS, TITLES
from climate_mining.ranking.stats import null_cumulative

OLD_META = {"retrieved_at": "timestamp", "backend": "engine", "retrieved": "count"}

app = FastAPI(title="climate-mining")


def records(df: pd.DataFrame) -> list[dict]:
    """DataFrame to JSON-safe rows (NaN -> null)"""
    return json.loads(df.to_json(orient="records"))


def run_path(run: str) -> Path:
    path = RAW / f"{run}.xlsx"
    if not path.is_file():
        raise HTTPException(404, f"no run {run!r}")
    return path


# Cache keys include the mtime, so a re-collected run is recomputed
def stamp(run: str) -> tuple[str, float]:
    return run, run_path(run).stat().st_mtime


@lru_cache(maxsize=16)
def load(run: str, _mtime: float) -> tuple[pd.DataFrame, dict]:
    sheets = pd.read_excel(RAW / f"{run}.xlsx", sheet_name=None)
    df = sheets["snippets"].sort_values("rank").reset_index(drop=True)
    df["domain"] = df.url.str.extract(r"https?://(?:www\.)?([^/]+)", expand=False)
    df["compound"] = sn.compound(df.snippet.astype(str).tolist())
    meta = sheets["meta"].set_index("key")["value"].dropna().to_dict()
    # Runs collected before the current meta format used other key names
    for old, new in OLD_META.items():
        if old in meta:
            meta.setdefault(new, meta.pop(old))
    return df, {k: str(v) for k, v in meta.items()}


@lru_cache(maxsize=8)
def fuzzy(run: str, _mtime: float) -> np.ndarray:
    df, _ = load(run, _mtime)
    return sn.score_matrix(df.snippet.astype(str).tolist())


@lru_cache(maxsize=4)
def features(run: str, _mtime: float) -> pd.DataFrame:
    return rk.add_features(rk.load_results(RAW / f"{run}.xlsx"))


def has_analysis(run: str) -> bool:
    return (ANALYSIS / run / "cache.jsonl").is_file()


@app.get("/api/runs")
def runs() -> list[dict]:
    out = []
    for path in sorted(RAW.glob("*.xlsx"), reverse=True):  # newest first
        _, meta = load(*stamp(path.stem))
        out.append(
            {"run": path.stem, "meta": meta, "analysis": has_analysis(path.stem)}
        )
    return out


@app.get("/api/runs/{run}/snippets")
def snippets(run: str) -> list[dict]:
    df, _ = load(*stamp(run))
    return records(df[["rank", "title", "url", "domain", "snippet", "compound"]])


@app.get("/api/runs/{run}/terms")
def terms(run: str, k: int = 100, n: int = 20) -> list[dict]:
    df, _ = load(*stamp(run))
    text = sn.document(df.snippet.head(k).astype(str).tolist())
    counts = sn.word_cloud(text, drop_query=True).process_text(text)
    top = sorted(counts.items(), key=lambda kv: -kv[1])[:n]
    return [{"term": t, "count": c} for t, c in top]


@app.get("/api/runs/{run}/wordcloud.png")
def wordcloud(run: str, k: int = 100, drop_query: bool = True) -> Response:
    df, _ = load(*stamp(run))
    text = sn.document(df.snippet.head(k).astype(str).tolist())
    buf = io.BytesIO()
    sn.word_cloud(text, drop_query).to_image().save(buf, format="PNG")
    return Response(buf.getvalue(), media_type="image/png",
                    headers={"Cache-Control": "max-age=3600"})  # fmt: skip


@app.get("/api/runs/{run}/similarity")
def similarity(run: str, step: int = 10) -> list[dict]:
    stats = sn.fuzzy_stats(fuzzy(*stamp(run)), step)
    return records(stats.reset_index())


@app.get("/api/runs/{run}/sentiment")
def sentiment(run: str, step: int = 10) -> dict:
    df, _ = load(*stamp(run))
    stats = sn.sentiment_stats(df.compound.to_numpy(), step)
    return {
        "stats": records(stats.reset_index()),
        "points": records(df[["rank", "domain", "compound"]]),
    }


def analysed(run: str) -> pd.DataFrame:
    if not has_analysis(run):
        raise HTTPException(
            404, "no LLM analysis for this run, run `uv run analyze --run ...`"
        )
    return features(*stamp(run))


@app.get("/api/runs/{run}/analysis")
def analysis(run: str) -> list[dict]:
    cols = [
        "rank", "url", "title", "domain", "snippet", "source_type", "text_source",
        "takeaway", "actions", "stance", "stance_label", "awareness", "references",
        "reference_quality", "reference_rationale", "vader_snippet", *rk.THEMES,
    ]  # fmt: skip
    return records(analysed(run)[cols])


def rank_effect(g: pd.DataFrame, col: str, top: int, n_perm: int = 2000) -> dict:
    """Running mean of the first k results vs a 90% band of random orderings,
    the same numbers as plots.plot_rank_effect"""
    x, ranks = g[col].to_numpy(dtype=float), g["rank"].to_numpy()
    null = null_cumulative(x, n_perm)
    lo, hi = np.percentile(null, [5, 95], axis=0)
    obs = x.cumsum() / np.arange(1, len(x) + 1)
    n = int((ranks <= top).sum())
    p = (abs(null[:, n - 1] - x.mean()) >= abs(obs[n - 1] - x.mean())).mean()
    k0 = 2  # a mean of one or two results says nothing
    return {
        "metric": col,
        "title": TITLES[col],
        "mean": x.mean(),
        "top": obs[n - 1],
        "p": p,
        "points": [
            {"rank": int(r), "obs": o, "band": [a, b]}
            for r, o, a, b in zip(ranks[k0:], obs[k0:], lo[k0:], hi[k0:], strict=True)
        ],
    }


@app.get("/api/runs/{run}/evolution")
def evolution(run: str, top: Annotated[int, Query(ge=3, le=90)] = 10) -> dict:
    df = analysed(run)
    groups = {"all": df, "pages": df[df.text_source == "page"]}
    themes = {
        name: [
            {
                "group": f"ranks {lo}-{hi}",
                "n": int(g["rank"].between(lo, hi).sum()),
                **g[g["rank"].between(lo, hi)][list(rk.THEMES)].mean().to_dict(),
            }
            for lo, hi in RANK_GROUPS
        ]
        for name, g in groups.items()
    }
    halves = rk.theme_halves(df).reset_index(names=["group", "theme"])
    halves.columns = ["group", "theme", "top", "bottom", "p"]
    trend = rk.trends(df, top).reset_index(names="column")
    trend.columns = ["column", "metric", "top", "rest", "rho", "p_rho", "p_top"]
    return {
        "counts": {name: len(g) for name, g in groups.items()},
        "rank_effect": {
            name: [rank_effect(g, col, top) for col in RANK_METRICS]
            for name, g in groups.items()
        },
        "themes": json.loads(json.dumps(themes, default=float)),
        "halves": records(halves),
        "trends": records(trend),
    }


@app.get("/api/compare")
def compare(runs: Annotated[list[str], Query()], k: int = 10) -> dict:
    """Region / provider comparison: V2 and V4 curves plus top-k domain overlap"""
    out, domains = [], {}
    for run in runs:
        df, meta = load(*stamp(run))
        fz = sn.fuzzy_stats(fuzzy(*stamp(run)))
        st = sn.sentiment_stats(df.compound.to_numpy())
        curves = fz.join(st).reset_index()
        domains[run] = df.domain.head(k).tolist()
        out.append({"run": run, "meta": meta, "curves": records(curves),
                    "top": domains[run]})  # fmt: skip
    overlap = [
        [len(set(domains[a]) & set(domains[b])) / len(set(domains[a]) | set(domains[b]))
         for b in runs]
        for a in runs
    ]  # fmt: skip
    return {"runs": out, "overlap": overlap}


# Step 1 from the UI: run `collect` in the background, poll its log


class CollectRequest(BaseModel):
    provider: str = "serpapi"
    region: str = "us"
    location: str = ""
    engine: str = ""
    label: str = ""
    n: int = 100


JOBS: dict[str, tuple[subprocess.Popen, Path]] = {}


@app.post("/api/collect")
def collect(req: CollectRequest) -> dict:
    args = [sys.executable, "-m", "climate_mining.collect", "-p", req.provider,
            "-r", req.region, "--n", str(req.n), "--label", req.label]  # fmt: skip
    if req.location:
        args += ["-l", req.location]
    if req.engine:
        args += ["-e", req.engine]
    if req.provider == "ddgs":
        args += ["--delay", "2"]
    job = uuid.uuid4().hex[:8]
    LOGS.mkdir(parents=True, exist_ok=True)
    log = LOGS / f"collect-{job}.log"
    with log.open("w") as f:
        proc = subprocess.Popen(args, stdout=f, stderr=subprocess.STDOUT, cwd=ROOT)
    JOBS[job] = (proc, log)
    return {"job": job}


@app.get("/api/collect/{job}")
def collect_status(job: str) -> dict:
    if job not in JOBS:
        raise HTTPException(404, "unknown job")
    proc, log = JOBS[job]
    code = proc.poll()
    status = "running" if code is None else "done" if code == 0 else "failed"
    lines = log.read_text().strip().splitlines()
    return {"status": status, "log": lines[-12:]}


if DIST.is_dir():
    app.mount("/assets", StaticFiles(directory=DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str) -> FileResponse:
        file = DIST / path
        return FileResponse(file if file.is_file() else DIST / "index.html")


def main() -> None:
    import uvicorn

    uvicorn.run("climate_mining.api:app", host="127.0.0.1", port=8000)
