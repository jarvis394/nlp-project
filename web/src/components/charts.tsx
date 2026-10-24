import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { GRID, INK, INK_3, MARK } from "../theme";
import { Tip } from "./common";

export const tick = { fill: INK_3, fontSize: 11.5, fontFamily: "var(--mono)" };

export const xAxis = {
  tick,
  tickLine: false,
  axisLine: { stroke: GRID },
  tickMargin: 8,
} as const;

export const yAxis = {
  tick,
  tickLine: false,
  axisLine: false,
  width: 44,
} as const;

export const grid = <CartesianGrid stroke={GRID} vertical={false} />;

export const cursor = { stroke: INK_3, strokeWidth: 1, strokeDasharray: "3 3" };

/** Vertical marker at the sidebar's k */
export function KLine({ k, label = true }: { k: number; label?: boolean }) {
  return (
    <ReferenceLine
      x={k}
      stroke={INK}
      strokeWidth={1.5}
      label={
        label
          ? { value: `k = ${k}`, position: "insideTopRight", fill: INK, fontSize: 11 }
          : undefined
      }
    />
  );
}

/** A single series over k = 10, 20, ... 100 */
export function KSeries<T extends { k: number }>({
  data,
  dataKey,
  k,
  format,
  label,
  height = 220,
}: {
  data: T[];
  dataKey: keyof T & string;
  k: number;
  format: (v: number) => string;
  label: string;
  height?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        {grid}
        <XAxis
          dataKey="k"
          type="number"
          domain={[10, 100]}
          ticks={[10, 30, 50, 70, 100]}
          {...xAxis}
        />
        <YAxis {...yAxis} tickFormatter={format} domain={["auto", "auto"]} />
        <KLine k={k} label={false} />
        <Tooltip
          cursor={cursor}
          isAnimationActive={false}
          content={({ active, payload }) =>
            active && payload?.length ? (
              <Tip
                title={`first ${payload[0].payload.k} results`}
                rows={[{ label, value: format(payload[0].value as number), color: MARK }]}
              />
            ) : null
          }
        />
        <Line
          dataKey={dataKey}
          stroke={MARK}
          strokeWidth={2}
          dot={{ r: 3.5, fill: MARK, stroke: "#fff", strokeWidth: 2 }}
          activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2 }}
          animationDuration={500}
          animationEasing="ease-out"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
