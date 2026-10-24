import { type ReactNode, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  type Analysed,
  type Evolution,
  type RankEffect,
  THEMES,
  useAnalysis,
  useEvolution,
} from "../api";
import type { PageProps } from "../App";
import { KLine, cursor, grid, tick, xAxis, yAxis } from "../components/charts";
import { Legend, PageHeader, Skeleton, Tip } from "../components/common";
import { Card, Grid } from "../components/ui/card";
import { Segmented } from "../components/ui/segmented";
import { type SortDir, SortHeader, sortRows, useSort } from "../components/ui/sort";
import { Table, right } from "../components/ui/table";
import {
  BAND,
  GREY,
  MARK,
  INK_2,
  RAMP,
  SERIES,
  SOURCE_COLORS,
  STANCE_COLORS,
  TEXT_COLORS,
  fmt,
  fmtP,
  pct,
} from "../theme";
import s from "./Evolution.module.css";

type Group = "all" | "pages";

export function EvolutionPage({ run, k }: PageProps) {
  // The API compares the first `top` results with the rest, so leave at least 10 below
  const top = Math.min(k, 90);
  const rows = useAnalysis(run.run, true);
  const evo = useEvolution(run.run, top, true);
  const [group, setGroup] = useState<Group>("all");

  if (!rows.data || !evo.data) return <Skeleton height={900} />;
  const { counts } = evo.data;

  return (
    <>
      <PageHeader
        title="How the results change with rank"
        lede={`Steps 3 to 5 give one number per result. This page lines them up by rank and tests whether the first ${top} differ from the rest. Every test runs twice, once on all ${counts.all} results and once on the ${counts.pages} pages the LLM read in full.`}
      >
        <Segmented<Group>
          value={group}
          options={[
            { value: "all", label: `All ${counts.all}` },
            { value: "pages", label: `${counts.pages} full pages` },
          ]}
          onChange={setGroup}
        />
      </PageHeader>
      <SerpMap rows={rows.data} top={top} />
      <RankEffects effects={evo.data.rank_effect[group]} top={top} />
      <Themes evo={evo.data} group={group} />
      <Trends evo={evo.data} top={top} />
    </>
  );
}

const TRACKS: { key: keyof Analysed; label: string; colors: Record<string, string> }[] = [
  { key: "source_type", label: "Who is speaking", colors: SOURCE_COLORS },
  { key: "text_source", label: "What the LLM read", colors: TEXT_COLORS },
  { key: "stance_label", label: "Stance", colors: STANCE_COLORS },
  {
    key: "awareness",
    label: "Awareness 0-5",
    colors: Object.fromEntries(RAMP.map((c, i) => [i, c])),
  },
  {
    key: "reference_quality",
    label: "References 1-5",
    colors: Object.fromEntries(RAMP.map((c, i) => [i, c])),
  },
];

function SerpMap({ rows, top }: { rows: Analysed[]; top: number }) {
  const [hot, setHot] = useState<Analysed>();
  const n = rows.length;
  const cut = (rows.filter((r) => r.rank <= top).length / n) * 100;

  return (
    <Card title="Every result, by rank">
      <div className={s.map} data-hover={!!hot} onMouseLeave={() => setHot(undefined)}>
        {TRACKS.map((t) => (
          <Track key={t.key} track={t} rows={rows} hot={hot} cut={cut} onHover={setHot} />
        ))}
        <span />
        <div className={s.axis}>
          <span>1</span>
          <span>{Math.round(n / 2)}</span>
          <span>{n}</span>
        </div>
      </div>
      <div className={s.hover} data-empty={!hot}>
        {hot && (
          <>
            <strong>#{hot.rank}</strong> {hot.domain}, {hot.source_type}, {hot.stance_label},
            awareness {hot.awareness}, references {hot.reference_quality}. LLM read{" "}
            {hot.text_source === "page" ? "the full page" : "only the snippet"}.
          </>
        )}
      </div>
      <div className={s.legends}>
        {TRACKS.slice(0, 3).map((t) => (
          <Legend
            key={t.key}
            items={Object.entries(t.colors)
              .filter(([v]) => rows.some((r) => String(r[t.key]) === v))
              .map(([label, color]) => ({ label, color }))}
          />
        ))}
        <Legend items={RAMP.map((color, i) => ({ label: String(i), color }))} />
      </div>
    </Card>
  );
}

