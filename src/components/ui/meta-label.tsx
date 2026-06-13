import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type MetaLabelProps = ComponentProps<"p">;

function MetaLabel({ className, ...props }: MetaLabelProps) {
  return (
    <p
      className={cn(
        "text-[11px] font-semibold text-foreground/55",
        className,
      )}
      {...props}
    />
  );
}

export { MetaLabel };
