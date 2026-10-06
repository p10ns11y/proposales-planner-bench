"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { cn } from "../cn";

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  trigger: ReactNode;
  children: ReactNode;
};

export function Sheet({ open, onOpenChange, title, trigger, children }: SheetProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-foreground/20" />
        <Dialog.Content
          className={cn(
            "fixed top-0 right-0 flex h-dvh w-full max-w-md flex-col gap-4 border-l border-border bg-card p-4",
          )}
        >
          <Dialog.Title className="text-lg">{title}</Dialog.Title>
          <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
          <Dialog.Close className="rounded-md border border-border bg-card px-3 py-2 text-sm">
            Close
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
