import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from climate_mining.ranking.config import SOURCE_ORDER, STEP, THEMES
from climate_mining.ranking.stats import null_cumulative

SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6"]
GREY, INK, MUTED = "#a9a89f", "#52514e", "#8a8984"

# Negative labels warm, neutral grey, positive blue
STANCE_COLORS = {
    "alarmist": "#eb6834",
    "sceptic": "#e34948",
    "neutral-informative": GREY,
    "solution-oriented": "#2a78d6",
}

# Ordinal blue ramp for the 0-5 LLM scores, light = low
RAMP = ["#e3eefc", "#b7d3f6", "#86b6ef", "#5598e7", "#2a78d6", "#184f95"]
SOURCE_COLORS = dict(zip(SOURCE_ORDER, SERIES, strict=True))
TEXT_COLORS = {"page": INK, "snippet": "#d8d7d0"}
TRACKS = [  # column, row label, value -> color
    ("source_type", "who is speaking", SOURCE_COLORS),
    ("text_source", "what the LLM read", TEXT_COLORS),
    ("stance_label", "stance", STANCE_COLORS),
    ("awareness", "awareness 0-5", dict(enumerate(RAMP))),
    ("reference_quality", "reference quality 1-5", dict(enumerate(RAMP))),
]
RANK_METRICS = [
    "stance",
    "vader_snippet",
    "solutions",
    "awareness",
    "reference_quality",
]
TITLES = {
    "stance": "LLM stance",
    "vader_snippet": "VADER of snippet",
    "awareness": "awareness",
    "reference_quality": "reference quality",
    "solutions": "share mentioning solutions",
}
RANK_GROUPS = [(1, 10), (11, 50), (51, 100)]


def _style(ax, title: str = "") -> None:
    if title:
        ax.set_title(title, loc="left", fontweight="bold", fontsize=10.5)
    ax.spines[["top", "right"]].set_visible(False)
    ax.grid(axis="y", color="#e1e0d9", lw=0.8)
    ax.set_axisbelow(True)
    ax.tick_params(colors=INK, labelsize=8.5)


def _blocks(labels: list[str], min_len: int = 6, gap: int = 1) -> list[tuple]:
    """Stretches of the ranking held by one label, allowing `gap` other results
    in between: [(label, first index, last index)]."""
    out, i = [], 0
    while i < len(labels):
        j = i
        while nxt := next(
            (t for t in range(j + 1, j + gap + 2)
             if t < len(labels) and labels[t] == labels[i]),
            None,
        ):  # fmt: skip
            j = nxt
        if j - i + 1 >= min_len:
            out.append((labels[i], i, j))
            i = j + 1
        else:
            i += 1
    return out


def plot_serp_map(df: pd.DataFrame, top: int = STEP) -> plt.Figure:
    """One column per result, one row per property: what sits where in the ranking."""
    ranks = df["rank"].to_numpy()
    fig, axes = plt.subplots(len(TRACKS), 1, figsize=(17, 0.75 * len(TRACKS) + 1.2),
                             sharex=True)  # fmt: skip
    for ax, (col, label, colors) in zip(axes, TRACKS, strict=True):
        values = df[col].tolist()
        ax.bar(ranks, 1, width=1, color=[colors[v] for v in values],
               edgecolor="white", linewidth=0.8)  # fmt: skip
        ax.axvline(top + 0.5, color=INK, lw=1.2)
        ax.set_ylim(0, 1)
        ax.set_yticks([])
        ax.set_ylabel(label, rotation=0, ha="right", va="center", color=INK, fontsize=9)
        ax.spines[:].set_visible(False)
        present = [v for v in colors if v in set(values)]
        handles = [plt.Rectangle((0, 0), 1, 1, color=colors[v]) for v in present]
        ax.legend(handles, present, loc="center left", bbox_to_anchor=(1.005, 0.5),
                  ncol=len(present) if len(present) <= 6 else 4, frameon=False, fontsize=8,
                  handlelength=1, columnspacing=1)  # fmt: skip
    for label, i, j in _blocks(df.source_type.tolist()):
        axes[0].annotate(
            f"{label}, ranks {ranks[i]}-{ranks[j]}",
            xy=((ranks[i] + ranks[j]) / 2, 1),
            xytext=(0, 4),
            textcoords="offset points",
            ha="center",
            va="bottom",
            fontsize=8.5,
            color=INK,
        )
        axes[0].plot([ranks[i] - 0.5, ranks[j] + 0.5], [1.02, 1.02], color=INK,
                     lw=1.2, clip_on=False)  # fmt: skip
    ax = axes[-1]
    ax.set_xticks([1, *range(10, len(df) + 1, 10)])
    ax.set_xlim(0.5, len(df) + 0.5)
    ax.tick_params(colors=INK, labelsize=8.5, length=0)
    ax.set_xlabel("rank", color=MUTED, fontsize=8.5)
    axes[0].set_title(f"Every result, by rank. The line after rank {top} marks the top {top}.",
                      loc="left", fontweight="bold", fontsize=10.5, pad=18)  # fmt: skip
    fig.subplots_adjust(hspace=0.25)
    return fig


