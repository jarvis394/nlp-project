import {
  Activity,
  BrainCircuit,
  Cloud,
  GitCompareArrows,
  Leaf,
  ListOrdered,
  Plus,
  Sigma,
  TrendingUp,
} from "lucide-react";
import { motion } from "motion/react";

import { type Run, runDate, runLabel } from "../api";
import s from "./Sidebar.module.css";
import { Button } from "./ui/button";
import { Select } from "./ui/select";
import { Slider } from "./ui/slider";

export type PageId =
  | "snippets"
  | "wordcloud"
  | "similarity"
  | "sentiment"
  | "analysis"
  | "evolution"
  | "compare";

export const PAGES: {
  id: PageId;
  label: string;
  icon: typeof Leaf;
  analysis?: boolean;
}[] = [
  { id: "snippets", label: "Snippets", icon: ListOrdered },
  { id: "wordcloud", label: "Word cloud", icon: Cloud },
  { id: "similarity", label: "Similarity", icon: Sigma },
  { id: "sentiment", label: "Sentiment", icon: Activity },
  { id: "analysis", label: "LLM analysis", icon: BrainCircuit, analysis: true },
  { id: "evolution", label: "Evolution", icon: TrendingUp, analysis: true },
  { id: "compare", label: "Compare runs", icon: GitCompareArrows },
];

export function Sidebar({
  runs,
  run,
  page,
  k,
  onPage,
  onRun,
  onK,
  onCollect,
}: {
  runs: Run[];
  run?: Run;
  page: PageId;
  k: number;
  onPage: (p: PageId) => void;
  onRun: (r: string) => void;
  onK: (k: number) => void;
  onCollect: () => void;
}) {
  const options = runs.map((r) => ({
    value: r.run,
    label: `${runLabel(r.meta)}, ${runDate(r.meta)}`,
  }));

  return (
    <aside className={s.sidebar}>
      <div className={s.brand}>
        <div className={s.mark}>
          <Leaf size={18} />
        </div>
        <div className={s.title}>Mining nature</div>
      </div>

      <div className={s.section}>
        <div className={s.field}>
          <Select label="Run" value={run?.run ?? ""} options={options} onChange={onRun} />
        </div>
        <div className={s.field}>
          <div className={s.rangeRow}>
            <span className={s.hint}>First k results</span>
            <span className={s.rangeValue}>k = {k}</span>
          </div>
          <Slider label="k" value={k} min={10} max={100} step={10} onChange={onK} />
        </div>
      </div>

      <nav className={s.section}>
        <div className={s.nav}>
          {PAGES.map(({ id, label, icon: Icon, analysis }) => {
            const locked = analysis && run && !run.analysis;
            return (
              <button
                key={id}
                type="button"
                className={s.item}
                data-active={page === id}
                aria-current={page === id ? "page" : undefined}
                disabled={locked}
                title={locked ? "No LLM analysis for this run" : undefined}
                onClick={() => onPage(id)}
              >
                {page === id && (
                  <motion.div
                    layoutId="nav-pill"
                    className={s.pill}
                    transition={{ type: "spring", duration: 0.35, bounce: 0 }}
                  />
                )}
                <Icon size={17} strokeWidth={1.75} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <Button variant="primary" block className={s.collect} onClick={onCollect}>
        <Plus size={16} /> New collection
      </Button>
    </aside>
  );
}
