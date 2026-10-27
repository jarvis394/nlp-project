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

### Collecting snippets

```bash
just collect                        # Google search via SerpAPI, gl=us, 100 snippets
just collect gb                     # Google as seen from the UK (gl=gb)
just collect de Germany             # gl=de + geolocated to Germany
just collect-ddgs uk-en             # Yahoo via ddgs
just runs                           # list collected files

# or do it from GUI
```

SerpAPI runs also keep the raw JSON responses in `data/raw/serpapi/<timestamp>/`, so
a paid search is never lost. Google pages overlap slightly, so `rank` is the position
among *unique* URLs (a run needs ~12 searches to get 100).

### GUI

Needs [bun](https://bun.sh) for the frontend.

```bash
just app          # build web/ and serve everything on http://127.0.0.1:8000
just app-dev      # API with reload + Vite on http://localhost:5173
just web-lint     # oxlint + oxfmt check
```

The API reads the same files as the notebook (`data/raw/*.xlsx`, `data/analysis/<run>/cache.jsonl`)
and reuses `climate_mining.snippets` (steps 2-4) and `climate_mining.ranking` (step 6).

You can also run a new collection request from the GUI.

### Notebook

Steps 2+ live in [`notebooks/main.ipynb`](notebooks/main.ipynb).

```bash
just notebook       # open in JupyterLab
```
