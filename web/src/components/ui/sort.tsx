import { ArrowDown, ArrowDownWideNarrow, ArrowUpNarrowWide } from "lucide-react";
import { type ReactNode, useState } from "react";

import { Button } from "./button";
import { Select } from "./select";
import s from "./sort.module.css";

export type SortDir = "asc" | "desc";
export type Sort<K extends string> = { key: K; dir: SortDir };

const missing = (v: unknown) => v == null || (typeof v === "number" && Number.isNaN(v));

/** Sorted copy; null and NaN go last whatever the direction */
export function sortRows<T>(
  rows: T[],
  get: (row: T) => number | string | null | undefined,
  dir: SortDir,
): T[] {
  return rows.toSorted((a, b) => {
    const x = get(a);
    const y = get(b);
    if (missing(x) || missing(y)) return Number(missing(x)) - Number(missing(y));
    const c = typeof x === "string" ? x.localeCompare(String(y)) : Number(x) - Number(y);
    return dir === "asc" ? c : -c;
  });
}

/** Clicking the active key flips the direction, a new key starts at its default */
export function useSort<K extends string>(initial: Sort<K>) {
  const [sort, setSort] = useState(initial);
  const toggle = (key: K, dir: SortDir = "desc") =>
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir },
    );
  return { sort, setSort, toggle };
}

export type SortOption<K extends string> = { value: K; label: string; dir: SortDir };

/** Sort menu for card grids */
export function SortControl<K extends string>({
  options,
  sort,
  onChange,
}: {
  options: SortOption<K>[];
  sort: Sort<K>;
  onChange: (sort: Sort<K>) => void;
}) {
  const flip = () => onChange({ ...sort, dir: sort.dir === "asc" ? "desc" : "asc" });
  return (
    <div className={s.control}>
      <div className={s.select}>
        <Select
          label="Sort by"
          value={sort.key}
          options={options}
          onChange={(key) => {
            const option = options.find((o) => o.value === key)!;
            onChange({ key: option.value, dir: option.dir });
          }}
        />
      </div>
      <Button
        size="icon"
        aria-label={sort.dir === "asc" ? "Ascending" : "Descending"}
        title={sort.dir === "asc" ? "Ascending" : "Descending"}
        onClick={flip}
      >
        {sort.dir === "asc" ? <ArrowUpNarrowWide size={16} /> : <ArrowDownWideNarrow size={16} />}
      </Button>
    </div>
  );
}

/** Clickable table header cell */
export function SortHeader<K extends string>({
  column,
  sort,
  onSort,
  dir = "desc",
  className,
  children,
}: {
  column: K;
  sort: Sort<K>;
  onSort: (key: K, dir: SortDir) => void;
  dir?: SortDir;
  className?: string;
  children: ReactNode;
}) {
  const active = sort.key === column;
  return (
    <th
      className={className}
      aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
    >
      <button
        type="button"
        className={s.header}
        data-active={active}
        data-dir={active ? sort.dir : undefined}
        onClick={() => onSort(column, dir)}
      >
        {children}
        <ArrowDown size={12} className={s.arrow} />
      </button>
    </th>
  );
}
