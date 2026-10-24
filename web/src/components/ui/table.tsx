import type { ReactNode } from "react";

import s from "./table.module.css";

/** Full-bleed table inside a Card */
export function Table({ children }: { children: ReactNode }) {
  return (
    <div className={s.wrap}>
      <table className={s.table}>{children}</table>
    </div>
  );
}

export const right = s.r;

export function Rank({ value }: { value: number }) {
  return <span className={s.rank}>{value}</span>;
}
