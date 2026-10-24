import { useSimilarity } from "../api";
import type { PageProps } from "../App";
import { KSeries } from "../components/charts";
import { Note, PageHeader, Skeleton } from "../components/common";
import { Card, Grid, Stat } from "../components/ui/card";
import { fmt } from "../theme";

export function SimilarityPage({ run, k }: PageProps) {
  const { data } = useSimilarity(run.run);
  if (!data) return <Skeleton height={600} />;

  const at = data.find((r) => r.k === k) ?? data.at(-1)!;
  const pairs = (at.k * (at.k - 1)) / 2;

  return (
    <>
      <PageHeader
        title="Fuzzy similarity"
        lede={`Every pair among the first k snippets, scored from 0\u00a0to\u00a0100 with thefuzz's ratio. At k\u00a0=\u00a0${at.k} that is ${pairs.toLocaleString()} pairs.`}
      />
      <Grid cols={3}>
        <Stat label="V1, identical pairs" value={at.V1} />
        <Stat label="V2, mean score" value={fmt(at.V2, 1)} note="0 unrelated, 100 identical" />
        <Stat label="V3, standard deviation" value={fmt(at.V3, 1)} />
      </Grid>
      <Grid cols={3}>
        <Card title="V1">
          <KSeries
            data={data}
            dataKey="V1"
            k={k}
            label="V1"
            format={(v) => String(Math.round(v))}
          />
        </Card>
        <Card title="V2">
          <KSeries data={data} dataKey="V2" k={k} label="V2" format={(v) => v.toFixed(1)} />
        </Card>
        <Card title="V3">
          <KSeries data={data} dataKey="V3" k={k} label="V3" format={(v) => v.toFixed(1)} />
        </Card>
      </Grid>
      <Note>
        V2 moves between {fmt(Math.min(...data.map((r) => r.V2)), 1)} and{" "}
        {fmt(Math.max(...data.map((r) => r.V2)), 1)} as k grows from 10 to {data.at(-1)!.k}.{" "}
        {data.at(-1)!.V1 === 0
          ? "No two snippets are identical, so V1 stays at 0."
          : `${data.at(-1)!.V1} pairs are exact duplicates.`}
      </Note>
    </>
  );
}
