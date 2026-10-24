import type { CSSProperties, ReactNode } from "react";

import s from "./card.module.css";

export function Card({
  title,
  sub,
  action,
  children,
  className = "",
}: {
  title?: ReactNode;
  sub?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`${s.card} ${className}`}>
      {(title || action) && (
        <div className={s.head}>
          <div>
            {title && <h2 className={s.title}>{title}</h2>}
            {sub && <p className={s.sub}>{sub}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({
  label,
  value,
  note,
}: {
  label: string;
  value: ReactNode;
  note?: ReactNode;
}) {
  return (
    <div className={`${s.card} ${s.stat}`}>
      <div className={s.statLabel}>{label}</div>
      <div className={s.statValue}>{value}</div>
      {note && <div className={s.statNote}>{note}</div>}
    </div>
  );
}

export function Grid({
  cols,
  children,
  className = "",
}: {
  cols: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`${s.grid} ${className}`} style={{ "--cols": cols } as CSSProperties}>
      {children}
    </div>
  );
}
