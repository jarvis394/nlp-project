"""Steps 2-4 on a list of snippets: cleaning for the word cloud, fuzzy V1-V3, VADER V4-V5.

Same logic as sections 2-4 of notebooks/main.ipynb, importable for the GUI.
"""

import itertools
import re

import numpy as np
import pandas as pd
import simplemma
from thefuzz import fuzz
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from wordcloud import STOPWORDS, WordCloud

URL = re.compile(r"https?://\S+|www\.\S+")
RULES = re.compile(r"-{3,}|\|")  # "---------- II ----------", "a | b"
BULLET = re.compile(r"\s*[·•]\s*")  # SERP breadcrumbs / inline lists
ELLIPSIS = re.compile(r"\.\.\.|…")
WORD = re.compile(r"[A-Za-z][A-Za-z'-]*")

# Lemmas that would destroy a meaningful term ("global warming" -> "global warm")
KEEP = {"warming", "data", "news", "species"}

# The query itself would dominate every frequency count
QUERY_WORDS = {"climate", "change", "changes", "changing"}

# SERP/web boilerplate that says nothing about how climate change is framed
WEB_WORDS = {
    "comments", "views", "video", "channel", "news", "coverage", "latest",
    "read", "learn", "explore", "explained", "lesson", "report", "reports",
    "published", "update", "share", "shareable", "subscribe", "click",
    "will", "may", "also", "one", "two", "many", "new", "us", "way", "end",
    "include", "now", "make", "take", "say", "stay", "professor",
}  # fmt: skip
STOP = set(STOPWORDS) | WEB_WORDS

_vader = SentimentIntensityAnalyzer()


def clean_snippet(s: str) -> str:
    s = URL.sub(" ", str(s))
    s = RULES.sub(" ", s)
    s = BULLET.sub(". ", s)
    s = ELLIPSIS.sub(" ", s)
    return re.sub(r"\s+", " ", s).strip(" .")


def lemmatize(text: str) -> str:
    """Map inflections to one form (rising -> rise, gases -> gas)."""

    def lemma(m: re.Match) -> str:
        w = m.group()
        return w if w.lower() in KEEP else simplemma.lemmatize(w, lang="en")

    return WORD.sub(lemma, text)


def document(snippets: list[str]) -> str:
    return lemmatize(" ".join(map(clean_snippet, snippets)))


def word_cloud(
    text: str, drop_query: bool, width: int = 1200, height: int = 700
) -> WordCloud:
    max_font = 160

    def color_by_size(word, font_size, position, orientation, random_state=None, **kw):
        # Light to dark blue: bigger (more frequent) words are darker
        t = font_size / max_font
        r, g, b = (
            int(a + (z - a) * t)
            for a, z in zip((161, 189, 230), (63, 109, 179), strict=True)
        )
        return f"rgb({r}, {g}, {b})"

    return WordCloud(
        width=width,
        height=height,
        mode="RGBA",
        background_color=None,
        stopwords=STOP | QUERY_WORDS if drop_query else STOP,
        min_word_length=3,
        max_words=120,
        max_font_size=max_font,
        margin=8,
        prefer_horizontal=0.95,
        color_func=color_by_size,
        random_state=42,
    ).generate(text)


def score_matrix(snippets: list[str], scorer=fuzz.ratio) -> np.ndarray:
    n = len(snippets)
    M = np.zeros((n, n))
    for i, j in itertools.combinations(range(n), 2):
        M[i, j] = M[j, i] = scorer(snippets[i], snippets[j])
    return M


def fuzzy_stats(M: np.ndarray, step: int = 10) -> pd.DataFrame:
    """V1 = #identical pairs, V2 = mean score, V3 = std over the first k snippets"""
    rows = []
    for k in range(step, len(M) + 1, step):
        s = M[:k, :k][np.triu_indices(k, 1)]  # the k(k-1)/2 pairs
        rows.append(
            {"k": k, "V1": int((s == 100).sum()), "V2": s.mean(), "V3": s.std()}
        )
    return pd.DataFrame(rows).set_index("k")


def compound(snippets: list[str]) -> np.ndarray:
    return np.array([_vader.polarity_scores(str(s))["compound"] for s in snippets])


def sentiment_stats(scores: np.ndarray, step: int = 10) -> pd.DataFrame:
    """V4 = mean VADER compound, V5 = std over the first k snippets"""
    rows = []
    for k in range(step, len(scores) + 1, step):
        s = scores[:k]
        rows.append({"k": k, "V4": s.mean(), "V5": s.std(ddof=0)})
    return pd.DataFrame(rows).set_index("k")
