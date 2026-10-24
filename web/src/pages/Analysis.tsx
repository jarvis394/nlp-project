import { useState } from "react";

import { type Analysed, type StanceLabel, useAnalysis } from "../api";
import type { PageProps } from "../App";
import { Chip, H4, PageHeader, Skeleton } from "../components/common";
import { DivergingMeter, PipMeter, ResultCard, resultStyles as rs } from "../components/result";
import { Card, Grid, Stat } from "../components/ui/card";
import { Segmented } from "../components/ui/segmented";
import { Sheet } from "../components/ui/sheet";
import { type SortOption, SortControl, sortRows, useSort } from "../components/ui/sort";
import { SOURCE_COLORS, STANCE_COLORS, fmt } from "../theme";
import s from "./Analysis.module.css";

type Filter = "all" | StanceLabel;
type Key = "rank" | "stance" | "awareness" | "reference_quality" | "n_actions";

const SORTS: SortOption<Key>[] = [
  { value: "rank", label: "Rank", dir: "asc" },
  { value: "stance", label: "Stance", dir: "desc" },
  { value: "awareness", label: "Awareness", dir: "desc" },
  { value: "reference_quality", label: "Reference quality", dir: "desc" },
  { value: "n_actions", label: "Actions asked", dir: "desc" },
];

const GET: Record<Key, (r: Analysed) => number> = {
  rank: (r) => r.rank,
  stance: (r) => r.stance,
  awareness: (r) => r.awareness,
  reference_quality: (r) => r.reference_quality,
  n_actions: (r) => r.actions.length,
};

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "solution-oriented", label: "Solution-oriented" },
  { value: "neutral-informative", label: "Neutral" },
  { value: "alarmist", label: "Alarmist" },
  { value: "sceptic", label: "Sceptic" },
];

const mean = (rows: Analysed[], key: "stance" | "awareness" | "reference_quality") =>
  rows.reduce((a, r) => a + r[key], 0) / rows.length;

export function AnalysisPage({ run, k }: PageProps) {
  const { data } = useAnalysis(run.run, true);
  const [filter, setFilter] = useState<Filter>("all");
  const [open, setOpen] = useState<Analysed>();
  const { sort, setSort } = useSort<Key>({ key: "rank", dir: "asc" });

  if (!data) return <Skeleton height={600} />;

  const top = data.filter((r) => r.rank <= k);
  const rest = data.filter((r) => r.rank > k);
  const filtered = filter === "all" ? data : data.filter((r) => r.stance_label === filter);
  const shown = sortRows(filtered, GET[sort.key], sort.dir);
  const model = (data[0] as { model?: string }).model;

  return (
    <>
      <PageHeader
        title="LLM page analysis"
        lede={`${model ?? "Gemini"} read each page and returned a three-sentence takeaway, the actions it asks of the reader, a stance from -1 to +1, an awareness score and the quality of its references. ${data.filter((r) => r.text_source === "snippet").length} pages couldn't be fetched, so the model only saw their snippet.`}
      />
      <Grid cols={3}>
        <Stat
          label={`Stance, first ${k}`}
          value={fmt(mean(top, "stance"))}
          note={rest.length ? `${fmt(mean(rest, "stance"))} for the rest` : undefined}
        />
        <Stat
          label={`Awareness, first ${k}`}
          value={fmt(mean(top, "awareness"), 1)}
          note={
            rest.length ? `${fmt(mean(rest, "awareness"), 1)} for the rest, out of 5` : "out of 5"
          }
        />
        <Stat
          label={`Reference quality, first ${k}`}
          value={fmt(mean(top, "reference_quality"), 1)}
          note={
            rest.length
              ? `${fmt(mean(rest, "reference_quality"), 1)} for the rest, out of 5`
              : "out of 5"
          }
        />
      </Grid>
      <div className={rs.toolbar}>
        <Segmented value={filter} options={FILTERS} onChange={setFilter} />
        <div className={rs.tools}>
          <span className={`num ${rs.count}`}>{shown.length} results</span>
          <SortControl options={SORTS} sort={sort} onChange={setSort} />
        </div>
      </div>
      <div className={rs.grid}>
        {shown.map((r) => (
          <ResultCard
            key={r.rank}
            rank={r.rank}
            chips={
              <>
                <Chip color={STANCE_COLORS[r.stance_label]}>{r.stance_label}</Chip>
                {r.text_source === "snippet" && <Chip>snippet only</Chip>}
              </>
            }
            title={r.title}
            domain={r.domain}
            body={r.takeaway}
            footer={<Meters r={r} />}
            dim={r.rank > k}
            onOpen={() => setOpen(r)}
          />
        ))}
      </div>
      <Sheet
        open={!!open}
        onOpenChange={(o) => !o && setOpen(undefined)}
        title={open?.title ?? ""}
        description={open && `#${open.rank} · ${open.domain}`}
      >
        {open && <Details r={open} />}
      </Sheet>
    </>
  );
}

function Meters({ r }: { r: Analysed }) {
  return (
    <>
      <DivergingMeter label="Stance" value={r.stance} color={STANCE_COLORS[r.stance_label]} />
      <PipMeter label="Awareness" value={r.awareness} />
      <PipMeter label="References" value={r.reference_quality} />
    </>
  );
}

function Details({ r }: { r: Analysed }) {
  return (
    <>
      <Card>
        <div className={s.meters}>
          <Meters r={r} />
        </div>
      </Card>
      <section>
        <H4>Takeaway</H4>
        <p className={s.plain}>{r.takeaway}</p>
      </section>
      <section>
        <H4>What it asks the reader to do</H4>
        {r.actions.length ? (
          <ul className={s.list}>
            {r.actions.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        ) : (
          <p className={`${s.plain} ${s.muted}`}>Nothing.</p>
        )}
      </section>
      <section>
        <H4>References</H4>
        {r.references.length > 0 && (
          <ul className={s.list}>
            {r.references.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        )}
        <p className={s.rationale}>{r.reference_rationale}</p>
      </section>
      <section>
        <H4>Labels</H4>
        <dl className={s.kv}>
          <dt>Source type</dt>
          <dd>
            <Chip color={SOURCE_COLORS[r.source_type]}>{r.source_type}</Chip>
          </dd>
          <dt>LLM read</dt>
          <dd>{r.text_source === "page" ? "the full page" : "only the snippet"}</dd>
          <dt>VADER of snippet</dt>
          <dd className="num">{fmt(r.vader_snippet)}</dd>
          <dt>URL</dt>
          <dd className={s.url}>
            <a href={r.url} target="_blank" rel="noreferrer">
              {r.url}
            </a>
          </dd>
        </dl>
      </section>
    </>
  );
}
