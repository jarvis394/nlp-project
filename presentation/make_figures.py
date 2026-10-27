"""
uv run python presentation/make_figures.py
"""

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from climate_mining import ranking as rk
from climate_mining import snippets as sn
from climate_mining.paths import RAW
from climate_mining.ranking.stats import null_cumulative

OUT = Path(__file__).parent / "figures"
GOOGLE = RAW / "20261014-200834_serpapi_google_us.xlsx"
YAHOO = RAW / "20261014-194047_ddgs_yahoo_us-en.xlsx"

BG, INK, MUTED, GRID = "#000000", "#D4D4D8", "#9F9FA9", "#27272A"
# Accents of the Figma deck
BLUE, ORANGE, GREEN, PURPLE, TEAL, SLATE = (
    "#1F8FFF", "#F37E48", "#A0F324", "#B54AE3", "#23D8AE", "#52525B"
)
BAND = "#1C2A3A"

plt.rcParams.update({
    "font.family": "Google Sans Flex",
    "font.size": 19,
    "figure.facecolor": BG,
    "axes.facecolor": BG,
    "savefig.facecolor": BG,
    "axes.edgecolor": GRID,
    "axes.labelcolor": MUTED,
    "axes.titlecolor": "#F9FAFB",
    "axes.titlesize": 24,
    "axes.titleweight": "normal",
    "axes.titlelocation": "left",
    "axes.titlepad": 14,
    "axes.labelsize": 19,
    "axes.spines.top": False,
    "axes.spines.right": False,
    "axes.grid": True,
    "axes.axisbelow": True,
    "grid.color": GRID,
    "grid.linewidth": 1,
    "xtick.color": MUTED,
    "ytick.color": MUTED,
    "xtick.labelsize": 18,
    "ytick.labelsize": 18,
    "legend.frameon": False,
    "legend.fontsize": 18,
    "legend.labelcolor": INK,
    "lines.linewidth": 2.5,
    "lines.markersize": 8,
})  # fmt: skip


def figure(w: int, h: int, *args, **kw):
    """A figure of w x h slide pixels."""
    return plt.subplots(*args, figsize=(w / 100, h / 100), **kw)


def save(fig, name: str) -> None:
    fig.savefig(OUT / f"{name}.png", dpi=200, transparent=True)
    plt.close(fig)
    print("wrote", name)


def snippets_of(run: Path) -> list[str]:
    df = pd.read_excel(run, sheet_name="snippets").sort_values("rank")
    return df.snippet.astype(str).tolist()


def wordcloud() -> None:
    from wordcloud import WordCloud

    def color(word, font_size, position, orientation, random_state=None, **kw):
        # Small words recede into the background, frequent ones are bright
        t = min(font_size / 110, 1) ** 0.8
        r, g, b = (int(a + (z - a) * t) for a, z in zip((82, 82, 91), (249, 250, 251)))
        return f"rgb({r}, {g}, {b})"

    wc = WordCloud(
        width=1120, height=700, scale=2, background_color=None, mode="RGBA",
        font_path=str(Path.home() / ".fonts/GoogleSansFlex.ttf"),
        stopwords=sn.STOP | sn.QUERY_WORDS, min_word_length=3, max_words=110,
        max_font_size=150, margin=7, prefer_horizontal=0.95, color_func=color,
        regexp=r"[A-Za-z][A-Za-z'-]+", random_state=42,
    ).generate(sn.document(snippets_of(GOOGLE)))  # fmt: skip
    wc.to_file(OUT / "wordcloud.png")
    print("wrote wordcloud")


def terms() -> None:
    doc = sn.document(snippets_of(GOOGLE))
    counts = sn.word_cloud(doc, drop_query=True).process_text(doc)
    top = pd.Series(counts).sort_values().tail(20)
    fig, ax = figure(1120, 700)
    ax.barh(top.index, top.values, height=0.68, color=BLUE)
    for y, v in enumerate(top.values):
        ax.text(v + 0.3, y, str(v), va="center", color=INK, fontsize=17)
    ax.set_yticks(range(len(top)), top.index, color=INK, fontsize=18)
    ax.set_xlabel("occurrences")
    ax.grid(axis="y", visible=False)
    ax.spines[["left"]].set_visible(False)
    ax.tick_params(axis="y", length=0)
    fig.subplots_adjust(left=0.2, right=0.97, top=0.97, bottom=0.13)
    save(fig, "terms")


