import { useDeferredValue, useState } from "react";

import { type Snippet, useSnippets } from "../api";
import type { PageProps } from "../App";
import { Chip, PageHeader, Skeleton } from "../components/common";
import { DivergingMeter, ResultCard, resultStyles as rs } from "../components/result";
import { Grid, Stat } from "../components/ui/card";
import { SearchInput } from "../components/ui/input";
import { type SortOption, SortControl, sortRows, useSort } from "../components/ui/sort";
import { fmt, polarity } from "../theme";

type Key = "rank" | "compound" | "length" | "domain";

const SORTS: SortOption<Key>[] = [
  { value: "rank", label: "Rank", dir: "asc" },
  { value: "compound", label: "VADER", dir: "desc" },
  { value: "length", label: "Snippet length", dir: "desc" },
  { value: "domain", label: "Domain", dir: "asc" },
];

const GET: Record<Key, (r: Snippet) => number | string> = {
  rank: (r) => r.rank,
  compound: (r) => r.compound,
  length: (r) => r.snippet.length,
  domain: (r) => r.domain,
};

const tone = (v: number) => (v > 0.05 ? "positive" : v < -0.05 ? "negative" : "neutral");

export function SnippetsPage({ run, k }: PageProps) {
  const { data } = useSnippets(run.run);
  const [query, setQuery] = useState("");
  const q = useDeferredValue(query.trim().toLowerCase());
  const { sort, setSort } = useSort<Key>({ key: "rank", dir: "asc" });

  if (!data) return <Skeleton height={600} />;

  const matches = q
    ? data.filter((r) => `${r.title} ${r.domain} ${r.snippet}`.toLowerCase().includes(q))
    : data;
  const rows = sortRows(matches, GET[sort.key], sort.dir);
  const top = data.slice(0, k);
  const domains = new Set(top.map((r) => r.domain));

  return (
    <>
      <PageHeader
        title="Search results"
        lede={`${data.length} results for "${run.meta.query}", ranked by position among unique URLs. Results past rank ${k} are dimmed.`}
      />
      <Grid cols={3}>
        <Stat
          label={`Domains in the first ${k}`}
          value={domains.size}
          note={`${k - domains.size} repeats`}
        />
        <Stat label="Most frequent domain" value={mode(data.map((r) => r.domain))} />
        <Stat
          label={`Mean VADER, first ${k}`}
          value={fmt(top.reduce((a, r) => a + r.compound, 0) / top.length)}
          note="-1 negative, +1 positive"
        />
      </Grid>
      <div className={rs.toolbar}>
        <SearchInput
          placeholder="Search snippets"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className={rs.tools}>
          {q && <span className={`num ${rs.count}`}>{rows.length} matches</span>}
          <SortControl options={SORTS} sort={sort} onChange={setSort} />
        </div>
      </div>
      <div className={rs.grid}>
        {rows.map((r) => (
          <ResultCard
            key={r.rank}
            rank={r.rank}
            chips={<Chip color={polarity(r.compound)}>{tone(r.compound)}</Chip>}
            title={r.title}
            domain={r.domain}
            body={r.snippet}
            footer={
              <DivergingMeter
                label="VADER"
                value={r.compound}
                color={polarity(r.compound)}
                digits={2}
              />
            }
            cols={1}
            dim={r.rank > k}
            href={r.url}
          />
        ))}
      </div>
    </>
  );
}

function mode(values: string[]): string {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts].toSorted((a, b) => b[1] - a[1])[0][0];
}
