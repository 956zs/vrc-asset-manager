import type { ComponentProps } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type MetaBadgeProps = ComponentProps<typeof Badge>;

function MetaBadge({ className, variant = "outline", ...props }: MetaBadgeProps) {
  return (
    <Badge
      variant={variant}
      className={cn(
        "border-border/70 px-1.5 py-0.5 text-[11px] font-normal leading-none text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export { MetaBadge };
