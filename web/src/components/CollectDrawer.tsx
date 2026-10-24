import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { api, type Run } from "../api";
import s from "./CollectDrawer.module.css";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Segmented } from "./ui/segmented";
import { Sheet } from "./ui/sheet";

type Provider = "serpapi" | "ddgs";
type Job = { status: "running" | "done" | "failed"; log: string[] };

const DEFAULTS: Record<Provider, { region: string; engine: string }> = {
  serpapi: { region: "us", engine: "" },
  ddgs: { region: "us-en", engine: "yahoo" },
};

/** Step 1 from the UI: start `collect` on the server and follow its log */
export function CollectDrawer({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: (run?: string) => void;
}) {
  const qc = useQueryClient();
  const [provider, setProvider] = useState<Provider>("serpapi");
  const [form, setForm] = useState({ region: "us", location: "", engine: "", label: "" });
  const [job, setJob] = useState<Job>();

  // Poll the job until `collect` exits; the log tail shows progress meanwhile
  const start = async () => {
    try {
      const { job: id } = await api<{ job: string }>("/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, ...form }),
      });
      let state: Job = { status: "running", log: [] };
      setJob(state);
      // Polling is sequential on purpose
      while (state.status === "running") {
        // oxlint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 1500));
        // oxlint-disable-next-line no-await-in-loop
        state = await api<Job>(`/collect/${id}`);
        setJob(state);
      }
      const last = state.log.at(-1);
      if (state.status === "failed") {
        toast.error("Collection failed", { description: last });
        return;
      }
      // The new run is the newest file in data/raw
      await qc.invalidateQueries({ queryKey: ["runs"] });
      toast.success("Collection finished", { description: last });
      onDone(qc.getQueryData<Run[]>(["runs"])?.[0]?.run);
      setJob(undefined);
      onClose();
    } catch (e) {
      toast.error("Collection failed", { description: String(e) });
      setJob(undefined);
    }
  };

  const field = (key: keyof typeof form) => ({
    id: `collect-${key}`,
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="New collection"
      description={'Fetch the top 100 results for "climate change" and save them as a new run.'}
    >
      <Segmented<Provider>
        value={provider}
        options={[
          { value: "serpapi", label: "Google (SerpAPI)" },
          { value: "ddgs", label: "Other engines (ddgs)" },
        ]}
        onChange={(p) => {
          setProvider(p);
          setForm((f) => ({ ...f, ...DEFAULTS[p] }));
        }}
      />
      <div className={s.form}>
        <label htmlFor="collect-region">
          {provider === "serpapi" ? "Country code" : "Locale"}
          <Input placeholder={DEFAULTS[provider].region} {...field("region")} />
        </label>
        {provider === "serpapi" ? (
          <label htmlFor="collect-location">
            Location
            <Input placeholder="Germany" {...field("location")} />
          </label>
        ) : (
          <label htmlFor="collect-engine">
            Engine
            <Input placeholder="yahoo, duckduckgo, bing" {...field("engine")} />
          </label>
        )}
        <label htmlFor="collect-label" className={s.full}>
          Label
          <Input placeholder="vpn-germany" {...field("label")} />
        </label>
        <p className={`${s.hint} ${s.full}`}>
          {provider === "serpapi"
            ? "Uses about 12 SerpAPI searches and needs SERPAPI_KEY in .env."
            : "Free, but engines rate-limit scrapers, so it waits 2 s between pages."}
        </p>
      </div>
      <Button variant="primary" onClick={start} disabled={job?.status === "running"}>
        {job?.status === "running" ? "Collecting..." : "Start collection"}
      </Button>
      {job && job.log.length > 0 && <pre className={s.log}>{job.log.join("\n")}</pre>}
    </Sheet>
  );
}
