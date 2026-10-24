set dotenv-load := true

# list recipes
default:
    @just --list

# install / sync the environment
install:
    uv sync

# format code with ruff
format:
    uv run ruff format .
    uv run ruff check --fix .

# lint + format check (no changes)
lint:
    uv run ruff check .
    uv run ruff format --check .

# step 1: search Google via SerpAPI, ex. `just collect gb` or `just collect de Germany`
collect region="us" location="" label="":
    uv run collect -p serpapi -r {{region}} -l "{{location}}" --label "{{label}}"

# step 1: other search engines via ddgs, ex. `just collect-ddgs uk-en duckduckgo`
collect-ddgs region="us-en" engine="yahoo" label="":
    uv run collect -p ddgs -r {{region}} -e {{engine}} --label "{{label}}" --delay 2

# open the main notebook in JupyterLab
notebook:
    uv run jupyter lab notebooks/main.ipynb

# list collected runs
runs:
    @ls -1t data/raw/*.xlsx 2>/dev/null || echo "no runs yet"

# step 7: build the GUI and serve it with the API on http://127.0.0.1:8000
app:
    cd web && bun install && bun run build
    uv run app

# step 7: API with reload + Vite dev server on http://localhost:5173
app-dev:
    #!/usr/bin/env bash
    trap 'kill 0' EXIT
    uv run uvicorn climate_mining.api:app --reload --port 8000 &
    cd web && bun install && bun run dev

# lint + format the GUI with oxlint / oxfmt
web-lint:
    cd web && bun run lint && bun run format:check

web-format:
    cd web && bun run format