def similarity() -> None:
    fz = sn.fuzzy_stats(sn.score_matrix(snippets_of(GOOGLE)))
    fig, axes = figure(1120, 640, 1, 3)
    titles = {"V1": "V1  identical pairs", "V2": "V2  mean score", "V3": "V3  std"}
    for ax, (col, title) in zip(axes, titles.items(), strict=True):
        ax.plot(fz.index, fz[col], marker="o", color=BLUE)
        ax.set_title(title, fontsize=21)
        ax.set_xlabel("first k snippets", fontsize=17)
        ax.set_xticks([10, 50, 100])
        ax.tick_params(labelsize=16)
    axes[0].set_ylim(-0.5, 5)
    axes[0].set_yticks(range(0, 6))
    fig.tight_layout(w_pad=1.5)
    save(fig, "similarity")


def sentiment() -> None:
    scores = sn.compound(snippets_of(GOOGLE))
    st = sn.sentiment_stats(scores)
    fig, (a, b) = figure(1120, 640, 1, 2)
    a.fill_between(st.index, st.V4 - st.V5, st.V4 + st.V5, color=BAND, lw=0,
                   label="± V5 (std)")  # fmt: skip
    a.plot(st.index, st.V4, marker="o", color=BLUE, label="V4 (mean)")
    a.axhline(0, color=MUTED, lw=1)
    a.set_title("V4  mean VADER compound, ± V5")
    a.set_xlabel("first k snippets")
    a.set_xticks(st.index)
    a.legend(loc="upper right", ncol=2)
    colors = np.where(scores > 0.05, GREEN, np.where(scores < -0.05, ORANGE, SLATE))
    b.scatter(np.arange(1, len(scores) + 1), scores, s=60, c=colors, edgecolors=BG,
              linewidths=1.5)  # fmt: skip
    b.axhline(0, color=MUTED, lw=1)
    b.set_title("Each snippet by rank")
    b.set_xlabel("rank")
    b.set_ylim(-1.05, 1.05)
    fig.tight_layout(w_pad=4)
    save(fig, "sentiment")


def compare() -> None:
    runs = {"Google": (GOOGLE, BLUE), "Yahoo": (YAHOO, ORANGE)}
    fig, (a, b) = figure(1120, 640, 1, 2)
    for name, (run, color) in runs.items():
        s = snippets_of(run)
        fz = sn.fuzzy_stats(sn.score_matrix(s))
        st = sn.sentiment_stats(sn.compound(s))
        a.plot(fz.index, fz.V2, marker="o", color=color)
        b.plot(st.index, st.V4, marker="o", color=color)
        a.text(103, fz.V2.iloc[-1], name, color=color, va="center", fontsize=20)
        b.text(103, st.V4.iloc[-1], name, color=color, va="center", fontsize=20)
    a.set_title("V2  similarity")
    b.set_title("V4  sentiment")
    for ax in (a, b):
        ax.set_xlabel("first k snippets")
        ax.set_xticks([10, 50, 100])
        ax.set_xlim(5, 125)
    fig.tight_layout(w_pad=3)
    save(fig, "compare")


SOURCE = {  # source_type -> (map label, color)
    "agency / UN": ("agency / UN", BLUE),
    "science / academia": ("science", TEAL),
    "encyclopedia": ("science", TEAL),
    "news / media": ("news", PURPLE),
    "video": ("video", ORANGE),
    "NGO / advocacy": ("NGO / other", SLATE),
    "commercial / other": ("NGO / other", SLATE),
}
STANCE = {"alarmist": ORANGE, "neutral-informative": SLATE, "solution-oriented": GREEN}
RAMP = ["#0A1A2E", "#0F2C52", "#14457F", "#1A62B4", "#1F8FFF", "#8CC8FF"]


