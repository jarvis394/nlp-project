import { useQuery } from "@tanstack/react-query";

export type Run = {
  run: string;
  meta: Record<string, string>;
  analysis: boolean;
};

export type Snippet = {
  rank: number;
  title: string;
  url: string;
  domain: string;
  snippet: string;
  compound: number;
};

export type Term = { term: string; count: number };
export type FuzzyRow = { k: number; V1: number; V2: number; V3: number };
export type SentimentRow = { k: number; V4: number; V5: number };

export type StanceLabel = "alarmist" | "neutral-informative" | "solution-oriented" | "sceptic";

export type Analysed = {
  rank: number;
  url: string;
  title: string;
  domain: string;
  snippet: string;
  source_type: string;
  text_source: "page" | "snippet";
  takeaway: string;
  actions: string[];
  stance: number;
  stance_label: StanceLabel;
  awareness: number;
  references: string[];
  reference_quality: number;
  reference_rationale: string;
  vader_snippet: number;
} & Record<Theme, number>;

export const THEMES = ["causes", "impacts", "solutions", "policy", "evidence"] as const;
export type Theme = (typeof THEMES)[number];

export type RankEffect = {
  metric: string;
  title: string;
  mean: number;
  top: number;
  p: number;
  points: { rank: number; obs: number; band: [number, number] }[];
};

export type Evolution = {
  counts: { all: number; pages: number };
  rank_effect: { all: RankEffect[]; pages: RankEffect[] };
  themes: Record<"all" | "pages", ({ group: string; n: number } & Record<Theme, number>)[]>;
  halves: { group: string; theme: Theme; top: number; bottom: number; p: number }[];
  trends: {
    column: string;
    metric: string;
    top: number;
    rest: number;
    rho: number;
    p_rho: number;
    p_top: number;
  }[];
};

export type Comparison = {
  runs: {
    run: string;
    meta: Record<string, string>;
    curves: (FuzzyRow & SentimentRow)[];
    top: string[];
  }[];
  overlap: number[][];
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail ?? res.statusText);
  }
  return res.json();
}

const run = (r: string) => `/runs/${encodeURIComponent(r)}`;

// The API boots slower than Vite (and restarts on --reload), so keep retrying
// instead of settling on an error that reads as "no runs"
export const useRuns = () =>
  useQuery({
    queryKey: ["runs"],
    queryFn: () => api<Run[]>("/runs"),
    retry: 10,
    retryDelay: (n) => Math.min(500 * 2 ** n, 5000),
  });

export const useSnippets = (r: string) =>
  useQuery({ queryKey: ["snippets", r], queryFn: () => api<Snippet[]>(`${run(r)}/snippets`) });

export const useTerms = (r: string, k: number) =>
  useQuery({ queryKey: ["terms", r, k], queryFn: () => api<Term[]>(`${run(r)}/terms?k=${k}`) });

export const useSimilarity = (r: string) =>
  useQuery({ queryKey: ["similarity", r], queryFn: () => api<FuzzyRow[]>(`${run(r)}/similarity`) });

export const useSentiment = (r: string) =>
  useQuery({
    queryKey: ["sentiment", r],
    queryFn: () =>
      api<{ stats: SentimentRow[]; points: { rank: number; domain: string; compound: number }[] }>(
        `${run(r)}/sentiment`,
      ),
  });

export const useAnalysis = (r: string, enabled: boolean) =>
  useQuery({
    queryKey: ["analysis", r],
    queryFn: () => api<Analysed[]>(`${run(r)}/analysis`),
    enabled,
  });

export const useEvolution = (r: string, top: number, enabled: boolean) =>
  useQuery({
    queryKey: ["evolution", r, top],
    queryFn: () => api<Evolution>(`${run(r)}/evolution?top=${top}`),
    enabled,
  });

export const useCompare = (runs: string[], k: number) =>
  useQuery({
    queryKey: ["compare", runs, k],
    queryFn: () =>
      api<Comparison>(
        `/compare?${runs.map((r) => `runs=${encodeURIComponent(r)}`).join("&")}&k=${k}`,
      ),
    enabled: runs.length > 0,
    placeholderData: (prev) => prev,
  });

export const wordcloudUrl = (r: string, k: number, dropQuery: boolean) =>
  `/api${run(r)}/wordcloud.png?k=${k}&drop_query=${dropQuery}`;

/** "google · de · Germany" from a run's meta sheet */
export function runLabel(meta: Record<string, string>): string {
  return [meta.engine ?? meta.provider, meta.region, meta.location, meta.label]
    .filter(Boolean)
    .join(" · ");
}

export function runDate(meta: Record<string, string>): string {
  const d = new Date(meta.timestamp);
  return Number.isNaN(d.getTime())
    ? ""
    : d.toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
}
