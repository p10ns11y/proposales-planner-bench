"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { cn } from "../cn";

type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  trigger?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  side?: "left" | "right";
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void;
  onCloseAutoFocus?: (event: Event) => void;
  contentAttributes?: {
    "data-lcv-machine": string;
    "data-lcv-ui-state": string;
    "data-lcv-states": string;
  };
  closeAttributes?: {
    "data-lcv-event": string;
    "data-lcv-from": string;
    "data-lcv-to-success": string;
    "data-lcv-to-fail": string;
    "data-lcv-to-interrupted": string;
  };
};

export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  trigger,
  children,
  footer,
  side = "right",
  onSubmit,
  onCloseAutoFocus,
  contentAttributes,
  closeAttributes,
}: SheetProps) {
  const body = (
    <>
      <div className="planner-drawer-head">
        <div>
          <Dialog.Title className="planner-drawer-title">{title}</Dialog.Title>
          <Dialog.Description className="planner-drawer-desc">{description}</Dialog.Description>
        </div>
        <Dialog.Close
          type="button"
          className="planner-icon-button planner-round"
          aria-label="Close"
          {...closeAttributes}
        >
          <X />
        </Dialog.Close>
      </div>
      <div className="planner-drawer-body">{children}</div>
      {footer ? <div className="planner-drawer-footer">{footer}</div> : null}
    </>
  );
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      {trigger ? <Dialog.Trigger asChild>{trigger}</Dialog.Trigger> : null}
      <Dialog.Portal>
        <Dialog.Overlay className="planner-scrim" />
        <Dialog.Content
          className={cn("planner-drawer", side === "left" && "planner-drawer-left")}
          onCloseAutoFocus={onCloseAutoFocus}
          {...contentAttributes}
        >
          {onSubmit ? (
            <form className="planner-drawer-form" onSubmit={onSubmit}>
              {body}
            </form>
          ) : (
            <div className="planner-drawer-form">{body}</div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
