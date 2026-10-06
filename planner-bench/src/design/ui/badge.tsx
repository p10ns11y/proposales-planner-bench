import type { HTMLAttributes } from "react";
import { cn } from "../cn";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: "missing" | "clear";
};

export function Badge({ className, tone = "clear", ...props }: BadgeProps) {
  return (
    <span
      data-gap={tone}
      className={cn("inline-flex rounded-md border border-border px-2 py-1 text-xs", className)}
      {...props}
    />
  );
}