function Track({
  track,
  rows,
  hot,
  cut,
  onHover,
}: {
  track: (typeof TRACKS)[number];
  rows: Analysed[];
  hot?: Analysed;
  cut: number;
  onHover: (r: Analysed) => void;
}) {
  return (
    <>
      <div className={s.rowLabel}>{track.label}</div>
      <div className={s.cells} style={{ gridTemplateColumns: `repeat(${rows.length}, 1fr)` }}>
        {rows.map((r) => (
          <div
            key={r.rank}
            className={s.cell}
            data-hot={hot?.rank === r.rank}
            style={{ background: track.colors[String(r[track.key])] ?? GREY }}
            onMouseEnter={() => onHover(r)}
          />
        ))}
        <div className={s.cut} style={{ left: `${cut}%` }} />
      </div>
    </>
  );
}

function RankEffects({ effects, top }: { effects: RankEffect[]; top: number }) {
  return (
    <Card
      title="Does rank order matter?"
      sub="Mean of the first k results against 2,000 random orderings. A line outside the band means rank order matters."
      action={
        <Legend
          items={[
            { label: "actual ranking", color: MARK, line: true },
            { label: "random orderings", color: BAND },
            { label: "overall mean", color: GREY, line: true },
          ]}
        />
      }
    >
      <div className={s.small}>
        {effects.map((e) => (
          <div key={e.metric}>
            <h3 className={s.smallTitle}>{e.title}</h3>
            <div className={s.smallNote}>
              {fmt(e.top)} vs {fmt(e.mean)}, p = {fmt(e.p)}
            </div>
            <ResponsiveContainer width="100%" height={170}>
              <ComposedChart data={e.points} margin={{ top: 12, right: 4, bottom: 0, left: -8 }}>
                {grid}
                <XAxis
                  dataKey="rank"
                  type="number"
                  domain={["dataMin", "dataMax"]}
                  ticks={[10, 50, 100]}
                  {...xAxis}
                />
                <YAxis
                  {...yAxis}
                  width={40}
                  domain={["auto", "auto"]}
                  tickFormatter={(v) => fmt(v, 1)}
                />
                <Area
                  dataKey="band"
                  fill={BAND}
                  stroke="none"
                  fillOpacity={1}
                  isAnimationActive={false}
                />
                <ReferenceLine y={e.mean} stroke={GREY} />
                <KLine k={top} label={false} />
                <Tooltip
                  cursor={cursor}
                  isAnimationActive={false}
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <Tip
                        title={`first ${payload[0].payload.rank}`}
                        rows={[
                          { label: "actual", value: fmt(payload[0].payload.obs), color: MARK },
                          {
                            label: "random 90%",
                            value: `${fmt(payload[0].payload.band[0])} to ${fmt(payload[0].payload.band[1])}`,
                            color: BAND,
                          },
                        ]}
                      />
                    ) : null
                  }
                />
                <Line
                  dataKey="obs"
                  stroke={MARK}
                  strokeWidth={2}
                  dot={false}
                  animationDuration={500}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </Card>
  );
}

type HalfKey = "theme" | "top" | "bottom" | "p";

function Themes({ evo, group }: { evo: Evolution; group: Group }) {
  const groups = evo.themes[group];
  const data = THEMES.map((theme) => ({
    theme,
    ...Object.fromEntries(groups.map((g) => [g.group, g[theme]])),
  }));
  const { sort, toggle } = useSort<HalfKey>({ key: "theme", dir: "asc" });
  const halves = evo.halves.filter(
    (h) => h.group === (group === "all" ? "all results" : "full pages"),
  );

  // "theme" keeps the original order: causes, impacts, solutions, policy, evidence
  const sortedHalves = sortRows(
    halves,
    (h) => (sort.key === "theme" ? THEMES.indexOf(h.theme) : h[sort.key]),
    sort.dir,
  );

  return (
    <Grid cols={2} className={s.themes}>
      <Card
        title="What the takeaway talks about"
        action={
          <Legend
            items={groups.map((g, i) => ({ label: `${g.group} (n=${g.n})`, color: SERIES[i] }))}
          />
        }
      >
        <ResponsiveContainer width="100%" height={340}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
            barGap={2}
            barCategoryGap={14}
          >
            {grid}
            <XAxis type="number" domain={[0, 1]} tickFormatter={pct} {...xAxis} />
            <YAxis
              type="category"
              dataKey="theme"
              width={80}
              tick={{ ...tick, fill: INK_2, fontFamily: "var(--font)", fontSize: 12.5 }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "rgb(29 29 32 / 0.04)" }}
              isAnimationActive={false}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <Tip
                    title={label}
                    rows={payload.map((p, i) => ({
                      label: String(p.dataKey),
                      value: pct(p.value as number),
                      color: SERIES[i],
                    }))}
                  />
                ) : null
              }
            />
            {groups.map((g, i) => (
              <Bar
                key={g.group}
                dataKey={g.group}
                fill={SERIES[i]}
                radius={[0, 4, 4, 0]}
                animationDuration={500}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </Card>
      <Card title="Ranks 1-50 vs 51-100" sub="Fisher's exact test">
        <Table>
          <thead>
            <tr>
              <SortHeader column="theme" sort={sort} onSort={toggle} dir="asc">
                Theme
              </SortHeader>
              <SortHeader column="top" sort={sort} onSort={toggle} className={right}>
                1-50
              </SortHeader>
              <SortHeader column="bottom" sort={sort} onSort={toggle} className={right}>
                51+
              </SortHeader>
              <SortHeader column="p" sort={sort} onSort={toggle} dir="asc" className={right}>
                p
              </SortHeader>
            </tr>
          </thead>
          <tbody>
            {sortedHalves.map((h) => (
              <tr key={h.theme}>
                <td>{h.theme}</td>
                <td className={`num ${right}`}>{pct(h.top)}</td>
                <td className={`num ${right}`}>{pct(h.bottom)}</td>
                <td className={`num ${right}`} data-sig={h.p < 0.05}>
                  {fmtP(h.p)}
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </Grid>
  );
}

type TrendKey = "metric" | "top" | "rest" | "rho" | "p_rho" | "p_top";

function Trends({ evo, top }: { evo: Evolution; top: number }) {
  const { sort, toggle } = useSort<TrendKey>({ key: "metric", dir: "asc" });
  // "metric" keeps the order the API sends
  const rows = sortRows(
    evo.trends,
    (t) => (sort.key === "metric" ? evo.trends.indexOf(t) : t[sort.key]),
    sort.dir,
  );
  const header = (column: TrendKey, label: ReactNode, dir: SortDir = "desc") => (
    <SortHeader
      column={column}
      sort={sort}
      onSort={toggle}
      dir={dir}
      className={column === "metric" ? undefined : right}
    >
      {label}
    </SortHeader>
  );

  return (
    <Card
      title="Every metric against rank"
      sub={`Positive rho means the metric grows further down. Bold: p < 0.05.`}
    >
      <Table>
        <thead>
          <tr>
            {header("metric", "Metric", "asc")}
            {header("top", `First ${top}`)}
            {header("rest", "Rest")}
            {header("rho", "rho")}
            {header("p_rho", "p (rho)", "asc")}
            {header("p_top", `p (first ${top} vs rest)`, "asc")}
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => (
            <tr key={t.column}>
              <td>{t.metric}</td>
              <td className={`num ${right}`}>{fmt(t.top)}</td>
              <td className={`num ${right}`}>{fmt(t.rest)}</td>
              <td className={`num ${right}`}>{fmt(t.rho)}</td>
              <td className={`num ${right}`} data-sig={t.p_rho < 0.05}>
                {fmtP(t.p_rho)}
              </td>
              <td className={`num ${right}`} data-sig={t.p_top < 0.05}>
                {fmtP(t.p_top)}
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
}
