import { Select as BaseSelect } from "@base-ui/react/select";
import { Check, ChevronsUpDown } from "lucide-react";
import type { ReactNode } from "react";

import s from "./select.module.css";

export type Option = { value: string; label: ReactNode };

export function Select({
  value,
  options,
  onChange,
  label,
}: {
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <BaseSelect.Root items={options} value={value} onValueChange={(v) => v != null && onChange(v)}>
      <BaseSelect.Trigger className={s.trigger} aria-label={label}>
        <BaseSelect.Value className={s.value} />
        <BaseSelect.Icon className={s.icon}>
          <ChevronsUpDown size={15} />
        </BaseSelect.Icon>
      </BaseSelect.Trigger>
      <BaseSelect.Portal>
        <BaseSelect.Positioner className={s.positioner} sideOffset={6} alignItemWithTrigger={false}>
          <BaseSelect.Popup className={s.popup}>
            <BaseSelect.List>
              {options.map((o) => (
                <BaseSelect.Item key={o.value} value={o.value} className={s.item}>
                  <BaseSelect.ItemIndicator className={s.indicator}>
                    <Check size={14} />
                  </BaseSelect.ItemIndicator>
                  <BaseSelect.ItemText className={s.text}>{o.label}</BaseSelect.ItemText>
                </BaseSelect.Item>
              ))}
            </BaseSelect.List>
          </BaseSelect.Popup>
        </BaseSelect.Positioner>
      </BaseSelect.Portal>
    </BaseSelect.Root>
  );
}
