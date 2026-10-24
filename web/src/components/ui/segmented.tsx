import { Tabs } from "@base-ui/react/tabs";
import type { ReactNode } from "react";

import s from "./segmented.module.css";

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <Tabs.Root value={value} onValueChange={(v) => onChange(v as T)}>
      <Tabs.List className={s.list}>
        {options.map((o) => (
          <Tabs.Tab key={o.value} value={o.value} className={s.tab}>
            {o.label}
          </Tabs.Tab>
        ))}
        <Tabs.Indicator className={s.indicator} />
      </Tabs.List>
    </Tabs.Root>
  );
}
