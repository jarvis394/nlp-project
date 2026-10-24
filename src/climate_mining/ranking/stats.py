import numpy as np
import pandas as pd
from scipy.stats import fisher_exact, mannwhitneyu, spearmanr

from climate_mining.ranking.config import METRICS, SEED, STEP, THEMES


def cumulative(df: pd.DataFrame, step: int = STEP) -> pd.DataFrame:
    """Mean of each metric over the first k results (k = 10, 20, ..), as V2/V4."""
    rows = [df.head(k)[list(METRICS)].mean() for k in range(step, len(df) + 1, step)]
    return pd.DataFrame(rows, index=pd.Index(range(step, len(df) + 1, step), name="k"))


def trends(df: pd.DataFrame, top: int = STEP) -> pd.DataFrame:
    """
    Does the metric go up or down with rank?
    Spearman rho (+ = grows further down) and a Mann-Whitney test of the top 10 against the rest
    """
    rows = {}
    for col, label in METRICS.items():
        d = df[["rank", col]].dropna()  # novelty is undefined for rank 1
        rho, p = spearmanr(d["rank"], d[col])
        head, rest = d[col][d["rank"] <= top], d[col][d["rank"] > top]
        rows[col] = {
            "metric": label,
            f"top {top}": head.mean(),
            "rest": rest.mean(),
            "spearman rho vs rank": rho,
            "p (spearman)": p,
            f"p (top {top} vs rest)": mannwhitneyu(head, rest).pvalue,
        }
    return pd.DataFrame(rows).T


def theme_halves(df: pd.DataFrame, split: int = 50) -> pd.DataFrame:
    """
    Share of takeaways mentioning each theme above and below `split`, with Fisher's exact test.
    Repeated on full pages, since snippet takeaways are short
    """
    rows = {}
    groups = {"all results": df, "full pages": df[df.text_source == "page"]}
    for name, g in groups.items():
        for theme in THEMES:
            a, b = g[g["rank"] <= split][theme], g[g["rank"] > split][theme]
            table = [[a.sum(), len(a) - a.sum()], [b.sum(), len(b) - b.sum()]]
            rows[(name, theme)] = {
                f"ranks 1-{split}": a.mean(),
                f"ranks {split + 1}+": b.mean(),
                "fisher p": fisher_exact(table).pvalue,
            }
    return pd.DataFrame(rows).T


def null_cumulative(x: np.ndarray, n_perm: int = 2000) -> np.ndarray:
    """Running mean of the first k values for `n_perm` random orderings of x."""
    rng = np.random.default_rng(SEED)
    perms = rng.permuted(np.tile(x, (n_perm, 1)), axis=1)
    return perms.cumsum(axis=1) / np.arange(1, len(x) + 1)
