"""Step 6. How message, positiveness, awareness and reference quality evolve with rank.

Used from section 6 of notebooks/main.ipynb:

    load      load_results   join the step 1 snippets with the step 5 LLM answers by URL
    features  add_features   source type, VADER of snippet and takeaway, #actions,
                             keyword themes, TF-IDF drift and novelty, KMeans topic
    stats     cumulative     mean of every metric over the first k = 10, 20, .. 100
              trends         Spearman rho vs rank, Mann-Whitney top 10 vs rest
              theme_halves   theme shares above and below rank 50, Fisher's exact test
    plots     plot_serp_map, plot_rank_effect, plot_themes
"""

from climate_mining.ranking.config import METRICS, STEP, THEMES
from climate_mining.ranking.features import add_features
from climate_mining.ranking.load import load_results
from climate_mining.ranking.plots import plot_rank_effect, plot_serp_map, plot_themes
from climate_mining.ranking.stats import cumulative, theme_halves, trends

__all__ = [
    "METRICS", "STEP", "THEMES", "add_features", "cumulative", "load_results",
    "plot_rank_effect", "plot_serp_map", "plot_themes", "theme_halves", "trends",
]  # fmt: skip
