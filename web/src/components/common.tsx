import type { ReactNode } from "react";

import s from "./common.module.css";

export function PageHeader({
  title,
  lede,
  children,
}: {
  title: ReactNode;
  lede?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className={s.head}>
      <div>
        <h1 className={s.title}>{title}</h1>
        {lede && <p className={s.lede}>{lede}</p>}
      </div>
      {children}
    </header>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className={s.empty}>
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export function Skeleton({ height = 280 }: { height?: number }) {
  return <div className={s.skeleton} style={{ height }} />;
}

export function Legend({ items }: { items: { label: string; color: string; line?: boolean }[] }) {
  return (
    <div className={s.legend}>
      {items.map((it) => (
        <span key={it.label} className={s.legendItem}>
          <span className={it.line ? s.line : s.swatch} style={{ background: it.color }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

export function Chip({ color, children }: { color?: string; children: ReactNode }) {
  return (
    <span className={s.chip}>
      {color && <Dot color={color} />}
      {children}
    </span>
  );
}

export function Dot({ color }: { color: string }) {
  return <span className={s.dot} style={{ background: color }} />;
}

export type TipRow = { label: string; value: ReactNode; color?: string };

/** Chart tooltip body */
export function Tip({ title, rows }: { title: ReactNode; rows: TipRow[] }) {
  return (
    <div className={s.tip}>
      <div className={s.tipTitle}>{title}</div>
      {rows.map((r) => (
        <div key={r.label} className={s.tipRow}>
          <span className={s.tipKey}>
            {r.color && <Dot color={r.color} />}
            {r.label}
          </span>
          <span className="num">{r.value}</span>
        </div>
      ))}
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p className={s.note}>{children}</p>;
}

export function H4({ children }: { children: ReactNode }) {
  return <h4 className={s.h4}>{children}</h4>;
}
