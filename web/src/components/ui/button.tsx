import { Button as BaseButton } from "@base-ui/react/button";
import type { ComponentProps } from "react";

import s from "./button.module.css";

type Props = ComponentProps<typeof BaseButton> & {
  variant?: "default" | "primary";
  size?: "default" | "icon";
  block?: boolean;
};

export function Button({
  variant = "default",
  size = "default",
  block,
  className,
  ...props
}: Props) {
  const cls = [
    s.button,
    variant === "primary" && s.primary,
    size === "icon" && s.icon,
    block && s.block,
    className,
  ];
  return <BaseButton className={cls.filter(Boolean).join(" ")} {...props} />;
}
