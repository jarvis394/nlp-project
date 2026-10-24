import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useSentiment } from "../api";
import type { PageProps } from "../App";
import { KLine, KSeries, cursor, grid, xAxis, yAxis } from "../components/charts";
import { PageHeader, Skeleton, Tip } from "../components/common";
import { Card, Grid, Stat } from "../components/ui/card";
import { GRID, MARK, INK_3, fmt, polarity } from "../theme";

export function SentimentPage({ run, k }: PageProps) {
  const { data } = useSentiment(run.run);
  if (!data) return <Skeleton height={600} />;

  const at = data.stats.find((r) => r.k === k) ?? data.stats.at(-1)!;
  const band = data.stats.map((r) => ({ ...r, band: [r.V4 - r.V5, r.V4 + r.V5] }));
  const counts = {
    positive: data.points.filter((p) => p.compound > 0.05).length,
    negative: data.points.filter((p) => p.compound < -0.05).length,
  };

  return (
    <>
      <PageHeader
        title="Sentiment"
        lede="VADER gives each snippet a compound score between -1, most negative, and +1, most positive. V4 and V5 are the mean and standard deviation over the first k."
      />
      <Grid cols={3}>
        <Stat
          label={`V4, mean of first ${at.k}`}
          value={fmt(at.V4)}
          note="-1 negative, +1 positive"
        />
        <Stat label="V5, standard deviation" value={fmt(at.V5)} />
        <Stat
          label="Positive vs negative"
          value={`${counts.positive} / ${counts.negative}`}
          note={`of ${data.points.length}, the rest within ±0.05`}
        />
      </Grid>
      <Grid cols={2}>
        <Card title="V4, mean sentiment">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={band} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
              {grid}
              <XAxis
                dataKey="k"
                type="number"
                domain={[10, 100]}
                ticks={[10, 30, 50, 70, 100]}
                {...xAxis}
              />
              <YAxis {...yAxis} domain={[-0.6, 0.8]} tickFormatter={(v) => v.toFixed(1)} />
              <ReferenceLine y={0} stroke={INK_3} />
              <KLine k={k} label={false} />
              <Tooltip
                cursor={cursor}
                isAnimationActive={false}
                content={({ active, payload }) =>
                  active && payload?.length ? (
                    <Tip
                      title={`first ${payload[0].payload.k} results`}
                      rows={[
                        { label: "V4", value: fmt(payload[0].payload.V4), color: MARK },
                        { label: "V5", value: fmt(payload[0].payload.V5) },
                      ]}
                    />
                  ) : null
                }
              />
              <Area
                dataKey="band"
                fill="#e4e4e9"
                stroke="none"
                fillOpacity={0.7}
                animationDuration={500}
              />
              <Line
                dataKey="V4"
                stroke={MARK}
                strokeWidth={2}
                dot={{ r: 3.5, fill: MARK, stroke: "#fff", strokeWidth: 2 }}
                animationDuration={500}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
        <Card title="V5, standard deviation">
          <KSeries
            data={data.stats}
            dataKey="V5"
            k={k}
            label="V5"
            format={(v) => v.toFixed(2)}
            height={260}
          />
        </Card>
      </Grid>
      <Card title="Each snippet by rank">
        <ResponsiveContainer width="100%" height={300}>
          <ScatterChart margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis
              dataKey="rank"
              type="number"
              domain={[0, 101]}
              ticks={[1, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
              {...xAxis}
            />
            <YAxis
              dataKey="compound"
              type="number"
              domain={[-1, 1]}
              {...yAxis}
              tickFormatter={(v) => v.toFixed(1)}
            />
            <ReferenceLine y={0} stroke={INK_3} />
            <KLine k={k + 0.5} label={false} />
            <Tooltip
              cursor={false}
              isAnimationActive={false}
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <Tip
                    title={`#${payload[0].payload.rank} ${payload[0].payload.domain}`}
                    rows={[
                      {
                        label: "VADER",
                        value: fmt(payload[0].payload.compound),
                        color: polarity(payload[0].payload.compound),
                      },
                    ]}
                  />
                ) : null
              }
            />
            <Scatter
              data={data.points}
              animationDuration={400}
              shape={(p: { cx?: number; cy?: number; payload?: { compound: number } }) => (
                <circle
                  cx={p.cx}
                  cy={p.cy}
                  r={4.5}
                  fill={polarity(p.payload?.compound ?? 0)}
                  stroke="#fff"
                  strokeWidth={1.5}
                />
              )}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </Card>
    </>
  );
}
