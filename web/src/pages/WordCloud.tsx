import { useState } from "react";
import { Bar, BarChart, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { useTerms, wordcloudUrl } from "../api";
import type { PageProps } from "../App";
import { tick } from "../components/charts";
import { PageHeader, Skeleton, Tip } from "../components/common";
import { Card, Grid } from "../components/ui/card";
import { Segmented } from "../components/ui/segmented";
import { MARK, INK_2 } from "../theme";
import s from "./WordCloud.module.css";

export function WordCloudPage({ run, k }: PageProps) {
  const [mode, setMode] = useState<"drop" | "keep">("drop");
  const [loading, setLoading] = useState(true);
  const terms = useTerms(run.run, k);
  const src = wordcloudUrl(run.run, k, mode === "drop");

  return (
    <>
      <PageHeader
        title="Word cloud"
        lede={`Lemmatised words from the first ${k} snippets, with URLs, breadcrumbs and stopwords removed. "Climate" and "change" are in nearly every snippet and push everything else out, so the default view leaves them out.`}
      >
        <Segmented
          value={mode}
          options={[
            { value: "drop", label: "Without query words" },
            { value: "keep", label: "All words" },
          ]}
          onChange={(m) => {
            setMode(m);
            setLoading(true);
          }}
        />
      </PageHeader>
      <Grid cols={2} className={s.layout}>
        <Card>
          <img
            key={src}
            src={src}
            alt={`Word cloud of the first ${k} snippets`}
            className={s.cloud}
            data-loading={loading}
            onLoad={() => setLoading(false)}
          />
        </Card>
        <Card title="Top 20 terms">
          {terms.data ? (
            <ResponsiveContainer width="100%" height={520}>
              <BarChart
                data={terms.data}
                layout="vertical"
                margin={{ top: 0, right: 36, bottom: 0, left: 0 }}
                barCategoryGap={4}
              >
                <XAxis type="number" hide />
                <YAxis
                  type="category"
                  dataKey="term"
                  width={110}
                  tick={{ ...tick, fill: INK_2, fontFamily: "var(--font)", fontSize: 12.5 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "rgb(29 29 32 / 0.04)" }}
                  isAnimationActive={false}
                  content={({ active, payload }) =>
                    active && payload?.length ? (
                      <Tip
                        title={payload[0].payload.term}
                        rows={[
                          {
                            label: "occurrences",
                            value: payload[0].value as number,
                            color: MARK,
                          },
                        ]}
                      />
                    ) : null
                  }
                />
                <Bar dataKey="count" fill={MARK} radius={[0, 4, 4, 0]} animationDuration={500}>
                  <LabelList dataKey="count" position="right" style={{ ...tick, fill: INK_2 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <Skeleton height={520} />
          )}
        </Card>
      </Grid>
    </>
  );
}
