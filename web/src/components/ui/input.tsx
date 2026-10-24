import { Input as BaseInput } from "@base-ui/react/input";
import { Search } from "lucide-react";
import type { ComponentProps } from "react";

import s from "./input.module.css";

export function Input({ className = "", ...props }: ComponentProps<typeof BaseInput>) {
  return <BaseInput className={`${s.input} ${className}`} {...props} />;
}

export function SearchInput(props: ComponentProps<typeof BaseInput>) {
  return (
    <div className={s.search}>
      <Search size={15} />
      <Input type="search" {...props} />
    </div>
  );
}
