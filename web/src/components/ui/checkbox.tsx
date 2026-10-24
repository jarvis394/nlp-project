import { Checkbox as BaseCheckbox } from "@base-ui/react/checkbox";
import { Check } from "lucide-react";

import s from "./checkbox.module.css";

export function Checkbox({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  id?: string;
}) {
  return (
    <BaseCheckbox.Root id={id} className={s.root} checked={checked} onCheckedChange={onChange}>
      <BaseCheckbox.Indicator className={s.indicator}>
        <Check size={12} strokeWidth={3} />
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  );
}
