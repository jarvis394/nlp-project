import { useState } from "react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { type Comparison, type Run, runDate, runLabel, useCompare } from "../api";
import type { PageProps } from "../App";
import { KLine, cursor, grid, xAxis, yAxis } from "../components/charts";
import { Legend, Note, PageHeader, Skeleton, Tip } from "../components/common";
import { Card, Grid } from "../components/ui/card";
import { Checkbox } from "../components/ui/checkbox";
import { SERIES, fmt, pct } from "../theme";
import s from "./Compare.module.css";

export function ComparePage({ runs, k }: PageProps) {
  const [picked, setPicked] = useState(() => runs.slice(0, 3).map((r) => r.run));
  const selected = runs.filter((r) => picked.includes(r.run)).map((r) => r.run);
  const { data } = useCompare(selected, k);

  // A run keeps its color whatever else is selected
  const color = (run: string) => SERIES[runs.findIndex((r) => r.run === run) % SERIES.length];
  const toggle = (run: string, on: boolean) =>
    setPicked((p) => (on ? [...p, run] : p.filter((r) => r !== run)));

  return (
    <>
      <PageHeader
        title="Compare runs"
        lede="The same query from different countries, locations or engines. Pick runs to compare their redundancy, tone and which domains make the first k."
      />
      <div className={s.runs}>
        {runs.map((r) => (
          <RunToggle
            key={r.run}
            run={r}
            color={color(r.run)}
            on={picked.includes(r.run)}
            onChange={(on) => toggle(r.run, on)}
          />
        ))}
      </div>
      {selected.length < 2 ? (
        <Note>Pick at least two runs.</Note>
      ) : !data ? (
        <Skeleton height={600} />
      ) : (
        <>
          <Grid cols={2}>
            <CurveCard
              data={data}
              metric="V2"
              title="V2, mean fuzzy similarity"
              k={k}
              color={color}
            />
            <CurveCard
              data={data}
              metric="V4"
              title="V4, mean VADER sentiment"
              k={k}
              color={color}
            />
          </Grid>
          <Grid cols={2}>
            <Overlap data={data} k={k} color={color} />
            <Domains data={data} k={k} color={color} />
          </Grid>
        </>
      )}
    </>
  );
}

function RunToggle({
  run,
  color,
  on,
  onChange,
}: {
  run: Run;
  color: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  const id = `run-${run.run}`;
  return (
    <label htmlFor={id} className={s.toggle} data-on={on}>
      <Checkbox id={id} checked={on} onChange={onChange} />
      <span className={s.swatch} style={{ background: color }} />
      <span>
        <span className={s.runName}>{runLabel(run.meta)}</span>
        <span className={s.runDate}>{runDate(run.meta)}</span>
      </span>
    </label>
  );
}

function CurveCard({
  data,
  metric,
  title,
  k,
  color,
}: {
  data: Comparison;
  metric: "V2" | "V4";
  title: string;
  k: number;
  color: (run: string) => string;
}) {
  // One row per k with a column per run
  const rows = data.runs[0].curves.map((c, i) => ({
    k: c.k,
    ...Object.fromEntries(data.runs.map((r) => [r.run, r.curves[i]?.[metric]])),
  }));
  const digits = metric === "V2" ? 1 : 2;

  return (
    <Card
      title={title}
      action={
        <Legend
          items={data.runs.map((r) => ({
            label: runLabel(r.meta),
            color: color(r.run),
            line: true,
          }))}
        />
      }
    >
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          {grid}
          <XAxis
            dataKey="k"
            type="number"
            domain={[10, 100]}
            ticks={[10, 30, 50, 70, 100]}
            {...xAxis}
          />
          <YAxis {...yAxis} domain={["auto", "auto"]} tickFormatter={(v) => fmt(v, digits)} />
          <KLine k={k} label={false} />
          <Tooltip
            cursor={cursor}
            isAnimationActive={false}
            content={({ active, payload }) =>
              active && payload?.length ? (
                <Tip
                  title={`first ${payload[0].payload.k}`}
                  rows={data.runs.map((r) => ({
                    label: runLabel(r.meta),
                    value: fmt(payload[0].payload[r.run], digits),
                    color: color(r.run),
                  }))}
                />
              ) : null
            }
          />
          {data.runs.map((r) => (
            <Line
              key={r.run}
              dataKey={r.run}
              stroke={color(r.run)}
              strokeWidth={2}
              dot={{ r: 3, fill: color(r.run), stroke: "#fff", strokeWidth: 1.5 }}
              animationDuration={500}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

function Overlap({
  data,
  k,
  color,
}: {
  data: Comparison;
  k: number;
  color: (run: string) => string;
}) {
  const n = data.runs.length;
  return (
    <Card
      title={`Domain overlap in the first ${k}`}
      sub="Jaccard index, the shared domains over all domains in either run"
    >
      <div
        className={s.matrix}
        style={{ gridTemplateColumns: `120px repeat(${n}, minmax(0, 1fr))` }}
      >
        <span />
        {data.runs.map((r) => (
          <span key={r.run} className={s.matrixLabel} title={runLabel(r.meta)}>
            <span className={s.swatch} style={{ background: color(r.run) }} />
            {runLabel(r.meta)}
          </span>
        ))}
        {data.runs.map((a, i) => (
          <Row
            key={a.run}
            label={runLabel(a.meta)}
            color={color(a.run)}
            values={data.overlap[i].map((v, j) => ({ run: data.runs[j].run, v }))}
          />
        ))}
      </div>
    </Card>
  );
}

function Row({
  label,
  color,
  values,
}: {
  label: string;
  color: string;
  values: { run: string; v: number }[];
}) {
  return (
    <>
      <span className={s.matrixLabel} title={label}>
        <span className={s.swatch} style={{ background: color }} />
        {label}
      </span>
      {values.map(({ run, v }) => (
        // Sequential blue, light = little overlap
        <span
          key={run}
          className={s.matrixCell}
          style={{
            background: `rgb(95 143 212 / ${0.1 + v * 0.9})`,
            color: v > 0.55 ? "#fff" : "var(--ink)",
          }}
        >
          {pct(v)}
        </span>
      ))}
    </>
  );
}

function Domains({
  data,
  k,
  color,
}: {
  data: Comparison;
  k: number;
  color: (run: string) => string;
}) {
  const count = new Map<string, number>();
  for (const r of data.runs)
    for (const d of new Set(r.top.slice(0, 10))) count.set(d, (count.get(d) ?? 0) + 1);

  return (
    <Card
      title={`First ${Math.min(k, 10)} domains`}
      sub="Bold domains appear in every selected run"
    >
      <div
        className={s.domainCols}
        style={{ gridTemplateColumns: `repeat(${data.runs.length}, minmax(0, 1fr))` }}
      >
        {data.runs.map((r) => (
          <div key={r.run}>
            <div className={s.matrixLabel}>
              <span className={s.swatch} style={{ background: color(r.run) }} />
              {runLabel(r.meta)}
            </div>
            <ol className={s.domains}>
              {r.top.slice(0, 10).map((d, i) => (
                // A domain can hold several ranks, so its position is the identity
                // oxlint-disable-next-line react/no-array-index-key
                <li key={i} className={count.get(d) === data.runs.length ? s.shared : s.unique}>
                  {d}
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    </Card>
  );
}