def plot_rank_effect(
    df: pd.DataFrame, top: int = STEP, n_perm: int = 2000
) -> plt.Figure:
    """Running mean over the first k results against what random orderings of the
    same results give. A line outside the grey band means rank order matters."""
    pages = df[df.text_source == "page"]
    groups = {f"all {len(df)} results": df, f"{len(pages)} full pages only": pages}
    fig, axes = plt.subplots(2, len(RANK_METRICS), figsize=(18, 6.6), sharex=True)
    for r, (name, g) in enumerate(groups.items()):
        for c, col in enumerate(RANK_METRICS):
            ax, x, ranks = axes[r, c], g[col].to_numpy(), g["rank"].to_numpy()
            null = null_cumulative(x, n_perm)
            lo, hi = np.percentile(null, [5, 95], axis=0)
            obs = x.cumsum() / np.arange(1, len(x) + 1)
            k0 = 2  # skip k = 1, 2: a mean of one or two results says nothing
            ax.fill_between(ranks[k0:], lo[k0:], hi[k0:], color="#e1e0d9", lw=0,
                            label="90% of random orderings")  # fmt: skip
            ax.axhline(x.mean(), color=GREY, lw=1)
            ax.plot(ranks[k0:], obs[k0:], color=SERIES[0], lw=2,
                    label="actual ranking")  # fmt: skip
            ax.axvline(top + 0.5, color=INK, lw=1, ls=":")
            n = (ranks <= top).sum()  # top-10 results in this group
            p = (abs(null[:, n - 1] - x.mean()) >= abs(obs[n - 1] - x.mean())).mean()
            ax.text(0.98, 0.04, f"top {top}: {obs[n - 1]:.2f} vs {x.mean():.2f}, p = {p:.2f}",
                    transform=ax.transAxes, ha="right", fontsize=8, color=INK)  # fmt: skip
            _style(ax, TITLES[col] if r == 0 else "")
        axes[r, 0].set_ylabel(name, color=INK, fontsize=9.5)
    for ax in axes[1]:
        ax.set_xlabel("first k results, by rank", color=MUTED, fontsize=8.5)
    axes[0, 0].legend(fontsize=8, frameon=False, loc="upper right")
    fig.suptitle("Does rank order matter? Mean of the first k results vs random orderings",
                 x=0.01, ha="left", fontweight="bold")  # fmt: skip
    fig.tight_layout()
    return fig


def plot_themes(df: pd.DataFrame) -> plt.Figure:
    """Share of takeaways that mention each theme, for three rank groups. Snippet-only
    takeaways are short, so the right panel repeats it for full pages only."""
    pages = df[df.text_source == "page"]
    groups = {f"all {len(df)} results": df, f"{len(pages)} full pages only": pages}
    fig, axes = plt.subplots(1, 2, figsize=(13, 3.8), sharey=True)
    y = np.arange(len(THEMES))[::-1]
    for ax, (name, g) in zip(axes, groups.items(), strict=True):
        shares_ = []
        for lo, hi in RANK_GROUPS:
            sel = g[g["rank"].between(lo, hi)]
            shares_.append((f"ranks {lo}-{hi}, n={len(sel)}", sel[list(THEMES)].mean()))
        stacked = np.array([s.to_numpy() for _, s in shares_])
        ax.hlines(y, stacked.min(axis=0), stacked.max(axis=0), color="#d8d7d0", lw=10)
        for i, ((label, s), color) in enumerate(zip(shares_, SERIES, strict=False)):
            dy = (1 - i) * 0.12  # equal shares would hide each other
            ax.scatter(s.to_numpy(), y + dy, s=70, color=color, edgecolors="white",
                       linewidths=1.5, zorder=3, label=label)  # fmt: skip
        ax.set_yticks(y, list(THEMES))
        ax.set_xlim(0, 1)
        ax.xaxis.set_major_formatter(plt.FuncFormatter(lambda v, _: f"{v:.0%}"))
        ax.grid(axis="x", color="#e1e0d9", lw=0.8)
        ax.grid(axis="y", visible=False)
        ax.spines[["top", "right", "left"]].set_visible(False)
        ax.tick_params(colors=INK, labelsize=9, length=0)
        ax.set_title(name, loc="left", fontweight="bold", fontsize=10.5)
        ax.legend(fontsize=8, frameon=False, loc="lower right")
    fig.suptitle("What the takeaway talks about, share of results per rank group",
                 x=0.01, ha="left", fontweight="bold")  # fmt: skip
    fig.tight_layout()
    return fig
