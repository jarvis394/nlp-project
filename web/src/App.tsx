import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

import { type Run, useRuns } from "./api";
import { CollectDrawer } from "./components/CollectDrawer";
import { PAGES, type PageId, Sidebar } from "./components/Sidebar";
import s from "./App.module.css";
import { Empty, Skeleton } from "./components/common";
import { Button } from "./components/ui/button";
import { AnalysisPage } from "./pages/Analysis";
import { ComparePage } from "./pages/Compare";
import { EvolutionPage } from "./pages/Evolution";
import { SentimentPage } from "./pages/Sentiment";
import { SimilarityPage } from "./pages/Similarity";
import { SnippetsPage } from "./pages/Snippets";
import { WordCloudPage } from "./pages/WordCloud";

export type PageProps = { run: Run; runs: Run[]; k: number };

const VIEWS: Record<PageId, (p: PageProps) => React.ReactNode> = {
  snippets: SnippetsPage,
  wordcloud: WordCloudPage,
  similarity: SimilarityPage,
  sentiment: SentimentPage,
  analysis: AnalysisPage,
  evolution: EvolutionPage,
  compare: ComparePage,
};

type State = { page: PageId; run: string; k: number };

// The view lives in the URL hash, so a reload or a shared link keeps it
function readHash(): Partial<State> {
  const [page, query = ""] = location.hash.replace(/^#\/?/, "").split("?");
  const q = new URLSearchParams(query);
  const k = Number(q.get("k"));
  return {
    ...(page in VIEWS && { page: page as PageId }),
    ...(q.has("run") && { run: q.get("run")! }),
    ...(k >= 10 && k <= 100 && { k }),
  };
}

export function App() {
  const runs = useRuns();
  const [state, setState] = useState<State>(() => ({
    page: "snippets",
    run: "",
    k: 10,
    ...readHash(),
  }));
  const [collecting, setCollecting] = useState(false);

  // Default run: newest one with an LLM analysis, else the newest
  const list = runs.data ?? [];
  const run = list.find((r) => r.run === state.run) ?? list.find((r) => r.analysis) ?? list[0];

  // Follow hash edits and back/forward
  useEffect(() => {
    const sync = () => setState((prev) => ({ ...prev, ...readHash() }));
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  useEffect(() => {
    const q = new URLSearchParams({ k: String(state.k) });
    if (run) q.set("run", run.run);
    history.replaceState(null, "", `#/${state.page}?${q}`);
  }, [state.page, state.k, run]);

  const set = (patch: Partial<State>) => setState((prev) => ({ ...prev, ...patch }));
  const View = VIEWS[state.page];
  const needsAnalysis = PAGES.find((p) => p.id === state.page)?.analysis;

  return (
    <div className={s.shell}>
      <Sidebar
        runs={list}
        run={run}
        page={state.page}
        k={state.k}
        onPage={(page) => {
          // A new page starts at the top, not where the last one was scrolled to
          window.scrollTo({ top: 0 });
          set({ page });
        }}
        onRun={(r) => set({ run: r })}
        onK={(k) => set({ k })}
        onCollect={() => setCollecting(true)}
      />
      <main className={s.main}>
        {runs.isPending ? (
          <div className={s.page}>
            <Skeleton height={90} />
            <Skeleton height={420} />
          </div>
        ) : !run ? (
          <div className={s.page}>
            <Empty title="No runs yet">
              Collect the first 100 results to get started.
              <Button variant="primary" onClick={() => setCollecting(true)}>
                New collection
              </Button>
            </Empty>
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${state.page}:${run.run}`}
              className={s.page}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.1 } }}
              transition={{ duration: 0.24, ease: [0.23, 1, 0.32, 1] }}
            >
              {needsAnalysis && !run.analysis ? (
                <Empty title="This run has no LLM analysis">
                  Step 5 hasn't run on it yet. Analyse it with
                  <code>uv run analyze --run data/raw/{run.run}.xlsx</code>
                </Empty>
              ) : (
                <View run={run} runs={list} k={state.k} />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>
      <CollectDrawer
        open={collecting}
        onClose={() => setCollecting(false)}
        onDone={(newRun) => set({ run: newRun ?? state.run, page: "snippets" })}
      />
    </div>
  );
}
