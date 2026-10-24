import type { CSSProperties, ReactNode } from "react";

import { RAMP, fmt } from "../theme";
import s from "./result.module.css";
import card from "./ui/card.module.css";
import { Rank } from "./ui/table";

export const resultStyles = s;

/** One search result as a card. With `href` it opens the page, otherwise it calls `onOpen`. */
export function ResultCard({
  rank,
  chips,
  title,
  domain,
  body,
  footer,
  cols = 3,
  dim,
  href,
  onOpen,
}: {
  rank: number;
  chips?: ReactNode;
  title: string;
  domain: ReactNode;
  body: ReactNode;
  footer: ReactNode;
  cols?: number;
  dim?: boolean;
  href?: string;
  onOpen?: () => void;
}) {
  const content = (
    <>
      <div className={s.top}>
        <Rank value={rank} />
        {chips}
      </div>
      <div>
        <h3 className={s.title}>{title}</h3>
        <div className={s.domain}>{domain}</div>
      </div>
      <p className={s.body}>{body}</p>
      <div className={s.footer} style={{ "--cols": cols } as CSSProperties}>
        {footer}
      </div>
    </>
  );
  const className = `${card.card} ${s.card}`;
  return href ? (
    <a className={className} data-dim={dim} href={href} target="_blank" rel="noreferrer">
      {content}
    </a>
  ) : (
    <button type="button" className={className} data-dim={dim} onClick={onOpen}>
      {content}
    </button>
  );
}

/** -1..+1 value as a bar growing left or right from zero */
export function DivergingMeter({
  label,
  value,
  color,
  digits = 1,
}: {
  label: string;
  value: number;
  color: string;
  digits?: number;
}) {
  const left = value < 0 ? 50 + value * 50 : 50;
  return (
    <div>
      <div className={s.meterLabel}>
        {label} <span className="num">{fmt(value, digits)}</span>
      </div>
      <div className={s.bar}>
        <i style={{ left: `${left}%`, width: `${Math.abs(value) * 50}%`, background: color }} />
      </div>
    </div>
  );
}

/** 0..max score as filled pips */
export function PipMeter({
  label,
  value,
  max = 5,
}: {
  label: string;
  value: number;
  max?: number;
}) {
  return (
    <div>
      <div className={s.meterLabel}>
        {label} <span className="num">{value}</span>
      </div>
      <div className={s.pips}>
        {Array.from({ length: max }, (_, i) => (
          <span
            key={i}
            className={s.pip}
            style={i < value ? { background: RAMP[Math.min(value, 5)] } : undefined}
          />
        ))}
      </div>
    </div>
  );
}