def serp_map(df: pd.DataFrame) -> None:
    src = df.source_type.map(lambda s: SOURCE[s][0])
    src_colors = {label: c for label, c in SOURCE.values()}
    tracks = [
        ("who is speaking", src, src_colors),
        ("what the LLM read", df.text_source, {"page": "#C9D4E2", "snippet": "#3F3F46"}),
        ("LLM stance", df.stance_label, STANCE),
        ("reference quality", df.reference_quality, {i: RAMP[i] for i in range(1, 6)}),
    ]
    fig, axes = figure(1720, 560, len(tracks), 1, sharex=True)
    ranks = df["rank"].to_numpy()
    for ax, (label, values, colors) in zip(axes, tracks, strict=True):
        ax.bar(ranks, 1, width=1, color=[colors[v] for v in values], edgecolor=BG,
               linewidth=1.2)  # fmt: skip
        ax.axvline(10.5, color=INK, lw=2)
        ax.set_ylim(0, 1)
        ax.set_yticks([])
        ax.grid(False)
        ax.spines[:].set_visible(False)
        ax.set_ylabel(label, rotation=0, ha="right", va="center", color=INK, fontsize=20)
        present = [v for v in colors if v in set(values)]
        handles = [plt.Rectangle((0, 0), 1, 1, color=colors[v]) for v in present]
        names = [f"{v}" if label != "reference quality" else f"{v}" for v in present]
        ax.legend(handles, names, loc="center left", bbox_to_anchor=(1.005, 0.5),
                  ncol=3 if len(present) > 3 else 2, fontsize=18, handlelength=0.9, columnspacing=0.8,
                  handletextpad=0.4)  # fmt: skip
    for text, lo, hi in [("top 10: agencies & science", 1, 10),
                         ("YouTube block", 63, 84), ("news", 93, 99)]:  # fmt: skip
        axes[0].annotate(text, ((lo + hi) / 2, 1), xytext=(0, 8), textcoords="offset points",
                         ha="center", va="bottom", color=INK, fontsize=19)  # fmt: skip
        axes[0].plot([lo - 0.5, hi + 0.5], [1.06, 1.06], color=INK, lw=1.5, clip_on=False)
    axes[-1].set_xticks([1, *range(10, 101, 10)])
    axes[-1].set_xlim(0.5, 100.5)
    axes[-1].tick_params(length=0)
    axes[-1].set_xlabel("rank")
    fig.subplots_adjust(left=0.15, right=0.64, top=0.86, bottom=0.14, hspace=0.3)
    save(fig, "serp_map")


RANK_METRICS = {
    "stance": "LLM stance",
    "vader_snippet": "VADER of snippet",
    "awareness": "awareness (0–5)",
    "reference_quality": "reference quality (1–5)",
}


def rank_effect(df: pd.DataFrame) -> None:
    fig, axes = figure(1720, 560, 1, len(RANK_METRICS))
    ranks = df["rank"].to_numpy()
    for ax, (col, title) in zip(axes, RANK_METRICS.items(), strict=True):
        x = df[col].to_numpy(dtype=float)
        null = null_cumulative(x, 2000)
        lo, hi = np.percentile(null, [5, 95], axis=0)
        obs = x.cumsum() / np.arange(1, len(x) + 1)
        k0 = 2
        ax.fill_between(ranks[k0:], lo[k0:], hi[k0:], color=BAND, lw=0,
                        label="90% of random orderings")  # fmt: skip
        ax.axhline(x.mean(), color=MUTED, lw=1, ls="--")
        ax.plot(ranks[k0:], obs[k0:], color=BLUE, label="Google’s order")
        ax.axvline(10.5, color=MUTED, lw=1, ls=":")
        p = (abs(null[:, 9] - x.mean()) >= abs(obs[9] - x.mean())).mean()
        ax.set_title(title, fontsize=19)
        ax.text(0.97, 0.94, f"top 10: {obs[9]:.2f} vs {x.mean():.2f}\np = {p:.2f}",
                transform=ax.transAxes, ha="right", va="top", fontsize=18, color=INK)  # fmt: skip
        ax.set_xlabel("first k results")
        ax.set_xticks([10, 50, 100])
    axes[0].legend(loc="lower left", fontsize=17)
    fig.tight_layout(w_pad=2)
    save(fig, "rank_effect")


