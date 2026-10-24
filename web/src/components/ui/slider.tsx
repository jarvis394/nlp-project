import { Slider as BaseSlider } from "@base-ui/react/slider";

import s from "./slider.module.css";

export function Slider({
  value,
  min,
  max,
  step,
  onChange,
  label,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  label: string;
}) {
  return (
    <BaseSlider.Root value={value} min={min} max={max} step={step} onValueChange={onChange}>
      <BaseSlider.Control className={s.control}>
        <BaseSlider.Track className={s.track}>
          <BaseSlider.Indicator className={s.indicator} />
          <BaseSlider.Thumb className={s.thumb} aria-label={label} />
        </BaseSlider.Track>
      </BaseSlider.Control>
    </BaseSlider.Root>
  );
}
