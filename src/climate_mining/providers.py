"""Search providers returning ranked snippets in a unified format."""

from __future__ import annotations

import json
import logging
import os
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass
from pathlib import Path
from typing import ClassVar

import httpx

log = logging.getLogger(__name__)


class ProviderError(Exception):
    pass


@dataclass
class SearchResult:
    rank: int
    title: str
    url: str
    snippet: str


class Provider(ABC):
    """Pages through a search engine and returns the top-n unique results"""

    name: ClassVar[str]
    engines: ClassVar[tuple[str, ...]]
    default_region: ClassVar[str]

    def __init__(
        self,
        engine: str | None = None,
        region: str | None = None,
        location: str = "",
        delay: float = 1.0,
    ):
        self.engine = engine or self.engines[0]
        if self.engine not in self.engines:
            raise ProviderError(
                f"{self.name} has no engine {self.engine!r} | available: {', '.join(self.engines)}"
            )
        self.region = region or self.default_region
        self.location = location
        self.delay = delay

    @abstractmethod
    def fetch_page(self, query: str, page: int) -> list[tuple[str, str, str]]:
        """Return (title, url, snippet) for one results page, [] when finished"""

    def search(
        self, query: str, n: int = 100, max_pages: int = 20
    ) -> list[SearchResult]:
        results: list[SearchResult] = []
        seen: set[str] = set()
        for page in range(max_pages):
            items = self.fetch_page(query, page)
            new = [(t, u, s) for t, u, s in items if u and u not in seen]
            for title, url, snippet in new:
                seen.add(url)
                results.append(
                    SearchResult(
                        len(results) + 1, title or "", url, (snippet or "").strip()
                    )
                )
            log.info(
                "page %2d: %2d hits, %2d new, total %3d",
                page,
                len(items),
                len(new),
                len(results),
            )
            if not items or len(results) >= n:
                break
            time.sleep(self.delay)
        return results[:n]


class SerpApiProvider(Provider):
    """Google search via serpapi.com (needs SERPAPI_KEY)"""

    name = "serpapi"
    engines = ("google",)
    default_region = "us"

    def __init__(self, *args, temp_dir: Path | None = None, **kwargs):
        super().__init__(*args, **kwargs)
        self.key = os.environ.get("SERPAPI_KEY")
        if not self.key:
            raise ProviderError("SERPAPI_KEY is not set (see .env.example)")
        self.temp_dir = temp_dir  # raw JSON per page, so paid searches are never lost
        self.client = httpx.Client(timeout=60)

    def fetch_page(self, query: str, page: int) -> list[tuple[str, str, str]]:
        params = {
            "engine": self.engine,
            "q": query,
            "start": page * 10,
            "hl": "en",
            "gl": self.region,
        }
        if self.location:
            params["location"] = self.location
        data = self.client.get(
            "https://serpapi.com/search.json", params={**params, "api_key": self.key}
        ).json()
        if err := data.get("error"):
            if "hasn't returned any results" in err:
                return []
            raise ProviderError(f"serpapi: {err}")
        if self.temp_dir:
            self.temp_dir.mkdir(parents=True, exist_ok=True)
            (self.temp_dir / f"page_{page:02d}.json").write_text(
                json.dumps(data, ensure_ascii=False, indent=1)
            )
        return [
            (i.get("title"), i.get("link"), i.get("snippet"))
            for i in data.get("organic_results", [])
        ]


class DdgsProvider(Provider):
    """Free scraping through the `ddgs` library, supports multiple search engines"""

    name = "ddgs"
    engines = ("yahoo", "duckduckgo", "brave", "mojeek", "startpage", "google")
    default_region = "us-en"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if self.location:
            raise ProviderError(
                "ddgs has no location parameter; use region (e.g. 'uk-en', 'de-de')"
            )
        from ddgs import DDGS

        self.ddgs = DDGS()

    def fetch_page(self, query: str, page: int) -> list[tuple[str, str, str]]:
        from ddgs.exceptions import DDGSException

        # Engines sometimes return a hit fallback page, retry before giving up
        hits = []
        for attempt in range(3):
            try:
                hits = self.ddgs.text(
                    query,
                    region=self.region,
                    backend=self.engine,
                    max_results=10,
                    page=page + 1,
                )
            except DDGSException as e:
                log.debug("page %d attempt %d: %s", page, attempt + 1, e)
            if len(hits) >= 5:
                break
            time.sleep(self.delay * (attempt + 2))
        return [(h.get("title"), h.get("href"), h.get("body")) for h in hits]


PROVIDERS: dict[str, type[Provider]] = {
    p.name: p for p in (SerpApiProvider, DdgsProvider)
}