def themes(df: pd.DataFrame) -> None:
    pages = df[df.text_source == "page"]
    halves = {"ranks 1–50": pages[pages["rank"] <= 50],
              "ranks 51–100": pages[pages["rank"] > 50]}  # fmt: skip
    table = rk.theme_halves(df).loc["full pages"]
    names = list(rk.THEMES)[::-1]
    y = np.arange(len(names))
    fig, ax = figure(1120, 640)
    shares = {k: g[names].mean().to_numpy() for k, g in halves.items()}
    ax.hlines(y, np.minimum(*shares.values()), np.maximum(*shares.values()), color=BAND, lw=12)
    for (label, s), color in zip(shares.items(), [BLUE, ORANGE], strict=True):
        n = len(halves[label])
        ax.scatter(s, y, s=260, color=color, edgecolors=BG, linewidths=2, zorder=3,
                   label=f"{label} (n={n})")  # fmt: skip
    for i, t in enumerate(names):
        p = table.loc[t, "fisher p"]
        weight = "bold" if p < 0.05 else "normal"
        ax.text(1.04, i, f"p = {p:.3f}", va="center", color=INK if p < 0.05 else MUTED,
                fontsize=19, weight=weight, transform=ax.get_yaxis_transform())  # fmt: skip
    ax.set_yticks(y, names, color=INK, fontsize=21)
    ax.set_xlim(0, 1)
    ax.xaxis.set_major_formatter(plt.FuncFormatter(lambda v, _: f"{v:.0%}"))
    ax.grid(axis="y", visible=False)
    ax.spines[["left"]].set_visible(False)
    ax.tick_params(length=0)
    ax.set_xlabel("share of full-page takeaways mentioning the theme")
    ax.legend(loc="upper center", bbox_to_anchor=(0.5, 1.13), ncol=2)
    fig.subplots_adjust(left=0.15, right=0.83, top=0.86, bottom=0.14)
    save(fig, "themes")


def vader_vs_llm(df: pd.DataFrame) -> None:
    order = ["alarmist", "neutral-informative", "solution-oriented"]
    g = df.groupby("stance_label")[["vader_snippet", "stance"]].mean().loc[order]
    counts = df.stance_label.value_counts()
    y = np.arange(len(order))[::-1]
    fig, ax = figure(1120, 640)
    h = 0.34
    for dy, col, color, label in [(h / 2, "stance", BLUE, "LLM stance (Gemini)"),
                                   (-h / 2, "vader_snippet", SLATE, "VADER on the snippet")]:  # fmt: skip
        v = g[col].to_numpy()
        ax.barh(y + dy, v, height=h - 0.04, color=color, label=label)
        for yi, vi in zip(y + dy, v, strict=True):
            ax.text(vi + (0.03 if vi >= 0 else -0.03), yi, f"{vi:+.2f}".replace("-", "−"), va="center",
                    ha="left" if vi >= 0 else "right", color=INK, fontsize=19)  # fmt: skip
    ax.axvline(0, color=MUTED, lw=1)
    ax.set_yticks(y, [f"{s}\n{counts[s]} pages" for s in order], color=INK, fontsize=20)
    ax.set_xlim(-0.85, 0.7)
    ax.grid(axis="y", visible=False)
    ax.spines[["left"]].set_visible(False)
    ax.tick_params(length=0)
    ax.set_xlabel("mean score (−1 negative … +1 positive)")
    ax.legend(loc="upper center", bbox_to_anchor=(0.45, 1.14), ncol=2)
    fig.subplots_adjust(left=0.27, right=0.97, top=0.86, bottom=0.15)
    save(fig, "vader_vs_llm")


def pages_vs_snippets(df: pd.DataFrame) -> None:
    g = df.groupby("text_source")[["reference_quality", "awareness"]].mean()
    n = df.text_source.value_counts()
    groups = [("page", f"full pages ({n['page']})", BLUE),
              ("snippet", f"snippets only ({n['snippet']})", SLATE)]  # fmt: skip
    fig, axes = figure(1120, 640, 1, 2)
    for ax, (col, title, top) in zip(axes, [("reference_quality", "Reference quality", 5),
                                            ("awareness", "Awareness", 5)], strict=True):  # fmt: skip
        for x, (src, label, color) in enumerate(groups):
            v = g.loc[src, col]
            ax.bar(x, v, width=0.62, color=color)
            ax.text(x, v + 0.1, f"{v:.2f}", ha="center", va="bottom", color=INK, fontsize=26)
        ax.set_title(f"{title} (0–{top})" if col == "awareness" else f"{title} (1–{top})")
        ax.set_xticks([0, 1], [label for _, label, _ in groups], color=INK, fontsize=19)
        ax.set_ylim(0, top + 0.4)
        ax.set_yticks(range(0, top + 1))
        ax.grid(axis="x", visible=False)
        ax.tick_params(axis="x", length=0)
    fig.subplots_adjust(left=0.06, right=0.98, top=0.9, bottom=0.08, wspace=0.18)
    save(fig, "pages_vs_snippets")


def main() -> None:
    OUT.mkdir(exist_ok=True)
    df = rk.add_features(rk.load_results(GOOGLE))
    wordcloud()
    terms()
    similarity()
    sentiment()
    compare()
    serp_map(df)
    rank_effect(df)
    themes(df)
    vader_vs_llm(df)
    pages_vs_snippets(df)


if __name__ == "__main__":
    main()
