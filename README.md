# Mining nature from the web
### Project 14

How does a search engine see **"climate change"**? We collect the top-100 search
snippets from Google, then measure their redundancy, sentiment, message, and source quality as
we move down the ranking.

### Setup

```bash
just install          # or uv sync
cp .env.example .env  # You will need API keys
just                  # list all recipes
```

### Plan

| # | Task | Approach | Command |
|---|------|----------|-----------------|
| 1 | Top-100 snippets | Two providers behind a common `Provider` interface: `serpapi` (real Google SERP; `region` = country, `location` = geolocation) and `ddgs` (free scraper, fallback). Run from several countries with `--label`. | `just collect` |
| 2 | WordCloud | Concatenate snippets → clean (URLs, `·` breadcrumbs, `...`, separator lines), remove stopwords + query words ("climate", "change" — otherwise they dominate), lemmatisation (`simplemma`). `wordcloud` + matplotlib, plus a top-20 term-frequency bar chart. | `just notebook` |
| 3 | Fuzzy similarity V1–V3 | For each k: all k·(k−1)/2 pairs scored with `thefuzz` (the maintained FuzzyWuzzy; `rapidfuzz` backend). V1 = #pairs with score 100, V2 = mean, V3 = std. Plot V1/V2/V3 vs k. | `just notebook` |
| 4 | VADER V4–V5 | `vaderSentiment` compound score per snippet; V4 = mean, V5 = std per subset; plot with ±1σ band. Plus a scatter of sentiment vs rank. | `just notebook` |
| 5 | LLM page analysis | Fetch each URL → extract main text (`trafilatura`) → Gemini with a fixed JSON schema: `takeaway` (3 sentences), `actions[]`, `stance` (−1…+1, plus a label: alarmist / neutral-informative / solution-oriented / sceptic), `awareness` (0–5), `references` (list + `quality` 1–5 with a rationale; rubric: peer-reviewed/IPCC/agency > NGO/news > none/opinion). Low temperature, rubric in the system prompt, answers cached per URL in a JSONL file, exported to `analysis.xlsx`. | `uv run analyze` |
| 6 | Evolution pipeline | Join steps 1 and 5 by URL. Label each result with a source type and whether the LLM read the full page. Tag takeaway themes with keyword lists. Compare the mean of the first k results with 2000 random orderings, and theme shares above and below rank 50 with Fisher's exact test. Every test runs on all results and again on full pages only. | `just notebook` |
| 7 | GUI | Streamlit app: sidebar = choose run(s)/provider/region and k; tabs = Snippets table · WordCloud · Similarity (V1–V3) · Sentiment (V4–V5) · LLM cards per result · Evolution dashboard · Region comparison. Can trigger a new collection from the UI. | `just app` |
| 8 | Literature review | ~1-page critical synthesis: from the deficit model → framing (Nisbet), fear vs efficacy appeals (O'Neill & Nicholson-Cole), the "consensus gap" & misinformation inoculation (van der Linden), the shift from "global warming" to "climate crisis/emergency", the rise of solutions/hope framing, and the effect of algorithmic curation (search/AI overviews). Tie back to what our data shows. | `docs/literature.md` |

### Step 1: Collecting snippets

```bash
just collect                        # Google search via SerpAPI, gl=us, 100 snippets
just collect gb                     # Google as seen from the UK (gl=gb)
just collect de Germany             # gl=de + geolocated to Germany
just collect-ddgs uk-en             # Yahoo via ddgs
just runs                           # list collected files
```

SerpAPI runs also keep the raw JSON responses in `data/raw/serpapi/<timestamp>/`, so
a paid search is never lost. Google pages overlap slightly, so `rank` is the position
among *unique* URLs (a run needs ~12 searches to get 100).

### Notebook

Steps 2+ live in [`notebooks/main.ipynb`](notebooks/main.ipynb).

```bash
just notebook       # open in JupyterLab
```
