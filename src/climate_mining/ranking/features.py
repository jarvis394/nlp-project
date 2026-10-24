import re

import numpy as np
import pandas as pd
from sklearn.cluster import KMeans
from sklearn.decomposition import TruncatedSVD
from sklearn.feature_extraction.text import ENGLISH_STOP_WORDS, TfidfVectorizer
from sklearn.preprocessing import normalize
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

from climate_mining.ranking.config import N_TOPICS, SEED, SOURCE_RULES, STEP, THEMES

_vader = SentimentIntensityAnalyzer()


def source_type(domain: str) -> str:
    for name, pattern in SOURCE_RULES:
        if re.search(pattern, domain):
            return name
    return "commercial / other"


def embed(texts: pd.Series, dims: int = 50) -> np.ndarray:
    stop = list(ENGLISH_STOP_WORDS | {"climate", "change"})
    tfidf = TfidfVectorizer(stop_words=stop, ngram_range=(1, 2), sublinear_tf=True)
    X = tfidf.fit_transform(texts)
    dims = min(dims, X.shape[1] - 1, X.shape[0] - 1)
    return normalize(TruncatedSVD(dims, random_state=SEED).fit_transform(X))


def topics(texts: pd.Series, vectors: np.ndarray, k: int = N_TOPICS) -> pd.Series:
    """KMeans on the takeaway vectors"""
    labels = KMeans(k, n_init=10, random_state=SEED).fit_predict(vectors)
    stop = list(ENGLISH_STOP_WORDS | {"climate", "change", "changes"})
    tfidf = TfidfVectorizer(stop_words=stop, min_df=2)
    X = tfidf.fit_transform(texts)
    terms = np.array(tfidf.get_feature_names_out())
    names = {}
    for c in range(k):
        weights = np.asarray(X[labels == c].mean(axis=0)).ravel()
        names[c] = " · ".join(terms[weights.argsort()[::-1][:3]])
    return pd.Series(labels, index=texts.index).map(names)


def add_features(df: pd.DataFrame, top: int = STEP) -> pd.DataFrame:
    df = df.copy()
    df["domain"] = df.url.str.extract(r"https?://(?:www\.)?([^/]+)", expand=False)
    df["source_type"] = df.domain.map(source_type)
    df["vader_snippet"] = df.snippet.astype(str).map(
        lambda s: _vader.polarity_scores(s)["compound"]
    )
    df["vader_takeaway"] = df.takeaway.map(
        lambda s: _vader.polarity_scores(s)["compound"]
    )
    df["n_actions"] = df.actions.map(len)
    for theme, pattern in THEMES.items():
        df[theme] = df.takeaway.str.contains(pattern, case=False).astype(int)

    V = embed(df.takeaway)
    # `drift` is how far the message is from what the top 10 say
    head = V[:top].sum(axis=0)
    centroids = np.array([head - V[i] if i < top else head for i in range(len(V))])
    df["drift"] = 1 - (V * normalize(centroids)).sum(axis=1)
    # `novelty` is `1 - similarity` to the closest higher-ranked takeaway
    sim = V @ V.T
    df["novelty"] = [np.nan] + [1 - sim[i, :i].max() for i in range(1, len(df))]
    df["topic"] = topics(df.takeaway, V)
    return df
