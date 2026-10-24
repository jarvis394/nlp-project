// Monochrome UI; colour lives inside the charts.
// The six hues pass the dataviz palette validator in this order (CVD-safe neighbours).

export const INK = "#1d1d20";
export const INK_2 = "#5a5a62";
export const INK_3 = "#93939b";
export const GRID = "#efeff2";
export const BAND = "#ebebef";
export const GREY = "#b4b4ba";

export const SERIES = ["#5f8fd4", "#5aaf7e", "#8f7fdc", "#e07a90", "#cf9f3a", "#1ea8b6"];

// Colour of a chart's only series
export const MARK = SERIES[0];

// Negative pole rose, neutral grey, positive blue
export const STANCE_COLORS: Record<string, string> = {
  alarmist: "#e07a90",
  sceptic: "#cf9f3a",
  "neutral-informative": GREY,
  "solution-oriented": "#5f8fd4",
};

export const SOURCE_ORDER = [
  "video",
  "encyclopedia",
  "agency / UN",
  "science / academia",
  "news / media",
  "NGO / advocacy",
  "commercial / other",
];
// "commercial / other" is the catch-all, so it gets grey instead of a seventh hue
export const SOURCE_COLORS: Record<string, string> = Object.fromEntries(
  SOURCE_ORDER.map((s, i) => [s, SERIES[i] ?? GREY]),
);

// Ordinal blue ramp for the 0-5 LLM scores, light = low
export const RAMP = ["#e6eef9", "#c6d7f1", "#a1bde6", "#7fa4dc", "#5f8fd4", "#3f6db3"];

export const TEXT_COLORS: Record<string, string> = { page: INK_2, snippet: "#dcdce1" };

export const fmt = (v: number | null | undefined, digits = 2) =>
  v == null || Number.isNaN(v) ? "n/a" : v.toFixed(digits);

export const pct = (v: number) => `${Math.round(v * 100)}%`;

export const fmtP = (p: number) => (p < 0.001 ? "<0.001" : p.toFixed(3));

// Diverging fill for VADER: rose negative, grey neutral, blue positive
export function polarity(v: number): string {
  if (v > 0.05) return STANCE_COLORS["solution-oriented"];
  if (v < -0.05) return STANCE_COLORS.alarmist;
  return GREY;
}
