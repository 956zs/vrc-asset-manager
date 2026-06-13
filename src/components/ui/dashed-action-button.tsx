import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

type DashedActionButtonProps = ComponentProps<"button"> & {
  icon?: ReactNode;
};

function DashedActionButton({
  children,
  className,
  icon,
  type = "button",
  ...props
}: DashedActionButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "flex w-full min-w-0 items-center justify-center gap-2 rounded-md border border-dashed border-border px-3 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    >
      {icon}
      <span className="min-w-0 truncate">{children}</span>
    </button>
  );
}

export { DashedActionButton };
