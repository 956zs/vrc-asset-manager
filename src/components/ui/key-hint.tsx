import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type KeyHintProps = ComponentProps<"kbd">;

function KeyHint({ className, ...props }: KeyHintProps) {
  return (
    <kbd
      className={cn(
        "rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { KeyHint };
