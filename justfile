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

# list collected runs
runs:
    @ls -1t data/raw/*.xlsx 2>/dev/null || echo "no runs yet"
