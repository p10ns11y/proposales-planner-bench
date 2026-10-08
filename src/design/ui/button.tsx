import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../cn";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center rounded-full px-4 text-[15px] leading-[22px] disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "border-0 bg-primary font-semibold text-primary-foreground",
        ghost: "border border-border bg-card font-medium text-foreground",
      },
    },
    defaultVariants: {
      variant: "primary",
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

export function Button({ className, variant, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return <Comp className={cn(buttonVariants({ variant }), className)} {...props} />;
}
